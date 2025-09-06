# Deployment Guide for Conversation Analyzer on Ubuntu with Apache

This guide provides step-by-step instructions to deploy the Conversation Analyzer application on an Ubuntu server using Apache as a reverse proxy for a Gunicorn application server.

### Prerequisites

*   An Ubuntu server with `sudo` privileges.
*   Apache2 installed and running.
*   A domain or subdomain pointing to your server's IP address (e.g., `zapp.sytes.net`).
*   Python 3 and `pip` installed.

---

### Step 1: Clone the Repository

1.  **Install Git:**
    ```bash
    sudo apt update
    sudo apt install git -y
    ```

2.  **Clone the project:**
    Clone the repository into a suitable directory. A common choice is `/var/www`.
    ```bash
    sudo mkdir -p /var/www/
    cd /var/www/
    sudo git clone <your-repo-url> zapp.sytes.net
    cd zapp.sytes.net
    ```
    *Replace `<your-repo-url>` with your actual repository URL.*

3.  **Set Permissions:**
    Give your user ownership of the files to avoid permission issues during setup.
    ```bash
    sudo chown -R $USER:$USER /var/www/zapp.sytes.net
    ```

---

### Step 2: Set Up the Python Environment

1.  **Install `venv`:**
    ```bash
    sudo apt install python3-venv -y
    ```

2.  **Create and Activate a Virtual Environment:**
    Navigate to the project's root directory and create a virtual environment.
    ```bash
    cd /var/www/zapp.sytes.net/conversation-analyzer
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install Dependencies:**
    Install all the required Python packages using `requirements.txt`.
    ```bash
    pip install -r backend/requirements.txt
    ```

4.  **Initialize the Database:**
    The application uses a SQLite database. Initialize it using the custom Flask CLI command.
    ```bash
    # From within the conversation-analyzer directory
    export FLASK_APP=backend/main.py
    flask init-db
    ```
    This will create a `tasks.db` file in the `backend` directory.

5.  **Deactivate the Environment:**
    You can now leave the virtual environment.
    ```bash
    deactivate
    ```

---

### Step 3: Create a `systemd` Service for Gunicorn

Running the Flask app with `systemd` ensures it starts automatically on boot and is managed properly.

1.  **Create the Service File:**
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```

2.  **Add the following content:**
    *   **Important:** Replace `zapp.sytes.net` with your actual project folder name if it's different.
    *   **Important:** Replace `your_user` with your actual username (e.g., `ubuntu`). You can find it by running `whoami`.

    ```ini
    [Unit]
    Description=Gunicorn instance to serve Conversation Analyzer
    After=network.target

    [Service]
    User=your_user
    Group=www-data
    WorkingDirectory=/var/www/zapp.sytes.net/conversation-analyzer/backend
    Environment="PATH=/var/www/zapp.sytes.net/conversation-analyzer/venv/bin"
    # Add environment variables for n8n and GitHub webhooks here
    # Environment="N8N_WEBHOOK_URL=https://your-n8n-url/..."
    # Environment="GITHUB_WEBHOOK_SECRET=your_secret_here"

    ExecStart=/var/www/zapp.sytes.net/conversation-analyzer/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 wsgi:app

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Set Directory Permissions:**
    Gunicorn will run as `your_user` but under the `www-data` group. This group needs permission to write to the `uploads` and database directories.
    ```bash
    # Navigate to the backend directory first
    cd /var/www/zapp.sytes.net/conversation-analyzer/backend

    # Grant group ownership to www-data
    sudo chown -R :www-data .

    # Grant write permissions to the group for the directory, the db, and uploads
    sudo chmod -R g+w .
    ```

4.  **Start and Enable the Service:**
    ```bash
    sudo systemctl start conversation-analyzer
    sudo systemctl enable conversation-analyzer
    ```

5.  **Check the Status:**
    Verify that the service is running without errors.
    ```bash
    sudo systemctl status conversation-analyzer
    ```
    *If it fails, use `journalctl -u conversation-analyzer` to see detailed logs.*

---

### Step 4: Configure Apache as a Reverse Proxy

This setup will forward requests from the public internet (port 80) to your Gunicorn service (port 8001).

1.  **Enable Apache Proxy Modules:**
    ```bash
    sudo a2enmod proxy proxy_http
    sudo systemctl restart apache2
    ```

2.  **Create a New Apache Configuration File:**
    ```bash
    sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
    ```

3.  **Add the following configuration:**
    *   Replace `zapp.sytes.net` with your server's domain name.
    *   This example assumes you are deploying the app to a subdirectory `/rec`.

    ```apache
    <VirtualHost *:80>
        ServerName zapp.sytes.net

        # --- Proxy for the Conversation Analyzer App ---
        # URL: http://zapp.sytes.net/rec/

        ProxyPreserveHost On

        # Proxy requests for the app's root and static files
        ProxyPass /rec/ http://127.0.0.1:8001/
        ProxyPassReverse /rec/ http://127.0.0.1:8001/

        # Proxy requests for the API
        ProxyPass /api/ http://127.0.0.1:8001/api/
        ProxyPassReverse /api/ http://127.0.0.1:8001/api/

        # Proxy requests for uploads
        ProxyPass /upload http://127.0.0.1:8001/upload
        ProxyPassReverse /upload http://127.0.0.1:8001/upload

        # Proxy requests for the webhook
        ProxyPass /webhook http://127.0.0.1:8001/webhook
        ProxyPassReverse /webhook http://127.0.0.1:8001/webhook

        # Optional: Add logs for easier debugging
        ErrorLog ${APACHE_LOG_DIR}/conversation-analyzer-error.log
        CustomLog ${APACHE_LOG_DIR}/conversation-analyzer-access.log combined
    </VirtualHost>
    ```

4.  **Enable the New Site:**
    ```bash
    sudo a2ensite conversation-analyzer.conf
    ```

5.  **Test the Apache Configuration and Restart:**
    ```bash
    sudo apache2ctl configtest
    sudo systemctl restart apache2
    ```

### Step 5: Final Code Adjustments for Subdirectory

The frontend code needs to know it's running in the `/rec/` subdirectory.

1.  **Edit `index.html`:**
    Make sure the `<base>` tag is set correctly.
    ```html
    <base href="/rec/">
    ```

2.  **Verify Asset Paths:**
    Ensure all paths in `index.html`, `main.js`, and `style.css` are relative (e.g., `main.js`, not `/main.js`). This ensures they correctly resolve relative to the base URL.

Your application should now be live at `http://your_domain/rec/`.
