# Tasks — Split "Source" column on the bilateral Results list

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `results-list-source-column-split`
- **Linked spec:** `./requirements.md` + `./design.md`
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (status `approved`).
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved (`BSC-OQ-1`/`-2` resolved in `design.md` §1; `BSC-OQ-3` is a within-task verification step, not a blocker).
- [x] CLARISA dependencies: none — not applicable to this spec.
- [x] No conflicting in-flight spec touching the same component (`docs/specs/bilateral/` has no other spec touching `bilateral-results-list`).
- [x] Migration name/reversibility: not applicable — no migration.

## 3. Task list

### [x] `BSC-T-1` — Split the Source column into Origin + Funding source

- **Type:** `client`
- **Description:** In `bilateral-results-list.component.ts`, rename the `source` column's `title` to `Origin`, insert a new `fundingSource` column entry immediately after it (`title: 'Funding source'`), and bump `BILATERAL_COLUMN_STORAGE_KEY` from `v4` to `v5` with an updated version comment. In `bilateral-results-list.component.html`, split the combined cell (lines ~409-420) into two branches: the `source`/`Origin` cell renders only the `AI Result` badge when `isAiResult(result)` is true, else the plain "Manual" text label (`BSC-DD-1`); the new `fundingSource` cell renders the existing `W3`/`W1/W2` badge markup unchanged, keyed off `column.key === 'fundingSource'` (not `column.attr`, per `BSC-DD-2`). Update both skeleton-loading width ternaries (`:346`, `:556`) to give the new column key the same `'38px'` placeholder width used for the badge today. Add the muted "Manual" text style (reuse an existing plain-text class from this component if one already matches; otherwise add one matching the table's existing typography scale — no new color token).
- **Implements:** `BSC-R-1`, `BSC-R-2`, `BSC-R-3`, `BSC-R-4`, `BSC-R-10`, `BSC-AC-1`, `BSC-AC-2`, `BSC-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.scss` (only if a new muted-text class is needed)
- **Depends on:** —
- **Blocks:** `BSC-T-2`
- **Estimate:** `S`
- **Review:** `checklist`
- **Skills:** `angular-developer` (component/template edit conventions)
- **Verification:**
  - **Falsifier:** Render a row with `result.source === 'API'` and `isAiResult(result) === true`. If the `Origin` cell shows a `W3`/`W1/W2` badge, or the `Funding source` cell shows the `AI Result` badge, or either cell is empty/blank, the task is wrong.
  - **Red run:** `npx jest --testPathPattern bilateral-results-list.component.spec.ts` — will only turn genuinely red once `BSC-T-2` adds the new assertions; until then, manually verify via the falsifier in a running dev server (`npm start` on the client, navigate to the bilateral Results list) before marking this task done, since the pre-existing spec file has no assertion shaped to catch this defect yet.
  - **Disqualifier:** If `bilateral-results-list.component.spec.ts` (checked as part of this task, resolving `BSC-P-3`) turns out to pin the exact column count, header array, or a positional `td`/`th` index for this table, stop and fold those assertion updates into this task's diff before calling it done — do not ship a diff that leaves a pinned test red.
  - **Consumers:** `none (no shared symbol changed)` — `BILATERAL_COLUMNS` and the two template cells are private to this component; nothing outside it imports them.
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>`) — pending commit/PR.
  - [x] Lint (`npx ng lint --quiet`) clean.
  - [x] `Origin` column never renders the `W3`/`W1/W2` badge; `Funding source` column never renders the `AI Result` badge — verified by template tracing (Implementer + Reviewer); live dev-server confirmation still deferred to `BSC-T-2`'s Jest assertions / `/akili-validate` HITL check, per `requirements.md` §10's recorded substitution.
  - [x] Column picker shows both `Origin` and `Funding source` as independently toggleable entries.
  - [x] `BILATERAL_COLUMN_STORAGE_KEY` reads `v5` and its version-history comment documents the reason.
  - [x] No secret or token leaked in logs or messages — not applicable here (no logging touched), checked anyway.
  - [x] i18n: not applicable — this table's existing headers are plain English strings with no i18n pipeline (matches current convention; not a regression this task introduces).

### [x] `BSC-T-2` — Update and add component tests for the split columns

- **Type:** `tests`
- **Description:** In `bilateral-results-list.component.spec.ts`: (a) if `BSC-T-1` found pinned column-count/header assertions, confirm they were updated correctly (or update them here if `BSC-T-1` deferred that); (b) add a fixture row with `result.source === 'API'` and an AI-origin flag `true`, and a second with `result.source !== 'API'` and the flag `false`; assert `Origin` cell content and `Funding source` cell content independently for both rows; (c) add a test seeding `localStorage` with a `v4`-shaped visible-columns value (missing the `fundingSource` key) and assert the rendered table still shows the `Funding source` column (proves the `v5` bump prevents the stale-preference hide); (d) add a test asserting the column-picker option list contains both `source`/`Origin` and `fundingSource`/`Funding source` as separate, independently-toggleable entries.
- **Implements:** `BSC-R-4`, `BSC-AC-1`, `BSC-AC-2`, `BSC-AC-3`, `BSC-AC-4`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`
- **Depends on:** `BSC-T-1`
- **Blocks:** —
- **Estimate:** `S`
- **Review:** `checklist`
- **Skills:** `angular-developer` (Jest component test conventions for this stack)
- **Verification:**
  - **Falsifier:** Run the new `BSC-AC-3` test against the **pre-`BSC-T-1`** storage-key value (`v4`) with the new column omitted from a saved preference — if the column renders hidden, the version-bump mechanism did not work as designed and the test must fail, proving it can actually catch the defect it targets.
  - **Red run:** `npx jest --testPathPattern bilateral-results-list.component.spec.ts` — must fail before `BSC-T-1`'s template/config changes exist (the new assertions have nothing correct to check yet) and pass after.
  - **Disqualifier:** If the `v5` stale-preference test cannot be made to fail against a deliberately-reverted `BSC-T-1` (i.e., it passes even without the version bump), the test is not exercising the mechanism it claims to — rewrite it rather than keep a green test that proves nothing (per the "name the input that would make the check fail" rule).
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Code merged via the project commit convention — pending commit/PR.
  - [x] Lint clean.
  - [x] All four new/updated assertion groups (a-d above) pass.
  - [x] Client coverage thresholds (50/60/60/60 minimum) still met for this file (85.33/63.63/86.76/87.99% statements/branches/functions/lines).
  - [x] `npx jest --testPathPattern bilateral-results-list` run and confirmed green: 76 passed, 76 total.

