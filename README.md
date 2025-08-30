# Conversation Analyzer Web App (with n8n and Google Gemini)

This document outlines the steps to create a web application that can record a conversation and use an n8n workflow to analyze it with Google Gemini and create tasks.

## Architecture Overview

The application follows this workflow:

1.  **Frontend**: A user records a conversation in the browser.
2.  **n8n Webhook**: The frontend sends the audio recording to a dedicated n8n webhook.
3.  **n8n Workflow**:
    *   The workflow is triggered by the webhook.
    *   It sends the audio to Google Gemini for transcription.
    *   It sends the transcript to Google Gemini for analysis and task extraction.
    *   It formats the extracted tasks.
    *   It sends the tasks back to our Flask backend via a POST request.
4.  **Flask Backend**:
    *   Serves the frontend application.
    *   Provides API endpoints to receive, store, and manage tasks.
5.  **Frontend (Tasks Tab)**:
    *   A "Tasks" tab displays the list of tasks received from the backend.
    *   Users can view tasks with date and time.
    *   Users can mark tasks as complete with a checkbox.
    *   Completed tasks are marked with a ✅ and moved to the bottom of the list.

## Development Plan

### 1. Backend Setup (Flask)

First, ensure your `conversation-analyzer/backend/requirements.txt` file contains Flask:

```
Flask==2.3.2
```

Next, replace the content of `conversation-analyzer/backend/main.py` with the following code. This sets up all the necessary API endpoints for managing tasks.

```python
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
```

### 2. Frontend Setup

This section provides the complete code for the frontend files.

#### `index.html`

Replace the content of `conversation-analyzer/frontend/index.html` with this code. It adds the tab navigation and containers for the recorder and the tasks.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversation Analyzer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav>
        <a href="#" id="recorder-tab" class="active">Recorder</a>
        <a href="#" id="tasks-tab">Tasks</a>
    </nav>

    <main id="recorder-view">
        <h1>Conversation Analyzer</h1>
        <button id="record-button">Record</button>
    </main>

    <main id="tasks-view" class="hidden">
        <h1>Tasks</h1>
        <ul id="task-list"></ul>
    </main>

    <script src="main.js"></script>
</body>
</html>
```

#### `style.css`

Replace the content of `conversation-analyzer/frontend/style.css` with this code. It includes styles for the new navigation tabs and task list.

```css
body {
    font-family: sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f4f4f4;
}

nav {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

nav a {
    padding: 10px 20px;
    text-decoration: none;
    color: #333;
    border-bottom: 2px solid transparent;
}

nav a.active {
    border-bottom: 2px solid #007bff;
}

main {
    text-align: center;
}

.hidden {
    display: none;
}

#task-list {
    list-style-type: none;
    padding: 0;
    max-width: 600px;
    margin: 0 auto;
    text-align: left;
}

#task-list li {
    background-color: #fff;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 5px;
    display: flex;
    align-items: center;
}

#task-list li.done {
    text-decoration: line-through;
    color: #888;
}

#task-list li input[type="checkbox"] {
    margin-right: 15px;
}
```

#### `main.js`

Replace the content of `conversation-analyzer/frontend/main.js` with this code. It contains all the logic for recording, tab switching, and task management.

```javascript
document.addEventListener("DOMContentLoaded", () => {
    const recorderTab = document.getElementById("recorder-tab");
    const tasksTab = document.getElementById("tasks-tab");
    const recorderView = document.getElementById("recorder-view");
    const tasksView = document.getElementById("tasks-view");
    const recordButton = document.getElementById("record-button");
    const taskList = document.getElementById("task-list");

    const N8N_WEBHOOK_URL = "YOUR_N8N_WEBHOOK_URL_HERE"; // <-- IMPORTANT: Replace with your n8n webhook URL

    let isRecording = false;
    let mediaRecorder;
    let recordedChunks = [];

    // Tab switching logic
    recorderTab.addEventListener("click", (e) => {
        e.preventDefault();
        recorderView.classList.remove("hidden");
        tasksView.classList.add("hidden");
        recorderTab.classList.add("active");
        tasksTab.classList.remove("active");
    });

    tasksTab.addEventListener("click", (e) => {
        e.preventDefault();
        recorderView.classList.add("hidden");
        tasksView.classList.remove("hidden");
        recorderTab.classList.remove("active");
        tasksTab.classList.add("active");
        fetchTasks();
    });

    // Recording logic
    recordButton.addEventListener('click', async () => {
        if (!isRecording) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                sendToN8n(blob);
                recordedChunks = [];
            };

            mediaRecorder.start();
            recordButton.textContent = 'Stop';
            isRecording = true;
        } else {
            mediaRecorder.stop();
            recordButton.textContent = 'Record';
            isRecording = false;
        }
    });

    function sendToN8n(blob) {
        if (N8N_WEBHOOK_URL === "YOUR_N8N_WEBHOOK_URL_HERE") {
            alert("Please replace YOUR_N8N_WEBHOOK_URL_HERE in main.js with your actual n8n webhook URL.");
            return;
        }
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (response.ok) {
                alert("File uploaded successfully to n8n! Tasks will appear shortly.");
            } else {
                alert("File upload to n8n failed.");
            }
        })
        .catch(error => {
            console.error("Error uploading file to n8n:", error);
            alert("Error uploading file to n8n.");
        });
    }

    // Task management logic
    async function fetchTasks() {
        try {
            const response = await fetch("/api/tasks");
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = "";
        tasks.forEach(task => {
            const li = document.createElement("li");
            if (task.done) {
                li.classList.add("done");
            }
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = task.done;
            checkbox.addEventListener("change", () => markTaskComplete(task.id, checkbox.checked));

            const content = document.createElement("span");
            const taskDate = new Date(task.timestamp).toLocaleString();
            content.textContent = `${task.content} (Created: ${taskDate})`;

            const emoji = document.createElement("span");
            if(task.done) {
                emoji.textContent = " ✅";
            }

            li.appendChild(checkbox);
            li.appendChild(content);
            li.appendChild(emoji);
            taskList.appendChild(li);
        });
    }

    async function markTaskComplete(taskId, isDone) {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ done: isDone })
            });
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error("Error updating task:", error);
        }
    }
});
```

### 3. n8n Workflow Setup

*   This part is external to this codebase. The user needs to set up an n8n instance and create the workflow.
*   **Webhook URL**: The user must get the webhook URL from their n8n workflow and replace the `YOUR_N8N_WEBHOOK_URL_HERE` placeholder in `conversation-analyzer/frontend/main.js`.
