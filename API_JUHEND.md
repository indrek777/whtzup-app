# 🎯 Ürituste API Juhend - Teise Rakenduse Jaoks

## 📋 Ülevaade

See juhend kirjeldab, kuidas ürituste infot uuendada backendis API kaudu teise rakenduse jaoks. API on saadaval aadressil `http://olympio.ee:4000/api`.

## 🔐 Autentimine

### 1. Kasutaja Registreerimine
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "kasutaja@example.com",
  "password": "salasõna123",
  "name": "Kasutaja Nimi"
}
```

**Vastus:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "kasutaja@example.com",
      "name": "Kasutaja Nimi"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### 2. Kasutaja Sisselogimine
```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "kasutaja@example.com",
  "password": "salasõna123"
}
```

**Vastus:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "kasutaja@example.com",
      "name": "Kasutaja Nimi"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### 3. Tokeni Värskendamine
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 📊 Ürituste API Endpointid

### 1. Kõikide Ürituste Vaatamine

#### Ilma Autentimiseta (Ainult Lugemine)
```bash
GET /api/events
```

**Parameetrid:**
- `limit` (valikuline): Maksimaalne ürituste arv (vaikimisi 15000)
- `offset` (valikuline): Alustamise indeks (vaikimisi 0)
- `category` (valikuline): Kategooria filtreerimine
- `venue` (valikuline): Koha filtreerimine
- `latitude` + `longitude` + `radius` (valikuline): Asukoha filtreerimine
- `from` + `to` (valikuline): Kuupäeva filtreerimine

**Näide:**
```bash
GET /api/events?limit=10&category=music&latitude=59.436962&longitude=24.753574&radius=50
```

**Vastus:**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "name": "Jazz Night",
      "description": "Live jazz performance",
      "category": "music",
      "venue": "Blue Note Club",
      "address": "123 Music Street, Tallinn",
      "latitude": 59.436962,
      "longitude": 24.753574,
      "startsAt": "2024-02-15T20:00:00.000Z",
      "createdBy": "Blue Note Club",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2. Ühe Ürituse Vaatamine
```bash
GET /api/events/{event-id}
```

### 3. Uue Ürituse Lisamine

**Nõutud autentimine ja õigused.**

```bash
POST /api/events
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "name": "Uus Üritus",
  "description": "Ürituse kirjeldus",
  "category": "music",
  "venue": "Kontserdimaja",
  "address": "Kultuuri 1, Tallinn",
  "latitude": 59.436962,
  "longitude": 24.753574,
  "startsAt": "2024-03-15T20:00:00.000Z",
  "createdBy": "Organisaator"
}
```

**Vastus:**
```json
{
  "success": true,
  "data": {
    "id": "new-event-uuid",
    "name": "Uus Üritus",
    "description": "Ürituse kirjeldus",
    "category": "music",
    "venue": "Kontserdimaja",
    "address": "Kultuuri 1, Tallinn",
    "latitude": 59.436962,
    "longitude": 24.753574,
    "startsAt": "2024-03-15T20:00:00.000Z",
    "createdBy": "Organisaator",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "message": "Event created successfully"
}
```

### 4. Ürituse Uuendamine

**Nõutud autentimine ja õigused (ainult ürituse omanik).**

```bash
PUT /api/events/{event-id}
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "name": "Uuendatud Ürituse Nimi",
  "description": "Uuendatud kirjeldus",
  "venue": "Uus Koht",
  "startsAt": "2024-03-20T20:00:00.000Z"
}
```

**Vastus:**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "name": "Uuendatud Ürituse Nimi",
    "description": "Uuendatud kirjeldus",
    "category": "music",
    "venue": "Uus Koht",
    "address": "Kultuuri 1, Tallinn",
    "latitude": 59.436962,
    "longitude": 24.753574,
    "startsAt": "2024-03-20T20:00:00.000Z",
    "createdBy": "Organisaator",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  },
  "message": "Event updated successfully"
}
```

### 5. Ürituse Kustutamine

**Nõutud autentimine ja õigused (ainult ürituse omanik).**

```bash
DELETE /api/events/{event-id}
Authorization: Bearer {access-token}
```

**Vastus:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

### 6. Kasutaja Ürituste Vaatamine
```bash
GET /api/events/my-events
Authorization: Bearer {access-token}
```

### 7. Ürituse Muutmise Õiguste Kontrollimine
```bash
GET /api/events/{event-id}/can-edit
Authorization: Bearer {access-token}
```

**Vastus:**
```json
{
  "success": true,
  "data": {
    "canEdit": true,
    "isOwner": true,
    "eventId": "event-uuid"
  }
}
```

## 📝 Andmete Struktuur

### Ürituse Objekt
```json
{
  "id": "string (UUID)",
  "name": "string (1-500 tähemärki)",
  "description": "string (kuni 2000 tähemärki)",
  "category": "string (valikud: music, food, sports, art, business, entertainment, education, technology, health, health & wellness, theater, cultural, nature & environment, family & kids, nightlife, charity & community, comedy, other)",
  "venue": "string (1-500 tähemärki)",
  "address": "string (kuni 1000 tähemärki)",
  "latitude": "number (-90 kuni 90)",
  "longitude": "number (-180 kuni 180)",
  "startsAt": "string (ISO 8601 kuupäev)",
  "createdBy": "string (kuni 255 tähemärki)",
  "createdAt": "string (ISO 8601 kuupäev)",
  "updatedAt": "string (ISO 8601 kuupäev)"
}
```

