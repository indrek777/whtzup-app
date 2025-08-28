# API endpointide prioriteedid

## 🚨 KÕRGE PRIORITEET (kriitilised funktsioonid)

### 1. 🔐 Autentimise endpointid
**Prioriteet:** KÕRGE - ilma nendeta ei tööta põhilised funktsioonid
- `POST /api/auth/refresh` - Tokeni uuendamine (kasutatakse automaatselt)
- `GET /api/user-group` - Kasutaja grupi info (kasutatakse pidevalt)

### 2. 💳 Tellimuse endpointid
**Prioriteet:** KÕRGE - ilma nendeta ei tööta tellimuse funktsioonid
- `GET /api/subscription/usage` - Tellimuse kasutuse info (kasutatakse UserProfile'is)
- `GET /api/subscription/billing` - Arve ajalugu (kasutatakse UserProfile'is)
- `GET /api/subscription/features` - Tellimuse funktsioonid (kasutatakse UserProfile'is)

### 3. ⭐ Hinnangute endpointid
**Prioriteet:** KÕRGE - ilma nendeta ei tööta hinnangute funktsioonid
- `POST /api/ratings` - Hinnangu lisamine
- `GET /api/ratings/event/:eventId` - Ürituse hinnangud
- `GET /api/ratings/user/:userId` - Kasutaja hinnangud
- `PUT /api/ratings/:ratingId` - Hinnangu muutmine
- `DELETE /api/ratings/:ratingId` - Hinnangu kustutamine
- `GET /api/ratings/top-rated` - Populaarsemad hinnangud

## 🟡 KESKMINE PRIORITEET (olulised funktsioonid)

### 4. 🔐 Parooli taastamise endpointid
**Prioriteet:** KESKMINE - kasulik kasutajatele
- `POST /api/auth/change-password` - Parooli muutmine
- `POST /api/auth/forgot-password` - Parooli taastamine
- `POST /api/auth/request-reset-code` - Parooli taastamise koodi pärimine
- `POST /api/auth/verify-reset-code` - Parooli taastamise koodi kontrollimine
- `POST /api/auth/reset-password-with-code` - Parooli taastamine koodiga

### 5. 💳 Tellimuse haldamise endpointid
**Prioriteet:** KESKMINE - kasulik tellimuse haldamiseks
- `POST /api/subscription/upgrade` - Tellimuse uuendamine
- `POST /api/subscription/cancel` - Tellimuse tühistamine
- `POST /api/subscription/reactivate` - Tellimuse taastamine
- `POST /api/subscription/change-plan` - Tellimuse plaani muutmine

## 🟢 MADAL PRIORITEET (lisafunktsioonid)

### 6. 🎫 Ürituse registreerimise endpointid
**Prioriteet:** MADAL - lisafunktsionaalsus
- `POST /api/events/:eventId/register` - Üritusele registreerimine
- `DELETE /api/events/:eventId/register` - Registreerimise tühistamine
- `GET /api/events/:eventId/registrations` - Registreerimiste nimekiri

### 7. 🔄 Sünkroniseerimise endpointid
**Prioriteet:** MADAL - lisafunktsionaalsus
- `POST /api/update-events` - Ürituste uuendamine

## 📊 Kokkuvõte prioriteetide järgi:

### 🚨 KÕRGE PRIORITEET (10 endpointi)
- Autentimise endpointid: 2
- Tellimuse endpointid: 3
- Hinnangute endpointid: 5

### 🟡 KESKMINE PRIORITEET (9 endpointi)
- Parooli taastamise endpointid: 5
- Tellimuse haldamise endpointid: 4

### 🟢 MADAL PRIORITEET (4 endpointi)
- Ürituse registreerimise endpointid: 3
- Sünkroniseerimise endpointid: 1

## 🚀 Soovitus järjekorrale:
1. **Esimesena:** Autentimise endpointid (refresh, user-group)
2. **Teisena:** Tellimuse endpointid (usage, billing, features)
3. **Kolmandana:** Hinnangute endpointid
4. **Neljandana:** Parooli taastamise endpointid
5. **Viimasena:** Ülejäänud endpointid
