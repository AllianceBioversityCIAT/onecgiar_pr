# Execution — CGIAR Centers block: remove "Progress by Center"

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/remove-centers-progress/` |
| Approval Mode | gated |
| Leader | Claude Code (opus) |
| Implementer | `akili-implementer` wrapper (T2) |
| Reviewer | `akili-reviewer` wrapper (T3) |
| Started | 2026-10-15 |

## 2. Task Execution History

### RCP-T-1 — Remove the card, move the error recovery, update the specs

- **Final status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-15
- **Requirements covered:** RCP-1, RCP-2, RCP-3, RCP-4, RCP-5, RCP-N1, RCP-N2, RCP-N3, RCP-N5
- **Skills assigned:** `angular-developer`, `spartan` (Spartan MCP was not needed: the new button copies the existing plain-Tailwind Retry button style). Effort: medium.

#### Attempt 1

**Files changed** (`git diff --stat`, 6 files, +132 / −412; budget ≈ −260 / +60, within the tripwire):

- `onecgiar-pr-client/src/app/internationalization/portfolio-centers-block.copy.ts` (12 keys deleted, `partialTotal` reworded, `retryFailedCenters` added)
- `.../portfolio-overview/components/centers-block/centers-block.charts.ts` (−40: `buildShareOption`, `buildRowsTable` and the `EntityOverviewRow` import deleted)
- `.../centers-block/centers-block.charts.spec.ts` (−15)
- `.../centers-block/centers-block.component.html` (detail card deleted; `role="status"` note and `centers-retry-failed` button added; `centers-empty` added)
- `.../centers-block/centers-block.component.ts` (detail state, handlers, icons and `CenterRowState.fullName`/`link` deleted; `retryFailedCenters()` added; `toggleStatus()` no longer sorts)
- `.../centers-block/centers-block.component.spec.ts` (every row of design §8.5 applied)

**Implementer verification:**

- **Red run** on the old code, with the new cases written first: `npx jest --testPathPattern=centers-block.component --maxWorkers=2 --no-coverage` → 4 failed, 11 passed. The four that failed: RCP-1 absence, RCP-4 note + retry-only-failed, RCP-4 double-click, RCP-5 empty. The RCP-4 "all OK → no button" case already passed, as expected, because the old code already met it.
- **Green run:** `npx jest --testPathPattern=centers-block --maxWorkers=2 --no-coverage` → 3 suites, 24 tests passed.
- **`npm run build:dev`:** OK. Its only warning is the existing Sass `@import` deprecation.
- **Lint:** `npx eslint` could not run here, because the client has no flat config (exit 2). Substituted with `npx ng lint --quiet --lint-file-patterns <centers-block/*.ts, copy file>` → All files pass. The DoD's "eslint clean" box is met through this substitute.
- **Disqualifiers:** none triggered.
  - `centers-block.aggregate.ts`, `centerTotals`, `segments` and `kpis` are untouched.
  - The "KPI cards show…" test is unchanged.
  - `buildShareOption`, `buildRowsTable` and `PORTFOLIO_CENTERS_BLOCK_COPY` are consumed only inside `centers-block/`.

**Implementer assumptions (reviewed and accepted):**

- The charts spec had only a `buildShareOption` case and no `buildRowsTable` case. That case was removed, along with the `rows` fixture and the `EntityOverviewRow` import, which became unused.
- The "markup: status colours" test dropped a `statusDot(column.id)` assertion that only targeted the deleted table markup. The tile `statusDot(segment.id)` and no-hex assertions are kept.
- The partial note keeps the `centers-partial` test id, now inside the `role="status"` container.
- `retryFailedCenters()` returns early unless the list state is `ready`.

**Reviewer verdict:** **PASS.**

- Design §8.1–§8.5 is fully applied, and RCP-1..5 and RCP-N1/N2/N3/N5 are met.
- The figures path (RCP-2) is untouched.
- No dead code is left (leftovers grepped).
- The dropped `statusDot(column.id)` assertion is legitimate.
- The double-click test expects 3 calls (2 initial + 1 retry), so a duplicate retry would show up as 4.

**ADVISORY (4R, non-gating):**

- **Reliability:** on the old code, the double-click red case failed with a `null.click()` TypeError (the button did not exist), not on its count assertion. Future red runs should assert the element exists first, so the failure is behavioral.
- **Readability:** `ng lint` was substituted for `npx eslint`, as recorded above.
- **Resilience (a11y):** the `role="status"` region also contains the button, so a screen reader may announce "Retry failed Centers" with the note. A narrower option is `role="status"` on the note alone, with the button outside it. Neither Retry button has a visible focus style (`--pr-focus-ring`, UI rule 4). This is inherited and minor.

**Decisions:**

- The Reviewer was given the diff as a saved file path in the session scratchpad instead of inline (about 50 KB). The Reviewer has `Read` access, and the file is the verbatim `git diff`.
- The RCP-N4 folder doc is left to RCP-T-2, as planned.

**Issues:** none blocking.

**Final verification:** scoped Jest 24/24 green · build:dev green · ng lint clean on the touched files. Not committed (gated; no auto-commit).

### RCP-T-2 — Folder doc + read-only browser check

- **Final status:** PASS (doc: skip-eligible review; visual: HITL evidence below)
- **Date:** 2026-10-15

**Doc (Implementer, attempt 1):**

- **File:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` (+17 / −1).
- **Changes:**
  - `Verified:` re-stamped to 2026-10-15.
  - New "Block contents after `remove-centers-progress`" subsection: the 3 parts, retry-failed behavior, the empty state, and the Center Overview shortcut note.
  - "Removed on purpose" gains Progress by Center.
- **Decision:** the "Rows and bilateral rows navigate to `entity-details/:code/results`" line was left unchanged. It describes the programme-matrix and bilateral rows, not the removed table, so the "if" condition in design §8.6 does not apply.
- **Review:** skip-eligible (doc), per tasks.md.

**Browser check (Leader, read-only):**

- **Served bundle confirmed** to contain RCP-T-1. In the DOM:
  - No `detail-modes`, `detail-search`, `centers-table` or `centers-detail-chart`, and no "Progress by Center" text.
  - One `[role="status"]` region, and `status-tiles` present.
  - With all Centers OK, no `centers-retry-failed` and no `centers-partial`.
- **Layout at a 1280px viewport** (`devicePixelRatio` 1.5 caps the window at 1280, so 1440 was not reachable):
  - The block section has 3 children: header (43–100), KPI grid (123–254), status card (277–649).
  - Uniform 23px gaps, no empty bordered div, nothing rendered after the status card.
- **RCP-3 manual:** clicked the Editing tile (995, 77.5%) → `aria-pressed="true"`, the "Active filter" strip appears, and the link is `/result/results-outlet/results-list?status=1`. A second click clears it. The tile filter is client-side only, so no write was made.
- **First pass:** screenshots timed out twice and the window resize had no effect. The user then asked the Leader to finish the check in the browser (2026-10-15). Second pass:
  - **1280px** (widest reachable; 1440 is not possible at DPR 1.5):
    - The block reads header + Phase chip → KPI cards (1284 results / 3.4% approved; 15 / 16 Centers) → Reporting status.
    - With the Editing filter on, "Active filter: Editing · View in Results Center · Clear filter" renders and the card closes cleanly at the page end.
  - **768px:** checked through a same-origin 768px iframe of `/portfolio-overview` (inner viewport 764; GET requests only), because the window could not be resized.
    - Block section 21–731, 3 children, uniform 23px gaps, KPI cards side by side (21–366 / 385–731), no empty bordered div.
    - 0 elements inside the Centers block overflow the viewport.
    - Editing tile → `aria-pressed="true"` and the link carries `?status=1`. The block ends 21px before the end of the document, with nothing after it.
  - **Out of scope, pre-existing:** at 768 the page scrolls horizontally (`scrollWidth` 839) because of the global topbar (`pr-topbar-right` / user button, right edge 840) and the programme-matrix table above. Nothing in this block contributes. Recorded only, not a task (advisory rule).
  - **Screenshots** (Leader session, local only), all in `C:/Users/santiagosanchez/AppData/Local/Temp/claude-chrome-screenshots-SAf1uo/`:
    - `screenshot-1792081312700-0.jpg` (1280, top)
    - `screenshot-1792081325647-1.jpg` (1280, filter active, block end)
    - `screenshot-1792081422965-5.png` (768, top)
    - `screenshot-1792081437766-6.png` (768, filter active)
- **RCP-4 in the browser:** not reproduced (it needs a forced failure). Per the task's disqualifier, it rests on the Jest evidence of RCP-T-1.
- **Falsifier result:** no empty card or double gap, no "Progress by Center" title, and the Editing tile shows the Active filter strip, at both widths. Not falsified.

## 3. Summary

| Task | Status | Attempts | Notes |
|---|---|---|---|
| RCP-T-1 | PASS | 1 | Jest 24/24, build:dev, ng lint (eslint substitute) |
| RCP-T-2 | PASS | 1 | Doc updated; visual check at 1280 + 768 (1440 not reachable) |

- **Budget:** 2 tasks, 1 review round, about +149 / −413 LOC including the doc. Within the tripwire.
- **Pending for `/akili-archive`:** carry the 4R advisories (live region wraps the button; Retry buttons have no focus ring; red-run null-click; the topbar overflow at 768). Not committed (gated, no auto-commit).
