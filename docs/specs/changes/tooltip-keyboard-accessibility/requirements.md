# Tooltip Unification & Keyboard Accessibility — `requirements.md`

## 1. Module / Feature

- **Module:** `changes` (cross-cutting client directive — no single feature module owns `PrTooltipDirective`)
- **Sub-feature:** `tooltip-keyboard-accessibility`
- **Owner:** Santiago Sanchez Correa (assignee, P2-3323)
- **Status:** draft
- **Ticket(s):** P2-3323 (Part 2 — Part 1 already shipped, commits `20541d9b0`, `3142e434e`)
- **Depth:** **Full** — cross-cutting (1 shared directive, 39 template files, 72 call sites), behavior-changing on every screen that renders a tooltip, no visual mockup to de-risk against.

---

## 2. Context

`PrTooltipDirective` (`onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts`) is the app's single tooltip mechanism. Historically it had two click behaviors gated by the `prTooltipPinnable` input: `false` (the ~40-usage default, click hides) and `true` (5 guidance icons, click pins). P2-3323 Part 1 already unified this partially — the 5 opt-in sites now stay open on click — but left the ~40 default-behavior sites untouched, and left the pinned tooltip entirely unusable by keyboard or screen reader, with no vertical viewport clamp.

This spec is **Part 2**, and its scope was widened on 2026-09-04 by the assignee: unify **every** `[prTooltip]` usage in the app (39 template files, 72 call sites — verified by `grep -rn "prTooltip\]" onecgiar-pr-client/src --include=*.html`) to one click behavior — click opens and pins, click outside or Escape closes — and make that single behavior keyboard- and screen-reader-accessible.

Touches `docs/ux-ui/design.md` §10 (Accessibility Expectations — keyboard reachability, focus visibility, `aria-describedby` are already hard requirements, not new ones). No `docs/prd.md` acceptance criterion names tooltips directly; this spec advances **G1** (submission completeness) indirectly — a keyboard/screen-reader user currently cannot read guidance text needed to complete a field correctly. No `docs/trd/trd.md` module owns this directive; it is filed under `shared/directives/`.

---

## 3. In Scope / Out of Scope

### In scope

- `PrTooltipDirective`: one unified interaction model for every consumer — click (or `Enter`/`Space` on the trigger) opens and pins; click outside or `Escape` closes.
- Keyboard operability: trigger is reachable and activatable by keyboard; tooltip content (including links) is reachable by `Tab` while open; focus returns to the trigger on close.
- Screen-reader correctness: the open tooltip is associated with its trigger (`aria-describedby` at minimum) and its content is announced.
- Full-viewport containment: the tooltip stays inside the viewport horizontally (already true) **and vertically**, and repositions on scroll/resize while open.
- Retargeting `pr-tooltip.directive.spec.ts` off the dead `.pr_label_tooltip` selector onto the real rendered DOM, and wiring the suite into a pipeline that actually runs (Jest and/or Cypress component test per `onecgiar-pr-client/CLAUDE.md` §9).
- Auditing and migrating all 39 template files / 72 call sites so none is left on the old two-behavior split.

### Out of scope

- Converting grey-box guidance modules (pre-2026 cycles, and any module still using the box variant) to the info-icon pattern — open question, needs its own design review and proposal if approved (Jira Q3 — unresolved).
- The unsanitized-DB-text finding noted separately in the Jira thread (P2-3323 comment) — tracked as its own security-hardening ticket, not touched here.
- The pre-existing zoneless post-mount test failures tracked in P2-3322 — confirmed pre-existing, unrelated to this change.
- Any change to tooltip **copy/content** or to which field gets a tooltip.
- A formal axe/Lighthouse a11y audit baseline (`docs/ux-ui/design.md` `OG-5`) — this spec closes the one confirmed defect, not the open baseline gap.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (keyboard-only or screen-reader user) | Can now open, read, and act on every guidance/action tooltip in the reporting and bilateral forms without a mouse — today they cannot open any tooltip at all. |
| Result submitter (mouse/touch user) | Every tooltip in the app now behaves identically: click/tap opens and keeps it open; click outside or Escape closes it. Previously ~40 tooltips closed on the same click that opened them (worst on touch, where tap-to-open and tap-to-close were the same gesture). |
| QA reviewer, PMU lead, platform admin | Same unified behavior applies to every tooltip they encounter across admin, QA, and reporting screens (39 files span all of these areas). |

