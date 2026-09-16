/**
 * tokens.ts — live design-token extraction (UG-T-5, implements UG-DD-2).
 *
 * Reads the CURRENT, RUNNING app's CSS custom properties via `getComputedStyle`, instead of
 * hand-copying hex/font values from `colors.scss`/`fonts.scss` into this pipeline. See
 * `design.md` §12 `UG-DD-2` for why: `docs/ux-ui/design.md` §7 is already known to be stale
 * (it still references Poppins), so a hand-copied snapshot here would silently drift the same
 * way. Reading live means the guide always matches whatever tokens are actually deployed.
 *
 * Scope note: this file ONLY extracts tokens from an already-loaded Playwright `Page`. It does
 * not navigate, does not authenticate, and does not write files as a side effect of import —
 * those are `capture.ts` (UG-T-7) and the small `writeTokensJson` helper below, kept separate
 * on purpose so the extraction logic is unit-testable without touching disk.
 *
 * Token source note (read directly from `colors.scss` / `fonts.scss` — see those files for the
 * authoritative declarations, not reproduced here to avoid drift):
 *   - The 4 required colors ARE real CSS custom properties on `:root` in `colors.scss`:
 *     `--pr-color-primary-300`, `--pr-color-primary-400`, `--pr-color-secondary-400`,
 *     `--pr-color-orange-500`.
 *   - Neither `colors.scss` nor `fonts.scss` defines a `--font-*` custom property for the
 *     Manrope or JetBrains Mono stacks (only `--font-mono` exists, and it's declared in
 *     `styles.scss`, outside this task's read scope — see the "Not Done / Assumptions" note in
 *     the implementer's report for UG-T-5). `fonts.scss` instead applies these stacks directly
 *     as literal `font-family` declarations: `html, body { font-family: 'Manrope', 'Poppins',
 *     sans-serif; }` and `.pr-code { font-family: 'JetBrains Mono', ui-monospace, monospace; }`.
 *     So this module resolves those two stacks via `getComputedStyle` on the real elements the
 *     cascade targets (`document.body`, and a probe element carrying `.pr-code`) rather than via
 *     a custom-property lookup — still "live", still never hand-copied, just anchored to the
 *     actual selectors instead of a nonexistent variable name.
 */

import type { Page } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

/** The 4 color custom properties `UG-T-5` must extract, in `colors.scss` declaration order. */
export const REQUIRED_COLOR_TOKENS = [
  '--pr-color-primary-300',
  '--pr-color-primary-400',
  '--pr-color-secondary-400',
  '--pr-color-orange-500'
] as const;

export type RequiredColorToken = (typeof REQUIRED_COLOR_TOKENS)[number];

/**
 * Flat map of CSS custom-property name -> resolved value. Deliberately flat (not nested) so
 * `assemble.ts` / `template/guide.css` (UG-T-11) can inject it straight into a `:root { ... }`
 * block: `Object.entries(tokens).map(([k, v]) => `${k}: ${v};`)`.
 */
export interface TokensJson {
  '--pr-color-primary-300': string;
  '--pr-color-primary-400': string;
  '--pr-color-secondary-400': string;
  '--pr-color-orange-500': string;
  '--font-manrope': string;
  '--font-jetbrains-mono': string;
}

/**
 * Reads one CSS custom property from `getComputedStyle(document.documentElement)` on the given,
 * already-loaded page. Exported (not just used internally by `extractTokens`) so a caller can
 * exercise the negative path directly — e.g. `readRootCustomProperty(page,
 * '--pr-color-does-not-exist')` — without needing the full `extractTokens` happy path to fail in
 * a specific spot.
 *
 * Fails loudly per `UG-DD-2` / this task's DoD: an undefined custom property resolves to an
 * empty string in the CSSOM, and silently accepting that would let a renamed/removed token slip
 * into the guide with no signal. Never falls back to a default value.
 */
