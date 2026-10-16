# Tasks — SP Overview: Total General reconciles + drill-down

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-total-drilldown` |
| Depth | Standard |
| Approval Mode | gated |
| Budget | 5 tasks · ~350 LOC · 1–2 review rounds (`design.md` §11) |

Test rules (machine policy): every Jest run is `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern=<touched>` from `onecgiar-pr-client/`; one test run at a time; never the full suite. Lint only touched files: `npx eslint <files> --quiet`.

## Dependency graph

```
T-1 (Results filter) ─┐
                      ├─► T-3 (host navigation) ─► T-4 (guides) ─► T-5 (live + visual check, HITL)
T-2 (card + bar)  ────┘
```
T-1 and T-2 are independent (different folders) — parallel-safe, but only one runs Jest at a time.

---

## T-1 — Results tab Replication filter

| Field | Value |
|---|---|
| Status | [x] done (PASS attempt 1 — see execution.md) |
| Size | M (~140 LOC incl. tests) |
| Depends on | — |
| Requirements | STD-R-4 (S-4.1, S-4.2, S-4.3, S-4.4, S-4.5) |
| Design | §8.5, §9, DD-3 |
| Skills | `angular-developer`, `tdd` |

**Scope**
- `programme-results-query-params.ts`: `PROGRAMME_RESULTS_REPLICATION_QUERY_PARAM = 'replication'`, dimension union + map entry.
- `programme-results-filter.service.ts`: `'replication'` dimension, `selectedReplication` signal, state field, predicate on `row.isReplicated`, chips ("Replication: New" / "Replication: Previously reported", after Funding source), toggle, `clearChip`, `clearAll`, `hasActiveFilters`.
- `programme-results.component.ts/.html`: static options (New / Previously reported), `app-pr-filter-multiselect` after Funding source, URL→filter hydration (whitelist `new`/`replicated`), filter→URL write (`null` when empty).

**Tests (write first — `tdd`)**
| Scenario | Test |
|---|---|
| S-4.1 | predicate: `['new']` keeps only `isReplicated=false`; `['replicated']` only `true`; `[]` and both → all rows |
| S-4.2 | `?replication=new` hydrates signal + chip; setting the signal writes `replication=new`; clearing writes `null` |
| S-4.3 | `?replication=foo` → no chip, all rows kept, no throw; `?replication=new,foo` → only `new` |
| S-4.4 | `clearChip` replication removes only it; `clearAll` removes it; `activeFilterCount` includes it |
| S-4.5 | existing my-work-board specs still green (no new URL key written there) |

**Verify:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="programme-results|my-work-board"` + eslint touched files.
**Done when:** all rows above green, existing programme-results specs untouched-and-green.
**Would fail if:** predicate inverted (`new` returning replicated rows) → S-4.1 red; hydration skipping whitelist → S-4.3 red.
**Disqualifies evidence:** a test that only checks the chip label exists without asserting filtered row ids is a presence check — S-4.1 MUST assert the resulting row ids.

---

## T-2 — Total General headline, composition bar, row/segment intent

| Field | Value |
|---|---|
| Status | [x] done (PASS attempt 2 — see execution.md) |
| Size | M (~140 LOC incl. tests) |
| Depends on | — |
| Requirements | STD-R-1 (S-1.1, S-1.2*, S-1.3), STD-R-2 (S-2.1–S-2.6), STD-R-3 (S-3.5, emit side of S-3.1–S-3.4) |
| Design | §8.1, §8.2, §8.3, DD-1, DD-4, DD-6, reversion table |
| Skills | `angular-developer`, `tailwind-design-system`, `frontend-design`, `tdd` |

\* S-1.2 (only status 5 counted) is owned by the host computed — already true today and re-asserted in T-3.

