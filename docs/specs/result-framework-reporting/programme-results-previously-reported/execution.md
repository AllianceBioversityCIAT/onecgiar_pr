# Execution Log — Previously reported tag on the SP Results list

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/programme-results-previously-reported` · Lite |
| Ticket | P2-3953 |
| Approval Mode | `gated` |
| Branch | `qa-development-2026-ss` |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Started | 2026-10-13 |

**Run-wide deviation (user-authorised, 2026-10-13):** the pre-flight check failed with about 1.1–1.8 GB of free RAM, below the 4 GB the checklist requires. The user authorised running anyway, for today only. Every Jest run therefore uses `--runInBand` instead of `--maxWorkers=2`, which is lighter, and stays scoped.

## 2. Task Execution History

### PRP-T-1 — Map `is_replicated` into `ProgrammeResultRow.isReplicated`

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-13 |
| Skills | `tdd`, `angular-developer`, as listed in the task |
| Effort | medium |
| Requirements | PRP-R-1 (S-1.2, S-1.3), PRP-NFR-1 · PRP-DD-1 · design §4, §8 |

**Attempt 1: files changed**

- `onecgiar-pr-client/.../programme-results/services/programme-results.service.ts`
  - Adds `isReplicated?: boolean` to `ProgrammeResultRow`, with a doc comment.
  - `toProgrammeResultRow()` always sets it, using a strict `=== 1 || === '1' || === true`.
- `onecgiar-pr-client/.../programme-results/services/programme-results.service.spec.ts`
  - Adds the `describe('isReplicated')` block (PRP-TEST-1):
    - truthy cases: `1`, `'1'`, `true`;
    - falsy cases: `0`, `'0'`, `null`, `false`, `2`, `''`, and an absent key;
    - a category-independence case for S-1.3.
  - Adds `isReplicated: false` to the existing `maps every row to the table contract` `toEqual`. This follows directly from "the mapper always sets it".

**Verification**

| Check | Command | Result |
|---|---|---|
| Red (before the mapper change) | `npx jest --runInBand --silent --no-coverage --testPathPattern="programme-results.service.spec"` | `Tests: 11 failed, 48 passed, 59 total`, all with `Expected: true / Received: undefined` |
| Green | `npx jest --runInBand --silent --no-coverage --testPathPattern="programme-results\|my-work-board"` | `Test Suites: 12 passed, 12 total` · `Tests: 454 passed, 454 total` |
| Types | `npx tsc --noEmit -p tsconfig.app.json` | clean |
| Lint | `ESLINT_USE_FLAT_CONFIG=false npx eslint <2 files> --quiet` | clean |

**Reviewer verdict: `STATUS: PASS`.** The diff meets every PRP-T-1 point. The mapper is strict per PRP-DD-1. The `'0'` case tells the strict mapper apart from `!!raw.is_replicated`. The red run failed before the change. The scope is the two named files only: no server files and no `my-work-board` fixture churn.

The Reviewer added two non-blocking evidence notes:

1. The run used `--runInBand` instead of `--maxWorkers=2`. This is acceptable because it is lighter, and it is the run-wide deviation recorded above.
2. The red count was 11 where the `toEqual` edit would have made 12, so that edit was made after the red run. This does not affect the verdict.

**Decisions and issues**

- The extra falsy cases (`false`, `2`, `''`) go beyond the work order's list. They follow the spec's rule that anything else is false.
- Plain `npx eslint` fails here: ESLint 9 finds no flat config because the repo uses `.eslintrc.json`. It runs with `ESLINT_USE_FLAT_CONFIG=false`. This is an environment note, not a defect of this spec.
- The Implementer did not run the `!!raw.is_replicated` variant to prove the test fails on it. Both the Implementer and the Reviewer reached that by reasoning.
- The Implementer used `git stash` and `git stash pop` once to check the baseline. The tree was restored intact.
- **Deliberately not done (out of task scope, not owed):**
  - The stale `ProgrammeResultRow.updated` comment remains a `tasks.md` §7 follow-up.
  - The `programme-results/CLAUDE.md` contract line belongs to PRP-T-2.

**Final verification:** green as shown above. Not committed (the commit happens after PRP-T-2 and only on the user's go-ahead).

### PRP-T-2 — Render the pill in the RESULT cell

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-13 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, as listed in the task |
| Effort | medium |
| Requirements | PRP-R-1 (S-1.1, S-1.2), PRP-R-2 (S-2.1 negative), PRP-R-3 (S-3.1 structure), PRP-R-4 (S-4.1), PRP-NFR-2, PRP-NFR-3 · PRP-DD-2..DD-4 · design §7 |

**Attempt 1: files changed** (all under `onecgiar-pr-client/.../programme-results/`)

- `programme-results.component.html`: line 1 of the RESULT cell is now a flex row (`min-w-0 items-center gap-[6px]`).
  - The pill is behind `@if (row.isReplicated)`, with no else branch. It uses `prTooltip` and `prTooltipPosition="top"`, and has no `aria-hidden`.
  - The title span is unchanged except that it gains `min-w-0`. Line 2 is untouched.
- `programme-results.component.scss`: adds `.pgr-badge-replicated` with the design §7 values and the source comment.
- `CLAUDE.md`: adds one Contract line. `isReplicated` drives the pill, and the pill is template-only.
- `programme-results.component.spec.ts`: adds the `Previously reported pill (PRP-T-2)` block with 4 tests (PRP-TEST-2):
  - S-1.1: pill text, tooltip, no `aria-hidden`, and DOM order;
  - S-1.2: no pill on a non-replicated row;
  - search does not match the pill text;
  - the CSV title stays plain.

**Verification**

| Check | Command / action | Result |
|---|---|---|
| Tests | `npx jest --runInBand --silent --no-coverage --testPathPattern="programme-results\|my-work-board"` | `Test Suites: 12 passed, 12 total` · `Tests: 458 passed, 458 total` |
| Mutation 1 | `@if (row.isReplicated)` replaced with `@if (true)` | 1 failed: "renders no pill, placeholder or sibling on a non-replicated row (S-1.2)". Reverted |
| Mutation 2 | `cellText('title')` prefixed with `'Previously reported '` | 1 failed: "keeps the CSV title plain for a replicated row (S-4.1)". Reverted |
| Lint | `ESLINT_USE_FLAT_CONFIG=false npx eslint programme-results.component.spec.ts --quiet` | clean |
| S-2.1 negative | `git diff --stat -- onecgiar-pr-client/src/app/pages/results/` | empty |
| Exemplar | `.rc-badge-replicated` (`pages/results/pages/results-outlet/pages/results-list/results-list.component.scss:809`) | values identical to design §7 |

**Reviewer verdict: `STATUS: PASS`.** The diff does what PRP-T-2 asks for, in the four Scope files only:

- The template, styles and tests match the spec. The text and tooltip are word-for-word the same as `results-list.component.html:292-294`.
- Both mutations were executed and failed the expected cases.
- `cellText()`, search and CSV were not touched, and `pages/results/` has no diff.
- The look and long-title behaviour are correctly left to HITL-1.

**ADVISORY (4R, recorded, not acted on):**

1. *Process.* `programme-results/CLAUDE.md` still has the `**Verified:**` stamp `2026-09-24 · performance-refactor · c4672034b`. The client CLAUDE.md §10 says to re-stamp it in the same commit. **The Leader carries this as a pre-commit step.**
2. *Reliability.* The search test proves something only because the fixture titles lack the words. A control assertion (a `bean` search still returning row 6001) would show the search actually ran.
3. *Reliability.* The CSV test does not restore `URL.createObjectURL` / `revokeObjectURL`, and has no `try/finally`. Low risk in this file.
4. *Readability.* The selector `span.flex.min-w-0.items-center` relies on line 1 coming before line 2, which has the same classes. A `data-testid` would be more robust.
5. *Process.* Jest ran with `--runInBand` instead of `--maxWorkers=2`, per the run-wide deviation. No action needed.

**Decisions and issues**

- The spec gives the exemplar path as `results-list.component.scss`. It actually lives under `pages/results/pages/results-outlet/pages/results-list/`. The file was only read.
- The `prTooltip` test reads the static attribute from the DOM.
- Visual parity (S-2.1) and the long-title behaviour (S-3.1) are not proven by jsdom. **Pending: PRP-HITL-1** (tasks.md §6), a human visual check on SP09. It is read only, because the local stack writes to the shared prdb.

**Final verification:** green as shown above. Not committed. Committing needs the user's go-ahead and the Verified re-stamp.

## 3. Summary

Both tasks passed on the first attempt. Budget: 2 tasks, 1 review round each, all within `design.md` §10. Client only, with no server or payload change. Pending:

- **PRP-HITL-1** visual check on SP09 (user).
- Commit with the `CLAUDE.md` Verified re-stamp (on the user's go-ahead).
- `tasks.md` §7 follow-ups (shared badge, OQ-1, stale `updated` comment).
- Advisories 2–4 above, which are optional test hardening and not part of this spec.

## Pivot Record: PRP-R-5 (scope amendment after HITL-1)

| Field | Value |
|---|---|
| Date | 2026-10-13 |
| Trigger | During HITL-1 on SP09 the user confirmed the pill renders. They then saw the 2026 replica and its 2025 original as two unrelated rows, and asked for them inside one box (Results Center screenshot) |
| Nature | **Scope amendment, not a defect.** PRP-T-1 and PRP-T-2 stay `[x]`. The approved Option A explicitly left proposal OQ-1 (stacking) out |
| User decisions | 1. The versions stay together under **any** sort ("Siempre juntas"). 2. The look matches the user's screenshot: one block, no divider inside, code repeated on every line. The image overrides the earlier "code shown once" pick. No violet border, per UI hard rule 7 |
| Revised direction | An opt-in `groupBy` on the shared `app-pr-table` (PRP-DD-5). The newest member anchors the sort (DD-6). Rows stay separate and are only drawn as one block (DD-7). Paging stays row-based (DD-8) |
| Spec changes | `requirements.md`: PRP-R-5 (S-5.1..S-5.4), the Scope table, and the S-4.1 sorting clause. `design.md` §11. `tasks.md`: PRP-T-3, PRP-T-4, the dependency graph, HITL step 5, the budget line, and the §7 follow-up struck |
| Correction closure | Forward sweep: grepped `stacking` / `Option B` / `R-1..R-4` across the three spec files, fixed the `tasks.md` Implements line and the §7 follow-up, and none remain. Backward sweep: S-4.1 "sorting identical" was amended to except group adjacency |
| Budget | Re-baselined from 2 tasks · ~90 LOC to **4 tasks · ~300 LOC** (`design.md` §11.5) |
| ADR impact | None. A shared-component opt-in input is not an architecture decision |
| Status | **Approved by the user 2026-10-13** |

### PRP-T-3 — Opt-in `groupBy` on `app-pr-table` (amendment)

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-13 |
| Skills | `tdd`, `angular-developer`, as listed in the task |
| Effort | high. Raised from the medium default because `app-pr-table` is a shared component with about 50 consumers |
| Requirements | PRP-R-5 (S-5.2, S-5.4) · PRP-DD-5, DD-6, DD-8 · design §11.2 step 1 |

**Attempt 1: files changed**

- `shared/components/pr-table/pr-table.component.ts`
  - Adds an optional `groupBy` input (setter into a `_groupBy` signal).
  - Moves the comparator into a private `compare()`. The logic is unchanged.
  - `sortedValue` takes the old path when `groupBy` is empty. Otherwise it buckets rows with a `Map`, sorts the buckets by their first member, and flattens them.
- `shared/components/pr-table/pr-table.component.spec.ts`: adds `groupBy (PRP-TEST-3)`, with 6 cases:
  - ascending order;
  - descending order;
  - no sortField;
  - flat order when `groupBy` is absent;
  - an empty `groupBy` treated as absent;
  - `totalRecords` and paging.

**Verification**

| Check | Result |
|---|---|
| Red, before the implementation | `Tests: 4 failed, 29 passed, 33 total`. The two flat-order cases passed, as expected |
| Green, `npx jest --runInBand --silent --no-coverage --testPathPattern="pr-table\|programme-results\|my-work-board"` | `Test Suites: 14 passed, 14 total` · `Tests: 513 passed, 513 total` |
| Mutation: `groupBy` forced to `''` | 4 failed, including "members stay consecutive" in both directions. Reverted |
| Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint` (2 files) | clean |

