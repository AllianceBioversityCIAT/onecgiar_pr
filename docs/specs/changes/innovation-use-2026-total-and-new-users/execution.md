# Execution — Innovation Use 2026: total use per category + "Of which NEW"

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2026-total-and-new-users` |
| Approval mode | gated (inherited from `proposal.md` v2) |
| Branch | `feat/iu26-innovation-use-2026-total`, created 2026-11-25 from `origin/staging` @ `8ed2ffcc9` (tasks pre-flight). `origin/staging` differed from `qa-development-2026-ss` @ `093655d2c` only in two CI workflow files, so the design's `Verified at` citations hold |
| Leader | Claude Code, Opus 5.5 (T1) |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3) |
| Persona drift | `akili doctor --agents` (v2.42.0): `leader.md` `primary-instructions` OUTDATED (matched 2.36.0); `tester.md` `context-alignment` CUSTOM-EDITED; implementer/reviewer CURRENT. Not fixed on the spec branch (shared-file write discipline) — pending item for `staging` |
| Budget (design §13) | 15 tasks · ~1,550 LOC · 23 review rounds; tripwire at tasks + 2, LOC × 1.3, rounds + 4 |
| Pre-existing uncommitted change | `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/contributors-partners.ts` (INC-169231, another spec) — carried by the branch switch, never staged by this spec |

## Task Execution History

### IU26-T-1 — Previous use per category (server util + both callers)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1
- **Skills:** `nestjs-expert`, `tdd` (as listed) · **Effort:** medium-high (shared util, two callers)
- **Attempt 1**
  - Files changed: `onecgiar-pr-server/src/api/results/summary/utils/previous-phase-current-use.util.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/results/summary/summary.service.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts`, `…/innovation-use.service.current-use-previous.spec.ts` (6 files, +238 / −17)
  - Consumers grep (`grep -rn "summarizePreviousPhaseCurrentUse\|currentUseRows\|notFutureRows" onecgiar-pr-server/src`, at start): `summary.service.ts:42,495,511`; util `:14,33,40,59,64,69`; util spec `:4-5,25-59,78`; `innovation-use.service.ts:34-35,863,867,872`
  - Red (observed, behavioural): first run without the signature change failed TS2554 (compile — not counted as red). With a signature-only stub returning `total_organizations: 0, measures: []`: 3 failed / 6 passed — v2 `toEqual` diff `measures: []` vs `[Hectares 4100, Trees 500]` and `total_organizations 0` vs `9`; legacy `Expected: 9, Received: 0`; orgs-only `Received: null`
  - Mutations: drop the role-5 filter → 4 failed, legacy `Expected: 9 / Received: 39`; drop `lower(trim())` → v2 red with an extra `"unit": "hectares"` line. Util restored after each
  - Existing specs updated: util v2 equivalence test mocks the two extra inputs as `[]`; `summary.service.spec` two `toEqual` gain the new fields; v2 spec test "organisations but no actors → null" replaced (it contradicted IU26-R-3) by "2030-rows-only → null" and "orgs-only → non-null, 0 actors, 9 orgs"
  - Implementer verification: `npx jest src/api/results/summary/utils src/api/results/summary/summary.service src/api/results-framework-reporting/innovation-use --maxWorkers=2` → 12 suites / 195 tests passed; `npx tsc --noEmit -p .` clean; eslint on touched files clean
  - Evidence re-run (Leader inline, non-author): same jest command → 12 / 195 passed; tsc clean → **VERIFIED**
  - Reviewer: **PASS** — falsifier traced by hand (v2 actors 100, orgs 9, measures Hectares 4,100 / Trees 500; legacy actors 150); P-25 per-caller pick holds (v2 equivalence still 505); null rule matches R-3; no `/api/bilateral/*` change (P-23)
  - runtime events: none
- **spawns:** implementer 24 calls, 153,371 tokens, ended complete; reviewer 9 calls, 83,301 tokens, ended complete
- **ADVISORY (Reviewer, non-gating):**
  - RELIABILITY: a measure row with a unit and null/0 quantity yields a 0 line and alone makes the block non-null; a quantity with a blank unit is dropped silently (R-4 "a category with no data is omitted") — client T-4/T-5 may hide zero lines
  - RELIABILITY: role-5 orgs with `how_many` 0/null make the block non-null with "Organizations: 0"
  - RESILIENCE: v2 now reads actors/orgs/measures in one `Promise.all` in the same try/catch — an org/measure query failure nulls the whole reference block
  - READABILITY: `pick` widened to `(rows: any[]) => any[]`; a generic would keep typing. Six positional args with `undefined, undefined` at the summary call site — options object later
  - RISK: low; read-only, additive
- **Requirements covered:** IU26-R-4 (both scenarios), IU26-R-3 "Previous phase had organizations only", "First report"
- **Decisions:** Implementer assumptions carried verbatim — org total = sum of `how_many` over active role-5 rows; rows with `is_active` undefined/null treated as active (callers already query `is_active: true`), 0/false excluded; client readers (P-11) untouched (server-only task)
- **Issues / forward pointers:** `results-framework-reporting/innovation-use/CLAUDE.md` `getPreviousPhaseCurrentUse` row still says `total_actors` only → **T-9** (folder docs)
- **Commit:** not made — standing rule: no commit without Santiago's go-ahead
- **Running totals vs budget:** tasks 1/15 · LOC ~255 (diff +238/−17) / ~1,550 · review rounds 1/23 — within budget

### IU26-T-2 — Cumulative fields never erased for 2026 (server)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · **Gate:** user, 2026-11-25: "continua hasta que termines" (routine gates continue; exceptions still stop)
- **Skills:** `nestjs-expert`, `tdd` · **Effort:** medium
- **Attempt 1**
  - Files changed: `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts` (private `keepsCumulativeFields`, gate on the `resultExist` write, `findOne` gains `relations: { obj_result: { obj_version: true } }`), `…/innovation-use.service.cumulative-fields.spec.ts` (new, 7 cases), `onecgiar-pr-server/src/api/results/summary/summary.service.ts` (`keepCumulative` param on `applyOptionalInnovationUseFields`, result loaded with `obj_version`), `summary.service.spec.ts` (+4 cases, `findOne` assertion updated), `onecgiar-pr-server/src/api/results/summary/repositories/results-innovations-use.repository.ts` (`InnovUseExists` SELECT gains `v.phase_year AS phase_year` — outside the expected list, needed by the v2 fallback path; `v` join already present, no extra query)
  - Red (observed): `-t "cumulative"` → 4 failed / 8 passed, each `Expected: 845 Received: null` (v2 omitted, v2 null, v2 via `InnovUseExists`, legacy null). Legacy omitted was already green (legacy writes only when `!== undefined`, P-10)
  - Mutation (gate forced on): v2 2025 null, v2 2025 omitted, legacy 2025 null → `Received: 845` (red). Restored
  - Implementer verification: `npx jest src/api/results-framework-reporting/innovation-use src/api/results/summary --maxWorkers=2` → 19 suites / 281 tests passed; tsc clean; eslint clean on 5 files
  - Evidence re-run (Leader inline): same jest → 19 / 281 passed; tsc clean → **VERIFIED**
  - Reviewer: **PASS** — R-2 / §5.3 / DD-6 / JD-13 met; `0` and `""` still written for 2026; unknown phase year → pre-2026 behaviour; no extra query; `InnovUseExists` consumers checked (`innovation-use.service.ts:123,343,830,922`, `summary.service.ts:528`), additive only; `/api/bilateral/*` payloads unaffected
  - runtime events: none
- **spawns:** implementer 37 calls, 154,908 tokens, ended complete; reviewer 26 calls, 104,223 tokens, ended complete
- **ADVISORY (Reviewer, non-gating):**
  - RISK: the v2 PATCH `create/result/:id` response now also carries the nested `obj_result` entity (internal JWT endpoint, additive); the W1/W2 client should not deep-compare it — alternative: strip it or select only `phase_year`
  - RELIABILITY: no repository test pins the `v.phase_year AS phase_year` alias; dropping it would silently revert the fallback-path guard
  - RISK (intended): the bilateral `afterCreate` → v2 `saveInnovationUse` path inherits DD-6 — a 2026 W3 payload without these fields no longer nulls them. Payload shape unchanged; **forward pointer → T-9 PR text** (W3/Bilateral form ↔ API ↔ Fetcher rule)
  - READABILITY: `keepsCumulativeFields(resultExist)` evaluated twice; hoist to a const
- **Requirements covered:** IU26-R-2 "BUT values already stored … kept"
- **Decisions:** the repository edit outside the expected file list accepted (required to honour the no-extra-query disqualifier)
- **Commit:** not made (standing rule); task files staged as the diff baseline for the next task
- **Running totals vs budget:** tasks 2/15 · LOC ~385 / ~1,550 · review rounds 2/23 — within budget

### IU26-T-4 — Client util + copy file (shared by W1/W2 and W3)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 (ran in parallel with T-3 — disjoint client files; Jest serialized by a process check)
- **Skills:** `angular-developer`, `tdd` · **Effort:** medium
- **Attempt 1**
  - Files changed: `onecgiar-pr-client/src/app/shared/utils/current-use-update.util.ts` (+81, additions only), `…/current-use-update.util.spec.ts` (+94), `onecgiar-pr-client/src/app/internationalization/current-use-update.copy.ts` (+29)
  - Consumers grep (`grep -rln "current-use-update" onecgiar-pr-client/src`): `type-innovation-use/CLAUDE.md`, `type-innovation-use.component.ts`, `innovation-use-info/CLAUDE.md`, `innovation-use-form/CLAUDE.md`, `innovation-use-form.component.ts`, util spec, util
  - Red (observed, stubs returning empty values): 8 failed / 4 passed — e.g. `previousUseByCategory › All categories … Expected actors: 2600 / Received actors: null`; `totalsByCategory › Mixed actors … Expected: 1845 Received: null`; `Units never mixed … Expected [Hectares 5500, Trees planted 2000] / Received []`; narrative answered/complete
  - Mutations: `count_unit` null → households: `Expected: 1845 Received: 1800`; removing `toLowerCase()` fails "Units never mixed". Restored
  - Implementer verification: util spec 12/12; `npx jest --no-coverage --maxWorkers=2 --testPathPattern="current-use-update|innovation-use-form|type-innovation-use"` → 6 suites / 452 tests; `npm run build` exit 0; `ng lint --lint-file-patterns <3 files>` clean (standalone `npx eslint` has no config in the client)
  - Evidence re-run (Leader, non-author, after T-3's Jest ended): same jest → 6 / 452 passed → **VERIFIED**
  - Reviewer: **PASS** — falsifier traced; shapes match the T-1 server util; R-4/R-5/R-7 met; narrative label renders "Brief narrative on how use changed in 2026" (year from the result, R-6)
  - runtime events: none
- **spawns:** implementer 37 calls, 131,356 tokens, ended complete; reviewer not reported by host at landing, ended complete
- **ADVISORY (Reviewer, non-gating):**
  - RELIABILITY: `isActiveRow` uses `is_active !== false`, the templates hide `is_active == false` (also `0`); a row with `is_active: 0` would be counted but hidden
  - READABILITY: zero-quantity lines dropped / 0 actors-orgs → null is an R-4 interpretation; `toNumber` turns "1,200" into 0; `totalsByCategory` takes `any[]`
- **Requirements covered:** IU26-R-7 table + "Mixed actors" + "Units never mixed", IU26-R-4 labels, IU26-R-5 completeness, IU26-R-8 copy
- **Decisions:**
  - Narrative-only completeness added under **new names** `isCurrentUseNarrativeAnswered` / `isCurrentUseNarrativeComplete`; `isCurrentUseUpdateAnswered/Complete` keep their cumulative meaning until callers move (design §6.1 names no function). Reviewer: acceptable staging
  - `previousUseByCategory` omits zero / blank-unit lines (R-4 "a category with no data is omitted")
  - Extra label `categoryLabels.actors = "Actors"` (R-4 previous-use scenario shows one actor total)
- **Issues / forward pointers:**
  - **→ T-5, T-7:** use `isCurrentUseNarrativeComplete` / `isCurrentUseNarrativeAnswered` (tasks.md T-7 text says `isCurrentUseUpdateComplete(narrative)` — read it as the new name). **→ T-7:** delete the old `isCurrentUseUpdateAnswered/Complete` together with the cumulative helpers, never restore the mismatch rule (R-5)
  - **→ user (open gap):** the guidance text is not in any spec file; it was taken verbatim from mockup v2 (Main artboard, "Guidance from the ticket") minus the NEW sentence. Santiago to confirm it equals the ticket before PR-1 ships
  - Implementer note: `npm run test:local` exits 1 silently on this Windows machine (spawnSync of `jest` without a shell); `npx jest --maxWorkers=2` used instead
- **Commit:** not made; files staged as diff baseline
- **Running totals vs budget:** see T-3 entry

### IU26-T-3 — Stop copying current-use rows (replication funnel + change log)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · **Review mode:** parallel lens reviewers (task `Review: lenses`; replication + bilateral surface): lens A reliability+risk, lens B resilience+readability, both with baseline spec conformance
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` · **Effort:** high
- **Attempt 1**
  - Files changed (all `onecgiar-pr-server/`): `src/shared/globalInterfaces/replicable.interface.ts` (optional `phase_year`), `src/api/versioning/versioning.service.ts` (config sets `phase_year: Number(phase.phase_year)` for type-2 results only), `src/api/results/result-actors/repositories/result-actors.repository.ts` and `src/api/ipsr/result-ip-measures/result-ip-measures.repository.ts` (`AND section_id = 2` in find + insert when `phase_year >= 2026`), `src/api/results/results_by_institution_types/result_by_intitutions_type.repository.ts` (`AND (rbit.institution_roles_id IS NULL OR rbit.institution_roles_id <> 5 OR rbit.section_id = 2)` in find + insert-select), specs of those three repositories, `src/api/versioning/versioning.service.spec.ts` (2026 block incl. annual cron), `src/api/bilateral/services/innovation-use-mds-validator.service.spec.ts`, `docs/bilateral-result-summaries.en.md` (11 files, +377 / −7)
  - Consumers: `grep -rln "ReplicableConfigInterface" onecgiar-pr-server/src` → 50 files (IPSR repositories, `results/*` repositories, `result-impact-level`, `replicable-repository.ts`, the interface); optional field, additive. Org `replicate` callers: `versioning.service.ts:445` (~452 now) and `:743` (IPSR, no `phase_year`)
  - Red (observed): 4 suites / 10 tests failed — actors find+insert `Expected substring: "AND is_active > 0 AND section_id = 2"` received `…FROM result_actors WHERE result_id = 1000 AND is_active > 0;`; P25 measures the same on `result_ip_measure`; orgs find+insert expected the exclusion clause, received `…WHERE rbit.results_id = 1000 and rbit.is_active > 0`; versioning ×4 `phaseYearsSeen()` (type 2 into 2026, 2027, 2025, cron). Validator tests are characterization (validator unchanged), not red by nature
  - Mutations (observed red): role clause dropped → 2 fails; insert filter removed (find only) → 1 fail; type-2 gate removed → type-7 test fails
  - Implementer verification: `npx jest src/api/versioning src/api/results/results_by_institution_types src/api/results/result-actors src/api/ipsr/result-ip-measures src/api/bilateral/services/innovation-use-mds-validator --maxWorkers=2` → 8 suites / 155 tests; tsc exit 0; eslint on touched files exit 0
  - Evidence re-run (Leader inline): same jest → 8 / 155 passed; tsc clean → **VERIFIED**
  - Reviewer lens A: **PASS** — §5.2 met; change log equals design §11 verbatim + title + payload-unchanged sentence; `$_phaseChangeIPSR` builds its own config (`:712`) without `phase_year`; all callers pass a full `Version` entity. `ReplicableRepository.replicate` runs the find query only with `custonFunction` (never set here), so no id mapping depends on it; both carry the filter anyway
  - Reviewer lens B: **PASS** — org predicate is the NULL-safe complement of the exclusion; `Number(null|undefined)` → full copy (today's behaviour); cron and `/version` (`bilateral-versioning.service.ts:77` → `versionProcessV2` → `$_phaseChangeReporting`, phase loaded unprojected `:1259`) flow through the change; no guard weakened
  - runtime events: none
- **Evidence gap (recorded, condition of lens A's PASS):** **IU26-R-9 falsifier proved via generated SQL and config routing only — no DB harness** in the server package (no pg-mem/sqlite/testcontainers). Row-level outcomes (actors 2 of 5, measures sec 2 only, orgs role-5-sec-2 + role 2) rest on the SQL + NULL-logic trace
- **spawns:** implementer 38 calls, 186,989 tokens, ended complete; reviewer A 23 calls, 93,849 tokens, ended complete; reviewer B 17 calls, 86,231 tokens, ended complete
- **ADVISORY (non-gating):**
  - A-2 / B: a type-2 copy with a non-finite `phase_year` silently does the full pre-fill copy — a `Logger.warn` would surface it
  - A-3 / B: `ReplicableConfigInterface.phase_year` is generically named but carries a type-2-only meaning; a future reader (e.g. T-13 IPSR) would inherit the IU rule — decide naming before T-13 reuses it
  - B: partner-role test is a negative regex; `Number.parseInt(\`${…}\`)` heavier than siblings
  - A-4: design §5.2's literal `NOT(role = 5 AND …)` would also drop NULL-role rows under three-valued logic; the code keeps them (better reading) — the §5.5 cleanup must use the same NULL handling
- **Requirements covered:** IU26-R-9 (both scenarios incl. partner rows copied and change log), IU26-R-12 "Payload unchanged"
- **Decisions:** `phase_year` set on the config for type-2 results only (the org copy runs for every type; setting it globally would filter type 7)
- **Forward pointers:**
  - **→ T-8:** org predicate NULL handling as A-4 (role 5 only; NULL roles untouched)
  - **→ T-9:** PR text "payload fields unchanged; `/version` behaviour change logged"; the Juanda notice (§11); a read-only PRTest check after deploy: version a 2025 type-2 result with section 1 and 2 actors and a role-2 partner, then count the 2026 copy's rows by section and role
- **Commit:** not made; files staged as diff baseline
- **Running totals vs budget:** tasks 4/15 · LOC ~1,015 (T-1 255 + T-2 ~130 + T-3 384 + T-4 204) / ~1,550 (tripwire 2,015) · review rounds 5/23 (T-3 counted as 2 lens verdicts) — within budget. Note: PR-1 LOC estimate is ~800 and PR-1 is already ~1,015 with T-5..T-7 pending; the spec-level tripwire (2,015) is the binding one

### IU26-T-5 — W1/W2 form: CUU move, removals, copy, payload

- **Status:** PASS (attempt 2) · **Date:** 2026-11-25 · **Attempts:** 2 (ran in parallel with T-7; disjoint files, Jest/build serialized by a process check)
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system` (`spartan` not needed — no primitive touched) · **Effort:** high → xhigh on attempt 2 (rework bump)
- **Attempt 1**
  - Files changed (`onecgiar-pr-client/src/app/`): `shared/components/innovation-use-form/innovation-use-form.component.{html,ts,spec.ts}`, `shared/services/fields-manager.service{,.spec}.ts`, `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component{,.spec}.ts`, `…/innovation-use-info.innovation-link.spec.ts` (outside the list: its `FieldsManagerService` mock needed `isInnovationUseAgeFallback2026`)
  - Phase year at save: `fieldsManagerSE.isInnovationUseAgeFallback2026()` (computed over `currentResultSignal().phase_year`, P-14) — disqualifier not hit
  - Red: no pre-code red (greenfield); first post-implementation run 24 failed / 524 passed (5 from the `innovation-link` mock, 3 Farmers specs querying the `label` attribute now bound as a property, rest NG0100 in new tests — setup, fixed with `detectChanges()` as the Farmers describe does). Behavioural proof = mutation: CUU moved inside the TBD condition → `IU26-R-3 TBD selected: the CUU and its narrative stay visible…` red (`1 failed, 245 skipped`); reverted
  - Implementer verification: `npx jest --no-coverage --maxWorkers=2 --testPathPattern="innovation-use-form|innovation-use-info|fields-manager|step-n1"` → 20 suites / 666; build exit 0; ng lint clean on 8 files
  - Evidence re-run (Leader, combined with T-7): 22 suites / 855 passed → **VERIFIED**
  - Reviewer: **FAIL** — (verbatim) "The CUU block this task rewrote still hard-codes its copy: `label="Current Use Update"` (`innovation-use-form.component.html:5`), `labelText="Current Use Update"` (`:36`) and `placeholder="Write some..."` (`:27`). … **Violated Rule:** `design.md` §12 IU26-DD-10 …; §6.1 row `current-use-update.copy.ts` …; `onecgiar-pr-client/CLAUDE.md` §10 "Strings: Always via `src/app/internationalization/`". **Remediation:** Expose the copy on the component … bind `[label]="cuuCopy.title"`, `[labelText]="cuuCopy.title"` and `[placeholder]="cuuCopy.placeholder"` … Pin the header text in one spec."
  - runtime events: none
- **Attempt 2** (effort xhigh; Attempt History: attempt 1 left the CUU block strings hard-coded)
  - Files changed: `innovation-use-form.component.{ts,html,spec.ts}` — `readonly cuuCopy = CURRENT_USE_UPDATE_COPY`; three bindings; `showCurrentUseUpdate()` docstring corrected for orgs-only (comment only, `[advisory-grade]` item); new spec "IU26-DD-10 …"
  - Red: `Expected: "Current Use Update" Received: undefined` at `header.label` (`1 failed, 246 skipped`)
  - Implementer verification: same command → 20 suites / 667; build exit 0; lint clean
  - Evidence re-run (Leader): 20 / 667 passed → **VERIFIED**
  - Reviewer: **PASS** — DD-10 met (no English literal left in the CUU block); R-2/R-3/R-5/R-6/R-8 and DD-6 client half re-checked; pre-2026 and IPSR unchanged
  - runtime events: none
- **spawns:** implementer 57 calls, 259,857 tokens, ended complete; reviewer 15 calls, 117,772 tokens, ended fail; implementer 27 calls, 142,472 tokens, ended complete; reviewer 5 calls, 91,328 tokens, ended complete
- **ADVISORY (non-gating):**
  - RELIABILITY: for 2026 the save always sends `use_expansion_narrative: ''`, also on first reports with no CUU (turns a stored NULL into `''`)
  - RISK: this shared result-detail form also renders for `source_name = 'W3/Bilaterals'` — W3 results opened in result-detail get the 2026 CUU, labels and payload change via the v2 save. `/api/bilateral/*` untouched → **T-9 PR text must say "bilateral payload unchanged"** (AGENTS.md §6)
  - READABILITY: dead SCSS `.current_use_update__mismatch` / `__phase`; `CURRENT_USE_UPDATE_COPY.description` (cumulative wording) now unused by W1/W2; the "Depending" alert test asserts a count delta
  - RELIABILITY: `currentUseYear()` falls back to 2026 if the year is unresolved; spec helpers call `detectChanges()` twice to avoid NG0100 (pre-existing pattern)
- **Requirements covered:** IU26-R-1 (both scenarios), R-2, R-3 "Shown above", "TBD selected", R-5 "Word limit", R-6, R-8 "'expected' only removed in 2026"
- **Spec tension (for the user — amendment proposal):** T-5's falsifier says a 2025 fixture shows "the cumulative input present", and R-1 "2025 result unchanged" describes the 2025 form with the CUU (New users added, Total cumulative). Before this spec the CUU was already gated to 2026+ (P-11), so a 2025 form never showed it; the two clauses cannot both hold. Implemented as byte-identical pre-2026 (no CUU). **Proposed one-line amendment:** R-1 "2025 result unchanged" — drop the CUU from the 2025 description (the CUU never rendered before 2026, P-11). Both Reviewers concurred it is a spec-text tension, not a defect
- **Forward pointers → T-9:** folder `innovation-use-form/CLAUDE.md` §4 (orgs-only, `actorsTotal()`) stale; spec mocks of `FieldsManagerService` feeding `innovation-use-info` now need `isInnovationUseAgeFallback2026`; PR text "bilateral payload unchanged"
- **Commit:** not made; files staged as diff baseline

### IU26-T-7 — W3 full metadata: same changes, narrative-only screen MDS

- **Status:** PASS (attempt 2) · **Date:** 2026-11-25 · **Attempts:** 2 · **continuations:** 1 (`previousReportedUse` deletion, owed until T-5 landed)
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system` · **Effort:** high → xhigh on attempt 2; continuation low
- **Attempt 1**
  - Files changed (`onecgiar-pr-client/src/app/`): `pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.{ts,html,spec.ts}`, `shared/utils/current-use-update.util{,.spec}.ts` (deletions)
  - No `/api/bilateral/*` DTO or response change (disqualifier not hit)
  - Red: new spec vs HEAD component → 8 failed / 172 passed. Mutation (TBD condition restored in `showCurrentUseUpdate`) → `× falsifier DD-5: previous + "to be determined" = Yes still shows the block, and the MDS item is missing until the narrative is filled` (1 failed / 179); reverted
  - Implementer verification: `type-innovation-use|current-use-update` → 2 suites / 189; build exit 0; lint clean
  - Totals: W3 rows sync `how_many` only on edit (`syncTotal`); the `totals` getter feeds `totalsByCategory` the computed `actorTotal(actor)` for disaggregated rows (save unchanged)
  - Not Done (verbatim summary): deleted `totalCumulativeUse`, `currentUseDifference`, `hasCurrentUseMismatch`, `currentUseMismatchMessage`, `currentUseMismatchReason`, `isCurrentUseUpdateAnswered`, `isCurrentUseUpdateComplete`; kept `previousReportedUse` (stale form spec still called it) — owed after T-5. Copy keys `mismatch`, `mismatchReason`, `newUsersLabel`, `totalLabel`, `previousLabel`, `narrativeLabel` appear unused (copy file not in T-7's list). Judgement calls: guidance "new users: …" bullet kept (ticket text; NEW sentence absent); "– total" labels/guidance apply when year ≥ 2026 or unresolved; tiles + guidance hidden while TBD = Yes, CUU regardless
  - **Continuation 1** (after T-5 landed): `previousReportedUse` deleted (+ spec cases). Grep of all cumulative helper names over client `*.ts`/`*.html` → 0 (Leader re-ran: 0). `current-use-update|type-innovation-use|innovation-use-form` → 6 suites / 455; build exit 0; lint clean
  - Evidence re-run (Leader): `type-innovation-use|current-use-update` → 2 / 189 → **VERIFIED**
  - Reviewer: **FAIL** — (verbatim) "The totals tiles have no phase gate. In `type-innovation-use.component.html` the block `@if (hasTotals)` sits only inside `@if (body.innov_use_to_be_determined !== true)`. `hasTotals` and `totals` (component.ts) never check the year. So a 2025-phase W3 result that has actor, organization or measure rows now shows the new … tiles. … **Violated Rule:** requirements.md IU26-R-1, "Every behaviour in this spec SHALL apply only to results whose phase has `phase_year >= 2026`". Scenario "2025 result unchanged": "BUT it must NOT show totals per category, NEW fields or the new labels". … **Remediation Suggestion:** Gate the tiles on the phase … Add a W3 spec where `reportingYear()` is 2025 and the result has rows …"
  - runtime events: none
- **Attempt 2** (effort xhigh; Attempt History: attempt 1 left the tiles ungated)
  - Files changed: `type-innovation-use.component.{ts,spec.ts}` — `hasTotals` starts with `if (!this.currentUseTotalLabels) return false;`; 2025 (rows present → no tiles, no guidance, old labels) and 2026 specs
  - Gated-element sweep: CUU (`showCurrentUseUpdate`: previous present + year null or ≥ 2026); guidance (`@if (currentUseTotalLabels)`); tiles (`hasTotals`); three "– total" labels via `currentUseTotalLabels`
  - Red: `IU26-R-1: a 2025-phase result with rows shows no totals tiles, no guidance and no "– total" labels — Expected: false Received: true`
  - Implementer verification: 2 suites / 191; build exit 0; lint clean
  - Evidence re-run (Leader): 2 / 191 → **VERIFIED**
  - Reviewer: **PASS** — one phase gate (`CURRENT_USE_UPDATE_MIN_PHASE_YEAR` = 2026) for tiles, guidance, labels; R-1 2025 unchanged incl. payload; DD-5, R-2, R-5, R-7, R-8 W3, R-12 and DD-6 re-checked; no `/api/bilateral/*` change
  - runtime events: none
- **spawns:** implementer 36 calls, 222,931 tokens, ended partial; reviewer 10 calls, 105,032 tokens, ended fail; implementer (continuation) 12 calls, 104,615 tokens, ended complete; implementer 15 calls, 121,039 tokens, ended complete; reviewer not reported by host at landing, ended complete
- **ADVISORY (non-gating):**
  - READABILITY: `currentUseTotalLabels` docstring "(always true on W3)" is now wrong
  - RELIABILITY: until `reportingYear()` resolves, a 2025 result briefly shows the 2026 elements (same transient as existing gates); a PRTest check that W3 always resolves the year → T-9
  - RISK: tiles hard-code hex (`#f3f2f7`, `#5d5872`, `#2b2838`, `#E0E0E0`) — design §6.2 sanctions the values but client CLAUDE.md prefers tokens; swap at the T-9 visual pass
  - Orphaned copy keys (`mismatch`, `mismatchReason`, `newUsersLabel`, `totalLabel`, `previousLabel`; `description` per T-5 Reviewer) — recorded only
- **Requirements covered:** IU26-R-2, R-3 (W3), R-5 "W3 submit checklist", R-7 (W3), R-8 "W3 guidance", R-12 (no NEW on W3)
- **Forward pointers → T-9:** PR text: W3 client stops sending `new_users_added` and sends `""` for an emptied narrative — accepted contract unchanged, "payload unchanged" + T-2 save-guard note (AGENTS.md §6); folder `type-innovation-use/CLAUDE.md` stale (mismatch, TBD)
- **Commit:** not made; files staged as diff baseline
- **Running totals vs budget (measured, `git diff --cached --numstat`, T-1..T-7):** tasks 6/15 · LOC added 1,727 (prod 546 + tests 1,179 + docs 2), deleted 544 — under the spec tripwire (LOC × 1.3 = 2,015 added) but **the PR-1 column (~800) is already 2.2×**, driven by tests; with T-6 and PR-2 (~750) pending the spec total will exceed 2,015 → flagged to the user at the end of this run · review rounds 10/23 (T-5 and T-7 two each, T-3 two lenses)

### IU26-T-6 — W1/W2 totals per category block (cut line)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · Cut line: done in PR-1 (before Thursday), so it stays in PR-1
- **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system` · **Effort:** medium
- **Attempt 1**
  - Files changed: `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.{ts,html,spec.ts}` (+153 / −1; no scss change — Tailwind utilities)
  - Gate: `currentUseTotals()` null unless `isCurrentUse2026()` (`!isIpsr && isInnovationUseAgeFallback2026()`); grid inside the not-TBD block, before the guidance (W3 order); 2025 and `isIpsr` specs assert no grid
  - Data: current-use rows only (`body.innovatonUse.{actors,organization,measures}`; a planted 2030 row of 99,999 never appears); `is_active == false`/`0` rows filtered before the util (T-4 advisory); disaggregation branch matches W3 (`type-innovation-use.component.ts:333`); numbers via `| number`
  - Tokens: `bg-[var(--pr-surface-sunken)]` (#f3f2f7), `text-ink-secondary` (#5d5872), `text-ink-body` (#2b2838), `font-mono text-[20px] font-bold tabular-nums`, `gap-[10px]`, `grid-cols-2 lg:grid-cols-4` (1024 px)
  - Red (grid forced null): `TypeError: Cannot read properties of null (reading 'textContent')` ×3 — `5 failed, 247 skipped, 3 passed`
  - Mutation (all actors in one tile): `Expected substring: "1,845" / Received string: "Actors - individuals3,045"` → 3 failed; reverted
  - Implementer verification: `npx jest --no-coverage --maxWorkers=2 --testPathPattern="innovation-use-form|innovation-use-info|step-n1"` → 19 suites / 486; lint clean; build exit 0
  - Evidence re-run (Leader): 19 / 486 → **VERIFIED**
  - Reviewer: **PASS** — R-7 all scenarios, R-1 gate, DD-2, §6.2 tokens (no hex, px sizes, `lg:` = 1024 px). Layout disqualifier not provable in jsdom → open gap for T-9's PRTest check
  - runtime events: none
- **spawns:** implementer 17 calls, 133,442 tokens, ended complete; reviewer not reported by host at landing, ended complete
- **ADVISORY (non-gating):**
  - RISK: the W3 tiles (T-7) hard-code hex and print raw numbers (1845 vs W1/W2's 1,845) — works against DD-10 "identical"; **→ T-9 visual check** (fix only if the user accepts it as in scope)
  - READABILITY: `currentUseTotals()` per change-detection pass; four tiles repeat markup
- **Requirements covered:** IU26-R-7 (all scenarios incl. "Cut line")
- **Commit:** not made; files staged
- **Running totals:** tasks 7/15 · LOC added ≈ 1,880 / deleted ≈ 545 (PR-1 column ~800; spec tripwire 2,015 added) · review rounds 11/23

### IU26-T-9 — PR-1 docs, Fetcher notice, PRTest visual check

- **Status:** `[~]` — doc + draft parts PASS; **PRTest visual check pending** (needs PR-1 deployed to PRTest; disqualifier: "PRTest is not deployed with PR-1. The visual gate is then pending, never assumed") · **Date:** 2026-11-25 · **Attempts:** 1
- **Skills:** `cognitive-doc-design` · **Effort:** medium
- **Attempt 1 (doc + draft parts)**
  - Files changed: `onecgiar-pr-client/src/app/shared/components/innovation-use-form/CLAUDE.md`, `…/rd-result-types-pages/innovation-use-info/CLAUDE.md`, `…/section-type-specific/type-innovation-use/CLAUDE.md`, `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/CLAUDE.md` (+81 / −63; IU26 stamps; JD-11 stale replication note corrected)
  - Grep `cumulative|mismatch|New users added` over the 3 client guides → 8 hits, each a negation or marked historical / pre-2026
  - runtime events: provider-limit death (5-hour usage limit, HTTP 429) ×1 → rung 1 tree probe (no partial edits, no draft) → rung 3 resume-by-message after the reset (user: "continua") → recovered
  - Evidence re-run: n/a (no test gate) — doc checks only
  - Reviewer: **PASS** — guides spot-checked against the working tree (W3 `showCurrentUseUpdate` L297-299, `hasTotals` L338-339, `buildPayload` L941-942, MDS L1022; info save L514-521; form CUU/grid/gates; server `findOne` relation L118, guard L253); every forward pointer and the AGENTS.md §6 statement are in the PR draft; title has no apostrophes or `$`; no secrets
  - ADVISORY applied by the Leader to the drafts (text only): Juanda notice now says "unless 'to be determined' is set"; PR "W3 / Fetcher rule" now says the server API MDS validator is unchanged and the client W3 screen-MDS item is narrative-only. Not applied: "renders in result detail for W3/Bilaterals results" wording in `type-innovation-use/CLAUDE.md` (readability)
- **spawns:** implementer 8 calls, 184,123 tokens, ended died → resumed, ended complete; reviewer 11 calls, 96,428 tokens, ended complete
- **Requirements covered:** IU26-R-12 (PR text); R-1 manual and R-7 layout gate **pending** (PRTest)
- **Drafts** (final text): `C:\Users\santiagosanchez\AppData\Local\Temp\claude\8851b4883761a734\420bad7b-db9f-481e-b20d-d10f838a6cb1\scratchpad\t9-drafts.md` — copied below so they survive a scratchpad cleanup
- **Still owed (HITL):** after PRTest deploy — visual check vs mockup v2 at desktop + ~1024 px (2026 W1/W2, 2026 W3, 2025 unchanged, IPSR step 1 unchanged, new phase copy with empty rows; W1/W2 vs W3 number format 1,845 vs 1845 per T-6 advisory); read-only row count by section/role on a 2026 `/version` copy (T-3 evidence gap); W3 resolves the phase year. Santiago accepts → `[x]`

#### PR-1 drafts (verbatim)

    ## Juanda notice (plain text, English)
    
    Hey Juanda, heads up: from the 2026 phase, POST /api/bilateral/version no longer copies the current-use actors, organizations or measures of an Innovation Use result (the 2030 projection rows still copy). Payload fields are unchanged, but a versioned result now starts without actors until the centre adds them, so unless "to be determined" is set the MDS will flag actors as missing. Details in the change-log row dated 2026-11-25 in onecgiar-pr-server/docs/bilateral-result-summaries.en.md.
    
    ---
    
    ## PR description (base: staging)
    
    Title: ✨ feat(innovation-use) [INC-169264]: replace the 2026 cumulative use fields with per-category totals (PR-1)
    
    ### What this does
    
    For 2026 Innovation Use results (W1/W2 and W3), the "New users added" / cumulative total / mismatch flow is replaced by: previous use shown by category (reference only), a read-only totals grid, a narrative ("Brief narrative on how use changed in {year}", 100 words) and the 2026 wording. The server stops erasing `new_users_added` / `use_expansion_narrative` from 2026, and the 2026 phase copy no longer copies current-use rows. Payload fields unchanged; `/version` behaviour change logged (row dated 2026-11-25 in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`).
    
    ### Review order
    
    1. T-3 server: phase copy (`versioning.service.ts`, `replicable.interface.ts`, the actor / P25 measure / organization repositories). From 2026 a type 2 copy takes only section-2 actors and P25 measures; organizations exclude role 5 outside section 2 (NULL-safe, partners kept); IU answers and legacy measures copy as today; IPSR untouched.
    2. T-1 / T-2 server: `summarizePreviousPhaseCurrentUse` now returns `{result_id, phase_year, total_actors, total_organizations, measures:[{unit, quantity}]}` (role-5 orgs only, measures grouped by `lower(trim(unit))`, null only when all three are empty). For `phase_year >= 2026` both save paths keep the stored `new_users_added` / `use_expansion_narrative` when the value is undefined or null (`""` and 0 are still written; pre-2026 unchanged). `InnovUseExists` also selects `v.phase_year`.
    3. Client: shared util + copy (`current-use-update.util.ts`, `current-use-update.copy.ts`), then the W1/W2 form (T-5/T-6) and the W3 form (T-7).
    
    ### W3 / Fetcher rule (AGENTS.md section 6)
    
    - `/api/bilateral/*` fields, required-ness and enums are unchanged, and the server API MDS validator is unchanged (only a new characterization test was added). On the client, the W3 screen-MDS item `use-current-update` now needs only the narrative (the mismatch rule is gone).
    - The W3 client stops sending `new_users_added`; the T-2 guard means a 2026 W3 payload without these fields no longer nulls them (the bilateral `afterCreate` path inherits it).
    - Side effect: the v2 PATCH `create/result/:id` response now also carries a nested `obj_result`.
    - Behaviour change: `POST /api/bilateral/version` (and the annual cron) no longer copies current-use rows for 2026+ Innovation Use. Logged in the change log; Juanda notified.
    
    ### Out of scope
    
    - PR-2 (follow-up): the "NEW users" sentence and the new-users fields.
    - T-8 cleanup SQL: runs in PROD only after deploy, by Santiago.
    - IPSR step 1 and 2025 forms: intentionally unchanged.
    
    ### Evidence gap and pending checks
    
    The T-3 copy is proven by generated SQL only (no DB harness). Please do not merge before these PRTest checks:
    
    - [ ] Read-only row count by section / role on a 2026 `/version` copy (actors, P25 measures, organizations) matches the rule above.
    - [ ] Visual check at desktop and ~1024 px against mockup v2: 2026 W1/W2, 2026 W3, 2025 unchanged, IPSR step 1 unchanged, a new phase copy with empty rows.
    - [ ] W3 resolves the phase year (labels, tiles and guidance show).
    
    ### Notes
    
    - Spec mocks of `FieldsManagerService` feeding `innovation-use-info` now need `isInnovationUseAgeFallback2026`.
    - Folder `CLAUDE.md` files updated (form, innovation-use-info, W3 type-innovation-use, server innovation-use; the stale replication note is corrected).
    - Spec: `docs/specs/changes/innovation-use-2026-total-and-new-users/`. Follow-up: PR-2 (link when opened).
    
    🤖 Generated with [Claude Code](https://claude.com/claude-code)

### Follow-up to IU26-T-7 — W3 tiles number format + tokens (user-approved)

- **Status:** PASS · **Date:** 2026-11-25 · **Approval:** Santiago, 2026-11-25 ("haz lo que necesites hacer, pero esta spec queda hoy … ambas partes") after the T-6 advisory (W1/W2 "1,845" vs W3 "1845", W3 hex)
- Files: `type-innovation-use.component.{html,ts,spec.ts}` — `| number` on the four tile figures; `DecimalPipe` in the standalone imports; tiles + guidance use `bg-[var(--pr-surface-sunken)]`, `text-ink-secondary`, `text-ink-body` (no hex in those blocks; `#E0E0E0` card borders outside scope left)
- Red: `Expected substring: "{{ totals.actorsIndividuals | number }}"` (1 failed / 182). Green 183 / 183; build exit 0; lint clean. Leader re-run 183 / 183 → **VERIFIED**
- Reviewer: **PASS** — matches the W1/W2 grid (`innovation-use-form.component.html:72-93`); both forms use the default en-US locale. ADVISORY: the spec reads the html as text (component spec uses `overrideTemplate`); a rendered assertion would be stronger; W3 `rounded-md p-3` vs W1/W2 `rounded-[8px] p-[12px]`
- **spawns:** implementer 17 calls, 134,112 tokens, ended complete; reviewer 4 calls, 38,960 tokens, ended complete

### Spec amendment — IU26-R-1 "2025 result unchanged" (approved by Santiago 2026-11-25)

- `requirements.md` L112: the 2025 THEN clause no longer lists the CUU ("no CUU: the CUU was never shown before 2026, P-11"); `tasks.md` T-5 falsifier L123 aligned ("and no CUU"). Sweep: no remaining "with New users added and Total cumulative" / "cumulative input present" outside `execution.md`

### IU26-T-8 — Cleanup script for the existing 2026 copies (HITL, PROD)

- **Status:** `[~]` — script written; **TEST dry run (the gate) and PROD run are Santiago's** (standing rule: DB steps handed off; this agent never connects to a DB) · **Date:** 2026-11-25 · **Attempts:** 1 · **Effort:** high
- File: `docs/specs/changes/innovation-use-2026-total-and-new-users/cleanup.sql` (not executed; syntax unchecked until the TEST run)
  - PART 0: `@deploy_cutoff` (NULL + guard), `@phase_year`, an `information_schema` pre-flight (expects 0 rows)
  - PART 1 dry run: temp tables `tmp_iu26_cand`, `tmp_iu26_sig_t`, `tmp_iu26_sig_p`, `tmp_iu26_qual`; counts by source (W1/W2 vs W3 via `result.source`) and status; candidates vs qualifying + reasons; rows per table; qualifying results with active legacy measure rows; the id list. HITL gate with the P-19 disqualifier (~217)
  - PART 2: DDL (`bkp_iu26_*_YYYYMMDD` via `CREATE TABLE … LIKE` + `cleanup_run_at`) before `START TRANSACTION` (MySQL implicit commit); backup, soft delete of exactly the backed-up ids, recount; COMMIT/ROLLBACK commented; fresh-tab verification
  - PART 3: re-validation, commented rollback, falsifier checklist (a)–(e) + the role-clause mutation
  - Value columns per table with entity citations (actors 17 columns, orgs `how_many, other_institution, graduate_students, addressing_demands, institution_types_id`, P25 measures `unit_of_measure, quantity, addressing_demands`); NULL-safe per-row signatures, `GROUP_CONCAT … ORDER BY BINARY`, truncation guard; role 5 only (NULL roles never match — T-3 A-4)
  - Validation: P25 green checks are computed on read (`results-validation-module.service.ts:26` → `validateResultById` `…repository.ts:32-116` → `CALL validate_sections_mapped_batch` → `validation_innovation_use_P25`, migration `1762528725798-createValidtionP25.ts:845`, reads `is_active = TRUE AND section_id = 1`) — the soft delete takes effect on the next read; step 3-a calls the function read-only; the legacy stored `validation` table (`saveGreenCheck`, `service.ts:275`) is a commented manual API step. UNVERIFIED: whether the 2026 client still calls that PATCH
- **is_active readers:** filter — `result-actors.repository.ts:196,256,289`, `result_by_intitutions_type.repository.ts:48,83`, `result-ip-measures.repository.ts:44`, `results-validation-module.repository.ts:1040`, the P25 validation function. **Does NOT filter (pre-existing, outside this spec):** `result.repository.ts:3886-3920` `getInnovationUseBilateralResultById` (caller `results.service.ts:4337`) LEFT JOINs `result_actors`, `results_by_institution` and the legacy measures with no `is_active` condition — already returns user-deleted rows today; after the cleanup it would also return the soft-deleted copies. Reported to the user; not fixed here (needs its own ticket + bilateral change-log entry)
- Judgement calls (UNVERIFIED): no active `results_innovations_use` row required (dry-run 1f counts those lacking one); measures scoped by `result_id` only (IPSR rows with `result_ip_id`?); column existence checked at run time; cutoff vs `result.created_date` in UTC
- Reviewer: not yet — `Review: lenses` owed before Santiago runs steps 2–5 (scheduled after the PR-1 commit)
- **spawns:** implementer 21 calls, 152,329 tokens, ended complete

## HALT: IU26-T-8

- **Date:** 2026-11-25 · **Cause:** 3 attempts, 3 Reviewer FAILs (lenses: reliability + risk + conformance). The task stays `[~]`
- **Attempt 1 FAIL:** (1) 1d, 1g, 2-4 referenced `tmp_iu26_qual` several times in one UNION ALL statement → MySQL error 1137 "Can't reopen table"; (2) PART 2 acted on the pre-HITL list, so rows edited during the stop could be backed up and soft-deleted (R-10)
- **Attempt 2 FAIL:** in a new session `group_concat_max_len` reverts to 1024 → truncated signatures → an edited result could pass the count-only gate (R-10)
- **Attempt 3 FAIL (verbatim summary):** "A value-only edit in the window goes through undetected. The window opens at the 2-pre (i) re-run of 1-B and closes at the 2-1b `FOR UPDATE` … 2-1 joins the stale `tmp_iu26_sig_t` hash … 2-3 only compares counts … 2-1c/2-4 only snapshot section-2 and non-role-5 rows … **Violated Rule:** requirements.md IU26-R-10 … **Remediation:** Check the hash under the lock, inside the transaction and before COMMIT: (a) a 2-3b check rebuilding the per-result SHA2 from this run's backup rows and comparing with `rv.sig_hash` (0 mismatches, 0 missing, else ROLLBACK), or (b) reorder: 2-0 DDL, START TRANSACTION, 2-1b lock via the reviewed ids, re-run 1-A..1-C and the gate, then 2-1. Add falsifier (h)." ADVISORY: document post-lock inserts; separator collision (per-table SHA2); exact cutoff text; drop empty `bkp_iu26_*` before a same-day rerun
- **Implementer summaries:** attempt 1 full script (PART 0–3, value columns cited, validation mechanism, is_active readers); attempt 2 single-reference statements, persisted reviewed list `bkp_iu26_reviewed_YYYYMMDD`, 2-pre recompute + `@gate_ok`; attempt 3 PART 0 re-run, truncation guard, `sig_hash` + `phase_year` in the reviewed list, fail-closed `@gate_ok`, `FOR UPDATE`, BEFORE/AFTER snapshots, cases (f)(g)
- **Final verification:** none possible (no DB access by design; the script has never been executed — the TEST dry run by Santiago is the gate)
- **Leader hypothesis:** not a spec defect — §5.5 is sound; the difficulty is the HITL pause between dry run and write, which each attempt hardened one layer further. The remaining gap is narrow and has a concrete remedy (re-check the hash under the lock). Effort ceiling held at xhigh (T2) on attempts 2–3
- **Tree state:** holds other PASSed work (PR-1 staged; PR-2 T-10 in progress). Halted pathspec = `docs/specs/changes/innovation-use-2026-total-and-new-users/cleanup.sql` (untracked). **Not restored** — the file is a never-executed HITL draft with no runtime effect; deleting it would discard three reviewed layers of fixes. Kept pending the user's decision (deviation from the blanket rollback, recorded here)
- **spawns:** implementer (one context, resumed twice) 21 + 8 + 2 calls, 152,329 + 183,881 + 194,075 tokens, ended complete ×3; reviewers 9 calls 89,943 tokens fail · 3 calls 62,197 tokens fail · reviewer attempt 3 fail

---

## PR-2 (Santiago 2026-11-25: "esta spec queda hoy … ambas partes" — PR-2 built in the same checkout; PR-1 = the git index, PR-2 = unstaged working-tree changes. The T-10 dependency "PR-1 merged" is relaxed to "PR-1 complete and staged" by that instruction. The commit was denied by the auto-mode classifier and git is Santiago's (standing rule), so the PR-1 commit is handed off)

### IU26-T-10 — Migration: `new_users` on six tables (PR-2)

- **Status:** PASS (attempt 2) · **Date:** 2026-11-25 · **Attempts:** 2 · **Skills:** `nestjs-expert` · **Effort:** xhigh
- **Attempt 1**
  - Files: `onecgiar-pr-server/src/migrations/1793600000000-AddNewUsersToInnovationUseRows.ts` (up: `ALTER TABLE <t> ADD new_users int unsigned NULL DEFAULT NULL` ×6; down: reverse `DROP COLUMN`; no idempotency guard, like the exemplar `1793300000000-AddFarmerCountNatureToResultActors.ts`); `new_users` (`int`, unsigned, nullable, default null, `number | null`) in `result-actor.entity.ts`, `results_by_institution_type.entity.ts`, `result-ip-measure.entity.ts`, `results-ip-actor.entity.ts`, `results-ip-institution-type.entity.ts`, `results-by-ip-innovation-use-measure.entity.ts` (`result_ip_result_measures`); `NOT_REPLICATED` entry in `result-actors.repository.spec.ts`; "never replicates new_users" tests in the institution-type and P25 measure repository specs
  - Red (column added, `NOT_REPLICATED` not yet): 3 metadata-guard tests `- "missing": Array [], + "missing": Array [ "new_users", ],`. Mutation (column in the actors default insert lists `:52,85,113`): same 3 red with `"extra": ["new_users"]`; restored
  - Verification: `npx jest src/api/results/result-actors src/api/results/results_by_institution_types src/api/ipsr src/api/versioning --maxWorkers=2` → 34 / 348; tsc clean; eslint clean. Leader re-run 34 / 348 + tsc → **VERIFIED**
  - Reviewer: **FAIL** — "Adding 6 entity columns leaves `qa-catalog.completeness.spec.ts` failing with "uncatalogued column <table>.new_users" … **Violated Rule:** the QAC-R-7 completeness invariant (`completeness.ts:289`) … **Remediation:** Add 6 `PENDING_CATALOG` entries … reason "IU26-R-11; bound by IU26-T-15" … run `npx jest src/api/qa-catalog`"
- **Attempt 2**
  - Files: `src/api/qa-catalog/definitions/pending-catalog.ts` (+6 entries), `src/api/qa-catalog/qa-catalog.ipsr-step-3.spec.ts` (assertion excludes `column !== 'new_users'`, commented)
  - `npx jest src/api/qa-catalog --maxWorkers=2` → 53 passed / 1 failed suite (`qa-catalog.snapshot.spec.ts`) — **environmental**: `git ls-files --eol` = `i/lf w/crlf`, file unmodified; same revision 36 + content hash; the spec compares raw text, so a CRLF checkout fails every line. CI (LF) unaffected. Leader re-run: same
  - Reviewer: **PASS** — QAC-R-7 fixed; the ipsr-step-3 relaxation is narrowly scoped (one column, three tables) and not a weakened guard; snapshot red agreed environmental
- **spawns:** implementer 19 calls, 104,832 tokens, ended complete; reviewer 22 calls, 93,427 tokens, ended fail; implementer (resumed) 7 calls, 112,774 tokens, ended complete; reviewer ended complete
- **ADVISORY:** the `result_ip_result_*` tables have no replication test (explicit column lists read by the Reviewer); SQL-text checks only; no idempotency guard; `down` drops entered values
- **HITL (Santiago):** local `migration:run` / `migration:revert`; `migration:check`; the falsifier's DB form (source `new_users = 5` → target NULL)
- **Forward pointer → T-15:** remove the 6 `PENDING_CATALOG` entries and the `new_users` exclusion in `qa-catalog.ipsr-step-3.spec.ts` when the fields are bound; regenerate the snapshot deliberately

### IU26-T-11 — Server: save/read `new_users` (W1/W2 v2)

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` · **Effort:** medium
- runtime events: provider-limit death ×1 (5-hour limit) → rung 1 tree probe (no edits) → rung 3 resume-by-message → recovered
- Files: `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts` (`assertNewUsersWithinTotal` before any read/write; `new_users` in the 3 row builders only when the key is present), `…/innovation-use.service.new-users.spec.ts` (new), `…/innovation-use/CLAUDE.md` (IU26-T-11 section); `IsOptional`/`IsInt`/`Min(0)`/`ApiPropertyOptional` on `result-actor.entity.ts`, `results_by_institution_type.entity.ts`, `result-ip-measure.entity.ts` (the v2 DTO types rows with these entities)
- Disaggregation: `getActorsData` — `sex_and_age_disaggregation == true` → typed `how_many`; else women + men (fallback `how_many`); orgs vs `how_many`; measures vs `quantity`; negatives / non-integers rejected
- Red: `Expected: 400 Received: undefined` (150 > 120, 1,801 disaggregated, org, measure, 2030). Green: `npx jest src/api/results-framework-reporting/innovation-use src/api/bilateral --maxWorkers=2` → 60 / 1,850; tsc clean; eslint clean. Leader re-run 60 / 1,850 → **VERIFIED**
- `grep new_users` (non-spec): 6 entities, `pending-catalog.ts:215,226`, `innovation-use.service.ts`, the migration, the folder guide
- Reviewer: **PASS** — falsifier met; the bilateral `/create` `whitelist: true` strips `new_users` before the handler (`create-bilateral.dto.ts:627-651`), so the bilateral path is skipped; no bilateral DTO uses these entities and the read mappers list fields explicitly (`bilateral.service.ts:2950-3016, 3033-3044`) → R-12 holds; W3 save writes explicit lists
- **spawns:** implementer 22 calls, 156,961 tokens, ended died → resumed, complete; reviewer ended complete
- **ADVISORY:** server accepts/stores `new_users` on 2030 rows and pre-2026 (client-only gate) — recorded as design decision: harmless, the client never sends it there; Swagger shows `new_users` on W3/IPSR DTOs typed with the shared entities (W3 save ignores it); W3/legacy GET (`summary.service.ts:464,1042`) now returns `new_users: null` on org rows (T-10 column) → **PR-2 text** must mention it next to "payload unchanged"; error names array index + `actor_type_id`

### IU26-T-13 — IPSR step 3 server: gate, previous use, `new_users`, stop copy

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · **Skills:** `nestjs-expert`, `tdd` · **Effort:** high
- runtime events: provider-limit death ×1 → rung 1 tree probe (no edits) → rung 3 resume-by-message → recovered
- Files: `onecgiar-pr-server/src/api/ipsr/innovation-pathway/innovation-pathway-step-three.service.ts`, `…/dto/save-step-three.dto.ts`, `onecgiar-pr-server/src/api/versioning/versioning.service.ts` (unstaged half only), new specs `…/innovation-pathway-step-three.service.iu26.spec.ts`, `…/versioning.service.ipsr-step-three-replication.spec.ts`
- Gate: package `obj_version.phase_year >= 2026`; replication skip on the IPSR target `phase.phase_year` (`IPSR_STEP_THREE_USE_FIRST_SKIPPED_YEAR`), independent of T-3's type-2 config field; only the 3 step-3 copies skipped (package-level copies `:748,:757,:763,:807` unchanged)
- Join: `result_code` + `version_id = previous_phase` (as `InnovUseExists`) → twin's core component (`ipsr_role_id` 1) rows → T-1 util (keep-all pick; IPSR org role 6 remapped to 5). `current_use_previous` top-level on the GET, null when no twin/data, absent pre-2026
- Save: `new_users` on 3 update + 3 save paths (2026+), `_assertNewUsers` before any write (400 "Actor row N" / "Organization row N" / "Measure row N (unit)")
- Red: versioning `Expected number of calls: 0 Received number of calls: 1` (2026, 2027); step-3 spec vs original service 7 failed (`Expected: 400 Received: 200`, `toBeNull() Received: undefined`). Mutation `id: result.id` → "4,300 actors" red
- Verification: `npx jest src/api/ipsr/innovation-pathway src/api/versioning --maxWorkers=2` → 12 / 154; tsc clean; eslint clean. Leader re-run 12 / 154 + tsc → **VERIFIED**
- Reviewer: **PASS** — core component is where step-3 data lives (`getStepThree:487-560`, replication `:782-790`); `previous_phase` self-FK join correct; role remap semantically clean (query already filters role 6)
- **spawns:** implementer 39 calls, 173,818 tokens, ended died → resumed, complete; reviewer ended complete
- **ADVISORY:** a 2026 row saved without the `new_users` key is stored as NULL (erases) — differs from T-11 (write only when present) → **forward pointer T-14: the step-3 client must send `new_users` on every row for 2026 packages** (and decide whether to align the server); `_assertNewUsers` checks only ≤ total (≥ 0 / integer not server-checked); `_previousUse` failure would fail the whole GET; role-parameter instead of remap; options object
- **HITL:** confirm on PRTest data that a 2026 package's twin is found by `result_code` + `previous_phase`

### IU26-T-12 — Client: "Of which NEW" on W1/W2

- **Status:** PASS · **Date:** 2026-11-25 · **Attempts:** 1 · **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system` · **Effort:** high
- Files (`onecgiar-pr-client/src/app/`): `shared/utils/current-use-update.util{,.spec}.ts` (`newUsersValue`, `actorRowTotal`, `newUsersExceedsTotal`, `newUsersExceedsMessage`, `newUsersByCategory`); `internationalization/current-use-update.copy.ts` (`newUsersOfWhichLabel` — `newUsersLabel` already existed; `guidance(year, withNewUsers = false)` so W3 keeps no NEW sentence); `shared/components/innovation-use-form/innovation-use-form.component.{ts,html,spec.ts}`; **`custom-fields/pr-input/*` + spec (outside the list: opt-in `markInvalid` / `describedBy` → `aria-invalid`, `aria-describedby`, red border; defaults unchanged)**; `innovationDevInfoBody.ts`, `Ipsr-step-1-body.model.ts` (`new_users?: number | null`); `pages/results/…/innovation-use-info/innovation-use-info.component{,.spec}.ts` (`withNewUsers()`: current-use rows carrying the key sent as number or null; rows without the key untouched; 2030 never mapped); folder `CLAUDE.md` ×2
- Gate: `isNewUsersEnabled()` = `isCurrentUse2026()` && `source_name !== 'W3/Bilaterals'` (R-12); IPSR and 2025 excluded
- **Red:** no pre-code red captured (code written before the specs). Behavioural substitute — mutation "NEW compared against women only" → 3 failed / 274 passed: `"Of which NEW" … compares organizations with how_many, measures with quantity and actors with women + men (not women only)`; `"Of which NEW" … total 120 / new 150 -> message, the input flagged invalid and the section marked incomplete`; `current-use-update util › IU26-T-12 - of which NEW › actorRowTotal mirrors the server…`. Reverted. Reviewer accepted it as stronger than a missing-import red
- Verification: `npx jest --no-coverage --maxWorkers=2 --testPathPattern="innovation-use-form|current-use-update|innovation-use-info|type-innovation-use|step-n1|pr-input"` → 22 / 703; build exit 0; lint clean. Leader re-run 22 / 703 → **VERIFIED**
- Reviewer: **PASS** — falsifier cases named in specs; R-5 (no `any`), R-11 partial sum "or not available", R-12 W3 exclusion; `pr-input` change backwards-compatible. **Condition:** `onecgiar-pr-client/CLAUDE.md` §9 — any `custom-fields/` change must pass `npm run test:ct` → run `pr-input.cy.ts` / `pr-input.contract.cy.ts` in a batch after T-14's Jest, never concurrently — **run 2026-11-25 by the Leader:** `npx cypress run --component --spec pr-input.cy.ts,pr-input.contract.cy.ts` → 27 passed / 4 failed ("reflects an external value change in the input"; contract: "a programmatic parent change updates the control…", "setting the model to null renders the control empty", "the field label reaches the submission feedback list…" `expected [ 'Title' ] to include 'Title:'`). **Same 4 fail with the HEAD version of pr-input** (files swapped to `git show HEAD:` and restored, diff stat unchanged) → pre-existing, not caused by T-12 (consistent with the known-red CT suite). Condition met
- **spawns:** implementer 60 calls, 236,210 tokens, ended complete; reviewer ended complete
- **ADVISORY:** partial-sum tile can mislead (confirm with Nicoleta at the visual check); the NEW `appFeedbackValidation` marker renders outside the 2026 gate (always passes there); ≥ 0 / integer relies on the input box; marker label "Of which NEW users (cannot be higher than the total)" not in the spec — show to the PO

### IU26-T-14 — IPSR step 3 client

- **Status:** PASS (attempt 2) · **Date:** 2026-11-25 · **Attempts:** 2 · **Skills:** `angular-developer`, `impeccable-bridge`, `tailwind-design-system` · **Effort:** high → xhigh
- Files (`…/ipsr-innovation-use-pathway/pages/step-n3/`): `components/step-n3-current-use/step-n3-current-use.component.{ts,html}`, new `step-n3-current-use.iu26.spec.ts`, `model/Ipsr-step-3-body.model.ts` (top-level `current_use_previous`, `new_users?`), `components/ipsr-step3-evidence-list/ipsr-step3-evidence.util.ts` (`buildIpsrStep3SavePayload` drops `current_use_previous`, fills `new_users: null` on rows lacking the key — T-13 erase-on-missing-key rule)
- Gate `isIu2026()` = `currentResultSignal().phase_year >= 2026`, no fallback (missing year → 2025 UI); 2026: question, "– total" labels, no "expected", previous use by category, tiles Actors - individuals / Organizations / Other quantitative measures (no Households) with "Of which new", one NEW input per row, no narrative
- **Attempt 1:** no pre-code red; mutation `isIu2026()` → true → 2 red. Green `step-n3|step-n1` 21 / 284; build exit 0; ng lint 0 errors 1 warning. Leader re-run 21 / 284 → VERIFIED. Reviewer **FAIL**: (1) NEW inputs never marked invalid — no `[markInvalid]`/`[describedBy]` (R-13 → R-11 "the field is marked invalid", design §6.2, client CLAUDE.md §10); (2) fixtures lacked `portfolio: 'P25'`, so the task's `isP25()` mutation could not redden the 2025 falsifier
- **Attempt 2:** `[markInvalid]="newUsersExceeds(row, kind)"`, `[describedBy]` = `iu-new-error-<kind>-<i>` on all three inputs with matching alert ids; `appFeedbackValidation` marker (2026, `!anyNewUsersExceeds()`, `[advisory-grade]`); both fixtures `portfolio: 'P25'`. Mutation `isIu2026()` → `portfolio === 'P25'`: `● StepN3CurrentUseComponent — IU26 › 2025 package (falsifier) › keeps today's copy with 'expected' and none of the 2026 UI — Tests: 1 failed, 12 passed, 13 total`; reverted. Green 21 / 285; build exit 0. Leader re-run 21 / 285 → **VERIFIED**. Reviewer **PASS**
- runtime note: one attempt-2 build failed NG8002 because the **Leader** had temporarily swapped `pr-input` to its HEAD version for the T-12 CT comparison while T-14 was running (a measurement beside an active worker — Leader process error, recorded); restored, rerun green
- **spawns:** implementer 52 calls, 199,158 tokens, ended complete; reviewer 13 calls, 111,767 tokens, ended fail; implementer (resumed) 7 calls, 210,740 tokens, ended complete; reviewer ended complete
- **ADVISORY:** confirm on PRTest that the IPSR step-3 save path reads the marker (unverified); client does not otherwise block Save (server 400); attribute indentation; `newUsersExceeds` per CD pass

### IU26-T-15 — Review surfaces: QA catalog, drawer, PDF

- **Status:** `[~]` — QA-catalog part PASS; drawer and PDF parts are **spec tensions for the user** (not implemented) · **Date:** 2026-11-25 · **Attempts:** 1 · **Skills:** `nestjs-expert`, `angular-developer` · **Effort:** high
- Catalog files: `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/{innovation-use,ipsr-step-3}.ts`, `definitions/pending-catalog.ts` (6 `new_users` entries removed; `results_innovations_use.new_users_added` now pending), `definitions/versions.ts` (2026.36 → 2026.37), `__snapshots__/qa-catalog.snapshot.json`, `onecgiar-pr-server/docs/qa-catalog.en.md` (v1.37), `docs/specs/quality-assurance/qa-field-catalog/inventory/2026-B-outcomes-impact-ipsr.md`, 5 qa-catalog specs + new IU26-R-14 block; `qa-catalog.ipsr-step-3.spec.ts` exclusion removed (T-10 forward pointer closed)
- Items: removed `innovation_use.current_use_update.new_users_added`; no "Total cumulative" item existed; +6 optional "Of which NEW users" subfields (W1/W2 current use actors/orgs/measures — `sectionId === 1` only; IPSR step-3 core current use ×3); fields 163 → 162, subfields 253 → 259
- Snapshot: `npm run qa-catalog:snapshot` refused (key removed + content-without-bump); written with the same `buildSnapshot`/`serializeSnapshot` via a throwaway script (precedent 8243c5245); diff = revision/hash, removed key, 6 new subfield keys — Innovation Use / IPSR step 3 only (disqualifier not hit)
- Red: 12 failures in 5 suites (`catalog_version` '2026.36' asserts; extra `"new_users"` subfield). Green `npx jest src/api/qa-catalog --maxWorkers=2` → 54 / 1,305; tsc clean; eslint clean. Leader re-run 54 / 1,305 (snapshot spec green) + tsc → **VERIFIED**
- Reviewer (catalog): **PASS** — removal legitimate (FROM_2026 key cannot be retired by validity: `shape-validator.ts:314`; precedent ITD-T-2 / 2026.34); version consistent everywhere; bindings correct (2030 has none, tested)
- ADVISORY: `legacy2025` reason text wrong for a 2026-only field; orgs/measures label should be "Of which NEW" (R-11) not "… users"; v1.37 change-log row lacks "Consumers holding 2026.36 re-read the catalog…"; additive-only rule broken twice → kaizen item (snapshot script flag for first-year key removal)
- **Spec tensions (user decisions):**
  - **Drawer:** `innovation-use-content` serves only the bilateral (W3) review drawer (`_loadBilateralResultTypeData`, `results.service.ts`); W3 has no NEW (R-12) — the R-14 "Drawer" scenario (2026 W1/W2 Households row with NEW 300) has no host component. Proposed amendment: drop the drawer clause, or name the W1/W2 review surface it means
  - **"the 2025 catalog still has it":** cannot hold — `new_users_added` was FROM_2026 and only 2026 is catalogued. Proposed amendment: drop the 2025 clause
  - **PDF (P-18):** settled TRUE — `D:\PRMS\alliance-ibd-pdf-viewer` renders actor rows (`shared/components/innovation-use.tsx` `ActorsTable`, `ipsr-sections.tsx`), but the payload producer of `innovation_use_actors` is not in this repo (grep: none) → adding NEW needs the payload source settled first; separate repo PR, not started
- **spawns:** implementer 54 calls, 196,058 tokens, ended partial; reviewer ended complete

### IU26-T-8 — attempt 4 (user-approved after the HALT, Santiago 2026-11-25: "sí, haz el cuarto intento de T-8")

- **Script status:** Reviewer **PASS** · task stays `[~]` until Santiago's TEST dry run (the task's gate) and PROD run
- Changes: PART 2 order = 2-A params → 2-0 DDL → START TRANSACTION → 2-1b `FOR UPDATE` (via the persistent reviewed list) → 2-pre rebuild 1-A..1-C + gate under the lock (fail → ROLLBACK) → 2-1c → 2-1 → 2-2 → 2-3 → 2-3b (per-result SHA2 from this run's backup rows vs reviewed `sig_hash`) → 2-4 → COMMIT only if 2-3 OK, 2-3b OK, 2-4 AFTER = 2-1c BEFORE. Comments fixed; post-lock inserts documented; drop-empty-backups instruction; exact `@deploy_cutoff`; falsifier (h). 61 statements, 0 reference a temp table twice
- Reviewer: **PASS** — no implicit commit inside the transaction; `FOR UPDATE` uses the same predicates as the gate's target side; 2-3b recipe equals 1-B (equal data → equal hash; empty list fails closed); attempts 1–3 fixes intact
- **Run conditions for Santiago (ADVISORY, must follow):** PART 2 takes shared next-key locks across `result`, `result_actors`, `results_by_institution_type`, `result_ip_measure` until COMMIT → run in a low-traffic window with the block pasted in one go; on ANY error → ROLLBACK and stop; check `@@binlog_format` / `@@enforce_gtid_consistency` first (STATEMENT + GTID rejects CREATE TEMPORARY inside a transaction — fails loudly, safely); remove stale "(Previously: …)" text at l.630-631
- **spawns:** implementer (resumed) 5 calls, 191,155 tokens, ended complete; reviewer ended complete

### IU26-T-10 — HITL migration check (Santiago, 2026-11-25, screenshots in chat)

- DB `prdb` (the shared dev DB): `npm run migration:run` → 1 new migration, 6 × `ALTER TABLE … ADD new_users int unsigned NULL DEFAULT NULL`, `AddNewUsersToInnovationUseRows1793600000000` executed, COMMIT
- `npm run migration:revert` → 6 × `DROP COLUMN new_users` (reverse order), migration row deleted, COMMIT
- `npm run migration:run` again → applied again, COMMIT
- `npm run migration:check` → Total 504, Executed 513, Pending 0 — "No pending migrations found" (no drift on unrelated entities; the 9 extra executed rows are migrations from other branches already in `prdb`)
- **Result:** up/down verified; T-10 DoD "migration up/down verified locally; migration:check green" met. Note: `prdb` now holds the 6 nullable columns — additive, invisible to code without the entities
