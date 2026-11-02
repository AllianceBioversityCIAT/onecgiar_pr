# Execution Log — Impact Results: Result Detail

## Document Control

| Field | Value |
|---|---|
| Spec | `results/impact-results-reporting/result-detail-impact` (child 3/3, P2-3901) |
| Started | 2026-10-31 |
| Leader | Claude Code session (Opus 5.5, T1) |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3) |
| Approval Mode | gated (spec). Per the user's standing feedback, tasks run to the end without a continue prompt; the run stops only on HALT, Pivot, a budget tripwire, or the HITL task IRD-T-8 |
| Branch | `qa-development-2026-ss` |
| Commits | None by the agent. The user's standing rule: no commit without an explicit go-ahead |

---

## Task Execution History

### IRD-T-1 — Impact utils, word counter, API methods and interfaces

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-31 |
| Skills | `angular-developer`, `tdd` (as listed in the task) |
| Effort | medium |
| Requirements | IRD-R-4 (count), IRD-R-11 (helpers); design §3, §4, §5, IRD-DD-3, DD-7, DD-9 |

**Attempt 1**

- **Files changed** (under `onecgiar-pr-client/src/app/shared/`):
  - New: `utils/impact-result.util.ts` + spec, `utils/impact-word-count.util.ts` + spec, `interfaces/impact-level.interface.ts`.
  - Edited: `services/api/results-api.service.ts` + spec (4 methods, 5 tests), `services/data-control.service.ts` + spec (`isP25ImpactResultSignal`, 1 test).
- **Implementer verification:**
  - Red first: both util specs failed with module-not-found before the implementation existed.
  - `npx jest --maxWorkers=2 --testPathPattern="impact-result.util|impact-word-count.util|results-api.service"` → Test Suites 3 passed / 3; Tests 357 passed / 357.
  - `npx jest --maxWorkers=2 --findRelatedTests src/app/shared/services/data-control.service.ts` → Test Suites 440 passed / 440; Tests 11901 passed / 11901 (about 507 s). An earlier attempt of this run was killed by the Implementer's own `timeout 580` (exit 143); this is a runtime event, not a FAIL.
  - `ESLINT_USE_FLAT_CONFIG=false npx eslint <9 files> --quiet` → no errors.
- **Reviewer verdict:** `STATUS: PASS`.
  - The `SEPARATORS` regex, function body and doc comment match the server `count-words.ts` byte for byte (grep confirmed the literal U+FEFF). All 6 server spec cases are copied 1:1.
  - The predicate, display name and principal-area names meet every falsifier. The column map equals the server `IMPACT_AREA_TAG_COLUMN`, and Principal = 3 equals `IMPACT_TAG_LEVEL_PRINCIPAL`.
  - The URLs match `impact-level.controller.ts` and design §5; the query keys match `impact-level-search-query.dto.ts`.

**ADVISORY (4R, non-gating)**

- Risk / process: record the result-types method finding in `execution.md` (done below).
- Reliability: design §4 says E5 uses `limit=20`, but the client method does not default it. **Forward pointer to IRD-T-4:** the picker must pass `limit: 20` explicitly.
- Readability: the predicate takes a structural type rather than `CurrentResult`, so it works on other row shapes too. No change needed.

**Findings recorded (task asks)**

- **Result-types catalog method.** There is no plain result-types catalog method on the client. The closest is `GET_TypeByResultLevel()` (`levels/...` → `type-by-level/get/all`). It is **not verified** that it returns type 9 (or types 10 and 11). **Forward pointer to IRD-T-4:** confirm this before using it for the picker's type filter.
- **Tag columns** on `CurrentResult`: `nutrition_`, `poverty_`, `gender_`, `climate_change_` and `environmental_biodiversity_tag_level_id`. They are typed `string`, so the util compares with `Number(...) === 3`.
- **Portfolio:** `currentResult.portfolio` holds the acronym string. The predicate uppercases it before comparing.

**Decisions:** type ids are compared through `Number(...)`, so `'9'` and `9` both match. The client keeps its own copy of the tag-column map, because the server constant cannot be imported.

**Final verification:** green as listed above.

### IRD-T-2 — Route entry and section order

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-31 |
| Skills | `angular-developer` |
| Effort | medium |
| Requirements | IRD-R-1 (Scenarios 1.1, 1.2), IRD-R-13; IRD-DD-1, DD-2 |
| Ran in parallel with | IRD-T-5 (disjoint files; Jest runs serialized by a process check) |

**Attempt 1**

- **Files changed** (under `onecgiar-pr-client/src/app/`):
  - `shared/routing/routing-data.ts`: new `impact-level-info` entry right after `evidences`, with `prHide: 9`, `portfolioAcronym: 'P25'`, `underConstruction: false` and a lazy `loadChildren`.
  - New: `pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/` containing `impact-level-info.module.ts`, `impact-level-info-routing.module.ts` (inner `canDeactivate: [UnsavedChangesGuard]`) and `impact-level-info.component.ts` (empty shell).
  - `pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.spec.ts`: 4 cases.
- **Pre-change snapshots** (computed from the routing data before the entry was added):
  - P25 type 1: general-information, contributor-partners, geographic-location, policy-change1-info, evidences.
  - P22 type 9: general-information, theory-of-change, partners, geographic-location, links-to-results, evidences.
- **Implementer verification:**
  - `npx jest --maxWorkers=2 --no-coverage --testPathPattern="result-sections.service"` → Suites 1/1; Tests 54/54.
  - `--findRelatedTests src/app/shared/routing/routing-data.ts` → Suites 20/20; Tests 721/721.
  - eslint exits 0.
  - `ng build` / `ngc` was not run.
