# Proposal — P2-3960 · Bilateral editor: contradictory save alerts between sections

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3960-bilateral-save-alert-consistency` |
| Slug | `p2-3960-bilateral-save-alert-consistency`, derived from the Jira URL argument (the URL is not a slug) |
| Ticket | [P2-3960](https://cgiarmel.atlassian.net/browse/P2-3960) (Bug, Medium, Open). QA retest comment 43970 (2026-10-16) reproduces it |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Jira ticket + QA retest comment, read through the Atlassian MCP |
| Visual source | None. The ticket has no attachments and no Figma link |
| Branch at proposal | `qa-development-2026-ss` |
| Date | 2026-11-23 |
| Depends on | none |
| Parallel-safe | yes. Client only, with no migration and no API contract change |

## 2. Intent

When the user saves a bilateral result, the alert must say one true thing: the data was saved, nothing changed, required fields are still missing, or the save really failed. That message must not change just because the user moved to another section and came back.

## 3. Problem / Current Behavior

The reported flow is a W3/Bilateral **Capacity Sharing** result in the bilateral editor (`/bilateral/:center/result/:id`). The fault is **not** specific to Capacity Sharing. It sits in the shared editor and in the shared alert service.

| # | Observed behavior | Mechanism (cited) |
|---|---|---|
| P-1 | One failed save on General Information leaves the section stuck. After that, **every** move to another section shows "Save failed" and the user cannot leave | `selectSection()` checks errors for the **whole section** (`hasErrorFor(current)`, `bilateral-result-creator.component.ts:880`). A field in `'error'` counts as pending (`bilateral-auto-save.service.ts:306,315`), but its value was already removed from `_pendingFields` (`:255`). Nothing can retry it, so the error stays and blocks every move |
| P-2 | After the user comes back and presses Save draft, the alert says **"Draft saved"** even though no request was sent | `hadChanges = hasPendingFor(...)` (`:1286`) is true only because of the stale `'error'`. `flushTargets` is `[]`, so `hasErrorForFields([])` is false, and the copy branch reports a save that never happened (`:1339-1355`) |
| P-3 | "Nothing to save yet" and "Draft saved" appear for the same incomplete state (QA comment, steps 1-2) | The copy depends on `hadChanges`, not on whether anything was actually sent (`:1339-1352`). This is the same signal error that BSP-T-1 already fixed for `savedTick` (`:1321-1326`) but left in the copy |
| P-4 | The same alert sometimes closes by itself and sometimes waits for "Ok" (QA comment, step 3) | `CustomizedAlertsFeService.show()` ignores the `closeIn` value and always uses `3000` ms (`customized-alerts-fe.service.ts:77-80`). The timer is never cancelled when a newer alert replaces the current one, and `closeAction(id)` looks the alert up by **id**. A stale timer from alert N therefore closes alert N+1, which uses the same id `bilateralManualSave` |
| P-5 | `TypeError: Cannot read properties of null (reading 'removeChild')` in the console on every replacement (QA comment, step 4) | `alert.parentNode.removeChild(alert)` without a null guard (`customized-alerts-fe.service.ts:86`). This is the only unguarded `removeChild` on this path (`grep removeChild src/app` → `:86` and the sibling `customized-alerts-fs.service.ts:39`). Which exact pair of `animationend` events causes it is `UNVERIFIED — confirm at source before relying on it` (owner: Implementer, with a regression test that triggers two `animationend` events on a detached node) |

## 4. Proposed Outcome

- Moving between sections never shows "Save failed" for a save that this move did not send.
- Save draft says "Draft saved" only when a request was actually sent and succeeded. In every other case it uses one consistent "nothing new to save" wording, with the same "Still missing: …" list.
- An alert stays on screen for its full time and is closed only by its own timer or by the user.
- The `removeChild` exception no longer appears in the console.

## 5. Scope

| In | Files |
|---|---|
| Limit the failure check in `selectSection()` to the keys this move actually sends (`pendingStatusKeysFor` captured before `flush`, then `hasErrorForFields` / `lastErrorMessageForFields`), the same way BSF-T-2 does for Save draft | `bilateral-result-creator.component.ts` |
| Choose the Save draft copy from `flushTargets.length > 0`, not from `hadChanges` | same |
| `show()`: cancel the timer of the alert being replaced, and make the `animationend` removal null-safe | `shared/services/customized-alerts-fe.service.ts` |
| Regression tests, which fail before the fix and pass after it | `bilateral-result-creator.component.spec.ts`, `customized-alerts-fe.service.spec.ts`, `customized-alerts-fs.service.spec.ts` |
| Folder doc | `bilateral-result-creator/CLAUDE.md` (*Save draft tells the truth* invariant, plus the `Verified:` stamp) |

## 6. Non-Goals

- Auto-retrying or clearing a field that is stuck in `'error'` (`BSF-OQ-1`, deferred on purpose in the archived spec `2026-10-15-bugfix--bilateral-save-draft-footer`).
- Changing what `closeIn` means for the whole app. See OQ-1.
- The overlay of the modal alert catching a click on the left rail (QA step 5). Modal behavior is by design: clicking the overlay closes the alert.
- Redesigning the alert, for example replacing it with a toast.
- `handleGiFieldSaveRequested()` (`:1098-1101`), which uses the same section-wide check. It is listed under Siblings and is in scope only if OQ-2 says so.
- Any server change.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Result submitter (W3/Bilateral Center users) | Primary. All result types in the bilateral editor, not only Capacity Sharing |
| `CustomizedAlertsFeService` | Shared by about 70 non-spec files (`grep -rl alertsFe…`). The timer and null-guard fix affects all of them, but only to remove early closes and the exception |
| Related specs | `archive/2026-10-15-bugfix--bilateral-save-draft-footer` (BSF-T-2, the same fix applied to the Save draft path) · `archive/2026-10-15-bugfix--bilateral-save-pill-not-clearing` (BSP-T-1) · `archive/2026-09-22-bugfix--bilateral-section-autosave-on-navigate` (BIL-T-2, where `selectSection` started saving on navigation) |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: the existing alert modal is reused. Only its wording and timing change, so no mockup is needed.

## 9. Bug Diagnosis

### Observed Symptom
Saving General Information and then moving to Contributors & Partners shows a "Save failed" modal. Coming back and pressing Save shows a different message. The alerts disagree with each other, and some close early or log a console exception.

### Reproduction Steps
1. Open a bilateral result in Editing status (prtest, for example IRRI / R-A-2013-126, result #9848 that QA left there).
2. On General Information, make an edit that the server rejects. The 400 "At least one field must be provided" from an emptied title is the case documented in `bilateral-auto-save.service.ts:343-345`. Press **Save draft** → "Save failed — … Still missing: …". The user reads this as a validation message.
3. Click **Contributors & Partners** in the rail → "Save failed" again, and the user stays on General Information (P-1).
4. Press **Save draft** without editing → "Draft saved — Saved. Still missing: …", but no request is sent (P-2).
5. Press Save draft quickly two or three times → an alert closes by itself early, and the console logs `TypeError … removeChild` (P-4, P-5).
- Expected: one honest message per action, and moving between sections is not blocked by an earlier failure that it did not cause.
- What first made the GI save fail in the reporter's run is `UNVERIFIED — confirm at source before relying on it` (owner: Implementer, to capture on prtest with the Network tab). The stuck state that follows happens with **any** 4xx/5xx or network failure on a GI field, so the fix does not depend on that first trigger.

### Root Cause (confirmed)
Three independent defects together produce the "inconsistent messages":

1. **A stale `'error'` is read as a failure of the current move** (P-1, P-2). BSF-T-2 limited the Save draft failure check to what that save actually sent, but explicitly left `selectSection()` on the section-wide `hasErrorFor` (comment at `bilateral-auto-save.service.ts:394-396`). A failed field cannot be retried, because its value was removed by `flush()` at `:255`. It therefore blocks every later move and makes `hadChanges` true even when nothing is pending.
2. **The copy branch reads `hadChanges` instead of what was actually sent** (P-2, P-3). Code: `bilateral-result-creator.component.ts:1339`.
3. **Alert timers are not tied to the alert they belong to, and removal is not null-safe** (P-4, P-5). Code: `customized-alerts-fe.service.ts:77-80,86`. The P2-3030 fix (`5157f90e1`) removes the old DOM node but does not cancel the old timer.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -i --grep="P2-3960"` → no hits. `git log --all -- …/customized-alerts-fe.service.ts` → last change `5157f90e1` (P2-3030, which is in HEAD). `git diff --stat HEAD origin/{staging,master,performance-refactor} -- customized-alerts-fe.service.ts bilateral-result-creator.component.ts` → no difference on any branch | **Not fixed.** Continue |
| **Live path?** | Rail click → `selectSection(section)` (`:871`) → `hasPendingFor(current)` true from `'error'` (`auto-save :313-316`) → `flush` sends nothing → `waitForSectionSave(current)` returns at once on `hasErrorFor` (`:1388`) → `hasErrorFor(current)` (`:880`) → `alertsFe.show('bilateralManualSave', 'Save failed')` (`:883`) → `return` before `openSectionName.set` (`:900`). Save draft → `triggerManualSave()` (`:1280`) → `:1339` → `alertsFe.show` (`customized-alerts-fe.service.ts:23`) → `:77-80` timer and `:82-88` removal | **On the path.** All three defects sit on the code the reproduction runs through |
| **Siblings on the same state** | (a) `handleGiFieldSaveRequested()` uses `hasErrorFor('general-info')` (`bilateral-result-creator.component.ts:1100`): the same stale error can mark a successful drawer save as failed. (b) `CustomizedAlertsFsService` has the same unguarded `alert.parentNode.removeChild` (`customized-alerts-fs.service.ts:39`). (c) The P22/P25 result-detail editor does not use this auto-save service (`grep hasErrorFor` gives bilateral only), so it is not affected | (a) and (b) are reported. Whether they are in scope is OQ-2 |
| **Downstream consumers** | `alertsFe.show` is used by about 70 non-spec files, and `closeIn` is passed at 58 call sites. Today all of them close after 3 s no matter which value they pass. Tests: `customized-alerts-fe.service.spec.ts:100-125` (closeIn timer), `bilateral-result-creator.component.spec.ts:979-1050` (Save draft copy) | Cancelling the timer and adding the null guard keep current timing for every consumer, apart from removing the early-close bug. Making `closeIn` actually apply would change timing at 58 call sites, so it is held back as OQ-1 |

