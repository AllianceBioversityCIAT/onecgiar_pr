# Archive Summary — bugfix/bilateral-save-draft-footer

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/bilateral-save-draft-footer/` |
| Archive Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Depth | Lite (Bug Mode) |
| Final Status | **Resolved** — `BSF-T-2` shipped; `BSF-T-1` superseded (Pivot) |

## 2-3. Original Spec Path / Archive Date

`docs/specs/bugfix/bilateral-save-draft-footer/` → `docs/specs/archive/2026-10-15-bugfix--bilateral-save-draft-footer/`. 2026-10-15.

## 4. Final Status

| Task | Status | Attempts | Reviewer rounds | Outcome |
|---|---|---|---|---|
| `BSF-T-2` | `[x]` PASS | 2 | 2 (FAIL → PASS) | Shipped (`b6c95e79d`, merged to `performance-refactor` `5883e466e`) |
| `BSF-T-1` | `[~]` SUPERSEDED | 2 (both checkpointed, not FAIL) | 0 | Pivot — original premise (footer button CSS clipping) disproven; real defect (field-card save-pill truncation) moved to `docs/specs/bugfix/field-card-save-pill-truncation/` |

## 5. Requirements Delivered

`BSF-R-2`, `BSF-R-3`, `BSF-AC-2`, `BSF-AC-3` (stale-error-flag fix) — delivered. `BSF-R-1`/`BSF-AC-1` (footer button clipping) — **not delivered under this spec**; superseded, see Pivot Record.

## 6. Files Changed Summary

| File | Change |
|---|---|
| `bilateral-auto-save.service.ts` | +`pendingStatusKeysFor`, `hasErrorForFields`, `lastErrorMessageForFields`, Evidence special-case |
| `bilateral-auto-save.service.spec.ts` | +falsifier/disqualifier/Evidence-gap tests |
| `bilateral-result-creator.component.ts` | `triggerManualSave()`/`waitForSectionSave()` use scoped checks |
| `bilateral-result-creator.component.spec.ts` | +mechanism-lock test |
| `bilateral-result-creator/CLAUDE.md` | re-stamped, documents the scoping |

`bilateral-result-creator.component.scss` — a speculative CSS change was written, investigated across two Implementer attempts (12 column widths, screenshot-verified, pre- and post-fix), found to answer a premise that doesn't hold, and **reverted**. No change shipped for `BSF-T-1`'s original scope.

## 7. Test Evidence Summary

`BSF-T-2`: Jest 22/22 (service) + 153/153 (component), independently reproduced by the Leader across both attempts; lint clean; build succeeded. `BSF-T-1`: no test shipped (premise disproven before a real fix existed to test).

## 8. Validation Summary

`BSF-T-2`: two independent Reviewer rounds, second one finding and the Implementer fixing a real gap (Evidence section bypassing the new scoping mechanism), independently re-verified by the Reviewer via its own grep. `BSF-T-1`: no Reviewer round reached — two Implementer checkpoints both honestly reported "cannot reproduce," correctly triggering a Pivot instead of a false PASS.

## 9. Accepted Warnings Or Follow-Ups

- `docs/specs/bugfix/field-card-save-pill-truncation/` — the new, correctly-scoped spec for the real defect this ticket's "Save Changes incomplete display" symptom was actually describing.
- A pre-existing, deliberately-out-of-scope gap noted by the `BSF-T-2` Reviewer: Evidence's upload-phase race (a stale `'error'` status could still misreport a save mid-upload) — not introduced or worsened by this spec, not fixed by it either.

## 10. Historical Notes

This spec is a genuine example of the Pivot Protocol working as designed: two methodical, screenshot-verified Implementer attempts on `BSF-T-1` found **no defect** where the spec's Premise Ledger (citing a secondary source — a `CLAUDE.md` narrative about a *different*, already-fixed overflow bug) assumed one existed. Rather than burn a third attempt or ship an unverified "fix," the Leader stopped, escalated, and — once the user supplied real screenshots — found the ACTUAL defect was a different, now-confirmed CSS regression the Leader's own earlier work (`PCP-T-1`, same session) had introduced. See `docs/specs/kaizen/bugfix--bilateral-save-draft-footer.md` for the retrospective.
