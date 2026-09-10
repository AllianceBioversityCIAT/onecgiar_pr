# Design — Partner Role: exclusive "Other" selection

**Depth:** Lite · **Module code:** `PRL`

Links: `requirements.md` (same folder), `proposal.md` (same folder, Option A). No `docs/trd/trd.md` entity/API touched.

## 1. Summary

Add one guard method to `RdContributorsAndPartnersService` and one derived-state helper consumed by `normal-selector.component.html`, so that when `Other` is the active Partner role on a row, the other three role buttons render dimmed/`aria-disabled` and clicking them does nothing. No data model, API, or payload change. Biggest constraint accepted: the tooltip on a "blocked" button must keep working, so the block is implemented as **click-guard + dim styling**, not `pointer-events: none` (which would also kill hover).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `pages/results/pages/result-detail/pages/rd-contributors-and-partners/` — `rd-contributors-and-partners.service.ts` (the one shared state/logic service for this section) and `components/multiple-wps/components/normal-selector/normal-selector.component.html`.
- No server module, no external integration.

### 2.2 Interaction flow

```
[Partner row, Other already active]
  User clicks "Scaling" button
    └── (click)="rdPartnersSE.onSelectDeliveryPartners(option, 1)"
          └── isRoleBlockedByOther(option.delivery, 1) === true
                └── return  (no mutation, no re-render change)

[Partner row, Other already active] — template render
  *ngClass on the Scaling/Demand/Innovation .delivery divs
    └── [ngClass]="{ blocked: rdPartnersSE.isRoleBlockedByOther(option?.delivery, 1) }"
    └── [attr.aria-disabled]="rdPartnersSE.isRoleBlockedByOther(option?.delivery, 1) ? 'true' : null"
```

## 3. Data Model Changes

None. `option.delivery: { partner_delivery_type_id: number }[]` is unchanged.

## 4. API Surface

None touched.

## 5. Client Workflow / Business Rules