---

## 5. User Stories

- **`TIP-US-1`** — As a keyboard-only result submitter, I want to open a guidance tooltip with the keyboard and reach any link inside it, so that I can complete a field correctly without needing a mouse.
- **`TIP-US-2`** — As a screen-reader user, I want the tooltip's content announced and associated with its trigger, so that I know guidance exists and can hear it.
- **`TIP-US-3`** — As any user (mouse, touch, or keyboard), I want every info/action tooltip in the app to open and close the same way, so that behavior learned on one screen transfers to every other screen.
- **`TIP-US-4`** — As a user on a small or scrolled viewport, I want an open tooltip to stay fully visible and follow its trigger, so that a long guidance bubble never hides behind the top of the page.

Refines: `docs/ux-ui/design.md` §10 (Keyboard, Focus visibility, Forms rows).

---

## 6. Functional Requirements

### Required (MUST)

- **`TIP-R-1`** The directive MUST open the tooltip in response to a click on the trigger, for every consumer regardless of the current `prTooltipPinnable` value — i.e. the pinned behavior becomes universal, not opt-in.
- **`TIP-R-2`** The directive MUST open the tooltip in response to `Enter` or `Space` when the trigger has keyboard focus.
- **`TIP-R-3`** While the tooltip is open, `Tab` from the trigger MUST move focus into the tooltip's content (including any link inside it) before returning focus elsewhere in the page's natural tab order.
- **`TIP-R-4`** The directive MUST close the tooltip when the user clicks outside it (existing behavior — verified in `pin()`, must not regress) or presses `Escape` (existing behavior — verified, must not regress).
- **`TIP-R-5`** On close, the directive MUST return focus to the trigger element that opened the tooltip.
- **`TIP-R-6`** The tooltip MUST be programmatically associated with its trigger via `aria-describedby` (or an equivalent ARIA relationship if the chosen pattern in `design.md` requires a different attribute) so assistive technology announces the relationship.
- **`TIP-R-7`** The tooltip MUST remain fully inside the viewport bounds both horizontally (already true) and vertically while open.
- **`TIP-R-8`** While the tooltip is open, scrolling or resizing the viewport MUST reposition it relative to its trigger (or close it, if the chosen design decision says a moved/hidden trigger should dismiss rather than follow — this choice belongs to `design.md`, not here).
- **`TIP-R-9`** Every one of the 72 `[prTooltip]` call sites across the 39 identified template files MUST end this change on the unified behavior (`TIP-R-1`–`TIP-R-8}`) — none may remain on the old two-behavior split.
- **`TIP-R-10`** The `prTooltipPinnable` input MUST be resolved to a single design decision in `design.md` — either removed (behavior becomes unconditional) or defaulted to `true` with no remaining call site overriding it to `false` — so no consumer can silently opt back into the retired click-to-hide behavior.

### Should (SHOULD)

