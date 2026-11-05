"""
Integration tests for RESTful APIs.
"""

import os
import pytest
import tempfile
import json
from app import app
from database import init_db
from seed_data import seed_database

@pytest.fixture
def client():
    # Setup temporary test database
    db_fd, db_path = tempfile.mkstemp()
    app.config["DATABASE_PATH"] = db_path
    app.config["TESTING"] = True

    with app.app_context():
        seed_database(db_path=db_path, reset=True)

    with app.test_client() as client:
        yield client

    os.close(db_fd)
    os.unlink(db_path)

def test_get_summary(client):
    """Test GET /api/summary returns correct aggregated statistics."""
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.get_json()
    assert "total_feedback" in data
    assert data["total_feedback"] > 0
    assert "sentiment_counts" in data
    assert "Positive" in data["sentiment_counts"]
    assert "Negative" in data["sentiment_counts"]
    assert "Neutral" in data["sentiment_counts"]
    assert "faculty_breakdown" in data
    assert len(data["faculty_breakdown"]) > 0

def test_guest_submit_feedback(client):
    """Test POST /api/feedback as anonymous guest."""
    payload = {
        "faculty_id": 1,
        "subject_id": 1,
        "rating": 5,
        "message": "Outstanding lectures! Very insightful and helpful.",
        "is_anonymous": True
    }
    response = client.post("/api/feedback", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert "feedback_id" in data
    assert data["sentiment_result"]["sentiment"] == "Positive"

def test_submit_feedback_negative(client):
    """Test POST /api/feedback produces negative sentiment result."""
    payload = {
        "faculty_id": 1,
        "subject_id": 1,
        "rating": 1,
        "message": "Horrible class, worst professor ever, rude and unhelpful.",
        "is_anonymous": True
    }
    response = client.post("/api/feedback", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data["sentiment_result"]["sentiment"] == "Negative"

def test_sentiment_preview(client):
    """Test POST /api/sentiment/preview for real-time analysis."""
    response = client.post("/api/sentiment/preview", json={"message": "Brilliant and super helpful teacher"})
    assert response.status_code == 200
    data = response.get_json()
    assert data["sentiment"] == "Positive"
    assert data["compound"] > 0.5

def test_user_registration_and_login(client):
    """Test student registration, login, and profile fetching."""
    # Register
    reg_payload = {
        "name": "Test Student",
        "email": "teststudent@feedback.edu",
        "password": "mypassword123",
        "department": "Computer Science",
        "student_id": "CS-999"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Login
    login_payload = {
        "email": "teststudent@feedback.edu",
        "password": "mypassword123"
    }
    login_res = client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert login_data["user"]["email"] == "teststudent@feedback.edu"

    # Get /api/auth/me
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["authenticated"] is True
    assert me_data["user"]["name"] == "Test Student"

def test_admin_faculty_management(client):
    """Test admin authentication and faculty CRUD."""
    # Login as admin
    client.post("/api/auth/login", json={"email": "admin@feedback.edu", "password": "Admin@123"})

    # Add faculty
    add_res = client.post("/api/faculty", json={
        "name": "Dr. Donald Knuth",
        "department": "Computer Science",
        "email": "d.knuth@univ.edu",
        "designation": "Professor Emeritus"
    })
    assert add_res.status_code == 201
    fac_id = add_res.get_json()["id"]

    # Update faculty
    upd_res = client.put(f"/api/faculty/{fac_id}", json={
        "name": "Dr. Donald E. Knuth",
        "department": "Computer Science",
        "email": "d.knuth@univ.edu",
        "designation": "Professor Emeritus"
    })
    assert upd_res.status_code == 200

    # Delete faculty
    del_res = client.delete(f"/api/faculty/{fac_id}")
    assert del_res.status_code == 200

def test_export_report_csv_and_json(client):
    """Test report generation and export endpoint."""
    csv_res = client.get("/api/reports/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["Content-Type"]
    assert "Feedback ID" in csv_res.get_data(as_text=True)

    json_res = client.get("/api/reports/export?format=json")
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers["Content-Type"]