- Data integrity: no data loss is introduced, and no server write changes. The fix only stops a past failure from being reported as a new one. The trade-off already accepted in `BSF-OQ-1` (a field that fails and is never edited again becomes less visible) now also applies to navigation.
- Security: none.

### Fix Strategy
The smallest safe fix is the three code changes listed in §5. It is logic, not cosmetic, so the route is **`/akili-specify` (Lite) in Bug Mode**, with regression tests that fail first:
1. `selectSection`: a stale `'error'` on field A does not block a move, and a real failure of the field being sent still blocks with the server reason.
2. `triggerManualSave`: with only a stale `'error'` and nothing staged, the alert is not "Draft saved".
3. `show()` twice with the same id → the first alert's timer does not close the second.
4. `animationend` on a node that is already detached → no throw.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Targeted fix (recommended)** | The three defects only: limit `selectSection` to what it sends, base the copy on `flushTargets`, and cancel the timer plus add the null guard in the alert service | Smallest diff. Follows the BSF-T-2 / BSP-T-1 pattern exactly. Global alert timing stays the same |
| B. A + clear or retry stuck `'error'` fields | Also make a stuck field visible and retryable | Fixes `BSF-OQ-1` too, but it is a larger behavior change that was rejected in the archived design (alternatives 1 and 2) |
| C. Replace save modals with a toast or inline status | A UX redesign of save feedback | Removes overlay and modal issues, but it is a design change that needs a UX spec, so it is out of scope for a Medium bug |

