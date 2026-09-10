# Archive Summary — AoW identity column starvation

**Outcome:** shipped. The AoW row's code+name column can no longer collapse: measured floor (143px / 167px with the ⓘ fallback), degradation ladder re-keyed on the row's own container width via Tailwind 4 container queries, a real-browser Cypress component gate (84 widths × 2 states) that was red on the old template and is green now, and a real-page pass at 5 widths × scope off/on with 0 violations. 5/5 tasks `[x]`, 7 commits.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/aow-identity-column-starvation/` · Prefix `AIS` |
| Archive Date | 2026-09-03 |
| Archived from branch | `qa-development-2026` (default pin `master`) — shared-file syncs recorded pending |
| Depth / Approval Mode | Standard, Bug Mode · `pre-approved (user, 2026-09-03)` |
| Source | `proposal.md` carried out of `changes/aow-row-gesture-split` `RGS-T-4`; `KZ-OAH-1` 4th recurrence |
| Final Status | **Complete.** No `test-report.md` / `validation-report.md` (accepted: the CT sweep + Jest parity + real-page table in `execution.md` are the evidence; `/akili-test`/`/akili-validate` not run by owner decision "termina") |
| Judgment Day | 1 pass, 3 SEVERE / 6 WARNING / 5 SUGGESTION, all fixed pre-execution — `judgment.md`, `APPROVED` |

## 2. Requirements Delivered

| ID | Behaviour | Delivered by | Evidence |
|---|---|---|---|
| `AIS-R-1` | Name ≥ 80px beside a fully visible chip (identity ≥ 143 / 167 per branch), ellipsis + tooltip | `minmax(143px,1fr)` / `minmax(167px,1fr)` on skeleton + row | CT sweep `AIS-AC-1` green; real page min name 83px (1100) |
| `AIS-R-2` | No overflow trade (row, list, page) | thresholds derived as Σ min tracks + gaps + **36px row chrome** | CT `AIS-AC-2`; real page `pageOverflow=false` ×10 |
| `AIS-R-3` | Degradation keyed on the row's own width, not the viewport | `@container` on both list wrappers; `@min-/@max-[N]:` variants; 0 viewport variants left in the row block | grep = 0 (`:535–:903`); Reviewer re-derivation |
| `AIS-R-4` | `OSF-DD-8` order preserved: restack (700) → shed (630) → stack 2×2 (560); `Report` keeps its label | ladder comment with arithmetic | CT exclusivity assertion; 1280 screenshot |
| `AIS-R-5` | Skeleton = row structure | byte-identical token sets; Jest parity test (+1, mutation-proven) | `program-overview.component.spec.ts` |
| `AIS-R-6` | Layout-shaped regression gate, red → green | `program-overview.row-layout.cy.ts` (Cypress CT, 84×2 steps, fonts gated) | red 491 failures → green 3/3 ×2 |
| `AIS-R-10` | `reporting-aow-table` measured | report-only CT sweep | does **not** starve (`minmax(280px,1fr)`); `AIS-OQ-4` closed |
| `AIS-R-11` | Folder guide documents the pattern | `program-overview/CLAUDE.md` paragraph (120-line cap kept, stamp refreshed) | Reviewer PASS attempt 3 |
| `AIS-AC-5` | Real page, 5 widths × scope off/on | Orca embedded browser, double-read | `ais-t5-real-page.jsonl`, `ais-t5-1280.png` — 0 violations |

## 3. Files Changed

| File | Δ | What |
|---|---|---|
| `…/program-overview/program-overview.component.html` | ≈210 lines (2 wrappers, 2 rows, ≈15 cells, 2 comment blocks) | `@container`, floors, container-variant ladder with arithmetic, 2 `data-testid` hooks |
| `…/program-overview/program-overview.row-layout.cy.ts` | +346 → 413 | the regression gate + measurement `it` |
| `…/program-overview/program-overview.scope.spec.ts` | 71 swaps | 7 existing tests re-pointed at the container tokens (intent preserved, Reviewer-verified) |
| `…/program-overview/program-overview.component.spec.ts` | +59 | skeleton/row token parity test |
| `…/program-overview/CLAUDE.md` | 38 lines | ladder paragraph rewritten, stamp `2026-09-03 · e227ce935` |
| `…/reporting-aow-table/reporting-aow-table.row-layout.cy.ts` | +139 | report-only sweep |
| `cypress.config.js`, `cypress/support/component-index.html`, `cypress/support/assets/material-icons-round.woff2` | +64 + 173,620 B binary | CT harness: self-hosted icon font (SHA-256 `c948f126…0243a6`) |

Commits: `7f9365553` T-1 · `14996fcc7` harness · `917e7128d` T-2 · `f1ee867dd` T-3 · `83337e132` T-4 · `ada2abc1f` T-5 docs · `623b46af9` T-5 real page. Budget: ≈240 LOC planned, ≈800 actual (trip recorded `execution.md` §3, owner-approved).

## 4. Test Evidence

| Gate | Result |
|---|---|
| Cypress CT `program-overview.row-layout.cy.ts` | red on old template (491 failing measurements / 84 steps) → **3 passing ×2** after fix |
| Jest `…/program-overview` dir | 235 → **236 passed** (+1 parity test, mutation-proven) |
| `npx ng lint --quiet` | clean, every task |
| Real page (Orca browser) | 5 widths × scope off/on: name ≥ 83px, chip inside, no overflow, exclusivity ok, double-read stable — **0 violations** |
| CT blast-radius sample | `pr-button.cy.ts` 3/3 under the new font harness |

## 5. Validation Summary

Not run as a separate phase (owner decision). Reviewer PASS on every task (T-1 after one rework, T-5 docs after two). Defect classes named in `requirements.md` §8 each have a gate that saw them; the one accepted blind spot (colour/weight regressions) is covered by the 1280 screenshot only.

## 6. Accepted Warnings / Follow-Ups

| # | Item | Owner |
|---|---|---|
| F1 | Promote the container-ladder pattern to `docs/ux-ui/design.md` §9 — **pending item** (kaizen P7) | default-branch apply |
| F2 | Amend `KZ-OAH-1` standardization #1 (`minmax(0,1fr)` permits collapse → readable floor + container ladder) — **pending** (P3) | default-branch apply |
| F3 | Registry Skill Map says Tailwind is "not mapped" — stale; **pending** (P6) | default-branch apply |
| F4 | One-off `npm run test:ct` on `master` for the four icon-using CT specs not re-run (`pr-multi-select`, `alert-status`, `edit-or-delete-item-button`, `custom-validation-tooltip`) | owner |
| F5 | Candidate proposal `changes/reporting-aow-table-row-overflow` (row min ≈1028px overflows at every width) — measure again after `reporting-aow-jira-hierarchy` lands | owner |
| F6 | Candidate proposal: fold the 300px summary rail earlier so 900/768 keep more tracks (`AIS-DD-1` alt. c) | owner |
| F7 | `cypress/results/ais-t4-reporting-aow-table.txt` left untracked (raw T-4 evidence); the compressed table is in `execution.md` | — |

## 7. Historical Notes

- Fourth recurrence of `KZ-OAH-1`; the three prior fixes shed tracks at viewport breakpoints and never raised the `0` floor. This spec changed the mechanism (container-keyed) instead of the numbers.
- Judgment Day's three SEVERE findings were single-judge; the orchestrator verified each against the template before fixing (recorded deviation in `judgment.md`).
- The CT Chromium has no route to Google Fonts: `arrow_forward` rendered as text and contaminated the first measurements; fixed by vendoring the font into the CT harness.
- The real-page pass sat "blocked on environment" until the owner pointed at the Orca embedded browser (`orca-cli`), which already held the session.
- A parallel AKILI session (`bugfix/smart-back-button`, then `reporting-aow-jira-hierarchy`) committed on the same checkout throughout; all commits here are path-scoped.