## 🔧 Näidiskoodid

### JavaScript/Node.js
```javascript
const axios = require('axios');

const API_BASE_URL = 'http://olympio.ee:4000/api';

// Autentimine
async function authenticate(email, password) {
  const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
    email,
    password
  });
  return response.data.data.tokens.accessToken;
}

// Ürituse lisamine
async function createEvent(token, eventData) {
  const response = await axios.post(`${API_BASE_URL}/events`, eventData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

// Ürituse uuendamine
async function updateEvent(token, eventId, updateData) {
  const response = await axios.put(`${API_BASE_URL}/events/${eventId}`, updateData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

// Kasutamine
async function main() {
  try {
    // Sisselogimine
    const token = await authenticate('kasutaja@example.com', 'salasõna123');
    
    // Uue ürituse lisamine
    const newEvent = await createEvent(token, {
      name: 'Test Üritus',
      description: 'Test kirjeldus',
      category: 'music',
      venue: 'Test Koht',
      address: 'Test Aadress 1, Tallinn',
      latitude: 59.436962,
      longitude: 24.753574,
      startsAt: '2024-03-15T20:00:00.000Z',
      createdBy: 'Test Organisaator'
    });
    
    console.log('Üritus loodud:', newEvent.data);
    
    // Ürituse uuendamine
    const updatedEvent = await updateEvent(token, newEvent.data.id, {
      name: 'Uuendatud Test Üritus',
      description: 'Uuendatud kirjeldus'
    });
    
    console.log('Üritus uuendatud:', updatedEvent.data);
    
  } catch (error) {
    console.error('Viga:', error.response?.data || error.message);
  }
}

main();
```

### Python
```python
import requests
import json

API_BASE_URL = 'http://olympio.ee:4000/api'

def authenticate(email, password):
    """Kasutaja autentimine"""
    response = requests.post(f'{API_BASE_URL}/auth/signin', json={
        'email': email,
        'password': password
    })
    return response.json()['data']['tokens']['accessToken']

def create_event(token, event_data):
    """Uue ürituse lisamine"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.post(f'{API_BASE_URL}/events', json=event_data, headers=headers)
    return response.json()

def update_event(token, event_id, update_data):
    """Ürituse uuendamine"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.put(f'{API_BASE_URL}/events/{event_id}', json=update_data, headers=headers)
    return response.json()

def main():
    try:
        # Sisselogimine
        token = authenticate('kasutaja@example.com', 'salasõna123')
        
        # Uue ürituse lisamine
        new_event = create_event(token, {
            'name': 'Python Test Üritus',
            'description': 'Python test kirjeldus',
            'category': 'technology',
            'venue': 'Python Koht',
            'address': 'Python Aadress 1, Tallinn',
            'latitude': 59.436962,
            'longitude': 24.753574,
            'startsAt': '2024-03-15T20:00:00.000Z',
            'createdBy': 'Python Organisaator'
        })
        
        print('Üritus loodud:', new_event['data'])
        
        # Ürituse uuendamine
        updated_event = update_event(token, new_event['data']['id'], {
            'name': 'Uuendatud Python Test Üritus',
            'description': 'Uuendatud Python kirjeldus'
        })
        
        print('Üritus uuendatud:', updated_event['data'])
        
    except Exception as error:
        print('Viga:', str(error))

if __name__ == '__main__':
    main()
```

### cURL Näited
```bash
# Sisselogimine
curl -X POST http://olympio.ee:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "kasutaja@example.com", "password": "salasõna123"}'

# Ürituse lisamine
curl -X POST http://olympio.ee:4000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cURL Test Üritus",
    "description": "cURL test kirjeldus",
    "category": "other",
    "venue": "cURL Koht",
    "address": "cURL Aadress 1, Tallinn",
    "latitude": 59.436962,
    "longitude": 24.753574,
    "startsAt": "2024-03-15T20:00:00.000Z",
    "createdBy": "cURL Organisaator"
  }'

# Ürituse uuendamine
curl -X PUT http://olympio.ee:4000/api/events/EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Uuendatud cURL Test Üritus",
    "description": "Uuendatud cURL kirjeldus"
  }'
```

## ⚠️ Veakoodid ja Vastused

### Levinumad Veakoodid
- `400` - Valideerimise viga
- `401` - Autentimise viga
- `403` - Õiguste puudumine
- `404` - Üritus ei leitud
- `409` - Üritus juba eksisteerib
- `500` - Serveri viga

### Vea Vastuse Näide
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "value": "",
      "msg": "Name is required and must be less than 500 characters",
      "path": "name",
      "location": "body"
    }
  ]
}
```

## 🔒 Turvalisus

1. **Autentimine:** Kõik muutmistoimingud nõuavad JWT tokeni
2. **Õigused:** Ürituse muutmine on lubatud ainult selle omanikule
3. **Valideerimine:** Kõik sisendandmed valideeritakse
4. **Rate Limiting:** API kutsed on piiratud
5. **CORS:** Ainult lubatud domeenid

## 📞 Tugi

Kui teil on küsimusi või probleeme API kasutamisega, võtke ühendust arendajaga.

---
*Viimati uuendatud: 2024-01-15*
