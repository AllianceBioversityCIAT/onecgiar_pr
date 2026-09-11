# Archive Summary — Split the AoW row's two gestures

**Outcome:** shipped complete, 4/4 tasks, Reviewer PASS on every one. An AoW row now filters the page instead of navigating, and the row went from an unreachable `<div>` to a real keyboard control.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/aow-row-gesture-split` |
| Archive Date | 2026-09-03 |
| Final Status | **Complete** — 4/4 tasks `[x]`, each on a Reviewer PASS |
| Type | Change · Depth Standard · Approval Mode `gated` → `pre-approved` from `RGS-T-3` |
| Branch | `qa-development-2026` (spec branch — shared-file syncs recorded as pending, not written) |

## 2. Requirements Delivered

| ID | Behaviour | Status |
|---|---|---|
| `RGS-R-1` | Row body selects the scope | ✅ |
| `RGS-R-2` | `Report` / `→` navigate only | ✅ |
| `RGS-R-3` | Row is a real keyboard control | ✅ |
| `RGS-R-4` | Visible + programmatic selected state | ✅ (5.01:1 / 5.78:1, measured) |
| `RGS-R-5` | No ladder change, no overflow introduced | ✅ (ladder byte-identical to base) |
| `RGS-R-6` | Both row sites consistent | ✅ |
| `RGS-R-7` | Section is collapsible | ✅ |
| `RGS-R-8` | Collapsed content unreachable | ✅ (8 real Tab presses, 0/8 entered) |

`RGS-AC-5`'s **second clause was retired**, not delivered — it asserted a property §3 and `RGS-DD-3` explicitly placed out of scope. See §6.

## 3. Files Changed

| Commit | Scope |
|---|---|
| `4537bd3ba` | `RGS-T-1` — code+name becomes a native `<button>`, both row sites |
| `66c6e3b50` | `RGS-T-2` — gesture split + selected state; three row-click tests re-pointed |
| `167cd2244` | gate decisions; `D8` added to `RGS-T-4` |
| `f384278e6` | `RGS-T-3` — collapsible section with `inert`; `.pr-collapse` moved to `src/styles/collapse.scss` |
| `a7baff1ec` | `RGS-AC-5` clause retired; starvation defect carried out |
| `a07a5435a` | `RGS-T-4` — browser verification pass |

~640 insertions across `program-overview.component.{html,ts}`, four spec files, `reporting-aow-table.component.scss`, `angular.json`, and the new `src/styles/collapse.scss`.

## 4. Test Evidence

**No `test-report.md` — absence explicitly accepted.** `/akili-test` was never run as a separate phase because each task authored its own tests inside its own Reviewer gate: **221 → 235 specs** in `program-overview`, plus a dedicated browser verification task (`RGS-T-4`) whose recorded measurements serve as the validation evidence a `validation-report.md` would carry.

| Gate | Result |
|---|---|
| `npx jest …/components/program-overview` | 221/221 at close of `RGS-T-3` |
| `npx jest …/dashboard-lab` | 749/749 |
| `npx ng lint --quiet` | clean |
| `npm run build:dev` | clean (exit 0) |

## 5. Validation Summary

**No `validation-report.md` — absence explicitly accepted;** `RGS-T-4` performed the equivalent against a real Science Program (SP04), measuring the six classes jsdom cannot evaluate:

| Gate | Result |
|---|---|
| D5 focus ring | ✅ `rgba(107,70,229,0.28) 0 0 0 3px` under real `:focus-visible` |
| D4 selected contrast | ✅ 5.01:1 vs row fill, 5.78:1 vs card |
| D7 collapsed unreachable | ✅ 8 real Tab presses, 0/8 entered; order restored on expand |
| D8 resting affordance | 📋 1.15:1 recorded (never a gate) |
| `AC-6` Enter/Space | ✅ both keys, 4/4 presses |
| ⓘ popover clip | ✅ 340×110 at 1600 and 1100 |
| D6 layout | ❌ **FAIL at 1280/1100/900 — pre-existing, carried out** |

## 6. Accepted Warnings & Follow-Ups

1. **`changes/aow-identity-column-starvation`** — proposal written. The AoW identity column collapses to ~0px at 1280/1100/900; code and name disappear with **no horizontal overflow**, so every prior overflow-shaped gate reported clean. Proven pre-existing by five experiments plus the decisive structural fact that the track is `minmax(0,1fr)` in all three ladder branches — its floor is pinned at 0, so no descendant's content can lift it.
2. **`RGS-AC-5` second clause retired** — an AC cannot require a fix the same document forbids (§3 + `RGS-DD-3`). Retired with the contradiction recorded, not quietly dropped.
3. **`reporting-aow-table`'s own collapse** still leaves ~20 focusable buttons tabbable while collapsed and `aria-hidden`. Same fix (`inert`), different file — for the default-branch apply pass.
4. **Concurrency violation** — a second session wrote to this checkout mid-run, costing the full-directory test signal and forcing path-scoped verification. Root `CLAUDE.md` requires one AKILI session per checkout.

## 7. Historical Notes

**The gate blindness this spec's §9 predicted, happened.** jest (221 specs), `ng lint` and `ng build` were **all green** while a layout defect was live at three of five widths. Only the browser pass saw it.

**Four defects were caught by `author ≠ auditor`, and all four would have shipped:**

| Task | Defect |
|---|---|
| `RGS-T-1` | `[attr.aria-label]` replacing the button's content, silently dropping "N KPIs remaining" from the accessible name — **a WCAG 2.5.3 regression introduced by the accessibility task itself** |
| `RGS-T-1` | A pre-existing ladder assertion dropped in a tautology fold **the Leader relayed unexamined** |
| `RGS-T-3` | Violet `--pr-surface-band` on a content surface — two tinted surfaces in one card, breaking a hard UI rule |
| `RGS-T-3` | Component guide pushed past its 120-line hard cap |

The owner was offered removal of that gate for speed at the mode switch and declined.

**The Reviewer also audited the Leader.** Asked to check the Leader's own D6 attribution, it found a genuine hole — `RGS-T-1` *had* added a clipping ancestor the first three experiments would not have caught — prompting a fourth and fifth experiment. The conclusion held but had been resting on incomplete evidence. In the reverse direction, the Reviewer's own follow-on hypothesis was tested and **rejected on measurement**, and in taking that measurement the Leader first targeted the wrong element and got a clean-looking false negative. Both are recorded in `execution.md` rather than smoothed away.

**Budget: ~640 LOC against ~230 (278%).** `RGS-T-2` and `RGS-T-4` passed first time, so the overrun is **sizing, not churn** — scope grew twice before any code was written (the `<div>` discovery at specify, the collapsible section at the design gate) and `design.md` §8 was never re-baselined after the second.
