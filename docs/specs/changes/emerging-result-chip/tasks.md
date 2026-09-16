# Tasks — Surface emerging results as their own label

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/emerging-result-chip/` |
| Requirements | `./requirements.md` |
| Design | `./design.md` |
| Depth | **Standard** |
| Budget (from `design.md` §14) | **5 tasks · ~130 LOC · 1 review round** — a tripwire; exceeding it escalates, it does not fail |
| Status | draft |

---

## 1. Scope of this task list

Five tasks: one measurement before any code, one server change, two client changes, one verification that only a human or a real environment can perform. `EMG-R-8` (tooltip, MAY) is **not** implemented.

## 2. Pre-flight checklist

Run before `EMG-T-1`. Two of these have bitten this repo before. **Executed 2026-09-16 — see `execution.md` → Pre-flight.**

- [x] **`onecgiar-pr-client/src/environments/` does not exist in this worktree, and `onecgiar-pr-server/.env` does not either.** Verified 2026-09-16. Copy both from the main checkout first — without them the client suite dies with `Cannot find module` and reports `Tests: 0`, which reads exactly like a pass. → both were missing; copied from `/Users/jguzman/GitHub/CGIAR/onecgiar_pr`.
- [x] **`node_modules` in both packages** — *not originally on this list*; it was also missing, and it blocks every command in §6. `npm ci` run in both, exit 0.
- [x] Confirm the working branch. This checkout is 50 commits behind `origin/performance-refactor`; re-run `git diff --name-only HEAD origin/performance-refactor -- <the 4 files in scope>` and confirm it is still empty before starting. → ⚠️ **it is no longer empty.** Now 55 commits behind, and `b18c365c3` touches `result.repository.ts` (adds `r.is_replicated,` to the same `SELECT` `EMG-T-1` edits). Assumption `A-3` corrected in `execution.md`; impact assessed low (two additive columns in one `SELECT`).
- [x] `git branch --show-current` — do not work on `master`, and re-check before committing, not only at the start. → `JuanGuzman-io/check-performance-refactor-base`.

---

## 3. Task list

### `EMG-T-0` — Measure the `UNTAGGED` residual before writing code

| | |
|---|---|
| **Status** | `[~]` — **measured 2026-09-16; escalated.** Counts below. See `execution.md` → `EMG-T-0` |
| **Size** | XS (no code) |
| **Depends on** | — |
| **Requirements** | Assumption `A-2`; gap `G-3` |
| **Design** | `design.md` §13 |
| **Skills** | — |

**Scope.** Against **prtest**, for one program (SP01) on the active phase, count the results that land in `UNTAGGED` and split them by the owner row's `planned_result`: `0`, `1`, and *no row*. Three numbers, nothing else.

**Why first.** The whole premise is that `UNTAGGED ≈ emerging`. If the `planned_result = 1` slice is large, users will keep seeing `Not tagged` everywhere and read the change as unshipped — and the right answer becomes Option C, not this spec. Finding that out after five tasks is the expensive ordering.

**Done criteria.** The three counts are recorded in this file under `EMG-T-0`, plus the *no row* count (which is `G-2`'s real size — emerging Knowledge Products live there).

**Verification.** A read-only query run by the user (Juan David has prtest access; agents do not). No code changes.

**What disqualifies the evidence.** A count taken against the wrong phase or the wrong `version_id` measures a different population and is worthless — record the `version_id` alongside each number or do not record the number. A count that cannot be reproduced on a second run is not a measurement.

**What would make this FAIL.** `planned_result = 1` dominating the `UNTAGGED` bucket. That result does not block the spec, it **re-opens it** — escalate rather than proceeding to `EMG-T-1`.

#### Measurement (recorded 2026-09-16 — environment `test`, `version_id = 36`, `toc_pahse_id 7baf200a-c958-4ded-9894-6557a94cae18`, SP01 = initiative 50)

SP01 `UNTAGGED` bucket — 174 rows:

| Owner-row state | Count | Share | Cell after the change |
|---|---:|---:|---|
| `planned_result = 0` | 47 | 27% | **`Emerging`** |
| `planned_result = 1` | 36 | 21% | `Not tagged` (unchanged) |
| no active owner row → `null` | 91 | 52% | `Not tagged` (unchanged) |

Portfolio-wide (SPs 01–13, v36, owner results): **103 relabelled / 327 `= 1` / 238 no-row = 15% of 668.**

The 238 no-row results are **not** predominantly Knowledge Products as `G-2` assumed — KPs are 15 of 238 (6%); Innovation use is 129.

**Outcome: implemented for P25 (2025–2030).** Follow-up investigation resolved the 223 non-KP rows, but the agreed scope leaves those historical no-row cases unchanged. `planned_result` is exposed on the result-list payload, and the two P25 screens use it for the `Emerging` label/chip. See `execution.md` → Follow-up investigation.

---

### `EMG-T-1` — Expose `planned_result` on the result-list payload

| | |
|---|---|
| **Status** | `[x]` implemented |
| **Size** | S (~15 LOC + ~20 test) |
| **Depends on** | `EMG-T-0` |
| **Requirements** | `EMG-R-1`, `EMG-R-2` · `EMG-AC-7` |
| **Design** | `design.md` §4, §5, `EMG-DD-2`, `EMG-DD-3`, `EMG-DD-4` |
| **Skills** | `nestjs-expert`, `tdd` |

**Scope.** In `onecgiar-pr-server/src/api/results/result.repository.ts`, inside `AllResultsByRoleUserAndInitiativeFiltered`'s `baseQuery` `SELECT`, add one correlated scalar subquery next to the existing `has_discontinued_options`:

- `MAX(planned_result)` over `results_toc_result`, filtered `is_active = 1`, correlated on `results_id = r.id` **and** `initiative_id = rbi.inititiative_id`, aliased `planned_result`.
- Touch nothing else — no new `JOIN`, no change to `WHERE`, `GROUP BY`, `ORDER BY`, or the pagination/count path.

**Done criteria.**
- The alias appears in the payload as `0`, `1`, or `null`.
- `MAX` semantics hold: zero rows → `null`; `{0}` → `0`; `{0,1}` → `1` (planned wins, `EMG-DD-3`).
- The repository spec asserts the emitted SQL contains the subquery **and** that the query's `JOIN` count is unchanged.

**Verification.**
```
cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository"
cd onecgiar-pr-server && npx eslint "src/api/results/result.repository.ts" --quiet
```

**What this check cannot prove.** The spec asserts **SQL text**, which is a presence-assertion: it proves the string is there, never that MySQL returns one row per result. Row multiplication (**D-2**) is structurally invisible to jest here — there is no database in the harness. That proof lives in `EMG-T-4` and nowhere else; this task must not be reported as closing D-2.

**What would make this FAIL.** A fixture whose result carries two active owner rows `{0,1}`: a `JOIN`-based implementation returns two rows and the assertion on `JOIN` count fails. If no input you can name would fail the check, the check is wrong — rewrite it before writing the SQL.

---

### `EMG-T-2` — `Emerging` in the AREA OF WORK column and the CSV

| | |
|---|---|
| **Status** | `[x]` implemented |
| **Size** | S (~35 LOC + ~25 test) |
| **Depends on** | `EMG-T-1` |
| **Requirements** | `EMG-R-4` (both scenarios), `EMG-R-5`, `EMG-R-6` · `EMG-AC-2`, `EMG-AC-4`, `EMG-AC-5`, `EMG-AC-6` |
| **Design** | `design.md` §6.2, `EMG-DD-6` |
| **Skills** | `angular-developer`, `tdd` |

**Scope.**
- `programme-results.service.ts`: add `plannedResult?: number \| null` to `ProgrammeResultRow`; read it in `toProgrammeResultRow` with the **`hasOwnProperty` guard**, mirroring `completeness` (`:283-285`) so an explicit `null` survives instead of collapsing into "absent".
- `programme-results-section-labels.ts`: `sectionLabel` returns `Emerging` only when `key === 'UNTAGGED'` **and** the flag is `=== 0`.
- `programme-results.component.ts`: pass the row's flag through `cellText(row, 'aow')`.
- Do **not** touch `joinResultScope` — it spreads `...row`, so the flag already survives every branch.

**Clauses this task owns.**

| Clause | Test |
|---|---|
| `EMG-R-4` s1 THEN — cell reads `Emerging` | label unit test, `key=UNTAGGED` + `0` |
| `EMG-R-4` s1 **AND IT MUST** keep `sectionState` precedence | render tests for `loading` (skeleton, no text) and `error` / `version-mismatch` (`—`) **with the flag set to `0`** — the label must lose to state |
| `EMG-R-4` s2 THEN / **BUT NOT** | label unit test, `key=UNTAGGED` + `1` → `Not tagged`, never `Emerging` |
| `EMG-R-5` THEN / **BUT NOT** | same, with `null` and with the key absent |
| `EMG-R-5` **AND IT MUST** be indistinguishable from pre-change | snapshot/assert the `null` case renders byte-identically to today's `Not tagged` output |
| `EMG-R-6` | assert `cellText(row,'aow') === ` the rendered cell's `textContent` for an emerging row |

**Verification.**
```
cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results"
cd onecgiar-pr-client && npx ng lint --quiet
```

**What disqualifies the evidence.** `Tests: 0` is **not** a pass — it is the signature of the missing `src/environments/` from the pre-flight. If the summary reports zero suites or zero tests for `programme-results`, the run proved nothing; fix the environment and re-run rather than recording green.

**What would make this FAIL.** A fixture row with `plannedResult: 1` in the `UNTAGGED` bucket: an implementation that renames the bucket instead of gating on the flag renders `Emerging` and the `EMG-AC-4` assertion fails. That fixture is the one that separates this design from the rejected Option A — it is mandatory.

---

### `EMG-T-3` — `Emerging` chip in the Result-list Title cell

| | |
|---|---|
| **Status** | `[x]` implemented |
| **Size** | S (~35 LOC + ~20 test) |
| **Depends on** | `EMG-T-1` |
| **Requirements** | `EMG-R-3` (both scenarios), `EMG-R-5`, `EMG-R-7` · `EMG-AC-1`, `EMG-AC-3`, `EMG-AC-5` |
| **Design** | `design.md` §6.1, `EMG-DD-5` |
| **Skills** | `angular-developer`, `ui-ux-pro-max` |

**Scope.**
- `shared/interfaces/current-result.interface.ts`: `planned_result?: number \| null`.
- `results-list.component.ts`: `isEmerging(result)` → `Number(result?.planned_result) === 0`; one chip-class constant built from `FUNDING_CHIP_BASE` with the neutral token triplet (`--pr-border` / `--pr-surface-app` / `--pr-text-muted`, `EMG-DD-5`).
- `results-list.component.html`: render the chip in the `title` cell (`~:251`), **before** the title text, in the slot the `discontinued-icon` badge already occupies.

**Clauses this task owns.**

| Clause | Test |
|---|---|
| `EMG-R-3` s1 THEN — chip before the title | render test, `planned_result: 0` |
| `EMG-R-3` s1 AND — accessible name is the word `Emerging` | assert the chip's `textContent` is `Emerging`; no `aria-label` needed because it is text |
| `EMG-R-3` s1 **BUT NOT** a new column / no width change | assert the column-definition array is unchanged and the `<th>` count is identical with and without an emerging row |
| `EMG-R-3` s1 **AND IT MUST** preserve title truncation + `title` tooltip | assert the anchor keeps its `rc-title` class and its `[attr.title]` binding |
| `EMG-R-3` s2 THEN — no chip when `1` | render test |
| `EMG-R-3` s2 **BUT NOT** displace `discontinued-icon` | render a row that is **both** discontinued-without-justification and emerging; assert both badges present, in order |
| `EMG-R-5` | render test with `null` and with the key absent → no chip |

**Verification.**
```
cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern="results-list"
cd onecgiar-pr-client && npx ng lint --quiet
```

**What this check cannot prove.** Every assertion above is a **presence-assertion over jsdom markup**. jsdom computes no layout and no colour, so it cannot prove the chip is legible, that it meets WCAG 2.1 AA contrast, or that it does not wrap the title onto a second line at a narrow viewport. A suite fully green here is entirely consistent with a chip that looks broken (**D-4**). That proof is `EMG-T-4`.

**What would make this FAIL.** A row that is simultaneously emerging and discontinued-without-justification: an implementation that replaces the badge slot rather than prepending to it drops `discontinued-icon` and the ordering assertion fails.

---

### `EMG-T-4` — Verify what the harness structurally cannot

| | |
|---|---|
| **Status** | pending |
| **Size** | S (no production code) |
| **Depends on** | `EMG-T-1`, `EMG-T-2`, `EMG-T-3` |
| **Requirements** | `EMG-AC-7`; NFR *Accessibility*, NFR *Correctness* |
| **Design** | `design.md` §10 (defect classes **D-2**, **D-4**) |
| **Skills** | `ui-ux-pro-max` |

**Scope.** The two defect classes `requirements.md` declared as *substituted*, closed here and only here.

**D-2 — row multiplication (`EMG-AC-7`).** Against prtest, same user, same filters, same page size, before and after the change:
- `meta.total` identical;
- returned row count identical;
- one known result appears **exactly once**;
- one known **emerging** result carries `planned_result: 0` and one known planned result carries `1`.

**D-4 — visual check.** At a narrow viewport (~400px) and at desktop width, on a list containing an emerging row:
- the chip is legible against the row background in both light and dark;
- contrast meets WCAG 2.1 AA;
- the title does not reflow or truncate worse than before;
- a row that is both emerging and discontinued shows both badges without collision.

Performed by a human at the approval pause, or routed to a **T6 Multimodal** review of screenshots. A jest run does not substitute for it.

**Done criteria.** Both checks recorded with their actual values — not "looks fine". The `meta.total` pair is written down; the viewport widths are named.

**What disqualifies the evidence.** A before/after comparison taken with **different** filters, user, page size or phase is not a comparison — report the mismatch instead of the numbers. A screenshot at one viewport does not close a check that names two. "No visible difference" without stating which widths and which theme were checked is an unrecorded check, not a passed one.

**What would make this FAIL.** Seeding a second active owner row for one result in prtest: a `JOIN`-based implementation returns that result twice and `meta.total` moves. If the environment cannot be seeded, say so and record D-2 as **unverified** — an inconclusive verification is a legitimate outcome and must be reported as one, never collapsed into a pass because the numbers happened to match.

---

## 4. Dependency graph

```
EMG-T-0 (measure)
   └─► EMG-T-1 (server: planned_result)
          ├─► EMG-T-2 (Results tab label + CSV)   ─┐
          └─► EMG-T-3 (Result-list chip)          ─┴─► EMG-T-4 (manual: D-2 + D-4)
