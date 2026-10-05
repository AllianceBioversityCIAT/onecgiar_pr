# Notification Detail Side Panel — Execution Log

## Document Control

- **Spec:** `notifications/detail-side-panel`
- **Approval Mode:** gated (from `requirements.md` / `proposal.md`)
- **Branch:** `qa-development-2026-ss`
- **Leader model:** Opus 5.5 (T1 registry = `opus` — matches)
- **Started:** 2026-10-05
- **Budget (design §13):** 9 tasks · ~1,100 LOC · ≤ 2 review rounds per task, ≤ 12 Reviewer passes total

### Run notes

- 2026-10-05 — Eligible at start: DSP-T-1 and DSP-T-3. They were run serially, not in parallel. Reason: T-3 edits `notification-item.{html,ts}`, which still holds uncommitted `bilateral-project-tagged` changes (BPT-T-1..T-3 are `[x]`, BPT-T-4 HITL is pending). Starting T-3 on top of them would mix both specs into the Reviewer's diff. T-1's files (`share-result-request/*`) are clean.
- The constitutional docs `prd.md`, `ux-ui/design.md` and `trd/trd.md` went to workers as pointers. The Leader did not read them whole in Step 0, because neither T-1 nor T-3 needs product scope or token decisions beyond what the spec already cites.

---

## Task Execution History

### DSP-T-1 — Server: approval-chain endpoint — IN PROGRESS (attempt 1 FAIL · budget tripwire)

