# Module Spec — `policy-change-usd-amount-position` — `requirements.md`

> Follow-up correction to `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` (Jira `P2-3962`). Depth: **Lite**. Mode: **Bug**.

---

## 1. Module / Feature

- **Module:** `bilateral` (Type-Specific Detail, Policy Change)
- **Sub-feature:** `policy-change-usd-amount-position`
- **Owner:** — (not specified)
- **Status:** draft
- **Ticket(s):** `P2-3962` (same ticket as the prior spec — this corrects an incompletely-satisfied part of it)
- **Type:** Bug (Bug Mode)

---

## 2. Context

`P2-3962` asked that Bilateral's USD Amount and Status fields be "displayed directly in Type-Specific Detail, **following the same layout implemented in Pool Funding (W1/W2)**." The prior spec (`bugfix/policy-change-usd-amount-layout`) correctly moved the pair out of the "Complete full metadata" disclosure into the always-visible area, but placed the resulting grid block **after** "Stage" and "Implementing organizations" — not immediately beside "Policy type", where Pool Funding puts it.

Confirmed by direct read of both current templates (commit at time of writing: see `design.md` Premise Ledger):

- **Pool Funding** (`policy-change-info.component.html:6-40`) wraps **Policy type, USD amount, and Status as three siblings inside one shared grid row** (`grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]`), in that order, with USD amount/Status conditionally rendered via `*ngIf="policy_type_id == 1"`.
- **Bilateral** (`type-policy-change.component.html:37-105`, post-prior-fix) renders Policy type, Stage, and Implementing organizations as three standalone, unwrapped siblings, followed by a **separate** grid row holding only USD amount + Status — i.e. the pair sits after two unrelated fields rather than beside Policy type.

This is a continuation of `PCL-R-2`/`PCL-R-10` (SHOULD — shared layout) from the prior spec, now made a MUST: the grouping, not just the side-by-side pairing of USD amount/Status with each other, is what "same layout" means per the ticket.

Relates to `docs/prd.md` **US-S2**, `docs/ux-ui/design.md` §1 ("One result, many lenses"). Out of scope for the server/data model (client template-only, same as the prior spec).

---

## 3. In Scope / Out of Scope

### In scope

- Move Bilateral's USD Amount + Status grid block to render immediately after "Policy type" and before "Stage", grouping all three (Policy type, USD amount, Status) inside **one shared grid row**, matching Pool Funding's structure exactly.
- "Stage" and "Implementing organizations" keep their current bindings and behavior, just render after the regrouped row instead of before the USD amount/Status block.
- A regression test proving the new DOM order (red on the current/prior-fix structure, green after).

### Out of scope

- Any change to field bindings, clearing logic (`onPolicyTypeChange()`), the MDS tracker, or the "Complete full metadata" disclosure (already corrected by the prior spec, unaffected here).
- Pool Funding — already correct, not touched.
- The QA review drawer (`policy-change-content`) — still out of scope, as in the prior spec (`PCL-OQ-1`).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees USD Amount + Status grouped with Policy type in Bilateral's Type-Specific Detail, matching Pool Funding's layout exactly — rather than after Stage/Implementing organizations. |

---

## 5. User Stories

Refines `US-S2`; corrects the prior spec's `PCL-R-2` implementation.

- **`PCP-US-1`** — As a result submitter editing a Bilateral Policy Change result, I want USD Amount and Status to appear grouped with Policy type (same row), exactly as in Pool Funding, so the two funding-source layouts are visually identical, not just similarly side-by-side.

---

## 6. Functional Requirements

### Required (MUST)

- **`PCP-R-1`** In Bilateral's Type-Specific Detail, when `policy_type_id == 1`, the system MUST render Policy type, USD Amount, and Status as three siblings inside one shared grid row, in that order, matching Pool Funding's grid structure (`policy-change-info.component.html:6`) exactly.
- **`PCP-R-2`** "Stage" and "Implementing organizations" MUST continue to render as always-visible fields, positioned after the regrouped Policy type/USD Amount/Status row.
- **`PCP-R-3`** When `policy_type_id != 1`, the grid row MUST contain only Policy type (USD Amount/Status absent, as before — unchanged behavior from the prior spec).
- **`PCP-R-4`** `onPolicyTypeChange()`'s clearing behavior, the "Complete full metadata" disclosure (now holding only "Is this result related to:"), and the MDS tracker's field set (`policy-type`, `policy-stage`, `policy-institutions`) MUST remain unchanged by this reordering.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No API/DTO change — template reordering only. |
| **Accessibility** | Tab order follows the new visual order (Policy type → USD amount → Status → Stage → Implementing organizations); no `tabindex` override needed since this is plain DOM reordering. |
| **Testability** | A regression test proves the new sibling order; Bug Mode mandatory red-before/green-after. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PCP-AC-1` | A Bilateral Policy Change result, Type-Specific Detail open, `policy_type_id == 1` | The section renders | Policy type, USD Amount, and Status are three siblings inside one shared grid container, in that order; Stage and Implementing organizations render immediately after that container. |
| `PCP-AC-2` | Same result, `policy_type_id` changed to a non-1 value | The section re-renders | The grid container holds only Policy type; USD Amount/Status are absent (unchanged from the prior spec). |

## 8a. Defect Classes & Verification Gates

| Defect class | Gate |
|---|---|
| **DOM grouping/ordering** (fields present but not siblings in the expected container, or in the wrong order) | Jest test querying the shared grid container's direct children and asserting their label order — automated, catches it directly. |
| **Visual side-by-side geometry** (do the three fields actually render in one row) | No automated gate (jsdom). Reuses the identical, already-proven grid utility class from Pool Funding — same accepted-risk treatment as the prior spec's §8a. Manual browser check recommended before shipping. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

None new — same `app-pr-select`/`app-pr-input` primitives, same `PolicyControlListService`, same `body.policy_type_id` binding already in place from the prior spec.

### Downstream consumers

- `cypress/e2e/bilateral-policy-change-mds.cy.ts` — its existing assertions check *presence* of "USD amount"/"Status" text, not DOM position; unaffected by this reordering, but worth a quick re-run to confirm.
- `type-policy-change.component.spec.ts` — the `PCL-T-2`/`PCL-AC-3` tests from the prior spec check presence/absence, not sibling order; unaffected, re-run to confirm.

### Assumptions

- The prior spec's Premise Ledger rows (P-6 through P-14, `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/design.md`) about the component's structure, MDS tracker, and clearing logic still hold — re-verified at the current commit in this spec's own Premise Ledger rather than assumed stale.

---

## 10. Open Questions

None.

---

## Required cross-references

- `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` — the prior spec this corrects.
- `docs/prd.md` (`US-S2`), `docs/ux-ui/design.md` (§1), `docs/trd/trd.md` (QAS-8).
- `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/CLAUDE.md`.
