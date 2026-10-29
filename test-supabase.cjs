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

console.log('Testing Supabase REST endpoint:', url);
console.log('Key length:', key?.length);

async function test() {
  const tables = [
    'profiles', 'uploaded_datasets', 'customers', 'transactions',
    'segments', 'churn_predictions', 'loyalty_accounts', 'membership_tiers',
    'rewards', 'sentiments', 'recommendations', 'campaigns', 'campaign_recipients',
    'notifications', 'reports', 'audit_logs'
  ];
  for (const t of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${t}?select=count`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Range-Unit': 'items',
          'Range': '0-0',
          'Prefer': 'count=exact'
        }
      });
      const range = res.headers.get('content-range');
      if (res.ok) {
        console.log(`[OK] Table "${t}": count=${range}`);
      } else {
        const text = await res.text();
        console.log(`[ERR ${res.status}] Table "${t}": ${text}`);
      }
    } catch (e) {
      console.log(`[EXCEPTION] Table "${t}": ${e.message}`);
    }
  }

  // Check edge function
  try {
    const ef = await fetch(`${url}/functions/v1/send-campaign`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_connection' })
    });
    console.log('Edge function send-campaign HTTP status:', ef.status);
    console.log('Response:', await ef.text());
  } catch (e) {
    console.log('Edge function error:', e.message);
  }
}

test();
