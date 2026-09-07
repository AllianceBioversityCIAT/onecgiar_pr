# Judgment Day — `changes/my-work-board` (spec set, pre-execution)

| Field | Value |
|---|---|
| Target | `proposal.md` + `requirements.md` + `design.md` + `tasks.md` as frozen on 2026-09-04 (pre-fix) |
| Mode | judgment_day · round 1 · pre-approved (fixes applied once, no re-judgment — `feedback-pragmatic-akili-execution`) |
| Judges | A (`opus`, Explore) · B (`opus`, Explore) — author was `fable` (author ≠ auditor) |
| Skill resolution | none project-specific for docs |
| Counts | confirmed severe **8** · suspect (one judge, verified by the parent) **5** · contradictions **0** · INFO **14** |
| Correction work | one fix round by the parent (all three documents rewritten in place; mockup fixtures corrected) |
| Scoped re-judgment | skipped (YOLO mandate); the fix delta is listed below for `/akili-archive` |

## Ledger

| ID | Sev | Judges | Claim | Parent verification | Fix |
|---|---|---|---|---|---|
| L-1 | SEVERE | J-1, J-2, J-3, K-7 | Completeness cannot come from the `validation` table: not written since 2023; P25 computes live via `validateResultById` → `validate_sections_mapped_batch`; P25 sections differ (contributor-partners, no ToC/partners/links) | Confirmed in `green-checks.service.ts:39-48`, `results-validation-module.repository.ts:47-88` | Design: server folds `validateResultById` per Editing/Draft row, capped, Mine scope only; fixtures → P25 (`2 of 5`) |
| L-2 | SEVERE | J-4 | Section map lacks `contributor-partners` (P25) | Confirmed `routing-data.ts` (P25 route) + enum | Map now covers P22 + P25 names |
| L-3 | SEVERE | J-5, K-6 | Phase is a client-side label filter on the Results tab, not `version_id`; `?phase=` is a label | Confirmed `programme-results.service.ts:381`, component 844-895 | Board adopts the same client-side phase model (DD-11) |
| L-4 | SEVERE | J-6 | Board order contradicts TRD W1 prose | Code: submit sets `status_id=3` (`submissions.service.ts:84,148`); QA → 2. TRD prose is inverted | Board order kept; TRD W1 correction recorded as pending archive sync |
| L-5 | SEVERE | J-7, J-8, K-5 | Statuses 6 Approved, 7 Rejected, 8 Draft exist; spec keyed only 1–5; fold rule undefined; test id 9 invented | Confirmed migrations `1768396987422`, `1784919268056` | Explicit status→column table (DD-1b); Other rail; fixtures use 6/7/8 |
| L-6 | SEVERE | J-9, K-10 | `design.md` §5 rule 2 mandates General Information; spec cites it as a fallback | Confirmed | `MWB-DD-10` waiver for in-app section navigation; pending §5 clarification |
| L-7 | SEVERE | K-1 | Endpoint throws 404 on an empty list → error panel, not empty state | Confirmed `results.service.ts:1456` | R-7 clause + T-3 mapping 404 → empty |
| L-8 | SEVERE | K-2, K-3, J-11, K-4 | Badge fallback unscoped; resolver uncached and private; `resultTypeId` missing on the row | Confirmed | DD-3/DD-5 revised (root `ScienceProgramIdService`, scoped count); T-2 adds `resultTypeId` |
| L-9 | WARNING | J-12, K-8 | Budget 1,100 vs task sum 1,200 | Confirmed | Budget 1,350; estimates re-summed |
| L-10 | WARNING | J-13, K-11 | `code` is a string; test used numeric 4712 | Confirmed | `'4712'` |
| L-11 | WARNING | J-14, J-15, K-9 | Perf NFR orphan; page limit 2000 | Confirmed | Cap-based NFR; measurement owned by T-6 when local server available, else accepted risk |
| L-12 | WARNING | J-16 | Phase switching on the board unowned | Confirmed | T-4 owns the phase select (same control as Results) |
| L-13 | WARNING | J-17 | requirements.md lacks Required cross-references | Confirmed | Added |
| L-14 | WARNING | J-18 | Proposal path `results/result-detail` unroutable | Confirmed (`/result/`) | Fixed in proposal |
| L-15 | WARNING | K-12 | Batch dedupe on `validation` | Moot (L-1 drops the table read) | — |
| L-16 | WARNING | K-13 | R-4 "no per-result green-checks call" clause not quoted by T-4 | Confirmed | T-4 quotes it |
| L-17 | INFO | J-10 | Proposal Option A cost rationale wrong for v1 | Confirmed | Proposal note |
| L-18 | INFO | J-19, K-14 | R-20 sort MAY unowned | Confirmed | Removed; deferred in §13 |
| L-19 | INFO | J-20, K-15 | Story citations decorative | Confirmed | Cites → `G1`, `US-S1`, `US-P1` |
| L-20 | INFO | J-21, K-16 | Band comment reserves the design's `Drafts` slot | Confirmed | DD-12 + comment update in T-4 |
| L-21 | INFO | K-17 | `DD-7` collides with baseline id | Confirmed | `MWB-DD-7` |

**JUDGMENT: APPROVED ✅** (after the single fix round; residual risk: no scoped re-judgment — accepted under the pre-approved mandate, to be weighed at archive).
