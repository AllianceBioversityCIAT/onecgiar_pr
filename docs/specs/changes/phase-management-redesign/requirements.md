# Requirements — Phase Management redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` |
| Module | `admin` (client) · sub-feature: phase management |
| Code | `PMR` |
| Type | Change (UI-only) |
| Depth | Standard |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | approved (2026-10-23) |
| Date | 2026-10-23 |
| Source | `proposal.md` (approved intent) + HTML mockup pasted in chat 2026-10-23 |
| PRD refs | `US-A2` (admin manages phases), persona *Platform admin* (§3), `AC-5` (phase correctness, unchanged) |
| UX refs | `docs/ux-ui/design.md` §7 brand line, DD-9 (i18n), DD-12 (Tailwind-first, violet/navy) |

## 1. Executive Summary

The Admin → Phase management page (both tabs) gets the 2026 brand look from the mockup: a page header, segmented tabs, a phases card with counters, operation cards and a restyled reminders card. **Every capability and rule stays exactly as it is today**, and the app shell (sidebar, top bar) is not touched. These are behavior-preservation requirements plus layout requirements.

## 2. Glossary

| Term | Meaning |
|---|---|
| Tab | `Results module` (`/reporting`) or `IPSR module` (`/innovation-package`) |
| Open phase | Phase row with `status = true` |
| Operation | A replication action today rendered by `app-other-functionalities` (result innovations, innovation use, IPSR) |
| Reminders card | `app-replicated-innovation-reminders` (Results tab only) |
| Shell | Sidebar, top bar, environment banner — out of scope |

## 3. System Context & Scope

**In scope:** page header and tabs, phases table card, operation cards + replication confirm dialog, reminders card header and delivery column, new i18n copy, updated specs.

**Out of scope:** shell; phase detail page (`reporting/:phaseId`); mockup footer; any server or API change; reminder status/action rules; table sort/pagination behavior.

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Platform admin / PMU admin | New layout and visual hierarchy. Same actions and same rules |
| Developers / QA | Updated selectors and specs; `data-testid`s preserved |

## 5. Functional Requirements

### PMR-R-1 — Page header and module tabs (MUST)

The page SHALL show a breadcrumb (`Admin module › Phase management`), a title, a one-line description and segmented tabs for the two modules. The active tab follows the current route.

#### Scenario: Results tab active
- GIVEN an admin on `/admin-module/phase-management/reporting`
- WHEN the page renders
- THEN the title reads "Reporting phases" and the `Results module` tab is visually selected (`aria-current="page"`)
- AND clicking `IPSR module` navigates to `/innovation-package` and the title reads "IPSR phases"
- BUT it must NOT change the routes, the guards, or anything in the sidebar or top bar

### PMR-R-2 — Phases card header with counters and CTA (MUST)

The phases table SHALL sit inside a card whose header shows the title, a **total** chip (number of phases listed) and an **open** chip (number of open phases), plus the **Add new phase** button.

#### Scenario: Counters
- GIVEN the list holds 5 phases, 1 of them open
- WHEN the card renders
- THEN the chips read "5 total" and "1 open"
- AND the counters update after a phase is created, deleted or has its status changed (without a reload)
- AND IT MUST show "0 open" (not hide the chip) when no phase is open

