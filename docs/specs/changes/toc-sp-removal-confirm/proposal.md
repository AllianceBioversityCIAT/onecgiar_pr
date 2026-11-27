# Proposal — Let users remove a ToC-mapped Contributing Science Program (confirm, don't block)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-sp-removal-confirm` |
| Slug | `toc-sp-removal-confirm` — derived from free-text argument |
| Type | Change (reverses a shipped guard by product request; the guard works as designed) |
| Deliverable | software |
| Approval Mode | gated |
| Owner | Santiago Sanchez |
| Date | 2026-11-27 |
| Requirement source | Teams message from Nicoleta Trifa (CGIAR System Org), 2026-11-27 01:45: *"Another user flagged the issue of not being able to remove a program contributing to a result because of the ToC linkage. Pls ensure that changes to contributions can be made regardless of the TOC info that comes into PRMS."* No Jira ticket yet. |
| Design direction | Santiago (this session): keep the existing alert, but turn it into a Yes/No confirmation that says the Science Program is mapped in the ToC. |
| Supersedes | `TOC-SP-DD-1` blocking behavior from the archived `changes/toc-science-program-guard` (2026-08-31) |
| Depends on | none |
| Parallel-safe | yes (one component, client-only, no API or migration) |

## 2. Intent

A submitter must always be able to change who contributes to a result. The ToC may suggest Science Programs, but it must not lock them in. Removing the last ToC-mapped Science Program should ask for confirmation, not refuse.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| P1 | Removing the **last** ToC-origin Contributing Science Program chip is **blocked**. The chip stays and a warning appears: *"Indicator with Science Programs mapped in ToC — At least one Contributing Science Program is required for this result."* | `rd-contributors-and-partners.component.ts:861-880` (`blockIfLastScience`, `deleteScience`) |
| P2 | The guard fires when the result is ToC-mapped (`planned_result !== false`) and the ToC brought ≥1 Science Program id. | `component.ts:854-858` (`hasTocPlannedScience`) |
| P3 | The alert has only an "Ok" button. No path to proceed. | `component.ts:865-870` (no `confirmText`) |
| P4 | The alert service already supports a confirm/cancel dialog: `confirmText` shows Cancel + Confirm and the callback runs on Confirm. | `customized-alerts-fe.service.ts:8,24,50-63`; used by `onSyncSection`, `component.ts:916-928` |
| P5 | No mandatory-field marker or client green-check rule depends on Science Program count, so allowing zero creates no new "N fields missing" gap. | Grep for `appFeedbackValidation` / a science-complete flag in the folder: no match |
| P6 | Server-side validation does not require ≥1 contributing Science Program. | `UNVERIFIED — confirm at source before relying on it` (one grep found nothing; check `validation_contributor_partner_P25` at specify) |
| P7 | Once a user deletes a ToC-origin SP, the prefill effect does not add it back: the ToC reference signature is unchanged, and after a save the hydrated state wins (P2-3115). | `component.ts:801-836` (`preselectScienceEffect`, `sectionHydratedFromToc` guard) |
| P8 | The twin guard on **Contributing CGIAR Centers** (`blockIfLastCenter`, alert `toc-center-min`) blocks the same way. | `component.ts` (3 hits of `blockIfLastCenter`), archived `changes/toc-center-guard` |

## 4. Proposed Outcome

When the user removes the last ToC-mapped Contributing Science Program:

1. A warning dialog opens:
   - **Title:** *Science Program mapped in the Theory of Change*
   - **Body:** *"This Science Program is mapped in the Theory of Change for the selected indicator. Are you sure you want to remove it?"*
   - **Buttons:** `Cancel` / `Yes, remove it`
2. **Yes** → the chip is removed exactly as an ordinary delete would remove it. Saving then persists the removal.
3. **Cancel** → nothing changes.

Every other removal stays as it is today: no dialog.

## 5. Scope

- `deleteScience` in `rd-contributors-and-partners.component.ts`: replace the block with a confirm that runs the delete on Yes.
- Rename or split `blockIfLastScience` into a confirm helper. Keep the `hasTocPlannedScience` / `getRealScienceCount` conditions unchanged, so the dialog appears in exactly the cases where the block appears today.
- Final copy (see open question Q2).
- Update the spec tests that currently assert the block (`component.spec.ts`, 2 SP refs at `:328,388`, plus 3 Center refs) so they assert the confirm, the Yes path and the Cancel path.
- Update the folder `CLAUDE.md` (the `TOC-SP-DD-*` trap entries) and re-stamp `Verified:`.

