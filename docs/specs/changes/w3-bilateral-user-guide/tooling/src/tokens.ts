/**
 * tokens.ts — live design-token extraction (UG-T-5, implements UG-DD-2).
 *
 * // @akili-spec changes/w3-bilateral-user-guide
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
 *
 * ---------------------------------------------------------------------------------------------
 * BG-T-6 addendum — build-time assertion against the app's own stylesheets (no browser needed).
 * ---------------------------------------------------------------------------------------------
 *
 * Implements `BG-R-9` / `BG-AC-9` / `BG-DD-7`, and the negative clause *NOT from
 * `docs/ux-ui/design.md` §7*. Everything above this addendum (`extractTokens` and friends) is
 * the UG-T-5 LIVE path — it needs an authenticated Playwright `Page`, which `BG-T-6` does not
 * have (this run is scoped to `BG-T-1`…`BG-T-6`, environment-free; see `tasks.md` line 9 and the
 * `BG-T-7`+ environment gate). `assertTemplateTokensMatchStylesheets` below is a SEPARATE,
 * build-time-only check: it reads `onecgiar-pr-client/src/styles/fonts.scss` and `colors.scss`
 * straight off disk (`fs`, no browser, no network) and compares them against the fallback
 * `:where(:root)` defaults `template/guide.css` (`BG-T-6`) carries for exactly this reason —
 * see that file's own header for why `:where()` (zero specificity) is required there, so these
 * defaults never win over a real live capture's injected `{{TOKENS_CSS}}` block.
 *
 * `docs/ux-ui/design.md` §7 is explicitly **NOT** a source anywhere in this addendum, and never
 * may become one. Its typography entry still names Poppins as the body face — the app has been
 * `Manrope, Poppins, sans-serif` since before this spec started, measured 2026-09-15 — and the
 * correction is an **unapplied, still-pending** kaizen standardization:
 * `docs/specs/kaizen/changes--user-guide-pdf.md` → Pending Items **P5**, `Target: docs/ux-ui/
 * design.md §7`, `Status: pending`. A doc correction that has not landed is not a source; trusting
 * it here would ship the guide in the wrong typeface, which is the one failure this task exists
 * to prevent (`design.md` §11 `P-9`, `design.md` §10 `BG-DD-7`'s rejected alternative "Trust
 * `design.md` §7 — known stale"). **Do not "helpfully" re-point this addendum at `design.md`
 * §7 — read `fonts.scss`/`colors.scss` directly, always.**
 *
 * `fonts.scss` declares its font stacks as LITERAL `font-family` lists with no `--font-*` custom
 * property to look up instead (kaizen P5 says this explicitly; verified again here by reading
 * the file) — so `readExpectedTokensFromStylesheets` below reads those literal declarations with
 * a regex anchored on the `html, body { … }` and `.pr-code { … }` rules, not a variable lookup.
 * `colors.scss` DOES declare the 4 required colors as real `:root` custom properties, so those
 * are read the same way `extractTokens` above documents them.
 */

import type { Page } from '@playwright/test';
import { promises as fs, readFileSync } from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

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

/* =================================================================================================
 * BG-T-6 — build-time assertion (no browser). See the file header addendum above for the full
 * rationale, in particular why `docs/ux-ui/design.md` §7 is never a source here.
 * ================================================================================================= */

/** The subset of `TokensJson` this build-time check can resolve without a live page. */
export type StaticTokens = Pick<
  TokensJson,
  '--font-manrope' | '--font-jetbrains-mono' | RequiredColorToken
>;

const FONTS_SCSS_REL_PATH = path.join('onecgiar-pr-client', 'src', 'styles', 'fonts.scss');
const COLORS_SCSS_REL_PATH = path.join('onecgiar-pr-client', 'src', 'styles', 'colors.scss');
/** `template/guide.css` lives inside THIS package, so it is resolved relative to `__dirname`
 * (matching `guards/read-only.ts`'s `LOG_PATH` convention) rather than via the repo-root lookup
 * used for the two stylesheets above, which live outside this tooling package entirely. */
