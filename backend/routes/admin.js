const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { logger } = require('../config/database');

const router = express.Router();

// Middleware to check if request is from localhost or trusted IP
const adminAuth = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const allowedIPs = ['127.0.0.1', '::1', 'localhost', '165.22.90.180'];
  
  if (allowedIPs.includes(clientIP) || clientIP.startsWith('127.') || clientIP.startsWith('::1')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
};

// Generate SSL certificates
router.post('/generate-ssl', adminAuth, async (req, res) => {
  try {
    const sslDir = path.join(__dirname, '../../ssl');
    
    // Create SSL directory if it doesn't exist
    if (!fs.existsSync(sslDir)) {
      fs.mkdirSync(sslDir, { recursive: true });
    }
    
    const keyPath = path.join(sslDir, 'server.key');
    const certPath = path.join(sslDir, 'server.crt');
    
    // Generate SSL certificate
    const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=EE/ST=Harju/L=Tallinn/O=WhtzUp/OU=Production/CN=165.22.90.180"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('Error generating SSL certificates:', error);
        return res.status(500).json({ 
          error: 'Failed to generate SSL certificates',
          details: error.message 
        });
      }
      
      // Set proper permissions
      fs.chmodSync(keyPath, 0o600);
      fs.chmodSync(certPath, 0o644);
      
      logger.info('SSL certificates generated successfully');
      res.json({ 
        success: true, 
        message: 'SSL certificates generated successfully',
        keyPath,
        certPath
      });
    });
  } catch (error) {
    logger.error('Error in SSL generation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure HTTPS
router.post('/configure-https', adminAuth, async (req, res) => {
  try {
    const { sslKeyPath, sslCertPath, httpsPort = 4001 } = req.body;
    
    // Validate paths
    if (!sslKeyPath || !sslCertPath) {
      return res.status(400).json({ error: 'SSL key and certificate paths are required' });
    }
    
    // Check if files exist
    if (!fs.existsSync(sslKeyPath)) {
      return res.status(400).json({ error: 'SSL key file not found' });
    }
    
    if (!fs.existsSync(sslCertPath)) {
      return res.status(400).json({ error: 'SSL certificate file not found' });
    }
    
    // Update environment variables
    const envPath = path.join(__dirname, '../../.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    const newEnvVars = [
      `SSL_KEY_PATH=${sslKeyPath}`,
      `SSL_CERT_PATH=${sslCertPath}`,
      `HTTPS_PORT=${httpsPort}`
    ].join('\n');
    
    // Append to .env file
    fs.appendFileSync(envPath, '\n' + newEnvVars);
    
    logger.info('HTTPS configuration updated');
    res.json({ 
      success: true, 
      message: 'HTTPS configuration updated successfully',
      sslKeyPath,
      sslCertPath,
      httpsPort
    });
  } catch (error) {
    logger.error('Error configuring HTTPS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get HTTPS status
router.get('/https-status', adminAuth, (req, res) => {
  try {
    const sslKeyPath = process.env.SSL_KEY_PATH;
    const sslCertPath = process.env.SSL_CERT_PATH;
    const httpsPort = process.env.HTTPS_PORT || 4001;
    
    const status = {
      sslKeyExists: sslKeyPath ? fs.existsSync(sslKeyPath) : false,
      sslCertExists: sslCertPath ? fs.existsSync(sslCertPath) : false,
      httpsPort,
      sslKeyPath,
      sslCertPath,
      httpsEnabled: !!(sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath))
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting HTTPS status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restart server (this would require process management)
router.post('/restart', adminAuth, (req, res) => {
  try {
    logger.info('Server restart requested');
    res.json({ 
      success: true, 
      message: 'Restart request received. Please restart the server manually or use process manager.' 
    });
    
    // Note: In production, you might want to use PM2 or similar process manager
    // For now, we just log the request
  } catch (error) {
    logger.error('Error in restart request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
