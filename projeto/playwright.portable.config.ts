import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/cinema',
  outputDir: 'test-results-portable',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    offline: true,
    // Embedded MP4 data URLs produce excessive trace snapshots; keep failure screenshots.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
