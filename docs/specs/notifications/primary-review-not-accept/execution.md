# Primary SP Reviews the Result — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-review-not-accept` |
| **Approval Mode** | gated → **pre-approved** for continue/pause gates (user, 2026-10-07: "No me preguntes si sigues, continua hasta terminar con esta implementación"). HALT / Pivot / budget tripwire still stop; commit still needs explicit go-ahead; PRA-T-3 is HITL |
| **Branch** | `qa-development-2026-ss` |
| **Started** | 2026-10-07 |
| **Leader** | Claude Opus 5.5 (session model; registry T1 = `opus`, no switch needed) |
| **Implementer / Reviewer** | `akili-implementer` / `akili-reviewer` wrappers |
| **Budget (design §11)** | 3 tasks · ~300 LOC · ≤2 review rounds per task |
| **Parallelism** | PRA-T-1 (server) and PRA-T-2 (client) run in parallel: they touch different packages. Jest runs go one at a time through a scratchpad lock dir (`jest.lock`), `--maxWorkers=2` |
| **Kaizen Active Lessons** | `docs/specs/kaizen-log.md` absent — none applied |

**Release plan (user, 2026-10-07 — explicit commit/push authorization for this spec):** after PRA-T-1 + PRA-T-2 PASS → commit on `qa-development-2026-ss` → merge `performance-refactor` into it → scoped Jest on touched + merged files → if green push to `performance-refactor` → wait ~25 min → push `performance-refactor` → `staging`.

## 2. Task Execution History

