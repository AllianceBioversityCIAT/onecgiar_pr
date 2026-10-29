# Execution — Portfolio Overview: remove rankings, clarify the status section

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-rankings-status-copy/` |
| Branch | `qa-development-2026-ss` |
| Base commit | `3c1f412c3` (kpi-breakdown committed — precondition met 2026-10-14) |
| Approval Mode | gated; user asked on 2026-10-14 to run all tasks without pausing, then commit + push + merge `performance-refactor` |
| Started | 2026-10-14 |

**Leader notes:**
- T-A and T-B are parallel-safe on files, but the machine rule allows one Jest/build run at a time. The T-B Implementer was spawned only after T-A's verification had finished, while the T-A Reviewer (read-only) was running.
- Lint substitution: this client package has no ESLint flat config, so `npx eslint <files>` errors out. Verify step 3 runs `npx ng lint --quiet --lint-file-patterns <touched files>` instead.
- The Reviewer got the diff as a scratchpad file path instead of inline, because the diff is 952 lines. The Reviewer read it with `Read`.

## 2. Task Execution History

### T-A — Remove the Science Programs output ranking (slice A)

- **Final status:** PASS
- **Date:** 2026-10-14
- **Attempts:** 1
- **Skills:** `angular-developer` (as listed in the task). **Effort:** medium.
- **Files changed (+4 / −767):**
  - `portfolio-overview.component.html` −57
  - `portfolio-overview.component.ts` −68
  - `portfolio-overview.charts.ts` −347
  - `services/portfolio-overview.service.ts` −49 (deletions only)
  - `portfolio-overview.charts.spec.ts` −166 (one line changed from `.vertical` to `.matrix`)
  - `portfolio-overview.component.spec.ts` −44 / +4
  - `services/portfolio-overview.service.spec.ts` −40
- **Verification:**
  1. Jest (`portfolio-overview\.(component|charts)\.spec|portfolio-overview\.service\.spec`, `--maxWorkers=2`): 3/3 suites, 82/82 tests passed.
  2. `npm run build:dev`: "Application bundle generation complete. [35.902 seconds]". Only Sass `@import` deprecation warnings.
  3. `ng lint --lint-file-patterns` on the 6 touched TS files: "All files pass linting."
  4. Dead-code grep: 0 hits.
- **Reviewer verdict:** STATUS: PASS. Every deletion the task asks for is done, and nothing is left bound in the template. The matrix code is kept (`.matrix` is used at charts.ts:439). The service diff is deletions only. The only matrix-spec change is the `.vertical`→`.matrix` line the task orders; the expected string is unchanged because both keys are 18. Nothing outside the task's scope changed.
- **ADVISORY (no rework):** READABILITY: the doc comment on `PROGRAM_AXIS_LABEL_MAX_CHARS` (charts.ts:38) still says "(view-dependent)", but only `matrix` is left.
- **Requirements covered:** PRC-1, PRC-N1, PRC-N2 (slice A).
- **Decisions:**
  - Kept `findProgrammeRowByChartLabel`, because `onMatrixChartClick` still uses it.
  - Renamed the describe title from "(POV-R-2, POV-R-4)" to "(POV-R-2)". Cosmetic.

### T-B — Remove the CGIAR Centers ranking (slice B)

- **Final status:** PASS
- **Date:** 2026-10-14
- **Attempts:** 1
- **Skills:** `angular-developer` (as listed in the task). **Effort:** medium.
- **Files changed (+46 / −177):**
  - `centers-block.component.html`
  - `centers-block.component.ts`
  - `centers-block.charts.ts`
  - `centers-block.charts.spec.ts`
  - `centers-block.component.spec.ts` (+32, the 3 new tests)
  - `internationalization/portfolio-centers-block.copy.ts` (−5 keys)
- **Verification:**
  1. Jest `centers-block` (`--maxWorkers=2`): 3/3 suites, 28/28 tests passed.
  2. `npm run build:dev`: succeeded. Only the Sass `@import` deprecation warning.
  3. `ng lint --lint-file-patterns` on the 5 touched TS files: "All files pass linting."
  4. Dead-code grep: 0 hits.
- **Reviewer verdict:** STATUS: PASS.
  - `rankingTable`/`rankingHeight` were renamed to `detail*`, not deleted. The caption is now `copy.detailCentersTitle` and the height is `max(260, rows×26+60)`, which gives 372px for 12 rows.
  - The detail chart has `data-testid="centers-detail-chart"`.
  - The ranking card and the comment mentions of it are gone. `statusIdFromChartEvent` reads `data.statusId` only.
  - Test 2 uses a 12-Center fixture and asserts the binding values. Test 3 asserts the highlight on the status-5 header only.
  - No API or HTTP code was added, and every edit is inside slice B.
- **ADVISORY (no rework):** READABILITY: the spec says to delete the `seriesId` spec cases. One was instead rewritten to assert that a `seriesId`-only event returns null (with an `as any` cast). This is a stronger regression guard, but it differs from the spec's wording.
- **Requirements covered:** PRC-2, PRC-N1, PRC-N2 (slice B).

### T-C — Status section: copy, guide link, Rejected hint (slice C)

- **Final status:** PASS
- **Date:** 2026-10-14
- **Attempts:** 1
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system` (as listed in the task). **Effort:** medium.
- **Files changed (T-C only, +136 / −26):** this delta was isolated from T-A/T-B with a temporary index.
  - New: `internationalization/portfolio-overview.copy.ts` (13 lines), `shared/constants/portfolio-links.constants.ts` (6 lines)
  - `portfolio-overview.component.{html,ts,spec.ts}`
  - `portfolio-overview.charts{,.spec}.ts`
  - `tests/mocks/spartanBrainMock.ts`
  - `portfolio-overview/CLAUDE.md` (120 lines, which is the cap)
