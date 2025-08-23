#!/bin/bash

# SSL Certificate Setup Script for Development
# This script creates a self-signed certificate for local development

echo "🔐 Setting up SSL certificates for development..."

# Create ssl directory
mkdir -p ssl

# Generate private key
echo "📝 Generating private key..."
openssl genrsa -out ssl/private.key 2048

# Generate self-signed certificate
echo "📜 Generating self-signed certificate..."
openssl req -new -x509 -key ssl/private.key -out ssl/certificate.crt -days 365 \
  -subj "/C=EE/ST=Tallinn/L=Tallinn/O=EventDiscovery/CN=olympio.ee"

# Set proper permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt

echo "✅ SSL certificates created successfully!"
echo ""
echo "📁 Files created:"
echo "   - ssl/private.key"
echo "   - ssl/certificate.crt"
echo ""
echo "🔧 Next steps:"
echo "   1. Add these environment variables to your .env file:"
echo "      SSL_KEY_PATH=./ssl/private.key"
echo "      SSL_CERT_PATH=./ssl/certificate.crt"
echo "      HTTPS_PORT=4001"
echo ""
echo "   2. Restart your backend server"
echo "   3. Test HTTPS: curl -k https://olympio.ee:4001/api/health"
echo ""
echo "⚠️  Note: This is a self-signed certificate for development only."
echo "   For production, use Let's Encrypt or a proper SSL certificate."
