# Module Spec — `bilateral-status-dropdown-overlay` — `requirements.md`

> QA follow-up on `P2-3962` (Bilateral results testing round). Depth: **Lite**. Mode: **Bug**.

---

## 1. Module / Feature

- **Module:** `bilateral` (Type-Specific Detail, Policy Change)
- **Sub-feature:** `bilateral-status-dropdown-overlay`
- **Owner:** — (not specified)
- **Status:** draft
- **Ticket(s):** `P2-3962`
- **Type:** Bug (Bug Mode)

---

## 2. Context

QA reported: *"In Bilateral results, when clicking the Status dropdown, the content below it is pushed downward. This behavior affects the layout and consistency of the interface. Expected: the Status dropdown should open as an overlay above the other fields and questions, without moving the surrounding content. Its behavior should be consistent with the Policy Type dropdown, which already displays the options correctly."*

Root cause confirmed this session (scout investigation + git history read):

- Both "Policy type" and "Status" are `app-pr-select` components in `type-policy-change.component.html` (the same Bilateral Policy Change section this session's two prior specs already modified). Policy type renders with no `expandSpaceOnOpen` input (defaults `false`); Status carries `[expandSpaceOnOpen]="true"` (`type-policy-change.component.html:69-79`, current line numbers as of this session's last commit).
- `app-pr-select`'s options panel is **always** an absolutely-positioned overlay (`.options { position: absolute }`, `custom-fields.scss:116-144`), anchored via `.field { position: relative }` and revealed on `:focus-within` — this does **not** depend on `expandSpaceOnOpen` at all. This is why Policy type already "opens correctly as an overlay."
- `expandSpaceOnOpen="true"` instead renders a **second, separate** DOM node — `<div class="expandable-space" [ngClass]="{ expanded: isDropdownOpen() }">` (`pr-select.component.html:110-111`) — sitting in **normal document flow** (not absolutely positioned), whose height animates `0 → 300px` when the dropdown opens (`pr-select.component.scss:84-94`). That flow-layout height change is exactly what pushes later siblings down. It is a redundant addition on top of the overlay that already works, not a replacement for it.
- Git history: `expandSpaceOnOpen` was introduced app-wide on 2025-06-24 (`b7ec723df`), then explicitly reverted on one of its two original call sites three days later (`5eaa011023b`, titled "`[expandSpaceOnOpen]="true"` removed", no explanatory body) and removed entirely from the other when that control was replaced. It reappears on Status on 2026-08-11 (`56db1cef5`), added incidentally inside an unrelated bug-fix commit with zero explanation tying it to Status specifically. No surviving usage anywhere in the codebase sits near a scroll boundary where an overlay would plausibly need this escape hatch — Status sits mid-form (Policy type → Stage → Implementing organizations → USD amount/Status → MDS footer), not adjacent to any clipping container.

This strongly indicates `expandSpaceOnOpen="true"` on Status is an unintentional leftover, not a deliberate fix for a real clipping problem.

Relates to `docs/prd.md` **US-S2**. Touches the same `type-policy-change.component` this session's two prior `P2-3962` specs (`bugfix/policy-change-usd-amount-layout`, `bugfix/policy-change-usd-amount-position`) already modified — this spec changes a different input on the same field, not the same lines.

---

## 3. In Scope / Out of Scope

### In scope

- Remove `[expandSpaceOnOpen]="true"` from the Status `app-pr-select` in `type-policy-change.component.html`, matching Policy type's (and every other `app-pr-select` in the app's) default.
- A regression test proving the push-down behavior is gone and the overlay behavior is unaffected.

### Out of scope

- The `expandSpaceOnOpen` feature/prop itself — not removed from `app-pr-select`, only unused on this one field. It has no other current call sites to also fix (confirmed by repo-wide grep this session).
- Any other dropdown in Bilateral or Pool Funding — not reported, not touched.
- Any change to the overlay's own positioning logic (`shouldOpenUpward`/`dropdown-placement.ts`) — already correct, already shared by both fields, untouched.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Bilateral) | Clicking the Status dropdown no longer pushes Stage/Implementing organizations/the rest of the form downward — it opens as the same kind of floating overlay Policy type already uses. |

---

## 5. User Stories

Refines `US-S2`.

- **`BSD-US-1`** — As a Bilateral result submitter, I want the Status dropdown to open as an overlay without shifting the rest of the form, consistent with the Policy type dropdown, so the layout doesn't jump around while I'm filling the section.

---

## 6. Functional Requirements

### Required (MUST)

- **`BSD-R-1`** The Status `app-pr-select` in `type-policy-change.component.html` MUST NOT set `expandSpaceOnOpen`, matching Policy type's default behavior.
- **`BSD-R-2`** Opening the Status dropdown MUST NOT change the layout position of any sibling field (Stage, Implementing organizations, the MDS footer alert, etc.) — no reserved/animated space before or after the overlay opens.
- **`BSD-R-3`** The Status dropdown's own overlay behavior (visibility, anchoring, upward-flip near a viewport edge) MUST remain unchanged — it does not depend on `expandSpaceOnOpen` and must not regress.
- **`BSD-R-4`** Status's `[(ngModel)]="body.status_amount"`, `(ngModelChange)="onFieldChange()"`, and all other existing bindings MUST remain unchanged — only the `expandSpaceOnOpen` input is removed.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No API/DTO change — template-only. |
| **Accessibility** | No regression — removing a layout-only spacer div does not affect focus order or ARIA semantics (`app-pr-select`'s overlay/focus mechanics are unchanged). |
| **Testability** | Regression test proves the push-down is gone (Bug Mode mandatory). |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BSD-AC-1` | A Bilateral Policy Change result, Type-Specific Detail open, `policy_type_id == 1` (so Status is visible) | The submitter clicks/focuses the Status dropdown | No sibling element (Stage, Implementing organizations, etc.) moves position; no `.expandable-space`-style spacer renders for this field. |
| `BSD-AC-2` | Same state | The submitter opens the Status dropdown | The options overlay appears, anchored to the Status field, exactly as Policy type's overlay already behaves. |

## 8a. Defect Classes & Verification Gates

| Defect class | Gate |
|---|---|
| **DOM presence** (the redundant spacer div exists at all for this field) | Jest test: with `isDropdownOpen` (or its driving signal) set true, assert no element matching the `expandable-space`/height-animating spacer exists within the Status field's rendered output. Automated. |
| **Visual "nothing moves" geometry** | No automated gate (jsdom cannot measure layout shift). Accepted risk per the pattern already established in this session's prior two specs — reuses a pure attribute removal with no new CSS, very low risk. Manual browser check recommended before shipping. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

None new — same `app-pr-select` component, unchanged.

### Downstream consumers

- `cypress/e2e/bilateral-policy-change-mds.cy.ts` — asserts text presence for Status, not its open/overlay behavior; unaffected, re-run to confirm.
- `type-policy-change.component.spec.ts` — the prior specs' `PCL-T-2`/`PCL-AC-3`/`PCP-T-1` tests assert on label/presence/sibling-order, not on `expandSpaceOnOpen`; unaffected, re-run to confirm.

### Assumptions

- No other current call site of `expandSpaceOnOpen` exists in the app (confirmed by this session's scout via repo-wide grep) — re-confirmed as a task-time check, not assumed silently, per the Falsifiability block's negative-existence rule.

---

## 10. Open Questions

None.

---

## Required cross-references

- `docs/prd.md` (`US-S2`).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
- `onecgiar-pr-client/src/app/custom-fields/pr-select/` (the component whose prop is being un-set, not modified).
