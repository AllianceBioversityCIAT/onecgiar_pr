# Archive Summary — One visible way to clear the Overview's filters

**Outcome:** shipped. One control, one task, Reviewer PASS first attempt, 17 new tests green. Two defect classes (focus-ring paint, narrow-width layout) have no automated gate and were **not measured** — carried as an accepted risk, not closed.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/clear-filters/` · Prefix `CF` |
| Archive Date | 2026-09-03 |
| Archived from branch | `qa-development-2026` (default pin `master`) |
| Depth / Approval Mode | Lite · `pre-approved` |
| Escalated from | `/akili-quick` (failed the triviality gate — behaviour change) |
| Final Status | **Complete with accepted risk** — 1/1 tasks `[x]`; no `test-report.md`, no `validation-report.md` (Lite depth; evidence lives in `execution.md`) |

## 2. Requirements Delivered

| ID | Behaviour | Delivered by | Evidence |
|---|---|---|---|
| `CF-R-1` | One activation resets both axes (section → `'all'`, scope → `null`) | `clearFilters()` — direct `activeSection.set('all')` + `scopeChange.emit(null)` | jest, spy-locked; Reviewer DoD #2/#3 |
| `CF-R-2` | Present only while at least one axis is filtered | `showClearFilters` computed gating `@if` (removed from DOM) | jest, four-state predicate + "not in button list" |
| `CF-R-3` | Native `<button>`, Enter/Space, visible focus, accessible name | `focus-visible:shadow-[var(--pr-focus-ring)]`; negative assertions on `ring-[…]`/`ring-2` | jest (class contract) · **paint unmeasured** (D4) |
| `CF-R-4` | No overflow at 1600/1280/1100/900/768 | No fixed width, no new track (`CF-DD-4`) | Measured at **1653 only**, `scrollWidth === clientWidth` · **four widths unmeasured** (D5) |
| `CF-AC-4` | Focus never falls to `<body>` on self-removal | `allSectionsTabRef` viewChild + synchronous `.focus()` (`CF-DD-5`) | jest, `document.activeElement` asserted |

Owner decisions `OQ-1`…`OQ-5` honoured: shown-when-active, coexists with "All Sections", no re-click behaviour changed, label "Clear filters", no `aria-live`.

## 3. Files Changed

| File | Δ | What |
|---|---|---|
| `…/components/program-overview/program-overview.component.html` | +19 | The control, under `@if (showClearFilters())`, with a `[class.ml-auto]` that is the negation of the `Show all sections` predicate |
| `…/components/program-overview/program-overview.component.ts` | +38 | `showClearFilters` computed, `allSectionsTabRef` viewChild, `clearFilters()` |
| `…/components/program-overview/program-overview.scope.spec.ts` | +200 | 17 specs: four visibility states, both resets, direct-set lock, keyboard, focus destination, class contract incl. negatives |

**+257 / −0**, three files, host untouched, no new imports. Commits: `45c6a12af` (spec) · `477fa4054` (code, pending audit) · `38cd9c6ff` (PASS + browser check).

## 4. Test Evidence

| Gate | Result |
|---|---|
| `npx jest …/components/program-overview` | **235/235** (221 → 235, +17 new, −3 consolidated) |
| `npx ng lint --quiet` | clean |
| `build:dev` | deliberately not run (targeted fast mode; template-only change) |
| Reviewer (`akili-reviewer`, Opus T3) | **PASS**, attempt 1, nine DoD items verified individually, no disqualifier triggered |

## 5. Validation

No `/akili-validate` run (Lite). The closing browser check (`tasks.md` §4) ran on the live app at `…/SP04/overview?scope=AOW01`:

| Check | Result |
|---|---|
| Control live in DOM with a scope active; `Show all sections` correctly absent | ✅ confirmed |
| D4 — focus ring paints under real `:focus-visible` | **INCONCLUSIVE** — programmatic focus never satisfied `:focus-visible`; keypress did not move focus in the driven tab |
| D5 — `scrollWidth === clientWidth` at five widths, fresh load each | **INCONCLUSIVE** — viewport pinned at 1653 (`orca viewport` accepted but ineffective); one width measured, four not |

Both are recorded as an **accepted risk** under the spec's own rule (`requirements.md` §8: *"if that check cannot be performed, record it as an accepted risk rather than closing on jest alone"*). Five identical readings from the first failed sweep were discarded, not reported.

## 6. Accepted Warnings & Follow-Ups

| # | Item | Owner / where it should go |
|---|---|---|
| F1 | **D4 paint on the Clear button** under real keyboard focus | Next browser pass on this component (any spec touching `program-overview`) — or a human 30-second check |
| F2 | **D4 paint on the "All Sections" tab after an Enter-driven clear.** The tab carries `focus-visible:outline-none` with no ring replacement (`html:205`) — the focus hand-off lands on an element that paints nothing. `CF-AC-4` met literally, its purpose half-delivered. Pre-existing, out of scope. | Candidate `/akili-quick` or fold into `changes/aow-identity-column-starvation` |
| F3 | **D5 at 1280 / 1100 / 900 / 768** — never measured; the widths where the AoW identity column already starves | Same sweep as `changes/aow-identity-column-starvation`, which must visit those widths anyway |
| F4 | **Ordering below 900px** — new button has no `order-*`, joins the tabs line before `Show all sections` (`max-[899px]:order-2`) | Eyeball during F3 |
| F5 | **`Show all sections` is now a subset control** — identical predicate and identical effect to Clear filters in the section-only state (3 of 4 states redundant); also has **no `focus-visible` class**. Cheapest fix: retire it. `OQ-2` was settled without knowing it existed. | Owner decision; candidate `/akili-quick` |
| F6 | The two axes still disagree on re-click (sections toggle, scope does not — `RGS-DD-6`) and the bar carries three vocabularies ("All Sections", "All scopes", "Clear filters") | Recorded in `requirements.md` §7; separate decision |
| F7 | `components/program-overview/CLAUDE.md` not re-stamped in the same commit (convention miss) | `guide-sync` pending item in the kaizen entry |

## 7. Historical Notes

- **The spec's own evidence contained a false claim.** `proposal.md` §3 / `requirements.md` §2 said "no clear/reset button — zero matches"; the sweep pattern used `all scopes`, not bare `all`, and missed the pre-existing `Show all sections`. Found by the Leader mid-execution, adjudicated by the Reviewer as invalidating no requirement, corrected in place at archive with a dated note. Lesson `KZ-changes--clear-filters-1`.
- **Reviewer spawn failed three times** (`Timed out waiting for the Orca runtime to respond`) while the runtime reported healthy. The Leader did **not** review inline (`author ≠ auditor`), committed the code as *pending audit*, and withheld the checkbox until the fourth spawn succeeded. No rework round consumed.
- **Budget:** estimated ~140 LOC (35 prod / 105 test), actual 257 (57 / 200) — **184%**, again almost entirely test volume, even though the estimate was sized from `KZ-RGS-3`'s ratio rule. Recurrence recorded as a `digest-update`.
- Depends on `changes/aow-row-gesture-split` (archived 2026-09-03). Not parallel-safe with `changes/progress-by-aow-w3` and `changes/w12-category-card-scope` — both still target the same template and should rebase on `477fa4054`+.
