# Module Spec — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `results` / `expand-split-innovation-picker`
- **Linked spec:** `docs/specs/results/expand-split-innovation-picker/requirements.md` + `design.md` (+ `judgment.md` for the round-1 corrections these tasks already bake in).
- **Sprint / target phase (if any):** none stated.
- **Owner / driver:** Santiago Sanchez (PRMS)
- **Status:** not-started

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved (status `approved` — all open questions resolved 2026-09-16).
- [x] `design.md` is approved (judgment-day round 1: APPROVED ✅, corrections applied).
- [x] Open questions in `requirements.md` and `design.md` are all resolved (`SIP-OQ-1/2/3`; `RES-DD-1/2/3`).
- [ ] CLARISA dependencies — N/A, this feature does not touch CLARISA.
- [ ] No conflicting in-flight spec touching the same entities — confirm no other `docs/specs/results/*` spec is mid-flight against `result.repository.ts`'s `getMergeSplitTargetInnovations` or `rd-annual-updating` before starting `SIP-T-1`.
- [ ] Migration name and reversibility confirmed — N/A, no schema change (design.md §3.2).

---

## 3. Task list

### `SIP-T-1` — Broaden merge/split-target eligibility query `[x]`

- **Type:** `server`
- **Description:** In `result.repository.ts`, remove the `status_id IN (...)` clause from both the main `WHERE` and the de-dup `NOT EXISTS` subquery of `getMergeSplitTargetInnovations()`, remove the now-unused `MERGE_SPLIT_TARGET_STATUS_IDS` constant and its block comment entirely (do not leave it dead), and update the Swagger `@ApiOperation.description` on `results.controller.ts:769` (currently "QA'd or Approved, never discontinued") to drop the stale status wording. `is_active`, `is_discontinued`, `result_type_id = INNOVATION_DEVELOPMENT`, self-exclusion, `search` LIKE clause, ordering, and `limit` stay unchanged. Do NOT touch the sibling `QA_LINKABLE_INNOVATION_STATUS_IDS` constant (unrelated feature, per `RES-DD-1`'s reversion challenge).
- **Implements:** `SIP-R-1`, `SIP-R-2`, `SIP-R-3`, `SIP-AC-1`, `SIP-AC-2`, `SIP-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`, `onecgiar-pr-server/src/api/results/results.controller.ts`
- **Depends on:** —
- **Blocks:** `SIP-T-2`, `SIP-T-5`
- **Estimate:** `S`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🔧 fix(result.repository) [ticket]: <description>` — no apostrophes/`$`/quotes in the subject, per root `CLAUDE.md` Jenkins rule). — pending: not yet committed (awaiting user go-ahead).
  - [x] Lint + format clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`) — clean on the two touched files; 56 pre-existing CRLF errors elsewhere (`bilateral-center.*`) adjudicated out of scope by Reviewer.
  - [x] `MERGE_SPLIT_TARGET_STATUS_IDS` no longer exists anywhere in the file (verify with a grep, not just visual read).
  - [x] `QA_LINKABLE_INNOVATION_STATUS_IDS` and its usages are byte-for-byte unchanged.
  - [x] No secret or token leaked in logs or messages.
  - [x] Swagger description no longer claims a QA-status restriction.
  - [x] No migration needed (confirmed — no entity change).

### `SIP-T-2` — Repository regression tests for broadened eligibility `[x]`

