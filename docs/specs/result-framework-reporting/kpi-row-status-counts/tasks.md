# KPI row status counts — `tasks.md`

## 1. Scope of this task list

Implements [`requirements.md`](./requirements.md) (KRC-R-1..8, NFR-1..3) per [`design.md`](./design.md). Budget: **4 tasks · ~320 net LOC · 1 review round (tripwire: escalate if exceeded)**; re-baselined by the user to ~1,400 and, on 2026-11-03 #2, to **5 tasks · ~1,600 net LOC**. Single PR targeting `staging` (via `qa-development-2026-ss`).

## 2. Pre-flight checklist (every task)

- [ ] Load the skills listed on the task before writing code.
- [ ] **Hard rules (user constraint):** SELECT-only SQL; no migration; no edit to `getIndicatorContributions`, `getIndicatorContributionsByCenter`, `sumContributionsForCenters`, `fetchAndGroupTocResults`, `mapIndicatorContributionRow`, any existing DTO/endpoint, or the indicator drawer (an exception lifted on 2026-11-03 #2 was **withdrawn** on #3: the drawer stays untouched); **no hard-coded version ids** (prod 2026 = 8/9, test = 36/37).
- [ ] Never connect to any DB. Any data check becomes a query handed to the user inline.
- [ ] **Jest:** always `--maxWorkers=2`, scoped (`--findRelatedTests <changed files>` or `--testPathPattern`). Never the full suite; one test run at a time on the machine.
- [ ] Lint only touched files: `npx eslint <files> --quiet`.

## 3. Task list

### KRC-T-1: Server read-only endpoint `indicator-result-status-links`

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~110 LOC incl. tests) |
| Depends on | — |
| Covers | KRC-R-2 (population side: S-2.1/2.2/2.3 data), KRC-R-3 (S-3.1), KRC-R-4 (S-4.1 server), KRC-R-5.1, KRC-NFR-1/2/3 |
| Design | §4, §5, §6, §7, DD-1, DD-6, P-1, P-9 |
| Skills | `nestjs-expert`, `api-design-principles` |

**Scope**
- New public method `findIndicatorResultStatusLinks(program, contextOrYear)` in `AoWBilateralRepository`:
  - joins `result` → `results_toc_result` → `results_toc_result_indicators` → **INNER** `result_indicators_targets`, all `is_active = 1`, `is_not_aplicable = 0`;
  - filters `DB_TOC.toc_results` by `official_code` + `phase` from `resolveContext`, and status ∈ {Editing, QualityAssessed, Submitted, PendingReview, Approved} built from `ResultStatusData` members;
  - applies **no** `contributing_indicator`, `target_date`, type or level filter (drawer parity, P-1);
  - groups per (toc_result_id, toc_results_indicator_id, result_id, status_id), with distinct non-null anchors and a `has_unanchored` flag.
- New service method in `ResultsFrameworkReportingService` that resolves program + `versionId` the same way the sibling `toc-results` GET does.
- New controller `GET indicator-result-status-links` (same guard, Swagger `@ApiQuery` for `program`, `versionId`).
- Response envelope `{ response, message, status }` with only the fields in design §6.

**Tests (Jest, repository + service + controller specs)**
- The SQL string contains the 5 status ids and **no** `contributing_indicator IS NOT NULL` / `target_date` / `result_type_id` / `result_level_id` condition. Fails if any drawer-excluded filter is added.
- Mapping: anchors CSV → `number[]` (dedup, NULL dropped); `has_unanchored` true/false; an empty result → `[]` with 200.
- Context: the `versionId` passed reaches `resolveContext`; no literal version id in the source (grep check below).
- Error path goes through `returnErrorRepository`.

**Verification**
- `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --findRelatedTests <changed files>`. Existing `aow-bilateral.repository.spec`, `results.service.spec` and `results-framework-reporting.service.spec` must stay green **with no edits to their existing cases**.
- `git diff -U0 -- onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` must show **only additions** (no `-` lines inside the 5 protected functions) (KRC-S-4.1).
- `git diff --stat` must contain no `migrations/` path. Grep the new code for `INSERT|UPDATE|DELETE|version_id\s*=\s*\d` → 0 hits.

**Would FAIL if:** a `-` line appears in a protected function; the SQL keeps `status_id IN (2, 3, 6)`; a migration file is added; a test asserts a hard-coded version 8.

**Disqualifier:** a green Jest run on mocked `dataSource.query` proves the SQL *text*, not the population. Population parity is proven only by KRC-T-4 Q-8 against real data.

