# Archive Summary — Bilateral lead W3/bilateral project shown apart from contributors

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bilateral/lead-project-not-in-contributors/` |
| Archive Path | `docs/specs/archive/2026-10-02-bilateral--lead-project-not-in-contributors/` |
| Archive Date | 2026-10-02 |
| Branch | `qa-development-2026-ss` (spec branch: shared-file sync recorded as pending) |
| Depth | Lite |
| Final Status | ✅ **Delivered.** T1 PASS on the first attempt; the manual check was confirmed by the user |

## Outcome

The bilateral **Contributors & partners** section now shows the lead project once, in a read-only **"Lead W3/bilateral project"** field. The field sits above "Contributing W3/bilateral projects", and the lead is no longer shown there as a chip or as an option. The change is display only: every save still sends the lead with `is_lead: true`. W1/W2 results are untouched.

## Requirements Delivered

| ID | Title | Status |
|---|---|---|
| LPC-R-1 | Lead project shown apart | ✅ |
| LPC-R-2 | Lead project not repeated under contributors | ✅ |
| LPC-R-3 | Stored lead and PATCH unchanged | ✅ |
| NFR-1 | No new tokens; reuses the "Lead center" read-only pattern | ✅ |
| NFR-2 | `writeValue` model ⊆ options | ✅ |

## Files Changed

All files are under `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/`.

| File | Change |
|---|---|
| `section-contributors.component.ts` | +44: `leadProjectIdSig`, `leadProjectLabel`, `contributingProjectOptions`, `contributingProjectDisabledOptions`, `displayedContributingProjectIds` |
| `section-contributors.component.html` | New read-only block; picker and chips rebound to the lead-free views |
| `section-contributors.component.spec.ts` | +136: `describe('LPC · …')` with tests a–h, and the markup-contract `[options]` line |
| `CLAUDE.md` | LPC trap note + `Verified:` stamp |

## Test Evidence

| Check | Result |
|---|---|
| Jest `--testPathPattern=section-contributors` | 230 / 230 green (incl. P2-3859, P2-3864, BCT, readonly suites) |
| `ng lint --quiet` | clean |
| Manual check, manual result (lead `B-A1723`) | ✅ field shown above the picker · lead not in chips · lead not in dropdown · persists after save + reload |

## Validation Summary

| Item | Status |
|---|---|
| `test-report.md` | Not produced. Accepted: Lite depth; tests a–h were written in T1 |
| `validation-report.md` | Not produced. Accepted: the user's manual HITL check is the validation of record |
| Reviewer | PASS, attempt 1, with 4 non-gating advisories |

## Accepted Warnings / Follow-ups

- **Budget:** about 60 production LOC against ~35 budgeted, mostly comments. Accepted by the user on 2026-10-02.
- **Advisory, RELIABILITY:** if the result switches while the component stays mounted, there is a window where the hidden lead and the re-add guard can disagree. P2-3864 has the same exposure. Recorded only; not tasked.
- **Advisory, READABILITY:** the folder `CLAUDE.md` `## Tests` count ("157 casos") is stale.
- **Out of spec:** "Unsaved changes" appears on any click inside `app-field-card`. This is pre-existing field-card behaviour and not caused by this spec.

## Historical Notes

- Mirror of P2-3864 (`155f1c091`, the lead Center).
- The spec wording "typical API import" for the no-lead case was wrong. The user's DB query showed every API-ingested result has a lead row. The wording and the manual-check case were corrected after the PASS; the behaviour did not change. See execution.md.