- **`TIP-R-20`** The directive SHOULD announce the tooltip's content to a screen reader at the moment it opens (e.g. via `@angular/cdk/a11y`'s `LiveAnnouncer` or an equivalent live-region pattern), not only on subsequent focus.
- **`TIP-R-21`** The regression suite for `PrTooltipDirective` SHOULD assert against the real rendered trigger class (`button.sgi-dac-info` or the directive's host element) instead of the dead `.pr_label_tooltip` selector currently in `pr-tooltip.directive.spec.ts`.

### Could / Nice-to-have (MAY)

- **`TIP-R-30`** The directive MAY expose a `prTooltipCloseOnScroll` (or similarly named) escape hatch for a future call site that genuinely needs dismiss-on-scroll instead of follow-on-scroll, if `design.md`'s chosen reposition strategy does not already cover every current use case.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | New/changed tooltip interaction MUST meet WCAG 2.1 AA keyboard-operability and name/role/value requirements per `docs/ux-ui/design.md` §10 ("Every action reachable by keyboard", "Focus rings MUST be visible", "Error messages MUST be associated via `aria-describedby`" — same pattern, applied to tooltips). |
| **Backwards compatibility** | No regression to the 5 already-pinned sites (Part 1) or to any of the ~40 previously click-to-hide sites beyond the intended behavior change — verified by the retargeted regression suite (`TIP-R-21`) and a full-app manual sweep (`TIP-AC-9`). |
| **Performance** | No new tooltip-open jank: `position()` (or its CDK Overlay replacement) must not introduce layout thrash on scroll — reuse the existing `pinnedListeners`-style scoped listener teardown so idle screens carry zero extra scroll/resize listeners. |
| **Internationalization** | No new user-facing strings are introduced by this change; if an ARIA label needs a string (e.g. "Close tooltip"), it MUST go through `src/app/internationalization/` per project convention. |
| **Bundle size** | `@angular/cdk/a11y` and `@angular/cdk/overlay` (if selected in `design.md`) are already transitive dependencies of `@angular/cdk` (already installed, `^21.2.14`) — this MUST NOT add a new package dependency. |

---

## 7.1 Defect Classes & Verification Gates

Named up front so no acceptance criterion below is backed by a gate blind to the defect it is meant to catch (full detail and no-pass conditions in `design.md` §10 — this table is the pointer, not a duplicate):

| Defect class | Automated gate? | Where |
|---|---|---|
| Open/close/toggle logic (click, outside-click, Escape) | Yes — Jest/jsdom | `pr-tooltip.directive.spec.ts` |
| ARIA attribute presence (`aria-expanded`, `aria-controls`, `aria-describedby`) | Yes, but presence-only — does not prove screen-reader correctness | Jest |
| Tab order / focus movement / focus restore | No in jsdom — real browser required | Cypress component test |
| Vertical clamp / reposition on scroll & resize | No in jsdom — no real layout engine | Cypress component test |
| Screen-reader announcement correctness | **No automated check exists in this repo** | Accepted gap — one manual pass at rollout (`design.md` §10, §13) |
| Compound-click regressions on the ~15-20 sites where the trigger doubles as a functional control | Partially — Cypress per flagged site | Cypress, targeted at the sites `design.md` §10.1 names |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `TIP-AC-1` | Any `[prTooltip]` trigger, mouse available | The user clicks the trigger | The tooltip opens and stays open (does not close on mouse-out). |
| `TIP-AC-2` | An open tooltip | The user clicks anywhere outside the tooltip and outside the trigger | The tooltip closes. |
| `TIP-AC-3` | An open tooltip | The user presses `Escape` | The tooltip closes and focus returns to the trigger. |
| `TIP-AC-4` | A `[prTooltip]` trigger, keyboard only | The user tabs to the trigger and presses `Enter` or `Space` | The tooltip opens. |
| `TIP-AC-5` | An open tooltip containing a link, keyboard only | The user presses `Tab` from the trigger | Focus moves into the tooltip and then onto the link before leaving the tooltip; the link is activatable with `Enter`. |
| `TIP-AC-6` | An open tooltip, screen reader active | The tooltip opens | The screen reader announces the tooltip's content and its relationship to the trigger. |
| `TIP-AC-7` | A tooltip trigger near the top of a scrolled page, tooltip taller than the remaining space above it | The user opens the tooltip | The full tooltip renders inside the vertical viewport bounds (no part clipped above `y=0`). |
| `TIP-AC-8` | An open tooltip | The user scrolls the page or resizes the window | The tooltip stays correctly positioned relative to its trigger (or is deliberately closed, per the `design.md` decision) — it never renders detached or floating over unrelated content. |
| `TIP-AC-9` | All 39 template files identified via `grep -rn "prTooltip\]" onecgiar-pr-client/src --include=*.html` | Each is manually or automatically exercised post-change | Every site exhibits the unified click-pin/click-outside-close behavior; none remains on the old click-to-hide model. |
| `TIP-AC-10` | `pr-tooltip.directive.spec.ts` | The suite runs in CI | It asserts against the real rendered trigger/tooltip classes (not `.pr_label_tooltip`) and passes. |

Cross-cutting project ACs that already apply (not restated): `AC-3` Authorization (no change — tooltips carry no role gating), `AC-9` Security and secrets (no change).

### Negative constraints (BUT / AND IT MUST)

- `TIP-AC-1` — BUT it must NOT prevent the trigger's own pre-existing `(click)` action from firing when the trigger is also a functional control (Approve, toggle, menu command, edit/delete — see `design.md` §10.1 and `TIP-DD-1`). AND IT MUST fire that action exactly once, never twice.
- `TIP-AC-2`/`TIP-AC-3` — BUT it must NOT close when the click lands inside the tooltip content itself (e.g. on one of its links) — only a click outside both the tooltip and the trigger, or `Escape`, closes it.
- `TIP-AC-4` — BUT it must NOT double-fire (open-then-immediately-close in the same keypress) on a host that is already a native `<button>`/`<a>`, since those already synthesize a `click` event from `Enter`/`Space` — the directive's own `keydown` handler is added only for non-natively-interactive hosts (`design.md` §2.3/DD-3).
- `TIP-AC-7`/`TIP-AC-8` — AND IT MUST be verified against a tooltip taller than the available viewport space; a fixture that already fits cannot exercise the clamp and is not valid evidence (named explicitly in `design.md` §10 as a no-pass condition).
- `TIP-AC-6` — BUT a passing `aria-expanded`/`aria-controls` presence assertion must NOT be reported as proof of correct screen-reader behavior — that requires the manual pass in `TIP-T-6`.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `@angular/cdk` (`^21.2.14`, already a `package.json` dependency) — specifically `@angular/cdk/a11y` (FocusTrap, `LiveAnnouncer`) and optionally `@angular/cdk/overlay` if `design.md` selects the Overlay-based approach.

### Downstream consumers

- All 39 template files listed in `design.md` §Directory Structure / call-site inventory. No server or other-module dependency — front-end only, confirmed against the Jira thread and against `pr-tooltip.directive.ts` (a pure client-side directive with no API calls).

### Assumptions

- None of the 72 call sites relies on the *current* click-to-hide behavior as part of a compound interaction (e.g., a single click that both dismisses the tooltip and fires the underlying button's own action). This MUST be verified per-site during `design.md`'s call-site audit — an assumption that turns out false for a given site becomes a `design.md` open gap, not a silent behavior break.
- No existing automated test currently locks in the click-to-hide behavior in a way that would need a deliberate "this is an intended behavior change" acknowledgment beyond `TIP-R-21`'s retarget.

---

## 10. Open Questions

- **`TIP-OQ-1`** (Jira Q2, unresolved) — Should modules that still render guidance as a permanent grey box be converted to the info-icon + tooltip pattern? Not part of this spec; would be a separate proposal if approved.
- **`TIP-OQ-2`** — For `TIP-R-8` (reposition on scroll/resize): does every one of the 72 call sites tolerate "follow the trigger while open," or does any site's layout make "close on scroll" the safer default? Resolve during `design.md`'s call-site audit before committing to one repositioning strategy for all sites.
- **`TIP-OQ-3`** — Does removing `prTooltipPinnable` entirely (`TIP-R-10`) simplify the directive enough to justify a mechanical template edit across 72 sites, or is defaulting it to `true` (leaving the input declared but unused) the lower-risk migration path? Resolve in `design.md` — it changes the diff size of every task in `tasks.md`.

All three must be resolved (or explicitly deferred with a stated default) before `tasks.md` is finalized.

---

## 11. Out-of-Band Notes

Part 1 of P2-3323 shipped without an AKILI spec. This is the first formal spec entry for `PrTooltipDirective` — once this spec is `shipped`, future tooltip changes should extend it rather than repeat an unspecced patch.

---

## Required cross-references

- `docs/prd.md` — G1 (submission completeness), indirectly.
- `docs/ux-ui/design.md` §10 (Accessibility Expectations) — keyboard, focus visibility, `aria-describedby` requirements this spec satisfies for tooltips specifically.
- `docs/trd/trd.md` — no module currently documents `shared/directives/`; no citation available, flagged as a documentation gap (not this spec's job to fix).
- `docs/specs/changes/tooltip-keyboard-accessibility/proposal.md` — approved intent this spec formalizes; scope widened per its 2026-09-04 update (Q1 resolved to "all tooltips").