- **Date:** 2026-10-05 · **Effort:** high (auth + new contract) · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` (as listed)
- **Review mode:** parallel lens reviewers. Reviewer A: spec + readability + reliability. Reviewer B: spec + resilience + risk/security. Reason: the task touches authorization.
- **Diff delivery:** the diff is 1,294 lines, so it went to the Reviewers as a scratchpad file read with `Read`, not inline. Deviation reason: brief size. The Reviewers still could not regenerate it themselves.

#### Attempt 1

- **Files:** new `dto/approval-chain.dto.ts`; `share-result-request.{controller,service,repository}.ts`; `share-result-request.{controller,service,repository}.spec.ts`. Diffstat: 7 files, +1179 / −4.
- **What was built:**
  - A pure `composeApprovalChain(...)` in the repository file, tagged `@akili-spec`.
  - `getResultForApprovalChain`, a 1-query lookup.
  - `getApprovalChainData`, 3 queries run in parallel.
  - `ShareResultRequestService.getApprovalChain`, returning 400, then 404, then 403, then 200.
  - The route `GET get/result/:resultId/approval-chain` with `@ApiOperation`, `@ApiParam` and `@ApiResponse` for 200/400/401/403/404.
- **Verification:**
  - `npx jest --runInBand --testPathPattern=share-result-request --silent --reporters=summary --forceExit` → 7 suites, 190 tests passed. `--runInBand` was used because free RAM was about 1.5 GB.
  - eslint on the 7 touched files → clean. `tsc --noEmit -p onecgiar-pr-server` → clean.
- **Red run:** the first run failed only on a TS union-type error in the service spec. For the composition falsifiers the Implementer claimed "red by inspection", not an observed red run.
- **Implementer assumptions (not gaps):**
  - When more than one active primary request exists, the latest by `requested_date` wins.
  - The request query fetches owner, requester and approving initiative ids only to feed the §7 authorization check.
- **Reviewer B (security): `STATUS: PASS`.** The 400 → 404 → 403 order matches §4.1. The 403 response body is `{error:true}` only. Inactive `role_by_user`, `results_by_inititiative`, request and result rows cannot grant access. SQL is parameterized. There is no email or user id in the response. The 403 test goes through the real `$_getMaxRoleByUser` and `role_by_user.find`. Swagger is complete.
- **Reviewer A (spec/reliability): `STATUS: FAIL`.** Verbatim issues:
  1. **Discovered Issue:** The precedence between a primary request and the owner row is never tested. The only primary-request test ("maps an active primary request with status 1 to pending") passes `initiativeRoleRows = []`, so no owner row competes with it. If the code checked `ownerRow` before `activePrimaryRequest`, every test would stay green while a result with an owner row and a pending primary request reports `accepted`. That is the falsifier "a primary request with status 1 shows the primary as `accepted`". **Violated Rule:** design.md §10 server Jest row ("primary from request vs owner"); §5 step 2; tasks.md DSP-T-1 Falsifier bullet 4. **Remediation:** in `share-result-request.repository.spec.ts`, add a `composeApprovalChain` case with both a role-1 owner row and an active status-1 primary request. Assert exactly one primary step with `status: 'pending'` and the requester as actor. Optionally use a different initiative for the owner and assert it is not in `steps`.
  2. **Discovered Issue:** No test covers an authorized non-admin viewer. Every service test that reaches 200 uses `$_getMaxRoleByUser = 1`. If `isViewerInvolvedInApprovalChain` always returned `false`, every test would still pass while every normal user gets 403. Also, `viewerInitiativeIds` reaching composition (`is_viewer_program`) is never checked end to end through the service. **Violated Rule:** requirements.md DSP-R-12, scenario "Authorized viewer"; tasks.md DSP-T-1 ("both scenarios", DoD red → green); design.md §7 involvement clause. **Remediation:** in `share-result-request.service.spec.ts`, add a test with a non-admin role (e.g. 3) whose `role_by_user.find` returns an initiative that appears only as the `approving_inititiative_id` or `requester_initiative_id` of a request row. Assert `HttpStatus.OK`, and assert `is_viewer_program: true` where the fixture produces that step.
- **ADVISORY (recorded, non-gating):**
  - A — READABILITY: the latest-by-`requested_date` sort is duplicated. Extract a helper.
  - A — READABILITY: the DTOs have no `@ApiProperty`, and there is no Swagger CLI plugin, so the `ApprovalChainDto` schema renders empty.
  - A — RELIABILITY: the draft-exclusion test also passes if the `[1,2,3]` filter is removed, because the null mapping hides it. Add a case with a newer draft and an older pending request.
  - A — RELIABILITY: the latest-request test feeds rows oldest first, so a "take the last row" bug would pass. Feed them newest first.
  - A/B — RISK: the involvement check only sees `results_by_inititiative` roles 1 and 2, plus an INNER JOIN to CLARISA. This is narrower than §7's wording and fails closed.
  - A/B — RISK: 404 is decided before 403, so a caller learns whether a result exists. The spec allows this ordering.
  - B — RESILIENCE: an over-long numeric id passes the regex and becomes `1e20`, which ends in a harmless 404. Suggest `Number.isSafeInteger`.
  - B — RISK: the `role_by_user.find` mock ignores `where`, so no test pins the `active: true` filter.
  - B — RISK: unauthorized calls still run the 3 chain queries before the 403. Wasted reads, no leak.

#### Budget tripwire (design §13) — escalated to the user before attempt 2

- **Budget:** about 1,100 LOC for the **whole spec** (≈ 450 source + 650 tests).
- **Actual after T-1 alone:** +1,179 LOC (≈ 630 source: repository +416, service +127, controller +46, DTO +39; ≈ 555 tests).
- **Cause:**
  - The repository change includes 4 raw SQL queries and a defensive composition function covering every §5 branch.
  - The design's LOC estimate did not size the server half. The spec reads as client-dominant (~450 source for all 8 tasks), but T-1 alone is a full read model.
- **Review rounds:** 2 of the ≤ 12 Reviewer passes used (one attempt, two parallel lenses).
- **User decision (2026-10-05):**
  - Raise the budget and continue. Revised estimate: about 2,200 LOC for the spec (server T-1 ≈ 1,250 + client ≈ 950).
  - Review-pass cap unchanged (≤ 12).
  - The user commits the `bilateral-project-tagged` changes before T-3.

#### Attempt 2 — effort xhigh (bumped one level per retry rule)

- **Files:** `share-result-request.repository.spec.ts` and `share-result-request.service.spec.ts` only. Production files are byte-identical to attempt 1.
- **Tests added, each observed red then restored:**
  1. repository.spec, "primary from request vs owner: an active primary request outranks the owner row". Inputs: owner SP04 (role 1) and an active status-1 primary request for SP12. **Red:** with the precedence swapped to `if (ownerRow)` first, repository.spec.ts:524 received `{SP04, accepted, Owner Person}`.
  2. service.spec, "200s an authorized non-admin viewer involved only through a request row, with is_viewer_program set". Inputs: a role-3 viewer whose initiative 7 appears only as approving/shared on a pending request; the real `$_getMaxRoleByUser` and `role_by_user.find` are mocked at the repository boundary. **Red:** with `isViewerInvolvedInApprovalChain` forced to `false`, service.spec.ts:2126 received 403 instead of 200.
- **Verification:** `npx jest --runInBand --testPathPattern=share-result-request --silent --reporters=summary --forceExit` → 7 suites, 192 tests passed. Free RAM was about 0.6 GB, so the run used `--runInBand`. eslint on the 2 specs → clean. tsc → clean.
- **Reviewer A re-review: `STATUS: PASS`.** "Both tests added in attempt 2 catch the wrong branch the attempt-1 FAIL named, and I found no other gate issue in DSP-T-1. The production files are unchanged from attempt 1, which already passed conformance and security, and attempt 2 adds tests only." Reviewer B was not re-run: its security PASS covered production code that did not change.

#### Final — DSP-T-1 PASS (attempt 2 of 3)

- **Requirements covered:**
  - DSP-R-12, both scenarios.
  - DSP-R-8 data: order, statuses, actor/date, `is_viewer_program`, and the not-submitted branch.
  - DD-4, DD-5, DSP-AC-9.
- **Decisions:**
  - Composition is a pure exported function (`composeApprovalChain`), so the Disqualifier's raw-rows test is possible.
  - When more than one active primary request exists, the latest by `requested_date` wins.
  - The diff went to the Reviewers as a scratchpad file because of its size.
- **Issues:** attempt 1 lacked observed red evidence for 2 contract branches. It was fixed in attempt 2 with tests only.
- **Final verification:** 7 suites, 192 tests green; lint and tsc clean; Swagger `@ApiOperation` present.
- **Totals:** +1,242 / −4 LOC (≈ 630 source, ≈ 610 tests). 3 Reviewer passes used of the ≤ 12 cap.
- **Open advisories:** the ADVISORY list under attempt 1 still stands and is not scheduled. Note for T-2: the `ApprovalChainDto` has no `@ApiProperty`, so its Swagger schema is empty. The client contract is design §4.1, not Swagger.
- **Constitution Impact:** none. This is a new route in an existing module. No module boundary changed.
- **Commit:** pending the user's go-ahead (standing no-auto-commit rule).

---

### DSP-T-3 — Extract `notification-detail-content`; drawer becomes a sheet shell — IN PROGRESS

- **Date:** 2026-10-05 · **Effort:** high · **Skills:** `angular-developer`, `spartan` (as listed)
- **Review mode:** a single Reviewer with the full lens checklist. The task touches no security, migration or data-loss surface.
- **Pre-flight:** the `bilateral-project-tagged` changes were committed first (`cb27be98b`, by the Leader at the user's request, then pushed at the user's request), so `notification-item.*` was clean before T-3.
- **Environment:** free RAM was 0.7–3.1 GB, so Jest ran with `--runInBand` and `npm run build` was deferred. `npx tsc -p tsconfig.app.json --noEmit` was used as the interim check. The build and the manual 1024 px browser pass are still owed before PASS.

#### Attempt 1

- **Files:**
  - New: `notification-detail-content.component.{ts,html,scss,spec.ts}` + `CLAUDE.md`.
  - Changed: `contribution-request-drawer.component.{ts,html,spec.ts}` + `CLAUDE.md`; `notification-item.component.{ts,html,spec.ts}` + `CLAUDE.md`; `notification-item.module.ts`; `design.md` §1A (P-9/P-10 marked verified) and §14.
  - Totals: 14 client files, +1742 / −1369.
- **Verification:** `npx jest --runInBand --testPathPattern="contribution-request-drawer|notification-detail-content|notification-item.component" --silent --reporters=summary --no-coverage` → 5 suites, 313/313 passed. tsc → clean. `npx ng lint --quiet` → clean.
- **Test relocation:** the original drawer spec had 55 tests. 48 were removed and 7 stayed as shell tests, plus 3 new shell tests. 47 moved 1:1 to the content spec, plus 1 new heading-id test. One was not relocated: `NOTIF-T-4 > "emits closed exactly once on Escape in view mode"`.
- **Reviewer: `STATUS: FAIL`.** Issues, verbatim in substance:
  1. **The sheet has no accessible name in a real browser.** BrnDialog opens the CDK dialog with `ariaLabelledBy` = `brn-dialog-title-${dialogId}` (and `aria-describedby` = `brn-dialog-description-<id>`) when no input is given (`spartan-ng-brain-dialog.mjs:212-215`). Those ids were set by the removed `BrnDialogTitle`/`BrnDialogDescription`, so the `role="dialog"` container now points to ids that don't exist. The new `[attr.aria-labelledby]` sits on the role-less `hlm-sheet-content`, which AT ignores, and the shell test only proves the attribute exists on the wrong node. **Violated:** tasks.md DSP-T-3 Falsifier (no accessible name / non-existent id); design.md DD-3 "Addressed"; requirements.md §8 Accessibility. **Remediation:**
     - Bind `[aria-labelledby]="labelledBy()"` on `<hlm-sheet>` (BrnDialog input alias, L318 → CDK config L338).
     - Do the same for `aria-describedby`, using the sentence `<p>` id, or `null`.
     - Drop the `hlm-sheet-content` binding.
     - Add `@Input('aria-labelledby')`/`@Input('aria-describedby')` to the `BrnSheet` stub in `tests/mocks/spartanBrainMock.ts` (Leader OK needed).
     - Assert the value via `By.directive(HlmSheet)`.
     - Prove it in the 1024 px browser pass (DevTools Accessibility name).
  2. **No test proves the content ✕ reaches `notification-item.closeDrawer()`.** The only link is the template binding `(closed)="onDrawerClosedSignal()"`; deleting it turns nothing red. **Violated:** tasks.md DSP-T-3 Falsifier (✕ → closeDrawer); DD-3. **Remediation:** a notification-item spec test that opens the drawer, clicks `crd-close-btn`, and asserts a `closeDrawer` spy called exactly once, `drawerOpen()` false, and `crd-panel` gone.
  3. **Escape test drop, adjudicated as a violation.** The shell-level coverage is real, but the Disqualifier is a count rule, and "view-mode panel closes exactly once on Escape" now depends on the row's wiring, which is untested. **Violated:** tasks.md DSP-T-3 Disqualifier (moved count = removed count). **Remediation:** relocate it as a notification-item integration test (view-mode row, keydown Escape on `crd-panel`, `closeDrawer` once, `drawerOpen()` false), recorded as the 48th relocation.
- **ADVISORY:**
  - notification-item CLAUDE.md is missing the `**Verified:**` re-stamp and has 3 stale pointers (the `viewMetadataRows` location, the drawer's mode guard, a module-imports line).
  - The new content CLAUDE.md is 122 lines, over the 120-line cap in `docs/COMPONENT-DOCS.md` §4.
  - The shell CLAUDE.md keeps about 150 lines of contradicting history, and claims the dialog name is "Fixed".
  - The `ContributionRequestDrawer*` type names now live in the content component.
  - §1A DSP-P-10 cites a null assertion as evidence. The positive tests are at notification-item spec L1974 and L2561.
  - §1A DSP-P-9's reasoning is better stated as: the template injector resolves at the row's declaration site.
- **Leader adjudication:**
  - Issues 1–3 are in scope and go to attempt 2.
  - **The Leader approves** the additive edit to the shared `tests/mocks/spartanBrainMock.ts`. It is test infrastructure, and it is required for Issue 1 to compile under Jest.
  - The CLAUDE.md advisories are folded into attempt 2 as **DoD conformance**, not new scope: DoD "both CLAUDE.md files updated" means accurate, under the 120-line cap and re-stamped. The §1A P-9/P-10 wording is too, since T-3 itself owns recording P-9/P-10.
  - The type rename stays out of scope (advisory only).

#### Attempt 2 — effort xhigh

- **Files changed in attempt 2:**
  - `tests/mocks/spartanBrainMock.ts`: additive. The `BrnSheet` stub gets `@Input('aria-labelledby')` and `@Input('aria-describedby')`.
  - Shell `.ts/.html/.spec.ts`: new `describedBy` input. The aria bindings moved to `<hlm-sheet>`.
  - Content `.html`: the sentence `p[id]` is now `headingId()+'-desc'`.
  - notification-item `.html`: passes `[describedBy]`.
  - notification-item `.spec.ts`: 2 new tests.
  - All 3 CLAUDE.md files.
  - `design.md` §1A rows P-9 and P-10.
- **Issue 1 fix path:** `HlmSheet extends BrnSheet extends BrnDialog` (`usesInheritance`). The `BrnDialog.ariaLabelledBy`/`ariaDescribedBy` signal inputs (`spartan-ng-brain-dialog.mjs` L317-318) feed `_options()` (L337-338), then `open()` (L367), then `_cdkDialog.open({ariaLabelledBy, ariaDescribedBy})` (L212-215), which sets them on the `role="dialog"` container. Both ids sit outside any `@if`, so they render in every mode.
- **Observed red for the new tests:**
  - "clicking crd-close-btn calls closeDrawer() exactly once…" failed with 0 calls when `(closed)` was removed from `<app-notification-detail-content>`.
  - "emits closed exactly once on Escape in view mode…" failed with 0 calls when `(closed)` was removed from `<app-contribution-request-drawer>`.
- **Relocation final:** removed = 48, moved = 48. 47 went to `notification-detail-content.component.spec.ts`. The 48th went to `notification-item.component.spec.ts` (describe "DSP-T-3: Escape inside the panel in view mode").
- **CLAUDE.md line counts:** shell 63, content 113, notification-item 455. The notification-item file was already over the 120-line cap before this task, so that is recorded and out of scope.
- **Verification:**
  - Jest `--runInBand` on the scoped pattern: 5 suites, 316/316 passed.
  - The other consumers of the shared mock (`bilateral-quality-assessment-dialog`, `program-overview.scope`, `primary-decline-justification-dialog`): 3 suites, 206/206 passed.
  - `tsc -p tsconfig.app.json --noEmit` clean. `ng lint --quiet` clean.
- **Reviewer re-review: `STATUS: PASS`.** "All three attempt-1 FAIL issues are fixed, and I checked the fixes against the real library source rather than the stub. I found no new spec violations in attempt 2."
- **ADVISORY:**
  - The shell spec reads a stub property. With the real Brain package it is a signal input.
  - `aria-describedby` reads the whole header sentence. Keep it one short sentence when T-4 restyles it.

#### Status after attempt 2: `[~]` — Reviewer PASS, DoD gates owed

- **`npm run build` (client): not run.** It is in the DoD, and `tsc`/`ng lint` do not type-check templates (`src/CLAUDE.md` §21.7), while this diff adds template bindings. Free RAM was 0.7 GB (node used only 0.2 GB), below the 4 GB machine rule, so this was escalated to the user.
- **Manual 1024 px browser pass: not done** (Disqualifier). Checklist from the Reviewer:
  1. The `cdk-dialog-container[role=dialog]` has `aria-labelledby="crd-heading-N"` and `aria-describedby="crd-heading-N-desc"`, both resolving to elements inside it, and no `brn-dialog-*` ids. Its name in the DevTools Accessibility pane is the heading text.
  2. Opening two rows one after the other, each references its own id.
  3. In a view-mode row, the description id resolves.
  4. `[crdAlign]` and the full body render in the real overlay. ✕, Escape and the scrim each close it once, and focus returns to the row.
  5. Pixel parity of the 720 px panel with the pre-split version.
- **Review passes used:** 5 of the ≤ 12 cap (T-1: 3, T-3: 2).

#### DoD gates — Leader follow-up (2026-10-05)

- **Template type-check:** `npx ngc -p tsconfig.app.json --noEmit` (onecgiar-pr-client) → **exit 0** in 63 s. Warnings were only NG8113/NG8112 in unrelated files (dashboard-lab, programme-results, my-work-board, my-draft-results, hlm.spec). No diagnostic in `notification-detail-content`, `contribution-request-drawer` or `notification-item`. This covers the Reviewer's concern that `tsc` skips templates.
- **`npm run build` (full bundle): still not run.**
  - Free RAM stayed at about 1.0–1.5 GB of 30.7 GB even after the user closed apps.
  - Cause found: the kernel non-paged pool is at **7.4 GB**, a likely driver leak that only a reboot clears.
  - The machine rule (< 4 GB → do not launch) holds. `ngc` was used as the template-correctness substitute.
  - **Owed:** run the full build after a reboot.
- **Manual 1024 px browser pass: blocked.** The Claude-in-Chrome extension refuses the connection because Claude Code and the extension are signed in to different claude.ai accounts. Probe: `tabs_context_mcp` was tried twice, at the user's request the second time, and failed both times. The fix is on the user's side. The task stays `[~]`.

#### Manual browser pass (Leader, Claude-in-Chrome, 2026-10-05) — PASS

- **Setup:** the local stack was up (client :4200, server :3400, real QA data). After the user fixed the account mismatch, the extension connected.
- **Width caveat:**
  - The Chrome window was maximized and ignored the resize to 1024 px. The pass ran at a 2,844 px CSS viewport (devicePixelRatio 0.9).
  - Before T-6 the drawer opens identically at every width (there is no breakpoint logic yet). So every check below is width-independent, except the full-screen-below-640-px rule, which T-3 did not touch.
  - Width-specific checks (1024 / 1280 / 1440 / 1600 / 390) remain T-9's job.
- **Results:**
  1. **Accessible name.**
     - Bilateral "Contributor request · W3/Bilateral" row (result 7636): `cdk-dialog-container[role=dialog]` has `aria-labelledby="crd-heading-139"` → `h2#crd-heading-139` "Contribution request", inside the container.
     - It has `aria-describedby="crd-heading-139-desc"` → the header sentence, inside the container.
     - There are 0 `brn-dialog-title-*`/`brn-dialog-description-*` ids in the DOM.
     - The browser accessibility tree reports `dialog "Contribution request"`. ✅
  2. **Per-row ids.** A second row (a W1/W2 contribution request) used `crd-heading-29` / `crd-heading-29-desc`, both resolving inside its dialog. ✅
  3. **View mode.** The "For your information" row (result 9568, approved) used `crd-heading-331` (+ `-desc`), both resolving. It has no footer buttons and no Align slot. ✅ The title shows "Contribution request" for an update row; this is existing behavior, and T-4 changes the title.
  4. **Projection and close.**
     - `[crdAlign]` (`data-testid="align-slot"`) renders inside the real CDK overlay for the bilateral row. This confirms DSP-P-10 / CRD-P-4 in a real browser. ✅
     - ✕, Escape and a backdrop click each close it (0 dialogs afterwards). ✅
     - After opening with a **real** mouse click and closing with ✕, focus returns to the row's `.notification_interactive` (inside the row). ✅ An earlier JS-`.click()` open returned focus to the tab button. That is an artifact of the probe: a programmatic click does not move focus, and CDK restores the element focused before opening. It is not a defect.
  5. **Pixel parity.**
     - Method: a geometry-and-style fingerprint of every visible element in the panel, recorded relative to the panel. Fields: tag, x/y/w/h, font-size, weight, color, background, padding, margin, border-top, gap, display.
     - Steps: fingerprint with T-3 applied; `git stash push -u -- onecgiar-pr-client`; ng serve recompiled to pre-T-3, confirmed by `app-notification-detail-content` being absent; fingerprint again; `git stash pop`.
     - **Decide row: 56/56 elements identical. View row: 28/28 identical. Panel 828×1388 in both. Leaf text identical.** ✅
     - After the pop, the working-tree client diff is byte-identical to the reviewed attempt-2 diff (`cmp`).
  - Screenshot of the bilateral decide row: `claude-chrome-screenshots-1PJTGa/screenshot-1791219027735-0.jpg` (local temp).
