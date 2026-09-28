# Module Spec — `bilateral/project-overview-metrics` — Execution Log

## 1. Document Control

- **Spec:** `docs/specs/bilateral/project-overview-metrics/`
- **Approval Mode:** gated (no `pre-approved` marker found in requirements.md/design.md Document Control — treat each task-loop PASS as a pause-and-report gate per `/akili-execute` Step 5)
- **Leader model:** Sonnet 5 (session model). Registry recommends `opus` for T1 — flagged to user at Step 0, not switched (non-blocking).
- **Implementer model:** akili-implementer wrapper (T2)
- **Reviewer model:** akili-reviewer wrapper (T3)

---

## 2. Task Execution History

### `BIL-POM-T-1` — Add `is_replicated` to the bilateral center-results query

- **Status:** PASS (attempt 1/3)
- **Date:** 2026-09-22
- **Implements:** `BIL-POM-R-1`, `BIL-POM-AC-1`, `BIL-POM-AC-2`
- **Skills assigned:** `nestjs-expert`. Effort: `medium`.

**Attempt 1**

- **Files changed:**
  - `onecgiar-pr-server/src/api/results/result.repository.ts` — added `r.is_replicated,` to the SELECT list in `getResultsByBilateralCenter`, after `r.creation_method`, before the `is_ai_generated` CASE expression. No new join/WHERE/bind param.
  - `onecgiar-pr-server/src/api/results/result.repository.spec.ts` — added one `it(...)` case asserting the SQL contains `r.is_replicated` and `params` is unchanged (`['BIO', 'BIO', 36]`).
- **Implementer verification:**
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository"` → 3 suites / 70 tests passed (includes new case).
  - `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` → 0 errors on the 2 touched files; 11 pre-existing prettier/CRLF errors in unrelated files (untouched, out of scope).
- **Reviewer verdict:** `STATUS: PASS`. Confirmed diff matches design.md §5 exactly (correct placement, no new join/WHERE/param), red-run test is genuine (string appears nowhere else pre-change), eslint clean on touched files, no `/api/bilateral/*` or `/api/platform-report/*` surface touched so `bilateral-result-summaries.en.md` correctly untouched.

