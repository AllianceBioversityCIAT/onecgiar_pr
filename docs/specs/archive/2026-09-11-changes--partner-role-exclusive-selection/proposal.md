# Proposal — Partner Role: exclusive "Other" selection

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `partner-role-exclusive-selection` — derived from free-text argument (voice note + screenshot, no literal slug given) |
| Spec Path | `changes/partner-role-exclusive-selection` |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed |
| Author | Santiago Sanchez (via voice note) |
| Date | 2026-09-09 |

## 2. Intent

In the **External partners** block of Contributors & Partners (and the twin "Other(s) External Partners" block), each partner has a **Partner role** control with four toggle buttons: `Scaling`, `Demand`, `Innovation`, `Other`. The user wants the four options to keep working as **one multi-select group with one exclusivity rule**: `Scaling` / `Demand` / `Innovation` can be combined freely with each other, but the moment `Other` is chosen, the other three must become **unusable** (not just silently cleared) until `Other` is deselected.

## 3. Problem / Current Behavior

Verified in `normal-selector.component.html:82-127` (mirrored at `:161-206`) and `RdContributorsAndPartnersService.onSelectDeliveryPartners` (`rd-contributors-and-partners.service.ts:346-369`):

- `Scaling` (1) / `Demand` (2) / `Innovation` (3) already behave as a free multi-select — clicking one toggles it independently of the others. This part already matches what the user wants and needs no change.
- `Other` (4) is already exclusive **on selection**: choosing it replaces `option.delivery` with `[{4}]`, clearing any of the other three.
- **The gap:** while `Other` is active, `Scaling`/`Demand`/`Innovation` remain fully clickable. Clicking one of them **silently swaps** — it removes `Other` and activates that role instead (`:357-361`) — with no visual cue beforehand that the button was disabled. The user's ask ("si seleccionamos Other las otras no se debería[n] utilizar") is that those three buttons stop being an active, clickable control the instant `Other` is selected, not that clicking them keeps working as an implicit "undo Other" gesture.
- There is no `disabled`/`aria-disabled` state and no dimmed styling on `Scaling`/`Demand`/`Innovation` when `Other` is active — every `.delivery` div always looks equally clickable (`[attr.aria-pressed]` is the only ARIA state present).

## 4. Proposed Outcome

- `Scaling`, `Demand`, `Innovation` stay a free multi-select among themselves (no change).
- The instant `Other` is active for a partner row, the other three buttons become **visually disabled** (dimmed, `aria-disabled="true"`, `cursor: not-allowed`) and **non-interactive** — a click on them does nothing while `Other` is selected.
- Deselecting `Other` (clicking it again) restores the other three to their normal interactive state.
- No change to the read-only rendering path (`this.rolesSE.readOnly`), which already only paints the active chip(s).

## 5. Scope

- `normal-selector.component.html` — both `.deliveries` blocks (ToC-partners chip list and Other(s)-partners chip list), add a disabled/aria-disabled class + guard on the three non-Other buttons.
- `RdContributorsAndPartnersService.onSelectDeliveryPartners` (`rd-contributors-and-partners.service.ts:346-369`) — early-return (no-op) when the clicked `deliveryId` is not 4 and `Other` (4) is already present in `option.delivery`.
- Matching visual treatment for both blocks (the ToC partners block and the "Other(s)" partners block share identical markup/logic today — keep them identical after the change).

## 6. Non-Goals

- No change to the legacy dropdown-only screen (`normal-selector` for pre-2026 phases keeps the same underlying delivery model; this fix touches shared service logic, so it benefits both, but no NEW behavior is requested there).
- No change to `onSelectDelivery` / `validateDeliverySelection` (the sibling methods used by `multiple-wps` for Science Program-type selections) — the user's request is scoped to **Partner role**, confirmed by the screenshot.
- No backend/API/payload change — `partner_delivery_type_id` values and the saved shape are unchanged; this is purely a client-side interaction guard.
- No change to `rd-partners` (legacy P22 partners screen) — out of scope unless the user confirms it shares the same component (it does not; P22 uses a separate `rd-partners` module).

## 7. Affected Users, Systems, And Specs

