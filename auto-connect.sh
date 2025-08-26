#!/bin/bash

# Auto-connect script for Digital Ocean server
# Uses sshpass to automatically enter the passphrase

SERVER_IP="165.22.90.180"
SSH_KEY="server_key"
PASSPHRASE="123White"

echo "🔗 Connecting to Digital Ocean server..."
echo "📍 Server: $SERVER_IP"
echo "🔑 Using key: $SSH_KEY"

# Function to execute command on server
execute_on_server() {
    local command="$1"
    echo "🚀 Executing: $command"
    sshpass -p "$PASSPHRASE" ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$SERVER_IP" "$command"
}

# Function to copy file to server
copy_to_server() {
    local local_file="$1"
    local remote_path="$2"
    echo "📁 Copying $local_file to $remote_path"
    sshpass -p "$PASSPHRASE" scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$local_file" root@"$SERVER_IP":"$remote_path"
}

# Check if apt is still running
check_apt_status() {
    echo "🔍 Checking if apt is still running..."
    execute_on_server "ps aux | grep apt | grep -v grep || echo 'No apt processes running'"
}

# Wait for apt to finish
wait_for_apt() {
    echo "⏳ Waiting for apt processes to finish..."
    while execute_on_server "ps aux | grep apt | grep -v grep" 2>/dev/null | grep -q apt; do
        echo "Previous setup still running... waiting 30 seconds"
        sleep 30
    done
    echo "✅ Apt processes finished!"
}

# Run quick setup
run_quick_setup() {
    echo "🚀 Starting quick setup..."
    execute_on_server "cd /tmp && chmod +x simple-setup.sh && ./simple-setup.sh"
}

# Check services status
check_services() {
    echo "🔍 Checking services status..."
    execute_on_server "systemctl status postgresql redis nginx --no-pager 2>/dev/null || echo 'Services not installed yet'"
}

# Check ports
check_ports() {
    echo "🔍 Checking open ports..."
    execute_on_server "ss -tulpn | grep -E ':(80|443|4000|5432|6379)' || echo 'No services listening on expected ports'"
}

# Main execution
echo "=========================================="
echo "🤖 Auto-connect to Digital Ocean Server"
echo "=========================================="

# Check current status
check_apt_status

# Wait if needed
if execute_on_server "ps aux | grep apt | grep -v grep" 2>/dev/null | grep -q apt; then
    wait_for_apt
fi

# Run setup
run_quick_setup

# Check results
check_services
check_ports

echo "✅ Auto-connect script completed!"
