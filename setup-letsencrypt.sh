#!/bin/bash

# Let's Encrypt SSL Setup Script for Digital Ocean Server
# Domain: api.olympio.ee
# Server: 165.22.90.180

echo "🔐 Setting up Let's Encrypt SSL certificate for api.olympio.ee"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Certbot and Nginx
echo "🔧 Installing Certbot and Nginx..."
sudo apt install -y certbot python3-certbot-nginx nginx

# Create Nginx configuration for api.olympio.ee
echo "📝 Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/api.olympio.ee << EOF
server {
    listen 80;
    server_name api.olympio.ee;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/api.olympio.ee /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate from Let's Encrypt
echo "🎫 Getting SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d api.olympio.ee --non-interactive --agree-tos --email ints@me.com

# Update Nginx configuration to handle both HTTP and HTTPS
echo "🔧 Updating Nginx configuration for HTTPS..."
sudo tee /etc/nginx/sites-available/api.olympio.ee << EOF
server {
    listen 80;
    server_name api.olympio.ee;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.olympio.ee;
    
    ssl_certificate /etc/letsencrypt/live/api.olympio.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.olympio.ee/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Test and reload Nginx
echo "🧪 Testing Nginx configuration..."
sudo nginx -t
sudo systemctl reload nginx

# Set up automatic renewal
echo "🔄 Setting up automatic certificate renewal..."
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ Let's Encrypt SSL setup complete!"
echo "🌐 Your API is now available at: https://api.olympio.ee"
echo "🔐 SSL certificate will auto-renew every 90 days"
