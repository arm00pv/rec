# Guide: Integrating with an Existing Apache Site

This guide provides targeted instructions for integrating the Conversation Analyzer into an existing website that is already being served by Apache.

### **Prerequisites**

*   Your main website (e.g., `zapp.sytes.net`) is already running correctly on Apache.
*   The Conversation Analyzer application code has been cloned to your server (e.g., at `/var/www/webhost/rec`).
*   The backend service for the Conversation Analyzer has been set up and is running under `systemd`. (See `DEPLOYMENT_APACHE.md` for details on this setup).

---

### **Step 1: Edit Your Existing Apache Configuration**

The key is to add routing rules (`ProxyPass`) to your main website's configuration file so that it knows how to forward API requests to the Conversation Analyzer backend.

1.  **Find and Edit Your Active Apache Configuration:**
    Based on our debugging, the correct file for your HTTPS site is:
    ```bash
    sudo nano /etc/apache2/sites-enabled/webhost-le-ssl.conf
    ```

2.  **Enable Required Apache Modules:**
    Run these commands to ensure the necessary proxy modules are enabled. It is safe to run them again even if they are already enabled.
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    ```

3.  **Add the Proxy Directives:**
    Inside the file you are editing, find the `<VirtualHost *:443>` block. Add the following lines inside this block. A good place is right after the `ServerName` or `DocumentRoot` lines.

    ```apache
    # --- Configuration for Conversation Analyzer App ---
    # The following lines forward API and Upload requests from the /rec/ subdirectory
    # to the Gunicorn service running on port 8001.

    ProxyPreserveHost On
    ProxyPass /rec/api/ http://127.0.0.1:8001/api/
    ProxyPassReverse /rec/api/ http://127.0.0.1:8001/api/

    ProxyPass /rec/upload http://127.0.0.1:8001/upload
    ProxyPassReverse /rec/upload http://127.0.0.1:8001/upload
    ```

---

### **Step 2: Restart Apache**

Save the configuration file, then run this command to apply the changes:
```bash
sudo systemctl restart apache2
```

---

After restarting Apache, your main website will continue to function as before, and the Conversation Analyzer at `/rec/conversation-analyzer/frontend/` should now be able to communicate with its backend, resolving the "File upload failed" errors.
