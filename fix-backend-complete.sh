#!/bin/bash

# Complete Backend Fix Script for Digital Ocean Server
# Run this script on the server to fix database and endpoint issues

echo "🔧 Complete Backend Fix for WhtzUp Server"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/root/whtzup-app"
BACKEND_DIR="$APP_DIR/backend"
DATABASE_NAME="whtzup_events"
DATABASE_USER="whtzup_user"
DATABASE_PASSWORD="whtzup_password"

echo -e "${YELLOW}Step 1: Checking current status${NC}"
echo "======================================"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory not found: $APP_DIR${NC}"
    echo "Creating directory..."
    mkdir -p "$APP_DIR"
fi

# Check if backend is running
echo -e "${BLUE}Checking if backend is running...${NC}"
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${RED}❌ Backend is not running${NC}"
    BACKEND_RUNNING=false
fi

echo ""

echo -e "${YELLOW}Step 2: Fixing Database Configuration${NC}"
echo "============================================="

# Check PostgreSQL status
echo -e "${BLUE}Checking PostgreSQL status...${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo "Starting PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
fi

# Create database and user
echo -e "${BLUE}Setting up database...${NC}"
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DATABASE_USER') THEN
        CREATE USER $DATABASE_USER WITH PASSWORD '$DATABASE_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DATABASE_NAME OWNER $DATABASE_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DATABASE_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $DATABASE_USER;
\q
EOF

echo -e "${GREEN}✅ Database setup completed${NC}"

# Initialize database tables
echo -e "${BLUE}Initializing database tables...${NC}"
if [ -f "$APP_DIR/database/init.sql" ]; then
    sudo -u postgres psql -d "$DATABASE_NAME" -f "$APP_DIR/database/init.sql"
    echo -e "${GREEN}✅ Database tables initialized${NC}"
else
    echo -e "${RED}❌ Database init script not found${NC}"
fi

echo ""

echo -e "${YELLOW}Step 3: Fixing Environment Configuration${NC}"
echo "================================================"

# Create/update .env file
echo -e "${BLUE}Creating environment configuration...${NC}"
cat > "$BACKEND_DIR/.env" << EOF
NODE_ENV=production
PORT=4000
HTTPS_PORT=4001
DATABASE_URL=postgresql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:5432/$DATABASE_NAME
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DISABLE_RATE_LIMIT=true
SSL_KEY_PATH=/app/ssl/server.key
SSL_CERT_PATH=/app/ssl/server.crt
EOF

echo -e "${GREEN}✅ Environment configuration updated${NC}"

echo ""

echo -e "${YELLOW}Step 4: Adding Missing API Endpoints${NC}"
echo "============================================="

