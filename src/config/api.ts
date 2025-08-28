// API Configuration
export const API_CONFIG = {
  // Development environment
  development: {
    http: 'http://localhost:4000',
    https: 'https://localhost:4001',
    api: 'http://localhost:4000/api',
    apiHttps: 'https://localhost:4001/api'
  },
  
  // Production environment
  production: {
    http: 'http://165.22.90.180:4000',
    https: 'https://165.22.90.180:4001',
    api: 'http://165.22.90.180:4000/api',
    apiHttps: 'https://165.22.90.180:4001/api'
  }
};

// Get current environment
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Export the appropriate configuration
export const getApiConfig = () => {
  return isDevelopment ? API_CONFIG.development : API_CONFIG.production;
};

// Export individual URLs
export const getApiBaseUrl = (useHttps = true) => {
  const config = getApiConfig();
  return useHttps ? config.apiHttps : config.api;
};

export const getBaseUrl = (useHttps = true) => {
  const config = getApiConfig();
  return useHttps ? config.https : config.http;
};

// Default export for backward compatibility
export default getApiBaseUrl(true); // Default to HTTPS
