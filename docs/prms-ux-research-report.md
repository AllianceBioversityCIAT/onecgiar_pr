# PRMS UX/UI Research Report — Result Reporting Flow

> Research objective: identify UX friction, cognitive leaks, and structural inefficiencies in the PRMS result-reporting experience. This report focuses on interaction design, information architecture, and workflow patterns, **not** on missing fields or field-level validation bugs.
>
> Scope: `onecgiar-pr-client` Angular frontend (results creation, result-detail editing, QA review, portfolio consolidation).
>
> Date: July 2026.

---

## 1. Executive summary

PRMS captures highly structured results for a complex, multi-level research portfolio. The frontend reflects this complexity: users must classify a result, fill 6–8 disconnected sections, align it to an external Theory of Change, attach evidence, score cross-cutting impact areas, and move it through a QA workflow. Our code-level audit reveals that the platform succeeds at data capture but pays a high interaction-design cost:

- **Data loss is the biggest risk.** There is no autosave and no dirty-state guard anywhere in the result-detail editor. Users who forget to click Save, switch sections, or close the tab lose work.
- **The editor is fragmented.** A result is split into 6–8 isolated route sections with no previous/next navigation, weak completeness feedback, and a save-then-reload pattern that resets scroll and local UI state.
- **Mental models are misaligned.** Labels such as "Indicator category" (actually result type), "Report for" (owning entity), and "Sync" (repository metadata fetch) force users to translate internal taxonomy into their own vocabulary.
- **QA is a black box for submitters.** Reviewers can approve or reject, but submitters see only a status label with no history, no comments, and no guidance on how to fix a rejection.
- **Consolidation surfaces are disconnected.** PMU leads move between Type-One Report iframes, IPSR lists, and the newer Results Framework & Reporting workspace with inconsistent phase controls, exports, and navigation.

The highest-value improvements are not cosmetic; they are structural: a unified save/draft model, a guided stepper or collapsible-section editor, real review feedback loops, and a responsive, keyboard-accessible control layer.

---

## 2. Research methodology

- **Code archaeology**: components, templates, services, routing tables, and SCSS for the four main flows.
- **Heuristic evaluation**: Nielsen/Norman heuristics (visibility of system status, match between system and real world, user control, consistency, error prevention, recognition vs. recall, flexibility, aesthetic/minimalist design, help/documentation, accessibility).
- **Job-to-be-done lens**: each finding is mapped to the persona trying to complete a task, not to a missing field.
- **No runtime testing**: this audit is static; it does not include user interviews or analytics.

---

## 3. Personas and jobs-to-be-done

| Persona | Primary job in PRMS | Top UX need |
|---|---|---|
| **Result submitter** (Initiative/Center staff) | Create and complete a result without losing work, then submit it on time. | Confidence that progress is saved and clear guidance on what remains. |
| **QA reviewer** | Review many submitted results quickly, flag issues, and advance or reject. | Fast queue navigation and clear, actionable feedback channels. |
| **PMU / portfolio lead** | Understand portfolio status and compile reports (Type-One, IPSR, RFR). | Aggregate signals and drill-down paths that preserve context. |
| **Platform admin** | Keep the system running, recover data, manage phases. | Predictable global state and safe recovery paths. |

---

## 4. Cross-cutting UX themes (synthesis)

Across all four flows, five systemic patterns create the majority of friction:

### Theme 1: Save model is unsafe and punishing
- Explicit Save only. No autosave, no draft model, no `CanDeactivate` guard, no `beforeunload` listener.
- After Save, sections reload (`getSectionInformation()`), resetting scroll and local state.
- The Save button itself is sometimes a non-semantic `<div>` without proper `disabled`/`aria-disabled` semantics.
- **Impact**: fear of data loss, fatigue from repeated saving, actual data loss.

### Theme 2: Navigation is fragmented and hierarchical
- Result detail uses a 300 px sidebar + `router-outlet`. There is no previous/next section button.
- Type-One Report and bilateral review force users in and out of drawers/iframes with context loss.
- Back buttons often return to the generic results list rather than the user's previous workspace.
- **Impact**: high cognitive load, repeated reorientation, abandonment.

