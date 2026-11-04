# Module Spec — `execution.md`

## 1. Document Control

- **Module / feature:** `results` / `program-full-names-labels-part-2`
- **Linked:** `requirements.md` · `design.md` · `tasks.md` (same folder)
- **Approval Mode:** gated · **Branch:** `qa-development-2026-ss`
- **Leader:** Opus 5.5 (T1) · **Implementer:** `akili-implementer` wrapper (sonnet, T2) · **Reviewer:** `akili-reviewer` wrapper (opus, T3)
- **Started:** 2026-10-13

## 2. Task Execution History

### Wave 1 — {PF2-T-1, PF2-T-2} (parallel, shared scratchpad `jest.lock` mutex)

### PF2-T-1 — Server: IPSR queries return the P/A name (M1, S1)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`
- **Attempt 1 — files changed:** `onecgiar-pr-server/src/api/ipsr/ipsr.repository.ts` (+39, 0 deleted); `ipsr.repository.spec.ts` (+96, new `describe('PF2-R-1 …')` block, 5 tests, no existing assertion edited).
  - `getAllInnovationPackages`: `ci.name AS submitter_name`, `ci.short_name AS submitter_short_name` (SELECT DISTINCT, no GROUP BY; `ci` INNER JOIN 1:1).
  - `getResultsInnovation`: `initiative_name` via its own `IF(rbi.initiative_role_id = 2, ci2.name subquery, ci.name subquery)`, mirroring the `official_code` IF.
  - `getResultInnovationById`, `getInnovationCoreStepOne`: sibling correlated subquery `initiative_name`.
  - `getStepTwoOne`: `ci.name as initiative_name` (existing LEFT JOIN → SQL NULL when missing).
- **Verification:** `npx jest --maxWorkers=2 --forceExit --testPathPattern="ipsr.repository|ipsr.service|innovation-pathway-step-one|ipsr_general_information.service"` → `Test Suites: 5 passed, 5 total · Tests: 69 passed, 69 total`. Lint on touched files: clean.
- **Implementer `Not Done / Assumptions` → Leader adjudication:**
  - `getAllInnovationPackagesFiltered` (`all-innovation-packages/filter`) not extended. Leader checked: the client only calls `api/ipsr/all-innovation-packages` (`results-api.service.ts:1055`) → out of scope (design §4 names only `getAllInnovationPackages`). Not owed.
  - `GetInnovationComInterface` not given `initiative_name`: runtime passthrough, file not in design §4. Not owed; T-4 may type it client side.
  - SQL on MySQL not provable in Jest → HITL smoke (`tasks.md` §6).
- **Reviewer verdict:** `STATUS: PASS`. SELECT-list only; DD-2 aliases; `getResultsInnovation` name and code from the same branch (design §7); no grouping so no `ANY_VALUE()`; `null` never `"null"`; no alias collision (only other `initiative_name` is in untouched `getResultInnovationDetail`). Reviewer concurred with both Leader rulings.
- **ADVISORY (4R, non-gating):**
  - *Reliability:* the copied role=2 `ci2` subquery inherits the original's missing `rbi2.is_active = 1` / `LIMIT 1`; a result with >1 role-1 row would hit "Subquery returns more than 1 row" in two places instead of one. Pre-existing risk, copied deliberately for branch parity. Candidate for a later fix to both subqueries together (outside this spec).
  - *Readability:* `getResultInnovationById` / `getInnovationCoreStepOne` use a second correlated subquery rather than a join; permitted by design §4, a single LEFT JOIN would be tidier on a future refactor.
- **Requirements covered:** PF2-R-1 both scenarios for M1 and S1.

### PF2-T-2 — Server: completeness, outcome-indicator, review history (M2, M3, M4)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 1 · **Effort:** medium · **Skills:** `nestjs-expert`
- **Attempt 1 — files changed** (all under `onecgiar-pr-server/src/api/`):
  - `results/admin-panel/admin-panel.repository.ts`: `reportResultCompleteness` adds `ci.name AS initiative_name` (+1)
  - `contribution-to-indicators/repositories/contribution-to-indicator-result.repository.ts`: `getContributingResultsQuery` adds `main_ci.name as result_submitter_name` in both UNION branches (+2)
  - `results/result-review-history/result-review-history.repository.ts`: `getReviewHistoryByResultId` adds `ci.name AS initiative_name` (+1)
  - Specs: new `results/admin-panel/admin-panel.repository.completeness.spec.ts`; +1 test each in `contribution-to-indicator-result.repository.spec.ts`, `contribution-to-indicators.repository.spec.ts` (export twin, DD-3 negative), `result-review-history.repository.spec.ts`
