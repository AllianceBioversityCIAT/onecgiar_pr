/**
 * assemble.ts — content + tokens + screenshots -> dist/guide-assembled.html (UG-T-12).
 *
 * // @akili-spec changes/user-guide-pdf
 *
 * Pure template rendering (design.md §2.2, §6.2): reads `tokens.json` (UG-T-5),
 * `content/intro.md`, `content/sections/*.md`, `content/glossary.json`, and
 * `routes.config.json`, and renders them into `template/guide.html`
 * (UG-T-11) -> `dist/guide-assembled.html`. Never navigates a browser and
 * never mutates any of its inputs.
 *
 * Placeholder contract (see `template/README.md` — the binding source of
 * truth, not reproduced here beyond what this file needs to enforce it):
 * exactly 5 mustache placeholders (`{{TOKENS_CSS}}`, `{{BUILD_DATE}}`,
 * `{{INTRO}}`, `{{SECTIONS}}`, `{{GLOSSARY}}`), each replaced exactly once.
 * `replacePlaceholderOnce` below fails loudly if a placeholder's occurrence
 * count in the template is not exactly 1, and `main()` fails loudly if any
 * `{{...}}` remains in the assembled output afterwards — closing the
 * `UG-R-1` "no unrendered placeholder" scenario at this task's own DoD.
 *
 * Markdown support is intentionally minimal (Leader decision — no new
 * dependency): paragraphs, `**bold**`, `*italic*`, and `- ` bullet lists.
 * Verified against `content/` that this is the full set actually used.
 *
 * CSS inlining (not one of the 5 mustache placeholders, but load-bearing):
 * `template/guide.html`'s `<link rel="stylesheet" href="guide.css">` is a
 * path relative to `template/`, which breaks once the rendered document
 * moves to `dist/guide-assembled.html` (a different directory — the
 * stylesheet would 404 and the guide would silently render in the
 * browser's default serif font with none of the design tokens applied).
 * `assemble.ts` inlines `template/guide.css`'s contents into a `<style>`
 * tag in place of that `<link>` so the assembled document is self-contained
 * and correct regardless of where `dist/` sits relative to `template/`.
 *

 * Design-token shape guard (Leader decision, forward pointer from the
 * template review): before injecting `{{TOKENS_CSS}}`, every color token is
 * asserted to look like a color (hex/rgb()/hsl()) and every font token is
 * asserted to look like a comma-separated font-family stack — never
 * blindly trusting whatever `tokens.json` happens to contain.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { TokensJson } from './tokens';

const TOOLING_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_FILE = path.join(TOOLING_ROOT, 'template', 'guide.html');
const TEMPLATE_CSS_FILE = path.join(TOOLING_ROOT, 'template', 'guide.css');
const STYLESHEET_LINK_TAG = '<link rel="stylesheet" href="guide.css">';
const TOKENS_FILE = path.join(TOOLING_ROOT, 'tokens.json');
const CONTENT_DIR = path.join(TOOLING_ROOT, 'content');
const SECTIONS_DIR = path.join(CONTENT_DIR, 'sections');
const ROUTES_FILE = path.join(TOOLING_ROOT, 'routes.config.json');
const DIST_DIR = path.join(TOOLING_ROOT, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'guide-assembled.html');

// ============================================================================
// Types
// ============================================================================

/** Mirrors the shape `capture.ts` (UG-T-7) writes into `routes.config.json` (UG-T-3). */
interface RouteConfig {
  id: string;
  url: string;
  readySelector: string;
  clickTarget: string;
  captionKey: string;
  viewport?: { width: number; height: number };
  fullPage?: boolean;
}

/** Mirrors `content/glossary.json`'s entry shape. */
interface GlossaryEntry {
  term: string;
  definition: string | null;
  sourceUrl: string | null;
  accessedOn: string;
  flag?: string;
  source?: string;
}

/** Static per-section copy that is NOT derived from a file (title/eyebrow/alt/caption). */
interface SectionMeta {
  sectionId: string;
  routeCaptionKey: string;
  contentFile: string;
  eyebrow: string;
  title: string;
  alt: string;
  caption: string;
}

// ============================================================================
// Section order/metadata — LOAD-BEARING: this exact order is what UG-T-13
// asserts against `template/README.md`'s heading-count contract.
// ============================================================================

