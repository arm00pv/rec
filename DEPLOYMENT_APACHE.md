# Conversation Analyzer Deployment Guide (Apache)

This guide provides step-by-step instructions for deploying the Conversation Analyzer application to a Digital Ocean droplet using an Apache web server as a reverse proxy.

This guide assumes you have:
*   A Digital Ocean droplet (or any server running a Debian-based Linux distribution like Ubuntu).
*   A user with `sudo` privileges.
*   A domain name (`zapp.sytes.net` in this example) pointing to your server's IP address.

---

### **Step 1: SSH into Your Server**

First, connect to your Digital Ocean droplet using SSH. Replace `your_username` with your actual username and `zapp.sytes.net` with your server's address.

```bash
ssh your_username@zapp.sytes.net
```

---

### **Step 2: Install Required Software**

You'll need `git` to get your code, `python3` and `pip` to run the backend, `gunicorn` as a production-ready web server for Flask, and `apache2` as your web server.

```bash
sudo apt update
sudo apt install -y git python3-pip python3-venv apache2
```

---

### **Step 3: Get Your Application Code**

Clone your repository onto the server. Make sure the pull request with the application code has been merged first.

```bash
# Navigate to your home directory
cd ~

# Clone your repository (replace with your actual repository URL)
git clone https://github.com/your-username/your-repo.git

# Navigate into the project directory
cd your-repo/conversation-analyzer
```

---

### **Step 4: Set Up the Backend with Gunicorn**

It's not recommended to use Flask's built-in development server for production. We'll use Gunicorn to run the backend and `systemd` to manage it as a service.

#### 4a. Create a Python Virtual Environment

This keeps your project's dependencies isolated.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt
pip install gunicorn

# You can deactivate the environment for now
deactivate
```

#### 4b. Create a WSGI Entry Point

Create a `wsgi.py` file in the `backend` directory. This file is the entry point Gunicorn will use.

```bash
# Make sure you are in the 'backend' directory
cd ~/your-repo/conversation-analyzer/backend
nano wsgi.py
```

Paste this into the `wsgi.py` file:
```python
from main import app

if __name__ == "__main__":
    app.run()
```

#### 4c. Create a `systemd` Service File

This service will run Gunicorn in the background and ensure it starts automatically on boot.

Create a new service file:
```bash
sudo nano /etc/systemd/system/conversation-analyzer.service
```

Paste the following configuration into the file. **Make sure to replace `your_username` with your actual username on the server.**

```ini
[Unit]
Description=Gunicorn instance to serve the Conversation Analyzer backend
After=network.target

[Service]
User=your_username
Group=www-data
WorkingDirectory=/home/your_username/your-repo/conversation-analyzer/backend
Environment="PATH=/home/your_username/your-repo/conversation-analyzer/backend/venv/bin"
ExecStart=/home/your_username/your-repo/conversation-analyzer/backend/venv/bin/gunicorn --workers 3 --bind unix:conversation-analyzer.sock -m 007 wsgi:app

[Install]
WantedBy=multi-user.target
```

#### 4d. Start and Enable the Gunicorn Service

```bash
sudo systemctl start conversation-analyzer
sudo systemctl enable conversation-analyzer
```
You can check the status of the service with `sudo systemctl status conversation-analyzer`.

---

### **Step 5: Set Up the Frontend Files**

You mentioned you want to deploy the app to `/var/www/rec`. Let's create that directory and copy the frontend files into it.

```bash
# Create the directory
sudo mkdir -p /var/www/rec

# Copy the frontend files
sudo cp -r ~/your-repo/conversation-analyzer/frontend/* /var/www/rec/
```

---

### **Step 6: Configure Apache as a Reverse Proxy**

Apache will handle incoming web traffic. It will serve the frontend files directly and pass any API or upload requests to the Gunicorn backend.

#### 6a. Enable Necessary Apache Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

#### 6b. Create a New Apache Configuration File

```bash
sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
```

#### 6c. Add Virtual Host Configuration

Paste the following configuration into the file. Remember to replace `your_username` and `zapp.sytes.net`.

```apache
<VirtualHost *:80>
    ServerName zapp.sytes.net

    # Serve the frontend static files
    DocumentRoot /var/www/rec
    <Directory /var/www/rec>
        AllowOverride All
        Require all granted
    </Directory>

    # Proxy API and upload requests to the Gunicorn backend socket
    ProxyPreserveHost On
    ProxyPass /api/ "unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/api/"
    ProxyPassReverse /api/ "unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/api/"

    ProxyPass /upload "unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/upload"
    ProxyPassReverse /upload "unix:/home/your_username/your-repo/conversation-analyzer/backend/conversation-analyzer.sock|http://localhost/upload"

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

#### 6d. Enable the New Site and Restart Apache

```bash
sudo a2ensite conversation-analyzer.conf
sudo systemctl restart apache2
```

---

### **Step 7: Adjust Firewall Settings**

If you use a firewall like `ufw`, you'll need to allow traffic to Apache.

```bash
sudo ufw allow 'Apache Full'
```

---

Your application should now be live at `http://zapp.sytes.net`!