## 6. Non-Goals

- No change to how the ToC preselects Science Programs (`preselectScienceEffect`, `applyTocMappingOnLoad`).
- No server, DTO, migration or `/api/bilateral/*` change. The payload does not change. The W3/Bilateral form is not touched.
- No confirmation when removing "Other(s)" Science Programs or the "Other(s)" sentinel (today these are never guarded).
- Contributing CGIAR Centers: excluded unless Q1 says otherwise.

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Result submitter (P25, phase ≥ 2026, ToC-mapped result) | Can remove the last ToC Science Program after confirming |
| `rd-contributors-and-partners` (client) | One handler, one helper, alert copy, tests, folder `CLAUDE.md` |
| IPSR contributors / share-request modal / review drawer | Not affected. Corrected at specify: they reuse child components, not this class (`design.md` P-4). IPSR's own `deleteContributingCenter` is a separate method |
| Archived specs | `changes/toc-science-program-guard` (superseded decision); `changes/toc-center-guard` (twin, see Q1) |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: Reuses the existing `customizedAlertsFeSE` warning dialog with its built-in Cancel/Confirm buttons. No new UI. The look is the same as the "Sync confirmation" dialog in the same section.

## 9. Requirement Delta Preview

### MODIFIED Requirements

- `TOC-SP-R-*` (archived guard): *"removing the last ToC-planned Science Program is blocked"* → *"removing the last ToC-planned Science Program needs explicit confirmation; once confirmed, the removal goes through."*

### ADDED Requirements

- The confirmation names the ToC mapping as the reason for asking, and offers Yes and Cancel.
- Cancel leaves the selection unchanged.

### REMOVED Requirements

- The hard floor of "at least one Contributing Science Program when the ToC planned some" (`TOC-SP-US-1`).

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Confirm on the last ToC SP only** | The current guard becomes a confirm; the trigger condition is unchanged | Smallest diff; matches Santiago's direction; no new noise | Removing the 2nd-to-last ToC SP gives no warning (same as today) |
| B. Confirm on every ToC-origin SP removal | Dialog on each ToC chip delete | User is always told that the SP came from the ToC | More dialogs; heavier change than asked for |
| C. Drop the guard entirely | Plain delete | Simplest | Loses the "this was in your ToC" signal Santiago wants |

## 11. Recommended Approach

**Option A.** Wrap the existing delete in `customizedAlertsFeSE.show({ …, confirmText: 'Yes, remove it' }, () => doDelete())`, the same pattern `onSyncSection` already uses in this component. The trigger condition stays the same, so this is the smallest safe change and it meets Nicoleta's requirement ("changes to contributions can be made regardless of the TOC info").

If Q1 is answered yes, apply the same change to `deleteContributingCenter` / `blockIfLastCenter`, with identical shape and its own copy.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| Q1 | **Contributing CGIAR Centers has the same hard block.** Nicoleta's principle ("changes to contributions … regardless of the TOC info") covers it too, and users will probably report it next. Should it get the same confirm in this change? *Recommendation: yes. Same file, same pattern, about 10 more lines.* |
| Q2 | Final wording: Santiago's draft vs. the copy in §4. Should the dialog name the Science Program (e.g. *"SP03 – Climate Action is mapped…"*)? |
| R1 | Server green check or submit validation may require ≥1 SP (P6, unverified). If it does, the user could remove the SP and then fail to submit. Check at specify. |
| R2 | The alert service builds its HTML from strings. Putting an SP name in the body means it must be escaped (only if Q2 picks the named variant). |
| R3 | The dirty tracker will flag the removal as an unsaved change. This is expected: Next saves it, like any other edit. |
| KZ | No Active Lessons were checked: `docs/specs/kaizen-log.md` was not read in this pass. Check at specify. |

## 13. Success Criteria

- On a ToC-mapped 2026 result with one ToC Science Program, removing it shows the confirm dialog. **Yes** removes the chip, and after Save + reload the SP is still gone (no re-prefill).
- **Cancel** keeps the chip.
- Removals that are not guarded today still show no dialog.
- Updated Jest tests are green. Lint is clean.

## 14. Next Step

```text
/akili-specify changes/toc-sp-removal-confirm
```

Lite depth. Settle Q1 and Q2 first. (Specify re-sized this to Standard (small): Centers, the P2-3249 relaxation and the panel deselect were added to scope.)
