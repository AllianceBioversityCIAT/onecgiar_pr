# Tasks — Previously reported tag on the SP Results list

> **In one line:** two tasks. **T-1** maps the flag (pure logic, TDD). **T-2** renders the pill (template + scss). It is followed by one human visual check on SP09, because jsdom cannot see layout or colour.

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/programme-results-previously-reported` · Lite · gated |
| Implements | PRP-R-1..R-5, PRP-NFR-1..3 · design PRP-DD-1..DD-8 |
| Budget | 2 tasks · ~90 LOC · 1 review round (`design.md` §10) · **amended to 4 tasks · ~300 LOC (`design.md` §11.5)** |
| PR | single PR → `qa-development-2026-ss`. Commit format `✨ feat(programme-results) [P2-3953]: …` (no apostrophes in the subject) |

## 2. Pre-flight checklist

- [ ] On `qa-development-2026-ss`. Unrelated working-tree changes are left untouched and are not staged with this spec
- [ ] RAM free ≥ 4 GB before Jest. Every run uses `--maxWorkers=2` and is scoped with `--testPathPattern=programme-results`
- [ ] Never run unscoped `npx jest`

## 3. Task list

### PRP-T-1 — Map `is_replicated` into `ProgrammeResultRow.isReplicated`

| Field | Value |
|---|---|
| Status | [x] done (2026-10-13, Reviewer PASS attempt 1 — see `execution.md`) |
| Size | XS |
| Depends on | — |
| Review | `checklist` |
| Implements | PRP-R-1 (S-1.2, S-1.3 "decided by the row's own flag"), PRP-NFR-1 · PRP-DD-1 · design §4, §8 |
| Skills | `tdd`, `angular-developer` |

**Scope**
- `services/programme-results.service.ts`: add `isReplicated?: boolean` with a doc comment to `ProgrammeResultRow`. Set it in `toProgrammeResultRow()`: `true` only for `1`, `'1'` or `true`.
- No other consumer changes. `my-work-board` fixtures stay as they are.

**Tests (PRP-TEST-1, red first)** in `services/programme-results.service.spec.ts`:
- `is_replicated` `1`, `'1'`, `true` → `true`
- `0`, `'0'`, `null`, key absent → `false`
- the category does not matter: `result_type` innovation vs knowledge product with the same flag → same result (S-1.3)

**Verification**
`npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern=programme-results` from `onecgiar-pr-client/`

**Done when**
- The new cases fail before the mapper change and pass after.
- The existing `programme-results` and `my-work-board` specs pass and `tsc` raises no type errors.

**Input that must FAIL:** a mapper written as `!!raw.is_replicated` must fail the `'0'` case. If it does not, the test does not discriminate. Fix the test.

**Disqualifier:** if the red run passes before the change, the test is not evidence.

---

### PRP-T-2 — Render the pill in the RESULT cell

| Field | Value |
|---|---|
| Status | [x] done (2026-10-13, Reviewer PASS attempt 1 — see `execution.md`; PRP-HITL-1 still pending) |
| Size | S |
| Depends on | PRP-T-1 |
| Review | `checklist` |
| Implements | PRP-R-1 (S-1.1, S-1.2 "must NOT render the pill, a placeholder or spacing"), PRP-R-2 (S-2.1, including "Results Center must NOT be modified"), PRP-R-3 (S-3.1), PRP-R-4 (S-4.1, including "pill text must NOT enter search or CSV"), PRP-NFR-2, PRP-NFR-3 · PRP-DD-2..DD-4 · design §7 |
| Skills | `angular-developer`, `spartan` (visual change, per team rule), `tailwind-design-system` |

**Scope**
- `programme-results.component.html` (`@case ('title')`): line 1 becomes a flex row, `min-w-0 items-center gap-[6px]`.
  - The pill is rendered with `@if (row.isReplicated)` and nothing in the else branch.
  - The existing title span moves inside the row unchanged, and gains `min-w-0`.
  - Line 2 is untouched.
- `programme-results.component.scss`: add `.pgr-badge-replicated` with the exact values in design §7, plus the comment `mirrors results-list .rc-badge-replicated`.
- `programme-results/CLAUDE.md`: add one Contract line stating that `isReplicated` drives the pill and that the pill is template-only.
- **Not touched:** `cellText()`, the search predicate, the CSV export, and every file under `pages/results/`.

**Tests (PRP-TEST-2)** in `programme-results.component.spec.ts`:
- A replicated row renders exactly one `.pgr-badge-replicated`:
  - its text is `Previously reported`;
  - its tooltip attribute is `Previously reported in an earlier phase`;
  - in the DOM it comes before the title text (S-1.1, DD-3).
- A non-replicated row has no `.pgr-badge-replicated` element at all, and line 1 holds only the title span (S-1.2).
- The search text `Previously reported` does not match a replicated row whose title lacks those words.
- The CSV line of a replicated row has the plain title (S-4.1).

**Verification**
- Same scoped Jest command as T-1.
- `npx eslint <touched .ts files> --quiet`.
- `git diff --stat -- onecgiar-pr-client/src/app/pages/results/` shows no changes (S-2.1 negative).

**Done when**
- All PRP-TEST-2 cases and the existing `programme-results` specs are green.
- The diff touches only the files listed in Scope.

**Input that must FAIL:** dropping the `@if` (pill always shown) must fail the S-1.2 case. Putting the pill text into `cellText('title')` must fail the CSV case.

**What these tests cannot prove:** the presence of the class does not prove the look matches, or that the pill survives a long title. jsdom has no layout. That is covered by the HITL visual check (§6), never by a green Jest run.

### PRP-T-3 — Opt-in `groupBy` on `app-pr-table` (amendment)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-13, Reviewer PASS attempt 1 — see `execution.md`) |
| Size | S |
| Depends on | — |
| Review | `checklist` |
| Implements | PRP-R-5 (S-5.2, S-5.4 "every other screen behaves as before") · PRP-DD-5, DD-6, DD-8 · design §11.2 step 1 |
| Skills | `tdd`, `angular-developer` |

**Scope**
- `shared/components/pr-table/pr-table.component.ts`: add an optional `groupBy` input, using the same setter/signal pattern as `sortField`. Then change `sortedValue` as follows:
  - if `groupBy` is empty, use the current code path unchanged;
  - if `groupBy` is set, bucket the rows by `resolve(row, groupBy)` and keep members in input order;
  - sort the buckets by their first member, using the existing comparator and the existing `sortField`/`sortOrder`;
  - flatten the result.
- Paging, `totalRecords`, `pageRangeLabel` and `sort()` are not touched.
- **Not touched:** any other consumer of `app-pr-table`, and `pr-group-table`.

**Tests (PRP-TEST-3, red first)** in `pr-table.component.spec.ts`:
- `groupBy` set, sort by a field where the members differ, ascending and descending: the members stay consecutive, in input order, and the block is placed by its first member.
- `groupBy` set, no `sortField`: input order is preserved.
- `groupBy` absent: the existing specs stay green, and one explicit case shows that the same data sorts exactly as before.
- Paging still slices rows: `totalRecords` equals the row count.

**Verification:** from `onecgiar-pr-client/`, run `npx jest --runInBand --silent --no-coverage --testPathPattern="pr-table|programme-results|my-work-board"`, then `ESLINT_USE_FLAT_CONFIG=false npx eslint <touched .ts> --quiet`.

**Input that must FAIL:** a `groupBy` that is ignored (today's flat sort) must fail the "members stay consecutive" case.

---

### PRP-T-4 — Group the versions of one result in the SP list (amendment)

| Field | Value |
|---|---|
| Status | [x] done (2026-10-13, Reviewer PASS attempt 1 — see `execution.md`; HITL-1 re-run pending) |
| Size | S |
| Depends on | PRP-T-3 |
| Review | `checklist` |
| Implements | PRP-R-5 (S-5.1..S-5.4), PRP-R-4 (S-4.1 as amended) · PRP-DD-6, DD-7, DD-8 · design §11.2 steps 2–3, §11.3 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system` |

