# Module Spec — `bilateral-status-dropdown-overlay` — `design.md`

---

## 1. Summary

One client-only, single-attribute template removal, no server/API/CSS changes: remove `[expandSpaceOnOpen]="true"` from the Status `app-pr-select` in `type-policy-change.component.html`. The overlay itself is unaffected — it never depended on this flag.

Links: `requirements.md` (same folder).

---

## 1A. Premise Ledger

**Count:** 5 rows — 5 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** none fire. No user action/branch point is added or changed (`live-path` — this removes an input, it doesn't change which code a click reaches); no shared state/service/lifecycle is touched (`shared-state`); no exported symbol, DOM hook, event, or stored field changes (`consumer` — the removed attribute is a template-local input to a component already rendering without it by default everywhere else in the app). `Blast-radius triggers: none apply — pure attribute removal, no branch/state/contract change.`

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | Status's `app-pr-select` carries `[expandSpaceOnOpen]="true"`; Policy type's does not | `location` | `type-policy-change.component.html:69-79` vs `:48-57`, quoted by scout, confirmed against the current file (post this session's two prior specs' edits) | `52d4b1ad5` | `BSD-R-1`'s target site is wrong |
| P-2 | `app-pr-select`'s options overlay is always `position: absolute`, independent of `expandSpaceOnOpen` | `other` | `custom-fields.scss:116-144` (`.options`), `:104-114` (`:focus-within` reveal), quoted by scout | `52d4b1ad5` | Removing the flag could break the overlay itself; re-diagnose before removing |
| P-3 | `expandSpaceOnOpen` renders a separate, normal-flow spacer div whose height animates 0→300px on open, which is the push-down mechanism | `other` | `pr-select.component.html:110-111`, `pr-select.component.scss:84-94`, quoted by scout | `52d4b1ad5` | `BSD-DD-1`'s mechanism claim is wrong |
| P-4 | No other current call site of `expandSpaceOnOpen` exists in the app | `existence` (negative) | Repo-wide grep across `src/`, run by scout — only hit is the Status field's usage plus the prop's own implementation/tests; two historical usages (`user-management.component.html`) were explicitly removed in `5eaa011023b` and by later component replacement | `52d4b1ad5` | Another field relies on this flag; removing it there too (out of scope here) or leaving this one alone needs reconsideration |
| P-5 (consumer) | No existing test asserts on `.expandable-space`'s presence/height for the Status field; `cypress/e2e/bilateral-policy-change-mds.cy.ts` and the prior specs' `type-policy-change.component.spec.ts` tests assert label/presence/order, not this behavior | `consumer` | Scout confirmed via read of `pr-select.component.spec.ts` (sets the flag only as incidental setup for unrelated overlay-repositioning tests, never asserts the push behavior) and a grep for `expandSpaceOnOpen`/`expandable-space` across `cypress/` and `*.spec.ts` | `52d4b1ad5` | A hidden consumer exists; the new regression test and the removal itself need to account for it |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/` (template + spec only).
- **Server modules touched:** none.

### 2.2 Sequence / interaction

No new interaction — removes a template input; the overlay-open interaction (`:focus-within`) is unchanged.

---

## 2.3 Reversion Challenge (Step 2.3)

**Trigger:** this removes an existing attribute from already-shipped markup — technically a reversion of *something* the codebase currently does.

**Challenge — "what does removing this break?"**

- The attribute's only confirmed effect (P-3) is the push-down spacer — exactly the defect being fixed, not a feature anyone relies on.
- No commit message, test, or `CLAUDE.md` note anywhere ties this flag's presence on Status to a deliberate rationale (requirements.md §2's git-history account: introduced app-wide, reverted everywhere else within days, reappeared on Status inside an unrelated commit with zero explanation).
- The flag's secondary effect — `isDropdownOpen`-gated "close on any document click" wiring (confirmed by the earlier scout pass this session) — is redundant with the `:focus-within`/`remove_focus` mechanism every other `app-pr-select` (including Policy type) already uses to close correctly without this flag.

**Outcome:** no functional breakage identified. Proceed with the removal as specified.

---

## 3-11. Data Model / API / Server / Security / Performance / Observability / Backwards Compatibility

None affected — pure attribute removal, no server, no payload, no migration.

---

## 6. Frontend Plan

### 6.2 Components & services

- **`type-policy-change.component.html`:** remove the `[expandSpaceOnOpen]="true"` line from the Status `app-pr-select` block. No other line in that block changes. No TS change — `onFieldChange()`, `statusOptions`, `[(ngModel)]="body.status_amount"` all stay exactly as they are.

### 6.3 Design system usage

No new tokens, no component change. `app-pr-select` itself is untouched — only this one field's usage of one of its optional inputs changes.

---

## 10. Testing Plan

- Extend `type-policy-change.component.spec.ts` with a test asserting that with the Status field's dropdown open (however `isDropdownOpen`/its driving state is exposed — read the component to confirm the right trigger), no `.expandable-space` (or equivalent) element renders within the Status field's host, while confirming the overlay options panel itself still renders/positions correctly.
- Re-run `cypress/e2e/bilateral-policy-change-mds.cy.ts` and the prior specs' `PCL-T-2`/`PCL-AC-3`/`PCP-T-1` tests to confirm unaffected (per Premise Ledger P-5).

---

## 12. Design Decisions

### `BSD-DD-1` — Remove `expandSpaceOnOpen` from Status rather than fixing the flag itself

- **Context:** the flag's mechanical effect (a redundant, normal-flow, height-animating spacer) is the push-down bug; the overlay itself never depended on it.
- **Decision:** remove the single attribute from Status's template usage. Leave `app-pr-select`'s `expandSpaceOnOpen` input itself untouched — it's a real, if currently-unused, capability of the shared component, not something this bugfix owns.
- **Alternatives considered:** deprecate/remove the `expandSpaceOnOpen` input from `app-pr-select` entirely, since it has no other current users. Rejected — out of scope for a Lite bugfix targeting one field's reported symptom; removing a shared component's public input is a larger, separately-scoped change that deserves its own review if anyone proposes it.
- **Consequences:** none — the flag remains available (unused) on the shared component for any future, deliberate use case.

---

## Budget (Step 2.4)

- **Expected tasks:** 1.
- **Expected LOC:** ~10-15 (one attribute line removed + one new test).
- **Expected review rounds:** 1 (`checklist` — single-attribute removal, no shared symbol/migration/auth/payload change).

---

## Required cross-references

- `docs/specs/bugfix/bilateral-status-dropdown-overlay/requirements.md` (same folder).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
