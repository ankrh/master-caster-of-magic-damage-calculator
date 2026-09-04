// Shared helpers for the Playwright UI suite.
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The gameVersion <option> list in index.html is the authoritative set of versions — one the
// dropdown does not offer cannot be selected. Read it instead of restating it here, so a
// version added or renamed there is covered automatically.
//
// A hardcoded copy can only fail in the direction that looks fine: miss a version and the
// suite silently tests fewer of them while still reporting green. Hence the throws below —
// returning an empty list would generate zero tests and pass.
//
// Synchronous on purpose: Playwright collects tests at module load, before any page exists,
// so this cannot read the list out of a live DOM.
function gameVersions() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const select = html.match(/<select id="gameVersion">([\s\S]*?)<\/select>/);
  if (!select) throw new Error('helpers.gameVersions: no <select id="gameVersion"> in index.html');
  const versions = [...select[1].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
  if (!versions.length) throw new Error('helpers.gameVersions: gameVersion select has no <option> values');
  return versions;
}

// Budget for the readiness wait, deliberately short of the 30 s test timeout so the
// diagnosis below has room to run and be reported. `page.goto` resolves on `load` and every
// calculator source is a classic blocking script, so a healthy load satisfies the predicate
// the moment `goto` returns: measured worst case is ~350 ms, and ~2 s with six cores busy.
const PAGE_READY_TIMEOUT_MS = 15_000;

// Answer "why is window.collectState missing?" before the failure is reported. Left as a
// bare timeout the symptom is undiagnosable after the fact — F155 spent a full round on one
// occurrence and could not name the cause, because Playwright cleans error-context.md on the
// next invocation and the dev server's log cannot show a request it never accepted. The
// predicate can only be false if a script did not execute, so what is worth knowing is which
// fetch failed, what the page reported, and whether the renderer is answering at all.
async function pageLoadDiagnosis(page, { errors, failedRequests, responseCount }) {
  const limited = (promise, label) => Promise.race([
    promise.catch(err => `unavailable (${String(err).split('\n')[0]})`),
    new Promise(resolve => setTimeout(() => resolve(`unavailable (${label} did not return)`), 4000)),
  ]);
  const state = await limited(page.evaluate(() => ({
    readyState: document.readyState,
    collectState: typeof window.collectState,
    href: location.href,
    scripts: document.scripts.length,
  })), 'page.evaluate');
  // A live requestAnimationFrame separates a renderer that is merely missing the script from
  // one that is wedged or throttled and cannot run the wait's poller in the first place.
  const raf = await limited(page.evaluate(() => new Promise((resolve) => {
    const timer = setTimeout(() => resolve('stalled (no frame in 2 s)'), 2000);
    requestAnimationFrame(() => { clearTimeout(timer); resolve('alive'); });
  })), 'requestAnimationFrame probe');
  return [
    `page: ${JSON.stringify(state)}`,
    `requestAnimationFrame: ${JSON.stringify(raf)}`,
    `responses received: ${responseCount}`,
    `failed requests: ${failedRequests.length ? failedRequests.join('; ') : 'none'}`,
    `console errors: ${errors.length ? errors.join('; ') : 'none'}`,
  ].join('\n');
}

// Navigate to the calculator with a clean slate and console-error tracking.
// - Blocks the Plausible analytics script so test runs don't pollute stats.
// - Clears localStorage on every navigation so persisted state can't leak
//   between tests (share-link hashes still take precedence and work normally).
// - Returns an array that accumulates console errors and page crashes; call
//   expectNoConsoleErrors(errors) at the end of the test.
async function openCalculator(page, path = '/') {
  const errors = [];
  const failedRequests = [];
  let responseCount = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} :: ${(req.failure() || {}).errorText}`);
  });
  page.on('response', () => { responseCount += 1; });
  // Stub (not abort) the analytics script: aborting logs a console error,
  // which would trip expectNoConsoleErrors.
  await page.route('**://plausible.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(path);
  try {
    await page.waitForFunction(
      () => typeof window.collectState === 'function', undefined,
      { timeout: PAGE_READY_TIMEOUT_MS });
  } catch (err) {
    throw new Error(
      `openCalculator: window.collectState never appeared within ${PAGE_READY_TIMEOUT_MS} ms.\n`
      + await pageLoadDiagnosis(page, { errors, failedRequests, responseCount }));
  }
  return errors;
}

function expectNoConsoleErrors(errors) {
  expect(errors, 'no console errors or page crashes during the test').toEqual([]);
}

// Do now, synchronously, the deferred DOM rebuild the page has armed, so it cannot land in the
// middle of a later locator action.
//
// Every `recalculate()` arms a ~250 ms debounced save (`scheduleSaveState`). That save calls
// `collectState()`, which calls `getDefaultIds` — and on a **cache miss** for the current version
// that builds the version's defaults by resetting the whole DOM to them and applying the live
// state back (`Calculator/ui_state.js:790`). The restore re-renders, and `renderBreakdownGrid`
// opens with `grid.innerHTML = ''` (`Calculator/ui.js:327`), so every node under `#breakdownGrid`
// resolved before that moment is detached after it. That is the F241 flake: `scrollIntoViewIfNeeded`
// resolves the selector to a fixed handle and then acts through it, the timer fires in between,
// and the action reports `Element is not attached to the DOM`. The cache is per version and
// survives switching away and back, so the miss is once per version per page.
//
// Calling `collectState()` here takes that miss inside this awaited evaluate, so the timer that is
// already armed finds a cache hit and its save is a plain snapshot with no rebuild in it. A
// visibility wait does not close this — the render is already complete and synchronous, so it
// passes at once and leaves the same window. `page.waitForFunction(() => _saveTimer === null)`
// would be causal, but it only works while a save is actually armed and costs the full debounce;
// taking the miss is unconditional and immediate.
//
// Call it after whatever drove the render and before resolving nodes out of the result. Not a
// no-op: on a miss the reset drops non-persisted UI state — expanded ability groups collapse,
// in-progress combobox text is replaced, `#breakdownGrid` nodes and any tooltip ownership on them
// are destroyed. So warm before establishing transient UI state, not after.
async function warmDefaultStateCache(page) {
  // `openCalculator` already waits for `collectState`, so its absence is a broken page, not a
  // condition to skip over (`CLAUDE.md`, *Architecture*: fail loud).
  await page.evaluate(() => { collectState(); });
}

// Set an input/select value the way a user would, so the app's input/change
// listeners fire and state/recalc updates.
async function setValue(page, id, value) {
  await page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('no element #' + id);
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, value]);
  // A version change may make a version current whose defaults have not been built yet, which is
  // the case the debounced save would otherwise take asynchronously.
  if (id === 'gameVersion') await warmDefaultStateCache(page);
}

module.exports = {
  openCalculator, expectNoConsoleErrors, setValue, gameVersions, warmDefaultStateCache,
};