## 4. Dependency graph

```
BSC-T-1 (column config + template split + storage-key bump)
   └── BSC-T-2 (component tests: cell content, stale-preference, column picker)
```

No parallel branches — two small, sequential tasks in one component.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSC-TEST-1` | unit (client) | `BSC-R-1`, `BSC-AC-1` | `bilateral-results-list.component.spec.ts` — Origin cell never shows funding badge |
| `BSC-TEST-2` | unit (client) | `BSC-R-2`, `BSC-AC-2` | `bilateral-results-list.component.spec.ts` — Funding source cell shows correct W3/W1-W2 badge |
| `BSC-TEST-3` | unit (client) | `BSC-R-4`, `BSC-AC-3` | `bilateral-results-list.component.spec.ts` — stale `v4` preference does not hide the new column |
| `BSC-TEST-4` | unit (client) | `BSC-R-3`, `BSC-AC-4` | `bilateral-results-list.component.spec.ts` — column picker lists both columns independently |

Client coverage MUST stay above 50/60/60/60 (`docs/trd/trd.md` §10 / root `CLAUDE.md`).

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build). No `migration:check:ci` impact (no migration). No SonarCloud-specific new debt expected (small, well-tested change).
- [ ] Manual QA on staging: open the bilateral Results list, confirm `Origin` and `Funding source` render as separate columns for a mix of W3/W1-W2 and AI/manual rows, confirm the column picker toggles each independently, confirm a browser with a pre-existing stored preference still shows the new column after deploy.
- [ ] Bilateral / platform-report downstream notification: not applicable — no payload changed.
- [ ] Telemetry: not applicable — no new logging.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] No cross-cutting decision to promote to `docs/ux-ui/design.md` or `docs/trd/trd.md` — this is a module-local presentation fix, not a platform-wide pattern.
- [ ] Follow-up (separate, already scoped out in `proposal.md`): run `/akili-quick` for the unrelated "common W3 information" copy fix in `section-general-info.component.html` and `bilateral-change-result-type-dialog.component.html`.
- [ ] `docs/prd.md` Open Questions: none resolved by this spec, none to update.

## 8. Roll-back plan

1. Revert the PR (single PR expected — see Review Handoff below).
2. No migration to revert (no schema change).
3. No feature flag introduced.
4. Not applicable — no bilateral/platform-report payload to compare.
5. Not applicable — no downstream consumers to notify.

---

## Required cross-references

`./requirements.md` · `./design.md` · `docs/prd.md` · `docs/trd/trd.md` §10 (coverage thresholds)
