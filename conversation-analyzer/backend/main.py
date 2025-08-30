from flask import Flask, request, jsonify
import datetime

app = Flask(__name__)

# In-memory database for tasks
tasks = []
next_task_id = 1

@app.route("/")
def hello_world():
    # This could serve the frontend's index.html, but for now we leave it
    return "Hello, World! This is the backend."

# API to get all tasks
@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    sorted_tasks = sorted(tasks, key=lambda t: t['done'])
    return jsonify(sorted_tasks)

# API for n8n to post new tasks
@app.route("/api/tasks", methods=["POST"])
def add_task():
    global next_task_id
    if not request.json or "task" not in request.json:
        return "Invalid request", 400

    task_content = request.json["task"]

    new_task = {
        "id": next_task_id,
        "content": task_content,
        "timestamp": datetime.datetime.now().isoformat(),
        "done": False
    }
    tasks.append(new_task)
    next_task_id += 1

    return jsonify(new_task), 201

# API to mark a task as complete
@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = next((t for t in tasks if t["id"] == task_id), None)
    if task is None:
        return "Task not found", 404

    if not request.json or "done" not in request.json:
        return "Invalid request", 400

    task["done"] = request.json["done"]

    return jsonify(task)
