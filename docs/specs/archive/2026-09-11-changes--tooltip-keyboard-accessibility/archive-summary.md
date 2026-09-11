# Archive Summary — Tooltip Unification & Keyboard Accessibility (`TIP`)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/tooltip-keyboard-accessibility/` |
| Archive date | 2026-09-11 |
| Ticket | P2-3323 (Part 2) |
| Owner / driver | Santiago Sanchez Correa |
| Branch | `qa-development-2026-ss` (not the default branch — see §9) |
| Commits | `9ac22e425` — directive rewrite + call-site cleanup (`TIP-T-1`/`TIP-T-2`); `1c9f281f1` — Jest + Cypress coverage (`TIP-T-3`/`TIP-T-4`/`TIP-T-5`) |

## 2. Final Status

**Shipped.** `TIP-T-1` through `TIP-T-5` all PASSed Reviewer (attempts ranged 2/3–3/3, each closing real, distinct findings — no HALT). `TIP-T-6` (the 39-file manual sweep + screen-reader pass) was never run through the AKILI harness as its own task, but the user has since manually tested the unified tooltip behavior across the app in a real browser and confirmed it correct (2026-09-11) — accepted as satisfying the functional half of `TIP-T-6`'s DoD. The dedicated screen-reader pass (NVDA/VoiceOver/JAWS) is recorded as **not formally performed/documented** — see §7.

## 3. Requirements Delivered

| Requirement | Delivered as |
|---|---|
| `TIP-R-*` unified click-pin behavior | `PrTooltipDirective` always opens+pins on click/Enter/Space; `prTooltipPinnable` input removed entirely |
| Keyboard operability | Trigger self-upgrades non-native hosts with `role`/`tabindex`/keydown; `Tab` reaches content/links; `Escape` closes and returns focus to trigger |
| Screen-reader association | `aria-expanded`/`aria-controls`/`aria-describedby` toggletip pattern |
| Focus trap | CDK `FocusTrap` with restore-on-close |
| Vertical viewport clamp + reposition | Clamps on open; repositions on scroll (capture-phase) and resize while pinned |
| `TIP-AC-8` scroll/resize | Verified via ancestor-scrollable-container Cypress fixture (window-scroll fixture was structurally inert, caught and fixed in attempt 2) |
| Retargeted Jest suite | `pr-tooltip.directive.spec.ts` moved off the dead `.pr_label_tooltip` selector onto real rendered DOM |

## 4. Files Changed Summary

- `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` — full rewrite (unified interaction, ARIA, focus trap, viewport clamp/reposition).
- 6 call sites — removed the now-dead `[prTooltipPinnable]="true"` binding (`field-card`, `pr-field-header`, `section-general-info`, `program-overview`, `rd-general-information`, `result-detail`).
- `pr-tooltip.directive.spec.ts` (Jest, retargeted/extended) and new Cypress component specs, including `pr-field-header.tooltip-a11y.cy.ts` (focus order, vertical clamp, scroll/resize reposition) and regression coverage for the 5 flagged compound-click sites.

## 5. Test Evidence Summary

Per-task, Reviewer-independently-verified in `execution.md`: `npx ng lint --quiet` clean throughout; `npm run build` green; `npx cypress run --component` suites green (5/5, 11/11 across the two Cypress specs); Jest directive spec green after retargeting. `TIP-T-5` Issue 2 (a misnamed keyboard test asserting `closeMenu()` but titled as if it proved `command()`) was found, tracked, and closed as attempt 3.

## 6. Validation Summary

No standalone `/akili-validate` run — validation is embedded in the execute triad's per-task Reviewer PASS verdicts (5 tasks, each independently re-derived rather than accepted on claim — e.g. `TIP-T-4`'s pixel-geometry reconstruction of the scroll-clamp fixture). The full 39-file manual sweep (`TIP-T-6`) was not run as an AKILI task; the user's own manual browser testing across the app substitutes for it here, per the user's explicit request to archive.

## 7. Accepted Warnings / Follow-Ups

| Item | Status |
|---|---|
| `TIP-T-6` dedicated screen-reader pass (native-button trigger + directive-upgraded trigger, per `design.md` §10's disqualifier) | **Not formally performed/recorded** — accepted gap; open a follow-up ticket if a screen-reader audit is later required |
| Promote `TIP-DD-2` (toggletip pattern over `role="tooltip"`) into `docs/ux-ui/design.md` §12 | **Pending, recorded in §9** — apply on `master` |
| `TIP-R-30` optional `prTooltipCloseOnScroll` escape hatch | Deliberately unimplemented — no site needed it |
| `TIP-OQ-1` (grey-box → info-icon conversion) | Stays open — needs its own proposal |
| Cosmetic: an in-test comment's stated arithmetic is superseded by Cypress's default click auto-scroll-into-view behavior | Not fixed — non-gating, noted in `execution.md` |

## 8. Historical Notes

The riskiest part of this spec (`TIP-T-4`/`TIP-T-5`) surfaced and fixed a genuine "test that cannot fail" defect: attempt 1's scroll-reposition Cypress test used a window-scroll fixture that was structurally inert against the directive's absolute-positioning math, so it passed regardless of whether the scroll listener existed. Attempt 2 replaced it with an ancestor-`overflow:auto` container fixture, and the Reviewer independently reconstructed the pixel geometry from the directive's own clamp/position formulas rather than trusting the reported numbers. A concurrency collision also occurred mid-spec: two parallel rework threads (`TIP-T-4` and `TIP-T-5`) both needed to temporarily revert the shared directive to prove falsifiability, producing one transient false-alarm Reviewer finding; no work was lost, and the Leader's response (recorded in `execution.md`) is itself flagged as a methodology lesson below.

## 9. Pending Items (spec-branch deferral)

Recorded per `/akili-archive` Step 3's branch gate (session is on `qa-development-2026-ss`, not the default branch `master`). No shared file was edited by this archive pass.

### 9.1 — `guide-sync`

None required beyond the design-doc promotion below — `pr-tooltip.directive.ts` has no dedicated folder `CLAUDE.md` (confirmed absent by both Implementer and Reviewer during execution).

### 9.2 — `factual-sweep`

None found — this is a directive-internal rewrite with no new module and no stale root-guide claim it falsifies.

### 9.3 — `trd-adr`

None. No `docs/trd/trd.md` architecture decision was overturned; this directive is not TRD-owned.

### 9.4 — `standardization` (Methodology)

Proposed edit to `.agents/leader.md`'s Concurrency Protocol: when two rework threads share a dependency that must be *temporarily* mutated to prove falsifiability (not just permanently edited), the protocol's "different files still collide through everything the checkout shares" case should explicitly cover transient reverts, not only committed changes — this spec hit exactly that collision twice on the same directive. Recommend upstreaming to the AKILI methodology repository rather than a local edit (root cause is in AKILI itself, not this project).

**Severity:** medium (caused one paused/resumed cycle, no lost work, but is a real repeatable gap in the protocol's stated scope).
