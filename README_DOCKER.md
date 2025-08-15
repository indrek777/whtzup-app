# 🐳 WhtzUp Event Discovery App - Docker Deployment

This repository contains a complete Docker setup for the WhtzUp Event Discovery App, making it easy to deploy and manage the application in any environment.

## 📋 What's Included

### 🏗️ Docker Configuration
- **`Dockerfile`** - Multi-stage build for optimized production image
- **`docker-compose.yml`** - Development setup with volume mounts
- **`docker-compose.prod.yml`** - Production setup with nginx reverse proxy
- **`.dockerignore`** - Optimized build context

### 🚀 Deployment Scripts
- **`deploy.sh`** - Linux/macOS deployment script
- **`deploy.bat`** - Windows deployment script
- **`nginx.conf`** - Production nginx configuration

### 📚 Documentation
- **`DOCKER_INSTALLATION.md`** - Complete installation guide
- **`DOCKER_QUICK_REFERENCE.md`** - Quick command reference
- **`README_DOCKER.md`** - This file

## 🎯 Quick Start

### Prerequisites
- Docker (version 20.10+)
- Docker Compose (version 2.0+)

### 1. Clone and Deploy
```bash
# Clone the repository
git clone <your-repo-url>
cd whtzup-app

# Deploy using the script
./deploy.sh                    # Linux/macOS
deploy.bat                     # Windows

# Or manually
docker-compose up -d --build
```

### 2. Access the Application
- **Main App**: http://localhost:7777
- **API**: http://localhost:7777/api/events

## 🏢 Production Deployment

### With Nginx Reverse Proxy
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# With SSL certificates
mkdir ssl
# Add your SSL certificates to ssl/ directory
docker-compose -f docker-compose.prod.yml up -d
```

### With Local Nominatim (Geocoding)
```bash
# Start with geocoding service
docker-compose --profile geocoding up -d

# Monitor setup (can take several hours initially)
docker-compose logs -f nominatim
```

## 📊 Features

### ✅ What's Included
- **Multi-stage Docker build** for optimized images
- **Volume mounts** for data persistence
- **Health checks** for monitoring
- **Nginx reverse proxy** with SSL support
- **Rate limiting** and security headers
- **Gzip compression** for better performance
- **Optional Nominatim** geocoding service
- **Backup and restore** functionality
- **Automated deployment scripts**

### 🔧 Configuration Options
- **Environment variables** for customization
- **Port mapping** flexibility
- **Resource limits** for performance control
- **Network isolation** for security
- **SSL/TLS support** for HTTPS

## 📁 Data Persistence

The application uses Docker volumes to persist data:

```
./data/                    # Events data directory
./public/events-user.json  # Main events file
./backups/                 # Backup files
```

## 🛠️ Management Commands

### Application Control
```bash
# View logs
docker-compose logs -f whtzup-app

# Stop application
docker-compose down

# Restart application
docker-compose restart whtzup-app

# Update application
docker-compose up -d --build
```

### Data Management
```bash
# Create backup
docker exec whtzup-event-app node backup-data.js

# View container status
docker-compose ps

# Access container shell
docker-compose exec whtzup-app sh
```

## 🔒 Security Features

### Production Security
- **HTTPS enforcement** with SSL/TLS
- **Security headers** (HSTS, XSS protection, etc.)
- **Rate limiting** to prevent abuse
- **Network isolation** between services
- **Non-root user** in containers
- **Resource limits** to prevent DoS

### SSL Setup
```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Use Let's Encrypt for production
# See: https://letsencrypt.org/
```

## 📈 Performance Optimization

### Built-in Optimizations
- **Multi-stage builds** for smaller images
- **Gzip compression** for static assets
- **Caching headers** for better performance
- **Resource limits** to prevent resource exhaustion
- **Health checks** for automatic recovery

### Scaling
```bash
# Scale to multiple instances
docker-compose up -d --scale whtzup-app=3
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Create backup with timestamp
docker exec whtzup-event-app node backup-data.js
```

### Manual Backup
```bash
# Backup events file
cp public/events-user.json backups/events-backup-$(date +%Y%m%d).json
```

### Restore
```bash
# Restore from backup
cp backups/YYYY-MM-DDTHH-MM-SS/events-user.json public/events-user.json
docker-compose restart whtzup-app
```

## 🛠️ Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs whtzup-app

# Rebuild without cache
docker-compose build --no-cache
```

#### Port Conflicts
```bash
# Change port in docker-compose.yml
ports:
  - "8080:7777"  # External:Internal
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER data/
sudo chown -R $USER:$USER backups/
```

## 📚 Documentation

- **[Complete Installation Guide](DOCKER_INSTALLATION.md)** - Step-by-step setup instructions
- **[Quick Reference](DOCKER_QUICK_REFERENCE.md)** - Common commands and operations
- **[Troubleshooting Guide](DOCKER_INSTALLATION.md#troubleshooting)** - Solutions to common issues

## 🆘 Support

### Getting Help
1. Check the troubleshooting section in `DOCKER_INSTALLATION.md`
2. Review application logs: `docker-compose logs whtzup-app`
3. Verify Docker installation: `docker --version && docker-compose --version`
4. Check system resources: `docker system df`

### Useful Resources
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/) - Free SSL certificates

## 🎉 Success!

Once deployed, your WhtzUp Event Discovery App will be:
- ✅ **Accessible** at http://localhost:7777
- ✅ **Persistent** with data stored in volumes
- ✅ **Secure** with production-ready configuration
- ✅ **Scalable** with Docker Compose
- ✅ **Monitored** with health checks
- ✅ **Backed up** with automated backup system

---

**Happy Event Discovery! 🎉**

