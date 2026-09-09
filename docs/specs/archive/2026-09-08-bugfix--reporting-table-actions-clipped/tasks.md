# Tasks — Reporting Table Actions Clipped (Bug, Lite)

## 1. Scope of this task list

- **Module / feature:** `bugfix/reporting-table-actions-clipped` (client-only)
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** —
- **Status:** **all tasks complete (2026-09-02).** `RTA-T-1` `[x]` — sticky actions, Reviewer-PASSed attempt 3/3, both human-eye checks confirmed by the user. `RTA-T-2` `[x]` — amended CT suite Reviewer-PASSed, 13 passing / 0 failing / 1 deliberate skip, RED→GREEN confirmed. **Not committed** — the user is landing this alongside an unrelated Tawk.to change on `performance-refactor`; the `CLAUDE.md` sha stamp must be amended at that commit. Spec status moves to `shipped` only once merged and verified on staging (§7).

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Continue selected)
- [x] `design.md` approved (Continue selected)
- [x] Open questions resolved or explicitly deferred (RTA-OQ-1 deferred, out of scope)
- [x] No CLARISA dependency (n/a)
- [x] No conflicting in-flight spec touching `reporting-aow-table/` found
- [ ] `npm run migration:check` — n/a, no migration in this fix

## 3. Task list

### `[x]` `RTA-T-1` — Pin the row action cells (sticky) over the HLO-level row scroller

> **COMPLETE 2026-09-02.** Sticky implementation Reviewer-PASSed on attempt 3 of 3; the ≤1350px
> "visible without scrolling" behaviour discharged by `RTA-T-2`'s amended suite; and the final two
> items — the **card-collapse animation smoke check** and the **RTA-R-4 hover bleed-through check** —
> ✅ **confirmed by the user in a real browser**. Those two were never coverable by any harness in
> this repo, which is exactly why they were held open rather than assumed.
>
> ⚠️ **One landing item remains, owned by the user:** the code is **not committed**. See the
> Definition of done's first box — and the `CLAUDE.md` sha obligation it carries.
>
> *Historical note — REOPENED 2026-09-01 by a user-directed design pivot (`RTA-DD-2`), after the
> original `RTA-DD-1` scroll-to-reach implementation had already passed review.*
> The `RTA-DD-1` scroll implementation reached a Reviewer PASS (attempt 3 of 3) and `RTA-T-2`'s CT
> evidence closed its two reachability/no-regression browser checks. The user then judged
> scroll-to-reach-actions to be poor UX and directed a **sticky-actions** design instead. The
> `RTA-DD-1` scroller and `min-width: 1048px` floor are **retained**; what changes is that the two
> rightmost cells stop scrolling. Full rationale: `execution.md` → Pivot Record: `RTA-T-1` (second pivot).
>
> **Two items were already closed and are NOT reopened by this pivot** — but both must be
> **re-confirmed** against the sticky implementation, since the CT suite that produced them is
> itself being amended: the ≤1350px reachability evidence and the >1440px no-regression evidence.
>
> ~~Still owed regardless of this pivot: the card-collapse animation manual smoke check.~~
> ✅ **Closed 2026-09-02** — confirmed by the user in a real browser. Recorded here to show the pivot
> did not absorb it: it stayed open across the pivot and was discharged on its own evidence.

