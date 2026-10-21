# Execution Log — "Updated 2025 innovations with no 2026 project" line in the Center Overview

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-no-project-line/` |
| Started | 2026-10-21 |
| Approval Mode | `gated` (proposal Document Control) |
| Leader | Claude Code session (Opus 5.5) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers |
| Branch | `qa-development-2026-ss` (no commit by agents; owner commits) |
| Budget | 5 tasks · ~300 LOC incl. tests · ≤ 2 review rounds per task |

## 2. Task Execution History

### CNP-T-1 — Shared predicate + `group` contract key

- **Final status:** PASS
- **Date:** 2026-10-21
- **Attempts:** 1 Implementer, 1 Reviewer (review mode `full`, lens checklist)
- **Skills assigned:** `angular-developer`, `tdd`
- **Requirements covered:** `CNP-R-1` rules (`Number()` on flags, any project excludes), `CNP-R-2` "same predicate", `CNP-AC-2`, `CNP-AC-4`, `CNP-AC-5` (predicate side)

#### Attempt 1

- **Files changed (client, `src/app/pages/bilateral/`):**
  - `bilateral-result-filter.ts`: `UPDATED_INNOVATION_TYPE_IDS = [7, 2]`, `isUpdatedNoProjectRow(row)`, guard in `filterCenterResults` after the project guard.
  - `bilateral-query-params.ts`: `BILATERAL_GROUP_QUERY_PARAM`, `GROUP_VALUES`, `BilateralGroup`, `'group'` in `ContractKey` and `BilateralQueryParams`; parse (unknown → `null` + `stripped`), serialize only when non-null, never via `explicitDefaults`; header comment key count.
  - `bilateral-result-filter.spec.ts`, `bilateral-query-params.spec.ts`: truth table + `group` describe; existing literals gained `group`.
  - Compile-only `group: null`: `bilateral-overview.component.ts` (`emptyParams`), `bilateral-overview.component.spec.ts`, `overview-controls.component.spec.ts`, `bilateral-results-list.component.ts` (`currentContractParams`, comment pointing to T-4).
- **Diff size:** 8 files, +159 / −4 (mostly tests).
- **Red run:** `npx jest --maxWorkers=2 --no-coverage --silent bilateral-result-filter.spec bilateral-query-params.spec` → failed on missing `group` key (`Expected "updated-no-project" Received undefined`) and missing exports (`isUpdatedNoProjectRow is not a function`, `UPDATED_INNOVATION_TYPE_IDS is not iterable`).
- **Green run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/bilateral/bilateral-result-filter.ts src/app/pages/bilateral/bilateral-query-params.ts` → `Test Suites: 35 passed, 35 total` · `Tests: 1518 passed, 1518 total`.
- **Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` clean. `tsconfig.spec.json` has pre-existing errors (e.g. `as const` tuple in query-params spec, present at HEAD); none introduced by `group`.
- **Lint:** no ESLint flat config for plain `npx eslint`; used `npx ng lint --quiet --lint-file-patterns` on the 4 main files → all pass. The 4 compile-only files were not linted.
- **Disqualifier:** not triggered. `bilateral-projects-panel` and `my-draft-results` needed no change (`CNP-P-4` holds; Reviewer confirmed by reading both).
- **Reviewer verdict:** `STATUS: PASS`. The predicate follows design §5 rule for rule. There is one guard after the project guard (`CNP-DD-2` / §6.2). `group` mirrors the `scope` conventions. The truth table covers each of the 4 conditions failing alone, plus the string, number and boolean shapes.

#### ADVISORY (4R, non-gating)

- READABILITY: the header now says "Twelve keys", but `ContractKey` has 13 (the old "Eleven" was already stale after `scope`). The design's `CNP-DD-2` "(12)" miscounts too. Not a spec violation; recorded for the owner and `/akili-archive`.
- RISK (intermediate state): until T-3, the Overview's `params.set(parsed.params)` would let a pasted `?group=` narrow its cards. On the Results tab, a URL with `group` counts in `hasAnyContractParam` (it suppresses the W3+Lead default) while `group` is not applied yet. Nothing emits `group` yet. **T-1 must not be committed or shipped without T-3/T-4.**
- RELIABILITY: the `CNP-AC-5` cross-check (filter rows = aggregate count on a shared fixture) can only exist once T-2 adds the aggregate. → forward pointer to T-2.
- READABILITY: the spec title "is not emitted through explicitDefaults when set either: only the real value" contradicts its own assertion. Suggested rename: "emits the real value (not a token) under explicitDefaults".
- PROCESS: the lint command deviated (`ng lint --lint-file-patterns` instead of `npx eslint`), accepted as equivalent.

#### Forward pointers

- **→ CNP-T-2:** add the `CNP-AC-5` cross-check: same fixture, `updatedNoProjectCount === filterCenterResults(rows, { …, group: 'updated-no-project' }).length`.
- **→ CNP-T-3:** force `group: null` wherever the Overview sets `params` from the URL (already in T-3 scope; the RISK advisory above).
- **→ CNP-T-4:** wire the real `group` signal in `currentContractParams` (replace the compile-only `null`).
- **→ owner commit:** T-1 through T-4 ship together.

- **Decisions:** `UPDATED_INNOVATION_TYPE_IDS` is typed `readonly number[]` (not a tuple) so `.includes(Number(…))` compiles.
- **Issues:** none blocking.
- **Final verification:** green run above. Reviewer PASS.

### CNP-T-2 — Aggregate bucket + chart summary

- **Final status:** PASS
- **Date:** 2026-10-21
- **Attempts:** 1 Implementer, 1 Reviewer (review mode `checklist`). Ran in parallel with CNP-T-4 (different folders); Jest/tsc serialized with a shared lock dir.
- **Skills assigned:** `angular-developer`, `tdd`
- **Requirements covered:** `CNP-R-1` A (24 / 5, identity, no double count), `CNP-R-1` C (model level), `CNP-R-4`, `CNP-R-5` second bullet, `CNP-AC-1`, `CNP-AC-3` (model part), `CNP-AC-5` (cross-check), `CNP-DD-4` fixes 1-2

#### Attempt 1

- **Files changed (`pages/bilateral-overview/`):** `bilateral-overview.aggregate.ts` (imports the shared predicate; `updatedNoProject` counted and `continue`d before the `project_id == null` branch; `updatedNoProjectCount` on `OverviewByProjectModel`), `bilateral-overview.charts.ts` (summary sentence when n > 0), `bilateral-overview.aggregate.spec.ts`, `bilateral-overview.charts.spec.ts`. The fixture is built inline; `bilateral-overview.fixtures.ts` and `CLAUDE.md` are untouched.
- **Diff size:** 4 files, +~90 / −3.
- **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage bilateral-overview.aggregate.spec bilateral-overview.charts.spec` → 2 suites failed · 7 failed / 82 passed. The Reviewer confirmed all 7 failures are behavioral (`updatedNoProjectCount` undefined), not setup.
- **Green run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests <aggregate.ts> <charts.ts>` → `Test Suites: 25 passed, 25 total` · `Tests: 931 passed, 931 total`.
- **Typecheck / lint:** `tsc -p tsconfig.app.json --noEmit` clean. `ng lint --quiet --lint-file-patterns=<file>` (repeated `=` form) on the 4 files → all pass.
- **Identity spec (`CWS-AC-5`):** updated, not deleted: `barTotal + 5 + updatedNoProjectCount + 4 = 64`, count 0 for that fixture.
- **T-1 forward pointer closed:** `CNP-AC-5` cross-check: `updatedNoProjectCount === filterCenterResults(rows, { …defaults, group: 'updated-no-project' }).length` = 26, mixed numeric and string shapes.
- **Disqualifier:** not triggered. The identity holds without a double count.
- **Reviewer verdict:** `STATUS: PASS`. Single predicate import, bucket before the null branch, no row in both lines, `noProjectRow` null when empty, sentence matches design.md:91 word for word, identity spec updated.

#### ADVISORY (4R, non-gating)

- READABILITY: `CNP-AC-3` names the filter `type=[1]`; the filter-to-0 case uses `source: 'w1w2'` (scenario C allows any excluding filter). A `type: [1]` case would match the AC text.
- READABILITY: the last aggregate spec calls `run(rows)` twice; a `const` would be tidier.

- **Decisions:** none beyond spec.
- **Issues:** none.
- **Final verification:** green run above. Reviewer PASS.

### CNP-T-4 — Results tab reads `group` as a removable chip

- **Final status:** PASS
- **Date:** 2026-10-21
- **Attempts:** 1 Implementer, 1 Reviewer (review mode `checklist`). Ran in parallel with CNP-T-2, then CNP-T-3 (different folders); Jest/tsc serialized with the shared lock.
- **Skills assigned:** `angular-developer`, `tdd`
- **Requirements covered:** `CNP-R-2` A (Results side: chip and filtered rows), `CNP-R-2` B (removal clears URL and rows; not sticky), `CNP-AC-7`

#### Attempt 1

- **Files changed (`pages/bilateral-results-list/`):**
  - `bilateral-results-list.component.ts`:
    - New `group` signal, set by `applyUrlParams`. `currentContractParams` uses `group: this.group()`, which closes the T-1 forward pointer.
    - Chip "Updated innovations with no project". The `clearChip('group')` case and `clearAllFilters` both reset it. `hasActiveFilters` counts it via `activeChips`.
    - `BILATERAL_GROUP_QUERY_PARAM` added to `RESULTS_TAB_MANAGED_QUERY_PARAMS`. The stale "nine contract keys" comment now says "the contract keys" (no number).
    - Not in the fetch `combineLatest`.
  - `bilateral-results-list.component.spec.ts`: new `CNP-T-4` describe with 5 cases.
  - `CLAUDE.md`: "Overview group" section; `Verified:` re-stamped.
- **Diff size:** 3 files, +114 / −3.
- **Red run:** `-t CNP-T-4` before the component change → `Tests: 5 failed, 120 skipped, 125 total` (behavioral: row assertion `[1, 2]`).
- **Green run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` → `Test Suites: 21 passed, 21 total` · `Tests: 842 passed, 842 total`. On the first green run one new test had a wrong HTTP-count assertion; only the test was fixed.
- **Typecheck / lint:** `tsc -p tsconfig.app.json --noEmit` clean. `ng lint` on component + spec → pass.
- **Disqualifier:** not triggered (existing chip strip reused).
- **Reviewer verdict:** `STATUS: PASS`. Signal → `currentContractParams` → `filterCenterResults`. Exact chip label. Removal and Clear reset it and sync the URL. No extra fetch. Specs cover every falsifier. The key-count comment fix is accepted. The CLAUDE.md cap is a T-3 obligation, not T-4 (file was 176 lines at HEAD).

