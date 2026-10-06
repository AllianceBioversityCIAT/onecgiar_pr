# Execution Log — SP approval notice for everyone on the center

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/sp-approval-center-notice` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-10-02 |
| Leader model | opus (T1) · Implementer `akili-implementer` wrapper (T2) · Reviewer `akili-reviewer` wrapper (T3) |
| Budget (design §11) | 4 tasks · ~200 LOC · 1 review round |
| Commits | Not made by the Leader. Per the user's standing rule, commits wait for an explicit go-ahead. |

**Pre-flight notes**

- Proposal OQ-1..OQ-4 were taken at their defaults (requirements Document Control).
- In-flight check: the only uncommitted edits in the working tree before this run were under `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/` (spec `bilateral/lead-project-not-in-contributors`). They do not touch `getBilateralReviewRecipientIds`, `buildBilateralReviewDescription` or `getResultNotificationTextParts`. Each Reviewer diff is scoped to its task's files.
- Wave 1 ran SACN-T-1 (server) and SACN-T-3 (client) in parallel. They touch different packages and share no build output.

## 2. Task Execution History

### SACN-T-1 — Any-role center lookup — PASS

| Field | Value |
|---|---|
| Date | 2026-10-02 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd` · medium (task defaults, no deviation) |
| Requirements | SACN-R-1 (any active role; inactive excluded), SACN-R-9 |

**Attempt 1**

- Files: `onecgiar-pr-server/src/auth/modules/role-by-user/RoleByUser.repository.ts` (+33), `RoleByUser.repository.spec.ts` (+58).
- Change: new `getUserIdsByCenterAnyRole(centerCode)`. It runs `SELECT DISTINCT rbu.user` with `center_id = ?`, `active > 0` and `user IS NOT NULL`, with no role predicate. Ids are cleaned the same way as in `getUserIdsByCenter`. Errors go through `HandlersError`. `getUserIdsByCenter` is unchanged.
- Red run: the suite failed to compile because `getUserIdsByCenterAnyRole` was not a function, as expected.
- Green run: `npx jest --testPathPattern RoleByUser.repository.spec --silent --reporters=summary --forceExit` → 1 suite passed, 28 tests passed. The existing `getUserIdsByCenter` cases are unchanged and still pass.
- Lint: `npx eslint` with `--quiet` on both files is clean.
- Reviewer: **PASS**. The query matches design §7.1 and has the same shape as `getUserIdsByInitiative`. The existing `getUserIdsByCenter` spec still asserts `` rbu.`role` = 9 ``, so the SACN-R-9 falsifier still holds. All five DoD cases are covered, and the diff stays inside the two expected files.

**Advisory (4R, non-gating)**

- Evidence gap: the tests only check the SQL text. Proof that the query returns non-role-9 users on real data needs a run against a non-prod DB at the HITL pause, as the task's disqualifier says.
- Risk: the wider recipient set can include admin or guest rows on the center. That is what SACN-R-1 intends. The SACN-T-2 brief must ask for de-dup, the submitter split and approver removal to hold on this set. It is carried forward to T-2.
- Readability: this is the third near-copy of the center/initiative lookup. A shared helper is worth considering if a fourth variant appears.
- Leader observation: in the spec file, the new `describe` block was placed between the existing `// BIL-RTE-T-1 …` comment and the `hasActiveRoleOnInitiative` block that comment belongs to. The old comment now sits above the new block. This is cosmetic and recorded only.

**Forward pointer to SACN-T-2:** check that de-dup, the submitter split and approver removal hold on the wider any-role set (Reviewer advisory above).

**Final verification:** green (28/28). Lint is clean.

### SACN-T-3 — Client sentence parser + copy — PASS

| Field | Value |
|---|---|
| Date | 2026-10-02 |
| Attempts | 1 |
| Skills / effort | `angular-developer`, `tdd` · medium (task defaults, no deviation) |
| Requirements | SACN-R-3 (both scenarios), SACN-R-4, SACN-R-5, SACN-R-7, SACN-NFR-5 |

**Attempt 1**