- **Remaining DoD item:** the full `npm run build`. Available RAM is still about 1.2 GB (non-paged pool 7.3 GB), below the machine's 4 GB rule. Template correctness is covered by `ngc` (exit 0). The open question is whether the user waives the full build or reboots first.

#### Full build (user chose "run the build anyway" despite low RAM)

- `npm run build` (onecgiar-pr-client) → **exit 0** in 1 m 46 s. Output: `dist/onecgiar-pr-client`.
- One warning: the **initial** bundle is 2.48 MB against a 2.00 MB budget. T-3's code lives in the lazily loaded notifications route, so this almost certainly predates T-3. That was not proven with a baseline build. Recorded as an advisory.

#### Final — DSP-T-3 PASS (attempt 2 of 3)

- **Requirements covered:** DD-3, including its reversion-challenge mitigations: accessible name via `<hlm-sheet>`, ✕ → `closed` → row, `crd-*` testids kept, and the focus check repeated in the manual pass. This is the prerequisite for DSP-R-1 and DSP-R-4. DSP-P-9 and DSP-P-10 are verified, P-10 in a real browser.
- **DoD:**
  - Scoped Jest 316/316, plus 206/206 for the other users of the shared mock.
  - `tsc` and `ngc` clean; `ng lint` clean; full build green.
  - 3 CLAUDE.md files updated.
  - Moved tests = removed tests = 48.
  - Manual browser pass PASS (pixel parity proven, 56/56 and 28/28).