- **Reviewer verdict:** `STATUS: PASS`.
  - Placement is by array order only; the service is unchanged, so the DD-1 disqualifier does not apply.
  - The snapshots match the pre-change filter in `result-sections.service.ts:80-87`.
  - The path equals the server's `ValidationMapsEnum.IMPACT_LEVEL_INFO`.
  - The guard is wired on the inner route, as in policy-change-info.
  - Red-run output from before the change was not recorded. The assertions are exact `toEqual` lists.

**ADVISORY (4R, non-gating)**

- **Reliability:** `UnsavedChangesGuard` calls `component.hasUnsavedChanges()`, which is undefined on the empty shell. It throws, and navigation away from the section is cancelled.
  - **Forward pointer to IRD-T-3:** the page must implement `hasUnsavedChanges()` / `saveSection()`.
  - **Push constraint:** do not push IRD-T-2 without IRD-T-3.
- **Risk:** no `ngc` was run. **Forward pointer to IRD-T-3:** run `npx ngc -p tsconfig.app.json --noEmit`, or an equivalent typecheck, once the page exists.

**Decisions:** `underConstruction: false` matches the sibling entries, so the section counts toward progress. `standalone: false` matches the NgModule exemplar.

### IRD-T-5 — Contributors & partners without ToC

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-31 |
| Skills | `angular-developer` |
| Effort | medium |
| Requirements | IRD-R-8 (Scenarios 8.1, 8.2), IRD-R-13; IRD-DD-5 |
| Ran in parallel with | IRD-T-2, then IRD-T-3 |

**Attempt 1**

- **Files changed** (under `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/`):
  - `rd-contributors-and-partners.component.ts`:
    - new `isImpactResult` computed and the PLACEHOLDER `impactContributorsCopy`;
    - the P2-3424 `delete` of `has_innovation_link` / `linked_results` now also fires for impact results.
  - `rd-contributors-and-partners.component.html`:
    - the impact copy (`cp-impact-copy`);
    - `@if (!isImpactResult())` around the ToC block;
    - `&& !isImpactResult()` on the generic linked-results `@if`.
  - New `rd-contributors-and-partners.impact-result.spec.ts` (5 tests).
  - `CLAUDE.md`: new IRD-T-5 section and re-stamped Verified line.
- **Implementer verification:**
  - `npx jest --maxWorkers=2 --no-coverage --testPathPattern="rd-contributors-and-partners"` → Suites 14/14; Tests 363/363.
  - eslint (ts + spec) exits 0.
  - The HTML was not linted, and `ngc` was not run.
  - No red run was executed.
- **Reviewer verdict:** `STATUS: PASS`.
  - The ToC block and the generic linked-results block are removed with `@if`, not CSS (html:44-103, html:631). `performSave` drops the link fields for impact results. Type 1 is unchanged.
  - Red run traced by reading the code. Before the change, html:45 rendered the planned-result question unconditionally, and the old `delete` fired only on `showsQaInnovationLink()`. Both tests are behavioural, so they would have failed.

**Centers finding (task asks to record; design §6.4)**

- If `planned_result === false` (DD-5(a), the value V2 create sets), html:118 takes the `@else` branch and renders the literal `~flat` dropdown (html:149-162).
- If `planned_result` is `null`, the first block renders nothing. Instead, the Other(s) block auto-activates (html:203), labelled "Contributing CGIAR Centers", `[required]`, with the full catalogue. Lead-center auto-add lands in `otherCentersSelected`, which that block shows.
- In both cases `contributingCentersComplete` accepts any center (component.ts:577-589), and the server needs ≥ 1 center, so the section can go green. The `@if` did **not** need extending.
- Not verified against a real GET: whether the stored value is `false` or `null`. Either value works.

**Implementer "Not Done / Assumptions" — resolved**

1. *The W3/bilateral projects block shows "Please select a TOC result above…" for impact results.*
   - **Resolved, no rework.** In 2026+ phases, `isContributorsPartners2026()` routes to `loadBilateralProjectsByProgram`, which sets `hasTocResultMapped(true)` unconditionally (service.ts:291-293, :355-356). The message and overlay therefore do not appear for real 2026 impact results; the implementer saw them only because the spec stubs `hasTocResultMapped: () => false`.
   - The projects field is `[required]="false"` (html:295), and the server function `validation_contributor_partner_P25` does not read projects. Projects therefore never block green.
2. *The copy is placed at the top of the section container, because the template has no title element.* Accepted; placement is confirmed at IRD-T-8.
3. *The spec uses stubs with `NO_ERRORS_SCHEMA`.* Accepted; this follows the `innovation-link` spec precedent.

**Spec gap recorded (IRD-OQ-4, new; no rework)**

- The predicate is based on the portfolio (P25), not the phase year.
- A P25 type-9 result in a **2025** phase takes the pre-2026 projects path (service.ts:296-309). There, projects stay behind the overlay, whose message points at the ToC selector that is now hidden. Green is still not blocked.
- The spec should state that impact results are 2026+ only, or define this case. It is raised to the user at IRD-T-8.

**ADVISORY (4R, non-gating)**

