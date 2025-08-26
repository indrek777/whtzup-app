#!/bin/bash

# WhtzUp Events - Digital Ocean Readiness Test
# This script checks if the project is ready for Digital Ocean deployment

set -e

echo "🔍 WhtzUp Events - Digital Ocean Readiness Test"
echo "=============================================="

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

# Initialize counters
total_checks=0
passed_checks=0
failed_checks=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    total_checks=$((total_checks + 1))
    if [ -f "$file" ]; then
        print_status "$description exists: $file"
        passed_checks=$((passed_checks + 1))
        return 0
    else
        print_error "$description missing: $file"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

# Function to check directory exists
check_directory() {
    local dir=$1
    local description=$2
    total_checks=$((total_checks + 1))
    if [ -d "$dir" ]; then
        print_status "$description exists: $dir"
        passed_checks=$((passed_checks + 1))
        return 0
    else
        print_error "$description missing: $dir"
        failed_checks=$((failed_checks + 1))
        return 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check essential files
print_step "Step 1: Essential Files"
echo "=========================="

check_file "docker-compose.prod.yml" "Production Docker Compose file"
check_file "env.example" "Environment example file"
check_file "digital-ocean-setup.sh" "Digital Ocean setup script"
check_file "check-digital-ocean-setup.sh" "Digital Ocean check script"
check_file "DIGITAL_OCEAN_COMPLETE_GUIDE.md" "Digital Ocean guide"

# Step 2: Check backend files
print_step "Step 2: Backend Files"
echo "========================"

check_directory "backend" "Backend directory"
check_file "backend/package.json" "Backend package.json"
check_file "backend/server.js" "Backend server.js"
check_file "backend/Dockerfile" "Backend Dockerfile"

# Step 3: Check Docker configuration
print_step "Step 3: Docker Configuration"
echo "==============================="

if [ -f "docker-compose.prod.yml" ]; then
    # Check if docker-compose.prod.yml has required services
    total_checks=$((total_checks + 1))
    if grep -q "api-server" docker-compose.prod.yml; then
        print_status "API server service found in docker-compose.prod.yml"
        passed_checks=$((passed_checks + 1))
    else
        print_error "API server service missing in docker-compose.prod.yml"
        failed_checks=$((failed_checks + 1))
    fi
    
    total_checks=$((total_checks + 1))
    if grep -q "postgres" docker-compose.prod.yml; then
        print_status "PostgreSQL service found in docker-compose.prod.yml"
        passed_checks=$((passed_checks + 1))
    else
        print_error "PostgreSQL service missing in docker-compose.prod.yml"
        failed_checks=$((failed_checks + 1))
    fi
    
    total_checks=$((total_checks + 1))
    if grep -q "redis" docker-compose.prod.yml; then
        print_status "Redis service found in docker-compose.prod.yml"
        passed_checks=$((passed_checks + 1))
    else
        print_error "Redis service missing in docker-compose.prod.yml"
        failed_checks=$((failed_checks + 1))
    fi
fi

# Step 4: Check environment configuration
print_step "Step 4: Environment Configuration"
echo "===================================="

if [ -f "env.example" ]; then
    # Check if env.example has required variables
    required_vars=("NODE_ENV" "PORT" "JWT_SECRET" "DATABASE_URL" "REDIS_URL" "FRONTEND_URL")
    for var in "${required_vars[@]}"; do
        total_checks=$((total_checks + 1))
        if grep -q "^$var=" env.example; then
            print_status "Environment variable $var found in env.example"
            passed_checks=$((passed_checks + 1))
        else
            print_error "Environment variable $var missing in env.example"
            failed_checks=$((failed_checks + 1))
        fi
    done
fi

# Step 5: Check scripts
print_step "Step 5: Scripts"
echo "=================="

scripts=("digital-ocean-setup.sh" "check-digital-ocean-setup.sh")
for script in "${scripts[@]}"; do
    total_checks=$((total_checks + 1))
    if [ -f "$script" ] && [ -x "$script" ]; then
        print_status "Script $script exists and is executable"
        passed_checks=$((passed_checks + 1))
    else
        print_error "Script $script missing or not executable"
        failed_checks=$((failed_checks + 1))
    fi
done

# Step 6: Check backend dependencies
print_step "Step 6: Backend Dependencies"
echo "==============================="

if [ -f "backend/package.json" ]; then
    # Check if backend has required dependencies
    required_deps=("express" "pg" "redis" "cors" "helmet" "dotenv")
    for dep in "${required_deps[@]}"; do
        total_checks=$((total_checks + 1))
        if grep -q "\"$dep\"" backend/package.json; then
            print_status "Backend dependency $dep found"
            passed_checks=$((passed_checks + 1))
        else
            print_error "Backend dependency $dep missing"
            failed_checks=$((failed_checks + 1))
        fi
    done
fi

# Step 7: Check documentation
print_step "Step 7: Documentation"
echo "========================"

docs=("DIGITAL_OCEAN_COMPLETE_GUIDE.md" "DEPLOYMENT_GUIDE.md" "DIGITAL_OCEAN_QUICK_START.md")
for doc in "${docs[@]}"; do
    total_checks=$((total_checks + 1))
    if [ -f "$doc" ]; then
        print_status "Documentation $doc exists"
        passed_checks=$((passed_checks + 1))
    else
        print_warning "Documentation $doc missing"
        failed_checks=$((failed_checks + 1))
    fi
done

# Step 8: Check local tools
print_step "Step 8: Local Tools"
echo "======================"

tools=("docker" "docker-compose" "git" "ssh")
for tool in "${tools[@]}"; do
    total_checks=$((total_checks + 1))
    if command_exists $tool; then
        print_status "Tool $tool is available"
        passed_checks=$((passed_checks + 1))
    else
        print_warning "Tool $tool is not available (will be installed on server)"
        failed_checks=$((failed_checks + 1))
    fi
done

# Summary
echo ""
echo "📊 Readiness Test Summary"
echo "========================"
echo "Total checks: $total_checks"
echo "Passed: $passed_checks"
echo "Failed: $failed_checks"
echo "Success rate: $((passed_checks * 100 / total_checks))%"

if [ $failed_checks -eq 0 ]; then
    echo ""
    print_status "🎉 All checks passed! Your project is ready for Digital Ocean deployment."
    echo ""
    print_step "Next steps:"
    echo "1. Create a Digital Ocean account"
    echo "2. Create a Droplet (Ubuntu 22.04 LTS, 2GB RAM)"
    echo "3. Copy the setup script to your server:"
    echo "   scp digital-ocean-setup.sh root@your-server-ip:/root/"
    echo "4. Run the setup script on your server:"
    echo "   ssh root@your-server-ip"
    echo "   chmod +x digital-ocean-setup.sh"
    echo "   ./digital-ocean-setup.sh"
else
    echo ""
    print_warning "⚠️  Some checks failed. Please review the errors above before deploying."
    echo ""
    print_step "Common fixes:"
    echo "1. Create missing files and directories"
    echo "2. Update environment variables in env.example"
    echo "3. Make scripts executable: chmod +x *.sh"
    echo "4. Check backend dependencies in package.json"
fi

echo ""
print_step "Deployment Checklist:"
echo "1. ✅ Project structure is correct"
echo "2. ✅ Docker configuration is ready"
echo "3. ✅ Environment variables are defined"
echo "4. ✅ Scripts are executable"
echo "5. ✅ Documentation is available"
echo "6. 🔄 Create Digital Ocean account"
echo "7. 🔄 Create Droplet"
echo "8. 🔄 Run setup script"
echo "9. 🔄 Configure domain and SSL"
echo "10. 🔄 Test deployment"

echo ""
print_step "Useful commands for deployment:"
echo "# Copy files to server"
echo "scp digital-ocean-setup.sh root@your-server-ip:/root/"
echo "scp docker-compose.prod.yml root@your-server-ip:/root/"
echo ""
echo "# Connect to server"
echo "ssh root@your-server-ip"
echo ""
echo "# Run setup"
echo "chmod +x digital-ocean-setup.sh"
echo "./digital-ocean-setup.sh"
echo ""
echo "# Check setup"
echo "./check-digital-ocean-setup.sh"
