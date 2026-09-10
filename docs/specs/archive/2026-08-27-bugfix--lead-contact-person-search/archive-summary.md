# Archive Summary — `bugfix/lead-contact-person-search`

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/bugfix/lead-contact-person-search/` |
| **Depth** | Lite |
| **Owner** | santiago.sanchez@cgiar.org |
| **Ticket** | P2-3260 |
| **Branch** | `qa-development-2026` (spec branch — default branch is `master` per root `CLAUDE.md`) |

## 2. Original Spec Path

`docs/specs/bugfix/lead-contact-person-search/`

## 3. Archive Date

2026-08-27

## 4. Final Status

✅ **Complete.** 1/1 task (`LCP-T-1`) `[x]`, Reviewer-PASSed (after two documentation-gap reconciliations, no code rework needed), manually verified by the spec owner against a live dev server and the real AD search backend. Committed as `079d80091`.

## 5. Requirements Delivered

| Requirement | Delivered |
|---|---|
| `LCP-R-1` — search pipeline survives zero-match/error searches | ✅ |
| `LCP-R-2` — error path renders the existing empty-result UX | ✅ |
| `LCP-AC-1` — zero-match then valid search in same instance | ✅ (Cypress CT, red-before/green-after) |
| `LCP-AC-2` — survives 3+ consecutive zero-match searches | ✅ (Cypress CT) |
| `LCP-AC-3` — transient error renders standard empty state | ✅ (Cypress CT + Jest) |

`LCP-OQ-1` ("--" symptom for <4-char queries) remains open — deferred to live re-verification, tracked as a follow-up below, not blocking.

## 6. Files Changed Summary

(from `execution.md`)

- `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.ts` — added `catchError(() => of({ response: [] }))` inside the search `switchMap`, imports for `of`/`catchError`.
- `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.cy.ts` — 3 new Cypress CT regression cases (`LCP-AC-1..3`).
- `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/lead-contact-person-field.component.spec.ts` — one pre-existing assertion updated (`showResults` `false`→`true`) to match the design-mandated behavior; reconciled in `requirements.md`/`tasks.md`.

No server, migration, or API contract changes. No i18n keys. No bilateral/platform-report payload touched.

## 7. Test Evidence Summary

- Cypress CT (`lead-contact-person-field.cy.ts`, new spec): 5/5 passing; confirmed red-before-fix (2 of 5 failing without `catchError`) / green-after.
- Jest unit spec (`lead-contact-person-field.component.spec.ts`): 54/54 passing.
- Full `test:ct` suite (47 files / 431 tests): 27 files / 110 tests failing both pre- and post-fix (pre-existing `.contract.cy.ts` harness breakage, unrelated to this diff — confirmed set-identical on a representative 3-file baseline comparison).
- No separate `test-report.md` was produced — this Lite-depth bugfix's testing was embedded directly in `LCP-T-1`'s execution (per `requirements.md`'s "Defect Classes → Verification Mapping" and `tasks.md` §5 Test Plan), not run as a distinct `/akili-test` phase. **Accepted as sufficient** given the spec's Lite depth and single-task scope.

## 8. Validation Summary

No separate `/akili-validate` pass was run and no `validation-report.md` exists — **accepted**, consistent with this spec's Lite depth (single task, no cross-cutting acceptance-criteria sweep beyond what the Reviewer's spec-conformance audit already covered in `execution.md`). The Reviewer's audit (attempt 1) is the validation evidence: code found fully spec-conformant against `requirements.md`/`design.md`; all FAIL issues were documentation/evidence gaps, resolved without any code rework.

## 9. Accepted Warnings Or Follow-Ups

| Item | Type | Note |
|---|---|---|
| `LCP-OQ-1` | Follow-up | "--" symptom for <4-char queries — re-verify live now that this fix has shipped; file a fresh ticket only if still reproducible. |
| `.contract.cy.ts` harness breakage | Follow-up | ~26 of 47 `custom-fields/` component specs fail pre-existing, unrelated to this fix — masks regression signal for the whole folder. Recommend a separate ticket. |
| CT `settle()` helper reliability | Advisory (Reviewer) | Fixed `cy.wait(700)` coupled to the component's `debounceTime(500)` — flake risk if debounce timing changes. Suggested `cy.clock()`/`cy.tick(500)` as a future improvement. |
| `design.md` §13 copy note | Advisory (Reviewer) | The "not found in directory" error copy is now shown on a genuine network-outage 404 too (same as any zero-match) — more assertive than §13's "silently show no results" phrasing. Worth a one-line note if `design.md` is revisited. |

## 10. Historical Notes

- The Reviewer's first-pass `FAIL` (3 issues) found the **code fully spec-conformant** — all 3 issues were gaps in the task spec's own wording/evidence bar, not implementation defects:
  1. `tasks.md`'s DoD said the Jest spec must pass "unmodified", contradicting `design.md` §6.2's own mandated behavior. Resolved by amending `requirements.md`/`tasks.md` text, not the code.
  2. `tasks.md`'s DoD required a fully green `test:ct` run; the actual suite had 27/47 pre-existing unrelated failures. Resolved via a representative-sample baseline comparison (`git stash`) proving the failure set is unchanged by this diff.
  3. Manual browser verification was outstanding — escalated to the user, who verified it themselves against a live dev server and confirmed matching behavior.
- No `## Pivot Record` was needed — none of the above overturned approved technical direction; all were spec-wording reconciliations.
