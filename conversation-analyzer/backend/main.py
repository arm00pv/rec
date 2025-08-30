from flask import Flask, request, jsonify, send_from_directory
import datetime
import os

app = Flask(__name__, static_folder='../frontend')

# In-memory database for tasks
tasks = []
next_task_id = 1

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

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
        return "File uploaded successfully", 200

# API to get all tasks
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    # Sort tasks by date (newest first), and then by done status
    sorted_tasks = sorted(tasks, key=lambda d: d['date'], reverse=True)
    for date_group in sorted_tasks:
        date_group['tasks'].sort(key=lambda t: t['done'])
    return jsonify(sorted_tasks)

# API for n8n to post new tasks
@app.route("/api/tasks", methods=["POST"])
def add_task():
    global next_task_id
    if not request.json or "date" not in request.json or "tasks" not in request.json:
        return "Invalid request", 400

    date_str = request.json["date"]
    new_tasks_content = request.json["tasks"]

    # Find if a group for this date already exists
    date_group = next((g for g in tasks if g['date'] == date_str), None)

    if not date_group:
        date_group = {"date": date_str, "tasks": []}
        tasks.append(date_group)

    for task_content in new_tasks_content:
        new_task = {
            "id": next_task_id,
            "content": task_content,
            "done": False
        }
        date_group['tasks'].append(new_task)
        next_task_id += 1

    return jsonify(date_group), 201

# API to mark a task as complete
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    if not request.json or "done" not in request.json:
        return "Invalid request", 400

    for date_group in tasks:
        for task in date_group['tasks']:
            if task['id'] == task_id:
                task['done'] = request.json['done']
                return jsonify(task)

    return "Task not found", 404

if __name__ == "__main__":
    app.run(debug=True, port=5000)
