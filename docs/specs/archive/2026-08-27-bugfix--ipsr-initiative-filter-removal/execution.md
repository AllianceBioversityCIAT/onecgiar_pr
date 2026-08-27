# Execution Log — Innovation Packages filter shows Initiatives instead of Science Programs only

**Spec:** `docs/specs/bugfix/ipsr-initiative-filter-removal/`
**Approval Mode:** not declared in Document Control — defaulting to gated (confirm with user at each PASS/HALT gate).

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/ipsr-initiative-filter-removal` |
| Started | 2026-08-27 |
| Leader model | sonnet (session default; T1 registry recommends opus — not switched, continuing per "never block on this") |
| Implementer model | sonnet (T2) |
| Reviewer model | opus (T3) |

## 2. Task Execution History

### `IPF-T-1` — `api.service.ts`: repoint IPSR filter to the Science-Program-scoped list

**Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)

**Spec correction (recorded before Attempt 1's review):** `requirements.md`, `design.md`, and `tasks.md` originally cited `auth.service.ts` for `updateUserData()`. The Implementer found the method actually lives in `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` (`auth.service.ts` holds only the unrelated `GET_initiativesByUser()`/`GET_initiativesByUserByPortfolio()` HTTP calls, untouched). Leader corrected all three spec docs' file references in place (not a Pivot — the design intent and fix content were unaffected, only the file citation was wrong).

#### Attempt 1 — 2026-08-27

**Skills assigned:** `angular-developer`, `tdd` (per task list, no deviation).
**Effort:** medium (task default; well-specified).

**Implementer report:**
- Files changed: `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` (2-line swap, success + error branch), `onecgiar-pr-client/src/app/shared/services/api/api.service.spec.ts` (extended existing assertion + new `describe('IPF-T-1: ...')` block).
- `resultsListFilterSE.updateMyInitiatives(...)` calls confirmed byte-for-byte unchanged.
- Verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="api.service"` → 377/377 passed. `--testPathPattern="auth.service"` → 24/24 passed (no regression). `npx ng lint --quiet` → clean.
- RED/GREEN evidence: stashed the 2-line fix → 2 failed; restored → 377/377 passed.
- Undefined-guard finding: `ipsr-list-filter.service.ts:25-32`'s `updateMyInitiatives()` guards `forEach` with `?.` but the `[...header, ...initiatives]` spread is unguarded and throws on `undefined` (empirically confirmed). Judged out of scope / not reachable.
- **Not Done / Assumptions:** (1) file-location correction (resolved, see above); (2) no error-branch regression test — argued the `error:` callback is unreachable dead code (every source observable has its own `catchError`, RxJS 7 doesn't route a sync `next` throw to `error`); (3) no test added to `ipsr-list-filter.service.spec.ts` for the undefined-guard gap — cited as out of scope per `design.md` ("no change").

**Reviewer verdict: FAIL**

- **IPF-R-1/IPF-AC-1:** met — verified at source.
- **IPF-R-10/IPF-AC-4:** met — both `resultsListFilterSE.updateMyInitiatives(myInitiativesList)` calls confirmed byte-for-byte unchanged at source.
- **Item 2 (no error-branch test):** accepted as legitimate — Reviewer independently verified the dead-code claim (`catchError` on all three sources; RxJS 7 `reportUnhandledError` semantics). Not a FAIL.
- **Item 3 (undefined-guard, error branch only) — FAIL, but not for the reason claimed.** Reviewer found the *success* branch is the reachable path, not the error branch: `api.service.ts:92`'s `GET_initiativesByUserByPortfolio?.response?.ipsr?.sort(...)` overwrites `dataControlSE`'s `[]` default with `undefined` if a **200 response omits `ipsr`** — a scenario `IPF-OQ-1` has not yet ruled out (its manual check is deferred to `IPF-T-2`). That `undefined` then hits the unguarded spread in `updateMyInitiatives()`, throwing and killing `callback()` — i.e. the whole session-bootstrap, not just the IPSR filter.
  - Violated: `tasks.md` IPF-T-1 DoD ("`updateMyInitiatives(undefined)` confirmed non-throwing … or by an added test case if the guard is not obviously safe from inspection" — inspection found it throwing, so this DoD item is unsatisfied); `design.md` §13 ("confirm … not assumed safe … before shipping").
  - Remediation: guard inside `api.service.ts` only (task's declared file, does not touch `ipsr-list-filter.service.ts`'s "no change" scope) — `?? []` at the `myInitiativesListIPSRByPortfolio` assignment (and, optionally, the sibling `myInitiativesListReportingByPortfolio` line for consistency, flagged as ADVISORY/RELIABILITY not required). Add one Jest case: `GET_initiativesByUserByPortfolio` → `of({ response: { reporting: [] } })` (no `ipsr` key), assert no throw, `updateMyInitiatives` called with `[]`, `callback` called. Then correct the now-inaccurate "not reachable today" claims in `design.md` §6.2 row 2 and the spec comment.

**ADVISORY (non-blocking, recorded only):**
- READABILITY: the `describe` block + 20-line prose comment for the dead-error-branch rationale is heavier than the file's flat `it(...)` style; consider `it.todo(...)` with a one-line pointer to `execution.md`, moving the full two-proof rationale here to avoid duplication/drift risk on refactor.
- RELIABILITY: sibling line `myInitiativesListReportingByPortfolio` (`api.service.ts:89-91`) has the identical `?.reporting?.sort()`-to-`undefined` hazard; out of scope for this task, worth folding into the same `?? []` fix while the file is open.
- RISK: blast radius of the FAIL issue is the whole session bootstrap (`callback()` never runs), not just the IPSR filter.

**Requirements covered (pending re-verification in attempt 2):** `IPF-R-1`, `IPF-R-2`, `IPF-R-10` (code correctness confirmed; safety gap open).

**Decisions made:** Corrected spec file references (auth.service.ts → api.service.ts) across `requirements.md`/`design.md`/`tasks.md` as a documentation fix, not a Pivot (design intent unaffected).

**Issues encountered:** Spec's file-path citations were wrong throughout; task's original DoD assumption about `undefined`-safety was optimistic and empirically false.

**Effort bump for attempt 2:** medium → high (a failed fix is usually under-thinking, per rework loop guardrail).

#### Attempt 2 — 2026-08-27

**Skills:** `angular-developer`, `tdd` (unchanged). **Effort:** high (bumped per rework guardrail).

**Implementer report:**
- Fix: normalized both `myInitiativesListIPSRByPortfolio` and (advisory, applied for consistency) `myInitiativesListReportingByPortfolio` at the assignment site in `api.service.ts:91-92` with `?? []`, so a 200 response missing the `ipsr` key can no longer produce `undefined`. Did not touch `ipsr-list-filter.service.ts` (design.md scope respected).
- New test `api.service.spec.ts:286-298`: mocks `GET_initiativesByUserByPortfolio` → `{ response: { reporting: [] } }` (no `ipsr` key), asserts `updateUserData()` does not throw, `updateMyInitiatives` called with `[]`, `callback` called.
- RED (guard reverted): `Expected: [] / Received: undefined`. GREEN (guard restored): `npx jest --silent --reporters=summary --no-coverage --testPathPattern="api.service"` → 4 suites, 378/378 passed. `npx ng lint --quiet` → clean.
- Corrected the "not reachable today" claims in `design.md` §6.2 row 2 and the spec comment (`api.service.spec.ts` ~258-283).
- Not Done / Assumptions: none.

**Reviewer verdict: PASS**

- Verified at source: `?? []` correctly short-circuits `undefined`/`null` `ipsr`; `data-control.service.ts:19` pre-assignment default is `[]`; grep confirmed these are the only two write sites for `myInitiativesListIPSRByPortfolio` — attempt-1 FAIL genuinely closed at the data source.
- `ipsr-list-filter.service.ts` confirmed untouched, byte-identical, matching design.md's "No change" scope.
- IPF-R-10 confirmed byte-for-byte unchanged — both `resultsListFilterSE.updateMyInitiatives(myInitiativesList)` calls are context lines in the diff; test assertions (`:212`, `:251`, `:254`) actively separate the two paths.
- DoD "confirmed non-throwing" item satisfied via its "or an added test case" clause — behavioral test (`not.toThrow()` + exact-value assertion), RED-verified, load-bearing.
- Swept for a second reachable `undefined` path: none found reaching the IPSR filter; two ADVISORY-only pre-existing hazards noted (unguarded `myInitiativesList` assignment at `:88`/`:95` — out of scope, currently not exploitable via HTTP error since `catchError` returns `{response: []}`; and `?.sort()` still throws on a non-array truthy `ipsr`, deferred to `IPF-OQ-1`'s manual check in `IPF-T-2`).

**ADVISORY (non-blocking, recorded only):**
- RELIABILITY: `api.service.ts:88` (`myInitiativesList = GET_initiativesByUser?.response`) has the same unguarded-assignment defect class; out of this task's scope (feeds the Results path, which must not be touched). Suggest a follow-up `?? []` there, not an expansion of this task.
- RELIABILITY: `?.sort()` still throws if the server returns a non-array truthy `ipsr` (e.g. string/object). Not addressed — `IPF-OQ-1`'s manual verification in `IPF-T-2` is the right place to confirm real payload shape before considering a fix.

**Requirements covered:** `IPF-R-1`, `IPF-R-2`, `IPF-R-10`, `IPF-AC-1`, `IPF-AC-2`, `IPF-AC-4`.

**Decisions made:** Guard placed at the data-assignment site in `api.service.ts` rather than inside `ipsr-list-filter.service.ts`'s consumer, preserving design.md's "no change" scope for that file. Applied the same guard to the sibling `reporting` field for consistency (advisory, not required).

**Issues encountered:** None beyond the attempt-1 FAIL, closed in this attempt.

**Final verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="api.service"` → 378/378 passed. `npx ng lint --quiet` → clean.

**STATUS: PASS (2 attempts) — later REOPENED, see below. Nothing was committed; the Leader caught the commit before it landed and the user separately flagged the same defect from a real browser check.**

#### Reopened — 2026-08-27 (real defect found by manual browser verification, before commit)

**What happened:** Before committing, the user tested the actual Innovation Packages list in the browser and found the "Submitter(s)" chips render as blank/empty pills (dark circles with no visible label) — see screenshot review. The Reviewer's two PASS verdicts (attempts 1 and 2) both audited spec conformance and code-level correctness but never rendered the UI, so this defect slipped through both automated reviews. This is exactly the class of gap `IPF-OQ-1`'s mandatory manual verification (deferred to `IPF-T-2`) exists to catch — surfaced one task early, by the user rather than by the process, and before any commit landed.

**Root cause:** `api.service.ts`'s `next` handler enriches `dataControlSE.myInitiativesList` items with `myInit.role = ...`, `myInit.name = myInit.official_code`, `myInit.official_code_short_name = ...` (`:95-99`) — but this enrichment loop runs **only** over `myInitiativesList`. `myInitiativesListIPSRByPortfolio` (the array IPF-T-1 repointed the IPSR filter to) is populated straight from `GET_initiativesByUserByPortfolio().response.ipsr`, whose items get `full_name` set inside `auth.service.ts` (`:125-127`) but never `.name`. The IPSR chip template (`ipsr-list-filters.component.html:9`) renders `{{option.name}}` — so every chip fed from the newly-wired scoped list renders with an undefined `.name`, i.e. blank. Confirmed: this bug did not exist before IPF-T-1 (the pre-fix code fed `myInitiativesList`, which IS enriched with `.name`); it is a direct, previously-unforeseen side effect of this task's own data-source swap.

**Why the automated checks missed it:** Both Jest regression tests (attempts 1 and 2) asserted `updateMyInitiatives` was called with the correct **array reference/contents** (`toHaveBeenCalledWith(scopedIpsr)`), never rendered the template or asserted on a `.name`/display field. The Reviewer's source-level audit (reading `ipsr-list-filter.service.ts`'s `updateMyInitiatives`) confirmed the *consumer* doesn't corrupt its input, but neither the Implementer's nor the Reviewer's process included a template render or a browser check — that check was correctly scoped as mandatory in `IPF-T-2`'s DoD, but a task-boundary gap meant IPF-T-1 shipped a discoverable defect before IPF-T-2's manual verification would have caught it.

**Disposition:** `IPF-T-1` reopened. Attempt 3 (of the 3-attempt ceiling) will add the missing enrichment for `myInitiativesListIPSRByPortfolio` items in `api.service.ts` (mirroring the existing `myInitiativesList` enrichment) plus a regression test asserting the enriched `.name` field, not just array identity. Effort: `xhigh` (this is the third attempt on this task and the failure mode — a UI-rendering gap invisible to non-rendering unit tests — is a new class, not a repeat of attempts 1-2's issue).

#### Attempt 3 — 2026-08-27 (final, 3-attempt ceiling)

**Skills:** `angular-developer`, `tdd`. **Effort:** xhigh.

**Implementer report:**
- Fix: added a second enrichment loop over `myInitiativesListIPSRByPortfolio` in `api.service.ts`'s `next` handler (lines ~100-104), mirroring the existing `myInitiativesList` loop exactly — same `role` lookup, same `.name = .official_code`, same `.official_code_short_name` composition. Placed before `ipsrListFilterService.updateMyInitiatives(...)` is called.
- New test in `api.service.spec.ts` (`:308-351`): mocks `GET_initiativesByUserByPortfolio()` returning `ipsr` rows shaped like the real server payload (no `.name`/`.official_code_short_name`), captures the array actually passed to `ipsrListFilterService.updateMyInitiatives`, asserts every item's `.name`/`.official_code_short_name`/`.role` are populated with correct values.
- RED (before fix): 1 failed, 378 passed, 379 total. GREEN (after fix): 4 suites, 379/379 passed. `npx ng lint --quiet` → clean.
- Confirmed `innovation-package-list.component.ts` and `ipsr-list-filter.service.ts` untouched (`git status --porcelain` empty on both).
- Flagged (correctly not fixed here, IPF-T-2's declared scope): `everyDeselected`/`deselectInits()`/`ngOnDestroy()` still read the flat list while chips now render from the scoped list — a real select-all/deselect-all mismatch.

**Reviewer verdict: PASS**

- Verified at source: enrichment loop (`:100-104`) runs before `updateMyInitiatives(...)` (`:106`) — ordering matters because `updateMyInitiatives` reads `.name` synchronously (`init.attr = init.name`).
- New test verified to assert the rendered field with real values, not array identity (advisory: doesn't pin ordering, only presence — noted below).
- Error branch confirmed symmetric/unchanged: never enriched either list, before or after this diff; `myInitiativesListIPSRByPortfolio` defaults to `[]` there (attempt 2's `?? []` guard), so no throw, no blank chips — consistent with pre-existing behavior.
- IPF-R-10 confirmed intact — both `resultsListFilterSE` calls are context lines.
- `ipsr-list-filter.service.ts` and `innovation-package-list.component.ts` confirmed untouched by source inspection.
- Swept for a related gap: found `.name`→`.attr` also drives the chip **filter pipe** (`innovation-package-list-filter.pipe.ts:23`, matches `init.attr == item?.official_code`) — pre-fix, IPSR chips were not just blank but inert (selecting one filtered to nothing). Same one-line fix closes both. Checked `innovation-package-creator.component.ts`'s separate consumption of the scoped list (`sourceInitiatives`) — confirmed benign, its `pr-select` uses `optionLabel="full_name"`, unaffected by this enrichment.
- **Ship-order note (not a FAIL, a deployment constraint):** with IPF-T-1 alone, the admin `deselectInits()`/`everyDeselected`/`ngOnDestroy()` path still mutates the flat list's `.selected`, not the scoped list's — so an admin's chips would not actually deselect. This is `requirements.md` §7 Consistency, explicitly satisfied only at the end of the two-task sequence (`design.md` §6.2 assigns those 4 references to IPF-T-2; `tasks.md` §7 Roll-back plan already assumes "single PR covers both tasks"). **IPF-T-1 must not be committed/deployed standalone — hold for IPF-T-2 to land in the same commit/PR.**

**ADVISORY (non-blocking, recorded only):**
- RELIABILITY: the two enrichment loops are now duplicated 5-line bodies over two arrays; a small `enrichInitiatives(list, roles)` helper would make a future data-source repoint structurally incapable of reproducing this exact defect class. Not required.
- TEST: the new test can't detect an ordering regression (only presence) — asserting inside the spy's mock implementation would also pin ordering. Worth doing next time this file is touched.

**Requirements covered (final, all 3 attempts):** `IPF-R-1`, `IPF-R-2`, `IPF-R-10`, `IPF-AC-1`, `IPF-AC-2`, `IPF-AC-4`.

**Decisions made:** Held the commit — `IPF-T-1` and `IPF-T-2` will land together in one commit/PR per the Reviewer's ship-order finding and `tasks.md`'s existing rollback-plan assumption.

**Issues encountered:** A real, user-caught UI defect (blank + inert filter chips) that both automated Reviewer passes missed, because neither the tests nor the source audit rendered the template or traced the `.name`→`.attr` filter-matching chain. Caught by manual browser verification before any commit landed — validates why `IPF-OQ-1`'s mandatory manual check exists, just triggered one task earlier than planned.

**STATUS: PASS (3 attempts) — held for joint commit with IPF-T-2.**

### `IPF-T-2` — `innovation-package-list.component.ts`: align dependent references + manual verification

**Status:** code PASS, task NOT `[x]` — mandatory manual verification (`IPF-OQ-1`) outstanding.

#### Attempt 1 — 2026-08-27

**Skills:** `angular-developer`, `tdd`. **Effort:** medium.

**Implementer report:**
- Repointed all 4 references (`initsSelectedJoinText`, `everyDeselected`, `deselectInits()`, `ngOnDestroy()`) from `myInitiativesList` to `myInitiativesListIPSRByPortfolio`. `checkIpsrReportingAccess()` left unchanged (existing precedent).
- New `describe('scoped-list regression (IPF-T-2)')` block: flat list carries an extra `INI-flat-only` entry the scoped list doesn't; asserts all 4 methods/getters operate only on the scoped list.
- Updated 4 pre-existing tests to seed the scoped list instead of the flat one (mechanical rename, same assertions/shapes) — otherwise they'd assert on an array the code no longer reads.
- RED (new tests, pre-fix): 4 failed, 102 passed. GREEN (post-fix): 13 suites, 106/106 passed. `npx ng lint --quiet` → clean.
- **Not Done:** mandatory manual browser verification against a real mixed-membership CLARISA account (`IPF-OQ-1`, `tasks.md` DoD items 5-6) — explicitly flagged, not silently dropped; requires real credentials the Leader must coordinate.

**Reviewer verdict: PASS (code only)**

- IPF-R-3 confirmed at source: all 4 call sites repointed, no 5th stale reference remains.
- `checkIpsrReportingAccess()` and Results module confirmed untouched (IPF-AC-4/IPF-R-10).
- **Gap-closure verified by object-identity trace, not just field name:** `ipsr-list-filter.service.ts:31`'s shallow spread means `filters.general[0].options[1..n]` hold the *same object references* as `myInitiativesListIPSRByPortfolio`; the chip template mutates `.selected` on those same objects. So `deselectInits()`/`ngOnDestroy()` now mutate exactly what the chips render from — confirms IPF-T-1's ship-order gap (admin deselect-all was a visual no-op) is closed by IPF-T-1 + IPF-T-2 together.
- Test-update judgment (item 2) ruled legitimate: mechanical field rename, zero assertion-semantics change, matches `design.md` §10's "extend" scope for this spec file.
- **DoD gap explicitly not waived:** manual verification (DoD items 5-6) is a hard blocker on `[x]` per the `/akili-execute` "Not Done" rule — reinforced by precedent: `execution.md`'s own Reopened entry shows this exact data path (chip rendering) survived two clean automated PASSes before a real browser check caught it.

**ADVISORY (non-blocking):**
- RELIABILITY: `initsSelectedJoinText` and `everyDeselected` have no consumer anywhere in `src/` (grep-confirmed) — dead getters being maintained/tested. Follow-up deletion candidate, not this spec's scope.
- TEST: in `deselectInits()`/`ngOnDestroy()`'s flat-list assertions, the first array element (`flatOnlyEntry`) is compared against the same object reference it was seeded with — the test is only genuinely RED pre-fix because of the second (literal) element. Minor test-quality note for a future touch of this file.

**Requirements covered:** `IPF-R-3`, `IPF-AC-1`, `IPF-AC-3`, `IPF-AC-4` (code). `IPF-AC-1`/`IPF-AC-4`'s manual-verification half and `IPF-OQ-1` remain open.

**Blocking item — RESOLVED (2026-08-27):** manual browser check completed by the user against a real account with both legacy Initiative and Science Program CLARISA memberships: `/ipsr/list/innovation-list` chips render Science-Program labels only, zero `INI-*`, deselect-all clears chips correctly; `/result/results-outlet/results-list` confirmed unchanged (still Initiatives + Science Programs + "Pre-2022 results"). `IPF-OQ-1` resolves favorably — the server-side `ipsr` split is confirmed Science-Program-only; `IPF-DD-1` Alternative 2's fallback guard is not needed.

**STATUS: PASS — IPF-T-1 and IPF-T-2 committed together in one commit, per the ship-order constraint.**

## 3. Summary

All tasks in `tasks.md` (`IPF-T-1`, `IPF-T-2`) are `[x]`. Both landed in a single commit per the Reviewer's ship-order finding. Spec ready to archive.
