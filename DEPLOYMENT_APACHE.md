# Definitive Deployment Guide: Conversation Analyzer (Apache on Ubuntu)

This guide provides the complete, tested process for deploying the Conversation Analyzer on a fresh Ubuntu server, such as a Digital Ocean droplet. It uses Gunicorn to run the application and Apache as a reverse proxy.

This guide assumes you have:
*   A clean Ubuntu server.
*   A user with `sudo` privileges (this guide uses `zixen` as an example).
*   A domain name (e.g., `zapp.sytes.net`) pointing to your server's IP address.

---

### **Step 1: Initial Server Preparation**

Connect to your server and install all necessary packages from the start. This ensures all build tools and libraries are available.

```bash
# SSH into your server (replace with your user/domain)
ssh zixen@zapp.sytes.net

# Update package lists and install all required packages
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git apache2 python3-pip python3-venv build-essential python3-dev libsqlite3-dev
```

---

### **Step 2: Get and Prepare the Application Code**

1.  **Clone the Repository:** Clone the application code from your GitHub repository into the `/var/www/` directory.
    ```bash
    # (Replace with your repository URL)
    sudo git clone https://github.com/your-username/your-repo.git /var/www/webhost
    ```

2.  **Set Correct Ownership:** Change the ownership of all the project files to your user (`zixen`) and the web server's group (`www-data`). This is critical for avoiding permission errors.
    ```bash
    sudo chown -R zixen:www-data /var/www/webhost
    ```

---

### **Step 3: Set Up the Python Backend**

1.  **Navigate to the Backend Directory:**
    ```bash
    cd /var/www/webhost/rec/conversation-analyzer/backend
    ```

2.  **Create the Virtual Environment:**
    ```bash
    python3 -m venv venv
    ```

3.  **Activate the Virtual Environment and Install Dependencies:**
    ```bash
    source venv/bin/activate
    pip install -r requirements.txt
    pip install gunicorn
    ```

4.  **Create the WSGI Entry Point File:** This file is essential for Gunicorn to find your application.
    ```bash
    echo "from main import app" > wsgi.py
    ```

5.  **Initialize the Database:**
    ```bash
    # Make sure your venv is still active
    flask init-db
    ```

6.  **Deactivate the Virtual Environment** for now.
    ```bash
    deactivate
    ```

---

### **Step 4: Create the `systemd` Service**

This service will run Gunicorn and your Flask app in the background.

1.  **Create the service file:**
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```

2.  **Paste the following complete and corrected configuration.** This version uses a reliable TCP socket on port 8001.

    ```ini
    [Unit]
    Description=Gunicorn instance to serve the Conversation Analyzer
    After=network.target

    [Service]
    User=zixen
    Group=www-data
    WorkingDirectory=/var/www/webhost/rec/conversation-analyzer/backend
    Environment="PATH=/var/www/webhost/rec/conversation-analyzer/backend/venv/bin"
    # Add your n8n webhook URL here if you have it
    # Environment="N8N_WEBHOOK_URL=https://your-n8n-url/..."
    ExecStart=/var/www/webhost/rec/conversation-analyzer/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8001 wsgi:app

    [Install]
    WantedBy=multi-user.target
    ```

---

### **Step 5: Configure Apache as a Reverse Proxy**

This is the final configuration for Apache. It will cleanly forward web traffic to your application.

1.  **Enable Required Apache Modules:**
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    ```

2.  **Disable the Default Site:** This is very important to prevent conflicts.
    ```bash
    sudo a2dissite 000-default.conf
    ```

3.  **Create a New Apache Configuration File:**
    ```bash
    sudo nano /etc/apache2/sites-available/zapp.conf
    ```

4.  **Paste the following simple and robust configuration.**
    ```apache
    <VirtualHost *:80>
        ServerName zapp.sytes.net

        ProxyPreserveHost On
        ProxyPass / http://127.0.0.1:8001/
        ProxyPassReverse / http://127.0.0.1:8001/

        ErrorLog ${APACHE_LOG_DIR}/error.log
        CustomLog ${APACHE_LOG_DIR}/access.log combined
    </VirtualHost>
    ```

5.  **Enable Your New Site:**
    ```bash
    sudo a2ensite zapp.conf
    ```

---

### **Step 6: Start and Enable Services**

Now, start your application and the web server.

1.  **Reload `systemd` and Start Your App:**
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl start conversation-analyzer.service
    sudo systemctl enable conversation-analyzer.service
    ```

2.  **Restart Apache:**
    ```bash
    sudo systemctl restart apache2
    ```

3.  **Check Firewall (If Active):** If you use `ufw`, ensure Apache is allowed.
    ```bash
    sudo ufw allow 'Apache Full'
    ```

Your application should now be fully functional at `http://zapp.sytes.net`. Congratulations!
