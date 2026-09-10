# Archive Summary — Reporting Table Actions Clipped

## 1. Document Control

| Field | Value |
|---|---|
| Module code | `RTA` |
| Original spec path | `docs/specs/bugfix/reporting-table-actions-clipped/` |
| Type | Bug · Depth: Lite |
| Archive date | 2026-09-08 |
| Branch | `qa-development-2026-ss` (spec branch — default is `master`) |
| Final status | **Shipped, then superseded.** Commit `fa5130bf0` 🔧 `fix(reporting-aow-table): pin row action controls so they are reachable without scroll at ≤1350px`. Both tasks `[x]`. **The literal CSS fix no longer exists in the codebase** — a later merge (`85fdfc8c3` into `9b9c032ba`, 2026-09-04, `performance-refactor`'s tabular redesign) replaced the whole row grid this fix was built on. See §7. |

## 2. Requirements Delivered

| ID | Statement | Delivered by |
|---|---|---|
| `RTA-R-1` (tightened by pivot) | Report/Continue, Copy-link, "···" continuously visible **without scrolling**, down to 768px | `RTA-T-1` attempt 3 (sticky, `RTA-DD-2`) |
| `RTA-R-2` | `.pr-hlo-head` stays aligned with rows, including while pinned | `RTA-T-1` attempt 3 |
| `RTA-R-3` | No regression to the flat table's existing scroll | Verified every attempt (untouched selectors) |
| `RTA-R-4` (new mid-spec) | Pinned region stays opaque in default **and** `:hover` state | `RTA-T-1` attempt 1 (backgrounds) + user-confirmed live (automated hover assertion is CSSOM-only, see §4) |
| `RTA-R-10` / `RTA-R-11` | Scroll affordance consistency / left-edge separator | `RTA-T-1` |

Delivered via **two pivots**, both recorded in full in `execution.md`: (1) the regression-test harness (Cypress E2E → Cypress **component** testing, forced by `cypress.env.js` being absent by default in this repo) and (2) the fix's own UX direction (scroll-to-reach → sticky/pinned actions, a user design decision made **after** the scroll version had already earned a Reviewer PASS).

## 3. Files Changed Summary (from `execution.md`, final landed state)

| File | Nature |
|---|---|
| `reporting-aow-table.component.html` | `pr-collapse--rows` modifier class on the HLO-level collapse wrapper |
| `reporting-aow-table.component.scss` | `.pr-collapse--rows > .pr-collapse-inner { overflow-x: auto; overflow-y: hidden }` (axis-split scroller, `RTA-DD-1`); `min-width: 1048px` on `.pr-hlo-head`/`.pr-reporting-row`; `position: sticky` right-anchored pin classes (`.pr-pin-actions`, `.pr-pin-menu`, `.pr-hlo-pin-*`) with hover-aware opaque backgrounds and a left-edge separator (`RTA-DD-2`); a one-line popover re-anchor (`.pr-pin-menu .pr-row-menu { right: 20px; }`) fixing a regression the pinning itself introduced (see §7) |
| `reporting-aow-table.actions-scroll.cy.ts` (new, 391 lines) | Cypress component regression test — geometry-based reachability assertions (`getBoundingClientRect()`, not `be.visible`), RED→GREEN demonstrated twice (once per pivot) |
| `reporting-aow-table/CLAUDE.md` | Re-stamped each attempt; landed with a **stale sha** (see §6) |

No server, data model, or API change — pure client CSS/markup, one presentation component.

## 4. Test Evidence Summary

No separate `test-report.md` — evidence embedded in `execution.md` (654 lines, the largest of this batch).

| Check | Result |
|---|---|
| `npx ng lint --quiet` | clean, every attempt |
| Cypress component suite (final, amended for sticky) | `Tests: 14 · Passing: 13 · Failing: 0 · Pending: 1` (1 deliberate `it.skip` recording a known pre-existing defect, see §7) |
| RED→GREEN (Bug Mode requirement) | demonstrated **twice**: once for the original scroll-to-reach fix, again after the sticky pivot (RED message: an off-canvas control's right edge exceeds the scroller's visible bounds at offset 0) |
| Manual/live checks (human-only, no harness could substitute) | **2**, both user-confirmed in a real browser 2026-09-02: (a) card-collapse open/close animation still smooth; (b) RTA-R-4 hover bleed-through — solid background, no bleed-through at narrow widths |
| **RTA-GAP-CT** (accepted, permanent gap) | The CT harness constrains the component's **container** width, not the browser **viewport** — it does not verify the real page shell + ~280px reporting nav sidebar actually yield a sub-1048px container at a 1350px viewport. Empirically demonstrated during this spec: a literal 1350px CT container measured `clientWidth: 1348px` with **zero overflow** (no sidebar in a CT mount) — proving a literal-pixel test would have been a certified no-op in both RED and GREEN states. Container widths actually used: 1000/820/620px, standing in for the ~1350/1024/768px tiers. Remains an outstanding manual visual check, never covered by any automated run. |

## 5. Validation Summary

No separate `validation-report.md`. **Six Reviewer rounds total** across the two tasks and two pivots — author≠auditor held on every one (Leader T1/opus, Implementer T2/sonnet, Reviewer T3/opus). Breakdown: `RTA-T-1` original scroll fix — FAIL → FAIL → PASS (both FAILs were `COMPONENT-DOCS.md` convention issues, not the CSS fix itself — see §6). `RTA-T-2` original CT suite — PASS on attempt 1. `RTA-T-1` sticky rework (after the 2nd pivot) — attempt 1 blocked (design-level, see §7), attempt 2 FAIL (a real regression the rework introduced — see §7), attempt 3 PASS. `RTA-T-2` amended for sticky — PASS on attempt 1. Zero HALTs; one blocked-attempt that correctly stopped the loop rather than consuming a rework attempt (per Pivot Detection — the blocker was evidence the *design* was unviable, not an implementation slip).

## 6. Accepted Warnings / Follow-Ups

- **Confirmed miss, now moot:** `tasks.md` explicitly flagged before landing that `reporting-aow-table/CLAUDE.md`'s `Verified:` stamp was stale (`36549123f`, reading literally "uncommitted") and **must** be amended to the actual landing commit's sha in the same commit, per `COMPONENT-DOCS.md` §6. Checked directly against the landed commit (`fa5130bf0`): **it was not amended** — the file landed with the stale sha and the word "uncommitted" baked into a committed file. This is now moot because the file's `Verified:` line has since been rewritten entirely by the 2026-09-04 tabular-redesign merge (see §7) — but it is recorded here as a confirmed instance of a warned-about landing obligation being missed, for the Kaizen retrospective.
- **`RTA-OQ-1`** (does the AoW-card header's own summary-stats row also clip at ≤1350px?) — never confirmed, left as a follow-up-if-QA-finds-it. Moot in the same sense as above post-redesign, but was never closed either way during this spec's life.
- **RTA-GAP-CT** — see §4. Permanent, accepted gap by design (the fix is intrinsic to available width, not tied to a literal viewport pixel).
- Cypress in this repo is local-only (no CI wiring) — this regression test is real evidence for a developer running it locally, not a CI gate against a future regression.

## 7. Historical Notes

**A. The fix is superseded — this is expected evolution, not a defect.** `reporting-aow-table/CLAUDE.md` (as of the 2026-09-04 merge of `performance-refactor` `85fdfc8c3` into `9b9c032ba`) states outright: *"RTA-T-1 (sticky pins) — superseded, confirmed on disk after the 2026-09-04 merge. The .scss's own merge note confirms `.pr-pin-actions`/`.pr-pin-menu`/`.pr-hlo-pin-*`, `.pr-collapse--rows` and `min-width: 1048px` were NOT carried over: the tabular redesign (`$pr-reporting-tracks`, no Next pending button, in-card popovers) is what's live. If clipping under ~1000px reappears, re-derive the fix against this grid — do not restore the RTA rules verbatim."* The component was substantially rebuilt by later, unrelated work (evident from the same file's extensive documentation of a new "3-Level Card-in-Card Hierarchy" and `$pr-reporting-tracks` grid). This spec's specific CSS classes are gone; its underlying design decisions (sticky > scroll-to-reach for primary row actions; never touch the pinned `grid-template-columns` track widths) are the durable artifact, not the exact rule set.

**B. Two pivots, both user-driven, neither an agent error.** (1) The regression-test harness was specced as Cypress E2E, which is unviable in this repo by default (`cypress.env.js` is gitignored and absent) — pivoted to Cypress **component** testing before any Implementer was even spawned (caught at the Leader's environment pre-check). (2) After the original scroll-to-reach fix earned a clean Reviewer PASS, the **user** judged it poor UX (every row required a scroll gesture to reach its primary controls) and directed a sticky-pin redesign instead — an unusual case of "nothing was wrong with the code, but the requirement's own preference ordering was available and unused."

**C. The sticky rework (post-pivot-2) surfaced a recurring blind spot, twice.** Attempt 2 fixed the vertical-coverage/background gaps from attempt 1, but its own gutter-absorption trick (`margin-right: -20px`) silently relocated the "···" row-menu popover 20px, because the popover's `position: absolute; right: 0` resolves against the same box the pin styling widened — a real regression the rework itself introduced, caught by the Reviewer, not by any test. Attempt 3's one-line fix was correct, but its explanatory SCSS comment got the *mechanism* wrong (blamed `padding-right` for something only the negative margin actually does) while getting the *value* right — a genuine "right answer, wrong reasoning" defect, left as a non-gating advisory. Both incidents share one shape, named explicitly in `execution.md`'s own root-cause analysis: **a change's paint consequences were reasoned about correctly; its side effects on whatever else resolves geometry against the same box were not.** See the Kaizen entry (`docs/specs/kaizen/bugfix--reporting-table-actions-clipped.md`) for the standardization this produced.

**D. A real, previously-unknown production defect was found and correctly NOT fixed here.** The diagnostic work for finding (C) also proved the row's "···" overflow menu popover is genuinely clipped by the HLO scroller's `overflow-y: hidden` — **in production, independent of this spec, pre-dating even the original scroll fix.** On a single-row CT fixture (worst case) the menu overflowed its clipping scroller by ~118-120px, with only a ~38px sliver actually visible. Filed as a separate follow-up defect (recorded verbatim in `execution.md` §"FOLLOW-UP DEFECT") rather than absorbed into this Lite spec's scope, per *Advisory Never Becomes A Task* — a CSS-only fix isn't available (the clipping ancestor's `overflow-y: hidden` is load-bearing for the card's collapse animation); a real fix needs the popover portaled outside that DOM subtree (CDK Overlay), which is `.ts` work and a separate spec. **Status of that follow-up as of this archive: unknown — not tracked as a separate spec folder, and the component this defect lived in has since been substantially rebuilt (see §A), so it may or may not still apply to the current grid.**

**E. A false-positive test gate was found and fixed within this same spec.** The existing CT suite's `cy.get('[role="menu"]').should('be.visible')` assertion **passed** on a menu that was ~76% clipped by an ancestor's `overflow: hidden` — because Cypress's visibility heuristic checks opacity/display/detachment/basic occlusion, never clip-region containment by an ancestor's `overflow`. `RTA-T-2`'s amendment replaced this class of assertion with `getBoundingClientRect()` geometry comparisons project-wide within this test file. See the Kaizen entry for the standardization this produced.