### Theme 3: Completeness feedback is color-only and vague
- Green checks in the panel menu are the primary signal, but they do not say *which* sub-fields are missing.
- The Submit button tooltip is generic: "once all sections are completed."
- Mandatory-field detection relies on hidden DOM scraping (`display: none` validation divs), which is invisible to assistive tech.
- **Impact**: users hunt for missing work; screen-reader users are excluded.

### Theme 4: Feedback loops between roles are broken
- Submitters can add a comment on submission, but reviewers do not see it.
- Reviewers can reject a result, but submitters see only a status label with no reason.
- There is no review-history panel visible to either role in the Angular app.
- **Impact**: rejection cycles, support tickets, slower time-to-submit.

### Theme 5: Responsive and accessibility foundations are weak
- Many clickable elements are `<div>`, `<a>` without `href`, or `<i>` icons with no `role`, `tabindex`, or keyboard handler.
- Fixed-width sidebars (`300px`, `238px`), fixed `calc(100vh - 500px)` heights, and empty `.responsive.scss` files.
- Custom drawers lack focus traps, `aria-modal`, and backdrop dismissals.
- **Impact**: mobile users and keyboard/screen-reader users cannot complete core workflows reliably.

---

## 5. Detailed findings by flow

### 5.1 Result creation (`/result/result-creator`)

#### Current flow
1. Select owning entity ("Report for").
2. Select result level (Output / Outcome cards).
3. Select "Indicator category" (actually result type radio group).
4. For Knowledge Products: enter repository handle and click "Sync".
5. For other types: enter title and review similar/duplicate results.
6. Save and continue → `result-detail/:code/general-information`.

#### Critical friction
| # | Issue | Severity | Evidence |
|---|---|---|---|
| 5.1.1 | **Exact duplicate title is detected but not surfaced in the live route.** `exactTitleFound` is computed but the template only shows generic "similar results". | Critical | `result-creator.component.ts:20, 162-180` |
| 5.1.2 | **Save is not disabled when required fields are missing.** Failure surfaces only as a post-click toast. | High | `result-creator.component.html:131` |
| 5.1.3 | **No inline validation.** All errors are toast-based, so users lose field context. | High | `result-creator.component.ts:219, 231` |
| 5.1.4 | **Knowledge Product sync control is a non-semantic `<div>` that stays clickable during validation.** | High | `result-creator.component.html:82-96` |
| 5.1.5 | **AI assistant button is fully clickable but the feature is incomplete.** Create action is a fake timeout; Discard has no confirmation. | High | `result-ai-item.component.ts:64, 68-86` |
| 5.1.6 | **"Back to results" is a `<div>` with `routerLink`, not focusable.** | High | `result-creator.component.html:2-10` |
| 5.1.7 | **Result-level cards are mouse-only `<a>` or `<div>` elements without ARIA roles or keyboard handlers.** | High | `result-level-buttons.component.html:10-18`, `result-level-cards.component.html:5-21` |
| 5.1.8 | **Main route has an empty `result-creator.responsive.scss` and fixed padding `10px 100px`.** | High | `result-creator.responsive.scss`, `result-creator.component.scss:2` |
| 5.1.9 | **Two co-existing creation components (`result-creator.component` and `report-result-form`) with inconsistent behavior.** The canonical route uses the older, less-robust one. | Medium | `report-result-form.component.*` |
| 5.1.10 | **"Indicator category" mislabels result types; "Report for" mislabels ownership.** | Medium | `result-creator.component.html:43-68` |

#### Improvement hypotheses
- Flatten level + type into a single scannable taxonomy step or searchable tiles.
- Surface exact duplicates inline with a primary "Map to existing result" action.
- Disable Save until required fields are valid; move validation from toasts to inline field messages.
- Convert all clickable elements to real `<button>`s with proper focus and disabled states.
- Decide whether the AI assistant is production-ready; if not, disable or remove it.
- Consolidate on one creation component.

---

### 5.2 Result detail editing (`/result/result-detail/:id`)

