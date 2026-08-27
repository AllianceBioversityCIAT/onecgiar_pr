# Module Spec — `tasks.md`

Linked: `requirements.md` (`RES-R-1`, `RES-R-2`, `RES-R-3`, `RES-R-10`, `RES-AC-1`..`RES-AC-4`) + `design.md` (`RES-DD-1`, `RES-DD-2`, §6.2, §10).

## 1. Scope of this task list

- **Module / feature:** `results/intermediate-outcome-aow-visibility/target-tooltip`
- **Sprint / target phase:** none
- **Owner / driver:** santiago.sanchez@cgiar.org
- **Status:** complete — both `RES-T-1` and `RES-T-2` code + Reviewer PASS + commit + manual browser check done (2026-08-27).

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user selected "Continue" after review).
- [x] `design.md` approved (user selected "Continue" after review).
- [x] Open questions resolved: `RES-OQ-1` defaults to plain string (recorded, not blocking).
- [x] No CLARISA dependency.
- [x] No conflicting in-flight spec — sibling `aow-selector` touches different files (`lab-report-form`, server), confirmed via `family.md`.
- [x] No migration involved — `migration:check` not applicable.

## 3. Task list

### `RES-T-1` — Add the "not exclusive to that AoW" tooltip to Intermediate Outcome Target cells `[x]`

