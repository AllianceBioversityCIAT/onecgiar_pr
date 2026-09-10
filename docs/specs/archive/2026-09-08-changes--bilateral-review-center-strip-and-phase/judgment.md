# Judgment Day — `changes/bilateral-review-center-strip-and-phase`

| Attribute | Value |
|---|---|
| **Target** | `requirements.md`, `design.md`, `tasks.md` (snapshot after Phase 1–3 drafting, 2026-09-07) |
| **Mode** | judgment_day · pre-approved → one pass, fix-only, no re-judgment |
| **Judges** | `brc-judge-a`, `brc-judge-b` — `akili-reviewer` wrappers (opus, ≠ author), blind, read-only, identical prompts |
| **Raw totals** | A: SEVERE 3 · WARNING 5 · INFO 5 — B: SEVERE 4 · WARNING 6 · INFO ≥ 2 (table truncated after JB-13; remaining rows were INFO) |
| **Merged** | 5 severe (3 confirmed by both, 2 single-judge verified in code by the parent) · 9 warnings · 7 info · 0 contradictions |
| **Correction** | 1 fix pass by the parent over the three documents |
| **Terminal** | **JUDGMENT: APPROVED ✅** (all severe and warning findings applied; info recorded) |

## Severe (fixed)

| L | Judges | Finding | Verified at | Fix |
|---|---|---|---|---|
| L-1 | JA-1, JB-1 | `PhasesService.phases.reporting` is a plain array; a `computed` over it never re-evaluates; `getPhasesObservable()` is a non-replaying Subject | `phases.service.ts:13, 29-32, 53, 62` | Page `reportingPhases` signal seeded from the array + subscription (mirror `dashboard-lab.component.ts:2839-2841`) + `GET_versioning(ALL, ALL)` filtered `app_module_id == 1` fallback; catalog failure → error state (R-5, AC-14) |
| L-2 | JA-2, JB-2 | Band does not inject `DataControlService`; adding it would break both band specs (router-only providers) | band `:117-123`; specs `:24-28` | Inject it in the band with one `useValue` stub in both band specs; `ensure('SP02')` assertion updated (allowed explicitly in T-1) |
| L-3 | JA-3 (+ JB-4 numeric mismatch) | `version.id` is a bigint string on the wire; strict `===` and string keys mis-compare `36` vs `"36"` | `data-control.service.ts:127`; `dashboard-lab.component.ts:1509-1516` | `Number()` normalization in keys and comparisons; mixed-type tests (AC-9) |
| L-4 | JB-3 (+ JA-4 warning) | Deep-link effect returns early on an empty list; a phase-scoped list may be empty → notification deep links never open the drawer | `bilateral-review.component.ts:373-384` | New R-10 / AC-13: fire on load settle with the `{ id, result_code }` fallback; DD-1 challenge rewritten |
| L-5 | JB-4 | Expected numbers hard-coded to phase 36 / 12 while the DB's `status=1` phase is 34 | requirements §2, tasks T-1 gate | All ACs and the T-1 gate restated relative to the shell-resolved phase P (and alternative Q); OQ-3 records the observation |

## Warnings (applied)

| ID | Finding | Action |
|---|---|---|
| JB-5 | `retry()` / `onDecisionMade()` would refetch unscoped | `loadResults(code, versionId)` single entry point; R-5 + tests |
| JB-6 | Load effect also fires `getEntityDetails()` → two requests per phase switch | Entity-details effect split (code only); R-5 "exactly one list request"; AC-8 |
| JB-7 | Disqualifier banned the band-spec assertion update the change requires | T-1 disqualifier reworded |
| JB-8 | "`setFromRows` ignored for a non-current phase" gate placed in the count service, which knows no current phase | Gate moved to the page spec (§10 + design) |
| JB-9 | `app-pr-filter-select` deselects to `emptyValue` on re-pick | `emptyValue` bound to the shown id; R-7 no-op rule; AC-8b |
| JB-10 | Chip presence vs counts defined over different bases | R-1 = search-filtered, phase-scoped base for both |
| JA-5 | Phase options need the portfolio filter | `knownPhases` filtered by `obj_portfolio.id` (as `dashboard-lab:1503-1511`) |
| JA-6 | Blank `lead_center` rows break "All centers = KPI" | "Not specified" bucket; AC-15 |
| JA-7 / JA-8 | Acronym→code fallback when the catalog is empty; phase never resolving → skeleton forever | R-4 fallback stated; R-5 error state + AC-14 |

## Info (recorded)

JA-9/JB-11 LOC sum (restated 320/460); JA-10 AC-8 "re-expanded" → `allExpanded` true (applied); JA-11 `GET_versioning(ALL, ALL)` citation (applied); JA-12 band stub signature claim dropped (applied); JA-13 chip-class range `:235-296` (applied); JB-12 Results `?phase=` carries a label, not a versionId (noted in §2); JB-13+ truncated INFO rows not recovered (judge asked once for the severe set; nothing severe was pending).

## Kaizen signal

Same family as the parent spec's L-1/L-2: a design that names a shared service must state the service's **reactivity model** (plain array vs signal vs Subject) and the **wire type** of every id it compares. Candidate addition to the Phase-1 premises table template: "reactivity" and "wire type" columns.
