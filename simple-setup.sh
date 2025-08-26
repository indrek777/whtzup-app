#!/bin/bash

# Simple setup without Docker - direct installation

echo "🚀 Simple setup for WhtzUp Events"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script as root (use sudo)"
    exit 1
fi

print_step "Step 1: Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

print_step "Step 2: Installing PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib

print_step "Step 3: Installing Redis..."
apt install -y redis-server

print_step "Step 4: Installing Nginx..."
apt install -y nginx

print_step "Step 5: Setting up firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000

print_step "Step 6: Creating application directory..."
mkdir -p /opt/whtzup-app
cd /opt/whtzup-app

print_step "Step 7: Cloning from GitHub..."
git clone https://github.com/indrek777/whtzup-app.git .

print_step "Step 8: Setting up environment..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret_change_this_in_production
DATABASE_URL=postgresql://whtzup_user:your_secure_password@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
POSTGRES_PASSWORD=your_secure_password_change_this
EOF

print_warning "⚠️  IMPORTANT: Please edit the .env file with your actual values"

print_step "Step 9: Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE whtzup_events;" || true
sudo -u postgres psql -c "CREATE USER whtzup_user WITH PASSWORD 'your_secure_password_change_this';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;" || true

print_step "Step 10: Configuring PostgreSQL..."
cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup || true
cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.backup || true
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/14/main/postgresql.conf || true
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/14/main/pg_hba.conf || true
systemctl restart postgresql

print_step "Step 11: Configuring Redis..."
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup || true
sed -i "s/bind 127.0.0.1/bind 0.0.0.0/" /etc/redis/redis.conf || true
systemctl restart redis

print_step "Step 12: Setting up Nginx..."
cat > /etc/nginx/sites-available/whtzup-api << 'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/ || true
nginx -t
systemctl reload nginx

print_step "Step 13: Installing backend dependencies..."
cd backend
npm install

print_step "Step 14: Setting up database..."
node database/init.js || true

print_step "Step 15: Starting the application..."
npm start &

print_status "✅ Simple setup completed!"
print_status ""
print_status "🎉 Your WhtzUp Events server is now ready!"
print_status ""
print_status "📋 Next steps:"
print_status "1. Edit the .env file with your actual values"
print_status "2. Update the Nginx configuration with your domain"
print_status "3. Test the application: curl http://localhost:4000/api/health"
print_status ""
print_status "📁 Application directory: /opt/whtzup-app"
print_status "📝 Logs: tail -f /opt/whtzup-app/backend/logs/app.log"
print_status ""
print_warning "⚠️  Don't forget to:"
print_warning "   - Change default passwords"
print_warning "   - Set up SSL certificate"
print_warning "   - Configure your domain DNS"
print_status ""
print_status "🚀 Happy coding!"
