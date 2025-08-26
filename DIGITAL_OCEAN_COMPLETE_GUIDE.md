# 🚀 Digital Ocean Backend - Täielik Seadistuse Juhend

## 📋 Ülevaade

See juhend aitab teil WhtzUp Events rakenduse backend'i täielikult seadistada Digital Ocean'i keskkonnas. Juhend sisaldab kõiki vajalikke samme, alates serveri loomisest kuni rakenduse käivitamiseni.

---

## 🎯 Eesmärgid

- ✅ Seadistada turvaline ja skaleeritav backend
- ✅ Konfigureerida SSL sertifikaadid
- ✅ Seadistada automaatsed backup'id
- ✅ Konfigureerida monitoring ja logimine
- ✅ Optimeerida jõudlust

---

## 💰 Kulud

### **Põhilised kulud (kuus):**
- **Droplet (2GB RAM):** $12
- **Database Cluster (valikuline):** $15
- **Load Balancer (valikuline):** $12
- **Total:** $12-39/kuu

### **Alternatiivid:**
- **VPS (Hetzner):** $5-15/kuu
- **AWS EC2:** $10-20/kuu
- **Google Cloud:** $10-20/kuu

---

## 🛠️ Vajalikud Tööriistad

### **Kohalikud tööriistad:**
- SSH klient (Terminal, PuTTY, vms)
- Git
- Teksti redaktor (VS Code, nano, vim)

### **Kontod:**
- Digital Ocean konto
- GitHub konto
- Domeeni registreerija (valikuline)

---

## 📋 Sammud

### **1. Digital Ocean'i Droplet Loomine**

#### **1.1 Konto Loomine**
1. Minge https://digitalocean.com
2. Kliki "Sign Up"
3. Täitke registreerimisvorm
4. Lisa krediitkaart

#### **1.2 Droplet Konfiguratsioon**
```
OS: Ubuntu 22.04 LTS
Size: Basic Plan - Regular with SSD
- 2GB RAM
- 1 vCPU
- 50GB SSD
Datacenter: Frankfurt (EU) või Amsterdam (EU)
Authentication: SSH Key (soovituslik)
```

#### **1.3 SSH Võtme Seadistamine**
```bash
# Kohalikus masinas
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
cat ~/.ssh/id_rsa.pub
# Kopeerige avalik võti Digital Ocean'i
```

### **2. Serveri Seadistamine**

#### **2.1 SSH Ühendus**
```bash
ssh root@your-server-ip
```

#### **2.2 Automaatne Seadistamine**
```bash
# Kopeerige setup skript serverile
scp digital-ocean-setup.sh root@your-server-ip:/root/

# Käivitage setup
ssh root@your-server-ip
chmod +x digital-ocean-setup.sh
./digital-ocean-setup.sh
```

#### **2.3 Käsitsi Seadistamine (kui automaatne ei tööta)**

**Süsteemi uuendamine:**
```bash
apt update && apt upgrade -y
```

**Põhiliste pakettide installimine:**
```bash
apt install -y curl wget git unzip software-properties-common \
               apt-transport-https ca-certificates gnupg lsb-release \
               htop iotop nethogs ufw fail2ban
```

**Node.js 18.x installimine:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

**Docker installimine:**
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

**PostgreSQL installimine:**
```bash
apt install -y postgresql postgresql-contrib

# Andmebaasi seadistamine
sudo -u postgres psql -c "CREATE USER whtzup_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE whtzup_events OWNER whtzup_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;"
```

**Redis installimine:**
```bash
apt install -y redis-server

# Redis konfiguratsioon
sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
systemctl enable redis-server
systemctl restart redis-server
```

**Nginx installimine:**
```bash
apt install -y nginx

# Nginx konfiguratsioon
cat > /etc/nginx/sites-available/whtzup-api << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
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

ln -sf /etc/nginx/sites-available/whtzup-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx
```

