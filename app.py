"""
Smart Student Feedback & Faculty Evaluation System
Full-stack Python Flask backend with SQLite and Sentiment Analysis.
"""

import os
import io
import csv
import json
from datetime import datetime
from functools import wraps

from flask import (
    Flask, render_template, request, jsonify, session,
    send_file, make_response
)
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from config import Config
from database import (
    get_db_connection, init_db, row_to_dict, rows_to_list
)
from sentiment import analyze_sentiment
from seed_data import seed_database

# Initialize Flask App
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)
CORS(app)

# Ensure database exists on app startup
init_db()


# ---------------------------------------------------------
# Authentication Helpers & Decorators
# ---------------------------------------------------------
def get_current_user():
    """Retrieve current logged-in user from session or Bearer token header."""
    user_id = session.get("user_id")
    if not user_id:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # For lightweight token identification, we support token = user_id
            try:
                user_id = int(auth_header.split(" ")[1])
            except (ValueError, IndexError):
                return None

    if not user_id:
        return None

    conn = get_db_connection()
    user = conn.execute("SELECT id, name, email, role, department, student_id FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row_to_dict(user)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required", "status": 401}), 401
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Administrator privilege required", "status": 403}), 403
        return f(*args, **kwargs)
    return decorated_function


# ---------------------------------------------------------
# Frontend Page Routes
# ---------------------------------------------------------
@app.route("/")
def index():
    """Serves the main single-page application interface."""
    return render_template("index.html")


# ---------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    """Registers a new student user."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    department = (data.get("department") or "Computer Science").strip()
    student_id = (data.get("student_id") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    existing = cursor.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with this email address already exists"}), 409

    pwd_hash = generate_password_hash(password)
    cursor.execute("""
    INSERT INTO users (name, email, password_hash, role, department, student_id)
    VALUES (?, ?, ?, 'student', ?, ?)
    """, (name, email, pwd_hash, department, student_id))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    session["user_id"] = user_id
    user_info = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": "student",
        "department": department,
        "student_id": student_id
    }
    return jsonify({
        "success": True,
        "message": "Registration successful",
        "user": user_info,
        "token": str(user_id)
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticates user (student or administrator)."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    user_info = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "student_id": user["student_id"]
    }
    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": user_info,
        "token": str(user["id"])
    })


@app.route("/api/auth/me", methods=["GET"])
def get_me():
    """Returns the current authenticated user session."""
    user = get_current_user()
    if not user:
        return jsonify({"authenticated": False, "user": None})
    return jsonify({"authenticated": True, "user": user})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """Terminates the user session."""
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})


# ---------------------------------------------------------
# Sentiment Analysis Preview Endpoint
# ---------------------------------------------------------
@app.route("/api/sentiment/preview", methods=["POST"])
def preview_sentiment():
    """Real-time sentiment preview for feedback typing."""
    data = request.get_json() or {}
    message = data.get("message", "")
    analysis = analyze_sentiment(message)
    return jsonify(analysis)


