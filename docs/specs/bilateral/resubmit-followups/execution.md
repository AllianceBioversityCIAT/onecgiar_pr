# Execution — Follow-ups from the rejected-result resubmission

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` (`RSF`) |
| Approval Mode | `gated` |
| Leader | Claude Code session, Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Started | 2026-10-06 |
| Working-tree note | Uncommitted files from `RRC-T-1`/`RRC-T-2` and `bugfix/user-password-in-responses` are in the tree (server). Each task diff is extracted path-scoped, so those files never enter this spec's diffs or commits |

## 2. Task Execution History

### `RSF-T-1` — Client: one request-text builder, primary sentence in the bell

- **Skills:** `angular-developer`, `tdd`, `systematic-debugging` (as listed). **Effort:** medium (attempt 1).
- **Diff transport deviation:** the Reviewer received the frozen diff as a scratchpad snapshot file (read with `Read`) instead of inline text. This is the same frozen payload, and it saves the Leader output tokens.

#### Attempt 1 — Reviewer FAIL

- **Files:** NEW `…/results-notifications/utils/request-notification-text.ts` + spec; `…/pipes/filter-notification-by-search.pipe.ts` + spec; `pop-up-notification-item.component.{ts,html,spec.ts}`.
- **Red run:** 6 of the 7 new bell cases failed on old code. Received "Ana Diaz from SP12 has requested inclusion of SP12 as a contributor to result 9762 - Some title".
- **Green:** scoped Jest (`--maxWorkers=2`): 3 suites, 140 tests passed. Lint: the client has no `eslint.config`, so `npx eslint` exits 2. `ng lint --lint-file-patterns` on the touched .ts/.html files was clean.
- **P-4:** `request_type` is present on bell rows (`bellReceived` ← `GET_allRequest` pending scope), so the disqualifier does not trigger. `creating_center` cannot be proven from client code. If it is absent, the specified fallback "the Center" applies. Check a real payload at the T-7 glance.
- **Reviewer verdict: FAIL** (verbatim):
  > 1. **Discovered Issue:** The `init` guard went on the wrong branch of `generateUrlLink`. The diff guards the request branch (`requestInitId`, `pop-up-notification-item.component.ts:307-310`). The branch the spec names is the update branch, and it is unchanged: `const updateInitId = notification?.obj_result?.obj_result_by_initiatives[0]?.obj_initiative?.id; return \`${baseUrl}?phase=${versionId}&init=${updateInitId}&search=...\`; // :304-305`. After `RSF-T-3` drops inactive rbi rows, an ownerless result's update notification has an empty `obj_result_by_initiatives`. The link then still carries `init=undefined`, which is the exact outcome the design says T-1 fixes. The new spec case "omits init when the row has no initiative" only builds a request row (`obj_shared_inititiative: null`), so the case that matters is untested. The `init=undefined` the red run shows came from that artificial request fixture.
  > - **Violated Rule:** `design.md` §3 `RSF-P-8` (L40); §10 bell TS row (L113): "The deep link omits `init` when the **update row** has no initiative (`P-8`)"; §9 Reversion challenge, DD-3 row (L133); `tasks.md` RSF-T-1 Description 4.
  > - **Remediation Suggestion:** In the `notification_id` branch, compute `updateInitId` with optional chaining on the array (`obj_result_by_initiatives?.[0]?.obj_initiative?.id`). Emit `&init=` only when it is not null, the same pattern the request branch now uses. Add a bell spec: an update row with `obj_result.obj_result_by_initiatives: []` gives a URL with no `init=` and with `?phase=<v>&search=`. Run it red first on the current code. The request-branch guard can stay (it does no harm), but the update branch must be fixed.
- **ADVISORY (attempt 1, not gating):**
  - RELIABILITY: The primary sentence reads `obj_shared_inititiative.official_code` with no fallback, so it can render "has tagged undefined as…". Consider `unknownProgramFallback`.
  - READABILITY: `primaryRequestParts` rebuilds the pieces separately from `buildRequestNotificationText`, so the visible text and the link text could drift apart. Consider one parts builder.
  - RISK: The two-line clamp is unproven in jsdom. It is a known gap for the T-7 visual check.
- **Leader adjudication:** FAIL accepted. It is in scope: task Description 4 + `P-8` name the update card's `obj_result_by_initiatives[0]`.

#### Attempt 2 — Reviewer PASS

