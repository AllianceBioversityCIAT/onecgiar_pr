# Execution — Results detail filters and rejection reason in the Portfolio Overview export

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-rejection-reason-export` |
| Ticket | SR-168253 |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (started at `385d46e44`) |
| Leader | Claude Code session (opus, T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` (T2) / `akili-reviewer.md` (T3) |
| Started | 2026-11-17 |
| Budget (design §12) | 4 tasks · ≈ 530 LOC · 6 review rounds |

### Pre-flight (Leader, 2026-11-17)

- `git log HEAD..origin/staging`: 1 commit (`262dfcf38`, admin-reminders) — it touches no `results-detail` / `result-dimensions` / `results-framework-reporting` path. Last commits on staging for those paths are all already in this branch. → tasks.md §2 last pre-flight item satisfied.
- `akili doctor --agents`: implementer, reviewer, tester sections current; **leader `primary-instructions` OUTDATED (matched 2.36.0)**. Not fixed here (shared-file write discipline: `.agents/` edits belong on `staging`); reported to the user. Worker personas are current, so the briefs carry no compensating rule.
- `docs/specs/kaizen-log.md`: absent — no Active Lessons to carry.
- Wave 1: PRE-T-1 (server) and PRE-T-3 (client) run in parallel — disjoint package trees, no shared build output, ports, or dependency tree.

## 2. Task Execution History

### PRE-T-1 — Server: `rejections` on `portfolio/result-dimensions` — PASS

| Field | Value |
|---|---|
| Final status | PASS (attempt 1) |
| Date | 2026-11-17 |
| Attempts | 1 |
| Skills | `nestjs-expert`, `api-design-principles` (as listed; no deviation) |
| Effort | medium |
| Requirements covered | PRE-R-8 (all clauses), PRE-R-7 data side, DD-1, DD-2, DD-3, DD-7, DD-9 |

**Attempt 1**

- Files changed: `onecgiar-pr-server/src/api/results/result.repository.ts` (+35/−7), `result.repository.spec.ts` (+41/−2), `results-framework-reporting/results-framework-reporting.service.ts` (+14), `results-framework-reporting.service.spec.ts` (+62), `dto/portfolio-result-dimensions.dto.ts` (+41), `results-framework-reporting.controller.ts` (+1/−1).
- Red run (spec cases written first, before the code existed), as reported:
  ```
  Test Suites: 2 failed, 2 total
  Tests:       5 failed, 214 skipped, 11 passed, 230 total
  ```
  (`--reporters=summary` printed no test names; the Reviewer matched the 5 failures to the new `rejections` assertions.)
- Green: `npx jest src/api/results-framework-reporting src/api/results/result.repository.spec.ts --silent --reporters=summary --forceExit` → `Test Suites: 3 failed, 40 passed, 43 total` / `Tests: 679 passed, 679 total`. The 3 failed suites **fail to load** (0 tests): `contributors-partners.module.spec.ts`, `create-result-from-framework.provenance.spec.ts`, `results-framework-reporting.module.spec.ts`.
  - Leader probe of the load failure: `node --version` → `v26.13.1`; `node -e "console.log(typeof require('buffer').SlowBuffer)"` → `undefined`; `node_modules/buffer-equal-constant-time/index.js` reads `SlowBuffer.prototype.equal` at import time (pulled in by `@nestjs/jwt`). → **Environment fault (Node 26 removed `SlowBuffer`)**, independent of this diff: the failure is raised while importing `node_modules`, before any changed code runs. Not fixed here (out of scope); flagged for the user.
- `npx tsc --noEmit -p tsconfig.json` → no output (clean). `npx eslint "src/api/results-framework-reporting/**/*.ts" src/api/results/result.repository.ts --quiet` → no output (clean).
- Falsifier (executed against post-change code, reverted after):
  1. service `programCode: row.initiative_code ?? ''` → service spec `Tests: 1 failed, 131 skipped, 5 passed, 137 total`.
  2. SQL `IN ('REJECT')` (dropped `'REJECTED'`) → repository spec `Tests: 1 failed, 83 skipped, 9 passed, 93 total`.
