# Tasks — Portfolio Overview: cleanup + W3 Approved (PCA)

## 1. Scope

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Requirements / Design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Budget | 4 tasks · ~220 LOC · 1 review round per task (T-3 max 2) |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |

## 2. Pre-flight

- [ ] Free RAM ≥ 4 GB before Jest; **`--maxWorkers=2`**, scoped `--testPathPattern` only, one test run at a time.
- [ ] Read `portfolio-overview/CLAUDE.md` (mock rules: `spartanBrainMock` inputs, `CentersService` mocked in page specs).
- [ ] V-1 SQL (design PCA-DD-4) handed to the user; result needed before T-3 PASS.

## 3. Task list

### PCA-T-1 — Service: drop % fields, W3 split by status slot

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~60 LOC) |
| Depends on | none |
| Requirements | PCA-R-1 (data side), PCA-R-3 (all clauses) |
| Design | §6.1, PCA-DD-1, PCA-DD-2 |
| Skills | `angular-developer`, `tdd` |

**Scope:** `services/portfolio-overview.service.ts` + its spec. Remove `w1w2SubmittedPercent`, `bilateralApprovedPercent`, `bilateralCentersCount` from `PortfolioKpis` and `kpiTotals`. Replace `bilateralNewSubmitted/bilateralNewEditing` with `bilateralNewSplit` and `bilateralReplicatedSplit` (ordered `{key,label,count}[]`, Submitted/Approved/Editing always, other slots only if > 0). Labels from `portfolio-overview.copy.ts` (`w3Split`). W1/W2 fields untouched.

**Tests (red first):**
- Fixture: W3 New = {1 Pending Review, 2 Approved, 1 Quality Assessed, 3 Editing}; W3 Replicated = {4 Approved, 1 Rejected, 2 Editing}.
- New split = Submitted 1 · Approved 2 · Editing 3 · Quality Assessed 1 (R-3 "AND IT MUST resolve with the single map"; "BUT must NOT count status 2 as Approved").
- Replicated split = Submitted 0 · Approved 4 · Editing 2 · Rejected 1; Quality Assessed / Discontinued absent (visibility rule).
- Sum of each split === `bilateralNew` / `bilateralReplicated` (R-3 "parts sum exactly").
- No removed field present on `kpiTotals()`.

**Disqualifier:** a test whose fixture has no status-2 row cannot prove the "not Approved" clause → FAIL the evidence. Input that must fail: a row with `status_id: 2` counted under `approved`.

**Done:** `npm run test:local -- --testPathPattern=portfolio-overview.service` green; `npx eslint <changed> --quiet` clean.

### PCA-T-2 — Page template: remove chips and tile %, render W3 split

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~50 LOC) |
| Depends on | PCA-T-1 |
| Requirements | PCA-R-1 (all clauses), PCA-R-2 (all clauses), PCA-R-3 (render) |
| Design | §6.1, §6.2, PCA-DD-3 |
| Skills | `angular-developer`, `spartan` |

**Scope:** `portfolio-overview.component.html` + `.spec.ts` (+ copy if labels added). Delete both deck chips; delete `({{ segment.percent }}%)` in status tiles, keep `[style.width.%]`; W3 New sub-line loops `bilateralNewSplit` (testid `kpi-bilateral-split`), new sub-line under Replicated (`kpi-bilateral-replicated-split`).

**Tests:**
- Deck W1/W2 + W3 cards `textContent` contain no `%` (R-1); header has no empty chip element (R-1 "BUT must NOT leave placeholder").
- Each status tile `textContent` has no `%`; bar element still has a width style; tile click still calls `toggleValue('status', key)` (R-2 "click behaves as today").
- Split text = `Submitted 1 · Approved 2 · Editing 3 · Quality Assessed 1` for the T-1 fixture.
- New/Replicated counts and `navigateToResultsCenter('bilateral')` click unchanged (R-1 "AND counts… unchanged").

**What these cannot prove:** visual spacing of the header after chip removal → T-4 browser check.

**Disqualifier:** a `%`-absence test that queries a selector matching nothing passes vacuously → each assertion must first assert the card/tile exists. Input that must fail: re-adding the chip span.

**Done:** `npm run test:local -- --testPathPattern=portfolio-overview.component` green; lint clean.

