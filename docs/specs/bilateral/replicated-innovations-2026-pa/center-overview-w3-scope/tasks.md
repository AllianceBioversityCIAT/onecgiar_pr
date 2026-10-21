# Tasks — Center Overview counts W3/bilateral reporting only

## 1. Scope of this task list

- **Module / feature:** `bilateral` · center Overview W3 scope (INC-165171)
- **Linked spec:** `requirements.md` (`CWS-R-1..8`) + `design.md` (`CWS-DD-1..7`)
- **Owner / driver:** Santiago Sanchez
- **Status:** in-progress
- **Branch:** `qa-development-2026-ss` directly (owner decision 2026-10-21, overrides "from `staging`": CRK is not in staging yet and shares `bilateral-results-list.component.ts`)
- **Budget (design §1):** 6 tasks (4 code + 2 HITL checks) · ~400 LOC incl. tests · ≤ 2 review rounds per task

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved.
- [x] `CWS-T-1` done: the all-center count is 0 (2026-10-21, `execution.md`).
- [ ] Open questions: `CWS-OQ-1` and `CWS-OQ-3` have defaults (63; keep the line). Nicoleta's confirmation is **not** blocking.
- [ ] No migration in this spec (`migration:check` not needed).
- [ ] Test runs: one at a time, `--maxWorkers=2`, `--findRelatedTests` on changed files. Never the full suite.

## 3. Task list

### `CWS-T-1` — Pre-check: replicated W1/W2 on a center project, all centers + CIP baseline ✅ done 2026-10-21 (see `execution.md`)

- **Type:** rollout (HITL: the user runs the queries; agents do not connect to the DB)
- **Description:** Before any code, the user runs two read-only queries, provided inline in chat:
  - (a) For every center, the count of active replicated `Result` rows in Reporting 2026 that tag a project owned by that center. This tests `CWS-DD-2` / `P-3`.
  - (b) The CIP baseline per `overview_category`, to compare after the deploy.
  - Record the result in `execution.md`.
- **Implements:** `CWS-OQ-2`, `CWS-R-1` rule "keep the current category precedence", design `P-3`
- **Files (expected):** `execution.md` (this spec)
- **Depends on:** —
- **Blocks:** `CWS-T-2`
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** query (a) returns > 0 for any center. Then `CWS-DD-2` drops rows that match Nicoleta's category 3.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if (a) > 0, stop and ask the owner: reorder the precedence (reopen `CWS-DD-2`), or accept and document. Do not start `CWS-T-2` on a guess.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Both counts recorded with date and the literals used (center code, version id 8).
  - [ ] Decision recorded if (a) > 0.

### `CWS-T-2` — Server: `scope=bilateral` on `bilateral-center-results` ✅ done 2026-10-21 (see `execution.md`)

- **Type:** server
- **Description:**
  - The controller reads `scope`, and only the exact value `bilateral` sets the flag. It adds `@ApiQuery` docs and updates the operation description.
  - The service passes the flag through.
  - In the repository, the flag turns the tagging rows on and binds a second flag. That flag adds the category predicate next to the `CASE` (W3, or a non-replicated `Result` in `tagged`), with a comment tying the two together.
  - When the flag is off, the unscoped SQL and parameters keep their current behavior.
