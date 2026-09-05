# Proposal: Keyboard & Screen-Reader Access For The Pinned Info Tooltip

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `tooltip-keyboard-accessibility` — derived from free-text argument |
| Spec Path | `changes/tooltip-keyboard-accessibility` |
| Source Ticket | [P2-3323](https://cgiarmel.atlassian.net/browse/P2-3323) — "Info tooltip: two different click behaviours across the form, and pinned content is not keyboard accessible" |
| Type | Change (carries one Bug-shaped sub-item — see §9) |
| Approval Mode | gated |
| Parent Spec | none (Part 1 of this ticket shipped directly, without an AKILI spec — commits `20541d9b0`, `3142e434e` on `performance-refactor`, already merged into this branch) |
| Author | Proposal drafted by Claude at the request of Santiago Sanchez Correa (assignee) |
| Date | 2026-09-04 |

## 2. Intent

Make the pinned info tooltip (the small round "i" icon used for guidance text next to form fields) usable with a keyboard and announced correctly to a screen reader, and keep it fully on-screen while the page scrolls or resizes. This is explicitly **Part 2** of P2-3323 — Part 1 (unifying click-to-pin behavior across all five icons) already shipped and is verified present on this branch.

## 3. Problem / Current Behavior

Read from `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` (current code, verified):

- The tooltip can only be **opened by a mouse hover** (`@HostListener('mouseenter')`) or by a **click** when `prTooltipPinnable` is `true` (`@HostListener('click')` → `pin()`). There is no `keydown`/`keyup.enter` handler on the trigger, so a keyboard-only user cannot open it at all — not even the non-pinned variant.
- When pinned, the tooltip `<div>` is appended to `document.body` (`show()`, line 92) with **no `aria-describedby` link back to the trigger**, so a screen reader never announces its content as related to the icon.
- `pin()` (line 137) registers document-level `click` and `keydown` (Escape) listeners to dismiss, but **never moves focus into the tooltip** — `Tab` from the trigger skips over it entirely, so the links inside (CGIAR 2030 Strategy, Impact Area scoring document) are keyboard-unreachable.
- `position()` (line 98) clamps the tooltip **horizontally** only (`left = Math.max(gap, Math.min(left, window.innerWidth - tip.width - gap))`, line 126) — there is no equivalent vertical clamp, and no scroll/resize listener to reposition it. A long guidance bubble opened near the top of the page can render partly off-screen. Comment-verified from Jira: this was already true before Part 1, but the tooltip auto-hid itself so nobody noticed; now that it stays pinned open, it is visibly blocking.
- Escape-to-close already works (`pin()` line 151-153) — confirmed, does not need to be rebuilt.

**Confirmed scope (from the Jira investigation, comment 40530):** 5 info icons in the reporting form use `prTooltipPinnable`. Around **40 more tooltips** elsewhere in the app use the directive's default (non-pinned, click-to-hide) behavior for action tooltips.

**Scope decision (2026-09-04, Santiago Sanchez Correa, assignee):** unify **all** tooltips in the app to the same click behavior — click opens and pins it open, click outside (or Escape) closes it. This resolves Open Question Q1 from the original proposal draft in favor of "all of them," not just the 5 confirmed icons. It supersedes the Part-1-era comment in the directive (*"the directive's `prTooltipPinnable` default stays `false`; roughly 40 action tooltips depend on click-to-hide"*) — that comment described the deliberate boundary of Part 1 only, not a permanent constraint.

**First design attempt already rejected.** Two independent technical reviews concluded the first draft approach for Part 2 was not a valid accessibility pattern. This proposal does not resurrect that draft — it starts the redesign from the confirmed root cause above and from the codebase's own existing precedent (§10).

## 4. Proposed Outcome

- A user can open a pinned tooltip with the keyboard (e.g. `Enter`/`Space` on the trigger, in addition to click), Tab into its content including its links, and close it with `Escape` or by tabbing/clicking away — Escape-to-close is already correct and stays as-is.
- A screen reader announces the tooltip's relationship to its trigger (`aria-describedby` at minimum; `role="tooltip"` or a dialog-like pattern depending on the option chosen in §10) and reads its content when it opens.
- The tooltip bubble stays fully inside the viewport both horizontally (already true) and vertically, and repositions on scroll/resize instead of drifting off-screen or staying anchored to a stale position.
- **Every tooltip in the app** — the 5 already-pinned info icons and the ~40 action tooltips currently using click-to-hide — behaves identically: click opens and pins it open; a click outside it, or Escape, closes it. `prTooltipPinnable` stops being an opt-in per call site and becomes the directive's only behavior (the input can be removed once every call site is migrated, or defaulted to `true` — decided in `/akili-specify`'s design phase).

