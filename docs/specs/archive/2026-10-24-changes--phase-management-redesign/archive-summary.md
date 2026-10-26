# Archive Summary — Phase Management redesign (`PMR`)

> **Outcome:** Admin → Phase management now follows the 2026 brand line on both tabs:
> - a page header with segmented tabs;
> - a phases card with total/open counters;
> - status pills and labelled action buttons;
> - phase operations as cards;
> - a single Delivery chip column in the reminders card.
>
> Behaviour, API, routes and the app shell are unchanged. It is live on PRTest, and the user approved it on 2026-10-24.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/phase-management-redesign` (Standard, gated; the user said "continue to the end" after T-1) |
| Code | `PMR` |
| Archived by | `/akili-archive`, 2026-10-24, branch `qa-development-2026-ss` |

## 2. Original Spec Path

`docs/specs/changes/phase-management-redesign/`

## 3. Archive Date

2026-10-24

## 4. Final Status

| Task | Result |
|---|---|
| PMR-T-1 Copy file | ✅ PASS, attempt 1 |
| PMR-T-2 Header + segmented tabs | ✅ PASS, attempt 2 (i18n aria-label, focus-ring token) |
| PMR-T-3 Card header + counters | ✅ PASS, attempt 2 (missing `<ng-content>` projection test) |
| PMR-T-4 Cells + actions | ✅ PASS, attempt 2 (i18n aria-labels; edit div narrowed because of the DD-3 vs WCAG conflict) |
| PMR-T-5 Operation cards + dialog | ✅ PASS, attempt 2 (decorative icon made neutral, rules 7/12) |
| PMR-T-6 Reminders Delivery chips | ✅ PASS, attempt 1 |
| PMR-T-7 Visual HITL on PRTest | ✅ PASS, approved by the user |

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| PMR-R-1 | Breadcrumb, a title per tab ("Reporting phases" / "IPSR phases") and `routerLinkActive` tabs with `aria-current`. No route, guard or shell diff |
| PMR-R-2 | Card header with `N total` (drafts excluded), `N open` (shows 0) and the Add CTA. Bindings are identical and the feedback text sits under the button |
| PMR-R-3 | Open/Closed pills with text, highlighted open row, portfolio chip, `tabular-nums` dates, labelled delete/save/cancel buttons. The `can_be_deleted` guard and the editing tooltip are preserved |
| PMR-R-4 | "Phase operations" section with the target phase, a 2-column card grid (2 cards on Results, 1 on IPSR), and the restyled `app-pr-dialog`. `accept()` and the PATCH are unchanged |
| PMR-R-5 | One Delivery column of chips (Sent · Skipped · Failed · Unreachable, with a warning style when unreachable > 0). Action gating is unchanged |
| PMR-R-6 | Legacy SCSS removed (tabs, `setting_title`, `add_new_phase_button`, `action_button`, `tag_container`, `lateral-bar`, `<br>` spacing). Empty SCSS files kept |
| NFR | i18n via `phase-management.copy.ts`. Brand tokens are used, with no indigo or Inter. Focus ring on the tabs and buttons. No horizontal scroll |

## 6. Files Changed Summary

| Commit | Content |
|---|---|
| `e6c37e009` | 28 client files plus the new `phase-management.copy.ts`: phase-management shell, reporting and innovation-package pages, other-functionalities, massive-phase-shift, replicated-innovation-reminders html/spec, the shared `phase-management-table`, and one jest mapper line in `package.json` (`@spartan/breadcrumb`). +715 / −390 |
| `af11724b8` | Spec docs, the T-7 notes and screenshots (`mockup/after/`) |

Both commits are on `qa-development-2026-ss`. `e6c37e009` is also on `performance-refactor` (PRTest).

## 7. Test Evidence Summary

- **Red then green** on every code task (counts per task are in `execution.md`).
- **Final gate:** `--findRelatedTests` on the 16 touched `.ts` files passed **27 suites / 807 tests**. ESLint is clean (`ESLINT_USE_FLAT_CONFIG=false`). The `ng serve` build compiled with 0 errors.
- **CT `phase-management-table.edit-action-tooltip.cy.ts`:** the `before()` verbatim lock is green and the file is unchanged. The "disabled row: tooltip pins" case fails, and it fails the same way at HEAD, so the failure predates this spec.
- **`test-report.md`:** not produced. The user explicitly accepted its absence (2026-10-24).

## 8. Validation Summary

`validation-report.md` was not produced; the user explicitly accepted its absence. Validation consisted of:

- a Reviewer PASS on every task (different model from the Implementer);
- the T-7 PRTest check, read-only through Claude in Chrome: no overflow, no indigo or Inter, `aria-current` correct, pills and row highlight correct, focus ring visible, no console errors;
- the user's approval.

## 9. Accepted Warnings Or Follow-Ups

| Item | Status |
|---|---|
| Chip text renders at 9 px and section headings at 12 px (rem utilities, client rule 20) | Accepted; follow-up |
| Breadcrumb separator is an inline SVG (Spartan default `lucideChevronRight`) | Accepted; follow-up |
| Card surfaces differ (`bg-card` on T-3 vs `bg-white` + `shadow-xs` on T-5); design §6.3 conflicts with client rule 10 | Open user decision |
| The `bg-brand-25` open-row tint (design §6.3) conflicts with client rule 7 | Open user decision |
| Violet "to" chip and default body padding in the confirm dialog | Not inspected (opening it requires clicking Execute) |
| "Target phase" is repeated in the section header and in each card footer | Accepted |
| The edit action can't be activated from the keyboard; that needs a PMR-DD-3 amendment | Follow-up |
| CT "tooltip pins" fails at HEAD; check `pr-tooltip.directive.ts` (fe32d7bd3 / 719bd78bf) | Follow-up, outside this spec |
| Check the page at 768 px by hand (the agent couldn't resize the viewport) | Follow-up |
| Phase detail page redesign (PMR-OQ-2); convert the NgModules to standalone | Follow-up |
| CodeGraph re-index | Recommended |
| Kaizen pending items | See `docs/specs/kaizen/changes--phase-management-redesign.md` |

## 10. Historical Notes

- **Budget tripwire fired twice:**
  - First at about 575 of 650 LOC. The user approved continuing with a ~900 ceiling.
  - Final size was about 1,100 changed lines, against an estimate of about 450. The extra came from new specs (about 400 lines) and removed SCSS. Scope did not grow.
- **Local stack hazard:** the local server was started for T-7 and stopped after about 4 minutes. `ReplicatedInnovationRemindersCron` is an ungated hourly cron, and the local `.env` points at the shared DB and the prod mailer queue. T-7 moved to PRTest after a fast-forward of `performance-refactor`, which the user authorized.
- **Pre-flight block:** the session first paused because the reminders client files had uncommitted edits. They were committed (`cf0c1bdb4`) before T-1.
- **Parallelism:** waves of 2–3 Implementers on disjoint files. Jest runs were serialized with a mkdir lock in the scratchpad.
