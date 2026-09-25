# Design — Off-screen ToC gaps reach the section bottom bar

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3542-section-bar-toc-tabs` |
| Depth | **Lite**, Bug Mode |
| Requirements | [`requirements.md`](./requirements.md) — `SBT-R-1`..`SBT-R-20`, `SBT-AC-1`..`SBT-AC-11` |
| Verified at | `9354317d4` — every citation in the Premise Ledger was run at this SHA |
| Author (session) | On behalf of j.delgado@cgiar.org · 2026-09-25 |
| Gate decisions | `DD-3` wider-than-P25 behaviour **accepted** by the user, 2026-09-25 |
| Reversion challenge (Step 2.3) | **Not triggered** — no design decision removes, disables or inverts shipped behaviour. The change is additive; `RSC-1`'s live pill is a requirement here (`SBT-R-3`), not a casualty |
| Model note | Registry pins T1 → `opus`; session runs Opus 5. No downgrade |

## 2. Executive Summary

The section tells the scan what it owns but does not render. `DataControlService` gains a tiny registry of **gap sources**; the ToC-tab component registers one while it is mounted and drops it on destroy; the existing scan folds the returned labels into the same `fieldFeedbackList` everything already reads. Nothing new is asked of the server, nothing is asked of change detection, and the pill keeps updating as the user types.

Three properties make this the small change: the per-tab truth already exists and is already trusted (it paints the tab icons), the scan already runs on its own cadence, and every consumer keeps reading the one list it reads today.

## 3. Architecture Overview

```
ResultDetailComponent.ngDoCheck  ──throttled 150 ms──▶  runFeedbackScan()
                                                              │
                                        someMandatoryFieldIncompleteResultDetail('.section_container')
                                                              │
                              ┌───────────────────────────────┴───────────────────────────────┐
                              ▼                                                               ▼
                    DOM: `.pr-field.mandatory`                                   offscreenFeedback()   ◀── NEW
                    `.pr-input.mandatory …`                                              │
                    (the RENDERED tab only)                             registered sources, one per
                              │                                         mounted section that has
                              │                                         gaps it does not render
                              └───────────────────────────┬───────────────────────────────────┘
                                                          ▼
                                           fieldFeedbackList  (unchanged, still writable)
                                                          │
                          ┌───────────────────────────────┼───────────────────────────────┐
                          ▼                               ▼                               ▼
              section-bottom-bar pill            popover list + goToField        save-button "N alerts"
                  (SBT-R-1)                          (SBT-R-2)                      (SBT-R-6, IPSR)
```

The union happens in **one** place — inside the scan, after the DOM pass — so no consumer changes and no consumer can be reached by one half of the answer.

## 4. Extended Directory Structure

```
onecgiar-pr-client/src/app/
├── shared/services/
│   ├── data-control.service.ts            MODIFIED  registry + fold into the scan
│   └── data-control.service.spec.ts       MODIFIED  fold / unregister / throwing source
└── pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/
    ├── multiple-wps.component.ts          MODIFIED  registers the publisher, builds the gap list
    └── cpmultiple-wps.component.spec.ts   MODIFIED  the regression suite (SBT-AC-1..8)