**Scope**
- `programme-results.component.ts`:
  - add a `computed` that feeds the table: `filteredRows()` stably re-ordered so that inside each `code` the newest phase comes first (`phaseSort` descending);
  - `filteredRows()`, counters, search and `exportCsv()` are not touched.
- `programme-results.component.html`:
  - the table gets `groupBy="code"` and the new `computed` as `[value]`;
  - the body row gets `pgr-group-start` / `pgr-group-cont` classes, computed from `index` and `tbl.pagedValue()`;
  - Tailwind-first, as far as the row divider allows. If the divider lives in SCSS, adjust it there in the narrowest way.
- `programme-results/CLAUDE.md`: add one contract line, and re-stamp `Verified:` (this also covers the PRP-T-2 advisory).

**Tests (PRP-TEST-4)** in `programme-results.component.spec.ts`:
- A pair with the same code (2026 replicated, 2025 not) renders consecutive rows, 2026 first. The first row has `pgr-group-start` and the second has `pgr-group-cont`.
- After sorting by the status column (via the table `sort()`), in both directions, the pair is still consecutive and newest first.
- A singleton row has neither class.
- The CSV row order and contents, the counters and the total label are equal to the values computed from `filteredRows()` (S-5.4).

**Verification:** same as PRP-T-3, plus `git diff --stat -- onecgiar-pr-client/src/app/pages/results/` must be empty.

