# Proposal — Innovation Developer prefill reads a stale Lead contact person

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Type | Bug |
| Approval Mode | gated |
| Parent Spec | — |
| Depends on | none |
| Parallel-safe | yes |
| Module | `bilateral` (client) |
| Ticket | none — reported directly by Juan David, 2026-09-18, and agreed no Jira item is needed |
| Related spec | `docs/specs/bilateral/qa-ai-traffic-light/` (`BIL-QAI-R-15` / `DD-12` / `T-12` introduced this prefill) |
| Reference implementation | W1/W2 P25 `innovation-dev-info` (`P2-3272` Part 4, `P2-3643`) |

## Intent

Make the Innovation Developer prefill actually fire in the session where the reporter fills the Lead contact person, which is the only session in which it matters.

## Problem / Current Behavior

In the bilateral editor, a reporter fills **Lead contact person** in General information and then opens **Type-specific details** on an Innovation development result. **Innovation Developer stays empty.** Reloading the page fills it.

The form already promises this behaviour in writing: General information prints *"For innovations, the lead contact person is also the innovation developer/lead."* (`section-general-info.component.html:40`).

## Proposed Outcome

Filling the Lead contact person populates Innovation Developer in the same session, under the guarantee the field already has: **prefill only while the reporter has never given the field a value of their own**. A value the reporter typed, and a value the reporter deliberately cleared, are both left alone.

## Scope

- `onecgiar-pr-client` → `pages/bilateral/components/section-general-info/` — publish the edited lead contact to the shared signal.
- `onecgiar-pr-client` → `pages/bilateral/components/section-type-specific/type-innovation-dev/` — re-evaluate the prefill while it is still eligible.
- Regression test covering the session ordering (mandatory, Bug Mode).
- Both folders carry their own `CLAUDE.md`; each gets updated and re-stamped in the same commit.

## Non-Goals

- **No server change.** The save-side contract stays exactly as `BIL-QAI-R-15` left it: `buildPayload()` sends what is on screen, never a substitution. Re-introducing a server-side copy is the 2026-09-03 defect that made a QA check over this column unfalsifiable.
- No change to the MDS checklist: Innovation Developer stays optional and untracked.
- No change to W1/W2. Its own prefill works; it is read here only as the reference.
- No change to the field's label, description or tooltip.

## Affected Users, Systems, And Specs

| Affected | Detail |
|---|---|
| Users | Centre reporters creating or editing a bilateral **Innovation development** result |
| Result types | Only type 7. The other four type-specific blocks have no such field |
| Specs | `bilateral/qa-ai-traffic-light` (`R-15`, `DD-12`, `T-12`) — this fixes a gap in its delivered behaviour, it does not change its requirement |
| Blast radius | `resultLeadContact` has exactly two readers: `section-general-info` (hydration) and this prefill |

## Visual Reference

- Source: None
- Location: —
- Notes: No new UI. The field, its label, its tooltip and the explanatory note in General information all already exist; only when the value arrives changes.

## Bug Diagnosis

### Observed Symptom

On an Innovation development bilateral result, Innovation Developer is not prefilled from the Lead contact person during the session in which the Lead contact person is entered. After a page reload it is prefilled.

### Reproduction Steps

1. Open a bilateral Innovation development result whose Lead contact person is empty.
2. In **General information**, set a Lead contact person. Save draft.
3. Scroll to **Type-specific details** without reloading.
4. **Expected:** Innovation Developer carries the lead contact. **Actual:** empty.
5. Reload the page → Innovation Developer is now prefilled.

### Root Cause (confirmed)

Two independent facts, both verified in the code:

1. **The signal the prefill reads is never updated by editing.** `BilateralCreationService.resultLeadContact` is written in exactly two places — `resetEditorState` (`bilateral-creation.service.ts:110`) and the result detail GET (`:170`). `section-general-info` *reads* it to hydrate its own `leadContactBody` (`section-general-info.component.ts:197`) and persists edits through autosave, but never writes back to it. So the signal holds whatever the server returned when the editor opened.

