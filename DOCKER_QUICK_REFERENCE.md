# 🐳 Docker Quick Reference Guide

## 🚀 Quick Commands

### Basic Deployment
```bash
# Deploy the application
./deploy.sh                    # Linux/macOS
deploy.bat                     # Windows

# Or manually
docker-compose up -d --build
```

### Application Management
```bash
# View logs
docker-compose logs -f event-app

# Stop application
docker-compose down

# Restart application
docker-compose restart event-app

# Update application
docker-compose up -d --build
```

### Data Management
```bash
# Create backup
docker exec event-app node backup-data.js

# View container status
docker-compose ps

# Access container shell
docker-compose exec event-app sh
```

## 📁 File Structure

```
event-app/
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Development setup
├── docker-compose.prod.yml    # Production setup with nginx
├── nginx.conf                 # Nginx configuration
├── deploy.sh                  # Linux/macOS deployment script
├── deploy.bat                 # Windows deployment script
├── .dockerignore              # Files to exclude from build
├── data/                      # Persistent data directory
├── backups/                   # Backup files
└── public/
    └── events-user.json       # Events data file
```

## 🔧 Configuration Options

### Environment Variables
```yaml
# docker-compose.yml
environment:
  - NODE_ENV=production
  - PORT=5555
  - NOMINATIM_URL=http://nominatim:8080
```

### Port Configuration
```yaml
# Change external port
ports:
  - "8080:5555"  # External:Internal
```

### Volume Mounts
```yaml
volumes:
  - ./data:/app/data                    # Events data
  - ./public/events-user.json:/app/public/events-user.json
  - ./backups:/app/backups              # Backup files
```

## 🗺️ Optional Services

### Local Nominatim (Geocoding)
```bash
# Start with geocoding service
docker-compose --profile geocoding up -d

# Monitor setup progress
docker-compose logs -f nominatim
```

### Production Setup (with nginx)
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# With SSL certificates
mkdir ssl
# Add cert.pem and key.pem to ssl/ directory
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs event-app

# Check container status
docker-compose ps

# Rebuild without cache
docker-compose build --no-cache
```

#### Port Already in Use
```bash
# Check what's using the port
netstat -tulpn | grep 5555

# Change port in docker-compose.yml
ports:
  - "8080:5555"
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER data/
sudo chown -R $USER:$USER backups/
```

### Debug Commands
```bash
# Run container in interactive mode
docker-compose run --rm event-app sh

# Check file permissions inside container
docker-compose exec whtzup-app ls -la /app/

# View container resources
docker stats event-app
```

## 📊 Monitoring

### Health Checks
```bash
# Check application health
curl http://localhost:5555/api/events

# Check container health
docker-compose ps
```

### Resource Usage
```bash
# View container stats
docker stats

# View disk usage
docker system df
```

## 🔒 Security

### Production Checklist
- [ ] Use HTTPS with valid SSL certificates
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Backup strategy in place

### SSL Setup
```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Use Let's Encrypt for production
# See: https://letsencrypt.org/
```

## 📈 Performance

### Resource Limits
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

### Scaling
```bash
# Scale to multiple instances
docker-compose up -d --scale event-app=3
```

## 🔄 Backup & Restore

### Backup
```bash
# Create backup
docker exec whtzup-event-app node backup-data.js

# Manual backup
cp public/events-user.json backups/events-backup-$(date +%Y%m%d).json
```

### Restore
```bash
# Restore from backup
cp backups/YYYY-MM-DDTHH-MM-SS/events-user.json public/events-user.json
docker-compose restart event-app
```

## 📚 Useful Commands

### Container Management
```bash
# List containers
docker ps

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Clean up everything
docker system prune -a
```

### Network Management
```bash
# List networks
docker network ls

# Inspect network
docker network inspect event-app_event-network
```

### Volume Management
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect event-app_data
```

---

**Need help?** Check the full documentation in `DOCKER_INSTALLATION.md`

