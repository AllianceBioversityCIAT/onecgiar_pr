# Judgment Day — `bilateral/ai-draft-new-indicator` design

| Field | Value |
|---|---|
| Target | `requirements.md` + `design.md` at `c3dd5409c` (draft, pre-tasks) |
| Mode | `judgment_day`, round 1 |
| Judges | A and B, blind, read-only, model `sonnet` (author `opus`; author ≠ auditor) |
| Skills passed | `angular-developer` |
| Verdicts | A: FAIL · B: FAIL |

## Frozen ledger (round 1)

| ID | Severity | Judges | Finding | Evidence (as run by judges) | State |
|---|---|---|---|---|---|
| JD-1 | **CRITICAL** | A-1, B-1 | The violet left accent (`ADN-DD-4`, §6.3) cannot render. Every New group is an own job, so it already carries `.mdr-session-card--me` (green 4px `border-left`). That rule is unlayered SCSS, which beats the layered Tailwind utilities. No ledger row covers the existing card styling | `my-draft-results.component.scss:221-242`; `.html:241`; `styles.scss:5` `@layer theme, base, components, utilities;` | **confirmed** |
| JD-2 | WARNING | A-3, B-4 | Switching center on the Drafts tab reuses the component (no `ngOnDestroy`), so center A's ids are not consumed and the marks come back. No ledger row | `bilateral.component.ts:30-45`; `prms-route-reuse.strategy.ts:15-20` | confirmed (info) |
| JD-3 | WARNING | A-4, B-5 | `loadAllDrafts` also fires `GET_ClarisaProjects` + `GET_AllInitiatives`: 3 GETs per reload, not 1 (NFR §6, design §8, D2 test) | `bilateral-ai.service.ts:455-457` | confirmed (info) |
| JD-4 | SUGGESTION | A-9, B-7 | The folder `my-draft-results/CLAUDE.md` (Contract, Traps, `Verified:`) must be updated in the same change and is not planned. ID prefix drift (`ADN-D-n` vs `ADN-D1..7`) | `onecgiar-pr-client` guide rule; requirements §Document Control vs §8 | confirmed (info) |
| JD-5 | WARNING | A-2 | "Reload mid-run sees no mark" is false. A reload restarts polling via the active hint, the first poll records the job active, and its later completion IS detected. Only a reload **after** completion loses the mark | `bilateral-ai.service.ts:123`, `:380-392` — re-read by architect: confirmed at source | suspect → architect-confirmed |
| JD-6 | WARNING | B-3 | `loadAllDrafts` has no latest-wins guard; an older concurrent response can overwrite the reload and hide the new group (`ADN-AC-4`) | `bilateral-ai.service.ts:457-465`; concurrent callers `:445`, component `:357`, shell `:28` | suspect |
| JD-7 | WARNING | B-6 | With a 12px root, Tailwind `xl` fires near 960px, so the HITL widths 375/900/1280 skip the band where the header goes single-row and the project title already truncates | `.html:247,274,281`; client `CLAUDE.md` base font | suspect |
| JD-8 | WARNING | B-2 | Polling is app-wide (watcher in `app.component.html:67`), so the DD-2 reload can be a silent no-op (null center) or target the center in context. The ledger has no row | `bilateral-ai.service.ts:452-453` | suspect |
| JD-9 | SUGGESTION | A-5, A-8, B-8 | Citation hygiene: the raw greps include comment/definition lines, so state them as call sites. P-1 lines `:337-360`. Give the full path of the reuse strategy. The client CAN check `draft.job.user_id` (P-1 "if false" overstated) | as listed | info |
| JD-10 | SUGGESTION | A-6, A-7, B-9, B-10 | Promoting the last draft leaves the id unconsumed. Add a delete test to AC-6. The set must be replaced, never mutated. The budget is the low end. The service harness should reuse the `:391` multi-poll pattern | as listed | info |

Counts: confirmed severe 1 · confirmed info 3 · suspect 4 (1 architect-confirmed) · contradictions 0 · info 2.

## Round 1 correction

User chose **Fix and Re-judge** (2026-10-27).
- Fix actor (architect) applied fixes for JD-1 (severe, confirmed) and JD-2..JD-8 (info, user asked to fix all).

## Round 2 — scoped re-judgment

| Judge | JD-1..JD-8 | New findings | Verdict |
|---|---|---|---|
| A | all RESOLVED | RA-1 WARNING (promote navigates away and consumes all shown ids, unstated), RA-2..RA-5 SUGGESTION | PASS |
| B | all RESOLVED | RB-1 WARNING (folder `CLAUDE.md` already at the 120-line cap), RB-2 WARNING (center-change trigger ambiguous; same as RA-2), RB-3 WARNING (`xl` is 1280 px, not ~960; the round-1 JD-7 premise was wrong), RB-4..RB-6 SUGGESTION | PASS |

Post-PASS wording fixes (info rows, no behavior beyond the clarification, not re-judged): RA-1, RA-2/RB-2, RB-1, RB-3 (new P-14), RA-3/RB-5 (guard semantics), RA-4/RB-4 ("cached" removed), RA-5 (citation), RB-6 (accepted in §13).

Counts: confirmed severe 1 (fixed) · new severe 0 · contradictions 0.

JUDGMENT: APPROVED ✅
