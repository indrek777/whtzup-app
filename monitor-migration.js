const fs = require('fs');

function showProgress() {
  try {
    // Check migration log
    if (fs.existsSync('migration-fresh.out')) {
      const lines = fs.readFileSync('migration-fresh.out', 'utf8').split('\n');
      const progressLine = lines.find(line => line.includes('Progress'));
      if (progressLine) {
        console.log('📊 Migration Progress:', progressLine);
      }
    }

    // Check event count
    if (fs.existsSync('events-count.txt')) {
      const countLine = fs.readFileSync('events-count.txt', 'utf8').trim();
      console.log('📈 Current Events:', countLine);
    }

    // Check summary if exists
    if (fs.existsSync('all-migration-summary.json')) {
      const summary = JSON.parse(fs.readFileSync('all-migration-summary.json', 'utf8'));
      console.log('📋 Summary:', summary);
    }

  } catch (e) {
    console.log('❌ Error reading progress:', e.message);
  }
}

// Show progress every 10 seconds
setInterval(showProgress, 10000);
showProgress(); // Show immediately

console.log('🔍 Monitoring migration progress... (Ctrl+C to stop)');