### PRA-T-1 — Server: owner at submit, pending counts as choice, swap = direct transfer

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 1 of 3) |
| **Date** | 2026-10-07 |
| **Implements** | PRA-R-1 (5 scenarios), PRA-R-2 (2 scenarios) |
| **Skills** | `nestjs-expert`, `tdd` (task defaults, no deviation) · effort medium-high |
| **Files** | `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+199/-? raw, ~150 production LOC; part is Prettier reindent) · `bilateral-center.service.spec.ts` (+294 raw) — total 343+/150- |

**Attempt 1 — Implementer**
- `assertSubmittable`: ownerless → choice = draft ?? pending; none → 400 unchanged. Pending guard only when an owner exists.
- `submitForReview`: `Result` `pessimistic_write` lock first in tx; ownerless → re-resolve choice via `manager` (none → `BadRequestException`, rollback) → `transferPrimary(id, choice, user, manager, { releaseContributors: false })`, ids-only log. `announcePendingReview` post-commit, unconditional. `sendDraft` no longer called.
- `updatePrimaryAssignment` non-Rejected swap (`currentPrimaryId !== 0`): `isAligned(Number(project.id), next, manager)` → 400 `NOT_ALIGNED_MESSAGE` on false → `transferPrimary(..., { releaseContributors: false })`. First pick unchanged (`request(..., { asDraft })`).
- Verification: `bilateral-center.service.spec` 229/229 (it-blocks 185 → 190) · `primary-program-request.service.spec` 79/79 · eslint (2 files) exit 0 · `tsc --noEmit` exit 0. All Jest runs `--maxWorkers=2`, scoped, under the scratchpad lock.

**Attempt 1 — Reviewer: `STATUS: PASS`**
> Diff satisfies design §7.1–7.3 and PRA-R-1 (all 5 scenarios) / PRA-R-2 (both scenarios). Every tasks.md PRA-T-1 clause row has a passing test that asserts arguments and call counts. The owner write, status-5 change and history row share one transaction, and `announcePendingReview` fires only after a successful commit.

Verified: `transferPrimary` (primary-program-request.service.ts L793-852) writes role 1, retires every active primary row (DRAFT + PENDING) and inserts one ACCEPTED row on the caller's `manager`. RRC resubmission path unchanged. Swap only in the Editing/Draft branch. Superseded tests updated in place with `PRA-R-x` comments.

**ADVISORY (4R, non-gating — recorded, not actioned):**
- RELIABILITY/RESILIENCE: `hasOwner` is read before the tx/lock (L2460-2464). If a legacy `accept()` commits in between, the submit rolls back with a misleading 400 "no Science Program assigned". Safe, and a retry succeeds. Option: re-read the owner via `manager` after the lock.
- READABILITY: stale comments at L187-189, L368-373 (PSR-T-5 "owner left untouched"), the first-pick `else` comment ("A swap … sends the request immediately"), L2456-2458 ("DRAFT primary" → draft or pending), and spec L2439-2441 (`asDraft: false`). `currentPrimaryId === 0 &&` in the first-pick `else` is now always true.
- RELIABILITY (tests): the "choice vanishes" test could also assert `manager.transaction` was called.
- RISK: an Editing/Draft swap now retires the old owner's ToC mapping at once via `writeOwnershipChange` (intended, PRA-DD-4). Watch it in PRA-T-3 step 4.

**Decisions:** the earlier catalogue check in `updatePrimaryAssignment` only proves allocation to the project, not alignment to the lead project, so `isAligned` was used (same rule and message as `request()`). The lock applies to every submit (design §7.2 "first statement").
**Budget:** server raw LOC 343+/150- vs ~120 expected. Production change is ~150; the excess is spec rewrites and reindent. Combined check made after PRA-T-2.
**Final verification:** green (above).

### PRA-T-2 — Client: "Review result" on primary rows, no Decline, banner copy

| Field | Value |
|---|---|
| **Date** | 2026-10-07 |
| **Implements** | PRA-R-3 (4 scenarios), PRA-R-5 |
| **Skills** | `angular-developer`, `spartan`, `tdd` (task defaults) · effort medium → high on rework |

**Attempt 1 — Implementer**
- Files (19, +427/-159): copy (`contribution-request-drawer`, `bilateral-primary-assignment`, `bell-quick-inbox`), `request-decision.ts` (+spec), `notification-item.component.{ts,html}` (+spec), `notification-detail-content.component.{ts,html}`, `results-notifications.service.ts` (+spec), `pop-up-notification-item.component.{ts,html}` (+spec), `section-zero-dashboard.component.ts` (+spec), `notification-navigation.service.ts` (+spec).
- Out-of-list files, with reasons: `showDecline` input on the drawer (no Decline in the drawer footer), `acceptPrimaryForReview` (409 = success without the "already answered" toast), `completePrimaryReview` (shared inbox/bell logic, design §8.3), the bell chip copy.
- Decision: `reviewRequestUrl` prefers `obj_shared_inititiative.official_code` for primary rows, because `getProgramCode` is empty for legacy ownerless results.
- Verification: scoped Jest 9 suites / 691 tests green (Leader re-ran it after the Implementer's final spec edit: 691/691) · eslint on touched files clean · grep: no runtime "Accept as primary" UI text.

**Attempt 1 — Reviewer: `STATUS: FAIL`** (verbatim issues)

1. **Discovered Issue:** A deep link can still open the primary decline-justification dialog. In `notification-item.component.ts`, `runAutoAction()` (around L374) still runs `else if (action === 'decline') this.onDeclineClick();` for every pending row. `onDeclineClick()` (L908-911) still does `if (this.isPrimaryRequest) { this.showPrimaryDeclineDialog.set(true); ... }`. So `?request=<primary id>&action=decline` on the inbox still offers a primary Decline. Before this change the bell produced exactly that URL for primary rows (the removed spec "Decline on a primary row emits handoff(decline)"), so it can come back from browser history or a shared link, as well as from a hand-crafted URL. No test covers this.
   **Violated Rule:** `requirements.md` §6 PRA-R-3, scenario "no Decline on primary rows" ("GIVEN any primary request row THEN no Decline button or decline-justification dialog is offered"); `tasks.md` PRA-T-2 clause row "R-3 no Decline".
   **Remediation Suggestion:** In `runAutoAction()`, only replay decline when `!this.isPrimaryRequest`; for a primary row, only consume the param (the same treatment primary accept already gets under BELL-T-7). Add a spec: a primary pending row with `autoAction='decline'` leaves `showPrimaryDeclineDialog()` false, makes 0 PATCH calls, and still emits `autoActionConsumed`. `onDeclineClick()`'s primary branch can stay as dead code (design §8.1).
2. **Discovered Issue:** The folder `CLAUDE.md` files were not updated, and the `notification-item` one now contradicts the code (`notification-item/CLAUDE.md`: PSR-T-8 "Accept as primary"/"Decline", PDR-T-4 primary Decline dialog, chip "Primary program request"; `notification-detail-content/CLAUDE.md`: no `showDecline`; `section-zero-dashboard/CLAUDE.md`: no ownerless-`pending` `submitBlockedReason` change). Same failure as BELL-T-1 attempt 2.
   **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" (update the folder `CLAUDE.md` and re-stamp `**Verified:**` in the same commit); `onecgiar-pr-client/src/CLAUDE.md` §22.
   **Remediation Suggestion:** Add a PRA-T-2 section to `notification-item/CLAUDE.md`:
   - `reviewPrimaryResult()`: accept PATCH, then on success or 409 → `completePrimaryReview`; other errors → generic toast.
   - Decline hidden on the row and in the drawer (`[showDecline]`).
   - The chip and `detailTitle()` read "Needs your review".
   - Mark the PSR-T-8 and PDR-T-4 primary bullets as superseded by PRA, without deleting them.
   - Re-stamp `Verified:`.

   Add one line plus a stamp in `notification-detail-content/CLAUDE.md` (`showDecline`) and in `section-zero-dashboard/CLAUDE.md` (PRA-R-5).

The Reviewer confirmed all 7 brief checks otherwise: call counts, order and URL asserted; contribution rows unchanged; the Editing path never navigates; the removed specs only covered primary accept-confirm; the out-of-list files are justified by the design; the other banners are unchanged; `hlmBtn`/`hlmBadge` only.

**ADVISORY (attempt 1, non-gating):** a status-5 row whose `reviewRequestUrl()` is null makes `completePrimaryReview` do nothing (no navigation, no toast) · `pending`-with-owner shows the new "will review" banner next to the blocked note (state no longer produced) · `isPrimaryRequest` is an alias of the private `isPrimaryRequestRow`, and `primaryReviewTarget` is computed twice · the unused `footer.acceptAsPrimary` key and the stale bell docstring are left for the cleanup spec (tasks §7).

**Budget tripwire (Leader):** combined raw diff ~1,070+/460- (production 301+/83-) vs ~300 expected / ~450 stop. Escalated to the user 2026-10-07 → **accepted** ("Si hombre ya te había dado el auto approve"). Continue the release plan after PASS.

**Attempt 2 — Implementer** (effort high; same agent resumed with the verbatim FAIL)
- `runAutoAction()`: decline is replayed only when `!this.isPrimaryRequest`; for a primary row the param is only consumed. The dead primary branch in `onDeclineClick()` is kept (design §8.1).
- New spec "PRA-R-3: autoAction='decline' on a primary pending row opens no dialog, sends 0 PATCH and still reports consumed". The BELL-T-5 and BELL-T-7 primary-decline specs were rewritten to the PRA-R-3 behaviour, and the primary row was removed from the decline `it.each` (691 → 690 tests).
- Folder docs: `notification-item/CLAUDE.md` (SUPERSEDED notes on PSR-T-8/PDR-T-4, new PRA-T-2 section, stamp), `notification-detail-content/CLAUDE.md` (`showDecline` + stamp), `section-zero-dashboard/CLAUDE.md` (PRA-R-5 + stamp).
- Verification: scoped Jest after the last edit, 9 suites / 690 tests, 0 failed · eslint on touched .ts clean.

**Attempt 2 — Reviewer: `STATUS: PASS`**
> Both attempt-1 issues are resolved: a primary row no longer opens any decline dialog from an `?action=decline` deep link, and the three folder `CLAUDE.md` files document PRA-T-2 and are re-stamped. The fix introduces no other behavioural change.

**ADVISORY (attempt 2):** check that `onPrimaryDeclineConfirm()` named in the SUPERSEDED note is real. The Leader checked: it exists at `notification-item.component.ts:938`, so this is closed. The attempt-1 advisories still stand (non-gating).

**Final status:** PASS (attempt 2 of 3; 2 review rounds = design budget max). Requirements covered: PRA-R-3, PRA-R-5. Final verification green.

## 3. Release Record (2026-10-07)

| Step | Result |
|---|---|
| Commits on `qa-development-2026-ss` | `b7c75fd25` (server, PRA-T-1) · `874184a85` (client, PRA-T-2) · `c7b995ee3` (spec + execution log) |
| Merge `origin/performance-refactor` → branch | Already up to date (no new commits) |
| Scoped Jest after commit | server `bilateral-center.service.spec` + `primary-program-request.service.spec`: 2 suites / 308 tests green · client 7-pattern scope: 9 suites / 690 tests green (`--maxWorkers=2`, run one after the other) |
| Push | `qa-development-2026-ss` → origin (05c9f625f..c7b995ee3) · `qa-development-2026-ss` → `performance-refactor` (f2107be5c..c7b995ee3), 12:54 |
| Wait for PRTest deploy | ~25 min, until about 13:20 |
| PRTest deploy | Jenkins #2508 aborted in Build Frontend (16m57s, Jenkins side; the local `ng build` passed in 77 s, exit 0). Rebuild #2509 deployed |
| `performance-refactor` → `staging` | The first commit attempt was denied by the auto-mode classifier and handed to the user. The user authorized it ("ahora si podemos hacer el paso a staging"). Merge commit `09c7abe4a` (conflict in the `bilateral-result-summaries.en.md` change log, both sides kept), pushed 06f01e35e..09c7abe4a |
| PRA-T-3 (HITL) | Pending: the user runs the manual checks on PRTest after the deploy |


## 4. Follow-up: notification links open the review drawer (2026-10-07, user request)

**Request:** when an SP member opens a Center-submitted bilateral result from the notifications, it must open the review drawer, not the result form, and show "Click here to validate the bilateral result". Not a task in `tasks.md`: user-requested follow-up, run through the same Implementer → Reviewer gate.

**Cause found (Leader):** primary request rows linked the result identity to `resultUrl()` (Result Detail form). The comment assumed "a primary request is never in the requested SP's review queue", which PRA-R-1 made false. `BILATERAL_RESULT_SUBMITTED` already routed to the drawer but had no visible CTA.

| Attempt | Implementer | Reviewer |
|---|---|---|
| 1 | Primary rows with status 5: link and new CTA go to `reviewRequestUrl()` (in-app; Ctrl/middle-click keep the href); other statuses unchanged. CTA on `BILATERAL_RESULT_SUBMITTED` in the inbox update row and the bell card, hidden when `reviewRequestUrl()` is null. Copy key `notificationItem.validateBilateralCta`. Jest 507/507, eslint, tsc clean | **FAIL**: (1) stale JSDocs on `onDrawerResult()`/`onResultLinkClick()`, and the P2-3157 JSDoc displaced in the bell; (2) inline `style` on 4 CTAs (client CLAUDE.md §5 Tailwind-first, src §21.2); (3) the bell CTA did not keep the href on Ctrl/Cmd/Shift-click |
| 2 | JSDocs updated and moved; Tailwind classes `ml-[4px] font-semibold underline text-[var(--pr-color-primary-300)]`; modifier guard in the bell `onValidateCtaClick()`; one Ctrl-click spec per surface. Jest 510/510, eslint, tsc clean | **PASS**: all three resolved, functional cases untouched |

**ADVISORY (non-gating):** the bell Ctrl-click spec title says "no read" but does not assert it · `ml-[4px]` on the bell CTA (own line) only indents it; check it in the visual pass · `notification-item/CLAUDE.md` is over the 120-line folder-doc cap (pre-existing).
**Leader verification:** local production `ng build` exit 0 (69 s; warnings only, pre-existing).
**Not verified:** visual check in a real browser (HITL).
