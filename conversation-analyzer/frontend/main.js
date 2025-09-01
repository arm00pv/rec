document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Switching ---
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'tasks-tab') {
                fetchTasks();
            }
        });
    });

    // --- Task Event Listeners ---
    const tasksContainer = document.getElementById('tasks-container');
    tasksContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const taskItem = target.closest('li');
        if (!taskItem) return;

        const taskId = taskItem.dataset.taskId;

        if (target.type === 'checkbox') {
            await updateTask(taskId, { done: target.checked });
        } else if (target.classList.contains('delete-button')) {
            await deleteTask(taskId);
            await fetchTasks();
        }
    });

    tasksContainer.addEventListener('dblclick', (event) => {
        const target = event.target;
        if (target.tagName === 'LABEL') {
            makeTaskEditable(target);
        }
    });

    fetchTasks();
});

function makeTaskEditable(label) {
    const taskItem = label.closest('li');
    const originalText = label.textContent.replace('✅ ', '');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.classList.add('edit-input');

    label.style.display = 'none';
    taskItem.insertBefore(input, label);
    input.focus();

    const saveChanges = async () => {
        const newContent = input.value.trim();
        if (newContent && newContent !== originalText) {
            const taskId = taskItem.dataset.taskId;
            await updateTask(taskId, { content: newContent });
            await fetchTasks();
        } else {
            label.style.display = '';
            input.remove();
        }
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            label.style.display = '';
            input.remove();
        }
    });
}


// --- API Functions for Tasks ---
async function deleteTask(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function updateTask(taskId, payload) {
    try {
        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const taskGroups = await response.json();
        renderTasks(taskGroups);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// --- Rendering Functions ---
function renderTasks(taskGroups) {
    const tasksContainer = document.getElementById('tasks-container');
    tasksContainer.innerHTML = '';

    if (!taskGroups || taskGroups.length === 0) {
        tasksContainer.innerHTML = '<p>No tasks yet. Record a conversation to get started!</p>';
        return;
    }

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

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '❌';
            deleteButton.classList.add('delete-button');

            taskItem.prepend(checkbox);
            taskItem.appendChild(label);
            taskItem.appendChild(deleteButton);
            taskList.appendChild(taskItem);
        });
        tasksContainer.appendChild(taskList);
    });
}


// --- Recording Logic ---
const recordButton = document.getElementById('record-button');
const previewContainer = document.getElementById('preview-container');
const audioPreview = document.getElementById('audio-preview');
const processButton = document.getElementById('process-button');
const discardButton = document.getElementById('discard-button');

let isRecording = false;
let mediaRecorder;
let recordedChunks = [];
let recordedBlob = null;

function resetRecordingUI() {
    recordButton.classList.remove('hidden');
    previewContainer.classList.add('hidden');
    recordedBlob = null;
    recordedChunks = [];
    audioPreview.src = '';
}

async function uploadAudio(blob) {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    console.log("Uploading audio file...");
    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });
        if (response.ok) {
            console.log("File uploaded successfully");
            alert("File uploaded successfully! Tasks will be generated shortly.");
        } else {
            console.error("File upload failed with status:", response.status);
            alert("File upload failed.");
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("An error occurred while uploading the file.");
    }
    resetRecordingUI();
}

recordButton.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                const audioURL = URL.createObjectURL(recordedBlob);
                audioPreview.src = audioURL;

                recordButton.classList.add('hidden');
                previewContainer.classList.remove('hidden');
            };

            mediaRecorder.start();
            recordButton.textContent = 'Stop';
            isRecording = true;
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access the microphone. Please ensure you have granted permission and are using a secure connection (HTTPS).");
        }
    } else {
        mediaRecorder.stop();
        recordButton.textContent = 'Record';
        isRecording = false;
    }
});

processButton.addEventListener('click', () => {
    if (recordedBlob) {
        uploadAudio(recordedBlob);
    }
});

discardButton.addEventListener('click', resetRecordingUI);
