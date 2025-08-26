#!/bin/bash

# WhtzUp Events - Quick Digital Ocean Setup (Skip apt update)
# This script sets up the backend without waiting for apt update

set -e

echo "🚀 WhtzUp Events - Quick Digital Ocean Setup"
echo "==========================================="

# Configuration (using existing server data)
SERVER_IP="165.22.90.180"
DOMAIN_NAME="api.whtzup.com"
GITHUB_REPO="https://github.com/indrek777/whtzup-app.git"
JWT_SECRET="whtzup_events_jwt_secret_2024_secure_production_key"
DB_PASSWORD="whtzup_secure_db_password_2024"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_success() {
    echo -e "${PURPLE}[SUCCESS]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

print_status "Using configuration:"
echo "Server IP: $SERVER_IP"
echo "Domain: $DOMAIN_NAME"
echo "GitHub Repo: $GITHUB_REPO"
echo "JWT Secret: $JWT_SECRET"
echo "DB Password: $DB_PASSWORD"
echo ""

# Step 1: Install Essential Packages (skip update)
step1_install_packages() {
    print_step "Step 1: Installing essential packages..."
    apt install -y curl wget git unzip software-properties-common \
                   apt-transport-https ca-certificates gnupg lsb-release \
                   htop iotop nethogs ufw fail2ban
    print_success "Essential packages installed"
}

# Step 2: Install Node.js
step2_install_nodejs() {
    print_step "Step 2: Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
}

# Step 3: Install Docker
step3_install_docker() {
    print_step "Step 3: Installing Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker installed: $(docker --version)"
}

# Step 4: Install PostgreSQL
step4_install_postgresql() {
    print_step "Step 4: Installing PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    
    # Configure PostgreSQL
    sudo -u postgres psql -c "CREATE USER whtzup_user WITH PASSWORD '$DB_PASSWORD';" || true
    sudo -u postgres psql -c "CREATE DATABASE whtzup_events OWNER whtzup_user;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;" || true
    
    print_success "PostgreSQL installed and configured"
}

# Step 5: Install Redis
step5_install_redis() {
    print_step "Step 5: Installing Redis..."
    apt install -y redis-server
    
    # Configure Redis
    sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
    systemctl enable redis-server
    systemctl restart redis-server
    
    print_success "Redis installed and configured"
}

# Step 6: Install Nginx
step6_install_nginx() {
    print_step "Step 6: Installing Nginx..."
    apt install -y nginx
    
    # Configure Nginx
    cat > /etc/nginx/sites-available/whtzup-api << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
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
    
    ln -sf /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t
    systemctl enable nginx
    systemctl restart nginx
    
    print_success "Nginx installed and configured"
}

# Step 7: Install Certbot
step7_install_certbot() {
    print_step "Step 7: Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    
    # Get SSL certificate (skip if domain not configured)
    print_warning "SSL certificate setup skipped (domain may not be configured yet)"
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    print_success "Certbot installed and auto-renewal configured"
}

# Step 8: Configure Firewall
step8_configure_firewall() {
    print_step "Step 8: Configuring firewall..."
    ufw --force enable
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 4000
    ufw allow 5432
    ufw allow 6379
    
    print_success "Firewall configured"
}

# Step 9: Setup Application
step9_setup_application() {
    print_step "Step 9: Setting up application..."
    
    # Create application directory
    mkdir -p /opt/whtzup-app
    cd /opt/whtzup-app
    
    # Clone repository
    git clone $GITHUB_REPO .
    
    # Create .env file
    cat > .env << EOF
NODE_ENV=production
PORT=4000
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://whtzup_user:$DB_PASSWORD@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://whtzup.com
API_BASE_URL=https://$DOMAIN_NAME
CORS_ORIGIN=https://whtzup.com
POSTGRES_PASSWORD=$DB_PASSWORD
EOF
    
    # Create logs directory
    mkdir -p logs
    
    # Set permissions
    chown -R root:root /opt/whtzup-app
    chmod -R 755 /opt/whtzup-app
    
    print_success "Application setup completed"
}

# Step 10: Deploy Application
step10_deploy_application() {
    print_step "Step 10: Deploying application..."
    
    cd /opt/whtzup-app
    
    # Build and start services
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    sleep 30
    
    # Check health
    if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
        print_success "Application deployed successfully"
    else
        print_warning "Application deployment may have issues, checking logs..."
        docker-compose -f docker-compose.prod.yml logs --tail=20
    fi
}

# Step 11: Setup Monitoring
step11_setup_monitoring() {
    print_step "Step 11: Setting up monitoring..."
    
    # Create monitoring script
    cat > /opt/whtzup-app/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script

echo "=== System Status ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"

echo ""
echo "=== Service Status ==="
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml ps

echo ""
echo "=== API Health ==="
curl -s http://localhost:4000/api/health || echo "API not responding"
EOF
    
    chmod +x /opt/whtzup-app/monitor.sh
    
    # Setup log rotation
    cat > /etc/logrotate.d/whtzup-app << EOF
/opt/whtzup-app/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    print_success "Monitoring setup completed"
}

# Step 12: Create Management Scripts
step12_create_management_scripts() {
    print_step "Step 12: Creating management scripts..."
    
    # Create restart script
    cat > /opt/whtzup-app/restart.sh << 'EOF'
#!/bin/bash
cd /opt/whtzup-app
docker-compose -f docker-compose.prod.yml restart
echo "Application restarted"
EOF
    
    # Create update script
    cat > /opt/whtzup-app/update.sh << 'EOF'
#!/bin/bash
cd /opt/whtzup-app
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
echo "Application updated"
EOF
    
    # Create backup script
    cat > /opt/whtzup-app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml exec -T postgres pg_dump -U whtzup_user whtzup_events > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/whtzup-app

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    chmod +x /opt/whtzup-app/*.sh
    
    print_success "Management scripts created"
}

# Main execution
main() {
    print_status "Starting quick Digital Ocean setup..."
    
    # Execute all steps
    step1_install_packages
    step2_install_nodejs
    step3_install_docker
    step4_install_postgresql
    step5_install_redis
    step6_install_nginx
    step7_install_certbot
    step8_configure_firewall
    step9_setup_application
    step10_deploy_application
    step11_setup_monitoring
    step12_create_management_scripts
    
    echo ""
    print_success "🎉 Quick Digital Ocean setup completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "=========="
    echo "Server IP: $SERVER_IP"
    echo "Domain: $DOMAIN_NAME"
    echo "API URL: http://$SERVER_IP:4000"
    echo "Application Directory: /opt/whtzup-app"
    echo ""
    echo "🔧 Management Commands:"
    echo "======================"
    echo "Monitor: /opt/whtzup-app/monitor.sh"
    echo "Restart: /opt/whtzup-app/restart.sh"
    echo "Update: /opt/whtzup-app/update.sh"
    echo "Backup: /opt/whtzup-app/backup.sh"
    echo ""
    echo "📊 Check Status:"
    echo "==============="
    echo "curl http://$SERVER_IP:4000/api/health"
    echo ""
    print_warning "Don't forget to configure your domain DNS to point to $SERVER_IP"
    print_warning "Then run: certbot --nginx -d $DOMAIN_NAME"
}

# Run main function
main "$@"
