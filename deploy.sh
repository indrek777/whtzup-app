#!/bin/bash

# WhtzUp Events - Digital Ocean Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
echo "🚀 Deploying to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found. Please run this script from the project root."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create it with the required environment variables."
    exit 1
fi

print_status "Starting deployment process..."

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Pull latest changes
print_status "Pulling latest changes from Git..."
git pull origin main

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are healthy
print_status "Checking service health..."

# Check API server
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    print_status "✅ API server is healthy"
else
    print_error "❌ API server health check failed"
    docker-compose -f docker-compose.prod.yml logs api-server
    exit 1
fi

# Check PostgreSQL
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U whtzup_user -d whtzup_events > /dev/null 2>&1; then
    print_status "✅ PostgreSQL is healthy"
else
    print_error "❌ PostgreSQL health check failed"
    docker-compose -f docker-compose.prod.yml logs postgres
    exit 1
fi

# Check Redis
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_status "✅ Redis is healthy"
else
    print_error "❌ Redis health check failed"
    docker-compose -f docker-compose.prod.yml logs redis
    exit 1
fi

# Run database migrations if needed
print_status "Checking database migrations..."
if [ -f "database/init.sql" ]; then
    print_status "Running database initialization..."
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U whtzup_user -d whtzup_events -f /docker-entrypoint-initdb.d/init.sql || true
fi

# Show service status
print_status "Service status:"
docker-compose -f docker-compose.prod.yml ps

# Show recent logs
print_status "Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

print_status "🎉 Deployment completed successfully!"
print_status "API server is running on: http://localhost:4000"
print_status "Health check: http://localhost:4000/api/health"

# Optional: Send notification
if command -v curl > /dev/null 2>&1; then
    print_status "Sending deployment notification..."
    # You can add webhook notifications here
    # curl -X POST "YOUR_WEBHOOK_URL" -d "Deployment to $ENVIRONMENT completed successfully"
fi

print_status "Deployment script finished."
