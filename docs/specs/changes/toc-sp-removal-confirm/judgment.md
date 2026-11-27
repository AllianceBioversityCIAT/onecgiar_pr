# Judgment Day — design.md (`changes/toc-sp-removal-confirm`)

| Field | Value |
|---|---|
| Target | `design.md` + `requirements.md` + `proposal.md` at `c12bb4d29` (draft, uncommitted) |
| Mode | judgment_day, two blind read-only judges (`akili-reviewer`) |
| Round | 1 (initial judgment) |
| Skills passed | `angular-developer` |

## Frozen ledger

| ID | Status | Severity | Finding | Judge A | Judge B |
|---|---|---|---|---|---|
| JD-1 | **confirmed** | **severe** | P-3 is false. The app is zoneless (`view-refresh.service.ts:6-7`; no `provideZoneChangeDetection` in `app.module.ts`/`main.ts`). The dialog's native `addEventListener` callback writes plain fields, so nothing repaints and the SP chip stays visible after Yes. The fix needs an explicit `markForCheck()` / `ViewRefreshService.schedule()` plus a zoneless DOM test that clicks the real confirm button. Architect re-run: `view-refresh.service.ts:6-7` confirms it | J-1 | J-1 |
| JD-2 | confirmed | warning | Cancel is not side-effect-free for Centers. `html:185` runs `setPossibleLeadCenters(true)` before the dialog opens, which can auto-assign `leadCenterCode` and sets `updatingLeadData`. This contradicts TRC-S-2.2. Fix: move the call into the handler (immediate path and callback only) | J-2 | J-2 |
| JD-3 | confirmed | warning | No premise row says which callers pass `updateComponent`. No template does; only specs | J-5 | J-5 |
| JD-4 | confirmed | suggestion | The §4 bottom-bar row is wrong: there is no "ToC-only" text, but the comment says "markers" (plural). Other stale comments and docs are not listed (`component.ts:530-561`, `:591-597`, folder `CLAUDE.md` P2-3738 / two-marker entries) | J-8 | J-6 |
| JD-5 | confirmed | suggestion | Asterisks are inconsistent after the relaxation: the ToC dropdown stays required and "Other(s)" stays unmarked (`html:129`, `:213`). Needs an explicit decision | J-9 | J-7 |
| JD-6 | suspect | warning | `zoneless.spec.ts:601-619` (sentinel plus one Other center → `'todo'`) flips to `'ok'` under the relaxed rule. It is not enumerated, and §10(c)'s claim is too broad | J-3 | — |
| JD-7 | suspect | warning | No ledger row for "prefill effects do not re-add a removed item" (verified true at `component.ts:630,633,810,813`) | J-4 | — |
| JD-8 | suspect | warning | After a confirmed removal of `[C, sentinel]` with no Other centers, the union holds only the sentinel. Auto-assign may then set `leadCenterCode='__OTHER_CENTERS__'` (`service.ts:751-760`, `:1012-1021`) | — | J-3 |
| JD-9 | suspect | warning | Deselecting from the open `pr-multi-select` panel (`pr-multi-select.component.ts:482-499`) removes a ToC item with no dialog. The old guard had the same gap | — | J-4 |
| JD-10 | info | — | P-8 wording: it calls `tryAutoAssignLeadCenter`, not `runAutoAssignLeads` | J-6 | — |
| JD-11 | info | — | Identity removal: return early before side effects when the item is gone | J-7 | — |
| JD-12 | info | — | Proposal depth says "Lite"; the proposal says "3 refs" where there are 2; proposal §7 says IPSR reuses the class (false, per P-4); P-6 could also cite `results-validation-module.repository.ts:438-448` | J-10 | J-8, J-9 |

Premise Ledger verdicts (both judges): P-1, P-2, P-4, P-5, P-6, P-7 confirmed; **P-3 contradicted**; P-8 code confirmed, conclusion incomplete.

