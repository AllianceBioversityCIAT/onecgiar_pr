# Tasks — Partner Role: exclusive "Other" selection

**Depth:** Lite · **Module code:** `PRL`
**Linked spec:** `requirements.md` + `design.md` (same folder).

## 1. Scope of this task list

- **Module / feature:** `results` (client) — Contributors & Partners, Partner role toggle
- **Owner / driver:** unassigned
- **Status:** `PRL-T-1` [x] implemented — Reviewer PASS on attempt 1/3 (see `execution.md`). Manual browser QA and commit still pending.

## 2. Pre-flight checklist

- [x] `requirements.md` approved
- [x] `design.md` approved
- [x] Open questions resolved (`PRL-OQ-1` resolved by `PRL-DD-1`)
- [x] No CLARISA dependency
- [x] No conflicting in-flight spec — confirmed by reading `rd-contributors-and-partners/CLAUDE.md`'s active-lesson log (Lead Center, ToC center/science guards touch different fields/methods, no overlap with `onSelectDeliveryPartners` or the Partner-role buttons)
- [x] No migration involved

## 3. Task list

### `PRL-T-1` — Block Scaling/Demand/Innovation when Other is active

- **Type:** `client`
- **Description:** Add `isRoleBlockedByOther(deliveries, deliveryId)` to `RdContributorsAndPartnersService`; guard `onSelectDeliveryPartners` with it; wire the resulting `blocked` class + `aria-disabled` attribute onto the six non-`Other` `.delivery` divs across both delivery blocks in `normal-selector.component.html`; add the `.delivery.blocked` SCSS rule; add/extend unit + component tests.
- **Implements:** `PRL-R-1`, `PRL-R-2`, `PRL-R-3`, `PRL-R-4`, `PRL-R-5`, `PRL-R-6`, `PRL-AC-1`, `PRL-AC-2`, `PRL-AC-3`, `PRL-AC-4`, `PRL-AC-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts` (add method, guard existing method)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.spec.ts` (new/extended tests)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html` (bindings on 6 buttons)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.scss` (`.delivery.blocked`)
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.spec.ts` (new/extended — create if it doesn't exist)
- **Depends on:** `—`
- **Blocks:** `—`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer` (component/template patterns), `frontend-design` (dimmed/disabled state consistent with the project's `.globalDisabled` convention)
- **Sub-steps:**
  1. `RdContributorsAndPartnersService.isRoleBlockedByOther(deliveries, deliveryId)`: `return deliveryId !== 4 && !!this.validateDeliverySelectionPartners(deliveries, 4);`
  2. `onSelectDeliveryPartners(option, deliveryId)`: after the `readOnly` early return, add `if (this.isRoleBlockedByOther(option.delivery, deliveryId)) return;` — keep a one-line comment pointing at `PRL-DD-2` explaining why the "remove Other" branch below is left in place.
  3. Template (both blocks, 3 buttons each = 6 total): extend the existing `[ngClass]` on the Scaling/Demand/Innovation `.delivery` divs to add `blocked: this.rdPartnersSE.isRoleBlockedByOther(option?.delivery, <id>)`; add `[attr.aria-disabled]="this.rdPartnersSE.isRoleBlockedByOther(option?.delivery, <id>) ? 'true' : null"`. Do NOT touch the `Other` button itself.
  4. SCSS: add `.delivery.blocked { opacity: 0.45; cursor: not-allowed; }` next to `.delivery.active` in `normal-selector.component.scss`. No `pointer-events: none` (per `PRL-DD-1`).
  5. Tests — service spec: `isRoleBlockedByOther` returns `true` only for non-4 ids when 4 is present, `false` when 4 absent or when checking id 4 itself; `onSelectDeliveryPartners` is a true no-op (delivery array unchanged, by reference/value) when called with a non-4 id while 4 is active; existing multi-select and "Other clears others" tests still pass unmodified (regression).
  6. Tests — component spec: render `CPNormalSelectorComponent` (or the smallest fixture that exercises `normal-selector.component.html`) with a partner row whose `delivery = [{ partner_delivery_type_id: 4 }]`; assert the `Scaling`/`Demand`/`Innovation` buttons carry class `blocked` and `aria-disabled="true"`; simulate a click on one and assert `delivery` is unchanged; then flip to `delivery = []` (or another role) and assert the class/attribute are gone.
- **Definition of done:**
  - [ ] Code merged via project commit convention (`🔧 fix(rd-contributors-and-partners): …` or `✨ feat(...)` — this is closer to a corrective UX fix than a new feature; use `🔧 fix`). — pending: awaiting user go-ahead to commit.
  - [x] Lint clean: `npx ng lint --quiet` (client).
  - [x] Unit tests added/updated and green: `npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="rd-contributors-and-partners"` (or the two specific spec files). — 276/276 passed.
  - [x] No migration involved.
  - [x] No secret/token leaked (n/a — no logging touched).
  - [x] No API surface changed — n/a.
  - [x] No new i18n strings — n/a (no new user-facing copy).
  - [x] No bilateral/platform-report payload touched — n/a.
  - [ ] **Manual browser check** (per client `CLAUDE.md` §9 "Verifying in a REAL browser" — inject BOTH `token` and `user` in localStorage, confirm the served bundle isn't stale): open a P25 result's Contributors & Partners → External partners, select `Other` on a partner row, confirm `Scaling`/`Demand`/`Innovation` dim and do nothing on click; deselect `Other`, confirm they return to normal; repeat in the "Other(s) External Partners" block if a ToC-mapped result is available to trigger it.

## 4. Dependency graph

```
PRL-T-1  (single task, no dependencies)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PRL-TEST-1` | unit (client) | `PRL-R-2`, `PRL-R-4`, `PRL-R-5`, `PRL-AC-1`, `PRL-AC-2`, `PRL-AC-3` | `onecgiar-pr-client/.../rd-contributors-and-partners.service.spec.ts` |
| `PRL-TEST-2` | component (client, Jest + TestBed) | `PRL-R-1`, `PRL-R-3`, `PRL-R-6`, `PRL-AC-3`, `PRL-AC-4`, `PRL-AC-5` | `onecgiar-pr-client/.../normal-selector/normal-selector.component.spec.ts` |

Both specs sit under the coverage-excluded `rd-contributors-and-partners/` path (`PRL-DD-3`) — they still run and must be green, they just don't move the coverage percentage.

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, tests, build — no `migration:check:ci` involved).
- [ ] Manual QA per DoD above.
- [ ] No downstream consumer notification needed (client-only, no payload change).
- [ ] No telemetry to verify post-deploy.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] No new cross-cutting decision to promote — this is a narrow, local fix.
- [ ] No PRD open questions resolved.

## 8. Roll-back plan

1. Revert the single PR implementing `PRL-T-1`.
2. No migration, no feature flag, no downstream notification needed.

## Required cross-references

- `docs/specs/changes/partner-role-exclusive-selection/requirements.md`, `design.md`, `proposal.md` (same folder).
