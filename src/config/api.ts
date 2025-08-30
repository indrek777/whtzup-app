// API Configuration
export const API_CONFIG = {
  // Development environment
  development: {
    http: 'https://api.olympio.ee',
    https: 'https://api.olympio.ee',
    api: 'https://api.olympio.ee/api',
    apiHttps: 'https://api.olympio.ee/api'
  },

  // Production environment
  production: {
    http: 'https://api.olympio.ee',
    https: 'https://api.olympio.ee',
    api: 'https://api.olympio.ee/api',
    apiHttps: 'https://api.olympio.ee/api'
  }
};

// Get current environment
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

// Export the appropriate configuration
export const getApiConfig = () => {
  return isDevelopment ? API_CONFIG.development : API_CONFIG.production;
};

// Export individual URLs
export const getApiBaseUrl = (useHttps = false) => {
  const config = getApiConfig();
  return useHttps ? config.apiHttps : config.api;
};

export const getBaseUrl = (useHttps = false) => {
  const config = getApiConfig();
  return useHttps ? config.https : config.http;
};

// Default export for backward compatibility
export default getApiBaseUrl(true); // Default to HTTPS for production
