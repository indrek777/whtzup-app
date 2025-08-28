# Puuduvad API endpointid backendis

## 🔍 Analüüs: Frontend kasutab järgmisi API endpointid

### ✅ Olemas backendis:
- `GET /api/health` ✅
- `POST /api/auth/signin` ✅
- `POST /api/auth/signup` ✅
- `GET /api/users` ✅
- `GET /api/users/:id` ✅
- `GET /api/subscription/status` ✅
- `GET /api/events` ✅
- `GET /api/events/stats` ✅
- `GET /api/events/category/:category` ✅
- `GET /api/events/search/:query` ✅
- `GET /api/events/:id` ✅
- `POST /api/events` ✅
- `PUT /api/events/:id` ✅
- `DELETE /api/events/:id` ✅
- `GET /api/users/:userId/events` ✅

### ❌ Puuduvad backendis:

#### 🔐 Autentimise endpointid:
- `POST /api/auth/refresh` - Tokeni uuendamine
- `POST /api/auth/change-password` - Parooli muutmine
- `POST /api/auth/forgot-password` - Parooli taastamine
- `POST /api/auth/request-reset-code` - Parooli taastamise koodi pärimine
- `POST /api/auth/verify-reset-code` - Parooli taastamise koodi kontrollimine
- `POST /api/auth/reset-password-with-code` - Parooli taastamine koodiga

#### 👥 Kasutaja endpointid:
- `GET /api/user-group` - Kasutaja grupi info

#### 💳 Tellimuse endpointid:
- `POST /api/subscription/upgrade` - Tellimuse uuendamine
- `POST /api/subscription/cancel` - Tellimuse tühistamine
- `POST /api/subscription/reactivate` - Tellimuse taastamine
- `GET /api/subscription/usage` - Tellimuse kasutuse info
- `GET /api/subscription/billing` - Arve ajalugu
- `POST /api/subscription/change-plan` - Tellimuse plaani muutmine
- `GET /api/subscription/features` - Tellimuse funktsioonid

#### ⭐ Hinnangute endpointid:
- `POST /api/ratings` - Hinnangu lisamine
- `GET /api/ratings/event/:eventId` - Ürituse hinnangud
- `GET /api/ratings/user/:userId` - Kasutaja hinnangud
- `PUT /api/ratings/:ratingId` - Hinnangu muutmine
- `DELETE /api/ratings/:ratingId` - Hinnangu kustutamine
- `GET /api/ratings/top-rated` - Populaarsemad hinnangud

#### 🎫 Ürituse registreerimise endpointid:
- `POST /api/events/:eventId/register` - Üritusele registreerimine
- `DELETE /api/events/:eventId/register` - Registreerimise tühistamine
- `GET /api/events/:eventId/registrations` - Registreerimiste nimekiri

#### 🔄 Sünkroniseerimise endpointid:
- `POST /api/update-events` - Ürituste uuendamine

## 📊 Kokkuvõte:
- **Olemas:** 15 endpointi
- **Puuduvad:** 20 endpointi
- **Kokku:** 35 endpointi

## 🚀 Järgmised sammud:
1. Lisada puuduvad autentimise endpointid
2. Lisada tellimuse endpointid
3. Lisada hinnangute endpointid
4. Lisada ürituse registreerimise endpointid
5. Lisada sünkroniseerimise endpointid
