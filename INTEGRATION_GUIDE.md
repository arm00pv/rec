# Guide: Integrating the Conversation Analyzer into an Existing Apache Website

This guide explains how to deploy the Conversation Analyzer app into a subdirectory (e.g., `http://your-domain.com/rec`) of an existing website already served by Apache.

This is useful if you have a main website running on the same server and want to add this tool without needing a separate subdomain.

### Core Concept: Apache as a Reverse Proxy

We will configure Apache to act as a **reverse proxy**. This means that when a user visits a URL starting with `/rec`, Apache will seamlessly forward that request to our backend Python application (running on Gunicorn). For all other URLs, Apache will continue to serve your main website as usual.

---

### Step 1: Prepare Your Main Apache Configuration

1.  **Identify Your Main Site's `.conf` File:**
    Your existing website is configured in a file located in `/etc/apache2/sites-available/`. It's often `000-default.conf` or a file named after your domain (e.g., `your-domain.com.conf`).

2.  **Enable Necessary Apache Modules:**
    The reverse proxy functionality requires specific Apache modules. Enable them with these commands:
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    sudo systemctl restart apache2
    ```

---

### Step 2: Add Proxy Rules to Your Existing Configuration

Now, we will add the new routing rules to your main website's configuration file.

1.  **Edit the Configuration File:**
    Open your main site's `.conf` file with a text editor. For this example, we'll assume it's `000-default.conf`.
    ```bash
    sudo nano /etc/apache2/sites-available/000-default.conf
    ```

2.  **Add the `ProxyPass` Directives:**
    Inside the `<VirtualHost *:80>` block of your existing configuration, add the following lines. These lines tell Apache how to handle requests for the `/rec/` path and other related API endpoints.

    *   **Important:** Place these lines *before* any generic `ProxyPass` or `DocumentRoot` directives for your main site if possible, to ensure they are matched first.

    ```apache
    <VirtualHost *:80>
        ServerName your-domain.com
        # ... your existing website's configuration (like DocumentRoot) is likely here ...

        # --- Configuration for Conversation Analyzer App ---

        # This setting ensures that the host header from the original request is passed to the backend app.
        ProxyPreserveHost On

        # Rule 1: Forward app requests
        # This proxies http://your-domain.com/rec/ to http://127.0.0.1:8001/
        # The trailing slashes are important!
        ProxyPass /rec/ http://127.0.0.1:8001/
        ProxyPassReverse /rec/ http://127.0.0.1:8001/

        # Rule 2: Forward API requests
        # This is for fetching and updating tasks.
        ProxyPass /api/tasks http://127.0.0.1:8001/api/tasks
        ProxyPassReverse /api/tasks http://127.0.0.1:8001/api/tasks

        # Rule 3: Forward file upload requests
        ProxyPass /upload http://127.0.0.1:8001/upload
        ProxyPassReverse /upload http://127.0.0.1:8001/upload

        # Rule 4: Forward webhook requests (for CI/CD)
        ProxyPass /webhook http://127.0.0.1:8001/webhook
        ProxyPassReverse /webhook http://127.0.0.1:8001/webhook

        # --- End of Conversation Analyzer Config ---

    </VirtualHost>
    ```

3.  **Test and Restart Apache:**
    Always test your Apache configuration before restarting to avoid taking down your main site.
    ```bash
    sudo apache2ctl configtest
    ```
    If it returns `Syntax OK`, you are safe to restart Apache to apply the changes:
    ```bash
    sudo systemctl restart apache2
    ```

---

### Step 3: Ensure the Frontend is Configured for the Subdirectory

The frontend code must be aware that it lives in the `/rec/` subdirectory to load its assets (CSS, JavaScript) correctly.

1.  **Edit `index.html`:**
    Open `conversation-analyzer/frontend/index.html`.

2.  **Set the `<base>` Tag:**
    Make sure the `<base>` tag in the `<head>` section points to your subdirectory. **This is the most critical step for the frontend.**
    ```html
    <head>
        <!-- ... other meta tags ... -->
        <base href="/rec/">
        <!-- ... links to css, etc. ... -->
    </head>
    ```
    This tag tells the browser that all relative URLs in the document (like `<script src="main.js">`) should be resolved from `/rec/`, not from the domain root.

### Conclusion

Your Conversation Analyzer app should now be accessible at `http://your-domain.com/rec`, running alongside your main website without any conflicts. The Gunicorn application server handles the app's logic, and Apache intelligently routes the correct traffic to it.
