#!/bin/bash

# Update DigitalOcean and Deploy HTTPS
# This script provides instructions for updating the DigitalOcean server

echo "🚀 DigitalOcean HTTPS Deployment Instructions"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DO_SERVER="165.22.90.180"
GITHUB_REPO="https://github.com/indrek777/whtzup-app.git"

echo -e "${YELLOW}Step 1: SSH to DigitalOcean Server${NC}"
echo "Since SSH key authentication is not working, you'll need to:"
echo "1. Check your SSH key configuration"
echo "2. Or use password authentication if enabled"
echo "3. Or use DigitalOcean console access"
echo ""
echo "SSH command:"
echo -e "${BLUE}ssh -i ~/.ssh/whtzup_key root@${DO_SERVER}${NC}"
echo ""

echo -e "${YELLOW}Step 2: Update Code on DigitalOcean${NC}"
echo "Once connected to the server, run these commands:"
echo ""
echo -e "${BLUE}# Navigate to the app directory${NC}"
echo "cd /root/whtzup-app"
echo ""
echo -e "${BLUE}# Pull latest code from GitHub${NC}"
echo "git pull origin main"
echo ""
echo -e "${BLUE}# Install new dependencies (if any)${NC}"
echo "cd backend && npm install"
echo ""

echo -e "${YELLOW}Step 3: Deploy HTTPS${NC}"
echo "After updating the code, you can deploy HTTPS in two ways:"
echo ""
echo -e "${GREEN}Option A: Using Admin API (Recommended)${NC}"
echo "1. The server will have new admin API endpoints"
echo "2. Run the deployment script from your local machine:"
echo -e "${BLUE}node deploy-https-via-admin-api.js${NC}"
echo ""
echo -e "${GREEN}Option B: Manual Deployment${NC}"
echo "1. Create SSL certificates:"
echo -e "${BLUE}mkdir -p /root/whtzup-app/ssl${NC}"
echo -e "${BLUE}openssl req -x509 -newkey rsa:4096 -keyout /root/whtzup-app/ssl/server.key -out /root/whtzup-app/ssl/server.crt -days 365 -nodes -subj '/C=EE/ST=Harju/L=Tallinn/O=WhtzUp/OU=Production/CN=165.22.90.180'${NC}"
echo ""
echo "2. Set proper permissions:"
echo -e "${BLUE}chmod 600 /root/whtzup-app/ssl/server.key${NC}"
echo -e "${BLUE}chmod 644 /root/whtzup-app/ssl/server.crt${NC}"
echo ""
echo "3. Update environment variables:"
echo -e "${BLUE}echo 'SSL_KEY_PATH=/root/whtzup-app/ssl/server.key' >> /root/whtzup-app/.env${NC}"
echo -e "${BLUE}echo 'SSL_CERT_PATH=/root/whtzup-app/ssl/server.crt' >> /root/whtzup-app/.env${NC}"
echo -e "${BLUE}echo 'HTTPS_PORT=4001' >> /root/whtzup-app/.env${NC}"
echo ""
echo "4. Restart Docker containers:"
echo -e "${BLUE}cd /root/whtzup-app && docker-compose down && docker-compose up -d${NC}"
echo ""
echo "5. Open firewall port:"
echo -e "${BLUE}ufw allow 4001/tcp${NC}"
echo ""

echo -e "${YELLOW}Step 4: Test HTTPS Deployment${NC}"
echo "After deployment, test from your local machine:"
echo ""
echo -e "${BLUE}# Test HTTP${NC}"
echo "curl http://${DO_SERVER}:4000/health"
echo ""
echo -e "${BLUE}# Test HTTPS${NC}"
echo "curl -k https://${DO_SERVER}:4001/health"
echo ""
echo -e "${BLUE}# Or use the test script${NC}"
echo "node test-digitalocean-https.js"
echo ""

echo -e "${YELLOW}Alternative: Using DigitalOcean Console${NC}"
echo "If SSH doesn't work, you can:"
echo "1. Go to DigitalOcean dashboard"
echo "2. Access your droplet's console"
echo "3. Run the commands manually"
echo ""

echo -e "${YELLOW}Troubleshooting${NC}"
echo "If you encounter issues:"
echo "1. Check SSH key permissions: chmod 600 ~/.ssh/whtzup_key"
echo "2. Verify SSH key is added to server: ssh-copy-id -i ~/.ssh/whtzup_key.pub root@${DO_SERVER}"
echo "3. Check firewall settings on DigitalOcean"
echo "4. Verify Docker containers are running: docker ps"
echo ""

echo -e "${GREEN}Current Status:${NC}"
echo "✅ Code pushed to GitHub: ${GITHUB_REPO}"
echo "✅ HTTPS configuration ready"
echo "✅ Admin API endpoints added"
echo "⏳ Waiting for DigitalOcean server update"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. SSH to DigitalOcean server"
echo "2. Update code: git pull origin main"
echo "3. Deploy HTTPS using admin API or manual steps"
echo "4. Test HTTPS connectivity"
echo ""

echo "🎉 Once completed, your WhtzUp backend will support both HTTP and HTTPS!"
