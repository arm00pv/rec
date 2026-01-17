document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startRecognitionBtn = document.getElementById('start-recognition-btn');
    const stopRecognitionBtn = document.getElementById('stop-recognition-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const transcriptionText = document.getElementById('transcription-text');

    const analysisResult = document.getElementById('analysis-result');
    const newTasksList = document.getElementById('new-tasks-list');
    const addToTasksBtn = document.getElementById('add-to-tasks-btn');
    const mermaidDiagramContainer = document.getElementById('mermaid-diagram');

    const taskListContainer = document.getElementById('task-list-container');
    const loadingTasks = document.getElementById('loading-tasks');
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');

    // --- State ---
    let recognition;
    let isRecording = false;
    let analyzedTasks = [];

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

    // --- Speech Recognition Logic ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            startRecognitionBtn.classList.add('hidden');
            stopRecognitionBtn.classList.remove('hidden');
        };

        recognition.onend = () => {
            isRecording = false;
            startRecognitionBtn.classList.remove('hidden');
            stopRecognitionBtn.classList.add('hidden');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Append final transcript to textarea
            if (finalTranscript) {
                transcriptionText.value += finalTranscript + ' ';
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            stopRecording();
        };

    } else {
        startRecognitionBtn.disabled = true;
        transcriptionText.value = "Web Speech API not supported in this browser.";
    }

    startRecognitionBtn.addEventListener('click', () => {
        if (recognition && !isRecording) {
            recognition.start();
        }
    });

    stopRecognitionBtn.addEventListener('click', () => {
        stopRecording();
    });

    function stopRecording() {
        if (recognition && isRecording) {
            recognition.stop();
        }
    }

    // --- Analysis Logic ---
    analyzeBtn.addEventListener('click', async () => {
        const text = transcriptionText.value.trim();
        if (!text) {
            alert('Please record or type some text first.');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();
            await displayAnalysisResult(result);

        } catch (error) {
            console.error('Error during analysis:', error);
            alert('Analysis failed. Check console for details.');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze';
        }
    });

    async function displayAnalysisResult(result) {
        analysisResult.classList.remove('hidden');

        // Render Tasks
        newTasksList.innerHTML = '';
        analyzedTasks = result.tasks || [];

        if (analyzedTasks.length > 0) {
            analyzedTasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task;
                newTasksList.appendChild(li);
            });
            addToTasksBtn.classList.remove('hidden');
        } else {
            newTasksList.innerHTML = '<li>No tasks found.</li>';
            addToTasksBtn.classList.add('hidden');
        }

        // Render Diagram
        if (result.diagram) {
            mermaidDiagramContainer.innerHTML = result.diagram;
            mermaidDiagramContainer.removeAttribute('data-processed'); // Reset for re-rendering
            try {
                await mermaid.run({
                    nodes: [mermaidDiagramContainer]
                });
            } catch (e) {
                console.error('Mermaid rendering error:', e);
                mermaidDiagramContainer.innerHTML = '<p>Error rendering diagram.</p><pre>' + result.diagram + '</pre>';
            }
        }
    }

    addToTasksBtn.addEventListener('click', async () => {
        if (analyzedTasks.length === 0) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: today,
                    tasks: analyzedTasks
                })
            });

            if (!response.ok) throw new Error('Failed to add tasks');

            alert('Tasks added successfully!');
            addToTasksBtn.classList.add('hidden'); // Prevent double add

        } catch (error) {
            console.error('Error adding tasks:', error);
            alert('Failed to add tasks.');
        }
    });

    // --- Task Management (Existing Logic) ---
    async function fetchTasks() {
        try {
            loadingTasks.classList.remove('hidden');
            taskListContainer.innerHTML = ''; // Clear previous tasks
            taskListContainer.appendChild(loadingTasks);

            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');

            const taskGroups = await response.json();

            loadingTasks.classList.add('hidden');

            if (taskGroups.length === 0) {
                taskListContainer.innerHTML = '<p>No tasks found.</p>';
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
            const response = await fetch(`/api/tasks/${taskId}`, {
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
                    const response = await fetch(`/api/tasks/${taskId}`, {
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
            const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
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
