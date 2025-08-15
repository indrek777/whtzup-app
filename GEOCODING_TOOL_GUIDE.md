# 🗺️ Geocoding Tool Guide

## 🎯 **Overview**

The Geocoding Tool allows you to automatically find coordinates for existing events in your database that currently have default or missing coordinates. This is especially useful for events that were imported without proper coordinates or have placeholder coordinates.

## 📋 **What It Does**

- ✅ **Identifies Events** - Finds events with default Tallinn coordinates (59.436962, 24.753574)
- ✅ **Batch Processing** - Processes multiple events at once
- ✅ **Smart Search** - Uses venue name and address to find coordinates
- ✅ **Results Review** - Shows detailed results before applying changes
- ✅ **Report Generation** - Creates downloadable reports of the geocoding process

## 🔧 **How It Works**

### **Event Detection**
The tool identifies events that need geocoding by checking for:
- Default Tallinn coordinates (59.436962, 24.753574)
- Invalid coordinates (NaN values)
- Zero coordinates (0, 0)

### **Geocoding Process**
1. **Search Terms** - For each event, it tries multiple search terms:
   - Venue name only
   - Address only
   - Combined venue name + address
2. **Nominatim Lookup** - Uses your local Nominatim server to find coordinates
3. **Result Validation** - Ensures found coordinates are valid
4. **Progress Tracking** - Shows real-time progress during processing

### **Results Review**
- **Success Rate** - Shows how many events were successfully geocoded
- **Detailed Results** - Lists each event with before/after coordinates
- **Error Information** - Shows why some events failed to geocode

## 🚀 **Step-by-Step Usage**

### **1. Access the Tool**
1. Go to **Settings** (password: `indrek`)
2. Click the **Map Pin icon** (🗺️) in the toolbar
3. Enter password: `indrek`

### **2. Review Events**
- **Statistics** - See how many events need geocoding
- **Event List** - Review each event that will be processed
- **Current Coordinates** - See what coordinates each event currently has

### **3. Start Processing**
1. Click **"Start Geocoding"** button
2. **Wait** - Processing happens automatically with progress updates
3. **Review** - See detailed results for each event

### **4. Apply Changes**
1. **Review Results** - Check which events were successfully geocoded
2. **Download Report** - Get a detailed JSON report (optional)
3. **Apply Changes** - Update events with new coordinates
4. **Confirmation** - Tool confirms how many events were updated

## 📊 **Understanding Results**

### **Success Indicators**
- ✅ **Green Checkmark** - Event successfully geocoded
- 📍 **New Coordinates** - Shows the new latitude/longitude
- 🎯 **Location Found** - Nominatim found a match for the venue

### **Failure Indicators**
- ❌ **Red Alert Icon** - Event failed to geocode
- 🔍 **Error Message** - Explains why geocoding failed
- 📍 **Original Coordinates** - Keeps existing coordinates

### **Common Failure Reasons**
- **Vague Location Names** - "Various locations" or "TBD"
- **Non-existent Venues** - Venues that don't exist in OpenStreetMap
- **Network Issues** - Nominatim server unavailable
- **Rate Limiting** - Too many requests to Nominatim

## 📁 **Report Format**

The downloadable report includes:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalEvents": 25,
  "successfulGeocoding": 18,
  "failedGeocoding": 7,
  "results": [
    {
      "eventTitle": "Summer Concert",
      "originalLocation": "Kuressaare Teater",
      "originalCoordinates": [59.436962, 24.753574],
      "newCoordinates": [58.2542245, 22.489828],
      "success": true,
      "error": null
    }
  ]
}
```

## 🔒 **Safety Features**

### **No Automatic Changes**
- **Review First** - All results are shown before applying
- **Manual Approval** - You must click "Apply Changes" to update events
- **Backup Available** - Download report before applying changes

### **Error Handling**
- **Graceful Failures** - Failed events keep their original coordinates
- **Network Resilience** - Continues processing even if some requests fail
- **Rate Limiting** - Built-in delays to avoid overwhelming Nominatim

## ⚙️ **Configuration**

### **Nominatim Server**
- **URL**: `http://localhost:7070/`
- **Rate Limiting**: 100ms delay between requests
- **Timeout**: Automatic timeout for failed requests

### **Search Strategy**
- **Primary**: Venue name search
- **Secondary**: Address search
- **Fallback**: Combined search terms

## 🛠️ **Best Practices**

### **Before Running**
1. **Backup Data** - Ensure you have a backup of your events
2. **Check Nominatim** - Verify your Nominatim server is running
3. **Review Events** - Check which events will be processed

### **During Processing**
1. **Don't Interrupt** - Let the process complete
2. **Monitor Progress** - Watch the progress counter
3. **Check Results** - Review all results before applying

### **After Processing**
1. **Download Report** - Keep a record of changes
2. **Test Map** - Verify events appear in correct locations
3. **Manual Review** - Check a few events manually

## 🔧 **Troubleshooting**

### **No Events Found**
- **Check Coordinates** - Ensure events have default coordinates
- **Refresh Data** - Reload the page to get latest events
- **Check Filter** - Verify you're looking at the right event set

### **Low Success Rate**
- **Improve Venue Names** - Use more specific venue names
- **Add Addresses** - Include full addresses in event data
- **Check Nominatim** - Verify Nominatim server is working

### **Processing Errors**
- **Network Issues** - Check internet connection
- **Nominatim Down** - Verify Nominatim server is running
- **Rate Limiting** - Wait and try again later

## 🚀 **Advanced Usage**

### **Batch Processing Strategy**
1. **Run on Subset** - Process events in smaller batches
2. **Review Results** - Check success rate for each batch
3. **Adjust Search Terms** - Improve venue names for failed events
4. **Re-run Failed** - Process only failed events with better data

### **Data Quality Improvement**
1. **Standardize Venue Names** - Use consistent naming conventions
2. **Add Full Addresses** - Include street addresses when possible
3. **Verify Locations** - Check that venues actually exist
4. **Update Regularly** - Run geocoding tool periodically

---

**The Geocoding Tool makes it easy to improve the location accuracy of your event database using your local Nominatim server!**