const SECTIONS: SectionMeta[] = [
  {
    sectionId: 'section-landing',
    routeCaptionKey: '01-landing',
    contentFile: '01-landing.md',
    eyebrow: '01 · Landing Page',
    title: 'Landing Page',
    alt: 'Screenshot of the Landing Page with the Report button on the first My CGIAR Centers card highlighted',
    caption: 'Click Report on the first My CGIAR Centers card to begin reporting.'
  },
  {
    sectionId: 'section-overview',
    routeCaptionKey: '02-overview',
    contentFile: '02-overview.md',
    eyebrow: '02 · Overview Dashboard',
    title: 'Overview Dashboard',
    alt: 'Screenshot of the Overview Dashboard with the Continue reporting button highlighted',
    caption: 'Click Continue reporting to move from the Overview into the Reporting tab.'
  },
  {
    sectionId: 'section-reporting',
    routeCaptionKey: '03-reporting',
    contentFile: '03-reporting.md',
    eyebrow: '03 · Reporting Page',
    title: 'Reporting Page',
    alt: 'Screenshot of the Reporting Page with the Where to report link highlighted',
    caption: 'Click Where to report for guidance on which Area of Work a result belongs to.'
  },
  {
    sectionId: 'section-results-center',
    routeCaptionKey: '04-results-center',
    contentFile: '04-results-center.md',
    eyebrow: '04 · Results Center',
    title: 'Results Center',
    alt: 'Screenshot of the Results Center with the Update result button highlighted',
    caption: 'Click Update result after filtering to the result you need to change.'
  },
  {
    sectionId: 'section-notifications',
    routeCaptionKey: '05-notifications',
    contentFile: '05-notifications.md',
    eyebrow: '05 · Notifications',
    title: 'Notifications',
    alt: 'Screenshot of the Notifications page with the first pending request card highlighted',
    caption: 'Open the first pending request and choose Accept contribution or Decline contribution.'
  },
  {
    sectionId: 'section-innovation-packages',
    routeCaptionKey: '06-innovation-packages',
    contentFile: '06-innovation-packages.md',
    eyebrow: '06 · Innovation Packages',
    title: 'Innovation Packages',
    alt: "Screenshot of the Innovation Packages page with the first package's title link highlighted",
    caption: "Click a package's title in the table to open its full assessment."
  }
];

/** Exact order + keys `template/README.md` requires inside the `{{TOKENS_CSS}}` slot. */
const TOKENS_CSS_ORDER: (keyof TokensJson)[] = [
  '--pr-color-primary-300',
  '--pr-color-primary-400',
  '--pr-color-secondary-400',
  '--pr-color-orange-500',
  '--font-manrope',
  '--font-jetbrains-mono'
];

const COLOR_TOKEN_KEYS: (keyof TokensJson)[] = TOKENS_CSS_ORDER.slice(0, 4) as (keyof TokensJson)[];
const FONT_TOKEN_KEYS: (keyof TokensJson)[] = TOKENS_CSS_ORDER.slice(4) as (keyof TokensJson)[];

/** Accepts hex, `rgb()`/`rgba()`, and `hsl()`/`hsla()` — every shape `tokens.ts` can produce. */
const COLOR_SHAPE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/;

/** A comma-separated font-family stack (>= 2 entries), quoted names allowed. */
const FONT_SHAPE = /^[A-Za-z0-9"'.\- ]+(,\s*[A-Za-z0-9"'.\- ]+)+$/;

// ============================================================================
// Minimal markdown -> HTML (paragraphs, **bold**, *italic*, "- " bullet lists)
// ============================================================================

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return out;
}

function renderMarkdown(source: string): string {
  const blocks = source.trim().split(/\n\s*\n+/).filter((block) => block.trim().length > 0);
  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const isBulletList = lines.length > 0 && lines.every((line) => line.startsWith('- '));
      if (isBulletList) {
        const items = lines.map((line) => `<li>${renderInline(line.slice(2).trim())}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${renderInline(lines.join(' '))}</p>`;
    })
    .join('\n    ');
}

// ============================================================================
// Placeholder substitution
// ============================================================================

/**
 * Replaces `token` in `html` with `value`, asserting it occurs exactly once first.
 * Uses split/join (not `String.replace`) so `value` can contain `$`-sequences
 * (e.g. from rendered content) without triggering `String.replace`'s special
 * replacement-pattern syntax.
 */
function replacePlaceholderOnce(html: string, token: string, value: string, label: string): string {
  const occurrences = html.split(token).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `[assemble] Expected exactly 1 occurrence of ${token} (${label}) in template/guide.html, found ${occurrences}.`
    );
  }
  return html.split(token).join(value);
}

