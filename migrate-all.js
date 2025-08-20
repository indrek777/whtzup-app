const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE_URL = 'http://localhost:4000';
const PROGRESS_FILE = 'all-migration-progress.txt';
const SUMMARY_FILE = 'all-migration-summary.json';

function logProgress(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  try { fs.appendFileSync(PROGRESS_FILE, stamped + '\n'); } catch (_) {}
  console.log(stamped);
}

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 20000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function generateDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function transformEvent(appEvent) {
  const transformed = {
    name: String(appEvent.name || 'Untitled Event').trim(),
    description: String(appEvent.description || '').trim(),
    category: String(appEvent.category || 'other').trim(),
    venue: String(appEvent.venue || 'Unknown Venue').trim(),
    address: String(appEvent.address || '').trim(),
    latitude: parseFloat(appEvent.latitude) || 0,
    longitude: parseFloat(appEvent.longitude) || 0,
    createdBy: String(appEvent.createdBy || 'Migration Script').trim()
  };

  if (appEvent.startsAt) {
    const d = new Date(appEvent.startsAt);
    transformed.startsAt = isNaN(d.getTime()) ? new Date(Date.now() + 86400000).toISOString() : d.toISOString();
  } else {
    transformed.startsAt = new Date(Date.now() + 86400000).toISOString();
  }
  return transformed;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function migrateAll() {
  // reset progress
  try { fs.writeFileSync(PROGRESS_FILE, ''); } catch (_) {}

  logProgress('Starting full migration...');

  // API ready check
  for (let i = 0; i < 30; i++) {
    try { const h = await makeRequest('/health'); if (h.status === 200) break; } catch {}
    await sleep(2000);
  }

  // read data
  const dataPath = path.join(__dirname, 'src', 'data', 'events-data.json');
  if (!fs.existsSync(dataPath)) {
    logProgress('ERROR: events-data.json not found');
    return;
  }
  const eventsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const total = eventsData.length;
  logProgress(`Loaded ${total} events`);

  const deviceId = generateDeviceId();

  // fetch current events for duplicate skip
  logProgress('Fetching current events from API...');
  let existing = [];
  try {
    const res = await makeRequest('/api/events');
    existing = (res.data && res.data.data) ? res.data.data : [];
    logProgress(`API returned ${existing.length} existing events`);
  } catch (e) {
    logProgress(`WARN: Failed to fetch existing events: ${e.message}`);
  }

  const existingKey = new Set(existing.map(e => `${(e.name||'').trim()}|${(e.venue||'').trim()}`));

  let ok = 0, skip = 0, fail = 0, processed = 0;
  const batchDelayMs = 5; // migration speed; server rate limit is disabled

  for (const appEvent of eventsData) {
    processed++;
    const key = `${String(appEvent.name||'').trim()}|${String(appEvent.venue||'').trim()||'Unknown Venue'}`;
    if (existingKey.has(key)) {
      skip++;
      if ((processed % 200) === 0) logProgress(`Progress ${processed}/${total} (ok=${ok}, skip=${skip}, fail=${fail})`);
      continue;
    }

    const payload = transformEvent(appEvent);

    // retry with backoff
    let attempts = 0;
    let success = false;
    while (attempts < 5 && !success) {
      attempts++;
      try {
        const resp = await makeRequest('/api/events', 'POST', payload, { 'X-Device-ID': deviceId });
        if (resp.status === 201 || (resp.data && resp.data.success)) {
          ok++;
          existingKey.add(key);
          success = true;
        } else if (resp.status === 400) {
          fail++;
          logProgress(`VALIDATION FAIL (${processed}): ${appEvent.name} -> ${JSON.stringify(resp.data)}`);
          break;
        } else if (resp.status === 429) {
          const wait = 500 * attempts;
          logProgress(`429 rate limited, retrying in ${wait}ms (attempt ${attempts})`);
          await sleep(wait);
        } else {
          fail++;
          logProgress(`FAIL (${processed}): status=${resp.status} body=${JSON.stringify(resp.data).slice(0,200)}`);
          break;
        }
      } catch (e) {
        const wait = 400 * attempts;
        logProgress(`ERROR (${processed}): ${e.message}. retry in ${wait}ms`);
        await sleep(wait);
      }
    }

    if ((processed % 200) === 0) {
      logProgress(`Progress ${processed}/${total} (ok=${ok}, skip=${skip}, fail=${fail})`);
      try { fs.writeFileSync(SUMMARY_FILE, JSON.stringify({ processed, total, ok, skip, fail }, null, 2)); } catch (_) {}
    }

    await sleep(batchDelayMs);
  }

  logProgress(`DONE: processed=${processed} ok=${ok} skip=${skip} fail=${fail}`);
  try { fs.writeFileSync(SUMMARY_FILE, JSON.stringify({ processed, total, ok, skip, fail }, null, 2)); } catch (_) {}
}

if (require.main === module) {
  migrateAll().catch(err => {
    logProgress('FATAL: ' + err.message);
  });
}
