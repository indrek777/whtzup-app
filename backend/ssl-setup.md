# SSL Certificate Setup for Synology NAS

## Option 1: Synology Reverse Proxy (Recommended)

### Step 1: Enable Synology Reverse Proxy
1. Open **Synology DSM** → **Control Panel** → **Application Portal** → **Reverse Proxy**
2. Click **Create**
3. Configure the reverse proxy:
   - **Source**: Protocol: HTTPS, Hostname: olympio.ee, Port: 443
   - **Destination**: Protocol: HTTP, Hostname: localhost, Port: 4000
   - **Enable SSL**: ✓ Check this box
   - **Certificate**: Select your SSL certificate

### Step 2: Get SSL Certificate
1. **Control Panel** → **Security** → **Certificate**
2. Click **Add** → **Add a new certificate**
3. Choose **Get a certificate from Let's Encrypt** (free)
4. Domain: `olympio.ee`
5. Email: your-email@example.com
6. Click **Apply**

### Step 3: Apply Certificate to Reverse Proxy
1. Go back to **Reverse Proxy**
2. Edit your rule
3. **SSL Certificate**: Select the certificate you just created
4. **Apply**

## Option 2: Direct SSL on Your Backend

### Step 1: Get SSL Certificates
1. **Control Panel** → **Security** → **Certificate**
2. Export your certificate:
   - **Private Key**: Save as `private.key`
   - **Certificate**: Save as `certificate.crt`
   - **CA Bundle**: Save as `ca_bundle.crt`

### Step 2: Place Certificates on Your Backend
1. Create a `ssl` folder in your backend directory
2. Copy the certificate files:
   ```
   backend/
   ├── ssl/
   │   ├── private.key
   │   ├── certificate.crt
   │   └── ca_bundle.crt
   ```

### Step 3: Update Environment Variables
Add to your `.env` file:
```env
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca_bundle.crt
HTTPS_PORT=4001
```

### Step 4: Test HTTPS
Your backend will now run on both:
- HTTP: `http://olympio.ee:4000`
- HTTPS: `https://olympio.ee:4001`

## Option 3: Self-Signed Certificate (Development Only)

### Generate Self-Signed Certificate
```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate
openssl req -new -x509 -key private.key -out certificate.crt -days 365 -subj "/C=EE/ST=Tallinn/L=Tallinn/O=YourCompany/CN=olympio.ee"
```

### Update Environment Variables
```env
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
HTTPS_PORT=4001
```

## Testing HTTPS

### Test with curl
```bash
# Test HTTPS endpoint
curl -k https://olympio.ee:4001/api/health

# Test with proper certificate
curl https://olympio.ee:4001/api/health
```

### Update Your App Configuration
Once HTTPS is working, update your app's API configuration:

```javascript
// In your frontend services
const API_BASE_URL = 'https://olympio.ee:4001/api';
```

## Troubleshooting

### Certificate Issues
- **Self-signed certificate**: Use `-k` flag with curl or add to trusted certificates
- **Let's Encrypt**: Make sure port 80 is accessible for verification
- **Domain verification**: Ensure DNS points to your Synology NAS

### Port Issues
- **Port 443**: Usually requires root/admin access
- **Port 4001**: Alternative HTTPS port for your backend
- **Firewall**: Ensure ports are open in Synology firewall

### Reverse Proxy Issues
- **502 Bad Gateway**: Check if your backend is running on port 4000
- **SSL errors**: Verify certificate is properly configured
- **CORS issues**: Update CORS configuration in your backend