// ============================================================================
// Design tokens
// ============================================================================

function assertTokensShape(tokens: Record<string, string>): void {
  for (const key of TOKENS_CSS_ORDER) {
    if (typeof tokens[key] !== 'string' || tokens[key].trim().length === 0) {
      throw new Error(
        `[assemble] tokens.json is missing required key "${key}" (or it is empty). ` +
          'Re-run "npm run capture" (see UG-T-5/UG-DD-2) to regenerate it.'
      );
    }
  }
  for (const key of COLOR_TOKEN_KEYS) {
    const value = tokens[key].trim();
    if (!COLOR_SHAPE.test(value)) {
      throw new Error(
        `[assemble] tokens.json["${key}"] = "${value}" does not look like a color ` +
          '(expected hex, rgb()/rgba(), or hsl()/hsla()). Refusing to inject it into {{TOKENS_CSS}}.'
      );
    }
  }
  for (const key of FONT_TOKEN_KEYS) {
    const value = tokens[key].trim();
    if (!FONT_SHAPE.test(value)) {
      throw new Error(
        `[assemble] tokens.json["${key}"] = "${value}" does not look like a font-family stack ` +
          '(expected comma-separated font names). Refusing to inject it into {{TOKENS_CSS}}.'
      );
    }
  }
}

function buildTokensCss(tokens: TokensJson): string {
  return TOKENS_CSS_ORDER.map((key) => `${key}: ${tokens[key]};`).join('\n    ');
}

/**
 * `YYYY-MM-DD` in the **builder's local timezone**, not UTC. `toISOString()` was previously used
 * here and stamped the cover with tomorrow's date for anyone building in a timezone behind UTC
 * (a 2026-09-15 evening build read "Built 2026-09-16"). `en-CA` is the locale whose short date
 * format is exactly `YYYY-MM-DD`, so no manual padding/reordering is needed.
 */
function buildDateLocal(): string {
  return new Date().toLocaleDateString('en-CA');
}

// ============================================================================
// Sections
// ============================================================================

async function renderSections(routes: RouteConfig[]): Promise<string> {
  const routesByCaptionKey = new Map(routes.map((route) => [route.captionKey, route]));

  const blocks = await Promise.all(
    SECTIONS.map(async (meta) => {
      const route = routesByCaptionKey.get(meta.routeCaptionKey);
      if (!route) {
        throw new Error(
          `[assemble] No entry in routes.config.json has captionKey "${meta.routeCaptionKey}" ` +
            `(needed for section "${meta.sectionId}").`
        );
      }

      const contentPath = path.join(SECTIONS_DIR, meta.contentFile);
      const raw = await fs.readFile(contentPath, 'utf-8');
      const prose = renderMarkdown(raw);

      // Fail here, naming the route, rather than emitting an <img> whose src 404s: a missing
      // capture otherwise surfaces only as a blank box in the final PDF (verify-structure.ts
      // checks `naturalWidth` as the second line of defence, this is the first).
      const capturePath = path.join(TOOLING_ROOT, 'raw', `${route.id}.png`);
      try {
        await fs.access(capturePath);
      } catch {
        throw new Error(
          `[assemble] Missing screenshot for route id "${route.id}" (section "${meta.sectionId}"): ` +
            `expected ${capturePath}. Re-run "npm run capture" to regenerate it.`
        );
      }

      const imgSrc = path.posix.join('..', 'raw', `${route.id}.png`);

      return [
        `<section class="ug-section" id="${meta.sectionId}">`,
        `  <header class="ug-section__header">`,
        `    <span class="ug-section__eyebrow ug-mono">${escapeHtml(meta.eyebrow)}</span>`,
        `    <h2>${escapeHtml(meta.title)}</h2>`,
        `  </header>`,
        ``,
        `  <div class="ug-prose">`,
        `    ${prose}`,
        `  </div>`,
        ``,
        `  <figure class="ug-figure">`,
        `    <img src="${imgSrc}" alt="${escapeAttr(meta.alt)}">`,
        `    <figcaption class="ug-caption">`,
        `      <span>${escapeHtml(meta.caption)}</span>`,
        `      <code class="ug-mono ug-route">${escapeHtml(route.url)}</code>`,
        `    </figcaption>`,
        `  </figure>`,
        `</section>`
      ].join('\n');
    })
  );

  return blocks.join('\n\n  ');
}

// ============================================================================
// Glossary
// ============================================================================

