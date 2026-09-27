#!/usr/bin/env node
/**
 * Execute all SQL batch files directly via PostgreSQL connection.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, 'sql');

const DB_URL = 'postgresql://postgres.yyttqrnswcwunlycsxet:postgres@db.yyttqrnswcwunlycsxet.supabase.co:5432/postgres';

async function main() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected!');

  const files = readdirSync(sqlDir)
    .filter(f => f.startsWith('batch_') && f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} batch files`);

  let totalStatements = 0;
  for (const file of files) {
    const sql = readFileSync(join(sqlDir, file), 'utf-8');
    const stmts = sql.split(/;\n/).filter(s => s.trim().length > 0);
    totalStatements += stmts.length;
    
    console.log(`Executing ${file} (${stmts.length} statements, ${sql.length} bytes)...`);
    try {
      await client.query(sql);
      console.log('  OK');
    } catch (e) {
      console.error(`  ERROR: ${e.message.substring(0, 200)}`);
      // Try individual statements
      for (const stmt of stmts) {
        try {
          await client.query(stmt + ';');
        } catch (e2) {
          console.error(`  STMT ERROR: ${e2.message.substring(0, 150)}`);
        }
      }
    }
  }

  console.log(`\nTotal statements executed: ${totalStatements}`);
  await client.end();
  console.log('Done!');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
