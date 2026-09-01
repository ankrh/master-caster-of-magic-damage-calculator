// Durable Playwright/CDP harness for the full page-state persistence + shareable-URL
// feature (see "Reference docs/State persistence and sharing plan.md", Task D).
//
// Runs the Task D matrix against a no-cache server in headless Chrome:
//   - round-trip / perturb-restore across all five versions
//   - abilities of each kind (select / bool / num / numcheck) + full globals
//   - roster unit with a manual field edit (proves applyState uses syncUnitDisplay, not applyUnit)
//   - R8 source/base identity restored without persisted source/live IDs
//   - forward-compat: unknown id ignored, omitted id resolves to the version default
//   - localStorage read mirrors collectState; lz payload is URL-safe + round-trips; share
//     payload stays compact (default-diff + lz); legacy compressed/default-diff and full
//     plain-JSON localStorage still load
//   - URL: share link -> real reload -> identical damage + hash stripped; edited
//     localStorage wins on the next reload (precedence); malformed #s= falls back cleanly
//   - resilience: a well-formed blob carrying an uncomputable value (init guard) recovers to
//     defaults instead of crashing — bad localStorage is discarded (no re-crash loop), a bad
//     share link falls back to the recipient's own localStorage
//   - existing PRESETS suite (runTests) still all-pass (no regression from the recalc save hook)
//
// Usage: node tools/state_persistence_check.js
// Exits non-zero if any check fails. Plumbing mirrors tools/browser_check.js.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const targetPath = '/index.html';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function describeError(err) {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.stack || err.message || String(err);
  if (typeof err === 'string') return err;
  try { const json = JSON.stringify(err); if (json && json !== '{}') return json; } catch (_) {}
  return String(err);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
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
      const reqPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
      const cleanPath = reqPath === '/' ? '/index.html' : reqPath;
      const filePath = path.join(repoRoot, cleanPath);
      if (!filePath.startsWith(repoRoot)) { res.writeHead(403, { 'Cache-Control': 'no-store' }); res.end('Forbidden'); return; }
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
    probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
}