- Consumers run: `results-framework-reporting.controller.spec.ts`, `results-framework-reporting.service.spec.ts`, `result.repository.spec.ts`, all green inside the run above. Existing repository spec: "exactly four statements" became five; the return `toEqual` gained `rejections`.
- Evidence re-run (Leader inline, non-author): same jest command → `Test Suites: 3 failed, 40 passed, 43 total` / `Tests: 679 passed, 679 total` (same 3 load failures) → **VERIFIED**.
- Reviewer (akili-reviewer, T3, high, lens checklist): **PASS**. Scope equals `projectLinksSql` + `r.status_id = 7`; newest record via correlated sub-select `created_at DESC, id DESC LIMIT 1` over `REJECT`/`REJECTED`; `INNER JOIN` on the history row, so a Rejected result with no record is left out (design §6); `LEFT JOIN clarisa_initiatives` keeps a null SP; column names match the entities (P-4 settled); `DATE_FORMAT(..., '%Y-%m-%d')` (DD-7); no comment logged; catch, guard untouched; Swagger sentence present; `[7]` in the spec is the fixture's `versionId`, status 7 is a SQL literal.
- runtime events: none.

**ADVISORY (4R, non-gating):**
- Readability/Risk: repository spec uses `versionId = 7`, equal to the Rejected status id; `params toEqual([7])` cannot tell a bound versionId from a bound status (the `toContain('r.version_id = ?')` assertion mostly covers it). A value such as 42 would remove the doubt.
- Resilience/Performance: the correlated sub-select runs once per Rejected result; its cost depends on an index on `result_review_history.result_id`. Check in the PRE-T-4 p95 measurement.
- Reliability: `DATE_FORMAT` on a timestamp uses the DB session time zone; the day could differ from the notice if the notice formats in the browser zone. Note it in the PRE-T-4 comparison.

- spawns: implementer 53 calls, 175,546 tokens, ended complete; reviewer 12 calls, 91,392 tokens, ended complete.
- Decisions: none beyond the design. Issues: the Node 26 suite-load fault above. The tree also holds **unattributed** uncommitted changes in `onecgiar-pr-server/src/api/bilateral/bilateral.service{,.spec}.ts` (sub-national geo resolution, matching the untracked spec `docs/specs/bugfix/ai-draft-subnational-geo/`), written 2026-11-17 22:32 by neither Implementer of this run. Left untouched and excluded from every commit of this spec (pathspec commits only).
- Running totals vs budget: tasks 1/4 · LOC ≈ 204 (194 added, 10 removed; tests included) / 530 · review rounds 1/6. Within budget.
- Final verification: green, apart from the environment load fault above.

### Spec tension: PRE-R-5 vs the R-9 mount rule (found in PRE-T-3, 2026-11-17)

- **Tension.** PRE-R-5 says Filters is "enabled again once the filters resolve, including when the filtered list is empty (so the admin can widen it)", and design §8.5 says "Empty filtered list → Enabled". But the page mounts Results detail only when `hasFigures() && (data.filteredTotal() > 0 || data.filtersPending())` (`portfolio-overview.component.html:375`; page `CLAUDE.md` *Mount rule*, documented as deliberate under FDE R-9). With a global selection that yields 0 rows, the whole block, including the Filters button, is unmounted. The design's premise P-5 cited the `hasFigures()` gate but missed the `filteredTotal()` half.
- **Options.** (A) Change the mount rule so the block stays mounted at 0 rows. That reverts delivered, deliberate behavior (FDE R-9), adds scope no approved task names, and puts an empty table where the no-match panel now sits. (B) Keep the mount rule and read "the filtered list is empty" as the table's own empty state (search with no match), where the button stays enabled.
- **Decision: (B).** The owner delegated decisions for this run (2026-11-17: "toma decisiones tú mismo"). This is the smallest change that keeps the requirement's purpose ("so the admin can widen it"). At 0 global results the no-match panel (`portfolio-no-match`, Clear all) and the top filter bar already widen the selection, and the no-match panel sits higher on the page than the table. No delivered behavior is reverted.
- **Spec edits (execute-time, recorded at the moment made):** `requirements.md` §6 PRE-R-5, an amendment note under the "Filters pending" scenario. `design.md` §8.5, a new row "0 results for the global selection" plus an amendment note. Both are carried as a named conformance check into the PRE-T-3 Reviewer brief and the next task's (PRE-T-2) Reviewer brief.
- **Owner follow-up:** if you prefer (A), it is a separate small change to the mount rule and the page `CLAUDE.md`; this spec does not do it.