**Certbot installimine:**
```bash
apt install -y certbot python3-certbot-nginx

# SSL sertifikaadi saamine
certbot --nginx -d your-domain.com --non-interactive --agree-tos --email admin@your-domain.com

# Automaatne uuendamine
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

**Firewall seadistamine:**
```bash
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000
ufw allow 5432
ufw allow 6379
```

### **3. Rakenduse Juurutamine**

#### **3.1 Koodi Kloonimine**
```bash
mkdir -p /opt/whtzup-app
cd /opt/whtzup-app
git clone https://github.com/your-username/whtzup-app.git .
```

#### **3.2 Keskkonna Seadistamine**
```bash
# .env faili loomine
cat > .env << 'EOF'
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret_change_this_in_production
DATABASE_URL=postgresql://whtzup_user:your_secure_password@localhost:5432/whtzup_events
REDIS_URL=redis://localhost:6379
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
POSTGRES_PASSWORD=your_secure_password_change_this
EOF
```

#### **3.3 Rakenduse Käivitamine**
```bash
# Logide kataloogi loomine
mkdir -p logs

# Õiguste seadistamine
chown -R root:root /opt/whtzup-app
chmod -R 755 /opt/whtzup-app

# Docker konteinerite käivitamine
docker-compose -f docker-compose.prod.yml up -d --build

# Teenuste kontroll
sleep 30
curl -f http://localhost:4000/api/health
```

### **4. Monitoring ja Haldamine**

#### **4.1 Monitoring Skriptid**
```bash
# Monitoring skript
cat > /opt/whtzup-app/monitor.sh << 'EOF'
#!/bin/bash
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
```

#### **4.2 Haldamise Skriptid**
```bash
# Taaskäivitamise skript
cat > /opt/whtzup-app/restart.sh << 'EOF'
#!/bin/bash
cd /opt/whtzup-app
docker-compose -f docker-compose.prod.yml restart
echo "Application restarted"
EOF

# Uuendamise skript
cat > /opt/whtzup-app/update.sh << 'EOF'
#!/bin/bash
cd /opt/whtzup-app
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
echo "Application updated"
EOF

# Backup skript
cat > /opt/whtzup-app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Andmebaasi backup
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml exec -T postgres pg_dump -U whtzup_user whtzup_events > $BACKUP_DIR/db_backup_$DATE.sql

# Rakenduse failide backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/whtzup-app

# Vanade backup'ide puhastamine (7 päeva)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/whtzup-app/*.sh
```

#### **4.3 Logide Rotatsioon**
```bash
cat > /etc/logrotate.d/whtzup-app << 'EOF'
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
```

### **5. Turvalisuse Optimeerimine**

#### **5.1 Fail2ban Seadistamine**
```bash
# SSH kaitse
cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

systemctl enable fail2ban
systemctl restart fail2ban
```

#### **5.2 Süsteemi Optimeerimine**
```bash
# Swappiness vähendamine
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# Failide deskriptorite limiit
echo '* soft nofile 65536' >> /etc/security/limits.conf
echo '* hard nofile 65536' >> /etc/security/limits.conf
```

### **6. Domeeni ja SSL Seadistamine**

#### **6.1 DNS Seaded**
```
A Record: api.yourdomain.com → Server IP
A Record: yourdomain.com → Server IP (kui vaja)
```

#### **6.2 SSL Sertifikaadi Kontroll**
```bash
# Sertifikaadi kontroll
certbot certificates

# Sertifikaadi uuendamine
certbot renew --dry-run
```

### **7. Testimine ja Kontroll**

#### **7.1 Seadistuse Kontroll**
```bash
# Kontrolli skripti käivitamine
./check-digital-ocean-setup.sh
```

#### **7.2 API Testimine**
```bash
# Kohalik test
curl http://localhost:4000/api/health

# Välisest test
curl https://api.yourdomain.com/api/health
```

#### **7.3 Jõudluse Testimine**
```bash
# CPU ja mälu kasutus
htop

# Disk kasutus
df -h

# Võrgu kasutus
nethogs
```

---

## 🔧 Haldamise Käsud

### **Põhilised Käsud:**
```bash
# Rakenduse staatus
/opt/whtzup-app/monitor.sh

# Rakenduse taaskäivitamine
/opt/whtzup-app/restart.sh

# Rakenduse uuendamine
/opt/whtzup-app/update.sh

# Backup tegemine
/opt/whtzup-app/backup.sh

# Logide vaatamine
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml logs -f

# Teenuste staatus
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml ps
```

### **Probleemide Lahendamine:**
```bash
# Teenuse taaskäivitamine
systemctl restart nginx
systemctl restart postgresql
systemctl restart redis-server