- **New service method** `isRoleBlockedByOther(deliveries, deliveryId)` on `RdContributorsAndPartnersService`:
  - Returns `true` when `deliveryId !== 4` AND `validateDeliverySelectionPartners(deliveries, 4)` is truthy (i.e. `Other` is currently active on this row).
  - Returns `false` otherwise (including for `deliveryId === 4` itself — `Other`'s own button is never blocked).
  - Pure/read-only — no side effects, safe to call from the template on every change-detection pass (same pattern as the existing `validateDeliverySelectionPartners`).
- **Modified method** `onSelectDeliveryPartners(option, deliveryId)`:
  - First line after the existing `readOnly` guard: `if (this.isRoleBlockedByOther(option.delivery, deliveryId)) return;`
  - Everything below is unchanged — `Other`'s own toggle logic, and the existing "remove Other when a non-Other role is chosen" branch becomes dead code for the blocked case (it now never runs when `Other` is active, because the new guard returns first) but is left in place since it still correctly handles the legitimate "Other not active" path. `PRL-DD-2` records why it isn't deleted.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. Same component, same module (`multiple-wps`).

### 6.2 Components & services

- `RdContributorsAndPartnersService` — add `isRoleBlockedByOther` (§5), guard `onSelectDeliveryPartners` (§5). No new files.
- `CPNormalSelectorComponent` — no `.ts` change needed; the new state is derived entirely from `option.delivery`, already available in the template via `rdPartnersSE`.
- `normal-selector.component.html` — for the three non-`Other` `.delivery` divs in **both** blocks (`:86-95` ToC-partners Scaling, `:96-105` Demand, `:106-115` Innovation, and the mirrored `:165-174`/`:175-184`/`:185-194` in the Other(s)-partners block):
  - Add to the existing `[ngClass]` binding: `blocked: this.rdPartnersSE.isRoleBlockedByOther(option?.delivery, 1)` (swap `1` for `2`/`3` per button).
  - Add `[attr.aria-disabled]="this.rdPartnersSE.isRoleBlockedByOther(option?.delivery, 1) ? 'true' : null"`.
  - The `Other` button itself (`:116-123`, `:195-202`) is untouched — never blocked.

### 6.3 Design system usage

- New SCSS class `.delivery.blocked` in `normal-selector.component.scss`, adjacent to the existing `.delivery` / `.delivery.active` rules:
  - `opacity: 0.45`
  - `cursor: not-allowed`
  - `pointer-events` is **NOT** set to `none` — deliberate, see `PRL-DD-1`. Keeps `prTooltip`/`pTooltip` hover working.
  - No new color token needed — reuses the existing `.delivery` base colors under reduced opacity, consistent with the project's `.globalDisabled` convention (`opacity` for the visual cue, not a new palette entry).
- A11y: `aria-disabled="true"` on the blocked buttons (native `disabled` is not used because these are `<div>`s, matching the existing `[attr.aria-pressed]` pattern already on these elements).
- i18n: no new strings.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

Unchanged — the existing `this.api.rolesSE.readOnly` guard at the top of `onSelectDeliveryPartners` still gates all mutation for read-only users; this change only adds a second, narrower guard beneath it.

## 8. Performance & Capacity

Negligible — `isRoleBlockedByOther` is an O(1)-ish array scan (delegates to the existing `validateDeliverySelectionPartners`, itself an `Array.find` over at most 1 element in practice) called from the template per row per button (12 extra calls per rendered row across both possible blocks); no measurable impact at PRMS's typical partner-list sizes.

## 9. Observability

None needed — pure UI state, no logging changes.

## 10. Testing Plan (forward-looking)

- Unit (Jest): `rd-contributors-and-partners.service.spec.ts` — new `describe('isRoleBlockedByOther')` and extended `describe('onSelectDeliveryPartners')` covering the no-op case.
- Component (Jest + `ComponentFixture`, this component is NOT under the `custom-fields`/`rd-contributors-and-partners` coverage exclusion... — **correction, see `PRL-DD-3`:** `normal-selector` lives under `rd-contributors-and-partners/components/`, which per the package `CLAUDE.md` §3 coverage config IS excluded from `collectCoverageFrom` (`pages/results/pages/result-detail/pages/rd-contributors-and-partners/` — `normal-selector` is nested under that path). Tests still run and must pass; they just don't count toward the coverage threshold. Use `normal-selector.component.spec.ts` if it exists, else add one, rendering the template and asserting the `blocked` class + `aria-disabled` attribute on the three buttons when `Other` is active.

## 11. Backwards Compatibility & Migration Plan

Purely additive client behavior; no migration, no flag, no rollout coordination needed.

## 12. Design Decisions (ADRs)

### `PRL-DD-1` — Dim + click-guard instead of `pointer-events: none`

- **Context:** The requirement asks the three buttons to become "unusable" while `Other` is active, but the existing `prTooltip`/`pTooltip` on each button (explaining what the role means) should stay available on hover per the proposal's risk note and `PRL-OQ-1`'s default answer.
- **Decision:** Implement the block as (a) a service-level no-op guard on click, and (b) a dimmed CSS class + `aria-disabled`, with no `pointer-events: none`.
- **Alternatives considered:**
  - `pointer-events: none` — simplest CSS-only block, but also kills the tooltip's mouseenter/hover detection, contradicting the accessibility intent of explaining a disabled control.
  - Native `disabled` attribute — not applicable, these are `<div>`s, not `<button>`s; would require a markup rewrite to `<button>` (larger change, out of scope for this Lite fix).
- **Consequences:** A screen-reader / assistive tech user still gets `aria-disabled="true"`; a sighted mouse user still sees the tooltip on hover but nothing happens on click — an intentional, small "why is this here if it's inert" gap accepted as a minor a11y trade-off, consistent with the proposal's own risk note.

### `PRL-DD-2` — Keep the now-partially-dead "remove Other" branch in `onSelectDeliveryPartners`

- **Context:** The existing code path that removes `Other` and pushes the newly clicked role (`rd-contributors-and-partners.service.ts:357-364`) never executes anymore for the "Other active" case, because the new guard returns first.
- **Decision:** Leave that branch untouched rather than restructuring the method.
- **Alternatives considered:** Simplify the method now that one path is provably unreachable for `Other`-active rows — rejected: the branch is still reachable and correct for the `Other`-not-active path (it defensively strips any stray `Other` entry before pushing a new role, e.g. after a data-load edge case), so removing it risks a regression for a case this Lite spec did not audit.
- **Consequences:** A future reader sees a branch that looks partially redundant; this note (and the code comment added in `PRL-T-1`) explains why it stays.

### `PRL-DD-3` — Accept coverage-exclusion for the component test

- **Context:** `normal-selector.component.ts` sits under the coverage-excluded `rd-contributors-and-partners/` path.
- **Decision:** Still write/extend the component spec for local verification and CI-green purposes (tests run even if excluded from the coverage percentage), rather than skip it.
- **Alternatives considered:** Skip the component-level test and rely only on the service unit test — rejected: `PRL-R-1` (visual disabled state) is only provable by rendering the template, not by testing the service in isolation.
- **Consequences:** None to coverage numbers; test still guards against regression.

## 13. Open Gaps & Follow-ups

- `PRL-OQ-1` resolved by `PRL-DD-1`: tooltip stays visible on a blocked button.
- No other open gaps — this is a fully self-contained client fix.

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~40–60 (service: ~10 LOC method + 2 LOC guard; template: ~12 attribute/class bindings across 6 button instances; SCSS: ~6 LOC; tests: ~25–35 LOC) |
| Expected review rounds | 1 |

Matches the declared **Lite** depth — no adjustment needed.

## Reversion Challenge (Step 2.3)

No design decision here removes, disables, or inverts already-shipped behavior for the **legitimate** path (Other-not-active multi-select and Other-clears-others both stay exactly as they are). The only "removal" is of an unwanted silent-swap interaction that the user explicitly asked to remove — not a reversion subject to challenge under this step's trigger definition (adding a guard against an existing but undesired path, not reverting a desired one).

## Required cross-references

- `docs/specs/changes/partner-role-exclusive-selection/requirements.md` (same folder).
- `docs/specs/changes/partner-role-exclusive-selection/proposal.md` (same folder).
- `docs/ux-ui/design.md` — disabled-control convention.
- `onecgiar-pr-client/CLAUDE.md` §5 — Tailwind-first / component rules (SCSS addition here is a small, necessary exception: state modifier on an existing legacy-SCSS component, not new layout/spacing/typography).