### PRE-T-3 — Client: Filters dropdown in the Results detail toolbar — PASS (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-11-17 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, `impeccable-bridge` (as listed) |
| Effort | attempt 1 medium; attempt 2 high (bump after FAIL) |
| Requirements | PRE-R-1..6, DD-4, DD-5 |

**Attempt 1 — FAIL**

- Files changed (client): `components/detail-filters/detail-filters.component.{ts,html,spec.ts}` (new, +81/+88/+136), `components/results-detail/results-detail.component.html` (+2), `portfolio-overview.component.html` (+12/−1), `portfolio-overview.component.ts` (+2), `portfolio-overview.component.spec.ts` (+87), page `CLAUDE.md` (+2/−1, one bullet + Verified stamp, 120 lines, at the cap), `src/app/internationalization/portfolio-overview.copy.ts` (+9).
- Local environment changes by the Implementer (outside the diff, local only): `npm ci --ignore-scripts` in `onecgiar-pr-client` (`node_modules` was absent; 19 min); `node_modules/canvas` renamed to `.canvas.disabled` (no prebuilt binary for Node 26, jsdom crashed); stub gitignored `src/environments/environment.ts` and `environment.prod.ts` created (no secrets) so Jest can resolve them.
- Verification: `npx jest src/app/pages/result-framework-reporting/pages/portfolio-overview --silent --reporters=summary --no-coverage` → 23 suites passed, 639 tests passed; `npx tsc --noEmit -p tsconfig.app.json` exit 0; `npx ng lint --quiet` → "All files pass linting."
- Red run (partial; Jest could not run before `npm ci` finished, so the first run was against finished code): component moved aside → `Test Suites: 1 failed, 1 total / Tests: 0 total`. First assertion failures: `● PortfolioDetailFiltersComponent (PRE-T-3) › disabled blocks opening (PRE-R-5)` — `expect(received).toBeNull()` (spec fixed: the Brain popover mock renders inline); `● … › Escape closes the panel and focus returns to the trigger (PRE-R-6)` — `Expected: "false" Received: "true"` (component gained `(keydown.escape)="closeAndRestore(trigger)"`).
- Falsifier: (a) Clear as `data.clearAll()` → `● … › PRE-R-3: Clear empties Funding and Status but keeps Program = SP01 / - Expected - 3 / + Received + 1 / Tests: 1 failed, 72 skipped, 6 passed`. (b) `(toggled)` no-op (simulating local-copy state) → 2 failed (the two PRE-R-2 tick cases). (c) not run: `disabled` is bound to `data.filtersPending()` at page level and `listed()` is private to results-detail; the empty-list case is covered by a passing test (search no-match → button enabled). Reviewer accepted the reason.
- Evidence re-run (Leader inline): same three commands → 23 suites / 639 tests passed, tsc exit 0, "All files pass linting." → **VERIFIED**.
- Reviewer (akili-reviewer, T3, high): **FAIL** — verbatim:

  > STATUS: FAIL
  > SUMMARY: The wiring and the state handling match the spec. Checks 1, 2 and 4 hold: there is no filter state outside the service, `open` is the only signal, Clear calls `clearDimension` twice and never `clearAll`, only Funding and Status are shown, the ARIA attributes are present, the slot sits between Search and Export, and the `detail-search` / `detail-export` ids are untouched. The mount rule in `portfolio-overview.component.html` did not change, and PRE-R-5 / §8.5 are met as amended. The page `CLAUDE.md` edit is accurate and the file stays at 120 lines, within the cap. Two things fail: one real visual defect that jsdom cannot see, and two PRE-R clauses with no named test case, which the Definition of done requires. The red run is acceptable. Escape failed on a behavioral assertion. Falsifiers (a) and (b) went red, and the reason given for skipping (c) holds. Mode: full checklist plus four lenses, effort high.
  >
  > ISSUES:
  > 1. **Discovered Issue:** `detail-filters.component.ts` never imports the Helm button directive. Its `imports` list is `[HlmPopover, HlmPopoverContent, HlmPopoverPortal, ...BrnCommandImports, NgIcon]`. The directive's selector is `button[hlmBtn]` (`src/app/spartan/button/src/lib/hlm-button.ts:60`), so in a standalone component `hlmBtn variant="outline"` (trigger) and `hlmBtn variant="ghost" size="sm"` (Clear) are just plain attributes. In the real app both render as bare buttons with Tailwind's base reset: no outline border, no height or padding, no ghost hover. Jest, `tsc`, lint and `ng build` all pass anyway, because an unknown static attribute is not an error. `results-detail.component.ts:59` imports `HlmButtonImports` for its Export button, and the new component does not.
  >    * **Violated Rule:** `design.md` §8.1 Trigger row: "Outline button styled like the `hlmBtn variant="outline"` Export button". The task's Scope line (match the existing top-bar multi-select, existing tokens) also applies.
  >    * **Remediation Suggestion:** Add `HlmButtonImports` from `@spartan/button` to the component's `imports`. If the Brain/Helm Jest mock needs it, check that the spec still mounts. Optionally add one spec assertion that the trigger carries the Helm button classes, or note in the T-4 browser checks that the button looks like Export.
  >
  > 2. **Discovered Issue:** Two PRE-R clauses have no named test case, although the Definition of done says "Every PRE-R-1..6 clause maps to a named spec case":
  >    (a) PRE-R-5: "AND IT MUST be enabled again once the filters resolve". The pending test leaves the `dimensions$` Subject pending and only asserts `disabled`. The empty-list test covers a different state.
  >    (b) PRE-R-2 "Tick from the table": "the KPI deck, the blocks and the table update together" and "the table count equals the KPI total (FDE S-2.1 stays true)". No test ticks a value from the panel and then checks the deck or the table count.
  >    * **Violated Rule:** `tasks.md` PRE-T-3, Definition of done, first bullet. `requirements.md` §6 PRE-R-5 (Filters pending) and PRE-R-2 (Tick from the table).
  >    * **Remediation Suggestion:** For (a), in the PRE-R-5 page test, emit and complete the `dimensions$` Subject, refresh, and assert the trigger is enabled. For (b), after `pick('funding','bilateral')` and `pick('status','rejected')`, assert that the detail count or the listed rows equal `component.data.kpiTotals().totalResults`, and that it changed from the unfiltered value.
  >
  > ADVISORY:
  > - Readability: the component test is titled "exposes dialog semantics" but asserts `aria-haspopup="listbox"`. The value matches the exemplar, so rename the test, not the attribute.
  > - Reliability: the explicit `(keydown.escape)="closeAndRestore(trigger)"` on `brnCommand` is acceptable. It goes beyond the Brain-inherited keyboard in §8.1, it is harmless if the overlay also closes and restores focus, and it guarantees PRE-R-6. But in jsdom it is the only thing the Escape test proves. Real overlay focus behavior stays a T-4 browser check, per the Disqualifier. Record it that way in `execution.md`.
  > - Risk: PRE-R-1 "the six status slots, in the page's order" depends entirely on `data.options().status`. No test pins the count or order of those options in the panel. A one-line page assertion would cover it cheaply.
  > - Readability: `listId` is a fixed `'pr-detail-filters-list'`. That is fine for one instance per page; switch to a generated id if the component is ever reused.