const GUIDE_CSS_PATH = path.resolve(__dirname, '..', 'template', 'guide.css');

/**
 * Resolves the repo root via `git rev-parse --show-toplevel` — not a relative-path guess and not
 * assumed from `process.cwd()` — mirroring `guards/archive-immutable.ts`'s `resolveRepoRoot()`,
 * so this module runs correctly no matter where `ts-node` is invoked from inside the repo.
 */
function resolveRepoRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: __dirname,
      encoding: 'utf-8'
    }).trim();
  } catch (err) {
    throw new Error(
      '[tokens.ts assert] Could not resolve the repo root via `git rev-parse --show-toplevel` — ' +
        `this check must run inside a git working tree. Underlying error: ${
          err instanceof Error ? err.message : String(err)
        }`
    );
  }
}

/**
 * Extracts a rule block's raw body (`selector { ... }` -> the `...`) via a non-greedy match on
 * the FIRST `{ ... }` pair after the selector. Good enough for the two flat, single-level rules
 * this module reads (`html, body { ... }` and `.pr-code { ... }` in `fonts.scss`); throws rather
 * than returning an empty/undefined block so a renamed selector fails loudly instead of quietly
 * resolving an empty font-family.
 */
function extractRuleBody(cssText: string, selectorRegex: RegExp, ruleLabel: string, sourceLabel: string): string {
  const match = cssText.match(selectorRegex);
  if (!match) {
    throw new Error(
      `[tokens.ts assert] Could not find the "${ruleLabel}" rule in ${sourceLabel}. Expected the ` +
        `selector pattern ${selectorRegex} to match — the stylesheet may have been restructured.`
    );
  }
  return match[1];
}

/** Extracts a `font-family: <value>;` declaration's value out of an already-isolated rule body. */
function extractFontFamily(ruleBody: string, ruleLabel: string, sourceLabel: string): string {
  const match = ruleBody.match(/font-family:\s*([^;]+);/);
  if (!match) {
    throw new Error(
      `[tokens.ts assert] The "${ruleLabel}" rule in ${sourceLabel} has no font-family declaration.`
    );
  }
  return match[1].trim();
}

/** Extracts a `<propertyName>: <value>;` custom-property declaration from raw CSS/SCSS text. */
function extractCustomProperty(cssText: string, propertyName: string, sourceLabel: string): string {
  const escaped = propertyName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const match = cssText.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  if (!match) {
    throw new Error(
      `[tokens.ts assert] Could not find custom property "${propertyName}" in ${sourceLabel}.`
    );
  }
  return match[1].trim();
}

/**
 * Reads `fonts.scss` and `colors.scss` LITERALLY off disk (build time, no browser) and returns
 * the values this task's assertion treats as the expected/authoritative ones. Never touches
 * `docs/ux-ui/design.md` §7 — see the file header addendum for why.
 */
export function readExpectedTokensFromStylesheets(repoRoot: string = resolveRepoRoot()): StaticTokens {
  const fontsPath = path.join(repoRoot, FONTS_SCSS_REL_PATH);
  const colorsPath = path.join(repoRoot, COLORS_SCSS_REL_PATH);
  const fontsText = readFileSyncLabeled(fontsPath, `fonts.scss (${FONTS_SCSS_REL_PATH})`);
  const colorsText = readFileSyncLabeled(colorsPath, `colors.scss (${COLORS_SCSS_REL_PATH})`);

  const bodyRuleBody = extractRuleBody(
    fontsText,
    /html\s*,\s*\n\s*body\s*\{([\s\S]*?)\}/,
    'html, body',
    'fonts.scss'
  );
  const proCodeRuleBody = extractRuleBody(fontsText, /\.pr-code\s*\{([\s\S]*?)\}/, '.pr-code', 'fonts.scss');

  return {
    '--font-manrope': extractFontFamily(bodyRuleBody, 'html, body', 'fonts.scss'),
    '--font-jetbrains-mono': extractFontFamily(proCodeRuleBody, '.pr-code', 'fonts.scss'),
    '--pr-color-primary-300': extractCustomProperty(colorsText, '--pr-color-primary-300', 'colors.scss'),
    '--pr-color-primary-400': extractCustomProperty(colorsText, '--pr-color-primary-400', 'colors.scss'),
    '--pr-color-secondary-400': extractCustomProperty(colorsText, '--pr-color-secondary-400', 'colors.scss'),
    '--pr-color-orange-500': extractCustomProperty(colorsText, '--pr-color-orange-500', 'colors.scss')
  };
}

