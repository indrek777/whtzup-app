# 🚀 Server Setup for Automatic Event Sharing

## 🎯 **Overview**

The app now includes a server that automatically shares imported events across all users without manual intervention.

## 📋 **Server Features**

- ✅ **Automatic Event Sharing** - Imported events are instantly available to all users
- ✅ **API Endpoints** - RESTful API for event management
- ✅ **File Upload** - Handles CSV imports and JSON updates
- ✅ **CORS Enabled** - Works with frontend development
- ✅ **Static File Serving** - Serves the React app

## 🚀 **Quick Start**

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Build the App**
```bash
npm run build
```

### 3. **Start the Server**
```bash
npm start
# or
node server.js
```

### 4. **Access the App**
- **App**: http://localhost:7777
- **API**: http://localhost:7777/api/events

## 🔧 **API Endpoints**

### **GET /api/events**
- Returns all current events
- Used by the app to load events from server

### **POST /api/update-events**
- Updates the server's events JSON file
- Accepts FormData with events file
- Automatically called when importing CSV

## 📁 **File Structure**

```
├── server.js              # Express server
├── public/
│   └── events-user.json   # Shared events file (auto-updated)
├── dist/                  # Built React app
└── src/                   # React source code
```

## 🔄 **How It Works**

1. **User imports CSV** → Events are processed
2. **Server API called** → JSON file is updated
3. **All users see events** → App loads from server API
4. **No manual steps** → Everything happens automatically

## ⚙️ **Configuration**

### **Environment Variables**
- `PORT` - Server port (default: 7777)

### **File Limits**
- Maximum file size: 10MB
- Supported formats: CSV, JSON

## 🛠️ **Development**

### **Development Mode**
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Express server
npm start
```

### **Production Mode**
```bash
npm run build
npm start
```

## 🔒 **Security Notes**

- Server validates all uploaded JSON data
- File size limits prevent abuse
- CORS configured for development
- Input sanitization for file uploads

## 🚀 **Deployment**

### **Local Network**
- Server runs on port 7777
- Accessible from other devices on same network
- All users on network see shared events

### **Production**
- Deploy to hosting service (Vercel, Heroku, etc.)
- Set environment variables
- Configure domain and SSL

---

**The server enables seamless event sharing across all users without any manual intervention!**