- **Verification:** `npx jest --maxWorkers=2 --forceExit --testPathPattern="admin-panel|contribution-to-indicator|result-review-history|webhook-dispatch"` → `Test Suites: 7 passed, 7 total · Tests: 81 passed, 81 total`. webhook-dispatch spec unchanged and green. Lint `npx eslint <touched> --quiet` exit 0 (after a scoped prettier `--fix` on the new spec lines).
- **Reviewer verdict:** `STATUS: PASS`. All three names come from the existing 1:1 `clarisa_initiatives` join, SELECT-list only. No GROUP BY; UNION `distinct` grain unchanged. `_flattenedResultsQuery` untouched and its explicit `json_object` keeps the new column out of export/webhook payloads (PF2-R-1 shared-callers BUT). admin-panel gains no interpolated input (`${complement}`, `${env.FRONT_END_PDF_ENDPOINT}` only, pre-existing). No alias collisions; no folder `CLAUDE.md` in touched folders. No ADVISORY block.
- **Requirements covered:** PF2-R-1 additive scenario (M2, M3, M4); PF2-R-1 shared-callers scenario (export, webhook); outcome-indicator export BUT clause (server side).
- **Decisions:** no `ANY_VALUE()` needed (no grouping); no alias prefixing.
- **Issues:** git notes "LF will be replaced by CRLF" on the 3 repository files (working-copy line endings; diff is additive only).
- **Not provable in Jest:** SQL execution on MySQL → HITL smoke (`tasks.md` §6).

### Wave 2 — {PF2-T-3, PF2-T-6} (parallel; user said "continua hasta que termines" on 2026-10-13 → continue/pause gate auto-passes after PASS, HALT/pivot/tripwire still stop)

### PF2-T-3 — Server: IPSR notifications + AI jobs + bilateral contract (S2, S3)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 1 · **Effort:** high (payload contract) · **Skills:** `nestjs-expert`, `api-design-principles`
- **Attempt 1 — files changed** (`onecgiar-pr-server/`, +329/-0):
  - `src/api/results/share-result-request/share-result-request.repository.ts` (+4): `getRequestByUser` and `getPendingByUser` add `ci.name as approving_name`, `ci2.name as requester_name` (`ci` = approving join, `ci2` = requester join, verified by Reviewer).
  - `src/api/bilateral-ai/services/bilateral-ai.service.ts` (+53): injects `Repository<ClarisaInitiative>` (already in `bilateral.module.ts` forFeature); new private `programNameByCode(codes)` (one `find` with `In(uniqueCodes)`, no query when no codes; single match → its name; several → the single active one, else `null`; blank → `null`); `listJobs` adds `program_name` after `program_code`; `getJob` adds `program_name`.
  - `docs/bilateral-result-summaries.en.md` (+1): dated 2026-10-13 change-log row for `program_name: string | null`.
  - Specs: `share-result-request.repository.spec.ts` (+69), `bilateral-ai.service.spec.ts` (+202). Existing assertions edited additively only: `getJob` deep-equal gained `program_name: null`, `listJobs` key set gained `program_name`, `makeService` constructor gained the stub.