# Add missing endpoints to events.js
echo -e "${BLUE}Adding /api/events/count endpoint...${NC}"
if [ -f "$BACKEND_DIR/routes/events.js" ]; then
    # Check if count endpoint already exists
    if ! grep -q "router.get('/count'" "$BACKEND_DIR/routes/events.js"; then
        # Add count endpoint before the last line
        sed -i '/module.exports = router;/i\
// GET /api/events/count - Get total count of events with filters\
router.get('\''/count'\'', optionalAuth, async (req, res) => {\
  try {\
    const { category, venue, latitude, longitude, radius, from, to } = req.query;\
    \
    let query = '\''SELECT COUNT(*) as total FROM events WHERE deleted_at IS NULL'\'';\
    const params = [];\
    let paramCount = 0;\
\
    if (category) {\
      paramCount++;\
      query += ` AND category = $${paramCount}`;\
      params.push(category);\
    }\
\
    if (venue) {\
      paramCount++;\
      query += ` AND venue ILIKE $${paramCount}`;\
      params.push(`%${venue}%`);\
    }\
\
    if (from) {\
      paramCount++;\
      query += ` AND starts_at >= $${paramCount}`;\
      params.push(from + '\''T00:00:00.000Z'\'');\
    }\
\
    if (to) {\
      paramCount++;\
      query += ` AND starts_at <= $${paramCount}`;\
      params.push(to + '\''T23:59:59.999Z'\'');\
    }\
\
    if (latitude && longitude && radius) {\
      paramCount++;\
      const currentUserId = req.user?.id || null;\
      \
      if (currentUserId) {\
        query += ` AND (\
          created_by = $${paramCount} OR\
          (\
            6371 * acos(\
              cos(radians($${paramCount + 1})) * \
              cos(radians(latitude)) * \
              cos(radians(longitude) - radians($${paramCount + 2})) + \
              sin(radians($${paramCount + 1})) * \
              sin(radians(latitude))\
            )\
          ) <= $${paramCount + 3}\
        )`;\
        params.push(currentUserId, parseFloat(latitude), parseFloat(longitude), parseFloat(radius));\
      } else {\
        query += ` AND (\
          6371 * acos(\
            cos(radians($${paramCount})) * \
            cos(radians(latitude)) * \
            cos(radians(longitude) - radians($${paramCount + 1})) + \
            sin(radians($${paramCount})) * \
            sin(radians(latitude))\
          )\
        ) <= $${paramCount + 2}`;\
        params.push(parseFloat(latitude), parseFloat(longitude), parseFloat(radius));\
      }\
    }\
\
    const result = await pool.query(query, params);\
    const total = parseInt(result.rows[0].total);\
    \
    res.json({\
      success: true,\
      count: total,\
      filters: { category, venue, latitude, longitude, radius, from, to }\
    });\
  } catch (error) {\
    console.error('\''Error counting events:'\'', error);\
    res.status(500).json({\
      success: false,\
      error: '\''Failed to count events'\'',\
      details: process.env.NODE_ENV === '\''development'\'' ? error.message : undefined\
    });\
  }\
});\
' "$BACKEND_DIR/routes/events.js"
        echo -e "${GREEN}✅ /api/events/count endpoint added${NC}"
    else
        echo -e "${BLUE}ℹ️  /api/events/count endpoint already exists${NC}"
    fi
else
    echo -e "${RED}❌ Events route file not found${NC}"
fi

# Add missing endpoints to sync.js
echo -e "${BLUE}Adding /api/sync/status endpoint...${NC}"
if [ -f "$BACKEND_DIR/routes/sync.js" ]; then
    # Check if status endpoint already exists
    if ! grep -q "router.get('/status'" "$BACKEND_DIR/routes/sync.js"; then
        # Add status endpoint before the last line
        sed -i '/module.exports = router;/i\
// GET /api/sync/status - Get sync status\
router.get('\''/status'\'', async (req, res) => {\
  try {\
    const { deviceId } = req.query;\
    const deviceIdHeader = req.headers['\''x-device-id'\''];\
    const currentDeviceId = deviceId || deviceIdHeader;\
\
    const queueQuery = `\
      SELECT \
        COUNT(*) as total,\
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,\
        COUNT(CASE WHEN processed = false THEN 1 END) as pending,\
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors\
      FROM offline_queue \
      WHERE device_id = $1\
    `;\
\
    const queueResult = await pool.query(queueQuery, [currentDeviceId]);\
    const queueStatus = queueResult.rows[0];\
\
    const lastSyncQuery = `\
      SELECT MAX(updated_at) as last_sync\
      FROM events \
      WHERE updated_at > (SELECT MAX(timestamp) FROM sync_log WHERE device_id = $1)\
    `;\
\
    const lastSyncResult = await pool.query(lastSyncQuery, [currentDeviceId]);\
    const lastSync = lastSyncResult.rows[0]?.last_sync;\
\
    res.json({\
      success: true,\
      deviceId: currentDeviceId,\
      queue: {\
        total: parseInt(queueStatus.total),\
        processed: parseInt(queueStatus.processed),\
        pending: parseInt(queueStatus.pending),\
        errors: parseInt(queueStatus.errors)\
      },\
      lastSync: lastSync,\
      isOnline: true\
    });\
  } catch (error) {\
    console.error('\''Error getting sync status:'\'', error);\
    res.status(500).json({\
      success: false,\
      error: '\''Failed to get sync status'\'',\
      details: process.env.NODE_ENV === '\''development'\'' ? error.message : undefined\
    });\
  }\
});\
' "$BACKEND_DIR/routes/sync.js"
        echo -e "${GREEN}✅ /api/sync/status endpoint added${NC}"
    else
        echo -e "${BLUE}ℹ️  /api/sync/status endpoint already exists${NC}"
    fi