- **Type:** `tests`
- **Description:** Update/add cases in `result.repository.spec.ts` proving the new eligibility rule: an `Editing` or `Submitted` active, non-discontinued Innovation Development result now appears (`SIP-AC-1`); a `QualityAssessed`/`Approved` one still appears — no regression (`SIP-AC-2`); a discontinued innovation, an inactive innovation, and the result being edited itself never appear (`SIP-AC-3`).
- **Implements:** `SIP-AC-1`, `SIP-AC-2`, `SIP-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.spec.ts`, `onecgiar-pr-server/src/api/results/result.repository.merge-split-targets.spec.ts` (found during `SIP-T-1` review: this file also imports/asserts `MERGE_SPLIT_TARGET_STATUS_IDS` — L2, L34, L38 — which no longer exists; remove the stale import and the two assertions on it, keep/update the rest of the suite for the broadened eligibility rule)
- **Depends on:** `SIP-T-1`
- **Blocks:** —
- **Estimate:** `S`
- **Definition of done:**
  - [x] `SIP-TEST-1` through `SIP-TEST-3` (see §5) pass locally — 17/17 tests green in `result.repository.merge-split-targets.spec.ts`.
  - [x] Server coverage stays at/above 5/20/35/40 thresholds — test-only change, cannot regress coverage.
  - [x] No mocking of the TypeORM query builder where the SQL itself is the thing under test (per server `CLAUDE.md` §9 "avoid mocking repositories where the SQL is the test target") — only the DB round-trip (`repository.query`) is stubbed; SQL construction runs for real.

### `SIP-T-3` — Extend `pr-multi-select` with opt-in server-search mode `[x]`

- **Type:** `client`
- **Description:** Add an additive, opt-in `(searchTextChange)` output (string, trimmed, debounced — default `300ms`, configurable via a new `[serverSearchDebounceMs]` input) to `pr-multi-select`. When a consumer template binds this output, the component's internal `filterFlatOptions` client-side filtering is bypassed for that instance; the parent is expected to replace `[options]` after each server response. When unwired, existing behavior (all ~78 current call sites) is unchanged — verify by diffing the component's public API surface, not just by inspection. Per `RES-DD-2`.
- **Implements:** `SIP-R-5`, `SIP-R-6`, `SIP-R-10`
- **Files (expected):** `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.component.ts`, `.html`
- **Depends on:** —
- **Blocks:** `SIP-T-4`, `SIP-T-5`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] Code merged via project commit convention (`✨ feat(pr-multi-select) [ticket]: <description>`). — pending: not yet committed (awaiting user go-ahead).
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] No change to `ControlValueAccessor` semantics, chip projection slot, group-mode behavior, or `optionsIntance()`/`sameOptionSet()` clone stability (per `pr-multi-select/CLAUDE.md`) when `serverSearch` is not wired — Reviewer independently confirmed via full-file read.
  - [x] `pr-multi-select/CLAUDE.md` updated with the new capability and its `Verified:` line re-stamped in the same commit (per client `CLAUDE.md` "Folder docs" convention).
  - [ ] Unit tests added; coverage thresholds met (client 50/60/60/60 minimum — `pr-multi-select` itself is excluded from Jest coverage per client `CLAUDE.md` §9, so this task's real proof point is `SIP-T-4`'s Cypress CT suite, not Jest).

### `SIP-T-4` — Cypress CT coverage for the new server-search mode `[x]`

- **Type:** `tests`
- **Description:** Add one new `pr-multi-select.cy.ts` case exercising `serverSearch`/`searchTextChange` (debounce fires, output emits the trimmed term, local filtering is bypassed when wired). **Also add a second new case for the UNWIRED path** (found during `SIP-T-3` review — carried forward as binding scope, not optional): mount an instance that does NOT bind `(searchTextChange)`, type into the search box, assert the list still narrows via local `filterFlatOptions` and that no `searchTextChange` emission occurs. This closes the coverage gap the Reviewer flagged: the `.html` change from `[(ngModel)]` to `[ngModel]`/`(ngModelChange)` affects all ~78 unwired instances, and neither the existing Jest specs nor the existing Cypress suite exercise the search box at all today — reading the diff was not sufficient proof. Run the full existing `pr-multi-select` CT suite and confirm every existing case still passes unmodified — this is the proof that the change is additive.
- **Implements:** `SIP-R-5`, `SIP-R-6`, `SIP-R-10` (verification side)
- **Files (expected):** `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts`
- **Depends on:** `SIP-T-3`
- **Blocks:** —
- **Estimate:** `S`
- **Definition of done:**
  - [~] `npm run test:ct` reports "All specs passed!" including the new wired-mode case AND the new unwired-mode case. — **exception recorded, not silently passed:** 9 tests in this file, 8 passing (both new cases included); 1 failure is a pre-existing, unrelated bug (reproduced 3/3 on the unmodified baseline with this entire spec stashed out) — see `execution.md` SIP-T-4 entry. Flagged to user as a separate follow-up, not fixed here.
  - [x] Unwired-mode case proves both halves: local filtering still narrows the list, and `searchTextChange` never emits. — required a rework attempt (`cy.wait(400)` fix) to make the "never emits" half non-vacuous.
  - [x] Diff of `pr-multi-select.cy.ts` shows an addition, not a modification, to any pre-existing case (confirms no behavior change for the other ~78 instances) — confirmed by both the Leader and the Reviewer directly, including after the pre-existing-bug investigation.

