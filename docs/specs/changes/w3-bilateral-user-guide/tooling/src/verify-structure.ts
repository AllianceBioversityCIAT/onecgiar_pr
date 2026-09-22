/**
 * verify-structure.ts — automated structural gate for the assembled guide (UG-T-13).
 *
 * // @akili-spec changes/user-guide-pdf
 *
 * Implements the automated half of `UG-AC-1` (requirements.md §8/§9): parses
 * `dist/guide-assembled.html` (via a real Chromium DOM — no regex-only HTML
 * parsing, no new dependency beyond the Playwright already in devDependencies)
 * and asserts:
 *
 *   - an intro block (`#intro`) is present;
 *   - exactly the 16 expected `<h2>` headings exist inside `#sections`, in the
 *     specified order, with the specified `id`s (`template/README.md`);
 *   - 19 `<h2>` elements total (intro + TOC + 16 sections + glossary);
 *   - the hand-authored TOC in `template/guide.html` agrees with that section set: every
 *     `#…` anchor resolves to a real `<section>`, every section is listed, and the order and
 *     labels match (BG-T-13 — the TOC is a third mirror of the section list and was ungated);
 *   - every TOC numeral agrees with the numeral its own target section prints in its
 *     `.ug-section__eyebrow` (BG-T-13 HITL — the numeral was a FOURTH, still-ungated mirror:
 *     the anchor/count/order/label assertions above all pass while the TOC numbers its first
 *     section "99", which was reproduced at source before this gate existed);
 *   - the glossary block has >= 1 `<dt>` and zero empty `<dd>`;
 *   - every `<img>` has a non-empty `alt`;
 *   - every `<img>` actually decoded (`naturalWidth > 0`) — a broken/missing
 *     screenshot otherwise reaches the PDF as a silent blank box;
 *   - no leftover `{{...}}` placeholder;
 *   - no stray unconverted markdown (`**` or a literal `##` heading marker).
 *
 * Exits non-zero, naming every violation (including which section is
 * missing/misordered), on any failure — never silently passes a broken
 * assembly through to `pdf.ts` (UG-T-14).
 *
 * Usage: `ts-node src/verify-structure.ts [path-to-html]` — defaults to
 * `dist/guide-assembled.html`. The optional path argument exists so a
 * negative-path check can point this script at a mutated scratch copy
 * without touching the real build output (see this task's DoD).
 */

import 'dotenv/config';
import { chromium } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';

const DEFAULT_TARGET = path.resolve(__dirname, '..', 'dist', 'guide-assembled.html');

// LOAD-BEARING (BG-T-13): must mirror `assemble.ts`'s `SECTIONS` array exactly — same ids, same
// titles, same order — or this gate either fails the build or, worse, passes green over the
// wrong section set (found by `BG-T-12`'s Reviewer: this table was still the verbatim W1/W2
// section ids, a second stale table alongside `assemble.ts`'s own). Derived the same way that
// one was: `design.md` §8.1 + `proposal.md` §4 + the actual `content/sections/*.md` files.
const EXPECTED_SECTIONS: ReadonlyArray<{ id: string; title: string }> = [
  { id: 'section-workspace', title: 'The Bilateral Workspace' },
  { id: 'section-finding-your-project', title: 'Finding Your Project' },
  { id: 'section-starting-a-result', title: 'Starting a Result' },
  { id: 'section-choosing-how-to-report', title: 'Choosing How to Report' },
  { id: 'section-manual-form', title: 'The Manual Form' },
  { id: 'section-editor-at-a-glance', title: 'The Editor at a Glance' },
  { id: 'section-overview', title: 'Overview' },
  { id: 'section-general-information', title: 'General Information' },
  { id: 'section-contributors-partners', title: 'Contributors & Partners' },
  { id: 'section-geographic-location', title: 'Geographic Location' },
  { id: 'section-evidence', title: 'Evidence' },
  { id: 'section-type-specific-details', title: 'Type-Specific Details' },
  { id: 'section-saving-your-work', title: 'Saving Your Work' },
  { id: 'section-quality-check-submit', title: 'The AI Quality Check and Submit for Review' },
  { id: 'section-ai-assisted-drafts', title: 'The AI-Assisted Path and AI Draft Results' },
  { id: 'section-result-statuses', title: 'Result Statuses' }
];

