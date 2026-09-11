# Requirements — Partner Role: exclusive "Other" selection

**Depth:** Lite · **Type:** Change · **Module code:** `PRL`

## 1. Module / Feature

- **Module:** `results` (client) — Contributors & Partners, External partners block
- **Sub-feature:** Partner role toggle group (`Scaling` / `Demand` / `Innovation` / `Other`)
- **Status:** draft
- **Ticket(s):** none (voice-note request, see `proposal.md`)
- **Proposal:** `docs/specs/changes/partner-role-exclusive-selection/proposal.md` — Recommended Approach = Option A, followed as-is.

## 2. Context

Each partner row in Contributors & Partners → External partners has a "Partner role" control with four toggle buttons (`normal-selector.component.html:82-127`, mirrored at `:161-206`). `Scaling`/`Demand`/`Innovation` already behave as a free multi-select and `Other` already clears them on selection — both confirmed correct by the user and out of scope. The one gap: while `Other` is active, the other three buttons stay fully clickable and silently deselect `Other` when clicked, instead of being inert. Cited in `proposal.md` §3–4.

Relevant baseline: `docs/ux-ui/design.md` (component rules — interactive controls, disabled-state convention `opacity`/`pointer-events`); no `docs/trd/trd.md` entity/API is touched (client-only interaction fix, `partner_delivery_type_id` payload shape unchanged).

## 3. In Scope / Out of Scope

### In scope

- `RdContributorsAndPartnersService.onSelectDeliveryPartners` — no-op when a non-`Other` role is clicked while `Other` (id 4) is already active for that row.
- Visual disabled state (dimmed, `aria-disabled`) on `Scaling`/`Demand`/`Innovation` in both delivery blocks in `normal-selector.component.html` when `Other` is active for that row.

### Out of scope

- `onSelectDelivery` / `validateDeliverySelection` (Science Program deliveries — different field, different component tree).
- `rd-partners` (P22 legacy partners screen — separate component).
- Any backend/API/payload change.
- Read-only rendering path (already correct — only renders the active chip(s)).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Cannot accidentally swap out "Other" by clicking another role button; must explicitly deselect "Other" first. |

## 5. User Stories

- **`PRL-US-1`** — As a result submitter, I want the "Other" partner role to visibly block the other three role buttons while it's active, so that I don't accidentally change a partner's role with a stray click.

## 6. Functional Requirements

### Required (MUST)

- **`PRL-R-1`** When `Other` is the active Partner role for a partner row, the system MUST render `Scaling`, `Demand`, and `Innovation` for that same row as visually disabled (dimmed, `aria-disabled="true"`) and non-interactive.
- **`PRL-R-2`** When `Other` is active for a row, clicking `Scaling`, `Demand`, or `Innovation` on that row MUST NOT change `option.delivery` — `Other` remains the sole active role.
- **`PRL-R-3`** Deselecting `Other` (clicking it again) MUST restore `Scaling`/`Demand`/`Innovation` on that row to their normal interactive, undimmed state.
- **`PRL-R-4`** `Scaling`/`Demand`/`Innovation` MUST continue to behave as a free multi-select among themselves when `Other` is not active (no regression).
- **`PRL-R-5`** Selecting `Other` on a row that already has any of `Scaling`/`Demand`/`Innovation` active MUST continue to clear them and activate only `Other` (no regression, existing behavior).
- **`PRL-R-6`** The fix MUST apply identically to both delivery blocks in `normal-selector.component.html` (the ToC-partners chip list and the "Other(s)" partners chip list), since both call the same service method.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | Disabled buttons MUST carry `aria-disabled="true"`; the existing `prTooltip`/`pTooltip` explaining each role SHOULD remain visible on hover even when disabled (dimmed ≠ hidden). |
| Backwards compatibility | MUST NOT change the saved payload shape (`option.delivery` array of `{ partner_delivery_type_id }`) or any other field's behavior. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `PRL-AC-1` | A partner row with no role selected | The user clicks `Scaling` then `Demand` | Both are active simultaneously (unchanged multi-select). |
| `PRL-AC-2` | A partner row with `Scaling` + `Demand` active | The user clicks `Other` | Only `Other` is active; `Scaling`/`Demand` are cleared (unchanged). |
| `PRL-AC-3` | A partner row with `Other` active | The user clicks `Scaling` | Nothing changes: `Other` stays the only active role, and `Scaling`/`Demand`/`Innovation` render dimmed with `aria-disabled="true"`. |
| `PRL-AC-4` | A partner row with `Other` active | The user clicks `Other` again (deselect) | `Other` becomes inactive and `Scaling`/`Demand`/`Innovation` return to normal, interactive, undimmed state. |
| `PRL-AC-5` | The "Other(s) External Partners" chip list (second block) | The same sequence as `PRL-AC-3` is run there | The identical disabled/no-op behavior applies. |

Cross-cutting project ACs that already apply: `AC-1` (typed result integrity — role data is part of the partner record).

## 9. Dependencies & Assumptions

### Upstream dependencies

- None (self-contained within `RdContributorsAndPartnersService` and `normal-selector.component.html`).

### Downstream consumers

- Saved `option.delivery` is read by `validateDeliverySelectionPartners` for read-only rendering and by the save/payload path (`onSaveSection`) — both unaffected, since the array shape doesn't change.

### Assumptions

- No other component calls `onSelectDeliveryPartners` directly outside `normal-selector.component.html` (confirmed: single caller in the codebase for the Partner-role buttons).

## 10. Open Questions

- `PRL-OQ-1` — Should the tooltip stay visible on a disabled button, or is it acceptable for it to also stop showing? Proposal recommends keeping it visible; default to that unless the user says otherwise during design review.

## 11. Out-of-Band Notes

None.

## Defect classes this spec can produce → verification mapping

| Defect class | Catches it |
|---|---|
| Guard logic wrong (e.g. blocks `Other` itself, or blocks the wrong row) | Unit test on `onSelectDeliveryPartners` (Jest, `rd-contributors-and-partners.service.spec.ts`) |
| Disabled state not reflected visually / `aria-disabled` missing | Component test rendering the template and asserting the class/attribute (Jest with `ComponentFixture`, or Cypress if DOM interaction is needed — `custom-fields`-style CT is not required here since this component is not in `custom-fields/` and is NOT excluded from Jest coverage) |
| Regression on existing multi-select / Other-clears-others behavior | Existing/extended unit tests on `onSelectDeliveryPartners` covering `PRL-AC-1`/`PRL-AC-2` |
| Fix applied to only one of the two delivery blocks | Test asserting both blocks share the same guard (or a template-level check that both invoke the same disabled-state expression) |

No class here is visual-only/unmeasurable — this is discrete state logic, fully coverable by Jest/Angular TestBed. No accepted risk needed.

## Required cross-references

- `docs/prd.md` — general UI usability goal (no specific `AC-*` owns this narrow interaction; none contradicted).
- `docs/ux-ui/design.md` — disabled-control convention (`opacity` + `pointer-events`, `.globalDisabled` precedent in `styles.scss`).
- `docs/trd/trd.md` — no entity/API surface touched.
- `docs/specs/changes/partner-role-exclusive-selection/proposal.md` — source intent, Option A.