**Scope**
- `program-overview.component.ts`: `programResultsTotal` = r + n + p; `TotalSegmentKind`; `totalSegments` computed (kind, count, widthPct, label, color, zero-count dropped); `openTotalSegment = output<TotalSegmentKind>()`.
- `.html`: headline tooltip (S-1.3); bar — skeleton while loading, empty track when total 0, segment `<button>`s with `aria-label` + `min-w-[6px]`; rows: dot legend, trailing arrow, `(click)` emits kind, remove `aria-pressed`/active background/`setActiveSection` calls.
- Spec: rewrite KPI 1 tests at `program-overview.component.spec.ts:1059-1134` deliberately (headline 69 → 77 fixture; toggle tests → emit tests). Keep "KPI 1 is a DIV" test.

**Tests**
| Scenario | Test |
|---|---|
| S-1.1 | 62/7/8 → headline text `77`; rows read 62/7/8 |
| S-1.3 | headline `title` mentions replicated, new and awaiting review |
| S-2.1 | `totalSegments()` widths 80.5/9.1/10.4 (±0.1) and order replicated, new, pendingReview |
| S-2.2 | new=0 → 2 segments, no `new` button in DOM |
| S-2.3 | 0/0/0 → track present, 0 segment buttons, headline 0 |
| S-2.4 | 1/199/0 → replicated segment button exists with `min-w-[6px]` class (presence only — real width is checked in T-5) |
| S-2.5 | loading → skeleton, no segment buttons |
| S-2.6 | each row has a dot with the same color class as its segment |
| S-3.x emit | clicking each row and each segment emits its kind; `activeSection` unchanged (S-3.5) |

**Verify:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="program-overview.component.spec"` + eslint touched files.
**Done when:** above green; no `setActiveSection` left in KPI 1 markup; heading-order assertion untouched.
**Would fail if:** headline still r + n → S-1.1 reads 69 → red; zero segment still rendered → S-2.2 red.
**Cannot prove (jsdom):** real rendered widths, 6px minimum effect, color contrast → T-5.

---

## T-3 — Host navigation for total segments

| Field | Value |
|---|---|
| Status | [x] done (PASS attempt 1 — see execution.md) |
| Size | S (~60 LOC incl. tests) |
| Depends on | T-1 (param map), T-2 (output) |
| Requirements | STD-R-3 (S-3.1, S-3.2, S-3.3, S-3.4), STD-R-1 (S-1.1 "program-wide" AND IT MUST, S-1.2) |
| Design | §8.4, DD-2, DD-5 |
| Skills | `angular-developer`, `tdd` |

**Scope**
- `dashboard-lab.component.ts`: extract `effectivePhaseLabel()` from `onOverviewLink` (behavior-preserving); add `onTotalSegment(kind)` per design §8.4 using `PROGRAMME_RESULTS_QUERY_PARAM_MAP` and `BILATERAL_REVIEW_QUERY_PARAM_MAP`.
- `dashboard-lab.component.html`: `(openTotalSegment)="onTotalSegment($event)"`.

**Tests (mocked router)**
| Scenario | Assertion |
|---|---|
| S-3.1 | `new` → `['/result-framework-reporting','entity-details',code,'results']`, params `{origin:'W1/W2', replication:'new', phase:<label>}` |
| S-3.1 AND IT MUST | with `overviewScope()='AOW01'` set → params have **no** `section` key |
| S-3.2 | `replicated` → same with `replication:'replicated'` |
| S-3.3 | `pendingReview` → `[…, 'bilateral-review']`, `{status:'pending', phase:<effectiveVersionId>}`; versionId null → no `phase` key |
| S-3.4 | navigation fires regardless of the count being 0 |
| S-1.1 / S-1.2 | existing `overviewTotalBreakdown` specs (`dashboard-lab.component.spec.ts:1606-1666`) still green: status-5 only, scope-independent |
| regression | existing `onOverviewLink` specs green after the phase-label extraction |

**Verify:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="dashboard-lab.component.spec"` + eslint touched files.
**Would fail if:** handler routes through `onOverviewLink` → `section` key present → S-3.1 AND IT MUST red.

