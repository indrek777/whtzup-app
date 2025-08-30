#!/bin/bash

echo "🔒 Fixing Redis security issue..."

# Use -T flag to disable pseudo-terminal allocation
sshpass -p "123White" ssh -T -i server_key -o StrictHostKeyChecking=no root@139.59.206.197 << 'EOF'

echo "🔍 Checking current Redis configuration..."
sudo cat /etc/redis/redis.conf | grep -E "^(bind|#bind)"

echo "🔧 Fixing Redis configuration..."
# Backup original config
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Uncomment and ensure bind is set to localhost only
sudo sed -i 's/^# bind 127.0.0.1 ::1/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

# Also ensure any other bind lines are commented out or removed
sudo sed -i '/^bind /d' /etc/redis/redis.conf
sudo sed -i 's/^# bind 127.0.0.1 ::1/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

echo "✅ Updated Redis configuration:"
sudo cat /etc/redis/redis.conf | grep -E "^(bind|#bind)"

echo "🔄 Restarting Redis service..."
sudo systemctl restart redis

echo "🔍 Checking Redis status..."
sudo systemctl status redis --no-pager

echo "🔍 Verifying Redis is only listening on localhost..."
sudo netstat -tlnp | grep 6379

echo "✅ Redis security fix completed!"
EOF

echo "✅ Script completed!"