- Leader adjudication: both issues are in scope (design §8.1 trigger row; tasks.md PRE-T-3 DoD). Not a spec problem → rework, attempt 2 at effort `high`.
- runtime events: none.
- spawns: implementer 79 calls, 249,849 tokens, ended complete; reviewer (attempt 1) 13 calls, 115,995 tokens, ended complete.

**Attempt 2 — PASS** (effort high)

- Files changed: `components/detail-filters/detail-filters.component.ts` (`HlmButtonImports` from `@spartan/button` added to `imports`), `detail-filters.component.spec.ts` (Helm button case; test renamed to "exposes listbox popup semantics…"), `portfolio-overview.component.spec.ts` (3 page cases on the real service). Final task totals vs `385d46e44`: copy.ts +9, page `CLAUDE.md` +2/−1, detail-filters html +88 / ts +82 / spec +144, results-detail html +2, page html +12/−1, page ts +2, page spec +122.
- Reds (each mutation reverted afterwards), verbatim as reported:
  - Without `HlmButtonImports`: `● PortfolioDetailFiltersComponent (PRE-T-3) › PRE-R-1: the trigger and Clear are real Helm buttons (same look as Export), not bare buttons` / `Expected: "button"` / `Received: null`.
  - Trigger bound to constant `true`: `● … › PRE-R-5: the button is enabled again once the filters resolve` / `Expected: false` / `Received: true` (plus the search-no-match case and two PRE-R-6 component cases red).
  - `(toggled)` no-op: `● … › PRE-R-2: ticking in the panel updates the table count, which equals the KPI total (S-2.1 stays true)` / `Expected: < 7` / `Received:   7` (plus the two attempt-1 PRE-R-2 cases red). The attempt-1 falsifiers (a) and (b) still go red on the final code.
