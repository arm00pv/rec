#!/bin/bash

# Navigate to the repository directory
cd ~/your-repo

# Pull the latest changes from the main branch
git pull origin main

# Copy the new frontend files to the web server directory
sudo cp -r ~/your-repo/conversation-analyzer/frontend/* /var/www/rec/

# Restart the Gunicorn service to apply backend changes
sudo systemctl restart conversation-analyzer

echo "Deployment completed successfully!"
