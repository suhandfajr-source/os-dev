import { defineConfig } from '@playwright/test';

/**
 * Playwright config — QA tests untuk fitur Meja Kendali (Story 1).
 * Port 3000 (port dev standar): jika dev server sudah jalan, dipakai;
 * jika belum, Playwright menyalakannya otomatis.
 * Catatan: DB tidak di-mock (hardcode ke data/assistant.db), jadi semua data test
 * memakai penanda "QA-" unik dan dihapus lewat API di cleanup.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
