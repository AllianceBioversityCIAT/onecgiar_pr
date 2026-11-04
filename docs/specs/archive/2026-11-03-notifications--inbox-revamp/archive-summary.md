# Archive Summary — Notifications Inbox Revamp — Requirements

**Outcome:** code tasks complete per `execution.md`; archived in the 2026-11-03 batch cleanup of Santiago's completed specs. Manual checks still open are listed in §7 as accepted follow-ups.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/inbox-revamp` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete (code)** — tasks.md: 41 `[x]`, 25 `[ ]` (unchecked boxes are DoD / manual-check items, see §7) |
| Last commit touching the spec | `487200d8a 2026-09-30 ✨ feat(notifications) [SPEC:notifications/inbox-revamp]: unified inbox with decision tabs, richer badges, and resolved-request visibility fix` |
| Archive mode | Lightweight batch (user-approved 2026-11-03): summary built from `execution.md`; no per-spec re-validation |

## 2. Original Spec Path

`docs/specs/notifications/inbox-revamp/`

## 3. Requirements Delivered

`NOTIF-R-1`, `NOTIF-R-2`, `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-5`, `NOTIF-R-6`, `NOTIF-R-7`, `NOTIF-R-8`, `NOTIF-R-9`, `NOTIF-R-10`, `NOTIF-R-11`, `NOTIF-R-12`, `NOTIF-R-13`, `NOTIF-R-14`, `NOTIF-R-15`, `NOTIF-R-16`, `NOTIF-R-20`

Traceability per task lives in `execution.md` (archived alongside).

## 4. Files Changed Summary / Execution Summary

Copied from `execution.md` → `5. Second-round summary — 4 of 4 tasks complete (as of NOTIF-T-11)`:

