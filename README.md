# Conversation Analyzer Web App

This is a standalone web application for recording conversations, analyzing them using Google Gemini (Generative AI), and managing tasks and notes.

## Features

*   **Speech-to-Text**: Real-time transcription using the Web Speech API.
*   **AI Analysis**: Integrates with Google Gemini to analyze transcripts, extract tasks, generate summaries, and create Mermaid flow diagrams.
*   **Task Management**:
    *   View tasks grouped by date.
    *   Filter by Status (Active/Done) and Priority (High/Medium/Low).
    *   Mark tasks as complete.
    *   Edit and delete tasks.
*   **Note Management**:
    *   Save analyzed conversations as notes.
    *   View saved notes with summaries, transcripts, and re-rendered diagrams.
    *   Search notes by keyword.
    *   Edit note details.
    *   Export notes to Markdown.
*   **UI/UX**:
    *   Dark Mode support.
    *   Responsive design.
    *   Recording visualizer.
    *   Toast notifications and custom modals.

## Architecture

*   **Frontend**: Vanilla JavaScript, HTML5, CSS3.
    *   Uses `SpeechRecognition` API for transcription.
    *   Uses `mermaid.js` for diagram rendering.
*   **Backend**: Python Flask.
    *   **Database**: SQLite (`tasks.db`) via SQLAlchemy.
    *   **AI Integration**: `google-generativeai` library.

## Setup & Installation

### Prerequisites

*   Python 3.8+
*   A Google Cloud API Key with access to Gemini (Generative AI).

### Backend Setup

1.  Navigate to the project root.
2.  Install dependencies:
    ```bash
    pip install Flask flask-sqlalchemy google-generativeai
    ```
3.  Set your Google API Key:
    *   Create a `.env` file or set it in your environment variables:
        ```bash
        export GOOGLE_API_KEY="your_api_key_here"
        ```
    *   *Note*: The application will look for `GOOGLE_API_KEY` in the environment.

### Running the Application

1.  Start the Flask backend:
    ```bash
    python conversation-analyzer/backend/main.py
    ```
2.  Open your browser and navigate to:
    ```
    http://localhost:5000
    ```

## Usage Guide

1.  **Note Taking**:
    *   Go to the "Note Taking" tab.
    *   Click "Start Listening" to begin transcription.
    *   Speak clearly. The visualizer will animate.
    *   Click "Stop Listening" when done.
    *   Click "Analyze" to send the text to Gemini.
    *   Review the extracted tasks, summary, and diagram.
    *   Click "Save Note" to store everything.
    *   Click "Add to Tasks List" to add the extracted tasks to your task manager.

2.  **Saved Notes**:
    *   View your history of notes.
    *   Click a note to see details.
    *   Edit or Delete notes as needed.
    *   Export to Markdown for external use.

3.  **Tasks**:
    *   Manage your to-do list.
    *   Filter by priority or status.
    *   Check off items as you complete them.

## Troubleshooting

*   **Speech Recognition**: Ensure you are using a supported browser (Chrome, Edge, Safari) and have granted microphone permissions.
*   **Analysis Errors**: Check your `GOOGLE_API_KEY` and internet connection. Check the backend console for error logs.
