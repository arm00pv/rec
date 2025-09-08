document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const recordBtn = document.getElementById('record-btn');
    const processBtn = document.getElementById('process-btn');
    const discardBtn = document.getElementById('discard-btn');
    const audioPreview = document.getElementById('audio-preview');
    const taskListContainer = document.getElementById('task-list-container');
    const loadingTasks = document.getElementById('loading-tasks');
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');

    const recorderUI = document.getElementById('recorder-ui');
    const previewUI = document.getElementById('preview-ui');
    const processingUI = document.getElementById('processing-ui');
    const recordingStatus = document.getElementById('recording-status');
    const instructions = document.getElementById('instructions');

    const visualizer = document.getElementById('visualizer');
    const canvasCtx = visualizer.getContext('2d');

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // --- State ---
    let mediaRecorder;
    let audioChunks = [];
    let audioBlob;
    let audioUrl;
    let audioContext;
    let analyser;
    let visualizerFrame;

    // --- Tab Navigation ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            contents.forEach(item => item.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'tasks-tab') {
                fetchTasks();
            }
        });
    });

    // --- Recording Logic ---
    recordBtn.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            stopRecording();
        } else {
            await startRecording();
        }
    });

    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioUrl = URL.createObjectURL(audioBlob);
                audioPreview.src = audioUrl;

                showPreviewUI();
                audioChunks = [];
            };

            mediaRecorder.start();
            recordBtn.classList.add('recording');
            recordBtn.querySelector('i').classList.replace('fa-microphone', 'fa-stop');
            instructions.textContent = "Press the button again to stop.";
            recordingStatus.classList.remove('hidden');

            visualize(stream);

        } catch (err) {
            console.error("Error starting recording:", err);
            instructions.textContent = "Could not start recording. Please grant microphone permissions.";
        }
    }

    function stopRecording() {
        mediaRecorder.stop();
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('i').classList.replace('fa-stop', 'fa-microphone');
        instructions.textContent = "Press the button to start recording your conversation.";
        recordingStatus.classList.add('hidden');
        cancelAnimationFrame(visualizerFrame);
    }

    // --- UI State Management ---
    function showRecorderUI() {
        recorderUI.classList.remove('hidden');
        previewUI.classList.add('hidden');
        processingUI.classList.add('hidden');
        instructions.textContent = "Press the button to start recording your conversation.";
    }

    function showPreviewUI() {
        recorderUI.classList.add('hidden');
        previewUI.classList.remove('hidden');
    }

    function showProcessingUI() {
        previewUI.classList.add('hidden');
        processingUI.classList.remove('hidden');
    }

    // --- Audio Visualizer ---
    function visualize(stream) {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        const draw = () => {
            visualizerFrame = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = '#f1f1f1';
            canvasCtx.fillRect(0, 0, visualizer.width, visualizer.height);

            const barWidth = (visualizer.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(0, 123, 255)`;
                canvasCtx.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    }

    // --- File Processing and Upload ---
    discardBtn.addEventListener('click', () => {
        URL.revokeObjectURL(audioUrl);
        showRecorderUI();
    });

    processBtn.addEventListener('click', async () => {
        showProcessingUI();

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'upload', true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                console.log('Upload successful:', xhr.responseText);
                // Switch to tasks tab to see results (they might take a moment to appear)
                document.querySelector('.tab-link[data-tab="tasks-tab"]').click();
            } else {
                console.error('Upload failed:', xhr.statusText);
                alert('Upload failed. Please try again.');
            }
            // Reset UI regardless of outcome
            setTimeout(showRecorderUI, 1000);
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        };

        xhr.onerror = () => {
            console.error('Upload error:', xhr.statusText);
            alert('An error occurred during the upload. Please check your connection.');
            showRecorderUI();
        };

        xhr.send(formData);
    });


    // --- Task Management ---
    async function fetchTasks() {
        try {
            loadingTasks.classList.remove('hidden');
            taskListContainer.innerHTML = ''; // Clear previous tasks
            taskListContainer.appendChild(loadingTasks);

            const response = await fetch('api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');

            const taskGroups = await response.json();

            loadingTasks.classList.add('hidden');

            if (taskGroups.length === 0) {
                taskListContainer.innerHTML = '<p>No tasks found. Process a recording to get started!</p>';
                return;
            }

            taskListContainer.innerHTML = ''; // Clear "loading" message
            taskGroups.forEach(group => {
                const groupEl = document.createElement('div');
                groupEl.className = 'task-group';

                const dateEl = document.createElement('h3');
                dateEl.textContent = formatDate(group.date);
                groupEl.appendChild(dateEl);

                group.tasks.forEach(task => {
                    const taskEl = createTaskElement(task);
                    groupEl.appendChild(taskEl);
                });

                taskListContainer.appendChild(groupEl);
            });

        } catch (error) {
            console.error('Error fetching tasks:', error);
            loadingTasks.classList.add('hidden');
            taskListContainer.innerHTML = '<p>Could not load tasks. Please try again later.</p>';
        }
    }

    function createTaskElement(task) {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.classList.toggle('done', task.done);
        item.dataset.taskId = task.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.done;
        checkbox.addEventListener('change', () => toggleTaskDone(task.id, checkbox.checked));

        const content = document.createElement('span');
        content.className = 'task-content';
        content.textContent = task.content;
        content.addEventListener('dblclick', () => editTaskContent(task.id, content));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        item.appendChild(checkbox);
        item.appendChild(content);
        item.appendChild(deleteBtn);

        return item;
    }

    async function toggleTaskDone(taskId, isDone) {
        try {
            const response = await fetch(`api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: isDone }),
            });
            if (!response.ok) throw new Error('Failed to update task');

            // Visually move the task
            const taskItem = document.querySelector(`.task-item[data-task-id='${taskId}']`);
            taskItem.classList.toggle('done', isDone);
            const taskGroup = taskItem.parentElement;
            if (isDone) {
                taskGroup.appendChild(taskItem); // Move to bottom
            } else {
                taskGroup.insertBefore(taskItem, taskGroup.querySelector('.task-item.done')); // Move above completed
            }

        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    function editTaskContent(taskId, contentElement) {
        const currentText = contentElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'task-content-input';
        input.value = currentText;

        contentElement.replaceWith(input);
        input.focus();

        const saveChanges = async () => {
            const newContent = input.value.trim();
            if (newContent && newContent !== currentText) {
                try {
                    const response = await fetch(`api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: newContent }),
                    });
                    if (!response.ok) throw new Error('Failed to save content');
                    contentElement.textContent = newContent;
                } catch (error) {
                    console.error('Error saving content:', error);
                    contentElement.textContent = currentText; // Revert on error
                }
            } else {
                contentElement.textContent = currentText; // Revert if empty or unchanged
            }
            input.replaceWith(contentElement);
        };

        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                contentElement.textContent = currentText;
                input.replaceWith(contentElement);
            }
        });
    }

    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        try {
            const response = await fetch(`api/tasks/${taskId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete task');

            const taskItem = document.querySelector(`.task-item[data-task-id='${taskId}']`);
            taskItem.remove();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Could not delete the task.');
        }
    }

    function formatDate(dateString) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const date = new Date(dateString + 'T00:00:00'); // Assume local timezone
        return date.toLocaleDateString(undefined, options);
    }
});
