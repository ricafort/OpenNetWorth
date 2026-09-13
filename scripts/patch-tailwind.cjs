/**
 * Why this file exists:
 * In Next.js 16 with Turbopack, virtual CSS modules or chunk compilations invoke PostCSS
 * without passing `from` (`opts.from` is undefined or "").
 * In `@tailwindcss/postcss`, `c` is computed as `path.dirname(path.resolve(u))`.
 * When `u` is `""`, `path.resolve("")` is `process.cwd()` (e.g. `D:\LocalVersions\OpenNetWorth`),
 * and `path.dirname` moves UP to the parent directory (`D:\LocalVersions`).
 * Enhanced-resolve then fails to find `tailwindcss` in `D:\LocalVersions\node_modules` (which does not exist),
 * throwing `Error: Can't resolve 'tailwindcss' in 'D:\LocalVersions'`.
 * This causes Next.js to fail to load or deliver CSS on initial page loads or refreshes,
 * resulting in an unstyled page ("Times New Roman" FOUC) until a subsequent refresh.
 *
 * This script patches `@tailwindcss/postcss` so that if `u` is empty or resolves to `cwd`,
 * `base` falls back to `process.cwd()` directly instead of its parent directory.
 */

const fs = require('fs');
const path = require('path');

const targets = [
  {
    filePath: path.join(__dirname, '..', 'node_modules', '@tailwindcss', 'postcss', 'dist', 'index.js'),
    targetStr: 'let c=$.default.dirname($.default.resolve(u));',
    replaceStr: 'let c=(u&&$.default.resolve(u)!==process.cwd())?$.default.dirname($.default.resolve(u)):process.cwd();'
  },
  {
    filePath: path.join(__dirname, '..', 'node_modules', '@tailwindcss', 'postcss', 'dist', 'index.mjs'),
    targetStr: 'let c=D.dirname(D.resolve(u));',
    replaceStr: 'let c=(u&&D.resolve(u)!==process.cwd())?D.dirname(D.resolve(u)):process.cwd();'
  }
];

let patchedCount = 0;

for (const target of targets) {
  if (!fs.existsSync(target.filePath)) {
    console.log(`[patch-tailwind] Skipping non-existent: ${target.filePath}`);
    continue;
  }

  let content = fs.readFileSync(target.filePath, 'utf8');
  if (content.includes(target.replaceStr)) {
    console.log(`[patch-tailwind] Already patched: ${path.basename(target.filePath)}`);
    patchedCount++;
    continue;
  }

  if (content.includes(target.targetStr)) {
    content = content.replace(target.targetStr, target.replaceStr);
    fs.writeFileSync(target.filePath, content, 'utf8');
    console.log(`[patch-tailwind] Successfully patched: ${path.basename(target.filePath)}`);
    patchedCount++;
  } else {
    console.warn(`[patch-tailwind] Target string not found in: ${path.basename(target.filePath)}`);
  }
}

console.log(`[patch-tailwind] Completed. Patched ${patchedCount} files.`);
