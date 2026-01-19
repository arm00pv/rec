# Conversation Analyzer API Documentation

This document describes the REST API endpoints available in the Conversation Analyzer backend.

## Base URL
Defaults to `http://localhost:5000` (or your deployed domain).

## Endpoints

### 1. Analyze Text
**POST** `/api/analyze`

Analyzes raw text using Google Gemini to extract tasks, summary, diagram, and metadata.

*   **Request Body:** `application/json`
    ```json
    {
      "text": "The meeting was about Project X. We need to buy servers by Friday..."
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "title": "Project X Meeting",
      "summary": "Discussion on server procurement.",
      "sentiment": "Neutral",
      "category": "Work",
      "tasks": [
        {"content": "Buy servers", "priority": "High", "due_date": "2023-10-27"}
      ],
      "diagram": "graph TD; A-->B;"
    }
    ```

### 2. Analyze Audio
**POST** `/api/analyze-audio`

Uploads an audio file for transcription and analysis.

*   **Request Body:** `multipart/form-data`
    *   `file`: The audio file (mp3, wav, etc.)
*   **Response:** `200 OK`
    ```json
    {
      "title": "Audio Note",
      "summary": "...",
      "content": "Full transcript text...",
      "sentiment": "Positive",
      "category": "Personal",
      "tasks": [...],
      "diagram": "..."
    }
    ```

### 3. Translate Content
**POST** `/api/translate`

Translates note content into a target language.

*   **Request Body:** `application/json`
    ```json
    {
      "target_language": "Spanish",
      "content": {
        "title": "Hello",
        "summary": "World",
        "tasks": [...]
      }
    }
    ```
*   **Response:** `200 OK`
    ```json
    {
      "title": "Hola",
      "summary": "Mundo",
      "tasks": [...]
    }
    ```

### 4. Tasks
**GET** `/api/tasks`
Returns all tasks grouped by date.

**POST** `/api/tasks`
Adds new tasks.
*   **Body:** `{ "date": "YYYY-MM-DD", "tasks": [{...}] }`

**PUT** `/api/tasks/<id>`
Updates task status or content.
*   **Body:** `{ "done": true }` or `{ "content": "Updated text" }`

**DELETE** `/api/tasks/<id>`
Deletes a task.

### 5. Notes
**GET** `/api/notes`
Returns list of saved notes.

**POST** `/api/notes`
Saves a new note.
*   **Body:** `{ "title": "...", "content": "...", "summary": "...", "tags": "...", "sentiment": "...", "category": "..." }`

**PUT** `/api/notes/<id>`
Updates an existing note.

**DELETE** `/api/notes/<id>`
Deletes a note.