```

`EMG-T-2` and `EMG-T-3` are independent of each other and may run in parallel. No cycles.

## 5. Clause coverage closure

Every scenario and every `BUT` / `AND IT MUST` clause, owned by a named task. ID-level presence is not closure.

| Requirement | Clause | Owner |
|---|---|---|
| `EMG-R-1` | payload exposes the flag | `EMG-T-1` |
| `EMG-R-2` | single source for both screens | `EMG-T-1` (+ `EMG-T-2`/`T-3` consume it) |
| `EMG-R-3` s1 | THEN · AND · BUT NOT · AND IT MUST | `EMG-T-3` (4 rows in its clause table) |
| `EMG-R-3` s2 | THEN · BUT NOT | `EMG-T-3` |
| `EMG-R-4` s1 | THEN · AND IT MUST | `EMG-T-2` |
| `EMG-R-4` s2 | THEN · BUT NOT | `EMG-T-2` |
| `EMG-R-5` | THEN · BUT NOT · AND IT MUST | `EMG-T-2` **and** `EMG-T-3` (both surfaces) |
| `EMG-R-6` | CSV equals cell | `EMG-T-2` |
| `EMG-R-7` | reuse chip geometry/tokens | `EMG-T-3` |
| `EMG-R-8` | tooltip (MAY) | **not implemented** — declared, not orphaned |
| `EMG-AC-7` | row count unchanged | `EMG-T-4` |
| NFR accessibility | contrast / legibility | `EMG-T-4` |

## 6. Test plan

| Layer | Command |
|---|---|
| Server | `npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository"` |
| Client | `npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results\|results-list"` |
| Lint | `npx eslint "src/api/results/result.repository.ts" --quiet` · `npx ng lint --quiet` |
| Migrations | **Not applicable** — no entity change. `migration:check` is expected to be a no-op |