```

No new file. No template touched — which is what makes `npx tsc --noEmit` a sufficient compile gate here (`D6`).

## 5. Data Model

None. No entity, no migration, no payload, no stored field.

## 6. API Design

None. No request is added, and no existing request changes shape or frequency.

## 7. Backend Module Design

Out of scope by construction. `validation_contributor_partner_P25` is correct for this symptom and is not touched — see `requirements.md` §3.

## 8. Frontend Component Architecture

### 8.1 `DataControlService` — the gap-source registry

A set of functions, each returning the labels a mounted section knows are missing off screen. Read by the scan on its own cadence; the service neither schedules nor caches. Three guarantees it must carry:

| Guarantee | Why |
|---|---|
| `fieldFeedbackList` stays a **writable** signal, and the union is written into it | `save-button.contract.cy.ts:190-211` calls `.set([...])` on it (`P-8`). A `computed` breaks those contracts silently, and CT has no CI job |
| The off-screen labels are appended **after** the DOM pass and **outside** its `try`/`catch` | A DOM error must not swallow them, and a throwing source must not swallow the DOM gaps (`SBT-AC-10`) |
| The count is added to `mandatoryFieldsTotal` as well as to the list | Otherwise the ring's numerator and denominator disagree and it can read "6 of 5" |

The registration contract is explicit and one-sided: **the publisher owns the removal.** A source that outlives its section reports its gaps against the next one (`SBT-R-4`).

### 8.2 `CPMultipleWPsComponent` — the publisher

Registers on init, unregisters on destroy, and answers from the array it already holds.

**Which tabs it reports** — every tab except the one currently rendered, because the rendered tab is already counted by the DOM scan and counting it twice inflates the tally (`SBT-AC-2`). The exception is the 50 ms window in which `onActiveTab` has set `showMultipleWPsContent` to `false` to remount the form: during it the active tab is off screen too, and skipping it there is what used to let the bar flash green mid tab-switch (`SBT-AC-4`).

**Which instances speak** — see `DD-2`. The gate is `!isContributor && !isNotifications && !hidden && !isUnplanned`.

**What a tab's gap is called** — the first thing missing, in the order the form asks for it: `Level`, then the ToC node (`Outcome`/`Output`), then `Contribution to indicator target`, prefixed with the tab's own title (`Outcome N~2: …`). One entry per incomplete tab, not one per field: the popover is a list a person reads, and a tab with three empty fields is one place to go.

## 9. Shared Contracts

`DataControlService`'s public surface grows by two methods and its `fieldFeedbackList` semantics widen from "what the DOM is missing" to "what the section is missing". Every existing reader benefits from the widening and none needs a change — the `consumer` row `P-8` enumerates them.

## 10. Design Decisions

### `SBT-DD-1` — The section publishes its gaps; the bar does not go back to the green check

- **Decision:** add a gap-source registry read by the existing scan.
- **Why:** it is the only option that satisfies both tickets. Returning `isComplete` to `currentSectionIsDone()` (the original P2-3542 fix) would fix the disagreement but re-break `RSC-1`'s live pill, since the green check only refreshes on save — and would be the second revert of the same line in three weeks. Rendering every tab hidden was rejected outright: `multiple-wps-content` issues per-tab HTTP (`getIndicatorsList`) and writes into the bound rows, so mounting N of them multiplies requests and re-opens the child-mutation bug class the unsaved-changes spec hit five or more times (`rd-contributors-and-partners/CLAUDE.md`).
- **Trade-off accepted:** the client can still be greener than the server on a rule it has never heard of, converging on the next save. This is `RSC-1`'s own accepted trade-off, unchanged (`requirements.md` §7, *Correctness*).

### `SBT-DD-2` — The gate is `isContributor` / `isNotifications` / `hidden` / `isUnplanned`, **not** `isIpsr` and **not** `isCP2026()`

- **Decision:** an instance speaks when `!isContributor && !isNotifications && !hidden && !isUnplanned`.
- **Why, per exclusion, each binding read at `9354317d4` (`P-3`):**

  | Instance | Binding that decides it | Speaks? |
  |---|---|---|
  | `rd-contributors-and-partners.component.html:69` (submitter) | `isContributor:false, isNotifications:false, hidden:∅` | **yes** — the ticket |
  | `ipsr-contributors.component.html:21` (submitter) | `isIpsr:**true**, isContributor:false, isNotifications:false` | **yes** — `SBT-R-6` |
  | `…:493` / `ipsr-contributors…:196` (contributor mirrors) | `isContributor:true` | no — `SBT-R-5` |
  | `share-request-modal.component.html:64` | `isNotifications:**true**` | no |
  | `notification-item.component.html:353` | `hidden:**true**` (its `isNotifications` is `false`) | no |
  | `result-review-drawer.component.html:265,539` | `hidden:**true**` | no |

- **Two corrections to the proposal's sketch, both found by reading the bindings rather than assuming them:**
  1. **`isIpsr` must not be in the gate.** IPSR's editable instance binds `[isIpsr]="true"`, so gating on it would have silently excluded the surface the user just put in scope — the same class of failure this whole ticket is about.
  2. **`isNotifications` does not exclude the notifications dialog.** `notification-item` binds `isNotifications:false` and `hidden:true`; `share-request-modal` binds the opposite. Both exclusions are needed, and neither is the one its name suggests.
- **Consequence — `SBT-OQ-1` resolves itself.** The share-request modal was carried as an open question; its `[isNotifications]="true"` binding excludes it with no extra code. Recorded, not assumed.

### `SBT-DD-3` — Per-tab truth is delegated to `completnessStatusValidation`, so no phase gate is needed

- **Decision:** the publisher calls the component's existing `completnessStatusValidation(tab)` unchanged and adds no phase branch of its own.
- **Why:** that function is what paints each tab's red/green check icon today, so the UI already trusts it, and it branches on `isCP2026()` **internally** (`multiple-wps.component.ts:206`). Delegating gives the 2026 contribution rule for free and, before 2026, falls back to the Level + ToC-node pair — which is a genuine mandatory pair, not a weaker one. It also removes `isCP2026()`'s IPSR behaviour from the load-bearing path entirely, which is why `P-6` is a `Low`-impact premise instead of a blocker.
- **✅ Accepted consequence (user, 2026-09-25):** a **2025** result in Result Detail with 2+ ToC tabs will now also report an off-screen `Level` / `Outcome` gap. That is outside the ticket's P25 framing, and it was put to the user at the design approval gate with the alternative (add `isCP2026()` to `DD-2`'s gate, one extra term, `P-6` back to blocking for IPSR). **The user accepted the wider behaviour.** It is the more truthful of the two — it agrees with the red tab icon already on screen — and a bar that contradicts an icon six inches away is the same defect in a different phase.
- **What this closes:** `isCP2026()` is now definitively off the load-bearing path. `P-6` is moot and stays `UNVERIFIED` with no owner to settle it — nothing in this spec depends on it.

### `SBT-DD-4` — One entry per incomplete tab, named but not jumpable

- **Decision:** `Outcome N~2: Contribution to indicator target`, one row per tab, no jump button.
- **Why:** `canGoToField` already returns `false` for a label with no `data-pr-feedback` node and the template already renders those rows without the button — the degradation exists and needs no new code (`SBT-R-20`). Switching to the tab on click is a genuine improvement and is **deliberately not** in this spec: it is a feature on a bugfix.
- **Checked against the e2e that pins these rows (`P-9`):** `save-validation.cy.ts:85-88` asserts each row is non-empty and does not end in `is missing`. A prefixed label passes both. Its third test reads labels with `.includes(...)`, which a prefixed row also satisfies, and it deliberately asserts one label's presence rather than the total.

## 11. Premise Ledger

**Count:** 9 rows — **8 verified**, **1 `UNVERIFIED`** (`Low` impact: 0 `High`, 1 `Low`). The one open row (`P-6`) was made **moot** by the user's acceptance of `DD-3` on 2026-09-25 and carries no owner.
**Blast-radius triggers:** all three fire. The design names a user action and branch points (`live-path`, `P-2`), changes a signal more than one component reads (`shared-state`, `P-7`), and changes an exported service surface and the semantics of a read contract (`consumer`, `P-8`, `P-9`).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | The pill decides from the DOM scan alone — no server signal reaches it | `location` | `section-bottom-bar.component.ts:220` (`isComplete = computed(() => this.missingFields().length === 0)`), `:126` (`missingFields` ← `fieldFeedbackList`) | `9354317d4` | The root cause is elsewhere and the whole spec is wrong — **High** | verified |
| `P-2` | The reproduction reaches that line: `ngDoCheck` → throttled rAF → scan → `fieldFeedbackList` → `missingFields` → `isComplete` → the pill. Branch points: the route is a result-detail section (`result-detail.component.ts:297` scans `.section_container`, vs `.local_container` at `result-creator.component.ts:423` and `.report_container` at `report-result-form.component.ts:494`); the section renders `.section_container` (`multiple-wps.component.html:5`) | `live-path` | `result-detail.component.ts:265` → `:274/:280` → `:286` → `:297`; `data-control.service.ts:256`, `:34`; `section-bottom-bar.component.ts:126`, `:220`; `section-bottom-bar.component.html:60` | `9354317d4` | The patched code is not what the user reaches; the root cause reopens — **High** | verified |
| `P-3` | Only the active tab is in the DOM: one `[activeTab]` is passed to one `<app-multiple-wps-content>` | `existence` | `multiple-wps.component.html:41` (element), `:43` (`[activeTab]="activeTab"`) | `9354317d4` | The scan could see the other tabs and `DD-1` is unnecessary — **High** | verified |
| `P-4` | `completnessStatusValidation(tab)` answers per-tab completeness for every tab including the 2026 contribution rule, and is what paints the tab icons | `existence` | `multiple-wps.component.ts:199-213`; consumed at `multiple-wps.component.html:12` (the tab's `check_circle` class) | `9354317d4` | The publisher has no trustworthy source and `DD-3` collapses — **High** | verified |
| `P-5` | The six other `app-cp-multiple-wps` instances are excluded by `isContributor` / `isNotifications` / `hidden`, and IPSR's editable one binds `isIpsr:true` | `existence` | Bindings read per instance: `rd-contributors-and-partners.component.html:69,493`; `ipsr-contributors.component.html:21,196`; `share-request-modal.component.html:64` (`isNotifications:true`); `notification-item.component.html:353` (`hidden:true`); `result-review-drawer.component.html:265,539` (`hidden:true`) | `9354317d4` | `DD-2`'s gate is wrong in either direction — a surface goes silent, or a mirror drags the bar red — **High** | verified |
| `P-6` | `isCP2026()` reads `currentResultSignal()?.phase_year`, and IPSR populates that key with the Innovation Package's phase | `data-env` | `fields-manager.service.ts:56-59`, `:71-74`, `:80`. IPSR side: `step-n4.component.ts:69,86` reads it and its docstring calls it *"the phase of the Innovation Package"* — a **reader**, not the writer; no write path on the IPSR route was traced | `9354317d4` | Nothing in this design — `DD-3`, as accepted, keeps `isCP2026()` off the load-bearing path entirely — **Low** | `UNVERIFIED — confirm at source before relying on it` · Settled by: **n/a — moot.** `DD-3` was accepted at the 2026-09-25 gate, so no decision, task or scope item rests on this claim. Kept as a row rather than deleted, so a future spec that does gate on `isCP2026()` in IPSR finds the open question already written |
| `P-7` | Every reader of `fieldFeedbackList`, each with its mechanism: `section-bottom-bar.component.ts:126` (pill `:220`, ring `:133-134`, popover, `goToField :339`); `save-button.component.html:29` (panel `*ngIf`), `:36` (`*ngFor` rows), `:47` (the "N alerts" count). Drivers that call the scan: `result-detail.component.ts:297`, `innovation-package-detail.component.ts:99`, `innovation-package-creator.component.ts:211`, `result-creator.component.ts:423`, `report-result-form.component.ts:494` | `shared-state` | `grep -rn "fieldFeedbackList" src/ cypress/` from `onecgiar-pr-client/` → 57 hits outside the service; `grep -rn "someMandatoryFieldIncompleteResultDetail(" src/app/pages/` → the 5 drivers above | `9354317d4` | A reader is reached by a half-answer, or the result creator's differently-scoped scans pick up a source they should not — **High** | verified |
| `P-8` | `fieldFeedbackList` must stay writable: an external consumer calls `.set()` on it | `consumer` | `save-button.contract.cy.ts:190,198,208,211` — `patchService(DataControlService, (dc: any) => dc.fieldFeedbackList.set([...]))` | `9354317d4` | Turning it into a `computed` breaks four CT assertions with **no CI job to catch it** — **High** | verified |
| `P-9` | One E2E suite pins the bar's rows, and a prefixed label does not break it | `consumer` | `grep -rln "fieldFeedbackList" src/ cypress/` surfaced `cypress/e2e/result-detail/save-validation.cy.ts` — a file a `src/`-only search misses. Read: `:85-88` asserts each row is non-empty and does not match `/is missing$/`; `:70-79` asserts `rows.length === count` on **General information**, which has no ToC tabs; `:126-200` asserts one label via `.includes(...)`, explicitly *"the label, not the total"* | `9354317d4` | The E2E breaks on a suite CI does not run, discovered by a person weeks later — **High** | verified |

**Hand-off:** `P-7`, `P-8` and `P-9` are copied into T1's and T2's `Consumers` fields. `P-6` needs no owner — `DD-3` was accepted, so it is moot (see its row). The other rows act through their *If false* cell.

## 12. Budget (Step 2.4)

| | Expected |
|---|---|
| Tasks | **3** |
| LOC | **~150** (≈55 production, ≈95 test) |
| Review rounds | **1** |

Matches **Lite**. `/akili-execute` trips on any of the three and escalates rather than continuing.
