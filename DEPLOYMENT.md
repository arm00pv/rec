# Deployment Guide (LAMP / Linux + Apache)

This guide documents how to deploy the Conversation Analyzer application on a Linux server (e.g., Ubuntu) using Apache and `mod_wsgi`.

## Prerequisites

*   **Linux Server** (Ubuntu 20.04/22.04 recommended)
*   **Root/Sudo access**
*   **Python 3.8+**
*   **Apache2**
*   **Git**

## 1. System Setup & Dependencies

Update your package list and install necessary system packages:

```bash
sudo apt update
sudo apt install apache2 libapache2-mod-wsgi-py3 python3 python3-pip python3-venv git
```

Enable `mod_wsgi`:

```bash
sudo a2enmod wsgi
```

## 2. Directory Structure & Code Setup

We will deploy the application to `/var/www/conversation-analyzer`.

1.  **Clone the Repository:**

    ```bash
    cd /var/www
    sudo git clone https://github.com/your-username/conversation-analyzer.git
    sudo chown -R www-data:www-data conversation-analyzer
    cd conversation-analyzer
    ```

2.  **Set up Virtual Environment:**

    It is best practice to use a virtual environment.

    ```bash
    sudo -u www-data python3 -m venv venv
    source venv/bin/activate
    pip install -r conversation-analyzer/backend/requirements.txt
    deactivate
    ```

3.  **Directory Structure Check:**

    Your server should look like this:

    ```
    /var/www/conversation-analyzer/
    ├── venv/
    ├── conversation-analyzer/
    │   ├── backend/
    │   │   ├── main.py
    │   │   ├── wsgi.py
    │   │   ├── tasks.db (will be created here)
    │   ├── frontend/
    │   │   ├── index.html
    │   │   ├── ...
    ```

## 3. Apache Configuration

1.  **Create Configuration File:**

    Copy the sample configuration or create a new one:

    ```bash
    sudo cp conversation-analyzer/apache-config.conf.sample /etc/apache2/sites-available/conversation-analyzer.conf
    ```

2.  **Edit Configuration:**

    Edit the file to add your domain and API keys:

    ```bash
    sudo nano /etc/apache2/sites-available/conversation-analyzer.conf
    ```

    *   Update `ServerName` to your domain or IP.
    *   Update `SetEnv GOOGLE_API_KEY` with your actual Google Gemini API Key.
    *   Ensure paths in `WSGIDaemonProcess` and `WSGIScriptAlias` match your installation.

3.  **Enable Site:**

    ```bash
    sudo a2ensite conversation-analyzer
    sudo systemctl reload apache2
    ```

## 4. Permissions

Ensure the web server (usually `www-data`) has write access to the database directory so it can create/write `tasks.db`.

```bash
sudo chown -R www-data:www-data /var/www/conversation-analyzer/conversation-analyzer/backend
sudo chmod 775 /var/www/conversation-analyzer/conversation-analyzer/backend
```

## 5. Troubleshooting

*   **Logs:** Check Apache error logs for issues:
    ```bash
    sudo tail -f /var/log/apache2/error.log
    ```
*   **Database Errors:** If you see "Read-only file system" or permission errors, ensure `www-data` owns the `backend` folder.
*   **Module Not Found:** Ensure `python-home` in `WSGIDaemonProcess` points to the `venv` directory correctly.

## 6. Updates

To update the application:

```bash
cd /var/www/conversation-analyzer
sudo -u www-data git pull
source venv/bin/activate
pip install -r conversation-analyzer/backend/requirements.txt
sudo systemctl reload apache2
```
