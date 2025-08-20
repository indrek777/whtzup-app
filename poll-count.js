const http = require('http');
const fs = require('fs');

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:4000');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

(async () => {
  try {
    const res = await makeRequest('/api/events');
    const events = res.data && res.data.data ? res.data.data : [];
    const count = events.length || 0;
    const line = `count=${count} status=${res.status} time=${new Date().toISOString()}`;
    fs.writeFileSync('events-count.txt', line);
    console.log(line);
  } catch (e) {
    const line = `error=${e.message} time=${new Date().toISOString()}`;
    fs.writeFileSync('events-count.txt', line);
    console.log(line);
  }
})();