- Verification: Jest `Test Suites: 23 passed, 23 total` / `Tests: 643 passed, 643 total`; `tsc` exit 0; `ng lint --quiet` "All files pass linting."
- Evidence re-run (Leader inline): Jest `23 passed / 643 passed`; `tsc` exit 0; `ng lint --quiet` "All files pass linting.", exit 0 → **VERIFIED**.
- Reviewer (akili-reviewer, T3, high): **PASS**. Both attempt-1 issues fixed: `data-slot="button"` comes from the real Helm directive (`hlm-button.ts:64`), so the case fails without the import; the PRE-R-5 case emits and completes a real `Subject` and asserts enabled; the KPI-total case compares the rendered `detail-count` with `kpiTotals().totalResults` from the service (different sources), checking `0 < after < before`, so it is not a tautology. No `toggleValue` stub. PRE-R-5 and §8.5 met **as amended**; mount rule unchanged; only `--pr-*` tokens; only `open` is a signal; every changed file is on the task's Files list.
- runtime events: none.

**PRE-R clause → spec case** (D = `detail-filters.component.spec.ts`, P = `portfolio-overview.component.spec.ts`)

| Clause | Case(s) |
|---|---|
| PRE-R-1 position | P "button sits between Search and Export" |
| PRE-R-1 Funding + Status only (BUT no Program/Project/Center/Typology) | D "renders exactly the Funding and Status sections…" |
| PRE-R-1 six slots in page order | P Status options = page slots in order; Funding = two sources |
| PRE-R-1 open and read state | D "marks the selected values as checked"; P "a value set in the top bar is checked when the panel opens" |
| PRE-R-1 `Filters · N` / no count | D "count badge equals funding + status size…", "shows no count and the plain name…" |
| PRE-R-1 / §8.1 look like Export | D "the trigger and Clear are real Helm buttons…" |
| PRE-R-2 tick from the table | P "ticking Status = Rejected…", "ticking Funding…", "ticking in the panel updates the table count, which equals the KPI total"; D "emits { dimension, value }" |
| PRE-R-2 tick from the top bar | P "a value set in the top bar is checked when the panel opens" |
| PRE-R-2 BUT no table-only state | falsifier (b), plus `signal<` grep (only `open`) |
| PRE-R-3 incl. BUT Program kept | P "Clear empties Funding and Status but keeps Program = SP01"; D "Clear emits cleared and is disabled when both sets are empty" |
| PRE-R-4 | D "shows the hint line…" |
| PRE-R-5 pending / resolved / empty list (as amended) | P "Filters pending disables the button", "the button is enabled again once the filters resolve", "an empty listed rows state (search with no match) keeps the button enabled"; D "disabled blocks opening" |
| PRE-R-6 | D "exposes listbox popup semantics…", "count badge… accessible name", "Escape closes the panel and focus returns to the trigger" |

**ADVISORY (4R, non-gating; from both Reviewer verdicts, recorded and not turned into work):**
- The explicit `(keydown.escape)="closeAndRestore(trigger)"` goes beyond the Brain-inherited keyboard of §8.1. It is harmless and guarantees PRE-R-6, but in jsdom it is the only path the Escape test proves. Real overlay focus is a PRE-T-4 browser check.
- PRE-T-4 must run as explicit browser steps: Enter/Space opens, focus moves in, Tab/Space toggles (Brain is mocked in Jest). It must also check that the trigger looks like Export, since Helm classes are mocked.
- PRE-R-2 "same 'Not affected by' behavior": it holds through the shared `toggleValue`, but no case pins a single-source block's note after a panel tick. Confirm in PRE-T-4.
- `listed()` regex `/^\s*(\d+) results?/` in the page spec depends on the `detail-count` copy wording.
- The `[disabled]` + `[attr.disabled]` Brain-mock workaround is documented in the page `CLAUDE.md`; a template comment would help.
- `listId` is the fixed `'pr-detail-filters-list'`; fine for one instance per page.