**Reviewer verdict: `STATUS: PASS`.** The diff meets the PRP-T-3 scope, design §11.2 step 1, DD-5, DD-6 and DD-8, and S-5.2 and S-5.4. The Reviewer checked why behaviour without `groupBy` is unchanged:

- An empty `groupBy` takes the old branch, and with no sortField it returns the same `data` reference.
- `compare()` is the old comparator, unchanged line by line.
- No existing template binds `groupBy`, so no consumer turns it on by accident.
- Paging, `totalRecords`, `pageRangeLabel`, `sort()` and `reset()` are untouched.

The expected arrays were checked by hand against the fixture.

**ADVISORY (recorded, not acted on):**

1. *Readability.* The class docblock at L20 ("Row grouping / expansion live in the sibling app-pr-group-table") is partly stale. It should mention `[groupBy]`.
2. *Reliability.* The `Map` keys use SameValueZero:
   - `null` and `undefined` group values form separate buckets;
   - rows with no group value merge into one block;
   - object keys group by reference only.

   This is irrelevant for PRP-T-4, where `code` is a non-empty primitive, but it is worth noting in the input doc.
3. *Risk.* The descending fixture happens to equal the input order. Ascending still proves ordering, but a fixture whose descending result differs would be stronger.

**Decisions and issues**

