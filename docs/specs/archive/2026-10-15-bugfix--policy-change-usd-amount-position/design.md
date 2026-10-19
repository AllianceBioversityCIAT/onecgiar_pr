# Module Spec — `policy-change-usd-amount-position` — `design.md`

---

## 1. Summary

One client-only template reorder, no server/API/data changes: wrap Bilateral's "Policy type" `app-pr-select` together with the existing (already-correct) USD Amount + Status grid block into **one shared grid container**, matching Pool Funding's structure byte-for-byte, and move that container to sit before "Stage"/"Implementing organizations" instead of after them.

Links: `requirements.md` (same folder); the prior spec `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` this corrects.

---

## 1A. Premise Ledger

**Count:** 5 rows — 5 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** `consumer` fires (this reorders DOM read by existing E2E/unit tests that assert presence, not order — re-confirmed as unaffected, not merely assumed). `live-path` and `shared-state` do not fire — no new user action or branch point, and no state/service shared across sibling components is touched by a pure sibling-order change within one component's own template.

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| P-1 | Pool Funding wraps Policy type + USD amount + Status as three siblings in one grid div, in that order | `location` | `policy-change-info.component.html:6-40`, read directly this session | `68889f292` | `PCP-R-1`'s target structure is wrong; re-derive from the actual file |
| P-2 | Bilateral currently renders Policy type (37-46), Stage (48-57), Implementing organizations (59-71) as standalone siblings, then a separate grid div with USD amount/Status (82-105) | `location` | `type-policy-change.component.html:37-105`, read directly this session (post prior-spec fix) | `68889f292` | The move's source/destination lines are wrong; re-read before editing |
| P-3 | `onPolicyTypeChange()`, the MDS tracker (3 items: `policy-type`/`policy-stage`/`policy-institutions`), and the "Complete full metadata" disclosure are unaffected by a pure sibling-reorder within the always-visible region | `other` | Prior spec's own Premise Ledger rows P-6/P-7/P-8 (`docs/specs/archive/.../design.md`), re-confirmed by this session's direct read showing no change needed to any binding, handler, or the toggle block (lines 106-132, untouched by this reorder) | `68889f292` | `PCP-R-4` would need new code, not just a template move |
| P-4 (consumer) | `cypress/e2e/bilateral-policy-change-mds.cy.ts`'s assertions check text *presence* (`contain.text`/`not.contain.text`), not DOM sibling order or position | `consumer` | Direct re-read of the file's `it()` bodies (all use `.should('contain.text', ...)` / `.and('contain.text', ...)`, no `:nth-child`, no structural/position assertion) | `68889f292` | This reorder could silently break that suite; re-run it as part of task verification regardless |
| P-5 (consumer) | `type-policy-change.component.spec.ts`'s `PCL-T-2`/`PCL-AC-3` tests (from the prior spec) assert presence/absence via `queryAll(By.css(...))` and label matching, not sibling index or parent-container identity beyond the `data-testid` scoping already in place | `consumer` | Direct re-read of those test bodies (added in the prior spec, confirmed unmodified by this change's intended scope) | `68889f292` | Those tests could break on the reorder; re-run as part of task verification |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-policy-change/` (template + spec only).
- **Server modules touched:** none.

### 2.2 Sequence / interaction

No new interaction — same `policy_type_id` binding, same conditional rendering; only sibling grouping/order changes.

---

## 2.3 Reversion Challenge (Step 2.3)

**Trigger:** none — this design does not remove, disable, or invert any delivered behavior; it regroups existing, already-shipped fields. Skipped per the "Lite depth + no reverted behavior" exemption.

---

## 3-5. Data Model / API / Server Workflow

None. No change.

---

## 6. Frontend Plan

### 6.2 Components & services

- **`type-policy-change.component.html`:** wrap the existing "Policy type" `app-pr-select` (currently lines 37-46) and the existing USD Amount + Status grid block (currently lines 82-105, itself unchanged internally) together inside one `<div class="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[20px]">` container, in the order Policy type → USD amount → Status, positioned where "Policy type" currently stands (i.e., before "Stage"). "Stage" and "Implementing organizations" keep their exact current markup, now rendering immediately after this container instead of before the old USD-amount/Status block. No TS change — same bindings, same handlers (`onPolicyTypeChange()`, `onFieldChange()`), same `[inert]="readOnly()"` ancestor wrapping (confirm the new container stays inside it).
- No new tokens, no new components — reuses the identical grid utility class already proven in both Pool Funding and (post prior-spec) Bilateral.

---

## 7-9. Security / Performance / Observability

None affected — pure template reorder.

---

## 10. Testing Plan

- Extend `type-policy-change.component.spec.ts` with a test asserting the shared grid container's direct children are, in order: Policy type select, USD amount input, Status select (when `policy_type_id == 1`), and that "Stage"'s `app-pr-select` is a later sibling, not inside that container.
- Re-run `cypress/e2e/bilateral-policy-change-mds.cy.ts` and the prior spec's `PCL-T-2`/`PCL-AC-3` Jest tests to confirm they still pass (per Premise Ledger P-4/P-5 — expected to be unaffected, confirmed by re-running, not assumed).

---

## 11. Backwards Compatibility

None affected — no API, no payload, no migration.

---

## 12. Design Decisions

### `PCP-DD-1` — Wrap Policy type into the same grid container as USD amount/Status, and move the container before Stage

- **Context:** `P2-3962` asked for Bilateral to follow "the same layout implemented in Pool Funding"; the prior spec achieved side-by-side pairing of USD amount/Status with each other but not their grouping with Policy type, nor their position before Stage/Implementing organizations.
- **Decision:** Move "Policy type" into the existing grid container (alongside the already-correct USD amount/Status conditional block), and move that combined container to sit where "Policy type" currently stands (before Stage).
- **Alternatives considered:** Leave Policy type standalone and just reposition the USD-amount/Status grid to sit directly below it (two separate rows, adjacent). Rejected — the user explicitly confirmed "same row as Policy type (match W1/W2 exactly)" is the intended layout, not mere adjacency.
- **Consequences:** None beyond the visual/structural change — no data, no behavior change. Tab order shifts to follow the new visual order, which is the expected/correct a11y behavior for a reordered form.

---

## Budget (Step 2.4)

- **Expected tasks:** 1.
- **Expected LOC:** ~15-25 (moving ~10 existing lines plus a wrapping `<div>` open/close; one new test).
- **Expected review rounds:** 1 (`checklist` — template-only reorder, no shared symbol/migration/auth/payload change; the two `consumer` Premise Ledger rows are addressed by re-running, not modifying, the named suites).

---

## Required cross-references

- `docs/specs/bugfix/policy-change-usd-amount-position/requirements.md` (same folder).
- `docs/specs/archive/2026-10-15-bugfix--policy-change-usd-amount-layout/` (prior spec, same files).
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`.