- spawns: implementer attempt 2: 14 calls, 97,447 tokens, ended complete; reviewer attempt 2 ended complete (host gave no counts in the hand-back).
- Decisions: PRE-R-5 vs mount rule (section above). Effort bumped medium → high for attempt 2.
- Running totals vs budget: tasks 2/4 · LOC ≈ 669 (PRE-T-1 ≈ 204 + PRE-T-3 ≈ 465, tests included; production ≈ 291, tests ≈ 378) against **530** · review rounds 3/6. **Budget tripwire fired: LOC is over the whole-spec estimate with PRE-T-2 and PRE-T-4 still pending** (see the tripwire block below).
- Final verification: green.

## Budget tripwire — after PRE-T-3 (2026-11-17)

| Measure | Budget (design §12) | Actual after 2 of 4 tasks | Delta |
|---|---|---|---|
| Tasks | 4 | 2 done | — |
| LOC (prod + tests) | ≈ 530 (≈ 230 prod + ≈ 300 tests) | ≈ 669 (≈ 291 prod + ≈ 378 tests) | +139 (+26 %), PRE-T-2 not started |
| Review rounds | 6 | 3 | within |

- **Cause.** (1) The PRE-T-3 template (+88) and component (+82) are larger than the UI estimate. The Brain/Helm popover pattern of the exemplar carries the structural-directive caveats, ARIA and footer markup. (2) The tests are heavier because the Definition of done requires one named case per PRE-R clause, and the attempt-2 rework added three page cases (+35). (3) PRE-T-2 is estimated at ≈ 150 more LOC (seam + 6-row fixture table + sink test), so the spec will finish at ≈ 820 LOC, about 1.5× the budget.
- **Rule applied.** `/akili-execute` Step 2.4 *Budget Tripwire*: "No mandate widens pre-approval: an owner brief that says "never stop" or "treat every gate as approved" pre-approves routine gates only. The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop, and the stop message quotes this sentence." The owner's delegation for this run ("continua hasta que termines", "toma decisiones tú mismo") is that kind of mandate, so the run stops here and is **not** logged auto-approved.
- **Leader recommendation.** Continue with PRE-T-2 at its approved scope; the overrun comes from test depth and UI markup, not scope creep, and no task was added. Two PRs remain the plan (PR 1 = T-1 + T-2, PR 2 = T-3). Awaiting the owner's go.
- **Owner decision (2026-11-18), applied before PRE-T-2:** approved continuing past the tripwire, in the owner's words: "sigue hasta que termines te dije ayer y no me hiciste caso TIENES QUE SEGUIR". This explicit approval covers the LOC overrun to completion (≈ 820 expected). Later exceptions (HALT, Pivot, `FATAL_FAIL`) would still stop. Housekeeping the same day: the leftover background process of the first PRE-T-3 Implementer was stopped. A running server Jest on `bilateral.service.spec.ts -t "Sub-national geo"` belongs to a peer session (`onecgiar-pr-28`) working spec `bugfix/ai-draft-subnational-geo` in this same checkout; it was left alone.

### PRE-T-2 — Client: rejection fields and 16-column export — PASS (attempt 2)

| Field | Value |
|---|---|
| Date | 2026-11-18 |
| Skills | `angular-developer`, `tdd` (as listed) |
| Effort | attempt 1 medium; attempt 2 high (bump after FAIL) |
| Requirements | PRE-R-7, PRE-R-9, DD-6, DD-8 |

**Attempt 1 — FAIL**

