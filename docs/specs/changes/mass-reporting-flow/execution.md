# Execution Log — `changes/mass-reporting-flow`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/mass-reporting-flow/` (judgment.md APPROVED — 8 severe clusters fixed pre-execution) |
| Approval Mode | pre-approved (owner "apruebo y YOLO", 2026-08-29) — HALT/Pivot/tripwire still stop |
| Owner constraints | ≤1 Reviewer round/task (2nd FAIL escalates); targeted jest only; client lint `npx ng lint --quiet`; no Cypress; full-suite coverage stays CI's gate |
| Leader | Claude Fable 5 · Implementer akili-implementer (sonnet) · Reviewer akili-reviewer (opus) |
| Budget | 8 tasks · ~1 050 non-test LOC · tripwire 1 500 (re-baselined per judgment B-W10) |
| Branch | `qa-development-2026` worktree. Never stage unrelated `pages/bilateral/*` changes from other sessions. |
| Started | 2026-08-29 |

## 2. Task Execution History

### `MRF-T-1` — Pure burn-down helpers + zero-target rule

- **Date:** 2026-08-29 · Implementer sonnet (effort medium) · Reviewer opus · Skills: `angular-developer`, `tdd`
- **Attempt 1** — Files: `dashboard-lab/reporting-burndown.{ts,spec.ts}` (new, 6 pure helpers), `dashboard-lab.component.ts` (`buildAowBannerStats` signature + delegation + additive `zeroTarget`), `dashboard-lab.hub.spec.ts` (fixture pinned to MRF-DD-5 values). Verification: 25/25 targeted tests, lint clean, dev build OK.
- Reviewer verdict: **PASS** — predicate/coercion/stability/wrap/precedence all verified statically; Overview surfaces untouched; disqualifier honoured.
- ADVISORY carried forward: (a) achieved-without-target is `in-progress` forever (matches shipped convention; T-4's Next-pending will re-offer it — accepted); (b) **Leader decision:** remaining-work sort must rank zero-target KPIs LAST when Only-pending is off (T-2 owns it); (c) `nextPendingAfter`/`countNewlyReported` key on raw `indicator_id` — feed per-AoW lists only (T-4 brief); (d) MRF-AC-6's cross-surface identity assertion becomes testable at T-5's `ratioOf` rewire — explicit T-5 deliverable.
- **Final:** PASS · attempts 1 · gate auto-approved (pre-approved mode).

### `MRF-T-6` — AI narrative: migration + typing + admin card

- **Date:** 2026-08-29 · Implementer sonnet (effort medium → high) · Reviewer opus · Skills: `angular-developer`, `nestjs-expert`
- **Attempt 1** — Files: server migration `1787850000000-MRFSeedAiNarrativeParameters.ts` (category by SELECT, unprefixed names, prompt with the 3 placeholders, reversible down); client `global-variables.service.ts` typing, `results-api.service.ts` `PUT_updateGlobalVariable`, `admin-section/pages/ai-narrative/*` (card + 9 tests), route before the `**` catch-all. Verification: server `tsc --noEmit` clean; placeholder grep 3; 9/9; lint + dev build OK.
- Reviewer verdict: **FAIL** — (1) no `adminModuleLinks` sidebar entry (page unreachable except by URL) — violates MRF-R-11 / T-6(c); (2) missing `[editable]="true"` / `[isStatic]="true"` on the custom-fields controls (they vanish under `RolesService.readOnly`, which defaults true and stays true for admins under platform closure) + the spec never rendered the template (`detectChanges` absent) — violates client CLAUDE.md §5. Verified clean otherwise (migration contract exact; unique index makes re-runs loud; specs assert args).
- ADVISORY: forkJoin partial-failure toast should name the failed parameter (folded into attempt 2); `PUT_updateAdminKPConfidenceLevel` duplicate → follow-up to delegate; migration failure modes loud by construction (informational).

**Attempt 2** (effort high)
- Files: `reporting-nav-sidebar.component.ts` (+`adminModuleLinks` entry, `lucideSparkles` already registered), `ai-narrative.component.html` (`[editable]`/`[isStatic]`), `.ts` (per-parameter subscriptions with named error toasts; per-success store patch; pending counter clears isLoading in next+error), `.spec.ts` (CustomFieldsModule import + rendering test with readOnly=true → `.choice`×2 + `textarea`).
- Verification: server tsc clean; 10/10; lint clean; dev build OK.
- Reviewer verdict (scoped): **PASS** — both bindings verified against the control templates' exact gates; rendering test reds if either binding is removed; one-PUT-per-changed-parameter and `'1'/'0'` strings intact.
- ADVISORY (pre-existing, recorded): the success patch reads the current field value, not the sent one — bounded by the disabled Save during isLoading; no action.

**Final:** PASS · attempts 2 · covers MRF-R-10/11/11.1, MRF-AC-10 (unit), AC-11 owed to T-8's manual round-trip · gate auto-approved (pre-approved mode).

### `MRF-T-2` — Band controls + filtered/sorted pipelines

- **Date:** 2026-08-29 · Implementer sonnet (effort high) · Reviewer opus · Skills: `angular-developer`, `tdd`
- **Attempt 1** — Files: `reporting-burndown.{ts,spec.ts}` (+`zeroTargetLast` option per Leader decision), band `{ts,html,spec.ts}` (controls inside `showToolbar`, outside `compactFilters`), `dashboard-lab.component.{ts,html}` (`onlyPending`/`burndownSort` + `pr.burndown.*` storage; `applyBurndownFilterAndSort`; `reportingGroupsForTable` layered so `bandPlannedResultsCount`/`overviewXcutProgress` stay unfiltered; `plannedByAowSections` filtered), `dashboard-lab.hub.spec.ts` (+16). Verification: 5 suites / 171 green (table pinned suite untouched), lint, dev build.
- Reviewer verdict: **FAIL** — two silent-default-change leaks with the toggle OFF: (1) `count` overwritten unconditionally (breaks the deliberate pre-Category `count` when Category filter active); (2) By-AOW `kpis` moves under search (was pre-search `filtered.length`). Remediations prescribed. Verified accurate: the `ratioOf` transitional state is real/confined/recorded → stands as the T-5 handoff.
- ADVISORY: "Indicators" browse mode renders the controls inert (pre-existing pattern; T-8 checklist row); **Leader adoption:** T-5 will read the unfiltered set from a `__allIndicators` side-channel written by `applyBurndownFilterAndSort` (folded into attempt 2); MRF spec block sits inside the REH describe (comment added).

**Attempt 2** (effort high)
- Files: `dashboard-lab.component.ts` (`count: onlyPending ? sorted.length : g.count`; `kpis` toggled between pre-search `filtered.length` and post-filter sum; `__allIndicators` written only under Only-pending), `dashboard-lab.hub.spec.ts` (+7 behavioural tests with invariant-violating fixtures).
- Verification: 5 suites / 178 green (table pinned suite untouched); lint; dev build.
- Reviewer verdict (scoped): **PASS** — both fixes at the right seam; **truth for T-5 pinned by the Reviewer: `__allIndicators` is POST-Category / PRE-Only-pending — the exact set `ratioOf` reads today; read it as `group.__allIndicators ?? group.indicators`, and the table needs a local cast (the intersection type is erased at the `computed<ReportingAowGroup[]>` binding).**
- ADVISORY → folded into T-5's brief: clarify/rename the side-channel comment (Section/Type/Category baked in; Only-pending not) + tighten the `applyBurndownFilterAndSort` docstring line.

**Final:** PASS · attempts 2 · covers MRF-R-1, MRF-R-2, MRF-AC-1, MRF-AC-2 · gate auto-approved (pre-approved mode). Commit deferred to land jointly with MRF-T-3 (shared `dashboard-lab.component.{ts,html}` hunks).

### `MRF-T-3` — Copy link + `?kpi=` restore + Read more

- **Date:** 2026-08-29 · Implementer sonnet (effort high) · Reviewer opus · Skills: `angular-developer`, `tdd`
- **Attempt 1** — Files: `dashboard-lab.component.{ts,html}` (`kpiLink`/`copyKpiLink` CDK Clipboard + toast; `pendingKpi` in the three read sites; restore effect scoped to the owning AoW; highlight + param strip; Read more), `reporting-aow-table.component.{ts,html}` (menu Copy link, additive), new `dashboard-lab.mrf-kpi-link.spec.ts` (12). Verification: 4 suites / 120 green; lint; dev build.
- Reviewer verdict: **FAIL** — (1) bucket-sentinel rows (Intermediate/2030) emit `tocAow=<sentinel>` → restore lands on `list[0]` (wrong AoW; possible wrong-KPI highlight) — remediate by empty link + disabled menu item for sentinels; (2) `reporting-aow-table/CLAUDE.md` not updated in the same change (outputs list + menu-items sentence + Verified stamp) — client CLAUDE.md §10; (3) "Read more toggles the clamp class" untestable in this harness (templates nulled) and unrecorded — record gap + T-8 row.
- Core verified sound: param spread, absolute URL (`origin` + `serializeUrl` + `<base href="/">`), per-AoW dedupe, no mirror/strip ping-pong, cold-load survival real (loading true in the same flush).
- ADVISORY folded into attempt 2: unconditional signal reads in the restore effect (dependency-set truncation) + always-run highlight clear. Recorded, not folded: `needsKpiReadMore` width-blind heuristic (matches `needsShowMore` precedent — T-8 row); `pendingPlannedAow` stays non-null on no-match (pre-existing).

**Attempt 2** (effort high; first worker lost to a provider session limit — replacement audited the partial diff and completed)
- Files: `dashboard-lab.component.ts` (sentinel guard in `kpiLink`; unconditional signal reads in the restore effect; highlight clear always scheduled), `reporting-aow-table.component.{ts,html}` (`canCopyLink` + disabled/aria-disabled/title on both menu items; local `COPY_LINK_UNSUPPORTED_AOW_CODES` duplicated to avoid a value-import cycle), `reporting-aow-table/CLAUDE.md` (outputs, menu items, sentinel rule, Verified re-stamped), `dashboard-lab.mrf-kpi-link.spec.ts` (+`it.each` sentinels).
- Verification: 4 suites / 129 green; lint; dev build.
- Reviewer verdict (scoped): **PASS** — duplicated constants adjudicated acceptable (fail-safe: worst case an inert menu item, never a wrong link; documented at both ends).
- **Recorded gap:** `[class.line-clamp-2]` Read-more binding untestable in jsdom (all dashboard-lab suites null the template) → T-8 manual row. Follow-up candidate: extract `reporting-toc-codes.ts` (host, table and `programme-results` each hold the two codes).

**Final:** PASS · attempts 2 · covers MRF-R-5, MRF-R-5.1, MRF-AC-4 (unit; scroll/highlight visuals + clamp → T-8) · gate auto-approved (pre-approved mode).