const EXPECTED_TOTAL_H2 = 19; // intro (1) + TOC (1) + #sections (16) + glossary (1)

class StructureError extends Error {}

interface SectionHeading {
  id: string | null;
  text: string;
}

interface PageStructure {
  totalH2Count: number;
  introExists: boolean;
  sectionHeadings: SectionHeading[];
  glossaryDtCount: number;
  emptyDdCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  /** `alt` (or `src` when `alt` is empty) of every `<img>` whose bitmap did not decode. */
  unloadedImages: string[];
  /**
   * The TOC's `<a href="#…">` targets and labels, in document order. `template/guide.html`
   * hand-authors the TOC, so it is a THIRD mirror of the section list alongside
   * `assemble.ts`'s `SECTIONS` and this file's `EXPECTED_SECTIONS` — and the only one nothing
   * used to check. A TOC entry pointing at an id no section carries ships as a dead link in
   * the PDF with every other gate green (BG-T-13's falsifier names this case explicitly).
   */
  tocEntries: { href: string; label: string; num: string }[];
  /** Every `id` present in the document — the resolution set for TOC anchors. */
  documentIds: string[];
  /**
   * `id` -> that block's own `.ug-section__eyebrow` text (e.g. `section-workspace` ->
   * `"02 · The Bilateral Workspace"`, `glossary` -> `"Reference"`).
   *
   * This is the DERIVED expectation for the TOC numerals: `assemble.ts`'s `SECTIONS` already
   * carries each section's number in its `eyebrow`, and the assembled document prints it. The
   * numerals are therefore checked against the sections themselves, NOT against a literal list
   * in this file — a fifth hard-coded mirror of the section list is the exact defect BG-T-13
   * spent its budget removing.
   */
  eyebrowsById: Record<string, string>;
}

async function readStructure(targetPath: string): Promise<PageStructure & { rawHtml: string }> {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    const fileUrl = `file://${path.resolve(targetPath)}`;
    await page.goto(fileUrl);

    const rawHtml = await fs.readFile(targetPath, 'utf-8');

    const structure = await page.evaluate((): PageStructure => {
      const totalH2Count = document.querySelectorAll('h2').length;
      const introExists = document.querySelector('#intro') !== null;

      const sectionsRoot = document.querySelector('#sections');
      const sectionHeadings: SectionHeading[] = sectionsRoot
        ? Array.from(sectionsRoot.querySelectorAll(':scope > section')).map((sectionEl) => {
            const h2 = sectionEl.querySelector('h2');
            return {
              id: sectionEl.getAttribute('id'),
              text: h2 ? (h2.textContent ?? '').trim() : ''
            };
          })
        : [];

      const glossaryDl = document.querySelector('#glossary dl');
      const glossaryDtCount = glossaryDl ? glossaryDl.querySelectorAll('dt').length : 0;
      const ddEls = glossaryDl ? Array.from(glossaryDl.querySelectorAll('dd')) : [];
      const emptyDdCount = ddEls.filter((dd) => (dd.textContent ?? '').trim().length === 0).length;

      const imgs = Array.from(document.querySelectorAll('img'));
      const imageCount = imgs.length;
      const imagesMissingAlt = imgs.filter((img) => (img.getAttribute('alt') ?? '').trim().length === 0).length;

      // `page.goto` resolves on the `load` event, so every <img> has finished loading (or
      // failed) by now: `naturalWidth === 0` means the bitmap never decoded — a missing or
      // corrupt `raw/*.png`, or a src that does not resolve from dist/.
      const unloadedImages = imgs
        .filter((img) => img.naturalWidth === 0)
        .map((img) => (img.getAttribute('alt') ?? '').trim() || img.getAttribute('src') || '(no alt, no src)');

      const tocEntries = Array.from(document.querySelectorAll('#toc a[href^="#"]')).map((a) => ({
        href: (a.getAttribute('href') ?? '').replace(/^#/, ''),
        label: (a.querySelector('.ug-toc__label')?.textContent ?? a.textContent ?? '').trim(),
        num: (a.querySelector('.ug-toc__num')?.textContent ?? '').trim()
      }));

      const documentIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);

      // Every identified block that prints its own eyebrow — the source the TOC numerals are
      // checked against. `:scope >` keeps a section's eyebrow from being attributed to an
      // ancestor that happens to carry an id.
      const eyebrowsById: Record<string, string> = {};
      Array.from(document.querySelectorAll('[id]')).forEach((el) => {
        const eyebrow = el.querySelector(':scope > .ug-section__header > .ug-section__eyebrow');
        if (eyebrow) {
          eyebrowsById[el.id] = (eyebrow.textContent ?? '').trim();
        }
      });

      return {
        totalH2Count,
        introExists,
        sectionHeadings,
        tocEntries,
        documentIds,
        eyebrowsById,
        glossaryDtCount,
        emptyDdCount,
        imageCount,
        imagesMissingAlt,
        unloadedImages
      };
    });

    return { ...structure, rawHtml };
  } finally {
    await browser.close();
  }
}

