# Guide: Setting Up Automated Deployments with GitHub Webhooks

This guide explains how to configure a GitHub webhook to automatically deploy the latest version of the Conversation Analyzer application to your server whenever you push changes to the `main` branch.

### How It Works

1.  **GitHub Webhook:** You will configure your GitHub repository to send a POST request to a special `/webhook` endpoint on your server every time a `git push` occurs.
2.  **Backend Webhook Listener:** The Flask application has a `/webhook` endpoint that listens for these incoming requests.
3.  **Security:** The endpoint verifies that the request is genuinely from GitHub by checking a cryptographic signature (HMAC-SHA256) using a shared secret.
4.  **Deployment Script:** If the request is valid and the push was to the `main` branch, the application executes a shell script (`update.sh`).
5.  **`update.sh`:** This script pulls the latest code from GitHub, installs any new dependencies, and restarts the application service.

---

### Step 1: Create the Deployment Script (`update.sh`)

First, we need the script that will perform the actual update.

1.  **Create the file:**
    Make sure you are in the `conversation-analyzer/backend` directory.
    ```bash
    nano update.sh
    ```

2.  **Add the script content:**
    This script automates the entire deployment process.
    ```bash
    #!/bin/bash

    # Exit immediately if a command exits with a non-zero status.
    set -e

    # Define the project directory
    PROJECT_DIR="/var/www/zapp.sytes.net"

    echo "--- Starting deployment script ---"

    # Navigate to the project directory
    cd "$PROJECT_DIR" || { echo "Failed to cd into $PROJECT_DIR"; exit 1; }

    # Deactivate virtual environment if one is active, silencing errors
    deactivate >/dev/null 2>&1 || true

    # Ensure the git repository is clean before pulling
    git reset --hard HEAD

    # Pull the latest changes from the main branch
    echo "--- Pulling latest changes from GitHub ---"
    git pull origin main

    # Activate the virtual environment
    echo "--- Activating Python virtual environment ---"
    source "conversation-analyzer/venv/bin/activate"

    # Install/update dependencies
    echo "--- Installing/updating Python packages ---"
    pip install -r "conversation-analyzer/backend/requirements.txt"

    # Optional: Run database migrations or initializations if needed
    # echo "--- Initializing database (if applicable) ---"
    # export FLASK_APP=conversation-analyzer/backend/main.py
    # flask init-db

    # Restart the application service to apply changes
    echo "--- Restarting application service ---"
    sudo systemctl restart conversation-analyzer

    echo "--- Deployment finished successfully ---"
    ```

3.  **Make the script executable:**
    This is a critical step. The script must have execute permissions.
    ```bash
    chmod +x update.sh
    ```

---

### Step 2: Configure the Webhook Secret on Your Server

The webhook needs a secret key to ensure security.

1.  **Generate a Secret:**
    You can generate a long, random string for your secret. A good way to do this is:
    ```bash
    openssl rand -hex 32
    ```
    Copy the generated string.

2.  **Add the Secret to the `systemd` Service:**
    Edit the service file to add the secret as an environment variable.
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```

3.  **Add the `Environment` variable:**
    Add a new line for `GITHUB_WEBHOOK_SECRET`.
    ```ini
    [Service]
    User=your_user
    Group=www-data
    # ... other settings ...
    Environment="GITHUB_WEBHOOK_SECRET=your_super_secret_string_here"
    # You can have multiple Environment lines
    Environment="N8N_WEBHOOK_URL=..."
    ```
    *Replace `your_super_secret_string_here` with the secret you generated.*

4.  **Reload and Restart:**
    Apply the changes to the service.
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart conversation-analyzer
    ```

---

### Step 3: Configure the Webhook in Your GitHub Repository

The final step is to tell GitHub where to send the webhook notifications.

1.  **Go to your GitHub repository's settings.**
2.  Navigate to **Webhooks** in the left sidebar.
3.  Click **"Add webhook"**.
4.  **Configure the webhook:**
    *   **Payload URL:** This is the public URL of your webhook endpoint. For example: `http://zapp.sytes.net/webhook`.
    *   **Content type:** Select `application/json`.
    *   **Secret:** Paste the same secret key you generated and added to your server's environment.
    *   **Which events would you like to trigger this webhook?** Select "Just the `push` event."

5.  **Add the webhook.**

### Step 4: Test the Setup

1.  **Check Recent Deliveries:**
    In the GitHub Webhooks settings, you can see the "Recent Deliveries" tab. GitHub will send a "ping" event when you first create the webhook. It should show a green checkmark and a `200` response code if your server is configured correctly. If you see a red error, you can click on it to see the request and response details for debugging.

2.  **Push a Change:**
    Make a small, non-breaking change to your code (e.g., add a comment) and push it to the `main` branch.
    ```bash
    git commit -m "Test: Triggering automated deployment"
    git push origin main
    ```

3.  **Monitor the Result:**
    *   Check the "Recent Deliveries" in GitHub again for the new push event.
    *   You can monitor the logs of your service in real-time on the server to see the update script running:
        ```bash
        journalctl -u conversation-analyzer -f
        ```

If everything is set up correctly, your server will automatically deploy the new version of the application within seconds of your push.