**Input that must FAIL:** dropping `groupBy="code"` must fail the "consecutive after sorting by status" case.

**What these tests cannot prove:** that the block looks like the screenshot. HITL-1 covers that, re-run after this task.

## 4. Dependency graph

```text
PRP-T-1 ──► PRP-T-2 ──► HITL-1 (done 2026-10-13: pill OK, grouping requested)
PRP-T-3 ──► PRP-T-4 ──► HITL-1 re-run (§6, + step 5)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| PRP-TEST-1 | unit (client) | PRP-R-1 S-1.2, S-1.3 | `.../programme-results/services/programme-results.service.spec.ts` |
| PRP-TEST-2 | unit (client) | PRP-R-1 S-1.1/1.2, PRP-R-4 S-4.1 | `.../programme-results/programme-results.component.spec.ts` |
| PRP-HITL-1 | manual visual | PRP-R-2 S-2.1, PRP-R-3 S-3.1, PRP-NFR-2/3 | §6 |

**Scenario / clause closure**

| Clause | Owner |
|---|---|
| S-1.1 pill + tooltip | T-2 (TEST-2) |
| S-1.2 no pill, no placeholder, no spacing | T-1 (falsy values) + T-2 (no element) |
| S-1.3 any type, any phase; the row flag decides | T-1 (category case) + HITL-1 (earlier phase on SP09) |
| S-2.1 same look; Results Center must NOT change | HITL-1 + T-2 (`git diff` on `pages/results/` is empty) |
| S-3.1 the pill stays whole, the title truncates | T-2 (flex/`flex: none` structure) + HITL-1 (proves it rendered) |
| S-4.1 nothing else changes; not in search or CSV | T-2 (search + CSV cases) + existing specs |
| NFR-1 client only | T-1/T-2 scope (no server files in the diff) |
| NFR-2 tokens | T-2 scss + HITL-1 |
| NFR-3 read as text | T-2 (no `aria-hidden` on the pill) |

## 6. Rollout & verification (HITL)

Local stack on `:4200`, **read only**, because it is backed by the shared prdb. No clicks on write buttons.

1. Open `/result-framework-reporting/entity-details/SP09/results?tocView=aows&phase=Reporting%202026%20-%20P25` and confirm that replicated rows carry the pill and new rows do not.
2. Open the same result in the Results Center and compare text, tooltip, colour and size side by side.
3. Narrow the RESULT column (or the window) on a long-title row: the pill must stay whole.
4. Switch to `Reporting 2025` and spot-check one innovation and one non-innovation.
5. *(Amendment)* With 2026 and 2025 selected, check the following:
   - the versions of one code read as one block, like the user's screenshot;
   - sorting by Status keeps each block together;
   - single rows look unchanged.

**Disqualifier:** if SP09 has no replicated row in the selected phase, the check is inconclusive. Use another SP, picking one that the Results Center shows with the tag. Never pass the check on an empty sample.

## 7. Cleanup & follow-ups

- Extract a shared `Previously reported` badge and adopt it in the Results Center and in `innovation-package-custom-table` (separate spec).
- ~~Proposal OQ-1: stack replicas~~ — pulled into this spec on 2026-10-13 as PRP-R-5 (PRP-T-3, PRP-T-4), at the user request after HITL-1.
- Fix the stale payload-key list in the `ProgrammeResultRow.updated` doc comment (it omits `is_replicated`).

## 8. Roll-back plan

Revert the single commit. There is no data, migration or API state involved.

## Required cross-references

`proposal.md` · `requirements.md` · `design.md` · ticket P2-3953
