"""
Database management module for SQLite.
Handles connection, initialization, schema migrations, and queries.
"""

import sqlite3
import json
from flask import current_app, has_app_context
from config import Config

def get_db_connection(db_path=None):
    """Returns a SQLite connection with Row factory enabled."""
    if db_path is None:
        if has_app_context() and "DATABASE_PATH" in current_app.config:
            db_path = current_app.config["DATABASE_PATH"]
        else:
            db_path = Config.DATABASE_PATH
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db(db_path=None):
    """Initialize database tables and indexes."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        department TEXT DEFAULT 'Computer Science',
        student_id TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Faculties Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS faculties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        email TEXT,
        designation TEXT DEFAULT 'Assistant Professor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Subjects Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester TEXT DEFAULT 'Semester 1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Feedback Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        faculty_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        message TEXT NOT NULL,
        sentiment TEXT NOT NULL CHECK (sentiment IN ('Positive', 'Negative', 'Neutral')),
        sentiment_score REAL NOT NULL,
        aspects TEXT,
        keywords TEXT,
        is_anonymous INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (faculty_id) REFERENCES faculties (id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
    );
    """)

    # Performance indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_faculty ON feedback(faculty_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_subject ON feedback(subject_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp);")

    conn.commit()
    conn.close()

def row_to_dict(row):
    """Convert a sqlite3.Row object to a standard Python dictionary."""
    if row is None:
        return None
    d = dict(row)
    # Parse json fields if present
    if "aspects" in d and d["aspects"]:
        try:
            d["aspects"] = json.loads(d["aspects"])
        except Exception:
            pass
    if "keywords" in d and d["keywords"]:
        try:
            d["keywords"] = json.loads(d["keywords"])
        except Exception:
            pass
    return d

def rows_to_list(rows):
    """Convert list of sqlite3.Row to list of dicts."""
    return [row_to_dict(r) for r in rows]