- **Type:** `client`
- **Description:** In `reporting-aow-table.component.ts`, add a computed/pure helper `isIntermediateRow(bucketKind: string): boolean` (`=== 'intermediate'`) and a readonly tooltip string constant (e.g. `intermediateTargetTooltip = 'This target is not exclusive to that AoW.'`). In `reporting-aow-table.component.html`, extend the single `*ngTemplateOutlet="indicatorRow; context: { $implicit: row, showAow: false }"` call (line ~408) to also pass `bucketKind: group.kind`, add `let bucketKind = "bucketKind"` to the `#indicatorRow` template's parameter list (alongside the existing `let-row let-showAow="showAow"`), and bind `[prTooltip]="isIntermediateRow(bucketKind) ? intermediateTargetTooltip : ''"` on the Target `<button>` (the same element that already emits `openTarget`, ~line 494–503) — mirroring the existing `[prTooltip]="achievedTooltip(row)"` pattern one cell over.
- **Implements:** `RES-R-1`, `RES-R-2`, `RES-R-10`, `RES-AC-1`, `RES-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts` (new tests)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` (re-stamp `Verified:` line, per that folder's own doc convention)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S`
- **Skills:** `angular-developer` (per root `CLAUDE.md` Skill Map — component/template work in `onecgiar-pr-client`).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`🎨 style(reporting-aow-table): Add "not exclusive to that AoW" tooltip on Intermediate Outcome targets`).
  - [ ] `npx ng lint --quiet` clean (no new warnings on the touched files).
  - [ ] Unit tests added to `reporting-aow-table.component.spec.ts`:
    - `isIntermediateRow('intermediate')` → `true`; `isIntermediateRow('aow')` → `false`; `isIntermediateRow('2030-outcomes')` → `false`.
    - Compiled-template assertion: for a row rendered with `bucketKind: 'intermediate'`, the Target button's `prTooltip`-bound attribute/input equals `intermediateTargetTooltip`'s exact string; for a row rendered with `bucketKind: 'aow'`, it equals `''`.
    - **What this proves / does not prove:** this is a **presence-assertion** — it proves the correct string reaches the `prTooltip` input, not that a real tooltip visually renders on hover in a browser (jsdom does not lay out `prTooltip`'s overlay). **Keyboard-only reachability is no longer a requirement of this task** — `RES-R-10` was superseded 2026-08-26 once `pr-tooltip.directive.ts` was checked and found to have no focus/blur handling at all (hover/click only), for `achievedTooltip` too. See `execution.md` Pivot Record.
    - **Disqualifier:** if the test asserts only that `prTooltip` is *truthy* (not the *exact* string) it does not distinguish this tooltip from `achievedTooltip` leaking onto the wrong cell — a copy-paste bug where the Target cell accidentally binds `achievedTooltip(row)` instead of the new helper would still pass a "truthy" check. The test MUST assert the exact string value.
  - [x] **Manual browser check (required — the class of defect a jsdom unit test cannot see):** run `npm start`, open the Reporting tab for a program with Intermediate Outcomes and at least one AoW with HLO/Outcome indicators (e.g. `SP02`), confirm by **mouse hover only** (Tab-focus is no longer expected to trigger the tooltip — see above):
    - Intermediate outcomes card → tooltip shows the exact copy on hover. **Confirmed 2026-08-27 by the user.**
    - An AoW card → no tooltip on Target (existing `achievedTooltip` on the Achieved cell one column over is unaffected — confirm it still shows, to catch an accidental copy-paste onto the wrong cell). **Confirmed 2026-08-27 by the user — no leak, Achieved tooltip unaffected.**
    - **Disqualifying input for this check:** if the tooltip also appears on an AoW card's Target cell, or does not appear at all on an Intermediate row after a hard refresh (confirm you're not viewing a stale `ng serve` bundle per the client `CLAUDE.md` "Verifying in a REAL browser" §9 trap #2), the task is NOT done — do not mark this box checked on a partial or ambiguous observation. **None of these disqualifiers observed.**
  - [ ] `reporting-aow-table/CLAUDE.md` `Verified:` line re-stamped with today's date, branch, and commit short-hash, per that folder's own convention (checked: the file already carries this stamp format).
  - [ ] No secret/token leaked (not applicable — no logging touched, listed for template completeness).
  - [ ] No i18n key added — `RES-OQ-1` accepted the plain-string default; not a gap, a recorded decision.

### `RES-T-2` — Show the tooltip on AoW-card Outcomes rows that are also Intermediate Outcomes `[x]` *(added 2026-08-26, scope amendment; mechanism revised same day after live-data verification)*

- **Type:** `client`
- **Description:** Implement `RES-DD-2` (verified mechanism, not the superseded `indicator_id`-matching first draft). In `dashboard-lab.component.ts`'s `indicatorsByAow()` → `fromTier` helper (~line 1408-1420): the mapping already destructures each `g` (a `tocResultsOutcomes` group) but drops its `is_aow` field — add one stamp, for the `'outcome'` tier only: `__isIntermediateCrosscut: tier === 'outcome' && g?.is_aow !== true`. In `reporting-aow-table.component.ts`: add `__isIntermediateCrosscut?: boolean;` to `ReportingIndicator`; add `isCrossCuttingIntermediate(row: ReportingIndicator): boolean { return !!row?.__isIntermediateCrosscut; }`. In `reporting-aow-table.component.html`: widen the Target button's binding (from `RES-T-1`) to `[prTooltip]="(isIntermediateRow(bucketKind) || isCrossCuttingIntermediate(row)) ? intermediateTargetTooltip : ''"`. **No `reportingGroups()` reorder, no id Set, no second endpoint** — this reads a field already present in the payload `indicatorsByAow()` already fetches.
- **Implements:** `RES-R-3`, `RES-AC-3`, `RES-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts` (one-line stamp addition in `fromTier`)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts` (new tests)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts` if it exists (check first — new tests for the `fromTier` stamp), else document why it was skipped
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` (re-stamp `Verified:`)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` (re-stamp `Verified:`)
- **Depends on:** `RES-T-1` (shares the `isIntermediateRow`/`intermediateTargetTooltip` helpers it adds)
- **Blocks:** `—`
- **Estimate:** `S`/`M` (two components, but the mechanism itself is now a one-field stamp of already-fetched data — smaller than the original amendment estimate)
- **Skills:** `angular-developer`.
- **Definition of done:**
  - [x] **Live-data verification — DONE 2026-08-26, in `execution.md`.** Confirmed via `curl` (program `SP02`, AoWs `SP02-AOW01`..`04`; program `SP01`, `SP01-AOW01`) that every outcome group's `is_aow` field is present and `false` for cross-cutting outcomes in current test data. No AoW-exclusive (`is_aow: true`) example exists live today — cover that branch with a synthetic/mocked test case, not a live fixture.
  - [ ] Code merged via the project commit convention (`🔧 fix(reporting-aow-table, dashboard-lab): Show cross-cutting Intermediate Outcome tooltip inside AoW cards`) — `fix` (not `feat`) since this corrects `RES-T-1`'s original AoW-card exclusion once the actual UI requirement was clarified.
  - [ ] `npx ng lint --quiet` clean.
  - [ ] Unit tests per `design.md` §10: `isCrossCuttingIntermediate` true/false cases; `fromTier`/`indicatorsByAow()` stamping assertions (`is_aow: false` outcome-tier row → `__isIntermediateCrosscut: true`; `is_aow: true` outcome-tier row → `false`, **synthetic case, no live fixture exists** — mock the group); HLO/output-tier row → `__isIntermediateCrosscut` always `undefined`/`false` regardless of `is_aow`; render-level `prTooltip` assertion for a crosscutting AoW-card row vs. `''` for a non-crosscutting one.
  - [x] **Manual browser check (required):** run `npm start`, open `SP02`'s Reporting tab, expand any AoW card's Outcomes band — every row there is currently cross-cutting in this test program, so confirm by hover: the Target tooltip shows on those rows; the Intermediate Outcomes card's own row for the same indicator still shows it too (`RES-T-1` regression guard); an HLO/output-tier row (if any exist for this program) does NOT show it. If/when a program with a genuine AoW-exclusive outcome becomes available, spot-check that row does NOT show the tooltip — not blocking for this task if no such program exists yet, but note the gap in `execution.md` if so. **Confirmed 2026-08-27 by the user: cross-cutting AoW-card rows show the tooltip, HLO/output rows don't. No genuinely AoW-exclusive (`is_aow: true`) live program was available to spot-check the negative case — recorded gap, not blocking (per `execution.md` §"Live-Data Verification" residual note).**
  - [ ] `reporting-aow-table/CLAUDE.md` and `dashboard-lab/CLAUDE.md` `Verified:` lines re-stamped.
  - [ ] No secret/token leaked — the live-data verification used a user-provided JWT via `curl`; confirm no token value appears in any commit, log, or spec file (checked already in `execution.md`, re-verify at commit time).
  - [ ] No i18n key added (same `RES-OQ-1` default).

## 4. Dependency graph

```
RES-T-1  (shipped 2026-08-26 — code + Reviewer PASS, awaiting user's manual check)
   │
   └── RES-T-2  (added 2026-08-26 — depends on RES-T-1's helpers; not started)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RES-TEST-1` | unit (client) | `RES-R-1`, `RES-R-2` | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.spec.ts` |
| `RES-TEST-2` | manual browser check | `RES-R-1`, `RES-R-2`, `RES-AC-1`, `RES-AC-2` | Reporting tab, `SP02` (or any program with both Intermediate Outcomes and at least one AoW card) — see Definition of Done above; this is the substitute for the defect class (real tooltip rendering on hover) that `Jest`/jsdom structurally cannot evaluate. `RES-R-10` (keyboard reachability) is superseded — no longer covered here (see `execution.md` Pivot Record). |
| `RES-TEST-3` *(added 2026-08-26)* | unit (client) | `RES-R-3` | `dashboard-lab.component.spec.ts` (stamping logic) + `reporting-aow-table.component.spec.ts` (`isCrossCuttingIntermediate` + render assertion) |
| `RES-TEST-4` *(added 2026-08-26)* | manual browser check | `RES-R-3`, `RES-AC-3`, `RES-AC-4` | See `RES-T-2` Definition of Done. |

Client coverage stays within the existing 50/60/60/60 thresholds — this addition is too small to move the needle either way.

**Defect classes this task can produce, and what catches each:**

| Defect class | Caught by |
|---|---|
| Wrong/missing tooltip string bound | `RES-TEST-1` (exact-string assertion) |
| Tooltip leaks onto the wrong bucket (AoW/2030) | `RES-TEST-1` (asserts `''` for non-intermediate `bucketKind`) + `RES-TEST-2` manual check |
| `bucketKind` never reaches the template (context wiring silently dropped) | `RES-TEST-1` fails, since the helper would receive `undefined` and `isIntermediateRow(undefined)` is `false` for every row, including intermediate ones — this is exactly the failure mode `RES-TEST-1`'s "intermediate → true" assertion exists to catch |
| Tooltip bound but not actually visible/reachable in a real browser (jsdom blind spot) | `RES-TEST-2` (manual check) — **accepted, substituted risk**, not automatable in this stack |
| Cross-cutting stamp leaks onto an AoW card's HLO/output-tier rows | `RES-TEST-3` (asserts `__isIntermediateCrosscut` never `true` for `__tier !== 'outcome'`) |
| `is_aow: true` (genuine AoW-exclusive outcome) branch never actually exercised because no live fixture has one | `RES-TEST-3`'s synthetic/mocked test case (see `RES-T-2` DoD) — accepted, since no live data demonstrates this branch as of 2026-08-26 |

## 6. Rollout & verification

- [ ] PR opened with the commit message convention (`RES-T-1` and `RES-T-2` may ship as one PR or two — Leader's call at execute time; both are same-spec, low-risk client changes).
- [ ] CI green (lint, Jest, build) — no `migration:check:ci` involved.
- [ ] Manual QA on staging per `RES-TEST-2` and `RES-TEST-4` above.
- [ ] No bilateral/platform-report payload touched — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] No telemetry involved.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after both `RES-T-1` and `RES-T-2` merge.
- [ ] No new cross-cutting decision to promote — this stays local to `reporting-aow-table` + `dashboard-lab`.
- [ ] Follow-up (not filed as a task here, per `design.md` §13 Open Gaps): extending the same tooltip to the `flat` ("All indicators") table, if requested later.
- [ ] Follow-up (not filed as a task here, per Pivot Record in `execution.md`): app-wide keyboard reachability for `PrTooltipDirective` — candidate for a separate `/akili-propose`.
- [ ] `docs/prd.md` has no Open Question this resolves.

## 8. Roll-back plan

1. Revert the `RES-T-1` and/or `RES-T-2` PR(s) independently — they are separable (`RES-T-2` depends on `RES-T-1`'s helpers, not vice versa; reverting `RES-T-1` alone would break `RES-T-2`'s build, so revert order is `RES-T-2` first if only one needs reverting).
2. No migration to revert.
3. No feature flag involved.
4. No payload shape to verify (no bilateral/platform-report impact) — `RES-T-2`'s `__isIntermediateCrosscut` is a client-only computed stamp, never sent to the server.
5. No downstream consumer to notify.

## Required cross-references

- `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/requirements.md`, `design.md` (same folder).
- `docs/prd.md` (G2), `docs/ux-ui/design.md` §10, `docs/trd/trd.md` (not applicable).
