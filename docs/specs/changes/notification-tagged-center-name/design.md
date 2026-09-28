# Design — Name the tagged Center in the project-tagged notification

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/notification-tagged-center-name` · Depth **Lite** |
| Requirements | `requirements.md` (NTC-R-1..3, NTC-NFR-1..2) |
| Baseline | `docs/trd/trd.md` notifications module · bilateral-contributor-tagging `design.md` §5.3, DD-1, DD-5 |

## 2. Architecture Overview

One private server service changes: `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts`. No new module, endpoint, entity, migration, payload or client change.

| Aspect | Decision |
|---|---|
| Where the text is built | Project-target loop in `notifyBilateralContributorsOnSubmission` (lines ~191-209). `emitFor` and the suffix template are untouched. |
| Where the acronym comes from | `clarisa_center.clarisa_institution.acronym`, read from the Center index already built once per call. |
| Fallback | Center `code` (the resolver already returns it). |

## 3. Data Model / API

None. `bilateral-result-summaries.en.md` is not touched: the text is a notification string, not a `/api/bilateral/*` payload.

## 4. Backend Module Design

1. **Center index load.** `loadCenterIndex()` asks for the Centers with their institution relation, so each indexed Center carries its institution acronym. Still one query per call, ~15 rows (NTC-NFR-1). `loadCenterIndex()` has two callers (the Center-tagged path at ~113 and this one); the added relation is inert for the other. `buildCenterIndex` in `bilateral/utils/project-owner-center.util.ts` is shared with `bilateral.service` and `clarisa-projects.service`; it is **not** modified.
2. **Label build.** In the project loop, after the owner `centerCode` resolves, look up that code in the index and take its institution acronym, else the code. The label becomes `<project name> of your center (<acronym or code>)`. Project name fallbacks (`shortName ?? fullName ?? project <id>`) are unchanged.
3. **Everything else unchanged:** Center-tagged labels, lead-in, dedup, recipients, error handling (NTC-R-3).

## 5. Traceability

| Requirement | Design |
|---|---|
| NTC-R-1, S1 | §4.2 |
| NTC-R-2, S2 | §4.1 + §4.2 fallback |
| NTC-R-3, S3, S5 | §4.3 |
| S4 | Inherited from BCT-R-9 / `emitFor` dedup; documented, no code |
| NTC-NFR-1 | §4.1 (one query, relation joined) |

## 6. Design Decisions

| ID | Decision | Alternatives rejected |
|---|---|---|
| NTC-DD-1 | Read the acronym via a relation on the existing Center load | Extra `findOne` per project (breaks BCT-NFR-5 and the `find` call-count test) · change the shared resolver's return type (touches 2 other services) |
| NTC-DD-2 | Fallback to `code`, not to institution `name` | `name` is long and unlike the reporting side's `acronym \|\| code` rule — keep one rule |
| NTC-DD-3 | Accept S4 (one notification, first Center named) | List all Centers → needs per-user text; conflicts with BCT-R-9 |

**Reversion challenge (Step 2.3):** none of these decisions removes shipped behavior. It only appends to a label. Skipped.

## 7. Spec text to amend (same change)

In `docs/specs/notifications/bilateral-contributor-tagging/`: `requirements.md` BCT-R-7 text and scenario, `proposal.md` D-4 note, `design.md` §5.3 label, `tasks.md` (~line 207) assertion. Each gets a pointer to this spec. Correction sweep: grep ` of your center` across that folder afterwards.

## 8. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 2 |
| LOC | ~50 (≈10 source, ≈35 test, ≈5 spec text) |
| Review rounds | 1 |

Sizing check: matches Lite. It is not a `/akili-quick` case because it changes server logic and needs new test cases.

## 9. Risks / Rollback

- Existing notifications keep the old text (no backfill).
- Rollback: revert the commit. No data or schema effect.
