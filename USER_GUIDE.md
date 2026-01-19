# Conversation Analyzer - User Guide

This guide provides step-by-step instructions on how to use the features of the Conversation Analyzer application.

## Table of Contents
1.  [Getting Started](#getting-started)
2.  [Note Taking (Recording & Analysis)](#note-taking)
3.  [Saved Notes & Knowledge Base](#saved-notes--knowledge-base)
4.  [Task Management](#task-management)
5.  [Translation](#translation)
6.  [Exporting & Printing](#exporting--printing)

---

## Getting Started

1.  **Open the App**: Navigate to `http://localhost:5000` (or your deployed URL) in your web browser.
2.  **Permissions**: When prompted, allow the browser to access your **microphone**. This is required for speech-to-text functionality.
3.  **API Key**: Ensure the administrator has configured the Google Gemini API Key. If not, the app will run in "Mock Mode" (simulating analysis).

---

## Note Taking

The **Note Taking** tab is the main interface for capturing conversations.

### Recording Speech
1.  Select your language from the dropdown menu (e.g., "English (US)", "Spanish").
2.  Click the **Start Listening** button.
3.  Speak clearly into your microphone. You will see the text appearing in the transcript box in real-time.
4.  A visualizer wave will animate while recording is active.
5.  Click **Stop Listening** when finished.

### Uploading Audio
1.  Click the **Upload Audio** button.
2.  Select an audio file (MP3, WAV, etc.) from your computer.
3.  The file will be uploaded, transcribed, and analyzed automatically.

### Analyzing Content
1.  Once you have text in the transcript box (recorded or uploaded), click **Analyze**.
2.  The AI will process the text and generate:
    *   **Title & Summary**: A concise overview.
    *   **Tasks**: Action items extracted from the conversation.
    *   **Sentiment**: The overall tone (Positive, Neutral, Negative).
    *   **Category**: A classification (Meeting, Work, Personal, etc.).
    *   **Flow Diagram**: A visual representation of the conversation logic (using Mermaid.js).

### Saving
*   Click **Save Note** to store the analysis in your database.
*   Click **Add to Tasks List** to extract the action items and add them to your Task Manager.

---

## Saved Notes & Knowledge Base

### Saved Notes Tab
*   **List View**: Shows all your saved notes chronologically.
*   **Search**: Use the search bar to filter notes by title, content, or tags. Matching terms are highlighted.
*   **View Details**: Click a note to see the full analysis, transcript, and diagram.
*   **Text-to-Speech**: Click the speaker icon next to the summary to hear it read aloud.

### Knowledge Base Tab
This view organizes your notes by **Category** (e.g., "Meeting", "Idea").
*   Click on a category to see notes filed under it.
*   Click a note title to jump to its details.

---

## Task Management

The **Tasks** tab helps you track action items.

*   **Dashboard**: View quick stats on top (Total, Pending, Completed, High Priority).
*   **Filtering**: Use the dropdowns to filter by:
    *   **Status**: Active / Done
    *   **Priority**: High / Medium / Low
*   **Sorting**: Sort tasks by Date or Priority.
*   **Edit**: Double-click a task's text to edit it inline.
*   **Complete**: Click the checkbox to mark a task as done.
*   **Delete**: Click the trash icon to remove a task.

---

## Translation

You can translate a note's content into another language.

1.  Open a note (or analyze a new one).
2.  In the top-right corner of the analysis view, select a target language (e.g., "French").
3.  Click the **Translate** icon (globe).
4.  The Title, Summary, and Transcript will be updated to the selected language.

---

## Exporting & Printing

*   **Export to Markdown**: In the Note Detail view, click **Export** to download the note as a `.md` file suitable for Notion, Obsidian, or GitHub.
*   **Export Tasks**: In the Tasks tab, click **Export CSV** to download your tasks for Excel or Google Sheets.
*   **Print**: In the Note Detail view, click **Print**. The page is optimized to hide menus and buttons, giving you a clean PDF or paper copy.
