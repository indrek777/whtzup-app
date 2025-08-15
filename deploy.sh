#!/bin/bash

# WhtzUp Event Discovery App - Docker Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

echo "🐳 WhtzUp Event Discovery App - Docker Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check Docker service
check_docker_service() {
    print_status "Checking Docker service..."
    
    if ! docker info &> /dev/null; then
        print_error "Docker service is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker service is running"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p data
    mkdir -p backups
    
    # Copy events file to data directory if it doesn't exist
    if [ ! -f "data/events-user.json" ] && [ -f "public/events-user.json" ]; then
        cp public/events-user.json data/events-user.json
        print_success "Copied events file to data directory"
    fi
    
    print_success "Directories created"
}

# Build and start containers
deploy_app() {
    print_status "Building and starting the application..."
    
    # Stop existing containers if running
    if docker-compose ps | grep -q "whtzup-event-app"; then
        print_warning "Stopping existing containers..."
        docker-compose down
    fi
    
    # Build and start
    docker-compose up -d --build
    
    print_success "Application deployed successfully!"
}

# Check application health
check_health() {
    print_status "Checking application health..."
    
    # Wait a bit for the application to start
    sleep 10
    
    # Check if container is running
    if docker-compose ps | grep -q "Up"; then
        print_success "Container is running"
    else
        print_error "Container failed to start"
        docker-compose logs whtzup-app
        exit 1
    fi
    
    # Check API endpoint
    if curl -s http://localhost:7777/api/events > /dev/null; then
        print_success "API endpoint is responding"
    else
        print_warning "API endpoint not responding yet (this is normal during startup)"
    fi
}

# Show deployment info
show_info() {
    echo ""
    echo "🎉 Deployment Complete!"
    echo "======================"
    echo ""
    echo "📱 Application URLs:"
    echo "   • Main App: http://localhost:7777"
    echo "   • API: http://localhost:7777/api/events"
    echo ""
    echo "📊 Useful Commands:"
    echo "   • View logs: docker-compose logs -f whtzup-app"
    echo "   • Stop app: docker-compose down"
    echo "   • Restart app: docker-compose restart whtzup-app"
    echo "   • Update app: docker-compose up -d --build"
    echo ""
    echo "📁 Data Locations:"
    echo "   • Events data: ./data/"
    echo "   • Backups: ./backups/"
    echo "   • Events file: ./public/events-user.json"
    echo ""
}

# Main deployment function
main() {
    echo ""
    check_docker
    check_docker_service
    create_directories
    deploy_app
    check_health
    show_info
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        print_status "Stopping application..."
        docker-compose down
        print_success "Application stopped"
        ;;
    "restart")
        print_status "Restarting application..."
        docker-compose restart
        print_success "Application restarted"
        ;;
    "logs")
        docker-compose logs -f whtzup-app
        ;;
    "update")
        print_status "Updating application..."
        git pull
        docker-compose down
        docker-compose up -d --build
        print_success "Application updated"
        ;;
    "clean")
        print_warning "This will remove all containers and volumes!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker system prune -f
            print_success "Cleaned up Docker resources"
        else
            print_status "Cleanup cancelled"
        fi
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the application (default)"
        echo "  stop     - Stop the application"
        echo "  restart  - Restart the application"
        echo "  logs     - View application logs"
        echo "  update   - Update and redeploy the application"
        echo "  clean    - Clean up Docker resources"
        echo "  help     - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac

