# Module Spec — Mass Reporting Flow — Tasks

> Approval Mode: **pre-approved**. Owner rules: max **1** Reviewer round per task (2nd FAIL escalates), targeted jest only (`npx jest <path>`), client lint = `npx ng lint --quiet`, no Cypress. Budget: design §14 (8 tasks · ~1 050 non-test LOC · tripwire 1 500).

## 1. Scope

- **Module:** `results` / `mass-reporting-flow` · **Linked:** `requirements.md` + `design.md` · **Status:** `in-progress` (T-1..T-7 done, T-8 blocked on auth+DB)
- ⚠️ Worktree note: unrelated uncommitted changes may exist under `pages/bilateral/` (other sessions) — never stage them.

## 2. Pre-flight

- ✅ requirements/design approved (auto, pre-approved mode, 2026-08-29); OQs closed; judgment-day pending (runs before execution).
- ✅ No conflicting in-flight spec on `dashboard-lab` (reporting-entry-hub archived).
- ✅ Migration seed only; task gate `npx tsc --noEmit` (check goes red by construction until run — see MRF-AC-11).

## 3. Task list

### `MRF-T-1` — Pure burn-down helpers + zero-target rule centralisation

- **Status:** `[x]` · **Type:** `client` · **Estimate:** M · **Depends on:** — · **Blocks:** T-2, T-3, T-4, T-5
- **Description:** New `dashboard-lab/reporting-burndown.ts` exporting `applyZeroTargetRule`, `pendingOf`, `sortRemainingFirst`, `groupPendingCount`, `nextPendingAfter`, `countNewlyReported` (design §6 row 1). Rewire `buildAowBannerStats` — **signature change**: its parameter type gains `target_value_sum` (all call sites updated) — to delegate the zero-target rule; edit `dashboard-lab.hub.spec.ts`'s existing fixture to the intended new values stated in MRF-DD-5 (`{total:2, done:2, pct:100, zeroTarget:2}`). `pendingOf` operates on `applyZeroTargetRule(inds).counted` (visible == counted — MRF-R-1/R-7 precedence) — pinned by a fixture where a zero-target KPI would otherwise stay visible. Scope: Reporting-tab surfaces only (Overview keeps today's rule — do NOT touch `overviewAowProgress`/`overviewXcutProgress`/toc-map).
- **Implements:** MRF-R-2 (order core), MRF-R-7, MRF-AC-6 (incl. **AND IT MUST** identical everywhere).
- **Skills:** `angular-developer`, `tdd`.
- **Tests (`MRF-TEST-1`):** fixtures: zero-target mix (3 of 10) → denominators 7 + `zeroTarget: 3`; achieved-without-target still counts; `sortRemainingFirst` with a fixture where catalogue order differs per state; `nextPendingAfter` wraps correctly and returns null when none; `countNewlyReported` diffs by id on achieved increase only. String-typed numeric fixtures (`'2'`) included (KZ-OPF-1 class).
- **Verification:** `cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.hub.spec.ts --no-coverage` green; `npx ng lint --quiet` clean.
  - *Fail input:* counting zero-target in the denominator → the 7-denominator assertion reds; sorting lexically by state name → order fixture reds.
  - *Disqualifier:* helper tests that reuse the same value for target and achieved cannot distinguish the rules — fixtures must vary them.
- **DoD:** helpers pure (no Angular imports); existing suites touched stay green; `@akili-spec` marker; commit `✨ feat(dashboard-lab): burn-down helpers with centralised zero-target rule`.

### `MRF-T-2` — Band controls + filtered/sorted pipelines in both views

- **Status:** `[x]` · **Type:** `client` · **Estimate:** M · **Depends on:** T-1 · **Blocks:** T-4
- **Description:** Band: `Only pending` toggle + `Sort: Catalogue|Remaining` segmented (new inputs/outputs, visible in both modes, style per shipped recipes). Dashboard-lab: `onlyPending`/`burndownSort` persisted as two scalar keys `pr.burndown.onlyPending`/`pr.burndown.sort` (setItem/getItem in try/catch); thread through `plannedByAowSections` AND `reportingGroups` so both views filter/hide/sort via T-1 helpers; visible counts recompute; groups with zero visible KPIs hidden while filtering.
- **Implements:** MRF-R-1 (incl. **BUT** in-progress visible), MRF-R-2, MRF-AC-1, MRF-AC-2 (incl. catalogue restore).
- **Skills:** `angular-developer`, `tdd`.
- **Tests (`MRF-TEST-2`):** band emits + persists; sections/groups fixture: toggle hides completes and empty groups, counts adjust; sort switch reorders and back-restores exact original order (deep-equal against the untouched fixture); sessionStorage stub round-trip; storage throwing → defaults, no error.
- **Verification:** targeted jest on band + dashboard-lab specs green; `npx ng lint --quiet`.
  - *Fail input:* hiding in-progress KPIs → MRF-AC-1 BUT assertion reds; restoring sorted (not original) order on switch-back → deep-equal reds.
  - *Disqualifier:* asserting only lengths after filtering proves hiding, not WHICH cards — assert ids.
