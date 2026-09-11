# Tasks — Hide indicator-only UI in emerging-result creation (Lite)

## Task EHU-T-1 — Gate Card 2 and the ToC-attribution note behind `!isEmerging()` + regression test

- **Status:** complete
- **Size:** XS (~4 LOC fix + ~25 LOC test)
- **Dependencies:** none
- **Requirements covered:** EHU-R-1, EHU-R-2, EHU-R-3 (all scenarios in `requirements.md` §5)
- **Design references:** `design.md` DD-1, DD-2
- **Skills:** `angular-developer`, `tdd`

### Scope
File: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.html`

1. Line ~325: change `@if (!currentResultIsKnowledgeProduct() || kpEntryMode() === 'manual' || createResultBody().handler) {` to `@if (!isEmerging() && (!currentResultIsKnowledgeProduct() || kpEntryMode() === 'manual' || createResultBody().handler)) {` — this is Card 2's existing wrapper; do not touch anything else inside it.
2. Lines ~396-443: wrap the `<div data-testid="toc-attribution-note" ...>...</div>` block (only this div, not the whole Card 3 `<section data-testid="card-collaboration">`) in `@if (!isEmerging()) { ... }`. Leave the Contributing CGIAR Centers / Science Programs `<select>` markup below it (line ~445 onward) untouched and unconditional.
3. Do not touch any other line, any TS file, or `missingFields()`/`canSave()` logic (already correct per `bugfix/emerging-contribution-not-required`).

File: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`

4. Add a regression test (near the emerging-mode describe block used by ECN-AC-1, or a new one): `setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null })`, then query the rendered fixture and assert `fixture.nativeElement.querySelector('[data-testid="card-target-contribution"]')` is `null` and `[data-testid="toc-attribution-note"]` is `null`, while a Contributing Centers/Science Programs select (e.g. by its existing test id/label) IS present.
5. Add a non-regression assertion for the non-emerging path: with a normal indicator-tied `setup()` (no emerging flags), both `[data-testid="card-target-contribution"]` and `[data-testid="toc-attribution-note"]` ARE present (use an existing non-emerging setup already in the spec file rather than inventing a new one).

### Tests
- Run: `npx jest --silent --reporters=summary --testPathPattern="lab-report-form.component.spec"` (per root `CLAUDE.md` agent-lean verification convention, scoped to the touched spec per `src/CLAUDE.md` §21 "Run only the touched module's specs").
- **Pass condition:** new tests green; all pre-existing tests in this spec file remain green (0 regressions), including the ECN-AC-1 test from `bugfix/emerging-contribution-not-required` (still asserts `missingFields()`/`canSave()` behavior, untouched by this template-only change).
- **Fail condition / disqualifier:** if the new emerging-mode assertion passes only because the querySelector target is wrong (e.g. a typo'd `data-testid` that never matched anything even before the fix), the test is not evidence — it must fail on the pre-fix template (both elements present) and pass only after the `@if` guards are added. Confirm this by running the new test against the pre-fix template once (red), then again after the fix (green).
- **What would make this check fail:** reverting either `@if` guard, or gating the whole Card 3 section instead of just the note div (which would also fail the "Centers/Science Programs select present" assertion) — either must turn an assertion red.

### Done criteria
- [x] Card 2 gated behind `!isEmerging() && (...)`, scoped exactly as in `design.md` DD-1 — no other line in that `@if` changed.
- [x] Only the `toc-attribution-note` div gated behind `!isEmerging()`, scoped exactly as in `design.md` DD-2 — Card 3's Centers/Science Programs selects remain unconditional.
- [x] New regression tests added (emerging: both hidden + selects present; non-emerging: both present), proven red-before-fix / green-after for the emerging case.
- [x] Full `lab-report-form.component.spec.ts` suite green (`npx jest --silent --reporters=summary --testPathPattern="lab-report-form.component.spec"`).
- [x] `lab-report-form/CLAUDE.md` updated to record this visibility exception (folder-doc convention, `docs/COMPONENT-DOCS.md`, 120-line cap — compress elsewhere if needed like the prior spec did) — re-stamp its `Verified:` line in the same commit.
- [x] No other file touched.

**Addendum (attempt 2, in-scope correction):** Card 3's header number made reactive (`isEmerging() ? '2' : '3'`) to fix a live-testing finding — hiding Card 2 left the header sequence reading "1. ... 3. ..." with no visible "2.". See `execution.md` attempt 2.
