# Tasks — Innovation Use: Youth required, no silent Non-youth

> **Answer first:** 5 tasks, about 160 LOC, one PR.
> - T-0 (Santiago, DB snapshot) gates T-3.
> - T-1 (server) and T-2 (client) are independent and can run in parallel.
> - T-3 writes the SQL that Santiago applies.
> - T-4 is the PRTest check.

## 1. Scope of this task list

Covers IUY-R-1..3 and IUY-NFR-1..3. Gate logged as `auto-approved (user instruction 2026-11-11)`.

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved (2026-11-11)
- [x] No migration (IUY-NFR-1)
- [ ] T-0 snapshot taken before T-3 is applied anywhere
- [ ] No other spec is editing `validation_innovation_use_P25` (proposal Dep)

## 3. Task list

### [x] IUY-T-0 — DB: snapshot the live function on TEST and PROD

- **Type:** db (manual, Santiago — DB steps are handed off)
- **Description:**
  1. Run `SHOW CREATE FUNCTION validation_innovation_use_P25` on TEST and on PROD.
  2. Save the PROD body as `sql/validation_innovation_use_P25.before.sql`.
  3. Diff both bodies against the archived P2-4048 `after.sql`.
- **Implements:** settles Premise P-8; IUY-NFR-1
- **Depends on:** — · **Blocks:** IUY-T-3 apply
- **Estimate:** S · **Review:** skip-eligible (a snapshot file, no logic; the claim to prove is "the file equals the live body")
- **Verification:**
  - **Falsifier:** the diff shows any line outside comments/whitespace → STOP, and T-3 is re-based on the live body.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** TEST and PROD differ from each other → T-3 needs two after files; escalate.
  - **Consumers:** none (no shared symbol changed).
- **Done:** `before.sql` committed. The diff result is recorded in `execution.md`.

### [x] IUY-T-1 — Server: `getInnovationUse` returns null Non-youth when Youth or the total is null

- **Type:** server
- **Description:** DD-1. Null-safe derivation for `men_non_youth` and `women_non_youth` (`summary.service.ts:394-395`).
- **Implements:** IUY-R-3 (scenario: men 5000 / youth null → null; AND men 10 / youth 4 → 6)
- **Files:** `onecgiar-pr-server/src/api/results/summary/summary.service.ts`, `summary.service.spec.ts`
- **Scope:** Backend route: lead `nestjs-expert` · test-first `tdd` · stack per the Skill Map.
- **Depends on:** — · **Estimate:** S · **Review:** checklist (a 2-line change with a regression test)
- **Verification:**
  - **Falsifier:** fixture `{ men: 5000, men_youth: null, women: 8, women_youth: 2 }` → `men_non_youth` must be `null` and `women_non_youth` must be `6`. Mutation "drop the null guard" → `expected null, received 5000` (reading observed: `node -e` on the current expression returns `5000`, design P-2).
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern "summary/summary.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit` → the new case fails on the assertion before the fix.
  - **Disqualifier:** an existing `getInnovationUse` assertion has to be edited to go green.
  - **Consumers:** `summary.service.spec.ts` (`:659-945`); client reader `innovation-use-info` → shared form (design P-5).
- **Done:**
  - [ ] Red quoted in `execution.md`, then green
  - [ ] `npx tsc --noEmit` clean
  - [ ] eslint quiet on the 2 files
  - [ ] Falsifier mutation re-applied and observed red

### [x] IUY-T-2 — Client: empty Non-youth and a Youth hint in both grids (in-scope only)

- **Type:** client
- **Description:**
  - DD-3: in `validateYouth`'s 1.1 s timer, set Non-youth to `null` when Youth is empty (`null`, `undefined` or `''`) and `isFarmerFollowUpResult()` is true.
  - DD-4: add `showYouthRequiredHint(actorItem, gender)`, the copy constant, and one `explanation_message` div under each gender's Non-youth, in the current-use and 2030 grids.
  - Update the folder `CLAUDE.md` and re-stamp `**Verified:**`.
- **Implements:**
  - IUY-R-1, all three scenarios: failing case; Youth = 0 → Non-youth 100 and the hint gone; 2030 grid.
  - The BUT clause "must NOT show 100 in Non-youth".