#### Current architecture
- Two-column shell: 300 px left panel menu + central `router-outlet`.
- Sections: General Information, Theory of Change, Contributors & Partners, Geographic Location, Evidence, Links to Results, type-specific page.
- Each section has its own explicit Save button.
- `GreenChecksService` tracks section completeness and enables Submit.

#### Critical friction
| # | Issue | Severity | Evidence |
|---|---|---|---|
| 5.2.1 | **No dirty-state protection or autosave.** Users can switch sections or close the tab and lose unsaved work. | Critical | No `beforeunload`, `CanDeactivate`, or `isDirty` guards found |
| 5.2.2 | **Explicit Save triggers a section reload, resetting scroll and local UI state.** | Critical | `rd-general-information.component.ts:251-260`, `rd-geographic-location.component.ts:124-131` |
| 5.2.3 | **Extreme form length and density.** General Information alone contains five nearly identical impact-area scoring blocks plus long HTML guidance walls. | High | `rd-general-information.component.html:80-278`, `innovation-dev-info.component.html:1-160` |
| 5.2.4 | **Mandatory-field markers are hidden from assistive tech and detected via DOM scraping.** | High | `feedback-validation.directive.ts:25`, `data-control.service.ts:166-193` |
| 5.2.5 | **No breadcrumbs or persistent result context beyond the section title.** | High | `result-detail.component.html:2` |
| 5.2.6 | **Responsive layout is effectively missing.** Fixed 300 px sidebar, non-wrapping metadata ribbon, fixed-position Save button. | High | `result-detail.component.scss:110-153`, `save-button.component.scss:3-9` |
| 5.2.7 | **Inconsistent P22 vs. P25 architecture.** ToC alignment is a standalone section in P22 but embedded in Contributors & Partners in P25; scoring uses radios in P22 and checkboxes in P25. | High | `routing-data.ts:310-334` |
| 5.2.8 | **No previous/next section navigation.** Users must return to the sidebar for every transition. | Medium | `panel-menu.component.html` |
| 5.2.9 | **Completeness feedback is color-only and lacks detail.** Green/gray check icons do not say what is missing. | Medium | `panel-menu.component.html:25-26, 72-76` |
| 5.2.10 | **Floating alerts counter on Save button can obscure content and has no keyboard affordance.** | Medium | `save-button.component.html:2-23` |
| 5.2.11 | **Inconsistent add-item patterns per section.** Evidence uses a modal; partners are inline; links use a table. | Medium | `rd-evidences.component.html`, `rd-partners.component.html`, `links-to-results-global.component.html` |
| 5.2.12 | **AI Review button competes with Submit and its states are unexplained.** | Low | `panel-menu.component.html:36-63` |

#### Improvement hypotheses
- **H1 (strategic)**: introduce autosave/draft model + dirty-state protection (`CanDeactivate`, `beforeunload`).
- **H2 (strategic)**: redesign the editor as a guided stepper or collapsible section groups with previous/next navigation.
- **H3**: unify P22/P25 interaction patterns behind reusable components.
- **H4**: replace hidden DOM-scraped validation with visible, accessible field-level validation and a "Remaining tasks" panel.
- **H5**: make the shell responsive (collapsible sidebar, wrapping metadata, sticky footer save button on mobile).
- **H6**: standardize add/edit/remove flows (modal-based with undo confirmation).
- **H7**: add breadcrumbs and a persistent result header.

---

### 5.3 QA review

#### Current flow
- **Legacy QA page**: embeds an external QA app in an iframe; Angular shell only selects entity and toggles fullscreen.
- **Bilateral/W3 review**: Centers sidebar → grouped table → right-side drawer with result detail → Approve/Reject/Save changes.

