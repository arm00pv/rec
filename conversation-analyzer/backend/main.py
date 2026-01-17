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

    def to_dict(self):
        return {"id": self.id, "content": self.content, "done": self.done}

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

            Text:
            {text}

            Return the result in the following JSON format ONLY (no markdown blocks):
            {{
                "tasks": ["Task 1", "Task 2", ...],
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
                "tasks": ["Check API Key configuration", "Review logs"],
                "diagram": "graph TD; Error[Error calling Gemini] --> CheckLog[Check Logs]"
            })
    else:
        # Mock response if no key provided
        print("No GOOGLE_API_KEY found. Using mock response.")
        return jsonify({
            "tasks": ["(Mock) Buy groceries", "(Mock) Call mom", "(Mock) Schedule meeting"],
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
    new_tasks_content = request.json["tasks"]
    added_tasks = []
    for task_content in new_tasks_content:
        new_task = Task(content=task_content, task_date=date_str, done=False)
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