---

## T-4 — Component guides

| Field | Value |
|---|---|
| Status | [x] done (PASS attempt 1 — see execution.md) |
| Size | XS |
| Depends on | T-3 |
| Requirements | traceability for STD-R-1..4 |
| Design | §4, reversion table |
| Skills | `cognitive-doc-design` |

**Scope:** `program-overview/CLAUDE.md` — replace "Total General (KPI 1)" headline rule (now r+n+p), replace "rows are section buttons" with drill-down + bar + colors note; `Verified:` line. `programme-results/CLAUDE.md` — Replication filter + `?replication=`. Forward-sweep: grep "replicated + new" and "setActiveSection('w1w2')" in both guides; no stale claim left.
**Verify:** `grep -n "replicated + new only\|Total General rows are section buttons" <guides>` returns nothing.

---

## T-5 — Live parity + visual check (HITL)

| Field | Value |
|---|---|
| Status | [x] done (PASS — HITL user sign-off 2026-10-15; see execution.md) |
| Size | S (manual) |
| Depends on | T-1..T-4 |
| Requirements | STD-R-5, STD-R-2 visual (S-2.1 rendered, S-2.4 real width), NFR accessibility contrast |
| Design | DD-4, DD-5 |
| Skills | `claude-in-chrome` (read-only), T6 review |

**Scope (read-only — local stack hits shared prdb; never click write buttons):**
1. SP05, effective phase P25: note Overview New / Replicated / Pending. Click each; record destination count (Results table total; Bilateral review Pending count).
2. Screenshot the card at desktop and ~360px width; check the 3 colors vs gradient ends (contrast ≥ 3:1) and the 1-of-N segment is visibly ≥ 6px.
3. Tab onto a bar segment (incl. a single-segment bar) and screenshot: the focus ring is visible, not clipped (added 2026-10-15 from T-2 Reviewer FAIL #1).

**Pass:** the three destination counts equal the row numbers; contrast ≥ 3:1 for each fill vs `#4a1d96` and `#793ce8`.
**Disqualifies evidence:** a count taken with any leftover filter chip besides Phase / Funding source / Replication (or Status=Pending on Bilateral) is not parity evidence — clear and retake. If Results shows a different count, report the delta and its cause (phase-year fuzzy match, 2000-row cap) instead of passing.
**Would fail if:** phase label matches two versions of the same year → Results count > Overview count.

---

## Coverage closure (scenario / clause → task)

| Clause | Task |
|---|---|
| S-1.1 headline 77 · rows 62/7/8 | T-2 |
| S-1.1 AND IT MUST program-wide | T-3 (scope test) + existing host specs |
| S-1.2 only status 5 · BUT not 6/7/1/4 | T-3 (existing breakdown specs re-run) |
| S-1.3 tooltip · MUST NOT "W1/W2 only" | T-2 |
| S-2.1 proportions | T-2 (math) + T-5 (rendered) |
| S-2.2 / S-2.3 / S-2.5 / S-2.6 | T-2 |
| S-2.4 min width · AND IT MUST clickable | T-2 (button present) + T-5 (real width) |
| S-3.1 / S-3.2 destination + chips | T-3 (params) + T-1 (chips from params) + T-5 |
| S-3.1 AND IT MUST no `section` | T-3 |
| S-3.3 pending | T-3 + T-5 |
| S-3.4 zero navigates | T-3 |
| S-3.5 no toggle · BUT popover still works | T-2 (no toggle) + T-3 regression (host section control specs green) |
| S-4.1 … S-4.4 | T-1 |
| S-4.3 AND IT MUST not throw / not empty | T-1 |
| S-4.5 board unaffected | T-1 |
| STD-R-5 parity · MUST report mismatch | T-5 |
| NFR a11y contrast / labels | T-2 (labels) + T-5 (contrast) |
| NFR no new HTTP | T-3 review: no new service call in diff |
