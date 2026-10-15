# Execution Log — Portfolio Overview KPI Cards: New vs Replicated Breakdown

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-kpi-breakdown/` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated (continue/pause gate after every task) |
| Leader | Claude Opus 5.5 (session model; stronger than the registry's T1 `opus` alias, so no switch was needed) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Budget | 3 tasks · ~220 LOC · 1 review round. Tripwire: > 5 tasks or > 350 LOC |
| Started | 2026-10-14 |

## 2. Task Execution History

### POVKB-T-1 — Add new/replicated × submitted/editing tallies to `kpiTotals()`

- **Final status:** PASS
- **Date:** 2026-10-14
- **Attempts:** 1
- **Effort:** medium (Implementer) · high (Reviewer)
- **Skills assigned:** `angular-developer`, `tdd` (task list default; no deviation)

#### Attempt 1

- **Files changed:** `portfolio-overview/services/portfolio-overview.service.ts` (+38 / −1), `portfolio-overview/services/portfolio-overview.service.spec.ts` (+100 / −1)
- **Implementation:** `RawResult.is_replicated?` added. `PortfolioKpis` gained the 8 fields from design §3. A local `isReplicated` (`1 | '1' | true`, DD-2) and a `tally()` helper each run once over the existing `w1w2Rows` / `bilateralRows`. Editing = `Number(status_id) === 1`, and Submitted = new − editing (DD-3).
- **Verification:**
  - Command: `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview.service --silent --reporters=summary --no-coverage`
  - Red: 6 failed, 16 passed (all 6 new tests failed).
  - Green: 22 / 22 passed.
- **Lint:** `npx eslint` can't run here because the client has no `eslint.config.*`. The scoped equivalent, `npx ng lint --quiet --lint-file-patterns <2 files>`, returned "All files pass linting." The Reviewer accepted the substitution.
- **Implementer Not Done / Assumptions (verbatim):** "Test 6 ("existing assertions unchanged") could not hold literally for one assertion. The existing test 'initializes default KPI totals when empty' uses `toEqual` on the whole `PortfolioKpis`, so any new field breaks it. I appended the 8 new fields with value 0 to its expected object and changed nothing else in it. Every other existing assertion is untouched and green."
  - Leader adjudication: this is an additive extension forced by `toEqual`, not an unfinished part of the scope. The Reviewer agreed. Nothing is owed.
- **Reviewer verdict:** STATUS: PASS. The diff meets POVKB-T-1:
  - Tests 1–5 match the spec, and their falsifiers are live.
  - The closed-phase test was checked against `apply()` (`service.ts:538-550`).
  - No existing field changed, no new HTTP call, and there is no NaN path.
- **Leader process note:** the Reviewer's first brief carried a placeholder instead of the diff. A correction message pointed the Reviewer to the full diff file before it audited. This did not consume a rework attempt.

#### ADVISORY (4R, non-gating)

- READABILITY: in `tally()`, the `if` has no braces while its `else` block does. Using braces on both would match the surrounding style.
- RISK: the folder `CLAUDE.md` is not updated in this diff (the spec gives that to T-3). Do not commit T-1 on its own before T-3 lands, because the client convention requires the folder guide to change in the same commit as the code.

- **Requirements covered:** POVKB-R-1 (both scenarios), R-2 and R-3 (count math and the invariants), R-6 (same rows, closed-phase fallback, zero buckets, at the data level)
- **Decisions:** the `toEqual` default-state expectation was extended additively (see above).
- **Issues:** none blocking.
- **Final verification:** 22 / 22 green on the scoped service spec. Lint clean.

### POVKB-T-2 — Render the 3-card deck with breakdowns; remove card 4

- **Final status:** PASS (attempt 2 of 3)
- **Date:** 2026-10-14
- **Skills assigned:** `angular-developer`, `spartan`, `tailwind-design-system`

#### Attempt 1 — FAIL

- **Effort:** medium
- **Files changed:**
  - `portfolio-overview.component.html` (+50 / −42)
  - `portfolio-overview.component.ts` (+2 / −10)
  - `portfolio-overview.component.spec.ts` (+48 / −10)
  - `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (+5 / −1)
- **Verification:**
  - Red: `--testPathPattern=portfolio-overview.component` gave 3 failed / 61 passed. The failures were the rewritten deck test, the zero-W3 test and the skeleton test.
  - Green: `--testPathPattern=portfolio-overview` gave 6 suites, 121 / 121 passed.
  - Lint: `ng lint --lint-file-patterns` on the 3 component files passed.
- **Implementer Not Done / Assumptions:**
  1. The 1280 px fit and card-1 contrast are not verified. That check belongs to T-3.
  2. Card 1 has no separator, so the translucent tint is unused.
  3. A separate `BREAKDOWN_PHASE` fixture was used.
  4. `data-testid` attributes were added for the tests.
  5. The shared mock `spartanBrainMock.ts` was edited.
