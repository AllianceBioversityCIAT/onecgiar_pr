# Tasks — One visible way to clear the Overview's filters

**1 task · ~140 LOC · one PR.** Two of the six defect classes have no automated gate and close at the HITL browser check, not in jest.

## 1. Scope & Metadata

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` · Prefix `CF` |
| Depth | Lite · **Approval Mode:** `pre-approved` |
| Files | `program-overview.component.{html,ts}` · `program-overview.scope.spec.ts` |
| Parallel-safe | **no** — `changes/progress-by-aow-w3` and `changes/w12-category-card-scope` touch the same markup |

## 2. Pre-Flight

- [x] `proposal.md`, `requirements.md`, `design.md` written; `OQ-1`…`OQ-5` settled by the owner
- [x] Clearing contract verified as already existing: `scopeChange` is `string | null`, host binds `overviewScope.set($event)`, `null` reaches `scope: overviewScopeParam ?? null`
- [ ] **A runnable app** for the closing browser check (D4/D5) — available today at `…/entity-details/SP04/overview`

## 3. Task List

### `CF-T-1` — Add the Clear filters control [ ]

- **Type:** `client` · **Size:** `S` · **Depends on:** — · **Blocks:** —
- **Implements:** `CF-R-1`…`CF-R-4`, `CF-AC-1`…`CF-AC-5` · **Design ref:** `CF-DD-1`…`CF-DD-5`
- **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `medium`
- **Scope:** one `<button>` in the filter bar of `program-overview.component.html`, a `computed()` visibility predicate, and one handler that resets both axes.

- **Definition of done:**
  - [ ] A `computed()` predicate is true when section ≠ `'all'` **or** scope ≠ `null`, and gates an `@if`. The control is **removed from the DOM**, not hidden — **it must NOT** be invisible-but-focusable (`CF-AC-2`'s negative clause; the exact defect `RGS-T-3` existed to avoid).
  - [ ] Activating it sets `activeSection` to `'all'` **and** emits `scopeChange` with `null`.
  - [ ] The section reset sets the signal **directly**, **NOT** via `setActiveSection('all')` — that method carries toggle logic which is a no-op today but couples clearing to an unrelated future change (`CF-DD-2`).
  - [ ] **It must NOT** touch `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`, the `?scope=` value shape, or the host. If a host change appears necessary, **stop and report** — that contradicts the design's reading of the clearing contract and is a discovery, not a detail.
  - [ ] "All Sections" and the scope dropdown keep working exactly as they do today. Re-click behaviour on both axes is **unchanged** (`OQ-3`) — **it must NOT** make scope toggle, and **must NOT** stop sections toggling.
  - [ ] Native `<button type="button">`, accessible name describing clearing, keyboard-operable.
  - [ ] `focus-visible:shadow-[var(--pr-focus-ring)]`. **It must NOT** use `ring-[var(--pr-focus-ring)]` — a box-shadow value that paints nothing; this cost a rework round on `RGS-T-1`.
  - [ ] **On successful clear, focus moves to the "All Sections" tab** (`CF-DD-5`). **It must NOT** be allowed to fall to `<body>` — the control removes itself mid-interaction.
  - [ ] No fixed width and no new grid/flex track in the bar (`CF-DD-4`).

- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview --silent --reporters=summary --no-coverage` and `npx ng lint --quiet`, both from `onecgiar-pr-client/`. *(Targeted path only — not the full `dashboard-lab` directory. There is no flat ESLint config; `npx eslint <path>` fails.)*
  Assert: presence/absence across **all four** state combinations (neither / section only / scope only / both); a clear emits `null` **and** sets `'all'`; Enter and Space both activate; `document.activeElement` after a clear is the "All Sections" tab, **not** `<body>`; the focus-ring class contract including the negative `not.toContain('ring-[var(--pr-focus-ring)]')`.

- **What disqualifies the evidence:**
  - a class-presence assertion offered as proof the focus ring **paints**. jsdom loads no Tailwind — it proves the class and nothing more. State that limit in the test file; the paint is the browser check below.
  - testing only the "both axes active" case. The visibility rule has **four** states and the interesting failures are the single-axis ones.
  - asserting the clear worked without asserting **where focus went**. That is `CF-AC-4`, it only manifests *after* a successful clear, and it is the single most likely thing to be missed.

- **Input that would make it fail:** render the control with neither axis filtered → the absence assertion fails. Swap `shadow-[…]` for `ring-[…]` → the negative assertion fails. Remove the focus hand-off → `document.activeElement` is `<body>` and `CF-AC-4` fails.

---

## 4. Closing browser check (HITL, not a task)

D4 and D5 have **no automated gate** (`requirements.md` §8). Per Lite depth these close at the approval pause rather than as their own task — the surface is one button and the app is already running:

- **D4 — focus ring:** focus the control so `matches(':focus-visible')` is true; read computed `boxShadow`. A non-`none` shadow carrying the ring is the pass.
- **D5 — layout:** with a filter active, at **1600 / 1280 / 1100 / 900 / 768**, page-level `scrollWidth === clientWidth`. **Fresh page load per width** — resizing in sequence on one load gives irreproducible false positives here, proven on `RGS-T-4`. Gate every reading on the loading skeletons being gone.

**If that check cannot be performed, record it as an accepted risk — do not close on jest alone.** On the previous spec, jest, `ng lint` and `ng build` were all green while a layout defect was live at three of five widths.

## 5. Clause Coverage

| Clause | Owner |
|---|---|
| Scenario "one click returns the page to unfiltered" | `CF-T-1` |
| Scenario "a keyboard user can clear, and does not lose their place" | `CF-T-1` (jest: focus target) + §4 (ring paints) |
| `CF-AC-1` `CF-AC-2` `CF-AC-3` `CF-AC-4` | `CF-T-1` |
| `CF-AC-5` | §4 browser check |
| "must NOT touch the `?scope=` contract" | `CF-T-1`, explicit DoD bullet with a stop-and-report clause |
| "re-click behaviour unchanged on both axes" (`OQ-3`) | `CF-T-1`, explicit DoD bullet |

## 6. Next Step

```text
/akili-execute changes/clear-filters
```
