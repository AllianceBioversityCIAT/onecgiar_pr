# Kaizen Entry — bugfix/other-fields-toc-visibility

## Metrics

| Signal | Value |
|---|---|
| Reviewer rework attempts | `OTV-T-1`: 1 (attempt 1 FAIL — missing empty-ToC label assertions, closed attempt 2). `OTV-T-2`: 0. |
| HALTs / FATAL_FAILs | 0 |
| Pivot Records | 0 |
| PRODUCT_BUG findings | 0 |
| Judgment Day severe findings | **5 total, all fixed pre-implementation**: round 1 confirmed-both C-1/C-2/C-3; round 2 single-judge-but-fixed RB-S1/RB-S2. 2 of 2 max rounds used. |
| Validation FAIL / WARN counts | 1 FAIL (`OTV-T-1` attempt 1) — closed. No unresolved WARN. |
| `/akili-quick` escalations | 0 |
| Drift attributable to this spec | Execution scope drift: 3 of 5 planned tasks (`OTV-T-3`/`T-4`/`T-5`) never executed; spec archived partial by explicit user decision, not a silent scope cut. |

**Result: NOT a clean run.** Two lessons distilled (design-review value + a recurring implementation trap).

## Lessons

### `KZ-OTV-1` (Product) — A design that changes only the "what" (label text) without simulating the full rendered DOM ships a visible duplicate-element defect

- **Root cause:** `design.md`'s original mechanism (round 1, pre-correction) instructed changing a `label=` attribute on an already-rendered control, without accounting for a **second, pre-existing sibling element** (`app-pr-field-header`) that already rendered the same field's primary label in the same `@else` branch. The design was internally consistent about *which string* to show but never traced the *full DOM output* of the branch it was editing — so both judges independently found the corrected label would render stacked/duplicated with the untouched sibling header (`judgment.md` C-1).
- **Evidence:** `docs/specs/archive/2026-08-27-bugfix--other-fields-toc-visibility/judgment.md`, "C-1 — Relabeling in place produces a duplicated/stacked label in the empty-ToC branch" (confirmed by both judges independently, verified against the actual template and a committed Jest snapshot).
- **Target:** Product (this codebase's design-review discipline) — mitigated by process (Judgment Day caught it pre-code), not by a code fix per se, but worth naming as a pattern: **a template-editing design must trace every sibling element in the branch being changed, not only the element being edited.**

### `KZ-OTV-2` (Methodology) — Angular `[label]` property bindings do not reflect as DOM attributes; a design/task that prescribes an attribute selector for a bound property ships an always-passing (false-negative) test

- **Root cause:** Converting a static `label="…"` to a bound `[label]="…"` is the correct fix mechanism for a conditional label, but the natural test-selector instinct (`app-pr-multi-select[label="…"]`) silently stops matching anything once the binding lands — because Angular property bindings never appear as literal DOM attributes. A test written this way is not merely wrong, it is **invisibly wrong**: it still runs, still reports a result, and can pass on either the buggy or the fixed code depending on unrelated factors, defeating the RED/GREEN verification the whole Bug Mode process exists to enforce.
- **Evidence:** `docs/specs/archive/2026-08-27-bugfix--other-fields-toc-visibility/judgment.md`, "RB-S1" (round 2, Judge B single-judge but evidence-backed and fixed). Confirmed as a **recurring** trap, not a one-off: the sibling spec `docs/specs/archive/2026-08-27-bugfix--external-partners-toc-visibility/` explicitly cited this exact finding (as "RB-S1 finding from the sibling spec") as precedent for its own test strategy before writing any test.
- **Target:** Methodology (AKILI test-authoring guidance) — this is a framework-level (Angular) gotcha that will recur on any future spec touching a property-bound `label`/similar input on a custom-fields component in this codebase. No local code edit; recorded for upstreaming as a standing test-authoring rule: **when a fix converts a static attribute to a property binding, the regression test must select via a `data-testid` (or equivalent), never via an attribute selector on the bound property.**

## Noted, not a lesson

- `OTV-T-1` attempt 1's Reviewer FAIL (missing empty-ToC label assertions) is a standard scope-completeness catch, not a process gap — the task's own `Implements:` line named the requirements the missing tests should have covered; normal rework, correctly caught.
- RB-S2 (self-contradicting getter/computed prose in `design.md`) is a real, evidence-backed correction but is document-local (author-error, single document) rather than a pattern likely to recur elsewhere — recorded in `judgment.md`, not elevated to a separate lesson here.

## Pending Items

**Kind: standardization** (`KZ-OTV-2`, Methodology-classified — no local edit; recorded for upstreaming, per the skill's "Methodology lessons get no local edit" rule)

- Proposed addition to AKILI's Bug Mode / TDD guidance (methodology-level, any project with Angular property-bound display attributes): a regression test asserting on a property that used to be a static attribute (e.g. a `label`/`placeholder` conversion to `[label]`/`[placeholder]`) MUST select via `data-testid` or an equivalent stable hook, never via an attribute selector matching the bound property name — because Angular property bindings do not reflect as DOM attributes, making such a selector an always-non-matching (false-negative) test regardless of code correctness. Severity: medium — already recurred once across two sibling specs in this same session.
- Archived on spec branch `qa-development-2026` (default branch: `master`) — pending the default-branch apply phase; no shared file touched.

**Kind: guide-sync**

- Target: `onecgiar-pr-client/src/CLAUDE.md` §21.5 (Forms & validation) or a new trap note in `rd-contributors-and-partners/CLAUDE.md`'s "Trampas" section.
- Proposed lines (verbatim, 1-3 lines): Angular `[prop]="…"` property bindings (e.g. `label`, `placeholder`) never reflect as DOM attributes — a test/selector like `[label="…"]` silently stops matching once a static attribute becomes a binding, producing an always-false-negative test. Select via `data-testid` instead. (Origin: `docs/specs/archive/2026-08-27-bugfix--other-fields-toc-visibility/judgment.md` RB-S1, reused by `docs/specs/archive/2026-08-27-bugfix--external-partners-toc-visibility/`.)
- Severity: medium (already recurred once; will recur again on the next label/placeholder conditional-binding fix in this codebase).
- Archived on spec branch — pending the default-branch apply phase; no guide touched.

**Kind: task-continuation** (not a Standardize proposal — a plain execution-scope note, carried for whoever picks this spec's remainder back up)

- `OTV-T-3` (`lab-report-form`'s own, more severe original defect — dead-end empty-state UX), `OTV-T-4` (Cypress regression for `rd-contributors-and-partners`), and `OTV-T-5` (`CLAUDE.md` re-stamps) were never started. A new spec should reference this archive for the confirmed root cause and the already-approved `design.md` mechanism rather than re-diagnosing.