- **Leader note:** assumption 2 came from the Leader's own brief, which paraphrased card 1 as "4 plain rows". The Reviewer showed that design §6 requires a separator.
- **Reviewer rulings:**
  - (a) design §6 requires a card-1 separator → FAIL.
  - (b) The mock edit is necessary and minimal. The real `HlmSeparator` maps the `orientation` and `decorative` inputs from its `BrnSeparator` host directive, so the mock without them raised NG0311. It is accepted as a **scope deviation in test infrastructure**.
  - (c) Cumulative churn is about 308 changed lines (net +178), under the 350 tripwire but with a thin margin. Re-measure after T-3.
- **Reviewer verdict, STATUS: FAIL:**
  1. **Discovered Issue:** Card 1 (Total, gradient) has no separator between its two New rows and its two Replicated rows. The design's translucent-white separator for card 1 was never built.
     - **Violated Rule:** `design.md` §6, first bullet below the card table ("…On card 1 it takes a translucent white tint so it reads on the gradient.") and `tasks.md` §3 POVKB-T-2 ("Use only existing tokens (design §6)").
     - **Remediation:** insert `<hlm-separator class="bg-white/20" />` between "W3/Bilateral new" and "W1/W2 replicated". The host class wins over `bg-border` through `twMerge` in `hlm.ts:249`. Assert one `hlm-separator` per card.
  2. **Discovered Issue:** the `BREAKDOWN_PHASE` buckets are not distinct: `w1w2NewEditing` = `bilateralNewSubmitted` = 2, so swapping those two bindings would go undetected.
     - **Violated Rule:** `tasks.md` §3 POVKB-T-2 → Verification → Falsifier ("The fixture must use distinct numbers per bucket so a swap is detectable.").
     - **Remediation:** make the 8 values pairwise distinct, e.g. W1/W2 4 / 2 / 6 / 5 and W3 1 editing / 8 submitted / 9 new / 7 replicated. Then re-run the scoped Jest command.
- **ADVISORY:**
  - The `fig` helper is defined twice; it could move to `describe` scope.
  - The spec's `rows()` helper shares its name with the service's signal.
  - The folder `CLAUDE.md` must land in the same commit as T-1 and T-2.
  - Record the mock scope deviation.
  - Re-check the LOC budget after T-3.

#### Attempt 2: PASS

- **Effort:** high (bumped after the FAIL)
- **Changes:**
  - Card 1 gained `<hlm-separator class="bg-white/20" />` between "W3/Bilateral new" and "W1/W2 replicated".
  - The deck test asserts exactly one `hlm-separator` per card.
  - `BREAKDOWN_PHASE` now has pairwise-distinct values:
    - W1/W2: 4 submitted, 2 editing, 6 new, 5 replicated.
    - W3: 8 submitted, 1 editing, 9 new, 7 replicated.
  - The mock edit is kept.
- **Verification:**
  - `npx jest --maxWorkers=2 --testPathPattern=portfolio-overview --silent --reporters=summary --no-coverage` passed: 6 suites, 121 / 121 tests.
  - `ng lint --lint-file-patterns` passed on the 3 component files.
- **Reviewer verdict: STATUS: PASS.** Attempt 2 fixes both attempt-1 issues:
  - Card 1 has the tinted separator design §6 requires, and a test checks one separator per card.
  - The fixture's eight values are all distinct, so the falsifier catches swapped bindings.
  - No requirement, token or test regressed.
- **ADVISORY (4R, non-gating):**
  - READABILITY: the `fig` helper is defined twice, and the spec's `rows()` helper shares its name with the service signal.
  - RELIABILITY: the separator test checks the count per card but not the position.
  - RISK: do not commit T-1 or T-2 before T-3 updates the folder `CLAUDE.md`.
