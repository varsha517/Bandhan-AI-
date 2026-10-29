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

async function checkRpc() {
  const rpcs = ['seed_demo_data', 'exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const r of rpcs) {
    const res = await fetch(`${url}/rest/v1/rpc/${r}`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log(`RPC ${r}: status ${res.status}`, await res.text());
  }
}

checkRpc();
