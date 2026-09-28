# Proposal — IPSR General Information: Lead contact person save guard parity with Results

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/ipsr-lead-contact-save-guard` |
| Slug | `ipsr-lead-contact-save-guard` — derived from free-text argument |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Status | approved (santiago.sanchez@cgiar.org, 2026-09-28) |
| Parent Spec | — |
| Depends on | none |
| Parallel-safe | yes (touches only `ipsr-general-information`; the open `bugfix/innovation-developer-prefill-stale-lead-contact` is bilateral-only) |
| Module | `ipsr` (client) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none yet — found during a parity review, 2026-09-28 |
| Reference implementation | `rd-general-information.component.ts:373-398` (`onSaveSection`, Results W1/W2) |
| Antecedents | `docs/specs/archive/2026-08-27-bugfix--lead-contact-person-search` (P2-3260, search pipeline survives "not found") · `docs/specs/archive/2026-09-17-bugfix--lead-contact-person-use-anyway-feedback` (RES-DD-1, "use this name anyway" counts as complete) |

## Intent

Make IPSR General Information save the Lead contact person under exactly the same rule as Results W1/W2: block only a name the user **typed and never picked**, on every portfolio, and never a name that was loaded or explicitly accepted with "use this name anyway".

## Problem / Current Behavior

Both screens render the same `<app-lead-contact-person-field>`, and the server writes both identically. The difference is the save guard in each consuming section:

| | Results W1/W2 (`rd-general-information:390`) | IPSR (`ipsr-general-information:208`) |
|---|---|---|
| Applies on | every portfolio | **P22 only** (`isP22() && …`) |
| Exempts a loaded / accepted name | yes — `!leadContactPersonField?.queryCameFromHydration` | **no** |

So IPSR fails in opposite directions per portfolio:

- **P25 (current portfolio): data loss.** The guard never runs, so a save while the user is mid-search sends `lead_contact_person: null` and the server overwrites the stored contact.
- **P22: unsaveable.** The guard blocks any `searchQuery && !selectedUser`, which includes a name accepted with "use this name anyway" (RES-DD-1) and a free-text name hydrated from the package.

## Proposed Outcome

| Situation | After the fix (IPSR P22 and P25, same as Results) |
|---|---|
| Typed a name, did not pick, pressed Save | Blocked, "not found in the directory" message shown, stored contact untouched |
| Picked a contact from the directory | Saves |
| "Use this name anyway" | Saves the free-text name |
| Free-text name loaded with the package, untouched | Saves, no error |
| Field empty | Saves (optional before 2026; completeness indicator unchanged) |

## Scope

- `onecgiar-pr-client` → `pages/ipsr/pages/innovation-package-detail/pages/ipsr-general-information/`:
  - `onSaveSection()`: drop the `isP22()` condition; add `@ViewChild(LeadContactPersonFieldComponent)` and the `!queryCameFromHydration` exemption, mirroring Results.
  - Template: pass `[guidanceAsTooltip]="guidanceAsTooltip()"` to the field (the signal already exists in the component; Results parity for the 2026 guidance presentation).
  - Fix the stale doc comment at `:56-58` that claims IPSR shares `validation_general_information_P25` (it does not — see OQ-1).
- `ipsr-general-information.component.spec.ts`: regression tests (red before, green after) and rewrite of the test that pins the P22-only rule (`:483`).
- `lead-contact-person-field/CLAUDE.md` "Traps": note that both consumers now share one guard rule. **No change to the field component itself.**

## Non-Goals

- **No server, SQL or migration change.** Both save endpoints already store the name and resolve the AD id identically.
- **No change to the IPSR green check** (`results-innovation-packages-validation-module.repository.ts`) — see OQ-1.
- No change to `lead-contact-person-field` behaviour, copy or layout.
- No change to Results W1/W2 or Bilateral.
- Not extracting a shared guard helper (see Option C).

## Affected Users, Systems, And Specs

| Affected | Detail |
|---|---|
| Users | IPSR reporters editing Innovation Package General information (P22 and P25) |
| Code | `ipsr-general-information.component.{ts,html,spec.ts}`; `lead-contact-person-field/CLAUDE.md` (doc only) |
| Server | none |
| Specs | Completes the flow that RES-DD-1 opened ("use this name anyway") for IPSR's save step; does not modify either archived spec |

## Visual Reference

- Source: None
- Location: —
- Notes: No new UI. The error message, the "use this name anyway" button and the ⓘ tooltip all exist; only when the save is blocked changes, plus the guidance moving into the ⓘ from 2026 as on Results.

## Bug Diagnosis

### Observed Symptom

- **P25:** a Lead contact person already stored on an Innovation Package disappears after saving General information, if the user had started typing over it without picking a result.
- **P22:** after "use this name anyway", or with a free-text name loaded from the package, Save keeps showing "not found in the directory" and never saves.

### Reproduction Steps

**A — P25 data loss**
1. Open a P25 Innovation Package whose General information has a Lead contact person stored as free text, or clear a picked contact with ✕.
2. Type a few characters in the field; do not pick a result.
3. Press Save.
4. **Expected (Results behaviour):** save blocked, error shown, stored contact kept. **Actual:** save goes through, `lead_contact_person: null` is sent and the stored contact is erased.

**B — P22 blocked**
1. Open a P22 Innovation Package in an editable phase.
2. Type a name with no AD match (≥4 chars) → "not found… use this name anyway".
3. Click "use this name anyway", then Save.
4. **Expected:** saves the free-text name. **Actual:** blocked, error shown again.

### Root Cause (confirmed)

Verified in code, no guesswork:

1. **Typing nulls both payload keys immediately.** `LeadContactPersonFieldComponent.onSearchInput` (`lead-contact-person-field.component.ts:174-181`) sets `body.lead_contact_person = null` and `body.lead_contact_person_data = null` on every keystroke. The field relies on the consuming section's save guard to stop that half-typed state from being saved.
2. **IPSR's guard is gated to P22.** `ipsr-general-information.component.ts:208`: `if (this.fieldsManagerSE.isP22() && searchQuery.trim() && !selectedUser)`. On P25 the condition is always false, so the save proceeds with the nulls.
3. **The server writes them as-is.** P25 `ipsr_general_information.service.ts:185-186` (and P22 `result-innovation-package.service.ts:754-755`) set `lead_contact_person: req?.lead_contact_person` and `lead_contact_person_id: leadContactPersonId` (null without `_data.mail`), with no "was this field sent" check.
4. **IPSR's guard ignores `queryCameFromHydration`.** `acceptTypedNameAnyway()` (`:233-244`) and hydration (`ngOnChanges`, `:125-134`) keep `selectedUser = null` and mark `queryCameFromHydration = true`. Results exempts that state (`rd-general-information.component.ts:393`); IPSR does not, so on P22 legitimate names are blocked.

History: Results carried the same `!isP25` carve-out until it was replaced by the `queryCameFromHydration` exemption (rationale recorded in `rd-general-information.component.ts:376-389` and `lead-contact-person-field/CLAUDE.md` Traps). IPSR never received that fix.

### Impact & Scope

- **Data integrity (P25):** silent loss of a stored Lead contact person, name and AD id. Since the IPSR green check requires a non-empty name, the section can also flip back to incomplete without the user noticing why.
- **Usability (P22):** a section that cannot be saved while the field holds a legitimate free-text name.
- Contained to IPSR General information. Results and Bilateral already use the correct rule or autosave; the field component is shared but unchanged.
- No security implication.

### Fix Strategy

Route: **`/akili-specify` (Lite) in Bug Mode** — logic change with a data-loss path, so a regression test is mandatory (red before, green after). The smallest safe correction is to copy the Results guard verbatim into IPSR's `onSaveSection`.

## Approach Options

| # | Approach | Trade-off |
|---|---|---|
| A | Only drop `isP22()` | **Wrong.** Fixes P25 data loss but extends P22's false block to P25: "use this name anyway" and hydrated free-text names become unsaveable everywhere |
| B | Mirror the Results guard: drop `isP22()` + `@ViewChild` + `!queryCameFromHydration` | Fixes both directions; identical rule on both screens; one component, no contract or server change |
| C | Extract the guard into a shared helper (e.g. on `UserSearchService` or the field) used by Results, IPSR and future consumers | Removes the duplication that caused the drift, but touches Results and a shared service for a Lite bugfix and widens the regression surface. Better as a follow-up if a third consumer needs it |

## Recommended Approach

**Option B.** It is the smallest change that closes both failure directions, and it reuses a rule that is already proven in production on Results W1/W2 with the reasoning written down. Option C stays as a follow-up suggestion, not part of this spec.

## Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R1 | An existing IPSR spec test pins the buggy rule (`:483` "should skip contact validation when isP22 is false"). `:495` (blank query saves) stays valid under the new rule | Invert `:483` to the new rule in the same task; record the rewrite in `execution.md` so it is not read as weakening tests |
| R2 | `@ViewChild` resolves only once the field is rendered; `onSaveSection` could run before | Same exposure as Results (optional chaining → treated as "not hydrated", so a typed-and-unpicked name still blocks). Cover it with a test |
| R3 | `UserSearchService` is a root singleton; state can leak from a previously opened result/package | Pre-existing and shared with Results; out of scope. Tests must reset the mock state per case |
| R4 | Per memory rule, run only the affected specs (`--testPathPattern`), never the full suite | Recorded for `/akili-execute` |
| OQ-1 | **Green check divergence (out of scope).** IPSR validation requires only a non-empty `lead_contact_person`, in every phase and portfolio (`results-innovation-packages-validation-module.repository.ts:30,157`). Results P25 `validation_general_information_P25` requires `lead_contact_person_id IS NOT NULL` (migration `1762528725798:598`; live DB version reportedly gated `phase_year >= 2026`, per `result.repository.ts:87-88`). So "use this name anyway" turns IPSR green but may leave Results 2026 grey | Verify the live function (`SHOW CREATE FUNCTION validation_general_information_P25;`) and get a PO decision. Separate spec if SQL changes |
| OQ-2 | Ticket: is a Jira item wanted for traceability? | Ask the owner before `/akili-specify`; not blocking |

## Success Criteria

1. IPSR P25: typing without picking and pressing Save is blocked with the "not found" message, and the stored contact is unchanged.
2. IPSR P22 and P25: "use this name anyway" followed by Save stores the free-text name.
3. IPSR P22 and P25: a free-text name loaded with the package saves without an error.
4. Picking a contact and clearing the field keep working as today.
5. From 2026, the field guidance shows in the ⓘ tooltip, as on Results.
6. New regression tests fail on the current code and pass after the fix; affected specs green; `ng lint --quiet` clean.

## Next Step

```text
/akili-specify bugfix/ipsr-lead-contact-save-guard
```

Bug Mode, Lite depth, with regression tests for reproductions A and B written first (red), then the guard change (green).
