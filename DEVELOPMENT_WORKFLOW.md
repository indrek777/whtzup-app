# 🚀 Development Workflow - Digital Ocean + GitHub

## **📋 Ülevaade**

See juhend kirjeldab, kuidas arendada WhtzUp Events rakendust kasutades:
- **GitHub** - koodi hoidmine ja versioonikontroll
- **Digital Ocean** - tootmiskeskkond
- **GitHub Actions** - automaatne juurutamine

## **🔄 Arendamise töövoog**

### **1. Kohalik arendamine**
```bash
# Klooni repository
git clone https://github.com/indrek777/whtzup-app.git
cd whtzup-app

# Installi sõltuvused
npm install

# Käivita arendusserver
npm run dev
# või
npx expo start --ios
```

### **2. Muudatuste tegemine**
```bash
# Tee muudatused koodis
# Testi kohalikult

# Lisa muudatused Git'i
git add .
git commit -m "Add new feature: event registration"

# Lükka GitHub'i
git push origin main
```

### **3. Automaatne juurutamine**
- GitHub Actions automaatselt juurutab muudatused Digital Ocean'i
- Rakendus on saadaval `http://165.22.90.180:4000`

## **🔧 Serveri haldamine**

### **SSH ühendus serveriga**
```bash
ssh -i server_key root@165.22.90.180
```

### **Rakenduse kataloog**
```bash
cd /opt/whtzup-app
```

### **Kasulikud käsud**
```bash
# Vaata logid
docker logs whtzup-api -f

# Taaskäivita rakendus
docker-compose -f docker-compose.prod.yml restart

# Uuenda koodi
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Vaata teenuste staatus
docker-compose -f docker-compose.prod.yml ps

# Vaata süsteemi ressursid
htop
df -h
free -h
```

## **🌐 Domeeni seadistamine**

### **1. Osta domeen (nt. whtzup.com)**
### **2. Seadista DNS**
```
A    api.whtzup.com    165.22.90.180
A    www.whtzup.com    165.22.90.180
```

### **3. Uuenda .env faili**
```bash
# Serveris /opt/whtzup-app/.env
FRONTEND_URL=https://whtzup.com
```

### **4. Uuenda Nginx konfiguratsioon**
```bash
# /etc/nginx/sites-available/whtzup-api
server_name api.whtzup.com;
```

### **5. Installi SSL sertifikaat**
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d api.whtzup.com
```

## **🔐 Turvalisus**

### **Olulised paroolid ja võtmed**
- **JWT_SECRET** - tugev juhuslik string
- **POSTGRES_PASSWORD** - turvaline parool
- **SSH võti** - serveri juurdepääs

### **Firewall seaded**
```bash
ufw status
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 4000
```

## **📊 Monitoring**

### **Logid**
```bash
# Rakenduse logid
docker logs whtzup-api -f

# Nginx logid
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Süsteemi logid
journalctl -f
```

### **Ressursid**
```bash
# CPU ja mälu
htop

# Kettaruum
df -h

# Võrguühendused
netstat -tulpn
```

## **🔄 Backup ja taastamine**

### **Andmebaasi backup**
```bash
# Automaatne backup (iga päev kell 2:00)
/opt/backup-db.sh

# Käsitsi backup
docker exec whtzup-postgres pg_dump -U whtzup_user whtzup_events > backup.sql
```

### **Koodi backup**
```bash
# Kood on GitHub'is, aga võid teha kohaliku koopia
cd /opt
tar -czf whtzup-app-backup-$(date +%Y%m%d).tar.gz whtzup-app/
```

## **🚨 Probleemide lahendamine**

### **Rakendus ei käivitu**
```bash
# Vaata logid
docker logs whtzup-api

# Kontrolli teenuste staatus
docker-compose -f docker-compose.prod.yml ps

# Taaskäivita
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### **Andmebaasi probleemid**
```bash
# Kontrolli PostgreSQL
sudo -u postgres psql -c "SELECT version();"

# Kontrolli ühendust
docker exec whtzup-postgres psql -U whtzup_user -d whtzup_events -c "SELECT 1;"
```

### **Võrgu probleemid**
```bash
# Kontrolli pordid
netstat -tulpn | grep :4000

# Kontrolli firewall
ufw status

# Testi ühendust
curl http://localhost:4000/api/health
```

## **📈 Jõudluse optimeerimine**

### **Docker optimeerimine**
```bash
# Puhasta vanad pildid
docker system prune -a

# Vaata kasutatud ruumi
docker system df
```

### **PostgreSQL optimeerimine**
```bash
# Analüüsi päringud
sudo -u postgres psql -d whtzup_events -c "SELECT * FROM pg_stat_activity;"
```

## **🎯 Järgmised sammud**

1. **Seadista domeen ja SSL**
2. **Lisa monitoring (nt. UptimeRobot)**
3. **Seadista automaatne backup**
4. **Lisa logi analüüs**
5. **Optimeeri jõudlust**
6. **Seadista CI/CD pipeline**

## **📞 Abi**

Kui sul on probleeme:
1. Vaata logid
2. Kontrolli GitHub Actions
3. Kontrolli serveri ressursid
4. Kontrolli võrguühendust

**Happy coding! 🚀**