- **Implements:** `CWS-R-1` (Scenarios A, B, C; rules: center-on-result, precedence, unknown value), `CWS-AC-1`, `CWS-AC-2`, `CWS-DD-1..4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/results.controller.ts`, `results.service.ts`, `result.repository.ts`, `result.repository.spec.ts` (+ the controller/service spec if one covers this method)
- **Depends on:** `CWS-T-1`
- **Blocks:** `CWS-T-6`
- **Estimate:** M
- **Review:** full (shared endpoint with 3 consumers)
- **Verification:**
  - **Falsifier:**
    - A repository spec that calls the method with the scope must see the predicate flag bound to 1 and the tagging flag bound to 1.
    - The unscoped call must see the predicate flag bound to 0.
    - The `includeProjectTagging`-only call must see the tagging flag at 1 and the predicate flag at 0.
    - The controller with `scope=foo` must pass `false`.
    - Any of these failing means the task is wrong.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --findRelatedTests src/api/results/result.repository.ts src/api/results/results.controller.ts src/api/results/results.service.ts --silent`. The new assertions fail before the change and pass after.
  - **Disqualifier:** if the predicate cannot be expressed without duplicating the `tagged` CTE, or without changing the unscoped SQL text, stop and re-design. `CWS-R-1` C must hold.
  - **What the spec cannot prove:** that MySQL returns 63 rows for CIP. The spec asserts SQL shape and parameters only. The real count is checked in `CWS-T-6` (compared with the `CWS-T-1` baseline).
  - **Consumers:** `bilateral-results-list.component.ts`, `centers-block.component.ts`, `bilateral-overview.service.ts` (all through `GET_bilateralCenterResults`). None changes behavior without the param.
- **Definition of done:**
  - [ ] `npx eslint` on the 3 files clean.
  - [ ] Swagger `@ApiQuery` for `scope`.
  - [ ] No bilateral payload change (`bilateral-result-summaries.en.md` untouched, as intended).

### `CWS-T-3` — Client contract: `scope` key + API options ✅ done 2026-10-21 (see `execution.md`)

- **Type:** client
- **Description:**
  - `bilateral-query-params.ts`: `BILATERAL_SCOPE_QUERY_PARAM`, value `bilateral`, `scope` in `BilateralQueryParams` and `ContractKey`. An unknown value becomes `null` and goes into `stripped`. It is serialized only when non-null, and never by `explicitDefaults`.
  - `bilateral-api.service.ts`: `GET_bilateralCenterResults(centerId, versionId, options?)` with `{ includeProjectTagging?, scope? }`.
  - Update every caller and every spec that builds a `BilateralQueryParams` literal.
- **Implements:** `CWS-R-7` rules (one shared definition; unknown value = unscoped), `CWS-AC-6`, design §6.2 rows 1–2
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-query-params.ts` (+ spec), `shared/services/api/bilateral-api.service.ts` (+ spec), plus any place that builds a full `BilateralQueryParams` object (find them with the type checker)
- **Depends on:** —
- **Blocks:** `CWS-T-4`, `CWS-T-5`
- **Estimate:** S
- **Review:** full (shared contract used by 4 tabs)
- **Verification:**
  - **Falsifier:**
    - `?scope=bilateral` must parse to `'bilateral'` and serialize back.
    - `?scope=x` must parse to `null` with `stripped` containing `scope=x`.
    - Serializing `scope: null` with `explicitDefaults: true` must emit no `scope` key.
    - The API call with `{ scope: 'bilateral' }` must hit `…&scope=bilateral` with no `includeProjectTagging`.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --findRelatedTests src/app/pages/bilateral/bilateral-query-params.ts src/app/shared/services/api/bilateral-api.service.ts`
  - **Disqualifier:** if adding the field forces behavior changes in the Reporting or Draft tabs (beyond type-only edits), stop. `CWS-DD-5` says those tabs ignore the key.
  - **Consumers:** every importer of `BilateralQueryParams` / `serializeBilateralQueryParams` / `GET_bilateralCenterResults`. They are listed by `--findRelatedTests` and must all stay green.
- **Definition of done:**
  - [ ] `npx tsc -p tsconfig.app.json --noEmit` (or the project's type check) clean.
  - [ ] `npx eslint` on the touched files clean.

### `CWS-T-4` — Overview: scoped rows, 3 categories, Projects covered by new rows ✅ done 2026-10-21 (see `execution.md`)

- **Type:** client
- **Description:**
  - The service requests `{ scope: 'bilateral' }`.
  - Aggregate:
    - the display list has 3 categories;
    - `allW1W2` is removed;
    - covered means at least one new row, and `notStartedProjectIds` uses the same rule;
    - the bars still include every project with any scoped row.
  - Component:
    - the copy for the 3 lines and their aria label;
    - `deepLinkParams` adds `scope` only on Results links;
    - the no-project link becomes `{ project: [], source: 'w3' }`;
    - the Projects covered sub-lines read "n projects with no new result yet" and "n with only replicated updates (not counted)";
    - the strip is retitled "No new results yet".
  - Update the fixtures (string ids kept), the Cypress CT stub, and `bilateral-overview/CLAUDE.md`. The invariant becomes 3 categories and the known `includeProjectTagging` gap is marked closed by `CWS-R-8`.
- **Implements:** `CWS-R-2` (no card counts removed groups; AI drafts unchanged), `CWS-R-3` (3 lines in order, sum, aria, no removed labels), `CWS-R-4` (Total identity, tile split, Needs attention), `CWS-R-5` A + B, `CWS-R-6` (bars stacked, no-project W3-only, sums, no `source=w1w2`), `CWS-R-8` (Results links carry scope; Reporting/Draft do not; no-project link `source=w3`), `CWS-AC-3`, `-4`, `-5`, `-8`, `CWS-DD-5..7`
- **Files (expected):** `pages/bilateral/services/bilateral-overview.service.ts` (+ spec), `pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts` (+ spec), `bilateral-overview.component.ts` / `.html` (+ spec), `bilateral-overview.charts.ts` (+ spec, only if it reads the category list), `bilateral-overview.fixtures.ts`, `bilateral-overview.cy.ts` (stub only), `bilateral-overview/CLAUDE.md`
- **Depends on:** `CWS-T-3`
- **Blocks:** `CWS-T-6`
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** an aggregate spec with a fixture of 63 `replicated_w3` rows (54 on 5 center projects, 5 with no project, 4 on another center's project), N = 57, plus 1 `new_w3` on project P must yield:
    - Total 64, with lines 63 / 1 / 0;
    - Projects covered 1 of 57, with 4 only replicated;
    - No new results yet = 56;
    - the no-project line at 5;
    - unmatched at 4;
    - tiles + QA/Submitted + Discontinued = 64.
    - Separately, a component spec must find `scope=bilateral` on the Total and tile links, and must **not** find it on the Projects covered (Reporting) link or the AI-drafts link.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --findRelatedTests <every changed file above>`. Before the change, the aggregate case yields Projects covered 5 and 5 lines, so it fails.
  - **Disqualifier:**
    - If a green run needs the aggregate to drop rows by category (client-side hiding), stop. The server is the filter (`CWS-R-7` BUT).
    - If the projects-panel spec breaks, stop. `P-3` was wrong, so re-check `CWS-T-1`.
  - **What these specs cannot prove:** layout and visual state of the Total card, and live reconciliation. Those go to `CWS-T-6`.
  - **Consumers:** `bilateral-projects-panel.component.ts` (same cache), `bilateral-manual-create-flow.service.ts` and `results-api.service.ts` (invalidate only). Their specs run via `--findRelatedTests`.
