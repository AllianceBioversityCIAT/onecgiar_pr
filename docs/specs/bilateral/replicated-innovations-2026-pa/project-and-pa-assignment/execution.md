# Execution — project-and-pa-assignment (`PAA`)

## Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` |
| Started | 2026-10-16 |
| Branch | `qa-development-2026-ss` (working tree clean except this spec folder at start) |
| Approval Mode | `gated` (per-task commits only on owner approval) |
| Leader | Claude Code session (T1, opus) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Budget | 4 tasks · ~90 prod LOC · ~180 test LOC · 1 review round per task (2 max on T-1) |

**Wave plan:** wave 1 = T-1 + T-3 in parallel (disjoint files; Jest serialized machine-wide by a process guard in each brief). Wave 2 = T-2 (shares `bilateral-primary-assignment.copy.ts` with T-1). Wave 3 = T-4 (build + HITL).

## Task Execution History

### PAA-T-3 — Hydrate the loaded lead project from an already-loaded catalogue — PASS (attempt 1)

- **Date:** 2026-10-16 · **Attempts:** 1 · **Review:** checklist (diff < 50 lines)
- **Skills:** `angular-developer`, `tdd` (per task list). Effort medium.
- **Files:** `bilateral-creation.service.ts` (+6 prod), `bilateral-creation.service.spec.ts` (+54 test).
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern=bilateral-creation.service --silent --reporters=summary --no-coverage` → red before fix `1 failed, 67 passed, 68 total` (new catalogue-before case), green after `68 passed, 68 total`. Lint: `npx ng lint --quiet --lint-file-patterns <2 files>` → All files pass linting (note: bare `npx eslint` has no flat config in the client; `ng lint --lint-file-patterns` is the per-file route).
- **Reviewer:** PASS — `loadResult` takes the catalogue entry when present (match `Number(id)`, same rule as `getProjects`), else the old object with `[]`; `resultLeadCenterId` still from the detail; both arrival orders now converge.
- **ADVISORY (not gating):** `section-contributors` `availableSecondarySpOptions` (~L464) falls back to `selectedProject().sciencePrograms`; with the catalogue loaded first, the contributing-SP multi-select may now offer options on load. Same state `getProjects` already produced on late arrival, so no new state.
- **Forward pointers:**
  - → **PAA-T-2:** correct `section-contributors/CLAUDE.md` ~L254 (says `sciencePrograms` is `[]` on load), which T-2 already owns as a file.
  - → **PAA-T-4:** HITL also looks at the contributing-SP multi-select on a loaded result where the catalogue arrived first.
- **Requirements covered:** PAA-R-4 (data side), PAA-AC-7; DD-3.
- **Commit:** pending owner approval (`🔧 fix(bilateral) [SPEC:...]: hydrate lead project programs from loaded catalogue`).

### PAA-T-1 — Section 0: project + P/A picker in the no-lead-project state — in progress

**Attempt 1 — FAIL** (2026-10-16, effort medium-high, skills `angular-developer`, `spartan`, `tailwind-design-system`)
- **Files:** `section-zero-dashboard.component.html` (+115/-85, block moved to `#programField` + `#assignmentActions`), `.ts` (+5), `.spec.ts` (+114, 7 cases), `bilateral-primary-assignment.copy.ts` (+3, `noProjectLinkHint`), folder `CLAUDE.md`.
- **Verification:** red (HEAD html + new spec) `4 failed, 46 passed, 50 total`; green `50 passed, 50 total`; `ng lint --lint-file-patterns` clean.
- **Execute-time spec edit:** DD-1 amended from one `ng-template` to two (Contribution sits between Program and actions in the linked branch). Swept design.md §6.2, DD-1 heading, tasks.md T-1 description. Reviewer confirmed: no forked markup, linked-branch DOM order unchanged.
- **Reviewer FAIL (verbatim issue):**
  1. **Discovered Issue:** With an editable result that has no lead project, the Program field is not on screen until a project is picked. The template wraps `programField` in `@if (pendingProject())`, and spec case (1) asserts it is absent. **Violated Rule:** requirements.md §8 `PAA-AC-1` ("Project picker + Program field are visible") and `PAA-R-1` Scenario 1. **Remediation:** (a) render the Program field when the block opens (disabled/placeholder until a project is chosen, actions hidden until then) and change case (1); or (b) Leader records a spec amendment rewording AC-1 / R-1 S1.
