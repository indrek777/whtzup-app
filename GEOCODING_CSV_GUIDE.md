# Geocoding CSV Tool Guide

## Overview

The Geocoding CSV Tool provides a workflow for batch geocoding events that need coordinates. This tool allows users to:

1. **Download** events that need geocoding as a CSV file
2. **Work externally** with the CSV file (add coordinates manually or using external tools)
3. **Upload** the updated CSV file to merge the new coordinates with existing events

This is particularly useful when you have many events that need geocoding and want to work on them in batches using external tools like Excel, Google Sheets, or specialized geocoding services.

## Features

### ✅ Download Events for Geocoding
- Automatically identifies events that need geocoding
- Exports them as a CSV file with all event data
- Includes current coordinates (if any) for reference
- Provides clear instructions for the next steps

### ✅ Upload and Merge Geocoded Data
- Validates uploaded CSV files for proper format
- Ensures coordinates are within Estonia boundaries
- Merges new coordinates with existing events
- Supports adding new events from the CSV
- Provides detailed feedback on the merge process

### ✅ Estonia-Wide Coverage
- Validates coordinates are within Estonia (57.5°N-59.7°N, 21.5°E-28.2°E)
- Covers all Estonian cities, towns, villages, and rural areas
- Prevents invalid coordinates from being imported

## How to Use

### Step 1: Access the Tool
1. Open the **Settings** panel (password: "indrek")
2. Go to the **Event Management** tab
3. Click the **📄 FileText** button in the toolbar
4. Enter the password "indrek" when prompted

### Step 2: Download Events for Geocoding
1. Click **"Download Events for Geocoding"**
2. The tool will automatically identify events that need coordinates
3. A CSV file will be downloaded with the filename: `events-needing-geocoding-YYYY-MM-DD.csv`

### Step 3: Add Coordinates (External Work)
1. Open the downloaded CSV file in Excel, Google Sheets, or any spreadsheet application
2. You'll see columns including:
   - `id` - Event identifier (required)
   - `title`, `description`, `category` - Event details
   - `location_name`, `location_address` - Location information
   - `current_lat`, `current_lon` - Current coordinates (if any)
   - `lat`, `lon` - **EMPTY - Add your coordinates here**
   - `date`, `time`, `organizer` - Event details
   - `attendees`, `maxAttendees` - Attendance information

3. **Add coordinates** to the `lat` and `lon` columns:
   - Use decimal degrees format (e.g., 59.436962, 24.753574)
   - Ensure coordinates are within Estonia
   - You can use external geocoding services, maps, or manual lookup

4. **Save the file** as a CSV (UTF-8 encoding recommended)

### Step 4: Upload and Merge
1. Click **"Upload Geocoded CSV"**
2. Select your updated CSV file
3. The tool will validate and process the file
4. You'll see a success message with details about:
   - Number of events processed
   - Number of existing events updated
   - Number of new events added (if any)

## CSV Format Requirements

### Required Columns
- `id` - Event identifier (must match existing events for updates)
- `lat` - Latitude in decimal degrees
- `lon` - Longitude in decimal degrees

### Optional Columns
- `title` - Event title
- `description` - Event description
- `category` - Event category
- `location_name` - Location name
- `location_address` - Location address
- `date` - Event date
- `time` - Event time
- `organizer` - Event organizer
- `attendees` - Number of attendees
- `maxAttendees` - Maximum attendees

### Coordinate Validation
- **Format**: Decimal degrees (e.g., 59.436962, 24.753574)
- **Range**: Must be within Estonia boundaries
  - Latitude: 57.5°N to 59.7°N
  - Longitude: 21.5°E to 28.2°E
- **Validation**: Invalid coordinates will be skipped with warnings

## Example CSV Format

```csv
id,title,description,category,location_name,location_address,current_lat,current_lon,lat,lon,date,time,organizer,attendees,maxAttendees,needs_geocoding
1,Jazz Night,Great jazz music,music,Blue Note,Tallinn,59.436962,24.753574,59.436962,24.753574,2024-01-15,20:00,Music Club,50,100,TRUE
2,Art Exhibition,Modern art showcase,art,Art Gallery,Tartu,58.377625,26.729006,58.377625,26.729006,2024-01-20,18:00,Gallery,30,,TRUE
```

## Workflow Examples

### Example 1: Batch Geocoding with External Service
1. Download events needing geocoding
2. Use a geocoding service (Google Maps, OpenStreetMap, etc.) to find coordinates
3. Add coordinates to the CSV file
4. Upload and merge the results

### Example 2: Manual Coordinate Entry
1. Download events needing geocoding
2. Use a map application to manually find coordinates
3. Enter coordinates in the CSV file
4. Upload and merge the results

### Example 3: Adding New Events
1. Download existing events for reference
2. Add new events to the CSV with proper coordinates
3. Upload to add new events to the system

## Error Handling

### Common Errors and Solutions

**"Missing required column: id"**
- Ensure your CSV has an `id` column
- Check for typos in column names

**"Invalid coordinates"**
- Verify coordinates are in decimal degrees format
- Ensure coordinates are within Estonia boundaries
- Check for extra spaces or characters

**"Coordinates outside Estonia"**
- Verify coordinates are within the valid range
- Use Estonia-specific geocoding services

**"CSV file is empty"**
- Ensure the file contains data rows
- Check file encoding (use UTF-8)

## Best Practices

### For Downloading
- Review the events list before downloading
- Consider downloading smaller batches for easier management
- Keep the original file as backup

### For Adding Coordinates
- Use reliable geocoding sources
- Double-check coordinates for accuracy
- Test coordinates on a map before uploading
- Use Estonia-specific geocoding services when possible

### For Uploading
- Always backup your data before uploading
- Review the validation results carefully
- Check the success message for any warnings
- Verify the results on the map after upload

## Technical Details

### File Format
- **Encoding**: UTF-8 recommended
- **Separator**: Comma (,)
- **Line endings**: Unix (LF) or Windows (CRLF)
- **Quotes**: Used for values containing commas or quotes

### Coordinate System
- **Format**: WGS84 decimal degrees
- **Precision**: 6 decimal places recommended
- **Validation**: Estonia boundary check

### Data Merging
- **Existing events**: Updated with new coordinates
- **New events**: Added to the system
- **Conflicts**: Resolved by event ID matching
- **Validation**: Coordinates and data format validation

## Troubleshooting

### Upload Fails
1. Check CSV format and encoding
2. Verify required columns are present
3. Validate coordinates are within Estonia
4. Check for special characters in data

### Coordinates Not Showing
1. Verify coordinates are in correct format
2. Check that coordinates are within Estonia
3. Refresh the page after upload
4. Check browser console for errors

### Performance Issues
1. Limit CSV file size (recommend < 1000 events per file)
2. Use smaller batches for large datasets
3. Close other applications to free memory

## Support

If you encounter issues:
1. Check the error messages in the upload result
2. Verify your CSV format matches the requirements
3. Test with a small sample file first
4. Contact support with the specific error message

---

**Note**: This tool is designed for Estonia-wide geocoding. For international events, consider using the regular geocoding tool or manual coordinate entry.