2. **The prefill runs once, before the reporter can type.** `applyInnovationDevelopersPrefill()` (`type-innovation-dev.component.ts:275`) is called only from the `next` of the section GET in `loadData()` (`:161`), itself called once from `ngOnInit` (`:149`). The component is mounted by an `@switch` on the result type (`section-type-specific.component.html:21`), not by expanding an accordion, so it mounts and runs its single prefill as soon as the result type is known — before any editing.

Together: the one chance the prefill gets, it takes with a value that cannot yet reflect what the reporter is about to type.

**Why W1/W2 does not show this.** `innovation-dev-info` reads `dataControlSE.currentResultSignal()?.lead_contact_person` — the shared result state, not a bilateral-local mirror — and each Result Detail section is its own route, so navigating to it re-runs the section GET and the autofill with it. Bilateral renders every section in one page and mounts each one once.

**Not the cause:** the key-presence guard (`if ('innovation_developers' in this.body) return;`). It is correct and load-bearing — `InnovationDevExists` omits the key when no row exists and returns it as `null` once the reporter has cleared it, which is what lets a cleared field stay cleared. Any fix must keep it.

### Impact & Scope

- Functional only; no data loss, no integrity or security implication. Nothing is written wrongly — a convenience simply does not happen.
- Contained to Innovation development bilateral results.
- Cosmetically the reporter can always type the name, so severity is low; the cost is that the form makes a promise it does not keep, which is what was reported.

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — behaviour and state ownership change, so a regression test is mandatory. The smallest safe correction is two halves that only work together:

1. General information publishes the edited lead contact to `resultLeadContact`, so the signal means "the current lead contact" rather than "the one the last GET returned".
2. The prefill re-evaluates while it is still eligible, instead of firing once on mount.

The eligibility guard is unchanged: prefill only while `innovation_developers` is absent from the body.

## Approach Options

| # | Approach | Trade-off |
|---|---|---|
| A | Only publish the signal from General information; leave the prefill one-shot | **Does not fix it.** The prefill already ran at mount, before the edit. Half a fix that tests green on a reload and fails on the reported path |
| B | Publish the signal **and** make the prefill reactive (`effect`) while the key is absent | Fixes the reported ordering. Keeps the key-presence guard, so a typed or cleared value is never overwritten. Two small local changes, no server, no contract |
| C | Substitute on the server at save time | **Rejected.** This is literally the 2026-09-03 behaviour that was removed: it made any QA judgement over `innovation_developers` unfalsifiable, because the column could never disagree with the lead contact |

## Recommended Approach

**Option B.** It is the only one that fixes the reported path, and it keeps every guarantee the field already earned through two reworks: the reporter's own value wins, a cleared field stays cleared, and the server still stores exactly what is on screen.

## Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R1 | A reactive prefill could overwrite what the reporter is typing | The key-presence guard closes the moment anything is written to `innovation_developers`. The spec must assert this with a test, not assume it |
| R2 | **Open question.** Does `[(ngModel)]="body.innovation_developers"` ever assign the property on read or on init? If Angular writes `undefined` into the body, the guard closes before the prefill can run and the field silently never fills | Must be verified in the spec's first task, before the fix is designed around the guard. This is the same class of subtlety that caused the `T-12` rework |
| R3 | Publishing on every keystroke could cause avoidable churn | Publish on the same event that already settles the contact (selection / blur), not per character |
| R4 | The reporter clears the Lead contact person after the prefill ran | Out of scope, and deliberately: the prefilled value is the reporter's now. Consistent with W1/W2 |
| D1 | `section-general-info/CLAUDE.md` and `type-innovation-dev/CLAUDE.md` must be updated and re-stamped in the same commit | Folder-doc convention |

## Success Criteria

1. Setting a Lead contact person in General information and then opening Type-specific details, without reloading, shows Innovation Developer carrying that value.
2. A reporter-typed Innovation Developer is never overwritten, before or after the lead contact changes.
3. A cleared Innovation Developer stays cleared across saves and reloads — the `T-12` regression does not return.
4. The saved payload still carries exactly what is on screen; no server-side substitution reappears.
5. The behaviour applies only to result type 7.

## Next Step

```text
/akili-specify bugfix/innovation-developer-prefill-stale-lead-contact
```

Bug Mode, Lite depth, with the R2 verification as the first task and a regression test that fails before the fix.