- **DoD:** grouped-table pinned tests green; commit `✨ feat(reporting): only-pending filter and burn-down sort across reporting views`.

### `MRF-T-3` — Copy link + `?kpi=` restore

- **Status:** `[x]` · **Type:** `client` · **Estimate:** M · **Depends on:** T-1 · **Blocks:** T-7
- **Description:** Copy-link icon on By-AOW cards and grouped-table rows using **CDK `@angular/cdk/clipboard`** (repo precedent `pdf-export.service.ts`); the copied URL carries the composite `tocView=byAow&tocAow=<owning __aowCode>&kpi=<indicator_id>` (id NOT unique across AoWs; grouped rows emit their own `__aowCode`). Restore beside the existing `tocAow` restore: `?kpi=` sets `pendingKpi`, which SURVIVES until the owning ToC resolves (cold-load/new-tab path through `pendingPlannedAow`), then expand/scroll/highlight (outline class + `scrollIntoView`, reduced-motion aware) and consume the param. Plus **Read more** on the By-AOW cards toggling the description clamp in place (MRF-R-5.1).
- **Implements:** MRF-R-5, MRF-AC-4.
- **Skills:** `angular-developer`, `tdd`.
- **Tests (`MRF-TEST-3`):** copy builds the exact composite URL (`tocView`/`tocAow`/`kpi` all present, other params preserved); restore with a COLD-LOAD ordering fixture (param arrives before the ToC — `pendingKpi` survives and fires after load); same `indicator_id` in two AoWs resolves to the `tocAow` one; unknown id → silent no-op; param cleanup asserted; Read more toggles the clamp class.
- **Verification:** targeted jest green; lint clean. Scroll behaviour itself is jsdom-blind → manual checklist (T-8).
  - *Fail input:* dropping existing query params when appending `kpi=` → URL assertion reds.
  - *Disqualifier:* asserting `scrollIntoView` was called on a stubbed element proves invocation, not visibility — visibility stays manual.
- **DoD:** commit `✨ feat(reporting): per-KPI copy link and ?kpi= deep-link restore`.

### `MRF-T-4` — Next pending + session counter (modal-close refresh)

- **Status:** `[x]` · **Type:** `client` · **Estimate:** M · **Depends on:** T-2 · **Blocks:** T-7
- **Description:** Dashboard-lab: record `lastReportKpiId` AND the reported row's own `__aowCode` in `openLegacyReportModal`; effect on `entityAowService.showReportResultModal` true→false ⇒ force-refresh `loadToc(program, <that captured AoW>)` — `force` skips BOTH early-out guards (`tocByKey.has` and `loadingTocKeys.has`) WITHOUT deleting the cache entry (overwrite on arrival; deleting flips the view to its skeleton); `sessionReported` += `countNewlyReported(prev, next)`; the last-reported card shows **Next pending** → scroll+highlight next per active filter/sort (`nextPendingAfter`), or an "all done" note when none. Counter rendered in the By-AOW banner + grouped header pill.
- **Implements:** MRF-R-3, MRF-R-3.1, MRF-R-4, MRF-AC-3 (incl. **BUT** none-remaining note).
- **Skills:** `angular-developer`, `tdd`.
- **Tests (`MRF-TEST-4`):** modal false-edge triggers exactly one forced reload for the active key (cache bypass asserted — the cached value must NOT be served); achieved delta increments counter (and non-delta does not); Next-pending resolves per filter+sort fixture; none-remaining renders the note.
- **Verification:** targeted jest green; lint clean.
  - *Fail input:* `loadToc` serving `tocByKey` cache despite `force` → the reload assertion reds; counting a re-save with unchanged achieved → counter assertion reds.
  - *Disqualifier:* faking the delta by mutating the same array reference proves nothing — fixtures must be distinct snapshots.
- **DoD:** commit `✨ feat(reporting): next-pending flow and session counter on modal close`.

### `MRF-T-5` — Grouped AoW header tiles (stat coherence)

- **Status:** `[x]` · **Type:** `client` · **Estimate:** S · **Depends on:** T-1 · **Blocks:** T-7
- **Description:** Rewire the table's EXISTING `ratioOf()` (already rendering `x of y` + % in the AoW header) to delegate to the shared T-1 helper — no second chip, no new markup beyond the zero-target `title`. The ratio stays over the UNFILTERED set (pinned contract kept). Pinned tests **expected to change where the new denominator changes values**: the `describe('AoW ratio')` cases and the header-content case (`'1 of 1'`) — update their expected numbers; the "unfiltered under search" and "no divide-by-zero" cases stay green unchanged.
- **Implements:** MRF-R-6, MRF-AC-5, MRF-AC-6 (tile surface).
- **Skills:** `angular-developer`.
- **Tests (`MRF-TEST-5`):** one shared fixture through `buildAowBannerStats` and `ratioOf` yields identical numbers incl. a zero-target KPI (coherence assertion); the unfiltered-under-search pinned case still green; updated ratio cases assert the NEW expected values explicitly.
- **Verification:** targeted jest on `reporting-aow-table` + its existing spec; lint.
  - *Fail input:* recomputing inside the table with a divergent rule → coherence assertion reds.
  - *Disqualifier:* presence of the chip ≠ correct numbers — assert values.
- **DoD:** commit `✨ feat(reporting-aow-table): reported x/y tiles on AoW headers`.

### `MRF-T-6` — AI narrative: migration + typing + admin card

