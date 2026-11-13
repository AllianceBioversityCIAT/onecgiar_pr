# Archive Summary — W1/W2 "Bilateral project tagged" notification

**Outcome:** shipped. The W1/W2 tagged-project notification shows a sentence with the project code and the owner Center acronym, bold on SP, code and acronym, with an amber chip. Dedup is per tagged type, so a Center user can get one project row and one Center row. The code is in `master`.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/notifications/w1w2-project-tagged/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none |
| Final status | **Complete**: 5/5 tasks `[x]` (T-5 accepted with gaps, below) |

## Requirements delivered

| Requirement | What it guarantees | Status |
|---|---|---|
| `WPT-R-1` | Label is `<project> (<owner acronym or code>)`, never `()` | Delivered |
| `WPT-R-2`, `R-3`, `R-4` | Sentence, emphasis, legacy bare text, BCT composed text unchanged, push and message | Delivered |
| `WPT-R-5` | Per-type dedup; BCT keeps the cross-type union | Delivered |
| `WPT-R-6`, `R-8` | Amber chip `Bilateral project tagged`, other chips unchanged, no buttons | Delivered |
| `WPT-R-7` | Results Framework path notifies the owner Center | Delivered (Gate 3, real data) |

## Files changed

| File | Change |
|---|---|
| `result-tagged-notification.service.ts` (+spec) | Enriched label; `getAlreadyNotifiedUserIds` grouped by type; per-type set in `emitFor` |
| `notification.service.ts` (+spec) | `parseTaggedProjectLabel` and the new push sentence |
| `internationalization/notification-project-tagged.copy.ts` (new) | Sentence pieces and chip label |
| `notification-type.constants.ts` (+spec) | Client parser twin and `segments` |
| `notification-item`, `update-notification`, `pop-up-notification-item` (+specs) | `segments` loop and amber chip. `notification-item/CLAUDE.md` re-stamped |

## Test evidence

| Suite | Result |
|---|---|
| `result-tagged-notification.service.spec` | 46/46; consumers 43/43 |
| `notification.service.spec` | 53/53 |
| `notification-type.constants.spec` | 56/56 |
| Client notification suites | 236/236; `ng lint` clean |
| Gate 1 and 4, local inbox (2026-10-01) | PASS: amber chip, bold only SP, code and acronym, no buttons, legacy row without `()` |
| Gate 3, PRTest (2026-11-13) | PASS: result 10052 gave the IITA Center user the row, no cross-type duplicate |

## Validation summary

No validation report (accepted). Each task had a Reviewer PASS (T-1 and T-4 on attempt 2).

## Accepted gaps / follow-ups

| Item | Status |
|---|---|
| Bell popover not checked in a browser | Accepted. Covered by the T-4 DOM specs |
| Gate 2 re-save dedup not run (also proves TypeORM fills `obj_notification_type.type`) | Accepted |
| **Delete local fixture notification rows 49028-49030** (local DB) | **Open follow-up** |
| `?? new Set()` hardening for a future third tagged type | Recorded only |
| Case-header comment in `notification-type.constants.ts` (~L292) says the emitter is emphasized | Recorded only |

## Historical notes

- No pivots, no HALTs. Two Reviewer FAILs: T-1 (two tests that could not fail) and T-4 (folder `CLAUDE.md` not re-stamped).
- `tasks.md` header and the T-1..T-4 DoD boxes were stale; fixed at archive.

## Diagrams

None. The spec has no `diagrams/` folder (it has `mockup/` PNGs).
