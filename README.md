# Conversation Analyzer Web App

This is a standalone web application for recording conversations, analyzing them using Google Gemini (Generative AI), and managing tasks and notes.

## Features

*   **Speech-to-Text**: Real-time transcription using the Web Speech API with a visualizer.
*   **Audio File Analysis**: Upload audio files (MP3, WAV, etc.) for transcription and analysis.
*   **AI Analysis**: Integrates with Google Gemini to analyze transcripts and extract:
    *   **Actionable Tasks** (with Priority and Due Dates).
    *   **Summaries**.
    *   **Mermaid Flow Diagrams**.
    *   **Tags/Keywords**.
    *   **Sentiment Analysis** (Positive/Neutral/Negative).
    *   **Categorization** (Meeting, Idea, Personal, Work, etc.).
*   **Task Management**:
    *   **Dashboard**: View statistics (Total, Pending, High Priority tasks).
    *   **Filtering**: Filter by Status (Active/Done) and Priority.
    *   **Export**: Export tasks to CSV.
    *   **CRUD**: Create, Edit, Delete, and Complete tasks.
*   **Note Management**:
    *   **Save & Organize**: Save analyzed conversations with all metadata.
    *   **Knowledge Base**: View notes organized by category in a dedicated repository view.
    *   **Search**: Full-text search with keyword highlighting.
    *   **Translation**: Translate note summaries and transcripts into multiple languages.
    *   **Export/Print**: Export notes to Markdown or print them as clean PDFs.
    *   **Text-to-Speech**: Listen to note summaries or transcripts.
*   **UI/UX**:
    *   Dark Mode support.
    *   Responsive design.
    *   Toast notifications and custom modals.

## Architecture

*   **Frontend**: Vanilla JavaScript, HTML5, CSS3.
    *   Uses `SpeechRecognition` API for live transcription.
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
    *   **Live Recording**: Click "Start Listening" to begin. Speak clearly. Click "Stop" when done.
    *   **File Upload**: Use the "Upload Audio" button to process an existing audio file.
    *   **Analyze**: Click "Analyze" to send text/audio to Gemini.
    *   **Review**: Check the extracted tasks, summary, diagrams, sentiment, and tags.
    *   **Save**: Save the analysis as a Note or add tasks directly to the Task Manager.

2.  **Saved Notes**:
    *   View your history. Use the search bar to find specific content.
    *   See badges for Sentiment and Category.
    *   Translate content or use Text-to-Speech.
    *   Export to Markdown.

3.  **Tasks**:
    *   Manage your to-do list.
    *   View the "Stats" dashboard for a quick overview.
    *   Filter and Sort tasks.
    *   Export your list to CSV.

## Troubleshooting

*   **Speech Recognition**: Ensure you are using a supported browser (Chrome, Edge, Safari) and have granted microphone permissions.
*   **Analysis Errors**: Check your `GOOGLE_API_KEY` and internet connection. Check the backend console for error logs.

## Deployment

For instructions on deploying this application to a LAMP server (Linux/Apache), please see [DEPLOYMENT.md](DEPLOYMENT.md).