### `SIP-T-5` — Wire `rd-annual-updating` to the broadened, searchable picker `[x]`

- **Type:** `client`
- **Description:** Add `searchMergeSplitCatalogue(term: string)` to `rd-annual-updating.component.ts` — a method separate from the fetch-once-guarded `loadMergeSplitCatalogue()` (never reuses its `mergeSplitCatalogueRequested` guard). On each debounced `(searchTextChange)` from either the merge or split `app-pr-multi-select`, call `GET_mergeSplitTargetInnovations(resultId, term)` and reassign `mergeSplitCatalogue` via a **selection-preserving merge**: keep every candidate currently referenced by `generalInfoBody.merge_split_targets` (either `transition_type`) even if the search response excludes it, and reuse the existing stable-reference pattern from the NG0103 fix (`component.ts:207-229`) rather than a bare array overwrite. Remove the "quality-assessed" wording from both `description` strings (merge L109, split L127); keep them textually identical. Move both strings to `src/app/internationalization/` as new `TermKey`s if Annual Updating varies P22/P25 (confirm during implementation per `design.md` §13); otherwise a plain string update is acceptable, matching the file's current unmigrated pattern.
- **Implements:** `SIP-R-1` (client consumption), `SIP-R-4`, `SIP-R-5`, `SIP-R-6`, `SIP-R-10`, `SIP-AC-4`, `SIP-AC-5`, `RES-DD-3`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/rd-annual-updating.component.ts`, `.html`
- **Depends on:** `SIP-T-1`, `SIP-T-3`
- **Blocks:** `SIP-T-6`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] Code merged via project commit convention (`✨ feat(rd-annual-updating) [ticket]: <description>`). — pending: not yet committed (awaiting user go-ahead).
  - [x] Lint clean.
  - [x] `searchMergeSplitCatalogue` is confirmed NOT gated by `mergeSplitCatalogueRequested` (grep/read check, not just "should work").
  - [x] Selection-preserving merge implemented and does not mutate `mergeSplitCatalogue`'s array reference unless content actually changed — Reviewer traced this through a concrete A/B/C scenario across two attempts.
  - [x] Both `description` strings updated and identical to each other.
  - [x] If UX changed: i18n keys added under `src/app/internationalization/` per the decision above. — confirmed plain string is correct (zero i18n usage in this file; strings don't vary P22/P25), no new TermKey needed.

### `SIP-T-6` — `rd-annual-updating` regression tests + manual verification `[x]`

- **Type:** `tests`
- **Description:** Update `rd-annual-updating.component.spec.ts`: (a) assert `GET_mergeSplitTargetInnovations` is called with the typed search term after debounce, **and** that `mergeSplitCatalogue`/rendered options actually narrow to the response — not just that the call fired; (b) new case — select a target, then search with a term that excludes it from the raw response, assert it remains selected in `generalInfoBody.merge_split_targets` and in the rendered list (`RES-DD-3` regression test); (c) assert both `description` strings no longer mention "quality-assessed" and match each other. Then manually verify in a real browser (inject both `token` and `user` in localStorage, confirm the served bundle isn't stale, per client `CLAUDE.md` §9 traps): an Editing-status innovation now appears in both pickers; search narrows the list without dropping an existing selection; no console error/NG0103 warning appears while typing a search term with an active selection. Spot-check the current `limit` default (50) against Innovation Development volume on `test`/`staging` (design.md §13 — non-blocking, record the finding either way).
- **Implements:** `SIP-AC-4`, `SIP-AC-5`, `RES-DD-3` (verification side)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/rd-annual-updating.component.spec.ts`
- **Depends on:** `SIP-T-5`
- **Blocks:** —
- **Estimate:** `M`
- **Definition of done:**
  - [x] `SIP-TEST-4` through `SIP-TEST-6` (see §5) pass locally (`npm run test -- --testPathPattern="rd-annual-updating"`, per client `CLAUDE.md` "run only the touched module's specs") — 90/90 passing.
  - [x] Client coverage stays at/above 50/60/60/60 thresholds — test-only additions, cannot regress.
  - [x] Manual browser verification completed with no NG0103 console warning/error observed during search-with-active-selection — performed by the user directly against real test data.
  - [x] `limit=50` spot-check result recorded — **finding:** search felt slow after the status filter removal (matches the risk `design.md` §8 anticipated); user's disposition: recorded, non-blocking, no scope expansion.