- Files changed (client): `shared/interfaces/portfolio-result-dimensions.interface.ts` (+12), `results-detail.rows.ts` (+34/−4), `results-detail.rows.spec.ts` (+66/−3), `results-detail.component.ts` (+7/−4), `results-detail.component.spec.ts` (+41/−2), `portfolio-overview.component.spec.ts` (+1/−1), `services/portfolio-filters.spec.ts` (+2/−1), `services/portfolio-overview.service.spec.ts` (+4/−2), page `CLAUDE.md` (+1/−1). `portfolio-overview.copy.ts` unchanged (headers live in `EXPORT_COLUMNS`).
- Beyond the task text: the export hyperlink `{cellNumber: 13}` became `LINK_CELL = EXPORT_COLUMNS.indexOf('Link') + 1` (16). Without it the 3 inserted columns put the hyperlink on `Contributing Centers`. The Reviewer judged it a necessary consequence of DD-6, in scope.
- Red (interface added first; behavioral): `Tests: 12 failed, 33 passed, 45 total`. Key pin `- Expected - 3 / - "Rejection reason", / - "Rejected by", / - "Rejected on",`. Rejection cases received `undefined` ×3. Component `Expected length: 16  Received length: 13` on `wscols`, plus the sink test red.
- Green: Jest `Test Suites: 24 passed, 24 total · Tests: 1001 passed, 1001 total`; `tsc -p tsconfig.app.json` exit 0; `ng lint --quiet` "All files pass linting." Coverage gates not run.
- Falsifier: (a) status-slot check → `if (true)`: 2 red. (b) missing comment as `''`: 1 red (`- "—"  + ""`). (c) truncation removed: 1 red. (d) `rejections: 'x'` in a typed hand-built map → `tsc -p tsconfig.spec.json`: `portfolio-overview.service.spec.ts(60,3): error TS2322: Type 'string' is not assignable to type 'DimensionRejection[]'` (Jest does not type-check).
- P-9: `results-list-filters.component.ts` is an unrelated symbol (its own `P25_*_EXPORT_COLUMNS`; no use of `DetailRow`/`toDetailRows`/`toExportRows`). The only other importer of `results-detail.rows` outside its folder is `contribution-requests-block` (`resultUrl`, unchanged).
- Evidence re-run (Leader inline): Jest `24 passed / 1001 passed`; `tsc -p tsconfig.app.json` exit 0; lint "All files pass linting." → **VERIFIED**. `tsc -p tsconfig.spec.json` shows 203 errors repo-wide, none in a file this task changed. They are pre-existing, and `filter-bar.component.spec.ts` and `results-api.service.spec.ts` are untouched by this spec. Not a gate of this task.
- Reviewer (akili-reviewer, T3, high): **FAIL**, verbatim:

  > STATUS: FAIL
  > ISSUES:
  > 1. **Discovered Issue:** The "still loading" clause of the *Map not ready* scenario has no spec case, even though a case claims to cover it. `results-detail.rows.spec.ts` names the case `'rejected row with the map not ready: Unavailable in all three cells (error and loading)'`, but it only runs `cells([rejected(6)], 'error')`, and the `cells` helper's `status` parameter is typed `'ready' | 'error'`, so `'loading'` cannot be passed. The code is correct for `'loading'` by construction (`ready = mapStatus === 'ready'`). The problem is that the test name reports evidence that does not exist: a mutation to `mapStatus === 'ready' || mapStatus === 'loading'` would stay green.
  >    * **Violated Rule:** `requirements.md` PRE-R-7, *Scenario: Map not ready* ("GIVEN the dimensions map failed **or is still loading**"). `tasks.md` PRE-T-2 DoD: "Every PRE-R-7 scenario clause maps to a named spec case".
  >    * **Remediation Suggestion:** Widen the helper's `status` type to `PortfolioDimensionsState['status']` (or add `'loading'`). Make the case assert both `cells([rejected(6)], 'error')` and `cells([rejected(6)], 'loading')` equal `[['Unavailable','Unavailable','Unavailable']]`, or split it into two named cases. Record the mutation `|| mapStatus === 'loading'` going red in `execution.md`.
  >
  > Judgements (not issues): `LINK_CELL` in scope and correct; BUT "never empty/null/undefined" covered by `toEqual` on `—` plus falsifier (b); legacy `REJECTED` maps to the PRE-T-1 server spec ("as served by T-1"); `SP03 - Climate Action` is a valid fill for `<program name>`.
  >
  > ADVISORY: page `CLAUDE.md` `**Verified:**` stamp (line 3) still names only PRE-T-3 — re-stamp in place (120-line cap). Readability of the `?? rejection` reassignment. `.slice(0, 32767)` counts UTF-16 units (lone surrogate possible; cell still fits). No hand-built `PortfolioResultDimensions` outside specs.

- Leader adjudication: in scope (the PRE-R-7 clause and the DoD), not a spec problem → rework, attempt 2 at `high`.
- runtime events: none.
- spawns: implementer 26 calls, 115,973 tokens, ended complete; reviewer ended complete (no counts in hand-back).

**Attempt 2 — PASS** (effort high)

