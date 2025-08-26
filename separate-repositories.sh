#!/bin/bash

# WhtzUp Repository Separation Script
# See skript aitab eraldada frontend ja backend faile eraldi kaustadesse

echo "🔧 WhtzUp Repository Separation Script"
echo "======================================"

# Loo kaustad
echo "📁 Creating directories..."
mkdir -p backend-only frontend-only

# Backend faile
echo "📦 Copying backend files..."
cp -r backend backend-only/
cp -r database backend-only/
cp docker-compose.prod.yml backend-only/
cp env.example backend-only/.env
cp backend/package.json backend-only/package.json

# Frontend faile
echo "📱 Copying frontend files..."
cp -r src frontend-only/
cp -r assets frontend-only/
cp app.json frontend-only/
cp package.json frontend-only/
cp expo.config.js frontend-only/
cp babel.config.js frontend-only/

# Loo .gitignore failid
echo "🚫 Creating .gitignore files..."

cat > backend-only/.gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log
combined.log
error.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

cat > frontend-only/.gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
web-build/

# Native
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local

# typescript
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
EOF

echo "✅ Separation complete!"
echo ""
echo "📁 Backend files: backend-only/"
echo "📱 Frontend files: frontend-only/"
echo ""
echo "🚀 Next steps:"
echo "1. Backend: cd backend-only && npm install"
echo "2. Frontend: cd frontend-only && npm install"
echo "3. Update API URLs in frontend utils files"
echo "4. Deploy backend to Digital Ocean"
echo "5. Run frontend locally for development"