**Not Done / Assumptions (carried forward, does not block this task's PASS):**

- **`BIL-POM-OQ-3` real-data spot-check not performed** — no DB access in this session's environment. Per `requirements.md` §10 ("does not block coding, but blocks the acceptance test for `BIL-POM-AC-2`/`AC-3` being marked done") and `tasks.md` DoD (the spot-check is a **PR-description** item, satisfied at `BIL-POM-T-4`, not `T-1`), this is a valid carry-forward, not a task blocker. Consequence held open: `AC-2`/`AC-3` stay unmarked-done and design premise `BIL-POM-P-5` stays `assumed` until a human with DB access (DBeaver/etc.) runs the spot-check, ideally before `BIL-POM-T-4`'s PR is opened.
- **NULL-handling disqualifier (tasks.md `BIL-POM-T-1` Disqualifier) is unevaluated, not closed.** `Result.is_replicated` is `nullable: true` on the entity (`result.entity.ts:472-478`). Whether a meaningful subset of active bilateral rows are actually `NULL` (vs. just nullable in principle) is exactly what the OQ-3 spot-check above would answer. Flagged as still-open risk for whoever runs that spot-check.

**Forward pointer for `BIL-POM-T-2` / `BIL-POM-T-3` (Reviewer finding, must be carried into their briefs verbatim):**

> `getResultsByBilateralCenter` uses raw `this.query(...)`, which bypasses TypeORM's entity-level boolean transformation. `is_replicated` will arrive over the wire as MySQL `tinyint(1)` (`0` / `1` / `null`), **not** a JS `true`/`false`. `design.md` §6.2's pseudocode uses strict comparisons (`r.is_replicated === true`, `r.is_replicated === false`) against an interface typed `is_replicated: boolean`. Written literally, both computed signals (`replicatedCountByProject`, `newForReviewCountByProject`) would evaluate to 0 for every project in production while hand-written boolean test fixtures (`is_replicated: true`) stay green and mask the bug. **T-2/T-3 must either:** (a) normalize at the interface/mapping boundary (`=== 1 || === true`), or (b) use fixtures shaped like the server's actual raw-query output (`0`/`1`/`null`) in at least one integration-style test, not only hand-typed booleans.

**Requirements covered:** `BIL-POM-R-1`.
**Decisions made:** None beyond design.md (no deviation from the approved plan).
**Issues encountered:** OQ-3 environment gap (see above); Reviewer's NULL/tinyint forward-pointer for the next task.
**Final verification result:** PASS — server Jest green (70/70), eslint clean on touched files.

### `BIL-POM-T-2` — Extend `BilateralCenterResult` with `is_replicated`

- **Status:** PASS (attempt 1/3)
- **Date:** 2026-09-22
- **Implements:** `BIL-POM-R-1`
- **Skills assigned:** `angular-developer`. Effort: `low`.

**Attempt 1**

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-center-result.interface.ts` — added `is_replicated: boolean;` (non-optional, per design.md §6.2), with a docstring warning that the server sends raw MySQL tinyint (0/1/null), not a JS boolean, and that `BIL-POM-T-3` must normalize rather than use strict `===` comparisons (carries forward the `BIL-POM-T-1` Reviewer finding).
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.fixtures.ts` — added `is_replicated: false` to the `mkRow()` builder default.
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts` — added `is_replicated: false` to the local fixture factory.
  - `onecgiar-pr-client/src/app/pages/bilateral/bilateral-result-filter.spec.ts` — added `is_replicated: false` to all 12 hand-written row literals (no factory/spread in this file).
  - `bilateral-projects-panel.component.spec.ts` fixtures left untouched — they use `as BilateralCenterResult` casts, which bypass the missing-property check; Reviewer independently verified this claim (grepped the file, confirmed 3 cast literals at lines 71/82/93).
- **Implementer verification:**
  - `npm run build` (Angular production build) → succeeded, no new type errors.
  - `npx ng lint --quiet` → clean.
  - `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-result-filter\.spec\.ts|bilateral-results-list\.component\.spec\.ts|bilateral-overview\.aggregate\.spec\.ts|bilateral-overview\.component\.spec\.ts|bilateral-overview\.fixtures|bilateral-overview\.service\.spec\.ts|bilateral-overview\.charts\.spec\.ts|bilateral-projects-panel\.component\.spec\.ts"` → 7 suites / 226 tests passed.
- **Reviewer verdict:** `STATUS: PASS`. Independently re-verified (not taken on faith): the cast claim on `bilateral-projects-panel.component.spec.ts` is true; a repo-wide grep confirms fixture coverage is complete (exactly 4 files touched, matching the Implementer's claim); the forward-pointer docstring faithfully reproduces the `BIL-POM-T-1` Reviewer finding. Confirmed typing as strict `boolean` (not widened to `boolean | number | null`) is correct spec conformance per design.md §6.2 — widening would have been unapproved design drift, better handled as a documented gap at this task boundary. Advisory block suppressed (small diff, single checklist pass).

**Forward pointer for `BIL-POM-T-3` (Reviewer finding, must be carried into its brief verbatim):**

> Every fixture this diff (`T-2`) touched uses a hand-written JS boolean (`is_replicated: false`) — exactly the shape the `T-1` forward pointer warned would keep tests green while production counts silently read 0 (because the server's raw-SQL response is actually MySQL tinyint `0`/`1`/`null`). `T-3` still owes: (a) normalization at the counting boundary (e.g. `=== 1 || === true`, not strict `=== true`/`=== false`), **and/or** (b) at least one test fixture shaped like the server's actual raw-query output (`0`/`1`/`null`), not only hand-typed JS booleans — including updating the `bilateral-projects-panel.component.spec.ts` cast fixtures, which currently carry no real value for this field at all. Finding "existing fixtures already have the field" during `T-3` does not discharge this — the field's *type* in those fixtures is still the wrong shape to catch the bug.

**Requirements covered:** `BIL-POM-R-1` (interface half).
**Decisions made:** Kept the interface field as a strict, un-widened `boolean` per design.md §6.2 rather than freelancing a `0 | 1 | boolean` union — the runtime mismatch is documented via comment instead, to be resolved at the T-3 consumer boundary.
**Issues encountered:** None beyond the carried-forward tinyint/boolean risk (not a T-2 defect).
**Final verification result:** PASS — Angular build green, lint clean, 226/226 relevant tests passing.

### `BIL-POM-T-3` — Compute and render replicated / new-for-review counts per project

- **Status:** in progress (attempt 1/3 FAILED — see below; attempt 2 in flight)
- **Date:** 2026-09-22
- **Implements:** `BIL-POM-R-2..R-6`, `R-10`, `AC-1..AC-5`
- **Skills assigned:** `angular-developer`, `tailwind-design-system`. Effort: `medium` (attempt 1) → `high` (attempt 2, per rework-bump rule).

**Attempt 1 — FAIL**

- **Files changed:**
  - `bilateral-projects-panel.component.ts` — added `replicatedCountByProject`/`newForReviewCountByProject` computed signals (correctly normalized via `Number(row.is_replicated) === 1`, never strict boolean — the T-1/T-2 forward pointer is genuinely closed on the counting side), `getProjectReplicatedCount`/`getProjectNewForReviewCount` getters, imported `STATUS_KEY_TO_ID` instead of hardcoding `5`.
  - `bilateral-projects-panel.component.html` — added two new badges in grid + list view, wrapped in `@if (count > 0)`.
  - `bilateral-projects-panel.component.spec.ts` — new `describe('BIL-POM-T-3...')` block, 44/44 tests green (1 suite).
- **Implementer verification:** `npx jest ... --testPathPattern="bilateral-projects-panel"` → 44/44 passed. `npx ng lint --quiet` → clean. No new hex/SCSS class (confirmed).
- **Reviewer verdict:** `STATUS: FAIL`.
  - **Issue 1 (the blocking defect):** Both new badges are suppressed at zero-count (`@if (count > 0)`), but `BIL-POM-R-4` requires rendering on **every** card/row, and the task's own Falsifier explicitly requires "B shows '0' and '0' — not a shared/global count" (i.e. the rendered zero state, not just the computed value). `design.md` §12 `BIL-POM-DD-2`'s "no placeholder badge" rule is scoped to the deferred metric #3 only, not transferable to metrics #1/#2 which do have data. Secondary drift: the new badges hardcode the `--has-results` modifier class instead of binding it conditionally like the sibling aggregate badge does (`[class.bpp_results_badge--has-results]="count > 0"`).
  - **Remediation:** drop the `@if` wrappers, render both badges unconditionally, bind `--has-results` conditionally (matching the existing aggregate badge's pattern), and rewrite the "B shows no badge" test into "B shows 2 badges reading 0".
  - Reviewer independently verified (not on faith) that the tinyint/boolean normalization is genuinely correct: read the raw diff, confirmed `Number(...) === 1`/`!== 1` throughout, and read the actual spec file to confirm the mutual-exclusivity fixture row uses `is_replicated: 1` (raw), not `is_replicated: true`, and that a structural `4 + 2 === 6` total-count assertion rules out double-counting (not just per-bucket assertions).
  - Confirmed `STATUS_KEY_TO_ID.pending === 5`; confirmed icon choices (`pi-sync`, `pi-bell`) are approved existing primeicons, not a new dependency, and consistent with the file's existing primeicons-based sibling badge (the lucide-only rule is scoped to redesign surfaces, not this panel); confirmed zero new hex/SCSS.
  - **ADVISORY (non-blocking):** the two new computed signals each re-scan `results()` independently rather than sharing one pass with `resultsCountByProject` — fine at today's volumes per `BIL-POM-DD-1`, revisit only if a 4th per-project aggregate is added later.

**Carry-forward decision recorded per Reviewer request:** `newForReviewCountByProject`'s current logic treats a `NULL` `is_replicated` row (`Number(null) === 0`) as "not replicated", so a NULL row with `status_id = 5` counts toward "new for review". This is a defensible reading of `BIL-POM-R-3` but is an implementation-made policy on the still-open `BIL-POM-OQ-3`/`T-1` NULL-handling question — whoever runs the real-data spot-check should validate this policy specifically, not just the general rule.

**Not Done / Assumptions (attempt 1, carried into attempt 2's scope — not yet resolved):**

- Browser verification (`npm start`, mixed data, desktop + mobile width, per this task's DoD) not performed — no browser in this session's environment. `BIL-POM-R-6`/`AC-4` phase-switch freshness (`tasks.md` `BIL-POM-TEST-4`, already a designated manual-only gate) and mobile-width fit for now-3-badges-always-visible (post-fix) remain unverified by any automated harness. Must be closed by a human before `BIL-POM-T-4`'s PR, and becomes *more* load-bearing once the zero-state fix always renders 3 badges.

---

**Attempt 2 — PASS**

- **Files changed:**
  - `bilateral-projects-panel.component.html` — removed both `@if (count > 0)` wrappers so the two new badges always render; changed `class="bpp_results_badge bpp_results_badge--has-results"` (hardcoded) to `class="bpp_results_badge" [class.bpp_results_badge--has-results]="count > 0"` (conditional binding), matching the sibling aggregate badge's exact pattern. `.ts` untouched (counting logic confirmed unchanged).
  - `bilateral-projects-panel.component.spec.ts` — rewrote the zero-state test into two: (1) asserts project B's badges render showing "0 Replicated"/"0 New for review" without `--has-results`; (2) asserts the `--has-results` modifier binds correctly both ways (present at count>0, absent at 0). Collateral fix: one pre-existing unrelated test's brittle "first `.bpp_results_badge` in the card" selector broke because the new badges now render ahead of it in DOM order — fixed by filtering on `textContent.includes('result')` instead of taking the first match; same two assertions, same logical badge.
- **Implementer verification:** `npx jest ... --testPathPattern="bilateral-projects-panel"` → 45/45 passed (1 suite). `npx ng lint --quiet` → clean. `.scss` still untouched.
- **Reviewer verdict:** `STATUS: PASS`. Confirmed the FAIL issue is genuinely fixed (badges unconditional, `--has-results` conditionally bound, matches `BIL-POM-R-4` and the Falsifier's "B shows 0 and 0" requirement). Independently scrutinized the collateral selector change and confirmed it's faithful — same badge, same assertions, no weakening. Confirmed `.ts` counting logic unchanged (content comparison against the attempt-1 record; this Reviewer instance had no shell access to run `git diff` directly). Noted two OTHER pre-existing tests in the same describe block now resolve to the replicated badge instead of the aggregate badge via their own first-match selectors — still pass, still correctly assert `BIL-POM-R-5` navigation (all badges share the same `navigateToProjectResults` call), only the test's own label is now slightly imprecise. Not worth a rework attempt — recorded as a non-blocking residual note, not an advisory finding requiring action.

**Not Done / Assumptions (both attempts, still open — carried to `BIL-POM-T-4`):**

- Browser verification not performed (no browser in this session's environment) — `tasks.md` `BIL-POM-T-3` DoD requires `npm start` verification at desktop + mobile width with mixed replicated/new/neither data. This is now more load-bearing than before the fix: the card header carries three badges plus the status dot at all times (not just when non-zero), and jsdom cannot observe whether that wraps or overflows at mobile width. **Must be done by a human before `BIL-POM-T-4`'s PR.**
- `BIL-POM-OQ-3` real-data spot-check (from `BIL-POM-T-1`) still outstanding — same DB-access gap.
- `newForReviewCountByProject`'s NULL-handling policy (`Number(null) === 0` → counts as "not replicated") is implementation-made on the still-open OQ-3 question — flagged for whoever runs the spot-check to validate specifically, not just the general rule.

**Requirements covered:** `BIL-POM-R-2` through `R-6`, `R-10`; `BIL-POM-AC-1` through `AC-5` (code-level; AC-2/AC-3's "done" mark still blocked on OQ-3 per `T-1`).
**Decisions made:** Kept counting logic from attempt 1 unchanged (verified correct); fixed only the rendering condition and one class binding.
**Issues encountered:** One rework round (zero-state suppression) — resolved. One collateral test-selector fix (necessitated by DOM-order shift, not a logic defect) — verified faithful by Reviewer.
**Final verification result:** PASS — 45/45 tests green, lint clean, zero new hex/SCSS.

### `BIL-POM-T-4` — Regression pass + PR

- **Status:** PASS on the regression-verification half; **PR not opened** (blocked — see below)
- **Date:** 2026-09-22
- **Implements:** closure task (no new behavior)

**Regression pass — run inline by the Leader (verification-only, no code change; matches the Delegation Thresholds exception for a quick check whose output is bounded by `--reporters=summary`):**

- Server: `npx jest --silent --reporters=summary --forceExit --testPathPattern="result.repository"` → 3 suites / 70 tests passed. (Re-confirms `BIL-POM-T-1` is still green after `T-2`/`T-3`.)
- Client: `npx jest --no-coverage --changedSince=origin/performance-refactor --silent --reporters=summary` → **29 suites / 905 tests passed**, zero failures. This is the dependency-graph-based "everything my changes can break" run per client `CLAUDE.md` — satisfies the Falsifier's "no other spec flipping red that was green on the base branch."
  - Note: the project's own `npm run test:changed` wrapper (`scripts/run-jest-local.js`) failed to spawn in this Windows session (`spawnSync('npx', …)` without `shell: true` — likely a Windows-specific PATH resolution issue with `npx.cmd`, unrelated to this spec's changes). Ran the equivalent `npx jest --changedSince=...` directly instead, which is functionally identical to what the wrapper would have run. Flagging this as a possible environment gap worth a separate ticket, not part of this spec's scope.
- Lint: already confirmed clean per-task in `BIL-POM-T-1`/`T-2`/`T-3` entries above (server eslint on touched files, client `ng lint --quiet` on touched files). Not re-run redundantly here.

**Definition of Done status:**
- [x] Regression run green (both packages, scoped correctly — not narrowed past correctness).
- [ ] **PR not opened.** Blocked on two standing constraints, both outside this Leader's authority to waive:
  1. **No commit has been made for any of the three tasks** — per this user's standing memory instruction ("never `git commit` without explicit user go-ahead, even on AKILI task PASS"), all changes remain uncommitted in the working tree.
  2. Opening a PR is itself a visible, hard-to-reverse action (creates a GitHub PR, notifies reviewers) requiring explicit user confirmation per this session's operating rules — not something to do speculatively even if a commit existed.
- [ ] CI green — not applicable yet (nothing pushed).
- [ ] PR description stating metric #3 is intentionally excluded — drafted content is ready (see Summary below) but not published pending the commit/PR go-ahead.

**Requirements covered:** closure — no new `BIL-POM-*` requirement IDs.
**Decisions made:** none.
**Issues encountered:** the `test:changed` wrapper script's Windows spawn issue (worked around, not a spec defect).
**Final verification result:** Regression PASS. Spec code-complete and tested; publication (commit + PR) awaits explicit user go-ahead.

---

## 3. Summary

**All 4 tasks are code-complete and individually PASSed** (`BIL-POM-T-1`, `BIL-POM-T-2`, `BIL-POM-T-3` — T-3 on attempt 2/3 — and `BIL-POM-T-4`'s regression half). Nothing is committed. Three items remain open before this spec can be called fully "done" per its own tasks.md:

1. **Commit + PR** — awaiting explicit user go-ahead (standing "no auto-commit" instruction).
2. **`BIL-POM-OQ-3` real-data spot-check** — needs a human with DB access; no DB tool was available in this session at any point across `T-1`/`T-3`. Blocks the `BIL-POM-AC-2`/`AC-3` "done" mark, not the code itself.
3. **Real-browser verification of `BIL-POM-T-3`** — needs a human to run `npm start` and check the Bilateral Home at desktop + mobile width with mixed replicated/new/neither data (now three badges always render per row/card — this is more load-bearing post-fix than pre-fix).

Suggested PR description content (for when the user is ready to commit/PR):
- States plainly that metric #3 (W1/W2 contributor count) is intentionally not included in this spec, per `BIL-POM-OQ-1`/`design.md` §13.
- Notes the two open manual-verification items above as follow-ups to close before merge, or as accepted risk if the user chooses to proceed without them.

---

## 4. Post-execution visual refinement (2026-09-22, user-directed, grid view only)

After `BIL-POM-T-3`/`T-4` completed, the user shared a reference mockup (3-box KPI-style metrics grid — result/new-for-review/replicated, number-over-label, light rounded box) and asked to redesign the metrics row to match. Scoped via `AskUserQuestion`: **grid view only** (list view keeps the original compact badges), **metrics row only** (not a full card redesign — title/description/SP-alignment/footer untouched).

**Design deviation from `design.md` §6.3, recorded here rather than re-opening the spec** (small enough to be a same-session refinement, not a Pivot): the three counts (results/new-for-review/replicated) in grid view moved out of `bpp_card_head_right` (which now holds only the "Active" status dot) into a new 3-column Tailwind grid (`data-testid="bpp-metrics-grid"`) placed after the Science Program Alignment box, before the card footer. Each cell is a `<button>` (still calls `navigateToProjectResults`, per `BIL-POM-R-5`) showing the count (bold, colored `text-brand-400` when >0 / dimmed `--pr-color-accents-4` at 0) over a small caps label. List view's `bpp_td_results` cell is unchanged from `BIL-POM-T-3`'s PASS state (still three `.bpp_results_badge` buttons).

- **Token compliance:** caught and self-corrected one hex literal (`bg-[#f8fafc]`) introduced during the first pass — replaced with the existing `var(--pr-color-accents-1)` token before finalizing. No other new hex/SCSS block.
- **Files changed:** `bilateral-projects-panel.component.html` (grid-view markup restructure only) + `bilateral-projects-panel.component.spec.ts` (5 grid-view tests updated to query `[data-testid="bpp-metrics-grid"] button` instead of `.bpp_results_badge`, since that class no longer exists in grid view; list-view tests untouched).
- **Verification:** `npx jest --testPathPattern="bilateral-projects-panel"` → 45/45 green. `npx ng lint --quiet` → clean. `npm run build` → succeeded (pre-existing warnings only, no new errors).
- **Not done:** real-browser visual check of the new grid (still no browser in this session) — same outstanding item as `BIL-POM-T-3`, now also covering this new layout specifically.
- **Not committed** — folded into the same uncommitted working tree as `T-1`–`T-4`; awaiting the same user go-ahead.

---

## 5. Second visual iteration (2026-09-22, user-directed): pill-style badges

User shared a second reference mockup (pill-shaped badges, icon + count + label, positioned right below the description/above the Science Program Alignment box, with a distinct "branded" color treatment on the active new-for-review pill). Redesigned from the boxed grid (§4) to a pill row:

- **Position:** moved from after the Science Program box to right after the description paragraph, before it — matching the mockup. Added `mb-2` on the pill row so it doesn't crowd into the SP box below (user-requested spacing fix).
- **Style:** `rounded-full` pills, neutral scheme (`bg-[var(--pr-color-accents-1)]`/`border-[var(--pr-color-accents-2)]`, dark text when active, dimmed `--pr-color-accents-4` at 0) for results/replicated; the new-for-review pill gets the existing branded chip treatment (`bg-brand-50 border-brand-200/70 text-brand-400`) when active — reusing the exact class combination already used elsewhere in the codebase (`result-framework-reporting-card-item.component.html`'s "planned KPIs" chip), not invented from scratch.
- Icons: `pi-file` (results), `pi-sync` (replicated), `pi-plus-circle` (new).
- **Tests:** updated the 3 `BIL-POM-T-3` text/class assertions that referenced the old box labels ("4 Replicated" → "4 replicated", "2 New for review" → "2 new") and the old `text-brand-400` value-color check (replaced with checking the neutral vs branded pill classes directly, since the "active" treatment is no longer a single shared class across all three metrics).
- **Verification:** `npx jest --testPathPattern="bilateral-projects-panel"` → 45/45 green. `npx ng lint --quiet` → clean. `npm run build` → succeeded. No new hex literals (checked the diff directly).

**Important scope correction caught by the user mid-review:** the user initially thought the "results" pill (total aggregate count, `getProjectResultsCount` — the pre-existing aggregate from before this spec) was meant to be the deferred **metric #3** ("# of W1/W2 results where the project is tagged as a contributor"). Clarified: that data relationship does not exist in PRMS today — `results_by_inititiative` only accepts `clarisa_initiatives` (Science Program) ids, never `clarisa_projects` (bilateral project) ids, so a W1/W2 result cannot currently be tagged as contributing to a bilateral project the way it can be tagged to a secondary Science Program (`initiative_role_id` beyond the lead role — confirmed this existing pattern is what the user was picturing). This is exactly `BIL-POM-OQ-1`, already documented as deferred in `requirements.md`/`design.md` §13.

**Superseded by §7 below** — the user later confirmed the real-data test result 9441 (mapped to a genuine bilateral project) still wasn't counted, which led to discovering the actual data-model relationship and implementing metric #3 for real (not deferred anymore). See §7.

---

## 6. Third visual iteration (2026-09-22, user-directed): spacing + pill order

- **Spacing:** `mb-2` → `mb-8` on the pill row (user felt `mb-2` was still too close to the Science Program Alignment box).
- **Order:** reordered pills to match the order the user originally listed the 3 requested metrics in — **replicated first, new-for-review second, results (interim 3rd-metric placeholder) third** — replacing the earlier results/replicated/new order.
- **Tests:** two position-dependent selectors (`querySelector('[data-testid="bpp-metrics-grid"] button')` assuming the first match was the results button) broke when the order changed. Fixed both to select by `aria-label` content (`includes('results for')`) instead of DOM position — makes the tests order-independent going forward, not just order-corrected for this specific reorder.
- **Verification:** `npx jest --testPathPattern="bilateral-projects-panel"` → 45/45 green. `npx ng lint --quiet` → clean.

---

## 7. `BIL-POM-OQ-1` genuine correction — metric #3 implemented (2026-09-22)

**What happened:** the user asked what exactly classifies a result as "replicated"/"new" (answered from the live code: `is_replicated === 1` vs. `is_replicated !== 1 AND status_id === 5`, both normalized via `Number(...)`, per the T-1/T-3 tinyint findings). The user then reported a real-data test: result 9441 ("test for test policy") was mapped to bilateral project **N-301055 SOCIAL TRANS IMPROV NUTR** and did not increase any count. Initial hypothesis (Science Program vs. bilateral project confusion) was ruled out — user confirmed it genuinely is a bilateral project. Investigation then found the true cause, which **overturns the premise behind `BIL-POM-OQ-1`**:

- `ApplyFrameworkResultAssociationsService.processBilateralProjects` (`results-framework-reporting/application/commands/create-result-from-framework/`), reading a W1/W2 (framework/pooled) result-creation payload's `bilateral_project` field, calls `ResultsByProjectsService.linkBilateralProjectToResult(resultId, projectId, userId)` — writing a `results_by_projects` row for a **W1/W2 result**, with `is_lead` left at its default (never `true`, since W1/W2 results have no "lead bilateral project" concept).
- The original spec's investigation (`requirements.md` §2) only checked `results_by_inititiative` (Science-Program-only) and concluded no W1/W2 → bilateral-project link exists. It missed that `results_by_projects` — the SAME table the bilateral centre form's `contributing_bilateral_projects` field writes — already supports exactly this from the W1/W2 side.
- The reason it was invisible in the panel: `getResultsByBilateralCenter`'s `project_id` subquery (`ORDER BY rbp.is_lead DESC, rbp.id DESC LIMIT 1`, built for `COV-R-16` "Projects covered") deliberately keeps only the LEAD project per result — a W1/W2 contributor link almost never wins that ordering.

**User clarification on requirements:** the 3rd chip must NOT duplicate "View results (#)" (the pre-existing aggregate, `getProjectResultsCount`/`resultsCountByProject`) — it must be a genuinely separate count: **only `source='Result'` (W1/W2) results** that tag the project as a contributor via `results_by_projects`, regardless of `is_lead`. Confirmed via `AskUserQuestion`: scoped to the **current phase only** (`version_id`, same axis as replicated/new-for-review), counts **regardless of `status_id`** (no status filter, matching the original ticket's ask).

### Implementation

**Server** (`onecgiar-pr-server/src/api/bilateral/`):
- `bilateral-center.controller.ts` — `GET /center/projects` now accepts an optional `versionId` query param alongside the existing `year`.
- `services/bilateral-center.service.ts` — `getProjects(centerId, year, versionId)` threads it through.
- `services/bilateral-projects.service.ts` — `getProjectsByCenter(centerId, year, versionId)` now also runs `getW1w2ContributorCounts(projectIds, versionId)`: one query (`GROUP BY rbp.project_id`) counting `DISTINCT rbp.result_id` from `results_by_projects` joined to `result` where `r.source = 'Result'`, `r.version_id = versionId`, both `is_active = 1`. Attaches `w1w2ContributorCount` (new, non-optional field) to every mapped project. Returns an all-zero map when `versionId` is absent/invalid — an unscoped count would mix phases, same anti-pattern the original `project_id` subquery already avoided differently.
- Full docstring on `getW1w2ContributorCounts` records the investigation for future readers.
- Tests added: `bilateral-projects.service.spec.ts` (new `describe('w1w2ContributorCount...')` — 4 cases: omitted/invalid versionId defaults to 0 without querying, correct SQL shape + per-project mapping, string-versionId coercion) + updated 2 pre-existing `toHaveBeenCalledWith`/`toEqual` assertions in `bilateral-center.service.spec.ts` / `bilateral-center.controller.spec.ts` / `bilateral-projects.service.spec.ts` for the new arg/field.
- **Verification:** `npx jest --testPathPattern="bilateral-projects.service|bilateral-center.service|bilateral-center.controller"` → 3 suites / 142 tests green. `npx eslint` on touched files → clean (after `--fix` for prettier formatting on the 2 files with new code; confirmed the CRLF errors reported on `bilateral-center.service.spec.ts` lines 505-509 are pre-existing, outside this diff).

**Client:**
- `bilateral-creation.interfaces.ts` — `BilateralProject.w1w2ContributorCount: number` (non-optional; docstring explains the "only populated when versionId is passed" contract).
- `bilateral-api.service.ts` — `GET_bilateralProjects(centerId, year?, versionId?)`.
- `bilateral-projects-panel.component.ts` — **redesigned the constructor's project-catalog effect** from two separate effects (center-triggered full reset+load, phase-triggered silent refresh) into **one effect** tracked on both `centerId` and `versionId`, branching internally on a plain closure variable (`lastCenterId`, not a signal) tracking whether centerId itself changed. This was necessary because two separate effects raced on the very first resolution (when both signals already have a value on the first flush) — measured 2 and 3 duplicate fetches in different test runs before the fix. The single-effect design makes "center changed" (full reset + load) and "phase-only changed" (silent count-only merge, filters/search untouched) mutually exclusive by construction. Added `getProjectW1w2ContributorCount(project)`.
- `bilateral-projects-panel.component.html` — 3rd pill now reads `getProjectW1w2ContributorCount`, rendered as a **non-clickable `<span>`** (not `<button>` — no `navigateToProjectResults` target makes sense for a metric whose underlying rows aren't part of the loaded `results()` row-set), with a `title` attribute as the hover tooltip the user asked for ("W1/W2 results mapped to this project: N") and an `aria-label` for a11y parity with the other two pills.
- `bilateral-creation.service.ts` — one pre-existing `BilateralProject` literal (unrelated consumer, a lead-project selection on the create flow) needed `w1w2ContributorCount: 0` added to satisfy the now-required field; fixed its spec's matching `toEqual`.
- **Tests:** rewrote/added the affected `bilateral-projects-panel.component.spec.ts` cases (obsolete "results in metrics grid" tests → new W1/W2 contributor pill tests; `metricButtons.length` assertions 3→2 since the pill is now a `<span>`; new `describe('W1/W2 contributor count phase-switch refresh...')` — 4 cases covering initial fetch, phase-only refresh preserving filters, single-fetch-on-initial-resolution, and full-reset-on-genuine-center-change). One test bug caught and fixed during this: an assertion read the static `mockProjects` fixture instead of the live `component.projects()` signal state, which would have passed/failed independent of the actual merge logic under test.
- **Verification:** `npx jest --testPathPattern="bilateral-projects-panel|bilateral-creation.service"` → 104/104 green. `npx ng lint --quiet` → clean. `npm run build` → caught 2 real missing-field compile errors (`bilateral-creation.service.ts` literal, `bilateral-projects.service.spec.ts` shape assertion) — both fixed, then green. Full `--changedSince=origin/performance-refactor` run → **9269/9270 passed**; the 1 failure (`type-innovation-use.component.spec.ts`) is in a file untouched by this diff (confirmed via `git status`), a pre-existing unrelated assertion, out of scope.

**Not Done:** real-browser verification (still no browser in this session) — now also covers the new pill's tooltip rendering and the phase-switch-preserves-filters behavior end-to-end.

**Outcome:** `BIL-POM-OQ-1` is **no longer an open question for the data-existence part** — the relationship exists and is now read. What remains open (unchanged from before): whether/how to expose this "W1/W2 contributor" concept elsewhere in the product beyond this one badge, and whether `requirements.md`/`design.md` should be formally amended to record this correction (recommended before archiving this spec, since the shipped code now materially diverges from the approved design's Out-of-Scope section).
