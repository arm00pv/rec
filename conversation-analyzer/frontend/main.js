document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'tasks-tab') {
                fetchTasks();
            }
        });
    });

    const tasksContainer = document.getElementById('tasks-container');
    tasksContainer.addEventListener('click', async (event) => {
        if (event.target.type === 'checkbox') {
            const taskItem = event.target.closest('li');
            const taskId = taskItem.dataset.taskId;
            const isDone = event.target.checked;
            await updateTask(taskId, isDone);
            await fetchTasks();
        }
    });

    fetchTasks();
});

async function updateTask(taskId, isDone) {
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ done: isDone }),
        });
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        const taskGroups = await response.json();
        renderTasks(taskGroups);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function renderTasks(taskGroups) {
    const tasksContainer = document.getElementById('tasks-container');
    tasksContainer.innerHTML = '';

    taskGroups.forEach(group => {
        const dateTitle = document.createElement('h3');
        dateTitle.textContent = new Date(group.date).toLocaleDateString();
        tasksContainer.appendChild(dateTitle);

        const taskList = document.createElement('ul');
        group.tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.dataset.taskId = task.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.done;

            const label = document.createElement('label');
            label.textContent = task.content;

            if (task.done) {
                taskItem.classList.add('done');
                label.textContent = '✅ ' + label.textContent;
            }

            taskItem.prepend(checkbox);
            taskItem.appendChild(label);
            taskList.appendChild(taskItem);
        });
        tasksContainer.appendChild(taskList);
    });
}

const recordButton = document.getElementById('record-button');

let isRecording = false;
let mediaRecorder;
let recordedChunks = [];

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

            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");

            fetch("/upload", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    console.log("File uploaded successfully");
                } else {
                    console.error("File upload failed");
                }
            })
            .catch(error => {
                console.error("Error uploading file:", error);
            });

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
