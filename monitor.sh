#!/bin/bash
# WhtzUp Backend Server Monitor Script

cd /root/whtzup-backend

# Check if server is running
if ! curl -s http://localhost:4000/api/health > /dev/null; then
    echo "$(date): Server not responding, restarting..."
    pkill -f "node server.js" 2>/dev/null
    sleep 2
    nohup node server.js > server.log 2>&1 &
    echo "$(date): Server restarted"
else
    echo "$(date): Server is running"
fi
