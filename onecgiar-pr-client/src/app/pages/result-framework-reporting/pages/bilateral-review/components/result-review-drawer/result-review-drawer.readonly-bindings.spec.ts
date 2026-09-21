/**
 * RDR-T-1 — static completeness gate for `bilateral/review-drawer-readonly-rendering`.
 *
 * WHY A STATIC READ AND NOT A RENDERED ONE
 * ----------------------------------------
 * Every Jest spec in this module bootstraps with `overrideComponent({ set: { template: '' } })`,
 * so jsdom never renders these templates. A rendered Jest assertion is impossible here without
 * rewriting those specs' bootstrap. This gate therefore reads the **real shipped `.html` files**
 * from disk — a real-artifact lock, not a fragment authored in the test.
 *
 * WHAT THIS PROVES:      the `[readOnly]` binding exists on every locked control.
 * WHAT IT DOES NOT:      that the binding renders read-only. That is `RDR-T-2` (Cypress CT), and
 *                        the value painted in that branch is `D4`, verified only at the HITL pause
 *                        (`docs/specs/bilateral/review-drawer-readonly-rendering/tasks.md` §4).
 *
 * FALSIFIER: delete the `[readOnly]` from `cap-sharing-content.component.html` on the "Women"
 * `app-pr-input` → the first test goes red naming that file and that line.
 */
import * as fs from 'fs';
import * as path from 'path';

/** Controls whose read-only branch is keyed on `readOnly` and NOT on `disabled`. */
const IN_SCOPE_TAGS = ['app-pr-input', 'app-pr-textarea', 'app-pr-select'] as const;

/**
 * Deliberately excluded — these already derive a read-only appearance from `disabled`
 * (`pr-radio-button` paints `.block-field`, `pr-range-level` paints `.prl--disabled`) or are
 * already passed `[readOnly]` by the drawer (`pr-multi-select`, `geoscope-management`).
 * See design.md §8.2's exclusion table.
 */
const EXCLUDED_TAGS = ['app-pr-radio-button', 'app-pr-range-level'] as const;

/** The predicate that means "this control is locked". Card 1 uses `canEditInDrawer()` and is out of scope. */
const LOCK_BINDING = /\[disabled\]="(!canEditDataStandards\(\)|disabled)"/;

const BASE = __dirname;
const TEMPLATES: Record<string, string> = {
  'result-review-drawer.component.html': path.join(BASE, 'result-review-drawer.component.html'),
  'policy-change-content.component.html': path.join(BASE, 'components/policy-change-content/policy-change-content.component.html'),
  'cap-sharing-content.component.html': path.join(BASE, 'components/cap-sharing-content/cap-sharing-content.component.html'),
  'inno-dev-content.component.html': path.join(BASE, 'components/inno-dev-content/inno-dev-content.component.html'),
  'innovation-use-content.component.html': path.join(BASE, 'components/innovation-use-content/innovation-use-content.component.html')
};

/** Sites per file, derived by running the scan against ecff181aa (design.md §8.2). */
const EXPECTED_LOCKED_SITES: Record<string, number> = {
  'result-review-drawer.component.html': 2,
  'policy-change-content.component.html': 2,
  'cap-sharing-content.component.html': 4,
  'inno-dev-content.component.html': 2,
  'innovation-use-content.component.html': 14
};

interface Site {
  file: string;
  line: number;
  tag: string;
  predicate: string;
  hasReadOnly: boolean;
  readOnlyPredicate: string | null;
}

/** Walks a template and returns the open tag of every element whose name is in `tags`. */
const elementsOf = (src: string, tags: readonly string[]): { start: number; end: number; tag: string }[] => {
  const re = new RegExp(`<(${tags.join('|')})\\b`, 'g');
  const out: { start: number; end: number; tag: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Scan to the '>' that closes the open tag, skipping any '>' inside an attribute value.
    let i = m.index;
    let quote: string | null = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
    }
    out.push({ start: m.index, end: i + 1, tag: m[1] });
  }
  return out;
};