## Round-one correction

The user chose "Fix all + re-judge" (2026-11-27), plus two decisions: confirm on panel deselect too (JD-9), asterisks unchanged (JD-5). Applied as design revision 2, requirements S-1.4/S-2.4 and the S-2.1/S-2.2 rewording, and the proposal corrections.

### Scoped re-judgment 1 (both judges)

JD-1..JD-8 and JD-10..JD-12: resolved (both). JD-9: partial (both).

| ID | Status | Severity | Finding (fix-caused) | A | B |
|---|---|---|---|---|---|
| N-1 | confirmed | **severe** | P-10 is false. Re-deriving `selected` on the same clone does not re-tick the DOM checkbox (the NgModel binding value does not change), so an intercepted untick shows unticked | N-1 | N-1 |
| N-2 | confirmed | warning | `deselectGuard` in group mode (in-place flag, no `syncSelectionFlags`) and on `logicalDeletion` re-activation | N-2 | N-2 |
| N-3 | confirmed | warning | DD-8 widens auto-assign (`[C1, sentinel]` → C1); not in the ledger and not tested | N-4 | N-3 |
| N-4 | confirmed | suggestion | Zoneless test needs `<app-root>` and modal cleanup; only the SP case proves `markForCheck` | N-3 | N-4 |
| N-5 | confirmed | suggestion | Test line ranges (`:432-734`, `:1664-1779`, `:572,573,582,596`); "Unselect all" bypass | N-5 | N-5 |

## Round-two correction (final allowed)

Design revision 3. N-1: rebuild the clones on intercept (no `trackBy`, so the row is recreated), with a CT asserting the DOM `input.checked` and a recorded fallback. N-2: guard only on removal of an active item; `syncSelectionFlags()` in group mode; the bypass is documented. N-3: P-12 plus two service cases, widening accepted. N-4/N-5: test plan corrected.

### Scoped re-judgment 2 (final, both judges)

| ID | Status | Notes |
|---|---|---|
| N-1 | **not resolved** (both) | P-10's cited facts hold, but `cdkVirtualFor` recycles row views (`_RecycleViewRepeaterStrategy`, `@angular/cdk/fesm2022/scrolling.mjs:987`; cache of 20; only `context.$implicit` is swapped). The reused view keeps the stored `[ngModel]` value `true`, so the DOM box stays unticked |
| N-2 | partial (both) | `logicalDeletion` and the select-all bypass are fixed. The group-mode checkbox path has the same no-op as N-1 |
| N-3, N-4, N-5 | resolved (both) | Leftover: P-7 still cites `1664-1774` |
| R-1 / R2-1 | **confirmed severe** (both) | The fix-caused restore mechanism is ineffective. Both judges propose the same fix: write the native checkbox back (`checked = true` via `$event.target` or a `#cb` template ref, optional on the label path) in the flat and group checkbox paths. Drop the clone rebuild. Do **not** zero `cdkVirtualForTemplateCacheSize` (it would hit ~80 instances). Keep the CT on DOM `input.checked` |
| R2-2 | suggestion | The flat label path (`.html:60`) needs nothing; the native write must be skipped when there is no checkbox ref |

## Terminal state

Two fix rounds are exhausted and one severe finding (R-1/R2-1, the panel-deselect tick restore) remains open. Both judges agree on the fix. Escalated to the user for an explicit decision.

JUDGMENT: ESCALATED ⚠️

**User decision (2026-11-27):** "Apply the fix, go to tasks". Design revision 4 makes the native checkbox write the primary mechanism (R-1/R2-1, plus N-2's group checkbox path), drops the clone rebuild, rewrites P-10 from the recycle-strategy evidence, and corrects P-7's range. Annotation: **fixed, not re-judged** — R-1, R2-1, N-1, N-2. Execution evidence: the `pr-multi-select` CT asserts DOM `input.checked` in flat and group mode.