#### Critical friction
| # | Issue | Severity | Evidence |
|---|---|---|---|
| 5.3.1 | **No persisted review comments or history visible to either role.** | Critical | Not implemented in Angular app |
| 5.3.2 | **Submitters cannot see why a result was rejected.** They see only `Status: <status_name>`. | Critical | `result-detail.component.html:41` |
| 5.3.3 | **Legacy QA page has no native queue, counts, or "needs attention" summary.** | Critical | `quality-assurance.component.html:1-41` |
| 5.3.4 | **Silent error handling in drawer.** Save/approve/reject failures are only logged to the console. | High | `result-review-drawer.component.ts:1584-1587, 1620-1623` |
| 5.3.5 | **Approve sends a hardcoded `"Approved"` justification.** Reviewers cannot add context. | High | `result-review-drawer.component.ts:1573-1576` |
| 5.3.6 | **Submitter submission comment is not surfaced in the review drawer.** | High | `submission-modal.component.html:17-26` |
| 5.3.7 | **Pending sidebar counts are stale on deep-links.** | High | `bilateral-results.service.ts:119-128`, `indicators-sidebar.component.ts:28-35` |
| 5.3.8 | **No next/previous result navigation in the drawer.** Reviewers must close, relocate the row, and reopen. | High | `result-review-drawer.component.html:1-445` |
| 5.3.9 | **Global `RolesService.readOnly` is mutated while the drawer is open; a crash can leak the wrong state.** | High | `result-review-drawer.component.ts:884-897, 1659-1664` |
| 5.3.10 | **After a decision, focus is not returned to the triggering row.** | Medium | `result-review-drawer.component.ts:1471-1475, 1577-1625` |
| 5.3.11 | **Review drawer is `minWidth: 65vw` and unusable on mobile unless fullscreen is discovered.** | Medium | `result-review-drawer.component.html:1` |
| 5.3.12 | **Filter drawer lacks focus trap, `aria-modal`, and backdrop click.** | Medium | `results-review-filters.component.html:60-127` |
| 5.3.13 | **Only `?center=` and `?search=` are URL-backed; multi-select filters are lost on refresh.** | Medium | `results-review-filters.component.ts:51-58` |
| 5.3.14 | **Status checks use loose equality (`==`), masking data-quality issues.** | Medium | `result-review-drawer.component.html:428`, `bilateral-results.service.ts:69, 79` |

#### Improvement hypotheses
- Add a **Review history** panel visible to both submitters and reviewers (status transitions, justifications, comments).
- Replace hardcoded approve justification with an optional approval-comment field.
- Add previous/next navigation inside the drawer, driven by the current filtered queue.
- Surface submitter comments to reviewers and rejection reasons to submitters.
- Hydrate counts on initial load regardless of deep-link params.
- Replace global `readOnly` mutation with explicit `[readOnly]` inputs to child components.
- Sync all filters to URL query params.

---

### 5.4 Portfolio consolidation

#### Current surfaces
- **Type-One Report**: Initiative selector + panel menu; most sections are Power BI iframes; native sections for fact sheet, key result story, progress.
- **IPSR**: list → detail editor (reuses result-detail pattern).
- **Results Framework & Reporting (RFR)**: Home with SP cards → entity dashboard → Area-of-Work drill-down → bilateral review queue.

#### Critical friction
| # | Issue | Severity | Evidence |
|---|---|---|---|
| 5.4.1 | **Phase switcher forces a full page reload, losing scroll and risking unsaved work.** | Critical | `phase-switcher.component.ts:29-33` |
| 5.4.2 | **Type-One Report has no visible phase control.** Phase is auto-selected. | High | `type-one-report.component.ts:38-44` |
| 5.4.3 | **Initiative switch in Type-One Report flashes a `/white` redirect to force iframe refresh.** | High | `type-one-report.component.ts:86-99` |
| 5.4.4 | **Most Type-One Report sections are opaque iframes with no bridge to individual results.** | High | `tor-key-results.component.html:17-19` |
| 5.4.5 | **Stale sidebar counts on bilateral deep-links.** | High | `results-review-table.component.ts:76-93` |
| 5.4.6 | **Global `readOnly` mutation in bilateral drawer.** | High | `result-review-drawer.component.ts:183-194` |
| 5.4.7 | **SGP-02 special handling is inconsistent (`SGP-02` vs `SGP02`).** | High | `entity-details.component.ts:184` |
| 5.4.8 | **"Go to result center" label opens the global results list, not the result's center detail.** | High | `result-review-drawer.component.ts:1477-1480` |
| 5.4.9 | **No portfolio-level status dashboard in IPSR.** Only a row list. | Medium | — |
| 5.4.10 | **IPSR list has hard-coded disabled filter chips (2023/2024).** | Medium | `ipsr-list-filters.component.html:6` |
| 5.4.11 | **IPSR table nests sub-results inside a single cell, creating visual clutter.** | Medium | `innovation-package-custom-table.component.html:33-46` |
| 5.4.12 | **RFR Home "Recent activity" only shows "Result created", not submission/QA/review actions.** | Medium | `result-framework-reporting-recent-item.component.html:12-28` |
| 5.4.13 | **RFR entity dashboard summary cards omit "Quality assessed".** | Medium | `entity-details.component.ts:78-91` |
| 5.4.14 | **Dead "Report" splitbutton in entity details; real entry point is hidden inside each indicator card.** | Medium | `entity-details.component.html:103-111` |
| 5.4.15 | **Report-result modal is wide and long with no stepper (~8 fields in one scroll).** | Medium | `aow-hlo-create-modal.component.html` |
| 5.4.16 | **No consistent export affordance across Type-One Report, IPSR, and RFR.** | Medium | — |
| 5.4.17 | **AOW table groups are pre-expanded with no collapse-all control.** | Low | `aow-hlo-table.component.ts:56-62` |
| 5.4.18 | **Lead-center column appears/disappears based on center selection, breaking spatial memory.** | Low | `results-review-table.component.html:19-21, 33, 63-65, 102` |

