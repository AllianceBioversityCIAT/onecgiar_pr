## 1. Pre-flight (FRONTEND — verify before editing)

- [x] 1.1 Fixture confirmed. `GET https://prtest-back.ciat.cgiar.org/v2/toc/result/11030/initiative/50/level/2?planned=true` (note: **no** `/api/` prefix — `environment.apiBaseUrl` is the bare host) returns **9** Intermediate Outcome nodes with **8 distinct** `outcome_statement` values. Token read from `USER_TOKEN` in the monorepo `.env`, never printed.
  - Working fixture is result **8669** (`?phase=36`, P25 / Reporting 2026, result level Outcome, ToC = Yes, "test innovation use for transversal Outcomes"). The code 8562 named in `p2-3063-hlo-outcome-statement` no longer resolves ("Result not found") — do not reuse it.
  - Only results whose **result level is Outcome** offer the Intermediate Outcome level; Output-level results only offer High Level Output.
- [x] 1.2 Preconditions confirmed on this branch: `selectionVersion` at line 62, `getIndicatorsList()` bumps it at line 256, and all three node dropdowns call `getIndicatorsList()` from `ngModelChange`.
- [x] 1.3 Confirmed: the duplicated `rd-theory-of-change/.../toc-initiative-out/multiple-wps/components/multiple-wps-content/` does **not** render a statement field → out of scope.

## 2. Reproduce the bug in a browser (BEFORE the fix)

- [x] 2.1 Served the **unpatched** client from this worktree with `npx ng serve --port 4300` (4200 was already in use by another session). Needed two things the worktree does not carry: `npm ci`, and `src/environments/environment.{ts,prod.ts}` copied in from a sibling checkout — both are **gitignored**, so a fresh worktree has no env file and the build fails without it. Client points at `https://prtest-back.ciat.cgiar.org/`; no local server needed.
- [x] 2.2 Script written **outside the repo** at `<session scratchpad>/repro-statement-reactivity.cjs`, run with `NODE_PATH=$(npm root -g)` against the global Playwright. Nothing added to the repo, no dependency committed. It seeds `localStorage` `token` + `user` from `USER_TOKEN` (the `user` object is rebuilt from the JWT payload: `id`, `email`, `first_name`+`last_name` → `user_name`); the token is never logged or written anywhere. It walks a list of `resultCode:versionId` candidates and picks the first usable one.
  - Selectors that work: node dropdown `a#toc_result_id_`, Level dropdown `a#toc_level_id_` (opened by `.focus()`, options at `.options .option`), statement box = `app-pr-field-header` whose `.pr_label` matches `/Statement:\s*$/`, value at `.pr_description`, save button `app-save-button app-pr-button`.
  - The URL **must** carry `?phase=<version_id>` or the app answers "Result not found" and bounces to the home page.
- [x] 2.3 `EXPECT_FIXED=0` on the unpatched build **passed**, documenting the bug on result 8669: dropdown moved to `I-OC 1.1…` while the statement kept showing `I-OC 1.3…`; after save the statement flipped to `I-OC 1.1…`. Screenshots in `.local-screenshots/before-statement-stale-0{1,2,3}-*.png` (gitignored). The script restores the original node and saves, so prtest data is left as found — the first run's restore picked the wrong node and was corrected with a follow-up `restore-node.cjs` run (result 8669 is back on `I-OC 1.3`).

## 3. Fix (FRONTEND — 1 file)

- [x] 3.1 `…/multiple-wps-content/multiple-wps-content.component.ts`: added `this.selectionVersion();` as the first statement of the `selectedTocNode` computed, with a comment citing P2-3063 (this fix) and P2-2998 (origin of the trigger).
- [x] 3.2 Template not touched — `git diff --stat` shows exactly one modified `.ts` file, `5 insertions(+)` (1 code line + 4 comment lines), no `.html`.

## 4. Verify the fix in a browser (AFTER)

- [x] 4.1 Dev server rebuilt automatically on save ("Application bundle generation complete", page reload sent).
- [x] 4.2 `EXPECT_FIXED=1 RESULT_CODES=8669:36` **passed**: changing the node dropdown updated the statement to `I-OC 1.1…` **immediately, with no save**; the statement stayed correct across the save round-trip; the original node `I-OC 1.3` was restored and saved. Screenshots in `.local-screenshots/after-statement-reactive-0{1,2,3,4}-*.png`.
- [ ] 4.3 Manually walk the preserved-behaviour scenarios in the served app: label switches correctly across Level 1 / 2 / 3 with the `" Statement"` suffix; tooltip text unchanged; field hidden in the No scenario, with no node selected, and when the selected node has no statement.
- [ ] 4.4 Manually confirm the regression guards: `Indicator Tipology` still updates when the KPI dropdown changes, and changing Level with a stale node id **hides** the statement box rather than showing the previous level's text.
- [ ] 4.5 Manually confirm a phase 2025 result shows no statement field at all (unchanged legacy view).

## 5. Gate (run before handing over — no git state changes here)

- [x] 5.1 `npm run lint` → **"All files pass linting."**
- [x] 5.2 `npm run test` → **379 suites / 4011 tests passed**, exit 0. ⚠️ Note for future runs: `npm run test` is `jest --no-coverage`, so it does **not** exercise the thresholds — use `npm run test:coverage` (thresholds live in `package.json` → `jest.coverageThreshold`: branches 50 / functions 60 / lines 60 / statements 60). Coverage run tracked in 5.2b.
- [x] 5.2b `npm run test:coverage` → exit 0, all thresholds cleared with room to spare: statements **82.87%** (min 60), branches **64.42%** (min 50), functions **80.48%** (min 60), lines **83.33%** (min 60).
- [x] 5.3 `npm run build` → exit 0. Only the pre-existing `pdfjs-dist is not ESM` warning; no template/compile errors.
- [ ] 5.4 Report the results to the user with the actual command output. The user runs `git add/commit/push` — the AI does not.

## 6. Hand-off

- [x] 6.1 Note sent to Santi (Slack DM, 2026-07-28): the symptom, the cause in plain language, the one-line fix, the before/after Playwright evidence, the green gate, and the explicit warning that the branch comes off the **epic** (not staging) because the field only exists there. Awaiting his OK before anything is pushed. https://cgiar-ibd.slack.com/archives/D03PWEM7TBM/p1785266935920899
- [ ] 6.2 Raise OQ2 with Santi as a separate follow-up ticket: convert `activeTab` to a real signal (`model()`) and retire `selectionVersion`. Do not fold it into this fix.
- [ ] 6.3 Leave the Playwright script path noted in the Jira comment so QA can re-run both modes.