- `pr-table` has no folder `CLAUDE.md`, so there was nothing to re-stamp.
- `codegraph_impact` was not available to the Implementer. That was mitigated by the change being opt-in, the Reviewer's grep, and the explicit case for unchanged flat sorting.
- The specs of the other ~50 consumers were not run, because the change is opt-in.

**Final verification:** green as shown above. Not committed.

### PRP-T-4 — Group the versions of one result in the SP list (amendment)

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-10-13 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, as listed in the task |
| Effort | medium |
| Requirements | PRP-R-5 (S-5.1..S-5.4), PRP-R-4 S-4.1 (amended) · PRP-DD-6, DD-7, DD-8 · design §11.2 steps 2–3, §11.3 |

**Attempt 1: files changed** (`programme-results/`)

- `programme-results.component.ts`:
  - `groupedRows` computed: `filteredRows()` with the newest `phaseSort` first inside each code. Blocks keep the order in which their code first appears.
  - `isGroupStart` / `isGroupCont`, both computed from `tbl.pagedValue()`.
  - Additive inline-style rules: the start row's divider is `transparent`; start and cont rows get `min-height` 40px and 4px vertical cell padding; the first member gets 8px top and the last member 8px bottom. No colour.
- `programme-results.component.html`:
  - the table gets `groupBy="code"` and `[value]="groupedRows()"`;
  - the body template takes `let-i="index"`;
  - the row gets the `pgr-group-start` / `pgr-group-cont` class bindings;
  - `[paginator]` still uses `filteredRows().length`.
