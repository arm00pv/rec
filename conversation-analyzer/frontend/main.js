document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startRecognitionBtn = document.getElementById('start-recognition-btn');
    const stopRecognitionBtn = document.getElementById('stop-recognition-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const transcriptionText = document.getElementById('transcription-text');

    const analysisResult = document.getElementById('analysis-result');
    const analysisTitleInput = document.getElementById('analysis-title');
    const analysisSummaryInput = document.getElementById('analysis-summary');
    const newTasksList = document.getElementById('new-tasks-list');
    const addToTasksBtn = document.getElementById('add-to-tasks-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const mermaidDiagramContainer = document.getElementById('mermaid-diagram');

    const taskListContainer = document.getElementById('task-list-container');
    const loadingTasks = document.getElementById('loading-tasks');
    const filterStatus = document.getElementById('filter-status');
    const filterPriority = document.getElementById('filter-priority');

    const noteListContainer = document.getElementById('note-list-container');
    const loadingNotes = document.getElementById('loading-notes');
    const noteListView = document.getElementById('note-list-view');
    const noteDetailView = document.getElementById('note-detail-view');
    const noteDetailContent = document.getElementById('note-detail-content');
    const backToNotesBtn = document.getElementById('back-to-notes-btn');
    const noteSearchInput = document.getElementById('note-search-input');
    const exportNoteBtn = document.getElementById('export-note-btn');

    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');

    // --- State ---
    let recognition;
    let isRecording = false;
    let analyzedTasks = [];
    let currentDiagramCode = '';
    let allNotes = [];
    let currentViewingNote = null;

    // --- Tab Navigation ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            contents.forEach(item => item.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'tasks-tab') {
                fetchTasks();
            } else if (tab.dataset.tab === 'notes-tab') {
                fetchNotes();
                noteListView.classList.remove('hidden');
                noteDetailView.classList.add('hidden');
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

        // Populate Title and Summary
        analysisTitleInput.value = result.title || "Untitled Note";
        analysisSummaryInput.value = result.summary || "";

        // Render Tasks
        newTasksList.innerHTML = '';
        analyzedTasks = result.tasks || [];

        if (analyzedTasks.length > 0) {
            analyzedTasks.forEach(task => {
                const li = document.createElement('li');
                // Support both old string format and new object format for backward compatibility/robustness
                if (typeof task === 'string') {
                    li.textContent = task;
                } else {
                    let content = `<strong>${task.content}</strong>`;
                    if (task.priority) content += ` <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>`;
                    if (task.due_date) content += ` <span class="due-date"><i class="far fa-calendar-alt"></i> ${task.due_date}</span>`;
                    li.innerHTML = content;
                }
                newTasksList.appendChild(li);
            });
            addToTasksBtn.classList.remove('hidden');
        } else {
            newTasksList.innerHTML = '<li>No tasks found.</li>';
            addToTasksBtn.classList.add('hidden');
        }

        // Render Diagram
        currentDiagramCode = result.diagram;
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
        } else {
            currentDiagramCode = '';
            mermaidDiagramContainer.innerHTML = '';
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

    saveNoteBtn.addEventListener('click', async () => {
        const content = transcriptionText.value.trim();
        if (!content) return;

        const title = analysisTitleInput.value.trim() || "Untitled Note";
        const summary = analysisSummaryInput.value.trim();

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    diagram_code: currentDiagramCode,
                    title: title,
                    summary: summary
                })
            });

            if (!response.ok) throw new Error('Failed to save note');
            alert('Note saved successfully!');
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Failed to save note.');
        }
    });

    // --- Saved Notes Logic ---
    async function fetchNotes() {
        try {
            loadingNotes.classList.remove('hidden');
            noteListContainer.innerHTML = '';
            noteListContainer.appendChild(loadingNotes);

            const response = await fetch('/api/notes');
            if (!response.ok) throw new Error('Failed to fetch notes');

            allNotes = await response.json(); // Store all notes for filtering
            loadingNotes.classList.add('hidden');

            renderNotesList(allNotes);

        } catch (error) {
            console.error('Error fetching notes:', error);
            loadingNotes.classList.add('hidden');
            noteListContainer.innerHTML = '<p>Error loading notes.</p>';
        }
    }

    function renderNotesList(notes) {
        noteListContainer.innerHTML = '';
        if (notes.length === 0) {
            noteListContainer.innerHTML = '<p>No saved notes found.</p>';
            return;
        }

        notes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';

            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'note-summary';

            const date = new Date(note.created_at).toLocaleString();
            const title = note.title || "Untitled";
            const summaryText = note.summary || note.content.substring(0, 50) + "...";

            summaryDiv.innerHTML = `
                <span class="note-date">${date}</span>
                <strong style="display:block; font-size:1.1em; margin-bottom:5px;">${title}</strong>
                <span class="note-preview">${summaryText}</span>
            `;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteNote(note.id, noteEl);
            };

            noteEl.appendChild(summaryDiv);
            noteEl.appendChild(deleteBtn);
            noteEl.onclick = () => viewNoteDetail(note);

            noteListContainer.appendChild(noteEl);
        });
    }

    // Search Notes
    noteSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allNotes.filter(note => {
            const title = (note.title || '').toLowerCase();
            const content = (note.content || '').toLowerCase();
            const summary = (note.summary || '').toLowerCase();
            return title.includes(term) || content.includes(term) || summary.includes(term);
        });
        renderNotesList(filtered);
    });

    async function deleteNote(noteId, element) {
        if (!confirm('Delete this note?')) return;
        try {
            const response = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
            if (response.ok) {
                // remove from allNotes array too
                allNotes = allNotes.filter(n => n.id !== noteId);
                element.remove();
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    }

    async function viewNoteDetail(note) {
        currentViewingNote = note;
        noteListView.classList.add('hidden');
        noteDetailView.classList.remove('hidden');

        noteDetailContent.innerHTML = `
            <h2>${note.title || 'Untitled'}</h2>
            <p class="note-date">Created: ${new Date(note.created_at).toLocaleString()}</p>

            ${note.summary ? `
            <div class="analysis-section">
                <h3>Summary</h3>
                <p>${note.summary}</p>
            </div>` : ''}

            <div class="analysis-section">
                <h3>Transcript</h3>
                <p>${note.content}</p>
            </div>
            ${note.diagram_code ? `
            <div class="analysis-section">
                <h3>Flow Diagram</h3>
                <div class="mermaid" id="note-mermaid-diagram">${note.diagram_code}</div>
            </div>` : ''}
        `;

        if (note.diagram_code) {
             const container = document.getElementById('note-mermaid-diagram');
             try {
                await mermaid.run({ nodes: [container] });
            } catch (e) {
                console.error('Mermaid error:', e);
            }
        }
    }

    exportNoteBtn.addEventListener('click', () => {
        if (!currentViewingNote) return;
        const note = currentViewingNote;
        const dateStr = new Date(note.created_at).toISOString().split('T')[0];
        const filename = `note_${dateStr}_${note.id}.md`;

        let markdown = `# ${note.title || 'Untitled'}\n\n`;
        markdown += `**Date:** ${new Date(note.created_at).toLocaleString()}\n\n`;

        if (note.summary) {
            markdown += `## Summary\n${note.summary}\n\n`;
        }

        markdown += `## Transcript\n${note.content}\n\n`;

        if (note.diagram_code) {
            markdown += `## Diagram\n\`\`\`mermaid\n${note.diagram_code}\n\`\`\`\n`;
        }

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    backToNotesBtn.addEventListener('click', () => {
        noteDetailView.classList.add('hidden');
        noteListView.classList.remove('hidden');
        currentViewingNote = null;
    });

    // --- Task Management ---

    // Filters
    filterStatus.addEventListener('change', fetchTasks);
    filterPriority.addEventListener('change', fetchTasks);

    async function fetchTasks() {
        try {
            loadingTasks.classList.remove('hidden');
            taskListContainer.innerHTML = ''; // Clear previous tasks
            taskListContainer.appendChild(loadingTasks);

            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');

            const taskGroups = await response.json();

            loadingTasks.classList.add('hidden');
            taskListContainer.innerHTML = '';

            if (taskGroups.length === 0) {
                taskListContainer.innerHTML = '<p>No tasks found.</p>';
                return;
            }

            const statusFilter = filterStatus.value;
            const priorityFilter = filterPriority.value;

            let hasVisibleTasks = false;

            taskGroups.forEach(group => {
                // Filter tasks inside group
                const filteredTasks = group.tasks.filter(task => {
                    let statusMatch = true;
                    if (statusFilter === 'active') statusMatch = !task.done;
                    if (statusFilter === 'done') statusMatch = task.done;

                    let priorityMatch = true;
                    if (priorityFilter !== 'all') {
                        priorityMatch = (task.priority === priorityFilter);
                    }

                    return statusMatch && priorityMatch;
                });

                if (filteredTasks.length > 0) {
                    hasVisibleTasks = true;
                    const groupEl = document.createElement('div');
                    groupEl.className = 'task-group';

                    const dateEl = document.createElement('h3');
                    dateEl.textContent = formatDate(group.date);
                    groupEl.appendChild(dateEl);

                    filteredTasks.forEach(task => {
                        const taskEl = createTaskElement(task);
                        groupEl.appendChild(taskEl);
                    });

                    taskListContainer.appendChild(groupEl);
                }
            });

            if (!hasVisibleTasks) {
                taskListContainer.innerHTML = '<p>No tasks match your filters.</p>';
            }

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

        let contentHtml = task.content;
        const meta = document.createElement('div');
        meta.className = 'task-meta';

        if (task.priority) {
            const badge = document.createElement('span');
            badge.className = `priority-badge priority-${task.priority.toLowerCase()}`;
            badge.textContent = task.priority;
            meta.appendChild(badge);
        }
        if (task.due_date) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'due-date';

            // Check overdue
            if (!task.done && new Date(task.due_date) < new Date().setHours(0,0,0,0)) {
                dateSpan.classList.add('overdue');
                dateSpan.innerHTML = `<i class="far fa-calendar-times"></i> ${task.due_date} (Overdue)`;
            } else {
                dateSpan.innerHTML = `<i class="far fa-calendar-alt"></i> ${task.due_date}`;
            }
            meta.appendChild(dateSpan);
        }

        content.innerHTML = contentHtml;

        const wrapper = document.createElement('div');
        wrapper.style.flexGrow = '1';

        const textDiv = document.createElement('div');
        textDiv.textContent = task.content;
        textDiv.style.marginBottom = '5px';
        textDiv.addEventListener('dblclick', () => editTaskContent(task.id, textDiv));

        wrapper.appendChild(textDiv);
        wrapper.appendChild(meta);

        content.replaceWith(wrapper);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        item.appendChild(checkbox);
        item.appendChild(wrapper);
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

            // Refresh logic to respect filters
            fetchTasks();

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

            fetchTasks(); // Refresh to respect sorting/groups

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
