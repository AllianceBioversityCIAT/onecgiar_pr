# Tasks — Overview Total Results Progress Bars

Links: `requirements.md` · `design.md` (same folder) · `mockup/preview.html`.

- **Status:** abandoned — implemented, then withdrawn by user before review; see `execution.md`
- **Owner:** santiago.sanchez@cgiar.org

## Pre-flight

- [x] `requirements.md` / `design.md` approved.
- [ ] No conflicting in-flight spec on `bilateral-overview/` — re-check at execution start (the two prior specs on this same card, `overview-replicated-new-badges` and `overview-w1w2-contributor-badge`, are both implemented but uncommitted in the working tree; this task builds on top of their current state, not a clean baseline).

## Task list

### `OTR-T-1` — Restructure Total results card into progress-bar panels [abandoned]

- **Type:** `client`
- **Description:** Add `toBarSegmentPercents(a, b)` pure helper to `bilateral-overview.aggregate.ts` (`OTR-DD-3`): returns `{ aPercent, bPercent }`, both `0` when `a + b === 0`. Restructure the "Total results" card in `bilateral-overview.component.html`: origin-split panel (rounded `bg-white/10` container, W3/Bilateral·W1/W2 text row, 2-segment bar via `toBarSegmentPercents(w3Count, w1w2Count)`, W1/W2 contributing/lead breakdown relocated inside this panel) and role-split panel (same container treatment, Lead·Contributing text row with colored dots, 2-segment bar via `toBarSegmentPercents(leadCount, contributingCount)`). Apply the exact token mapping from `OTR-DD-1` (Lead `--pr-color-yellow-300`, Contributing `--pr-color-blue-500`, W1/W2 segment `--pr-color-primary-200`, W3 segment/track white/black opacity — NO other colors). Bar tracks get `aria-hidden="true"` (`OTR-DD-5`). Keep the replicated/new badges and the card's `<a>`/`aria-label` wrapper exactly as they are today, extending the `aria-label` only if a figure's wording needs updating to match the new layout — never removing a figure. Update `bilateral-overview/CLAUDE.md` in the same commit.
- **Implements:** `OTR-R-1`, `OTR-R-2`, `OTR-R-3`, `OTR-R-4`, `OTR-R-5`, `OTR-R-6`, `OTR-R-7`, `OTR-AC-1`, `OTR-AC-2`, `OTR-AC-3`, `OTR-AC-4`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md`
- **Depends on:** — (single task)
- **Skills:** `angular-developer` (component/template patterns), `tailwind-design-system` (token-driven utility usage — no raw hex)
- **Estimate:** `M`
- **Verification:**
  - **Falsifier:** fixture `w3Count=135, w1w2Count=77` (`count=212`) → `toBarSegmentPercents(135, 77)` returns `{ aPercent: ≈63.68, bPercent: ≈36.32 }` (within 0.5 rounding tolerance), summing to 100. A second fixture `leadCount=130, contributingCount=82` → `{ aPercent: ≈61.32, bPercent: ≈38.68 }`. A third fixture `a=0, b=0` → `{ aPercent: 0, bPercent: 0 }` (no `NaN`, no thrown error). If any of these three is wrong, the task is wrong.
  - **Red run:** `npx jest --testPathPattern="bilateral-overview.aggregate.spec|bilateral-overview.component.spec" --silent --reporters=summary --no-coverage` (from `onecgiar-pr-client/`) — new assertions must fail before the change (helper/markup don't exist yet), pass after.
  - **Disqualifier:** if the Implementer finds that computing widths purely from already-existing counts is insufficient — e.g. some other field is needed that doesn't already exist on `OverviewTotalResultsKpi` — STOP and escalate; this task's whole premise (`OTR-DD-3`) is that no new business figure is needed, and a genuine need for one is a design-invalidating discovery, not a task-level judgment call.
  - **Token-literal check (no automated gate — manual, per `design.md` §6):** Reviewer MUST grep the diff for `#[0-9a-f]{3,6}` and `rgb(` in the touched `.html` and FAIL the task if either appears outside an existing `var(--pr-*)` reference. This check has no green/red command — its no-pass condition is: any hex/rgb literal found = FAIL, zero found = this check passes (other checks still apply).
  - **Consumers:** `toBarSegmentPercents` is a new export with no existing callers to break. `OverviewTotalResultsKpi`'s existing fields are read-only in this task — re-grep them at implementation time to confirm no new consumer appeared since `BOV2-T-1` that this restructuring could break.
- **Definition of done:**
  - [ ] Lint clean: `npx ng lint --quiet`.
  - [ ] Unit tests added/updated per Verification; scoped run green.
  - [ ] No raw hex/rgb color literal in the diff (Reviewer-verified, not a command).
  - [ ] `bilateral-overview/CLAUDE.md` updated + `Verified:` re-stamped, ≤120 lines (learn from `BOV2-T-1`'s 2 rework rounds on this exact constraint — check line count and factual accuracy together, not sequentially).
  - [ ] `aria-label` still contains every figure it contained before this task (`OTR-R-6`) — diff the old vs new `aria-label` string construction line by line, don't just eyeball it.
  - [ ] **Not expected to be done by the Implementer — recorded as accepted risk, per `requirements.md`'s defect-class table:** manual browser check of the real 5-card deck at the 4 Cypress-tracked widths (1280×720, 1280×1000, 900×800, 375×800), and visual-parity comparison against `mockup/preview.html`. Both require a running client + real browser; flag as "Not Done" in the Implementer's report exactly like the prior two specs on this card.

## Dependency graph

```
OTR-T-1  (single task, no dependencies)
```