**Done:** endpoint returns links for SP03 locally (via user-run curl with their `auth` header, never echoed); specs green; diff checks clean.

---

### KRC-T-2: Client API call, one-shot load, and matcher util

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~110 LOC incl. tests) |
| Depends on | KRC-T-1 (contract only; can mock in parallel) |
| Covers | KRC-R-1 (bucketing S-1.1/1.2/1.4), KRC-R-2 (S-2.1/2.2/2.3 matching), KRC-R-5.2, KRC-R-5.3 (S-5.1) |
| Design | §8 Load + Matcher, DD-2, DD-3, DD-4, DD-5 |
| Skills | `angular-developer`, `tdd` |

**Scope**
- `GET_IndicatorResultStatusLinks(program, versionId?)` in `results-api.service.ts` (custom `auth` header via the existing interceptor).
- `kpi-status-counts.util.ts` (pure):
  - `indexLinks(links)` keyed by `toc_result_id|related_node_id`;
  - `countsForRow(index, row)` returns `{ editing, submitted, pendingReview }`;
  - row-anchor parsing identical to the drawer/loader (null/undefined/blank/non-finite → absent);
  - include a link when the anchor is absent, `anchors` contains it, or `has_unanchored`;
  - dedup by `result_id`;
  - buckets: 1 → editing, 2/3/6 → submitted, 5 → pendingReview, anything else ignored. *(Superseded by KRC-T-5: 6 → approved.)*
- dashboard-lab: one signal cache keyed `program|versionId`. Fetch on first program + version load only. On error store `[]` + `console.error`, with no toast.
- `statusCountsFor(ind)` resolves `toc_result_id`/`related_node_id`/`toc_indicator_target_id` from the indicator row (P-7). Use the same fallbacks the drawer uses.

**Tests (TDD, red first)**
- Util:
  - anchored on row A only → A=1, sibling B=0 (S-2.1);
  - unanchored → counts on A and B (S-2.2);
  - one result with 2 target rows/anchors → 1 (S-2.3);
  - row without anchor counts every link of the node;
  - blank-string anchor treated as absent;
  - statuses 4/7/8 ignored (S-1.4);
  - mixed 1/2/3/5/6 → `{1, 3, 1}` buckets (S-1.2). *(Superseded by KRC-T-5: `{editing 1, submitted 2, approved 1, pending 1}`.)*
- dashboard-lab:
  - opening 2 AoWs and 3 KPIs issues the request **exactly once** (`HttpTestingController.expectOne`) (KRC-R-5.2);
  - 500 response → no chip data, no toast, `console.error` called (S-5.1).