function renderGlossaryCitation(entry: GlossaryEntry): string {
  const accessed = `accessed on ${entry.accessedOn}`;
  if (entry.sourceUrl) {
    return `<cite>Source: <a href="${escapeAttr(entry.sourceUrl)}">CLARISA glossary</a> — ${accessed}</cite>`;
  }
  if (entry.source) {
    return `<cite>Source: ${escapeHtml(entry.source)} — ${accessed}</cite>`;
  }
  throw new Error(
    `[assemble] glossary entry "${entry.term}" has neither "sourceUrl" nor "source" to cite from.`
  );
}

/**
 * Renders `<dt>`/`<dd>` pairs. Entries with `definition: null` (e.g. "OICR
 * (Outcome Impact Case Report)") are skipped — never rendering a literal
 * "null" or an empty `<dd>` (Leader decision) — and each skipped term is named
 * on stderr so a silently-dropped glossary entry is visible in the build log.
 *
 * Each pair is wrapped in `<div class="ug-glossary__entry">` so `guide.css` can
 * hold the term and its definition on one page with `break-inside: avoid`;
 * a `<div>` grouping a `<dt>`/`<dd>` pair inside a `<dl>` is valid HTML5 and
 * leaves the `<dt>`/`<dd>` descendant counts `verify-structure.ts` (UG-T-13)
 * asserts against unchanged.
 */
function renderGlossary(entries: GlossaryEntry[]): string {
  const renderable: GlossaryEntry[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (typeof entry.definition === 'string' && entry.definition.trim().length > 0) {
      renderable.push(entry);
    } else {
      skipped.push(entry.term);
    }
  }

  for (const term of skipped) {
    console.warn(`[assemble] glossary entry "${term}" skipped — its "definition" is null/empty.`);
  }

  if (renderable.length === 0) {
    throw new Error('[assemble] glossary.json produced zero renderable entries (all definitions null/empty?).');
  }

  return renderable
    .map((entry) => {
      const dt = `<dt>${escapeHtml(entry.term)}</dt>`;
      const dd = `<dd>${escapeHtml((entry.definition as string).trim())} ${renderGlossaryCitation(entry)}</dd>`;
      return `<div class="ug-glossary__entry">\n        ${dt}\n        ${dd}\n      </div>`;
    })
    .join('\n      ');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const [templateRaw, cssRaw, tokensRaw, introRaw, routesRaw, glossaryRaw] = await Promise.all([
    fs.readFile(TEMPLATE_FILE, 'utf-8'),
    fs.readFile(TEMPLATE_CSS_FILE, 'utf-8'),
    fs.readFile(TOKENS_FILE, 'utf-8'),
    fs.readFile(path.join(CONTENT_DIR, 'intro.md'), 'utf-8'),
    fs.readFile(ROUTES_FILE, 'utf-8'),
    fs.readFile(path.join(CONTENT_DIR, 'glossary.json'), 'utf-8')
  ]);

  const rawTokens = JSON.parse(tokensRaw) as Record<string, string>;
  assertTokensShape(rawTokens);
  const tokens = rawTokens as unknown as TokensJson;

  const routes = JSON.parse(routesRaw) as RouteConfig[];
  const glossaryEntries = JSON.parse(glossaryRaw) as GlossaryEntry[];

  let html = replacePlaceholderOnce(
    templateRaw,
    STYLESHEET_LINK_TAG,
    `<style>\n${cssRaw}\n</style>`,
    'inlined guide.css (path-relative <link> would break once moved into dist/)'
  );
  html = replacePlaceholderOnce(html, '{{TOKENS_CSS}}', buildTokensCss(tokens), 'design tokens');
  html = replacePlaceholderOnce(html, '{{BUILD_DATE}}', `Built ${buildDateLocal()}`, 'build date');
  html = replacePlaceholderOnce(html, '{{INTRO}}', renderMarkdown(introRaw), 'intro');
  html = replacePlaceholderOnce(html, '{{SECTIONS}}', await renderSections(routes), 'sections');
  html = replacePlaceholderOnce(html, '{{GLOSSARY}}', renderGlossary(glossaryEntries), 'glossary');

  if (html.includes('{{')) {
    const leftover = html.match(/\{\{[^}]*\}\}/);
    throw new Error(
      `[assemble] Unrendered template placeholder remained after substitution: ${
        leftover ? leftover[0] : '(unknown)'
      }`
    );
  }

  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, html, 'utf-8');
  console.log(`[assemble] wrote ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
