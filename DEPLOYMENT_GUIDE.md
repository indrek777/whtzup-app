# 🚀 Digital Ocean Deployment Guide

## **1. Digital Ocean'i Droplet loomine**

### **Droplet konfiguratsioon:**
- **OS:** Ubuntu 22.04 LTS
- **Size:** Basic Plan - Regular with SSD (2GB RAM, 1 vCPU, 50GB SSD)
- **Datacenter:** Frankfurt (EU) või Amsterdam (EU)
- **Authentication:** SSH Key (soovituslik) või Password

### **Hinnad (2024):**
- **Basic Droplet:** ~$12/kuu (2GB RAM, 1 vCPU, 50GB SSD)
- **Database Cluster:** ~$15/kuu (PostgreSQL)
- **Load Balancer:** ~$12/kuu (kui vaja)
- **Total:** ~$39/kuu

## **2. Serveri seadistamine**

### **SSH ühendus:**
```bash
ssh root@your-server-ip
```

### **Põhilised paketid:**
```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis
apt install -y redis-server

# Install Nginx
apt install -y nginx

# Install Certbot (SSL sertifikaatide jaoks)
apt install -y certbot python3-certbot-nginx
```

### **Firewall seadistamine:**
```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow ssh

# Allow HTTP/HTTPS
ufw allow 80
ufw allow 443

# Allow application ports
ufw allow 4000  # API server
ufw allow 5432  # PostgreSQL
ufw allow 6379  # Redis

# Check status
ufw status
```

## **3. Domeeni seadistamine**

### **DNS seaded:**
- **A Record:** `api.yourdomain.com` → Server IP
- **A Record:** `yourdomain.com` → Server IP (kui vaja)

### **SSL sertifikaat:**
```bash
# Get SSL certificate
certbot --nginx -d api.yourdomain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## **4. Andmebaasi seadistamine**

### **PostgreSQL konfiguratsioon:**
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE whtzup_events;
CREATE USER whtzup_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;
\q

# Configure PostgreSQL for remote connections
sudo nano /etc/postgresql/14/main/postgresql.conf
# Change: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host    all             all             0.0.0.0/0               md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Redis konfiguratsioon:**
```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
# Change: bind 0.0.0.0

# Restart Redis
sudo systemctl restart redis
```

## **5. Rakenduse juurutamine**

### **Koodi kloonimine:**
```bash
# Create app directory
mkdir -p /opt/whtzup-app
cd /opt/whtzup-app

# Clone repository
git clone https://github.com/your-username/whtzup-app.git .

# Install dependencies
npm install
```

### **Keskkonna seaded:**
```bash
# Create .env file
nano .env

# Add environment variables:
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret
DATABASE_URL=postgresql://whtzup_user:your_secure_password@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
```

### **Docker Compose seadistamine:**
```bash
# Create production docker-compose.yml
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  api-server:
    build: .
    container_name: whtzup-api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - FRONTEND_URL=${FRONTEND_URL}
    depends_on:
      - postgres
      - redis
    networks:
      - whtzup-network

  postgres:
    image: postgres:15-alpine
    container_name: whtzup-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=whtzup_events
      - POSTGRES_USER=whtzup_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - whtzup-network

  redis:
    image: redis:7-alpine
    container_name: whtzup-redis
    restart: unless-stopped
    networks:
      - whtzup-network

volumes:
  postgres_data:

networks:
  whtzup-network:
    driver: bridge
```

### **Nginx konfiguratsioon:**
```bash
# Create Nginx config
nano /etc/nginx/sites-available/whtzup-api

# Add configuration:
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

# Enable site
ln -s /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## **6. Rakenduse käivitamine**

### **Docker Compose käivitamine:**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### **Andmebaasi migratsioon:**
```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec api-server npm run migrate

# Or manually
docker exec -it whtzup-api node database/init.sql
```

## **7. Monitoring ja logid**

### **Logid:**
```bash
# View application logs
docker logs whtzup-api -f

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# View system logs
journalctl -u docker.service -f
```

### **Monitoring:**
```bash
# Install monitoring tools
apt install -y htop iotop nethogs

# Check system resources
htop
df -h
free -h
```

## **8. Backup strateegia**

### **Andmebaasi backup:**
```bash
# Create backup script
nano /opt/backup-db.sh

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

# Make executable
chmod +x /opt/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/backup-db.sh
```

## **9. Arenduse jätkamine**

### **Git workflow:**
```bash
# Development workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Production deployment
git checkout main
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### **CI/CD (GitHub Actions):**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Digital Ocean

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.4
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /opt/whtzup-app
          git pull origin main
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml up -d --build
```

## **10. Kulu hinnang**

### **Kuukulud:**
- **Droplet (2GB RAM):** $12/kuu
- **Database Cluster:** $15/kuu (kui kasutad Digital Ocean'i PostgreSQL)
- **Load Balancer:** $12/kuu (kui vaja)
- **Total:** $39-63/kuu

### **Alternatiivid:**
- **VPS (Hetzner):** $5-15/kuu
- **AWS EC2:** $10-20/kuu
- **Google Cloud:** $10-20/kuu

## **11. Järgmised sammud**

1. **✅ Loo Digital Ocean'i konto**
2. **✅ Loo Droplet**
3. **✅ Seadista server**
4. **✅ Juuruta rakendus**
5. **✅ Seadista domeen ja SSL**
6. **✅ Testi funktsionaalsust**
7. **✅ Seadista backup**
8. **✅ Seadista monitoring**
9. **✅ Optimeeri jõudlust**
10. **✅ Seadista CI/CD**

---

**Kas soovid, et aitaksin sul mõnda konkreetset sammu läbi teha?**
