// Investigation artifact for bugfix/sidebar-scroll-zoom-overflow.
//
// IMPORTANT — this is the CORRECTED version (post Judgment Day). The original version of this
// script only checked whether the last item sat inside ITS OWN CONTAINER's bounding rect, which
// is trivially true once `scrollTop` is pinned to `scrollHeight` — it can never catch the real
// defect, where the `position:fixed; h-svh` container itself grows taller than the real browser
// window. This version measures against `window.innerHeight` and `document.elementFromPoint()`
// instead, which is what actually proves or disproves reachability. See judgment.md and
// requirements.md §2 for the full history.
//
// Usage: `node zoom-check.js` from this directory. Requires a local Playwright-compatible
// Chromium; update CHROMIUM_PATH below to match your `~/Library/Caches/ms-playwright/` install.
const path = require('node:path');

const PLAYWRIGHT_PKG_PATH =
  process.env.PLAYWRIGHT_PKG_PATH ||
  '/Users/mariacamilagiraldo/.nvm/versions/node/v20.20.2/lib/node_modules/@playwright/cli/node_modules/playwright';
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  '/Users/mariacamilagiraldo/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const { chromium } = require(PLAYWRIGHT_PKG_PATH);

const fileUrl = 'file://' + path.join(__dirname, 'minimal-repro.html');

async function checkAgainstRealViewport(page) {
  return await page.evaluate(() => {
    const c = document.getElementById('content');
    const last = document.getElementById('last');
    c.scrollTop = c.scrollHeight; // scroll to the programmatic maximum
    const cRect = c.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();
    const centerX = (lRect.left + lRect.right) / 2;
    const centerY = (lRect.top + lRect.bottom) / 2;
    const elAtCenter = document.elementFromPoint(centerX, centerY);
    return {
      windowInnerHeight: window.innerHeight,
      containerBottom: cRect.bottom,
      lastItemBottom: lRect.bottom,
      // The flawed original check — kept for comparison. Trivially true once scrollTop is maxed.
      containedInOwnContainer: lRect.bottom <= cRect.bottom + 0.5,
      // The check that actually answers "can the user see this item?"
      actuallyWithinWindowViewport: lRect.bottom <= window.innerHeight + 0.5 && lRect.top >= -0.5,
      elementFromPointIsLastOrDescendant: !!elAtCenter && (elAtCenter === last || last.contains(elAtCenter)),
      elementFromPointTag: elAtCenter ? elAtCenter.id || elAtCenter.tagName : null
    };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  // Sequential by design: one shared browser, one zoom level at a time, so console output stays
  // ordered and contexts never interfere with each other. NOSONAR on each await below.
  for (const zoom of [1, 1.15, 1.3, 1.5]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 574 } }); // NOSONAR
    const page = await context.newPage(); // NOSONAR
    await page.goto(fileUrl); // NOSONAR
    await page.evaluate(z => { // NOSONAR
      document.documentElement.style.zoom = String(z);
    }, zoom);
    await page.waitForTimeout(100); // NOSONAR
    const result = await checkAgainstRealViewport(page); // NOSONAR
    console.log(`zoom=${zoom}:`, result);
    await context.close(); // NOSONAR
  }
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