else
    echo -e "${RED}❌ Sync route file not found${NC}"
fi

echo ""

echo -e "${YELLOW}Step 5: Installing Dependencies${NC}"
echo "====================================="

# Install backend dependencies
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    cd "$BACKEND_DIR"
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend directory not found${NC}"
fi

echo ""

echo -e "${YELLOW}Step 6: Restarting Backend Service${NC}"
echo "=========================================="

# Stop existing backend process
if [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${BLUE}Stopping existing backend process...${NC}"
    pkill -f "node.*server.js"
    sleep 2
fi

# Start backend
echo -e "${BLUE}Starting backend server...${NC}"
cd "$BACKEND_DIR"
nohup node server.js > server.log 2>&1 &
echo -e "${GREEN}✅ Backend server started${NC}"

# Wait a moment for server to start
sleep 3

echo ""

echo -e "${YELLOW}Step 7: Testing Endpoints${NC}"
echo "================================"

# Test health endpoint
echo -e "${BLUE}Testing health endpoint...${NC}"
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
fi

# Test events endpoint
echo -e "${BLUE}Testing events endpoint...${NC}"
if curl -s http://localhost:4000/api/events > /dev/null; then
    echo -e "${GREEN}✅ Events endpoint working${NC}"
else
    echo -e "${RED}❌ Events endpoint failed${NC}"
fi

# Test events count endpoint
echo -e "${BLUE}Testing events count endpoint...${NC}"
if curl -s "http://localhost:4000/api/events/count" > /dev/null; then
    echo -e "${GREEN}✅ Events count endpoint working${NC}"
else
    echo -e "${RED}❌ Events count endpoint failed${NC}"
fi

# Test sync status endpoint
echo -e "${BLUE}Testing sync status endpoint...${NC}"
if curl -s "http://localhost:4000/api/sync/status" > /dev/null; then
    echo -e "${GREEN}✅ Sync status endpoint working${NC}"
else
    echo -e "${RED}❌ Sync status endpoint failed${NC}"
fi

echo ""

echo -e "${YELLOW}Step 8: Final Status${NC}"
echo "=========================="

# Show server status
echo -e "${BLUE}Backend process status:${NC}"
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
    echo "Process ID: $(pgrep -f 'node.*server.js')"
else
    echo -e "${RED}❌ Backend is not running${NC}"
fi

# Show recent logs
echo -e "${BLUE}Recent server logs:${NC}"
if [ -f "$BACKEND_DIR/server.log" ]; then
    tail -5 "$BACKEND_DIR/server.log"
else
    echo "No log file found"
fi

echo ""
echo -e "${GREEN}🎉 Backend fix completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the app on your device"
echo "2. Check if events are loading properly"
echo "3. Verify sync functionality works"
echo ""
echo -e "${BLUE}Server URLs:${NC}"
echo "HTTP: http://165.22.90.180:4000"
echo "HTTPS: https://165.22.90.180:4001"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo "Health: http://165.22.90.180:4000/api/health"
echo "Events: http://165.22.90.180:4000/api/events"
echo "Events Count: http://165.22.90.180:4000/api/events/count"
echo "Sync Status: http://165.22.90.180:4000/api/sync/status"