- **Decisions:**
  - The Leader approved the additive edit to the shared `tests/mocks/spartanBrainMock.ts`.
  - The CLAUDE.md advisories and the §1A wording were folded in as DoD conformance.
  - `drawerHeadingId` comes from a per-instance counter.
- **Issues:** attempt 1 bound `aria-labelledby` on the wrong node, which left a dangling dialog name in a real browser. It also missed the ✕ → row test and dropped one test. All were fixed in attempt 2.
- **Open advisories (not scheduled):**
  - Rename the `ContributionRequestDrawer*` types.
  - The shell spec reads a stub property where the real code has a signal input.
  - Keep the describedby sentence short in T-4.
  - notification-item CLAUDE.md is 455 lines, over the 120-line cap (this predates the task).
  - The initial bundle budget warning.
- **Constitution Impact:**
  - **New component:** `components/notification-detail-content/`, with its own CLAUDE.md.
  - **Changed public surface:** `contribution-request-drawer` now takes only `open`, `labelledBy`, `describedBy` and `closed`.
  - The parent `results-notifications` folder docs and the client `src/CLAUDE.md` module index may need a pointer at `/akili-archive`.
  - CodeGraph re-index pending.
- **Review passes used:** 5 of the ≤ 12 cap (T-1: 3, T-3: 2).
- **Commit:** pending the user's go-ahead.