- **Definition of done:**
  - [ ] `npx eslint <touched files> --quiet` clean.
  - [ ] No hard-coded 5-category list left (grep `replicated_w1w2` / `w1w2_center_only` in `bilateral-overview/`: only the wire type and the server-side comment may remain).
  - [ ] `CLAUDE.md` invariants and the "Verified" line updated.

### `CWS-T-5` — Results tab: scoped fetch + scope chip ✅ done 2026-10-21 (see `execution.md`)

- **Type:** client
- **Description:**
  - `applyUrlParams` sets a `scope` signal.
  - The fetch `combineLatest` includes it (distinct) and passes `{ scope }` on each phase request.
  - The chip dimension is `'scope'`, labeled "Scope: Bilateral reporting (Overview)". Removing it clears the signal and writes the URL without the key, which triggers an unscoped refetch.
  - `hasActiveFilters` counts it.
  - The default W3 + Lead behavior without the key is unchanged.
- **Implements:** `CWS-R-7` A (scoped fetch per phase, chip, removal refetch), `CWS-R-7` B (unchanged without the key; not sticky after removal or a navigation without it), `CWS-R-7` BUT (no client-side hiding), `CWS-AC-7`
- **Files (expected):** `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` (+ `.html` if chips are rendered by dimension there, + spec)
- **Depends on:** `CWS-T-3`
- **Blocks:** `CWS-T-6`
- **Estimate:** M
- **Review:** checklist
- **Parallel:** may run alongside `CWS-T-4` (disjoint files). **Only one Jest run at a time on the machine.**
- **Verification:**
  - **Falsifier:**
    - With URL `?phase=8&scope=bilateral&role=all&source=all`, the spy on `GET_bilateralCenterResults` must receive `{ scope: 'bilateral' }`, and the chip list must contain the scope chip.
    - After `removeChip(scope)`, the next request must have no scope, and the URL must lack the key.
    - With URL `?phase=8` only, the request must be byte-identical to today's (no options), and W3 + Lead must still apply.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --findRelatedTests src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - **Disqualifier:** if CRK's in-flight changes to this file conflict, rebase on `staging` first. Do not merge by hand inside this task.
  - **Consumers:** none (no shared symbol changed). The chip type is local to the component.
- **Definition of done:**
  - [ ] `npx eslint <touched files> --quiet` clean.
  - [ ] The chip is reachable by keyboard and has an accessible remove label, like the other chips.

### `CWS-T-6` — Live check on PRTest + family bookkeeping