- **Reviewer ADVISORY:** (i) no-project + two-Program project that includes the stored P/A → button label shows SP09 while the hint asks to select and Save is disabled (label/hint contradiction); (ii) guard comment understates when it fires; (iii) case 5's "not linked" DOM proof is weak — assert `[data-testid="bp-no-project"]` still rendered.
- **Leader adjudication:** remediation (a). AC-1 is explicit and was approved; no amendment. Advisory (i) folded into the rework because the T-1 description already requires `requiresPrimarySelection` to stay authoritative over what the picker presents as selected; (iii) folded in as test strength for the same case. Effort bumped to high.

**Attempt 2 — PASS** (2026-10-16, effort high)
- **Changes:** no-project block renders a disabled placeholder Program field `[data-testid="bp-program-waiting"]` from first render (existing label, no click handler, never "no alternative"); `#programField` + actions replace it once a project is picked. `assignmentPrimary` guard moved to right after the `pending` return (fires only with no lead project and no primary chosen this session). Spec: case (1) asserts the placeholder; new case (4b) project including the stored SP09 → label "Select Primary Science Program", hint shown, Save disabled; case (5) also asserts `bp-no-project` still rendered. Copy file untouched in this attempt.
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern=section-zero-dashboard --silent --reporters=summary --no-coverage` → `51 passed, 51 total`; `ng lint --lint-file-patterns` clean. No separate red run for (1)/(4b); Reviewer accepted by reasoning on the attempt-1 code (both fail on behaviour assertions).
- **Reviewer:** PASS — AC-1 / R-1 S1 met; DD-1 (two templates) holds, linked-branch DOM order unchanged; guard skips linked results (group A SP09 fallback intact, R-4); 1-Program preselect returns before the guard; placeholder not interactive; advisories (i)-(iii) resolved.
- **ADVISORY (not gating):** "Select Primary Science Program" is now hard-coded three times in the template; could move to `bilateral-primary-assignment.copy.ts` in a later clean-up.
- **Final files:** `section-zero-dashboard.component.html` (≈ +126/-85, mostly moved), `.ts` (+7), `.spec.ts` (+130), `bilateral-primary-assignment.copy.ts` (+3), folder `CLAUDE.md`.
- **Requirements covered:** PAA-R-1, R-2, R-3, R-6, AC-1..AC-6; DD-1 (amended), DD-2, DD-4.
- **Budget:** 2 review rounds = T-1 max (within budget).
- **Commit:** pending owner approval.

### PAA-T-2 — Contributors helper points to Project information — in progress

**Attempt 1 — FAIL** (2026-10-16, effort low, skill `angular-developer`; Leader raised review from `skip-eligible` to `checklist` because the test was not a DOM assert)
- **Files:** `section-contributors.component.html` (1 line → `{{ primaryHelp }}`), `.ts` (+1), `.spec.ts` (+14, source-read + property assert), `bilateral-primary-assignment.copy.ts` (+2 `contributorsPrimaryHelp`), folder `CLAUDE.md` (Verified re-stamp; `sciencePrograms` note corrected per the T-3 forward pointer).
- **Verification:** red `1 failed, 242 passed, 243 total`; green `243 passed, 243 total`; lint clean; old-string grep: only the new negative assertion.
- **Reviewer FAIL (verbatim issue):**
  1. **Discovered Issue:** PAA-T-2 ships a static `.html` source read plus a `component.primaryHelp` property check instead of a Jest DOM text assert, on the premise "the spec's TestBed does not render the real template" — true only of `section-contributors.component.spec.ts` (L109 `overrideTemplate(..., '<div></div>')`). The sibling `section-contributors.readonly.spec.ts` renders the real template (stubs only `<app-section-toc>`) and its default mock already sets `selectedPrimarySp` (L94), so the `.sc-helper` block renders with no extra setup. **Violated Rule:** requirements.md §8 "Copy regression (R-5, R-6) | Jest DOM text assert"; tasks.md PAA-T-2 "Add a Jest DOM case"; `PAA-TEST-2 | unit (client, DOM)`; PAA-AC-8. **Remediation:** add a case to `section-contributors.readonly.spec.ts` asserting `.sc-block--toc .sc-helper` text equals `contributorsPrimaryHelp` and the rendered text lacks "cannot be changed here"; red run by reverting only the html line; update the readonly spec case count in `section-contributors/CLAUDE.md` § Tests.
- **Production change and CLAUDE.md correction:** confirmed correct by the Reviewer (copy matches design §6.3; correction matches `loadResult` L301-320).
- **Leader adjudication:** accept FAIL as stated; rework attempt 2 at effort medium (bumped from low).

**Attempt 2 — PASS** (2026-10-16, effort medium)
- **Changes:** real-template DOM case in `section-contributors.readonly.spec.ts` (+11: `.sc-block--toc .sc-helper` text = `contributorsPrimaryHelp`, rendered text lacks "cannot be changed here"); attempt-1 source-read case removed (`section-contributors.component.spec.ts` no diff); folder `CLAUDE.md` § Tests readonly count 29 (stale) → 45 (actual jest count incl. `it.each`).
- **Verification:** red (html line only reverted) failed on the DOM text (`Received: "Assigned from the project's mapping; it cannot be changed here."`) → `1 failed, 242 passed, 243 total`; green `Test Suites: 2 passed / Tests: 243 passed, 243 total` (`--maxWorkers=2 --testPathPattern=section-contributors`); lint clean.
- **Reviewer:** PASS — AC-8 now proven on the rendered DOM; red fails for the right reason; production copy matches design §6.3; CLAUDE.md `sciencePrograms` note matches `loadResult` L301-320 (T-3 forward pointer closed).
- **Final files:** `section-contributors.component.html` (1 line), `.ts` (+1), `section-contributors.readonly.spec.ts` (+11), `bilateral-primary-assignment.copy.ts` (+2), folder `CLAUDE.md`.
- **Requirements covered:** PAA-R-5, AC-8; DD-5 (old-string grep: no other hit in `src` / `cypress`).
- **Budget note:** 2 review rounds vs 1 budgeted for T-2 (delta +1, cause: test-type deviation). Total code LOC within budget (≈ +145 prod incl. moved markup, ≈ +200 test).
- **Commit:** pending owner approval.

### PAA-T-4 — Build + HITL browser verification on real results — in progress

- **2026-10-16, first build attempt:** `npm run build:dev` stopped by Claude Code (system critically low on memory, 0.5 GB free) — runtime event, not a FAIL. Owner stopped `ng serve` (~2.4 GB) and `nest start:dev`; free RAM 6.2 GB.
- **Combined Jest regression:** `npx jest --maxWorkers=2 --testPathPattern="section-zero-dashboard|section-contributors|bilateral-creation.service" --silent --reporters=summary --no-coverage` → `Test Suites: 4 passed, 4 total · Tests: 362 passed, 362 total` (9.0 s).
- **Build:** `npm run build:dev` → `Application bundle generation complete. [32.564 seconds]`, no errors (templates type-check).
- **Pending:** HITL browser check (27270, 28073, read-only no-project case, Contributors helper, contributing-SP multi-select with catalogue loaded first — T-3 forward pointer) with the local stack up, no Save clicked; owner's save on a designated result (`PAA-OQ-5`).
- **HITL browser check (2026-10-16, local stack on the TEST DB, served bundle has the change; nothing saved):**
  - Real results 27270 / 28073 do not exist in the test DB; owner picked equivalents by SQL: **9516** (id 11984, Innovation use, Editing, P/A SP09, no lead project) and **9848** (id 12316, Capacity sharing, Editing, lead `R-A-2013-126`, SP01, lead Center IRRI).
  - **9516 under `/bilateral/Bioversity (Alliance)/`** — Section 0 shows the project selector, the disabled "Select Primary Science Program" placeholder and the R-6 hint; "No project linked" absent ✅ (R-1, AC-1, R-6). Catalogue `GET /api/bilateral/center/projects?centerId=49` 200, Alliance projects listed ✅. Picking `B-A1540` (2 Programs) → hint "Select the Primary Science Program allocated to this project.", Save disabled; Program list = SP01, SP12 ✅ (R-2 S2, AC-4). SP09 not shown as selected ✅. Dropdowns closed, nothing saved.
  - **9516 Contributors** — helper reads "Change the primary Science Program in Project information, above." ✅ (R-5, AC-8).
  - **9848 under its lead Center `/bilateral/IRRI/`** — linked branch unchanged (Lead center, Project, Program, Contribution, summary); lead project carries its Program chip "Breeding for Tomorrow 100%" (catalogue hydration, T-3) ✅; single-Program project so "This project has no alternative Primary Science Program" is correct there. Contributors' contributing-SP multi-select shows its own full catalogue (SGP-02, SP02…), no empty dropdown ✅ (T-3 forward pointer closed).
  - **Observations (not defects of this spec):**
    - `/bilateral/ALLIANCE/...` (acronym not in the centers catalogue) does not resolve `centerInstitutionId`, so the selector never requests the catalogue and shows "No projects found". Existing behaviour of the shell (known `get/centers` acronym issue); users arrive through the sidebar acronym `Bioversity (Alliance)`.
    - 9848 opened from the Alliance page (lead Center IRRI) shows "no alternative" because the Alliance catalogue lacks the project — the accepted `PAA-P-2` / DD-4 case.
  - **Not covered in the browser:** read-only no-project case (covered by Jest case 2); a two-Program group-A result (none in the test DB; covered by Jest + R-4 data side); the save itself (owner, `PAA-OQ-5`, mailer config unconfirmed).

## Scope change: PAA-T-5 (owner request, 2026-10-16)

- **Trigger:** HITL showed the picker lists the **page** Center catalogue; owner noted Alliance has two Centers (`CIAT (Alliance)`, `Bioversity (Alliance)`) and asked to fix it now ("no puedes darle y organizar eso tu?").
- **Verified before amending:** server `updatePrimaryAssignment` validates against `getProjectsByCenter(getLeadCenter(result).code)`; `getProjectsByCenter` resolves numeric institution id first, then code; client `resultLeadCenterCode` comes from the same lead `results_center` row.
- **Spec edits:** requirements `PAA-R-7` + `PAA-AC-9`, `PAA-P-2` superseded; design `PAA-DD-6` (+ reversion challenge) and §6.2 row; tasks `PAA-T-5`. Budget: +1 task (owner-approved).

### PAA-T-5 — Picker lists the result's lead Center catalogue — PASS (attempt 1)

- **Date:** 2026-10-16 · **Attempts:** 1 · **Review:** checklist · Skills `angular-developer`, `tdd` · effort medium.
- **Files:** `bilateral-project-selector.component.ts` (+14/-3: `key = (isInline() ? resultLeadCenterCode() : null) || ctx.centerInstitutionId()`, `PAA-DD-6` comment, institution-id comment clarified), `.spec.ts` (+26, 3 cases). No folder `CLAUDE.md` exists.
- **Verification:** red `1 failed, 10 passed, 11 total` (inline + code case); green `11 passed, 11 total` (`npx jest --maxWorkers=2 --testPathPattern=bilateral-project-selector --silent --reporters=summary --no-coverage`); `ng lint` clean.
- **Reviewer:** PASS — matches DD-6; wizard never gets the code. Leader's race concern (page-Center response landing after the lead-Center one) judged theoretical: both inline hosts in Section 0 render only after `isLoadingResult()` is false, and `loadResult` sets `resultLeadCenterCode` before `isLoadingResult(false)` in the same callback, so the first effect run already uses the lead code; on reload the selectors are torn down first.
- **ADVISORY (not gating):** `getProjects` has no latest-wins guard; a future host rendering the inline selector before `loadResult` resolves would make the race real (`switchMap` / last-key check would close it).
- **Requirements covered:** PAA-R-7, AC-9; DD-6.
- **Commit:** pending owner approval.

**PAA-T-5 reopened (2026-10-16, Leader regression run after the PASS)** — combined Jest `--testPathPattern="section-zero-dashboard|section-contributors|bilateral-creation.service|bilateral-project-selector"` → `Test Suites: 1 failed, 4 passed · Tests: 42 failed, 331 passed, 373 total`. All 42 in `section-zero-dashboard.component.spec.ts`: `TypeError: this.creationService.resultLeadCenterCode is not a function` (bilateral-project-selector.component.ts:61) — that spec's `creationService` mock renders the inline selector but lacks the new signal. Consumer miss: T-5 verified only its own spec. Rework attempt 2 on T-5 (effort high).

**PAA-T-5 attempt 2 — PASS** (2026-10-16, effort high) — `section-zero-dashboard.component.spec.ts` creationService mock gains `resultLeadCenterCode: signal<string | null>(null)`; production unchanged. Reviewer PASS: the real service always has the signal (L94), so the TypeError was mock-only; third consumer `bilateral-result-creator` (wizard) never reads the code and its mock already has it. Leader final regression: `--testPathPattern="section-zero-dashboard|section-contributors|bilateral-creation.service|bilateral-project-selector|bilateral-result-creator"` → `Test Suites: 6 passed · Tests: 552 passed, 552 total`. Browser: 9848 (lead IRRI) opened from the Alliance page requested `centerId=CENTER-13` and listed IRRI projects; "no alternative" gone.
- **Budget:** T-5 used 2 review rounds; the spec now has 5 tasks (+1 owner-approved).

### PAA-T-4 — PRTest HITL with save (2026-10-19)

- **Environment:** PRTest (testing), `performance-refactor` at `1a22ee0f2` (contains `572363fe2`). Real results 27270 / 28073 do not exist in PRTest; owner directed the check on the test equivalents. Owner authorised the saves in chat.
- **9516 (lead IITA, no 2026 project, P/A SP09, ToC "Yes" + Intermediate Outcome with no node)** at `/bilateral/IITA/result/9516?phase=36`:
  - Before: Section 0 selector + disabled Program + R-6 hint; catalogue = IITA projects (lead Center, DD-6) ✅; Contributors helper text new ✅.
  - Picked `T-PJ-003161` → Program list SP02, SP06 only (SP09 absent) ✅; Save disabled until Program chosen ✅.
  - **Save 1** (SP06): section flips to the linked branch (Lead center IITA, Project, Program, Contribution 100, chips SP02 25% / SP06 75%); breadcrumb gains the project. After reload: Contributors P/A = **SP06 Climate Action 100%**, block "Default ToC Linkage — Inherited from lead project" (4 nodes, 16 indicators, 12 Centers); the SP09 "Yes"/Intermediate Outcome mapping is gone ✅ (R-1, R-2, R-3, AC-7, OQ-5).
  - **Save 2** (switch to SP02 within the same project): after reload P/A = **SP02 Sustainable Farming 100%**, default ToC recomputed (6 nodes, 46 indicators) ✅ (R-4, change P/A with a linked project).
- **9848 (lead IRRI, `R-A-2013-126`, single Program SP01)** at `/bilateral/IRRI/result/9848?phase=36`: linked branch unchanged, Program Breeding for Tomorrow 100% ✅. Not saved.
- **Observation (pre-existing, out of scope):** any result opens under another Center's URL (`/bilateral/Bioversity (Alliance)/result/11984` rendered 9516 with the Bioversity breadcrumb). Picker and save still use the result's lead Center, so data is unaffected. Logged as a follow-up.
- **Remaining for T-4:** none on test data. Real-data check happens in Reporting (prod) after promotion.
