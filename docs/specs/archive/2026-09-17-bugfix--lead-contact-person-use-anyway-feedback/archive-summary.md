# Archive Summary — Lead Contact Person "Use this name anyway" Completeness

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `bugfix/lead-contact-person-use-anyway-feedback` |
| Archive Date | 2026-09-17 |
| Mode / Depth | Bug · Lite |
| Driver | Santiago Sánchez (s.sanchez@cgiar.org) |
| Final Status | Done — both tasks `[x]`, Reviewer PASS on both attempts |

## 2. Original Spec Path

`docs/specs/bugfix/lead-contact-person-use-anyway-feedback/`

## 3. Archive Date

2026-09-17

## 4. Final Status

**Done.** Root cause confirmed, regression tests written RED-first, fix applied GREEN, both tasks reviewed PASS. No `test-report.md` or `validation-report.md` were produced as separate artifacts (Bug Mode Lite folded test/verification evidence into `execution.md`); this absence is accepted given the RED→GREEN evidence and two independent Reviewer PASS verdicts already on record.

## 5. Requirements Delivered

| Requirement | Status |
|---|---|
| `RES-R-1` — Count Lead Contact Person complete when `lead_contact_person` is a non-empty trimmed string, regardless of `lead_contact_person_data` | ✅ Delivered |

All four scenarios (free-text accepted, AD-selected, empty, in-progress typing) covered by regression tests `RES-TEST-1..4`.

## 6. Files Changed Summary

(from `execution.md`)

| File | Change |
|---|---|
| `rd-general-information.component.html` | `appFeedbackValidation [isComplete]` now evaluates `!!this.generalInfoBody.lead_contact_person?.trim()` |
| `ipsr-general-information.component.ts` | `isLeadContactPersonComplete` getter now evaluates `!!this.ipsrGeneralInformationBody.lead_contact_person?.trim()` |
| `rd-general-information.component.spec.ts` | Added `RES-TEST-1`/`RES-TEST-2` |
| `ipsr-general-information.component.spec.ts` | Added `RES-TEST-3`/`RES-TEST-4` |

No server or database changes.

## 7. Test Evidence Summary

- `rd-general-information.component.spec.ts`: 114/114 passed (GREEN)
- `ipsr-general-information.component.spec.ts`: 70/70 passed (GREEN)
- `ng lint --quiet`: clean
- RED phase confirmed before the fix (both `RES-TEST-1` and `RES-TEST-3` failed on pre-fix code)

## 8. Validation Summary

No standalone `validation-report.md`. Reviewer verdicts recorded in `execution.md`:

- `RES-T-1`: `STATUS: PASS` — tests correctly cover scenarios and edge cases, confirmed RED on current code.
- `RES-T-2`: `STATUS: PASS` — diff matches `RES-R-1`/`RES-DD-1`, tests and lint green.

No FAIL findings at any point.

## 9. Accepted Warnings Or Follow-Ups

None recorded. No incomplete tasks, no open WARN findings.

## 10. Historical Notes

- This bug reverted part of `b79779b49` (`P2-3663`), which had over-constrained the completeness check to require an Active Directory record. The design's Challenge Reversion (§5.2 of `design.md`) explicitly re-examined whether removing that constraint reopens the "premature completion while typing" defect it was meant to prevent, and confirmed it does not (`onSearchInput` still nulls `lead_contact_person` on every keystroke).
- Related domain doc: `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/CLAUDE.md` (Traps §60-62) already documented the `hasSelectedContact` vs `appFeedbackValidation` distinction this bug stemmed from.
