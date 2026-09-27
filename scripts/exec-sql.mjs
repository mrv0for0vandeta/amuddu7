#!/usr/bin/env node
/**
 * Execute generated SQL batch files directly via Supabase REST API.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, 'sql');

const SUPABASE_URL = 'https://yyttqrnswcwunlycsxet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dHRxcm5zd2N3dW5seWNzeGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDkwMDEsImV4cCI6MjEwMDc4NTAwMX0.S89U4WnLa6KjL6-qL0QklmLIwtcx5WaDmG50pKQwLRk';

async function executeSql(sql) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  return resp;
}

// Use the pg connection string directly
const DB_URL = 'postgresql://postgres.yyttqrnswcwunlycsxet:postgres@db.yyttqrnswcwunlycsxet.supabase.co:5432/postgres';

async function main() {
  const files = readdirSync(sqlDir)
    .filter(f => f.startsWith('batch_') && f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} batch files`);

  for (const file of files) {
    const sql = readFileSync(join(sqlDir, file), 'utf-8');
    console.log(`Executing ${file} (${sql.length} bytes)...`);

    try {
      // Use the Supabase SQL endpoint via fetch
      const resp = await fetch(`${SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`  ERROR: ${resp.status} ${text.substring(0, 200)}`);
      } else {
        console.log(`  OK`);
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }
  }
}

main().catch(console.error);