- Files: new `onecgiar-pr-client/src/app/internationalization/bilateral-decision-notice.copy.ts` (+32), `shared/constants/notification-type.constants.ts` (+48/−1), `notification-type.constants.spec.ts` (+74). `update-notification.component.spec.ts` was not touched: its only approve-center assertion is a legacy-shape row and is kept as a SACN-R-7 regression case, per design §10.
- Change: new `buildApprovedCenterNoticeParts()` runs first for `BILATERAL_RESULT_APPROVED` only. It detects the new shape by its fixed tail. It returns `segments` (bold SP code + verb, or the fallback lead with no bold) and falls through to `buildCenterDecisionParts` and then to the submitter default.
- Red run: 3 failed and 57 passed on `notification-type.constants.spec`. The 3 failures were the new exact-string cases.
- Green run: `npx jest --testPathPattern "(notification-type.constants|update-notification.component).spec" --silent --reporters=summary --no-coverage` → 2 suites, 77/77 passed.
- Lint: direct `eslint` fails across the whole repo because there is no flat config. That is pre-existing and not caused by this task. `npx ng lint --quiet` → "All files pass linting."
- Reviewer: **PASS**. The copy is byte-identical to design §8.1. Parser order and type gating match §8.2. The falsifier strings are exact, and the Rejected, legacy and empty-text cases are pinned. The Reviewer also checked for double rendering and found none: all three consumers (`notification-item`, `update-notification`, `pop-up-notification-item`) render `prefix` only in the `@else` of `@if (parts.segments)`.

**Decision: conscious deviation from design §8.2 wording.** §8.2 says "no prefix/suffix". The implementation sets `prefix` to the joined segment text, the same pattern as `RESULT_BILATERAL_PROJECT_TAGGED`. With that, `buildResultNotificationText` (search and plain text) flattens to the exact sentence with no new code. It has no effect on the DOM. **Do not remove it:** removing it breaks search flattening.

**Advisory (4R, non-gating)**

- Reliability: the SP code is taken as `text.slice(0, -verb.length)` with no trim and no single-token check. Server text like `"SP06 , as…"` would render a space before the comma. The input is server-controlled, so the risk is low. A possible hardening is `trim()` plus a no-whitespace check that falls through to `null`.
- Resilience: text that ends with the tail but matches neither shape renders the legacy `"The result <link>, <text>"` form. That is an acceptable degradation, and no test pins it.
- Risk: the three strings are copied on server and client by design (§7.4). The SACN-T-2 server spec must assert them byte-identical to this copy file. This is carried forward to T-2.

**Forward pointer to SACN-T-2:** server constant strings must be byte-identical to `bilateral-decision-notice.copy.ts` (`verb`, `fallbackLead`, `tail`).
**Forward pointer to SACN-T-4:** `chipLabel: 'Decision update'` already exists in the copy file. Reuse it, don't redeclare it. DOM spacing between the segments and the link is T-4's to prove.

**Final verification:** green (77/77). `ng lint` is clean.

### SACN-T-4 — Row: check icon + "Decision update" chip — in progress

| Field | Value |
|---|---|
| Date | 2026-10-02 |
| Skills / effort | `angular-developer`, `spartan` · attempt 1 medium, attempt 2 high (bumped on retry) |
| Requirements | SACN-R-6, SACN-R-7, SACN-NFR-5 |

**Attempt 1 — Reviewer FAIL**

- Files: `notification-item.component.ts` (+17), `.html` (+4), `.spec.ts` (+161), component `CLAUDE.md` (SACN-T-4 section).
- Change: new `isApprovedDecisionUpdateRow` getter. `pi pi-check-circle` avatar branch for Approved rows. `rowTypeChipLabel` returns `BILATERAL_DECISION_NOTICE_COPY.chipLabel` for Approved and Rejected.
- Verification: `npx jest --testPathPattern notification-item.component.spec --silent --reporters=summary --no-coverage` → 3 suites, 246 passed. `npx ng lint --quiet` → clean. The Implementer skipped a separate red run. The Reviewer judged that acceptable: the chip, icon and getter cases genuinely fail on the pre-change code.
- Drawer: `drawerViewFields().requestKind` was already `null` for every update-source row, so this change does not affect it.
- Implementer's assumption (verbatim): "`rowTypeChipColorClass` left unchanged (falls through to the existing default violet `--pr-color-primary-50/-400` pair) … flagging in case the grey-vs-violet distinction from design §8.3 matters at the HITL visual check."
- Reviewer FAIL (verbatim):
  1. **Discovered Issue:** "Decision update" chip renders **violet**, not grey. Template (`notification-item.component.html` L94-100, and the 3 other chip sites) binds `[ngClass]="rowTypeChipColorClass"` on the `hlmBadge variant="secondary"`; for any update row that is not WCT/WPT, `rowTypeChipColorClass` (`notification-item.component.ts` L1102) returns `'!bg-[var(--pr-color-primary-50)] !text-[var(--pr-color-primary-400)]'` — `!important` utilities that override the badge's own `bg-secondary text-secondary-foreground` (`spartan/badge/src/lib/hlm-badge.ts` L11). So Approved/Rejected rows get the violet pair, not the secondary grey. `mockup/reference-row.png` shows a grey/neutral "Decision update" pill beside the white outline "W3/Bilateral" pill. The CLAUDE.md note added contradicts itself (quotes "default colour (grey, matches reference)" then claims the violet fallback satisfies it).
     - **Violated Rule:** `design.md` §8.3 Type chip row: "Spartan `hlmBadge variant="secondary"`, default colour (grey, matches reference)"; `tasks.md` SACN-T-4 Disqualifier: "Visual match to `mockup/reference-row.png` (… chip colours …) … if it does not match, the task is not done regardless of green specs"; SACN-R-6 Reference row "THEN it matches `mockup/reference-row.png`".
     - **Remediation Suggestion:** In `rowTypeChipColorClass`'s `isUpdateSource` branch add an `isBilateralReviewNotification(this.notification)` case returning `''` (lets the secondary variant's grey show — no new token). If secondary does not read grey in the running app, use an existing neutral `--pr-*` pair, never a hex. Add a spec asserting Approved/Rejected chips do NOT carry the `--pr-color-primary-50` class (and WCT/WPT keep theirs) — proves class choice only; the colour itself remains the HITL manual look against the PNG. Update the component CLAUDE.md "Color class untouched" bullet accordingly.
