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
 *   - exactly the 6 expected `<h2>` headings exist inside `#sections`, in the
 *     specified order, with the specified `id`s (`template/README.md`);
 *   - 9 `<h2>` elements total (intro + TOC + 6 sections + glossary);
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

const EXPECTED_SECTIONS: ReadonlyArray<{ id: string; title: string }> = [
  { id: 'section-landing', title: 'Landing Page' },
  { id: 'section-overview', title: 'Overview Dashboard' },
  { id: 'section-reporting', title: 'Reporting Page' },
  { id: 'section-results-center', title: 'Results Center' },
  { id: 'section-notifications', title: 'Notifications' },
  { id: 'section-innovation-packages', title: 'Innovation Packages' }
];

const EXPECTED_TOTAL_H2 = 9; // intro (1) + TOC (1) + #sections (6) + glossary (1)

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

      return {
        totalH2Count,
        introExists,
        sectionHeadings,
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
      `Expected ${EXPECTED_TOTAL_H2} <h2> elements total (intro + TOC + 6 sections + glossary), ` +
        `found ${structure.totalH2Count}.`
    );
  }

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
