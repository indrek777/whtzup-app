#!/bin/bash

# WhtzUp Events - Server Setup Script for Digital Ocean
# Run this script on your Digital Ocean Droplet

set -e

echo "🚀 WhtzUp Events - Server Setup Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_step "Step 1: Updating system packages..."
apt update && apt upgrade -y

print_step "Step 2: Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release htop iotop nethogs

print_step "Step 3: Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

print_step "Step 4: Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

print_step "Step 5: Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

print_step "Step 6: Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

print_step "Step 7: Installing Redis..."
apt install -y redis-server

print_step "Step 8: Installing Nginx..."
apt install -y nginx

print_step "Step 9: Installing Certbot (SSL certificates)..."
apt install -y certbot python3-certbot-nginx

print_step "Step 10: Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000
ufw allow 5432
ufw allow 6379

print_step "Step 11: Creating application directory..."
mkdir -p /opt/whtzup-app
cd /opt/whtzup-app

print_step "Step 12: Cloning repository..."
# Note: You'll need to update this URL with your actual repository
git clone https://github.com/your-username/whtzup-app.git .

print_step "Step 13: Setting up environment file..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret_change_this_in_production
DATABASE_URL=postgresql://whtzup_user:your_secure_password@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
POSTGRES_PASSWORD=your_secure_password_change_this
EOF

print_warning "⚠️  IMPORTANT: Please edit the .env file with your actual values:"
print_warning "   - Change JWT_SECRET to a secure random string"
print_warning "   - Change POSTGRES_PASSWORD to a secure password"
print_warning "   - Update FRONTEND_URL to your actual domain"
print_warning "   - Update DATABASE_URL with the correct password"

print_step "Step 14: Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE whtzup_events;"
sudo -u postgres psql -c "CREATE USER whtzup_user WITH PASSWORD 'your_secure_password_change_this';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;"

print_step "Step 15: Configuring PostgreSQL for remote connections..."
# Backup original config
cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup
cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.backup

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/14/main/postgresql.conf

# Update pg_hba.conf
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL
systemctl restart postgresql

print_step "Step 16: Configuring Redis..."
# Backup original config
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Update redis.conf
sed -i "s/bind 127.0.0.1/bind 0.0.0.0/" /etc/redis/redis.conf

# Restart Redis
systemctl restart redis

print_step "Step 17: Setting up Nginx configuration..."
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

# Enable site
ln -sf /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

print_step "Step 18: Making deployment script executable..."
chmod +x deploy.sh

print_step "Step 19: Setting up backup script..."
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec whtzup-postgres pg_dump -U whtzup_user whtzup_events > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh") | crontab -

print_step "Step 20: Building and starting the application..."
docker-compose -f docker-compose.prod.yml up -d --build

print_status "✅ Server setup completed!"
print_status ""
print_status "🎉 Your WhtzUp Events server is now ready!"
print_status ""
print_status "📋 Next steps:"
print_status "1. Edit the .env file with your actual values"
print_status "2. Update the Nginx configuration with your domain"
print_status "3. Get SSL certificate: certbot --nginx -d api.yourdomain.com"
print_status "4. Test the application: curl http://localhost:4000/api/health"
print_status ""
print_status "📁 Application directory: /opt/whtzup-app"
print_status "📝 Logs: docker logs whtzup-api -f"
print_status "🔧 Management: cd /opt/whtzup-app && ./deploy.sh production"
print_status ""
print_warning "⚠️  Don't forget to:"
print_warning "   - Change default passwords"
print_warning "   - Set up SSL certificate"
print_warning "   - Configure your domain DNS"
print_warning "   - Set up monitoring"
print_status ""
print_status "🚀 Happy coding!"
