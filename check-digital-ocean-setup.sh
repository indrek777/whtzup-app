#!/bin/bash

# WhtzUp Events - Digital Ocean Setup Checker
# This script checks the current setup and identifies any issues

set -e

echo "🔍 WhtzUp Events - Digital Ocean Setup Checker"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service status
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        print_status "$service is running"
        return 0
    else
        print_error "$service is not running"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    if netstat -tuln | grep -q ":$port "; then
        print_status "$service is listening on port $port"
        return 0
    else
        print_error "$service is not listening on port $port"
        return 1
    fi
}

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        print_status "$description exists: $file"
        return 0
    else
        print_error "$description missing: $file"
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dir=$1
    local description=$2
    if [ -d "$dir" ]; then
        print_status "$description exists: $dir"
        return 0
    else
        print_error "$description missing: $dir"
        return 1
    fi
}

# Initialize counters
total_checks=0
passed_checks=0
failed_checks=0

# Step 1: Check system information
print_step "Step 1: System Information"
echo "=============================="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "CPU: $(nproc) cores"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $4}') available"

# Step 2: Check essential packages
print_step "Step 2: Essential Packages"
echo "=============================="

packages=("curl" "wget" "git" "unzip" "htop" "ufw")
for package in "${packages[@]}"; do
    total_checks=$((total_checks + 1))
    if command_exists $package; then
        print_status "$package is installed"
        passed_checks=$((passed_checks + 1))
    else
        print_error "$package is not installed"
        failed_checks=$((failed_checks + 1))
    fi
done

# Step 3: Check Node.js
print_step "Step 3: Node.js"
echo "================"
total_checks=$((total_checks + 1))
if command_exists node; then
    version=$(node --version)
    print_status "Node.js is installed: $version"
    passed_checks=$((passed_checks + 1))
else
    print_error "Node.js is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 4: Check Docker
print_step "Step 4: Docker"
echo "================"
total_checks=$((total_checks + 1))
if command_exists docker; then
    version=$(docker --version)
    print_status "Docker is installed: $version"
    passed_checks=$((passed_checks + 1))
    
    # Check Docker service
    total_checks=$((total_checks + 1))
    if check_service docker; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
else
    print_error "Docker is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 5: Check Docker Compose
print_step "Step 5: Docker Compose"
echo "========================="
total_checks=$((total_checks + 1))
if command_exists docker-compose; then
    version=$(docker-compose --version)
    print_status "Docker Compose is installed: $version"
    passed_checks=$((passed_checks + 1))
else
    print_error "Docker Compose is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 6: Check PostgreSQL
print_step "Step 6: PostgreSQL"
echo "===================="
total_checks=$((total_checks + 1))
if command_exists psql; then
    print_status "PostgreSQL is installed"
    passed_checks=$((passed_checks + 1))
    
    # Check PostgreSQL service
    total_checks=$((total_checks + 1))
    if check_service postgresql; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check PostgreSQL port
    total_checks=$((total_checks + 1))
    if check_port 5432 "PostgreSQL"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
else
    print_error "PostgreSQL is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 7: Check Redis
print_step "Step 7: Redis"
echo "==============="
total_checks=$((total_checks + 1))
if command_exists redis-cli; then
    print_status "Redis is installed"
    passed_checks=$((passed_checks + 1))
    
    # Check Redis service
    total_checks=$((total_checks + 1))
    if check_service redis-server; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check Redis port
    total_checks=$((total_checks + 1))
    if check_port 6379 "Redis"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
else
    print_error "Redis is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 8: Check Nginx
print_step "Step 8: Nginx"
echo "=============="
total_checks=$((total_checks + 1))
if command_exists nginx; then
    print_status "Nginx is installed"
    passed_checks=$((passed_checks + 1))
    
    # Check Nginx service
    total_checks=$((total_checks + 1))
    if check_service nginx; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
    
    # Check Nginx ports
    total_checks=$((total_checks + 1))
    if check_port 80 "Nginx HTTP"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
    
    total_checks=$((total_checks + 1))
    if check_port 443 "Nginx HTTPS"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
else
    print_error "Nginx is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 9: Check Certbot
print_step "Step 9: Certbot"
echo "================="
total_checks=$((total_checks + 1))
if command_exists certbot; then
    print_status "Certbot is installed"
    passed_checks=$((passed_checks + 1))
else
    print_error "Certbot is not installed"
    failed_checks=$((failed_checks + 1))
fi

# Step 10: Check Firewall
print_step "Step 10: Firewall"
echo "==================="
total_checks=$((total_checks + 1))
if ufw status | grep -q "Status: active"; then
    print_status "UFW firewall is active"
    passed_checks=$((passed_checks + 1))
    
    # Check specific ports
    ports=(22 80 443 4000 5432 6379)
    for port in "${ports[@]}"; do
        total_checks=$((total_checks + 1))
        if ufw status | grep -q "$port"; then
            print_status "Port $port is allowed"
            passed_checks=$((passed_checks + 1))
        else
            print_warning "Port $port might not be allowed"
            failed_checks=$((failed_checks + 1))
        fi
    done
