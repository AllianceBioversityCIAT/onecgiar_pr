# Execution — Innovation Use: Youth required, no silent Non-youth

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/innovation-use-youth-required/` |
| Branch | `qa-development-2026-ss` (base `e76b88603`) |
| Started | 2026-11-12 |

## IUY-T-0 — Live function snapshot

- **Status:** PASS (1 of 2 environments). The second environment is still to be pasted.
- **Date:** 2026-11-12
- **Evidence:** Santiago pasted `SHOW CREATE FUNCTION validation_innovation_use_P25`. It was saved as `sql/validation_innovation_use_P25.before.sql`.
- **Diff:** both bodies compared after normalising whitespace:
  - live body, from `CREATE DEFINER` to `END`;
  - `archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.after.sql` lines 35-572.
  - Result: `IDENTICAL`, 492 non-empty lines each. Premise P-8 is verified for this environment.
- **Environment:** the paste is from **PROD**, confirmed by Santiago on 2026-11-12. The TEST body has not been pasted. `after.sql` replaces it whole, so it only matters for roll-back on TEST.

## IUY-T-3 — TEST baseline, before applying (2026-11-12, Santiago, DBeaver screenshots)

- **Query 1** (in-scope rows with total > 0 and Youth null): **0 rows**. TEST has no natural sample, so the red must come from an in-transaction sample (Disqualifier: never claim (b) without a row).
- **Query 2** (counts by phase year, source and `valid`):

| phase_year | src | valid=0 | valid=1 |
|---|---|---|---|
| 2022 | W1/W2 | 63 | 6 |
| 2023 | W1/W2 | 31 | 20 |
| 2024 | W1/W2 | 30 | — |
| 2024 | W3 | 1 | — |
| 2025 | W1/W2 | 54 | 10 |
| 2025 | W3 | 85 | 60 |
| 2026 | W1/W2 | 42 | 7 |
| 2026 | W3 | 170 | 107 |

- **Expected after apply:** identical, because query 1 returned 0 rows.

## IUY-T-3 — SQL files (written; not applied)

- `sql/validation_innovation_use_P25.after.sql`: the full DROP + CREATE script. It is generated from `before.sql` and adds one `IF EXISTS … RETURN FALSE` in section 1 and one in section 2, each inside the existing 2026 W1/W2 gate, right after the IFC-R-6 Farmers check.
- **Diff check:** comparing `before.sql` with `after.sql` shows only the header comments and the two inserted blocks.
- `sql/validation_innovation_use_P25.after.body-only.sql`: the same body for the DBeaver routine editor.
- **Checks:** the queries are given inline in chat (user preference) and their results go here once run.

## IUY-T-3 — TEST red probe, before applying (2026-11-12, Santiago)

- **Sample:** result 11026 (2026 W1/W2, valid = 1). Actor 1962 is section 1 (women 10/2, men 20/3); actor 1053 is section 2 (women 123/12, men 345/21).
- **Probe:** two transactions, each ending in ROLLBACK:
  - section 1: `women_youth = NULL`, then `women = 0`;
  - section 2: `men_youth = NULL`, then `men = 0`.
- **Result with the current function:** `@a = 1`, `@b = 1`, `@c = 1`, `@d = 1`. This is the red: Youth null is not caught. Expected after apply: `0, 1, 0, 1`.
- **Roll-back verified:** 1962 and 1053 kept their original values.

## IUY-T-3 — Applied on TEST (2026-11-12, Santiago)

- **How:** through the DBeaver routine editor (body-only); the definer became `prdbusertst`@`%`.
- **Check:** Santiago pasted `SHOW CREATE FUNCTION` from TEST. It contains both `IUY-R-2 (NEW)` blocks, one in each section, inside the 2026 W1/W2 gate. The rest matches `before.sql`.
- **Pending:** re-run the probe (expected `0, 1, 0, 1`) and the counts (expected identical to the baseline).
- **Probe after apply:** `@a = 0`, `@b = 1`, `@c = 0`, `@d = 1`, matching the expected `0, 1, 0, 1`.
  - Youth null now blocks in section 1 (women) and in section 2 (men).
  - Total 0 does not require Youth (IUY-R-2 "zero total").
  - Red before (`1, 1, 1, 1`), green after.
- **Counts after apply:** identical to the baseline row by row (2022–2026, W1/W2 and W3). Nothing outside the target moved (IUY-R-2 "unaffected results").
- **TEST status: PASS.** PROD is pending: apply `after.sql` at deploy and run the PROD read-only query first (expected: the 2 Editing results).

## IUY-T-1 — Server null-safe Non-youth (PASS, 2026-11-12)

- **Files:** `onecgiar-pr-server/src/api/results/summary/summary.service.ts` (a `nonYouth` helper: `null` when the total or Youth is null) and `summary.service.spec.ts` (one new case covering 3 rows).
- **Red, before the fix:** `npx jest --testPathPattern "summary/summary.service.spec" -t "IUY-R-3" --maxWorkers=2` → `Received: 5000`, `Tests: 1 failed, 60 skipped`.
- **Green:** the same suite passes, 61/61. `npx tsc --noEmit -p tsconfig.json` is clean, and eslint `--quiet` is clean on both files.
- **Falsifier re-applied:** the guard was put back to `total - youth`, the test showed `Received: 5000` again, and the fix was restored.
- **Consumers checked:**
  - `bilateral/services/innovation-use-mds-validator.service.ts` calls `getInnovationUse` but never reads `*_non_youth`, so the bilateral payload contract and the change log need no update.
  - IPSR step one/three and `innovation-use.service.ts:941` derive their own values and are untouched (out of scope).

## IUY-T-2 — Client: empty Non-youth and Youth hint (PASS, 2026-11-12)

- **Files:**
  - `innovation-use-form.component.{ts,html,spec.ts}`;
  - new `internationalization/innovation-use-youth-required.copy.ts`;
  - folder `CLAUDE.md` (re-stamped).
- **Shared with another session:** the same 4 form files also hold uncommitted IWH changes (`changes/innovation-use-w3-hide-2030`). Commit them separately, selecting the hunks.
- **Discovered (in scope for IUY-R-1 "both grids"):** `validateYouth` wrote Non-youth on `body.innovatonUse.actors[i]` even when called from the 2030 grid, so the 2030 row was never recalculated while typing. The derivation now uses `actorItem`, the row actually edited. The clamp and "Youth cannot be greater" branch still use the current-use row. It is left as is (out of scope) and noted in the folder `CLAUDE.md`.
- **Red, before the fix:** `npx jest --testPathPattern "innovation-use-form.component.spec" -t "IUY-R-1" --maxWorkers=2` → `Received: 100` (the main case), `Tests: 7 failed`. The other failures came from `showYouthRequiredHint` not existing yet.
- **Green:** the `innovation-use-form` pattern passes, 4 suites and 239 tests. `--findRelatedTests` on the changed `.ts`, `.html` and copy files passes 24 suites and 1076 tests, IPSR step-n1 and innovation-use-info included. `ng lint --quiet` passes on the touched files, and `tsc --noEmit -p tsconfig.app.json` is clean.
- **Falsifier re-applied:** the gate in the derivation was replaced by `false`. Two tests failed with `Received: 100`, and the fix was restored.
- **Cannot prove here:**
  - hint placement and look → T-4 on PRTest;
  - strict template type-check → only `ng build`, which was not run locally; it runs in CI.

## IUY-T-3 — PROD pre-apply impact (2026-11-12, Santiago, read-only)

- **Query 1 on PROD:** 2 results, both section 1 and both Editing (`status_id 1`), matching the proposal's measured impact:

| result_id | code | women / youth | men / youth | valid today |
|---|---|---|---|---|
| 32484 | 18241 | 12 / NULL | 9 / NULL | 0 (already red for another reason) |
| 32503 | 18805 | 14 / NULL | 26 / NULL | 1 → will turn red after apply |

- **Net effect of the PROD apply:** 1 result changes from green to red (18805). Its owner fills Youth to clear it (R-2).

## Commits and promotion (2026-11-12)

- `c95fc0e07` (client) and `a64bb1926` (server + SQL + spec docs) on `qa-development-2026-ss`. The uncommitted IWH hunks in the same 4 form files were excluded by staging hunk by hunk.
- Merged `origin/performance-refactor` into qa-dev as `bec3a24b0`: 23 commits from P2-4106, P2-3910, INC-167646 and P2-4068, with no file overlap. After the merge: server tsc is clean and `summary.service.spec` passes 61/61; client tsc is clean and the `innovation-use-form` specs pass 239/239.
- Pushed qa-dev, then fast-forwarded `performance-refactor` `db6dec379..bec3a24b0`. The local refs are synced.
- **Pending:** T-4 on PRTest after the deploy (about 30 min); apply the SQL on PROD at release.

## CI failure and fix (2026-11-12)

- **Run 43215648999** on perf `bec3a24b0` failed at frontend Lint: `innovation-use-form.component.ts 721:33 Parsing error: ';' expected`.
- **Cause (mine):** to keep the IWH hunks out, I staged a `-U0` patch with `git apply --cached --unidiff-zero`. Once the 9-line IWH hunk was dropped, my zero-context insertions landed at the wrong offsets:
  - `showYouthRequiredHint`/`isYouthEmpty` ended up inside the `narrativeActors` template string;
  - in the 2030 grid, the two hints swapped places with a `</div>`.
  - Local tests passed because they ran on the working tree, which was correct, not on the committed blobs.
- **Fix `b6706a5ea`:** the committed blobs were rebuilt as the working copy minus only the IWH lines, and diffed against the working copy (IWH lines only).
- **Verified on the exact committed tree** (IWH changes stashed, then popped): `ng lint` passes on the touched files, `tsc -p tsconfig.app.json` is clean, and `--findRelatedTests` passes 24 suites and 1069 tests.
- **Lesson:** after a partial-hunk commit, run the gates on the committed tree (stash the rest), never on the working tree.

## IUY-T-4 — PRTest check, round 1 (2026-11-12, Claude in Chrome, no save)

- **Deploy confirmed:** chunk `chunk-4QPUOASN.js` contains the hint string. Run 43217159716 passed every job, then Jenkins deployed.
- **Result 8558** (id 11026, phase 36, 2026 W1/W2), current use, Farmers row, original values women 10/2 and men 20/3. Women was set to 10 with Youth empty:
  - **PASS:** Non-youth shows empty ("Save to calculate") instead of 10, and the hint appears.
  - **FAIL (visual):** the hint used `.explanation_message`, an absolute violet overlay (`position:absolute; z-index:2; pointer-events:auto`, 939×123 px) over the whole Women row. `document.elementFromPoint` on the Youth input returned the overlay, so the user could not click Youth.
  - **Refuted premise:** DD-4 assumed "reuse the existing `explanation_message` style" for an inline hint, but that class is a 3 s flash overlay.
- Nothing was saved. The "Leave site?" dialog blocked the reload, which confirms the change stayed unsaved.
- **Fix `5d9ba6729`:**
  - The hint is now an inline `<p class="youth-required-hint mt-1 text-[11px] leading-[1.4] text-[var(--pr-color-secondary-400)]">`.
  - The spec selector was updated, and the trap is documented in the folder `CLAUDE.md`.
  - Verified on the committed tree: lint passes, tsc is clean, and 24 suites / 1069 tests pass.
  - Pushed to qa-dev and perf. Round 2 follows after the redeploy.

## IUY-T-4 — PRTest check, round 2 (2026-11-12, Claude in Chrome, no save)

- **Build:** a fresh tab served `chunk-DW2GCP5J.js` containing `youth-required-hint` and `showYouthRequiredHint`. PRTest `index.html` was last modified at 13:48 UTC. The earlier tab still ran the old bundle from memory, so always re-check in a new tab after a deploy.
- **Result 8558, current use, Women 10:**
  - Youth cleared → Non-youth "Save to calculate", the inline hint shows, no overlay (`.explanation_message` count 0), and `elementFromPoint` on Youth returns the Youth input itself (clickable).
  - Youth = 0 → Non-youth `10` and the hint is gone.
  - **PASS.**
- **Result 8558, 2030 grid, Women 8 / Youth 8:**
  - Youth cleared → Non-youth "Save to calculate", the hint shows inside the 2030 row, and Youth is clickable.
  - The current-use row stayed `10 / 0 / 10` (the cross-row write is fixed).
  - Youth = 3 → Non-youth `5` and the hint is gone.
  - **PASS.**
- **W3 result 9603 (id 12071):** the shared form renders but the result has no actor rows, so there is nothing to check visually. The held-out cases (W3, 2025, IPSR) are covered by the `it.each` unit cases, which pass.
- **Not checked live:** the 2025 and IPSR screens, and the section going red/green after a save (no save was made; the DB rule was proven on TEST in IUY-T-3).
- Nothing was saved. The tabs with unsaved edits were left for the user to close with "Leave".

## IUY-T-2 rework — hint restyled per Santiago mock-up (2026-11-12)

- **Santiago rejected the plain inline text** ("sin estilos"). He provided a mock-up: an amber full-width box below the Women row, with an info icon, **Action needed:** in bold, the copy "Enter the number of youth (enter 0 if none) to automatically calculate **Non-youth**.", and Non-youth in bold.
- **Decision (Santiago):** keep Youth required, with no default 0. The recommendation to keep it so was accepted. A system 0 would be the same silent "everyone is non-youth" the bug is about, stored as if the user had answered it.
- **Commit `042e5d154`:**
  - The alert is a sibling after each Women/Men `.right_content` (4 places, both grids) with `role="status"`, `lucideInfo` (`NgIcon` added to `InnovationUseFormModule`, `provideIcons` on the component), and Tailwind utilities on tokens: `--pr-color-yellow-50` background, a yellow-100 mix border, `--pr-status-in-progress-fg` icon, and `--pr-color-secondary-400` text, 12px.
  - The copy is split into `label`, `text` and `emphasis`.
  - The spec now asserts that the alert is outside `.right_content`, is not `.explanation_message`, has `role=status`, and has the bold label and emphasis.
- No Spartan alert is installed (`src/app/spartan` has none), so it uses the same `ng-icon` + Tailwind pattern as `bilateral-page-header`.
- **Verified on the committed tree:** lint passes, tsc is clean, 24 suites / 1069 tests pass, and `ng build --configuration development` completes on the working tree. Pushed to qa-dev and perf.
- **PRTest round 3 (14:44 UTC deploy, new tab, `chunk-GDJLHWAO.js`):** on 8558, Women 10 with Youth cleared:
  - Non-youth shows "Save to calculate".
  - The alert text reads "Action needed: Enter the number of youth (enter 0 if none) to automatically calculate Non-youth."
  - The alert sits 12 px below the Women row at the same width (939/939), and Youth is clickable.
  - A screenshot was taken for Santiago's approval. Nothing was saved.
- **Approved by Santiago (2026-11-12):** "si apruebo". IUY-T-4 is closed.

## Remaining

- **IUY-T-3 PROD:** apply `sql/validation_innovation_use_P25.after.sql` (SQL Editor tab, full script, definer `prmsadmin`) at release, together with the front and back deploy. Then re-run the impact query: 18805 turns red and 18241 stays red. Roll back with `before.sql`.
- Tell the owner of 18805, or record the decision not to (R-2).
- Confirm the Jira child (P2-4049?) and post the closure comment.
- Archive the spec once PROD is applied.
