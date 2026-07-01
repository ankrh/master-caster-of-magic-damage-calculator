const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const targetPath = '/index.html';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function describeError(err) {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.stack || err.message || String(err);
  if (typeof err === 'string') return err;
  try {
    const json = JSON.stringify(err);
    if (json && json !== '{}') return json;
  } catch (_) {
    // Fall through.
  }
  return String(err);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    });
    res.end(data);
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const cleanPath = reqPath === '/' ? '/index.html' : reqPath;
      const filePath = path.join(repoRoot, cleanPath);
      if (!filePath.startsWith(repoRoot)) {
        res.writeHead(403, { 'Cache-Control': 'no-store' });
        res.end('Forbidden');
        return;
      }
      sendFile(res, filePath);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function launchChrome(targetUrl, debugPort, userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const stderr = [];
  const child = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${debugPort}`,
    targetUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  child.stderr.on('data', chunk => {
    stderr.push(chunk.toString());
  });

  child.stderrLog = stderr;
  return child;
}

async function waitForTarget(targetUrl, debugPort, chrome, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (chrome.exitCode != null) {
      const stderrText = (chrome.stderrLog || []).join('').trim();
      const details = stderrText ? `\nChrome stderr:\n${stderrText}` : '';
      throw new Error(`Chrome exited before exposing a debugger target (exit code ${chrome.exitCode}).${details}`);
    }

    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const pages = await res.json();
      const page = pages.find(p =>
        p.webSocketDebuggerUrl &&
        (p.url === targetUrl || p.url.startsWith(targetUrl) || p.url.includes(targetPath))
      );
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (_) {
      // Chrome may not be ready yet.
    }
    await sleep(250);
  }
  const stderrText = chrome && chrome.stderrLog ? chrome.stderrLog.join('').trim() : '';
  const details = stderrText ? `\nChrome stderr:\n${stderrText}` : '';
  throw new Error(`Timed out waiting for Chrome debugger target on port ${debugPort}.${details}`);
}

async function cdpEvaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    let settled = false;
    let lastPageException = null;
    const timer = setTimeout(() => {
      settled = true;
      ws.close();
      reject(new Error('Timed out waiting for CDP result'));
    }, 30000);

    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      reject(err instanceof Error ? err : new Error(describeError(err)));
    }

    function send(method, params = {}) {
      ws.send(JSON.stringify({ id: nextId++, method, params }));
    }

    ws.addEventListener('open', () => {
      send('Runtime.enable');
      setTimeout(() => {
        send('Runtime.evaluate', {
          expression: `(() => {
            if (document.readyState === 'complete') return Promise.resolve();
            return new Promise(resolve =>
              window.addEventListener('load', () => resolve(), { once: true })
            );
          })().then(() => (${expression}))`,
          awaitPromise: true,
          returnByValue: true,
        });
      }, 1500);
    });

    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        lastPageException = msg.params?.exceptionDetails?.exception?.description
          || msg.params?.exceptionDetails?.text
          || JSON.stringify(msg.params?.exceptionDetails || {});
        return;
      }
      if (msg.id !== 2) return;
      settled = true;
      clearTimeout(timer);
      ws.close();
      if (msg.result && msg.result.exceptionDetails) {
        const details = msg.result.exceptionDetails;
        const exception = details.exception || {};
        const description = exception.description
          || exception.value
          || details.text
          || describeError(details);
        reject(new Error(description));
        return;
      }
      resolve(msg.result?.result?.value);
    });

    ws.addEventListener('error', err => {
      const pageSuffix = lastPageException ? `\nLast page exception: ${lastPageException}` : '';
      fail(new Error(`WebSocket error: ${describeError(err)}${pageSuffix}`));
    });

    ws.addEventListener('close', event => {
      if (settled) return;
      const reason = event.reason ? `, reason: ${event.reason}` : '';
      const pageSuffix = lastPageException ? `\nLast page exception: ${lastPageException}` : '';
      fail(new Error(`WebSocket closed before CDP result (code ${event.code}${reason})${pageSuffix}`));
    });
  });
}

async function main() {
  const mode = process.argv[2] || 'cancelled-tohit';
  const server = await startServer();
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}${targetPath}`;
  const debugPort = await getFreePort();
  const userDataDir = path.join(repoRoot, '.playwright-mcp', `chrome-headless-${process.pid}-${Date.now()}`);
  const chrome = launchChrome(targetUrl, debugPort, userDataDir);

  try {
    const wsUrl = await waitForTarget(targetUrl, debugPort, chrome);
    if (mode === 'matrix-refresh-reset') {
      await cdpEvaluate(wsUrl, `(() => {
        document.getElementById('matrixAttackerNameFilter').value = 'Life';
        document.getElementById('matrixDefenderNameFilter').value = 'Death';
        document.getElementById('matrixSortDefenders').checked = false;
        document.getElementById('matrixSortAttackers').checked = false;
        window.setTimeout(() => window.location.reload(), 0);
        return true;
      })()`);
      await sleep(1500);
      const result = await cdpEvaluate(wsUrl, `(() => ({
        attackerFilter: document.getElementById('matrixAttackerNameFilter').value,
        defenderFilter: document.getElementById('matrixDefenderNameFilter').value,
        sortDefenders: document.getElementById('matrixSortDefenders').checked,
        sortAttackers: document.getElementById('matrixSortAttackers').checked
      }))()`);
      console.log(JSON.stringify(result));
      return;
    }
    const expressions = {
      'cancelled-tohit': `(() => {
        document.getElementById('gameVersion').value = 'mom_1.31';
        onVersionChange();
        document.getElementById('aToHitMod').value = 20;
        document.getElementById('warpReality').checked = true;
        document.getElementById('aAbil_unitType').value = 'normal';
        recalculate();
        const el = document.getElementById('aToHitMeleeMod');
        return {
          text: el.textContent,
          visible: el.classList.contains('visible')
        };
      })()`,
      'run-tests': `runTests()`,
      'type-suffixes': `(() => {
        document.getElementById('gameVersion').value = 'com2_1.05.11';
        onVersionChange();
        document.getElementById('aAbil_unitType').value = 'fantastic_chaos';
        updateTypeVisibility();
        const labels = {};
        for (const key of ['flameBlade', 'destiny', 'landLinking', 'lionheart']) {
          const item = document.querySelector('#aAbilities [data-abil-key="' + key + '"]');
          labels[key] = item ? item.textContent.replace(/\\s+/g, ' ').trim() : null;
        }
        return {
          flameBladeDisabled: document.getElementById('aAbil_flameBlade').disabled,
          destinyDisabled: document.getElementById('aAbil_destiny').disabled,
          landLinkingDisabled: document.getElementById('aAbil_landLinking').disabled,
          labels
        };
      })()`,
      'disabled-tooltips': `(() => {
        function hoverText(id) {
          const el = document.getElementById(id);
          const rect = el.getBoundingClientRect();
          document.dispatchEvent(new MouseEvent('mousemove', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            bubbles: true
          }));
          return document.getElementById('tt').textContent;
        }

        document.getElementById('rangedCheck').checked = false;
        updateTypeVisibility();
        const rangedDisabled = document.getElementById('rangedDist').disabled;
        const rangedTooltip = hoverText('rangedDist');

        document.getElementById('gameVersion').value = 'mom_1.31';
        onVersionChange();
        const armorDisabled = document.getElementById('aArmor').disabled;
        const armorTooltip = hoverText('aArmor');

        const chaosTooltip = hoverText('chaosSurge');

        return { rangedDisabled, rangedTooltip, armorDisabled, armorTooltip, chaosTooltip };
      })()`,
      'matrix-live-filter': `(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const rowCount = () => document.querySelectorAll('#matrixTableWrap tbody tr').length;
        document.getElementById('meleeMatrixBtn').click();
        // The matrix builds asynchronously in workers; wait for the table to appear.
        for (let i = 0; i < 100 && rowCount() === 0; i++) await sleep(200);
        const allRows = rowCount();
        const applyButtonMissing = !document.getElementById('matrixApplyNameFilters');
        const filter = document.getElementById('matrixAttackerNameFilter');
        filter.value = 'Life';
        filter.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(400); // filter rerender is debounced (150ms)
        const filteredRows = rowCount();
        const firstHeader = document.querySelector('#matrixTableWrap tbody th')?.textContent || '';
        document.getElementById('matrixClose').click();
        return { allRows, filteredRows, firstHeader, applyButtonMissing };
      })()`,
      'matrix-reset-controls': `(() => {
        const attackerFilter = document.getElementById('matrixAttackerNameFilter');
        const defenderFilter = document.getElementById('matrixDefenderNameFilter');
        const sortDefenders = document.getElementById('matrixSortDefenders');
        const sortAttackers = document.getElementById('matrixSortAttackers');
        attackerFilter.value = 'Life';
        defenderFilter.value = 'Death';
        sortDefenders.checked = false;
        sortAttackers.checked = false;
        resetMeleeMatrixControls();
        return {
          attackerFilter: attackerFilter.value,
          defenderFilter: defenderFilter.value,
          sortDefenders: sortDefenders.checked,
          sortAttackers: sortAttackers.checked
        };
      })()`,
    };

    const expression = expressions[mode];
    if (!expression) throw new Error(`Unknown mode: ${mode}`);

    const result = await cdpEvaluate(wsUrl, expression);
    console.log(JSON.stringify(result));
  } finally {
    server.close();
    chrome.kill('SIGKILL');
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_) {
      // Chrome can keep temporary files locked briefly after kill on Windows.
    }
  }
}

main().catch(err => {
  console.error(err.stack || String(err));
  process.exit(1);
});