- **Files:** `innovation-use-form.component.{ts,html,spec.ts}`, the copy constant in the same folder, the folder `CLAUDE.md`.
- **Scope:** Design route: lead `angular-developer` · Spartan not needed (existing `explanation_message`) · ENV n/a (no new surface).
- **Depends on:** — · **Estimate:** S · **Review:** full (shared template that reaches IPSR step 1)
- **Verification:**
  - **Falsifier:**
    1. In-scope result (`phase_year 2026`, `source_name 'W1/W2'`, `isIpsr false`), actor `{women: 100, women_youth: null}` → after `jest.advanceTimersByTime(1100)`, `women_non_youth` is `null` and `showYouthRequiredHint(actor,'women')` is `true`.
       - Then `women_youth = 0` → `women_non_youth` is `100` and the hint is `false`.
       - Mutation "remove the gate" → `expected null, received 100` (reading observed: `node -e "100-null"` → `100`, design P-1).
    2. Held-out cases, all keeping today's value (`100`) and no hint:
       - `isIpsr = true`
       - `phase_year 2025`
       - `source_name 'W3/Bilaterals'`
       - the age fallback ticked
    3. Template: the hint `div` is in the rendered DOM for the in-scope row and absent for the IPSR host. The test must query the real template, not a fragment written in the test.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern "innovation-use-form" --maxWorkers=2 --silent --reporters=summary --no-coverage` → the new in-scope case fails on the `null` assertion before the fix.
  - **Disqualifier:** any existing form, IPSR step-n1 or step-n3 spec assertion has to change.
  - **Consumers:** `innovation-use-form.component.spec.ts`, `innovation-use-form.zoneless.spec.ts`, `step-n1-innovaton-use.component.spec.ts` + `.zoneless.spec.ts` (design P-6). Run `npx jest --findRelatedTests` on the changed files before push (IUY-NFR-3).
- **Done:**
  - [ ] Red quoted, then green
  - [ ] `npx ng lint --quiet` on the touched files (`npx eslint <files> --quiet`)
  - [ ] Folder `CLAUDE.md` updated and re-stamped
  - [ ] Cannot prove: hint placement and look → T-4

### [ ] IUY-T-3 — DB: youth-required checks in `validation_innovation_use_P25` (both sections)

- **Type:** db
- **Description:** DD-2.
  - Write `sql/validation_innovation_use_P25.after.sql` from the T-0 live body, adding one `IF EXISTS … RETURN FALSE` inside each existing `phase_year >= 2026 AND source <> 'API'` gate (section 1 and section 2).
  - Also write `.after.body-only.sql` (the DBeaver routine editor wants the body only) and `checks.sql`.
  - Santiago applies it on TEST, then on PROD at deploy.
- **Implements:** IUY-R-2, all scenarios:
  - blocked
  - zero total, AND IT MUST still require women/men
  - unaffected results (2025, W3, IPSR, does-not-apply, TBD)
  - the BUT clause on the fallback row
- **Depends on:** IUY-T-0 · **Estimate:** S · **Review:** full (correctness-critical rule; effort `max` per the routing dial)
- **Verification:**
  - **Falsifier:** `checks.sql` on TEST:
    - (a) category counts before and after are equal for 2025, W3, IPSR and complete-with-youth results;
    - (b) a 2026 W1/W2 sample row with `women > 0 AND women_youth IS NULL` → `before = 1, after = 0`;
    - (c) the same row with `women = 0` → unchanged.
    - Mutation "put the check outside the gate" → 2025 counts change.
  - **Red run:** n/a (SQL). The `before = 1` reading in (b) is the red, observed by Santiago on TEST and quoted in `execution.md`.
  - **Disqualifier:**
    - TEST has no 2026 W1/W2 row with youth null → build a sample on TEST or record a gap; never claim (b) without a row.
    - Any non-target category moves.
  - **Consumers:** green check (`GreenChecksService` via the section status); proposal says the QA catalog is unchanged (no new field), confirmed when `pending-catalog.ts` has no entry referencing this function's internals.
- **Done:**
  - [ ] 4 SQL files under `sql/`
  - [ ] TEST applied by Santiago with checks recorded
  - [ ] PROD applied at deploy with checks recorded
  - [ ] Owners of the 2 PROD Editing results notified, or the decision not to notify recorded (R-2)

### [ ] IUY-T-4 — Rollout: PRTest visual check

- **Type:** rollout (HITL, Santiago)
- **Description:** On PRTest, open a 2026 W1/W2 Innovation Use result and check:
  - the failing case (Women 100, Youth empty → Non-youth empty, hint visible);
  - Youth 0 (Non-youth 100, hint gone);
  - the 2030 grid;
  - after save, the section is red and then green once Youth is filled;
  - an IPSR step 1 package and a 2025 result look unchanged.
- **Implements:** the IUY-R-1 visual half; the "Hint placement and copy" defect class
- **Depends on:** T-1, T-2, T-3 (TEST) · **Review:** skip-eligible (human check, nothing to review)
- **Verification:**
  - **Falsifier:** any of the 5 checks fails.
  - **Red run:** n/a.
  - **Disqualifier:** PRTest is not on the commit (deploys from `performance-refactor`).
  - **Consumers:** none.

## 4. Coverage closure

| Clause | Task |
|---|---|
| R-1 failing case + BUT "must NOT show 100" + hint | T-2 (falsifier 1), T-4 |
| R-1 Youth typed → 100, hint gone | T-2 (falsifier 1) |
| R-1 both grids | T-2 (2030 cases), T-4 |
| R-2 blocked | T-3 (b) |
| R-2 zero total + AND IT MUST women/men present | T-3 (c), and the CASE unchanged |
| R-2 unaffected results + BUT fallback not red | T-3 (a), T-2 held-out cases |
| R-3 null + AND 10/4 → 6 | T-1 |
| NFR-1 / NFR-2 / NFR-3 | T-0 + T-3 / T-2 / every red run uses `--maxWorkers=2`, scoped |

## 5. Dependency graph

T-0 → T-3 → T-4. T-1 and T-2 have no dependencies and both feed T-4.

## 6. Rollout & roll-back

- **Rollout:** commit to `qa-development-2026-ss`, then `performance-refactor` for PRTest (T-4), then staging and master on the normal cadence. Santiago applies the PROD SQL at deploy.
- **Roll-back:** re-apply `before.sql`; revert the commit. No data to restore.

**Skip-eligible tasks:** T-0 (snapshot file only) and T-4 (human check). No code task is skip-eligible.
