"""
Database Seeder for Smart Student Feedback & Faculty Evaluation System.
Populates realistic faculty, subjects, users, and feedback with pre-computed sentiments.
"""

import json
from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db
from sentiment import analyze_sentiment

SAMPLE_USERS = [
    {
        "name": "Dr. Sarah Jenkins",
        "email": "admin@feedback.edu",
        "password": "Admin@123",
        "role": "admin",
        "department": "Academic Affairs",
        "student_id": "FAC-ADMIN-01"
    },
    {
        "name": "Alex Rivera",
        "email": "student@feedback.edu",
        "password": "student123",
        "role": "student",
        "department": "Computer Science",
        "student_id": "CS-2024-042"
    },
    {
        "name": "Priya Sharma",
        "email": "priya.sharma@feedback.edu",
        "password": "student123",
        "role": "student",
        "department": "Computer Science",
        "student_id": "CS-2024-088"
    },
    {
        "name": "David Chen",
        "email": "david.chen@feedback.edu",
        "password": "student123",
        "role": "student",
        "department": "Information Science",
        "student_id": "IS-2024-019"
    }
]

SAMPLE_FACULTIES = [
    {
        "name": "Dr. Alan Turing",
        "department": "Computer Science",
        "email": "a.turing@univ.edu",
        "designation": "Professor & Head of AI"
    },
    {
        "name": "Dr. Ada Lovelace",
        "department": "Computer Science",
        "email": "a.lovelace@univ.edu",
        "designation": "Associate Professor"
    },
    {
        "name": "Prof. Richard Feynman",
        "department": "Physics & Engineering",
        "email": "r.feynman@univ.edu",
        "designation": "Professor"
    },
    {
        "name": "Dr. Grace Hopper",
        "department": "Information Science",
        "email": "g.hopper@univ.edu",
        "designation": "Professor"
    },
    {
        "name": "Prof. Claude Shannon",
        "department": "Computer Science",
        "email": "c.shannon@univ.edu",
        "designation": "Associate Professor"
    },
    {
        "name": "Dr. Katherine Johnson",
        "department": "Mathematics",
        "email": "k.johnson@univ.edu",
        "designation": "Assistant Professor"
    }
]

SAMPLE_SUBJECTS = [
    {
        "code": "CS101",
        "name": "Introduction to Computer Science",
        "department": "Computer Science",
        "semester": "Semester 1"
    },
    {
        "code": "CS201",
        "name": "Data Structures & Algorithms",
        "department": "Computer Science",
        "semester": "Semester 3"
    },
    {
        "code": "CS305",
        "name": "Database Management Systems",
        "department": "Information Science",
        "semester": "Semester 4"
    },
    {
        "code": "CS401",
        "name": "Artificial Intelligence & Machine Learning",
        "department": "Computer Science",
        "semester": "Semester 6"
    },
    {
        "code": "CS310",
        "name": "Computer Networks & Security",
        "department": "Computer Science",
        "semester": "Semester 5"
    },
    {
        "code": "MA201",
        "name": "Discrete Mathematics & Linear Algebra",
        "department": "Mathematics",
        "semester": "Semester 2"
    }
]

SAMPLE_FEEDBACKS = [
    {
        "faculty_idx": 0,  # Dr. Alan Turing
        "subject_idx": 3,  # AI & ML
        "user_email": "student@feedback.edu",
        "rating": 5,
        "message": "Dr. Turing is truly exceptional! His lectures on machine learning algorithms and neural networks are lucid, engaging, and inspiring. Highly supportive during office hours.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 1,  # Dr. Ada Lovelace
        "subject_idx": 1,  # DSA
        "user_email": "priya.sharma@feedback.edu",
        "rating": 5,
        "message": "Dr. Lovelace's approach to algorithms and computational complexity is masterful. The visual code walkthroughs and hands-on exercises made tricky dynamic programming topics simple to understand.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 2,  # Prof. Richard Feynman
        "subject_idx": 0,  # Intro to CS
        "user_email": None,
        "rating": 5,
        "message": "Prof. Feynman brings unparalleled enthusiasm and clarity to every class. He uses real-world metaphors that stick with you forever. Hands down the best lecture experience!",
        "is_anonymous": 1
    },
    {
        "faculty_idx": 3,  # Dr. Grace Hopper
        "subject_idx": 2,  # DBMS
        "user_email": "david.chen@feedback.edu",
        "rating": 4,
        "message": "Dr. Hopper has immense practical knowledge of databases and SQL query execution plans. The laboratory projects were challenging and gave us real industrial skills.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 4,  # Prof. Claude Shannon
        "subject_idx": 4,  # Networks
        "user_email": None,
        "rating": 4,
        "message": "Strong conceptual foundation on networking protocols and packet routing. The slide decks are well-structured and relevant.",
        "is_anonymous": 1
    },
    {
        "faculty_idx": 5,  # Dr. Katherine Johnson
        "subject_idx": 5,  # Discrete Math
        "user_email": "student@feedback.edu",
        "rating": 4,
        "message": "Dr. Johnson breaks down complex mathematical proofs step by step. Very patient and takes time to answer every student query.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 0,  # Dr. Alan Turing
        "subject_idx": 3,  # AI & ML
        "user_email": None,
        "rating": 3,
        "message": "The course content is standard and covers the syllabus adequately. However, the mathematical pace is quite rapid and more solved problem sets would be beneficial.",
        "is_anonymous": 1
    },
    {
        "faculty_idx": 3,  # Dr. Grace Hopper
        "subject_idx": 2,  # DBMS
        "user_email": "priya.sharma@feedback.edu",
        "rating": 3,
        "message": "Fair grading and organized sessions. The pace was moderate, though more practical emphasis on NoSQL and database scaling would make the subject much better.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 4,  # Prof. Claude Shannon
        "subject_idx": 4,  # Networks
        "user_email": None,
        "rating": 3,
        "message": "Adequate lectures with standard textbook coverage. Discussion on modern cloud networking could be expanded.",
        "is_anonymous": 1
    },
    {
        "faculty_idx": 1,  # Dr. Ada Lovelace
        "subject_idx": 1,  # DSA
        "user_email": "david.chen@feedback.edu",
        "rating": 2,
        "message": "The problem assignments were extremely difficult and had very short submission windows. More intermediate guidance and scaffolding are needed before advanced problem sets.",
        "is_anonymous": 0
    },
    {
        "faculty_idx": 5,  # Dr. Katherine Johnson
        "subject_idx": 5,  # Discrete Math
        "user_email": None,
        "rating": 2,
        "message": "Exams felt heavily focused on memorizing long proofs rather than understanding the underlying logic. The grading was unnecessarily strict.",
        "is_anonymous": 1
    },
    {
        "faculty_idx": 4,  # Prof. Claude Shannon
        "subject_idx": 4,  # Networks
        "user_email": "student@feedback.edu",
        "rating": 1,
        "message": "The lecture slides are outdated and disorganized. Questions asked during the lecture were often skipped or dismissed, making it very frustrating to follow.",
        "is_anonymous": 0
    }
]


