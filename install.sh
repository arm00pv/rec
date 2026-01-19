#!/bin/bash

# Conversation Analyzer - One-Click Installer (Linux)
# This script sets up the environment, installs dependencies, and prepares the application for running locally.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Conversation Analyzer Installer ===${NC}"

# 1. Check Prerequisites
echo -e "${BLUE}[1/5] Checking prerequisites...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install it first.${NC}"
    exit 1
fi
if ! command -v pip &> /dev/null; then
    echo -e "${RED}pip is not installed. Please install python3-pip.${NC}"
    exit 1
fi

# 2. Virtual Environment Setup
echo -e "${BLUE}[2/5] Setting up virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}Created 'venv'.${NC}"
else
    echo "Virtual environment already exists."
fi

# Activate venv
source venv/bin/activate

# 3. Install Dependencies
echo -e "${BLUE}[3/5] Installing dependencies...${NC}"
if [ -f "conversation-analyzer/backend/requirements.txt" ]; then
    pip install -r conversation-analyzer/backend/requirements.txt
    echo -e "${GREEN}Dependencies installed.${NC}"
else
    echo -e "${RED}Error: conversation-analyzer/backend/requirements.txt not found!${NC}"
    exit 1
fi

# 4. Environment Configuration
echo -e "${BLUE}[4/5] Configuration...${NC}"
if [ -z "$GOOGLE_API_KEY" ]; then
    if [ -f ".env" ]; then
        echo "Found .env file."
    else
        echo "Please enter your Google Gemini API Key (or press Enter to skip and set manually later):"
        read -r api_key
        if [ ! -z "$api_key" ]; then
            echo "export GOOGLE_API_KEY=\"$api_key\"" > .env
            echo -e "${GREEN}Saved to .env${NC}"
            export GOOGLE_API_KEY="$api_key"
        else
            echo "Skipped API Key setup. Application will run in MOCK mode until configured."
        fi
    fi
else
    echo "GOOGLE_API_KEY is already set in environment."
fi

# 5. Database Initialization
echo -e "${BLUE}[5/5] Initializing database...${NC}"
DB_PATH="conversation-analyzer/backend/tasks.db"
if [ -f "$DB_PATH" ]; then
    echo "Existing database found."
    echo "If you are upgrading from an older version, the schema might have changed."
    echo "Do you want to backup and recreate the database? [y/N]"
    read -r recreate_db
    if [[ "$recreate_db" =~ ^[Yy]$ ]]; then
        mv "$DB_PATH" "${DB_PATH}.bak.$(date +%s)"
        echo -e "${GREEN}Backed up existing database.${NC}"
        export FLASK_APP=conversation-analyzer/backend/main.py
        flask init-db
        echo -e "${GREEN}Database initialized.${NC}"
    else
        echo "Skipping database initialization."
    fi
else
    export FLASK_APP=conversation-analyzer/backend/main.py
    flask init-db
    echo -e "${GREEN}Database initialized.${NC}"
fi

# Create uploads directory if not exists (backend handles it, but good practice)
mkdir -p conversation-analyzer/backend/uploads

echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo "To run the application:"
echo "  1. source venv/bin/activate"
echo "  2. export GOOGLE_API_KEY='your_key' (if not in .env)"
echo "  3. python3 conversation-analyzer/backend/main.py"
echo ""
echo "Or simply run: ./run.sh"

# Create a run script
cat <<EOT > run.sh
#!/bin/bash
if [ -f ".env" ]; then
    source .env
fi
source venv/bin/activate
python3 conversation-analyzer/backend/main.py
EOT
chmod +x run.sh

echo -e "${BLUE}Created 'run.sh' for convenience.${NC}"