- **Status:** `[x]` · **Type:** `db+client` · **Estimate:** M · **Depends on:** — (parallel-safe vs T-1..T-5) · **Blocks:** T-7
- **Description:** (a) Server migration `<ts>-MRF-seed-ai-narrative-parameters.ts` per design §3 — category via `(SELECT id FROM global_parameter_categories WHERE name='platform_global_variables')`, names UNPREFIXED, default prompt MUST contain `{{aow}} {{stats}} {{hlos}}`; reversible `down()` deleting exactly the two names. (b) `GlobalVariables` typing + (c) admin card `admin-section/pages/ai-narrative/` (toggle + textarea + Save → generic `PUT_updateGlobalVariable({name, value})`, flag as `'1'/'0'` strings; local `globalVariablesSE.get` updated in place; route + menu entry per the `knowledge-products` pattern, **inserted BEFORE the `**` catch-all** in `adminModuleRouting`).
- **Implements:** MRF-R-10, MRF-R-11, MRF-R-11.1, MRF-AC-10, MRF-AC-11.
- **Skills:** `angular-developer`, `nestjs-expert` (migration).
- **Tests (`MRF-TEST-6`):** admin card spec (`admin-section/pages/ai-narrative/ai-narrative.component.spec.ts`) — Save issues one PUT per changed parameter with exact `{name, value}` ('1'/'0' for the flag), store updated without reload; migration gate = `npx tsc --noEmit` (server) + Reviewer read of `down()` — adding the file makes `migration:check` red by construction until run, so check is NOT this task's gate; the run/revert round-trip is T-8's manual row on a disposable local DB.
- **Verification:** `cd onecgiar-pr-server && npx tsc --noEmit`; `cd onecgiar-pr-client && npx jest src/app/pages/admin-section/pages/ai-narrative --no-coverage` + `npx ng lint --quiet`.
  - *Fail input:* PUT called with a boolean instead of `'1'/'0'` string → args assertion reds (the entity's `value` is text).
  - *Disqualifier:* asserting "PUT was called" without args is not evidence.
- **DoD:** commit `✨ feat(admin): AI narrative global parameters (seed migration + admin card)`.

### `MRF-T-7` — Narrative panel on the By-AOW banner

- **Status:** `[x]` · **Type:** `client` · **Estimate:** L · **Depends on:** T-3, T-4, T-5, T-6 · **Blocks:** T-8
- **Description:** `NarrativePanelComponent` per design §6: engine via `inject(ASSISTANT_ENGINE)` + `DeviceCapabilityService`; own state enum `idle·checking·needs-optin·downloading·generating·ready·error·unsupported` (sources per MRF-R-9.2); **in-panel consent step owns the model download** (`init(tier, onProgress)` only after the user accepts — MRF-R-9.4); completion via `complete(messages, {narrative:string} schema)` + `JSON.parse`, unparseable ⇒ error state; facts from `plannedAowBanner()` + `plannedByAowSections()`; prompt interpolation text-only; caption, Copy (CDK Clipboard), Regenerate (interrupt-first), collapsible "Data used" (MRF-R-12); labelled region + `aria-live` on completion; banner button **absent from the DOM** when EITHER gate (`environment.aiAssistant.enabled`, `ai_narrative_enabled`) is off; `interrupt()` on AoW switch/close/destroy.
- **Implements:** MRF-R-8, MRF-R-9, MRF-R-9.1, MRF-R-9.2, MRF-R-9.3, MRF-R-12, MRF-AC-7, MRF-AC-8 (incl. **BUT** no persistence), MRF-AC-9.
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`.
- **Tests (`MRF-TEST-7`):** mock engine (DI override): each gate off independently → no control in DOM; cold cache → consent step shown and `init` NOT called until accepted, then progress → generate; ready → parsed `{narrative}` text + exact caption + Copy + "Data used" holds the fed facts; unparseable completion → error state, raw JSON never rendered; error/unsupported states; Regenerate calls `interrupt()` before a new `complete()`; AoW switch mid-generation → `interrupt()` (supersede); **no API-service method invoked during generate** (spy, zero calls); destroy → `interrupt()`; region labelled + `aria-live` present.
  - *Fail input:* rendering the prompt via `innerHTML` → the text-only assertion (template with `<b>` renders literally) reds; persisting output anywhere → the zero-API-call spy reds.
  - *Disqualifier:* narrative TEXT quality is untestable (accepted risk, requirements §8) — a test asserting specific prose is meaningless and must not exist.
- **Verification:** targeted jest on `narrative-panel` + dashboard-lab specs; `npx ng lint --quiet`; `npx ng build --configuration development` (template type-check).
- **DoD:** commit `✨ feat(dashboard-lab): admin-managed AI narrative panel on the By-AOW banner`.

### `MRF-T-8` — Verification: manual pass + execution record

- **Status:** `[~]` (blocked: human-authenticated session + disposable DB — checklist in execution.md) · **Type:** `tests` · **Estimate:** S · **Depends on:** T-3, T-4, T-5, T-7
- **Description:** On a running stack with a logged-in session: burn-down round (filter+sort+report+next-pending+counter); `?kpi=` link shared to a new tab (expand/scroll/highlight); grouped ratio = banner numbers; admin card round-trip (flag off → button gone; prompt edit reflected on next generate); real WebLLM generation on a capable device incl. consent/download step and Regenerate/interrupt; **migration run/revert round-trip on a disposable local DB** (rows appear in `platform_global_variables` category, revert removes exactly them — per MRF-AC-11); keyboard/focus pass on all new controls + panel `aria-live`; reduced-motion check. Record PASS/FAIL/NOT-RUN + screenshots in `execution.md` — NOT-RUN is never passed. Full-suite coverage remains CI's gate (owner rule: no full client runs here — accepted risk).
- **Implements:** the jsdom-blind halves (requirements §8 manual rows).
- **DoD:** checklist recorded; FAILs become fixes or accepted gaps.

## 4. Dependency graph

```
MRF-T-1 ──► T-2 ──► T-4 ─┐            MRF-T-6 (parallel-safe) ─┐
   ├──────► T-3 ─────────┼─────────────────────────────────────┼─► T-7 ──► T-8
   └──────► T-5 ─────────┘                                     ┘
```
No cycles. Wave plan: T-1 ∥ T-6 → T-2/T-3/T-5 → T-4 → T-7 → T-8.

## 5. Test plan

| ID | Type | Covers | Location |
|---|---|---|---|
| MRF-TEST-1 | unit client (pure) | R-2 core, R-7, AC-6 | `…/dashboard-lab/reporting-burndown.spec.ts` |
| MRF-TEST-2 | unit client | R-1, R-2, AC-1, AC-2 | band + dashboard-lab specs |
| MRF-TEST-3 | unit client | R-5, AC-4 | dashboard-lab spec |
| MRF-TEST-4 | unit client | R-3, R-3.1, R-4, AC-3 | dashboard-lab spec |
| MRF-TEST-5 | unit client | R-6, AC-5, AC-6 | `reporting-aow-table` spec |
| MRF-TEST-6 | unit client + migration:check | R-10, R-11, R-11.1, AC-10, AC-11 | admin card spec + server check |
| MRF-TEST-7 | unit client (mock engine) | R-8, R-9.x, R-12, AC-7/8/9 | `narrative-panel` spec |
| MRF-MANUAL-1 | manual | scroll/highlight, real generation, admin round-trip, responsive | execution.md |

Clause closure: AC-1 BUT + AND IT MUST (T-2/T-1), AC-3 BUT (T-4), AC-4 BUT (T-3), AC-6 AND IT MUST (T-1+T-5), AC-8 BUT + AND IT MUST (T-7). R-13 (MAY) unowned.

## 7. Cleanup & follow-ups

After ship: spec → `shipped`; follow-ups from design §13 + Overview-tab zero-target unification + `last_updated_by` actor audit on global parameters.

## 8. Roll-back plan

1. Revert the PR(s). 2. `npm run migration:revert` on affected envs (removes the two parameter rows). 3. Flag default-off means the AI surface was dark unless an admin enabled it — no data to clean (nothing persisted).

## 6. Rollout / rollback

Single PR acceptable at the edge; if split: PR1 = T-1..T-5 (burn-down), PR2 = T-6+T-7 (AI). Rollback: revert + `migration:revert`; flag default-off ships the AI dark.

## Required cross-references

`requirements.md`, `design.md`, `proposal.md` · `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`, `docs/infrastructure.md` §6.
