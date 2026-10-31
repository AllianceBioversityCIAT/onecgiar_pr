# Tasks — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Scope

| Field | Value |
|---|---|
| Depth / mode | Lite · Bug Mode |
| Requirements / design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Code tasks for `/akili-execute` | **TKG-T-1** (migration + regression spec), **TKG-T-2** (QA catalog). They are independent, but run tests one at a time |
| Manual task | **TKG-T-3**: PRTest verification by Santiago |
| Approval Mode | `gated` |

## 2. Pre-flight

- [ ] The branch is not `master`. `1792000000000-IRS-ImpactResultsFoundation.ts` is present in the tree.
- [ ] One test run at a time, always `--maxWorkers=2`, scoped. Lint only the touched files.
- [ ] No DB connection from agents. Do not run `migration:run` against any shared DB.

## 3. Task list

### `TKG-T-1` — Migration with the NULL + 2026 gate (regression spec first)

- **Status:** `[x]`
- **Implements:** TKG-R-1 (S-1.1 to S-1.5, statically), TKG-NFR-1, TKG-NFR-2, TKG-NFR-3
- **Files:**
  - `src/migrations/1792100000000-TKG-TocKpiOptionalGreenCheck.ts`
  - `src/api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts`
- **Design refs:** §4, §7, TKG-DD-1/2/3
- **Depends on:** none · **Estimate:** M (~210 LOC, mostly the copied body) · **Review:** `full`
- **Skills:** `tdd`, `nestjs-expert`
- **Steps:**
  1. Write the spec described in design §7 first and run it. It must FAIL: the newest function-defining migration is `1792000000000`, which has no gate.
  2. Write the migration:
     - `up`: drop + create, with the base body from `CONTRIBUTOR_PARTNER_WITH_IMPACT` plus the `phase_year` lookup and the `IF planned_result IS NULL AND COALESCE(phase_year,0) >= 2026` no-op branch, with the existing `IF planned_result = FALSE` becoming `ELSEIF`.
     - `down`: drop + create with `CONTRIBUTOR_PARTNER_WITH_IMPACT` verbatim.
  3. Re-run the spec. It must pass.
- **Spec cases:**
  - (a) The newest function-defining migration's `up` body has the gate before the `planned_result = FALSE` branch.
  - (b) That body, with the gate lines removed and whitespace normalised, equals `CONTRIBUTOR_PARTNER_WITH_IMPACT` (proves Yes / No / 2025 / type 9 untouched).
  - (c) `down()` issues `CONTRIBUTOR_PARTNER_WITH_IMPACT`.
  - (d) The phase-year lookup reads `version.phase_year` via `result.version_id` with the bound `resultId` (no literal result id).
- **Verification:**
  - `cd onecgiar-pr-server && npx jest src/api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts --maxWorkers=2 --silent --reporters=summary --forceExit`
  - **Red evidence:** case (a) fails before the migration exists.
  - **Falsifier:** if (a) passes before the migration is written, the spec is not picking the newest migration; fix the selector first. Case (b) must fail if anyone edits the Yes branch. Check this once by temporarily changing `> 0` to `>= 0` in a copy, then revert.
  - **Disqualifier:** these are presence/equality assertions on SQL text. They do NOT prove that MySQL accepts the body or that real rows evaluate as S-1.1 to S-1.5 say; that is TKG-T-3.
  - `npm run migration:check`, plus `npx eslint <touched files> --quiet`.
- **Done:** spec red → green; migration lints; the `down` restores the P2-3901 body; no existing migration edited.

### `TKG-T-2` — QA catalog: `toc.planned_result` optional

- **Status:** `[x]`
- **Implements:** TKG-R-2 (S-2.1)
- **Files:**
  - `src/api/qa-catalog/definitions/sections/contributors-partners.ts`
  - `src/api/qa-catalog/definitions/versions.ts` (2026 revision 30 → 31)
  - the snapshot and the catalog specs that assert the old value
- **Depends on:** none · **Estimate:** S (~15 LOC plus snapshot) · **Review:** `light`
- **Skills:** `nestjs-expert`
- **Change:** `required: false`, `required_confirmed: true`. Update the field's comment to cite the function gate (P2-4061). Do not touch the `visible_when` / `required_when` of the dependent fields.
- **Verification:**
  - `cd onecgiar-pr-server && npx jest src/api/qa-catalog --maxWorkers=2 --silent --reporters=summary --forceExit`
  - Only the assertions about `toc.planned_result` requiredness, the revision and the snapshot may change.
  - **Falsifier:** if no catalog spec fails before you edit them, nothing asserts `toc.planned_result` requiredness. Add a one-line assertion for S-2.1 instead of relying on the snapshot alone.
  - **Disqualifier:** a regenerated snapshot that also changes other fields means unrelated drift. Stop and report it, do not commit it.
  - `npx eslint <touched files> --quiet`
- **Done:** S-2.1 asserted; catalog specs green; revision 31.

### `TKG-T-3` — Manual verification on PRTest (Santiago)

- **Status:** `[ ]` · **Depends on:** TKG-T-1 and TKG-T-2 deployed to PRTest (performance-refactor; the Jenkins deploy runs the migration)
- **Implements:** TKG-R-1 behaviour (S-1.1 to S-1.5)
- **Checks** (read the sidebar green check; for the No / Yes cases use test results, never prod data):
  1. A 2026 result with the question unanswered and the rest complete (953-equivalent on PRTest) shows the green check, and the bottom bar agrees.
  2. A 2026 result answered **Yes** with an incomplete ToC row has no green check.
  3. A 2026 result answered **No** without a narrative has no green check.
  4. A 2025 result with the question unanswered has no green check.
  6. Cover both NULL shapes in (1): a 2026 result with no `results_toc_result` row at all, and one with a row whose `planned_result` is NULL (TKG-T-1 Reviewer advisory).
  5. In (1), remove one partner's delivery type: no green check.
- **Disqualifier:** if the migration failed or did not run on PRTest, there is nothing to check (look at the `migrations` table / deploy log). Report that instead of a pass.

## 4. Traceability

| Clause | Task |
|---|---|
| S-1.1 incl. BUT | TKG-T-1 (a) static + TKG-T-3 #1 |
| S-1.2 | TKG-T-1 (b) static + TKG-T-3 #2 |
| S-1.3 | TKG-T-1 (b) static + TKG-T-3 #3 |
| S-1.4 | TKG-T-1 (a)(d) static + TKG-T-3 #4 |
| S-1.5 | TKG-T-1 (b) static + TKG-T-3 #5 |
| S-2.1 incl. AND | TKG-T-2 |
| NFR-1 | TKG-T-1 (c) |
| NFR-2 | TKG-T-1 (b) |
| NFR-3 | TKG-T-1 verification |

## 5. PR / commit

About 230 LOC, so a single PR. Commit only on the user's go-ahead, with no apostrophes in the subject, for example `🔧 fix(contributors-partners) P2-4061: let 2026 results pass the green check when the ToC KPI question is unanswered [SPEC:bugfix/toc-kpi-optional-green-check]`. It must travel after, or together with, the P2-3901 migration.
