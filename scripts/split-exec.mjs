#!/usr/bin/env node
/**
 * Split multi-row INSERT SQL into chunks under 25KB.
 * Each chunk contains complete INSERT statements.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'exec_chunks');
mkdirSync(outDir, { recursive: true });

const MAX_SIZE = 25000;
let chunkNum = 0;

for (const file of ['providers_multi.sql', 'listings_multi.sql', 'prices_multi.sql']) {
  const sql = readFileSync(join(__dirname, 'migration', file), 'utf-8');
  // Split on INSERT statements (each ends with ON CONFLICT (id) DO NOTHING;)
  const statements = sql.split(/;\n(?=INSERT)/);
  
  let current = '';
  for (const stmt of statements) {
    const full = stmt.trimEnd() + ';\n';
    if (current.length + full.length > MAX_SIZE && current.length > 0) {
      writeFileSync(join(outDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), current);
      chunkNum++;
      current = '';
    }
    current += full;
  }
  if (current.length > 0) {
    writeFileSync(join(outDir, `chunk_${String(chunkNum).padStart(4, '0')}.sql`), current);
    chunkNum++;
  }
}

console.log(`Created ${chunkNum} exec chunks`);
