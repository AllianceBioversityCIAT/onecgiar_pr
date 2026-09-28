# Proposal — Name the tagged Center in the project-tagged notification

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `notification-tagged-center-name` (`changes/`) |
| Type | Change |
| Approval Mode | gated |
| Date | 2026-09-24 |
| Depends on | none |
| Parallel-safe | yes |
| Amends spec | `docs/specs/notifications/bilateral-contributor-tagging` — BCT-R-7 (+ AC35 wording, D-4) |
| Source | Tester feedback, item 5 — result 9600 (reported by CIMMYT, ICRISAT project) |

## 2. Intent

A user who reads "…has tagged the S-YAU44 of your center" must be able to tell **which** Center was tagged.

## 3. Problem / Current Behavior

- Scenario 7 (`RESULT_BILATERAL_PROJECT_TAGGED`) label is `"<project> of your center"` (`result-tagged-notification.service.ts:204-206`).
- A user with Center roles in several Centers gets no hint which Center owns the tagged project.

## 4. Proposed Outcome

`The result <code> - <title> reported by <reporting acronym> has tagged the <project> of your center (<owner Center acronym>). Click to see the result.`

Example: `…has tagged the S-YAU44 of your center (ICRISAT). Click to see the result.`

## 5. Scope

- Server: project-target label in `notifyBilateralContributorsOnSubmission` appends `(<acronym>)`.
- Spec: BCT-R-7 text, the AC35/D-4 wording, its scenario, and the traceability row.
- Server tests: `result-tagged-notification.service.spec.ts` (lines ~393-395, ~539) plus a new multi-Center case.

## 6. Non-Goals

- Scenario 6 (`Result Center Tagged`): it already names the Center (BCT-R-8).
- Client: bell/email render `notification.text` as a suffix (assumption A-1), so no client change.
- No schema, endpoint or payload change (`bilateral-result-summaries.en.md` untouched).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Center Users of a contributing project's owner | Text gains `(<acronym>)` |
| `result-tagged-notification.service.ts` | Label build in the project loop |
| `project-owner-center.util.ts` | Resolver returns only `code` + `institutionId`; the acronym must be read from the Center index (or `project.sourceCenterAcronym` as a fallback) |
| Spec `bilateral-contributor-tagging` | BCT-R-7 amended (record in its change history) |

## 8. Visual Reference

Source: None — text-only change to a notification string.

## 9. Requirement Delta Preview

### MODIFIED Requirements
- **BCT-R-7:** project label becomes `<project name> of your center (<owner Center acronym>)`.

### ADDED Requirements
- **BCT-R-7.x (fallback):** if the owner Center has no acronym, use its code. The parenthesis is never empty or omitted.

## 10. Approach Options

| Option | Behavior for a user with several Centers | Trade-off |
|---|---|---|
| **A. Name the owner Center of the tagged project (recommended)** | One notification per user per result (BCT-R-9). Each target is already scoped to one `centerCode`, so the text names the Center that qualified the user. | Smallest change. Answers "which Center was tagged". |
| B. List all of the user's matching Centers | Needs per-user text; breaks the one-text-per-target design (`emitFor`). | More code, more tests, no extra information. |
| C. Omit the parenthesis when the user has >1 Center | Hides the info exactly where it is needed. | Rejected: contradicts the motivation. |

## 11. Recommended Approach

**Option A.** The open question "what to show when the user qualifies for more than one Center" mostly dissolves: the text names the **tagged project's owner Center**, not the user's Centers, so it is the same for every recipient of that target.

One real edge remains. If a user is a Center User of two Centers that each own a tagged project, BCT-R-9 sends **one** notification, and it names only the first target in order (project order). Options:
- accept it (the click opens the result, which shows all contributors), or
- name all owner Centers among the user's projects — this needs BCT-R-9 dedup to be revisited.

Recommendation: accept, and document it as a scenario in BCT-R-7.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Status |
|---|---|---|
| OQ-1 | Confirm Option A, and that the edge above is acceptable. | **Open — needs user/PO decision** |
| OQ-2 | Acronym source: `clarisa_center` may lack `acronym`; the reporting side uses `clarisa_institution.acronym`. Verify what `ClarisaCenter` carries, and the fallback order (institution acronym → `sourceCenterAcronym` → code). | Open — settle in `/akili-specify` |
| R-1 | Existing notifications already stored keep the old text (no backfill). | Accepted |
| R-2 | Two specs assert ` of your center` (spec.ts ~393, ~539; tasks.md line ~207). | Update in the same change |

## 13. Success Criteria

- Result 9600-like case: the ICRISAT project notification reads `…the S-YAU44 of your center (ICRISAT). Click to see the result.`
- Fallback to code when the acronym is missing; never `()`.
- BCT-R-7 text and tests are updated together.
- Scenario 6 and the existing texts (BCT-R-12) are unchanged.
- Scoped Jest on `result-tagged-notification.service.spec.ts` is green, plus lint.

## 14. Next Step

After OQ-1 is decided:

```
/akili-specify changes/notification-tagged-center-name
```

(Lite depth. It is a logic change with a mandatory test update, so it stays out of `/akili-quick`.)
