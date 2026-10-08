# Module Spec — `table-pagination-default-100-rows` — Design

Linked: `requirements.md` (same folder) · `proposal.md` (same folder).

## 1. Summary

Change the `[rows]` default to `100` on 18 table consumers of the shared `app-pr-table`/`app-pr-group-table` components, adding `100` to `rowsPerPageOptions` on the 6 that don't already offer it. No shared-component code changes — every edit is a literal template-attribute value in the consumer file itself. Biggest accepted trade-off: 3 render-heavy tables (`results-list`, `programme-results`, `wp-home`) get the same default with only a manual, non-automated performance spot-check as the safety net, since no perf-gate tooling exists in this repo.

## 1A. Premise Ledger

**Count:** 6 premises — 6 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** none apply — every edit is a literal per-file template attribute value supplied by each consumer to the shared `pr-table`/`pr-group-table` components; this spec does not touch those shared components' own template, exported `@Input`s, selectors, or lifecycle, so there is no contract change for a `consumer` row to track. There is no conditional dispatch chain for a `live-path` row to trace — each binding is read directly on render, not reached through a branch point. And no state is shared *across* the 18 files — each table's `[rows]`/`[rowsPerPageOptions]` is local to its own template, so there is no `shared-state` row beyond what `P-5` already records about `wp-home`'s own internal grouping (a `data-env` fact about one file, not a cross-component sharing).

| # | Premise | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | Exactly 25 files under `onecgiar-pr-client/src/app/` are real consumers of `<app-pr-table>`/`<app-pr-group-table>`; a 26th match (`bilateral-review-table.component.html`) only references them in a stale comment and has zero live tags | `existence` | `grep -rn "app-pr-table\|app-pr-group-table" src/app --include=*.html` (this session) → 26 file matches; `grep -c "<app-pr-table\|<app-pr-group-table" .../bilateral-review-table.component.html` → `0` | `b936ebf2f` | Impact High — the 18-file in-scope list would be incomplete or include a non-consumer |
| P-2 | All 18 in-scope files bind `[rows]` and `[rowsPerPageOptions]` as literal values directly in the template — none is bound via a `.ts` component property requiring a second edit site | `data-env` | Per-file `file:line` reads, both scouts this session (full list in §6 below) — every one of the 18 shows a literal integer/array, e.g. `results-list.component.html:205` → `[rows]="10"` (literal, not an interpolated property) | `b936ebf2f` | Impact Low — the one or two files where this is false would gain a second edit site (the `.ts` default), a task-size change, not a scope change |
| P-3 | No `.spec.ts`/`.test.ts` sibling across any of the 18 files hard-asserts a literal default `rows` value today | `existence` | Per-file grep for the literal string `rows` in each sibling spec (both scouts, full list in §6) — only non-matching hits found (e.g. `programme-results.component.spec.ts:2298-2301` asserts `paginator`/`rowsPerPageOptions`, never `rows`); repo-wide `grep -rn "\.rows)\.toBe\|\.rows)\.toEqual" src/` returns only unrelated aggregate/chart-data `.rows` properties, confirmed not PrimeNG-style table inputs | `b936ebf2f` | Impact High — a task would need to add a spec-update step; none currently do |
| P-4 | The two `mapped-results-modal` copies (`rd-contributors-and-partners` and `rd-theory-of-change/.../toc-initiative-out`) are byte-identical today | `other` (parity) | `diff` between the two files, this session → zero output / clean exit | `b936ebf2f` | Impact Low — the task would need two distinct edits instead of one identical one |
| P-5 | `wp-home.component.html` renders a grouped, independently-expandable table (`app-pr-group-table` with `groupRowsBy="workpackage_short_name"`, `[expandedRowKeys]`, a `prTableExpandedRow` template nesting `@for` loops over `toc_results`/`indicators`, and a `prTableGroupHeader` template with `[prRowToggler]`) — not a flat list, justifying its isolation as its own task | `data-env` | `wp-home.component.html:30-145` (full element read this session): `groupRowsBy` line 42, `[expandedRowKeys]` line 43, `prTableExpandedRow` line 75 (nested `@for` lines 76-126), `prTableGroupHeader` line 58, `[prRowToggler]` line 63 | `b936ebf2f` | Impact Low — if it were actually a flat table, it could fold into the regular 5-table options-update task instead of standing alone |
| P-6 | The 6 out-of-scope files genuinely have no `[paginator]` bound `true` — no pagination UI exists on them today, so there is nothing for this spec to change | `existence` | Per-file read, prior session's audit (`result-history-of-changes-modal`, `indicator-drawer`, `reporting-aow-table`, `aow-hlo-table`, `aow-target-details-drawer`, `aow-view-results-drawer` — all `[paginator]` unbound) | `b936ebf2f` | Impact High — one of the 6 would actually need inclusion in scope |

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** 18 consumer templates across `pages/admin-section/`, `pages/ipsr/`, `pages/outcome-indicator/`, `pages/result-framework-reporting/`, `pages/results/`, `shared/components/`, `shared/sections-components/`.
- **No shared-component code touched** — `shared/components/pr-table/{pr-table,pr-group-table}.component.{ts,html}` are unmodified by this spec (they were the subject of the prerequisite `bugfix/pr-table-paginator-dropdown-select`, not this one).
- **No server modules, no API, no migrations.**