else
    print_error "UFW firewall is not active"
    failed_checks=$((failed_checks + 1))
fi

# Step 11: Check Application Directory
print_step "Step 11: Application Directory"
echo "================================="
total_checks=$((total_checks + 1))
if check_directory "/opt/whtzup-app" "Application directory"; then
    passed_checks=$((passed_checks + 1))
    
    # Check important files
    files=(
        "/opt/whtzup-app/docker-compose.prod.yml:docker-compose.prod.yml"
        "/opt/whtzup-app/.env:.env file"
        "/opt/whtzup-app/backend/server.js:backend server.js"
    )
    
    for file_info in "${files[@]}"; do
        IFS=':' read -r file_path description <<< "$file_info"
        total_checks=$((total_checks + 1))
        if check_file "$file_path" "$description"; then
            passed_checks=$((passed_checks + 1))
        else
            failed_checks=$((failed_checks + 1))
        fi
    done
else
    failed_checks=$((failed_checks + 1))
fi

# Step 12: Check Docker Containers
print_step "Step 12: Docker Containers"
echo "============================="
if [ -d "/opt/whtzup-app" ]; then
    cd /opt/whtzup-app
    
    if [ -f "docker-compose.prod.yml" ]; then
        total_checks=$((total_checks + 1))
        if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
            print_status "Docker containers are running"
            passed_checks=$((passed_checks + 1))
            
            # Check specific containers
            containers=("whtzup-api" "whtzup-postgres" "whtzup-redis")
            for container in "${containers[@]}"; do
                total_checks=$((total_checks + 1))
                if docker ps | grep -q "$container"; then
                    print_status "Container $container is running"
                    passed_checks=$((passed_checks + 1))
                else
                    print_error "Container $container is not running"
                    failed_checks=$((failed_checks + 1))
                fi
            done
        else
            print_error "Docker containers are not running"
            failed_checks=$((failed_checks + 1))
        fi
    else
        print_error "docker-compose.prod.yml not found"
        failed_checks=$((failed_checks + 1))
    fi
else
    print_error "Application directory not found"
    failed_checks=$((failed_checks + 1))
fi

# Step 13: Check API Health
print_step "Step 13: API Health"
echo "====================="
total_checks=$((total_checks + 1))
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    print_status "API is responding"
    passed_checks=$((passed_checks + 1))
else
    print_error "API is not responding"
    failed_checks=$((failed_checks + 1))
fi

# Step 14: Check SSL Certificate
print_step "Step 14: SSL Certificate"
echo "==========================="
if [ -f "/etc/nginx/sites-enabled/whtzup-api" ]; then
    server_name=$(grep "server_name" /etc/nginx/sites-enabled/whtzup-api | awk '{print $2}' | sed 's/;//')
    if [ ! -z "$server_name" ]; then
        total_checks=$((total_checks + 1))
        if certbot certificates | grep -q "$server_name"; then
            print_status "SSL certificate exists for $server_name"
            passed_checks=$((passed_checks + 1))
        else
            print_error "SSL certificate not found for $server_name"
            failed_checks=$((failed_checks + 1))
        fi
    else
        print_warning "Could not determine server name from Nginx config"
    fi
else
    print_error "Nginx configuration not found"
    failed_checks=$((failed_checks + 1))
fi

# Step 15: Check Management Scripts
print_step "Step 15: Management Scripts"
echo "=============================="
scripts=("monitor.sh" "restart.sh" "update.sh" "backup.sh")
for script in "${scripts[@]}"; do
    total_checks=$((total_checks + 1))
    if check_file "/opt/whtzup-app/$script" "Management script $script"; then
        passed_checks=$((passed_checks + 1))
    else
        failed_checks=$((failed_checks + 1))
    fi
done

# Summary
echo ""
echo "📊 Setup Check Summary"
echo "====================="
echo "Total checks: $total_checks"
echo "Passed: $passed_checks"
echo "Failed: $failed_checks"
echo "Success rate: $((passed_checks * 100 / total_checks))%"

if [ $failed_checks -eq 0 ]; then
    echo ""
    print_status "🎉 All checks passed! Your Digital Ocean setup is complete and working correctly."
else
    echo ""
    print_warning "⚠️  Some checks failed. Please review the errors above and fix any issues."
    echo ""
    print_step "Common fixes:"
    echo "1. Run the setup script again: ./digital-ocean-setup.sh"
    echo "2. Check service status: systemctl status <service-name>"
    echo "3. Check logs: journalctl -u <service-name>"
    echo "4. Restart services: systemctl restart <service-name>"
fi

echo ""
print_step "Next steps:"
echo "1. Test your API: curl https://yourdomain.com/api/health"
echo "2. Monitor your application: /opt/whtzup-app/monitor.sh"
echo "3. Set up backups: /opt/whtzup-app/backup.sh"
echo "4. Update your application: /opt/whtzup-app/update.sh"