- **Readability:** the folder `CLAUDE.md` says `planned_result` "stays `null`". Per the finding above, it can be `false` (`~flat`) or `null` (Other(s)).
- **Risk:** the spec fixture stubs `hasTocResultMapped: () => false`, which is the pre-2026 projects state. A 2026-path stub would match production better.
- **Readability:** the copy is a hard-coded English literal (sibling precedent). Decide at IRD-T-8 whether it becomes a TermKey or stays a literal.
- **Verification gap:** run `npx ngc -p tsconfig.app.json --noEmit` before IRD-T-8. It is already carried as a forward pointer from IRD-T-2.

### IRD-T-6 — Geography Regional/Country and Evidence copy

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-31 |
| Skills | `angular-developer` |
| Effort | medium |
| Requirements | IRD-R-9 (Scenarios 9.1–9.3), IRD-R-10, IRD-R-13, IRD-A-2; IRD-DD-6 |

**Attempt 1**

- **Files changed** (under `onecgiar-pr-client/src/app/`):
  - `shared/components/geoscope-management/geoscope-management.component.{ts,html,spec.ts}`:
    - `allowedScopeIds = input<number[] | null>(null)` and the memoized `visibleGeoscopeOptions`;
    - TBD is not appended when the input is set.
  - `pages/results/pages/result-detail/pages/rd-geographic-location/rd-geographic-location.component.{ts,html,spec.ts}`:
    - passes `[GeoScopeEnum.REGIONAL, GeoScopeEnum.COUNTRY]` to the main and extra-scope instances;
    - a PLACEHOLDER hint when the stored scope is outside the allowed list.
  - `pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.{ts,spec.ts}`: a PLACEHOLDER MELIA `<li>` behind `isP25ImpactResultSignal`.
- **Scope ids** confirmed in `shared/enum/geo-scope.enum.ts`: 1 Global, 2 Regional, 3 Country, 5 Sub-national, 50 TBD.
- **Other callers**, all unchanged because none passes the input:
  - IPSR `innovation-package-creator.html:90`
  - IPSR `step-n1.html:24`
  - bilateral-review `result-review-drawer.html:351`
- **Implementer verification:**
  - `npx jest --maxWorkers=2 --no-coverage --testPathPattern="geoscope-management|rd-geographic-location|rd-evidences"` → Suites 7/7; Tests 251/251.
  - `--findRelatedTests geoscope-management.component.ts` → Suites 25/25; Tests 1045/1045.
  - eslint exits 0.
  - `ngc` was not run.
- **Reviewer verdict:** `STATUS: PASS`.
  - `allowedScopeIds` defaults to `null`, so the other callers keep their options.
  - When it is set, TBD is left out in both orderings, including a late result load.
  - A stored Global is not written: `pr-radio-button.writeValue` never emits.
  - The hint is required by Scenario 9.2 and §6.5; adding it to the extra-scope instance follows R-9 and A-2.

**Leader interpretation (execute-time):** the Evidence branch uses the P25 predicate instead of the literal `result_type_id === 9` in design §6.6. The reasons are R-10 ("for an impact result") and R-13 (P22 type-9 results keep their copy). The Reviewer confirmed that the requirement wins. **Pending item:** align the wording of design §6.6 at archive.

**ADVISORY (4R, non-gating)**

- **Risk, repo convention (pre-commit):** the folder guides `rd-geographic-location/CLAUDE.md` and `rd-evidences/CLAUDE.md` were not updated or re-stamped (client `CLAUDE.md` §10). They must be updated before the commit.
- **Reliability (raise at T-8):** for an impact result with a stored Global, the shared template still shows the Global-only yes/no questions ("Are there any regions/countries…?"), and the radio's field card reads as `complete` while no option is selected.
- **Risk (raise at T-8):** the client predicate does not exclude `source = 'API'`, while the server geo gate does. Confirm whether a bilateral P25 type-9 result can reach Result Detail.
- **Readability:**
  - `hasExtraGeoScopeAnswered =() =>` lost a space.
  - The geography spec's "not auto-changed" assertion is tautological.
  - The hint and MELIA copy are hard-coded English (PLACEHOLDER).

### IRD-T-3 — Impact level info page (in progress)

| Field | Value |
|---|---|
| Status | Attempt 1 **FAIL**; attempt 2 running |
| Date | 2026-10-31 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |
| Effort | high (attempt 1) → xhigh (attempt 2, one level up per retry) |

**Attempt 1**

- **Files:**
  - New under `impact-level-info/`: `.component.{ts,html,scss,spec.ts}` and `CLAUDE.md`.
  - Edited: `impact-level-info.module.ts`, `custom-fields/pr-textarea/pr-textarea.component.ts` (`wordCounterFn` input) and `pr-textarea.contract.cy.ts` (+2 cases).
- **Implementer verification:**
  - Jest `impact-level-info.component`: 20/20.
  - `--findRelatedTests pr-textarea.component.ts`: Suites 144/144; Tests 5879/5879.
  - CT `pr-textarea.contract.cy.ts`: 19/22. Both new cases pass; 3 fail.
  - eslint exits 0. `ngc --noEmit` exits 0.
  - The IRD-T-2 forward pointers are met (`hasUnsavedChanges()` / `saveSection()`; typecheck run).