def seed_database(db_path=None, reset=False):
    """Seed the database with default users, faculty, subjects, and feedback."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    if reset:
        cursor.execute("DELETE FROM feedback;")
        cursor.execute("DELETE FROM subjects;")
        cursor.execute("DELETE FROM faculties;")
        cursor.execute("DELETE FROM users;")
        cursor.execute("DELETE FROM sqlite_sequence;")
        conn.commit()

    # 1. Seed Users
    user_map = {}
    for u in SAMPLE_USERS:
        cursor.execute("SELECT id FROM users WHERE email = ?", (u["email"],))
        existing = cursor.fetchone()
        if existing:
            user_map[u["email"]] = existing["id"]
        else:
            pwd_hash = generate_password_hash(u["password"])
            cursor.execute("""
            INSERT INTO users (name, email, password_hash, role, department, student_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (u["name"], u["email"], pwd_hash, u["role"], u["department"], u["student_id"]))
            user_map[u["email"]] = cursor.lastrowid

    # 2. Seed Faculties
    faculty_ids = []
    for f in SAMPLE_FACULTIES:
        cursor.execute("SELECT id FROM faculties WHERE email = ?", (f["email"],))
        existing = cursor.fetchone()
        if existing:
            faculty_ids.append(existing["id"])
        else:
            cursor.execute("""
            INSERT INTO faculties (name, department, email, designation)
            VALUES (?, ?, ?, ?)
            """, (f["name"], f["department"], f["email"], f["designation"]))
            faculty_ids.append(cursor.lastrowid)

    # 3. Seed Subjects
    subject_ids = []
    for s in SAMPLE_SUBJECTS:
        cursor.execute("SELECT id FROM subjects WHERE code = ?", (s["code"],))
        existing = cursor.fetchone()
        if existing:
            subject_ids.append(existing["id"])
        else:
            cursor.execute("""
            INSERT INTO subjects (code, name, department, semester)
            VALUES (?, ?, ?, ?)
            """, (s["code"], s["name"], s["department"], s["semester"]))
            subject_ids.append(cursor.lastrowid)

    # 4. Seed Feedbacks (only if table is empty or resetting)
    cursor.execute("SELECT COUNT(*) as count FROM feedback;")
    fb_count = cursor.fetchone()["count"]

    if fb_count == 0:
        for fb in SAMPLE_FEEDBACKS:
            faculty_id = faculty_ids[fb["faculty_idx"]]
            subject_id = subject_ids[fb["subject_idx"]]
            user_id = user_map.get(fb["user_email"]) if fb["user_email"] else None

            # Run sentiment analysis
            analysis = analyze_sentiment(fb["message"])

            cursor.execute("""
            INSERT INTO feedback (user_id, faculty_id, subject_id, rating, message, sentiment, sentiment_score, aspects, keywords, is_anonymous)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                faculty_id,
                subject_id,
                fb["rating"],
                fb["message"],
                analysis["sentiment"],
                analysis["compound"],
                json.dumps(analysis["aspects"]),
                json.dumps(analysis["keywords"]),
                fb["is_anonymous"]
            ))

    conn.commit()
    conn.close()
    print("Database successfully seeded with realistic sample data!")


if __name__ == "__main__":
    seed_database(reset=True)
