# Requirements — Collapse Info/Help Panels By Default (`ITR`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `changes/info-tooltip-hover-reveal` |
| Module code | `ITR` |
| Owner | Santiago Sanchez Correa |
| Status | draft |
| Ticket(s) | [P2-3635](https://cgiarmel.atlassian.net/browse/P2-3635) |
| Depth | Standard |
| Proposal | `docs/specs/changes/info-tooltip-hover-reveal/proposal.md` (approved) |

## 2. Executive Summary

`AlertStatusComponent` (`onecgiar-pr-client/src/app/custom-fields/alert-status/`) renders `status="info"` guidance panels always expanded. 21 call sites across bilateral, Result Detail, and the legacy AoW create modal use it for multi-paragraph help text, pushing form content down the page (the reported symptom, screenshotted on the "Contribution to indicator target" field). This spec makes `info` panels collapsed-by-default with an accessible, keyboard-and-touch-operable expand toggle — reconciling the ticket's "save space" goal with `docs/ux-ui/design.md`'s existing `RFUX-R-5` rule against hover-only tooltips (which the ticket's literal wording, taken as CSS `:hover`, would violate).

## 3. Glossary

| Term | Meaning |
|---|---|
| Info panel | An `<app-alert-status status="info">` instance — static guidance/example text, not a live validation/state alert. |
| Disclosure | A UI pattern where content is hidden behind a togglable control that is reachable by click, tap, and keyboard, and remains in the accessibility tree (as opposed to a CSS `:hover`/`title` tooltip). |
| `RFUX-R-5` | The existing rule in `docs/ux-ui/design.md` §"PRMS Form UX Pattern" requiring persistent, non-hover-hidden helper copy. |

## 4. System Context & Scope

- **Touches:** `onecgiar-pr-client/src/app/custom-fields/alert-status/` (component owner) and, by inheritance, the 21 existing `status="info"` call sites in `pages/bilateral/**`, `pages/results/pages/result-detail/**`, `pages/result-framework-reporting/pages/entity-aow/**`, and `shared/components/innovation-use-form/`.
- **Does not touch:** `warning` / `error` / `success` alert variants (unchanged); the redesigned `lab-report-form`'s already-compact inline helper pattern (unaffected, different component); server/API surfaces (frontend-only, presentational change).
- **Baseline references:** `docs/prd.md` `US-S1` (result submitter filling required common fields — the exact flow the ticket's screenshot comes from); `docs/ux-ui/design.md` §"PRMS Form UX Pattern" `RFUX-R-5` (being revised, not violated) and §10 Accessibility Expectations (keyboard, focus visibility, ARIA).

### In scope

- Collapsed-by-default / expand-on-demand behavior for `AlertStatusComponent` when `status="info"`.
- A real, keyboard-operable toggle control (`<button aria-expanded>`), not a CSS hover/`title` tooltip.
- Updating `docs/ux-ui/design.md` `RFUX-R-5` to distinguish persistent validation/constraint copy (stays visible) from supplementary guidance (collapsible).
- Test coverage for the new expand/collapse behavior (unit + existing component test suite).

### Out of scope

- Any change to `warning` / `error` / `success` alert rendering.
- Migrating any screen off `AlertStatusComponent` onto a different pattern (e.g. `field-card`).
- Per-site copy rewrites of the 21 existing `description` strings.
- A generated visual mockup (per the approved proposal's Visual Reference: none needed — this is a state-toggle on an existing component).

## 5. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees a more compact form; guidance text is one tap/click away instead of always pushing the page down. |
| QA reviewer | Same info panels, same collapsed-by-default behavior, on any review screens that reuse the component. |
| PMU lead / Platform admin | No functional change; any admin screen using `status="info"` gets the same compact treatment automatically. |

## 6. Functional Requirements

### Required (MUST)

- **`ITR-R-1`** When `status="info"`, `AlertStatusComponent` MUST render collapsed by default: **only the icon**, no visible box, background, or text label — not the full `description`. *(Revised 2026-09-09, post-`ITR-T-1` user design feedback — see `execution.md` Pivot Record. Superseded: the icon-plus-visible-label full-width row shipped in `ITR-T-1`.)*
- **`ITR-R-2`** The component MUST expose a native `<button>` toggle with `aria-expanded` reflecting the current state (`"false"` collapsed, `"true"` expanded), and an `aria-label` (or equivalent accessible name) giving screen-reader users the context a sighted user would otherwise get from a visible label (see revised `ITR-R-10`).
- **`ITR-R-3`** Activating the toggle by mouse click, `Enter`, or `Space` MUST reveal the full `description` in a floating panel anchored next to the icon (CSS-positioned, not a CDK Overlay/portal — see `ITR-DD-4`), rendered via the existing `[innerHTML]` binding, preserving embedded markup such as `<br>`/`<strong>`; activating it again MUST collapse it back. *(Revised 2026-09-09 — was: reveal in-place, pushing the page down. The floating-panel requirement directly answers the user's complaint that the original full-width expand pushed form content down.)*
- **`ITR-R-4`** The expanded/collapsed state MUST NOT depend on `:hover` or the native `title` attribute — it MUST remain reachable and stable on touch devices and via keyboard-only navigation.
- **`ITR-R-5`** `status="warning" | "error" | "success"` panels MUST continue to render exactly as today (always expanded, no toggle) — this spec MUST NOT change their markup or behavior.
- **`ITR-R-6`** All 21 existing call sites of `app-alert-status status="info"` MUST inherit the new collapsed/expand behavior without any template changes at those call sites (component-level fix, per the approved proposal's Option A). *(Narrowed 2026-09-09 by `ITR-R-30`/`ITR-R-31` below — see `execution.md`'s second Pivot Record: a specific, deliberately identified subset of sites now DOES require a one-attribute template edit to opt out of collapsing entirely. `ITR-R-6` still holds as the default for every site not explicitly classified as a section-intro note.)*
- **`ITR-R-7`** `docs/ux-ui/design.md` `RFUX-R-5` MUST be revised in the same change to distinguish: (a) field-level constraint/validation copy — stays persistently visible, and (b) supplementary multi-paragraph guidance/example panels (`status="info"`) — MAY collapse behind the accessible disclosure defined by `ITR-R-1`–`ITR-R-4`.
- **`ITR-R-30`** (added 2026-09-09, post-user review of `ITR-T-5`) `AlertStatusComponent` MUST expose a new optional `@Input() collapsible: boolean = true`. When `collapsible` is explicitly `false` (regardless of `status`), the component MUST render via the exact same always-visible, no-toggle markup as the `warning`/`error`/`success` branch (`ITR-R-5`) — no icon-only trigger, no floating panel, byte-identical rendering to the pre-spec `info` treatment. Default (`true`) preserves `ITR-R-1`–`ITR-R-4`'s behavior for every other call site.
- **`ITR-R-31`** (added 2026-09-09) Any `<app-alert-status>` call site that renders as a **section-level introductory note** — i.e. positioned immediately after a section/subsection heading and before any field label or control, describing the section as a whole rather than one specific field (the user's example: the note directly under "2. Contributors & partners", before the first field) — MUST set `[collapsible]="false"`. Every other call site (positioned after a field's own label, describing that one field) keeps the default `collapsible` (icon + floating-panel disclosure). This IS a per-site template edit and is the deliberate, approved exception to `ITR-R-6`'s "no template changes" default.

### Should (SHOULD)

- **`ITR-R-10`** The collapsed trigger's *accessible name* (`aria-label`, not visible text) SHOULD give the reader enough context to decide whether to expand (e.g. "More info"). *(Revised 2026-09-09 — superseded the original visible-label requirement: the user explicitly asked for an icon-only visual with no adjoining text or box, so the "More info" copy moves from a visible `<span>` to the button's `aria-label`, keeping the SHOULD's accessibility intent without the visible chrome.)*
- **`ITR-R-11`** Toggling SHOULD NOT re-parse or re-fetch the `description` content — the region SHOULD use `[hidden]` (not `*ngIf`, and not a CDK Overlay/portal that defers rendering until first open — see `ITR-DD-4`) so it stays in the DOM and is trivially testable/measurable, per the approved proposal. This is now load-bearing for a second reason beyond the original: `design.md` §2.3's audit (29 existing spec files reading `.alert_text`/`.textContent` without interacting) depends on the content always being present in the DOM, even for the floating-panel presentation.

### Could / Nice-to-have (MAY)

- **`ITR-R-20`** A given `status="info"` call site MAY opt into a default-expanded state via a new optional input (e.g. `[startExpanded]="true"`) for a panel a screen owner judges must be seen immediately (e.g. compliance-relevant text) — resolved per-site during design/implementation, not required for every site.
- **`ITR-R-32`** (added 2026-09-10, third round of user design feedback) A field-level `status="info"` note (per `ITR-R-31`'s (b) category) MAY instead be rendered inline next to the field's own title, using `app-pr-field-header`'s existing `[tooltip]` input (from prior spec `docs/specs/changes/tooltip-keyboard-accessibility/`) rather than a separate `<app-alert-status>` block below/beside the field — for the specific call sites a screen owner judges should read as "icon right after the title" rather than "icon in the field's own disclosure position." This is a per-site opt-in migration, not a blanket requirement for every (b) site (see `ITR-DD-6`).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility** | MUST meet `docs/ux-ui/design.md` §10 (keyboard operable, visible focus ring on the toggle using `--pr-color-primary-300`, `aria-expanded` state announced to screen readers). MUST NOT reintroduce a hover-only or `title`-only disclosure (`RFUX-R-5` intent, revised per `ITR-R-7`). |
| **Backwards compatibility** | `AlertStatusComponent`'s existing `@Input()` contract (`status`, `description`, `inlineStyles`, `icon`) MUST NOT change shape for any of the 21 existing callers — no caller needs a template edit for this spec to take effect. |
| **Internationalization** | Any new static copy (the collapsed label, e.g. "More info") MUST go through `src/app/internationalization/` if hardcoded English would otherwise leak into a P22/P25-differentiated screen; MAY stay a plain string if it does not vary by portfolio (per existing project convention for structural, non-domain copy). |
| **Test coverage** | MUST NOT drop `onecgiar-pr-client` coverage below 50/60/60/60 (`custom-fields/` is coverage-excluded per `package.json`, but `alert-status.component.spec.ts` / `.cy.ts` MUST still be updated and passing). |

## 8. Requirement ID Index

| ID | Summary | Scenario ref |
|---|---|---|
| `ITR-R-1` | Collapsed by default for `info` | Scenario 1 |
| `ITR-R-2` | Toggle button with `aria-expanded` | Scenario 1, 2 |
| `ITR-R-3` | Click/`Enter`/`Space` expands & re-collapses | Scenario 2, 3 |
| `ITR-R-4` | No hover/`title`-only reveal | Scenario 4 |
| `ITR-R-5` | `warning`/`error`/`success` unchanged | Scenario 5 |
| `ITR-R-6` | All 21 sites inherit for free | Scenario 6 |
| `ITR-R-7` | `RFUX-R-5` revised | Scenario 7 |
| `ITR-R-10` | Collapsed label is informative | — (design guidance) |
| `ITR-R-11` | `[hidden]`, not `*ngIf` | — (design guidance) |
| `ITR-R-20` | Optional default-expanded escape hatch | — (design guidance) |

## 9. Scenarios

### Scenario 1 — Collapsed by default (`ITR-R-1`, `ITR-R-2`)

- GIVEN a screen renders `<app-alert-status status="info" [description]="longGuidanceText">`
- WHEN the component initializes
- THEN only the icon and a short label render, plus a `<button aria-expanded="false">`
- AND the full `description` text is not visible in the rendered layout
- BUT it must NOT remove `description` from the DOM (it stays `[hidden]`, per `ITR-R-11`)

### Scenario 2 — Expand via click (`ITR-R-2`, `ITR-R-3`)

- GIVEN the panel from Scenario 1, collapsed
- WHEN the user clicks the toggle button
- THEN the button's `aria-expanded` becomes `"true"`
- AND the full `description` becomes visible, with any embedded `<br>`/`<strong>` markup rendered correctly
- AND IT MUST re-collapse on a second click, returning `aria-expanded` to `"false"`

### Scenario 3 — Expand via keyboard (`ITR-R-3`, `ITR-R-4`)

- GIVEN the panel from Scenario 1, collapsed, and the toggle button has focus
- WHEN the user presses `Enter` or `Space`
- THEN the panel expands identically to a mouse click
- AND the focus ring remains visible on the button (`--pr-color-primary-300`, per design.md §10)

### Scenario 4 — No hover-only path (`ITR-R-4`)

- GIVEN the panel from Scenario 1, collapsed
- WHEN the user's pointer hovers over the collapsed panel without clicking (or the user is on a touch device with no hover capability)
- THEN the full `description` text does NOT reveal
- BUT it must NOT rely on `:hover` CSS or the native `title` attribute as the reveal mechanism at all

### Scenario 5 — Non-info variants untouched (`ITR-R-5`)

- GIVEN `<app-alert-status status="warning" [description]="validationMessage">`
- WHEN the component renders
- THEN the panel is fully expanded exactly as before this change, with no toggle button
- AND IT MUST behave identically for `error` and `success`

### Scenario 6 — Existing call sites inherit for free (`ITR-R-6`)

- GIVEN the legacy `aow-hlo-create-modal.component.html` "Contribution to indicator target" `status="info"` block (the exact site from the ticket's screenshot)
- WHEN this spec ships with zero changes to that template
- THEN the field renders collapsed-by-default with the new toggle, matching the behavior specified in Scenarios 1–4

### Scenario 7 — Design baseline updated (`ITR-R-7`)

- GIVEN `docs/ux-ui/design.md` currently states `RFUX-R-5` as "never hide help text behind hover, always show it persistently"
- WHEN this spec ships
- THEN `RFUX-R-5` is revised to state the validation-copy-vs-supplementary-guidance distinction
- AND IT MUST NOT leave the shipped behavior contradicting the written baseline

## 10. Dependencies & Assumptions

### Upstream dependencies

- None (no backend, no CLARISA/ToC/external service involvement — purely `custom-fields/alert-status`).

### Downstream consumers

- All 21 current consumers of `<app-alert-status status="info">` (listed in `proposal.md` §3), plus any future consumer.

### Assumptions

- No existing `status="info"` panel is relied upon by a downstream automated test that asserts the full text is visible without interaction (to be verified during design/implementation — flagged as `ITR-OQ-2`).
- The PO has not identified any panel that must stay expanded by default; if one exists, it uses the optional `ITR-R-20` escape hatch.

## 11. Open Questions

- **`ITR-OQ-1`** Should any of the 21 existing sites default to expanded (compliance-relevant or first-run guidance)? Carried over from the proposal — resolve during design with a quick per-site pass, or default all to collapsed and let the PO flag exceptions post-ship.
- **`ITR-OQ-2`** Do any of the 21 sites have Cypress/Jest specs asserting the info text is visible without interaction? If so, those specs need updating alongside this change (design.md/tasks.md to enumerate).
- **`ITR-OQ-3`** Exact collapsed-label copy ("More info" vs. an icon-only affordance vs. first line of text) — a small design decision, not a blocker.

## 12. Out-of-Band Notes

- Per root `CLAUDE.md`'s shared-file write discipline, the `docs/ux-ui/design.md` edit for `RFUX-R-5` (`ITR-R-7`) is a baseline-doc change; if this spec is executed on a non-default branch, record the edit as pending and apply it on the default branch rather than editing `docs/ux-ui/design.md` directly mid-branch — `design.md` (this spec's own design doc) should note this handoff explicitly.

## Required cross-references

- `docs/prd.md` — `US-S1` (result submitter, required common fields).
- `docs/ux-ui/design.md` — §"PRMS Form UX Pattern" `RFUX-R-5` (revised by this spec), §10 Accessibility Expectations.
- `docs/trd/trd.md` — not independently cited; this is a presentational-component-only change with no new API/data surface.
- `onecgiar-pr-client/CLAUDE.md` §5 (component rules, Tailwind-first styling) and `src/CLAUDE.md` §14 (`custom-fields/` conventions, Cypress Component Testing).
