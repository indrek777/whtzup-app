# 🐳 Docker Installation Manual for WhtzUp Event Discovery App

This guide will help you deploy the WhtzUp Event Discovery App using Docker and Docker Compose.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (to clone the repository)

### Installing Docker

#### Windows
1. Download Docker Desktop from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop
3. Ensure WSL 2 is enabled (Docker Desktop will guide you through this)

#### macOS
1. Download Docker Desktop from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Install and start Docker Desktop

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd whtzup-app
```

### 2. Prepare Data Directory
```bash
# Create data directory for persistent storage
mkdir -p data
mkdir -p backups

# Ensure events file exists
cp public/events-user.json data/events-user.json
```

### 3. Build and Run with Docker Compose
```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f whtzup-app
```

### 4. Access the Application
- **Main App**: http://localhost:7777
- **API Endpoint**: http://localhost:7777/api/events

## 🔧 Configuration Options

### Environment Variables

You can customize the application by setting environment variables in the `docker-compose.yml` file:

```yaml
environment:
  - NODE_ENV=production
  - PORT=7777
  - NOMINATIM_URL=http://nominatim:8080  # If using local Nominatim
```

### Port Configuration

To change the port, modify the `docker-compose.yml` file:

```yaml
ports:
  - "8080:7777"  # Change 8080 to your desired port
```

### Data Persistence

The application uses Docker volumes to persist data:

- **Events Data**: `./data:/app/data`
- **Events File**: `./public/events-user.json:/app/public/events-user.json`
- **Backups**: `./backups:/app/backups`

## 🗺️ Optional: Local Nominatim Geocoding Service

If you want to run your own Nominatim geocoding service (recommended for production):

### 1. Start with Geocoding Service
```bash
# Start both app and Nominatim
docker-compose --profile geocoding up -d

# Or start Nominatim separately
docker-compose --profile geocoding up -d nominatim
```

### 2. Configure App for Local Nominatim
Update the geocoding configuration in your app to use:
```
http://localhost:7070
```

### 3. Nominatim Initial Setup
The first time you run Nominatim, it will download and import Estonia's OpenStreetMap data (this can take several hours):

```bash
# Monitor Nominatim setup progress
docker-compose logs -f nominatim
```

## 📊 Monitoring and Management

### View Application Status
```bash
# Check container status
docker-compose ps

# View application logs
docker-compose logs whtzup-app

# View real-time logs
docker-compose logs -f whtzup-app
```

### Health Checks
The application includes health checks that monitor:
- API endpoint availability
- Container responsiveness

### Backup Management
```bash
# Create backup of current data
docker exec whtzup-event-app node backup-data.js

# Restore from backup
cp backups/YYYY-MM-DDTHH-MM-SS/events-user.json public/events-user.json
docker-compose restart whtzup-app
```

## 🔄 Common Operations

### Update the Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Update Events Data
```bash
# Copy new events file
cp new-events.json public/events-user.json

# Restart container to pick up changes
docker-compose restart whtzup-app
```

### Scale the Application
```bash
# Scale to multiple instances (if needed)
docker-compose up -d --scale whtzup-app=3
```

### Stop the Application
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ This will delete data)
docker-compose down -v
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 7777
netstat -tulpn | grep 7777

# Change port in docker-compose.yml
ports:
  - "8080:7777"
```

#### 2. Permission Denied
```bash
# Fix file permissions
sudo chown -R $USER:$USER data/
sudo chown -R $USER:$USER backups/
```

#### 3. Container Won't Start
```bash
# Check container logs
docker-compose logs whtzup-app

# Check container status
docker-compose ps

# Restart container
docker-compose restart whtzup-app
```

#### 4. Build Failures
```bash
# Clean build cache
docker-compose build --no-cache

# Remove old images
docker system prune -a
```

### Debug Mode
```bash
# Run in debug mode with shell access
docker-compose run --rm whtzup-app sh

# Check file permissions inside container
ls -la /app/
```

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS**: Set up a reverse proxy (nginx/traefik) with SSL certificates
2. **Environment Variables**: Store sensitive data in environment variables
3. **Network Security**: Use Docker networks to isolate services
4. **Regular Updates**: Keep Docker images and dependencies updated

### Example Production Setup
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  whtzup-app:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=7777
    networks:
      - internal
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - whtzup-app
    networks:
      - internal
      - external

networks:
  internal:
    internal: true
  external:
    driver: bridge
```

## 📈 Performance Optimization

### Resource Limits
```yaml
services:
  whtzup-app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Caching
- Use Docker layer caching for faster builds
- Consider using a CDN for static assets
- Implement Redis for session storage if needed

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nominatim Docker Image](https://github.com/mediagis/nominatim-docker)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs whtzup-app`
3. Verify Docker installation: `docker --version && docker-compose --version`
4. Check system resources: `docker system df`

---

**Happy Event Discovery! 🎉**