**Verification:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests <changed files>`.

**Would FAIL if:** the util counts target rows instead of results; a sibling row picks up an anchored-elsewhere result; a second HTTP call is made when switching AoW.

**Disqualifier:** fixtures written from the util's own logic are tautological. Fixture shapes must be copied from a real endpoint response (T-1 local run) and from the drawer loader's documented rule (P-1).

**Done:** util and load specs green, including all negative cases.

---

### KRC-T-3: `app-kpi-status-chip` and placement in every KPI row layout

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~100 LOC incl. tests) |
| Depends on | KRC-T-2 |
| Covers | KRC-R-1 (S-1.1 no zero segments, S-1.3 renders nothing), KRC-R-6.1/6.2/6.3, KRC-R-7 (S-7.1) |
| Design | §8 Chip, P-7 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope**
- Standalone chip:
  - signal inputs `editing`, `submitted`, `pendingReview`;
  - *redesigned 2026-11-03, user-approved redesign after KRC-T-4 local visual FAIL, see design §8 Chip (authoritative):*
  - one pill `<button>`, tinted by its top segment (Editing > Submitted > Pending review pairs); *(superseded by KRC-T-5 #4)*
  - fixed order, only segments > 0: `● N editing` (bold) · `N submitted` · `N pending` + `›`, single line; *(superseded by KRC-T-5)*
  - `aria-label` in full words ("7 results in Editing, 1 pending review");
  - tooltip: "Editing results do not count towards Achieved until submitted. Click to see all N reported results.";
  - click / Enter / Space → `open` output → host calls the existing "View reported results" handler; `stopPropagation` (KRC-R-7).
- Insert the chip in the title/taxonomy block, right after the tag pills (or under the title where no tag line exists), in every layout in P-7, and **restore the Achieved column to its pre-KRC markup**: full view, AoW table, AoW cards, overview planned lists, and both `reporting-aow-table` layouts (grouped rows + "All indicators" flat table; added 2026-11-03, P-7 correction). It must not move or restyle the existing Achieved/progress elements.

**Tests (Jest)**
- All zero → no DOM rendered (S-1.3).
- `{1,0,0}` → text `1 editing`, no "0" anywhere (S-1.1).
- `{1,2,1}` → `1 editing · 2 submitted · 1 pending` in order (S-1.2); tint = Editing pair; `{0,1,0}` → Submitted pair; `{0,0,2}` → Pending review pair. *(Superseded by KRC-T-5.)*
- Click and Enter → `open` emitted once, and the row click handler is not called (S-7.1); the host routes it to the "View reported results" handler with the row.
- `aria-label` present and in words.
- dashboard-lab render: a row with links shows the chip, a row without shows none, and the Achieved text is unchanged.

**What these tests cannot prove:** layout, wrapping and contrast, because jsdom does not lay out. That is covered by KRC-T-4 visual check.

**Verification:** scoped Jest (`--maxWorkers=2 --findRelatedTests`) + `npx eslint <touched files> --quiet`.

**Would FAIL if:** a `0 submitted` segment renders; the chip appears on a row with no links; a layout in P-7 lacks the chip (assert one chip per row fixture in each layout block).

**Done:** specs green; chip present in all P-7 layouts.

---

### KRC-T-5: "N results reported" button, Approved split (amendment #2; drawer part withdrawn #3)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~200 LOC incl. tests) |
| Depends on | KRC-T-3 |
| Covers | KRC-R-1 (amended), S-1.1/1.2/1.5/3.1 (amended), KRC-R-6.1/6.2 (amended), KRC-R-7 (unchanged behaviour), KRC-R-8 (new, S-8.1) |
| Design | §8 Matcher step 5, Chip (amendment #2), Drawer breakdown (narrowed #3: no drawer change) |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope**
- `kpi-status-counts.util.ts`: add `approved` to `KpiStatusCounts`; bucket 6 → `approved`, 2/3 → `submitted`. Export the status→group mapping so the drawer reuses it.
- `app-kpi-status-chip`: new `approved` input; content `N result(s) reported` + a `● N editing` badge (only when > 0) + `›` at the end; ~~tint Editing pair when editing > 0 else an existing neutral pair~~ *(superseded by #4: neutral outlined root, Editing pair only on the badge; no `·`)*; aria-label lists every non-zero group in words; tooltip unchanged. All hosts pass `approved`.
- *Amendment #4 (2026-11-03, user-approved after local visual check):* no whole-pill tint. The button is neutral outlined on every row; only the `● N editing` badge carries the Editing pair (KRC-R-6.1 amended, design §8 "Button + editing badge"). Tests: the button root has no status tint in any case; the editing badge exists only when editing > 0 and carries the Editing pair; `data-tint` removed or replaced accordingly.
- Drawer: **no change** (narrowed #3, user decision). The existing IRR-R-11 `statusSplit` line already shows the per-status breakdown with Approved separate (KRC-R-8).
- Update the affected folder `CLAUDE.md` files and their `Verified:` stamps.

**Tests (Jest)**
- util: status 6 → approved, 2 and 3 → submitted; dedup and anchors unchanged (existing cases stay green).
- chip: `{e:1}` → `1 result reported` + badge `● 1 editing` (singular); `{e:1,s:2,a:1,p:1}` → `5 results reported` + badge `● 1 editing`; `{a:1}` → `1 result reported`, no "editing", no "submitted" (S-1.5); no `0` anywhere; aria-label `"5 results reported: 1 in Editing, 2 submitted, 1 approved, 1 pending review"`; click/Enter still emit `open` once without the row click (S-7.1).
- drawer: `git diff` on `components/indicator-drawer/` is empty; existing drawer specs green (the IRR-R-11 split already lists `approved` separately).

**Verification:** scoped Jest (`npx jest --maxWorkers=2 --findRelatedTests <changed files>`) + lint on touched files (client: `npx ng lint --quiet --lint-file-patterns <files>`).

**Would FAIL if:** an Approved result is labelled `submitted` anywhere; the row shows anything besides `N result(s) reported ›` and the `● N editing` badge; a `0` renders; the drawer's total ≠ button N; any drawer file changes.

**Done:** specs green; lint clean; T-4 visual step re-checks the new button.

---

### KRC-T-4: Verification against real data and visuals (HITL)

| Field | Value |
|---|---|
| Status | `[ ]` |
| Size | S (no code) |
| Depends on | KRC-T-1..3, KRC-T-5, deployed to PRTest (performance-refactor) |
| Covers | KRC-R-2 (real-data parity), KRC-R-4 (S-4.1 end-to-end), KRC-R-6.3, KRC-NFR-1 |
| Design | P-1, P-2, DD-4 |
| Skills | — (manual; T6 for visual if delegated) |

**Steps**
1. **Before/after JSON diff (R-1):** the user saves the `toc-results` response for one SP03 AoW plus the SP progress response before and after the deploy. The bodies must be identical. Byte-identical is expected because data does not change between captures; take both captures minutes apart.
2. **Parity (Q-8), with the query handed to the user:** for 3 KPI rows on PRTest (one plain, one shared node with ≥2 target rows, Karen's SLICK node), compare the chip total with the drawer count **and** with a SELECT that replicates the drawer population.
3. **Visual:** screenshots at 1280 px and 640 px of the AoW table and cards. Check that segments wrap without overflow and that the text is legible (KRC-R-6.3).
4. **Fail-soft:** with DevTools blocking the new URL, the page renders as before.
5. **Perf:** response time of the new endpoint for SP03 in DevTools ≤ 500 ms (3 loads; report the spread).

**Would FAIL if:** any JSON diff line in step 1; chip ≠ drawer on any of the 3 rows; overflow at 640 px.

**Disqualifier:** if the data changed between captures (someone reported in between), the diff is not evidence. Recapture. For perf, a spread > 2× across the 3 loads is reported as inconclusive, not as a pass.

**Done:** all 5 steps recorded in `execution.md`, with user-run outputs.

## 4. Dependency graph

```text
KRC-T-1 ──► KRC-T-2 ──► KRC-T-3 ──► KRC-T-5 ──► KRC-T-4
(T-2 may start in parallel against the design §6 contract with mocks)
```

## 5. Coverage closure (scenario / clause → task)

| Clause | Task |
|---|---|
| S-1.1 shows `1 editing` (amended #2/#4: `1 result reported` + badge `● 1 editing`) | T-2 (bucket), T-3 (render), T-5 (amended render) |
| S-1.1 BUT no 0 segments | T-3 |
| S-1.1 AND IT MUST Achieved unchanged | T-1 (diff check), T-3 (render test), T-4 step 1 |
| S-1.2 order | T-2, T-3 |
| S-1.3 nothing linked → as today | T-3 |
| S-1.4 excluded statuses | T-1 (SQL list), T-2 (ignore) |
| S-2.1 anchored + AND IT MUST equal drawer | T-2 (unit), T-4 step 2 (real) |
| S-2.2 unanchored | T-2, T-4 step 2 |
| S-2.3 once per row | T-1 (group), T-2 (dedup) |
| S-3.1 draft without value | T-1 (no value filter), T-4 step 2 (P-2 already: 0 lost in prod) |
| S-4.1 identical responses + BUT no edits to protected functions | T-1 diff check, T-4 step 1 |
| R-5.1 read-only | T-1 grep + no migration |
| R-5.2 once per load | T-2 |
| R-5.3 / S-5.1 fail-soft BUT no toast | T-2, T-4 step 4 |
| R-6.1 tokens + text | T-3 |
| R-6.2 aria + tooltip | T-3 |
| R-7 / S-7.1 chip opens Reported results, BUT no row click | T-3 |
| R-6.3 1280/640 | T-4 step 3 |
| R-1/R-6.1/R-6.2 amended #2, S-1.5, R-8 / S-8.1 | T-5 (+ T-4 step 3 visual) |
| NFR-1 perf | T-4 step 5 |
| NFR-2 guard | T-1 |
| NFR-3 no PII | T-1 (response shape test) |

## 6. Rollout & verification

`qa-development-2026-ss` → `performance-refactor` (PRTest, ~30 min deploy) → T-4 → `staging`. Promotion to master is owned by Cristian Gamboa.

## 7. Follow-ups (not in this spec)

- Ticket point 2: make the drawer's "N results already reported" block more prominent / add Open links (quick or Lite).
- Optional "KPIs with Editing results" filter (OQ-2).
- OQ-1 wording with Nicoleta (copy-only).

## 8. Roll-back plan

Revert the PR commits. No data or schema state to restore.
