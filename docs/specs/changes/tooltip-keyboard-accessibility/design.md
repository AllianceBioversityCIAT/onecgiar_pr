# Tooltip Unification & Keyboard Accessibility — `design.md`

Linked: `docs/specs/changes/tooltip-keyboard-accessibility/requirements.md` (all `TIP-R-*`, `TIP-AC-*`), `proposal.md`.

## 1. Summary

`PrTooltipDirective` becomes the single, unconditional tooltip behavior for the whole app: **click (or `Enter`/`Space`) opens and pins; click-outside or `Escape` closes** — no exceptions, per the assignee's explicit 2026-09-04 decision (see DD-1). The directive self-upgrades any non-native trigger element to be keyboard-focusable and wires ARIA via a **toggletip pattern** (`aria-expanded` + `aria-controls`, not `role="tooltip"` — see DD-2, the likely reason the first draft failed two reviews). Tab moves focus into the tooltip content via `@angular/cdk/a11y` `FocusTrap`; focus restores to the trigger on close. `position()` gains a vertical clamp and a scroll/resize reposition listener, mirroring the existing horizontal clamp. Because the directive is the single point of truth, **almost none of the 39 template files need a code change** — only the 5 files that explicitly set `[prTooltipPinnable]="true"` need that now-meaningless attribute removed (DD-5). The biggest accepted trade-off: on ~15-20 sites the tooltip trigger is also a functional control (Approve, toggle, menu item, nav link, edit/delete) — clicking it will now both fire that action **and** pin the tooltip open over it, requiring an extra dismiss step the user didn't need before (DD-1's reversion challenge, §2.3).

## 2. Architecture Overview

### 2.1 Where this lives

- **Client module touched:** `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` (the only file with behavioral changes).
- **Client templates touched:** 5 files losing a now-redundant `[prTooltipPinnable]="true"` attribute (`pr-field-header.component.html`, `section-general-info.component.html`, `field-card.component.html`, `rd-general-information.component.html`, `result-detail.component.html`) — cosmetic cleanup only, zero behavior change since it's already the new default.
- **No other module touched.** No server, no API, no migration, no CLARISA/external integration (confirmed in `requirements.md` §2, unchanged).

### 2.2 Interaction sequence (unified, every trigger)

```
[Trigger element]
  ├── click (mouse or synthesized by native Enter/Space on <button>/<a>)
  │     └── PrTooltipDirective.onClick()
  │           ├── if already pinned → hide()
  │           └── else → show() → pin()
  │                 ├── FocusTrapFactory.create(tooltipEl) — Tab stays inside
  │                 ├── set aria-expanded="true" on trigger, aria-controls → tooltip id
  │                 ├── register: document click (outside-close), document keydown.Escape,
  │                 │             window scroll/resize (reposition, capture:true so it fires
  │                 │             inside scrollable ancestors — tables, drawers, cards)
  │                 └── store previously-focused element for restore-on-close
  ├── keydown.Enter / keydown.Space (only added when host is NOT already a native
  │     <button>/<a> — those already synthesize `click` on key activation; adding a
  │     second handler there would double-fire open→close in the same keypress)
  │     └── same path as click
  └── hide() (outside click / Escape / re-click while pinned)
        ├── FocusTrap.destroy()
        ├── aria-expanded="false"
        ├── tear down the 3 pinnedListeners (document click/keydown, window scroll/resize)
        └── restore focus to the trigger
```

### 2.3 Non-native trigger upgrade (directive-level, not per-template)

`ngOnInit` inspects `this.host.nativeElement.tagName`. If it is not `BUTTON` or `A` (i.e. the ~30 sites using `<div>`, `<span>`, `<i>` as the trigger — see requirements §5 audit), the directive sets `role="button"` and `tabindex="0"` via `Renderer2`, **unless the host already declares its own `role`/`tabindex`** (several audited sites — `dynamic-panel-menu`'s `<a routerLink>`, `result-framework-reporting-recent-item`'s existing `keydown.space`/`keydown.enter` handlers, `reporting-entry-hub`'s `aria-expanded` button — are already interactive and must be left alone). This is the mechanism that makes `TIP-R-9` (all 72 sites end unified) achievable **without editing 72 templates**: the directive, not the markup, is the keyboard-accessibility source of truth.

## 3. Data Model Changes

N/A — no entity, no persistence.

## 4. API Surface

N/A — no endpoint added or changed.

## 5. Server Workflow / Business Rules

N/A — front-end only.

## 6. Frontend Plan

### 6.1 Routes / modules

None added. `PrTooltipDirective` is already declared once (`shared/directives`) and consumed app-wide via `[prTooltip]`; no new module wiring needed.

### 6.2 Components & services

- `PrTooltipDirective` — modified. New private state: `focusTrap: FocusTrap | null`, `previouslyFocusedEl: HTMLElement | null`, a generated `tooltipId` (module-level incrementing counter, e.g. `pr-tooltip-${id}`), and a `hostIsNativelyInteractive: boolean` computed once in `ngOnInit`.
- New dependency: `FocusTrapFactory` from `@angular/cdk/a11y`, injected via `inject()`. No new package — `@angular/cdk` is already `^21.2.14` in `package.json`; `@angular/cdk/a11y` has never been directly imported in this codebase before (verified: only `@angular/cdk/clipboard` is currently used), so this is CDK's first direct a11y usage but not a new dependency.
- No new component. No new service.

### 6.3 Design system usage

- No new visual chrome — `.pr-tooltip` / `.pr-tooltip--pinned` SCSS (`custom-fields.scss`) is unchanged. `cursor: pointer` on triggers already landed in Part 1.
- A11y notes (this design's entire subject): keyboard reachability, visible focus (the trap moves native focus, so `--pr-color-primary-300` focus rings already defined app-wide apply for free — no new focus-ring CSS needed), and `aria-expanded`/`aria-controls`/`aria-describedby` per DD-2.
- i18n: no new user-facing strings. If DD-2's implementation needs an accessible name for the toggle affordance beyond the existing icon (unlikely — the trigger already has its guidance/action label), route it through `src/app/internationalization/`.

### 6.4 Real-time / notification UX

N/A.

## 7. Security & Authorization

No change. Tooltips carry no role gating or sensitive data beyond what already renders in the DOM today.

## 8. Performance & Capacity

- Scroll/resize listeners are registered **only while a tooltip is pinned** (extends the existing `pinnedListeners` teardown array) — an idle screen with zero open tooltips adds zero listeners, matching today's footprint.
- `FocusTrap.create()` / `.destroy()` run once per open/close, not per keystroke — negligible cost.
- No new bundle weight: `@angular/cdk/a11y` ships inside the already-installed `@angular/cdk` package.

## 9. Observability

No new logging. If `TIP-R-20` (announce via `LiveAnnouncer`) is implemented, no PII/secrets are involved — the announced text is the same guidance copy already rendered.

## 10. Testing Plan

**Defect classes this spec can produce, and what catches each:**

| Defect class | Can jsdom/Jest catch it? | Gate |
|---|---|---|
| Open/close/toggle logic errors (click, outside-click, Escape) | Yes — DOM events + class assertions work in jsdom | `pr-tooltip.directive.spec.ts` (Jest), retargeted per `TIP-R-21` |
| ARIA attribute **presence** (`aria-expanded`, `aria-controls`, `aria-describedby`, `role`) | Yes, but **presence only** — see next row | Jest assertion on attribute values. **Does not prove a screen reader announces correctly** — that is a separate, unmeasured class below |
| Tab order / focus movement into tooltip / focus restore on close | **No** — jsdom does not implement real focus/tab-order semantics reliably across a `FocusTrap` | Cypress component test (`.cy.ts`, real browser) — per `onecgiar-pr-client/CLAUDE.md` §9, this is exactly the category `custom-fields/` Cypress CT exists for |
| Vertical viewport clamp / reposition on scroll & resize | **No** — jsdom has no real layout engine; `getBoundingClientRect()` returns zeros | Cypress component test with real rendered layout, asserting the tooltip's rect stays within `window.innerHeight`/`innerWidth` after a scroll/resize |
| Screen-reader announcement correctness (what NVDA/JAWS/VoiceOver actually speak) | **No automated check exists in this repo or pipeline** | **Accepted gap.** No axe/Lighthouse a11y audit baseline exists yet (`docs/ux-ui/design.md` `OG-5`). Substitute: one manual pass with a real screen reader during `/akili-execute`'s rollout verification (§11 below), recorded as evidence, not skipped silently |
| Compound-click regressions on the ~15-20 flagged sites (Approve, toggle, menu item, nested icon-in-div, nav link) | Partially — Cypress CT can assert "the action still fires AND the tooltip pins" for each flagged site | Cypress component/E2E test per flagged site (§10.1) — this is the **dominant real-world risk** of this spec and gets the most test weight |
| The remaining ~55 non-flagged sites keep working (no dead click handlers, no broken layout) | No single automated check enumerates 39 files | Manual sweep task (`TIP-T-5`), checklist-driven against the requirements §5 audit table — recorded as a task deliverable, not assumed |

**No-pass / disqualifying conditions** (named per the coverage rule, not just what passes):

- A Cypress focus-order assertion that only checks "some element inside the tooltip received focus" without checking *which* element and *in what order relative to Tab count* is not evidence of correct tab order — it must assert the specific sequence (trigger → first focusable in tooltip → ... → out).
- A scroll-reposition test run only with a tooltip that already fits on screen is not evidence the vertical clamp works — the test fixture MUST use a tooltip taller than the available space (mirroring `TIP-AC-7`'s "opened near the top, taller than remaining space" scenario) or it cannot fail.
- The manual screen-reader pass is inconclusive (not a pass) if performed with a **native `<button>` trigger only** — a `<div>`/`<span>` trigger upgraded via `role="button"` behaves differently across screen readers and MUST be included in the manual pass, since that is where DD-3's directive-level upgrade is unproven in the field.

### 10.1 Cypress component-test targets (the riskiest sites, from the requirements §5 audit)

1. `result-review-drawer.component.html` — Approve button doubles as tooltip trigger, inside a scrolling drawer (scroll-reposition + compound-click, worst-case combination).
2. `phase-management-table.component.html` — tooltip on a **child `<i>`** inside a parent `<div>` that owns the edit/delete `(click)`; assert the parent action still fires exactly once and the tooltip also pins (per DD-1) — no double-fire, no swallowed click.
3. `innovation-package-custom-table.component.html` / `results-list.component.html` — dropdown menu item where `(click)="item.command(); closeMenu()"` and `[prTooltip]` share one element; assert the command still executes when the menu closes, even though the tooltip also opens.
4. `user-management.component.html` — toggle button (`onToggleUserStatus`); assert the toggle still flips state.
5. `reporting-aow-table.component.html` — a site with a **pre-existing** `emitAndStop()`/`stopPropagation()` workaround for a *different* bubbling problem (row navigation); assert that workaround still functions once the directive's own click handling is layered on top.

## 11. Backwards Compatibility & Migration Plan

- **No database, no API — nothing to migrate.** This is a pure client behavior change.
- **Behavioral compatibility:** the 5 sites already on `prTooltipPinnable=true` (Part 1) see no observable change. All other ~34 files (67 occurrences) move from click-to-hide to click-to-pin — this is the intended, requested behavior change, not a regression, but it is a real UX shift and should be called out in the PR description and, if the team does release notes, in `whats-new`.
- **Rollout:** ships as one deployable client change (no flag needed — matches how Part 1 shipped). If the manual screen-reader pass (§10, accepted gap) surfaces a blocking issue post-merge, roll back is a single revert of the directive commit(s) — no data to reconcile.

## 12. Design Decisions (ADRs)

### `TIP-DD-1` — Click always pins, even on sites where the trigger is also a functional control

- **Context:** the requirements §5 audit found ~15-20 of 72 sites where `[prTooltip]` sits on an element that already has its own `(click)` action (Approve, user-status toggle, menu commands, nav links, edit/delete, accordion expand). A naive universal "click pins" collides with these: the action fires **and** a tooltip stays pinned over the control until dismissed.
- **Decision (assignee, 2026-09-04):** apply the unified click-pin behavior universally, including these sites. The action still fires exactly once (the directive's click handler runs alongside, not instead of, the existing `(click)` handler — Angular allows multiple listeners on one native `click` event); the tooltip additionally pins open until the user dismisses it (outside click / Escape / re-click).
- **Alternatives considered:**
  1. *Hover/focus-only, no pin, on compound-click sites* — would have kept click semantics simple (action-only) and added keyboard accessibility via focus without any pin behavior on these ~15 sites, only pinning on the pure-info triggers. Rejected: it directly contradicts the assignee's explicit instruction that a click should always be able to pin, everywhere.
  2. *Case-by-case exceptions* — decide per site during implementation. Rejected as the default: it reopens the same ambiguity the assignee just resolved, and turns one directive-level change back into 15 bespoke ones. (Practically, `TIP-DD-1` still requires per-site Cypress verification — §10.1 — that the coexistence works, but the *rule* is fixed up front, not decided per site.)
- **Consequences:** on the 5 sites in §10.1, a user who clicks Approve, toggles a status, or fires a menu command now also sees a tooltip pin open over that control and must dismiss it separately. This is a deliberate, accepted trade-off, not an oversight — recorded here so a future reviewer does not "fix" it back to hover-only without knowing it was a conscious call.

**Step 2.3 reversion challenge — "what does removing click-to-hide break?"** Click-to-hide was never a documented requirement, only the directive's historical default; nothing in `docs/prd.md` or `docs/ux-ui/design.md` names it. The only sites with an existing, deliberate workaround for a *related* problem (`reporting-aow-table`, `program-overview` — row-navigation bubbling, not tooltip-hide) are unaffected by removing click-to-hide itself, and are covered by Cypress target #5 in §10.1 to confirm their unrelated `stopPropagation()` guard still holds. **No concrete breakage identified beyond the accepted UX trade-off in `TIP-DD-1` itself.**

### `TIP-DD-2` — Toggletip pattern (`aria-expanded` + `aria-controls`), not `role="tooltip"`

- **Context:** WAI-ARIA's `tooltip` role explicitly forbids interactive/focusable content inside the element it's applied to. This spec's tooltips routinely contain links (CGIAR 2030 Strategy, Impact Area scoring doc) that must be `Tab`-reachable (`TIP-R-3`). A `role="tooltip"` + focus-trap combination — which two independent technical reviews rejected as "not a valid accessibility pattern" per the proposal's Jira history — is very likely exactly this contradiction: a spec-invalid role paired with focusable content.
- **Decision:** treat the pinned tooltip as a disclosure widget ("toggletip"), not an ARIA tooltip. The trigger gets `aria-expanded` (state) and `aria-controls` (points at the tooltip's generated id); the tooltip element itself carries no `role="tooltip"` (a plain `role="group"` or no role, since it is a normal focusable content region, not a live status message). `aria-describedby` is still wired from trigger to tooltip content, honoring the ticket's own literal suggested direction, since `aria-describedby` (unlike `role="tooltip"`) carries no restriction against the referenced content being focusable.
- **Alternatives considered:**
  1. *`role="tooltip"` with a manual focus trap (the rejected first draft, inferred)* — invalid per spec once content is interactive; rejected, this is the failure being corrected.
  2. *`role="dialog"` (modal)* — over-scoped; a modal implies blocking the rest of the page and typically warrants a visible close button and `aria-modal`, which is heavier than this UI calls for and would newly require a visible dismiss affordance not in the current design.
- **Consequences:** screen readers announce the trigger as an expandable disclosure ("button, collapsed"/"expanded") rather than as a tooltip; this is the standard, spec-compliant way to expose a hint that contains interactive content, and matches the "keep escape-to-close, don't rebuild it" note already confirmed working.

### `TIP-DD-3` — Keyboard/ARIA upgrade happens in the directive, not in 72 templates

- **Context:** requirements `TIP-R-9` demands all 72 call sites end on the unified, accessible behavior. Editing 72 template call sites individually (adding `tabindex`, `role`, keydown handlers per site) would be the largest possible diff and the largest regression surface.
- **Decision:** `PrTooltipDirective.ngOnInit` inspects the host element and self-upgrades it (role/tabindex) only when it is not already natively interactive or already marked up as such (§2.3). This makes the directive itself the single point of enforcement.
- **Alternatives considered:** *per-template markup fixes* — rejected as unnecessarily large and inconsistent (39 files edited by different reviewers over time would drift).
- **Consequences:** a handful of sites already doing their own thing correctly (`dynamic-panel-menu`'s `<a routerLink>`, `result-framework-reporting-recent-item`'s existing `keydown.space/enter`, `reporting-entry-hub`'s own `aria-expanded` button) must be detected and left alone by the directive's upgrade check — get this detection wrong and it either double-handles a keypress or overwrites a role the template author set deliberately. Task `TIP-T-1` must explicitly test against these three sites.

### `TIP-DD-4` — Extend the existing DOM-append positioning (vertical clamp + scroll/resize listener), not a full CDK Overlay migration

- **Context:** the proposal's Option B recommended a full CDK Overlay migration for viewport-aware positioning "for free." The requirements §5 audit found scroll-container risk on ~12 sites (tables, a drawer, dashboard panels, an accordion) but no site with positioning complex enough (e.g., no auto-flip-to-opposite-side requirement was ever reported) to justify rewriting the whole positioning strategy.
- **Decision:** keep `position()`'s existing `getBoundingClientRect()` math; add a vertical clamp mirroring the existing horizontal one (`top = Math.max(gap, Math.min(top, window.innerHeight - tip.height - gap))`), and register `scroll`/`resize` listeners (capture phase, so scrolling inside a table/drawer ancestor is caught) only while pinned, re-running `position()` on each event — reusing the exact teardown pattern the `pinnedListeners` array already uses for the document click/keydown listeners.
- **Alternatives considered:** *Full CDK `ConnectedOverlay` migration* — gets viewport-aware flip/push positioning "for free" but rewrites a working, well-understood function across all 72 sites' visual output simultaneously, the largest possible blast radius for a benefit (auto-flip) nothing in the audit asked for. Rejected for this iteration; `TIP-R-30` (MAY, requirements §6) keeps the door open if a future site needs it.
- **Consequences:** `@angular/cdk/a11y`'s `FocusTrap` is adopted (DD needed it regardless, for `TIP-R-3`/`TIP-R-5`) but `@angular/cdk/overlay` is not — smaller diff, and the existing SCSS (`.pr-tooltip` fixed `width`/`max-width` values in `custom-fields.scss`) keeps working unmodified.

### `TIP-DD-5` — Remove the `prTooltipPinnable` input; delete it from the 5 sites that set it

- **Context:** once pinning is unconditional (`TIP-DD-1`), the input has no remaining effect. Leaving it declared-but-ignored invites a future contributor to set it to `false` expecting the old behavior back, silently doing nothing.
- **Decision:** remove `@Input() prTooltipPinnable` entirely from the directive; remove `[prTooltipPinnable]="true"` from the 5 template files that currently set it (`pr-field-header`, `section-general-info`, `field-card`, `rd-general-information`, `result-detail`).
- **Alternatives considered:** *keep the input, default it to `true`, ignore any override* — smaller diff (0 template edits) but leaves a dead, misleading API surface. Rejected — a directive input that silently does nothing is worse than a small, mechanical 5-file cleanup.
- **Consequences:** `pr-tooltip.directive.spec.ts` and any test referencing `prTooltipPinnable` must be updated in the same task (`TIP-T-3`) as the removal, not after.

## 13. Open Gaps & Follow-ups

- `TIP-OQ-1` (grey-box modules → info-icon conversion) remains open and out of scope — unchanged from `requirements.md`.
- The manual screen-reader verification (§10, accepted gap) has no automated substitute today — file a follow-up if the team wants to close `docs/ux-ui/design.md` `OG-5` (no axe/Lighthouse baseline) properly; this spec does not attempt that baseline.
- If a future site needs "close on scroll" instead of "follow on scroll" (`TIP-OQ-2`, resolved here in favor of one universal reposition strategy since the audit found no site requiring the alternative), `TIP-R-30`'s optional escape hatch is the extension point.

---

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 6 |
| Expected LOC | ~650 (directive rewrite ~250, 5-file cleanup ~10, Jest retarget/additions ~150, new Cypress CT specs ~240) |
| Expected review rounds | 2 (implementation + a verification round focused on the 5 compound-click Cypress targets in §10.1) |

**Check against declared depth (Full):** matches. A single shared directive touching 39 templates' runtime behavior, a rejected prior design attempt, and an explicit accepted UX trade-off (`TIP-DD-1`) are exactly the "cross-cutting, risky" profile Full depth is for. No change to depth recommended.

---

## Required cross-references

- `docs/specs/changes/tooltip-keyboard-accessibility/requirements.md` (same folder) — every `TIP-DD-*` ties back to a `TIP-R-*`.
- `docs/ux-ui/design.md` §10 (Accessibility Expectations).
- `docs/trd/trd.md` — no module owns `shared/directives/`; usability is explicitly deferred to `docs/ux-ui/design.md` per TRD §1B footnote ("usability owned by docs/ux-ui/design.md").
- `onecgiar-pr-client/CLAUDE.md` §9 (Testing) — Cypress CT is the mandated verification surface for anything `custom-fields/`-adjacent that jsdom cannot lay out; this spec extends that same reasoning to the shared tooltip directive.