#### Scenario: Add new phase blocked
- GIVEN a row is being edited (today's `getFeedback()` returns a message)
- WHEN the admin looks at **Add new phase**
- THEN the button is disabled and the same feedback text is visible next to it
- BUT it must NOT create a draft row when clicked while disabled

### PMR-R-3 — Phases table presentation (MUST)

The table SHALL keep today's columns (incl. the IPSR-only *Reporting phase* column), today's inline create/edit controls and today's sort/pagination, and restyle the cells:

| Cell | Presentation |
|---|---|
| Status | Pill with text: "Open" (success color) / "Closed" (neutral) |
| Portfolio | Chip |
| Dates | `yyyy-MM-dd`, tabular figures |
| Open phase row | Highlighted row background |
| Actions | Icon buttons (edit / delete; save / cancel while editing) with accessible names |

#### Scenario: Open row highlight
- GIVEN phase "Reporting 2026" is open
- WHEN the table renders
- THEN that row is highlighted and its pill reads "Open"
- AND IT MUST convey status through the pill text, not color alone

#### Scenario: Behavior preserved
- GIVEN any existing table flow (create with mandatory-field tooltip, edit, save, cancel, delete, phase link to `:phaseId`)
- WHEN the admin performs it after the redesign
- THEN the same API call fires with the same payload and the same alerts appear as before
- BUT it must NOT enable delete when `can_be_deleted` is false (its tooltip "The phase has active results therefore cannot be eliminated" stays)
- AND IT MUST keep the edit/delete disabled tooltip text while another row is being edited

### PMR-R-4 — Phase operations as cards (MUST)

The replication operations SHALL render as a section titled "Phase operations", with the target (current open) phase name, and one card per operation in a responsive grid (2 columns ≥ md, 1 column below).

| Tab | Cards (only when a previous phase exists, as today) |
|---|---|
| Results | Replicate result innovations · Replicate innovation use results |
| IPSR | Replicate innovation packages |

#### Scenario: Execute
- GIVEN the Results tab with a previous reporting phase
- WHEN the admin clicks **Execute** on a card
- THEN the confirmation dialog opens showing the from → to phase and the same count sentence as today
- AND **Confirm** fires the same PATCH as today. **Cancel** closes the dialog with no request

#### Scenario: Running state
- GIVEN a replication is running (`massivePhaseShiftIsRunning`)
- THEN every Execute button is disabled and shows a spinner plus "Running (this process may take time, please wait)"

#### Scenario: No previous phase
- GIVEN no previous phase exists for the tab
- THEN the operations section is not rendered (unchanged rule)

### PMR-R-5 — Reminders card restyle (MUST)

The reminders card SHALL keep its data, states (loading, error + retry, empty, outcome), schedule form, confirm dialog and preview drawer. It changes in two places:
- its header shows the phase summary line (pending / unreachable) as today's subtitle;
- the four metric columns become one **Delivery** column of labelled chips: Sent · Skipped · Failed · Unreachable. A non-zero unreachable count uses the warning color.

#### Scenario: Delivery chips
- GIVEN a campaign with sent 1, skipped 0, failed 0, unreachable 13
- WHEN the row renders
- THEN the Delivery cell shows four chips with those values and their labels
- BUT it must NOT change which actions are enabled per status (`canPreviewOrSend`, `canEditOrCancel`, `canSendAgain`)

### PMR-R-6 — Legacy styling removal (SHOULD)

The redesigned templates SHOULD drop the legacy SCSS blocks they replace (tabs, action buttons, tag containers, banner option, dialog lateral bars, `<br>` spacing). Any SCSS left over must cover only what Tailwind can't express.

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Brand | Violet accent (`brand-*`), navy-carbon table header chrome, Poppins, `material-icons-round` (DD-12). Mockup indigo/Inter/SVG icons are translated, never copied |
| Responsive | No horizontal page scroll at 1280 px. The table may scroll inside its card. Header and tabs stack below `sm` |
| Accessibility | WCAG 2.1 AA. Focus is visible on tabs and buttons. Icon buttons have `aria-label`. Status is not conveyed by color alone. Motion respects `prefers-reduced-motion` (no ping/pulse decoration) |
| Dark mode | Use semantic/brand tokens only, so the page follows `design.md` §11 |
| i18n | All new strings go through `src/app/internationalization/` (DD-9) |
| Compatibility | No API, payload or route change. `data-testid`s preserved |

## 7. Defect Classes → Gates

| Defect class | Gate |
|---|---|
| Behavior regression (create/edit/delete/replicate/reminders) | Jest: `--findRelatedTests` on touched files, `--maxWorkers=2` |
| Broken selectors / copy in specs | Same Jest run + Cypress CT `phase-management-table.edit-action-tooltip.cy.ts` (batch) |
| Lint / template errors | `npx eslint <touched files> --quiet` + `ng build` type-check |
| Shell touched | `git diff --stat` limited to the paths listed in `design.md` |
| **Visual mismatch vs mockup, spacing, contrast, dark mode** | **No automated check.** Substitute: browser screenshots of both tabs (light + dark, 1280 px + 768 px) reviewed at the HITL pause (T6 visual). jsdom cannot measure layout/contrast |
| Accidental writes during visual check | Accepted procedure: browser check is read-only (shared prdb + prod mailer). Never click Execute / Send now / Save / Delete |

## 8. Open Questions (defaults applied; confirm at gate)

| ID | Question | Default used |
|---|---|---|
| PMR-OQ-1 | Table header: navy-carbon (redesign) vs light (mockup)? | Navy-carbon |
| PMR-OQ-2 | Include the phase detail page now? | No, follow-up |
| PMR-OQ-3 | Title per tab? | "Reporting phases" / "IPSR phases" |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| PMR-R-1 | Page header and module tabs | MUST |
| PMR-R-2 | Phases card header with counters and CTA | MUST |
| PMR-R-3 | Phases table presentation | MUST |
| PMR-R-4 | Phase operations as cards | MUST |
| PMR-R-5 | Reminders card restyle | MUST |
| PMR-R-6 | Legacy styling removal | SHOULD |