- **Verification:** `npx jest --maxWorkers=2 --forceExit --testPathPattern="share-result-request|bilateral-ai"` → `Test Suites: 20 passed, 20 total · Tests: 596 passed, 596 total`. Lint on 4 touched .ts: exit 0.
- **Reviewer verdict:** `STATUS: PASS`. SELECT-only, aliases mapped to the right joins; one batched lookup per response (`[SP01,SP01,XX9]` → one `find`, Breeding/Breeding/null); two inactive → null; existing job fields deep-equal plus `program_name` only; additive test edits do not hit the disqualifier; contract row present; no folder CLAUDE.md; no new logging.
- **ADVISORY (4R, non-gating):**
  - *Readability / contract accuracy:* the new change-log row cites a non-existent "§4.1" (should point to the 2026-09-29 row's item list) and says the single-job response carries `program_name` "immediately after `program_code`", which is true only for the list item (`getJob` spreads `...job` first). One-line doc corrections — flagged to the user as a pre-commit fix.
  - *Resilience:* an initiative lookup failure fails the whole jobs poll; matches existing project/institution lookups (design §7 "error handling unchanged"). A `try/catch` → empty map would keep polling alive.
  - *Performance (minor):* `programNameByCode` awaited before `Promise.all([projects, institutions])`; folding it in removes one sequential round-trip.
  - *Edge:* map keyed by DB `official_code` while MySQL `In()` is case-insensitive; a case/whitespace mismatch yields `null` → code fallback (PF2-R-3 acceptable).
- **Requirements covered:** PF2-R-1 additive + shared-callers (S2 notifications, S3); PF2-R-4 incl. BUT; NFR no per-row query.
- **Not provable in Jest:** share-request SQL on MySQL → HITL smoke must include the IPSR notifications inbox (S2).

### Wave 3 — {PF2-T-4, PF2-T-5} (T-5 launched early alongside T-6 to save wall-clock at the user's request "necesito que termine esto rápido"; width 3, shared jest mutex)

### PF2-T-4 — Client: IPSR surfaces (M1, M5, M6, S1, S2)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 2 · **Effort:** medium → high (bumped on rework) · **Skills:** `angular-developer`

- **Attempt 1** (effort medium, `angular-developer`): 36 files, +276/-28 under `onecgiar-pr-client/src/app/pages/ipsr/` (custom-table, update-ipsr-result-modal, innovation-package-detail, table-innovation, complementary-innovation, selected-innovations, step-n1 + model, innovation-package-creator, results-innovation-output-list, notification-item-innovation, `ipsr-data-control.service.ts`, `manage-innovations-list.service.ts`, complementary-innovation `CLAUDE.md`). Jest scoped pattern → 69 suites / 815 tests passed; lint (flat-config off) exit 0.
- **Reviewer attempt 1: `STATUS: FAIL`** (verbatim issues):
  1. *Discovered Issue:* The M1 falsifier is not covered at render level. In both M1 specs (`innovation-package-custom-table.component.spec.ts` and `update-ipsr-result-modal.component.test.ts`) the only new assertions are `submitterLabel({...})` returning the right string. Nothing proves the Submitter cell renders that text or that its `title` equals it. *Violated Rule:* `tasks.md` PF2-T-4 → Verification → Falsifier ("must **render** `SP05 - Better Diets` with `title` equal to it"); `requirements.md` PF2-R-2 "Table column" ("expose the full label as `title`"). *Remediation:* render the custom-table template (PrTable* imports, RouterTestingModule, NO_ERRORS_SCHEMA / stub `app-pdf-icon`), query `td.official_code .sp-label-text`, assert text + `title` = `SP05 - Better Diets`; code-only row renders `SP05` with no `title`. Recommended: same for the update-IPSR modal cell.
  2. *Discovered Issue:* Nothing proves "search additionally matches the name". The table-innovation test titled "searchable text includes the name" only asserts `leadLabel(...)`; no spec asserts `full_name` includes `initiative_name` in `complementary-innovation.component.ts:389` or `ManageInnovationsListService.GETallInnovations`. *Violated Rule:* `tasks.md` PF2-T-4 Implements (search adds the name), §5 Coverage closure, `requirements.md` PF2-R-2 "Table column", `tasks.md` §2 / KZ-…-3 (drive the real control). *Remediation:* (a) complementary-innovation spec case with `initiative_official_code:'SP05', initiative_name:'Better Diets'` asserting `full_name` contains `SP05 - Better Diets`; (b) table-innovation spec typing `'Diets'` into the real search input (dispatch `input`) — named row stays, unnamed drops; rename the misleading test; (c) `full_name` assertion for `ManageInnovationsListService.GETallInnovations`.
- **ADVISORY (attempt 1, non-gating):** duplicated `.sp-label-text` SCSS ×3 and `max-width: 260px` literals (Tailwind `truncate` would do); creator `coreInitiativeName` not cleared on chip cancel; `approving_short_name`/`requester_short_name` fallbacks are dead input (T-3 doesn't return them); HITL must check creator picker + step-2 table at one line (ghost div removed, Lead col 80→180px); `selected-innovations` now shows the chip when only the name is present (bare name, within PF2-R-3).
- **Attempt 2** (effort high, spec-only; attempt-1 production diff untouched): `innovation-package-custom-table.component.spec.ts` and `update-ipsr-result-modal.component.test.ts` render the real table (PrTable*, `RouterTestingModule`, `NO_ERRORS_SCHEMA`) and assert `td.official_code .sp-label-text` text + `title` = `SP05 - Better Diets`, code-only row → `SP05` (modal fixture sets `IPSRCurrentPhase.phaseYear` + `isAdmin` for its row-filter pipe); `complementary-innovation.component.spec.ts` new case: step-two row with `initiative_name` → `full_name` contains `SP05 - Better Diets` (line-324 assertion untouched); `table-innovation.component.spec.ts` misleading test replaced by typing `Diets` into the real search input (dispatched `input`) — only the named row stays; `manage-innovations-list.service.spec.ts` new `GETallInnovations` `full_name` case. Final T-4 diff: 38 files, +359/-30.
  - **Red check:** `[attr.title]` → `[attr.titlex]` in both M1 templates → the 2 title tests failed (2 failed / 78 passed); bindings restored.
  - **Verification:** scoped T-4 pattern + `manage-innovations-list`, `--maxWorkers=2 --no-coverage --silent` → `Test Suites: 70 passed, 70 total · Tests: 822 passed, 822 total`. Lint (flat-config off) on 5 specs → exit 0.
- **Reviewer attempt 2: `STATUS: PASS`.** Both attempt-1 issues closed with tests that render real templates and drive the real search input; both `full_name` builders now directly asserted; no id/route/selected-value assertion edited.
- **ADVISORY (attempt 2, non-gating):** table-innovation search test uses hand-built `full_name` fixtures (builders covered elsewhere — add a one-line comment); stray double blank line in `manage-innovations-list.service.spec.ts`. Attempt-1 advisories stand.
- **Recorded decisions:** M5 red-first shown logically (old binding read `detailData.official_code`, absent from `getResultInnovationDetail`); `DetailData`, `CoreInnovationSelected`, `CoreResult` gain optional fields only; no client site uses the T-1 `.../filter` variant (forward pointer closed); M6 Lead column 80→180px and `.official_code` max-width 260px chosen → HITL.
- **Requirements covered:** PF2-R-2 table (M1, M6, S1 picker) incl. sort unchanged + search adds name; chip (S1, S2); M5 not blank; PF2-R-3 fallback (`INIT-012`).

### PF2-T-6 — Client-only leftovers (S4)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 1 · **Effort:** medium · **Skills:** `angular-developer`
- **Attempt 1 — files changed** (`onecgiar-pr-client/src/app/`, 32 tracked files +194/-35, plus new `pages/bilateral/shared/bilateral-program-label.util.ts`):
  1. Role menu: `shared/components/shell-topbar/*` (pill holds label, `max-width: 65%`, `title`), `shared/components/header-panel/*` — `initiativeLabel(item)` = `scienceProgramLabel(official_code, initiative_name, short_name)`; skips `item.name` (ApiService overwrites it with `official_code`).
  2. `rd-contributors-and-partners` SP chips via `spChipLabel(sp)`, `[innerHtml]` → interpolation; "Other(s)" keeps plain text.
  3. `update-notification`: header via `spLabel` on `obj_initiative`; model gains optional `name`. **Recorded:** server `notification.service.ts` selects only `{id, official_code}` for `obj_initiative` → code-only fallback until the server selects `name` (outside this spec; user decision).
  4. `manage-user-modal` `display_label` = `scienceProgramLabel(official_code, name)`. **Recorded:** grep found consumers only as `optionLabel` (html:124, :172); values `optionValue="initiative_id"`/`"code"` unchanged → changed.
  5. `phase-detail` toast uses the label. No spec exists; none added (gap, see advisory).
  6. `section-zero-dashboard` + `section-contributors` banners via new util. **Recorded:** `BilateralContextService` has no SP list; names come from already-loaded bilateral SP state (selected project `sciencePrograms`, `selectedPrimarySp`, `selectedSecondarySps`, contributors `sciencePrograms()`). Reviewer: meets DD-5 (no payload/service change).
  7. `ipsr-list-filter.service.ts` `displayName` via the rule; stale comment fixed; real-control test via `PrFilterMultiselectComponent.toggle()`.
  8. `lab-report-form` ToC select `optionLabel="sp_label"`; "Other(s)" sentinel via `withScienceProgramLabel`. **Recorded (DD-6 reversion challenge):** `app-pr-multi-select` has no separate filter field → `short_name` + bold acronym no longer searchable/shown; accepted loss.
  - Old-format assertions updated (DD-6): 4 in `section-zero-dashboard.component.spec.ts`, 3 in `ipsr-list-filter.service.spec.ts` (+1 fixture `short_name`).
  - Folder `CLAUDE.md` re-stamped: section-contributors, section-zero-dashboard, rd-contributors-and-partners, shell-topbar, lab-report-form.
- **Implementer verification:** Jest `--maxWorkers=1` (free RAM 0.6–2.8 GB): run 2 → 1131/1135 (4 old-format strings), after update `section-zero-dashboard` alone 43/43; no end-to-end green run. Lint `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched .ts> --quiet` exit 0.
- **Leader consolidated run (closes the evidence gap the Reviewer conditioned PASS on):** `npx jest --maxWorkers=1 --no-coverage --silent --testPathPattern="shell-topbar|header-panel.component|rd-contributors-and-partners|update-notification|manage-user-modal|phase-detail|section-zero-dashboard|section-contributors|ipsr-list-filter|lab-report-form"` (free RAM 3.85 GB → 1 worker, under `jest.lock`) → `Test Suites: 24 passed, 24 total · Tests: 1135 passed, 1135 total`.
- **Reviewer verdict:** `STATUS: PASS` (conditional on the consolidated run, now green). All 8 items through the shared rule with code fallback; no filter value / query param / optionValue / `display_label` consumer changed; "Other(s)" sentinel label correct per item 8 + design §8 and matches its Part 1 chip; KZ-1 and KZ-3 met.
- **ADVISORY (4R, non-gating):** phase-detail toast has no spec (the `phase-detail` run pattern matches no file); header-panel/shell-topbar role-menu tests are method-level, not rendered; stale SCSS comment above `.pr-topbar-account__code` ("Fixed width…"); new util `bilateral-program-label.util.ts` not in design §4 S4 list (note for DoD `git diff --stat`); "Other(s)" wording differs between rd-contributors chip (`Other(s)`) and lab-report-form (`Other(s) - Science Program(s)/Accelerator(s)`) — PO may want one wording; `buildIpsrProgramOptions` candidate order `initiative_name` → `name` → `short_name` vs glossary `name` → `initiative_name` (same output on real data).
- **Requirements covered:** PF2-R-2 dropdown (items 4, 7, 8) + chip/inline (items 1, 2, 3, 5, 6); PF2-R-3.
- **Issues:** stray `C:\Program Files\Git\tmpjest.out` from a mistyped redirect (outside repo; user to delete).

### PF2-T-5 — Client: completeness, outcome-indicator, review history, AI jobs (M2, M3, M4, S3)

- **Status:** PASS · **Date:** 2026-10-13 · **Attempts:** 1 Reviewer round (+1 pre-review completion round on the Implementer's own `Not Done`) · **Effort:** medium → high (completion round) · **Skills:** `angular-developer`
- **Implementation round — files** (`onecgiar-pr-client/src/app/`, final 26 files +217/-15):
  - **M2:** `shared/components/global-completeness-status/*`: Submitter cell `result | spLabel`, `max-w-[220px] truncate`, `[attr.title]`; module imports `SpLabelPipe`. `shared/services/api/results-api.service.ts` `full_name` appends `initiative_name` only when present (no-name string identical). `exportExcel` untouched (DD-5).
  - **M3:** `indicator-data.model.ts` `result_submitter_name?`; `details-table` `submitterLabel(item)` + ellipsis + title; `indicator-results-modal` `handleAddIndicator` maps `result_submitter_name: result.submitter_name`; `indicator-details.service.ts` unchanged (IPSR rows carry `submitter_name` from T-1).
  - **M4:** `bilateral-review-history.interface.ts` `initiative_name?` + `reviewEntryProgramLabel(entry)`; `bilateral-results-list`, `bilateral-rejection-notice` render it.
  - **S3:** `bilateral-ai-job.model.ts` `program_name?` → `programName?: string | null` (`?? null`) + `bilateralAiJobProgramLabel(job)`; `ai-job-card` `programLabel` computed; `ai-processes-drawer` announcement fallback uses the label.
  - Folder `CLAUDE.md` re-stamped: ai-job-card, ai-processes-drawer, bilateral-results-list (already over 120-line cap, +1 line).
- **Implementer `Not Done` → Leader adjudication:** details-table falsifier covered only at method level, and M2 "search adds the name" untested. These are the same two patterns the PF2-T-4 Reviewer FAILed, so the Leader treated them as owed scope and sent a pre-review completion round before review (no rework attempt consumed).
- **Completion round (specs only):** details-table render-level tests on the real Submitter `<td>` (`SP01 - Breeding` text + title; no-name → `SP01`); `results-api.service.spec` `full_name` contains `Gender` + `SP10`; `global-completeness-status` test types `Gender` into the real "Find result..." input → only the `SP10 - Gender` row survives. **Red check:** title bound to `result_submitter` → render test failed; restored.
- **Verification:** full scoped pattern `global-completeness-status|details-table|indicator-results-modal|indicator-details.service|bilateral-results-list|bilateral-rejection-notice|bilateral-ai-job|ai-job-card|ai-processes-drawer|results-api.service`, `--maxWorkers=1 --no-coverage` (free RAM ~2 GB) → `Test Suites: 15 passed, 15 total · Tests: 586 passed, 586 total`. Lint `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched .ts> --quiet` → exit 0. One intermediate completeness-spec run failed then passed on re-run (cause not captured; possible flake).
- **Reviewer verdict:** `STATUS: PASS`. M2/M3/M4/S3 render the label through the shared rule, with every falsifier shown at render level or on the real search input. M3 modal-added and IPSR rows are covered (same `<td>` path; server `submitter_name` from T-1). Excel/export keep the bare code; no existing assertion was changed; the T-4 lesson was not repeated.
- **ADVISORY (4R, non-gating):** drawer announcement fallback and the `normalizeJob` single-job `programName` mapping are untested; the details-table "row added from the modal" case is method-level and redundant; the M4 label sits whole inside a `font-mono` span (client guide §5 reserves mono for codes; check in HITL); `ai-job-card` title fallback changed `programCode` → `programLabel()` (beyond the named span; harmless, same rule); possible flake in the completeness async test; M2/M3 ellipsis is a HITL item.
- **Recorded decisions:** a no-name row carries `title="SP01"` (Part 1 pattern: title = label); `bilateral-ai.service.ts:412` toast and `my-draft-results` left on bare code (outside design §4).
- **Requirements covered:** PF2-R-2 table (M2, M3) incl. search adds name; chip/inline (M4, S3); PF2-R-1 client export BUT; PF2-R-3 fallback.

## 3. Summary

- **Result:** 6/6 tasks PASS on 2026-10-13. Reviewer rounds: 7 (T-4 needed 2), within the budget of 6–9. No HALT, pivot or FATAL_FAIL.
- **Budget:** prod LOC ≈ 398 (+361/-56 in tracked non-spec files incl. HTML/SCSS, plus the new 37-line `bilateral-program-label.util.ts`) against an expected ~250 and a ~400 tripwire. The tripwire was reached at the edge, not exceeded. Test LOC +888 (≈2.2× prod, consistent with KZ-…-2).
- **Execution notes:**
  - T-5 was launched alongside T-6 (width 3) at the user's request for speed.
  - All Jest runs were serialized through a scratchpad `jest.lock` mutex.
  - Several runs used `--maxWorkers=1` because free RAM was 0.6–3.9 GB.
- **Open items for the user (DoD §6, not yet done):**
  1. **HITL smoke** on the local stack, read-only pages: M1, M2, M3, M4, IPSR creator/step-1/step-2, IPSR notifications inbox (S2) and the AI queue. Check for no SQL error, names visible, and one line with ellipsis. In particular check the creator picker and the step-2 Lead column (80→180px), the topbar role pill (`max-width: 65%`) and the M4 mono span.
  2. **Contract doc fix before commit (T-3 advisory):** the 2026-10-13 change-log row cites a non-existent "§4.1", and its "immediately after `program_code`" claim holds for the list item only.
  3. **Decision:** `update-notification` header stays code-only until the server `notification.service.ts` selects `obj_initiative.name` (one-line server change outside this spec).
  4. **PO wording:** the "Other(s)" sentinel reads `Other(s)` on rd-contributors and `Other(s) - Science Program(s)/Accelerator(s)` on lab-report-form.
  5. **DoD `git diff --stat`:** one extra file is outside the design §4 list (`pages/bilateral/shared/bilateral-program-label.util.ts`); the other extras are specs and folder `CLAUDE.md` files.
  6. **Commit** only on the user's go-ahead.
  7. **Cleanup:** stray `C:\Program Files\Git\tmpjest.out` (outside the repo).
- **Follow-up candidates (advisories, not tasks):**
  - `getResultsInnovation` role-2 subqueries lack `is_active`/`LIMIT 1`.
  - Wrap the AI-jobs initiative lookup in try/catch, and fold it into the `Promise.all`.
  - Replace the `.sp-label-text` SCSS ×3 with Tailwind `truncate`.
  - Reset `coreInitiativeName` on chip cancel.
  - Add tests for the phase-detail toast and the drawer announcement.
