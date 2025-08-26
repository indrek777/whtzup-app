# WhtzUp Project Structure

## 📁 **Puhastatud Projekt Struktuur**

Pärast puhastamist on meil nüüd selge ja optimeeritud struktuur:

### 🎯 **Vajalikud Failid (Jäetud)**

#### **Core Application:**
- ✅ `src/` - React Native frontend kood
- ✅ `backend/` - Node.js backend API
- ✅ `assets/` - Pildid ja ikoonid
- ✅ `database/` - Andmebaasi skriptid
- ✅ `data/` - Andmetüübid ja konfiguratsioon

#### **Configuration:**
- ✅ `package.json` - NPM sõltuvused
- ✅ `app.json` - Expo konfiguratsioon
- ✅ `expo.config.js` - Expo CLI seaded
- ✅ `babel.config.js` - Babel konfiguratsioon
- ✅ `tsconfig.json` - TypeScript konfiguratsioon
- ✅ `eas.json` - EAS Build konfiguratsioon

#### **Docker & Deployment:**
- ✅ `docker-compose.yml` - Development Docker
- ✅ `docker-compose.prod.yml` - Production Docker
- ✅ `.dockerignore` - Docker ignore failid
- ✅ `env.example` - Keskkonna seadete näide

#### **Development:**
- ✅ `App.tsx` - Peamine app fail
- ✅ `README.md` - Projekti dokumentatsioon
- ✅ `.gitignore` - Git ignore failid
- ✅ `.eslintrc.js` - ESLint konfiguratsioon

#### **Platform Specific:**
- ✅ `ios/` - iOS konfiguratsioon
- ✅ `app-store-assets/` - App Store ressursid
- ✅ `server_key` - SSH võti serveri jaoks

#### **Utilities:**
- ✅ `separate-repositories.sh` - Repository eraldamise skript
- ✅ `cleanup-project.sh` - Projekti puhastamise skript

### 🗑️ **Kustutatud Failid (Backup'is)**

#### **Test & Debug Files:**
- ❌ `test-*.js` - Test skriptid (50+ faili)
- ❌ `debug-*.js` - Debug skriptid
- ❌ `create-*.js` - Loomise skriptid
- ❌ `migrate-*.js` - Migratsiooni skriptid
- ❌ `check-*.js` - Kontrolli skriptid
- ❌ `analyze-*.js` - Analüüsi skriptid

#### **Documentation:**
- ❌ `*_SUMMARY.md` - Kokkuvõtted (20+ faili)
- ❌ `*_GUIDE.md` - Juhendid (10+ faili)
- ❌ `*_FIX.md` - Paranduste dokumentatsioon
- ❌ `*_SETUP.md` - Seadistamise juhendid
- ❌ `*_REVIEW.md` - Ülevaated

#### **Scripts:**
- ❌ `*.sh` - Shell skriptid (15+ faili)
- ❌ `*.bat` - Windows skriptid
- ❌ `quick-*.sh` - Kiirskriptid
- ❌ `auto-*.sh` - Automaatsed skriptid

#### **Logs & Data:**
- ❌ `*.log` - Log failid
- ❌ `*.out` - Väljundi failid
- ❌ `*.err` - Veateadete failid
- ❌ `*.txt` - Teksti failid
- ❌ `*.csv` - CSV failid

#### **Directories:**
- ❌ `backups/` - Varukoopiad
- ❌ `dist/` - Build failid
- ❌ `public/` - Avalikud failid
- ❌ `backend-example/` - Näidis backend

### 📊 **Suuruse Võrdlus**

#### **Enne puhastamist:**
- **Kokku:** ~500MB
- **Failide arv:** 200+ faili
- **Kaustade arv:** 20+ kausta

#### **Pärast puhastamist:**
- **Kokku:** ~150MB
- **Failide arv:** 50+ faili
- **Kaustade arv:** 10+ kausta
- **Kokkuhoiu:** 70% väiksem

### 🎯 **Optimeeritud Struktuur**

#### **Backend Server (Digital Ocean):**
```
backend/
├── backend/           # API server
├── database/          # Andmebaasi skriptid
├── docker-compose.prod.yml
└── .env
```

#### **Frontend Development:**
```
src/
├── components/        # UI komponendid
├── utils/            # Utiliidi funktsioonid
├── context/          # React Context
└── data/             # Andmetüübid
```

### 💡 **Kasu**

1. **Kiirem arendus** - Vähem segadust
2. **Lihtsam navigeerimine** - Selge struktuur
3. **Väiksem repository** - Kiirem kloonimine
4. **Paremaid praktikaid** - Eraldatud frontend/backend
5. **Lihtsam hooldus** - Ainult vajalikud failid

### 🔄 **Taastamine**

Kui vajad mõnda kustutatud faili:
```bash
# Taasta kõik failid
mv backup-20250826-183952/* .

# Või taasta ainult teatud failid
cp backup-20250826-183952/test-auth.js .
```