function assertStructure(structure: PageStructure & { rawHtml: string }): void {
  const errors: string[] = [];

  if (!structure.introExists) {
    errors.push('Missing intro block: no element with id="intro" found.');
  }

  if (structure.sectionHeadings.length !== EXPECTED_SECTIONS.length) {
    errors.push(
      `Expected ${EXPECTED_SECTIONS.length} <section> children inside #sections, found ${structure.sectionHeadings.length}.`
    );
  }

  EXPECTED_SECTIONS.forEach((expected, index) => {
    const actual = structure.sectionHeadings[index];
    if (!actual) {
      errors.push(`Missing section at position ${index + 1}: expected id="${expected.id}" ("${expected.title}").`);
      return;
    }
    if (actual.id !== expected.id) {
      errors.push(
        `Section at position ${index + 1} has id="${actual.id ?? '(none)'}" but expected id="${expected.id}" ` +
          `("${expected.title}") — a section is missing, misordered, or misnamed.`
      );
      return;
    }
    if (actual.text !== expected.title) {
      errors.push(`Section "${expected.id}" has <h2> text "${actual.text}" but expected "${expected.title}".`);
    }
  });

  if (structure.totalH2Count !== EXPECTED_TOTAL_H2) {
    errors.push(
      `Expected ${EXPECTED_TOTAL_H2} <h2> elements total (intro + TOC + ${EXPECTED_SECTIONS.length} sections + glossary), ` +
        `found ${structure.totalH2Count}.`
    );
  }

  // The TOC is hand-authored in `template/guide.html`, so it can drift from the section set
  // independently of both `SECTIONS` tables. Every anchor must resolve to a real section, every
  // section must be listed, and the order and labels must agree — otherwise the PDF ships a
  // dead internal link or a TOC row whose label contradicts the section it jumps to (the D8
  // class, applied to navigation instead of figures).
  const presentIds = new Set(structure.documentIds);

  structure.tocEntries.forEach((entry, index) => {
    if (!presentIds.has(entry.href)) {
      errors.push(
        `TOC entry ${index + 1} ("${entry.label}") links to #${entry.href}, but no element with ` +
          `that id exists — an unresolved TOC anchor would ship as a dead link in the PDF.`
      );
    }
  });

  // The TOC lists the 16 body sections in order, then the glossary (which is a sibling of
  // `#sections`, not a child, so it never appears in `sectionHeadings`).
  const EXPECTED_TOC = [...EXPECTED_SECTIONS, { id: 'glossary', title: 'Glossary' }];

  if (structure.tocEntries.length !== EXPECTED_TOC.length) {
    errors.push(
      `Expected ${EXPECTED_TOC.length} TOC entries (${EXPECTED_SECTIONS.length} sections + glossary), ` +
        `found ${structure.tocEntries.length}.`
    );
  }

  EXPECTED_TOC.forEach((expected, index) => {
    const entry = structure.tocEntries[index];
    if (!entry) {
      errors.push(`Missing TOC entry at position ${index + 1}: expected a link to #${expected.id} ("${expected.title}").`);
      return;
    }
    if (entry.href !== expected.id) {
      errors.push(
        `TOC entry at position ${index + 1} links to #${entry.href} but expected #${expected.id} ` +
          `("${expected.title}") — the TOC is misordered relative to the section set.`
      );
      return;
    }
    if (entry.label !== expected.title) {
      errors.push(`TOC entry for #${expected.id} reads "${entry.label}" but the section is titled "${expected.title}".`);
    }
  });

  // ---------------------------------------------------------------------------------------
  // TOC numerals (BG-T-13 HITL follow-up).
  //
  // The four checks above assert anchor resolution, count, order and LABEL — and nothing at
  // all about the number printed beside each label. Reproduced at source before this gate
  // existed: changing the first TOC numeral from `02` to `99`, leaving its href and label
  // untouched, produced a guide whose contents page numbers its first section 99 while
  // `verify-structure` printed "OK — structure matches template/README.md's contract".
  //
  // The expectation is DERIVED, not tabulated: each section already prints its own number in
  // its `.ug-section__eyebrow` ("02 · The Bilateral Workspace"), rendered by `assemble.ts`
  // from `SECTIONS[].eyebrow`. The TOC numeral is checked against the eyebrow of the section
  // its own href resolves to, so adding, removing or renumbering a section updates this
  // assertion's expectation automatically. A second literal numeral table here would just be
  // the fifth stale mirror of the section list.
  //
  // Unnumbered blocks are covered too: `#glossary`'s eyebrow reads "Reference", carries no
  // number, and its TOC row prints an em dash — so the rule for a target with no numeric
  // prefix is that its TOC numeral must contain no digits either.
  const EYEBROW_NUMERAL = /^(\d+)\s*·/;

  structure.tocEntries.forEach((entry, index) => {
    const eyebrow = structure.eyebrowsById[entry.href];

    if (eyebrow === undefined) {
      // Either the anchor does not resolve (already reported above) or the target prints no
      // eyebrow at all — both are structural faults the earlier checks name; do not duplicate.
      return;
    }

    const expectedNum = EYEBROW_NUMERAL.exec(eyebrow)?.[1] ?? null;

    if (expectedNum === null) {
      if (/\d/.test(entry.num)) {
        errors.push(
          `TOC entry ${index + 1} ("${entry.label}") prints the numeral "${entry.num}", but #${entry.href} ` +
            `carries no section number — its eyebrow reads "${eyebrow}". An unnumbered block must not be ` +
            `numbered in the TOC.`
        );
      }
      return;
    }

    if (entry.num !== expectedNum) {
      errors.push(
        `TOC entry ${index + 1} ("${entry.label}") prints the numeral "${entry.num}" but #${entry.href}'s own ` +
          `eyebrow reads "${eyebrow}" — the section numbers itself ${expectedNum}. The contents page would ` +
          `ship a number that contradicts the section it points at.`
      );
    }
  });

  if (structure.glossaryDtCount < 1) {
    errors.push('Glossary block has zero <dt> entries (expected at least 1).');
  }

  if (structure.emptyDdCount > 0) {
    errors.push(`Glossary has ${structure.emptyDdCount} empty <dd> element(s).`);
  }

  if (structure.imageCount === 0) {
    errors.push('No <img> elements found in the assembled document.');
  }

  if (structure.imagesMissingAlt > 0) {
    errors.push(`${structure.imagesMissingAlt} <img> element(s) have an empty/missing "alt" attribute.`);
  }

  if (structure.unloadedImages.length > 0) {
    errors.push(
      `${structure.unloadedImages.length} <img> element(s) did not load (naturalWidth === 0) — the PDF ` +
        `would show a blank box instead of a screenshot:\n` +
        structure.unloadedImages.map((label) => `  - ${label}`).join('\n')
    );
  }

  if (structure.rawHtml.includes('{{')) {
    const match = structure.rawHtml.match(/\{\{[^}]*\}\}/);
    errors.push(`Leftover template placeholder found: ${match ? match[0] : '{{...}}'}.`);
  }

  if (structure.rawHtml.includes('**')) {
    errors.push('Stray "**" found — unconverted markdown bold syntax leaked into the assembled HTML.');
  }

  if (/(^|\n)\s{0,3}##(?!#)/.test(structure.rawHtml)) {
    errors.push('Stray "##" found — unconverted markdown heading syntax leaked into the assembled HTML.');
  }

  if (errors.length > 0) {
    throw new StructureError(errors.join('\n'));
  }
}

async function main(): Promise<void> {
  const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_TARGET;
  console.log(`[verify-structure] checking ${targetPath}`);
  const structure = await readStructure(targetPath);
  assertStructure(structure);
  console.log('[verify-structure] OK — structure matches template/README.md\'s contract.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