#### ADVISORY (4R, non-gating)

- RISK / docs: `bilateral-results-list/CLAUDE.md` is 185 lines (176 at HEAD) vs the COMPONENT-DOCS §4 hard cap of 120. **Pending item:** trim it in a separate docs change (candidates: BSC sort-key narrative in Columns, the PMF/BSF filter sections → Jira per §4(3)). Not folded into T-5.
- READABILITY: "never sticky" on the `group` signal holds only because it is re-derived from the URL; adding persistence later would break it silently. The CNP-R-2 B spec case guards it.
- RELIABILITY: the "unchanged default" case checks only request arguments, not rows or W3+Lead toggles; existing COV specs cover that path.
- Edge case (spec silent, documented in CLAUDE.md): a hand-typed bare `?group=…` without `role`/`source` skips the W3+Lead default, because `group` counts in `hasAnyContractParam`. The Overview link always carries `explicitDefaults` + `scope` (`resultsLinkParams`, verified by the Reviewer), so the real path is unaffected. Changing it would mean adding `group` to `RESULTS_TAB_IGNORE_KEYS` (shared contract), which is out of scope. Recorded for the owner.

- **Decisions:** the method is `clearChip` (the brief said `removeChip`). Removed the number from the key-count comment.
- **Issues:** none.
- **Final verification:** green run above. Reviewer PASS.

