// Playwright UI-test config. Serves the repo root through the no-cache dev
// server so tests never see stale JS (same reason as the manual workflow in
// CLAUDE.md). Uses the installed Chrome instead of a downloaded browser.
const { defineConfig } = require('@playwright/test');

const PYTHON = `${process.env.LOCALAPPDATA}\\Python\\pythoncore-3.14-64\\python.exe`;
const rawPort = process.env.PLAYWRIGHT_PORT || process.env.PORT || '8080';
const PORT = Number.parseInt(rawPort, 10);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error(`Invalid Playwright server port: ${rawPort}`);
}
const HOST = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // Parallelize across files but keep each file's tests in order: specs share no state
  // (fresh context per test, localStorage cleared in openCalculator) but several build up
  // state across steps within a file. The dev server is a ThreadingHTTPServer, so concurrent
  // loads are fine; a parallel worktree needs its own PLAYWRIGHT_PORT, not fewer workers.
  fullyParallel: false,
  // Measured on this 8-core laptop over repeated whole-suite runs: ~148s serial, ~115s at 2.
  // The tests are CPU-bound in-page combat resolution, so oversubscribing starves the long
  // presets run (33s alone, 72s against three siblings); one 4-worker sample came in at 163s,
  // slower than serial. Re-measure before raising this.
  workers: 2,
  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: `"${PYTHON}" tools/nocache_server.py --host ${HOST} --port ${PORT}`,
    url: `${BASE_URL}/`,
    // Reusing a server is opt-in. In parallel worktrees, silently attaching
    // to another checkout's server produces valid-looking but wrong tests.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING === '1',
    timeout: 15_000,
  },
});