const lockedSites = (): Site[] => {
  const sites: Site[] = [];
  for (const [file, abs] of Object.entries(TEMPLATES)) {
    // Guard against a stale/empty read passing the gate for the wrong reason.
    expect(fs.existsSync(abs)).toBe(true);
    const src = fs.readFileSync(abs, 'utf8');
    expect(src.length).toBeGreaterThan(0);

    for (const el of elementsOf(src, IN_SCOPE_TAGS)) {
      const block = src.slice(el.start, el.end);
      const lock = block.match(LOCK_BINDING);
      if (!lock) continue;
      const ro = block.match(/\[readOnly\]="([^"]*)"/);
      sites.push({
        file,
        line: src.slice(0, el.start).split('\n').length,
        tag: el.tag,
        predicate: lock[1],
        hasReadOnly: !!ro,
        readOnlyPredicate: ro ? ro[1] : null
      });
    }
  }
  return sites;
};

describe('RDR-T-1 — read-only bindings on locked drawer controls', () => {
  const sites = lockedSites();

  it('RDR-R-3: every locked pr-input/pr-textarea/pr-select carries [readOnly]', () => {
    const missing = sites.filter(s => !s.hasReadOnly).map(s => `${s.file}:${s.line} <${s.tag}>`);
    expect(missing).toEqual([]);
  });

  it('RDR-R-1: [readOnly] is at least as strict as [disabled]', () => {
    // Either the same predicate, or the literal `true` — three fields in innovation-use-content
    // are permanently computed (never editable, even for an admin) and were already pinned
    // `[readOnly]="true"` before this spec. `true` is strictly stronger, so it satisfies the
    // invariant; anything else means the two bindings can disagree and a locked field renders
    // editable.
    const weaker = sites
      .filter(s => s.hasReadOnly && s.readOnlyPredicate !== s.predicate && s.readOnlyPredicate !== 'true')
      .map(s => `${s.file}:${s.line} <${s.tag}> disabled="${s.predicate}" readOnly="${s.readOnlyPredicate}"`);
    expect(weaker).toEqual([]);
  });

  it('RDR-R-3 (AND IT MUST): [disabled] is retained on every site — the functional block is never weakened', () => {
    // Every site in `sites` matched LOCK_BINDING by construction, so a non-empty list proves retention.
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.every(s => s.predicate === '!canEditDataStandards()' || s.predicate === 'disabled')).toBe(true);
  });

  it('RDR-R-3 (BUT): the sweep did not over-reach — per-file site counts are unchanged', () => {
    const actual = Object.fromEntries(
      Object.keys(TEMPLATES).map(f => [f, sites.filter(s => s.file === f).length])
    );
    expect(actual).toEqual(EXPECTED_LOCKED_SITES);
  });

  it('RDR-R-1 (BUT): card 1 Theory of Change controls were not locked', () => {
    const drawer = fs.readFileSync(TEMPLATES['result-review-drawer.component.html'], 'utf8');
    // The ToC Yes/No toggle stays driven by canEditInDrawer(), never by canEditDataStandards().
    for (const el of elementsOf(drawer, ['app-pr-yes-or-not', 'app-cp-multiple-wps'])) {
      const block = drawer.slice(el.start, el.end);
      expect(block).not.toContain('canEditDataStandards');
    }
  });

  it('DD-2: the already-read-only-aware controls were left alone', () => {
    const touched: string[] = [];
    for (const [file, abs] of Object.entries(TEMPLATES)) {
      const src = fs.readFileSync(abs, 'utf8');
      for (const el of elementsOf(src, EXCLUDED_TAGS)) {
        const block = src.slice(el.start, el.end);
        if (!LOCK_BINDING.test(block)) continue;
        if (/\[readOnly\]/.test(block)) {
          touched.push(`${file}:${src.slice(0, el.start).split('\n').length} <${el.tag}>`);
        }
      }
    }
    expect(touched).toEqual([]);
  });
});
