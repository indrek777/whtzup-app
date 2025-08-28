# HTTPS Setup for WhtzUp Backend

## Overview
This document describes how to set up and use HTTPS for the WhtzUp backend server.

## Features
- ✅ HTTP server on port 4000
- ✅ HTTPS server on port 4001
- ✅ Self-signed SSL certificates for development
- ✅ Docker support with SSL certificate mounting
- ✅ CORS configuration for both HTTP and HTTPS
- ✅ Socket.IO support for both protocols

## Quick Start

### 1. Development Environment

#### Start with HTTPS support:
```bash
./start-https.sh
```

#### Or manually:
```bash
# Set environment variables
export SSL_KEY_PATH=./ssl/server.key
export SSL_CERT_PATH=./ssl/server.crt
export HTTPS_PORT=4001

# Start the server
cd backend && npm start
```

### 2. Docker Environment

#### Development:
```bash
docker-compose up
```

#### Production:
```bash
docker-compose -f docker-compose.prod.yml up
```

## SSL Certificates

### Development (Self-signed)
- **Location**: `./ssl/`
- **Files**: `server.key`, `server.crt`
- **Auto-generated**: Yes, when running `start-https.sh`

### Production
- **Location**: Set via environment variables
- **Files**: `SSL_KEY_PATH`, `SSL_CERT_PATH`, `SSL_CA_PATH`
- **Source**: Your SSL certificate provider (Let's Encrypt, etc.)

## Environment Variables

```bash
# Required for HTTPS
SSL_KEY_PATH=./ssl/server.key
SSL_CERT_PATH=./ssl/server.crt
HTTPS_PORT=4001

# Optional
SSL_CA_PATH=./ssl/ca.crt
```

## Testing

### 1. Test HTTPS connectivity:
```bash
node test-https.js
```

### 2. Manual testing:
```bash
# Test HTTP
curl http://localhost:4000/health

# Test HTTPS (ignore self-signed certificate)
curl -k https://localhost:4001/health

# Test API endpoints
curl -k https://localhost:4001/api/health
```

### 3. Browser testing:
- HTTP: http://localhost:4000
- HTTPS: https://localhost:4001 (accept self-signed certificate)

## Frontend Integration

### Update API configuration:
```typescript
// Use the new API config
import { getApiBaseUrl } from './src/config/api';

const API_BASE_URL = getApiBaseUrl(true); // Use HTTPS
```

### Environment-specific URLs:
```typescript
// Development
const devApiUrl = 'https://localhost:4001/api';

// Production
const prodApiUrl = 'https://165.22.90.180:4001/api';
```

## CORS Configuration

The server is configured to accept requests from:
- Development: `http://localhost:3000`, `https://localhost:4001`
- Production: `https://olympio.ee`, `https://olympio.ee:4001`

## Troubleshooting

### SSL Certificate Issues
1. **Certificate not found**: Run `./start-https.sh` to generate certificates
2. **Permission denied**: Check file permissions on SSL files
3. **Invalid certificate**: Regenerate certificates with `openssl`

### Port Issues
1. **Port 4001 in use**: Change `HTTPS_PORT` environment variable
2. **Firewall blocking**: Allow port 4001 in firewall settings

### Docker Issues
1. **Certificate mounting**: Ensure SSL files are mounted correctly
2. **Volume permissions**: Check Docker volume permissions

## Security Notes

### Development
- Self-signed certificates are acceptable for development
- Browsers will show security warnings (expected)
- Use `-k` flag with curl to ignore certificate validation

### Production
- Use proper SSL certificates from a trusted CA
- Configure proper CORS origins
- Enable rate limiting
- Use environment variables for sensitive data

## API Endpoints

All API endpoints are available on both HTTP and HTTPS:

- **Health Check**: `/health`, `/api/health`
- **Events**: `/api/events`
- **Authentication**: `/api/auth/*`
- **Subscriptions**: `/api/subscription/*`
- **Ratings**: `/api/ratings/*`
- **Sync**: `/api/sync/*`

## Socket.IO

Real-time features work on both protocols:
- **HTTP**: `http://localhost:4000`
- **HTTPS**: `https://localhost:4001`

## Migration Guide

### From HTTP-only to HTTPS:

1. **Backend**: Already configured, just start with HTTPS
2. **Frontend**: Update API URLs to use HTTPS
3. **Testing**: Update test scripts to use HTTPS endpoints
4. **Documentation**: Update any hardcoded HTTP URLs

### Example frontend changes:
```typescript
// Before
const API_BASE_URL = 'http://localhost:4000/api';

// After
import { getApiBaseUrl } from './config/api';
const API_BASE_URL = getApiBaseUrl(true); // HTTPS
```
