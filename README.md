# Smart Student Feedback and Faculty Evaluation System Using Sentiment Analysis

> **Industry Project Specification**: Smart Feedback Collection and Analysis System  
> **Author / Reference**: Midhun M  
> **Standard**: TCS iON Industry Project Guidelines & Technical Rubric

---

## 📌 Executive Summary

The **Smart Student Feedback and Faculty Evaluation System Using Sentiment Analysis** is an end-to-end, full-stack web application designed to modernize and simplify academic feedback collection, evaluation, and quality assurance. 

Traditional feedback forms fail to deliver actionable insights in real-time. By integrating **Natural Language Processing (NLP)** sentiment analysis and **Chart.js** dynamic data visualization with a **Python Flask** backend and **SQLite** database, this platform provides immediate emotional polarity scoring, aspect-level evaluation, and comprehensive academic dashboards.

---

## 🚀 Key Features

### 1. Multi-Role Access Control
- **Anonymous Guest**: Can submit feedback anonymously without creating an account. Immediately views automated sentiment analysis metrics upon submission.
- **Registered Student**: Can sign up, log in, submit authenticated faculty ratings (1–5 stars) and detailed reviews, and maintain a private feedback history log.
- **Academic Administrator**: Dedicated dashboard with KPI statistics, interactive charts, filterable feedback tables, faculty & subject management (CRUD), and one-click report generation.

### 2. Real-Time NLP Sentiment Analysis Engine
- **Polarity Classification**: Classifies comments into **Positive**, **Negative**, and **Neutral** using VADER and TextBlob.
- **Continuous Scoring**: Calculates normalized compound scores between `-1.0` (extremely negative) and `+1.0` (extremely positive).
- **Aspect-Level Breakdown**: Automatically evaluates specific domains:
  - *Teaching Quality & Clarity*
  - *Helpfulness & Approachability*
  - *Course Materials & Syllabus*
  - *Grading & Assessment Fairness*
- **Live Real-Time Meter**: Detects sentiment dynamically as the user types before submission.

### 3. Dynamic Visualizations (Chart.js)
- **Sentiment Distribution Doughnut Chart**: High-contrast breakdown conforming to TCS iON guidelines (`Positive`, `Negative`, `Neutral`).
- **Faculty Evaluation Comparison Chart**: Multi-axis bar chart comparing average ratings and review counts across faculty members.
- **Subject-wise Sentiment Breakdown**: Stacked bar chart highlighting positive, neutral, and negative feedback per course.
- **Rating Frequency Chart**: 1 to 5 star rating distribution.
- **Timeline Trend Line Chart**: Historical feedback volume and sentiment trajectory over time.

### 4. Administrative Management & Reports
- **Faculty Management**: Add, update, view, and delete faculty profiles.
- **Subject Management**: Add, update, view, and delete course codes and subjects.
- **Report Export**: Download full evaluation audits in **CSV** and **JSON** formats.
- **Sample Data Seeder**: Built-in 1-click database seeder with realistic reviews across disciplines.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Modern CSS3 (Dark Slate Glassmorphism), Vanilla JavaScript (ES6+), Chart.js (v4.4.2 bundled locally) |
| **Backend** | Python 3.12, Flask, Flask-CORS, Werkzeug |
| **Database** | SQLite (with foreign key constraints and performance indexes) |
| **NLP & Sentiment** | `vaderSentiment`, `textblob` |
| **Testing** | `pytest` (14 unit & integration tests) |

---

## 📂 Project Directory Structure

```
feedbackproject/
├── app.py                  # Main Flask application and RESTful API endpoints
├── config.py               # Application configuration and environment variables
├── database.py             # SQLite connection, initialization, and schema helpers
├── sentiment.py            # NLP sentiment analysis and aspect extraction engine
├── seed_data.py            # Database seeder with realistic sample academic evaluations
├── feedback.db             # Active SQLite database file
├── pytest.ini              # Pytest configuration
├── requirements.txt        # Python dependency manifest
├── README.md               # Project documentation and setup guide
├── tests/
│   ├── test_sentiment.py   # Unit tests for sentiment analyzer and aspect scoring
│   ├── test_api.py         # Integration tests for all REST endpoints & auth
│   └── test_db.py          # Database integrity and check constraint tests
├── static/
│   ├── css/
│   │   └── style.css       # Premium modern UI styling (responsive, dark slate)
│   └── js/
│       ├── chart.umd.min.js# Locally bundled Chart.js for 100% offline operation
│       ├── api.js          # REST API AJAX fetch client
│       ├── charts.js       # Chart.js visualization configurations
│       └── app.js          # SPA state controller, form handlers, modals, filters
└── templates/
    └── index.html          # Main responsive single-page application interface
```

