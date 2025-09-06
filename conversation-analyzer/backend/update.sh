#!/bin/bash

# Navigate to the project directory
cd /var/www/zapp.sytes.net/conversation-analyzer || exit

# Deactivate virtual environment if active
deactivate >/dev/null 2>&1

# Pull the latest changes from the main branch
git pull origin main

# Activate the virtual environment
source venv/bin/activate

# Install/update dependencies
pip install -r backend/requirements.txt

# Re-initialize the database (if needed, be careful with this in production)
# flask init-db

# Restart the application service
sudo systemctl restart conversation-analyzer

echo "Deployment script finished."
