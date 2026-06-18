## Context

The AoW page is rendered by `EntityAowAowComponent` (`entity-aow-aow.component.{html,scss}`). Its template has:
1. A `.entity-aow-aow_tabs` grid with two buttons (High-Level Outputs / Outcomes).
2. A `.entity-aow-aow_content` block that switches on `activeTabId()` and renders the per-tab header (`High-Level Outputs Indicators` / `Intermediate Outcomes Indicators` + `Reporting Phase 2025`) and the `<app-aow-hlo-table>`.

The component already uses hardcoded English UI copy for similar non-domain messages (e.g. "This HLO has no associated indicators", "There are no High-Level Outputs Indicators found"), and styles via `--pr-color-*` tokens. The project exposes yellow tokens: `--pr-color-yellow-50` (#fffbe6), `--pr-color-yellow-300` (#dfb400, main), `--pr-color-yellow-700` (#6d5904), and `--pr-color-yellow-rgb` (223,180,0).

## Goals / Non-Goals

**Goals:**
- Show a single static banner that applies to BOTH tabs, placed directly below the tab buttons and above the content card.
- Match the approved "Diseño 3" soft-yellow pill style using existing project tokens.
- Keep the exact final copy (with `in a HLO/Outcome`).

**Non-Goals:**
- No conditional logic (the banner is always shown, regardless of whether indicators are actually repeated).
- No i18n `TermKey` — the copy does not vary between P22/P25; it follows the component's existing hardcoded-English pattern.
- No backend/API/data changes. No new shared component (the banner is local to this one page).

## Decisions

- **Placement:** insert the banner markup between `.entity-aow-aow_tabs` (closes at line 15) and `.entity-aow-aow_content` (line 17). This way it sits below both tabs and above the switch, so it shows for High-Level Outputs and Outcomes alike — satisfying "show always".
- **Markup:** a `.aow-repeated-note` flex container with an inline `material-icons-round` warning icon + a `<p>` carrying the message. The final clause ("Reporting reflects data originally recorded without aggregating them.") is wrapped in `<strong>` for hierarchy (same words, no copy change).
- **Styling:** background `--pr-color-yellow-50`, 1px border `rgba(var(--pr-color-yellow-rgb), 0.4)`, icon color `--pr-color-yellow-300`, text color `--pr-color-yellow-700`, radius 9px, `body-2` typography mixin — consistent with the page's other elements. No hex literals introduced.
- **Icon:** `material-icons-round` `warning` (or `warning_amber`) per the project icon convention.

## Risks / Trade-offs

- **Ticket says "in red", team chose yellow.** The reporter (Ángel) reviewed the proposals and recommended the yellow "Diseño 3"; the copy addition (`in a HLO/Outcome`) is also his. Color choice is intentional and documented here. A red variant is trivially achievable later by swapping the token group if requested.
- **Always-visible (not data-driven)** means the banner shows even when no indicator is repeated. This is per the acceptance criteria ("show always this message") and avoids extra logic/coupling to the indicators payload.
- Low risk overall: additive, self-contained, single component, no shared/state impact.
