# Archive Summary — `bilateral/review-drawer-readonly-rendering`

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bilateral/review-drawer-readonly-rendering/` |
| Archive date | 2026-09-21 |
| Depth | Lite |
| Approval Mode | `pre-approved` |
| Branch | `qa-development-2026` (spec branch — not apply-capable) |
| Baseline commit | `ecff181aa` |
| Commits | `d55948a4c`, `c228245e8`, `f0d2bb0b3` |
| Origin | Escalated from `/akili-quick` — failed the triviality gate on "no behavior change" and "small and local" |
| Parent work | `docs/specs/archive/2026-09-08-changes--sp-bilateral-review-tab/` (P2-3154) |

## 2. Final Status

**Delivered and verified.** All tasks done, both automated gates green, HITL performed.

The bilateral Review drawer already *enforced* that a Science Program reviewer may edit only
Theory of Change Alignment. What was missing is that the locked fields still **looked** like form
controls: they were passed `[disabled]`, which blocks input but leaves a rendered form field. The
`pr-*` controls choose their read-only branch from `readOnly`, never from `disabled`. That
asymmetry was the whole defect, and P2-3154 had deliberately deferred it.

21 `[readOnly]` bindings were added beside the existing `[disabled]` across 5 templates. Purely
additive — `[disabled]` remains the functional block, so a wrong `[readOnly]` can only ever be
cosmetic, never an unlock.

## 3. Requirements Delivered

| ID | Requirement | Status |
|---|---|---|
| RDR-R-1 | Locked fields render as read-only text | ✅ `RDR-T-1` + `RDR-T-2` + HITL #2/#4/#5/#6 |
| RDR-R-2 | Platform Admin editing unchanged | ✅ no `.ts` in the diff; HITL #9 confirmed live |
| RDR-R-3 | The sweep is complete | ✅ `RDR-T-1` static invariant, falsifier executed |
| RDR-NFR-1..4 | No network/token change, lint + build clean, no suite regression | ✅ |

## 4. Files Changed Summary

| File | Change |
|---|---|
| `result-review-drawer.component.html` | +2 `[readOnly]` (card 2 textarea, card 3 input) |
| `policy-change-content.component.html` | +2 (`pr-select`) |
| `cap-sharing-content.component.html` | +4 (`pr-input`) |
| `inno-dev-content.component.html` | +2 (`pr-select`, `pr-textarea`) |
| `innovation-use-content.component.html` | +11 (1 `pr-select`, 10 `pr-input`) |
| `result-review-drawer.readonly-bindings.spec.ts` | **new** — static completeness gate (6 tests) |
| `result-review-drawer.readonly-render.cy.ts` | **new** — rendered proof (8 tests) |
| `result-review-drawer/AGENTS.md` | §3b's "deliberately NOT fixed" paragraph replaced — it had become false |
| `bilateral-review/CLAUDE.md` | CT repair record (`f0d2bb0b3`), `Verified:` re-stamped |
| `bilateral-review.cy.ts`, `…approve-tooltip.cy.ts` | CT repair (`f0d2bb0b3`) — see §7 |

**Deliberately untouched:** every role predicate, `canEditInDrawer()`, `canEditDataStandards()`,
the admin bypass, the `rolesSE.readOnly` flip, card 1, and `pr-radio-button` / `pr-range-level`
(both already derive a locked look from `disabled`; `pr-range-level` has no `readOnly` input).

## 5. Test Evidence Summary

No `test-report.md` — tests were authored inside the tasks, and the evidence lives in
`execution.md`. **Accepted.**

| Gate | Result |
|---|---|
| `ng build --configuration development` | exit 0 — the compiler gate; `tsc --noEmit` cannot see templates |
| Module Jest | 15 suites / 534 tests |
| `ng lint --quiet` | clean |
| `result-review-drawer.readonly-bindings.spec.ts` | 6/6 |
| `result-review-drawer.readonly-render.cy.ts` | 8/8 |
| Whole-module Cypress CT | 80/80 |

**Three falsifiers executed, observed red, reverted** — one per gate shape (`pr-input`,
`pr-textarea`, and the static sweep). Both gates found something real on their first run; see §7.

## 6. Validation Summary

No `validation-report.md` — `/akili-validate` was not run. **Accepted**, on this evidence:

- Two independent Reviewer passes (different model from the implementer), both **PASS**, one per task.
- HITL verification against the running app as a Science Program reviewer: checks 1–6, 8, 9 **PASS**.
- `RDR-R-2` (admin unchanged) confirmed live, not merely by diff inspection.

## 7. Accepted Warnings & Follow-Ups

| # | Item | Disposition |
|---|---|---|
| 1 | **HITL check 7 not exercised live** — no result in the SP01 dataset has an empty locked field, so the `Not applicable` fallback was only proven by `RDR-T-2` case (b3) with a synthetic `null` | Accepted. Recorded in `tasks.md` §4 and `execution.md` |
| 2 | **Two read-only idioms now coexist in cards 2–4** — inputs/selects/textareas render as text, `pr-radio-button` and `pr-range-level` render as greyed-but-still-control-shaped (7 disabled radios measured in card 2). They are inert but still *look* pressable | Accepted by `design.md` DD-2. Unifying them touches shared controls used by every non-editable screen — separate work |
| 3 | **Budget exceeded**: ~396 LOC against ~145 | Implementation came in *under* (31 vs ~21); the gates cost 3× their estimate. Recorded, not absorbed silently. Feeds a recurrence, see the kaizen entry |
| 4 | `elementsOf()` in the static gate is HTML-comment-blind, so a dead commented-out `app-pr-input` counts toward the expected total | Reviewer ADVISORY. Fail-safe direction only (spuriously red, never spuriously green). Not fixed |
| 5 | Drawer `:525` "Add Evidence Link" binding is inert by construction (nested in `@if (canEditDataStandards())`) | Kept deliberately so the invariant stays mechanical. Documented in `design.md` §8.2 |

## 8. Historical Notes

**This spec exists because `/akili-quick` refused it.** The request arrived as a quick change; the
triviality gate failed on two criteria (behavior change, and 21 bindings across 6 files rather than
≤20 LOC in one). The escalation was correct — the work turned up a permission question the user had
to settle (admin bypass: kept) and two vacuous-gate defects.

**Both gates caught a real defect on their own first run, before any code was reviewed:**

1. `RDR-T-1` initially demanded the `readOnly` predicate equal the `disabled` predicate and went red
   on three `innovation-use-content` fields already pinned `[readOnly]="true"`. The invariant was
   corrected to "at least as strict".
2. `RDR-T-2` was **vacuous** on its first run. `RolesService._readOnly` starts `true` and every
   `pr-*` control ORs it in, so the CT harness rendered read-only regardless of the binding under
   test — the "locked" cases were passing against the global. Only the editable falsifier cases
   going red exposed it. A suite with positive cases only would have shipped green proving nothing.

**The D4 risk was measured, not merely accepted.** `requirements.md` §8 recorded "a `pr-select`
paints `Not provided` because its catalog has not loaded" as an accepted blind spot with no
automated gate. HITL opened the drawer at the earliest possible moment after mount and sampled at
0.8s / 2s / 5s / 9s: the labels were present in every sample. The drawer's own
`isLoadingInformation` gate covers the catalog fetch. The risk stays recorded — it was worth
considering — but it is now measured as not reachable by this path.

**A third commit (`f0d2bb0b3`) repaired 12 CT gates this spec did not break.** The
`bilateral-review` suite had drifted to 11/48 red plus 1/3 in the approve-tooltip spec. Verified
pre-existing by re-running at the reverted tree (identical counts), then fixed: all four root
causes were stale gates or harness geometry, and **no app code was wrong**. Details in
`bilateral-review/CLAUDE.md` § "CT repair 2026-09-21".