- **Users:** Result submitters entering External partners in Contributors & Partners (P25, both CP2026 and legacy dropdown paths — the delivery buttons render in both).
- **Code:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html`, `.ts`; `rd-contributors-and-partners.service.ts`.
- **Specs:** No existing spec owns Partner role's interaction contract yet (this proposal establishes it). Nearby active spec areas in the same file (Lead Center decouple, ToC center/science guards — see the folder's `CLAUDE.md`) touch different fields and are unaffected.

## 8. Visual Reference

- Source: Figma | Generated mockup | Self-contained HTML mockup | **None**
- Location: n/a — reference is the user's own screenshot of the live app (`Image #30`), showing the current four-button row with no disabled state.
- Notes: The screenshot documents the CURRENT (unwanted) behavior — all four buttons rendered identically clickable — not a target design. No new visual design is needed: the fix reuses the existing `.delivery` button style with an added disabled/dimmed state, consistent with how other disabled controls in this codebase are styled (`opacity` + `pointer-events: none`, per the `.globalDisabled` convention in `styles.scss`).

## 9. Requirement Delta Preview

### ADDED Requirements

- When `Other` is the active Partner role for a given partner, `Scaling`/`Demand`/`Innovation` render visually disabled (dimmed) and do not respond to clicks for that same partner row.

### MODIFIED Requirements

- `onSelectDeliveryPartners(option, deliveryId)`: for `deliveryId !== 4`, if `option.delivery` already contains `partner_delivery_type_id === 4`, the method becomes a no-op (currently it swaps `Other` out and the clicked role in).

### REMOVED Requirements

- The implicit "clicking a role button while Other is active silently deselects Other and activates that role" behavior is removed.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Guard in the service + disabled class in the template (recommended)** | Add the early-return in `onSelectDeliveryPartners`; add `[ngClass]`/`[attr.aria-disabled]` bindings on the three non-Other `.delivery` divs keyed off `validateDeliverySelectionPartners(option?.delivery, 4)`. | Smallest, localized change; single source of truth for the rule (the service), template only reflects state. |
| **B — Template-only guard (`(click)` wrapped in a condition)** | Keep the service method as-is; gate the `(click)` handler in the template with `*ngIf`/ternary so it doesn't fire when Other is active. | Duplicates the exclusivity rule in the template instead of the service; easier to drift out of sync if another caller invokes the service method directly (e.g. future keyboard handler). |
| **C — Convert to a true single-select radio group** | Replace the four independent toggles with a single-select control (radio group or a dropdown, as the user tentatively floated at the start of the note) where only one of the four values can ever be active. | Matches the user's *opening* phrasing ("manejar como un drop down / opción única") but contradicts their own correction two sentences later ("es de opción múltiple... Scaling, Demand o Innovation") — would remove the ability to combine e.g. Scaling+Demand, which the user explicitly wants to keep. Larger change (new control type, payload still allows an array so no backend change, but more UI rework for no requested benefit). |

## 11. Recommended Approach

**Option A.** It matches the user's own final description (multi-select among the three, hard-exclusive with `Other`), is the smallest safe change, and puts the exclusivity rule in exactly one place (`RdContributorsAndPartnersService`) so both the ToC-partners block and the Other(s)-partners block — which already share this same service method — inherit the fix identically.

## 12. Risks, Dependencies, And Open Questions

- **Risk (low):** disabling the buttons via `pointer-events: none` must not also suppress the tooltip (`prTooltip`) that explains each role — confirm the tooltip still surfaces on a disabled/dimmed button (hover still works even if click doesn't), or accept it hides too, since a disabled control not explaining itself is a minor a11y regression. Recommend keeping the tooltip visible.
- **Risk (none found):** no backend/API contract change, so no server-side risk.
- **Open question:** should the read-only view (`this.rolesSE.readOnly`) do anything different? Today it already only renders whichever chip(s) are active (`*ngIf="validateDeliverySelectionPartners(...)"`), so a saved `Other`-only row already shows just `Other` — no change needed there, flagging only for confirmation.
- **Dependency:** none — self-contained within `rd-contributors-and-partners`.

## 13. Success Criteria

- Selecting `Scaling` and `Demand` together on the same partner row keeps both active (unchanged, regression-checked).
- Selecting `Other` on a partner row that already has `Scaling`/`Demand`/`Innovation` active clears them and shows only `Other` active (unchanged, regression-checked).
- With `Other` active, clicking `Scaling`, `Demand`, or `Innovation` on that row does nothing — `Other` stays the only active role, and the three buttons render visually disabled.
- Deselecting `Other` (clicking it again) restores `Scaling`/`Demand`/`Innovation` to normal, interactive, undimmed state.
- Behavior is identical in both the ToC-partners chip list and the "Other(s)" partners chip list.

## 14. Next Step

```text
/akili-specify changes/partner-role-exclusive-selection
```
