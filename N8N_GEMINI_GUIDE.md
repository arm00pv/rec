# Guide: Automating Task Creation with n8n and Google Gemini

This guide provides a complete walkthrough for setting up an n8n workflow to automatically process audio recordings from the Conversation Analyzer, get tasks using Google Gemini, and send them back to the web application.

### Prerequisites

1.  **Deployed Application:** The Conversation Analyzer web app must be deployed and accessible from the internet (e.g., at `http://zapp.sytes.net/rec/`).
2.  **n8n Instance:** You need an active n8n instance (either on n8n.cloud or self-hosted) that can receive incoming webhooks.
3.  **Google Gemini API Key:** You must have a valid API key for the Google Gemini API.

---

### Workflow Overview

Here is a high-level look at the n8n workflow we will build:

1.  **Webhook Node:** Receives a trigger from our web app when a new audio file is uploaded. The trigger data includes the **unique filename** for the recording.
2.  **HTTP Request Node (Get Audio):** Uses the unique filename from the trigger to download the correct audio file from our web app's server.
3.  **Google Gemini Node:** Sends the audio file and a prompt to the Gemini API for analysis.
4.  **Function Node (Format Tasks):** Extracts the task list from Gemini's text response and formats it into the JSON structure our app needs.
5.  **HTTP Request Node (Post Tasks):** Sends the final JSON payload back to our app's `/api/tasks` endpoint.

---

### Step 1: How the Web App Triggers n8n

The backend code has already been modified to support this workflow. Here’s how it works:

1.  When you upload an audio file, the Flask server saves it with a **unique filename** (e.g., `rec_20250906-112549_a1b2c3d4.webm`). This prevents recordings from ever overwriting each other.
2.  Immediately after saving the file, the server calls the `trigger_n8n_workflow` function.
3.  This function sends a POST request to the n8n webhook URL you configure. The request body is a JSON object containing the unique filename, like this:
    ```json
    {
      "file": "rec_20250906-112549_a1b2c3d4.webm",
      "timestamp": "2025-09-06T11:25:49.123456"
    }
    ```
This gives our n8n workflow all the information it needs to find and process the correct file.

---

### Step 2: Create the n8n Workflow

1.  **Create a New Workflow:** In your n8n canvas, create a new, blank workflow.
2.  **Add a Webhook Node:**
    *   Add the "Webhook" node. It will be the trigger for your workflow.
    *   In the node's properties, you will see a **Test URL**. Copy this URL. You will need it for your server's environment variables.
    *   For now, you can leave the Webhook node as is.

---

### Step 3: Configure and Test the Trigger

1.  **Set Environment Variable on Your Server:**
    *   SSH into your server.
    *   Edit the `systemd` service file for the application:
        ```bash
        sudo nano /etc/systemd/system/conversation-analyzer.service
        ```
    *   Add a new `Environment` variable with the Webhook **Test URL** you copied from n8n.
        ```ini
        [Service]
        # ... other settings
        Environment="N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook-test/..."
        ```
    *   Reload the configuration and restart the app:
        ```bash
        sudo systemctl daemon-reload
        sudo systemctl restart conversation-analyzer
        ```

2.  **Execute a Test Run:**
    *   In n8n, click the **"Listen for test event"** button on your Webhook node.
    *   Go to your web application, record a short audio clip, and upload it.
    *   If everything is configured correctly, the Webhook node in n8n should receive the request and show the data. You should see the JSON payload with the `file` and `timestamp` fields.

---

### Step 4: Download the Audio File from the App

The trigger doesn't contain the audio file itself, just the notification. The next step is to download it.

1.  **Add an HTTP Request Node:**
    *   Connect it after the Webhook node.
    *   **URL:** This needs to be a dynamic URL constructed from your base URL and the filename received from the webhook.
        *   Click the "Add Expression" button (the `ƒx` icon) next to the URL field.
        *   Enter the following expression. **Remember to replace `http://zapp.sytes.net` with your actual domain and `/rec/` with your subdirectory.**
        ```
        http://zapp.sytes.net/rec/uploads/{{ $json.body.file }}
        ```
        *   This expression tells n8n to take the base URL and append the value of the `file` field from the webhook's JSON body. The `uploads` folder is not directly exposed by the backend, but the files within it should be served by Apache if configured. *Correction*: The backend does not serve the uploads folder. You need to configure Apache to do so.
    *   **Method:** `GET`.
    *   **Response Format:** `File`. This tells n8n to treat the response as a downloadable file.

---

### Step 5: Configure Apache to Serve Uploads (Crucial)

The backend application does **not** serve the `uploads` directory for security reasons. You must configure Apache to serve these files so n8n can download them.

1.  **Edit your Apache config file:**
    ```bash
    sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
    # Or your main site's .conf file
    ```
2.  **Add an `Alias` directive:**
    Add this block inside your `<VirtualHost>` configuration. It creates a URL path `/rec/uploads` and maps it directly to the filesystem folder where recordings are stored.

    ```apache
    <VirtualHost *:80>
        # ... your other proxy settings ...

        # --- Serve uploaded audio files ---
        Alias /rec/uploads /var/www/zapp.sytes.net/conversation-analyzer/backend/uploads
        <Directory /var/www/zapp.sytes.net/conversation-analyzer/backend/uploads>
            Options Indexes FollowSymLinks
            AllowOverride None
            Require all granted
        </Directory>
    </VirtualHost>
    ```
3.  **Restart Apache:**
    ```bash
    sudo systemctl restart apache2
    ```

---

### Step 6: Analyze the Audio with Google Gemini

1.  **Add a Google Gemini Node:**
    *   Connect it after the HTTP Request node.
    *   **Authentication:** Connect your Google Gemini API credentials.
    *   **Operation:** `Chat`.
    *   **Text:** Write a clear prompt for the AI.
        ```
        You are an expert at analyzing conversations and extracting action items.
        I will provide you with the transcription of an audio recording.
        Please identify all of the specific tasks, deadlines, and action items mentioned.
        Format the output as a simple, plain-text list with each task on a new line. Do not add any other text, titles, or summaries.

        Here is the transcription:
        ```
    *   **Input Files > Property Name:** `data`. This tells the Gemini node to use the file downloaded in the previous step.

---

### Step 7: Format the Tasks with a Function Node

1.  **Add a Function Node:**
    *   Connect it after the Gemini node.
    *   Add the following JavaScript code:
    ```javascript
    const geminiOutput = $json.text;
    const tasksArray = geminiOutput.split('\n').filter(task => task.trim() !== '');
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const finalJson = {
      date: today,
      tasks: tasksArray
    };
    return finalJson;
    ```

---

### Step 8: Send the Formatted Tasks to Your App

1.  **Add an HTTP Request Node:**
    *   Connect it after the Function node.
    *   **URL:** The URL of your application's task API (e.g., `http://zapp.sytes.net/api/tasks`).
    *   **Method:** `POST`.
    *   **Body Content Type:** `JSON`.
    *   In the **Body** field, use the expression: `{{ $json }}`.

### Final Steps

1.  **Activate Your Workflow:** Save and activate your n8n workflow.
2.  **Update Webhook URL:** Switch from the **Test URL** to the **Production URL** in the n8n Webhook node.
3.  **Update Environment Variable:** Update the `N8N_WEBHOOK_URL` on your server with the Production URL and restart the service.

Your automated workflow is now complete!
