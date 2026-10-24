import { defineConfig, devices } from '@playwright/test';

// The suite runs against the production build (`astro build`, base path /Tivi-Dev/) served by `astro preview`.
// `npm run test:e2e` builds first; `--ignore-lock` keeps `astro preview` in the foreground for Playwright.
const port = 4329;
const baseURL = `http://127.0.0.1:${port}/Tivi-Dev/`;
const smartphone = { ...devices['Pixel 7'], deviceScaleFactor: 2 };
const layoutSpecs = /(layout|accessibility)\.spec\.ts/;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'smartphone', use: { ...smartphone, viewport: { width: 375, height: 667 } } },
    { name: 'smartphone-landscape', use: { ...smartphone, viewport: { width: 740, height: 360 } } },
    // Layout and accessibility checks only; the navigation suite stays on the three viewports above.
    { name: 'tablet', testMatch: layoutSpecs, use: { ...devices['iPad Mini'], browserName: 'chromium', viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 } },
    { name: 'smartphone-320', testMatch: layoutSpecs, use: { ...smartphone, viewport: { width: 320, height: 640 } } },
    // 200 % browser zoom on a 1440×900 screen: the page lays out in 720×450 CSS pixels at twice the pixel density.
    { name: 'zoom-200', testMatch: layoutSpecs, use: { ...devices['Desktop Chrome'], viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${port} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