/**
 * Reads the values the template will actually render BEFORE any live capture overrides them —
 * `template/guide.css`'s `:where(:root) { ... }` fallback-default block (`BG-T-6`; see that
 * file's own header). This is deliberately the SAME set of 6 keys `readExpectedTokensFromStylesheets`
 * resolves, read from the template rather than the stylesheets, so the two can be compared
 * key-for-key.
 */
export function readTemplateDefaultTokens(guideCssPath: string = GUIDE_CSS_PATH): StaticTokens {
  const cssText = readFileSyncLabeled(guideCssPath, `template/guide.css (${guideCssPath})`);
  const defaultsBlock = extractRuleBody(
    cssText,
    /:where\(:root\)\s*\{([\s\S]*?)\}/,
    ':where(:root)',
    'template/guide.css'
  );

  return {
    '--font-manrope': extractCustomProperty(defaultsBlock, '--font-manrope', 'template/guide.css'),
    '--font-jetbrains-mono': extractCustomProperty(defaultsBlock, '--font-jetbrains-mono', 'template/guide.css'),
    '--pr-color-primary-300': extractCustomProperty(defaultsBlock, '--pr-color-primary-300', 'template/guide.css'),
    '--pr-color-primary-400': extractCustomProperty(defaultsBlock, '--pr-color-primary-400', 'template/guide.css'),
    '--pr-color-secondary-400': extractCustomProperty(defaultsBlock, '--pr-color-secondary-400', 'template/guide.css'),
    '--pr-color-orange-500': extractCustomProperty(defaultsBlock, '--pr-color-orange-500', 'template/guide.css')
  };
}

function readFileSyncLabeled(filePath: string, label: string): string {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(
      `[tokens.ts assert] Could not read ${label}. Underlying error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * The `BG-T-6` gate itself: compares every key `readTemplateDefaultTokens` resolves against
 * `readExpectedTokensFromStylesheets`, and throws ONE error naming every mismatch — expected vs
 * found — rather than stopping at the first. Never falls back to `docs/ux-ui/design.md` §7 (see
 * file header). Green (resolves, no throw) means the template's build-time defaults match the
 * app's own stylesheets, byte for byte.
 */
export function assertTemplateTokensMatchStylesheets(
  repoRoot: string = resolveRepoRoot(),
  guideCssPath: string = GUIDE_CSS_PATH
): void {
  const expected = readExpectedTokensFromStylesheets(repoRoot);
  const found = readTemplateDefaultTokens(guideCssPath);

  const mismatches: string[] = [];
  for (const key of Object.keys(expected) as (keyof StaticTokens)[]) {
    if (expected[key] !== found[key]) {
      mismatches.push(`  - ${key}: expected "${expected[key]}" (from fonts.scss/colors.scss), found "${found[key]}" (in template/guide.css)`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      '[tokens.ts assert] FAIL — template/guide.css\'s build-time token defaults do not match ' +
        `the app's own stylesheets (fonts.scss / colors.scss), never docs/ux-ui/design.md §7:\n${mismatches.join(
          '\n'
        )}`
    );
  }
}

/**
 * CLI entry point — `npx ts-node src/tokens.ts` (`tasks.md` `BG-T-6`'s "gate is `npx ts-node
 * src/tokens.ts` in assert mode"). Running this file directly performs ONLY the build-time
 * assertion above (never navigates, never touches a live page) and exits non-zero on any
 * mismatch, naming expected vs found.
 */
if (require.main === module) {
  try {
    assertTemplateTokensMatchStylesheets();
    // eslint-disable-next-line no-console
    console.log('[tokens.ts assert] OK — template/guide.css defaults match fonts.scss/colors.scss.');
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
