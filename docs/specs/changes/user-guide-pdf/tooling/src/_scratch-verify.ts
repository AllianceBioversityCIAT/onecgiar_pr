// THROWAWAY verification script for UG-T-6 — NOT a deliverable of this task,
// deleted before reporting completion. Exercises annotate.ts against a real
// authenticated page load, per the task brief's live-verification instructions.
// Never logs the token/user values.
import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { annotateClickTarget, removeAnnotation } from './annotate';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(base64, 'base64').toString('utf8');
}

async function main() {
  const baseUrl = process.env.CLIENT_BASE_URL;
  const token = process.env.TEST_TOKEN;
  if (!baseUrl || !token) throw new Error('CLIENT_BASE_URL / TEST_TOKEN missing from .env');

  const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
  const user = {
    id: payload.id,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
  };

  const os = await import('os');
  const fs = await import('fs');
  const outDir = path.join(os.tmpdir(), 'ug-annotate-check');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify(u));
    },
    { t: token, u: user },
  );
  await page.reload({ waitUntil: 'networkidle' });

  await page.goto(`${baseUrl}/results-outlet`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, '0-loaded.png'), fullPage: false });
  console.log('landed on:', page.url());

  // Pick a real, visible, clickable element that carries actual visible TEXT
  // (not just an icon) so the "does not cover the label" check is meaningful.
  const target = page.getByRole('button', { name: 'Update result' });
  if ((await target.count()) !== 1) {
    throw new Error(`expected exactly one "Update result" button, found ${await target.count()}`);
  }
  const label = (await target.innerText().catch(() => '')) || '';
  console.log('annotating element with visible label:', JSON.stringify(label));

  await annotateClickTarget(page, target, '#f97316');
  await page.screenshot({ path: path.join(outDir, '1-annotated.png'), fullPage: false });

  const overlayCountAfterInject = await page.locator('[data-ug-annotation]').count();
  console.log('overlay nodes present after inject:', overlayCountAfterInject);

  await removeAnnotation(page);
  const overlayCountAfterRemove = await page.locator('[data-ug-annotation]').count();
  console.log('overlay nodes present after remove:', overlayCountAfterRemove);
  await page.screenshot({ path: path.join(outDir, '2-removed.png'), fullPage: false });

  await browser.close();
  console.log('screenshots written to:', outDir);
}

main().catch((err) => {
  console.error('verify failed:', err.message);
  process.exit(1);
});
