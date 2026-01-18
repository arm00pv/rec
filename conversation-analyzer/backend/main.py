from flask import Flask, request, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from collections import defaultdict
import datetime
import os
import subprocess
import hmac
import hashlib
import requests
import uuid
import google.generativeai as genai
import json

app = Flask(__name__, static_folder='../frontend')

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Upload Folder ---
UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Database Model ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    task_date = db.Column(db.String(20), nullable=False)
    done = db.Column(db.Boolean, default=False)
    priority = db.Column(db.String(20), default="Medium")
    due_date = db.Column(db.String(20), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "done": self.done,
            "priority": self.priority,
            "due_date": self.due_date
        }

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    diagram_code = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.String(30), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "diagram_code": self.diagram_code,
            "created_at": self.created_at
        }

# --- CLI Command to Init DB ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    db.create_all()
    print("Initialized the database.")

# --- Static File Serving ---
@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # This serves files from the 'frontend' directory
    return send_from_directory(app.static_folder, path)

# --- Analysis Endpoint ---
@app.route("/api/analyze", methods=["POST"])
def analyze_text():
    if not request.json or "text" not in request.json:
        return "Invalid request", 400

    text = request.json["text"]

    # Check for Gemini API key
    api_key = os.environ.get('GOOGLE_API_KEY')

    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')

            prompt = f"""
            Analyze the following text and extract actionable tasks and create a Mermaid diagram representing the flow or concepts.
            For each task, assign a priority (High, Medium, Low) and extract a due date (YYYY-MM-DD) if explicitly mentioned (otherwise null).

            Text:
            {text}

            Return the result in the following JSON format ONLY (no markdown blocks):
            {{
                "tasks": [
                    {{"content": "Task description...", "priority": "High", "due_date": "2023-10-27"}},
                    ...
                ],
                "diagram": "graph TD; A-->B; ..."
            }}
            """

            response = model.generate_content(prompt)
            # Clean up response text if it contains markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            result = json.loads(response_text)
            return jsonify(result)

        except Exception as e:
            print(f"Error calling Gemini: {e}")
            # Fallback to mock response in case of error
            return jsonify({
                "tasks": [
                    {"content": "Check API Key configuration", "priority": "High", "due_date": None},
                    {"content": "Review logs", "priority": "Medium", "due_date": None}
                ],
                "diagram": "graph TD; Error[Error calling Gemini] --> CheckLog[Check Logs]"
            })
    else:
        # Mock response if no key provided
        print("No GOOGLE_API_KEY found. Using mock response.")
        return jsonify({
            "tasks": [
                {"content": "(Mock) Buy groceries", "priority": "Medium", "due_date": "2023-12-01"},
                {"content": "(Mock) Call mom", "priority": "High", "due_date": None},
                {"content": "(Mock) Schedule meeting", "priority": "Low", "due_date": "2023-12-05"}
            ],
            "diagram": "graph TD; A[Start] --> B{Is it sunny?}; B -- Yes --> C[Go outside]; B -- No --> D[Stay inside];"
        })

# --- Task API Endpoints ---
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    tasks = Task.query.order_by(Task.task_date.desc(), Task.done.asc()).all()
    grouped_tasks = defaultdict(list)
    for task in tasks:
        grouped_tasks[task.task_date].append(task.to_dict())
    output = [{"date": date, "tasks": tasks} for date, tasks in grouped_tasks.items()]
    output.sort(key=lambda x: x['date'], reverse=True)
    return jsonify(output)

@app.route("/api/tasks", methods=["POST"])
def add_task():
    if not request.json or "date" not in request.json or "tasks" not in request.json:
        return "Invalid request", 400
    date_str = request.json["date"]
    new_tasks_data = request.json["tasks"]
    added_tasks = []

    for task_item in new_tasks_data:
        # Handle both old format (string) and new format (dict)
        if isinstance(task_item, str):
            content = task_item
            priority = "Medium"
            due_date = None
        else:
            content = task_item.get("content", "New Task")
            priority = task_item.get("priority", "Medium")
            due_date = task_item.get("due_date")

        new_task = Task(
            content=content,
            task_date=date_str,
            done=False,
            priority=priority,
            due_date=due_date
        )
        db.session.add(new_task)
        added_tasks.append(new_task)

    db.session.commit()
    return jsonify({"date": date_str, "tasks": [t.to_dict() for t in added_tasks]}), 201

@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return "Task not found", 404
    if 'done' in request.json:
        task.done = request.json['done']
    if 'content' in request.json:
        task.content = request.json['content']
    db.session.commit()
    return jsonify(task.to_dict())

@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        return "Task not found", 404
    db.session.delete(task)
    db.session.commit()
    return "Task deleted successfully", 200

# --- Note API Endpoints ---
@app.route("/api/notes", methods=["GET"])
def get_notes():
    notes = Note.query.order_by(Note.created_at.desc()).all()
    return jsonify([note.to_dict() for note in notes])

@app.route("/api/notes", methods=["POST"])
def add_note():
    if not request.json or "content" not in request.json:
        return "Invalid request", 400

    content = request.json["content"]
    diagram_code = request.json.get("diagram_code")
    created_at = datetime.datetime.now().isoformat()

    new_note = Note(content=content, diagram_code=diagram_code, created_at=created_at)
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201

@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    note = db.session.get(Note, note_id)
    if note is None:
        return "Note not found", 404
    db.session.delete(note)
    db.session.commit()
    return "Note deleted successfully", 200

# --- Webhook Endpoint for GitHub CI/CD ---
@app.route("/webhook", methods=["POST"])
def webhook():
    signature = request.headers.get('X-Hub-Signature-256')
    if not signature:
        abort(403)
    secret = os.environ.get('GITHUB_WEBHOOK_SECRET', '').encode()
    if not secret:
        abort(500, "Webhook secret not configured on the server.")
    mac = hmac.new(secret, msg=request.data, digestmod=hashlib.sha256)
    expected_signature = "sha256=" + mac.hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        abort(403)
    if request.json.get('ref') == 'refs/heads/main':
        # Ensure the script is executable: chmod +x update.sh
        subprocess.Popen(['./update.sh'])
        return "Update process started", 202
    return "No update needed", 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
