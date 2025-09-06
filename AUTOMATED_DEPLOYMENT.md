# Automated Deployment with GitHub Webhooks

This guide explains how to set up a simple continuous deployment (CD) pipeline for your Conversation Analyzer application. When you push new changes to your GitHub repository, your Digital Ocean server will automatically update and restart the application.

This guide assumes you have already completed the initial deployment as described in `DEPLOYMENT_APACHE.md`.

## How It Works

1.  **GitHub Webhook:** You will configure a webhook in your GitHub repository. Whenever you `push` code to your `main` branch, GitHub will send a notification (an HTTP POST request) to a special URL on your server.
2.  **Webhook Listener:** A new endpoint in your Flask application will listen for this notification at the special URL.
3.  **Update Script:** When the listener receives a valid notification, it will execute a shell script on your server.
4.  **Deployment:** The script will pull the latest code from your repository, copy the frontend files, and restart the Gunicorn service.

---

### **Step 1: Create the Update Script**

First, let's create a script that will handle the deployment logic.

SSH into your server and navigate to your project's `backend` directory:
```bash
ssh your_username@zapp.sytes.net
cd ~/your-repo/conversation-analyzer/backend
```

Create a new file named `update.sh`:
```bash
nano update.sh
```

Paste the following code into the file. This script will be run by the `your_username` user, so it uses `sudo` for commands that require root privileges.

```bash
#!/bin/bash

# Navigate to the repository directory
cd ~/your-repo

# Pull the latest changes from the main branch
git pull origin main

# Copy the new frontend files to the web server directory
sudo cp -r ~/your-repo/conversation-analyzer/frontend/* /var/www/rec/

# Restart the Gunicorn service to apply backend changes
sudo systemctl restart conversation-analyzer

echo "Deployment completed successfully!"
```

Save the file and make it executable:
```bash
chmod +x update.sh
```

You will also need to allow your user to run `sudo` commands without a password for the specific commands in the script. This is necessary for the script to run automatically.

Run `sudo visudo` and add the following lines at the end of the file, replacing `your_username` with your username:
```
your_username ALL=(ALL) NOPASSWD: /bin/cp -r /home/your_username/your-repo/conversation-analyzer/frontend/* /var/www/rec/
your_username ALL=(ALL) NOPASSWD: /bin/systemctl restart conversation-analyzer
```
**Warning:** This is a security risk. A more secure approach would be to use a dedicated deployment user with more restricted permissions. For this simple setup, this is sufficient.

---

### **Step 2: Add the Webhook Endpoint to the Backend**

Now, we'll add a `/webhook` endpoint to your Flask application in `main.py`. This endpoint will listen for POST requests from GitHub.

Edit your `backend/main.py` file:
```bash
nano main.py
```

Add the following code to the end of the file, before the `if __name__ == "__main__":` block. You'll need to import `subprocess` and `os` at the top of the file.

```python
import subprocess
import os
from flask import request, abort
import hmac
import hashlib

# ... (keep existing imports)

# ... (keep existing Flask app and routes)

@app.route("/webhook", methods=["POST"])
def webhook():
    # Get the signature from the request headers
    signature = request.headers.get('X-Hub-Signature-256')
    if not signature:
        abort(403)

    # Your GitHub webhook secret (set this as an environment variable for security)
    secret = os.environ.get('GITHUB_WEBHOOK_SECRET').encode()
    if not secret:
        abort(500, "Webhook secret not configured on the server.")

    # Calculate the expected signature
    mac = hmac.new(secret, msg=request.data, digestmod=hashlib.sha256)
    expected_signature = "sha256=" + mac.hexdigest()

    # Verify the signature
    if not hmac.compare_digest(signature, expected_signature):
        abort(403)

    # If the signature is valid, run the update script
    if request.json['ref'] == 'refs/heads/main': # Or 'master'
        subprocess.Popen(['./update.sh'])
        return "Update process started", 202

    return "No update needed", 200
```
You will also need to add `import hmac`, `import hashlib`, `import subprocess` at the top of the file.

For this to work, you need to set the `GITHUB_WEBHOOK_SECRET` environment variable. You can do this in your `systemd` service file. Edit `/etc/systemd/system/conversation-analyzer.service` and add an `Environment` line:

```ini
[Service]
# ... (other settings)
Environment="GITHUB_WEBHOOK_SECRET=your_very_secret_string"
```
Replace `your_very_secret_string` with a long, random string. You will use this same secret in your GitHub webhook settings. After editing the service file, reload the systemd daemon and restart your service:
```bash
sudo systemctl daemon-reload
sudo systemctl restart conversation-analyzer
```

---

### **Step 3: Configure the Apache Reverse Proxy**

You need to add a new `Location` block to your Apache configuration to forward webhook requests to your backend.

Edit your Apache config file:
```bash
sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
```

Add the following `Location` block inside your `<VirtualHost>` block:
```apache
<Location /webhook>
    ProxyPass unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/webhook
    ProxyPassReverse unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/webhook
</Location>
```
Your full config should look something like this:
```apache
<VirtualHost *:80>
    ServerName zapp.sytes.net

    DocumentRoot /var/www/rec
    # ...

    ProxyPass /api/ ...
    ProxyPassReverse /api/ ...

    ProxyPass /upload ...
    ProxyPassReverse /upload ...

    <Location /webhook>
        ProxyPass unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/webhook
        ProxyPassReverse unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/webhook
    </Location>
</VirtualHost>
```
Restart Apache to apply the changes:
```bash
sudo systemctl restart apache2
```

---

### **Step 4: Set Up the GitHub Webhook**

1.  Go to your GitHub repository's page.
2.  Click on **Settings**.
3.  In the left sidebar, click on **Webhooks**.
4.  Click the **Add webhook** button.
5.  **Payload URL:** Enter `http://zapp.sytes.net/webhook`.
6.  **Content type:** Select `application/json`.
7.  **Secret:** Enter the same secret string you used for the `GITHUB_WEBHOOK_SECRET` environment variable on your server.
8.  **Which events would you like to trigger this webhook?** Select **Just the `push` event.**
9.  Make sure **Active** is checked.
10. Click **Add webhook**.

GitHub will send a "ping" event to your server to verify the webhook. You can see the result in the "Recent Deliveries" tab in your webhook settings on GitHub. If everything is configured correctly, you should see a green checkmark.

Now, whenever you push to your `main` branch, your server will automatically deploy the latest version of your application.
