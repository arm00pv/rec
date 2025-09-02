from flask import Flask, request, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from collections import defaultdict
import datetime
import os
import subprocess
import hmac
import hashlib
import requests

app = Flask(__name__, static_folder='../frontend')

# --- Database Configuration ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Model ---
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    task_date = db.Column(db.String(20), nullable=False)
    done = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "done": self.done
        }

# --- CLI Command to Init DB ---
@app.cli.command("init-db")
def init_db_command():
    """Creates the database tables."""
    db.create_all()
    print("Initialized the database.")

# --- Static File Serving ---
UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# --- API Endpoints ---
def trigger_n8n_workflow():
    webhook_url = os.environ.get('N8N_WEBHOOK_URL')
    if webhook_url:
        try:
            # You can send data if your n8n workflow expects it, e.g., the filename
            payload = {'file': 'recording.webm', 'timestamp': datetime.datetime.now().isoformat()}
            requests.post(webhook_url, json=payload, timeout=5)
            print(f"Triggered n8n webhook at {webhook_url}")
        except requests.exceptions.RequestException as e:
            print(f"Error triggering n8n webhook: {e}")

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'audio' not in request.files:
        return "No audio file part", 400
    file = request.files['audio']
    if file.filename == '':
        return "No selected file", 400
    if file:
        filename = "recording.webm"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # Trigger the n8n workflow
        trigger_n8n_workflow()

        return "File uploaded successfully, processing started.", 200

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    tasks = Task.query.order_by(Task.task_date.desc(), Task.done.asc()).all()

    grouped_tasks = defaultdict(list)
    for task in tasks:
        grouped_tasks[task.task_date].append(task.to_dict())

    output = [
        {"date": date, "tasks": tasks} for date, tasks in grouped_tasks.items()
    ]
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

    return jsonify({
        "date": date_str,
        "tasks": [t.to_dict() for t in added_tasks]
    }), 201

@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    if not request.json:
        return "Invalid request", 400

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

# --- Webhook Endpoint ---
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
        subprocess.Popen(['./update.sh'])
        return "Update process started", 202

    return "No update needed", 200

# --- Main Execution ---
if __name__ == "__main__":
    app.run(debug=True, port=5000)