## 5. Scope

- `onecgiar-pr-client/src/app/shared/directives/pr-tooltip.directive.ts` — the shared directive backing **every** tooltip in the app (pinned and non-pinned today; unified after this change).
- **All `[prTooltip]` trigger sites**, not just the 5 confirmed info icons — this now includes the ~40 action tooltips identified in the Jira investigation. `codegraph_search`/`grep` for `prTooltip` and `prTooltipPinnable` during `/akili-specify` to enumerate every call site before writing the task list, so none is missed and none is silently left on the old behavior.
- The automated test gap: `pr-tooltip.directive.spec.ts` currently targets `.pr_label_tooltip` (a class that only exists in SCSS, per the P2-3323 Part 1 comment) — this proposal's regression tests must assert against the real rendered class (`button.sgi-dac-info` / `.pr-tooltip--pinned`) and must run in the CI-wired suite (Jest/Cypress), not only a suite that "went from 14/5 to 19/3" without being wired into any pipeline.
- Vertical viewport clamp + scroll/resize repositioning for **every** tooltip once pinning is universal (today this defect is latent on the non-pinned tooltips too, since they self-hide on mouse-out before it becomes visible — once they pin open, the same fix must apply to them as well).
- Keyboard open (Enter/Space) and `aria-describedby` for every tooltip trigger, not only the 5 info icons — the accessibility requirements in §9 now apply app-wide, since scope was widened to all tooltips.

## 6. Non-Goals

- Do **not** convert the modules that still render guidance as a permanent grey box (pre-2026 cycles, and any module using the box variant today) into the info-icon pattern — that is Open Question Q3 below and needs its own design review if approved.
- Do **not** change what any tooltip *says* (content/copy) or which trigger uses which icon — only the interaction model (click pins / click-outside or Escape closes) and its accessibility.
- Do **not** fix the pre-existing zoneless post-mount pattern tracked separately in P2-3322 (3 failing assertions in the directive's contract suite were confirmed pre-existing and unrelated to Part 1's change).
- Do **not** address the separate, unrelated finding noted in the Jira thread: unsanitized DB-sourced text rendered by the same tooltip mechanism elsewhere in the app. That is flagged in Jira as deserving its own security-hardening ticket.

## 7. Affected Users, Systems, And Specs

- **Users:** any keyboard-only or screen-reader user filling the reporting form or the bilateral form (Impact Area Scores) — currently locked out of guidance text and its links entirely.
- **Systems:** `onecgiar-pr-client` only. Front-end, no backend/database change (confirmed in the Jira thread).
- **Specs:** no existing AKILI spec covers `pr-tooltip.directive.ts` — Part 1 shipped without one. This proposal is the first formal spec entry point for the directive.
- **Design baseline:** `docs/ux-ui/design.md` §10 (Accessibility Expectations) already states keyboard reachability and focus visibility as hard requirements — this change closes a gap against an existing, not a new, standard. §10 also flags `OG-5`: "No published a11y audit baseline... haven't run a formal axe / Lighthouse pass" — this proposal does not attempt that audit, it fixes the one already-confirmed defect.

## 8. Visual Reference

