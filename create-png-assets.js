const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Create a simple 1x1 PNG file (minimal valid PNG)
// This is a base64 encoded 1x1 blue PNG
const simplePNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

// Create the required PNG files
const files = [
  'icon.png',
  'splash.png', 
  'adaptive-icon.png',
  'favicon.png'
];

console.log('Creating PNG placeholder assets...');

files.forEach(filename => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, simplePNG);
  console.log(`Created ${filename} (1x1 blue placeholder)`);
});

console.log('PNG placeholder assets created!');
console.log('Note: These are minimal 1x1 PNG files. Replace with proper images for production.');
