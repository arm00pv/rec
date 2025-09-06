# Guide: Automating Task Creation with n8n and Google Gemini

This guide provides a complete walkthrough for setting up an n8n workflow to automatically process audio recordings from the Conversation Analyzer, get tasks using Google Gemini, and send them back to the web application.

### Prerequisites

1.  **Deployed Application:** The Conversation Analyzer web app must be deployed and accessible from the internet (e.g., at `http://zapp.sytes.net`).
2.  **n8n Instance:** You need an active n8n instance (either on n8n.cloud or self-hosted) that can receive incoming webhooks.
3.  **Google Gemini API Key:** You must have a valid API key for the Google Gemini API.

---

### Workflow Overview

Here is a high-level look at the n8n workflow we will build:

1.  **Webhook Node:** Receives a trigger from our web app when a new audio file is uploaded.
2.  **HTTP Request Node (Get Audio):** Downloads the `recording.webm` file from our web app's server.
3.  **Google Gemini Node:** Sends the audio file and a prompt to the Gemini API for analysis.
4.  **Function Node (Format Tasks):** Extracts the task list from Gemini's text response and formats it into the JSON structure our app needs.
5.  **HTTP Request Node (Post Tasks):** Sends the final JSON payload back to our app's `/api/tasks` endpoint.

---

### Step 1: Modify the Web App to Trigger n8n

To start the automation, our app needs to tell n8n that a new file is ready. We'll modify the `/upload` endpoint in `main.py` to send a request to a new n8n webhook URL.

*(I will perform this code change for you in the next step, but the explanation is included here for completeness.)*

The modified code will attempt to send a POST request to an n8n webhook URL stored in an environment variable (`N8N_WEBHOOK_URL`).

### Step 2: Create the n8n Workflow

1.  **Create a New Workflow:** In your n8n canvas, create a new, blank workflow.
2.  **Add a Webhook Node:**
    *   Add the "Webhook" node. It will be the trigger for your workflow.
    *   In the node's properties, you will see a **Test URL**. Copy this URL. You will need it for your server's environment variables.
    *   For now, you can leave the Webhook node as is.

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
    *   If everything is configured correctly, the Webhook node in n8n should receive the request and show the data.

### Step 4: Download the Audio File from the App

The trigger doesn't contain the audio file itself, just the notification. The next step is to download it.

1.  **Add an HTTP Request Node:**
    *   Connect it after the Webhook node.
    *   **URL:** Set this to the public URL of your uploaded audio file. For example: `http://zapp.sytes.net/uploads/recording.webm`.
        *   *Note: This currently assumes the file is always named `recording.webm`. A future improvement would be to save files with unique names and pass the name in the webhook data.*
    *   **Method:** `GET`.
    *   **Response Format:** `File`. This tells n8n to treat the response as a downloadable file.

### Step 5: Analyze the Audio with Google Gemini

1.  **Add a Google Gemini Node:**
    *   Connect it after the HTTP Request node.
    *   **Authentication:** Connect your Google Gemini API credentials.
    *   **Operation:** `Chat`.
    *   **Text:** This is the most important part. You need to write a clear prompt for the AI. Here is a good starting point:
        ```
        You are an expert at analyzing conversations and extracting action items.
        I will provide you with the transcription of an audio recording.
        Please identify all of the specific tasks, deadlines, and action items mentioned.
        Format the output as a simple, plain-text list with each task on a new line. Do not add any other text, titles, or summaries.

        Here is the transcription:
        ```
    *   **Input Files > Property Name:** `data`. This tells the Gemini node to use the file downloaded in the previous step as input. The input property name should match the property name from the HTTP Request node that contains the file data.

### Step 6: Format the Tasks with a Function Node

Gemini will return a block of text. We need to parse this text and format it into the JSON structure our application's API expects.

1.  **Add a Function Node:**
    *   Connect it after the Gemini node.
    *   This node will contain custom JavaScript code to transform the data.

2.  **Add the following JavaScript code:**
    ```javascript
    // Get the text output from the Gemini node
    const geminiOutput = $json.text;

    // Split the text into an array of tasks, assuming one task per line
    // This also removes any empty lines
    const tasksArray = geminiOutput.split('\n').filter(task => task.trim() !== '');

    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString();

    // Create the final JSON object in the format our API expects
    const finalJson = {
      date: today,
      tasks: tasksArray
    };

    // Return the final object
    return finalJson;
    ```

### Step 7: Send the Formatted Tasks to Your App

The final step is to send the JSON object from the Function node back to your web app.

1.  **Add an HTTP Request Node:**
    *   Connect it after the Function node.
    *   **URL:** The URL of your application's task API. For example: `http://zapp.sytes.net/api/tasks`.
    *   **Method:** `POST`.
    *   **Body Content Type:** `JSON`.
    *   **JSON/RAW Parameters:** Enable this.
    *   In the **Body** field, use an expression to get the data from the previous node: `{{ $json }}`.

### Final Steps

1.  **Activate Your Workflow:** Once you have tested each node and the flow works, save and activate your n8n workflow.
2.  **Update Webhook URL:** Go back to your Webhook node and switch from the **Test URL** to the **Production URL**.
3.  **Update Environment Variable:** Update the `N8N_WEBHOOK_URL` on your server with the new Production URL and restart the `systemd` service one last time.

Your automated workflow is now complete! Whenever you upload a recording, it will be processed by n8n and Gemini, and the tasks will appear in your app a few moments later.
