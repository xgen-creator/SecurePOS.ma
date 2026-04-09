import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ScanBell E2E Tests
 * Tests the critical flow: Scan QR → Visitor WebApp → Call → Owner Reception
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }]
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Desktop Chrome (Owner view)
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    // Mobile Safari (Visitor view - simulates phone scanning QR)
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 14 Pro'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ScanBell-Test-Agent'
      },
    },
    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 7'],
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) ScanBell-Test-Agent'
      },
    },
  ],
  webServer: {
    command: 'cd ../apps/web && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
