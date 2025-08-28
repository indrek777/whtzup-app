#!/bin/bash

echo "Starting WhtzUp Backend with HTTPS support..."

# Check if SSL certificates exist
if [ ! -f "ssl/server.key" ] || [ ! -f "ssl/server.crt" ]; then
    echo "SSL certificates not found. Creating self-signed certificates..."
    mkdir -p ssl
    openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.crt -days 365 -nodes -subj "/C=EE/ST=Harju/L=Tallinn/O=WhtzUp/OU=Development/CN=localhost"
    echo "SSL certificates created successfully!"
fi

# Set environment variables for HTTPS
export SSL_KEY_PATH=./ssl/server.key
export SSL_CERT_PATH=./ssl/server.crt
export HTTPS_PORT=4001

# Start the server
echo "Starting server on HTTP (port 4000) and HTTPS (port 4001)..."
cd backend && npm start