| Task | Status | Attempts |
|---|---|---|
| `NOTIF-T-8` | PASS | 2 (real bugs: missing computed field, missing soft-delete filter) |
| `NOTIF-T-9` | PASS | 1 |
| `NOTIF-T-10` | PASS | 1 (visual-only, no automated gate — awaiting user's own confirmation) |
| `NOTIF-T-11` | PASS | 1 |

### NOTIF-T-12 — Fix bilateral-project-tagged message text; remove erroneous per-row caption; fix pending-row wording/button label

- **Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-14` (corrected), `NOTIF-R-3`, `NOTIF-R-5` (re-scoped)
- **Review depth:** `full`

**Attempt 1: FAIL**
- Files changed: `result-tagged-notification.service.ts`(+.spec.ts), `notification-type.constants.ts`(+.spec.ts), `notification-item.component.ts/.html/.spec.ts`, `contribution-request-drawer.copy.ts`.
- Implementer verification: server 1/35 green; client 5/201 green; lint clean both sides.
- Reviewer verdict: **FAIL** (full audit). Confirmed correct: Updates rows carry the fields needed (`obj_emitter_user`, owner-initiative code via `initiative_role_id:1`); the `!leadIn` server guard correctly isolates the direct-tag flow from `BCT-T-4`'s submission flow; `RESULT_CENTER_TAGGED` untouched; caption/status-chip genuinely removed from all 4 branches; wording/button text fixed correctly. Four issues:
  1. **Client can't distinguish "bare project name" (new format) from "full composed sentence" (BCT-T-4's submission-flow rows, and any pre-existing/legacy data) in the same `notification.text` field** — both render through the same new case, producing garbled text for BCT-T-4 rows (a different, already-shipped sibling spec) and for any historical data. A row with empty text renders "has tagged project undefined".
  2. **Server's `buildResultNotificationDescription`, the real-time socket push, and `getRecentResultActivity`'s message field were not updated** — same garbling appears in those 3 surfaces too, which weren't touched by the fix.
  3. **No tests for the wording/button fixes** (the "the inclusion of" and "Accept contribution"/"Decline" Falsifier items).
  4. **Stale docs**: `notification-item/CLAUDE.md`, a `.ts` docstring, and the copy file's docstring still say the status indicator is "rendered in the row" — no longer true.
- **NOTIF-R-5 gap independently re-confirmed by Reviewer** (read the drawer's `view`-mode template directly): no status field anywhere in the panel. Reviewer's explicit recommendation: the Leader must decide now, not carry this as a silent gap into `/akili-archive`.
- **Leader escalated to user** (AskUserQuestion): add status to the drawer panel now, or leave as a documented follow-up gap. **User did not directly answer** but provided a precise HTML/Tailwind reference for the exact target row card markup (pill badge for the type chip `bg-brand-50 text-brand-700 rounded-full`, outlined badge for funding `border-slate-200`, a plain-text subtitle combining level · type · time-ago with no badge chrome, specific button styling for Accept contribution/Decline, and a final "Accepted by X"/"Declined by X" text line for resolved rows) — did not object to the Recommended option. **Leader proceeding with "add status to panel" (the Recommended, unchallenged option) plus the new visual reference, bundled into attempt 2.**

### NOTIF-T-13 — Restyle notification row badges/buttons to match user reference (ad-hoc, not in original tasks.md)

- **Status:** PASS (after 1 inline fix)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-3`, `NOTIF-R-12`, `NOTIF-R-15` (visual correction)

**Attempt 1:**
- Files changed: `notification-item.component.html`/`.scss`/`.spec.ts` — type chip restyled to a filled violet pill (`!bg-[var(--pr-color-primary-50)] !text-[var(--pr-color-primary-400)]` override on `hlmBadge variant="secondary"`); funding badge confirmed already correct, untouched; `resultLevelTypeBadge` converted from a separate badge chip to plain text merged with the row's timestamp (`"Output · Innovation Development · 2 hours ago"`, no dangling separator when null); Accept/Decline buttons restyled to outlined (bordered) instead of filled.
- Implementer verification: `npx jest --testPathPattern="notification-item"` → 4/169 green. Lint clean.
- Reviewer verdict: **FAIL** (checklist) — one real bug: the Decline button's border used `--pr-color-neutral-300`, which despite its name is a saturated violet (`#6b5eeb`), making Accept and Decline nearly indistinguishable — directly contradicting the comment's own stated intent ("neutral outline"). Everything else confirmed correct (type chip tokens real, funding badge reasoning verified, level/type text conversion applied consistently across all 4 branches with no dangling separator, "Accepted by"/"Declined by" caption untouched, no hardcoded hex anywhere, rewritten test assertions are genuine behavioral checks, no scope leakage into `.ts`/drawer files).
- **Fixed inline by the Leader** (1-line, single-file token swap: `--pr-color-neutral-300` → `--pr-border-strong`, a real grey token — comment already stated correct intent, only the token was wrong).

**Requirements covered:** `NOTIF-R-3`, `NOTIF-R-12`, `NOTIF-R-15`.
**Final verification:** Jest 169/169 green (pre-fix; the 1-line token swap doesn't change any test assertion). **Visual confirmation is still the user's own call** — no automated check for this class of change.

### NOTIF-T-14 — Add status field to drawer view-mode metadata grid (ad-hoc, not in original tasks.md)

- **Status:** IN PROGRESS (attempt 1 FAILed)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-5` (closes the gap `NOTIF-T-12` opened by removing the row-level status chip)

**Attempt 1: FAIL**
- Files changed: `contribution-request-drawer.component.ts` (+`status?: string | null` on `ContributionRequestDrawerViewFields`, pushed first in `viewMetadataRows`), `contribution-request-drawer.copy.ts` (+`status: 'Status'` label), `notification-item.component.ts` (`drawerViewFields()` now includes `status: th

_(truncated — full text in `execution.md`)_

## 5. Test Evidence Summary

See the per-task verification lines in `execution.md`. Signals: 0 Reviewer FAIL mentions, 1 HALT mentions, 0 Pivot Record(s).

## 6. Validation Summary

No `test-report.md` or `validation-report.md`. Absence accepted by the user for the 2026-11-03 batch archive (same practice as the other Lite specs); substitutes are the Reviewer verdicts per task in `execution.md`.

## 7. Accepted Warnings Or Follow-Ups

- ### NOTIF-T-12 — Fix bilateral-project-tagged message text; remove erroneous per-row caption; fix pending-row wording/button label
- Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)
- Leader escalated to user** (AskUserQuestion): add status to the drawer panel now, or leave as a documented follow-up gap. **User did not directly answer** but provided a precise HTML/Tailwind reference for the exact target row card markup (pill badge for the type chip `bg-brand-50 text-brand-700 rounded-full`, outlined badge for funding `border-slate-200`, a plain-text subtitle combining level · type · time-ago with no badge chrome, specific button styling for Accept contribution/Decline, and a final "Accepted by X"/"Declined by X" text line for resolved rows) — did not object to the Recommended option. **Leader proceeding with "add status to panel" (the Recommended, unchallenged option) plus the new visual reference, bundled into attempt 2.**

These were accepted as follow-ups when the user approved the batch archive; most specs here have been in `qa-development-2026-ss` since September/October 2026.

## 8. Historical Notes

- Constitution sync (guides, factual sweep, TRD) was not re-run per spec in this batch; it is a spec branch, so nothing shared was written. A `codegraph sync` is recommended after the batch.
- Kaizen: metrics-only entry at `docs/specs/kaizen/notifications--inbox-revamp.md` (no lessons distilled in batch mode).