### CNP-T-3 — Overview line, link, label, `group` isolation

- **Final status:** PASS
- **Date:** 2026-10-21
- **Attempts:** 1 Implementer, 1 Reviewer (review mode `checklist`)
- **Skills assigned:** `angular-developer`, `spartan`, `tdd`
- **Requirements covered:**
  - `CNP-R-2`: line, link, filters/`scope`/`phase`, accessible name; no `group` on Reporting/Draft links; the Overview does not narrow.
  - `CNP-R-3`: hidden at 0, empty-state condition.
  - `CNP-R-5`: label.
  - ACs: `CNP-AC-3` (render), `CNP-AC-6`, `CNP-AC-8`.
  - Design: `CNP-DD-3`, `CNP-DD-4` fix 3.

#### Attempt 1

- **Files changed (`pages/bilateral-overview/`):**
  - `bilateral-overview.component.ts`:
    - `updatedNoProjectLabel` computed (fallback when the phase year is null, 0 or NaN).
    - `applyUrlParams` → `params.set({ ...parsed.params, group: null })`. It is the only URL→params path, which closes the T-1 forward pointer.
    - `deepLinkParams` adds `group: null`.
  - `bilateral-overview.component.html`:
    - New `<a data-testid="by-project-updated-no-project">` before the generic line. It copies the generic line's classes, puts the count in `font-mono tabular-nums`, and uses `resultsLinkParams({ group: 'updated-no-project' })`.
    - aria-label `{label}, {n} results — open in Results`. Rendered only when count > 0.
    - The empty-state `@if` gains `!model().byProject.updatedNoProjectCount`.
  - `bilateral-overview.component.spec.ts`: 8 new cases.
  - `CLAUDE.md`: invariant (new line; the Overview ignores `group`), 375 px left to T-5, `Verified:` re-stamped (prior kept), trimmed 123 → 120 lines.
