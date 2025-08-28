#!/bin/bash

# Deploy HTTPS to DigitalOcean Server
# This script updates the DigitalOcean server with HTTPS support

echo "🚀 Deploying HTTPS to DigitalOcean server..."

# DigitalOcean server details
DO_SERVER="165.22.90.180"
DO_USER="root"  # Change if you use a different user

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking current server status...${NC}"

# Test current HTTP endpoint
if curl -s "http://${DO_SERVER}:4000/health" > /dev/null; then
    echo -e "${GREEN}✅ HTTP server is running on port 4000${NC}"
else
    echo -e "${RED}❌ HTTP server is not responding${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Creating SSL certificates on DigitalOcean...${NC}"

# SSH commands to set up HTTPS on DigitalOcean
ssh_commands="
# Create SSL directory
mkdir -p /root/whtzup-app/ssl

# Generate self-signed SSL certificate
openssl req -x509 -newkey rsa:4096 -keyout /root/whtzup-app/ssl/server.key -out /root/whtzup-app/ssl/server.crt -days 365 -nodes -subj '/C=EE/ST=Harju/L=Tallinn/O=WhtzUp/OU=Production/CN=165.22.90.180'

# Set proper permissions
chmod 600 /root/whtzup-app/ssl/server.key
chmod 644 /root/whtzup-app/ssl/server.crt

# Check if certificates were created
ls -la /root/whtzup-app/ssl/
"

echo "Executing SSL setup commands..."
ssh ${DO_USER}@${DO_SERVER} "${ssh_commands}"

echo -e "${YELLOW}Step 3: Updating server configuration...${NC}"

# Update environment variables
ssh ${DO_USER}@${DO_SERVER} "
# Stop current server
cd /root/whtzup-app && docker-compose down

# Update environment variables for HTTPS
echo 'SSL_KEY_PATH=/root/whtzup-app/ssl/server.key' >> .env
echo 'SSL_CERT_PATH=/root/whtzup-app/ssl/server.crt' >> .env
echo 'HTTPS_PORT=4001' >> .env

# Restart with HTTPS support
docker-compose up -d
"

echo -e "${YELLOW}Step 4: Opening HTTPS port in firewall...${NC}"

# Open HTTPS port in firewall
ssh ${DO_USER}@${DO_SERVER} "
# Open port 4001 for HTTPS
ufw allow 4001/tcp

# Check firewall status
ufw status
"

echo -e "${YELLOW}Step 5: Testing HTTPS endpoint...${NC}"

# Wait for server to start
sleep 10

# Test HTTPS endpoint
if curl -k -s "https://${DO_SERVER}:4001/health" > /dev/null; then
    echo -e "${GREEN}✅ HTTPS server is running on port 4001${NC}"
    
    # Show health check response
    echo "HTTPS Health Check Response:"
    curl -k -s "https://${DO_SERVER}:4001/health" | jq .
else
    echo -e "${RED}❌ HTTPS server is not responding${NC}"
    echo "Checking server logs..."
    ssh ${DO_USER}@${DO_SERVER} "cd /root/whtzup-app && docker-compose logs api-server"
fi

echo -e "${GREEN}🎉 HTTPS deployment completed!${NC}"
echo ""
echo "Server URLs:"
echo "  HTTP:  http://${DO_SERVER}:4000"
echo "  HTTPS: https://${DO_SERVER}:4001"
echo ""
echo "Test commands:"
echo "  curl http://${DO_SERVER}:4000/health"
echo "  curl -k https://${DO_SERVER}:4001/health"
