// Investigation artifact for bugfix/sidebar-scroll-zoom-overflow — compares two candidate fixes
// for the confirmed defect (see zoom-check.js, README.md, judgment.md round 2 B-1/B-2).
//
// Usage: `node fix-candidates-check.js` from this directory. Override PLAYWRIGHT_PKG_PATH /
// CHROMIUM_PATH env vars if your local Playwright/Chromium install differs.
const path = require('path');
const PLAYWRIGHT_PKG_PATH =
  process.env.PLAYWRIGHT_PKG_PATH ||
  '/Users/mariacamilagiraldo/.nvm/versions/node/v20.20.2/lib/node_modules/@playwright/cli/node_modules/playwright';
const CHROMIUM_PATH =
  process.env.CHROMIUM_PATH ||
  '/Users/mariacamilagiraldo/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const { chromium } = require(PLAYWRIGHT_PKG_PATH);
const fileUrl = 'file://' + path.join(process.cwd(), 'minimal-repro.html');

async function measure(page) {
  return await page.evaluate(() => {
    const c = document.getElementById('content');
    const container = document.querySelector('.sidebar-container');
    const last = document.getElementById('last');
    c.scrollTop = c.scrollHeight;
    const contRect = container.getBoundingClientRect();
    const lRect = last.getBoundingClientRect();
    return {
      windowInnerHeight: window.innerHeight,
      containerHeight: contRect.height,
      containerWidth: contRect.width,
      lastItemBottom: lRect.bottom,
      reachable: lRect.bottom <= window.innerHeight + 0.5
    };
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const variants = {
    'none (baseline, broken)': null,
    'CDK-pattern (counter-zoom container, re-zoom content)': `
      .sidebar-container { zoom: calc(1/1.15); }
      .sidebar-inner { zoom: 1.15; }
    `,
    'height-only compensation': `
      .sidebar-container { height: calc(100svh / 1.15) !important; }
    `
  };
  for (const [name, css] of Object.entries(variants)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 574 } });
    const page = await context.newPage();
    await page.goto(fileUrl);
    if (css) {
      await page.addStyleTag({ content: css });
    }
    await page.evaluate(() => { document.documentElement.style.zoom = '1.15'; });
    await page.waitForTimeout(100);
    const r = await measure(page);
    console.log(`--- ${name} ---`, r);
    await context.close();
  }
  await browser.close();
})();
