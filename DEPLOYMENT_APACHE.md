# Guide: Integrating with an Existing Apache Site

This guide provides the definitive instructions for integrating the Conversation Analyzer into an existing website running on Apache. It assumes you are adding the application to a subdirectory.

### **Prerequisites**

*   A server with Apache already running and serving your main website (e.g., at `zapp.sytes.net`).
*   The Conversation Analyzer code is located on your server (e.g., at `/var/www/webhost/rec`).
*   You have `sudo` privileges.

---

### **Step 1: Ensure Backend Service is Correct**

First, we need to ensure the `systemd` service that runs the application backend is configured correctly.

1.  **Open the service file for editing:**
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```

2.  **Ensure the file has the following content.** This version is the most reliable one we found. It uses a TCP port, which avoids many common permission issues. Make sure the `User` and all paths are correct for your system.

    ```ini
    [Unit]
    Description=Gunicorn instance to serve the Conversation Analyzer
    After=network.target

    [Service]
    User=zixen
    Group=www-data
    WorkingDirectory=/var/www/webhost/rec/conversation-analyzer/backend
    Environment="PATH=/var/www/webhost/rec/conversation-analyzer/backend/venv/bin"
    # Add your n8n webhook URL here when you are ready for that step
    # Environment="N8N_WEBHOOK_URL=..."
    ExecStart=/var/www/webhost/rec/conversation-analyzer/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 wsgi:app

    [Install]
    WantedBy=multi-user.target
    ```

3.  **Reload and restart the service** to apply any changes:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart conversation-analyzer.service
    ```

---

### **Step 2: Add Proxy Rules to Your Existing Apache Site**

This is the most critical step. We need to tell your main website's Apache configuration how to find our application's API.

1.  **Find and Edit Your Active Apache Configuration:**
    Based on our debugging, the correct file for your HTTPS site is:
    ```bash
    sudo nano /etc/apache2/sites-enabled/webhost-le-ssl.conf
    ```

2.  **Add the Proxy Directives:**
    Inside that file, find the `<VirtualHost *:443>` block. Add the following lines inside this block. A good place is after the `ServerName` or `DocumentRoot` lines.

    ```apache
    # --- Configuration for Conversation Analyzer App ---
    # Forward API and Upload requests to the Gunicorn service
    ProxyPreserveHost On
    ProxyPass /rec/api/ http://127.0.0.1:8001/api/
    ProxyPassReverse /rec/api/ http://127.0.0.1:8001/api/
    ProxyPass /rec/upload http://127.0.0.1:8001/upload
    ProxyPassReverse /rec/upload http://127.0.0.1:8001/upload
    ```
    **Note:** We are *not* proxying the root (`/`) because you have an existing site. We are only proxying the specific paths that our application needs. The frontend files themselves will be served by your existing Apache configuration because they are located within your `DocumentRoot`.

3.  **Enable Required Apache Modules:**
    Ensure the proxy modules are enabled (it's safe to run these commands again).
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    ```

4.  **Restart Apache:**
    Save the configuration file, then restart Apache to apply the final changes.
    ```bash
    sudo systemctl restart apache2
    ```

---

After completing these steps, the application should now be fully functional, living alongside your main website. The 404 errors on upload should be resolved.