- **Green-check refresh:** verified in `general-interceptor.service.ts`. A 2xx PATCH on a `/result/result-detail/` URL calls `getGreenChecks()`, and E4 is not in `notValidateList`. A spec spies on it with the real interceptor.
- **Incident:** the Implementer tried `git stash` to get a CT baseline. It did not apply. The Leader checked: the tree is intact, and the newest stash dates from 2026-09-29. Rework briefs now forbid stash, checkout and restore. Another user session commits in this same checkout (`cf8a2998a`), so the commit must stage explicit paths only.
- **Reviewer verdict: `STATUS: FAIL`** (verbatim issues relayed to attempt 2):
  1. Yes→No with links: `pr-yes-or-not.onClickNo()` writes `false` before emitting. The handler resets the model to `true`, but the `[ngModel]` binding value does not change, so `writeValue` never runs. The toggle shows No while the model, the list and the save body say Yes. Violates IRD-R-5 / Scenario 5.1.
  2. No polite `aria-live` announcement for the word counter (`pr-word-counter` is `role="img"`). Violates IRD-NFR-1.
  3. Remove destroys the focused button, so focus falls to `<body>`. Violates IRD-NFR-1 (focus order).
  - **Q1, CT failures:** the diff **cannot** cause the 3 failing CT cases.
    - Two of them mount without `[maxWords]` (`contract.cy.ts:70-77`, :106-122), and the third uses `maxWords: null` (:135-145). In all three, `wordCount` returns before it reads `wordCounterFn`.
    - The falsifier "default count changes" is met in substance. Literal "CT green" is not met.
    - The "pre-existing" claim is unproven. **Pending:** one CT run on HEAD in a separate worktree, before the push at IRD-T-8.
- **ADVISORY (non-gating):**
  - Hard-coded English copy; confirm at T-8.
  - `onSaveSection` has no re-entry guard (`saving()`).
  - `dirtyValue()` only forwards to `buildBody()`.
  - The study-type definitions are dense in the description.

**Leader decision:** `--findRelatedTests` is dropped from per-task rework briefs, because the machine is slow (git commands over 120 s). It runs once before the push, as IRD-T-8 already requires.

**Attempt 2**

- **Files:** `impact-level-info.component.{ts,html,spec.ts}` and `impact-level-info/CLAUDE.md`.
- **Fixes:**
  - Yes→No: `@ViewChild(PrYesOrNotComponent)` calls `writeValue(true)` on revert and `writeValue(false)` on confirm.
  - Counter: an `sr-only` `role="status"` `aria-live="polite"` announcer, "N of 100 words", counted with `countWords`.
  - Remove: after `detectChanges()`, focus goes to the next Remove button, then the previous one, then "Add results".
- **Implementer verification:**
  - Jest `impact-level-info.component`: 23/23.
  - eslint exits 0.
  - `ngc --noEmit` exits 1 with 2 errors (TS2345, TS2322) at `results-list.component.ts:512`. That file is IRD-T-7 work in progress; no error references impact-level-info.
- **Reviewer verdict: `STATUS: PASS`.**
  - All 3 issues are fixed, with no regression.
  - The new DOM test clicks the real "No" control.
  - The falsifier run was not recorded. By the reviewer's trace, removing `writeValue(true)` would fail `spec:255`.
- **ADVISORY (non-gating):**
  - The live region announces on every keystroke; consider a debounce if it is noisy.
  - Avoid calling `removePreviousResult` while the IRD-T-4 dialog is open. This is a forward pointer to IRD-T-4.

**Final status: PASS (attempt 2 of 3).** Requirements: IRD-R-2..R-5, R-7, NFR-1, 3, 5, 6; DD-2, DD-3.

**Gap carried as a pre-push gate (not task scope):** the literal "CT green" for `pr-textarea.contract.cy.ts` is 19/22.
- The Reviewer showed by code that the diff cannot reach the 3 failing cases, so the task falsifier ("default count changes") is met.
- Before the push in IRD-T-8, run the contract CT on HEAD in a separate worktree. This proves the 3 failures already existed. The Leader marks the task `[x]` on that basis and reports it to the user.
- A clean `ngc --noEmit` is also re-checked after IRD-T-7 lands.

### IRD-T-7 — Impact result labels and type-change warning

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3; one pre-review typecheck fix that consumed no attempt) |
| Date | 2026-10-31 → 2026-11-01 |
| Skills | `angular-developer` |
| Effort | medium |
| Requirements | IRD-R-11 (Scenario 11.1), IRD-R-12, IRD-R-13, IRD-A-1, IRD-A-4; IRD-DD-7, DD-8, DD-9 |

**Attempt 1**

- **Files changed** (under `onecgiar-pr-client/src/app/pages/`):
  - Sidebar: `results/.../result-sections-sidebar/result-sections.service.{ts,spec.ts}` and `CLAUDE.md` (re-stamped).
  - Header: `results/.../result-header/result-header.component.{ts,spec.ts}`.
  - Results Center: `results/pages/results-outlet/pages/results-list/results-list.component.{ts,html,spec.ts}`.
  - SP Results: `result-framework-reporting/pages/programme-results/services/programme-results.service.{ts,spec.ts}`, `programme-results-filter.service.{ts,spec.ts}`, and `CLAUDE.md` (Category gotcha, re-stamped).
  - Type-change modal: `results/.../change-result-type-modal/change-result-type-modal.component.{ts,html,spec.ts}`.
- **Gating:** every site uses the P25 predicate, as the Leader instructed. The reasons are R-11 ("impact results") and R-13 / Scenario 1.2.
  - Detail pages (sidebar, header, type-change modal): `isP25ImpactResultSignal`.
  - List rows: `isP25ImpactResult` on `result_type_id` + `acronym`, since rows carry the portfolio acronym (`result.repository.ts:607/763`).
  - P22–P24 type-9 rows keep their DB name and stay in `Other`.
