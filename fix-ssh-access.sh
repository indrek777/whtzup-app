#!/bin/bash

# Fix SSH Access to DigitalOcean Server
# This script helps resolve SSH connection issues

echo "🔧 Fixing SSH Access to DigitalOcean Server"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DO_SERVER="165.22.90.180"
SSH_KEY_PATH="$HOME/.ssh/whtzup_key"

echo -e "${YELLOW}Current SSH Key Information:${NC}"
echo "SSH Key Path: ${SSH_KEY_PATH}"
echo "Server: ${DO_SERVER}"
echo ""

# Check SSH key
echo -e "${YELLOW}Step 1: Checking SSH Key${NC}"
if [ -f "${SSH_KEY_PATH}" ]; then
    echo -e "${GREEN}✅ SSH key exists${NC}"
    echo "Key fingerprint:"
    ssh-keygen -l -f "${SSH_KEY_PATH}"
else
    echo -e "${RED}❌ SSH key not found${NC}"
    exit 1
fi

echo ""

# Check SSH key permissions
echo -e "${YELLOW}Step 2: Checking SSH Key Permissions${NC}"
PERMS=$(stat -f "%Lp" "${SSH_KEY_PATH}")
if [ "$PERMS" = "600" ]; then
    echo -e "${GREEN}✅ SSH key permissions are correct (600)${NC}"
else
    echo -e "${RED}❌ SSH key permissions are incorrect (${PERMS})${NC}"
    echo "Fixing permissions..."
    chmod 600 "${SSH_KEY_PATH}"
    echo -e "${GREEN}✅ Permissions fixed${NC}"
fi

echo ""

# Test SSH connection
echo -e "${YELLOW}Step 3: Testing SSH Connection${NC}"
echo "Testing with different authentication methods..."

# Test with explicit key
echo "Testing with explicit key file..."
if ssh -i "${SSH_KEY_PATH}" -o ConnectTimeout=10 root@${DO_SERVER} "echo 'SSH test successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful with explicit key${NC}"
    SSH_WORKING=true
else
    echo -e "${RED}❌ SSH connection failed with explicit key${NC}"
    SSH_WORKING=false
fi

# Test with SSH agent
echo "Testing with SSH agent..."
if ssh -o ConnectTimeout=10 root@${DO_SERVER} "echo 'SSH test successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful with agent${NC}"
    SSH_WORKING=true
else
    echo -e "${RED}❌ SSH connection failed with agent${NC}"
fi

echo ""

# Provide solutions
echo -e "${YELLOW}Step 4: Solutions${NC}"

if [ "$SSH_WORKING" = true ]; then
    echo -e "${GREEN}🎉 SSH is working! You can now proceed with HTTPS deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. SSH to server: ssh root@${DO_SERVER}"
    echo "2. Update code: cd /root/whtzup-app && git pull origin main"
    echo "3. Deploy HTTPS using the provided scripts"
else
    echo -e "${RED}❌ SSH is not working. Here are the solutions:${NC}"
    echo ""
    echo -e "${BLUE}Solution 1: Add SSH Key to Server${NC}"
    echo "You need to add your SSH public key to the server's authorized_keys file."
    echo "Since you can't SSH in, you'll need to:"
    echo "1. Go to DigitalOcean dashboard"
    echo "2. Access your droplet's console"
    echo "3. Add the key manually:"
    echo "   mkdir -p ~/.ssh"
    echo "   echo '$(cat ~/.ssh/whtzup_key.pub)' >> ~/.ssh/authorized_keys"
    echo "   chmod 700 ~/.ssh"
    echo "   chmod 600 ~/.ssh/authorized_keys"
    echo ""
    
    echo -e "${BLUE}Solution 2: Use DigitalOcean Console${NC}"
    echo "1. Go to DigitalOcean dashboard"
    echo "2. Select your droplet"
    echo "3. Click 'Access' → 'Launch Console'"
    echo "4. Run commands directly in the console"
    echo ""
    
    echo -e "${BLUE}Solution 3: Reset SSH Key via DigitalOcean${NC}"
    echo "1. Go to DigitalOcean dashboard"
    echo "2. Select your droplet"
    echo "3. Go to 'Access' → 'SSH Keys'"
    echo "4. Add your SSH public key"
    echo "5. Or use DigitalOcean's key management"
    echo ""
    
    echo -e "${BLUE}Solution 4: Use Alternative Deployment Method${NC}"
    echo "Since SSH doesn't work, you can:"
    echo "1. Use DigitalOcean console for manual deployment"
    echo "2. Or use the admin API method after updating code"
    echo "3. Or use Docker Hub for deployment"
fi

echo ""

# Show public key for manual addition
echo -e "${YELLOW}Your SSH Public Key (for manual addition):${NC}"
echo "Copy this key and add it to the server's ~/.ssh/authorized_keys file:"
echo ""
echo -e "${BLUE}$(cat ~/.ssh/whtzup_key.pub)${NC}"
echo ""

echo -e "${YELLOW}Quick Test Commands:${NC}"
echo "Test SSH: ssh -i ~/.ssh/whtzup_key root@${DO_SERVER}"
echo "Test with agent: ssh root@${DO_SERVER}"
echo "Test different user: ssh -i ~/.ssh/whtzup_key ubuntu@${DO_SERVER}"
