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
import { assertShippedTokensMatchStylesheets } from './tokens';

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

/**
 * One figure inside a section: which route's capture to embed (`routeCaptionKey`, matched
 * against `routes.config.json`'s `captionKey`), plus that FIGURE's own `alt`/`caption` — never
 * shared across figures in the same section, because two different screenshots need two
 * different descriptions (`BG-R-12`'s non-empty, accurate `alt` requirement).
 */
interface FigureMeta {
  routeCaptionKey: string;
  alt: string;
  caption: string;
}

/**
 * Static per-section copy that is NOT derived from a file (title/eyebrow/figures).
 *
 * `figures` is `FigureMeta[]` — ZERO OR MORE, not the W1/W2-era "exactly one capture per
 * section" (`routeCaptionKey: string`). That 1:1 pairing held for W1/W2 (6 sections, 6
 * captures) and is false for this guide (16 sections, 17 captures): the introduction and the
 * glossary are rendered outside `SECTIONS` entirely (see `main()`'s `{{INTRO}}`/`{{GLOSSARY}}`
 * handling below), "Finding your project" and "The manual form" each carry TWO figures, and
 * "The editor at a glance" carries none (`BG-T-13`, carried from `BG-T-10`).
 */
interface SectionMeta {
  sectionId: string;
  contentFile: string;
  eyebrow: string;
  title: string;
  figures: FigureMeta[];
}

// ============================================================================
// Section order/metadata — LOAD-BEARING: this exact order is what UG-T-13
// asserts against `template/README.md`'s heading-count contract.
//
// Derived (BG-T-13) from `design.md` §8.1's capture plan, `routes.config.json`'s `captionKey`s,
// and the actual `content/sections/*.md` files — never guessed and never taken from a summary.
// Section numbering (02…17) follows `proposal.md` §4's approved structure: row 1 (Introduction)
// and row 18 (Glossary) are rendered outside this array by `main()`, so the array below covers
// rows 2–17 only.
//
// ⚠️ Sections 8 and 9 CROSS on purpose: guide section 8 ("Overview", `08-overview.md`) pairs
// with capture `09-editor-overview`, and section 9 ("General information", `09-general-
// information.md`) pairs with capture `08-editor-general-info`. The captures are numbered by
// CAPTURE ORDER (General information is the editor's landing section and needs no rail click,
// so it was shot first; Overview needs one rail click and was shot second) while the guide
// follows the RAIL's own display order (Overview heads the rail, General information is below
// it) — confirmed against both files' own prose (`08-overview.md`: "Clicking Overview in the
// section rail — it is not where the editor opens..."; `09-general-information.md`: "This is
// where the editor actually opens — General information, not Overview..."). Getting this
// backwards reproduces `P-11`, a Judgment Day finding, and mislabels a figure with the wrong
// section (defect class D8, which has no automated gate).
// ============================================================================

