const { v4: uuidv4 } = require('uuid');

const validateDeviceId = (req, res, next) => {
  // Get device ID from header or generate one
  let deviceId = req.headers['x-device-id'];
  
  if (!deviceId) {
    // Generate a new device ID if none exists
    deviceId = uuidv4();
    req.headers['x-device-id'] = deviceId;
    
    // Add device ID to response headers for client to store
    res.setHeader('X-Device-ID', deviceId);
  }
  
  // Validate device ID format (basic UUID validation)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(deviceId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid device ID format',
      details: 'Device ID must be a valid UUID'
    });
  }
  
  // Add device ID to request object for use in routes
  req.deviceId = deviceId;
  
  next();
};

module.exports = { validateDeviceId };