- **Header data source:** `dataControlSE.currentResult` from `GET_resultById`. The server query `getResultById` selects all five `*_tag_level_id` columns (`result.repository.ts` ~:1585-1589), so no general-info fallback was needed. The level slot reads `Impact · Impact Area <names>`, or `Impact` when there is no Principal area. The type label stays in the sidebar (per the result-detail guide).
- **Overview "Other" finding (DD-8, recorded per DoD):**
  - `dashboard-lab.component.ts` builds its category cards from hard-coded `OUTPUT_NAMES` / `OUTCOME_NAMES` lists. These contain `'Other output'` and `'Other outcome'` and no type 9, matched on the server summary's `resultTypeName`.
  - Type 9 is therefore in **no** Overview count, and the Overview deep links are exact-match. Removing type 9 from SP Results `Other` creates no Overview mismatch.
  - The Overview was not changed. This finding comes from reading code only.
- **Pre-review typecheck:**
  - `ngc --noEmit` exited 1, TS2345 / TS2322 at `results-list.component.ts:512`, because `CurrentResult.result_type` is `string | number`.
  - Fixed with `String(result?.result_type ?? '')`. `ngc` now exits 0 with zero errors project-wide.
- **Implementer verification:**
  - `npx jest --maxWorkers=2 --testPathPattern="result-sections|result-header|results-list|programme-results|change-result-type-modal"` → Suites 21/21; Tests 894/894.
  - `--findRelatedTests` on 6 non-spec files → Suites 49/49; Tests 2021/2021.
  - After the fix: Jest `results-list|programme-results` → Suites 17/17; Tests 710/710.
  - eslint clean.
- **Reviewer verdict:** `STATUS: PASS`.
  - The sidebar template uppercases the badge (`result-sections-sidebar.component.html:42`).
  - Scenario 11.1 re-scoring works: the general-info save calls `GET_resultById(true)`.
  - The Results Center filter, its Excel export and `results-to-update-modal` still read the raw `result_type`.
  - All spec edits are additive IRD-T-7 blocks.

**ADVISORY (4R, non-gating):**

- **Risk:** the My results board (`my-work-board.service.ts:251`, `my-work-count.service.ts:92`) reuses `toProgrammeResultRow` and the category predicates, so it also shows "Impact result" in its own bucket. R-11 does not list this site. **Raise at IRD-T-8** and include the board in the PRTest walk-through. The board's folder guide does not mention it yet (pending).
- **Readability:** the Results Center Excel export still writes "Impact Contribution", while the SP Results CSV writes "Impact result". DD-7 allows this (display-only). Decide at T-8 whether that is deliberate.
- **Readability:** Scenario 11.1 says "Climate adaptation & mitigation", while the `IMPACT_AREAS` constant reads "Climate Adaptation and Mitigation". The constant is mandated; copy goes to the T-8 HITL.
- **Reliability:** `isP25ImpactResultSignal?.()` is an optional call at three sites, so a wiring regression would fail silently as "not impact".

### IRD-T-4 — Previous-results picker (in progress)

| Field | Value |
|---|---|
| Status | Attempt 1 **FAIL**; attempt 2 running |
| Date | 2026-11-01 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |
| Effort | high (attempt 1) → xhigh (attempt 2) |
| Budget | Review round 9 of ≤ 10 used by attempt 1. Attempt 2's review is round 10. A third FAIL would breach the design §10 tripwire and stops for the user |

**Attempt 1**

- **Files:**
  - New: `impact-level-info/components/previous-results-picker/previous-results-picker.component.{ts,html,spec.ts}` and `impact-level-info/impact-level-info.picker.cy.ts`.
  - Edited: `impact-level-info.component.{ts,spec.ts}` (wiring), `impact-level-info/CLAUDE.md`, and `shared/services/api/results-api.service.{ts,spec.ts}` (new `GET_resultTypes()` → `${apiBaseUrl}types/all`).
- **Type-filter source** (forward pointer from IRD-T-1, resolved):
  - Not `GET_TypeByResultLevel` (a nested shape, unverified).
  - Uses the existing server route `GET /api/results/types/all` (`results.routes.ts:53`), which returns every active `result_type`. No server change.
  - Not verified: whether types 9/10/11 are `is_active`. Check at T-8.
- **Implementer verification:**
  - Free RAM was about 1 GB, so the Implementer used Jest `--maxWorkers=1`, as the user rule allows.
  - Jest `previous-results-picker|impact-level-info.component|results-api.service.spec`, filtered `-t "impact|Impact|picker|Picker|GET_resultTypes"` → Suites 3/3; 48 passed. The Reviewer confirmed the filter matches the top-level describes, so the two target specs ran in full.
  - CT `impact-level-info/**/*.cy.ts` → 8/8 passing at 1280 and 900 px.
  - eslint exits 0. `ngc` reports no errors.
- **Reviewer verdict: `STATUS: FAIL`** (issues relayed verbatim to attempt 2):
  1. The phase filter shows the phase name only, never the portfolio, although the versioning rows carry `obj_portfolio`. Violates IRD-R-6 ("Phase/portfolio") and IRD-A-3.
  2. The filters have no programmatic labels: the label spans are not referenced, and the `<a tabindex=0>` triggers have no name. Keyboard use of the filters has no behavioral proof (the CT only clicks). Violates IRD-NFR-1.
  - Clean checks:
    - E5 accepts `versionId` alone (`impact-level-search.repository.ts:47`), and each version has a single `portfolio_id`.
    - The `types/all` route and its shape are confirmed; an empty list returns 404, which the client catches.
    - The list fields, the Selected/empty/error/paging states and all 8 falsifiers have real tests.
