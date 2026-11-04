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
const path = require('path');

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
  for (const zoom of [1, 1.15, 1.3, 1.5]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 574 } });
    const page = await context.newPage();
    await page.goto(fileUrl);
    await page.evaluate(z => {
      document.documentElement.style.zoom = String(z);
    }, zoom);
    await page.waitForTimeout(100);
    const result = await checkAgainstRealViewport(page);
    console.log(`zoom=${zoom}:`, result);
    await context.close();
  }
  await browser.close();
})();