---

### DSP-T-2 — Client: chain API method + row chain state — `[~]` PIVOT (attempt 1)

- **Date:** 2026-10-05 · **Effort:** medium-high · **Skills:** `angular-developer`, `tdd` (as listed)
- **Diff isolation:** the Reviewer got T-2's delta only. It was produced with `git diff --no-index` against a snapshot of the client files taken right before T-2 started, because T-3 is still uncommitted in the same files.

#### Attempt 1

- **Files:** `results-api.service.ts` (+spec): `GET_requestApprovalChain(resultId)` → `${apiBaseUrl}request/get/result/${resultId}/approval-chain`, plus client mirrors of the DTO types. `notification-item.component.ts` (+spec): the `approvalChain` signal (`loading|ok|error`), a `chainRequestToken` stale guard, `fetchApprovalChain()`, `retryChain()`, a fetch on every `openDrawer`, a token bump on `closeDrawer`, and a re-fetch in the success (`next:`) handlers of `acceptOrReject()` and `submitPrimaryDecline()`.
- **Verification:** `npx jest --runInBand --testPathPattern="notification-item.component|results-api.service"` → 4 suites, 580/580 passed. `ng lint` clean. tsc clean.
- **Falsifiers:** all 5 were observed red by breaking the guarded line, then restored. They covered: the open fetch; error → `error`; re-request after accept (call count); the stale response after close; and the strict PATCH payload check.
- **Reviewer: `STATUS: FAIL`.** Issue, verbatim in substance:
  1. **Discovered Issue:** the "reload after a decision" GET is sent, but its result is always thrown away in real use.
     - The success hook takes token N.
     - The existing `finalize` then calls `closeDrawer()` in the same tick (L1301 / L1372; CRD-DD-6 / CRD-R-8 "Outcome closes the drawer"), which bumps the token to N+1.
     - The response is dropped, and the chain never shows the new status.
     - Falsifier test 3 passes only because the mocks are synchronous `of(...)`. It counts calls; it does not prove the behavior.
     - **Violated:** requirements.md DSP-R-8 "After a decision" (L183-187); DSP-AC-8 (L257); tasks.md DSP-T-2 Disqualifier (L64: "if wiring the re-fetch requires changing … control flow beyond a success hook, stop and escalate"); design.md L122 (decision methods unchanged).
     - **Remediation:** escalate the spec conflict. Options: (a) amend R-8/AC-8 to "reload on next open" and drop the dead GETs; (b) approve keeping the panel open after a successful decision; (c) record AC-8 as a gap.
