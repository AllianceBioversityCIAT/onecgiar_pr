/**
 * pdf.ts — final PDF render (UG-T-14).
 *
 * // @akili-spec changes/user-guide-pdf
 *
 * Loads `dist/guide-assembled.html` (produced by `assemble.ts`, gated by
 * `verify-structure.ts`) in Playwright Chromium and prints it to
 * `dist/w3-bilateral-reporting-user-guide.pdf` via `page.pdf()`.
 *
 * BG-T-13 note: the archived W1/W2 copy of this file writes to
 * `dist/reporting-tool-user-guide.pdf`. `OUTPUT_PDF` below is the one line changed from that
 * copy — `design.md` §3.2's pipeline diagram and `tasks.md` `BG-T-13`'s own `Files (expected)`
 * both name `w3-bilateral-reporting-user-guide.pdf` as this spec's deliverable filename, and
 * shipping the W1/W2 name here would silently collide with (or be mistaken for) the archived
 * guide's own output. `BG-R-22`'s "SHOULD stay byte-identical" is a SHOULD, and a one-line
 * output-path constant remains a trivially mechanical diff for a future promotion.
 *
 * Font-loading guard: waits for `document.fonts.ready`, then explicitly
 * checks `document.fonts.check()` for Manrope and JetBrains Mono and FAILS
 * LOUDLY if either is unavailable, instead of silently shipping a PDF
 * rendered with the browser's generic fallback fonts (which would look
 * "fine" at a glance but not match `UG-R-4`'s real-token requirement).
 *
 * `preferCSSPageSize: true` is required, not optional: `template/guide.css`
 * declares `@page { size: Letter; margin: 0.65in 0.75in 0.75in 0.75in; }`,
 * and Chromium's print pipeline only honours a stylesheet's `@page` margins
 * when `preferCSSPageSize` is set — otherwise `page.pdf()`'s own default
 * margins silently win instead (forward pointer noted in this task's brief).
 */

import 'dotenv/config';
import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

const TOOLING_ROOT = path.resolve(__dirname, '..');
const ASSEMBLED_HTML = path.join(TOOLING_ROOT, 'dist', 'guide-assembled.html');
const OUTPUT_PDF = path.join(TOOLING_ROOT, 'dist', 'w3-bilateral-reporting-user-guide.pdf');

/** `document.fonts.check()` accepts a CSS font shorthand: "<size> <family>". */
const REQUIRED_FONT_CHECKS: ReadonlyArray<{ label: string; cssFont: string }> = [
  { label: 'Manrope', cssFont: '16px Manrope' },
  { label: 'JetBrains Mono', cssFont: '16px "JetBrains Mono"' }
];

async function assertAssembledHtmlExists(): Promise<void> {
  try {
    await fs.access(ASSEMBLED_HTML);
  } catch {
    throw new Error(
      `[pdf] ${ASSEMBLED_HTML} does not exist. Run "npm run assemble" then "npm run verify-structure" first.`
    );
  }
}

async function main(): Promise<void> {
  await assertAssembledHtmlExists();

  const channel = process.env.PLAYWRIGHT_CHANNEL || undefined;
  const browser = await chromium.launch({ channel, headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${ASSEMBLED_HTML}`, { waitUntil: 'networkidle' });

    // Wait for web fonts (Google Fonts <link> in guide.html's <head>) to finish loading
    // before either checking availability or printing — printing too early can rasterize
    // fallback-font text even when the real font arrives a moment later.
    await page.evaluate(() => document.fonts.ready);

    const fontStatus = await page.evaluate((checks) => {
      return checks.map(({ label, cssFont }) => ({
        label,
        available: document.fonts.check(cssFont)
      }));
    }, REQUIRED_FONT_CHECKS);

    for (const status of fontStatus) {
      console.log(`[pdf] font check: ${status.label} -> ${status.available ? 'available' : 'MISSING'}`);
    }

    const missing = fontStatus.filter((status) => !status.available);
    if (missing.length > 0) {
      throw new Error(
        `[pdf] Required web font(s) not available at render time: ${missing
          .map((status) => status.label)
          .join(', ')}. Refusing to silently ship a PDF rendered with fallback fonts — check network ` +
          'access to fonts.googleapis.com/fonts.gstatic.com from this machine.'
      );
    }

    await fs.mkdir(path.dirname(OUTPUT_PDF), { recursive: true });
    await page.pdf({
      path: OUTPUT_PDF,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true
    });

    console.log(`[pdf] wrote ${OUTPUT_PDF}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
