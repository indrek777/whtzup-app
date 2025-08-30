const fs = require('fs');
const path = require('path');

console.log('🔧 Updating API configuration to use new domain...');

// Update src/config/api.ts
const apiConfigPath = path.join(__dirname, 'src', 'config', 'api.ts');
let apiConfig = fs.readFileSync(apiConfigPath, 'utf8');

// Replace the API URLs with the new domain
apiConfig = apiConfig.replace(
  /http:\/\/165\.22\.90\.180:4000/g,
  'https://api.olympio.ee'
);

apiConfig = apiConfig.replace(
  /https:\/\/165\.22\.90\.180:4001/g,
  'https://api.olympio.ee'
);

fs.writeFileSync(apiConfigPath, apiConfig);
console.log('✅ Updated src/config/api.ts');

// Update app.json ATS configuration
const appJsonPath = path.join(__dirname, 'app.json');
let appJson = fs.readFileSync(appJsonPath, 'utf8');

// Replace the IP-based ATS configuration with domain-based
appJson = appJson.replace(
  /"165\.22\.90\.180":\s*{[^}]+}/g,
  '"api.olympio.ee": {\n              "NSExceptionAllowsInsecureHTTPLoads": false,\n              "NSExceptionMinimumTLSVersion": "1.2",\n              "NSExceptionRequiresForwardSecrecy": true,\n              "NSIncludesSubdomains": true\n            }'
);

fs.writeFileSync(appJsonPath, appJson);
console.log('✅ Updated app.json ATS configuration');

console.log('🎉 API configuration updated successfully!');
console.log('🌐 New API endpoint: https://api.olympio.ee');
console.log('📱 App will now use the new domain with proper SSL certificate');
