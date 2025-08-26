# WhtzUp Backend Server

See kaust sisaldab ainult backend serveri faile, mis on vajalikud Digital Ocean serveris.

## 📁 Struktuur

```
backend-only/
├── backend/           # Backend API server (Node.js/Express)
├── database/          # Andmebaasi skriptid ja migratsioonid
├── docker-compose.prod.yml  # Production Docker konfiguratsioon
└── .env              # Keskkonna seaded
```

## 🚀 Käivitamine

### Digital Ocean Serveris:
```bash
# 1. Klooni või kopeeri failid serverisse
cd /opt/whtzup-app

# 2. Seadista keskkond
cp .env.example .env
# Redigeeri .env faili oma väärtustega

# 3. Käivita Docker
docker-compose -f docker-compose.prod.yml up -d

# 4. Või käivita otse Node.js
cd backend
npm install
npm start
```

### Systemd Teenus:
```bash
# Teenuse staatus
systemctl status whtzup-backend

# Teenuse taaskäivitamine
systemctl restart whtzup-backend
```

## 🔧 Konfiguratsioon

### Vajalikud keskkonna muutujad (.env):
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/database
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your-secret-key
```

## 📊 API Endpoints

- `GET /api/health` - Tervise kontroll
- `GET /api/events` - Sündmuste nimekiri
- `POST /api/events` - Uue sündmuse loomine
- `PUT /api/events/:id` - Sündmuse uuendamine
- `DELETE /api/events/:id` - Sündmuse kustutamine

## 🔒 Turvalisus

- JWT autentimine
- CORS konfiguratsioon
- Rate limiting
- Input valideerimine

## 📈 Monitoring

- Health check endpoint
- Logimine Winston'iga
- Systemd teenuse monitoring
- Cron job kontroll iga 5 minuti järel