- **Everything else conforms:**
  - The URL and prefix are correct, and the name follows `HTTP_METHOD_descriptiveName`.
  - The types mirror the DTO, with no PII.
  - The fetch runs on every open, an error ends in `error`, and `retryChain()` is public.
  - The stale guard works for open → close → open.
  - There is no fetch on the toggle-close path and no re-fetch on a failed decision.
  - The PATCH payload is unchanged.
  - Adding the re-fetch to `submitPrimaryDecline` was judged in scope.
- **ADVISORY:**
  - An empty or failed body is stored as `{ok, data: undefined}`. Treat a missing `response` as `error`.
  - A response that arrives after destroy writes to a dead signal. Bump the token in `ngOnDestroy` (planned in T-7) or use `DestroyRef`.
  - The falsifier-2 test title is a double negative.

## Pivot Record: DSP-T-2

- **Blocker:** the spec contradicts itself. DSP-R-8 "After a decision" and DSP-AC-8 require the panel to show the reloaded chain with the viewer's new status after a successful decision. But design.md §6.2/L122 keeps the decision methods unchanged, and they close the panel on outcome (CRD-R-8 / CRD-DD-6, `finalize` → `closeDrawer()` before `requestEvent.emit()`). There is nothing left on screen to show the reload. The Leader confirmed this in source (`notification-item.component.ts` L1293-1306).
- **Why it surfaced only now:** the conflict sits between DSP-R-8 and an inherited CRD rule. design.md §2.2 step 6 assumed the panel survives the decision, and no premise in §1A covered it.
- **Alternatives:**
  - **(a) Amend R-8/AC-8 (recommended).**
    - New wording: "After a successful decision the panel closes (CRD-R-8) and the list refreshes. The next open of that notification fetches a fresh chain showing the new status."
    - Remove the two dead `fetchApprovalChain()` calls in the success hooks and rewrite falsifier 3 as "a re-open after a decision fetches again".
    - Cost: small, and it keeps the stabilized decision flow untouched (DD-1's rationale).
  - **(b) Keep the panel open after a successful decision.** Change CRD-R-8 for the drawer and docked panel so the panel stays open and the chain reloads to show the new status. It is arguably nicer in the docked panel. Cost: it changes decision-flow control logic that the PSR/BCT specs just stabilized. CRD-R-8 / NOTIF tests would change, the row is reused under `track $index` (CRD-P-6) across the parent refetch, and T-7's takeover rules interact with it. This needs a design amendment plus new tasks: scope growth.
  - **(c) Record DSP-AC-8 as an accepted gap.** Keep the requirement unmet and documented. This is not recommended, because it leaves a dead GET or a false requirement.
- **No `ADR-NNN` affected** (this is spec-level, not a TRD decision).
- **Status:** T-2 is `[~]`, waiting for the user's choice. Once approved, the spec is amended (requirements DSP-R-8/AC-8, design §2.2 step 6 and DD-10, tasks DSP-T-2 falsifier 3 and the coverage table), followed by a two-direction sweep and T-2 attempt 2.

- **Pivot resolution, user-approved 2026-10-05: option (a), reload on next open.** Amended:
  - `requirements.md`: DSP-R-8 "After a decision" (+ a BUT clause: no undisplayable request), §8 Performance, DSP-AC-8.
  - `design.md`: §2.2 step 6, §6.4, §8, DD-10 (with an "Amended" note).
  - `tasks.md`: DSP-T-2 description bullet, falsifier 3 split into two bullets (no request before close; reopen fetches fresh, using an async `Subject`), Disqualifier, coverage row.
  - `proposal.md`: R6 marked resolved.
- **Two-direction sweep:**
  - Forward: a grep for "per successful", "re-runs on decision", "re-fetches the chain", "chain is not re-requested" and "Chain reloads" finds nothing.
  - Backward: references to DD-10, AC-8 and "After a decision" (requirements L183/L259, design L268, tasks L53/L264) all read consistently with the amended text. The `CRD-DD-10` mentions are a different decision and are unaffected.

#### Attempt 2 — effort high (post-pivot retry)

- **Changes:**
  - Removed both success-hook `fetchApprovalChain()` calls and updated the `approvalChain` docstring to match the amended DD-10.
  - Replaced the old falsifier 3 with two async-`Subject` tests:
    - (a) "no chain request is sent before the panel closes". **Red** with the fetch re-inserted into `next:` (2 calls instead of 1).
    - (b) "reopening the row fetches a fresh chain". **Red** with the open-path fetch disabled (0 calls instead of 2).
  - Title-only renames: falsifier 2 and the payload test.
- **Leader verification:** the `acceptOrReject` and `submitPrimaryDecline` bodies (148 lines, extracted with awk) are byte-identical to `HEAD` (`cb27be98b`).
- **Verification:** `npx jest --runInBand --testPathPattern="notification-item.component|results-api.service"` → 4 suites, 581/581 passed. tsc clean. `ng lint --quiet` clean.
- **Reviewer re-review: `STATUS: PASS`.** "I checked the amended DSP-T-2 against the spec text … All six falsifier bullets are covered, and the amended BUT clause holds. `fetchApprovalChain()` is now called from only two places … `openDrawer()` … and `retryChain()` … The disqualifier is not hit."
- **ADVISORY:** the evidence was run with `--runInBand` rather than the task's `--maxWorkers=2`. This is allowed by the machine RAM rule and does not change the result.

#### Final — DSP-T-2 PASS (attempt 2 of 3, post-pivot)

- **Requirements covered:**
  - DSP-R-8 "Loading and failure" (state side) and "After a decision" (amended).
  - DD-10 (amended), DSP-AC-7 (state), DSP-AC-8 (amended).
- **Decisions:**
  - Pivot (a), user-approved: no post-decision fetch; the next open is the refresh.
  - A `chainRequestToken` stale guard.
  - The client DTO types live next to `GET_requestApprovalChain` in `results-api.service.ts`.
- **Diff size:** about 90 production LOC and about 230 test LOC.
- **Open advisories (not scheduled):**
  - An empty or failed `response` is stored as `{ok, data: undefined}`. Relevant to T-5's render.
  - Bump the token on destroy (T-7 adds `ngOnDestroy`).
- **Constitution Impact:** none (an additive API method and row state).
- **Review passes used:** 7 of the ≤ 12 cap (T-1: 3, T-3: 2, T-2: 2).
- **Commit:** deferred. The user asked to commit and push only after all tasks are finished.