# Docker konteinerite taaskäivitamine
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml restart

# Logide kontroll
journalctl -u nginx
journalctl -u postgresql
journalctl -u redis-server
```

---

## 📊 Monitoring ja Analytics

### **Süsteemi Monitoring:**
- **CPU kasutus:** `htop`
- **Mälu kasutus:** `free -h`
- **Disk kasutus:** `df -h`
- **Võrgu kasutus:** `nethogs`

### **Rakenduse Monitoring:**
- **API vastused:** `curl https://api.yourdomain.com/api/health`
- **Docker konteinerid:** `docker ps`
- **Logid:** `docker-compose logs -f`

### **Andmebaasi Monitoring:**
```bash
# PostgreSQL staatus
sudo -u postgres psql -c "SELECT version();"

# Andmebaasi suurus
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('whtzup_events'));"
```

---

## 🔒 Turvalisuse Kontrollid

### **Regulaarsed Kontrollid:**
1. **Süsteemi uuendused:** `apt update && apt upgrade`
2. **SSL sertifikaadid:** `certbot renew --dry-run`
3. **Backup'id:** Kontrolli backup'ide olemasolu
4. **Logid:** Kontrolli vigu ja hoiatusi
5. **Turvalisus:** `fail2ban-client status`

### **Turvalisuse Soovitused:**
- Kasutage tugevaid paroole
- Päevitage regulaarselt
- Kasutage SSH võtmeid
- Seadistage firewall
- Kontrollige logid regulaarselt

---

## 🚀 Skaleerimine

### **Kui Rakendus Kasvab:**
1. **Suurendage Droplet'i:** 4GB RAM, 2 vCPU
2. **Lisa Load Balancer:** $12/kuu
3. **Kasutage Database Cluster:** $15/kuu
4. **Lisa CDN:** Kiirendage staatilisi faile
5. **Optimeerige andmebaasi:** Indeksid ja päringud

### **Auto-scaling (tulevikus):**
- Kubernetes cluster
- Microservices arhitektuur
- Cloud-native lahendused

---

## 📞 Abi ja Tugi

### **Kasulikud Lingid:**
- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### **Probleemide Lahendamine:**
1. Kontrollige logid: `journalctl -u <service>`
2. Testige ühendust: `curl -v <url>`
3. Kontrollige teenused: `systemctl status <service>`
4. Vaadake Docker logid: `docker logs <container>`

---

## ✅ Kontrollnimekiri

### **Seadistuse Kontroll:**
- [ ] Digital Ocean konto loodud
- [ ] Droplet loodud ja konfigureeritud
- [ ] SSH ühendus töötab
- [ ] Kõik paketid installitud
- [ ] Docker ja Docker Compose töötavad
- [ ] PostgreSQL ja Redis töötavad
- [ ] Nginx konfigureeritud
- [ ] SSL sertifikaat installitud
- [ ] Firewall seadistatud
- [ ] Rakendus juurutatud
- [ ] API vastab päringutele
- [ ] Monitoring skriptid töötavad
- [ ] Backup skriptid töötavad
- [ ] Domeen seadistatud
- [ ] Logid töötavad

### **Turvalisuse Kontroll:**
- [ ] Tugevad paroolid seadistatud
- [ ] SSH võtmed kasutusel
- [ ] Firewall aktiivne
- [ ] Fail2ban seadistatud
- [ ] SSL sertifikaat kehtiv
- [ ] Süsteem uuendatud
- [ ] Backup strateegia olemas

---

## 🎉 Kokkuvõte

Olete edukalt seadistanud WhtzUp Events backend'i Digital Ocean'i keskkonnas! 

**Järgmised sammud:**
1. Testige rakendust põhjalikult
2. Seadistage automaatsed backup'id
3. Monitorige jõudlust
4. Optimeerige vastavalt vajadusele
5. Valmistuge skaleerimiseks

**Kasulikud käsud:**
```bash
# Kiire kontroll
/opt/whtzup-app/monitor.sh

# API test
curl https://api.yourdomain.com/api/health

# Logid
docker-compose -f /opt/whtzup-app/docker-compose.prod.yml logs -f
```

**Õnnestumist teie projektiga! 🚀**