export async function readRootCustomProperty(page: Page, propertyName: string): Promise<string> {
  const value = await page.evaluate((name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }, propertyName);

  if (!value) {
    throw new Error(
      `[tokens.ts] Expected CSS custom property "${propertyName}" to be defined on :root with a ` +
        'non-empty value, but getComputedStyle(document.documentElement) returned an empty ' +
        'string. Either the page is not the real app shell (e.g. it landed on an error page), ' +
        'or the token was renamed/removed in onecgiar-pr-client/src/styles/colors.scss.'
    );
  }
  return value;
}

interface FontProbeOptions {
  /** Query an existing element instead of creating a probe (used for the Manrope body stack). */
  selector?: string;
  /** Create a temporary, invisible element with this class name and read its computed style. */
  tempClassName?: string;
}

/**
 * Resolves a `font-family` computed value for either an existing selector (`body`) or a
 * throwaway probe element carrying a known class (`.pr-code`), then throws if the result is
 * empty — same fail-loudly contract as `readRootCustomProperty`, applied to the font stacks that
 * have no custom property to look up.
 */
async function resolveFontFamily(page: Page, opts: FontProbeOptions, label: string): Promise<string> {
  const value = await page.evaluate(({ selector, tempClassName }) => {
    let el: Element | null = selector ? document.querySelector(selector) : null;
    let probe: HTMLElement | null = null;

    if (!el && tempClassName) {
      probe = document.createElement('span');
      probe.className = tempClassName;
      // Invisible and out of flow — this must never be visible to a real user or affect layout.
      probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;';
      document.body.appendChild(probe);
      el = probe;
    }

    if (!el) {
      return '';
    }

    const family = getComputedStyle(el).fontFamily.trim();

    if (probe) {
      probe.remove();
    }

    return family;
  }, opts);

  if (!value) {
    throw new Error(
      `[tokens.ts] Could not resolve a non-empty font-family for ${label}. ` +
        `Checked via getComputedStyle(${opts.selector ?? `.${opts.tempClassName}`}).fontFamily.`
    );
  }
  return value;
}

/**
 * Extracts every design token the PDF guide template needs from an already-loaded, live page.
 * Does not call `page.goto()` — the caller (`capture.ts`, UG-T-7) owns navigation/auth; this
 * function only reads computed styles off whatever page it's handed.
 *
 * Throws (never silently defaults) if any of the 4 required color custom properties, or either
 * resolved font stack, comes back empty — see `readRootCustomProperty` / `resolveFontFamily`.
 */
export async function extractTokens(page: Page): Promise<TokensJson> {
  const [primary300, primary400, secondary400, orange500] = await Promise.all(
    REQUIRED_COLOR_TOKENS.map((name) => readRootCustomProperty(page, name))
  );

  const manrope = await resolveFontFamily(
    page,
    { selector: 'body' },
    "the Manrope display/UI stack (fonts.scss: html, body { font-family: 'Manrope', 'Poppins', sans-serif })"
  );
  const jetbrainsMono = await resolveFontFamily(
    page,
    { tempClassName: 'pr-code' },
    "the JetBrains Mono stack (fonts.scss: .pr-code { font-family: 'JetBrains Mono', ui-monospace, monospace })"
  );

  return {
    '--pr-color-primary-300': primary300,
    '--pr-color-primary-400': primary400,
    '--pr-color-secondary-400': secondary400,
    '--pr-color-orange-500': orange500,
    '--font-manrope': manrope,
    '--font-jetbrains-mono': jetbrainsMono
  };
}

/**
 * Writes the extracted tokens to `tokens.json` (default: the tooling package root, alongside
 * `routes.config.json` — gitignored per `.gitignore`, regenerated on every run). Kept separate
 * from `extractTokens` so the extraction logic can be unit-tested without touching disk, and so
 * a caller can redirect the output path (e.g. for a scratch/negative-path run) without needing a
 * different extraction function.
 */
export async function writeTokensJson(tokens: TokensJson, outFile?: string): Promise<string> {
  const resolvedOutFile = outFile ?? path.resolve(__dirname, '..', 'tokens.json');
  await fs.writeFile(resolvedOutFile, `${JSON.stringify(tokens, null, 2)}\n`, 'utf-8');
  return resolvedOutFile;
}