- **Type:** rollout (HITL)
- **Description:**
  - After deploying to PRTest (performance-refactor, ~30 min), the user opens the CIP Overview and one center with `w1w2_tagging` rows (IITA).
  - For each Results-linked figure (Total, the 4 tiles, the Needs attention rows, 2 project bars), they compare the figure with the Results visible count.
  - They also look at the Total card and the chip.
  - Then they compare CIP numbers with the `CWS-T-1` baseline (expected 63 / 0 / 0, 0 of 57).
  - Finally, update `family.md` (child #3 status) and leave a note in child #2's proposal that its §3 premise changed.
  - **Read-only in the browser:** never click write buttons (memory: the local stack and PRTest write to shared DBs).
- **Implements:** `CWS-AC-9`, `CWS-R-8` "hold on a center with tagging rows", `requirements.md` §9 visual row, `CWS-DEP-1` (proposal)
- **Files (expected):** `execution.md`, `family.md`, `center-overview-no-project-line/proposal.md` (note only)
- **Depends on:** `CWS-T-2`, `CWS-T-4`, `CWS-T-5`
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** any linked figure ≠ the Results visible count, or the CIP Total ≠ the `CWS-T-1` `replicated_w3 + new_w3 + w1w2_tagging`.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** the check is **not evidence** if PRTest is not serving the commit (check the bundle or commit hash first), or if data changed between `CWS-T-1` and the check. In that case, re-run `CWS-T-1` (b) the same day and compare with that.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Figures and counts recorded per center in `execution.md`.
  - [ ] `family.md` updated; child #2 note added.

## 4. Dependency graph

```
CWS-T-1 (HITL pre-check)
   └── CWS-T-2 (server) ─────────────┐
CWS-T-3 (contract + API options)      │
   ├── CWS-T-4 (Overview) ───────────┤   T-4 ∥ T-5: parallel, one Jest run at a time
   └── CWS-T-5 (Results tab) ────────┤
                                     └── CWS-T-6 (PRTest live check, HITL)
```

`CWS-T-2` and `CWS-T-3` are independent (server vs client) and can run in parallel.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `CWS-TEST-1` | unit (server) | `CWS-R-1`, `CWS-AC-1`, `-2` | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` (+ controller spec) |
| `CWS-TEST-2` | unit (client) | `CWS-R-7` rules, `CWS-AC-6` | `bilateral-query-params.spec.ts`, `bilateral-api.service.spec.ts` |
| `CWS-TEST-3` | unit (client) | `CWS-R-2..6`, `CWS-AC-3..5` | `bilateral-overview.aggregate.spec.ts`, `bilateral-overview.service.spec.ts` |
| `CWS-TEST-4` | unit (client, DOM) | `CWS-R-3`, `CWS-R-8`, `CWS-AC-8` | `bilateral-overview.component.spec.ts` |
| `CWS-TEST-5` | unit (client, DOM) | `CWS-R-7` A, B, `CWS-AC-7` | `bilateral-results-list.component.spec.ts` |
| `CWS-TEST-6` | HITL live | `CWS-AC-9`, visual | PRTest, recorded in `execution.md` |

## 6. Clause coverage (scenario / BUT / AND IT MUST)

| Clause | Owner |
|---|---|
| R-1 A: 63 rows, fields kept, BUT no removed categories | T-2 (shape), T-6 (count) |
| R-1 B: tagging rows without a separate flag | T-2 |
| R-1 C: unscoped unchanged; AND IT MUST for Results tab + Centers block | T-2 (SQL/params), T-5 (Results request unchanged without key) |
| R-1 rule: center on the result | T-2 (no ownership condition), T-6 (CIP 63) |
| R-1 rule: precedence kept | T-1 (data), T-2 |
| R-1 BUT: unknown scope value | T-2 (server), T-3 (client parse) |
| R-2: no removed rows in any card; none received; BUT AI drafts unchanged | T-4 (aggregate + service), T-2 (not sent) |
| R-3: 3 lines in order, sum, aria; BUT no removed labels | T-4 |
| R-4: Total identity; tile split; Needs attention = tiles | T-4 |
| R-5 A: 0 of 57 + only-replicated line | T-4, T-6 |
| R-5 B: strip = N − X; AND IT MUST same calculation | T-4 |
| R-6: bars stacked; no-project W3-only (5); other centers 4; sums; BUT no `source=w1w2` | T-4, T-6 |
| R-7 A: scoped fetch per phase, chip, removal → unscoped | T-5 |
| R-7 B: unchanged without key; BUT not sticky | T-5 |
| R-7 AND IT MUST: one shared definition | T-3 |
| R-7 BUT: no client-side hiding | T-4 (disqualifier), T-5 |
| R-8: Results links reconcile | T-4 (params), T-6 (live) |
| R-8 AND IT MUST: center with tagging rows | T-6 |
| R-8 AND: no-project link `scope` + `source=w3`, not reconciling | T-4 |
| R-8 BUT: Reporting / Draft links without `scope` | T-4 |
| §9 visual / live defect classes | T-6 |

## 7. Estimated size

| Task | LOC (code + tests) |
|---|---|
| T-1 | 0 (records only) |
| T-2 | ~90 |
| T-3 | ~60 |
| T-4 | ~170 |
| T-5 | ~80 |
| T-6 | 0 (records only) |
| **Total** | **~400** |
