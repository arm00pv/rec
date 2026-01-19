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

For a detailed step-by-step manual, please read the [USER_GUIDE.md](USER_GUIDE.md).

### Quick Start
1.  **Note Taking**: Record speech or upload audio -> Click "Analyze" -> Save Note.
2.  **Tasks**: Manage extracted action items in the Tasks tab.
3.  **Knowledge Base**: View categorized notes in the Knowledge Base tab.

## Troubleshooting

*   **Speech Recognition**: Ensure you are using a supported browser (Chrome, Edge, Safari) and have granted microphone permissions.
*   **Analysis Errors**: Check your `GOOGLE_API_KEY` and internet connection. Check the backend console for error logs.

## Installation & Deployment

### One-Click Install (Linux/Mac)
Run the automated installer to set up the environment, dependencies, and database:

```bash
./install.sh
```

Then run the app:
```bash
./run.sh
```

### Manual Deployment
For detailed instructions on deploying this application to a LAMP server (Linux/Apache), please see [DEPLOYMENT.md](DEPLOYMENT.md).
