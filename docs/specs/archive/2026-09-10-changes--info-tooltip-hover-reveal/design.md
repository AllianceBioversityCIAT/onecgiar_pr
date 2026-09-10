# Design — Collapse Info/Help Panels By Default (`ITR`)

Implements `docs/specs/changes/info-tooltip-hover-reveal/requirements.md`.

## 1. Summary

- Add a collapsed-by-default / click-to-expand disclosure state to the existing `AlertStatusComponent` (`onecgiar-pr-client/src/app/custom-fields/alert-status/`), scoped to `status="info"` only.
- The solution is a single-component change: no new component, no template edits at any of the ~150 existing call sites (see §2.3 — the true blast radius, corrected from the proposal's 21-site estimate).
- Biggest trade-off accepted: the ticket's literal "show on hover" wording is **not** implemented as CSS `:hover` — it becomes a real `<button aria-expanded>` toggle, per `docs/ux-ui/design.md` `RFUX-R-5` (being revised, not violated — see `ITR-DD-1`).

Links: `requirements.md` (same folder) · `docs/ux-ui/design.md` §"PRMS Form UX Pattern" `RFUX-R-5`, §10 Accessibility Expectations · `docs/prd.md` `US-S1`.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/custom-fields/alert-status/` only (`.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts`, `.cy.ts`, `.contract.cy.ts`).
- **Server modules touched:** none. Purely presentational.
- **External integrations touched:** none.
- **`docs/ux-ui/design.md` touched:** yes — `RFUX-R-5` revision (see `ITR-DD-1`), subject to the shared-file write discipline note in requirements.md §12.

### 2.2 Interaction flow

```
[Any screen template]
  └── <app-alert-status status="info" [description]="text">
        └── AlertStatusComponent (unchanged @Input contract)
              ├── isCollapsible = status === 'info'                (new, internal)
              ├── expanded = signal(startExpanded ?? false)        (new, internal)
              ├── renders header row: icon + collapsed label + <button aria-expanded>
              ├── renders content region: [hidden]="isCollapsible && !expanded()"
              └── (click | Enter | Space on button) → expanded.update(v => !v)
```

`warning` / `error` / `success` bypass `isCollapsible` entirely and render exactly as today (no header row, no button, content always shown) — a single `@if`/class branch in the template, not a parallel component.

### 2.3 Corrected blast-radius (design-time discovery)

The approved proposal counted **21** sites from a same-line `grep 'status="info"'`. A multiline-aware count during this design phase found **`<app-alert-status>` appears ~150 times across ~62 template files**, most of them with no explicit `status` attribute — which defaults to `info` (`@Input() status = 'info'`). This does **not** change the recommended approach (Option A, a component-level fix, was chosen precisely because it doesn't require per-site edits) — but it does raise the verification bar: every one of those ~150 render sites now needs to keep working with a collapsed-by-default panel.

**Audit performed (answers `ITR-OQ-2`):** grepped every `*.spec.ts` / `*.cy.ts` outside `custom-fields/alert-status/` that references `app-alert-status` or `.alert_text` (29 spec files). Every assertion found falls into one of two shapes:
1. Reads `debugElement.query(...).componentInstance.description` (an `@Input` property) — unaffected by rendering state.
2. Reads `.textContent` / `.text()` on `.alert_text` or the host element — in the DOM (jQuery `.text()`/native `.textContent` return content regardless of `display: none`), so this stays green once the content region uses `[hidden]` rather than `*ngIf` (`ITR-R-11`).

**No existing test asserts CSS *visibility* of the info text.** `ITR-OQ-2` is resolved: no known existing spec breaks. New Cypress assertions for this spec (§6.2) are the first ones to check `:visible` state, and they are new tests, not modifications of old ones.

## 3. Data Model Changes

N/A — no entities, no migrations.

## 4. API Surface

N/A — no endpoints added or changed.

## 5. Server Workflow / Business Rules

N/A — frontend-only change.

## 6. Frontend Plan

### 6.1 Routes / modules

No route or module changes. `AlertStatusComponent` stays declared in `custom-fields.module.ts` exactly as today.

### 6.2 Component design

**Revised 2026-09-09** (post-`ITR-T-1` user design feedback — `ITR-DD-4` below; see `execution.md` Pivot Record). The signal/state contract below is UNCHANGED from the original `ITR-T-1` implementation; only the template/markup and the visual treatment of the trigger and the expanded content change.

`alert-status.component.ts`:

- `expanded: WritableSignal<boolean>` seeded from `startExpanded` in `ngOnInit()` (`ITR-R-20`).
- `get isCollapsible(): boolean` — **revised again 2026-09-09 (`ITR-R-30`)**: now `return this.status === 'info' && this.collapsible;` — a plain getter (not `computed()`, unchanged reasoning from `ITR-T-1`'s rework).
- New `@Input() collapsible: boolean = true` (`ITR-R-30`) — when a call site sets `[collapsible]="false"`, `isCollapsible` is `false` regardless of `status`, so the template's `@else` branch renders (identical to `warning`/`error`/`success`: always-visible, no toggle, no icon-only trigger, no floating panel). This is how section-level intro notes (`ITR-R-31`) opt out of the whole disclosure mechanism.
- `toggle(): void` — flips `expanded`.
- `collapsedLabel(): string` — still returns `"More info"` (`ITR-DD-2`, unchanged), but its consumer changes: it is now bound to the button's `aria-label`, not rendered as visible text (`ITR-R-10`, revised).

`alert-status.component.html` — restructure the `info`-collapsible path's visual treatment (state/branching logic otherwise unchanged; the `@else` branch is now reached by BOTH non-info statuses AND `[collapsible]="false"` info sites):

```
<div class="pr_alert {{ status }}" [style]="inlineStyles">
  @if (isCollapsible) {
    <button
      type="button"
      class="alert_toggle"
      [attr.aria-expanded]="expanded()"
      [attr.aria-label]="collapsedLabel()"
      [attr.aria-controls]="panelId"
      (click)="toggle()">
      <i class="material-icons-round">{{ iconName }}</i>
    </button>
    <div class="alert_text pr-body-2 alert_popover" [id]="panelId" [hidden]="!expanded()" [innerHTML]="this.description"></div>
  } @else {
    <div class="alert_badge"><i class="material-icons-round">{{ iconName }}</i></div>
    <div class="alert_text pr-body-2" [innerHTML]="this.description"></div>
  }
</div>
```

`panelId` is a per-instance stable id (`` `alert-panel-${id}` ``, where `id` is a module-level incrementing counter read once per instance — the simplest unique-id pattern, no Angular DI needed) — closes the previous ADVISORY finding (no `aria-controls`/`id` pairing) for free while making this change anyway.

Notes:
- **No visible label, no chevron.** The collapsed trigger is icon-only — no `.alert_label` span, no `.alert_chevron`. The accessible name moves to `aria-label` (`ITR-R-10`, revised) so screen-reader users still get "More info" context; sighted users get only the icon, per the user's explicit visual feedback ("solo el ícono, sin texto ni caja").
- **`.alert_text` becomes a CSS-anchored floating panel, not an in-flow block.** `.pr_alert.info` gets `position: relative`; `.alert_text.alert_popover` gets `position: absolute` (anchored near the icon, e.g. `top: 100%; left: 0;` with a small offset), a `max-width` (e.g. `320px`, wrapping text), `background: var(--pr-surface-card)` (or equivalent card/popover surface token), `border`, `box-shadow`, and a `z-index` high enough to sit above adjacent form content. This is what stops the expanded text from pushing the rest of the form down — the direct fix for the user's original complaint, sharper than `ITR-T-1`'s in-flow expand.
- **`[hidden]` retained — do NOT switch to a CDK Overlay/portal.** See `ITR-DD-4`. The content stays in the DOM at all times (collapsed or expanded), preserving §2.3's audit validity (29 existing spec files across the app read `.alert_text`/`.textContent` without interacting — a CDK Portal that defers rendering until first open would break all of them for any `status="info"` render, since `info` is also the default `status`).
- The `[innerHTML]` binding and its content stay a **sibling** of the toggle button (not nested inside it), unchanged from `ITR-T-1`.
- No new npm dependency, still — `position: absolute` + `[hidden]` needs no CDK, no portal, no new Spartan-generated component.
- **Known risk, to be verified in manual QA (`tasks.md` §6):** an absolutely-positioned panel can be visually clipped by an ancestor with `overflow: hidden`/`overflow: auto` (e.g. a scrollable modal body) or can overflow the viewport near a screen edge. Unlike `ITR-T-1`'s in-flow expand, this is a real risk across ~150 call sites in varied layouts (modals, cards, narrow columns). `tasks.md` §6's manual QA step (the exact ticket screenshot site, `aow-hlo-create-modal`, plus 2-3 other module spot-checks) is the mitigation for this spec; a more robust fix (viewport-aware repositioning, i.e. an actual CDK Overlay `ConnectedPosition` strategy) is deferred as a fast-follow if clipping is observed in practice — see `ITR-DD-4`'s Consequences.

### 6.3 Design system usage

- Icons: existing `material-icons-round` font (already loaded), no new icon library. No chevron in the revised design (removed per user feedback) — the icon itself is the only visual affordance; `aria-expanded` communicates state to assistive tech.
- Tokens: floating panel surface uses `--pr-surface-card` (or the nearest existing card/popover surface token — confirm against `colors.scss` at implementation time) + `--pr-border`; focus ring via `--pr-color-primary-300` on `.alert_toggle:focus-visible` per `docs/ux-ui/design.md` §10.
- Tailwind-first rule: this component's SCSS file already exists and is small; the new floating-panel rules are a handful of position/shadow/z-index declarations that fit the existing SCSS file's scope (not new Tailwind utilities in the template, consistent with the component's existing style).
- A11y: `<button aria-expanded aria-label aria-controls>` is the WAI-ARIA "disclosure"/popup pattern — operable by `Enter`/`Space` natively, focus-visible ring, no `tabindex` hacks. `Escape` to close is a nice-to-have, not required by any `ITR-R-*` — the Implementer may add it if trivial, but it is not a gate.
- i18n: `collapsedLabel()`'s string is now an `aria-label`, not visible copy — same treatment as before (plain string, not promoted to a `TermKey`), since it never renders on screen and does not vary P22/P25.

### 6.4 Real-time / notification UX

N/A.

## 7. Security & Authorization

N/A — no new data exposure, no auth surface.

## 8. Performance & Capacity

Negligible — one boolean signal per component instance, no new subscriptions, no new HTTP calls, no bundle-size impact (no new dependency).

## 9. Observability

N/A — no new logs/metrics; this is a pure UI state toggle.

## 10. Testing Plan (forward-looking)

- **Unit (`alert-status.component.spec.ts`):** add cases for `isCollapsible()` true only when `status === 'info'`; `expanded()` initial value from `startExpanded`; `toggle()` flips `expanded()`.
- **Component tests (`alert-status.cy.ts`, `alert-status.contract.cy.ts`):** add a new `describe('collapsible info panel')` block asserting: collapsed by default (`.alert_text` `not.be.visible`, toggle `aria-expanded="false"`); click reveals (`.alert_text` `be.visible`, `aria-expanded="true"`); a second click re-collapses; keyboard `Enter`/`Space` on the focused button reveals it identically to a click; `warning`/`error`/`success` render with no `.alert_toggle` present at all. Existing tests in both files are **not modified** — §2.3's audit confirms they stay green as-is.
- **No new Jest/Cypress spec needed at any of the ~150 consumer sites** — they inherit the behavior through the shared component; the 3 files above are the complete test surface for this spec.
- Manual verification: the exact screen from the ticket's screenshot (`aow-hlo-create-modal`, "Contribution to indicator target") in a real browser, per `onecgiar-pr-client/CLAUDE.md` §9's browser-verification rules (inject `token` **and** `user`; confirm the served bundle is not stale).

## 11. Backwards Compatibility & Migration Plan

- No `@Input`/`@Output` removed or renamed; `startExpanded` is additive and optional (defaults to `false`, i.e. today's visual starting point becomes "collapsed" rather than "expanded" — this is the intended behavior change, not a compatibility break of the *contract*).
- No feature flag: this is a low-risk, purely visual change to a single shared component with a clear rollback (revert the component + doc edit).
- `docs/ux-ui/design.md` `RFUX-R-5` update ships in the same PR as the component change so the written baseline never contradicts shipped behavior (requirement `ITR-R-7`). Per root `CLAUDE.md`'s shared-file write discipline: if this spec executes on a non-default branch, the `design.md` edit is recorded as pending in `tasks.md` and applied on the default branch, not committed mid-branch.

## 12. Design Decisions (ADRs)

### `ITR-DD-1` — Click/tap disclosure, not CSS hover, resolves the ticket vs. `RFUX-R-5` conflict

- **Context:** The ticket literally asks for "show on hover." `docs/ux-ui/design.md` `RFUX-R-5` explicitly forbids hover-only tooltips because they fail on touch devices and screen readers.
- **Decision:** Implement a real `<button aria-expanded>` toggle (click, tap, `Enter`, `Space` all work identically); revise `RFUX-R-5` to distinguish persistent validation copy (unchanged) from collapsible supplementary guidance (this component).
- **Alternatives considered:** (a) Literal CSS `:hover`/`title` tooltip — rejected, directly breaks `RFUX-R-5` and fails on touch/screen readers (Option C in the proposal). (b) Leave panels always-expanded and only shrink their padding/typography — rejected, doesn't address the ticket's actual complaint (the text itself, not just its chrome, is what pushes the page down).
- **Consequences:** The shipped behavior looks different from a literal reading of the ticket title. This must be communicated back to the reporter (Ángel) — flagged in `tasks.md` as a comms note, not a code task.

### `ITR-DD-2` — Collapsed label is a short static string, not per-caller configurable

- **Context:** 150 call sites currently pass only `status`/`description`/`inlineStyles`/`icon`. Requiring every caller to also pass a collapsed-label string would be a breaking, high-diff change contradicting the NFR backwards-compatibility requirement.
- **Decision:** Use one fixed label ("More info") for every `status="info"` panel app-wide, defined once in the component.
- **Alternatives considered:** Deriving the label from the first N characters of `description` — rejected: `description` often starts mid-sentence or with an `<a>`/`<strong>` tag, producing broken-looking truncated HTML in the label.
- **Consequences:** Every collapsed panel reads identically ("More info"); if a specific screen needs a more descriptive collapsed label later, that's an additive follow-up (new optional `@Input() collapsedLabel`), not part of this spec.

### `ITR-DD-3` — `startExpanded` escape hatch, unused by default

- **Context:** `requirements.md`'s `ITR-OQ-1` (should any site default to expanded?) has no PO answer yet at design time.
- **Decision:** Ship the `[startExpanded]` input (`ITR-R-20`) but do not set it to `true` at any of the 150 call sites in this spec. If the PO later flags a specific panel (e.g. a compliance note), that becomes a one-line follow-up, not a spec-blocking decision now.
- **Alternatives considered:** Blocking this spec on a full per-site PO review — rejected as disproportionate to a space-saving UI tweak; the escape hatch exists precisely so that review can happen asynchronously without holding up the fix.
- **Consequences:** All ~150 panels ship collapsed. `ITR-OQ-1` stays open post-ship as a fast-follow, tracked in `tasks.md`.

### `ITR-DD-4` — Icon-only trigger + CSS-anchored floating panel, not a CDK Overlay popover (added 2026-09-09, post-user design feedback)

- **Context:** After `ITR-T-1` shipped (icon + visible "More info" label + chevron, in a full-width row; expanding pushed the rest of the form down in-flow), the product owner reviewed it live and rejected the visual: the collapsed row still reads as a gray box with text, and it still wanted screen real estate. Requested instead: bare icon only, positioned where the panel already sits (between field label and control — see the corrected discovery below), expanding into a floating overlay rather than pushing content down.
- **Corrected discovery:** the product owner's first ask was for the icon to sit *inline next to the field label itself* (same line as the label text). Investigating actual call-site markup (`aow-hlo-create-modal.component.html`, the ticket's own screenshot site) showed `<app-alert-status>` is rendered as a **sibling block** after `<app-pr-field-header label="...">`, not inside it, across effectively all ~150 sites. True inline-with-label placement would require either editing every call site (violates `ITR-R-6`) or extending the shared `app-pr-field-header` component (a much larger change touching hundreds of unrelated fields with no info panel at all) — out of proportion to this spec. The product owner, informed of this trade-off, chose to keep the panel's current DOM position (between label and control) and only change its own visual treatment (icon-only, floating-panel expand) — this is what `ITR-DD-4` actually decides.
- **Decision:** (1) Collapsed trigger renders **only the icon** — no visible label text, no chevron; the "More info" copy moves to the button's `aria-label` so screen-reader users keep the context (`ITR-R-10`, revised). (2) Expanding renders the description in a `position: absolute` panel anchored near the icon via plain CSS — not a full-width in-flow block, so it no longer displaces sibling form content. (3) The expanded panel is built as a **CSS-positioned `[hidden]` element**, explicitly **not** a CDK Overlay/portal (e.g. Spartan's `HlmPopover`, which is available in this project's dependency tree — `@angular/cdk` and `@spartan-ng/brain` are already installed) — see next bullet for why.
- **Alternatives considered:** Spartan's `HlmPopover` (CDK Overlay-based, click-triggered, viewport-aware repositioning) was evaluated via the Spartan MCP and would give more robust positioning (auto-flip near viewport edges, escapes ancestor `overflow: hidden` clipping via a top-level overlay container) than a hand-rolled `position: absolute` panel. **Rejected for this spec** because `HlmPopover`'s content renders through `*hlmPopoverPortal`, a CDK Portal — a structural directive that does not render its content into the DOM until the popover first opens. This directly conflicts with `ITR-R-11` and invalidates §2.3's audit: that audit found 29 existing spec files across the app read `.alert_text`/`.textContent` on an `app-alert-status` instance **without interacting with it** — safe only because `[hidden]` keeps the content in the DOM at all times. Since `info` is also the component's *default* `status`, switching to a portal would risk breaking any of those 29 files wherever a call site relies on default/`info` status, a blast radius far larger than this spec's own three files. A hand-rolled CSS-anchored panel keeps the `[hidden]`-always-in-DOM invariant intact and costs zero new dependencies.
- **Consequences:** The floating panel can be visually clipped by an ancestor `overflow: hidden`/`auto` container, or overflow the viewport near a screen edge — a real risk this spec did not have before (`ITR-T-1`'s in-flow expand had no clipping risk). Mitigated by `tasks.md` §6's manual QA step (the ticket's exact site plus 2-3 spot-checks across modules). If clipping is observed in practice post-ship, the fast-follow is to adopt `HlmPopover` properly with a **non-lazy content strategy** (e.g. keep the `[hidden]` region as today but reposition it via CDK's `ConnectedPositionStrategy` directly, without the lazy `*hlmPopoverPortal`) rather than reverting to the in-flow expand.

### `ITR-DD-5` — `[collapsible]` escape hatch for section-level intro notes (added 2026-09-09, second round of user design feedback)

- **Context:** After reviewing `ITR-T-5`'s icon-only + floating-panel treatment live (screenshot: the "Contributors & partners" section, an info note directly under the section heading, before any field), the product owner clarified the visual complaint was really about **per-field** notes cluttering the form — a note describing the section as a whole, appearing once right after the section title, is fine to keep as a persistently-visible box exactly as it rendered before this entire spec.
- **Decision:** Add `@Input() collapsible: boolean = true`. `isCollapsible` becomes `status === 'info' && collapsible`. A call site sets `[collapsible]="false"` to render through the exact same `@else` branch as `warning`/`error`/`success` — always visible, no button, no icon-only trigger, no floating panel. Default (`true`) preserves the icon+popover treatment (`ITR-R-1`–`ITR-R-4`) for every other site.
- **Site classification criterion (`ITR-R-31`):** a call site gets `[collapsible]="false"` when the `<app-alert-status>` is the **first thing after a section/subsection heading**, before any field label or control — i.e. it describes the section, not one field. Every other site (positioned after or beside a specific field's own label) keeps the default icon+popover treatment. This is a positional/structural criterion, decided by reading each call site's surrounding template, not a subjective per-site visual judgment call — the product owner explicitly chose this over a screenshot-by-screenshot approval pass (see `execution.md`'s second Pivot Record) to keep the audit tractable across ~150 sites.
- **Alternatives considered:** (a) Reusing `[startExpanded]="true"` (`ITR-R-20`) for section-intro sites — rejected: that still ships the icon+toggle chrome, and the user explicitly said no icon/no click at all for these, not just "start open." (b) A boolean derived automatically from DOM position (e.g. the component introspecting its own preceding sibling at runtime) — rejected as fragile and implicit; an explicit `@Input` is the same one-line cost per site and is grep-able/auditable in the codebase, whereas runtime DOM introspection would be invisible in the template and break silently if a future edit reorders siblings.
- **Consequences:** `ITR-R-6`'s "zero template changes" promise is narrowed: sites classified as section-intro notes (`ITR-R-31`) DO need one attribute added (`[collapsible]="false"`). This is a bounded, explicit, developer-auditable set (identified via a template survey across the ~62 files from §2.3, not a blanket exception), tracked as a new task (`tasks.md` `ITR-T-7`).

### `ITR-DD-6` — Reuse `app-pr-field-header`'s existing `[tooltip]` mechanism for inline-with-label field notes (added 2026-09-10, third round of user design feedback)

- **Context:** After `ITR-T-7` shipped, the product owner pointed at three live field-level examples ("Can this result be mapped to a ToC KPI?", "Did the Program invest financial resources...", "Lead center") where the `app-alert-status` icon renders as its own block below/before the field, separated by visible whitespace from the field's title — not immediately after the title text on the same line, which is what the user actually wants for field-level notes. Investigation (during `ITR-DD-4`) had already ruled out true inline-with-label placement as disproportionate, reasoning it would require extending a widely-shared component. That reasoning is now superseded: `app-pr-field-header` (used internally by `pr-select`, `pr-multi-select`, `pr-yes-or-not`, and others) **already has** an optional `[tooltip]` input, shipped by a prior, unrelated spec (`docs/specs/changes/tooltip-keyboard-accessibility/`) — it renders the label text followed immediately by a small ⓘ icon (`<app-pr-info-icon>`) on the same line (`.pr_label_row`), opening a click/`Enter`/`Space`-triggered, `Escape`-dismissible, ARIA-toggletip-pattern tooltip (`PrTooltipDirective`) mounted to `document.body` (never clipped by ancestor `overflow`) — using a wide (420px), scrollable style (`sgi-dac-tooltip`, hardcoded in `pr-field-header.component.html`) already sized for multi-paragraph guidance, not just short hints. `pr-select` and `pr-yes-or-not` already forward this input to their internal `app-pr-field-header`; `pr-multi-select` does not yet.
- **Decision:** For field-level (b) notes where a screen owner wants the icon inline with the title (not in the field's current disclosure position), migrate the site to use `app-pr-field-header`'s existing `[tooltip]` input instead of a separate `<app-alert-status>` — remove the `<app-alert-status>` tag entirely at that site, pass the same description text into `[tooltip]` on the field component (`pr-select`/`pr-multi-select`/`pr-yes-or-not`) instead. Add the missing `tooltip` input + forwarding to `pr-multi-select` (mirroring `pr-select`'s existing `readonly tooltip = input<string>('')` pattern) so all three field types support it uniformly.
- **Scope (per `ITR-R-32`):** this is a **per-site opt-in migration**, not a mandate to move every (b)-classified field-level note onto this mechanism. `ITR-T-7`'s existing icon+popover treatment (on the field's `app-alert-status`, in its current DOM position) remains the default for field-level notes; this ADR only applies where a screen owner has specifically asked for inline-with-title placement. Migrating all remaining field-level sites is a deliberate, separate future decision (like `ITR-OQ-1`), not automatic fallout from this ADR.
- **Alternatives considered:** (a) Build a new inline-icon affordance from scratch inside `AlertStatusComponent` or `pr-field-header` — rejected: duplicates an already-shipped, already-accessibility-audited (dedicated `pr-field-header.tooltip-a11y.cy.ts` suite), already-battle-tested (62 files already use `prTooltip` app-wide) mechanism, for no benefit. (b) Extend the migration to all (b) sites now — rejected per the user's own explicit choice (scoped to the 3 example sites now, broader migration deferred).
- **Consequences:** Two field-level disclosure mechanisms now coexist for `status="info"` notes: (1) the default `AlertStatusComponent` icon+popover (`ITR-T-1`/`ITR-T-5`), used at every (b) site not explicitly migrated; (2) `app-pr-field-header`'s `[tooltip]`, used only at sites explicitly migrated under this ADR. This is intentional, not drift — the two mechanisms solve the same accessibility problem (no hover-only reveal) via different visual placements (below/beside the field vs. inline with the title), and a future spec MAY formalize a single migration path if the app converges on one everywhere.

## 13. Reversion Challenge (Step 2.3)

**Trigger:** This design reverts already-shipped behavior — every `status="info"` panel goes from "always visible" to "collapsed by default."

**Challenge — "what does removing always-visible break?"** Answered by the §2.3 audit: no existing Jest/Cypress spec asserts CSS visibility of `.alert_text`; all either read the `description` `@Input` directly or read `.textContent`, both unaffected by `[hidden]`. No production dependency on always-visible state was found (no analytics hook, no scroll-into-view-then-read pattern, no server-side rendering/PDF export path that reads live DOM — `pdf-reports/` renders its own content, not a snapshot of this component). **No breakage identified; safe to proceed as designed.**

## 14. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | 4 (component logic + template + SCSS; unit tests; Cypress CT tests; `design.md`/`RFUX-R-5` doc update) |
| LOC | ~180–260 (component ~60 template/TS lines, ~40 SCSS lines, ~100–150 across the three test files, ~15 doc lines) |
| Review rounds | 1 (single component, no cross-module coordination, low ambiguity after this design) |

**Depth check:** `Standard` (chosen in `requirements.md`) fits — slightly on the lighter side of Standard given the single-file blast radius, but the accessibility-rule revision (`ITR-DD-1`) and the ~150-site verification surface (§2.3) justify not dropping to `Lite`. No change to declared depth.

## 15. Open Gaps & Follow-ups

- `ITR-OQ-1` (per-site default-expanded exceptions) stays open post-ship — `ITR-DD-3` ships the escape hatch but exercises it nowhere; a fast-follow ticket can flip specific sites once the PO reviews.
- `ITR-OQ-3` (exact collapsed-label copy) is resolved by `ITR-DD-2`: "More info", fixed, no further design needed.
- The `docs/ux-ui/design.md` `RFUX-R-5` revision text itself is drafted as part of `tasks.md`'s doc-update task, not finalized here — the distinction (`ITR-R-7`) is decided; the exact wording is a small copy-edit task.

## Required cross-references

- `docs/specs/changes/info-tooltip-hover-reveal/requirements.md` (same folder).
- `docs/prd.md` `US-S1`.
- `docs/ux-ui/design.md` §"PRMS Form UX Pattern" `RFUX-R-5` (revised), §10 Accessibility Expectations.
- `docs/trd/trd.md` — not cited; no backend/API/data surface touched.
- `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, interactive-controls rule), §9 (browser verification, Cypress CT); `src/CLAUDE.md` §14 (`custom-fields/` conventions).
