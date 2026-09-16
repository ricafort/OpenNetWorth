/**
 * Isolated Browser-Test Launch Runner
 * 
 * Why this file exists:
 * Provides a 100% repeatable command (`npm run dev:test`) to launch the OpenNetWorth
 * web application with an isolated test database (`data/test_browser_vault.sqlite`)
 * and fictional fixtures.
 * 
 * Tricky logic:
 * - Pre-seeds the isolated database and explicitly sets `OPENNETWORTH_DB_PATH`.
 * - Forwards process signals (SIGINT / SIGTERM) to cleanly terminate the child Next.js process.
 * - Protects live vault: will fail immediately if OPENNETWORTH_DB_PATH resolves to the production vault.
 * 
 * TODO: Add automatic headless browser runner integration (e.g. Playwright) if full CI browser tests are added.
 */

import { spawn } from 'child_process';
import path from 'path';
import { seedBrowserTestFixtures, TEST_VAULT_PATH } from './seed-browser-test-fixtures';

const port = process.env.PORT || '4005';
const distDir = process.env.NEXT_DIST_DIR || '.next-test';

console.log('================================================================');
console.log('  OpenNetWorth — Isolated Browser Testing Environment');
console.log('================================================================');
console.log(`[Safety Guard] Live vault (data/opennetworth.sqlite) is PROTECTED.`);
console.log(`[Database] Initializing isolated fixture vault: ${TEST_VAULT_PATH}`);

seedBrowserTestFixtures(TEST_VAULT_PATH);

console.log(`[Server] Spawning Next.js test server on http://localhost:${port} (distDir: ${distDir}) ...`);

const child = spawn('npx', ['next', 'dev', '-p', port], {
    shell: true,
    stdio: 'inherit',
    env: {
        ...process.env,
        PORT: port,
        NEXT_DIST_DIR: distDir,
        OPENNETWORTH_DB_PATH: TEST_VAULT_PATH
    }
});

child.on('close', (code) => {
    console.log(`Next.js test server exited with code ${code}`);
    process.exit(code ?? 0);
});

process.on('SIGINT', () => {
    child.kill('SIGINT');
});

process.on('SIGTERM', () => {
    child.kill('SIGTERM');
});
