"""
Sentiment Analysis Engine
Provides sentiment classification (Positive, Negative, Neutral) and polarity scoring
using VADER and TextBlob for the Smart Feedback and Faculty Evaluation System.
"""

import re
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob

# Initialize VADER analyzer singleton
_vader_analyzer = SentimentIntensityAnalyzer()

# Common domain-specific aspect keywords for student-faculty evaluation
ASPECT_KEYWORDS = {
    "teaching_quality": [
        "explain", "explains", "explanation", "lecture", "lectures", "teaching", "teach", "clear",
        "concepts", "knowledgeable", "presentation", "clarity", "delivery", "understanding"
    ],
    "helpfulness": [
        "helpful", "supportive", "approachable", "doubt", "doubts", "available", "office hours",
        "kind", "patient", "guidance", "mentorship", "friendly", "cares"
    ],
    "course_material": [
        "slides", "notes", "material", "materials", "syllabus", "textbook", "resources",
        "assignments", "homework", "projects", "practical", "lab", "examples"
    ],
    "grading_assessment": [
        "grading", "evaluation", "exam", "exams", "quiz", "quizzes", "marks", "fair",
        "strict", "assessment", "feedback", "tests", "rubric"
    ]
}


def analyze_sentiment(text: str) -> dict:
    """
    Analyze the sentiment of a given feedback text.
    Returns:
        dict containing:
            - sentiment: 'Positive' | 'Negative' | 'Neutral'
            - compound: float (-1.0 to 1.0)
            - pos: float (0.0 to 1.0)
            - neu: float (0.0 to 1.0)
            - neg: float (0.0 to 1.0)
            - subjectivity: float (0.0 to 1.0)
            - label: Friendly descriptive tag
            - keywords: list of impactful words
            - aspects: aspect-level breakdown
    """
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        return {
            "sentiment": "Neutral",
            "compound": 0.0,
            "pos": 0.0,
            "neu": 1.0,
            "neg": 0.0,
            "subjectivity": 0.0,
            "confidence": 0,
            "label": "Neutral",
            "keywords": [],
            "aspects": {}
        }

    # 1. VADER Polarity Scores
    vader_scores = _vader_analyzer.polarity_scores(cleaned_text)
    compound = round(vader_scores["compound"], 4)
    pos = round(vader_scores["pos"], 4)
    neu = round(vader_scores["neu"], 4)
    neg = round(vader_scores["neg"], 4)

    # 2. TextBlob Subjectivity
    try:
        blob = TextBlob(cleaned_text)
        subjectivity = round(blob.sentiment.subjectivity, 4)
    except Exception:
        subjectivity = 0.5

    # 3. Determine sentiment category with standard thresholds
    # Compound >= 0.05 => Positive, <= -0.05 => Negative, otherwise Neutral
    if compound >= 0.05:
        sentiment = "Positive"
    elif compound <= -0.05:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"

    # Confidence percentage based on distance from neutral threshold
    if sentiment == "Neutral":
        confidence = round((1.0 - abs(compound) * 10) * 100)
        confidence = max(50, min(95, confidence))
    else:
        confidence = round(abs(compound) * 100)
        confidence = max(55, min(99, confidence))

    # 4. Aspect-based sentiment analysis
    aspects = {}
    lower_text = cleaned_text.lower()
    sentences = re.split(r'[.!?]+', lower_text)

    for aspect_name, keywords in ASPECT_KEYWORDS.items():
        relevant_sentences = [
            s.strip() for s in sentences
            if any(kw in s for kw in keywords) and len(s.strip()) > 3
        ]
        if relevant_sentences:
            aspect_sample = ". ".join(relevant_sentences)
            aspect_vader = _vader_analyzer.polarity_scores(aspect_sample)["compound"]
            if aspect_vader >= 0.05:
                aspect_sentiment = "Positive"
            elif aspect_vader <= -0.05:
                aspect_sentiment = "Negative"
            else:
                aspect_sentiment = "Neutral"
            aspects[aspect_name] = {
                "sentiment": aspect_sentiment,
                "score": round(aspect_vader, 3)
            }

    # 5. Extract key sentiment-bearing words from text
    words = re.findall(r'\b[a-zA-Z]{3,}\b', cleaned_text)
    impactful_words = []
    seen = set()
    for word in words:
        w_lower = word.lower()
        if w_lower in seen:
            continue
        word_score = _vader_analyzer.polarity_scores(word)["compound"]
        if abs(word_score) >= 0.2:
            seen.add(w_lower)
            impactful_words.append({
                "word": word,
                "score": round(word_score, 2),
                "type": "positive" if word_score > 0 else "negative"
            })

    # Sort keywords by magnitude of impact
    impactful_words.sort(key=lambda x: abs(x["score"]), reverse=True)

    return {
        "sentiment": sentiment,
        "compound": compound,
        "pos": pos,
        "neu": neu,
        "neg": neg,
        "subjectivity": subjectivity,
        "confidence": confidence,
        "label": f"{sentiment} ({'+' if compound > 0 else ''}{compound})",
        "keywords": impactful_words[:6],
        "aspects": aspects
    }
