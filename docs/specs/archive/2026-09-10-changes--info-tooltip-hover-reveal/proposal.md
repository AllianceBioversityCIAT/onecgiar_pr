# Proposal: Collapse info/help panels by default, reveal on demand

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/info-tooltip-hover-reveal` |
| Slug derivation | Derived from Jira ticket intent ("hide info tooltip content by default, show on hover") — the raw command argument was a Jira URL + free-text instruction, not a slug |
| Source ticket | [P2-3635](https://cgiarmel.atlassian.net/browse/P2-3635) — "Hide info tooltip content by default – show on hover to save space" |
| Type | Change |
| Approval Mode | gated |
| Author | Santiago Sanchez Correa (assignee on P2-3635) |
| Date | 2026-09-09 |

## 2. Intent

Reduce vertical space consumed by the app's static guidance/help panels (the `ⓘ` info blocks under fields like **"Contribution to indicator target"**) by collapsing them by default and letting the user reveal the full text on demand — without breaking the accessibility guarantees the codebase already committed to for this exact UI element.

## 3. Problem / Current Behaviour

The shared `AlertStatusComponent` (`onecgiar-pr-client/src/app/custom-fields/alert-status/`) renders an always-visible, always-expanded panel for `status="info"` guidance text. Some of these blocks are multi-paragraph with embedded examples (e.g. the "Contribution to indicator target" note in the legacy `aow-hlo-create-modal` — the W1/W2 Pool Funding create flow shown in the ticket's screenshots), and they push the rest of the form down the page.

`grep` confirms 21 call sites across the client use `status="info"` today:

- `pages/bilateral/**` (9 sites — general info, geography, evidence, contributors, and 4 type-specific sections)
- `pages/results/pages/result-detail/**` (6 sites — evidences, knowledge-product-info, innovation-dev-info, rd-contributors-and-partners `multiple-wps-content`)
- `pages/result-framework-reporting/pages/entity-aow/**` (1 site — the exact field in the ticket's screenshot)
- `shared/components/innovation-use-form/` (1 site)

Because they all render through the same `AlertStatusComponent`, this is a **single shared-component change**, not 21 separate edits.

## 4. Proposed Outcome

- `AlertStatusComponent` gains a collapsed-by-default, expand-on-demand mode for `status="info"` guidance panels: the icon + a one-line label render by default; the full text is revealed by an explicit, keyboard- and touch-operable toggle (a real `<button aria-expanded>`), not a CSS `:hover`/`title` tooltip.
- `warning` / `error` / `success` variants (real-time validation/state alerts) are **out of scope** and stay always-visible — they are not "help text", they are active state the user must see without an extra tap.
- Because the fix lives in the shared component, all 21 existing call sites get the compact treatment automatically with no per-screen template changes required.

## 5. Scope

- Add a collapsed/expanded state (`signal`) and toggle affordance to `AlertStatusComponent` for `status="info"`.
- Preserve the existing `[description]` `innerHTML` contract (embedded `<br>`/`<strong>` markup already used by several callers).
- Keep the change purely presentational: no input/output contract break for existing callers (`status`, `description`, `inlineStyles`, `icon` all keep working unchanged).
- Update `alert-status.component.spec.ts` / `.cy.ts` for the new toggle behaviour.
- Promote the resolved pattern into `docs/ux-ui/design.md` (Design Decisions) once approved, since it revises an existing documented rule (`RFUX-R-5`, see §9).

## 6. Non-Goals

- Not touching `warning` / `error` / `success` alert variants.
- Not migrating the legacy `aow-hlo-create-modal` (or any other legacy screen) off `AlertStatusComponent` onto the newer `field-card` / inline-helper pattern used by the redesigned `lab-report-form` — that is a separate, larger modernization (see Approach Option B below) and not needed to satisfy this ticket.
- Not touching the short, already-compact inline helper copy already used by redesigned forms (e.g. `lab-report-form`'s one-line `<p id="contribution-helper">`) — those are not the "always-expanded, multi-paragraph" problem this ticket describes.

## 7. Affected Users, Systems, And Specs

- **Users:** anyone reporting a W1/W2 result through the legacy AoW create modal, bilateral report sections, or Result Detail sub-pages that use `app-alert-status status="info"` — i.e. most result submitters (per `docs/prd.md` personas).
- **Code:** `onecgiar-pr-client/src/app/custom-fields/alert-status/*` (component owner), plus the 21 templates listed in §3 (no changes expected there beyond re-verifying they still render correctly).
- **Specs:** `docs/ux-ui/design.md` — PRMS Form UX Pattern, specifically `RFUX-R-5` (see §9, this proposal requests revising it, not violating it silently).

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend-only? No — this is a frontend interaction change, but it is scoped to one existing shared component's collapsed/expanded states, which is simple enough to prototype directly during `/akili-specify` design (a toggle button + `[hidden]` region) rather than warranting a generated mockup. If the user wants a mockup before committing, it can be added at `/akili-specify` time via `stitch-design`.

## 9. Requirement Delta Preview

### ADDED Requirements

- `AlertStatusComponent` (status `info` only) renders collapsed by default: icon + a short label (e.g. "More info" / first line) with a `<button aria-expanded="false">` toggle.
- Activating the toggle (click or `Enter`/`Space` via keyboard) expands the panel in place (`aria-expanded="true"`), revealing the full `description`. Activating again collapses it.
- The **first** load of an info panel that gates a *currently invalid/required* field may need to stay expanded by default so first-time users aren't hunting for guidance — flagged as an open question in §11 for `/akili-specify` to resolve with the PO.

### MODIFIED Requirements

- `docs/ux-ui/design.md` `RFUX-R-5` currently says persistent, always-visible helper copy is mandatory and hover-only tooltips are explicitly forbidden ("fail completely on touch devices and screen readers"). This proposal does **not** re-introduce a hover-only tooltip — it proposes a **click/tap-to-expand disclosure that stays in the accessibility tree and works identically on touch, mouse, and keyboard**. `RFUX-R-5` needs to be revised to distinguish:
  - **Field-level constraint/validation copy** (short, e.g. "Contribution to indicator target must be ≥ 0") — stays persistently visible per the existing rule; this is what `RFUX-R-5` was written to protect.
  - **Supplementary multi-paragraph guidance/examples** (the `status="info"` panels in scope here) — MAY collapse by default behind an accessible disclosure control.

### REMOVED Requirements

- None. No existing behaviour is deleted; the always-expanded panels remain reachable, just not forced open.

## 10. Approach Options

### Option A — Add collapsed/expanded state to `AlertStatusComponent` itself (Recommended)

Add a `WritableSignal<boolean>` for expansion, default `false` for `status="info"` (default `true`/always-on for `warning`/`error`/`success`, unchanged). Render a `<button aria-expanded>` header row; the description region uses `[hidden]` (not `*ngIf`, so it stays measurable/testable and content isn't re-parsed on toggle) bound to the expanded state.

- **Pros:** One component, one test suite, zero template changes at 21 call sites, smallest safe diff, no risk of missing a site.
- **Cons:** All `status="info"` sites change behavior at once — needs a quick visual pass across the 21 sites to confirm none of them relied on the panel being permanently visible for a business reason (e.g. a mandatory-reading compliance note).

### Option B — New dedicated `app-info-disclosure` component, migrate call sites incrementally

Build a new component and swap it in site-by-site, leaving `AlertStatusComponent` untouched for `warning`/`error`/`success`.

- **Pros:** Zero risk to existing `AlertStatusComponent` consumers; fully opt-in.
- **Cons:** 21 separate template edits, much larger diff/PR surface for a single UX tweak, higher chance of an inconsistent rollout (some screens fixed, some not) — the exact drift `/akili-audit` exists to catch later.

### Option C — CSS-only hover reveal (what the ticket literally asks for)

Implement it as a pure `:hover`/`title` tooltip, matching the ticket's literal wording.

- **Pros:** Simplest possible implementation.
- **Cons:** Directly violates the just-established, cited accessibility rule `RFUX-R-5` — breaks on touch devices (no hover) and screen readers (native `title` tooltips are notoriously unreliable with AT). **Not recommended**; flagged for the user as a hard trade-off, not a style preference.

## 11. Recommended Approach

**Option A.** It satisfies the ticket's actual goal (reclaim vertical space) through the smallest, lowest-risk change — one component — while resolving the literal "on hover" request into an accessible click/tap-to-expand disclosure that keeps the panels reachable for keyboard and screen-reader users and touch devices, which a pure hover implementation (Option C) would not.

**Open question for the PO before `/akili-specify`:** should any of the 21 sites default to *expanded* (e.g. a compliance-relevant note, or a first-time-user field) rather than collapsed? Recommend a quick screen-by-screen pass during specify to flag exceptions, defaulting everything else to collapsed.

## 12. Risks, Dependencies, And Open Questions

- **Risk — accessibility regression if implemented literally.** The ticket's "show on hover" wording, taken literally, conflicts with `RFUX-R-5`. Mitigated by using a click/tap toggle instead of CSS hover (see Option A/C above). This must be called out explicitly to the reporter (Ángel) since the accepted fix will look different from a literal hover tooltip.
- **Risk — hidden business-critical text.** A handful of the 21 `status="info"` panels may carry text someone relies on being always visible (e.g. compliance language). Needs a quick per-site sanity pass at specify time, not a blanket collapse.
- **Dependency — `docs/ux-ui/design.md` update.** `RFUX-R-5` must be revised in the same change (not left contradicting shipped behavior) — this is a `docs/trd/trd.md`/`docs/ux-ui/design.md`-adjacent doc update, and per root `CLAUDE.md`'s shared-file write discipline, changes to that baseline doc should land on the default branch (or be recorded as pending) rather than silently on a spec branch.
- **Open question — default state per site.** See §11.
- **Open question — label/affordance copy.** "More info", an ⓘ-only collapsed chip, or a "Show details" link — a small design decision to settle in `/akili-specify`, not blocking the proposal's approval.

## 13. Success Criteria

- All `status="info"` panels render collapsed by default, expandable via a keyboard-, mouse-, and touch-operable control.
- No `status="warning"|"error"|"success"` panel changes behavior.
- `RFUX-R-5` in `docs/ux-ui/design.md` is revised to reflect the distinction between validation copy (stays visible) and supplementary guidance (collapsible, accessibly).
- Existing `alert-status` unit + component tests pass; new tests cover expand/collapse via click and keyboard (`Enter`/`Space`), and `aria-expanded` state.
- Manually verified in the browser on the exact screen from the ticket's screenshot (legacy AoW create modal, "Contribution to indicator target").

## 14. Next Step

```text
/akili-specify changes/info-tooltip-hover-reveal
```