#### Improvement hypotheses
- Build a **unified portfolio header** with a non-destructive phase selector that updates data in place.
- Replace the `/white` redirect flash with route-param-driven iframe refresh.
- Add inline bridges from Power BI visuals to individual result detail.
- Provide actionable scoreboard cards (Editing / Quality Assessed / Submitted / trend).
- Standardize export affordance across all consolidation surfaces.
- Collapse project groups by default with expand/collapse-all controls.
- Keep table schemas stable (Lead center always visible, even as "—").

---

## 6. Severity-ranked issue register

| Rank | Issue | Flow | Severity | Effort | Recommended priority |
|---|---|---|---|---|---|
| 1 | No dirty-state protection / autosave | Result detail | Critical | High | P0 |
| 2 | Save triggers section reload, resetting state | Result detail | Critical | Medium | P0 |
| 3 | No review history or comments for submitters/reviewers | QA review | Critical | High | P0 |
| 4 | Submitters cannot see rejection reason | QA review | Critical | Medium | P0 |
| 5 | Legacy QA page is an iframe with no native context | QA review | Critical | High | P1 |
| 6 | Exact duplicate title not surfaced in live creation route | Result creation | Critical | Medium | P0 |
| 7 | Phase switcher forces full page reload | Consolidation | Critical | Medium | P0 |
| 8 | Non-semantic, mouse-only controls across the app | All | High | Medium | P0 |
| 9 | No inline validation; toast-only errors | Result creation/detail | High | Medium | P0 |
| 10 | Responsive layout missing or broken | All | High | High | P1 |
| 11 | P22/P25 architectural inconsistency | Result detail | High | High | P1 |
| 12 | No previous/next navigation in editor | Result detail | Medium | Low | P1 |
| 13 | Completeness feedback is color-only | Result detail | Medium | Medium | P1 |
| 14 | Floating Save button counter obscures content | Result detail | Medium | Low | P2 |
| 15 | Inconsistent add-item patterns | Result detail | Medium | Medium | P1 |
| 16 | No next/previous result in review drawer | QA review | High | Low | P1 |
| 17 | Silent error handling in review drawer | QA review | High | Low | P1 |
| 18 | Filters not URL-backed | QA review / RFR | Medium | Medium | P1 |
| 19 | Stale counts on deep-links | QA review / RFR | High | Low | P1 |
| 20 | AI assistant is incomplete but clickable | Result creation | High | Low | P0 |
| 21 | Two co-existing creation components | Result creation | Medium | Medium | P1 |
| 22 | Terminology misalignment | Result creation | Medium | Low | P2 |
| 23 | No visible phase control in Type-One Report | Consolidation | High | Medium | P1 |
| 24 | Iframe sections with no result bridge | Consolidation | High | Medium | P1 |
| 25 | No consistent export affordance | Consolidation | Medium | Medium | P2 |

