import pytest
import json
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app, db, Task, Note

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.test_client() as client:
        with app.app_context():
            db.drop_all() # Ensure clean state
            db.create_all()
        yield client
        with app.app_context():
            db.session.remove()
            db.drop_all()

def test_index(client):
    rv = client.get('/')
    assert rv.status_code == 200

# --- Task Tests ---
def test_add_get_tasks(client):
    # Add Task
    data = {
        "date": "2023-10-27",
        "tasks": [
            {"content": "Test Task 1", "priority": "High", "due_date": "2023-11-01"},
            "Test Task 2 (Simple String)"
        ]
    }
    rv = client.post('/api/tasks', json=data)
    assert rv.status_code == 201
    resp = rv.json
    assert len(resp['tasks']) == 2
    assert resp['tasks'][0]['priority'] == "High"
    assert resp['tasks'][1]['priority'] == "Medium" # Default

    # Get Tasks
    rv = client.get('/api/tasks')
    assert rv.status_code == 200
    assert len(rv.json) == 1
    assert rv.json[0]['date'] == "2023-10-27"
    assert len(rv.json[0]['tasks']) == 2

def test_update_delete_task(client):
    # Setup
    client.post('/api/tasks', json={"date": "2023-10-27", "tasks": [{"content": "To Delete"}]})
    tasks = client.get('/api/tasks').json[0]['tasks']
    task_id = tasks[0]['id']

    # Update
    rv = client.put(f'/api/tasks/{task_id}', json={"done": True, "content": "Updated"})
    assert rv.status_code == 200
    assert rv.json['done'] == True
    assert rv.json['content'] == "Updated"

    # Delete
    rv = client.delete(f'/api/tasks/{task_id}')
    assert rv.status_code == 200

    # Verify gone (assuming group is removed if empty, OR group exists but tasks empty)
    rv = client.get('/api/tasks')
    if rv.json:
        # If the date group still exists, check tasks inside
        assert len(rv.json[0]['tasks']) == 0
    else:
        # Or no groups returned
        assert len(rv.json) == 0

# --- Note Tests ---
def test_add_get_notes(client):
    data = {
        "title": "My Note",
        "summary": "Short summary",
        "content": "Long transcript content",
        "diagram_code": "graph TD; A-->B;"
    }
    rv = client.post('/api/notes', json=data)
    assert rv.status_code == 201

    rv = client.get('/api/notes')
    assert rv.status_code == 200
    assert len(rv.json) == 1
    assert rv.json[0]['title'] == "My Note"

def test_update_note(client):
    client.post('/api/notes', json={"content": "Init"})
    notes = client.get('/api/notes').json
    note_id = notes[0]['id']

    rv = client.put(f'/api/notes/{note_id}', json={"title": "New Title"})
    assert rv.status_code == 200
    assert rv.json['title'] == "New Title"

# --- Analysis / Translate Tests (Mocked via Env Check) ---
def test_analyze_no_key(client):
    # Ensure no API key for this test to trigger mock
    old_key = os.environ.get('GOOGLE_API_KEY')
    if old_key:
        del os.environ['GOOGLE_API_KEY']

    try:
        rv = client.post('/api/analyze', json={"text": "Plan a party"})
        assert rv.status_code == 200
        assert "(Mock)" in rv.json['title']
    finally:
        if old_key:
            os.environ['GOOGLE_API_KEY'] = old_key

def test_translate_no_key_error(client):
    old_key = os.environ.get('GOOGLE_API_KEY')
    if old_key:
        del os.environ['GOOGLE_API_KEY']

    try:
        rv = client.post('/api/translate', json={
            "target_language": "Spanish",
            "content": {"title": "Hello"}
        })
        assert rv.status_code == 500
        assert "No API Key" in rv.json['error']
    finally:
        if old_key:
            os.environ['GOOGLE_API_KEY'] = old_key
