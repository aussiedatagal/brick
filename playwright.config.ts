import { defineConfig, devices } from '@playwright/test';

// Use deployed site URL if DEPLOYED_URL env var is set, otherwise use local
const baseURL = process.env.DEPLOYED_URL || (process.env.CI ? 'http://localhost:4173/brick' : 'http://localhost:5173');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],
  // Only start web server if testing locally (not against deployed site)
  webServer: process.env.DEPLOYED_URL
    ? undefined
    : process.env.CI
    ? {
        command: 'npm run preview',
        url: 'http://localhost:4173/brick/',
        reuseExistingServer: false,
        timeout: 120000, // 2 minutes for CI
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
      },
});