- **ADVISORY (non-gating):**
  - The inline `style="width:220px"` should be `w-[220px] max-w-full`.
  - Whether types 9/10/11 are `is_active` is unverified (check on PRTest).
  - The copy is hard-coded English (goes to T-8).

**Attempt 2**

- **Files:** `previous-results-picker.component.{ts,html,spec.ts}`, `impact-level-info.picker.cy.ts`, `impact-level-info/CLAUDE.md`.
- **Fixes:**
  - `phaseOptionLabel()` produces labels like `P25 · Reporting 2025 - (Open)`. The filter is now labelled "Phase / portfolio", and only `versionId` is sent.
  - Each filter is wrapped in `role="group"` + `aria-labelledby`; the widths are `w-[220px] max-w-full`.
  - A new keyboard-only CT (`cypress-real-events`) runs at 1280 and 900 px. It covers search, the phase filter, a type checkbox, Add and Done, and asserts the sent params, the page list and focus returning to "Add results".
- **Implementer verification:**
  - Jest, unfiltered, `--maxWorkers=1`, `previous-results-picker|impact-level-info.component` → Suites 2/2; Tests 37/37.
  - CT `impact-level-info/**/*.cy.ts` → 12 passing. The first attempt was killed by the RAM watcher at 177 MB available; the rerun passed.
  - eslint exits 0. `ngc` reports 0 errors.
- **Reviewer verdict: `STATUS: PASS`** (review round 10 of ≤ 10). Both issues are fixed and no other violation was found.

**Final status: PASS (attempt 2 of 3).** Requirements: IRD-R-6, NFR-1, NFR-2, NFR-4; IRD-DD-4.

**Known IRD-NFR-1 limits of the shared `pr-filter-select`** (not editable under this task; the Reviewer accepted them as recorded gaps):

- (a) A phase is chosen by keyboard only by typing until one option is left, then pressing Enter. The labels are unique now that they include the portfolio.
- (b) `pick()` blurs focus to `<body>`; Tab resumes from the old position.
- (c) After a keyboard Add, the row's button becomes a disabled "Selected" button and focus is dropped; Tab still moves on.

These go to a future shared-component task, not this spec.

**ADVISORY (non-gating):**

- For (c), the picker could move focus to the next Add button, then to Done.
- Check on PRTest whether types 9/10/11 are `is_active`.
- The copy is hard-coded English (goes to T-8).

---

## Pre-push checks (before IRD-T-8) — 2026-11-01

Run by the Leader with the user's go-ahead ("Haz los pasos antes del push"). First the user freed RAM: Docker, WSL, orphan `docker-ai`, G Hub and Explorer were stopped, taking available memory from 0.7 GB to about 3.6 GB.

1. **Related Jest** — `npx jest --findRelatedTests <every changed client .ts/.html, excluding .cy.ts> --maxWorkers=1 --silent --no-coverage`
   - Test Suites 445/445 passed.
   - Tests 11,983/11,983 passed.
   - Snapshots 12/12 passed.
   - Time 594 s.
2. **pr-textarea CT baseline on HEAD** — **not run, waived by the user.**
   - A detached worktree at HEAD did not compile: `webpackMissingModule`, because the gitignored `src/environments/environment*.ts` files are missing there.
   - Copying them was blocked as possible credential exposure, and the user chose not to expose sensitive files ("2, no quiero exponer archivos sensibles").
   - The claim that the diff does not cause the 3 failing cases (19/22 with the change) rests on the Reviewer's code proof in IRD-T-3: those cases mount without `maxWords`, and `wordCounterFn` only acts when `maxWords` is set.
   - The worktree was removed after its `node_modules` junction was unlinked.
3. **Folder guides**
   - `rd-geographic-location/CLAUDE.md` and `rd-evidences/CLAUDE.md` were updated and re-stamped for IRD-T-6 by an Implementer, docs only.
   - In the same pass, `rd-geographic-location.component.ts` was cleaned up: the `hasExtraGeoScopeAnswered = () =>` spacing is restored and the original JSDoc again sits directly above its method. The diff against HEAD for that file is now additions only, and eslint `--quiet` exits 0.

Commit and push are still waiting for explicit user approval.

---

## IRD-T-8 — PRTest walk-through by the Leader (Claude in Chrome) — 2026-11-01

The user asked the agent to run the walk-through itself ("tu puedes hacer ese test usando claude in chrome, hazlo"). It ran on PRTest after deploy 41ba0dfdd, in the user's session, on result **10039** (internal id 12507, P25 Reporting 2026, phase 36). The agent did **not** click Submit: per the task, that click belongs to the user.

**What passed:**

| Check | Result |
|---|---|
| Header and sidebar | Badge `IMPACT RESULT`; header `Impact · Impact Area Climate Adaptation and Mitigation`; 5 sections with no ToC |
| Impact level info | Study type offers exactly Learning study and Accountability study, each with its definition. 105 words show "105 of 100 words" in red; Save is blocked by a "Contribution is too long" alert and no request is sent. With 18 words it saves and the section turns green. |
| Previous results | Yes, then Add results; the picker opens with focus on search. Results from P22 and P25 are listed. Searched "drought" and added 7718 and 7719 by keyboard (Tab + Enter); Done returns focus to "Add results". Yes→No shows "Remove linked results?" and Cancel keeps Yes. Data persists after reload. |
| Contributors | No ToC block. PLACEHOLDER copy shown. CIAT (Alliance) picked, lead center auto-filled, external partners Not applicable; saved, green. |
| Geography | Only Regional and Country offered (no Global, subnational or TBD). Country + Kenya saved, green. |
| Evidence | MELIA line present. Public link with the Climate tag saved, green. |
| General information | Description, lead contact and the Adaptation sub-component saved. **5/5 green, Submit enabled.** |
| Labels | Results Center row: `Impact result`; SP01 Results: `Impact result` (3 hits, no "Impact contribution") |
| Type-change modal | The warning "Changing the type deletes this result's Impact level info and its links to previous results." is shown. Closed without changes. |
| P25 non-impact (7718) | Has `innovation-use-info`; Global, subnational and TBD offered; ToC present; no MELIA line; no Impact level info; no impact hint |
| P22 type 9 (5874, phase 30) | Badge `IMPACT CONTRIBUTION`; P22 sections (ToC, partners, links); no Impact level info |

