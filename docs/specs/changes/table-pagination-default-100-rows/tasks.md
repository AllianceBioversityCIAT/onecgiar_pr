# Module Spec — `table-pagination-default-100-rows` — Tasks

Linked: `requirements.md` + `design.md` (same folder).

## 1. Scope of this task list

- **Module / feature:** `changes/table-pagination-default-100-rows`
- **Sprint / target phase:** immediate
- **Owner / driver:** M. Giraldo
- **Status:** in-progress

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Open questions resolved (none blocking).
- [x] No migration involved.
- [x] No conflicting in-flight spec touching the same 18 files (checked: no other `docs/specs/*` folder names these tables).
- [x] Prerequisite `bugfix/pr-table-paginator-dropdown-select` is shipped (commit `b936ebf2f`) — the dropdown will correctly display whatever default each task sets.
- [x] Folder-doc check: none of the 18 files' folders carry their own `CLAUDE.md` (verified per-folder listing during design-time citation sweep) — the folder-doc re-stamp convention does not apply to any task below.

## 3. Task list

### `PTR-T-1` — [x] Bump default rows to 100 across the 12 tables that already offer it

- **Type:** `client`
- **Description:** Change `[rows]` to `100` in each of the 12 files listed in `design.md` §6.2 Task group A. `[rowsPerPageOptions]` is NOT edited on any of these 12 (it already contains `100`). No `.ts` changes — all 12 bind `[rows]` as a literal template value (confirmed, Premise `P-2`).
- **Implements:** `PTR-R-1`, `PTR-AC-1`
- **Design references:** `design.md` §6.2 Task group A table, `PTR-DD-1`
- **Files (expected):**
  - `pages/admin-section/pages/user-report/user-report.component.html`
  - `pages/ipsr/pages/innovation-package-creator/components/results-innovation-output-list/results-innovation-output-list.component.html`
  - `pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/pages/complementary-innovation/components/table-innovation/table-innovation.component.html`
  - `pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/innovation-package-custom-table/innovation-package-custom-table.component.html`
  - `pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/update-ipsr-result-modal/update-ipsr-result-modal.component.html`
  - `pages/outcome-indicator/pages/indicator-details/components/indicator-results-modal/indicator-results-modal.component.html`
  - `pages/result-framework-reporting/pages/programme-results/programme-results.component.html`
  - `pages/results/pages/results-outlet/pages/results-list/components/results-to-update-modal/results-to-update-modal.component.html`
  - `pages/results/pages/results-outlet/pages/results-list/results-list.component.html`
  - `shared/components/global-completeness-status/global-completeness-status.component.html`
  - `shared/components/phase-management-table/phase-management-table.component.html`
  - `shared/sections-components/links-to-results-global/links-to-results-global.component.html`
- **Depends on:** `—`
- **Blocks:** `PTR-T-4` (for its `results-list`/`programme-results` checks only)
- **Parallel-safe:** yes (disjoint files from `PTR-T-2`/`PTR-T-3`, no shared build output/port/dependency-tree contention)
- **Estimate:** `S`
- **Review:** `skip-eligible` — 12 independent, mechanical single-value template edits; no shared component/contract changed (the shared `pr-table`/`pr-group-table` components themselves are untouched); no shared symbol consumed elsewhere (`Consumers: none`). Claim to be proven at execute time per Review intensity, not a guarantee.
- **Verification:**
  - **Falsifier:** post-change, `grep -n "\[rows\]=" <file>` on each of the 12 files must show `"100"`; any file still showing its old value (20, 10, or 5 per `design.md` §6.2) is wrong. `[rowsPerPageOptions]` must be byte-identical to its pre-change value on every one of the 12 — a changed array on this task is also wrong (array edits belong to `PTR-T-2`/`PTR-T-3` only).
  - **Red run:** `n/a (no test gate)` — this is a literal config-value change with no pre-existing failing test to turn green; verification is a direct post-change read against each file's Premise Ledger citation (`design.md` §6.2).
  - **Disqualifier:** if any of the 12 files' `[rows]` still reads its old value, or if any file's `[rowsPerPageOptions]` array changed when it should not have, the task is not done — do not report complete on a partial application.
  - **Consumers:** `none (no shared symbol changed)` — each `[rows]`/`[rowsPerPageOptions]` binding is a literal input to the unmodified shared component; run each file's own `.spec.ts` suite (where one exists) as a regression guard, not a consumer sweep (per `P-3`, none hard-asserts a `rows` default, so none should fail).