- **Diff size:** 4 files, +165 / −27 (CLAUDE.md trim included).
- **Red run:** `npx jest --maxWorkers=2 --silent --no-coverage bilateral-overview.component.spec` → 6 failed / 38 passed. All failures are behavioral: line null, label "", fallback "", `by-project-empty` present, Total narrowed 25 → 24 on `?group=` (navigation and cold load). The 2 guard cases pass before the change, as expected.
- **Green run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests bilateral-overview.component.ts` → `Test Suites: 21 passed, 21 total` · `Tests: 761 passed, 761 total`.
- **Typecheck / lint:** `tsc -p tsconfig.app.json --noEmit` exit 0. `ng lint` on .ts/.html/.spec → pass.
- **Disqualifier:** not triggered (classes copied token for token; no new layout).
- **Reviewer verdict:** `STATUS: PASS`.
  - Every falsifier clause is specced and the label is exact.
  - The link carries `group` + `scope` + `phase`. `deepLinkParams` can never carry `group`.
  - The Overview ignores `group` on both cold load and navigation.
  - Hidden at 0; empty-state updated; CLAUDE.md at exactly 120 lines with no invariant lost.
  - The `text-[12px]` DoD wording is adjudicated as px-arbitrary house style (`onecgiar-pr-client/CLAUDE.md` §5 bans rem utilities).

#### ADVISORY (4R, non-gating)

- RELIABILITY: `group: null` in `deepLinkParams` is defense in depth that no test isolates. Every spec reaches it with `params().group` already null. A case that sets `params` with a group and asserts the `deepLinkParams()` output would pin it.
- READABILITY: the aria-label is concatenated in the template in hard-coded English (same as the generic line). A computed would centralize it if i18n lands.
- NOTE: `group` is not in `OVERVIEW_MANAGED_QUERY_PARAMS`, so a pasted `?group=updated-no-project` stays in the Overview URL but is ignored (`CNP-DD-3`). `?group=foo` is stripped by the existing rewrite.

- **Decisions:** visible order is count then label, mirroring the generic line.
- **Issues:** none. No Cypress or visual run; the 375 px fit belongs to CNP-T-5.
- **Final verification:** green run above. Reviewer PASS.

## 3. Summary (code tasks complete — CNP-T-5 pending, HITL)

| Task | Result | Attempts | Green run |
|---|---|---|---|
| CNP-T-1 | PASS | 1 | 35 suites / 1518 tests |
| CNP-T-2 | PASS | 1 | 25 suites / 931 tests |
| CNP-T-4 | PASS | 1 | 21 suites / 842 tests |
| CNP-T-3 | PASS | 1 | 21 suites / 761 tests |
| CNP-T-5 | pending (owner commit + PRTest deploy) | — | — |

- **Budget:** 5 tasks (as planned) · ≈ 530 lines changed incl. tests and CLAUDE.md edits vs ~300 LOC estimate. Production code is ≈ 110 lines, as estimated; the overrun is tests and docs. 0 rework rounds (budget ≤ 2 per task).
- **Pending items for the owner / archive:**
  1. Commit T-1 through T-4 together (T-1 alone leaves `group` half-wired).
  2. `bilateral-results-list/CLAUDE.md` is 185 lines vs the 120 cap (pre-existing at 176) → separate docs trim.
  3. "Twelve keys" header comment in `bilateral-query-params.ts` and design `CNP-DD-2` "(12)": the real count is 13.
  4. A bare hand-typed `?group=` on Results skips the W3+Lead default (spec silent).
  5. Optional test hardening from the advisories (`type:[1]` filter-to-0 case, isolated `deepLinkParams` group case).
