#!/usr/bin/env node
/**
 * Split batch SQL files into smaller chunks for execute_sql.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, 'sql');
const chunkDir = join(__dirname, 'chunks');
mkdirSync(chunkDir, { recursive: true });

const files = readdirSync(sqlDir)
  .filter(f => f.startsWith('batch_') && f.endsWith('.sql'))
  .sort();

let chunkNum = 0;
const MAX_CHUNK_SIZE = 30000; // ~30KB per chunk

for (const file of files) {
  const sql = readFileSync(join(sqlDir, file), 'utf-8');
  // Split into individual statements
  const statements = sql.split(/;\n/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  for (const stmt of statements) {
    if (currentChunk.length + stmt.length + 2 > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      writeFileSync(join(chunkDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), currentChunk);
      chunkNum++;
      currentChunk = '';
    }
    currentChunk += stmt + ';\n';
  }
  if (currentChunk.length > 0) {
    writeFileSync(join(chunkDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), currentChunk);
    chunkNum++;
  }
}

console.log(`Created ${chunkNum} chunk files`);