---

## 7. Strategic redesign options

### Option A: Guided stepper editor
Replace the sidebar-section editor with a linear or non-linear stepper that:
- Shows all required sections at a glance.
- Allows previous/next navigation.
- Autosaves each step as a draft.
- Blocks progression only when truly required fields are empty.
- Shows a persistent "Remaining tasks" checklist.

**Pros**: reduces navigation fatigue, makes progress visible, naturally supports autosave.
**Cons**: may feel rigid for power users who want to jump around; requires redesign of all section routes.

### Option B: Single-page collapsible form
Keep all sections on one long page with collapsible cards:
- Each card shows a summary when collapsed.
- Users can open multiple cards.
- Autosave per card.
- Sticky top progress bar.

**Pros**: preserves freedom of navigation, easier to scan, simpler to implement than a full stepper.
**Cons**: very long page on complex types; still needs strong wayfinding.

### Option C: Hybrid: overview + detail
- Start with an **Overview** page showing section summaries and completeness.
- Clicking a section opens it in a focused modal or full-page view.
- Autosave everywhere.
- Return to Overview after each section.

**Pros**: balances overview and focus; matches the mental model of "fill out a form".
**Cons**: more transitions than Option B.

**Recommendation**: start with **Option B** for the result-detail editor because it is the smallest structural change that fixes navigation and cognitive-load issues, then layer in a persistent "Remaining tasks" drawer. For QA review, adopt previous/next drawer navigation + a shared comment/history panel first.

---

## 8. Quick wins (low effort, high impact)

| # | Action | Expected impact |
|---|---|---|
| 1 | Add `beforeunload` and `CanDeactivate` guards to result-detail routes. | Prevents accidental data loss immediately. |
| 2 | Convert all clickable `<div>`/`<a>`/`<i>` controls to real `<button>`s. | Accessibility and keyboard usability. |
| 3 | Surface exact duplicate titles inline with a "Map to existing result" action. | Reduces duplicate result creation. |
| 4 | Disable Save until required fields are valid; show inline errors. | Reduces post-click failures and support load. |
| 5 | Add previous/next section buttons in result detail. | Reduces sidebar trips. |
| 6 | Add review history panel (status transitions + justifications) visible to submitters and reviewers. | Closes the feedback loop. |
| 7 | Show submitter comments to reviewers and rejection reasons to submitters. | Closes the feedback loop. |
| 8 | Hydrate pending counts on initial load in bilateral review. | Restores trust in the queue. |
| 9 | Add `aria-label`s and focus management to icon-only drawer controls. | Accessibility compliance. |
| 10 | Hide or disable the incomplete AI assistant button. | Prevents misleading users. |

---

## 9. Long-term strategic investments

1. **Autosave / draft architecture**: a unified draft service across all result-detail sections.
2. **Responsive redesign**: fluid grids, collapsible sidebars, sticky footers, mobile-first table priorities.
3. **Component unification**: one creation form, one partner selector, one evidence manager, one link manager.
4. **Real-time collaboration signals**: who else is editing, presence-aware save warnings.
5. **Integrated review workspace**: merge submitter and reviewer views around a shared result with comments, history, and approval actions.
6. **Consolidated portfolio cockpit**: a single landing for PMU leads with phase selector, aggregate stats, drill-downs, and consistent exports.

---

## 10. Appendix: key file references

- `onecgiar-pr-client/src/app/pages/results/pages/result-creator/`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/`
- `onecgiar-pr-client/src/app/pages/quality-assurance/`
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/`
- `onecgiar-pr-client/src/app/pages/type-one-report/`
- `onecgiar-pr-client/src/app/pages/ipsr/`
- `onecgiar-pr-client/src/app/shared/services/global/green-checks.service.ts`
- `onecgiar-pr-client/src/app/custom-fields/save-button/save-button.service.ts`
- `onecgiar-pr-client/src/app/shared/routing/routing-data.ts`
- `onecgiar-pr-client/src/app/shared/components/phase-switcher/phase-switcher.component.ts`

---

*End of report.*