### `SIP-T-7` — Visual styling correction for the merge/split picker (added post-review, see `execution.md` Pivot Record) `[x]`

- **Type:** `client`
- **Description:** Add an **opt-in visual variant** to `pr-multi-select` so the merge/split picker's search bar and option rows resemble `rd-contributors-and-partners`'s linked-result picker (reference only — that file itself is NOT touched, per `requirements.md`'s explicit out-of-scope line). Concrete visual targets, taken from `rd-contributors-and-partners.component.scss`: rounded dropdown panel (`border-radius: 8px`, `box-shadow: var(--pr-shadow-2)`), a proper search bar (icon inside the input, `border: 1px solid var(--pr-color-neutral-1000)`, `border-radius: 6px`, left-padded for the icon), and option rows with real spacing/dividers/hover (`padding: 16px 20px`, `border-bottom: 1px solid var(--pr-border-divider)`, `&:hover { background-color: var(--pr-surface-raised-soft) }`) — mirroring `.custom-dropdown-panel`, `.search-bar`, `.results-list.compact-list .result-list-item` in that file. **Explicitly OUT of scope:** the filter-chip set (typology/portfolio/funding-source toggles) — `SIP-R-20`/`SIP-OQ-3` already resolved those as unnecessary for this single-typology candidate list; do not add them.
- **Scope boundary (hard requirement):** the variant MUST be opt-in — a new optional input on `pr-multi-select` (off/undefined by default) — so the other ~78 existing call sites are provably byte-for-byte unchanged in appearance. No global restyle of `pr-multi-select.component.scss`'s base classes. Verify by confirming no existing `.cy.ts`/`.spec.ts` screenshot or DOM assertion changes for any consumer other than `rd-annual-updating`.
- **Implements:** (client-side visual correction; traces to `SIP-US-2` in `requirements.md` and `proposal.md`'s original "carry over the visual language" scope, not a new `SIP-R-*` id)
- **Files (expected):** `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.component.ts`, `.html`, `.scss`; `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/rd-annual-updating.component.html` (to opt in on both merge/split instances); `pr-multi-select/CLAUDE.md` (doc update, per folder-doc convention).
- **Depends on:** `SIP-T-5`
- **Blocks:** —
- **Estimate:** `M`
- **Definition of done:**
  - [x] Code merged via project commit convention — committed as part of `b18c365c3` (bundled with unrelated work by the user in a separate session; not this Leader's commit).
  - [x] Lint clean (`npx ng lint --quiet`) — confirmed twice across both rework attempts.
  - [x] The new variant is OPT-IN: confirmed by diffing `pr-multi-select`'s public API (only an addition) and confirming its default/unset behavior is visually unchanged.
  - [x] Both merge and split pickers in `rd-annual-updating` opt into the variant.
  - [x] `pr-multi-select/CLAUDE.md` updated with the new capability, `Verified:` line re-stamped in the same commit.
  - [~] Manual browser confirmation (by the user) that the picker now visually resembles the reference — **recorded gap, not silently closed:** both Reviewer passes flagged that nothing automated measures the rendered row height (jsdom cannot evaluate layout); the PASS verdict rests on independently re-derived CSS math, not a runnable measurement. This checkbox was still open under this session's tracking when the spec was archived/committed/pushed from a separate session. See `execution.md`'s `SIP-T-7` entry.

---

## 4. Dependency graph

```
SIP-T-1 (server: broaden query)
   └── SIP-T-2 (server: repository regression tests)

SIP-T-3 (client: pr-multi-select server-search mode)
   └── SIP-T-4 (client: Cypress CT for server-search mode)

SIP-T-1 ─┐
SIP-T-3 ─┴── SIP-T-5 (client: wire rd-annual-updating, selection-preserving merge)
                └── SIP-T-6 (client: rd-annual-updating regression tests + manual verification)
```

Parallel-friendly: `SIP-T-1`+`SIP-T-2` (server track) can run in parallel with `SIP-T-3`+`SIP-T-4` (shared-component track) — both are prerequisites for `SIP-T-5`, which cannot start until both tracks land.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `SIP-TEST-1` | unit (server) | `SIP-AC-1` — Editing/Submitted innovation now appears | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `SIP-TEST-2` | unit (server) | `SIP-AC-2` — QualityAssessed/Approved still appears (no regression) | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `SIP-TEST-3` | unit (server) | `SIP-AC-3` — discontinued / inactive / self never appear | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `SIP-TEST-4` | component (client, Cypress CT) | `SIP-R-5`, `SIP-R-10` — `pr-multi-select` server-search mode, additive to existing suite | `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/pr-multi-select.cy.ts` |
| `SIP-TEST-5` | unit (client, Jest) | `SIP-AC-4`, `SIP-AC-5` — info text, search wiring narrows the list (not just "call fired") | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/components/rd-annual-updating/rd-annual-updating.component.spec.ts` |
| `SIP-TEST-6` | unit (client, Jest) | `RES-DD-3` regression — selection survives a search that excludes it | same file as `SIP-TEST-5` |

No bilateral/platform-report payload test needed — confirmed not part of that surface (`design.md` §4.2).

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`; no apostrophes/`$`/quotes in the subject).
- [ ] CI green (lint, tests, build, `migration:check:ci` — trivially green, no migration in this spec, SonarCloud).
- [ ] Manual QA on staging/test env: Annual Updating "discontinued: splitting" and "discontinued: merging" flows, per `SIP-T-6`'s manual checklist.
- [ ] No bilateral/platform-report notification needed (§4.2 of `design.md`).
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: none new to verify (no new logging surface).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] Promote the `pr-multi-select` server-search-mode pattern into `docs/ux-ui/design.md` §12 if a second consumer adopts it (first-use doesn't require promotion yet).
- [ ] Follow-up candidates deferred from `design.md`/`judgment.md` (not part of this spec's scope, revisit only if raised again):
  - `RES-DD-1`'s business-risk framing (a submitter could target a mid-review/about-to-be-rejected innovation) — flagged for QA/PM awareness, not a blocking control in this spec.
  - Any additional filter (portfolio/phase) beyond search — `SIP-R-20`, resolved as not needed now (`SIP-OQ-3`).
- [ ] No `docs/prd.md` Open Question resolved by this spec.

---

## 8. Roll-back plan

1. Revert the merged PR(s) for `SIP-T-1` through `SIP-T-6`, in reverse dependency order (client tasks first, then the shared `pr-multi-select` change, then the server query change) if a partial rollback is ever needed; otherwise revert the whole PR as one unit.
2. No migration to run `migration:revert` against — this spec introduces none.
3. No feature flag to disable — the change is a direct query/UI update with immediate effect on deploy, per the confirmed business sign-off (`SIP-OQ-1`).
4. Confirm bilateral/platform-report payloads are unaffected either way (they never read `merge_split_targets` — no verification needed beyond a smoke check).
5. No downstream consumer to notify.

---

## Required cross-references

- `docs/specs/results/expand-split-innovation-picker/requirements.md` and `design.md` (same folder), and `judgment.md` for the round-1 corrections these tasks implement.
- `docs/prd.md` (`G2`, `US-S2`), `docs/ux-ui/design.md` (§10 a11y), `docs/trd/trd.md` (`api/results/` module).
- No authoritative module doc payload touched (confirmed not bilateral/platform-report — `design.md` §4.2).
