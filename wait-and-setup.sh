#!/bin/bash

# Script to wait for previous setup to finish and then run quick setup

echo "⏳ Waiting for previous setup to finish..."

# Wait for apt processes to finish
while ssh -i server_key root@165.22.90.180 "ps aux | grep apt | grep -v grep" 2>/dev/null; do
    echo "Previous setup still running... waiting 30 seconds"
    sleep 30
done

echo "✅ Previous setup finished!"
echo "🚀 Starting quick setup..."

# Run quick setup
ssh -i server_key root@165.22.90.180 "cd /tmp && chmod +x quick-setup.sh && ./quick-setup.sh"

echo "✅ Setup completed!"
