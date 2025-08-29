
# Database Configuration Fix for Digital Ocean Server

## Current Issue
The server is trying to connect to PostgreSQL with user "postgres" but authentication is failing.

## Solution
Update the DATABASE_URL environment variable on the Digital Ocean server:

### Option 1: Use the correct database URL
DATABASE_URL=postgresql://whtzup_user:whtzup_password@localhost:5432/whtzup_events

### Option 2: Create the correct user and database
1. Connect to the server via SSH
2. Run PostgreSQL commands:

```sql
-- Create user and database
CREATE USER whtzup_user WITH PASSWORD 'whtzup_password';
CREATE DATABASE whtzup_events OWNER whtzup_user;
GRANT ALL PRIVILEGES ON DATABASE whtzup_events TO whtzup_user;

-- Connect to the database and create tables
\c whtzup_events

-- Run the initialization script
\i /path/to/init.sql
```

### Option 3: Update environment variables
Set these environment variables on the server:

```bash
export DATABASE_URL="postgresql://whtzup_user:whtzup_password@localhost:5432/whtzup_events"
export POSTGRES_PASSWORD="whtzup_password"
export NODE_ENV="production"
```

## Docker Configuration
If using Docker, update the docker-compose.yml:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: whtzup_events
      POSTGRES_USER: whtzup_user
      POSTGRES_PASSWORD: whtzup_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  api-server:
    environment:
      DATABASE_URL: postgresql://whtzup_user:whtzup_password@postgres:5432/whtzup_events
```

## Manual Database Setup
If you need to set up the database manually:

1. Install PostgreSQL on the server
2. Create the database and user
3. Run the initialization script
4. Update the environment variables
5. Restart the application

## Test Connection
After fixing, test with:

```bash
curl http://165.22.90.180:4000/api/health
curl http://165.22.90.180:4000/api/events
```