- **Definition of done:**
  - [ ] All 12 files show `[rows]="100"`; none of their `[rowsPerPageOptions]` arrays changed.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="user-report|results-innovation-output-list|table-innovation|innovation-package-custom-table|update-ipsr-result-modal|indicator-results-modal|programme-results|results-to-update-modal|results-list.component|global-completeness-status|phase-management-table|links-to-results-global"` green, no new failures.
  - [ ] Commit via `🎨 style(pr-table-defaults) [SPEC:changes/table-pagination-default-100-rows]: <description>`.

### `PTR-T-2` — [x] Add 100 to options and bump default on the 5 flat-table consumers that don't offer it yet

- **Type:** `client`
- **Description:** On each of the 5 files listed in `design.md` §6.2 Task group B, append `100` to `[rowsPerPageOptions]` (preserving every existing value and the file's own comma-spacing style) and change `[rows]` to `100`. Both `mapped-results-modal` copies receive the identical edit (confirmed byte-identical pre-change, `P-4`) — re-confirm with `diff` post-change (see Verification).
- **Implements:** `PTR-R-2`, `PTR-R-4`, `PTR-AC-2`
- **Design references:** `design.md` §6.2 Task group B table, `PTR-DD-1`
- **Files (expected):**
  - `pages/admin-section/pages/user-management/user-management.component.html`
  - `pages/outcome-indicator/pages/eioi-home/eoio-home.component.html`
  - `pages/outcome-indicator/pages/indicator-details/components/details-table/details-table.component.html`
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/mapped-results-modal/mapped-results-modal.component.html`
  - `pages/results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/components/mapped-results-modal/mapped-results-modal.component.html`
- **Depends on:** `—`
- **Blocks:** `—`
- **Parallel-safe:** yes (disjoint from `PTR-T-1`/`PTR-T-3`)
- **Estimate:** `S`
- **Review:** `skip-eligible` — 5 independent, mechanical two-line template edits (array append + value change); no shared-component/contract change; `Consumers: none`. Claim to be proven at execute time.
- **Verification:**
  - **Falsifier:** post-change, each file's `[rowsPerPageOptions]` must equal its pre-change array with `100` appended (e.g. `user-management` → `[10, 25, 50, 100]`), and `[rows]` must read `"100"`. A file missing `100` from its options, or still showing its old `[rows]` value, is wrong.
  - **Red run:** `n/a (no test gate)` — same reasoning as `PTR-T-1`.
  - **Disqualifier:** if the two `mapped-results-modal` copies diverge after the edit (`diff` between them returns non-zero output), the task is not done — `PTR-R-4` requires them to stay identical.
  - **Consumers:** `none (no shared symbol changed)` — run each file's sibling spec (`.spec.ts` for the first 3, `.component.test.ts` for the 2 modals) as a regression guard; per `P-3`, none should fail.
