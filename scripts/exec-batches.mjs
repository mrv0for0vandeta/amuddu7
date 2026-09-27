#!/usr/bin/env node
/**
 * Execute SQL batch files via the exec-sql edge function.
 */
import { readFileSync, readdirSync } from 'fs';

const SUPABASE_URL = 'https://yyttqrnswcwunlycsxet.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dHRxcm5zd2N3dW5seWNzeGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDkwMDEsImV4cCI6MjEwMDc4NTAwMX0.S89U4WnLa6KjL6-qL0QklmLIwtcx5WaDmG50pKQwLRk';

const dir = '/tmp/cc-agent/69351405/project/scripts/migration';
const files = readdirSync(dir)
  .filter(f => f.match(/^v6_batch_\d+\.sql$/))
  .sort();

console.log(`Found ${files.length} batch files`);

let success = 0;
let failed = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const sql = readFileSync(`${dir}/${file}`, 'utf-8');

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/exec-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ sql }),
    });

    const result = await resp.json();

    if (!resp.ok || result.error) {
      console.error(`[${i+1}/${files.length}] ${file}: FAILED - ${result.error || resp.status}`);
      failed++;
    } else {
      success++;
      if ((i + 1) % 10 === 0 || i === files.length - 1) {
        console.log(`[${i+1}/${files.length}] ${file}: OK (${success} success, ${failed} failed)`);
      }
    }
  } catch (err) {
    console.error(`[${i+1}/${files.length}] ${file}: ERROR - ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${success} success, ${failed} failed out of ${files.length} total`);