- `programme-results.component.spec.ts`: adds `Grouped versions of one result (PRP-T-4)`, with 5 tests (PRP-TEST-4).
- `CLAUDE.md`: adds the grouping contract line. `Verified:` is re-stamped to `2026-10-13 · qa-development-2026-ss · 5e6263f4c`, which also covers the PRP-T-2 advisory.

**Verification**

| Check | Result |
|---|---|
| `npx jest --runInBand --silent --no-coverage --testPathPattern="pr-table\|programme-results\|my-work-board"` | `Test Suites: 14 passed, 14 total` · `Tests: 518 passed, 518 total` |
| Mutation: drop `groupBy="code"` | The status-sort cases fail in both directions (2 failed, 130 passed). Restored |
| Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint` (component .ts + .spec.ts) | clean |
| `git diff --stat -- onecgiar-pr-client/src/app/pages/results/` | empty |

**Reviewer verdict: `STATUS: PASS`.** The diff covers the full PRP-T-4 scope. It meets S-5.1..S-5.4, S-4.1 as amended, DD-6..DD-8, and design §11.2–§11.3. The Reviewer checked the following:

- `groupedRows` orders each block correctly and is stable, because `phaseSort` has the form `YYYY_Pxx`.
- `filteredRows()`, the counters, search and CSV are untouched.
- A block split at a page boundary renders as DD-8 accepts.
- The divider logic works for a middle member.
- No colour was added (UI rule 7).
- The overrides win on specificity.

**ADVISORY (recorded, not acted on):**

1. *Reliability.* The grouped-row `td.pgr-td` padding also overrides `td.pgr-td:first-child { padding: 0 }`, so the select/checkbox cell of grouped rows gets 4px/8px of vertical padding. **Check the checkbox alignment at HITL-1 step 5.** The fix, if needed, is `:not(:first-child)`.
2. *Readability (test gap).* The S-5.4 test covers CSV order and contents, `totalLabel()` and `totalRecords()`, but not `statusCounts()`. The risk is low, because the counter code is not in the diff.
3. *Readability.* The folder `CLAUDE.md` was already over the 120-line cap and now has 203 lines. Trim it later.
4. *Risk.* The 40px / 4px "tighter" spacing is the Implementer's reading of §11.3. Only HITL-1 can confirm it.

**Final verification:** green as shown above. Not committed.

## 4. Summary (after amendment)

All 4 tasks passed on the first attempt (PRP-T-1..T-4). Budget: 4 tasks, re-baselined at the user's request (`design.md` §11.5); the diff is about 420 lines including tests. The change is client-only:

- `programme-results/` (6 files);
- the shared `app-pr-table`, as an opt-in input (2 files).

**Pending:**

- **PRP-HITL-1 re-run** by the user (`tasks.md` §6, steps 1–5). Read-only on the shared prdb. Include the checkbox alignment of grouped rows (advisory T-4 #1).
- **Commit**, on the user's go-ahead. The `Verified:` re-stamp is already in the diff. The subject has no apostrophes.
- Optional follow-ups recorded in the advisories: test hardening, the pr-table docblock, and trimming the folder `CLAUDE.md`.

## HITL-1 re-run (2026-10-13, user)

| Step | Result |
|---|---|
| 1. Pill on replicated rows, none on new rows | ✅ The user's screenshot shows the pill on 8387 and 8382 (Editing) and none on their Pending Review twins or on the singletons |
| 5a. Versions of one code read as one block | ✅ 8387 and 8382 are each a pair with no inner divider, newest first. The user confirmed that the single-row grey seen on 8382 was their own mouse hover (per-row hover, as designed in §11.3), "no hay problema" |
| 5b. Status sort keeps blocks together | Not shown in the screenshot. Covered by PRP-TEST-4 |
| Checkbox alignment on grouped rows (T-4 advisory #1) | No select column was visible in the screenshot. Not checked |
