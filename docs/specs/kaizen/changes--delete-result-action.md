# Kaizen Entry — changes/delete-result-action

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/delete-result-action` · Prefix `DEL` |
| Date | 2026-09-11 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `gated` |
| Outcome | 4/4 tasks PASS; 1 QA remediation round; Delete action live across SP Results and My Results |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 planned | tasks.md |
| Reviewer FAIL rework attempts | 0 during initial task execution; 1 post-task QA remediation cycle | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| Judgment-day severe findings | n/a (standard gated review) | — |
| PRODUCT_BUGs | 2 caught in user QA (table refresh out-of-zone, card menu visibility) | execution.md |
| Validation FAIL / WARN | 0 unresolved | execution.md |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | 0 | — |
| Budget | 4 tasks / ~350 LOC → 4 tasks / ~420 LOC (within budget) | tasks.md, execution.md |
| Runtime failures | 0 | — |

## Lessons

- **KZ-changes--delete-result-action-1 — Native DOM event callbacks injected outside Angular's component tree must be wrapped in `NgZone.run()` to trigger change detection in `OnPush` components.** (Product + Methodology, High)
  - Root cause (5W1H): `CustomizedAlertsFeService.show()` injects modal HTML directly into `<app-root>` and registers click listeners via `element.addEventListener('click', ...)`. Because native listeners execute outside Angular's zone, asynchronous HTTP calls and signal mutations initiated inside the callback execute outside `NgZone`. `OnPush` components like `ProgrammeResultsComponent` do not schedule a change detection pass, causing deleted items to persist visually until a browser refresh.
  - Evidence: `CustomizedAlertsFeService.ts:73`, `ResultDeletionService.ts:128`, user report: "cuando elimine la tabla de results no se refresco entonces tuve que hacer refres de la pagina".
  - Standardization: → P1 (client source-tree guide note on third-party / DOM alert service callbacks).

- **KZ-changes--delete-result-action-2 — Template permissions and action visibility derived from plain shell objects must be reactive `computed()` signals tracking version signals.** (Product, Medium)
  - Root cause (5W1H): In `MyWorkCardComponent`, `deleteEligibility` was initially a plain method called from the template. When the board mounted before `DataControlService.getCurrentPhases()` returned, `reportingCurrentPhase.portfolioAcronym` was `null`, returning `visible: false`. Because `reportingCurrentPhase` is a plain mutable object and the card uses `ChangeDetectionStrategy.OnPush`, when the phase loaded and bumped `reportingPhaseVersion`, the card had no signal dependency and did not re-evaluate the menu item.
  - Evidence: `my-work-card.component.ts:140`, `result-deletion.service.ts:35`, user report: "tampoco vi la opcion de delete en My results".
  - Standardization: → P2 (client source-tree guide note on consuming `DataControlService.reportingPhaseVersion()`).

## Noted, not a lesson

- **Reusability of `ResultDeletionService` across disparate components:** Centralizing the deletion logic, RBAC matrix (Admin + Roles 3, 4, 5), QAed lockout, and confirmation dialogs in a single domain service prevented code divergence between `results-list`, `programme-results`, and `my-work-card`.
- **Full test coverage verification:** Automated Jest coverage (11 suites, 406 tests) ran cleanly and gave immediate regression confidence when refining `NgZone` and computed signals.

## Pending Items

### P1

```yaml
ID: P1
Spec: changes/delete-result-action
Kind: guide-sync
Target: onecgiar-pr-client/src/AGENTS.md
Section: ## Common Pitfalls & Reactive Architecture
Severity: high
Status: pending
Content: |
  - **Native DOM alert callbacks and NgZone**: Services injecting raw DOM dialogs (e.g. `CustomizedAlertsFeService`) attach native `addEventListener` listeners that execute outside Angular's zone. Any HTTP request, signal mutation, or reload triggered from these callbacks must be wrapped in `this.zone.run(() => { ... })` to ensure `OnPush` components schedule change detection.
```

### P2

```yaml
ID: P2
Spec: changes/delete-result-action
Kind: guide-sync
Target: onecgiar-pr-client/src/AGENTS.md
Section: ## Common Pitfalls & Reactive Architecture
Severity: medium
Status: pending
Content: |
  - **Plain objects vs signals in DataControlService**: `reportingCurrentPhase` is a plain mutable object, not a signal. In `OnPush` components, any `computed()` or template expression reading phase properties must register a dependency on `dataControlSE.reportingPhaseVersion()` so view updates fire when `getCurrentPhases()` resolves.
```