- Source: None.
- Location: n/a.
- Notes: this is an interaction/accessibility fix on an existing, already-styled component (the tooltip bubble's visual appearance is unchanged). No new screens or layouts are introduced. If the chosen approach in §10 changes the bubble's visual chrome (e.g. adding a visible close affordance for the dialog-pattern option), that specific delta should get a quick mockup during `/akili-specify`, not a full Figma pass.

## 9. Requirement Delta Preview

### ADDED Requirements

- The pinned-tooltip trigger MUST be openable via keyboard (`Enter`/`Space`), in addition to the existing mouse click.
- The pinned tooltip's content, including any links, MUST be reachable via `Tab` while it is open.
- The pinned tooltip MUST be announced to assistive technology as related to its trigger (`aria-describedby` minimum).
- The pinned tooltip MUST stay within the vertical viewport bounds and reposition on scroll/resize while open.
- The directive's regression suite MUST target the real rendered DOM (`button.sgi-dac-info`) and MUST run in a pipeline that actually executes on CI (Jest and/or Cypress component tests per `onecgiar-pr-client/CLAUDE.md` §9), replacing the currently-dead `.pr_label_tooltip` assertions.

### MODIFIED Requirements

- `PrTooltipDirective.pin()` — dismissal and focus-management logic changes (adds focus move-in, may add a `keydown.Escape` return-focus-to-trigger step; current close-on-Escape and close-on-outside-click stay).
- `PrTooltipDirective.position()` — gains vertical clamping and a scroll/resize reposition listener while `pinned` (registered/torn down symmetrically with the existing `pinnedListeners` array).

### REMOVED Requirements

- None. The `cursor: help` → `cursor: pointer` fix for the trigger already landed in Part 1; nothing here is being removed.

**Bug-shaped sub-item inside this Change:** the vertical off-screen/scroll-drift defect in `position()` is technically a latent bug (confirmed root cause: no vertical clamp, no reposition listener — see §3), surfaced by Part 1's pinning behavior. It is folded into this proposal instead of a separate `bugfix/` entry because it shares the exact same code path (`position()`) as the accessibility work and would require a second, overlapping edit to the same function if split out.

## 10. Approach Options

### Option A — Extend `PrTooltipDirective` in place (native ARIA attributes, manual focus management)

Add `role="tooltip"` + `id` + `aria-describedby` on the trigger, a `keydown.Enter`/`keydown.Space` handler mirroring `onClick`, and manual `focus()` calls into the first focusable element inside the tooltip on pin, with a stored reference to restore focus to the trigger on close. Add a `scroll`/`resize` listener (only while `pinned`, torn down via the existing `pinnedListeners` teardown array) that re-runs `position()` with an added vertical clamp.

- **Pros:** smallest diff; stays inside the file the whole team already understands; no new dependency; directly reuses the existing `pinnedListeners` teardown pattern so cleanup discipline doesn't regress.
- **Cons:** hand-rolled focus trap/restore is exactly the kind of thing the codebase has already gotten wrong once (this is very likely what the two rejected reviews flagged in the first draft) and what `src/CLAUDE.md` §21.7 explicitly warns about for `app-pr-dialog` ("no focus trap, no autofocus, no focus restore... fine for a click-driven confirm; not fine for anything keyboard-driven").

### Option B — Route the pinned tooltip through Angular CDK Overlay + `cdkTrapFocus`/`FocusMonitor` (already a project dependency)

`@angular/cdk` (`^21.2.14`) is already installed and already used for exactly this class of problem: `src/CLAUDE.md` §21.7 explicitly recommends **Spartan `hlm-dialog` (CDK Dialog: `autoFocus`, `restoreFocus`, trap)** over hand-rolled focus management, and points at `shared/components/global-search-palette/` as the existing precedent in this codebase. Rework `pin()` to open via `CdkOverlay` + `cdkTrapFocus` (or a lightweight `FocusTrap` from `@angular/cdk/a11y` without the full Overlay if positioning must stay custom), which gives focus trap, restore-on-close, and `Escape`-to-close for free, verified by the framework rather than hand-rolled.

- **Pros:** reuses a **proven, already-adopted** pattern in this exact codebase instead of re-deriving one — directly answers why the first draft failed two reviews (it was hand-rolled). CDK's `LiveAnnouncer` (`@angular/cdk/a11y`) can also solve the screen-reader-announcement half of the requirement.
- **Cons:** larger diff than Option A; the tooltip is currently positioned by imperative `getBoundingClientRect()` math (line 98-130) rather than CDK's `ConnectedPosition` strategy, so adopting CDK Overlay properly means also migrating the positioning logic — worth doing since it also solves the vertical-clamp/scroll-reposition requirement "for free" via `CdkConnectedOverlay`'s built-in viewport-aware flip/push strategies, but it's more surface to review.

### Option C — Minimal ARIA patch only (Option A's ARIA half), defer focus trap/scroll reposition to a follow-up

Ship `aria-describedby` + keyboard-open (Enter/Space) + Escape-to-close (already works) now; explicitly leave "Tab reaches the links inside" and "stays on screen while scrolling" as a tracked follow-up.

- **Pros:** fastest; unblocks the "at least announced and openable" bar quickly.
- **Cons:** does not satisfy the ticket's own acceptance criterion ("content of a pinned tooltip, including its links, is reachable... using only the keyboard") — this is the same kind of partial fix that got the first draft rejected by two reviews for not being "a valid accessibility pattern... would not deliver the intended result." Not recommended.

## 11. Recommended Approach

**Option B.** The codebase already has both the dependency (`@angular/cdk`) and a working, reviewed precedent for exactly this problem (`global-search-palette`, and the explicit guidance against hand-rolling this in `src/CLAUDE.md` §21.7). Re-deriving focus trap/restore by hand (Option A) is the most plausible explanation for why the first draft failed two independent technical reviews — reusing the framework primitive removes that entire class of mistake instead of attempting it a second time. Option B's larger diff also directly resolves the vertical-clamp/scroll-drift bug sub-item in the same pass, since `CdkConnectedOverlay` positioning strategies are viewport-aware by construction — avoiding a second, separate patch to `position()` later.

## 12. Risks, Dependencies, And Open Questions

**Risks**

- Widening from 5 confirmed sites to ~40+ call sites is a materially larger diff and blast radius than the original proposal draft — every `[prTooltip]` usage in the app must be re-verified against its new pinned/keyboard behavior, not just visually spot-checked. `/akili-specify` must enumerate the full call-site list (via `codegraph_search`/grep) as part of design, not discover stragglers during implementation.
- Some of the ~40 action tooltips may currently rely on click-to-hide as part of a larger interaction (e.g. a click that both dismisses the tooltip and triggers the underlying button's own action) — each site needs a quick behavioral check during `/akili-specify`'s design pass so pinning one doesn't silently break a two-purposed click.
- `custom-fields/` and its Cypress component-test suite is the correct verification surface (per `onecgiar-pr-client/CLAUDE.md` §9) — a keyboard/focus-trap change cannot be meaningfully asserted in Jest/jsdom alone; budget for `.cy.ts` coverage across every migrated call site, not just the original 5.

**Dependencies**

- None on the backend or other teams. Front-end only, confirmed in the Jira thread.

**Open Questions**

- **Q1 (scope of Part 2) — RESOLVED 2026-09-04** by Santiago Sanchez Correa (assignee): covers **all** tooltips in the app, not only the 5 confirmed icons. Reflected in §3–§6 above.
- **Q2 (grey-box modules):** Should modules still showing guidance as a permanent grey box be converted to the info-icon pattern? Still open — if yes, this needs a design review before `/akili-specify` and is a separate proposal, not part of this one.
- **Q3 (release gating):** Confirm this can ship independently of any further Part-1-style follow-up — it should, since Part 1 already shipped and this proposal only extends the same directive without reverting Part 1's behavior.

## 13. Success Criteria

- A keyboard-only user can: Tab to the info icon → open it with Enter/Space → Tab into its content and activate any link inside it → close it with Escape (focus returns to the trigger) or by tabbing past it.
- A screen reader announces the tooltip's content when it opens and its relationship to the trigger.
- Opening a pinned tooltip near the top or bottom of a scrolled viewport keeps its full content visible; scrolling or resizing the window while it is open does not leave it detached from its trigger or off-screen.
- Every tooltip in the app — including the ~40 previously click-to-hide action tooltips — now pins open on click and closes only on outside click/Escape, verified by re-running the existing directive suite (retargeted to the real DOM class) plus new coverage per migrated call site, in CI.
- The directive's automated suite is wired into a pipeline that actually runs (Jest for unit-level directive logic; Cypress component test for the real-browser keyboard/focus assertions per `CLAUDE.md` §9), closing the "nothing is guarding this today" gap flagged in the Jira investigation.

## 14. Next Step

```text
/akili-specify changes/tooltip-keyboard-accessibility
```

Standard depth (Change track). Q1–Q3 in §12 should be resolved with the ticket's decision owner before or during `/akili-specify`, since Q1 in particular changes the bounded scope `/akili-specify` will convert into requirements/design/tasks.
