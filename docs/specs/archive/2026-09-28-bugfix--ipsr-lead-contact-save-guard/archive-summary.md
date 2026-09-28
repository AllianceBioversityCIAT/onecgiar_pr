# Archive Summary — IPSR Lead contact person save guard parity

**Outcome:** delivered. IPSR General information now saves the Lead contact person under the same rule as Results W1/W2 on every portfolio:
- A name that was typed and never picked blocks the save.
- A picked contact, a name accepted with "use this name anyway", a name loaded with the package, and a blank field all save.
- P25 no longer erases a stored contact when the user saves mid-search, and P22 can save free-text names again.
- From 2026 the field's guidance shows in the ⓘ tooltip.

The change is client-only.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/ipsr-lead-contact-save-guard/` |
| Archive Date | 2026-09-28 |
| Branch | `qa-development-2026-ss` (spec branch) |
| Final Status | **Done**. 2/2 tasks `[x]`, validation PASS |
| Depth · Mode | Lite · Bug |
| Ticket | none (OQ-2 open) |

## Requirements Delivered

| Req | Status | Proof |
|---|---|---|
| `IPSR-LCG-R-1` typed-unpicked blocks save, P22 + P25 | ✅ | Jest 1.1 / 1.2 / DD-2 + manual reproduction A |
| `IPSR-LCG-R-2` picked / accepted / loaded / blank save | ✅ | Jest 2.1 (incl. real accept → payload) / 2.2 / 2.3 + manual reproduction B |
| `IPSR-LCG-R-3` 2026 guidance in ⓘ | ✅ | Jest 3.1 on/off + dev build |

## Files Changed

| File | Change |
|---|---|
| `…/ipsr-general-information/ipsr-general-information.component.ts` | `@ViewChild(LeadContactPersonFieldComponent)`; guard = Results expression (no `isP22()`); doc comment corrected |
| `…/ipsr-general-information/ipsr-general-information.component.html` | `[guidanceAsTooltip]="guidanceAsTooltip()"` |
| `…/ipsr-general-information/ipsr-general-information.component.spec.ts` | Regression cases (T-1) + 2 payload cases (`/akili-test`, **uncommitted**) |
| `custom-fields/lead-contact-person-field/lead-contact-person-field.component.html` | Comment only |
| `custom-fields/lead-contact-person-field/CLAUDE.md` | Traps: one save-guard rule shared by Results and IPSR; `Verified:` re-stamped |

Commit `bb8697f98`: +196 / −10, of which about 8 lines are production code.

## Test Evidence

- **RED before the fix:** 6 of 98 tests failed, exactly the set the tasks predicted.
- **GREEN after the fix:** 105/105. The `/akili-test` payload cases bring it to **107/107** across 2 scoped suites.
- **Lint and build:** lint is clean, and the dev build passes.
- **Manual check:** reproductions A and B were verified by the user on a local build.

## Validation

`validation-report.md`: **PASS, 0 FAIL**.
- **V-1, fixed:** the T-2 Definition of Done boxes in tasks.md were unticked; they are now ticked.
- **V-2, fixed:** execution.md said "within budget"; it now says the tripwire fired and the user accepted it.
- **V-3, accepted as a follow-up:** OQ-1 is still open.
- **Caveat:** the auditor was not independent of the author (same model family).

## Accepted Warnings / Follow-ups

- **OQ-1, green-check divergence.** IPSR validation requires only a non-empty `lead_contact_person`, while Results P25 requires `lead_contact_person_id`. Next steps: run `SHOW CREATE FUNCTION validation_general_information_P25;`, get a PO decision, and open a separate SQL spec if needed.
- **OQ-2:** no Jira ticket yet.
- **Budget tripwire:** +196 LOC against ~120. Accepted, because the overrun is tests and comments.
- **Advisories:**
  - The guard is duplicated in two consumers. Proposal Option C, a shared helper, is the structural fix if a third consumer appears.
  - One old test title still mentions `isP22`.
  - The 2.1 and 2.2 test bodies are identical.

## Historical Notes

- Results had already swapped its `!isP25` carve-out for the `queryCameFromHydration` exemption. IPSR never received that fix, and that gap caused this bug. The field's `CLAUDE.md` now says any change to the rule must be made on both consumers.
- The old test `should skip contact validation when isP22 is false` asserted the defect. It was inverted into Scenario 1.1, and the change is recorded in execution.md.