- Files changed: `results-detail.rows.spec.ts` (`cells` helper `status` typed `PortfolioDimensionsState['status']`; the map-not-ready case asserts both `'error'` and `'loading'` → `[['Unavailable','Unavailable','Unavailable']]`); page `CLAUDE.md` `**Verified:**` line re-stamped in place ([advisory-grade]). The Leader then corrected the stamp date to 2026-11-18 for PRE-T-2 (a one-line doc edit; no lines added; still at the 120-line cap). Task totals vs `36c3421a5`: 9 files, +171/−20.
- Falsifier for the fix: `const ready = mapStatus === 'ready' || mapStatus === 'loading';` → rows spec `2 failed, 25 passed, 27 total`:
  ```
  ● toDetailRows › S-3.1: map loading or error gives "Unavailable" in both map columns, never the dash
      Expected: "Unavailable"
      Received: "—"
  ● rejection columns in the export (PRE-R-7, PRE-R-9) › rejected row with the map not ready: Unavailable in all three cells (error and loading)
      - Expected  - 3
      + Received  + 3
  ```
  Reverted (line 99 back to `const ready = mapStatus === 'ready';`).
- Verification: Jest `Test Suites: 24 passed, 24 total` / `Tests: 1001 passed, 1001 total`; `tsc -p tsconfig.app.json` exit 0; `ng lint --quiet` "All files pass linting."
- Evidence re-run (Leader inline): identical → **VERIFIED**.
- Reviewer (akili-reviewer, T3, high): **PASS**. The `'loading'` clause is now proven, and the recorded red fails on the behavior (`rejected(6)` has no record, so `loading`-as-ready falls back to `—`). Every PRE-R-7 scenario, DD-6 (16 columns, 3 after `Status`), PRE-R-9/DD-8 (truncation at the sink, 40,000 and exact-limit cases), §8.4 (shared `scienceProgramLabel`, widths 60/20/20, the same `ready` gate as Projects/Centers) conform. The carried PRE-R-5/§8.5 amendment is not contradicted, `LINK_CELL` = 16 is pinned, and the folder doc is accurate.
- runtime events: none.

**PRE-R-7 / PRE-R-9 clause → spec case** (rows spec `describe('rejection columns in the export (PRE-R-7, PRE-R-9)')` unless noted)

| Clause | Case |
|---|---|
| Rejected row → reason / `SP03 - <name>` / `2026-11-10` | "rejected row with a full record: reason, "<SP code> - <program name>", date"; sink: component "exports 16 keys with the 3 rejection values of a rejected row, in file order" |
| AND IT MUST newest record | "rejected row rejected twice: the newest record as served" (newest chosen server-side; PRE-T-1 SQL `created_at DESC, id DESC LIMIT 1`) |
| Non-rejected incl. resubmitted → `—` | "a non-rejected row reads three dashes even when its id has a record (rejected, then resubmitted)" |
| Incomplete record → `—`, BUT never empty/null/undefined | "rejected row with a null comment and a null SP…", "rejected row with no record at all: three dashes" (`toEqual` on the `—` literal; falsifier (b)) |
| Map not ready (failed or loading) → `Unavailable` | "rejected row with the map not ready: Unavailable in all three cells (error and loading)"; "a non-rejected row reads the dash when the map is not ready" |
| Legacy `REJECTED` spelling | PRE-T-1 repository spec (`IN ('REJECT', 'REJECTED')` + falsifier 2); the client receives the same shape |
| PRE-R-9 | "a 40,000-character comment is cut to 32,767…", "a comment within the limit is not cut" |
| DD-6 order and count | key pin "toExportRows keys follow R-3 order, the 3 rejection columns after Status…" (16 keys) |

**ADVISORY (4R, non-gating, recorded only):**
- `.slice(0, 32767)` counts UTF-16 code units; a cut inside a surrogate pair leaves a lone surrogate (the cell still fits). Optional hardening: drop a trailing high surrogate.
- Readability of the `?? rejection` reassignment in `toDetailRows`.

- spawns: implementer attempt 2: 11 calls, 121,168 tokens, ended complete; reviewer attempt 1: 14 calls, 102,934 tokens, ended complete; reviewer attempt 2: 7 calls, 45,368 tokens, ended complete.
- Decisions: `LINK_CELL` derived from `EXPORT_COLUMNS` (necessary consequence of DD-6). Effort bumped medium → high for attempt 2.
- Running totals vs budget: tasks 3/4 · LOC ≈ 860 (204 + 465 + 191) vs 530 (overrun approved by the owner on 2026-11-18) · review rounds 5/6.
- Final verification: green.