---

## 🌐 API Route Specifications

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Serves the main Single Page Web Interface | Public |
| `POST` | `/api/feedback` | Submit feedback (Guest or Student); runs NLP analysis | Public / Student |
| `GET` | `/api/summary` | Retrieve aggregated metrics and chart data | Public |
| `GET` | `/api/feedback` | List feedback with filters (`faculty_id`, `sentiment`, `search`) | Public / Admin |
| `GET` | `/api/feedback/<id>` | Retrieve full details of a single feedback | Public |
| `DELETE` | `/api/feedback/<id>` | Delete a feedback entry | Admin / Author |
| `GET` | `/api/feedback/my-history` | Retrieve student's own feedback history | Student |
| `POST` | `/api/sentiment/preview` | Real-time sentiment analysis preview | Public |
| `POST` | `/api/auth/register` | Register a new student account | Public |
| `POST` | `/api/auth/login` | Authenticate student or administrator | Public |
| `GET` | `/api/auth/me` | Fetch active user session | Public |
| `POST` | `/api/auth/logout` | Terminate session | Authenticated |
| `GET` | `/api/faculty` | List all faculty members with average ratings | Public |
| `POST` | `/api/faculty` | Add a new faculty member | Admin |
| `PUT` | `/api/faculty/<id>` | Update faculty details | Admin |
| `DELETE` | `/api/faculty/<id>` | Delete a faculty member | Admin |
| `GET` | `/api/subjects` | List all subjects with course codes | Public |
| `POST` | `/api/subjects` | Add a new subject | Admin |
| `PUT` | `/api/subjects/<id>` | Update subject details | Admin |
| `DELETE` | `/api/subjects/<id>` | Delete a subject | Admin |
| `GET` | `/api/reports/export` | Download feedback report (`?format=csv` or `json`) | Public / Admin |
| `POST` | `/api/seed` | Reset and re-seed sample database | Public / Admin |

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- `pip`

### 2. Clone / Open Project
```bash
cd /home/user/feedbackproject
```

### 3. Create & Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Initialize & Seed Database
```bash
python seed_data.py
```

### 6. Run the Application Server
```bash
python app.py
```
The application will start on: **`http://localhost:5000`**

---

## 🔑 Default Demo Accounts

For immediate testing, use the built-in 1-click demo buttons on the Sign In modal or enter:

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@feedback.edu` | `Admin@123` |
| **Student** | `student@feedback.edu` | `student123` |
| **Student 2** | `priya.sharma@feedback.edu` | `student123` |
| **Guest** | *No credentials needed* | *Anonymous submission* |

---

## 🧪 Running Automated Tests

Run the full automated test suite using `pytest`:

```bash
pytest
```

**Expected Test Output**:
```
tests/test_api.py .......                                                [ 50%]
tests/test_db.py ..                                                      [ 64%]
tests/test_sentiment.py .....                                            [100%]
============================== 14 passed in 6.5s ===============================
```

---

## 📊 Alignment with TCS iON Rubric & Guidelines

1. **Step 1 - Application Structure**:
   - Distinct roles: Guest (anonymous), Registered Student (with history), Admin (management).
   - Relational SQLite schema with users, faculty, subjects, and feedbacks.
2. **Step 2 - Client-Server Interaction**:
   - RESTful endpoints (`POST /api/feedback`, `GET /api/summary`).
   - AJAX form submissions with real-time response rendering.
3. **Step 3 - Full Stack Development**:
   - Responsive UI designed with modern glassmorphism aesthetics.
   - Dynamic Chart.js charts for sentiment distribution, faculty rankings, and ratings.
4. **Step 4 - Testing & Validation**:
   - Comprehensive test coverage across sentiment scoring, API routes, authentication, and database constraints.