function launchChrome(targetUrl, debugPort, userDataDir) {
  fs.mkdirSync(userDataDir, { recursive: true });
  const stderr = [];
  const child = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${debugPort}`, targetUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', chunk => stderr.push(chunk.toString()));
  child.stderrLog = stderr;
  return child;
}

// Wait for a target that has actually *committed* the app document.
//
// `/json` publishes a target as soon as it exists, reporting the URL Chrome was asked to
// load — while the document is still the initial `about:blank`. That placeholder already
// has `readyState === 'complete'`, so cdpEvaluate's load guard would return instantly and
// every `getElementById` would come back null. Matching on the reported URL alone is
// therefore not enough; the target is only accepted once the page itself agrees it has
// left `about:blank`.
async function waitForTarget(targetUrl, debugPort, chrome, timeoutMs = 30000) {
  const start = Date.now();
  let lastHref = null;
  while (Date.now() - start < timeoutMs) {
    if (chrome.exitCode != null) {
      const stderrText = (chrome.stderrLog || []).join('').trim();
      throw new Error(`Chrome exited before exposing a debugger target (exit code ${chrome.exitCode}).${stderrText ? '\n' + stderrText : ''}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
      const pages = await res.json();
      const page = pages.find(p => p.webSocketDebuggerUrl &&
        (p.url === targetUrl || p.url.startsWith(targetUrl) || p.url.includes(targetPath)));
      if (page && page.webSocketDebuggerUrl) {
        // A probe, not the real evaluation: if the navigation commits mid-probe the
        // execution context is destroyed and this throws, which the retry absorbs.
        lastHref = await cdpEvaluate(page.webSocketDebuggerUrl, '(() => location.href)()');
        if (lastHref && lastHref !== 'about:blank') return page.webSocketDebuggerUrl;
      }
    } catch (_) { /* not ready yet, or context replaced mid-probe */ }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for Chrome to commit ${targetUrl} on debug port ${debugPort}`
    + `${lastHref ? ` (last document seen was ${lastHref})` : ''}.`);
}

// SIGKILL reaches only the launcher process on Windows: the browser and renderer processes
// survive, keep the profile directory locked so the cleanup below fails, and stay busy long
// enough to make the *next* run lose the navigation race above.
function killChrome(chrome) {
  if (process.platform === 'win32' && chrome.pid) {
    try {
      execFileSync('taskkill', ['/F', '/T', '/PID', String(chrome.pid)], { stdio: 'ignore' });
      return;
    } catch (_) { /* already gone, or taskkill unavailable — fall through */ }
  }
  chrome.kill('SIGKILL');
}

// Evaluate an expression in the page, waiting for load first. A fresh socket per call,
// but the tab's debugger endpoint (wsUrl) is stable across navigations, so this works
// before and after cdpNavigate.
function cdpEvaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1, settled = false, lastPageException = null;
    const timer = setTimeout(() => { settled = true; ws.close(); reject(new Error('Timed out waiting for CDP result')); }, 60000);
    const fail = err => {
      if (settled) return; settled = true; clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      reject(err instanceof Error ? err : new Error(describeError(err)));
    };
    const send = (method, params = {}) => ws.send(JSON.stringify({ id: nextId++, method, params }));
    ws.addEventListener('open', () => {
      send('Runtime.enable');
      setTimeout(() => {
        send('Runtime.evaluate', {
          expression: `(() => {
            if (document.readyState === 'complete') return Promise.resolve();
            return new Promise(resolve => window.addEventListener('load', () => resolve(), { once: true }));
          })().then(() => (${expression}))`,
          awaitPromise: true, returnByValue: true,
        });
      }, 500);
    });
    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        lastPageException = msg.params?.exceptionDetails?.exception?.description
          || msg.params?.exceptionDetails?.text || JSON.stringify(msg.params?.exceptionDetails || {});
        return;
      }
      if (msg.id !== 2) return;
      settled = true; clearTimeout(timer); ws.close();
      if (msg.result && msg.result.exceptionDetails) {
        const d = msg.result.exceptionDetails, ex = d.exception || {};
        reject(new Error(ex.description || ex.value || d.text || describeError(d)));
        return;
      }
      resolve(msg.result?.result?.value);
    });
    ws.addEventListener('error', err => fail(new Error(`WebSocket error: ${describeError(err)}${lastPageException ? '\nLast page exception: ' + lastPageException : ''}`)));
    ws.addEventListener('close', event => { if (!settled) fail(new Error(`WebSocket closed before CDP result (code ${event.code})`)); });
  });
}

// Force a full document load at `url` (real init path, hash included) and wait for the
// load event. A unique cache-buster query is injected before the fragment so the target
// always differs from the current URL by more than just the hash: a hash-only change is a
// same-document navigation and fires no load event (the init path wouldn't re-run, and the
// wait would hang). The app ignores the query (server strips it; stripHash preserves it via
// location.search, which the assertions don't inspect).
let _navCounter = 0;
function cdpNavigate(wsUrl, url) {
  const [base, frag] = url.split('#');
  const sep = base.includes('?') ? '&' : '?';
  const bustedUrl = base + sep + 'cb=' + (++_navCounter) + (frag !== undefined ? '#' + frag : '');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1, settled = false;
    const timer = setTimeout(() => { settled = true; ws.close(); reject(new Error('Timed out waiting for navigation')); }, 30000);
    const finish = () => { if (settled) return; settled = true; clearTimeout(timer); ws.close(); resolve(); };
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: nextId++, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: nextId++, method: 'Page.navigate', params: { url: bustedUrl } }));
    });
    ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Page.loadEventFired') setTimeout(finish, 400); // let init + first recalc settle
    });
    ws.addEventListener('error', err => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(describeError(err))); } });
    ws.addEventListener('close', () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('WebSocket closed before navigation completed')); } });
  });
}

// --- In-page harness (no navigation): returns { passed, total, results[] } ---
const MAIN_HARNESS = `(() => {
  const results = [];
  const log = (name, ok, detail) => results.push({ name, ok: !!ok, detail });
  // Programmatic writes must dispatch, or this harness tests a page state real use cannot
  // reach: ui.js hangs updateTypeVisibility/updateAbilityVisibility/recalculate off the
  // change handler, so a silent write skips the normalization every real interaction runs.
  const set = (id, val) => { const el = document.getElementById(id); if (!el) return false; if (el.type === 'checkbox') el.checked = !!val; else el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); return true; };
  const get = id => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
  const dist = () => (document.querySelector('#distA .dist-header')?.textContent || '') + '||' + (document.querySelector('#distB .dist-header')?.textContent || '');
  const clone = b => JSON.parse(JSON.stringify(b));
  // Read the versions off the live dropdown rather than restating them: a hardcoded copy
  // silently under-tests when a version is added, and this harness runs in the page anyway.
  const VERSIONS = Array.from(document.getElementById('gameVersion').options).map(o => o.value);
  const setupCustom = side => {
    // Reset to a custom unit first: a roster selection left over from a prior block would
    // make onVersionChange -> updateUnitLock -> applyUnit re-apply the roster stats during
    // applyState, clobbering the fields under test.
    set(side + 'Unit', 'custom'); updateUnitLock(side);
    set(side + 'Figs', 6); set(side + 'Atk', 9); set(side + 'Def', 3); set(side + 'Res', 8);
    set(side + 'HP', 12); set(side + 'Dmg', 0); set(side + 'ToHitMod', 70); set(side + 'ToBlkMod', 70);
  };

  try {
    localStorage.removeItem('pageState_v2');
    localStorage.removeItem('pageState_v1');

    // Round-trip no-op + perturb/restore across every version.
    for (const v of VERSIONS) {
      set('gameVersion', v); onVersionChange();
      setupCustom('a'); setupCustom('b');
      set('rangedCheck', false); set('aCityWalls', '1'); set('bCityWalls', '3'); set('nodeAura', 'none');
      recalculate();
      const before = dist();
      const blob = clone(collectState());
      applyState(clone(blob));
      const rt = dist();
      resetCalculatorState(); recalculate();
      const perturbed = dist();
      applyState(clone(blob));
      const after = dist();
      log('roundtrip-noop [' + v + ']', rt === before, { before, rt });
      log('perturb-changed [' + v + ']', perturbed !== before, {});
      log('restore-after-perturb [' + v + ']', after === before, { before, after });
    }

    // Abilities of each kind (select / bool / num / numcheck) on both sides + full globals.
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      setupCustom('a'); setupCustom('b');
      for (const side of ['a', 'b']) {
        const sel = document.getElementById(side + 'Abil_elemArmor');
        if (sel && sel.options.length > 1) sel.value = sel.options[sel.options.length - 1].value;
        set(side + 'Abil_armorPiercing', true);
        set(side + 'Abil_poison', 3);
        set(side + 'Abil_stoningGaze_on', true);
        set(side + 'Abil_stoningGaze', 2);
      }
      set('rangedCheck', true); set('rangedDist', 5);
      set('aCityWalls', '1'); set('bCityWalls', '3'); set('nodeAura', 'chaos'); set('chaosSurge', 4);
      recalculate();
      const before = dist();
      const blob = clone(collectState());
      resetCalculatorState(); recalculate();
      applyState(clone(blob));
      const after = dist();
      const abilOk = get('aAbil_armorPiercing') === true && get('aAbil_poison') === '3'
        && get('aAbil_stoningGaze_on') === true && get('aAbil_stoningGaze') === '2'
        && get('aAbil_elemArmor') !== 'none' && get('rangedDist') === '5'
        && get('aCityWalls') === '1' && get('bCityWalls') === '3' && get('nodeAura') === 'chaos';
      log('abilities-each-kind + globals', after === before && abilOk, { before, after, abilOk });
    }

    // R9-G1c widens Nightshade from a checkbox to a count. It round-trips in v2;
    // a pre-change boolean Nightshade value migrates to count 1.
    {
      set('gameVersion', 'com2_warlord_1.5.12.9'); onVersionChange();
      setupCustom('a'); setupCustom('b');
      set('aAbil_nightshade', 3); recalculate();
      const blob = clone(collectState());
      resetCalculatorState(); recalculate();
      applyState(clone(blob));
      log('R9-G1c Nightshade count round-trip',
        get('aAbil_nightshade') === '3', { nightshade: get('aAbil_nightshade') });

      const legacyBool = clone(blob);
      legacyBool.ids.aAbil_nightshade = true;
      applyState(legacyBool);
      log('backward-compat: boolean Nightshade migrates to count 1',
        get('aAbil_nightshade') === '1', { nightshade: get('aAbil_nightshade') });
    }

    // The retired global City Walls id always described card B. Old states migrate there,
    // while card A remains outside unless the new per-card id explicitly says otherwise.
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      setupCustom('a'); setupCustom('b'); recalculate();
      const blob = clone(collectState());
      blob.ids.cityWalls = '3';
      delete blob.ids.aCityWalls; delete blob.ids.bCityWalls;
      applyState(blob);
      log('backward-compat: global City Walls migrates to card B',
        get('aCityWalls') === 'none' && get('bCityWalls') === '3',
        { a: get('aCityWalls'), b: get('bCityWalls') });
    }

    // Matrix settings formerly stored City Walls in the Global box. Preserve its implicit
    // card-B meaning while retaining unrelated global rows and any explicit card-A settings.
    {
      localStorage.setItem('matrixPropertyState_v1', JSON.stringify({
        a: [{ key: 'cityWalls', enabled: true, value: '1' }],
        b: [],
        global: [
          { key: 'cityWalls', enabled: true, value: '3' },
          { key: 'nodeAura', enabled: true, value: 'nature' },
        ],
      }));
      const migrated = loadMatrixPropertyStateFromStorage();
      const aWall = migrated.a.find(row => row.key === 'cityWalls');
      const bWall = migrated.b.find(row => row.key === 'cityWalls');
      const globalWall = migrated.global.find(row => row.key === 'cityWalls');
      const nodeAura = migrated.global.find(row => row.key === 'nodeAura');
      log('backward-compat: matrix City Walls migrates from Global to card B',
        aWall && aWall.value === '1' && bWall && bWall.value === '3'
          && !globalWall && nodeAura && nodeAura.value === 'nature',
        { aWall, bWall, globalWall, nodeAura });
      localStorage.removeItem('matrixPropertyState_v1');
    }

    // Roster unit with a manual field edit: applyState must restore the edit (syncUnitDisplay),
    // not re-run applyUnit (which would reset the field to the roster default).
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      const db = unitDatabases['com2_1.05.11'];
      const unit = db.find(u => u.figures > 1 && parseInt(u.hp) > 0) || db[0];
      set('aUnit', String(unit.id)); applyUnit('a', unit.id); updateUnitLock('a'); syncUnitDisplay('a');
      const rosterFigs = get('aFigs');
      set('aHP', 999); recalculate();
      const before = dist();
      const blob = clone(collectState());
      const idCaptured = blob.identity.a && blob.identity.a.baseRace === unit.baseRace
        && !('templateId' in blob.identity.a) && !('heroTypeId' in blob.identity.a)
        && !('race' in blob.identity.a) && !('fantastic' in blob.identity.a);
      resetCalculatorState(); recalculate();
      applyState(clone(blob));
      const after = dist();
      const ok = after === before && get('aHP') === '999' && get('aUnit') === String(unit.id)
        && get('aFigs') === rosterFigs && idCaptured
        && unitIdentity['a'] && unitIdentity['a'].baseRace === unit.baseRace && unitIdentity['a'].name === unit.name;
      log('roster-unit manual edit survives', ok, { unit: unit.name, restoredHP: get('aHP') });
    }

    // Race-gated identity (unitIdentity) captured + restored.
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      setupCustom('a'); setupCustom('b');
      set('aBaseRace', 'Halfling');
      unitIdentity['a'] = { ...createCustomUnitIdentity('com2_1.05.11', readIdentityControls('a')), name: 'Test Bowmen' };
      set('aAbil_militaryWorkshop', true);
      recalculate();
      const blob = clone(collectState());
      const captured = blob.identity && blob.identity.a && blob.identity.a.baseRace === 'Halfling';
      resetCalculatorState(); recalculate();
      delete unitIdentity['a'];
      applyState(clone(blob));
      const restored = unitIdentity['a'] && unitIdentity['a'].baseRace === 'Halfling' && unitIdentity['a'].name === 'Test Bowmen';
      log('race-gated identity restored', captured && restored, { restored: unitIdentity['a'] });
    }

    // Forward-compat under diffing: an unknown id is ignored; an id omitted from the blob
    // resolves to the version default (that's what the diff relies on); a present id applies.
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      setupCustom('a'); setupCustom('b'); recalculate();
      const defFigs = getDefaultIds('com2_1.05.11').aFigs; // this version's default aFigs
      const blob = clone(collectState());
      blob.ids.zzzBogusUnknown = 'whatever'; // unknown id -> ignored, no throw
      delete blob.ids.aFigs;                  // omitted id -> resolves to version default
      set('aFigs', 99); recalculate();        // sentinel that must be overwritten by the default
      let threw = false;
      try { applyState(clone(blob)); } catch (e) { threw = true; }
      log('forward-compat: unknown id ignored, omitted id -> default',
        !threw && get('aFigs') === defFigs && get('aAtk') === '9',
        { threw, aFigs: get('aFigs'), defFigs, aAtk: get('aAtk') });
    }

    // localStorage read mirrors collectState.
    {
      set('gameVersion', 'com2_1.05.11'); onVersionChange();
      setupCustom('a'); setupCustom('b'); recalculate();
      const snap = collectState();
      localStorage.setItem('pageState_v2', JSON.stringify(snap));
      const read = readLocalState();
      log('localStorage read mirrors collectState',
        read && read.key === 'pageState_v2' && JSON.stringify(read.blob) === JSON.stringify(snap)
          && read.blob.v === 2, { v: read && read.blob && read.blob.v });
    }

    // Legacy v1 compressed/default-diff blobs still import through the old key.
    {
      setupCustom('a');
      set('aBaseFantastic', true); set('aBaseRace', 'Nature'); set('aHP', 17); recalculate();
      const current = collectState();
      const legacy = clone(current);
      legacy.v = 1;
      legacy.identity.a = { race: 'Nature', name: 'Legacy compressed' };
      delete legacy.ids.aBaseHero; delete legacy.ids.aBaseFantastic;
      delete legacy.ids.aBaseRace; delete legacy.ids.aSpecialUnit;
      legacy.ids.aAbil_unitType = 'fantastic_nature';
      localStorage.removeItem('pageState_v2');
      localStorage.setItem('pageState_v1', lzEncode(JSON.stringify(legacy)));
      resetCalculatorState();
      const read = readLocalState();
      applyState(read.blob);
      log('backward-compat: legacy compressed/default-diff localStorage loads',
        read.key === 'pageState_v1' && get('aHP') === '17'
          && readIdentityControls('a').baseRace === 'Nature'
          && readIdentityControls('a').baseFantastic, { key: read.key, identity: readIdentityControls('a') });
    }

    // lz payload is URL-safe + round-trips the blob.
    {
      const json = JSON.stringify(collectState());
      const enc = lzEncode(json);
      const urlSafe = /^[A-Za-z0-9_+$-]*$/.test(enc); // lz EncodedURIComponent charset
      const dec = lzDecode(enc);
      log('lz payload url-safe + round-trips blob',
        urlSafe && dec === json && JSON.stringify(JSON.parse(dec)) === json, { urlSafe, len: enc.length });
    }

    // Default-diff makes a full-featured share payload small (was ~13 KB uncompressed/undiffed).
    {
      set('gameVersion', 'com2_warlord_1.5.12.9'); onVersionChange();
      setupCustom('a'); setupCustom('b');
      set('aAbil_armorPiercing', true); set('bCityWalls', '3'); set('nodeAura', 'nature');
      recalculate();
      const len = lzEncode(JSON.stringify(collectState())).length;
      log('share payload is compact (< 1 KB)', len < 1024, { len });
    }

    // lz decode of garbage yields null (so parseHashState returns null instead of crashing init).
    {
      const safe = lzDecode('!!!not-valid-lz') === null;
      log('lz decode of garbage yields null (parseHashState safe)', safe, {});
    }

    // PRESETS regression suite still green (recalc save hook must not perturb results).
    {
      const r = runTests();
      log('PRESETS suite all-pass', r.allPassed, { total: r.total, failures: r.failures });
    }
  } catch (fatal) {
    log('FATAL harness error', false, { message: fatal.message });
  } finally {
    try { resetCalculatorState(); recalculate(); } catch (e) {}
    localStorage.removeItem('pageState_v2');
    localStorage.removeItem('pageState_v1');
  }

  return { passed: results.filter(r => r.ok).length, total: results.length, results };
})()`;

// Build a distinctive state, return its share-hash fragment + expected damage, and clear
// localStorage so the recipient side starts empty (URL must win on first load).
const BUILD_SHARE = `(() => {
  const set = (id, val) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!val; else el.value = val; };
  const dist = () => (document.querySelector('#distA .dist-header')?.textContent || '') + '||' + (document.querySelector('#distB .dist-header')?.textContent || '');
  localStorage.clear();
  set('gameVersion', 'com2_warlord_1.5.12.9'); onVersionChange();
  for (const s of ['a', 'b']) { set(s + 'Figs', 4); set(s + 'Atk', 11); set(s + 'Def', 2); set(s + 'Res', 9); set(s + 'HP', 8); set(s + 'ToHitMod', 70); set(s + 'ToBlkMod', 70); }
  set('aAbil_armorPiercing', true); set('bCityWalls', '3'); set('nodeAura', 'nature');
  recalculate();
  const expectedDist = dist();
  const frag = 's=' + lzEncode(JSON.stringify(collectState()));
  localStorage.clear();
  return { frag, expectedDist };
})()`;

const READ_AFTER_SHARE = `(() => {
  const dist = () => (document.querySelector('#distA .dist-header')?.textContent || '') + '||' + (document.querySelector('#distB .dist-header')?.textContent || '');
  return { dist: dist(), hash: location.hash, version: document.getElementById('gameVersion').value, aFigs: document.getElementById('aFigs').value };
})()`;

// Edit a field after import, wait past the debounce so localStorage captures the edit.
const EDIT_AND_SAVE = `(() => {
  const el = document.getElementById('aFigs'); el.value = '7';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  recalculate();
  return new Promise(res => setTimeout(() => res({ saved: !!localStorage.getItem('pageState_v2'), aFigs: el.value }), 400));
})()`;

const READ_FIGS = `(() => ({ aFigs: document.getElementById('aFigs').value, hash: location.hash }))()`;

async function main() {
  const server = await startServer();
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}${targetPath}`;
  const debugPort = await getFreePort();
  const userDataDir = path.join(repoRoot, '.playwright-mcp', `state-check-${process.pid}-${Date.now()}`);
  const chrome = launchChrome(targetUrl, debugPort, userDataDir);

  const checks = [];
  const record = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });

  try {
    const wsUrl = await waitForTarget(targetUrl, debugPort, chrome);

    // 1) In-page matrix.
    const main = await cdpEvaluate(wsUrl, MAIN_HARNESS);
    for (const r of main.results) record(r.name, r.ok, r.detail);

    // 2) Share link -> real reload -> identical damage + hash stripped.
    const { frag, expectedDist } = await cdpEvaluate(wsUrl, BUILD_SHARE);
    await cdpNavigate(wsUrl, `${targetUrl}#${frag}`);
    const shared = await cdpEvaluate(wsUrl, READ_AFTER_SHARE);
    record('URL share: identical damage', shared.dist === expectedDist, { expectedDist, got: shared.dist });
    record('URL share: hash stripped after import', shared.hash === '', { hash: shared.hash });
    record('URL share: version applied', shared.version === 'com2_warlord_1.5.12.9', { version: shared.version });
    record('URL share: fields applied', shared.aFigs === '4', { aFigs: shared.aFigs });

    // 3) Precedence: edit + reload restores the edited localStorage state, not the shared link.
    const edited = await cdpEvaluate(wsUrl, EDIT_AND_SAVE);
    record('URL precedence: edit saved to localStorage', edited.saved && edited.aFigs === '7', edited);
    await cdpNavigate(wsUrl, targetUrl);
    const afterReload = await cdpEvaluate(wsUrl, READ_FIGS);
    record('URL precedence: reload restores edited state', afterReload.aFigs === '7' && afterReload.hash === '', afterReload);

    // 4) Malformed #s= -> clean fallback to localStorage, hash stripped, no crash.
    await cdpNavigate(wsUrl, `${targetUrl}#s=this_is_not_valid_base64_%%%`);
    const badHash = await cdpEvaluate(wsUrl, READ_FIGS);
    record('URL bad-hash: clean fallback + strip', badHash.aFigs === '7' && badHash.hash === '', badHash);

    // 5) Resilience: a well-formed v2 blob carrying a wrong identity-field type is rejected
    // before calculation. Such a blob in localStorage would re-crash every reload without the
    // init guard.
    const SETUP_BAD = `(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } };
      document.getElementById('gameVersion').value = 'com2_warlord_1.5.12.9'; onVersionChange();
      set('aUnit', 'custom'); updateUnitLock('a');
      set('aAbil_unitType', 'normal'); set('aAbil_altarOfTheMoon', true);
      for (const s of ['a', 'b']) { set(s + 'Unit', 'custom'); updateUnitLock(s); set(s + 'Figs', 6); set(s + 'Atk', 9); set(s + 'Def', 3); set(s + 'Res', 8); set(s + 'HP', 12); set(s + 'ToHitMod', 70); set(s + 'ToBlkMod', 70); }
      recalculate();
      const bad = collectState();
      bad.ids.gameVersion = 'com2_warlord_1.5.12.9';
      bad.ids.aUnit = 'custom';
      bad.ids.aAbil_altarOfTheMoon = true;
      bad.identity.a = { isHero: false, baseRace: 'Gnoll', baseFantastic: false,
        specialUnit: 'none', name: { malformed: true } };
      // precondition: confirm this blob is genuinely rejected (so the test isn't vacuous)
      let crashes = false; try { applyState(JSON.parse(JSON.stringify(bad))); } catch (e) { crashes = true; }
      resetCalculatorState();
      return { blob: bad, crashes };
    })()`;

    // 5a) Bad localStorage blob -> init recovers to defaults + discards the blob (no re-crash loop).
    const { blob: bad, crashes } = await cdpEvaluate(wsUrl, SETUP_BAD);
    record('resilience: crafted blob genuinely crashes recalculate (precondition)', crashes, { crashes });
    await cdpEvaluate(wsUrl, `(() => { localStorage.setItem('pageState_v2', ${JSON.stringify(JSON.stringify(bad))}); return true; })()`);
    await cdpNavigate(wsUrl, targetUrl); // init: readLocalState -> tryApplyState throws -> recover + discard
    const recLs = await cdpEvaluate(wsUrl, `(() => {
      const parsed = readLocalState(); // {blob,key}, or null if absent
      return {
        alive: !!(document.querySelector('#distA .dist-header')?.textContent || '').trim(),
        version: document.getElementById('gameVersion').value,
        aUnit: document.getElementById('aUnit').value,
        altarOfTheMoon: document.getElementById('aAbil_altarOfTheMoon').checked,
        badGone: !parsed || parsed.blob?.identity?.a?.name?.malformed !== true,
      };
    })()`);
    record('resilience: bad localStorage recovers to defaults',
      recLs.alive && recLs.version === 'mom_1.31' && recLs.aUnit !== 'custom' && !recLs.altarOfTheMoon, recLs);
    record('resilience: bad localStorage blob discarded (no re-crash loop)', recLs.badGone, recLs);

    // 5b) Bad share link -> recover + fall back to the recipient's own (good) localStorage.
    const frag2 = await cdpEvaluate(wsUrl, `(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } };
      localStorage.clear();
      document.getElementById('gameVersion').value = 'com2_1.05.11'; onVersionChange();
      set('aUnit', 'custom'); updateUnitLock('a'); set('aFigs', 8);
      document.getElementById('aFigs').dispatchEvent(new Event('input', { bubbles: true }));
      const good = collectState();
      localStorage.setItem('pageState_v2', JSON.stringify(good)); // recipient's own saved state
      const badShare = collectState();
      badShare.ids.gameVersion = 'com2_warlord_1.5.12.9';
      badShare.ids.aUnit = 'custom';
      badShare.ids.aFigs = 6;
      badShare.ids.aAbil_altarOfTheMoon = true;
      badShare.identity.a = { isHero: false, baseRace: 'Gnoll', baseFantastic: false,
        specialUnit: 'none', name: { malformed: true } };
      return 's=' + lzEncode(JSON.stringify(badShare));
    })()`);
    await cdpNavigate(wsUrl, `${targetUrl}#${frag2}`); // URL wins, but it throws -> fall back to localStorage
    const recUrl = await cdpEvaluate(wsUrl, `(() => ({
      alive: !!(document.querySelector('#distA .dist-header')?.textContent || '').trim(),
      hash: location.hash,
      aFigs: document.getElementById('aFigs').value,
    }))()`);
    record('resilience: bad URL recovers + falls back to localStorage', recUrl.alive && recUrl.hash === '' && recUrl.aFigs === '8', recUrl);

    // 5c) A pre-compression share link can carry full v1 JSON rather than an LZ token. It must
    // still outrank a valid recipient state; this is intentionally end-to-end through location,
    // parseHashState, applyState, and the one-shot hash stripping path.
    const legacyPlainShare = await cdpEvaluate(wsUrl, `(() => {
      const recipient = collectState();
      recipient.ids.aFigs = '8';
      resetCalculatorState('mom_1.31');
      const set = (id, v) => { const e = document.getElementById(id); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } };
      set('aUnit', 'custom'); updateUnitLock('a');
      set('aHP', 37); recalculate();
      const legacy = collectFullState();
      legacy.v = 1;
      for (const prefix of ['a', 'b']) {
        const controls = readIdentityControls(prefix);
        legacy.ids[prefix + 'BaseHero'] = controls.isHero;
        legacy.ids[prefix + 'BaseFantastic'] = controls.baseFantastic;
        legacy.ids[prefix + 'BaseRace'] = controls.baseRace;
        legacy.ids[prefix + 'SpecialUnit'] = controls.specialUnit;
        legacy.ids[prefix + 'Abil_unitType'] = legacyUnitTypeFromIdentity(controls);
        legacy.identity[prefix] = { race: controls.baseRace, name: 'Legacy plain share ' + prefix };
      }
      localStorage.clear();
      localStorage.setItem('pageState_v2', JSON.stringify(recipient));
      return encodeURIComponent(JSON.stringify(legacy));
    })()`);
    await cdpNavigate(wsUrl, `${targetUrl}#s=${legacyPlainShare}`);
    const legacyShared = await cdpEvaluate(wsUrl, `(() => ({
      alive: !!(document.querySelector('#distA .dist-header')?.textContent || '').trim(),
      hash: location.hash,
      version: document.getElementById('gameVersion').value,
      aHP: document.getElementById('aHP').value,
      aFigs: document.getElementById('aFigs').value,
    }))()`);
    record('backward-compat: legacy full plain-JSON share wins over recipient localStorage',
      legacyShared.alive && legacyShared.version === 'mom_1.31'
        && legacyShared.aHP === '37' && legacyShared.aFigs !== '8', legacyShared);
    record('backward-compat: legacy full plain-JSON share hash stripped',
      legacyShared.hash === '', legacyShared);

    // 6) Backward-compat: a legacy full, uncompressed plain-JSON blob (the pre-diff/pre-lz
    // format existing users still have in localStorage) must still load.
    await cdpEvaluate(wsUrl, `(() => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) { if (e.type === 'checkbox') e.checked = !!v; else e.value = v; } };
      localStorage.clear();
      document.getElementById('gameVersion').value = 'com2_1.05.11'; onVersionChange();
      set('aUnit', 'custom'); updateUnitLock('a'); set('aFigs', 5);
      document.getElementById('aFigs').dispatchEvent(new Event('input', { bubbles: true }));
      const legacy = collectFullState();
      legacy.v = 1;
      legacy.identity.a = { race: readIdentityControls('a').baseRace, name: 'Legacy plain' };
      legacy.identity.b = { race: readIdentityControls('b').baseRace, name: 'Legacy defender' };
      localStorage.setItem('pageState_v1', JSON.stringify(legacy)); // legacy full plain JSON
      return true;
    })()`);
    await cdpNavigate(wsUrl, targetUrl);
    const legacy = await cdpEvaluate(wsUrl, `(() => ({
      alive: !!(document.querySelector('#distA .dist-header')?.textContent || '').trim(),
      aFigs: document.getElementById('aFigs').value,
    }))()`);
    record('backward-compat: legacy full plain-JSON localStorage loads', legacy.alive && legacy.aFigs === '5', legacy);

    // Leave storage clean for the next real visitor.
    await cdpEvaluate(wsUrl, `(() => { localStorage.clear(); return true; })()`);
  } finally {
    server.close();
    killChrome(chrome);
    // Handles on the profile dir can outlive the kill by a moment.
    for (let i = 0; i < 10; i++) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); break; } catch (_) { await sleep(200); }
    }
  }

  const failed = checks.filter(c => !c.ok);
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok ? '' : '  ' + JSON.stringify(c.detail)}`);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch(err => { console.error(err.stack || String(err)); process.exit(1); });
