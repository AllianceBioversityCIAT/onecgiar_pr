# Requirements — P2-3960 · Bilateral save alerts tell one consistent truth

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bilateral` (editor) + `shared` (alert service) |
| Ticket | P2-3960 |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Status | draft |
| Source | `proposal.md` (approved 2026-11-23) |
| ID prefix | `BSA-R-n` |

## 2. Executive Summary

The bilateral editor reports save outcomes that contradict each other:
- A failed save from earlier blocks every later section change.
- "Draft saved" appears when nothing was sent.
- Alerts close early, and an exception is thrown on removal.

This spec makes each alert describe only the action that produced it.

## 3. Glossary

| Term | Meaning |
|---|---|
| Stale error | A field in `'error'` whose value is no longer staged, so no later flush can resend it |
| Dispatched set | The status keys a given flush actually sends, captured before the flush |
| Superseded alert | An alert removed because a newer alert was shown |

## 4. System Context & Scope

Current behavior, cited at `fcd441ad1`. The cause is in the proposal §9:
- Navigation checks the whole section for errors (`bilateral-result-creator.component.ts:880`). A stale error blocks it.
- The Save draft copy branches on `hadChanges` (`:1339`).
- The alert timer is fixed at 3000 ms and is never cancelled (`customized-alerts-fe.service.ts:77-80`).
- Removal is unguarded (`customized-alerts-fe.service.ts:86`). The same unguarded removal exists in `customized-alerts-fs.service.ts:39`.

**In scope:** `selectSection()`, the copy branch in `triggerManualSave()`, `CustomizedAlertsFeService.show()`, and the null-guard in `CustomizedAlertsFsService`.

**Out of scope:**
- Retrying or clearing stale errors (`BSF-OQ-1`).
- Making `closeIn` apply its value app-wide (proposal OQ-1, which resolved "no").
- `handleGiFieldSaveRequested()` (proposal OQ-2(a), a follow-up).
- New wording for alert titles (proposal OQ-3, where the current titles stay).
- Overlay click behavior.
- The server.

## 5. Personas

| Persona | Change |
|---|---|
| Result submitter (W3/Bilateral Center user) | Can move between sections after an earlier failure, and save alerts match what actually happened |

## 6. Functional Requirements

### BSA-R-1: Section change is blocked only by its own failure

The system SHALL block a section change, and show "Save failed", only when a field sent by **that** change fails.

#### Scenario: Stale error does not block (reproduction step 3)
- GIVEN General Information has field A in `'error'` and nothing staged
- WHEN the user selects Contributors & Partners
- THEN the editor opens Contributors & Partners
- BUT it must NOT show a "Save failed" alert

#### Scenario: Real failure still blocks
- GIVEN General Information has field B staged
- WHEN the user selects another section and the request for B fails
- THEN the editor stays on General Information
- AND IT MUST show "Save failed" with the server's reason for B's request

### BSA-R-2: "Draft saved" only when something was sent

The Save draft alert SHALL report "Draft saved" or "Success" only when the dispatched set is non-empty and its requests succeeded. Otherwise it SHALL use the existing "Nothing to save yet" or "Up to date" branch, with the same "Still missing" or "Fix before submitting" text.

#### Scenario: Stale error only (reproduction step 4)
- GIVEN General Information has field A in `'error'`, nothing staged, and required fields missing
- WHEN the user presses Save draft
- THEN the alert title is "Nothing to save yet" and it lists the missing fields
- BUT it must NOT read "Draft saved" or "Saved."

#### Scenario: Real save, unchanged
- GIVEN a staged field that saves successfully, with required fields still missing
- WHEN the user presses Save draft
- THEN the alert reads "Draft saved", "Saved. Still missing: …" (current behavior is kept)

### BSA-R-3: An alert is closed only by its own timer or by the user

When `show()` replaces an alert, the replaced alert's pending auto-close SHALL be cancelled. The current 3000 ms close for alerts that pass `closeIn` is kept.

#### Scenario: Same-id replacement (reproduction step 5)
- GIVEN alert #1 with id `X` and `closeIn` set is shown at t=0
- WHEN alert #2 with id `X` is shown at t=2000 ms
- THEN alert #2 is still on screen at t=3500 ms
- AND IT MUST close at t=5000 ms (3000 ms after it was shown)

### BSA-R-4: Alert removal never throws

Removing an alert SHALL NOT throw when the alert's container is already detached. This applies to both `CustomizedAlertsFeService` and `CustomizedAlertsFsService`.

#### Scenario: Detached container
- GIVEN an alert container marked for deletion and already detached from the DOM
- WHEN an `animationend` event reaches its listener
- THEN no exception is thrown

## 7. Non-Functional Requirements

- **Compatibility:** the alert behavior of the other ~70 `alertsFe` consumers is unchanged, apart from BSA-R-3 and BSA-R-4.
- **Coverage:** client thresholds 50/60/60/60 still hold.

### Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong branch or stale check (BSA-R-1, R-2) | Jest specs with deferred save completion: `npx jest bilateral-result-creator --silent` |
| Timer race (BSA-R-3) | Jest with fake timers: `npx jest customized-alerts --silent` |
| Null-deref on removal (BSA-R-4) | Jest dispatches `animationend` on a detached node |
| Template or type error | `npm run build` (the build checks types; Jest does not) |
| Real-browser modal flow and console | No automated check. Substitute: manual repro on prtest at the validate HITL pause (the proposal's §13 steps) |

## 8. Requirement ID Index

| ID | Title | Task |
|---|---|---|
| BSA-R-1 | Section change blocked only by its own failure | T-1 |
| BSA-R-2 | "Draft saved" only when something was sent | T-1 |
| BSA-R-3 | Alert closed only by its own timer or the user | T-2 |
| BSA-R-4 | Alert removal never throws | T-2 |