### 2.2 Interaction (unchanged, for orientation only)

```
[Any in-scope consumer template]
  └── <app-pr-table [rows]="100" [rowsPerPageOptions]="[...,100]">   ← literal values this spec edits
        └── pr-table.component.html paginator block (unchanged, already fixed)
              └── dropdown correctly shows "100" (guaranteed by bugfix/pr-table-paginator-dropdown-select)
```

## 3–5. Data Model / API Surface / Server Workflow

Not applicable — no entities, endpoints, or server logic touched.

## 6. Frontend Plan

### 6.1 Routes / modules

No routes or modules change. Each file keeps its existing module registration.

### 6.2 Components & file-level changes

**Task group A — 12 "default-only" tables** (`rowsPerPageOptions` already contains `100`; only `[rows]` changes):

| File | Current `[rows]` (file:line) | Current `[rowsPerPageOptions]` (file:line) | Target |
|---|---|---|---|
| `pages/admin-section/pages/user-report/user-report.component.html` | `:15` → `20` | `:14` → `[20, 50, 100]` | `[rows]="100"` |
| `pages/ipsr/.../results-innovation-output-list.component.html` | `:9` → `10` | `:10` → `[10,50,100]` | `[rows]="100"` |
| `pages/ipsr/.../table-innovation.component.html` | `:15` → `10` | `:17` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/ipsr/.../innovation-package-custom-table.component.html` | `:8` → `10` | `:10` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/ipsr/.../update-ipsr-result-modal.component.html` | `:28` → `10` (same line as options) | `:28` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/outcome-indicator/.../indicator-results-modal.component.html` | `:46` → `10` | `:48` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/result-framework-reporting/.../programme-results.component.html` | `:393` → `10` | `:395` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/results/.../results-to-update-modal.component.html` | `:156` → `10` | `:159` → `[10, 50, 100]` | `[rows]="100"` |
| `pages/results/.../results-list.component.html` | `:205` → `10` | `:209` → `[10, 50, 100]` | `[rows]="100"` |
| `shared/components/global-completeness-status.component.html` | `:58` → `10` | `:57` → `[10, 50, 100]` | `[rows]="100"` |
| `shared/components/phase-management-table.component.html` | `:9` → `10` | `:11` → `[10, 50, 100]` | `[rows]="100"` |
| `shared/sections-components/links-to-results-global.component.html` | `:27` → **`5`** (outlier) | `:29` → `[5, 50, 100]` | `[rows]="100"` (array unchanged) |

**Task group B — 5 "needs options update" tables** (flat `app-pr-table`; add `100`, then set `[rows]="100"`):

| File | Current `[rows]` (file:line) | Current `[rowsPerPageOptions]` (file:line, full array) | Target |
|---|---|---|---|
| `pages/admin-section/.../user-management.component.html` | `:228` → `10` | `:229` → `[10, 25, 50]` | options `[10, 25, 50, 100]`, `[rows]="100"` |
| `pages/outcome-indicator/.../eoio-home.component.html` | `:33` → `8` | `:34` → `[8, 12, 20]` | options `[8, 12, 20, 100]`, `[rows]="100"` |
| `pages/outcome-indicator/.../details-table.component.html` | `:6` → `10` | `:7` → `[10, 20, 30, 40, 50]` | options `[10, 20, 30, 40, 50, 100]`, `[rows]="100"` |
| `.../rd-contributors-and-partners/.../mapped-results-modal.component.html` | `:35` → `5` | `:36` → `[5,10,15]` | options `[5,10,15,100]`, `[rows]="100"` |
| `.../rd-theory-of-change/.../mapped-results-modal.component.html` | `:35` → `5` | `:36` → `[5,10,15]` | options `[5,10,15,100]`, `[rows]="100"` (byte-identical edit to the file above, per `P-4`) |

**Task group C — `wp-home`** (isolated per `P-5`, same edit shape as group B but its own task/review depth):

| File | Current `[rows]` (file:line) | Current `[rowsPerPageOptions]` (file:line) | Target |
|---|---|---|---|
| `pages/outcome-indicator/.../wp-home.component.html` | `:36` → `8` | `:37` → `[8, 12, 20]` | options `[8, 12, 20, 100]`, `[rows]="100"` — grouping/expansion lines (42, 43, 58, 63, 75) untouched |

**Task group D — manual verification** (no file edits of its own): browser spot-check of `results-list`, `programme-results` (both from group A), and `wp-home` (group C) after their respective tasks land.

### 6.3 Design system usage

No token, color, spacing, or typography change — purely numeric config values. No i18n impact (numeric defaults, not copy).

### 6.4 Real-time / notification UX

Not applicable.

## 7–9. Security / Performance / Observability

No auth, data, or logging surface touched. **Performance** is the one real consideration — see `PTR-R-10`/`PTR-AC-6` and task group D; no automated gate exists for client render cost in this repo, so this is an explicit, accepted, human-checked risk rather than a silently assumed-safe change.

## 10. Testing Plan (forward-looking)

- **Per-file verification:** after each task's edit, read back the exact line(s) changed and confirm the new value matches the task's target — the same discipline as the Premise Ledger's own citations, just run post-change instead of pre-change.
- **Regression guard:** run each touched file's own test suite (where one exists) to confirm nothing changed in the Jest output — per `P-3`, none should fail, since no spec today hard-asserts a `rows` default.
- **`diff` guard (group B's duplicated edit):** after editing both `mapped-results-modal` copies, re-run `diff` between them and confirm zero output — the same check that established `P-4` pre-change must still hold post-change.
- **Manual browser check (group D):** load `results-list`, `programme-results`, and `wp-home` with a dataset large enough to reach 100 rows, scroll the full page, and confirm no layout break and no unresponsive scroll. Record the observation (pass/fail, and any follow-up needed) in `execution.md` — this is the substitute gate for the "render/performance regression" defect class named in `requirements.md` §8.

## 11. Backwards Compatibility & Migration Plan

- Purely additive/corrective config values — no API contract, no data migration, no feature flag.
- **Rollback:** revert the relevant task's commit; the table returns to its prior smaller default, with no other consequence (no data loss, no contract break).

## 12. Design Decisions (ADRs)

### `PTR-DD-1` — Group the 18 files into 4 tasks by edit-shape, not one task per file or one task for all 18

- **Context:** 18 files need one of two near-identical edit shapes (default-only, or options+default), plus one structurally distinct file (`wp-home`) and one verification-only concern (performance).
- **Decision:** 4 tasks — group A (12 default-only), group B (5 flat options+default), group C (`wp-home`, isolated), group D (manual verification, depends on A+C's relevant subset).
- **Alternatives considered:** one task per file (rejected — 18 near-identical tasks inflate traceability overhead without adding safety, since each file's edit is independently citable inside the task's own file table); one task for all 18 (rejected — mixes two distinct edit shapes and `wp-home`'s distinct risk profile, making a partial FAIL harder to scope and rework).
- **Consequences:** per-file traceability is preserved via the §6.2 tables (every file still individually named and cited), while the task count stays proportionate to the actual decision complexity, not the file count.

### `PTR-DD-2` — Isolate `wp-home` into its own task with elevated review

- **Context:** `wp-home` is the only in-scope file using a grouped, expandable-row table (`P-5`) — a structurally different render shape than the other 23 flat-table consumers.
- **Decision:** separate task (group C), `Review: full` rather than `checklist`.
- **Alternatives considered:** bundle with group B's other 5 files (rejected — a FAIL specific to `wp-home`'s grouping would block or force rework on 4 unrelated, lower-risk edits too).
- **Consequences:** one extra task, but the one file genuinely worth closer scrutiny gets it without taxing the rest.

### `PTR-DD-3` — Performance verification is a separate, non-blocking task

- **Context:** no automated perf-testing infrastructure exists in this repo for client render cost; the project's `onecgiar-pr-client/CLAUDE.md` §9 names Cypress for full user flows, not performance budgets.
- **Decision:** a dedicated manual-verification task (group D), which depends on groups A and C landing but does not gate them — the 16 lower-risk files can close independently of this check.
- **Alternatives considered:** write a new Cypress performance test (rejected — disproportionate tooling investment for a config-value change, no existing pattern to extend); block the whole spec until the manual check passes (rejected — unnecessarily delays the 16 low-risk tables for a concern specific to 3).
- **Consequences:** `results-list`/`programme-results`/`wp-home`'s performance risk is explicitly tracked and closable, but does not become a bottleneck for the rest of the spec.

**Step 2.3 reversion challenge:** N/A for all three DDs — none removes, disables, or inverts already-delivered behavior; all are additive default-value changes or task-shape decisions.

## 13. Open Gaps & Follow-ups

- **Accepted risk:** `results-list`, `programme-results`, `wp-home` get a manual-only performance check (no automated gate) — tracked explicitly, not silently assumed safe.
- **Pre-existing, out-of-scope risk (informational):** `aow-hlo-table` and `reporting-aow-table` already render fully unpaginated, uncapped lists today — unrelated to this spec, flagged for a possible future look (carried over from `proposal.md` §12).

## Budget (Step 2.4)

- **Expected tasks:** 4 (group A, group B, group C, group D).
- **Expected LOC:** ~25-30 (12×1-line + 5×2-line + 1×2-line template edits; group D is a verification record, not code).
- **Expected review rounds:** 3 (one per code-editing task group — A, B, C; group D is a manual check, not a Reviewer-gated task).

**Depth check:** the LOC estimate (~25-30) is low for `Standard` by line-count alone — if judged on LOC only, this would look `Lite`-sized. The depth is still kept at **Standard**, not dropped to `Lite`, because the driver here is *breadth and risk distribution*, not LOC: 18 files across 7 unrelated feature folders, two distinct edit shapes, one structurally distinct high-risk file requiring its own review tier, and an explicit non-automatable performance-risk tracked as its own deliverable — exactly the kind of per-file traceability and risk differentiation `Lite`'s "1 strictly focused task" shape cannot represent. Flagging this explicitly per Step 2.4 rather than silently keeping the original guess.

## Required cross-references

- `docs/specs/changes/table-pagination-default-100-rows/requirements.md` (same folder).
- `docs/specs/changes/table-pagination-default-100-rows/proposal.md` (same folder) — source of the scope decisions this design's Premise Ledger inherits.
- `docs/prd.md` `G4`; `docs/ux-ui/design.md` §5; `onecgiar-pr-client/CLAUDE.md` §9.
- `../../bugfix/pr-table-paginator-dropdown-select/` — the prerequisite fix (commit `b936ebf2f`) every Premise Ledger row is verified against.
