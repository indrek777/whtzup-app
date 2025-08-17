# 🗺️ Nominatim Geocoding Integration

## 🎯 **Overview**

The app now integrates with the public Nominatim service (`https://nominatim.openstreetmap.org`) to provide automatic address lookup and coordinate finding.

## 📋 **Features**

- ✅ **Address Search** - Search for addresses and places as you type
- ✅ **Auto-geocoding** - Automatically find coordinates for entered addresses
- ✅ **Reverse Geocoding** - Get address information from coordinates
- ✅ **Import Enhancement** - Automatically geocode imported events without coordinates
- ✅ **Real-time Suggestions** - Get address suggestions while typing

## 🔧 **How It Works**

### **Address Input with Auto-geocoding**
1. **Enter Address** - Type an address in the venue form
2. **Auto-search** - Nominatim searches for matching addresses
3. **Select Result** - Choose from suggested addresses
4. **Auto-coordinates** - Coordinates are automatically filled in

### **CSV Import Enhancement**
1. **Import Events** - Upload CSV with event data
2. **Missing Coordinates** - Events without coordinates are identified
3. **Auto-geocode** - Nominatim finds coordinates for venue names
4. **Enhanced Import** - Events are imported with proper coordinates

## 🚀 **Usage**

### **Adding Events with Geocoding**
1. Go to Settings → Add New Event
2. Enter venue name
3. **Enter address** - Start typing an address
4. **Select from suggestions** - Choose from Nominatim results
5. **Coordinates auto-filled** - Latitude/longitude are automatically set

### **Importing Events with Geocoding**
1. Go to Settings → Import (password: `indrek`)
2. Upload CSV file with events
3. **Review preview** - See events with enhanced coordinates
4. **Import** - Events are imported with geocoded coordinates

### **Geocoding Existing Events**
1. Go to Settings → Geocoding Tool (password: `indrek`)
2. **Review events** - See which events need geocoding
3. **Start processing** - Tool will geocode all events with default coordinates
4. **Review results** - See which events were successfully geocoded
5. **Apply changes** - Update events with new coordinates
6. **Download report** - Get detailed geocoding report

## 📁 **API Endpoints Used**

### **Search Address**
```
GET https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5&addressdetails=1
```

### **Reverse Geocoding**
```
GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1
```

## 🔧 **Configuration**

### **Nominatim Server**
- **URL**: `https://nominatim.openstreetmap.org/`
- **Service**: Public Nominatim API
- **Format**: JSON
- **Limit**: 5 results per search
- **Rate Limit**: 1 request per second (enforced)

### **Geocoding Settings**
- **Search Delay**: 3 characters minimum
- **Auto-geocode**: 5 characters minimum
- **Fallback**: Tallinn coordinates (59.436962, 24.753574)

## 📊 **Benefits**

### **For Users**
- ✅ **No manual coordinate entry** - Addresses automatically get coordinates
- ✅ **Accurate locations** - Professional geocoding service
- ✅ **Faster data entry** - Select from suggestions instead of typing
- ✅ **Better event discovery** - Events appear in correct map locations

### **For Importers**
- ✅ **Enhanced CSV imports** - Missing coordinates are automatically found
- ✅ **Better data quality** - All events have proper coordinates
- ✅ **Reduced manual work** - No need to manually add coordinates

## 🛠️ **Technical Details**

### **Geocoding Utility Functions**
- `searchAddress(query)` - Search for addresses
- `reverseGeocode(lat, lon)` - Get address from coordinates
- `getCoordinates(address)` - Get coordinates for address
- `formatDisplayName(name)` - Format address for display

### **Integration Points**
- **Settings Form** - Address input with suggestions
- **DataImporter** - Auto-geocoding for imported events
- **GeocodingTool** - Batch geocoding for existing events
- **Event Creation** - Automatic coordinate lookup

## 🔒 **Error Handling**

- **Network Errors** - Graceful fallback to manual entry
- **No Results** - User can still manually enter coordinates
- **Invalid Addresses** - Fallback to default coordinates
- **Server Unavailable** - App continues to work without geocoding

## 🚀 **Future Enhancements**

- **Caching** - Cache geocoding results for better performance
- **Offline Support** - Local geocoding database
- **Advanced Search** - Filter by country, region, etc.
- **Scheduled Geocoding** - Automatically geocode new events

---

**The Nominatim integration makes event creation and import much easier by automatically handling address-to-coordinate conversion!**
