# Simple Automated Deployment with GitHub

This guide shows you how to automatically update your application on your server whenever you push new code to GitHub.

---

### **Step 1: Create an Update Script on Your Server**

1.  SSH into your server:
    ```bash
    ssh your_username@zapp.sytes.net
    ```

2.  Create a file named `update.sh` in your project's `backend` directory with the following content:
    ```bash
    #!/bin/bash
    cd ~/your-repo
    git pull origin main
    sudo cp -r ~/your-repo/conversation-analyzer/frontend/* /var/www/rec/
    sudo systemctl restart conversation-analyzer
    ```

3.  Make the script executable:
    ```bash
    chmod +x ~/your-repo/conversation-analyzer/backend/update.sh
    ```

4.  Allow the script to run `sudo` commands without a password. Run `sudo visudo` and add these lines at the bottom, replacing `your_username`:
    ```
    your_username ALL=(ALL) NOPASSWD: /bin/cp -r /home/your_username/your-repo/conversation-analyzer/frontend/* /var/www/rec/
    your_username ALL=(ALL) NOPASSWD: /bin/systemctl restart conversation-analyzer
    ```

---

### **Step 2: Update the Backend for Webhooks**

1.  Add the necessary imports to `backend/main.py`:
    ```python
    import subprocess, os, hmac, hashlib
    from flask import request, abort
    ```

2.  Add this endpoint to the bottom of `backend/main.py` (before the `if __name__ == "__main__":` line):
    ```python
    @app.route("/webhook", methods=["POST"])
    def webhook():
        signature = request.headers.get('X-Hub-Signature-256')
        secret = os.environ.get('GITHUB_WEBHOOK_SECRET').encode()
        mac = hmac.new(secret, msg=request.data, digestmod=hashlib.sha256)
        expected_signature = "sha256=" + mac.hexdigest()

        if not (signature and secret and hmac.compare_digest(signature, expected_signature)):
            abort(403)

        if request.json.get('ref') == 'refs/heads/main':
            subprocess.Popen(['./update.sh'])
            return "Update process started", 202

        return "No update needed", 200
    ```

3.  Tell your server about your webhook secret. Edit your service file:
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```
    Add this `Environment` line inside the `[Service]` section. Use a long, random string for your secret.
    ```ini
    Environment="GITHUB_WEBHOOK_SECRET=your_very_secret_string"
    ```

4.  Reload the server configuration:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart conversation-analyzer
    ```

---

### **Step 3: Configure Apache**

1.  Edit your Apache config file to allow requests to the webhook URL.
    ```bash
    sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
    ```
    Add this `ProxyPass` directive inside your `<VirtualHost>` block:
    ```apache
    ProxyPass /webhook unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/webhook
    ```

2.  Restart Apache:
    ```bash
    sudo systemctl restart apache2
    ```

---

### **Step 4: Set Up the GitHub Webhook**

1.  In your GitHub repo, go to **Settings > Webhooks > Add webhook**.
2.  **Payload URL:** `http://zapp.sytes.net/webhook`
3.  **Content type:** `application/json`
4.  **Secret:** Use the same secret string from Step 2.
5.  Select **Just the `push` event**.
6.  Click **Add webhook**.

Now, when you `git push` to your main branch, your server will automatically update.
