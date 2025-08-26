#!/bin/bash

# WhtzUp Project Cleanup Script
# See skript kustutab kõik ebavajalikud failid ja jätab ainult vajalikud

echo "🧹 WhtzUp Project Cleanup Script"
echo "================================="

# Loo varukoopia enne puhastamist
echo "📦 Creating backup..."
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Kustuta testfailid
echo "🗑️ Removing test files..."
find . -name "test-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "debug-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "create-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "migrate-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "check-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "analyze-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "verify-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "cleanup-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "fix-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "quick-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud skriptid
echo "🗑️ Removing unnecessary scripts..."
find . -name "*.sh" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -not -name "separate-repositories.sh" -not -name "cleanup-project.sh" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud dokumentatsiooni failid
echo "🗑️ Removing unnecessary documentation..."
find . -name "*.md" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -not -name "README.md" -not -name "backend-only/README.md" -not -name "frontend-only/README.md" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud kaustad
echo "🗑️ Removing unnecessary directories..."
if [ -d "backups" ]; then
    mv backups "$BACKUP_DIR/"
fi

if [ -d "dist" ]; then
    mv dist "$BACKUP_DIR/"
fi

if [ -d "public" ]; then
    mv public "$BACKUP_DIR/"
fi

# Kustuta ebavajalikud failid
echo "🗑️ Removing unnecessary files..."
find . -name "*.out" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "*.log" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "*.err" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "*.txt" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -not -name "README.txt" -exec mv {} "$BACKUP_DIR/" \;
find . -name "*.csv" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud konfiguratsiooni failid
echo "🗑️ Removing unnecessary config files..."
find . -name "*.bat" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud andmefailid
echo "🗑️ Removing unnecessary data files..."
find . -name "events-*.txt" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "migration-*.log" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud skriptid
echo "🗑️ Removing unnecessary scripts..."
find . -name "run-*.bat" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "start-*.bat" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud failid
echo "🗑️ Removing other unnecessary files..."
find . -name "poll-count.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "events-count.txt" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "simple-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;
find . -name "working-*.js" -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -exec mv {} "$BACKUP_DIR/" \;

# Kustuta ebavajalikud kaustad
echo "🗑️ Removing unnecessary directories..."
if [ -d "backend-example" ]; then
    mv backend-example "$BACKUP_DIR/"
fi

# Loo uus .gitignore
echo "📝 Creating new .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
*/node_modules/

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
.env

# typescript
*.tsbuildinfo

# IDE
.vscode/
.idea/

# Logs
*.log
*.out
*.err

# Backup
backup-*/

# Temporary files
*.tmp
*.temp

# OS generated files
Thumbs.db
EOF

echo "✅ Cleanup completed!"
echo "📁 Backup created in: $BACKUP_DIR"
echo ""
echo "📊 Remaining files:"
echo "=================="
echo "✅ Core application files"
echo "✅ Backend and frontend code"
echo "✅ Essential configuration"
echo "✅ README files"
echo ""
echo "🗑️ Moved to backup:"
echo "=================="
echo "❌ Test files (test-*.js, debug-*.js, etc.)"
echo "❌ Setup scripts (*.sh)"
echo "❌ Documentation files (*.md)"
echo "❌ Log files (*.log, *.out, *.err)"
echo "❌ Data files (*.txt, *.csv)"
echo "❌ Backup directories"
echo ""
echo "💡 To restore files: mv $BACKUP_DIR/* ."
