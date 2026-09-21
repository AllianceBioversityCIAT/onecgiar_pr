# Module Spec — Multi-HLO Result Linking — `tasks.md`

## 1. Scope of this task list

- **Module / feature:** `changes/multi-hlo-result-linking`
- **Linked spec:** `docs/specs/changes/multi-hlo-result-linking/requirements.md` + `design.md`
- **Sprint / target phase (if any):** next available (ticket #163059 support escalation)
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** not-started

---

## 2. Pre-flight checklist

- [ ] `requirements.md` is approved (status `approved`).
- [ ] `design.md` is approved.
- [ ] Open questions `MHL-OQ-2`, `MHL-OQ-3`, `MHL-OQ-4` are acknowledged as deliberate follow-ups (not blockers) per `design.md` §13.
- [ ] CLARISA dependencies: none new — no cache table or endpoint change.
- [ ] No conflicting in-flight spec touching the same entities — confirmed `results/intermediate-outcome-aow-visibility/aow-selector` touches a disjoint indicator bucket (Intermediate Outcomes, not HLOs).
- [ ] Migration name and reversibility: **not applicable** — no migration in this spec.

---

## 3. Task list

### `MHL-T-1` — Reject typology-mismatched ToC links in `createTocMappingV2` `[x]`

- **Type:** `server`
- **Description:** In `results-toc-results.service.ts`, inside `createTocMappingV2` (~L1326+), add a pre-upsert guard: for each `ResultTocResultItemDto` in the incoming array, resolve the result's `result_type_id` and the target ToC node's indicator `type_value`, and compare via `RESULT_TYPE_TO_INDICATOR_PATTERN` (reuse `indicatorResultTypeCaseSql` if pushing the check into a repository query is cleaner than row-by-row application code — read the full method first to see what's already in scope before adding a new repository helper). Items that fail the match are rejected with a clear validation error (`toc_result_id`, no internals leaked); items that pass proceed through the existing upsert logic unchanged. **Explicit decision required at implementation time** (per `design.md` Open Gaps): if the result's `result_type_id` has no entry in `RESULT_TYPE_TO_INDICATOR_PATTERN` (`OTHER_OUTCOME`, `OTHER_OUTPUT`, `IMPACT_CONTRIBUTION`, `COMPLEMENTARY_INNOVATION`), the guard MUST be permissive (skip the check, allow the link) rather than reject everything — record this as a one-line comment next to the guard.
- **Implements:** `MHL-R-4`, `MHL-R-5`, `MHL-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts`, possibly `onecgiar-pr-server/src/toc/toc-results/toc-results.repository.ts` (only if a new batched `type_value` lookup is needed — confirm scope first).
- **Depends on:** `—`
- **Blocks:** `MHL-T-4`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`), scope `results-toc-results`, ticket `#163059` — **pending: not committed, awaiting explicit user go-ahead per standing instruction.**
  - [x] Lint + format clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`).
  - [x] Unit tests added in `results-toc-results.service.spec.ts`: (a) two typology-matching HLO items under the same AoW both persist in one `createTocMappingV2` call; (b) a typology-mismatched item is rejected while a matching sibling item in the same request still persists; (c) a result type with no `RESULT_TYPE_TO_INDICATOR_PATTERN` entry is permitted through (permissive fallback) with a comment explaining why; (d) existing `createTocMappingV2` cases (~L215-516) stay green. Also added: neutral-node, existing-row-preserved (planned and unplanned), and negative-control cases. 16/16 pass.
  - **No-pass clause:** if test (b) passes only because the mismatched item happens to also violate some *other* existing validation (e.g. a missing required field in the fixture), that is not evidence the typology guard works — the fixture must isolate the typology mismatch as the *only* difference from a passing case.
  - [ ] Coverage stays at/above server floor (5/20/35/40) — **partially verified:** file-scoped run shows 33.68/24.75/31/34.14, up from 32.42/24.26/29.59/32.87 after attempt 1 (monotonic increase); the global-floor gate is only meaningful on the full-suite run, which was not executed per the standing no-full-suite rule.
  - [x] No secret or token leaked in logs or messages (`.cursorrules`) — the new rejection log line carries only `resultId`/`toc_result_id`, no user PII beyond what already flows through this service.
  - [x] API surface: response gains additive `rejected_result_toc_results` and a real HTTP 422 on rejection (design.md §4.1 error case); no request DTO change.

---

### `MHL-T-2` — Fix `getMaxNumberOfTabs` to stop capping by distinct AoW `[x]`

- **Type:** `client`
- **Description:** In `multiple-wps.component.ts`, change `getMaxNumberOfTabs(plannedResult, resultLevelId)` from counting distinct `work_package_id` values (a `Set` keyed by AoW) to counting the candidate list itself (`outcomeList.length` / `outputList.length` / `eoiList.length`, selected per `resultLevelId` the same way the method already dispatches). These lists are already typology-filtered server-side for the planned/non-bilateral path (`_appendResultTypeIndicatorFilter`), so no new client-side typology check is needed here — this task is a pure "stop grouping by AoW" fix.
- **Implements:** `MHL-R-3`, `MHL-AC-5`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/multiple-wps.component.ts`
- **Depends on:** `—`
- **Blocks:** `MHL-T-4`
- **Estimate:** `S`
- **Definition of done:**
  - [ ] Code merged via the project commit convention, scope `multiple-wps`, ticket `#163059` — **pending: not committed, awaiting explicit user go-ahead per standing instruction.**
  - [x] Lint clean (`npx ng lint --quiet`).
  - [x] Unit test in `multiple-wps.component.spec.ts`: a fixture with 2+ HLOs sharing one `work_package_id` (same AoW) now yields a tab cap equal to the candidate-list length, not `1` (the old AoW-distinct-count behavior). Existing generic `getMaxNumberOfTabs` test updated, not duplicated. Reviewer-confirmed the no-pass clause is satisfied.
  - **No-pass clause:** a test fixture where every candidate already has a distinct AoW would pass under both the old and new logic — it proves nothing about this fix. The fixture MUST include at least two same-AoW candidates so the old logic (cap=1) and new logic (cap=2) diverge and the test can actually fail against the old code.
  - [ ] Coverage stays at/above client floor (50/60/60/60) — **unverified**: Implementer ran with `--no-coverage`; Reviewer noted this as a non-gating advisory (change strictly reduces branch count, all real paths covered, only the untested `return 0` fallback is new-and-uncovered).
  - [x] No i18n keys touched (no new user-facing string in this task).

---

### `MHL-T-3` — Fix `validateSelectedOptionOutCome` to disable only true duplicates, not AoW siblings `[x]`

- **Type:** `client`
- **Description:** In `multiple-wps-content.component.ts`, remove the `item.disabledd = true` branch that keys off matching `work_package_id` against another tab's selection. Replace with a narrower check: disable an item only when the exact same `toc_result_id` is already selected in a different tab (true duplicate prevention — a distinct, still-valid rule kept per `design.md` `MHL-DD-2`). Add an accessible reason (tooltip/`aria-label`) on the disabled state distinguishing "already selected elsewhere" from any other disabled reason already present in the template, per `docs/ux-ui/design.md` §10 and requirement `MHL-R-10`.
- **Implements:** `MHL-R-1`, `MHL-R-2`, `MHL-R-10`, `MHL-AC-1`, `MHL-AC-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-theory-of-change/components/shared/toc-initiative-out/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts` (+ its `.html` template for the tooltip/aria-label).
- **Depends on:** `—`
- **Blocks:** `MHL-T-4`
- **Estimate:** `M`
- **Definition of done:**
  - [ ] Code merged via the project commit convention, scope `multiple-wps-content`, ticket `#163059` — **pending: not committed, awaiting explicit user go-ahead per standing instruction.**
  - [x] Lint clean.
  - [x] Unit tests added in `multiple-wps-content.component.spec.ts`: (a) two HLOs sharing an AoW both remain selectable/enabled after one is picked in another tab (`MHL-AC-1`); (b) selecting the same `toc_result_id` in a second tab keeps it disabled everywhere else (duplicate prevention preserved); (c) an item the server already excluded from the candidate list (typology mismatch, simulated via fixture) never appears as a selectable option in the first place (`MHL-AC-2`, proving the client relies on the upstream filter rather than re-implementing it). Reviewer independently confirmed the `toc_result_id` comparison is live (not a silent no-op).
  - **No-pass clause:** if test (a) uses only one AoW with one HLO, it cannot distinguish the old bug (AoW-wide disable) from the fix — the fixture MUST include 2+ HLOs under the same AoW to make the two behaviors diverge. Satisfied.
  - **Presence-assertion caveat:** the accessible-label change (tooltip/`aria-label` text present in the template) is a presence-assertion, not proof that a screen reader announces it correctly or that contrast is adequate — Jest/jsdom cannot evaluate rendered contrast or SR announcement. This is recorded as an explicit gap; the actual accessibility behavior needs a **manual check at PR review** (not automated here). Reviewer independently confirmed the underlying wiring (`disableOptionsText` → `pr-select` `[innerHtml]`, gated on `disabledd`) by reading source, so the presence test's weakness is covered by that independent read, not left unverified.
  - [ ] Coverage stays at/above client floor (50/60/60/60) — **unverified**: no `--coverage` run performed (same disclosed gap as `MHL-T-2`; Reviewer flagged as low-risk advisory, non-gating).
  - [x] i18n keys added under `src/app/internationalization/` if a new tooltip string is introduced — **n/a with reason:** a new string (`"(Already selected in another tab) "`) was introduced but uses the existing non-i18n `disableOptionsText` convention (two pre-existing sibling usages — `change-phase-modal`, `innovation-package-creator` — are also hardcoded strings with no key); `onecgiar-pr-client/src/CLAUDE.md` §11 permits hardcoded structural/non-domain copy. Recorded per Reviewer's bookkeeping note rather than left blank.

---

### `MHL-T-4` — Verify no downstream rollup assumption breaks; close open questions; rollout note `[x]`

- **Type:** `docs`
- **Description:** Read `aow-bilateral.repository.ts`'s usage of `indicatorResultTypeCaseSql` and any `GROUP BY`/`COUNT(DISTINCT ...)` around ToC-indicator rollups to confirm none of them silently assumed at-most-one-HLO-per-AoW-per-result (`MHL-OQ-2`). Record the finding directly in this task's done-criteria checkbox (pass/fail/needs-follow-up-spec) rather than leaving it implicit. Confirm `MHL-OQ-3` (no soft cap, by design per `MHL-DD-2`) and `MHL-OQ-4` (bilateral/`isUnplanned` filter-skip left as a follow-up per `MHL-DD-3`) are recorded as accepted open items, not silently dropped.
- **Implements:** `MHL-OQ-2`, `MHL-OQ-3`, `MHL-OQ-4` (closure or explicit deferral)
- **Files (expected):** none changed unless `MHL-OQ-2` surfaces a real bug — in that case, file it as a new follow-up ticket/spec, do not fold an unrelated rollup fix into this spec's scope.
- **Depends on:** `MHL-T-1`, `MHL-T-2`, `MHL-T-3`
- **Blocks:** `—`
- **Estimate:** `S`
- **Definition of done:**
  - [x] `aow-bilateral.repository.ts` rollup logic read and the `MHL-OQ-2` question answered explicitly — **finding: no-doesn't** for the PMU/AoW progress rollup (per-indicator grouping, no per-AoW/per-result collapse); Reviewer-verified at source. Scope caveat: ~40 other call sites sampled, not exhaustively audited.
  - [x] If `MHL-OQ-2` finds a real assumption break: no break in the rollup. A separate non-rollup singularity (`ResultRepository.getResultsByProgramAndCenters` uses `MAX(...)` over ToC links) is recorded in §10 as a follow-up — **ticket not yet filed (user action); no ticket ID exists.**
  - [x] `docs/specs/changes/multi-hlo-result-linking/requirements.md` §10 updated to mark `MHL-OQ-2/3/4` resolved or explicitly deferred with a dated note (2026-09-18).
  - [x] No secret/token leaked (n/a for a docs-only task).

---

## 4. Dependency graph

```
MHL-T-1 (server guard)      ─┐
MHL-T-2 (client tab cap)     ├─► MHL-T-4 (verify rollups, close OQs)
MHL-T-3 (client disable fix)─┘
```

`MHL-T-1`, `MHL-T-2`, and `MHL-T-3` are independent and parallel-safe (disjoint files: one server, two client). `MHL-T-4` is a verification/closure step that reads the finished behavior of all three, so it runs last.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `MHL-TEST-1` | unit (server) | `MHL-R-4`, `MHL-R-5`, `MHL-AC-3` | `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.spec.ts` |
| `MHL-TEST-2` | unit (client) | `MHL-R-3`, `MHL-AC-5` | `onecgiar-pr-client/.../multiple-wps/multiple-wps.component.spec.ts` |
| `MHL-TEST-3` | unit (client) | `MHL-R-1`, `MHL-R-2`, `MHL-AC-1`, `MHL-AC-2` | `onecgiar-pr-client/.../multiple-wps/components/multiple-wps-content/multiple-wps-content.component.spec.ts` |
| `MHL-TEST-4` | manual (PR review) | `MHL-R-10` (accessible disabled-reason label) | Recorded in PR description — no automated harness for rendered contrast/SR text (see `design.md` §10 defect-class table) |

Server coverage MUST stay above 5/20/35/40; client above 50/60/60/60 (per root `CLAUDE.md`), and this spec is expected to raise both touched files' coverage, not merely hold the floor.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`<emoji> <type>(<scope>) [ticket]: <description>`), ticket `#163059`.
- [ ] CI green (lint, tests, build, `migration:check:ci` — trivially green since no migration exists, SonarCloud).
- [ ] Manual QA on staging/test env: create or open a result, link it to 2+ HLOs under the same AoW with matching typology (should now succeed), attempt to link an HLO with mismatched typology (should stay blocked, both in UI and if testable via a direct API call).
- [ ] Bilateral/platform-report: not applicable — no payload shape change, no consumer notification needed.
- [ ] Telemetry verified post-deploy: confirm the new typology-mismatch rejection log line appears if/when triggered, and that no unexpected spike in 4xx occurs on the `contributors-partners` ToC-save route (would indicate the guard is over-rejecting, e.g. the permissive-fallback decision in `MHL-T-1` wasn't implemented correctly).

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once deployed and manually QA'd.
- [ ] Promote `MHL-DD-1` (reuse `RESULT_TYPE_TO_INDICATOR_PATTERN`) into `docs/trd/trd.md` §11 only if it's judged cross-cutting enough — likely not needed, since it's a reuse of an existing documented pattern, not a new architectural decision.
- [ ] File follow-up specs for `MHL-OQ-3` (soft cap, if later requested) and `MHL-OQ-4` (bilateral/`isUnplanned` filter-skip UX) if/when product prioritizes them — not filed automatically by this spec.
- [ ] Update `docs/prd.md` Open Questions if this ticket resolved any project-level OQ (unlikely — this is module-scoped, not project-scoped).

---

## 8. Roll-back plan

1. Revert the PR(s) covering `MHL-T-1` through `MHL-T-4` (single PR expected given the small LOC budget in `design.md` — confirm PR strategy below).
2. No `migration:revert` needed — no migration was added.
3. No feature flag to disable — this shipped as a direct logic change.
4. Verify bilateral/platform-report payload is unaffected either way (no shape change to compare against).
5. No downstream consumer notification needed on rollback.

---

## PR Strategy Recommendation

Given the estimated LOC budget (~120-180, per `design.md` §"Budget") and the fact that `MHL-T-1..3` are disjoint files with no shared risk, **a single PR is recommended** — splitting server/client here would add review overhead without reducing risk, since none of the three tasks blocks the others and the combined diff is small. Split only if the a11y tooltip work in `MHL-T-3` grows unexpectedly (e.g. a design-system change is needed).

---

## Required cross-references

- `docs/specs/changes/multi-hlo-result-linking/requirements.md` and `design.md` (same folder).
- `docs/prd.md`, `docs/trd/trd.md` (Results / ToC modules).
- No authoritative module doc (`bilateral-result-summaries.en.md`) touched — confirmed no payload change.