# ---------------------------------------------------------
# Feedback API Routes (as required by specifications)
# ---------------------------------------------------------
@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    """
    POST /api/feedback
    Submit new feedback (Supports Anonymous Guests and Registered Students).
    Processes feedback using backend sentiment analysis and stores in SQLite.
    """
    data = request.get_json() or {}

    faculty_id = data.get("faculty_id")
    subject_id = data.get("subject_id")
    rating = data.get("rating")
    message = (data.get("message") or "").strip()
    is_anonymous_req = bool(data.get("is_anonymous", False))

    if not faculty_id or not subject_id or not rating or not message:
        return jsonify({"error": "Faculty, subject, rating (1-5), and feedback message are required."}), 400

    try:
        faculty_id = int(faculty_id)
        subject_id = int(subject_id)
        rating = int(rating)
        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be an integer between 1 and 5."}), 400
    except ValueError:
        return jsonify({"error": "Invalid format for numeric fields."}), 400

    # Determine user identity: guest vs registered student
    current_user = get_current_user()
    user_id = current_user["id"] if current_user else None
    is_anonymous = 1 if (not user_id or is_anonymous_req) else 0

    # 1. Execute sentiment analysis on the backend
    sentiment_result = analyze_sentiment(message)

    # 2. Store in database
    conn = get_db_connection()
    cursor = conn.cursor()

    # Validate that faculty and subject exist
    fac = cursor.execute("SELECT id FROM faculties WHERE id = ?", (faculty_id,)).fetchone()
    if not fac:
        conn.close()
        return jsonify({"error": "Selected faculty does not exist."}), 404

    sub = cursor.execute("SELECT id FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    if not sub:
        conn.close()
        return jsonify({"error": "Selected subject does not exist."}), 404

    cursor.execute("""
    INSERT INTO feedback (user_id, faculty_id, subject_id, rating, message, sentiment, sentiment_score, aspects, keywords, is_anonymous)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        faculty_id,
        subject_id,
        rating,
        message,
        sentiment_result["sentiment"],
        sentiment_result["compound"],
        json.dumps(sentiment_result["aspects"]),
        json.dumps(sentiment_result["keywords"]),
        is_anonymous
    ))
    feedback_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Feedback submitted successfully!",
        "feedback_id": feedback_id,
        "sentiment_result": sentiment_result,
        "is_anonymous": bool(is_anonymous)
    }), 201


@app.route("/api/summary", methods=["GET"])
def get_sentiment_summary():
    """
    GET /api/summary
    Fetch sentiment summary, ratings, faculty breakdown, and statistics for Chart.js.
    """
    faculty_id_filter = request.args.get("faculty_id")
    subject_id_filter = request.args.get("subject_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    if faculty_id_filter:
        where_clauses.append("f.faculty_id = ?")
        params.append(faculty_id_filter)
    if subject_id_filter:
        where_clauses.append("f.subject_id = ?")
        params.append(subject_id_filter)

    where_str = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    # Total counts and averages
    stats_query = f"""
    SELECT 
        COUNT(*) as total_feedback,
        COALESCE(AVG(rating), 0) as avg_rating,
        COALESCE(AVG(sentiment_score), 0) as avg_compound,
        SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5
    FROM feedback f
    {where_str}
    """
    stats_row = cursor.execute(stats_query, params).fetchone()
    total = stats_row["total_feedback"] or 0
    pos_count = stats_row["positive_count"] or 0
    neg_count = stats_row["negative_count"] or 0
    neu_count = stats_row["neutral_count"] or 0

    pos_pct = round((pos_count / total * 100), 1) if total > 0 else 0
    neg_pct = round((neg_count / total * 100), 1) if total > 0 else 0
    neu_pct = round((neu_count / total * 100), 1) if total > 0 else 0

    # Faculty comparison breakdown
    faculty_query = """
    SELECT 
        fac.id,
        fac.name,
        fac.department,
        fac.designation,
        COUNT(f.id) as total_reviews,
        COALESCE(AVG(f.rating), 0) as avg_rating,
        COALESCE(AVG(f.sentiment_score), 0) as avg_sentiment_score,
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN f.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral_count
    FROM faculties fac
    LEFT JOIN feedback f ON fac.id = f.faculty_id
    GROUP BY fac.id
    ORDER BY avg_rating DESC, total_reviews DESC
    """
    faculty_rows = cursor.execute(faculty_query).fetchall()
    faculty_breakdown = []
    for r in faculty_rows:
        faculty_breakdown.append({
            "id": r["id"],
            "name": r["name"],
            "department": r["department"],
            "designation": r["designation"],
            "total_reviews": r["total_reviews"],
            "avg_rating": round(r["avg_rating"], 2),
            "avg_sentiment_score": round(r["avg_sentiment_score"], 3),
            "positive_count": r["positive_count"] or 0,
            "negative_count": r["negative_count"] or 0,
            "neutral_count": r["neutral_count"] or 0
        })

    # Subject breakdown
    subject_query = """
    SELECT 
        s.id,
        s.code,
        s.name,
        s.department,
        COUNT(f.id) as total_reviews,
        COALESCE(AVG(f.rating), 0) as avg_rating,
        SUM(CASE WHEN f.sentiment = 'Positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN f.sentiment = 'Negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN f.sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral_count
    FROM subjects s
    LEFT JOIN feedback f ON s.id = f.subject_id
    GROUP BY s.id
    ORDER BY total_reviews DESC
    """
    subject_rows = cursor.execute(subject_query).fetchall()
    subject_breakdown = []
    for r in subject_rows:
        subject_breakdown.append({
            "id": r["id"],
            "code": r["code"],
            "name": r["name"],
            "department": r["department"],
            "total_reviews": r["total_reviews"],
            "avg_rating": round(r["avg_rating"], 2),
            "positive_count": r["positive_count"] or 0,
            "negative_count": r["negative_count"] or 0,
            "neutral_count": r["neutral_count"] or 0
        })

    # Timeline trends (by date)
    timeline_query = f"""
    SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total,
        SUM(CASE WHEN sentiment = 'Positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment = 'Negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN sentiment = 'Neutral' THEN 1 ELSE 0 END) as neutral,
        AVG(rating) as avg_rating
    FROM feedback f
    {where_str}
    GROUP BY DATE(timestamp)
    ORDER BY date ASC
    LIMIT 30
    """
    timeline_rows = cursor.execute(timeline_query, params).fetchall()
    timeline = []
    for r in timeline_rows:
        timeline.append({
            "date": r["date"],
            "total": r["total"],
            "positive": r["positive"],
            "negative": r["negative"],
            "neutral": r["neutral"],
            "avg_rating": round(r["avg_rating"], 2)
        })

    conn.close()

    summary_data = {
        "total_feedback": total,
        "avg_rating": round(stats_row["avg_rating"], 2),
        "avg_compound": round(stats_row["avg_compound"], 3),
        "sentiment_counts": {
            "Positive": pos_count,
            "Negative": neg_count,
            "Neutral": neu_count
        },
        "sentiment_percentages": {
            "Positive": pos_pct,
            "Negative": neg_pct,
            "Neutral": neu_pct
        },
        "rating_distribution": {
            "1": stats_row["rating_1"] or 0,
            "2": stats_row["rating_2"] or 0,
            "3": stats_row["rating_3"] or 0,
            "4": stats_row["rating_4"] or 0,
            "5": stats_row["rating_5"] or 0
        },
        "faculty_breakdown": faculty_breakdown,
        "subject_breakdown": subject_breakdown,
        "timeline": timeline
    }

    return jsonify(summary_data)


@app.route("/api/feedback", methods=["GET"])
def get_all_feedback():
    """
    GET /api/feedback
    List all feedbacks with filtering and search options.
    """
    faculty_id = request.args.get("faculty_id")
    subject_id = request.args.get("subject_id")
    sentiment = request.args.get("sentiment")
    rating = request.args.get("rating")
    search = request.args.get("search", "").strip()
    limit = min(int(request.args.get("limit", 100)), 200)
    offset = int(request.args.get("offset", 0))

    query = """
    SELECT 
        f.id,
        f.user_id,
        f.faculty_id,
        f.subject_id,
        f.rating,
        f.message,
        f.sentiment,
        f.sentiment_score,
        f.aspects,
        f.keywords,
        f.is_anonymous,
        f.timestamp,
        fac.name as faculty_name,
        fac.department as faculty_department,
        sub.code as subject_code,
        sub.name as subject_name,
        CASE 
            WHEN f.is_anonymous = 1 OR f.user_id IS NULL THEN 'Anonymous' 
            ELSE u.name 
        END as student_name
    FROM feedback f
    JOIN faculties fac ON f.faculty_id = fac.id
    JOIN subjects sub ON f.subject_id = sub.id
    LEFT JOIN users u ON f.user_id = u.id
    WHERE 1=1
    """
    params = []

    if faculty_id:
        query += " AND f.faculty_id = ?"
        params.append(faculty_id)
    if subject_id:
        query += " AND f.subject_id = ?"
        params.append(subject_id)
    if sentiment:
        query += " AND f.sentiment = ?"
        params.append(sentiment)
    if rating:
        query += " AND f.rating = ?"
        params.append(rating)
    if search:
        query += " AND (f.message LIKE ? OR fac.name LIKE ? OR sub.name LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY f.timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify({"feedbacks": rows_to_list(rows), "count": len(rows)})


@app.route("/api/feedback/my-history", methods=["GET"])
@login_required
def get_my_feedback_history():
    """Returns feedback history for the authenticated student."""
    user = get_current_user()
    conn = get_db_connection()
    query = """
    SELECT 
        f.id,
        f.faculty_id,
        f.subject_id,
        f.rating,
        f.message,
        f.sentiment,
        f.sentiment_score,
        f.aspects,
        f.keywords,
        f.is_anonymous,
        f.timestamp,
        fac.name as faculty_name,
        sub.code as subject_code,
        sub.name as subject_name
    FROM feedback f
    JOIN faculties fac ON f.faculty_id = fac.id
    JOIN subjects sub ON f.subject_id = sub.id
    WHERE f.user_id = ?
    ORDER BY f.timestamp DESC
    """
    rows = conn.execute(query, (user["id"],)).fetchall()
    conn.close()
    return jsonify({"feedbacks": rows_to_list(rows), "count": len(rows)})


@app.route("/api/feedback/<int:feedback_id>", methods=["GET"])
def get_feedback_detail(feedback_id):
    """Retrieve details of a specific feedback."""
    conn = get_db_connection()
    query = """
    SELECT 
        f.*,
        fac.name as faculty_name,
        fac.department as faculty_department,
        sub.code as subject_code,
        sub.name as subject_name,
        CASE 
            WHEN f.is_anonymous = 1 OR f.user_id IS NULL THEN 'Anonymous' 
            ELSE u.name 
        END as student_name
    FROM feedback f
    JOIN faculties fac ON f.faculty_id = fac.id
    JOIN subjects sub ON f.subject_id = sub.id
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
    """
    row = conn.execute(query, (feedback_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Feedback not found"}), 404
    return jsonify({"feedback": row_to_dict(row)})


@app.route("/api/feedback/<int:feedback_id>", methods=["DELETE"])
@login_required
def delete_feedback(feedback_id):
    """Delete a feedback entry (Admin or submission author only)."""
    user = get_current_user()
    conn = get_db_connection()
    fb = conn.execute("SELECT user_id FROM feedback WHERE id = ?", (feedback_id,)).fetchone()
    if not fb:
        conn.close()
        return jsonify({"error": "Feedback not found"}), 404

    # Allow if admin or if the user is the original author
    if user["role"] != "admin" and fb["user_id"] != user["id"]:
        conn.close()
        return jsonify({"error": "Unauthorized to delete this feedback"}), 403

    conn.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Feedback deleted successfully"})


# ---------------------------------------------------------
# Faculty Management Endpoints
# ---------------------------------------------------------
@app.route("/api/faculty", methods=["GET"])
def get_faculties():
    """List all faculty members with department and average ratings."""
    conn = get_db_connection()
    query = """
    SELECT 
        fac.id,
        fac.name,
        fac.department,
        fac.email,
        fac.designation,
        fac.created_at,
        COUNT(f.id) as feedback_count,
        COALESCE(AVG(f.rating), 0) as avg_rating,
        COALESCE(AVG(f.sentiment_score), 0) as avg_sentiment
    FROM faculties fac
    LEFT JOIN feedback f ON fac.id = f.faculty_id
    GROUP BY fac.id
    ORDER BY fac.name ASC
    """
    rows = conn.execute(query).fetchall()
    conn.close()
    data = []
    for r in rows:
        d = dict(r)
        d["avg_rating"] = round(d["avg_rating"], 2)
        d["avg_sentiment"] = round(d["avg_sentiment"], 3)
        data.append(d)
    return jsonify({"faculties": data})


@app.route("/api/faculty", methods=["POST"])
@admin_required
def create_faculty():
    """Admin creates a new faculty member."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    email = (data.get("email") or "").strip()
    designation = (data.get("designation") or "Assistant Professor").strip()

    if not name or not department:
        return jsonify({"error": "Faculty name and department are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO faculties (name, department, email, designation)
    VALUES (?, ?, ?, ?)
    """, (name, department, email, designation))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Faculty added successfully", "id": new_id}), 201


@app.route("/api/faculty/<int:faculty_id>", methods=["PUT"])
@admin_required
def update_faculty(faculty_id):
    """Admin updates an existing faculty member."""
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    email = (data.get("email") or "").strip()
    designation = (data.get("designation") or "").strip()

    if not name or not department:
        return jsonify({"error": "Name and department are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE faculties 
    SET name = ?, department = ?, email = ?, designation = ?
    WHERE id = ?
    """, (name, department, email, designation, faculty_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Faculty updated successfully"})


@app.route("/api/faculty/<int:faculty_id>", methods=["DELETE"])
@admin_required
def delete_faculty(faculty_id):
    """Admin deletes a faculty member."""
    conn = get_db_connection()
    conn.execute("DELETE FROM faculties WHERE id = ?", (faculty_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Faculty deleted successfully"})


# ---------------------------------------------------------
# Subject Management Endpoints
# ---------------------------------------------------------
@app.route("/api/subjects", methods=["GET"])
def get_subjects():
    """List all subjects with department and course info."""
    conn = get_db_connection()
    query = """
    SELECT 
        s.id,
        s.code,
        s.name,
        s.department,
        s.semester,
        s.created_at,
        COUNT(f.id) as feedback_count,
        COALESCE(AVG(f.rating), 0) as avg_rating
    FROM subjects s
    LEFT JOIN feedback f ON s.id = f.subject_id
    GROUP BY s.id
    ORDER BY s.code ASC
    """
    rows = conn.execute(query).fetchall()
    conn.close()
    data = []
    for r in rows:
        d = dict(r)
        d["avg_rating"] = round(d["avg_rating"], 2)
        data.append(d)
    return jsonify({"subjects": data})


@app.route("/api/subjects", methods=["POST"])
@admin_required
def create_subject():
    """Admin creates a new subject."""
    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    semester = (data.get("semester") or "Semester 1").strip()

    if not code or not name or not department:
        return jsonify({"error": "Subject code, name, and department are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO subjects (code, name, department, semester)
        VALUES (?, ?, ?, ?)
        """, (code, name, department, semester))
        new_id = cursor.lastrowid
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Subject code '{code}' may already exist."}), 409

    conn.close()
    return jsonify({"success": True, "message": "Subject created successfully", "id": new_id}), 201


@app.route("/api/subjects/<int:subject_id>", methods=["PUT"])
@admin_required
def update_subject(subject_id):
    """Admin updates subject details."""
    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    semester = (data.get("semester") or "").strip()

    if not code or not name or not department:
        return jsonify({"error": "Subject code, name, and department are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE subjects
    SET code = ?, name = ?, department = ?, semester = ?
    WHERE id = ?
    """, (code, name, department, semester, subject_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Subject updated successfully"})


@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
@admin_required
def delete_subject(subject_id):
    """Admin deletes a subject."""
    conn = get_db_connection()
    conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Subject deleted successfully"})


# ---------------------------------------------------------
# Report Generation & Data Export
# ---------------------------------------------------------
@app.route("/api/reports/export", methods=["GET"])
def export_report():
    """
    Generates and downloads evaluation reports in CSV or JSON format.
    Fulfills the report generation requirement specified in the project abstract.
    """
    file_format = request.args.get("format", "csv").lower()

    conn = get_db_connection()
    query = """
    SELECT 
        f.id as feedback_id,
        f.timestamp,
        fac.name as faculty_name,
        fac.department as department,
        sub.code as subject_code,
        sub.name as subject_name,
        f.rating,
        f.sentiment,
        f.sentiment_score,
        f.message,
        CASE WHEN f.is_anonymous = 1 OR f.user_id IS NULL THEN 'Anonymous' ELSE u.name END as submitter_name
    FROM feedback f
    JOIN faculties fac ON f.faculty_id = fac.id
    JOIN subjects sub ON f.subject_id = sub.id
    LEFT JOIN users u ON f.user_id = u.id
    ORDER BY f.timestamp DESC
    """
    rows = conn.execute(query).fetchall()
    conn.close()

    records = [dict(r) for r in rows]
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    if file_format == "json":
        json_output = json.dumps(records, indent=2)
        response = make_response(json_output)
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = f"attachment; filename=feedback_report_{date_str}.json"
        return response

    # Default: CSV Export
    si = io.StringIO()
    writer = csv.writer(si)
    # Header
    writer.writerow([
        "Feedback ID", "Date & Time", "Faculty Name", "Department",
        "Subject Code", "Subject Name", "Rating (1-5)", "Sentiment",
        "Sentiment Score", "Student / Submitter", "Feedback Message"
    ])
    for r in records:
        writer.writerow([
            r["feedback_id"],
            r["timestamp"],
            r["faculty_name"],
            r["department"],
            r["subject_code"],
            r["subject_name"],
            r["rating"],
            r["sentiment"],
            r["sentiment_score"],
            r["submitter_name"],
            r["message"]
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Type"] = "text/csv; charset=utf-8"
    output.headers["Content-Disposition"] = f"attachment; filename=faculty_evaluation_report_{date_str}.csv"
    return output


# ---------------------------------------------------------
# Seed / Reset API Route
# ---------------------------------------------------------
@app.route("/api/seed", methods=["POST"])
def trigger_seed():
    """Re-seed sample data on demand."""
    try:
        seed_database(reset=True)
        return jsonify({"success": True, "message": "Database reset and seeded with sample data!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------
# Global Error Handlers
# ---------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Resource not found", "status": 404}), 404
    return render_template("index.html"), 200


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error occurred", "status": 500}), 500


if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
