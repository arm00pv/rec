import pytest
import os
import sys
from io import BytesIO

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app, db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client

def test_analyze_audio_no_key_mock(client):
    # Ensure no API key
    if 'GOOGLE_API_KEY' in os.environ:
        del os.environ['GOOGLE_API_KEY']

    # Create fake audio file
    data = {
        'file': (BytesIO(b"fake audio data"), 'test_audio.wav')
    }

    rv = client.post('/api/analyze-audio', data=data, content_type='multipart/form-data')
    assert rv.status_code == 200
    assert "(Mock Audio)" in rv.json['title']
    assert "mock transcript" in rv.json['content']

def test_analyze_audio_no_file(client):
    rv = client.post('/api/analyze-audio', data={}, content_type='multipart/form-data')
    assert rv.status_code == 400
    assert b"No file part" in rv.data