const SECTIONS: SectionMeta[] = [
  {
    sectionId: 'section-workspace',
    contentFile: '02-workspace.md',
    eyebrow: '02 · The Bilateral Workspace',
    title: 'The Bilateral Workspace',
    figures: [
      {
        routeCaptionKey: '01-workspace-identity',
        alt: 'Screenshot of the Bilateral Center workspace with the Center identity band and the four tabs highlighted',
        caption: 'The Center identity band sits above the Overview, Reporting, Results, and AI Draft Results tabs.'
      }
    ]
  },
  {
    sectionId: 'section-finding-your-project',
    contentFile: '03-finding-your-project.md',
    eyebrow: '03 · Finding Your Project',
    title: 'Finding Your Project',
    figures: [
      {
        routeCaptionKey: '02-catalog',
        alt: 'Screenshot of the project catalog with the KPI filter cards and a project card highlighted',
        caption: 'Filter the catalog with the KPI cards, then locate the project you want to report against.'
      },
      {
        routeCaptionKey: '03-catalog-create-cta',
        alt: 'Screenshot of a project card with the Create result control highlighted',
        caption: 'Click Create result on the project card to start reporting a new bilateral result for it.'
      }
    ]
  },
  {
    sectionId: 'section-starting-a-result',
    contentFile: '04-starting-a-result.md',
    eyebrow: '04 · Starting a Result',
    title: 'Starting a Result',
    figures: [
      {
        routeCaptionKey: '04-drawer-sp',
        alt: 'Screenshot of the Set up bilateral result drawer at step 1, choosing the Primary Science Program',
        caption: 'Step 1 of the setup drawer — choose the Primary Science Program this result is reported against.'
      }
    ]
  },
  {
    sectionId: 'section-choosing-how-to-report',
    contentFile: '05-choosing-how-to-report.md',
    eyebrow: '05 · Choosing How to Report',
    title: 'Choosing How to Report',
    figures: [
      {
        routeCaptionKey: '05-drawer-method',
        alt: 'Screenshot of the setup drawer step 2, choosing between AI-Assisted and Complete the Form Manually',
        caption: 'Step 2 of the setup drawer — this guide follows the Complete the Form Manually path from here.'
      }
    ]
  },
  {
    sectionId: 'section-manual-form',
    contentFile: '06-manual-form.md',
    eyebrow: '06 · The Manual Form',
    title: 'The Manual Form',
    figures: [
      {
        routeCaptionKey: '06-manual-form',
        alt: 'Screenshot of the manual form with the Select Result Level and Result Type fields',
        caption: 'Choosing a Result Level reveals the Result Type dropdown, scoped to that level.'
      },
      {
        routeCaptionKey: '07-manual-form-title',
        alt: 'Screenshot of the manual form Result title field with its word gauge',
        caption: 'The Result title field and its word gauge, which tracks the 30-word limit as you type.'
      }
    ]
  },
  {
    sectionId: 'section-editor-at-a-glance',
    contentFile: '07-editor-at-a-glance.md',
    eyebrow: '07 · The Editor at a Glance',
    title: 'The Editor at a Glance',
    // No figure: this section narrates the rail/footer shell in general terms; every part of
    // it (rail, "N of M sections complete", footer) is shown concretely in the sections that
    // follow, so no screenshot of its own is needed (`BG-T-13`, carried from `BG-T-10`).
    figures: []
  },
  {
    sectionId: 'section-overview',
    contentFile: '08-overview.md',
    eyebrow: '08 · Overview',
    title: 'Overview',
    figures: [
      {
        routeCaptionKey: '09-editor-overview',
        alt: "Screenshot of the editor's Overview section, showing the linked project summary and its two editable fields",
        caption: 'Overview — a read-only summary of the linked project; Project and Program are the two fields you can still change here.'
      }
    ]
  },
  {
    sectionId: 'section-general-information',
    contentFile: '09-general-information.md',
    eyebrow: '09 · General Information',
    title: 'General Information',
    figures: [
      {
        routeCaptionKey: '08-editor-general-info',
        alt: "Screenshot of the editor's General information section, the section it opens on by default",
        caption: 'General information — the section the editor opens on, carrying Title of Result, Description of Result, and the lead contact.'
      }
    ]
  },
  {
    sectionId: 'section-contributors-partners',
    contentFile: '10-contributors-and-partners.md',
    eyebrow: '10 · Contributors & Partners',
    title: 'Contributors & Partners',
    figures: [
      {
        routeCaptionKey: '10-editor-contributors',
        alt: 'Screenshot of the Contributors & partners section with its read-only and optional picker fields',
        caption: 'Contributors & partners — Primary Science Program and Lead Center are read-only; the pickers below are optional.'
      }
    ]
  },
  {
    sectionId: 'section-geographic-location',
    contentFile: '11-geographic-location.md',
    eyebrow: '11 · Geographic Location',
    title: 'Geographic Location',
    figures: [
      {
        routeCaptionKey: '11-editor-geography',
        alt: 'Screenshot of the Geographic location section with its geographic-focus choice',
        caption: 'Geographic location — the geographic-focus choice determines which further fields appear.'
      }
    ]
  },
  {
    sectionId: 'section-evidence',
    contentFile: '12-evidence.md',
    eyebrow: '12 · Evidence',
    title: 'Evidence',
    figures: [
      {
        routeCaptionKey: '12-editor-evidence',
        alt: 'Screenshot of the Evidence section with the Add evidence control',
        caption: 'Evidence — at least one entry with a valid link is required before the section is complete.'
      }
    ]
  },
  {
    sectionId: 'section-type-specific-details',
    contentFile: '13-type-specific-details.md',
    eyebrow: '13 · Type-Specific Details',
    title: 'Type-Specific Details',
    figures: [
      {
        routeCaptionKey: '13-editor-type-specific',
        alt: "Screenshot of the Type-specific details section for the result's own type",
        caption: "Type-specific details — the fields shown change with the result's own type; absent for Other Outcome and Other Output."
      }
    ]
  },
  {
    sectionId: 'section-saving-your-work',
    contentFile: '14-saving-your-work.md',
    eyebrow: '14 · Saving Your Work',
    title: 'Saving Your Work',
    figures: [
      {
        routeCaptionKey: '14-editor-footer-save',
        alt: 'Screenshot of the editor footer with the Save draft button and position indicator',
        caption: "The footer's Save draft button and its own save state, alongside the Section X of Y position indicator."
      }
    ]
  },
  {
    sectionId: 'section-quality-check-submit',
    contentFile: '15-ai-quality-check-and-submit.md',
    eyebrow: '15 · The AI Quality Check and Submit for Review',
    title: 'The AI Quality Check and Submit for Review',
    figures: [
      {
        routeCaptionKey: '15-rail-submit',
        alt: "Screenshot of the section rail's Submit for review button and its submit note",
        caption: 'Submit for review starts the AI quality check first — it does not submit the result directly.'
      }
    ]
  },
  {
    sectionId: 'section-ai-assisted-drafts',
    contentFile: '16-ai-assisted-path-and-drafts.md',
    eyebrow: '16 · The AI-Assisted Path and AI Draft Results',
    title: 'The AI-Assisted Path and AI Draft Results',
    figures: [
      {
        routeCaptionKey: '16-drafts',
        alt: 'Screenshot of the AI Draft Results tab listing drafts awaiting review',
        caption: 'The AI Draft Results (My Drafts) tab lists AI-generated drafts awaiting your review.'
      }
    ]
  },
  {
    sectionId: 'section-result-statuses',
    contentFile: '17-result-statuses.md',
    eyebrow: '17 · Result Statuses',
    title: 'Result Statuses',
    figures: [
      {
        routeCaptionKey: '17-results-status',
        alt: 'Screenshot of the Results tab with the status column highlighted',
        caption: "The Results tab lets you filter results and track each one's review status."
      }
    ]
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

/**
 * Renders zero or more `<figure>` blocks for one section (`BG-T-13` — widened from the
 * W1/W2-era "exactly one capture per section"). Each figure resolves its OWN route by
 * `routeCaptionKey` and carries its OWN `alt`/`caption`, so two figures in the same section
 * (e.g. "Finding your project") describe two different screenshots correctly instead of
 * repeating one caption across both.
 */
async function renderFigures(sectionId: string, figures: FigureMeta[], routesByCaptionKey: Map<string, RouteConfig>): Promise<string> {
  const rendered = await Promise.all(
    figures.map(async (figure) => {
      const route = routesByCaptionKey.get(figure.routeCaptionKey);
      if (!route) {
        throw new Error(
          `[assemble] No entry in routes.config.json has captionKey "${figure.routeCaptionKey}" ` +
            `(needed for section "${sectionId}").`
        );
      }

      // Fail here, naming the route, rather than emitting an <img> whose src 404s: a missing
      // capture otherwise surfaces only as a blank box in the final PDF (verify-structure.ts
      // checks `naturalWidth` as the second line of defence, this is the first).
      const capturePath = path.join(TOOLING_ROOT, 'raw', `${route.id}.png`);
      try {
        await fs.access(capturePath);
      } catch {
        throw new Error(
          `[assemble] Missing screenshot for route id "${route.id}" (section "${sectionId}"): ` +
            `expected ${capturePath}. Re-run "npm run capture" to regenerate it.`
        );
      }

      const imgSrc = path.posix.join('..', 'raw', `${route.id}.png`);

      return [
        `  <figure class="ug-figure">`,
        `    <img src="${imgSrc}" alt="${escapeAttr(figure.alt)}">`,
        `    <figcaption class="ug-caption">`,
        `      <span>${escapeHtml(figure.caption)}</span>`,
        `      <code class="ug-mono ug-route">${escapeHtml(route.url)}</code>`,
        `    </figcaption>`,
        `  </figure>`
      ].join('\n');
    })
  );

  return rendered.join('\n\n');
}

async function renderSections(routes: RouteConfig[]): Promise<string> {
  const routesByCaptionKey = new Map(routes.map((route) => [route.captionKey, route]));

  const blocks = await Promise.all(
    SECTIONS.map(async (meta) => {
      const contentPath = path.join(SECTIONS_DIR, meta.contentFile);
      const raw = await fs.readFile(contentPath, 'utf-8');
      const prose = renderMarkdown(raw);
      const figuresHtml = await renderFigures(meta.sectionId, meta.figures, routesByCaptionKey);

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
        ...(figuresHtml.length > 0 ? ['', figuresHtml] : []),
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

  // BG-T-13 (carried from BG-T-6): `template/guide.css`'s `:where(:root)` defaults are inert in
  // every SHIPPED pdf, because this function always injects `tokens.json` into a real `:root`
  // rule that wins the cascade over them. BG-T-6 only ever compared guide.css's defaults to
  // fonts.scss/colors.scss — never the values a real build actually renders with. This asserts
  // the live tokens.json against the same stylesheets, with quote normalization (Chromium
  // serializes `'Manrope'` as `Manrope`, which is why a byte comparison was not viable in
  // BG-T-6 either — see `tokens.ts`'s `normalizeFontStack`).
  assertShippedTokensMatchStylesheets(rawTokens);

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
