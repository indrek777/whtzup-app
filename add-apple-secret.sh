#!/bin/bash

echo "🍎 Adding Apple Shared Secret to backend environment..."

# SSH connection details
SERVER_IP="139.59.206.197"
SSH_KEY="server_key"
PASSPHRASE="123White"

echo "📝 Please provide your Apple Shared Secret from App Store Connect:"
echo "1. Go to App Store Connect (https://appstoreconnect.apple.com)"
echo "2. Navigate to Users and Access > Keys"
echo "3. Create a new key or use existing one"
echo "4. Copy the shared secret"
echo ""
read -p "Enter Apple Shared Secret: " APPLE_SECRET

if [ -z "$APPLE_SECRET" ]; then
    echo "❌ Apple Shared Secret is required!"
    exit 1
fi

echo "📡 Adding secret to server..."

# Use sshpass to automatically provide the passphrase
sshpass -p "$PASSPHRASE" ssh -T -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$SERVER_IP" << EOF

echo "🔧 Adding APPLE_SHARED_SECRET to backend .env file..."
echo "APPLE_SHARED_SECRET=$APPLE_SECRET" >> /root/whtzup-app/backend/.env

echo "✅ Apple Shared Secret added successfully!"
echo "🔄 Restarting backend server..."

# Restart the backend server to load new environment variable
cd /root/whtzup-app/backend
pm2 restart server || systemctl restart whtzup-backend || echo "Please restart backend manually"

echo "✅ Backend restarted with new environment variable!"
EOF

echo "✅ Apple Shared Secret configured successfully!"
echo "🎉 Your subscription system is now ready for production!"
