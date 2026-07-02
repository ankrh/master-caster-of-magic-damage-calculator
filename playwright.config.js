// Playwright UI-test config. Serves the repo root through the no-cache dev
// server so tests never see stale JS (same reason as the manual workflow in
// CLAUDE.md). Uses the installed Chrome instead of a downloaded browser.
const { defineConfig } = require('@playwright/test');

const PYTHON = `${process.env.LOCALAPPDATA}\\Python\\pythoncore-3.14-64\\python.exe`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1, // single laptop, single server port — keep runs serial
  use: {
    baseURL: 'http://localhost:8080',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: `"${PYTHON}" tools/nocache_server.py`,
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