- **Scope deviation (accepted):** `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (+5 / −1), outside the task folder. The `BrnSeparator` mock now declares the `orientation` and `decorative` inputs, which the real `HlmSeparator` maps through `hostDirectives`. Without them every component test fails with NG0311. The change is additive and shared test infrastructure.
- **Requirements covered:** POVKB-R-1, R-2 and R-3 (rendering), R-4 (deck plus skeleton, absence assertions), R-5 (chips and navigation unchanged), R-6 (zero-W3 render).
- **Decisions:** card 1 uses a `bg-white/20` separator tint, and the `data-testid` figure hooks were added for testing.
- **Budget:** cumulative churn is +245 / −65, 310 lines in total, under the 350 tripwire. Re-measure after T-3.
- **Final verification:** 121 / 121 green, lint clean. Layout and contrast are still owed to T-3.

### POVKB-T-3: Visual check and folder docs

- **Status:** PASS. The docs were done first; the visual check was first INCONCLUSIVE (Guest role), then passed on the re-run with an admin session (see below).
- **Date:** 2026-10-14
- **Review:** skip-eligible (docs only), so no Reviewer was spawned. The Leader checked the guide line by line against the Implementer report.
- **Docs, attempt 1:**
  - `portfolio-overview/CLAUDE.md` changed by +22 / −1:
    - Verified stamp set to 2026-10-14.
    - Contract: the 8 fields, plus the replicated and Editing rules.
    - New "KPI deck" section.
    - Gotchas: Replicated ≠ innovation (P-3), and the `BrnSeparator` mock inputs.
  - Leader follow-up: the click-target line originally covered only cards 2–3. It was corrected to list all 3 targets (`'all'`, `'w1w2'`, `'bilateral'`), and the Implementer verified them against the html (lines 121, 170, 208).
- **Visual check: INCONCLUSIVE.**
  - **Setup:** local client :4200 and server :3400 were running, and `/portfolio-overview` was opened in Chrome.
  - **Blocker:** the route redirects to `/result/results-outlet/results-list`. `CheckAdminGuard` requires `role_id == 1`, but the logged-in local user (575) gets `role_id 2` ("Guest") from `auth/role-by-user/get/user/575`.
  - **Not done, on purpose:**
    - No role change in the shared prdb (write to a shared DB).
    - No guard bypass.
  - **Still owed:** layout at 375 / 768 / 1280 / 1440 px, the 1280 px fit (disqualifier: hero overflow), and contrast of the `bg-white/20` separator and `text-purple-100` labels on the gradient. These need an admin session, either a local login as an admin user or the PRTest deploy.
- **Requirements covered:** the docs part of R-4. The R-4 responsive scenario and requirements §8 layout/contrast rows remain **unproven**.

#### Visual check, re-run 2026-10-14 by the user (admin session): PASS

The user took the screenshots in the local client at 375 / 768 / 1280 / 1440 px and shared them in chat. The Leader reviewed them as follows.

**Layout and skeleton**
- The skeleton shows 3 placeholders.
- 1440 px: 3 cards in one row, no overflow.
- 1280 px: 3 cards in one row. Card titles wrap to 2–3 lines ("TOTAL / PORTFOLIO / RESULTS") and "Innovations replicated from 2025 119" sits tight, but nothing is clipped or overlapping. The disqualifier did not trigger.
- 768 px: 2 + 1, as `sm:grid-cols-2` intends.
- 375 px: 1 per row. The footers "Results Center →" and "Bilateral →" are visible.
- The footers of cards 2–3 are hidden at sm and up until hover (`sm:opacity-0 sm:group-hover:opacity-100`). That behaviour existed before this change and is not a regression.

**Contrast on card 1**
- The `text-purple-100` labels and the `bg-white/20` separator are readable on the gradient, and the separator is visible between the new and the replicated rows.

**Numbers reconcile on screen**

| Card | Breakdown | Total |
|---|---|---|
| Card 1 | 394 + 429 + 20 + 119 | 962 |
| W1/W2 | 35 + 359 + 20 | 414 |
| W3 | 167 + 262 + 119 | 548 |

The status strip also adds up to 962: 755 + 5 + 151 + 36 + 12 + 3.

**Cross-check with SQL**
- The user's raw query returned W1/W2 444 / W3 744. That query lacks the endpoint's filters:
  - submitter initiative: `rbi.initiative_role_id = 1`, `rbi.is_active`, `ci.active`
  - `rt.id NOT IN (10, 11)`
- The difference is therefore the endpoint scope, which already applied to the headline counts before this change. It is not a bucketing error. The Leader gave the user a query that matches the endpoint.
- The user ran that query and it matches the screen exactly, every bucket:

  | Stream | Total | New | Submitted | Editing | Replicated |
  |---|---|---|---|---|---|
  | W1/W2 | 414 | 394 | 35 | 359 | 20 |
  | W3 | 548 | 429 | 167 | 262 | 119 |

  The bucket math is confirmed against real data.

**Out of scope, noted only**
- At 1280 px the status strip truncates "Submi…" and "Discontin…". This is pre-existing and comes from the status strip, which this spec does not touch.

## 3. Summary

| Task | Status | Attempts |
|---|---|---|
| POVKB-T-1 service tallies | `[x]` PASS | 1 |
| POVKB-T-2 3-card deck | `[x]` PASS | 2 (attempt 1 FAIL: missing card-1 separator, non-distinct fixture) |
| POVKB-T-3 docs + visual | `[x]` PASS (visual checked with the user's admin screenshots) | 1 |

- **Budget:** 3 / 3 tasks.
  - Churn is +267 / −66 = 333 changed lines (net +201) over 7 files, under the 350 tripwire. The estimate was ~220.
  - Review rounds: 2 on T-2, against the budgeted 1.
- **Scope deviation:** `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (accepted by the Reviewer).
- **Commit:** none, which needs the user's go-ahead. T-1, T-2 and the folder `CLAUDE.md` must land in one commit.
- **Open:** none in scope. Follow-ups from design §11: prune the unrendered `PortfolioKpis` fields, and revisit the card-3 label if P-3 changes.
