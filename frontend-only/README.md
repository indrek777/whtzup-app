# WhtzUp Frontend App

See kaust sisaldab ainult frontend rakenduse faile (React Native/Expo).

## 📁 Struktuur

```
frontend-only/
├── src/               # React Native kood
│   ├── components/    # UI komponendid
│   ├── utils/         # Utiliidi funktsioonid
│   ├── context/       # React Context
│   └── data/          # Andmed ja tüübid
├── assets/            # Pildid, ikoonid ja muud ressursid
├── app.json          # Expo konfiguratsioon
├── package.json      # NPM sõltuvused
├── expo.config.js    # Expo CLI konfiguratsioon
└── babel.config.js   # Babel konfiguratsioon
```

## 🚀 Käivitamine

### Kohalik arendus:
```bash
# 1. Installi sõltuvused
npm install

# 2. Käivita iOS simulaatoris
npm run ios

# 3. Käivita Android emulaatoris
npm run android

# 4. Käivita web brauseris
npm run web
```

### Expo CLI:
```bash
# Käivita Expo development server
npx expo start

# Käivita iOS simulaatoris
npx expo start --ios

# Käivita Android emulaatoris
npx expo start --android
```

## 🔧 Konfiguratsioon

### API URL seaded:
Muuda API URL-d failides:
- `src/utils/syncService.ts`
- `src/utils/userService.ts`
- `src/utils/eventService.ts`
- `src/utils/eventRegistrationService.ts`
- `src/utils/ratingService.ts`

```typescript
// Kohalik arendus
const API_BASE_URL = 'http://localhost:4000/api'

// Production
const API_BASE_URL = 'http://165.22.90.180:4000/api'
```

## 📱 Funktsionaalsus

- Sündmuste vaatamine kaardil
- Sündmuste filtreerimine kategooria ja asukoha järgi
- Kasutaja autentimine ja registreerimine
- Sündmuste loomine ja redigeerimine
- Real-time sünkroniseerimine
- Offline tugi

## 🎨 UI Komponendid

- Kaart (react-native-maps)
- Sündmuste nimekiri
- Filtreerimise komponendid
- Autentimise vormid
- Sündmuse redigeerija

## 🔗 Sõltuvused

### Peamised paketid:
- `expo` - Expo framework
- `react-native-maps` - Kaardi komponent
- `@react-navigation` - Navigatsioon
- `socket.io-client` - Real-time ühendused
- `axios` - HTTP päringud

## 📊 Arendus

### Struktuur:
- **Components**: Taaskasutatavad UI komponendid
- **Utils**: API teenused ja utiliidi funktsioonid
- **Context**: Global state management
- **Data**: Tüübid ja andmestruktuurid

### Stiilid:
- React Native StyleSheet
- Responsive disain
- Dark/Light mode tugi

