# Design — Phase Management redesign

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/phase-management-redesign` |
| Code | `PMR` |
| Depth | Standard |
| Requirements | `requirements.md` (PMR-R-1..6) |
| Approval Mode | gated |
| Date | 2026-10-23 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

## 1. Summary

This is a client-only re-skin of `pages/admin-section/pages/phase-management/**` and the shared `phase-management-table`. **No component class gains or loses behavior.** Templates are rewritten with Tailwind and Spartan helm primitives on the brand tokens. The only TS additions are two read-only counters and an i18n copy object. The design accepts one constraint: the edit-action markup in the table keeps its exact binding strings, because a Cypress CT locks them verbatim.

## 1A. Premise Ledger

| # | Premise | Source | How verified | Status | If false |
|---|---|---|---|---|---|
| PMR-P-1 | `PhaseManagementTableComponent` is only used by the two phase-management tabs | grep `app-phase-management-table` / `PhaseManagementTableModule` | Hits only in `reporting.*`, `innovation-package.*` and the component itself | verified | Restyle would leak to another page; scope the styling with an input |
| PMR-P-2 | `app-pr-table` already renders the navy-carbon header chrome | `shared/components/pr-table/pr-table.component.scss:30` | Comment and rule "Dark chrome header: same navy-carbon gradient as the rebrand navbar" | verified | Add header styling locally (resolves PMR-OQ-1 differently) |
| PMR-P-3 | Spartan helm is available via `@spartan/*` aliases: badge, breadcrumb, button, dialog, table, tooltip, separator, skeleton | `onecgiar-pr-client/tsconfig.json` paths | Alias list read | verified | Fall back to Tailwind-only markup |
| PMR-P-4 | CT `phase-management-table.edit-action-tooltip.cy.ts` reads the real template and asserts two binding strings verbatim | CT `before()` block | Strings `(click)="getFeedback() ? null : (phase.editing = true)"` and `[prTooltip]="getFeedback() ? this.disabledActionsText : null"` | verified | — (constraint, see PMR-DD-3) |
| PMR-P-5 | The reminders spec asserts metric values via the row text regex `/9\s*2\s*1\s*3/` | `replicated-innovation-reminders.component.spec.ts:134` | Line read | verified | — (spec update in PMR-DD-6) |
| PMR-P-6 | `phaseList` is a plain array reassigned on load/create/delete, and the table uses default change detection | `phase-management-table.component.ts:24,172,280,291` | Read assignments; no `OnPush` in decorator | verified | Counters would need signals |
| PMR-P-7 | The admin shell renders no breadcrumb/title for this page (only `<router-outlet>`) | `admin-section.component.html` | Read | verified | Drop the in-page breadcrumb to avoid duplication |

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** none.
- **Client:** `pages/admin-section/pages/phase-management/` (shell, `pages/reporting`, `pages/innovation-package`, `other-functionalities`, `massive-phase-shift`, `components/replicated-innovation-reminders`) + `shared/components/phase-management-table/` + new `internationalization/phase-management.copy.ts`.

### 2.2 Page composition (after)

```
PhaseManagementComponent            ← header: breadcrumb · title · description · segmented tabs (PMR-R-1)
└─ router-outlet
   ├─ ReportingComponent
   │  └─ PhaseManagementTableComponent   ← card: header (title, total/open chips, Add CTA) + app-pr-table (PMR-R-2/3)
   │     └─ <ng-content>
   │        ├─ Phase operations section  ← grid: 2× OtherFunctionalitiesComponent cards (PMR-R-4)
   │        └─ ReplicatedInnovationRemindersComponent card (PMR-R-5)
   └─ InnovationPackageComponent
      └─ PhaseManagementTableComponent + Phase operations (1 card)
```

The title depends on the active child route. The shell reads it from the router URL (`/reporting` vs `/innovation-package`) through a small computed value fed by `router.events`. This stays local to the shell, so routing data doesn't need to change.

## 3. Data Model Changes

None.

## 4. API Surface

None. Same calls: `GET` phases/catalogs, `POST/PATCH/DELETE` phase, `PATCH_versioningAnnually(…)`, `PATCH_versioningAnnuallyInnovationUse()`, the reminder endpoints.

## 5. Server Workflow / Business Rules

Unchanged. The client rules that must survive untouched are `getFeedback()`, `getMandatoryIncompleteFields()`, `can_be_deleted`, `onlyPreviousPhase()`, `disablePreviousYear()`, `massivePhaseShiftIsRunning`, `canPreviewOrSend` / `canEditOrCancel` / `canSendAgain`, and the `previous*Phase.phaseName` visibility guard.

## 6. Frontend Plan

### 6.1 Routes / modules

Routes are unchanged. NgModules (`PhaseManagementModule`, `PhaseManagementTableModule`, `OtherFunctionalitiesModule`) add the standalone helm imports they use (`HlmBadge`, `HlmButtonImports`, `HlmBreadcrumbImports`). Nothing converts to standalone in this spec.

### 6.2 Components

| Component | Change | Req |
|---|---|---|
| `PhaseManagementComponent` | New header block: `hlm-breadcrumb` (Admin module › Phase management), `h1` title per tab, description. Segmented tabs are two `<a routerLink routerLinkActive>` styled as a pill group (`ariaCurrentWhenActive="page"`). Spartan `tabs` is not used because it manages panels, not routes. SCSS removed | R-1 |
| `PhaseManagementTableComponent` (TS) | Add `get totalPhases()`, which counts rows excluding unsaved `isNew` drafts, and `get openPhases()`, which counts `status === true`, both over `phaseList` | R-2 |
| `PhaseManagementTableComponent` (HTML) | Wrap everything in a card (`rounded-xl border bg-white shadow-xs`). The header row holds the title, two `hlmBadge` chips and **Add new phase** (`app-pr-button`, same bindings, moved from the bottom). Feedback text sits under the button. Cells: status → `hlmBadge` (success/neutral with text), portfolio → outline chip, dates → `tabular-nums`, the open row gets `[class]` highlight (`bg-brand-25`) via `[ngClass]` on `<tr>`. Delete/save/cancel actions become focusable `<button type="button">`s with `aria-label`. **The edit action keeps its structure and binding strings verbatim** (PMR-DD-3). Remove `.setting_title`, `.action_button`, `.tag_container` and `.add_new_phase_button` SCSS | R-2, R-3, R-6 |
| `ReportingComponent` / `InnovationPackageComponent` | Wrap the operations in a `<section>` with the heading "Phase operations", "Target phase: {current phase name}" and a `grid md:grid-cols-2 gap-4` container. Inline `style="margin-top"` removed | R-4 |
| `OtherFunctionalitiesComponent` | Template → card: icon tile (`material-icons-round`: `content_copy` / `fact_check` / `inventory_2`), title, the existing `replicateBannerText()` as description, footer with "Target: {phase}" and the same `app-pr-button` Execute (text/rotating/icon/disabled bindings unchanged). New `replicateTitle()` returns the short card title from copy | R-4 |
| `MassivePhaseShiftComponent` | Keep `app-pr-dialog` (`[(visible)]`, same `accept()`). Rewrite the inner markup: title = `replicateDescription()`, then a from-phase → `arrow_forward` → to-phase row, then the metadata sentence, then a footer with Cancel / Confirm. Remove the `lateral-bar`, `<br>`s and inline styles | R-4, R-6 |
| `ReplicatedInnovationRemindersComponent` | Header: title + `subtitle()` (unchanged source). The four metric `<th>/<td>` become one **Delivery** column, with four labelled chips (`data-testid="rir-metric-sent|skipped|failed|unreachable"`). Unreachable > 0 → warning variant. No TS change | R-5 |

### 6.3 Design system usage (mockup → tokens)

| Mockup | Implementation |
|---|---|
| `indigo-600` CTA, active tab | `app-pr-button` (already the brand gradient); active tab `bg-brand-300 text-white`, idle `text-[var(--pr-color-secondary-400)]` |
| Card surfaces | `bg-white border border-[var(--pr-color-accents-2)] rounded-xl shadow-xs` |
| Open pill / row | `hlmBadge` success-style (`--pr-color-green-500` family) · row `bg-brand-25` |
| Closed pill | neutral `hlmBadge` variant `secondary` |
| Unreachable chip | `--pr-color-yellow-300` family |
| Delete hover | `--pr-color-red-300` |
| Grey text | `text-accent-*` / secondary var (never `text-neutral-*`, which is violet-tinted) |
| Icons | `material-icons-round` only |
| Font | Poppins (inherited) |
| Ping/pulse dots | Omitted |

### 6.4 States

The table's loading/empty states are unchanged (`app-pr-table`). The reminders card keeps loading / error+retry / empty / outcome as-is. The operations section stays hidden without a previous phase.

## 7. Security & Authorization

Unchanged (admin-gated route).

## 8. Performance & Capacity

The getters are O(n) over fewer than 50 phases on each CD cycle, which is negligible.

## 9. Observability

None.

## 10. Testing Plan

| Spec | Action |
|---|---|
| `phase-management-table.component.spec.ts` | Add counter tests (5 phases / 1 open → 5/1; draft row excluded; 0 open). Existing logic tests stay |
| `phase-management.component.spec.ts` | Add a title-per-tab test |
| `other-functionalities.component.spec.ts` | Add `replicateTitle()` per input |
| `replicated-innovation-reminders.component.spec.ts:134` | Replace the regex with per-chip `data-testid` assertions (9/2/1/3) |
| CT `edit-action-tooltip.cy.ts` | Must stay green **unmodified** (it guards PMR-DD-3) |
| Visual | Screenshots of both tabs: light/dark × 1280/768 px. HITL review (T6), read-only |

Commands: `npx jest --findRelatedTests <touched files> --maxWorkers=2 --silent --reporters=summary --no-coverage`; `npx eslint <touched files> --quiet`; CT via `npm run test:ct:batch` limited to the phase-table spec.

## 11. Backwards Compatibility & Migration Plan

No data or routes change. Rollback = revert the commit.

## 12. Design Decisions

### PMR-DD-1 — Re-skin in place; keep `app-pr-table`

The table, its sorting, paginator and inline-edit controls stay. The header chrome is already navy-carbon (PMR-P-2), which also settles **PMR-OQ-1 → navy-carbon**. *Rejected:* migrating to `hlmTable` (loses sort/paginator, larger test churn).

### PMR-DD-2 — Counters as getters, not signals

`phaseList` is reassigned under default CD (PMR-P-6), so getters stay correct with no refactor. Unsaved drafts are excluded from *total*, so the chip reflects persisted phases.

### PMR-DD-3 — Edit action markup frozen

The `<div … (click)="getFeedback() ? null : (phase.editing = true)">` parent with the child `<i … [prTooltip]="getFeedback() ? this.disabledActionsText : null">` keeps those exact strings. Only `class`/`[ngClass]` values and a `role="button"`, `tabindex="0"` and `aria-label` may be added. **Reversion challenge — "what does changing this break?":** the TIP-T-5 CT's template-drift lock fails, and it also guards the tooltip-on-child click contract. Design adjusted accordingly.

### PMR-DD-4 — Move "Add new phase" to the card header

Same bindings. **Reversion challenge:** no spec queries the button by position. The feedback text that used to sit above the button now sits under it, so it stays visible (R-2 scenario). No breakage.

### PMR-DD-5 — Keep `app-pr-dialog` for the replication confirm

Only the inner content changes, so `visible`/`accept()` behavior and the existing spec hold. *Rejected:* migrating to `hlm-dialog` (open/close semantics change for little visual gain).

### PMR-DD-6 — Collapse the reminder metric columns into one Delivery cell

**Reversion challenge:** it breaks the spec regex at `:134` (PMR-P-5), because chip labels interleave the numbers. Resolution: per-chip `data-testid`s plus a rewritten assertion. The column copy keys (`columns.sent/skipped/failed/unreachable`) are reused as chip labels, so existing copy stays and a `columns.delivery` key is added.

### PMR-DD-7 — Copy in a new `phase-management.copy.ts`

Title/description per tab, breadcrumb, "Configured phases", chip labels, "Phase operations", "Target phase", card titles (DD-9). Existing strings in components (`replicateBannerText`, `replicateDescription`, alerts, tooltips) are **not** moved, so asserted copy stays put (memory lesson: renamed asserted copy broke specs before).

### PMR-DD-8 — Removing legacy SCSS (reversion)

**Reversion challenge:** the CT harness carries `class="action_button edit"` in its own inline template, so it doesn't depend on our SCSS. `.setting_title` is defined only in `phase-management-table.component.scss` (grep-verified) and goes together with its usages in these templates. Component SCSS files that end up empty stay as empty files (no `styleUrls` churn).

## 13. Budget (tripwire)

| Metric | Estimate |
|---|---|
| Tasks | 7 (6 code + 1 visual HITL check) |
| LOC | ~450 changed (≈ +300 templates/copy/specs, −150 SCSS/markup) |
| Review rounds | 1–2 per task |

Exceeding 9 tasks or ~650 LOC → stop and escalate.

## 14. Open Gaps & Follow-ups

- PMR-OQ-1: resolved by PMR-DD-1 (navy-carbon).
- PMR-OQ-2 (phase detail page) and PMR-OQ-3 (title per tab: applied): defaults, awaiting confirmation.
- Follow-up: phase detail page redesign; converting the phase-management NgModules to standalone.
- Coordination: `changes/replicated-innovation-reminders` has uncommitted server edits only. The client template change here touches only the metric cells and header.
