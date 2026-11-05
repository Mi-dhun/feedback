"""
Database integrity and CRUD unit tests.
"""

import os
import tempfile
import sqlite3
import pytest
from database import init_db, get_db_connection

@pytest.fixture
def test_db():
    db_fd, db_path = tempfile.mkstemp()
    init_db(db_path)
    yield db_path
    os.close(db_fd)
    os.unlink(db_path)

def test_db_init(test_db):
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
    assert "users" in tables
    assert "faculties" in tables
    assert "subjects" in tables
    assert "feedback" in tables
    conn.close()

def test_rating_check_constraint(test_db):
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    # Insert faculty and subject
    cursor.execute("INSERT INTO faculties (name, department) VALUES ('Dr. Test', 'CS')")
    fac_id = cursor.lastrowid
    cursor.execute("INSERT INTO subjects (code, name, department) VALUES ('CS999', 'Advanced Test', 'CS')")
    sub_id = cursor.lastrowid
    conn.commit()

    # Invalid rating > 5 should fail check constraint
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute("""
        INSERT INTO feedback (faculty_id, subject_id, rating, message, sentiment, sentiment_score)
        VALUES (?, ?, 10, 'Too good', 'Positive', 0.9)
        """, (fac_id, sub_id))
        conn.commit()

    # Valid rating = 5 should succeed
    cursor.execute("""
    INSERT INTO feedback (faculty_id, subject_id, rating, message, sentiment, sentiment_score)
    VALUES (?, ?, 5, 'Great!', 'Positive', 0.8)
    """, (fac_id, sub_id))
    conn.commit()
    assert cursor.lastrowid is not None
    conn.close()