- **Type:** `client`
- **Description:** Apply `RTA-DD-2` on top of the retained `RTA-DD-1` scroller. Keep the `pr-collapse--rows` modifier, the `.pr-collapse--rows > .pr-collapse-inner { overflow-x: auto; overflow-y: hidden; }` rule, and `min-width: 1048px` on `.pr-reporting-row` / `.pr-hlo-head`. **Add:** a class on the row's track-7 (action) and track-8 ("···") cells and on the matching `.pr-hlo-head` cells, made `position: sticky` with right-anchored offsets, opaque hover-aware backgrounds (RTA-R-4), and a left-edge `box-shadow` separator on the leftmost pinned cell (RTA-R-11). No changes to the existing fixed `grid-template-columns` track list. Follow the *Implementation contract* under `RTA-DD-2` in `design.md` §12 — including its item 5, **re-verify the `.pr-row-menu` popover is not clipped** by the sticky/overflow combination.
- **Implements:** RTA-R-1 (tightened), RTA-R-2, RTA-R-3, RTA-R-4, RTA-R-11; RTA-AC-1, RTA-AC-2, RTA-AC-3, RTA-AC-4
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html` (add class to the HLO-level `<div class="pr-collapse" ...>` wrapper, ~line 671)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss` (new rule near `.pr-collapse`/`.pr-collapse--card`, ~line 37; `min-width` additions to `.pr-hlo-head` ~line 50 and `.pr-reporting-row` ~line 69)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` (re-stamp `Verified:` line + one-line note on the new scroll behavior, per `docs/COMPONENT-DOCS.md`)
- **Depends on:** —
- **Blocks:** `RTA-T-2`
- **Estimate:** S (≤0.5d)
- **Definition of done:**
  - [x] Code committed via project commit convention — **`fa5130bf0`** *(committed by the user at session level, not by this agent)*: `[SPEC:bugfix/reporting-table-actions-clipped] 🔧 fix(reporting-aow-table): pin row action controls so they are reachable without scroll at ≤1350px`. Carries the 4 client files + the 5 spec documents.
  - [ ] ⚠️ **OPEN — `CLAUDE.md` sha stamp is STALE in the landed commit.** `reporting-aow-table/CLAUDE.md` still reads `**Verified:** … 36549123f (RTA-T-1 sticky pivot + rework, uncommitted)`, but the landing commit is **`fa5130bf0`**. Two consequences: the `COMPONENT-DOCS.md` §5 staleness check (`git log -1 --format=%h -- <folder>`) now returns `fa5130bf0` ≠ the stamped sha, so the doc reads as **unverified**; and a committed file literally says "uncommitted". §6 requires the stamp to name its own landing commit. **Fix:** replace that line with `**Verified:** 2026-09-02 · branch qa-development-2026-ss · fa5130bf0` — a **swap, not an append** (the file is at the §4 120-line cap). Land it by amending `fa5130bf0` or in the next commit of this work.
  - [x] Lint clean: `npx ng lint --quiet` (client) — `All files pass linting.` (all 3 attempts).
  - [x] Manual browser check at 1920px/1440px — **discharged by the attempt-3 rect probe**: at a 1500px container (nothing stuck, no scrollbar — the RTA-AC-3 state) the popover's right edge coincides exactly with production placement (`diff = 0`), and the Reviewer confirmed the pinned cells are indistinguishable from ordinary cells at wide widths. RTA-AC-3 and the §7 regression NFR discharged. Viewport-level claim still inherits RTA-GAP-CT's caveat.
  - [x] Behaviour at 1350px/1024px/768px under the AMENDED requirement — **discharged by `RTA-T-2`'s amended suite** (2026-09-02): at container widths standing in for all three tiers, the "···", Report/Continue and Copy-link are proven **geometrically** within the scroller's visible x-bounds at `scrollLeft === 0` with no scrolling, are `click()`ed, and remain within bounds after the data columns scroll. Observed **RED** without the sticky block (`expected 1027 to be at most 1000` — approximate, see the evidence-hygiene advisory in `execution.md`). Container-width caveat per RTA-GAP-CT.
  - [x] **RTA-R-4 bleed-through check** — ✅ **confirmed by the user in a real browser at narrow widths, 2026-09-02: solid background, no bleed-through.** This closes the gap `design.md` §10 gap 1b declared. Automated evidence supports but could not close it: the attempt-2 empty-cell probe showed pinned cell heights matching the grid track (62.28 vs 63.28 — the 1px is the row's own `border-top`, which grid items never paint into), `pinMenu.left ≈ pinActions.right` (no 16px gap) and `pinMenu.right ≈ scroller edge` (no 20px gap); and the amended suite asserts non-transparent backgrounds — but its `:hover` half is CSSOM *rule* inspection, not a real browser hover, so the hover state had no real-interaction evidence until this human check.
  - [x] **Card-level collapse (AoW card open/close) animation still works smoothly** — ✅ **confirmed by the user in a real browser, 2026-09-02.** No harness covers this (the CT specs mount with `expandAll: true`, so the 280ms transition never plays); `overflow-y: hidden` was verified statically across three Reviewer rounds, but "works smoothly" is an observation only a human eye supplies. Confirms `pr-collapse--card`'s path survived the sticky pivot untouched.
  - [x] `reporting-aow-table/CLAUDE.md` `Verified:` line re-stamped — now `2026-09-01 · branch qa-development-2026-ss · 36549123f`. ⚠️ **Must be amended to the fix commit's own sha at commit time** (`COMPONENT-DOCS.md` §6), or the doc ships self-flagged as stale.
  - [x] No secret/token touched (n/a — pure CSS/markup, but checklist kept for consistency).

### `[x]` `RTA-T-2` — Add Cypress **component** regression test for row-action reachability at constrained widths

> **COMPLETE 2026-09-02** — amended for sticky and Reviewer-PASSed. `Tests: 14 · Passing: 13 ·
> Failing: 0 · Pending: 1`, with a genuine RED→GREEN cycle against a non-sticky build. `be.visible`
> is banned as the reachability gate (it had passed a ~76%-clipped element earlier in this run) and
> replaced by `getBoundingClientRect()` geometry. The 1 pending is the deliberate `it.skip` recording
> the pre-existing popover-clipping defect, so the known bug is visible in the suite rather than
> silently absent. See `execution.md` → `RTA-T-2` (amended for sticky) — note especially what
> RTA-R-4's `:hover` half does **not** prove.
>
> *Historical note — REOPENED 2026-09-01 by the `RTA-DD-2` pivot.* The spec reached `[x]` with a Reviewer PASS and a
> sound RED→GREEN cycle, and the file remains on disk — but its assertion #2 tests
> **scroll-then-reveal**, which the amended RTA-R-1 no longer endorses as the primary path. Assertion
> #2 must invert to *visible at scroll offset 0, still visible after scrolling*; a new assertion #5
> covers RTA-R-4 (non-transparent pinned backgrounds, default + hover); assertions #1, #3 and #4
> survive (#4 gains a pinned-offset check). A fresh RED→GREEN cycle against the sticky
> implementation is required.
>
> **Leader scope judgement:** in-scope amendment to this same task — same file, same harness, same
> stated purpose; only the definition of *reachable* changed, which is exactly what the requirement
> amendment did. Flagged to the user rather than absorbed silently.

> **Harness amended 2026-09-01** (user-approved pivot; full rationale in `execution.md` → Pivot Record: `RTA-T-2`). This task originally specified a Cypress **E2E** spec at `cypress/e2e/reporting-aow-table-actions-scroll.cy.ts`. That is unviable by default here: `cypress.env.js` is gitignored and absent, so `cypress.config.js` sets `hasCredentials: false` / `hasToken: false` and specs skip rather than assert — and a skip is not evidence. Replaced by a Cypress **component** spec, which needs no credentials, no backend and no seed data, and is a proven path in this repo (47 existing `src/**/*.cy.ts` specs).

- **Type:** `tests`
- **Description:** Add a Cypress **component** spec that reproduces the bug (RED against the pre-fix CSS, GREEN after `RTA-T-1`) by mounting `reporting-aow-table` with fixture rows inside a **width-constrained container** at widths standing in for 1350px, 1024px and 768px, and asserting the "···" button is reachable — first that the HLO scroller (`.pr-collapse--rows > .pr-collapse-inner`) has `scrollWidth > clientWidth`, then that scrolling makes `[aria-label="More actions"]` visible and clickable, and that its click opens the row menu (`role="menu"`). Also asserts the wide-container negative case (≥1440px → `scrollWidth === clientWidth`, no scrollbar) for RTA-AC-3, and that `.pr-hlo-head` and `.pr-reporting-row` share one scroll container for RTA-R-2. Must be confirmed RED against the pre-fix CSS to satisfy the Bug Mode regression-test requirement.
- **Implements:** RTA-R-1 (regression proof, tightened wording), RTA-R-2 (alignment under sticky), RTA-R-4 (bleed-through, weakly); RTA-AC-1, RTA-AC-3, RTA-AC-4
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.actions-scroll.cy.ts` (new — colocated, per the repo's CT `specPattern: 'src/**/*.cy.ts'`)
- **Depends on:** `RTA-T-1` (test asserts the fixed/GREEN state as its committed form; the RED run is a one-time verification step before committing, not a separate persisted artifact)
- **Blocks:** —
- **Estimate:** S (≤0.5d)
- **Definition of done:**
  - [x] Spec colocated under `src/**/*.cy.ts` per the project's CT spec pattern and the `.contract.cy.ts` sibling convention.
  - [x] Verification: `npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.actions-scroll.cy.ts"` passes locally, in a real browser, at all three constrained container widths — **1000 / 820 / 620px, standing in for the ~1350 / ~1024 / ~768px viewport tiers** (they are container widths, not viewport widths: see RTA-GAP-CT) — plus the ≥1440px negative case. → **`Tests: 14 · Passing: 13 · Failing: 0 · Pending: 1`** against the sticky implementation (the 1 pending is the deliberate `it.skip`).
  - [x] **RED confirmed pre-fix** — a fresh cycle was run against the **sticky** implementation, not inherited from `RTA-DD-1`: with the `RTA-DD-2` sticky block commented out (the `RTA-DD-1` scroller and both `min-width: 1048px` kept), assertion #2 failed at offset 0 with a geometry-specific message (`"More actions" button (offset 0): right edge must lie within the scroller's visible x-bounds` — the quoted numbers are approximate, see the evidence-hygiene advisory in `execution.md`). SCSS restored and verified byte-identical; the Reviewer independently reconciled the RED test arithmetic against the file.
  - [x] **No-pass clause:** if the test cannot reliably distinguish "button has zero bounding box" from "button is merely scrolled out of the current scroll offset" (e.g. a false RED because the test didn't wait for the collapse-open animation to finish), the test is not evidence — fix the wait condition (assert on `[attr.aria-hidden]="false"` / `.is-open` class settling) before treating a run as conclusive.
  - [x] **Explicit gap recorded (RTA-GAP-CT)** — documented in the spec file's `⚠️` header block and in every test title; **still owed in the PR description**: the CT harness constrains the component's **container**, not the browser **viewport**, and never instantiates the page shell or the ~280px sidebar — so it does NOT verify that the real shell yields a sub-1048px container at a 1350px viewport. Note this in the PR description as an outstanding **manual visual check**, alongside the fact that Cypress here is local-only (no GitHub Actions workflow, per `onecgiar-pr-client/CLAUDE.md` §9) so CI green does not cover this regression.
  - [x] Does NOT assert pixel-perfect alignment between `.pr-hlo-head` and the scrolled rows (out of scope per `design.md` §10 — a human visual check at PR review substitutes for this narrower claim). Confirmed: only `offsetParent` identity is asserted.
  - [x] Lint clean: `npx ng lint --quiet` → `All files pass linting.`

## 4. Dependency graph

```
RTA-T-1 (fix: template + scss + CLAUDE.md)
   └── RTA-T-2 (Cypress COMPONENT regression test, verified RED pre-fix / GREEN post-fix)
```

No parallel branches — this is a two-task, strictly sequential Lite bug fix.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| RTA-TEST-1 | Cypress **component** test (client, local-only) | RTA-R-1, RTA-R-2, RTA-R-4 (weakly), RTA-AC-1, RTA-AC-3, RTA-AC-4 | `…/reporting-aow-table/reporting-aow-table.actions-scroll.cy.ts` |
| RTA-TEST-4 | Manual visual check (**RTA-R-4**) | Bleed-through under the pinned actions, default + `:hover` — computed-style assertions cannot prove this (`design.md` §10 gap 1b) | Manual, at PR review |
| RTA-TEST-2 | Manual browser check | RTA-AC-3 (no regression above 1350px) + card-collapse animation smoke | Definition of done, `RTA-T-1` |
| RTA-TEST-3 | Manual visual check (**RTA-GAP-CT**) | The real shell + ~280px sidebar actually yield a sub-1048px container at 1350/1024/768px viewport — **not covered by RTA-TEST-1** | Manual, at PR review |

No server-side or Jest coverage impact — this fix touches no `.ts` logic, only template/SCSS. Existing client coverage thresholds (50/60/60/60) are unaffected.

## 6. Rollout & verification

- [ ] PR opened with commit convention (`🔧 fix(reporting-aow-table) [ticket]: <description>`).
- [ ] CI green (lint, existing Jest suite, build). The Cypress **component** run is **manual**, attached as evidence in the PR description (screenshots or terminal output of `npx cypress run --component --spec …`), since it is not CI-wired. The PR must also name RTA-GAP-CT as an outstanding manual visual check.
- [ ] Manual QA on staging/test env: resize the browser (or use devtools responsive mode) to 1350px, 1024px, 768px on the Reporting tab and confirm row actions are reachable.
- [ ] No bilateral/platform-report payload touched — no change-log entry needed.
- [ ] No admin/role/phase change — no runbook update needed.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified on staging.
- [ ] File a follow-up ticket if QA confirms RTA-OQ-1 (AoW-card header row also clipping) — not built here.
- [ ] No `docs/prd.md` Open Questions affected.

## 8. Roll-back plan

1. Revert the single PR for `RTA-T-1` + `RTA-T-2`.
2. No migration to revert (n/a).
3. No feature flag introduced (n/a — the fix is unconditional CSS).
4. No bilateral/platform-report payload to verify (n/a).
5. No downstream consumers to notify (client-only, single-component change).

## Required cross-references

- `docs/specs/bugfix/reporting-table-actions-clipped/requirements.md` and `design.md` (same folder).
- `onecgiar-pr-client/CLAUDE.md` §9 (Cypress local-only status), §5 (Tailwind-first / SCSS-when-necessary).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/CLAUDE.md` (to be re-stamped by `RTA-T-1`).