## 11. Recommended Approach

**Option A.** It removes every contradiction in the ticket and in the QA retest with the fewest changed lines. It reuses helpers that already exist and are tested (`pendingStatusKeysFor`, `hasErrorForFields`, `lastErrorMessageForFields`), and it does not change alert timing for the other ~70 consumers.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| OQ-1 | `closeIn` is ignored everywhere: alerts close after 3 s, and callers ask for 2000/5000/8000. Should this bug make `closeIn` apply? Recommendation: **no**. Track it separately, because it changes timing at 58 call sites |
| OQ-2 | Siblings (a) `handleGiFieldSaveRequested` section-wide check and (b) the `CustomizedAlertsFsService` null guard: include them here, or leave them as follow-ups? Recommendation: include (b), a one-line guard of the same kind. Include (a) only if the reviewer wants to keep the scope tight, because it needs its own test |
| OQ-3 | Wording: keep "Nothing to save yet", or switch to something like "No new changes"? This is a product decision. The default keeps the current titles and changes only which branch is chosen |
| R-1 | The `removeChild` event pair is unverified (P-5). Mitigation: the null guard fixes the throw whatever the cause, and the regression test pins it down |
| R-2 | Folder-doc rule: `bilateral-result-creator/CLAUDE.md` must be updated in the same commit |
| R-3 | QA's environment was the v15 "new look & feel" preview. Verify on the same build |

## 13. Success Criteria

- The QA repro (steps 1-5 in §9) on prtest gives: no "Save failed" when moving sections without a new failure, no "Draft saved" when nothing was sent, no alert closing before its own timer, and a clean console.
- The 4 regression scenarios fail on HEAD and pass after the fix. tasks.md implements them as **6 tests**: A and B for scenario 1, C for scenario 2, D for scenario 3, and E (Fe) plus F (Fs) for scenario 4. The existing `customized-alerts-fe`, `customized-alerts-fs` and `bilateral-result-creator` suites stay green. *(Count and Fs suite corrected at validation, 2026-11-23.)*
- Client lint passes and coverage stays at or above 50/60/60/60.

## 14. Next Step

```text
/akili-specify bugfix/p2-3960-bilateral-save-alert-consistency
```

Use Bug Mode (Lite). A regression test is required.
