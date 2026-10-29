# Archive Summary — Bilateral "Change result type": optional justification

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bilateral/change-type-optional-justification/` |
| Archive Date | 2026-10-27 |
| Final Status | **Done** — 2/2 tasks `[x]`, live in testing |
| Depth / Type | Lite / Change (enhancement) |
| Ticket | Jira P2-4016 (User Feedback – October 2026, item 20) |
| Branch | `qa-development-2026-mc-2` → merged into `performance-refactor` (`fa326aa3e`) |
| Commits | `bf35183ff` (implementation + spec) · `5509b9b44` (T-1 close) · `fa326aa3e` (merge to `performance-refactor`) |

## Outcome

"Why is this change needed?" in the bilateral **Change result type** modal is optional. The button enables as soon as a different type is picked; the server accepts the change without a reason and no longer writes `undefined` into the review history.

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| BIL-CTJ-R-1 — reason optional in the dialog (no `*`, button enabled, KP handle + no-type guards kept) | T-1 | 7 jest cases, red → green; manual check on result 9901 |
| BIL-CTJ-R-2 — server accepts no reason; clean comment | T-2 | 4 jest cases, red (`"… type 7. undefined"`) → green |
| BIL-CTJ-R-3 — contract states optional | T-2 | `@ApiPropertyOptional` + change-log row 2026-10-26 |
| NFR-1 / NFR-2 — no other validation, no migration/payload change | T-1, T-2 | existing tests green; no entity/migration touched |

## Files Changed

| Package | Files |
|---|---|
| Client | `bilateral-change-result-type-dialog.component.{ts,html}`, new `…component.spec.ts` |
| Server | `dto/change-center-result-type.dto.ts`, `services/bilateral-center.service.ts`, `services/bilateral-center.service.spec.ts` |
| Contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (change-log row) |

## Test Evidence

- No separate `test-report.md`: tests were authored red-first inside `/akili-execute` (accepted by the user's archive request).
- Server: `src/api/bilateral` 1482 passed; build + eslint clean. Client: dialog 7/7, bilateral pages 2625 passed; lint clean.
- Same suites re-run on the merged `performance-refactor` tree before push.

## Validation

- No `validation-report.md` (accepted by the user's archive request). Stand-ins: two independent Reviewer PASSes (opus), manual HITL check on IRRI result 9901 (Phase 36), and the user's confirmation in testing on 2026-10-27.

## Accepted Warnings / Follow-Ups

| Item | Source | Status |
|---|---|---|
| Non-string `justification` (e.g. `123`) would 500 — route has no ValidationPipe | T-2 Reviewer advisory | Accepted, not scheduled (UI always sends a string) |
| `trim()` called twice in the comment expression | T-2 Reviewer advisory | Cosmetic, not scheduled |
| Spec's rendered-button assertion never observed failing alone | T-1 Reviewer advisory | Accepted (Reviewer traced it) |

## Historical Notes

- The ticket only named the UI. Specify found the server would have stored `undefined` for an empty reason, so the spec covered both packages.
- The change was first invisible in testing because the work branch has no deploy; testing deploys from `performance-refactor`. Recurrence of `KZ-bilateral--resubmit-followups-2` (see kaizen entry).

## Diagrams

None — design §2 holds one inline Mermaid flow; no baseline diagram slot affected.