- Advisory: `isApprovedDecisionUpdateRow` does not check `isUpdateSource`. It is harmless because the avatar sits in the update branch, but a guard would make the intent explicit. The DoD manual check and the HITL visual match are still open.

**Attempt history:** attempt 1 left `rowTypeChipColorClass` unchanged, so the chip rendered violet. Do not repeat that.

### SACN-T-2 — Approve branch: recipients, stored sentence, toast — PASS

| Field | Value |
|---|---|
| Date | 2026-10-02 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd`, `error-handling-patterns` · **high**. This deviates from the medium default because the task touches a shared notification emitter and reverts the NDCW-R-2 approve wording. |
| Review | single Reviewer, lens checklist (task marked "full"). No security, migration or data-loss surface, so no parallel lens reviewers. |
| Requirements | SACN-R-1, R-2, R-3 (server), R-4, R-5, R-8, SACN-NFR-2/3/4 |

**Attempt 1**

- Files: new `onecgiar-pr-server/src/api/notification/constants/bilateral-decision-notice.constants.ts` (+24), `results.service.ts` (+43/−… net), `results.service.spec.ts` (+167), `notification.service.ts` (+13), `notification.service.spec.ts` (+36). The git total for the tracked files is +231/−28.
- Change: `getBilateralReviewRecipientIds` now takes the decision. Approve uses `getUserIdsByCenterAnyRole`; Reject still uses `getUserIdsByCenter`. The Approve center branch stores the new lead sentence, or the fallback when the owner SP is unresolved. `buildBilateralReviewDescription` has a new first branch for the new shape that returns `"<text> <code> - <title>"`.
- Replaced assertions: one approve-center text assertion in `results.service.spec.ts`, and "builds the center copy from stored text (approved)" in `notification.service.spec.ts`. Both asserted the legacy wording for a new row. A legacy-row regression case was added (SACN-R-7). Reject assertions are unchanged; the Reviewer checked every removed line.
- Verification: `npx jest --testPathPattern "(results.service|notification.service).spec" --silent --reporters=summary --forceExit` → 5 suites, 168 passed. Red was confirmed on the rewritten assertions before the source edits. `npx eslint` with `--quiet` on the 5 touched files is clean after a Prettier `--fix`. No migration.
- Reviewer: **PASS**. All four forward pointers are honored:
  - The wider set keeps de-dup, the submitter split and approver removal, each with spec cases.
  - The strings are byte-identical to the client copy.
  - The lookup is called with the lead code only, and is not called when there is no lead center.
  - Reject assertions were not weakened.
  - R-8 holds: an any-role lookup throw still lets the submitter emit go out, and the approval succeeds.
  - Logs carry ids and the center code only.

**Advisory (4R, non-gating)**

- Reliability: the "lead code only" check is not airtight. The fixture has no non-lead tagged center, and the assertion has no `toHaveBeenCalledTimes(1)`. Code that looked up every tagged center would still pass. Fix: add a `{is_leading_result: 0, code: 'ICRAF'}` row, call the real `getLeadCenterCode`, and assert exactly one call.
- Reliability: the new-shape branch's empty-identity path (design §7.3, "when missing, the text alone") has no test case.
- Readability: the description-builder case uses fixture code 4321 rather than the falsifier's 9330. The behaviour is the same.
- Readability: the nested ternary in `renderedText` would read better as a helper or an if/else.

These advisories are recorded only. Per the Advisory-Never-Becomes-A-Task rule, the user decides whether to harden them.

**Final verification:** green (168/168). Lint is clean.

### SACN-T-4 — continued

**Attempt 2 — Reviewer PASS (spec conformance). The task stays `[~]` until the HITL check.**

- Files: `notification-item.component.ts`, `.spec.ts`, component `CLAUDE.md`. The cumulative diff is 353 lines.
- Change: inside the `isUpdateSource` branch, `rowTypeChipColorClass` returns `''` when `isBilateralReviewNotification` is true (Approved or Rejected). That leaves `hlmBadge variant="secondary"` with its own colour. `isApprovedDecisionUpdateRow` is now guarded with `isUpdateSource &&` (advisory applied).
- Red: with the fix temporarily reverted, 2 failed and 247 passed. Green: 249/249 across 3 suites. `npx ng lint --quiet` is clean.
- Reviewer: **PASS**. The attempt-1 FAIL is resolved. The chip now follows the design §8.3 class contract literally: `variant="secondary"` with its default colour, no hex and no new token.

**Advisory (4R, non-gating) — spec gap found**

- Risk (HITL): in this app's theme bridge, `--secondary` resolves to `--pr-color-primary-25` = #faf9fe (`styles.scss` L533, `colors.scss` L16). That is close to white with a violet tint. The reference PNG shows a clearly visible light-grey filled pill. The parenthetical in design §8.3, "(grey, matches reference)", assumed a mapping the theme does not have. The HITL visual check is therefore expected to fail on the chip fill.
- The Reviewer's suggested route: first amend design §8.3 to name an existing neutral pair, `!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]` (#f3f2f7, `colors.scss` L273, annotated "mockup --surface-5"), then return that string. **Do not** change the global `--secondary` mapping: it would affect every secondary badge in the app.
- Readability: the code comment and the CLAUDE.md bullet state the visual match as verified. They should say "class contract met; visual match pending HITL".

**Leader decision:** this is a spec gap, not an implementation defect. Under the Pivot and Advisory rules I don't amend the design or start a third round without the user's approval. Design §11 also says to escalate at 3 review rounds. SACN-T-4 stays `[~]`. Its DoD still has the open manual check and the HITL visual match. The decision has been escalated to the user.

## Pivot Record: SACN-T-4 (raised during HITL; affects SACN-R-1 and SACN-T-1/T-2)

**Date:** 2026-10-02 · **Status:** awaiting the user's decision. No spec files have been modified yet.

**Evidence (the user ran these read-only queries during the HITL prep):**

- `role_by_user` rows with a `center_id` and `active > 0`, grouped by role: **only role 9 (Center User), 32 users**.
- No active center row exists with `role <> 9`, on any center. CENTER-02 has role 9 only.
- Open point: the user has not yet confirmed which environment these queries ran against (prod or dev/test).

**What it means:**

- SACN-R-1 assumed that center staff can hold non-Center-User roles through `role_by_user.center_id`. On these data, no such row exists.
- So `getUserIdsByCenterAnyRole` currently returns the same set as `getUserIdsByCenter`. The recipient widening in SACN-T-1/T-2 has no effect.
- The user-visible delta of the spec today is the new center sentence (R-3/R-4), the chip and the icon (R-6). The recipients do not change.
- The code is correct against the approved design. The **requirement's data premise** is what fails, which makes this a spec gap and not an implementation defect.

**Alternatives:**

1. **Keep as built.** The any-role lookup is harmless and future-proof: if non-9 center roles are ever assigned, they get the notice. Amend requirements §2 and §5 so they say the recipient set is "every active center role; today that is only Center User". Low cost.
2. **Find the real "center staff" source.** If the requester meant users linked to the center some other way (for example through an initiative or SP role plus a center affiliation), a scout needs to locate that relation. R-1 and design §7.1 would then be re-specified, and T-1/T-2 reopened. Higher cost, and it needs the requester's input.
3. **Revert the widening.** Drop `getUserIdsByCenterAnyRole` and keep `getUserIdsByCenter` for Approve. That removes code with no effect, at the price of reverting T-1 and part of T-2. Medium cost.

**Also pending on SACN-T-4:** the chip-colour spec gap (see the T-4 attempt-2 advisory: `--secondary` = #faf9fe, while the reference shows grey; the proposed token is `--pr-surface-sunken`).

**Pivot resolution (2026-10-02):** the user delegated the decision to the Leader ("Haz lo que tengas que hacer"). The Leader applied its own recommendations:

- Recipients: **alternative 1 (keep as built).** A data note was added to `requirements.md` §2 and to SACN-R-1. T-1 and T-2 stay `[x]`; no code changes.
- Chip colour: `design.md` §8.3 was amended to the neutral pair `!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]` (#f3f2f7, an existing token). The global `--secondary` mapping is not changed. SACN-T-4 is resumed for rework attempt 3 at effort xhigh. This is the third review round, the design §11 escalation threshold; the user was informed before the run.
- Correction-closure sweep: the only other site of the superseded "default colour (grey…)" value is in this log's history entries, kept as history. The proposal's "grey filled" wording is consistent with the amendment.

### SACN-T-4 — final

**Attempt 3 (post-Pivot) — Reviewer PASS**

- Change: for bilateral review rows (Approved and Rejected), `rowTypeChipColorClass` returns exactly `'!bg-[var(--pr-surface-sunken)] !text-[var(--pr-text)]'`, per amended design §8.3. The literal mirrors the existing WCT/WPT arbitrary-value pairs, so Tailwind v4 picks it up. The spec asserts the exact string. The code comment and the component CLAUDE.md now say "class contract met; visual match pending HITL".
- Red: with the return reverted to `''`, 2 failed. Green: `npx jest --testPathPattern notification-item.component.spec` → 3 suites, 249 passed. `npx ng lint --quiet` is clean.
- Reviewer: **PASS** on all 5 checks: exact string, tokens exist, coverage kept, no false visual claim, scope.
- Advisory applied by the Leader inline, a one-line doc fix: the component CLAUDE.md `**Verified:**` stamp still described attempt 2 and was re-stamped for attempt 3.
- Advisory recorded only: the test "WCT/WPT rows keep their own distinct color pairs" checks only the WCT pair.
- Review rounds for T-4: 3, which equals the design §11 threshold. The user was informed before round 3 and delegated the decision.

## 3. Final validation (Leader, 2026-10-02, no delegated agents active)

| Check | Command | Result |
|---|---|---|
| Server specs (touched + consumers) | `npx jest --testPathPattern "(RoleByUser.repository\|results.service\|notification.service).spec" --silent --reporters=summary --forceExit` | 6 suites, **196 passed** |
| Server lint | `npx eslint <7 touched files> --quiet` | clean |
| Server typecheck | `npx tsc --noEmit -p tsconfig.json` | clean |
| Migrations | `npm run migration:check` | 0 pending |
| Client specs (touched + all consumers of `notification-type.constants`) | `npx jest --testPathPattern "(notification-type.constants\|update-notification.component\|notification-item.component\|pop-up-notification-item.component\|filter-notification-by-search.pipe\|filter-notification-by-type.pipe\|notification-navigation.service\|results-notifications.component).spec" --no-coverage` | 9 suites, **421 passed** |
| Client lint | `npx ng lint --quiet` | All files pass linting |
| Client build (template typecheck) | `npx ng build --configuration development` | bundle generation complete, no errors |

**Still open (HITL, owned by the user):**

- The SACN-T-4 visual match against `mockup/reference-row.png`.
- The DoD manual check. A non-role-9 center user cannot be exercised on the current data (Pivot Record), so the check runs with a role-9 CENTER-02 user who is not the submitter, plus the submitter.
- SACN-T-4 stays `[~]` until the user confirms. The code is done and reviewed.

## 4. Summary

- **Tasks:** T-1, T-2 and T-3 PASS on attempt 1. T-4 PASS on attempt 3: attempt 1 FAIL (violet chip), attempt 2 PASS on the spec but a spec gap was found, attempt 3 PASS after a design amendment.
- **Budget:** 4 tasks, as planned. Roughly +600 LOC including tests, against about 200 planned; the overrun is mostly spec breadth. 1 review round each for T-1 to T-3 and 3 rounds for T-4, against 1 planned.
- **Pivot:** the any-role recipient set equals role 9 on current data. The lookup was kept (alternative 1), and the chip token was amended.
- **Commits:** one per task plus one for the spec docs, pushed to `qa-development-2026-ss` with the user's explicit authorization ("si ves que todo funciona bien subes cambios a mi rama"). Only this spec's files are staged; the other session's work (`bugfix/achieved-counts-submitted`) is left untouched.
