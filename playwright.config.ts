import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright config — QA tests fitur Meja Kendali (Story 1 & 2).
 *
 * ISOLASI DB (walkthrough 324ad1b #6): server test dan test client memakai
 * file DB terpisah (data/test-e2e.db), BUKAN data/assistant.db produksi.
 * `process.env.DB_PATH` dibaca oleh src/lib/db/index.ts (server) dan oleh
 * test API yang seed artifact langsung ke DB.
 *
 * Port 3100 (bukan 3000): server test selalu dinyalakan sendiri dengan
 * DB_PATH test — reuseExistingServer dimatikan agar tidak pernah memakai
 * dev server yang memakai assistant.db.
 * Semua data test ber-prefix "QA-" unik dan dihapus via API di cleanup.
 */
const TEST_DB = path.join(__dirname, 'data', 'test-e2e.db');
process.env.DB_PATH = TEST_DB;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DB_PATH: TEST_DB },
  },
});