- **Verification:**
  1. Jest (`portfolio-overview\.(component|charts)\.spec|portfolio-overview\.service\.spec|pop-up-notification-item`, `--maxWorkers=2`): 4/4 suites, 214/214 tests passed.
  2. `npm run build:dev`: succeeded.
  3. `ng lint --lint-file-patterns` on the 6 touched TS files: "All files pass linting."
  4. Grep for the old copy: 0 hits. The first run found 2 hits in HTML comments, which were reworded.
  - **Disqualifier check:** with the `statusGuideUrl` assignment commented out, test 4 failed (1 failed / 38 passed). The spec was then restored.
- **Reviewer verdict:** STATUS: PASS.
  - The 6 copy keys match §8.3 word for word, and `STATUS_GUIDE_URL: string = ''` is the single config point.
  - The link renders only under `@if`, with `_blank`, `noopener noreferrer`, an `aria-hidden` icon and the sr-only new-tab text. It is muted at rest and turns primary-700 with an underline on hover/focus.
  - The tile has `hlmTooltip` and `[tooltipDisabled]`, and the sr-only hint renders only for Rejected. The hints map lives in the component (DD-4).
  - `portfolioStatusDonutTable` takes the caption as a parameter. The mock inputs match `hlm-tooltip.ts`.
  - All 7 specs are present, no `statusSegments` spec was edited, CLAUDE.md covers §8.4, and there are no API/HTTP additions.
- **ADVISORY (no rework):**
  - RELIABILITY: Jest cannot prove the tooltip becomes visible on hover or focus, because the mock is inert. This is covered by T-H.
  - READABILITY: the JSDoc on `portfolioStatusDonutTable` still says "Portfolio Reporting Status donut". The CLAUDE.md hunk dropped one blank line.
- **Decisions:**
  - Added the `data-testid`s `status-guide-link` and `status-tile-<key>`.
  - The link test calls `markForCheck()` because the component is OnPush.
  - The HlmTooltip contract was read from the installed `hlm-tooltip.ts` instead of the Spartan MCP.
  - The NG0311 fail input (spec without the mock inputs) was not exercised.
- **Requirements covered:** PRC-3, PRC-4, PRC-5, PRC-N2, PRC-N3, PRC-N4.
- **Budget:** spec total ≈ +186 added LOC (T-A 4, T-B 46, T-C 136), under the 220 tripwire. 3 tasks, 1 review round each.

### T-H — Browser check (human)

- **Final status:** PASS
- **Date:** 2026-10-15
- **Where:** `https://prtest.ciat.cgiar.org/portfolio-overview`, the user's admin session, driven through Claude in Chrome. Viewport 1280 px.
- **Bundle check (disqualifier):** the served lazy chunk `portfolio-overview.component-Z7YX7DB3.js` contains "Portfolio Results Reporting Status", "Applies to W3/Bilateral results only" and "What do these statuses mean", and contains neither "output ranking" nor "Portfolio Reporting Status". Commit `6504812b8` is on `origin/performance-refactor`.
- **Checks:**

  | Check | Result |
  |---|---|
  | No ranking card, no gap; Progress by science program follows the status section | PASS ("ranking" absent from page text) |
  | Centers block order KPI → Reporting status → Progress by Center | PASS |
  | Progress by Center chart view | PASS: 16 Centers, chart 476 px high, sr-only table fallback present |
  | Centers status filter | PASS: "Pending review" highlights its column in the table view |
  | Title and subtitle | PASS |
  | Donut total = Total KPI | PASS: 971 = 396 + 436 + 20 + 119 |
  | Guide link with no URL | PASS: not rendered |
  | Rejected tooltip on hover | PASS |
  | Rejected tooltip on keyboard focus | PASS: Tab from Approved focuses `status-tile-rejected`; tooltip shown |
  | Other tiles | PASS: no tooltip on Approved |
  | Rejected click toggles the filter | PASS: All → Rejected → All |

- **Not covered:** the 768 px width (resizing would have changed the user's own window). The user accepted the run as complete.
- **Found, out of scope:** the status pipeline bar (`portfolio-overview.component.html:270`, from `18b359579`, 2026-08-28) renders the sr-only text "Warning: Chart rendered without required accessibility tableModel", which a screen reader would announce. Pre-existing.
- **Accepted by:** the user, 2026-10-15 ("todo quedó validado").