- **Effort:** high (bumped one level for the retry). The same Implementer was resumed with the verbatim FAIL and the Attempt History.
- **Files:** `pop-up-notification-item.component.ts`: the `generateUrlLink` update branch reads `obj_result_by_initiatives?.[0]` and emits `&init=` only when the id is non-null. `pop-up-notification-item.component.html`: the chip `@let officialCode` now uses `?.[0]`. Before, it threw on a missing array. `pop-up-notification-item.component.spec.ts`: 3 new cases (update row with an empty array or with no array → exact URL with no `init`; a render case with an empty array → no throw and no "undefined").
- **Red run:** 2 cases failed on the old code. Received `…?phase=v1&init=undefined&search=John Doe has submitted the result R001 - Result Title`. The missing-array case threw a TypeError. The render case passed on the old code and is kept as a guard.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="request-notification-text|filter-notification-by-search|pop-up-notification-item"` → 3 suites, **143 tests passed**. `ng lint --lint-file-patterns` on the pop-up .ts/.html files: all pass.
- **Reviewer verdict: PASS.** Issue 1 is fixed: the update branch matches `RSF-P-8` (L40), §10 (L113) and §9 DD-3 (L133), and there are no regressions. The attempt-1 conformance of items 1, 2, 3 and 5 still holds.
- **ADVISORY (final, not gating, not turned into tasks):**
  - RELIABILITY: If `obj_shared_inititiative` is missing, the primary sentence prints "has tagged undefined as…" (builder + `primaryRequestParts`). A possible fix is a fallback to `notificationItem.unknownProgramFallback`.
  - READABILITY: `primaryRequestParts` duplicates the builder's pieces, so the visible text and the link text could drift. A possible fix is one shared parts builder.
  - RISK: The two-line clamp is unproven in jsdom. It is a known gap for the `T-7` visual glance.

#### `RSF-T-1` result

- **Final status:** PASS, 2026-10-06, 2 attempts.
- **Requirements covered:** `RSF-R-1` (T-7 case exact string; "must NOT contain" × 3; centre fallback; contribution and map-to-ToC literals unchanged), `RSF-R-2` (one builder for both the pipe and the bell link; per-kind haystack cases); `DD-1`, `DD-2`; design §9 DD-3 reversion outcome (`init` omitted when there is no initiative).
- **Decisions:** The client has no `eslint.config`, so lint ran through `ng lint --lint-file-patterns` on the touched files. The primary SP code comes from `obj_shared_inititiative.official_code` for every `is_map_to_toc` value.
- **P-4:** `request_type` is present (verified). `creating_center` is unproven from the client. If it is absent, the specified fallback applies. Look at it during the `T-7` glance.
- **Known gap:** the two-line clamp → `T-7` step 4.
- **Commit:** pending the user's go-ahead (no auto-commit). Scope = the 7 client files only; it excludes the uncommitted `RRC`/bugfix server files.

### `RSF-T-2` — Bilateral GET: active primary only, budget guard, contract

- **Final status:** PASS, 2026-10-06, 1 attempt.
- **Skills:** `nestjs-expert`, `systematic-debugging`, `api-design-principles`. **Deviation:** I dropped `tdd` (not in this task's list anyway). The red-first rule still applied through `systematic-debugging`. **Effort:** medium-high (it touches a payload contract).
- **Files:** `onecgiar-pr-server/src/api/results/result.repository.ts` (`getTocMappingsByResultId`, :4078) + `result.repository.spec.ts`; `src/api/bilateral/bilateral.service.spec.ts`; NEW `src/api/bilateral/services/quality-assessment/mappers/result-header.mapper.spec.ts`; `docs/bilateral-result-summaries.en.md` (one change-log row).
- **Predicate:** `AND (rbi.initiative_role_id <> 1 OR rbi.is_active = 1)`. It is role-scoped and never drops the result (`bs:3910-3913` only assigns `obj_results_toc_result`). The repo spec asserts a single `rbi.is_active` occurrence, so a blanket filter fails.
- **Red:** `result.repository.spec -t "RSF-R-3"` on the old code → 1 failed.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="result.repository|bilateral.service.spec|result-header.mapper"` → 5 suites, **322 tests passed**. eslint on the 4 .ts files → exit 0. The red run used `--maxWorkers=1` because free RAM was 3.9 GB.
- **Falsifiers present:**
  - Mapper, owner changed: [SP11 Owner, SP06 Contributor] → SP11.
  - Mapper, ownerless: [SP06] → null, and the contributor is not promoted.
  - Budget guard through the real `buildInnovationSharedBudgetAndEvidenceExtras`: 777 under the inactive role-1 row is hidden, 55 under the active role 2 is kept.
- **Disqualifier:** did not fire. No contributor fixture lost an entry.
- **Reviewer verdict: PASS.** The diff conforms to Description 1–3, DD-4, the ownerless BUT clause and `AC-4`. Its one open item was this R-8 table, recorded below.
- **ADVISORY (not gating, not turned into tasks):**
  - RELIABILITY: `contributors-and-partners.mapper.ts:132-133` `find(Owner) ?? tocRows[0]`. For an ownerless result, the QA `theory_of_change` block now comes from the first contributor's ToC mapping; before, it came from the retired owner's. This is outside `R-3`'s QA row (`primary_science_program` only). It needs a product decision: drop the fallback, or record it as intended.
  - READABILITY: The new change-log row sits above an undated "2026-10" row. Check that the table order is newest-first.
- **Requirements covered:** `RSF-R-3` (GET + QA rows; owner changed; ownerless for GET/QA; contributors untouched), `RSF-R-8`; `DD-4`.
- **Known gap:** the SQL assertion is presence-only. The live proof is `T-7` step 1 (GET 9550/9762).

#### `RSF-R-8` evidence: budget readers filter the parent `rbi.is_active`

