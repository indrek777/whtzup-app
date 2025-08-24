const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  // Development server configuration
  server: {
    // Enable LAN mode by default
    hostType: 'lan',
    // Allow connections from any IP on the LAN
    host: '0.0.0.0',
    // Use port 8081 (default Expo port)
    port: 8081,
  },
  // Development client configuration
  developmentClient: {
    // Enable LAN mode for development client
    silentLaunch: false,
  },
  // Metro configuration
  metro: {
    ...config.metro,
    // Enable LAN mode for Metro bundler
    server: {
      port: 8081,
      host: '0.0.0.0',
    },
  },
};
