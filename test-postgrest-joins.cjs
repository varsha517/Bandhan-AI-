const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"](.*)['"]$/, '$1');
    env[match[1]] = value;
  }
}

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function testJsonFilter() {
  const dummyDatasetId = '00000000-0000-0000-0000-000000000000';
  const res = await fetch(`${url}/rest/v1/campaigns?select=*&audience_filter->>dataset_id=eq.${dummyDatasetId}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log(`[${res.status}] campaigns json filter: ${res.status === 200 ? 'OK' : await res.text()}`);
}

testJsonFilter();