**Findings for the user to triage** (none blocks 5/5 or Submit):

- F-1: The change-type modal shows "Current result type: **Impact contribution**" for a P25 impact result. The new label is not applied there.
- F-2: The Indicator category filter in Results Center, and the type filter in the picker, list "Impact contribution" (the DB name), while rows say "Impact result".
- F-3: After a successful save of Impact level info, the per-field "Unsaved changes" chips stay until reload.
- F-4: The Impact level info bottom bar shows "Section complete" while the Yes/No answer is still empty and while the statement is over 100 words.
- F-5: In the picker, Escape inside the type dropdown closes the whole picker and loses the search. The type checkboxes are unlabeled tab stops (the known `pr-filter-select` gap).
- F-6: Contributors still shows the note "Partner information is inherited/sourced from the HLO/Outcome level in the ToC" for an impact result.
- F-7: The study-type definitions appear twice: both in the field description, then the selected one again below the select.
- F-8: PRTest already has a P25 type-9 result in a 2025 phase (5834), which is the IRD-OQ-4 case.

**Still open for the user:**

- Submit on 10039.
- Confirm the PLACEHOLDER copy (contributors, MELIA, geography hint, definitions placement).
- Decide F-1..F-8.
- Check My results.

PRTest data left behind: 10039 now has a description, lead contact, CIAT, Kenya, a cgiar.org evidence link and links to 7718/7719.

### IRD-T-8 rework — fix F-1, F-2, F-3, F-4, F-6 — 2026-11-01

The user approved fixing these five findings ("Si corrigelos"). F-5, F-7 and F-8 stay open for the user to decide.

**Leader decision on F-2.** The type-9 filter option now reads `Impact result / Impact contribution`, because the Results Center and picker filters list P22 and P25 together. The id and value are unchanged. P22 users also see the combined label. This is a deliberate extension of IRD-R-11/R-13, and should be recorded as a design decision at archive.

**Implementer (attempt 1)**

| Finding | Fix |
|---|---|
| F-1 | `currentResultTypeLabel` in the change-type modal, gated on `isP25ImpactResultSignal` |
| F-2 | New `resultTypeFilterLabel()` in `impact-result.util.ts`, used by `results-list-filter.service.ts` and the picker `typeOptions` |
| F-3 | The `performSave` success tap bumps `saveButtonSE.savedTick`; a failed save does not |
| F-4 | Hidden `appFeedbackValidation` markers for: Yes/No unanswered, statement over 100 words, Yes with no links. `FeedbackValidationDirectiveModule` is imported. |
| F-6 | The external-partners ToC note is gated by `isCP2026() && !isImpactResult()` |

- Both folder `CLAUDE.md` files touched (`impact-level-info`, `rd-contributors-and-partners`) were updated and re-stamped.
- **Verification:** scoped Jest with `--maxWorkers=1` passed 6/6 suites after two spec expectations were fixed; eslint quiet showed 0; `ngc` showed 0 errors.
- **Assumptions** (still open): F-3 does not use `isSavingPipe`, so the bar spinner and Next's `saveAndSettle` still do not see this save as in flight. The F-4 statement marker adds 1 to the bar's denominator.

**Reviewer: `STATUS: PASS`**

- **P22 and non-impact P25 safe:** the filter matches on id, and the change-type chips hide level 1, which contains type 9.
- **F-4 markers:** they do not double-count and do not break the mandatory-field scan.

**ADVISORY:**

- (a) `setFiltersByResultLevelTypes` mutates `name` on the shared `ResultLevelService` catalogue objects. No screen shows it today, but it should copy the options instead.
- (b) Use `this.body?.` consistently in `currentResultTypeLabel`.
- (c) Add a positive F-6 test: a non-impact P25 result still shows the note.
- (d) Next/`saveAndSettle` does not await this section's PATCH. This was a pre-existing limitation; left as is.
- (e) Record the F-2 P22 label as a design decision.

**Leader follow-up:** advisories (a), (b) and (c) were sent to an Implementer at low effort because they are cheap. (d) is left as a known limitation, and (e) is covered by the Leader decision above.

**Follow-up for advisories (a), (b), (c):**

- (a) `setFiltersByResultLevelTypes` now copies only the type-9 option (`{ ...opt, name }`). The shared catalogue keeps "Impact contribution", and a new spec asserts that it is not mutated.
- (b) `currentResultTypeLabel` now uses `this.body?.` in both branches.
- (c) Contributors spec:
  - The old F-6 negative test passed vacuously, because `NO_ERRORS_SCHEMA` means `app-alert-status` text never renders.
  - Both tests now read the bound `description` through an `alertDescriptions()` helper.
  - Positive case added: a non-impact P25 result shows the note.
