#!/bin/bash

# Script to copy files to Digital Ocean server
# Usage: ./copy-to-server.sh your-server-ip

if [ -z "$1" ]; then
    echo "Usage: ./copy-to-server.sh your-server-ip"
    echo "Example: ./copy-to-server.sh 123.456.789.012"
    exit 1
fi

SERVER_IP=$1
echo "🚀 Copying files to server: $SERVER_IP"

# Create a temporary directory for the files
TEMP_DIR="/tmp/whtzup-setup"
mkdir -p $TEMP_DIR

# Copy necessary files
echo "📁 Copying files..."
cp setup-server.sh $TEMP_DIR/
cp docker-compose.prod.yml $TEMP_DIR/
cp deploy.sh $TEMP_DIR/
cp -r backend $TEMP_DIR/
cp -r database $TEMP_DIR/

# Create a simple setup script
cat > $TEMP_DIR/quick-setup.sh << 'EOF'
#!/bin/bash
echo "🚀 Quick setup for WhtzUp Events"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

echo "📦 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

echo "📦 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

echo "📁 Creating application directory..."
mkdir -p /opt/whtzup-app
cd /opt/whtzup-app

echo "📋 Copying files..."
cp -r /tmp/whtzup-setup/* .

echo "🔧 Setting up environment..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret_change_this_in_production
DATABASE_URL=postgresql://whtzup_user:your_secure_password@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
POSTGRES_PASSWORD=your_secure_password_change_this
ENVEOF

echo "🔐 Setting up PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE whtzup_events;"
sudo -u postgres psql -c "CREATE USER whtzup_user WITH PASSWORD 'your_secure_password_change_this';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;"

echo "🔧 Configuring PostgreSQL..."
cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup
cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.backup
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/14/main/postgresql.conf
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/14/main/pg_hba.conf
systemctl restart postgresql

echo "🔧 Setting up Redis..."
apt install -y redis-server
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
sed -i "s/bind 127.0.0.1/bind 0.0.0.0/" /etc/redis/redis.conf
systemctl restart redis

echo "🔧 Setting up Nginx..."
apt install -y nginx
cat > /etc/nginx/sites-available/whtzup-api << 'NGINXEOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "🔧 Setting up firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000
ufw allow 5432
ufw allow 6379

echo "🚀 Starting the application..."
chmod +x deploy.sh
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your actual values"
echo "2. Update the Nginx configuration with your domain"
echo "3. Test: curl http://localhost:4000/api/health"
echo ""
echo "📁 Application directory: /opt/whtzup-app"
echo "📝 Logs: docker logs whtzup-api -f"
EOF

chmod +x $TEMP_DIR/quick-setup.sh

# Copy files to server
echo "📤 Copying files to server..."
scp -r $TEMP_DIR/* root@$SERVER_IP:/tmp/whtzup-setup/

# Clean up
rm -rf $TEMP_DIR

echo "✅ Files copied successfully!"
echo ""
echo "🔧 Next steps on your server:"
echo "1. SSH to your server: ssh root@$SERVER_IP"
echo "2. Run the setup script: sudo bash /tmp/whtzup-setup/quick-setup.sh"
echo "3. Or run the full setup: sudo bash /tmp/whtzup-setup/setup-server.sh"
echo ""
echo "📋 After setup, don't forget to:"
echo "- Edit the .env file with your actual values"
echo "- Update the Nginx configuration with your domain"
echo "- Get SSL certificate: certbot --nginx -d api.yourdomain.com"
echo "- Test the application: curl http://localhost:4000/api/health"