Paths are under `onecgiar-pr-server/src/api/`. The Implementer verified them (via a read-only scout). The Leader confirmed reader #3 with two greps (`result_initiative_budget` in admin/export/report files: none; `kind_cash` in `result.repository.ts`: only `nppb`, non-pooled).

| # | Reader | Parent filter (file:line) | Status |
|---|---|---|---|
| 1 | Bilateral GET innovation extras (`buildInnovationSharedBudgetAndEvidenceExtras`) | `bilateral/bilateral.service.ts:2538` → `In(...)` :2575; budget `is_active` :2573-2581 | OK + guard test |
| 2 | QA type-specific mapper | `type-specific.mapper.ts:270-271` reads `summary.initiative_budget`, which is built by #1 (`bs:2678`, `:3535`) or IPSR #8a (`bs:3301`, `:4017`) | OK (by origin) |
| 3 | Admin export | No in-tree SQL reads `result_initiative_budget` for an export. Excel exports are probably DB views outside the repo | **INCONCLUSIVE** (not OK) |
| 4 | Result-detail investment | `results/result_budget/result-investment.service.ts:92`, :97-102 | OK |
| 5 | Innovation-use | `results-framework-reporting/innovation-use/innovation-use.service.ts:983-988` | OK |
| 6a | Innovation-dev v2 | `results-framework-reporting/innovation_dev/innovation_dev.service.ts:296-301` | OK |
| 6b | Innovation-dev v1 | `results/summary/innovation_dev.service.ts:537-542` (save path) | OK |
| 6c | Innovation-dev export SQL | `results/summary/repositories/results-innovations-dev.repository.ts:490-491` | OK |
| 7 | Summary | `results/summary/summary.service.ts:954-959` | OK |
| 8a | IPSR framework step 4 | `ipsr-framework/pathway/ipsr-pathway-step-four.service.ts:551-556` | OK |
| 8b | IPSR innovation-pathway step 4 | `ipsr/innovation-pathway/innovation-pathway-step-four.service.ts:66-71` | OK |
| 9 | Validation module | `results/results-validation-module/results-validation-module.repository.ts:1550`, :1565 | OK |
| 10 | IPSR validation module | `ipsr/results-innovation-packages-validation-module/…repository.ts:986-994` | OK |
| 11 | Replication (versioning) | `results/result_budget/repositories/result_initiative_budget.repository.ts:39`, :79 (in JOIN ON), :90 (WHERE) | OK with caveat: at :39/:79 an inactive parent yields NULL `rib` columns, not a dropped row. No amount is copied |

Unverified side findings from the scout (not acted on): `result_initiative_budget.repository.ts` `logicalDelete` joins `rbi.id = result_initiative_budget_id` instead of the FK (a possible latent bug); `ipsr-pathway-step-four.service.ts:437` has a `console.log(rie.kind_cash)`. **Reader #3 needs the user:** check the DB views behind the admin Excel export, or accept it as inconclusive.

### `RSF-T-5` — Subnationals: reactivate one row per code