- **Definition of done:**
  - [ ] All 5 files show `[rows]="100"` and `100` appended to their respective options arrays, with every pre-existing option value preserved.
  - [ ] `diff` between the two `mapped-results-modal` copies returns zero output (still byte-identical).
  - [ ] `npx ng lint --quiet` clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="user-management|eoio-home|details-table|mapped-results-modal"` green, no new failures.
  - [ ] Commit via `🎨 style(pr-table-defaults) [SPEC:changes/table-pagination-default-100-rows]: <description>`.

### `PTR-T-3` — [x] Add 100 to options and bump default on `wp-home` (isolated, elevated review)

- **Type:** `client`
- **Description:** Same edit shape as `PTR-T-2` (append `100` to `[rowsPerPageOptions]`, change `[rows]` to `100`) applied to `wp-home.component.html` alone — isolated per `PTR-DD-2` because it is the only in-scope file rendering a grouped, independently-expandable table (`groupRowsBy`, `[expandedRowKeys]`, `prTableExpandedRow`, `prTableGroupHeader`/`[prRowToggler]`, all at `wp-home.component.html:42/43/75/58/63`). The grouping/expansion markup itself is NOT touched — only the two paginator-related bindings.
- **Implements:** `PTR-R-2`, `PTR-AC-3`
- **Design references:** `design.md` §6.2 Task group C table, `PTR-DD-2`, Premise `P-5`
- **Files (expected):**
  - `pages/outcome-indicator/pages/wp-home/wp-home.component.html`
- **Depends on:** `—`
- **Blocks:** `PTR-T-4` (for its `wp-home` check)
- **Parallel-safe:** yes (disjoint from `PTR-T-1`/`PTR-T-2`)
- **Estimate:** `S`
- **Review:** `full` — elevated per `PTR-DD-2`: even though the edit itself is mechanical, `wp-home`'s grouped/expandable structure means "100 rows" behaves differently here (up to 100 independently-expandable groups, not 100 flat rows) and deserves a Reviewer's explicit read of the surrounding grouping markup to confirm nothing else was disturbed.
- **Verification:**
  - **Falsifier:** post-change, `wp-home.component.html`'s `[rowsPerPageOptions]` must read `[8, 12, 20, 100]` and `[rows]` must read `"100"`; the `groupRowsBy`, `[expandedRowKeys]`, `prTableExpandedRow`, `prTableGroupHeader`, `[prRowToggler]` lines (42/43/58/63/75 pre-change) must be byte-identical to their pre-change content — any diff in those lines is wrong, this task touches only the paginator attributes.
  - **Red run:** `n/a (no test gate)`.
  - **Disqualifier:** if the diff touches anything beyond the two paginator attribute lines, the task is not done — re-scope rather than report complete with unintended collateral changes.
  - **Consumers:** `none (no shared symbol changed)` — run `wp-home.component.spec.ts` as a regression guard (per `P-3`, zero `rows`-related assertions exist, so nothing should fail).
- **Definition of done:**
  - [ ] `wp-home.component.html` shows `[rows]="100"`, options `[8, 12, 20, 100]`, grouping/expansion markup unchanged.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="wp-home"` green, no new failures.
  - [ ] Commit via `🎨 style(pr-table-defaults) [SPEC:changes/table-pagination-default-100-rows]: <description>`.

### `PTR-T-4` — [ ] Manual performance/scroll verification on the 3 render-heavy tables

