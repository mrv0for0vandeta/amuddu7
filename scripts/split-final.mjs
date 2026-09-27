#!/usr/bin/env node
/**
 * Split migration SQL files into chunks under 30KB for execute_sql.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migDir = join(__dirname, 'migration');
const chunkDir = join(__dirname, 'final_chunks');
mkdirSync(chunkDir, { recursive: true });

const MAX_SIZE = 28000;
let chunkNum = 0;

for (const file of ['providers.sql', 'listings.sql', 'prices.sql']) {
  const sql = readFileSync(join(migDir, file), 'utf-8');
  const statements = sql.split('\n').filter(s => s.trim().startsWith('INSERT'));
  
  let current = '';
  for (const stmt of statements) {
    if (current.length + stmt.length + 1 > MAX_SIZE && current.length > 0) {
      writeFileSync(join(chunkDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), current);
      chunkNum++;
      current = '';
    }
    current += stmt + '\n';
  }
  if (current.length > 0) {
    writeFileSync(join(chunkDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), current);
    chunkNum++;
  }
}

console.log(`Created ${chunkNum} chunk files`);
// Show sizes
const files = readdirSync(chunkDir).sort();
for (const f of files.slice(0, 5)) {
  const sz = readFileSync(join(chunkDir, f), 'utf-8').length;
  console.log(`  ${f}: ${sz} bytes`);
}
console.log(`  ... (${files.length} total)`);
