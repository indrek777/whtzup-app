# 🚀 Migration Fix Guide

## ❌ **Problem**
The migration of sample events is failing due to various issues with Docker containers, API connections, and data validation.

## ✅ **Solution**

### **Step 1: Start Docker Containers**
```bash
docker-compose up -d
```

### **Step 2: Wait for Containers to Start**
Wait 30 seconds for all containers to be ready.

### **Step 3: Run the Quick Fix Script**
```bash
node quick-fix.js
```

### **Step 4: If Quick Fix Works, Run Full Migration**
```bash
node migrate-to-docker-fixed.js
```

## 🔧 **What the Quick Fix Script Does**

1. **Checks Events File**: Verifies your `src/data/events-data.json` exists and is readable
2. **Tests API Connection**: Ensures the Docker backend is responding
3. **Tests Single Upload**: Uploads a test event to verify the API works
4. **Migrates Sample**: Uploads 3 sample events from your data
5. **Reports Results**: Shows success/failure counts

## 📊 **Expected Output**

If everything works, you should see:
```
🚀 Quick Fix Script Starting...

📁 Step 1: Checking events file...
✅ Events file found: 2.45 MB

📖 Step 2: Reading events data...
✅ Loaded 13359 events

🌐 Step 3: Testing API connection...
✅ API is responding
📊 Health status: OK

📤 Step 4: Testing event upload...
✅ Test event uploaded successfully!

📤 Step 5: Starting sample migration...
📤 Processing 1/3: Jazz Night at Blue Note
✅ Event uploaded successfully!
📤 Processing 2/3: Food Truck Festival
✅ Event uploaded successfully!
📤 Processing 3/3: Basketball Championship
✅ Event uploaded successfully!

📊 Sample Migration Results:
✅ Successfully migrated: 3 events
❌ Failed: 0 events

✨ Sample migration successful!

📋 Next steps:
1. Run full migration: node migrate-to-docker-fixed.js
2. Integrate sync service into your React Native app
3. Test offline/online functionality
```

## 🚨 **If You Get Errors**

### **Error: "Events file not found"**
- Make sure `src/data/events-data.json` exists in your project

### **Error: "API is not responding"**
- Run: `docker-compose up -d`
- Wait 30 seconds
- Try again: `node quick-fix.js`

### **Error: "Test event upload failed"**
- Check Docker containers: `docker-compose ps`
- Check logs: `docker-compose logs api-server`
- Restart containers: `docker-compose restart`

### **Error: "Sample migration failed"**
- Check the specific error messages
- Verify your events data format
- Try with fewer events by modifying the script

## 🎯 **Next Steps After Successful Migration**

1. **Run Full Migration**:
   ```bash
   node migrate-to-docker-fixed.js
   ```

2. **Integrate Sync Service**:
   - Follow the guide in `integrate-sync-service.md`
   - Update your React Native app to use the sync service

3. **Test the Complete System**:
   - Start your React Native app
   - Test offline/online functionality
   - Verify real-time synchronization

## 📱 **Integration with React Native App**

After successful migration, update your app:

1. **Update MapViewNative.tsx** to use sync service
2. **Update EventEditor.tsx** to use sync service  
3. **Add sync status indicators**
4. **Test offline/online functionality**

## 🔍 **Verification Commands**

Check if everything is working:
```bash
# Check Docker containers
docker-compose ps

# Check API health
curl http://localhost:4000/health

# Check events in database
curl http://localhost:4000/api/events

# Check database directly
docker exec whtzup-postgres psql -U whtzup_user -d whtzup_events -c "SELECT COUNT(*) FROM events;"
```

## 🎉 **Success Indicators**

- ✅ Docker containers running and healthy
- ✅ API responding on port 4000
- ✅ Sample events migrated successfully
- ✅ Full migration completed
- ✅ React Native app integrated with sync service
- ✅ Offline/online functionality working

---

**Need Help?** If you encounter any issues, check the error messages and follow the troubleshooting steps above. The quick fix script will tell you exactly what's wrong and how to fix it.