- **Verification:** the 3 specs are green with `--maxWorkers=1`; eslint quiet shows 0 errors.

### IRD-T-8 — PRTest re-check after ae5940b70 (perf 9c8486377) — 2026-11-01

The user asked the agent to verify ("Prueba tu"). It checked result 10039 on PRTest (phase 36) through Claude in Chrome.

**Test-harness note.** The Chrome tab did not paint: `requestAnimationFrame` never fired and screenshots timed out. Because of that, the bottom-bar scan and pointer clicks did not run. Where needed the agent drove the page through `window.ng.getComponent`, calling the same methods the UI calls, and through DOM `.click()`. The visible state was read back after each step.

| Fix | Check | Result |
|---|---|---|
| F-6 | Contributors on 10039: the "Partner information is inherited…" note is absent, and the impact copy is present | PASS |
| F-4 | Statement set to 108 words. The hidden marker for "CGIAR contribution (up to 100 words)" is not complete. After the result-detail scan, the bar reads "1 field missing" and the list names that field. | PASS |
| F-3 | Statement edited, then `saveSection()` called. Afterwards there are 0 "Unsaved changes" chips and `hasUnsavedChanges()` is false. After reload the edit persisted, with 2 links intact. | PASS |
| F-2 | The Results Center Indicator category filter shows "Impact result / Impact contribution", and no plain "Impact contribution" option remains | PASS |
| F-1 | Change-type modal on 10039: "Current result type Impact result" (the `currentResultTypeLabel` getter returns "Impact result"), and the warning is present. Closed without changes. | PASS |

**Not re-checked:**

- The picker's type-filter label (F-2b). It is covered by Jest and needs pointer interaction in a painting tab.
- Real pointer-driven Save: the bar's Save button did not fire in the non-painting tab. The user should click Save once with the window visible.

**PRTest data change:** the statement on 10039 now ends with ", verified."

### IRD-T-8 — live re-check, Submit and Leader decisions — 2026-11-01

The user delegated the remaining T-8 actions and decisions to the agent ("Tú haz eso solo tú y valida los otros puntos"). The checks ran in a new tab, which painted normally.

**Live checks with real pointer and keyboard input:**

| Check | Result |
|---|---|
| F-4 | 109 words: the bar reads "1 field missing". After restoring the text it reads "Section complete". |
| F-3 | Clicking Save draft clears the "Unsaved changes" chips (1 → 0) |
| F-2b | The picker type filter shows "Impact result / Impact contribution" |
| F-5 | Still reproduces: Escape inside the type dropdown closes the whole picker |
| My results (SP01 my-work) | The 10039 card shows the `IMPACT RESULT` chip and "5 of 5 sections · ready to submit". No relabel needed. |
| F-8 / IRD-OQ-4 | 5834 in Reporting 2025 (phase 34, closed) opens with the Impact level info section and no ToC. The W3/bilateral projects field says "Please select a TOC result above…", so it cannot be completed. |
| **Submit** | 10039 submitted by the agent (empty comment). Status is `SUBMITTED`, the Unsubmit action is available, and the success alert was shown. |

**Leader decisions** (delegated by the user):

- PLACEHOLDER copy kept as final:
  - "Include contributors to the whole intervention and scaling endeavour" mirrors the ticket wording of BR5.
  - "Include the MELIA study or evaluation that documents the impact." mirrors ticket section 4.
  - "Pick Regional or Country for an impact result." mirrors BR6.
- Definitions placement: the field description shows both definitions, as P2-3901 ticket acceptance criterion 13 requires ("each with its definition available to the user"); the repeated selected-definition line is removed (F-7).
- F-5 is to be fixed inside the picker: Escape with a filter dropdown open closes only that dropdown.
- F-8 / IRD-OQ-4 has no code change. Impact results are a 2026 capability per the ticket ("we just need to have it as an option" this year), and the 2025 phase is closed. The 5834 dead end on the pre-2026 projects field is recorded as a known limitation, and is to be raised only if a 2025 phase is reopened.

An Implementer was spawned for F-5 and F-7.

### IRD-T-8 rework 2 — F-5 and F-7 — 2026-11-01

**Implementer:**

- F-5: the picker root gets `(keydown.escape)="onEscape($event)"`. When Escape comes from inside a filter's `.custom_select`, it blurs the focused element and calls `stopPropagation()`; otherwise Escape propagates and the dialog closes as before. The shared `pr-filter-select` is untouched.
- F-7: the `impact-study-definition` line and the `selectedDefinition` getter are removed. The field description keeps both definitions.
- Specs: Jest updated, a new picker Jest case, and a new CT real-Escape case.
- The folder `CLAUDE.md` is re-stamped.

**Verification:**

- Jest `impact-level-info` with `--maxWorkers=1`: 2 suites, 45 tests passed.
- `ngc`: 0 errors. `ng lint` on the folder: passes.
- Leader ran the CT `impact-level-info.picker.cy.ts`: **14 passing, 0 failing**.

**Reviewer: `STATUS: PASS`**

- Cancel/Escape semantics, `done()`/`cancel()` and focus restore are unchanged.
- The Jest case catches the mutation where `stopPropagation` is removed.

**ADVISORY (non-gating):**

- (a) `blur()` sends focus to `<body>` inside the dialog. Move focus to the filter label instead (follow-up).
- (b) "AC-13" is the Jira ticket's criterion 13, not a spec AC. The citation is corrected above.
- (c) Edge case: an Escape whose target is inside `.custom_select` while focus is not gets swallowed. Harmless.
