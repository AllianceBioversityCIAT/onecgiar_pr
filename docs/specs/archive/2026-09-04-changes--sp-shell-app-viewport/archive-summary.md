# Archive Summary — `changes/sp-shell-app-viewport`

**Outcome:** complete. Six tasks, six `[x]` with Reviewer PASS evidence; on the Science Program Overview, Reporting and Results pages at ≥ 900 CSS px the frame (sidebar, topbar, TEST banner, program band, tabs) never moves, the document has no vertical overflow, and only the active tab's work area scrolls. Measured in a real browser on the three pages; visual sign-off by the user.

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/sp-shell-app-viewport/` |
| Archive date | 2026-09-04 |
| Archived from branch | `qa-development-2026` (spec branch; default pin `master`) |
| Approval Mode | `gated` in the spec → run as `pre-approved` (standing feedback 2026-09-02); `SAV-T-5` HITL kept |
| Depth | Standard · Module code `SAV` |
| Proposal | `proposal.md` (approved 2026-09-04) |
| Ticket | none |

## 2. Final Status

| Gate | Status |
|---|---|
| Tasks | 6/6 `[x]` — `SAV-T-1..T-6` |
| Reviewer verdicts | 6 PASS; 4 rework rounds total (T-1, T-3, T-4, T-6 — one each). Spec budget was ≤ 2: the third round was user-approved at the tripwire, the fourth (docs only) ran on the user's "sigue con T-6" and is flagged here |
| HALT / Pivot / FATAL_FAIL | none |
| Budget tripwire | fired once after T-3's FAIL; user chose *approve one more round* |
| HITL | D9 visual sign-off received ("ya vi la pantalla, se ve bien"), 2026-09-04 |
| `test-report.md` / `validation-report.md` | **absent — accepted.** Every task carried its own gate (Cypress CT recipe harness ×5 viewports, Jest 74 + 214 + 188 in the touched areas, lint) and `SAV-T-5` was the live validation on the real pages (`SAV-AC-1..10`). No `/akili-test` or `/akili-validate` run was requested |

## 3. Requirements Delivered

| Requirement | Delivered by | Evidence |
|---|---|---|
| `SAV-R-1` locked frame, `SAV-R-2` one work-area scroller | T-1 (recipe), T-3/T-4 (wiring), T-5 (real pages) | CT 5 viewports green; Reporting @1280 `docScrollH == docClientH`, `wa.scrollH 56536 > 686`, frame rects identical before/after scroll |
| `SAV-R-3` chrome height from layout | T-1 (banner stub), T-5 | band flush under header at 3 header heights (89.6 / 108.5 / 141.6 CSS px, Δ ≤ 1) |
| `SAV-R-4` tab switch keeps the frame | T-3/T-4, T-5 | Overview(scrolled 1200) → Results: rects identical, `scrollTop 0`, shadow reset |
| `SAV-R-5` scroll targets reachable | T-3, T-5 | row focus on Overview/Results: target ⊂ work area, `scrollY 0`; tour 6/6 (no below-fold step exists) |
| `SAV-R-6` band states follow the work area | T-2 | 6 Jest cases red-before/green (element 11 / 65, window fallback, first read on attach) |
| `SAV-R-7` fixed overlays keep anchoring, not clipped | T-1, T-3, T-5 | rail `top 0`, `height == innerH`, `host.contains(rail)`; band clause amended (AOW mode has no band) |
| `SAV-R-8` responsive fallback | T-1 (800×1100 CT), T-2, T-5 (840 CSS px) | host `static`, document scrolls, band `sticky`, work area `overflow visible` |
| `SAV-R-9` no horizontal overflow | T-1, T-4, T-5 | `scrollW == clientW` on document and work area at 1280/1440/1600 |
| `SAV-R-10` overlays do not shift the frame | T-3/T-4, T-5 | modal open/close: band + nav rects identical |
| `SAV-R-11` reusable convention + docs | T-1 (mixin), T-6 (4 guides; `design.md` §6 text pending default-branch write) | `_viewport-page.scss`; `grep pr-viewport-page` → 4 guides |
| `SAV-R-12` `custom_scroll` on the work area | T-3, T-4 | template utilities |
| `SAV-R-13` (MAY) | deferred | `design.md` §13 |
| `SAV-AC-1..12` | see `execution.md` T-5 AC table + T-6 | AC-2 INCONCLUSIVE on real data (no SP has short Overview content) — covered by the CT short-content case |

## 4. Files Changed Summary (from `execution.md`)

| Commit | Scope | Files |
|---|---|---|
| `617c6aa46` | client styles + CT | new `src/styles/_viewport-page.scss` (mixin, 54 lines); new `src/app/shared/viewport-page/viewport-page.recipe.cy.ts` (harness, 5 `it`s) |
| `db31d604b` | client | `reporting-program-band.component.{ts,html,spec.ts}` — `frameLocked`, `scrollHost`, summed scroll source |
| `1c438f120` | client | `programme-results.component.{ts,html,spec.ts}`; new `programme-results.component.scss` (`display: block` + mixin, cascade-safe) |
| `2b7232fff` | client | `dashboard-lab.component.{ts,html,scss}`; new `dashboard-lab.viewport.spec.ts` (host class per `rfrView` + real-template source lock) |
| `2eb814d34` | docs | `dashboard-lab/CLAUDE.md`, `programme-results/CLAUDE.md`, `result-framework-reporting/README.md` §4.2, `result-detail/CLAUDE.md` (staged without a foreign session's uncommitted BHA block) |
| `db9cd75fd` | docs | spec triplet, `proposal.md`, `execution.md`, `visual-reference/` (readings + 7 screenshots) |

Production code ≈ 190 LOC; tests ≈ 460 LOC (CT harness 247 vs ~90 estimated). Shell (`app.component.*`) untouched, as scoped.

## 5. Test Evidence Summary

| Area | Command | Result |
|---|---|---|
| Recipe (real Chromium) | `CT_DEV_SERVER_PORT=8080 npm run test:ct -- --spec src/app/shared/viewport-page/viewport-page.recipe.cy.ts` | 5 passing at 1280×800 (tall + short), 1100×800 (banner off/wrapped), 800×1100, 1440×900, 1600×900; falsifier (`absolute → relative`) 3 red |
| Band | `npx jest … reporting-program-band` | 74 passing (6 new, red-before) |
| Dashboard-lab | `npx jest … dashboard-lab/dashboard-lab` | 214 passing (10 suites; 11 new incl. source lock; falsifier red on removed `[scrollHost]`) |
| Programme-results | `npx jest … programme-results` | 188 passing (3 suites; falsifier red on removed `[scrollHost]`) |
| Lint | `npx ng lint --quiet` | clean after every task |
| Real pages (T-5) | Orca embedded browser, SP01, 4 viewports, banner on | readings in `visual-reference/sav-t5-readings.md`; AC table in `execution.md` |

## 6. Validation Summary

No `validation-report.md`. Validation was the `SAV-T-5` real-browser probe (Reviewer-audited: four arithmetic cross-checks hold, zoom disqualifier honoured) plus the user's D9 visual sign-off. Two forward pointers from earlier reviews were closed by real-browser readings (T-4 `display: flex` cascade; T-1 rail-not-clipped).

## 7. Accepted Warnings Or Follow-Ups

| Item | Decision |
|---|---|
| Reporting toolbar stays pinned inside the band (`SAV-R-2`/`SAV-DD-7`) | **Accepted by the user** at the T-3 tripwire; spec text amended at archive |
| `SAV-R-7`/`SAV-AC-7` "band visible with rail open" | **Inapplicable** (AOW mode has no band, `design.md` §2.2); amended at archive |
| Portfolio `/overview` and `/planned-toc` are locked too (lock keys on `rfrView`) | **Shipped behaviour, amended in `design.md` §6.1** — Leader-recommended; both routes render correctly (empty state for non-members). Open for the user to overrule |
| `SAV-AC-3`/`SAV-AC-8` literal widths under the Orca root zoom | Restated as effective CSS width; kaizen note |
| `dashboard-lab/CLAUDE.md` over the 120-line cap (own content 142) | Facts kept over the cap by Leader decision; remedy (move the foreign BHA section to `reporting-aow-table/CLAUDE.md`) belongs to `changes/reporting-aow-hierarchy` |
| `viewMode() === 'aow'` unreachable from program-shell UI; forced state shows an overlapped layout | Pre-existing legacy surface — follow-up ticket (delete or re-wire) |
| `workArea` JSDoc "null below 900px" is wrong (non-null, contributes `scrollTop 0`) | One-line comment follow-up |
| Band `effect` could wrap `syncBandCollapsed()` in `untracked()` | Micro-optimisation follow-up; NFR holds |
| `programme-results.component.html:21` comment says `canReport` off while binding `true` | Code-comment follow-up |
| Legacy leading-`!` Tailwind important modifier in the band | Compiles; spelling noted in `design.md`/`tasks.md` |
| `result-detail` `:host` → mixin | Optional no-op refactor |
| `.agents/model-routing.md` T1 entry older than the session model | Registry update |

## 8. Historical Notes

- Concurrency: another session (`changes/reporting-aow-hierarchy`) committed in the same checkout during the run (`6fc580586` before start, `4b62f2db2` mid-run) and left uncommitted edits in `dashboard-lab.component.*` and `dashboard-lab/CLAUDE.md`; all diffs and commits of this spec were scoped by explicit paths, and the guide commit staged a blob without the foreign block.
- Sweep at archive time: the foreign commit `ecf47d549` (`[SPEC:changes/by-aow-hierarchy-alignment]`) landed seconds before the archive commit and swept this spec's in-progress wording amendments to `requirements.md`, `design.md` and `tasks.md` (content identical to the archived state; attribution only). The archive commit `7debfdd37` then moved the folder.
- Review catches that mattered: the `styleUrls`-before-inline-`styles` cascade on Results (would have left the table unscrollable, invisible to Jest); CT harness missing the short-content and no-work-area-scrollbar assertions; a mirrored-fragment Jest gate with no falsifier.
- Pending default-branch writes (`docs/ux-ui/design.md` §6 "Viewport-locked page"), kaizen candidates and follow-ups: `execution.md` → "Pending default-branch writes" and the Kaizen entry `docs/specs/kaizen/changes--sp-shell-app-viewport.md`.
- Next: single PR against `staging` (review order: mixin + CT spec → band → the two pages → docs), then re-run the T-5 probe on TEST once deployed.