Never run the bare backend suite (`npx jest` with no pattern) — it has exhausted memory in this repo before.

## 7. Rollout & verification

Single PR. At ~130 LOC across 6 files with one coherent behavior, splitting would cost more review context than it saves — a reviewer cannot judge the SQL without seeing what reads it. The PR description should lead with `EMG-DD-4` (subquery, not JOIN) and `EMG-AC-7`, because that is the one thing worth reviewing hardest.

## 8. Roll-back plan

Pure revert. Nothing is written to the database, no migration runs, no state to unwind. Reverting the server commit alone is also safe: the clients read `planned_result` as absent → `null` → current behavior (`EMG-R-5`), which is the tri-state contract doing exactly its job.

## 9. Cleanup & follow-ups

| # | Item |
|---|---|
| F-1 | **Option C** — `Emerging` and `Not tagged` as two first-class buckets across column, filter and counters. Triggered by the accepted filter/label mismatch (`design.md` §13 G-1) |
| F-2 | **Knowledge Product write gap** — `results-knowledge-products.service.ts:992` calls `createOwnerResult`, so emerging KPs never get a `results_toc_result` row and can never be labelled (`G-2`). Own spec, own regression test |
| F-3 | Attach a Jira ticket so the commit carries `[P2-XXXX]` |

---

## Required cross-references

- `./requirements.md`, `./design.md`, `./proposal.md`
- Root `CLAUDE.md` — agent-lean verification commands, commit format
- `AGENTS.md` §Skill Map