- **Type:** `tests` (manual, non-automated)
- **Description:** With `PTR-T-1` and `PTR-T-3` landed, manually load `results-list`, `programme-results`, and `wp-home` in a real browser against a dataset reaching (or close to) 100 rows, scroll the full page on each, and record whether the page remains responsive with no visible layout break. This is the substitute gate for the "render/performance regression" defect class named in `requirements.md` §8, since no automated perf-testing infrastructure exists in this repo.
- **Implements:** `PTR-R-10`, `PTR-AC-6`
- **Design references:** `design.md` §10 Testing Plan, `PTR-DD-3`
- **Files (expected):** none (no code changes — verification record only, appended to `execution.md`)
- **Depends on:** `PTR-T-1`, `PTR-T-3`
- **Blocks:** `—`
- **Parallel-safe:** n/a (depends on prior tasks landing first)
- **Estimate:** `S`
- **Review:** `checklist` — not `skip-eligible`: a manual browser check inherently involves human judgment (Review intensity condition 2 excludes checks whose `Disqualifier` "names a read or judgment"), so a conformance pass confirming the check was actually performed and recorded is warranted, even though there is no code diff to audit.
- **Verification:**
  - **Falsifier:** scrolling a 100-row page on any of the 3 tables that shows a broken layout, a frozen/unresponsive page, or any other visible regression is a FAIL for that table — recorded, not silently passed.
  - **Red run:** `n/a (no test gate)` — manual browser check, not an automated suite.
  - **Disqualifier:** if the authenticated test session's dataset doesn't actually reach close to 100 rows for a given table, that table's check is **inconclusive**, not a pass — record the actual row count observed rather than asserting success on a smaller sample.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] `results-list`, `programme-results`, `wp-home` each checked in a real authenticated browser session (per `onecgiar-pr-client/CLAUDE.md` §9's two-localStorage-key verification note).
  - [ ] Outcome (pass / FAIL / inconclusive, with the row count actually observed) recorded in `execution.md` for each of the 3 tables.
  - [ ] Any FAIL or inconclusive result reported to the user as a follow-up — per `PTR-DD-3`, this never blocks `PTR-T-1`/`PTR-T-2`/`PTR-T-3` from already being closed.

## 4. Dependency graph

```
PTR-T-1 ──┐
PTR-T-2    (independent, parallel-safe)
PTR-T-3 ──┴── PTR-T-4 (manual verification — depends on T-1 and T-3's tables)
```

`PTR-T-2` has no downstream dependency and is not touched by `PTR-T-4`'s risk list (none of its 5 tables are performance-flagged).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PTR-TEST-1` | regression (client, Jest) | `PTR-R-1`, `PTR-AC-1` | the 12 `PTR-T-1` files' existing `.spec.ts` suites |
| `PTR-TEST-2` | regression (client, Jest) | `PTR-R-2`, `PTR-R-4`, `PTR-AC-2` | the 5 `PTR-T-2` files' existing `.spec.ts`/`.component.test.ts` suites |
| `PTR-TEST-3` | regression (client, Jest) | `PTR-R-2`, `PTR-AC-3` | `wp-home.component.spec.ts` |
| `PTR-TEST-4` | manual (browser) | `PTR-R-10`, `PTR-AC-6` | `results-list`, `programme-results`, `wp-home` — recorded in `execution.md` |

Client coverage MUST stay above 50/60/60/60 — unaffected by this spec since no new logic is added, only literal config values changed.

## 6. Rollout & verification

- [ ] PR(s) opened with the commit message convention.
- [ ] CI green (lint, Jest, build).
- [ ] `PTR-T-4`'s manual check recorded before the spec is marked `shipped`.
- [ ] No downstream-consumer notification needed (client-only, no payload touched).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after all 4 tasks close (including `PTR-T-4`'s recorded outcome).
- [ ] If `PTR-T-4` surfaces a real performance regression on any of the 3 tables, file it as a new `bugfix/*` spec — not reworked inside this one.
- [ ] Carry forward the pre-existing, out-of-scope risk note (`aow-hlo-table`/`reporting-aow-table` fully unpaginated today) to a future look, per `design.md` §13.

## 8. Roll-back plan

1. Revert the relevant task's commit (`PTR-T-1`, `PTR-T-2`, or `PTR-T-3` — each is independently revertable since they touch disjoint files).
2. No migration, no feature flag to disable.
3. Verify the reverted table(s) return to their prior smaller default — confirms the revert, not a regression beyond the original (smaller-default) behavior.

## Required cross-references

- `docs/specs/changes/table-pagination-default-100-rows/requirements.md`, `design.md`, `proposal.md` (same folder).
- `docs/prd.md` `G4`; `onecgiar-pr-client/CLAUDE.md` §9 (Testing, browser-verification notes).
- `../../bugfix/pr-table-paginator-dropdown-select/` — the prerequisite fix.
