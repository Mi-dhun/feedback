"""
Unit tests for Sentiment Analysis module.
"""

import pytest
from sentiment import analyze_sentiment

def test_positive_sentiment():
    text = "The professor is exceptional and explains everything with amazing clarity and patience!"
    result = analyze_sentiment(text)
    assert result["sentiment"] == "Positive"
    assert result["compound"] > 0.05
    assert result["confidence"] > 50
    assert len(result["keywords"]) > 0

def test_negative_sentiment():
    text = "The lectures are terribly disorganized, exams are unfair, and assignments are frustrating."
    result = analyze_sentiment(text)
    assert result["sentiment"] == "Negative"
    assert result["compound"] < -0.05
    assert result["confidence"] > 50

def test_neutral_sentiment():
    text = "The course meets on Tuesdays and Thursdays at 10 AM in Room 302."
    result = analyze_sentiment(text)
    assert result["sentiment"] == "Neutral"
    assert abs(result["compound"]) < 0.05

def test_empty_input():
    result = analyze_sentiment("")
    assert result["sentiment"] == "Neutral"
    assert result["compound"] == 0.0

def test_aspect_detection():
    text = "Dr. Turing's explanation and lectures are clear, but the exam grading was very strict."
    result = analyze_sentiment(text)
    assert "teaching_quality" in result["aspects"]
    assert "grading_assessment" in result["aspects"]