- **Final status:** PASS, 2026-10-06, 1 attempt.
- **Order note:** T-5 ran before T-3 by design. T-3, T-4 and T-6 share `notification.service.ts` / `bilateral-resubmission.service.ts` with `RRC-T-5` / `RRC-T-6`, and the `RRC` session is active in this same checkout (`RRC-T-3` is done, the `RRC-T-4` migration is in progress). T-5 has no overlap (`RSF-DD-8`).
- **Skills:** `nestjs-expert`, `tdd`. **Effort:** high (self-referencing UPDATE, MySQL 1093).
- **Files:** `result-countries-sub-national/repositories/result-country-subnational.repository.ts` (`bulkUpdateSubnational` only; signature unchanged) + spec; NEW `result-countries/result-countries.service.spec.ts` (the task listed it as existing; it was absent).
- **Approach:** a two-step read-then-update in the same method (the task's disqualifier route):
  1. Unchanged: inactivate the codes not sent.
  2. Read `max(id)` per code: `where result_country_id=? and geo_scope_role_id=? and code in (…) group by code having sum(is_active > 0) = 0`, params `[rc, role, ...codes]`, each bound once.
  3. `update … set is_active=1 … where id in (…)`, only when there are ids.

  This avoids 1093 because the UPDATE targets literal ids and has no self-subquery.
- **Judgment call (accepted by the Reviewer):** the `HAVING` skips a code that already has an active row. A literal "newest row" would otherwise create two active rows and break `R-4`'s "at most one" / "must NOT reactivate both". It also honours "rows already active are untouched".
- **Red:** 4 new `RSF-R-4` specs failed on the old SQL. **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="result-country-subnational.repository|result-countries.service"` → 3 suites, **19 passed**. eslint (3 files) → exit 0.
- **Reviewer verdict: PASS.** The diff meets `RSF-R-4` and `DD-5`, the falsifier is covered, and the consumers (`bs:6418`, `:6431`, `result-countries.service.ts:291`) only `await` the method, so the return value is unused.
- **ADVISORY (not gating, not turned into tasks):**
  - RISK: Pre-existing groups with 2+ active duplicates stay as they are. For T-7, add a read-only count of `(result_country_id, geo_scope_role_id, code)` groups with more than one active row to decide whether a one-off data fix is needed.
  - RELIABILITY: With a NULL `is_active`, the code is skipped. Confirm in T-7 that the column cannot be NULL.
  - READABILITY: The reactivation UPDATE is inline. A named builder would match the other statements.
  - RELIABILITY: The HAVING test is presence-only. MySQL's behaviour is proven in T-7 step 2.
- **Requirements covered:** `RSF-R-4` (code half; the live half is T-7 step 2); `DD-5`.

### `RSF-T-3` — Notification readers: active owner only, never hide the notification

- **Final status:** PASS, 2026-10-06, 1 attempt (budget allowed 2 rounds).
- **User decision (2026-10-06):** "Continue now". T-3, T-4 and T-6 run before `RRC-T-5`/`RRC-T-6` (`RSF-DD-8` is a warning). The `RRC` session is paused at `RRC-T-4` `[~]` and must build on these changes when it resumes. The two sessions must not run at the same time.
- **Skills:** `nestjs-expert`, `tdd`, `systematic-debugging`. **Effort:** high. **Review:** parallel lens reviewers ×2 (A: conformance + reliability + risk; B: conformance + resilience + readability), per `Review: lenses`.
- **Files:** `onecgiar-pr-server/src/api/notification/notification.service.ts` + spec; `src/api/notification/services/result-tagged-notification.service.ts` + spec.
- **Changes:**
  - The relation `where` is untouched (ns:741-745, :908-911).
  - `getNotificattionSelect` adds `initiative_role_id` and `is_active`.
  - Inactive rows are dropped after load in `mapNotificationResultFields` (ns:1012-1019).
  - `ns.resolveOwnerProgramCode` returns only an active role 1, else `undefined`.
  - `rtn.resolveOwnerProgramCode` returns only an active role 1; the `?? initiatives[0]` fallback is removed.
- **Red:** 8 failed with `-t RSF`.
  - 6 ns failures:
    - owner-changed getAll and pop-up returned SP09;
    - the ownerless select lacked `is_active`;
    - emit returned "Approved by the Science Program SP09.".
  - 2 rtn tests were red for the wrong reason, then rewritten as direct resolver tests. Both Reviewers traced them by hand against the old code (old results SP09/SP09/SP22 → fail). Red is **by inspection, not by run**.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="notification.service|result-tagged-notification"` → 2 suites, **132 passed**. eslint (4 files) → exit 0.
- **Ownerless falsifier:** for getAll (pending + viewed) and pop-up, `where.obj_result` is checked with exact `toEqual` against the original object, and the notification is returned with `[]`.
- **Disqualifier:** not triggered. Every client reader takes `[0]?.` as "the owner":
  - bell `:98`, `:304`, html `:29`;
  - inbox card `:721`;
  - `update-notification` html `:2`;
  - `filter-notification-by-initiative.pipe.ts:30` (an ownerless result no longer matches a specific-SP filter, as intended);
  - `getProgramCode`.
- **Reviewer verdicts:** lens A **PASS**, lens B **PASS**.
  - Lens A, scope question: the shared mapper now also filters Center-notice rows. Lens A judged this "a harmless consequence, not a violation": the reader query is unchanged, §7 requires the mapping for getAll/pop-up, and no row is dropped.
- **Recorded gap (Cannot prove):** the composed tagged lead-in "created by {code} has tagged…" is **unreachable today**. The `emitFor` callers only create CENTER/BILATERAL_PROJECT tagged targets, which store `label` (rtn:369-372), and BCT passes its own `leadIn`. The `R-3` "tagged owner" falsifier is therefore proven at the resolver only; that table row is effectively dormant code.
- **Implementer assumptions:**
  - The select was widened with `initiative_role_id`, which the emit path (`findOne` ns:150, no relation `where`) needs. Lens A found no consumer risk: these are `/api/notification/*` fields, not the bilateral contract.
  - Existing fixtures gained `initiative_role_id: 1, is_active: true`. Lens B found no protection weakened.
- **ADVISORY (not gating, not turned into tasks):**
  - RISK/RESILIENCE (both lenses): Center-notice rows load all roles (`findCenterNoticeNotifications` ns:335-359). After the filter, `[0]` can be an active role-2 contributor shown in the bell chip / grid fallback where the owner would be. This was already possible before. Add a read-only check to T-7 step 4: one "Declined" Center notice on a result with contributors. Fixing it means either a role-1 filter on that path or a pinning fixture, which is a follow-up.
  - RELIABILITY: the emit socket push (ns:180) still carries unfiltered initiatives. The client socket is dormant, so there is no impact today.
  - RISK: `getRecentResultActivity` (ns:459-463) picks role 1 without `is_active`. It has the same defect class but is outside `R-3`'s table, so it is a follow-up candidate.
  - RESILIENCE: the filter relies on every caller using `getNotificattionSelect()`; a docstring note would help.
  - READABILITY: the conditional spread could be a plain ternary; `|| undefined` vs `?? undefined` differ between the twin resolvers; the rtn tests reach a private method via `as any`.
  - TEST: in the getAll ownerless case the viewed list returns `[]`, so only its `where` is asserted.
- **Requirements covered:** `RSF-R-3` notification rows (list/bell, program code, tagged owner at resolver level) and the ownerless scenario incl. "BUT must NOT hide the notification"; `DD-3`.

### `RSF-T-4` — Resubmission preflight: lead centre, single lead, contributor ids, status pin

- **Final status:** PASS, 2026-10-06, 1 attempt.
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`, plus `error-handling-patterns`. I added that last one because the task introduces two new 400s on a live path. **Effort:** high. **Review:** parallel lens reviewers ×2, per `Review: lenses`.
- **Files:** `src/api/bilateral/services/bilateral-resubmission.service.ts` + spec; `src/api/bilateral/bilateral.service.ts` + `bilateral.service.spec.ts` (the T-2 test is kept); `docs/bilateral-result-summaries.en.md` (rows added only). Diff extracted against pre-T-4 baselines of the shared spec and doc.
- **Changes:**
  - rsv:566: `leadProjectCount > 1` → 400, placed right after the no-lead check.
  - rsv:589: unresolvable `lead_center` → 400, after the title check and before users (`findOrCreateUser` stays last). `{value}` = acronym → name → institution_id → `(empty)`, never the object. A payload with no `lead_center` object is not refused; `handleLeadCenter` skips it too, and both Reviewers accepted this reading of `R-5`.
  - rsv ~595-609: `contributorInitiativeIds` is placed on the preflight result for T-6.
  - In bs: `countPayloadLeadProjects` (:5060) applies the same rule and skips as `findPayloadLeadProjectId`. `resolveContributorInitiativeIds` (:5080) is a `findOne` on `official_code`.
  - `handleLeadCenter` is split into a read-only `findLeadCenter` (:5241) + `persistLeadCenter`. The create path is identical: same warn lines, early returns, writes and args, compared line by line by lens A.
  - `RSB-R-21`: no new code. Both refusals go through the existing `logRefusal` and are pinned in the specs.
- **Red:** the source was reverted to HEAD (`git show`), then restored. The files were clean at HEAD, so nothing else was affected.
  - bs.spec: 4 behavioural failures (unknown centre gave the 409 sentinel; institution without center; two leads; `contributorInitiativeIds`).
  - rsv.spec: failed at compile level. Lens B traced its cases by hand and they fail against the old logic.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="bilateral-resubmission.service|bilateral.service.spec"` → 2 suites, **329 passed** (create regressions included). eslint (4 .ts files) → exit 0.
- **Falsifiers:**
  - Writer spies (all 5 + closed world) show 0 calls on each refusal.
  - One flagged project among three passes.
  - A no-code unknown centre gives a warn and no throw.
  - The status pin uses the literal.
- **`R-10` evidence:**
  - `describeResultStatus` (rsv:50-53) = `status.name.replace(/-/g,' ')`. `ResultStatusData.PendingReview = ('pending-review', 5)` (`src/shared/constants/result-status.enum.ts:9-12`), so the function returns `'pending review'`.
  - Doc: `bilateral-result-summaries.en.md` :506 `status: "pending review"`, :555/:557 (409 "its status is pending review" after a timeout), :562/:564 (`updated` rows). Line numbers shift by 2 after this task's rows.
  - The bs.spec pin compares to the literal and reads both doc phrases from the real doc. **Verified OK + pinned.**
- **Contract doc:** two rows in "Errors specific to a resubmission" (several `is_lead`, after the no-lead row; unresolvable `lead_center`, after the allocation row) and one 2026-10-06 change-log row. The change-log row says the no-code `create` and `versioned` paths are unchanged.
- **Reviewer verdicts:** lens A **PASS**, lens B **PASS**.
- **ADVISORY (not gating, not turned into tasks):**
  - RISK: payloads that used to pass silently now get a 400. Notify STAR/MEL/TIP before deploy (also in `tasks.md` §6 Rollout).
  - RELIABILITY: the lead centre is resolved twice (preflight + writer), with a negligible window during a CLARISA sync.
  - RESILIENCE (→ T-6 brief): `resolveContributorInitiativeIds` silently skips unknown codes. `validateInitiatives` (:1396) already refuses those earlier, so the skip is reachable only if CLARISA changes between reads. Also, an empty `contributing_programs` retires every role-2 row (the `R-7` replace rule).
  - RESILIENCE (→ T-6 brief): if the primary SP is also listed in `contributing_programs`, T-6 must not treat it as a role-2 keeper in a way that touches role 1.
  - RESILIENCE: `leadProjectCount > 1` fails open on `undefined`. The legacy rsv mocks (:67, ~:1785) omit the field.
  - RESILIENCE/RISK: `findLeadCenter`'s pre-existing warn echoes centre identifiers. The "no payload" claim applies to the `RSB-R-21` line only.
  - READABILITY: the "no lead_center object" guard is duplicated (`handleLeadCenter` :5221 + the port lambda). Two test titles overstate their cases: rsv "a lone project" duplicates "one of three"; bs "a lone project passes without the flag" is actually covered by :4147.
  - VERIFICATION STRENGTH: the create-level half of falsifier 3 ("still creates") rests on the harness, not on an explicit `create()` assertion.
- **Forward note for `RRC-T-6`:** rsv now has new port members and a reordered preflight. `RRC-T-6` must build on them.
- **Requirements covered:** `RSF-R-5` (incl. "IT MUST leave R unchanged", "BUT the no-code create must NOT change"), `RSF-R-6` (incl. "BUT a single project … must still pass"), `RSF-R-10`, `RSF-R-11`; `DD-6`; `P-13` true (ids resolve without a write).

### `RSF-T-6` — Reset: retire contributors the payload dropped

- **Final status:** PASS, 2026-10-06, 1 attempt.
- **Skills:** `nestjs-expert`, `tdd`. **Effort:** medium-high.
- **Forward pointers carried in the brief** (from the T-4 review):
  - A primary also listed must never touch role 1.
  - `[]` must not produce `NOT IN ()`.
  - Never assume the id count equals the payload count.
- **Files:** `src/api/bilateral/services/bilateral-resubmission.service.ts` + spec. The diff was taken against the post-T-4 baseline.
- **Changes:**
  - New required option `ResubmissionResetOptions.contributorInitiativeIds` (~:224-228).
  - `runResubmissionPipeline` passes `preflight.contributorInitiativeIds` (:379).
  - New reset step after the role-1 step (~:859-878):
    - Reads the active `ResultsByInititiative` rows with `initiative_role_id = 2` (`CONTRIBUTOR_INITIATIVE_ROLE`, :278).
    - Filters them in code against `Set(ids)`.
    - Calls `deactivateByKeys(…,'id',dropped)`: `UPDATE … SET is_active=0, last_updated_by=? WHERE id IN (…) AND is_active=1`. The call is skipped when `dropped` is empty.
  - No role-2 row is created (`DD-7`).
- **Red:** run after the type and wiring, before the step. 4 of 96 tests failed. 3 were behavioural (`isActive(…, 2)` expected false, received true). The 4th was an exact-args pipeline test, which was updated to `contributorInitiativeIds: []`.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="bilateral-resubmission.service"` → **96 passed**. eslint → exit 0.
- **Tests:**
  - SP06 dropped → its row goes inactive.
  - SP07 listed → no update; the only role-2 update names id [2].
  - `[]` → all role 2 retired, no role-1 call, role 1 still active.
  - Primary also listed → role 1 untouched.
  - An already-inactive row is not touched.
  - Another result's row is untouched.
  - Pipeline spy: `[3,4]` reaches the reset.
- **Reviewer verdict: PASS.** Every clause of `RSF-R-7` ("THEN", "BUT", "AND IT MUST"), `DD-7` and the three falsifiers is covered by a test that would fail on the wrong implementation.
- **ADVISORY:**
  - **RISK — spec gap, escalated to the user (not converted into a task):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md:582` ("Contributing programs" row) still says "Accepted contributors are not removed". After `R-7` that is false. `requirements.md` §7 and `design.md` §7 name change-log rows only for the GET correction and the two 400s, and `T-6` lists no doc file. `src/api/bilateral/CLAUDE.md` and root `CLAUDE.md` require the doc to change with any consumer-visible behaviour. Needs: correct :582 and add one change-log row (`RSF-R-7`, amends `RSB-R-15`).
  - RELIABILITY: T-6 relies on `validateTocMappingInitiatives` / `validateInitiatives` refusing unresolvable contributor codes earlier in the preflight (`bs:5078`). If that refusal is ever relaxed, a listed but unresolvable SP would have its accepted role-2 row retired.
  - RISK: retired role-2 rows keep their `result_initiative_budget` children. Every reader filters the parent (`R-8` table), so nothing surfaces.
  - VERIFICATION STRENGTH: only the in-memory DB was used. T-7 should include one live resubmission that drops a contributor.
- **Requirements covered:** `RSF-R-7` (all clauses); `DD-7`.

## Spec amendment: `RSF-T-6` contract doc (user-approved, 2026-10-06)

- **Gap:** raised by the T-6 Reviewer as an advisory. `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (resubmission table, "Contributing programs" row) said "Accepted contributors are not removed". After `RSF-R-7` that is false. The spec named change-log rows only for the GET correction and the two 400s.
- **Decision:** the user said "corrige lo que tengas que corregir" after the run summary. `T-6` Files now include the contract doc.
- **Change (Leader inline, a 1-file doc text fix):**
  - The row now reads "Replaced by the payload: an accepted contributor (active role 2) the payload no longer lists is deactivated; one still listed keeps its row. No contributor is created here…; the primary is not affected".
  - New change-log row, 2026-10-06, `RSF-T-6` / `RSF-R-7`, amends `RSB-R-15`. It states that the no-code `create` and `versioned` paths are unchanged.
- **Verified against the code:** `resolveContributorInitiativeIds` (`bs:5080`) yields `[]` for an absent or empty `contributing_programs`, and the T-6 step then retires every active role-2 row (T-6 `[]` test).
- **Review:** no separate Reviewer spawn. The text restates behaviour the T-6 Reviewer already audited, and the Reviewer proposed this wording.

### `RSF-T-7` — Live checks (manual, user) — in progress

#### Step 1: bilateral GET (2026-10-07; user confirmed the environment has the deploy through `443e214ce`)

- **Lesson:** `GET /api/bilateral/:id` takes the result **id**. The "9550/9762" of the spec are **result codes** (ids 12018 / 12230). The first attempt used `/9550` (not found) and `/9762` (a different result, code 7296).
- **Candidates:** from a read-only query of API results that have an inactive role-1 row.

| id (code) | DB rows (`results_by_inititiative`) | `obj_results_toc_result` live | Verdict |
|---|---|---|---|
| 12018 (9550), Rejected | SP11 r1 active · SP09 r1 inactive | only `SP11` "Primary submitter"; SP09 absent (still listed in `obj_result_by_initiatives` with `is_active:false`) | ✅ **PASS**: the "owner changed" scenario, incl. "IT MUST NOT list SP09" |
| 12230 (9762), Pending Review | SP09, SP11, SP12 r1, all inactive | `[]`; the result is still returned (200) | ✅ **PASS**: the "ownerless" scenario for the GET, incl. "BUT must NOT drop the result" |
| 11513 (9045) | SP06 r1 active · SP07 r1 inactive · SGP-02, SP01, SP02 r2 active | `SP06` "Primary submitter" + `SGP-02`, `SP01`, `SP02` "Contributor"; SP07 absent | ✅ **PASS**: "owner changed" + "contributors untouched" (all 3 role-2 entries present) |

- **Step 1 result:** ✅ all three cases pass. `T-2`'s live half and `RSF-R-3`'s GET rows are closed.
- **`RSF-OQ-4`:** the live label is `"Primary submitter"`, which matches the contract doc example. No doc fix is needed. **Closed.**
- **Side observation:** on 12230, `innovation_use_summary.initiative_budget` is `[]` with all parents inactive. This is consistent with `R-8`.

#### Step 4 (run second): bell, read-only glance on PRTest (2026-10-07, user screenshots)

- **Primary request card, result 9762:** the card reads "**Bioversity (Alliance)** has tagged **SP11** as the primary Science Program of result 9762 - RSB T7…". It has the SP11 chip, "REQUIRES DECISION", and Accept as primary / Decline.
  - No "as a contributor", "has requested inclusion" or "from SPxx" anywhere.
  - The sentence takes two lines and the result title truncates with an ellipsis, so the clamp holds.
  - ✅ `RSF-R-1` live, and the layout gap is closed.
- **`RSF-P-4`:** `creating_center` is present on bell rows: the label is the centre acronym "Bioversity (Alliance)", not the "the Center" fallback. ✅ Closed.
- **Deep link (mouse hover):** `https://prtest.ciat.cgiar.org/result/results-outlet/results-notifications?phase=36&init=60&search=Bioversity (Alliance) has tagged SP11 as the primary Science Program of result 9762 - RSB T7 innovation amount test 2026-10-07`.
  - `search` carries the new sentence.
  - `init=60` (SP11) is present because the request row has an initiative.
  - There is no `init=undefined`.
  - ✅ `RSF-R-2` link half.
- **Ownerless result 9762, "Pending review" update card:** the card is still shown ("The result 9762 - … was submitted for your…") and shows **no** SP chip, so no retired SP09/SP11/SP12 is presented as owner. ✅ `RSF-R-3` "ownerless … BUT must NOT hide the notification" live.
- **No clicks** were made on Accept or Decline.
- **Not observed:** the optional "Declined" Center notice chip (advisory from T-3). None was visible in the bell.

#### Step 2a: the two new 400s, live on PRTest (2026-10-07, `POST https://prtest-back.ciat.cgiar.org/api/bilateral/create`, result 9550 = id 12018, Rejected)

- **Test 1:** payload with `lead_center: {"acronym":"ZZZ"}` returned `400 "Result 9550 cannot be resubmitted: lead_center ZZZ does not match a CGIAR center."` (03:46:42Z). ✅ `RSF-R-5` live. The message matches design §6 exactly.
- **Test 2:** the same payload with `lead_center: {"institution_id":49}` and two `contributing_bilateral_projects` flagged `is_lead` returned `400 "Result 9550 cannot be resubmitted: 2 bilateral projects are flagged is_lead; flag exactly one."` (03:47:46Z). ✅ `RSF-R-6` live.
- **Lesson:** a resubmission test needs a **Rejected** result. 9762 is Pending Review and would answer 409 before reaching the new checks.
- **"IT MUST leave R unchanged":** the follow-up `GET /api/bilateral/12018` (03:55:03Z) shows the result unchanged: still `Rejected` (status 7), `CENTER-02` lead, `last_updated_date` 2026-10-06T21:57:23, description "Description RSB-T7 resubmission 3 to SP12", SP11 active primary. ✅ Both refusals wrote nothing.

#### Step 2b: resubmission with a subnational duplicate and a dropped contributor. ❌ **FAIL: reopens `RSF-T-5`** (2026-10-07)

- **Setup (user, PRTest DB, result 12018):**
  - 2 inactive `CO-ANT` rows (ids 971, 972, geo_scope_role 1).
  - SP06 and SP07 role 2 active (rbi 14167, 14168).
  - "Before": SP09 r1 inactive · SP11 r1 active · SP06/SP07 r2 active; CO-ANT 971 = 0, 972 = 0.
- **POST:** `/api/bilateral/create` (9550, scope 5, CO + subnational id 867, `contributing_programs: [SP07]`) returned `500 "[ResultCountrySubnationalRepository] => error: updateSubnational QueryFailedError: Unknown column 'id' in 'field list'"` (11:59:07Z).
- **Root cause:** `bulkUpdateSubnational` (RSF-T-5) reads `select max(id) as id` and updates `where id in (…)`. The table's primary key is `result_country_subnational_id` (entity `result-country-subnational.entity.ts`). The unit specs mock `query()`, so the wrong column passed every test, and the Reviewer did not catch it either. tasks.md T-5 "Cannot prove … If MySQL rejects the query, that is a FAIL, not a gap": **FAIL**.
- **Blast radius:** the method is shared, so the in-app geo save (`result-countries.service.ts:291`) and the bilateral create fail the same way whenever subnational codes are sent. This is live on PRTest; fix before promotion.
- **Data state after the 500 (user queries, 2026-10-07):**
  - `result` 12018 is still `status_id = 7` (Rejected), so it can be retried. But `description` = "RSF-T7 test 3 - subnational duplicate + dropped contributor", `last_updated_date` = 11:59:07, and `geographic_scope_id` is still 4. The result-row writer ran before the failure. This is the known non-atomic resubmission (`RSB-DD-2`, `RSB` §9 "real rollback is not proven by mocks"), and here it is observed live: a partial write on a 500.
  - **C1:** SP06 r2 → `is_active = 0` at 11:59:00 · SP07 r2 still active, `last_updated_date` unchanged (11:57:47, the insert) · SP11 r1 active · SP09 r1 inactive. ✅ **`RSF-R-7` (T-6) proven live:** SP06 was dropped, SP07 kept its row untouched, and role 1 was untouched. The reset runs before the writers.
  - **C2:** CO-ANT 971 and 972 are both still `0`. The subnational step failed, so nothing was reactivated.
  - `share_result_request`: no new request rows. The contributor-request writer did not run (it comes after the failing geo writer).
- **Action:** `RSF-T-5` goes back to `[~]`. Rework attempt 2 (effort xhigh) uses the real primary key and adds a spec that pins the column names against the entity.

#### `RSF-T-5` rework attempt 2 — PASS (2026-10-07)

- **Effort:** xhigh. **Skills:** `nestjs-expert`, `systematic-debugging`, `tdd`.
- **Attempt history in the brief:** attempt 1 assumed `id`; never assume a column name, check it against the entity.
- **Fix:**
  - Read: `select max(result_country_subnational_id) as result_country_subnational_id … group by clarisa_subnational_scope_code having sum(is_active > 0) = 0`.
  - Update: `… where result_country_subnational_id in (…)`.
  - Rows are mapped through `row.result_country_subnational_id`. Everything else from attempt 1 is unchanged.
- **New spec "column names match the entity" (4 tests):**
  - The PK comes from `getMetadataArgsStorage()`.
  - The read and the update use that PK.
  - No `max(id)` / `where id in` / `select id`.
  - Every listed column exists in the entity or BaseEntity metadata.
- **Red:** 5 of 17 failed on the old code. **Green:** `--testPathPattern="result-country-subnational.repository|result-countries.service"` → 3 suites, **23 passed** (`--maxWorkers=1`, free RAM 2.8 GB). eslint → exit 0.
- **Reviewer verdict: PASS.** The Reviewer checked each identifier independently against the entity, BaseEntity **and the migration DDL** (`1701202511335-createSubnationalScopeTables.ts`: PK `result_country_subnational_id`; `geo_scope_role_id` from `1761222250119-…`). `sum(is_active > 0)` is valid (`tinyint NOT NULL DEFAULT 1`). There is no ONLY_FULL_GROUP_BY issue and no self-referencing UPDATE.
- **ADVISORY:**
  - RELIABILITY: test 4's regex only lists known names plus `id`, so a misspelt column (e.g. `last_update_by`) would pass. Extracting every snake_case identifier would make it fully falsifiable. The PK, which was the live defect, *is* falsified by tests 1–2.
  - RISK: the metadata tests trust the entity. Entity-vs-DB drift is covered only by T-7.
- **Lesson (Leader):** for raw SQL in a repository, a mocked `query()` spec proves the shape, not the schema. Future briefs should require a column check against the entity/DDL, and the Reviewer should check identifiers against the DDL, not only the spec.
- **Still owed:** the live re-run of Step 2b on PRTest after this fix is deployed.