### PCA-T-3 — Centers block: dedupe by result, drop chip/%/Centers reporting

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~90 LOC) |
| Depends on | none (parallel-safe with T-1; tests run serially) |
| Requirements | PCA-R-4 (all clauses), PCA-R-5, PCA-R-6 (all clauses) |
| Design | §6.3, §6.4, PCA-DD-4, PCA-DD-5 |
| Skills | `angular-developer`, `tdd`, `spartan` |

**Scope:** `centers-block.aggregate.ts` (`dedupeById`), `centers-block.component.ts/.html/.spec.ts`, `portfolio-centers-block.copy.ts`. One `distinctRows` computed over `globalCenters()`; `kpis()` and donut/tiles read it; remove chip, tile `(N%)`, 2nd KPI card, `centersReporting/centersCount/bilateralApproved`; grid single column; subtitle → each result counts once. Remove `viewRows`/`centerTotals`/`sumRows` only if no other reader (grep).

**Tests (red first):**
- Result id 10 returned by Centers A and B: total 1, its origin +1, its status tile +1 (R-4 main scenario).
- Origin + status filters compose as before over deduped rows (R-4 "AND IT MUST compose").
- Center global filter = A only → rows of B excluded before dedupe.
- Partial load (one Center error) → `centers-partial` + `centers-retry-failed` still render (R-4 "keep Retry").
- No `%` in chip area or tiles; no `kpi-centers-reporting`, no "Centers reporting"/"with at least one result" text (R-5, R-6); `origin-new` / `origin-replicated` still present (R-6 "BUT must NOT remove origin buttons").
- Existing per-Center summing assertions updated, not deleted silently (record which in execution.md).

**V-1 gate (R-4 "deck and Centers agree"):** user runs the design SQL; `w3_with_center` vs `w3_total`. Equal → PASS. Different → add copy line "N W3 results have no Center" (testid `centers-no-center-note`) fed by deck total minus distinct total… only if the user confirms; otherwise record residue in execution.md.

**Amendment 2026-11-04 (PCA-DD-6):** the Centers block also drops W3 rows with no active lead Program/Accelerator (deck rule), before dedupe. Test: a Center row without a lead P/A is not counted in total, origin, tiles or `distinctRows`; the no-Center note then equals deck − distinct.

**Disqualifier:** a dedupe test where both Centers' rows carry different ids proves nothing. Input that must fail: same id in two Centers counted 2.

**Done:** `npm run test:local -- --testPathPattern=centers-block` green; lint clean; V-1 outcome recorded.

### PCA-T-4 — Guide sync + visual check

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | XS (~20 LOC docs) |
| Depends on | PCA-T-2, PCA-T-3 |
| Requirements | PCA-R-7; layout part of R-1, R-6 |
| Design | §2 (guide row), §13 G-2 |
| Skills | — (docs) · browser check: `claude-in-chrome` read-only |

**Scope:** `portfolio-overview/CLAUDE.md`: remove "% submitted/approved" mentions, "counts once per Center", DD-4 Centers reporting; add 🛑 lines: no % figures (stakeholder 2026-11-04), W3 split via `resolveStatusSlot`, Centers block counts distinct results. Then `npx jest --findRelatedTests <all changed files> --maxWorkers=2`.

**Visual check (HITL):** served page, read-only (no write buttons; shared prdb): deck headers aligned without chips; W3 card full width in Centers block at desktop and ~390 px. Screenshot to the user.

**Disqualifier:** checking an old bundle → confirm the served bundle contains the new testid before judging.

**Done:** guide grep has no `% approved` / `counts once for each`; related Jest green; user confirms the screenshots.

## 4. Dependency graph

```
T-1 ──► T-2 ──┐
T-3 ──────────┴──► T-4
```

## 5. Coverage (scenario/clause → task)

| Clause | Task |
|---|---|
| R-1 no `%`; counts/targets unchanged; no empty placeholder | T-2 (+T-1 fields), T-4 visual |
| R-2 label+count only; bar stays; click unchanged | T-2 |
| R-3 split both lines; parts sum; single map; status 2 ≠ Approved | T-1 (logic), T-2 (render) |
| R-3 Scenario Approved = Results Center | T-4 visual check compares with Results Center W3+Approved |
| R-4 count once; subtitle; filters compose; retry/partial | T-3 |
| R-4 Scenario deck = Centers | T-3 V-1 gate |
| R-5 | T-3 |
| R-6 card gone; full width; origin buttons kept | T-3 (+T-4 width) |
| R-7 | T-4 |

## 6. Roll-back

Revert the commit(s); no data or server state involved.
