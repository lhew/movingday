/**
 * Post-build compression script.
 * Generates .gz (gzip level 9) and .br (Brotli quality 11) siblings
 * for every compressible static asset in dist/movingday/browser/.
 *
 * Firebase Hosting auto-detects and serves .br/.gz files alongside originals,
 * sending the correct Content-Encoding header based on Accept-Encoding.
 *
 * Usage: node scripts/compress.mjs
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { createGzip, createBrotliCompress, constants as zlibConstants } from 'node:zlib';
import { join, extname, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';

const DIST_DIR = 'dist/movingday/browser';

const COMPRESSIBLE_EXTS = new Set([
  '.js', '.mjs', '.css', '.html', '.svg', '.json', '.txt', '.xml', '.map', '.avif',
]);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function compress(filePath) {
  const ext = extname(filePath).toLowerCase();

  // Skip files that are already compressed or not in our compressible list
  if (ext === '.gz' || ext === '.br' || !COMPRESSIBLE_EXTS.has(ext)) {
    return null;
  }

  const { size: originalSize } = await stat(filePath);

  // Skip tiny files (< 1 KB) — overhead not worth it
  if (originalSize < 1024) {
    return null;
  }

  await mkdir(dirname(filePath), { recursive: true });

  const gzipPath = `${filePath}.gz`;
  const brotliPath = `${filePath}.br`;

  await Promise.all([
    pipeline(
      createReadStream(filePath),
      createGzip({ level: 9 }),
      createWriteStream(gzipPath),
    ),
    pipeline(
      createReadStream(filePath),
      createBrotliCompress({
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: originalSize,
        },
      }),
      createWriteStream(brotliPath),
    ),
  ]);

  const [{ size: gzSize }, { size: brSize }] = await Promise.all([
    stat(gzipPath),
    stat(brotliPath),
  ]);

  return { originalSize, gzSize, brSize };
}

async function main() {
  console.log(`\nCompressing static assets in ${DIST_DIR}...\n`);

  let totalOriginal = 0;
  let totalGz = 0;
  let totalBr = 0;
  let fileCount = 0;

  for await (const filePath of walk(DIST_DIR)) {
    const result = await compress(filePath);
    if (!result) continue;

    const { originalSize, gzSize, brSize } = result;
    const gzRatio = ((1 - gzSize / originalSize) * 100).toFixed(1);
    const brRatio = ((1 - brSize / originalSize) * 100).toFixed(1);
    const rel = filePath.replace(DIST_DIR + '/', '');

    console.log(`  ${rel}`);
    console.log(`    gz:  ${kb(gzSize)} KB (-${gzRatio}%)   br: ${kb(brSize)} KB (-${brRatio}%)`);

    totalOriginal += originalSize;
    totalGz += gzSize;
    totalBr += brSize;
    fileCount++;
  }

  if (fileCount === 0) {
    console.log('No compressible files found. Did you run the build first?\n');
    process.exit(1);
  }

  const savingsGz = ((1 - totalGz / totalOriginal) * 100).toFixed(1);
  const savingsBr = ((1 - totalBr / totalOriginal) * 100).toFixed(1);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Compressed ${fileCount} files`);
  console.log(`  Original : ${kb(totalOriginal)} KB`);
  console.log(`  Gzip     : ${kb(totalGz)} KB  (${savingsGz}% smaller)`);
  console.log(`  Brotli   : ${kb(totalBr)} KB  (${savingsBr}% smaller)`);
  console.log(`${'─'.repeat(60)}\n`);
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

main().catch((err) => {
  console.error('Compression failed:', err);
  process.exit(1);
});
