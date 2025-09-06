# Conversation Analyzer Deployment Guide (Apache on Ubuntu)

This guide provides a complete, tested process for deploying the Conversation Analyzer on a fresh Ubuntu server, such as a Digital Ocean droplet. It uses Gunicorn to run the application and Apache as a reverse proxy.

This guide assumes you have:
*   A clean Ubuntu server.
*   A user with `sudo` privileges (we will use `zixen` as an example).
*   A domain name (e.g., `zapp.sytes.net`) pointing to your server's IP address.

---

### **Step 1: Initial Server Setup**

First, connect to your server and install all necessary packages from the start.

```bash
# SSH into your server
ssh zixen@zapp.sytes.net

# Update package lists and install everything needed
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git apache2 python3-pip python3-venv build-essential python3-dev libsqlite3-dev
```

---

### **Step 2: Get the Application Code**

Clone the repository from GitHub into your desired location. For this guide, we'll use `/var/www/webhost/rec`.

```bash
# Create the directory structure
sudo mkdir -p /var/www/webhost

# Clone the repository into it
sudo git clone https://github.com/your-username/your-repo.git /var/www/webhost/rec
```
*(Replace `https://github.com/your-username/your-repo.git` with your actual repository URL.)*

---

### **Step 3: Set Up the Python Backend**

We will create a Python virtual environment to keep dependencies clean and then set up the application service.

1.  **Set Permissions:** The user running the service (`zixen`) needs to own the files.
    ```bash
    sudo chown -R zixen:www-data /var/www/webhost/rec
    ```

2.  **Create the Virtual Environment:**
    ```bash
    # Navigate to the correct directory
    cd /var/www/webhost/rec/conversation-analyzer/backend

    # Create the venv
    python3 -m venv venv
    ```

3.  **Install Dependencies:**
    ```bash
    # Activate the venv
    source venv/bin/activate

    # Install Python packages
    pip install -r requirements.txt
    pip install gunicorn

    # Deactivate for now
    deactivate
    ```

4.  **Create the WSGI Entry Point:** This file is required for Gunicorn to find the application.
    ```bash
    echo "from main import app" > /var/www/webhost/rec/conversation-analyzer/backend/wsgi.py
    ```

5.  **Initialize the Database:**
    ```bash
    # Activate the venv again
    source venv/bin/activate

    # Run the init-db command
    flask init-db
    ```

---

### **Step 4: Create the `systemd` Service**

This will ensure your application runs as a service in the background.

1.  **Create the service file:**
    ```bash
    sudo nano /etc/systemd/system/conversation-analyzer.service
    ```

2.  **Paste the following configuration.** This version uses a TCP socket (`127.0.0.1:8001`), which is more reliable than a Unix socket in some environments.

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

### **Step 5: Configure the Apache Reverse Proxy**

This is the final step. We will create a clean, simple configuration for Apache.

1.  **Enable Required Apache Modules:**
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    ```

2.  **Disable the Default Site:** This is important to prevent conflicts.
    ```bash
    sudo a2dissite 000-default.conf
    ```

3.  **Create a New Apache Configuration File:**
    ```bash
    sudo nano /etc/apache2/sites-available/zapp.conf
    ```

4.  **Paste the following configuration.** This proxies all traffic to your running Gunicorn application.
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

5.  **Enable the New Site:**
    ```bash
    sudo a2ensite zapp.conf
    ```

---

### **Step 6: Start and Enable Services**

Now, start your application and the web server.

1.  **Reload `systemd`, then start and enable your app:**
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

Your application should now be fully functional at `http://zapp.sytes.net`.
