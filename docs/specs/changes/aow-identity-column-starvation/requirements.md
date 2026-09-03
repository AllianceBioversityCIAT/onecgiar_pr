# Requirements — AoW identity column starvation (`changes/aow-identity-column-starvation`)

**One line:** the AoW row's code+name column MUST never collapse below a readable floor, at any width the row can be given — and the gate that proves it MUST be a layout measurement in a real browser, because every prior gate was overflow-shaped and this defect never overflows.

## 1. Document Control

| Field | Value |
|---|---|
| **Module** | `results` → `result-framework-reporting/dashboard-lab/program-overview` |
| **Spec Path** | `changes/aow-identity-column-starvation` |
| **Type** | **Change** (defect) — specified in **Bug Mode** (regression test mandatory, red before / green after) |
| **Depth** | Standard |
| **Approval Mode** | `pre-approved (user, 2026-09-03 — "adelante con el proceso")` — routine gates auto-pass and are logged; escalations still stop |
| **Owner** | Reporting product owner |
| **Status** | `approved` (auto-approved, pre-approved mode — 2026-09-03) |
| **Ticket(s)** | none — carried out of `changes/aow-row-gesture-split` `RGS-T-4` |
| **Source** | `proposal.md` (same folder) — measured defect, 4th recurrence of `KZ-OAH-1` |
| **Related** | archived `overview-aow-progress-hero` (`OAH-T-6`), `overview-aow-cross-filter` (`OSF-DD-8`, `OSF-AC-9/10`, `OSF-T-2b`), `aow-row-gesture-split` (`RGS-DD-3`, `RGS-T-4`) |
| **Model checkpoint** | T1 — session model (Fable 5.1) is stronger than the registry's `opus` entry; passed silently, registry entry flagged stale |

## 2. Context

The Program Overview (`docs/ux-ui/design.md` §4 screen inventory — Reporting → Program → Overview; `docs/trd/trd.md` §6 client `pages/result-framework-reporting`) lists one row per Area of Work with a code chip, the name, a status bar, `reported/total` figures, an achievement figure and two action buttons. The row is a CSS grid whose identity track is `minmax(0,1fr)` and whose four siblings are fixed or `max-content`. At three of the five supported viewport widths (`OSF-NFR-Responsive`: 1600 / 1280 / 1100 / 900 / 768) the identity track resolves to **0px** (1280, 1100) or **27px** (900): the AoW code and name are gone, not truncated, and no horizontal scrollbar reveals them (`proposal.md` §2).

Three previous fixes (`OAH-T-6`, `OSF-T-2b`, `OSF-T-12`) all did the same thing: shed sibling tracks at viewport breakpoints. Each fix was measured green at the widths it targeted and the defect returned the next time the shell changed the width the row actually receives — because that width is **not monotonic in the viewport** (row content boxes **derived** from `proposal.md` §2's track tables, tracks + gaps: 1600→≈881px, 1280→≈561px, 1100→≈382px, 900→≈481px, 768→≈609px — derived, not measured; `AIS-T-1`/`AIS-T-5` measure. The 300px summary rail folds under the list only below 1024px). A viewport-keyed ladder cannot protect a column whose width is decided by the shell. `proposal.md` §4: *"a recurring defect that returns after three fixes is a design problem, not a bug"*.

This spec fixes the mechanism, not the symptom: the row's degradation MUST be a function of the row's **own available width**, the identity column MUST carry a **non-zero floor**, and the regression gate MUST measure **layout**, not overflow.

PRD alignment: `docs/prd.md` G2 (reporting visibility) / US-PMU (program lead oversees submission); `docs/ux-ui/design.md` §9 *"Tables … never hide columns silently"*.

## 3. In Scope / Out of Scope

### In scope

- The AoW progress row in `program-overview` — **both** the skeleton row and the real row (they MUST move in lockstep, `OSF-DD-8`).
- A readable floor for the identity column and a degradation ladder that is keyed on the row's container width.
- A browser-measured regression test that sweeps container widths and fails on starvation or overflow.
- A measurement of `reporting-aow-table`'s rows under the same harness (`proposal.md` OQ-4) — **measurement and verdict only**.
- Documentation of the pattern in `program-overview/CLAUDE.md`.

### Out of scope

- The summary rail's fold breakpoint (`max-[1024px]:flex-col`) and any other section-level or shell-level layout.
- The scope trigger's own responsive bands (`:253`, `:279–:290`, `:353`, `:371` — including the pre-existing non-tiling `max-[899px]`), the W1/W2 category card, the breakdown rows (`grid-cols-[62px_minmax(0,1fr)_150px_46px]`).
- Fixing `reporting-aow-table` if it is found to starve — that becomes its own proposal with the measurement attached.
- Any change to the row's gestures, ARIA contract, tooltips or copy (`RGS-*` stands).
- Any server change. None is needed.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| PMU lead / program lead | Can read which Area of Work each row is at every laptop and tablet width. Today at 1280 (the **primary** laptop breakpoint) they cannot. |
| Result submitter | Same; the `Report` button per AoW becomes attributable again. |
| QA reviewer, admin, bilateral consumer | No change. |

## 5. User Stories

- **`AIS-US-1`** — As a program lead on a 1280px laptop, I want every AoW row to show its code and name, so that the progress figures beside them are attributable. *(Refines PRD US-PMU oversight; `OSF-AC-10`.)*
- **`AIS-US-2`** — As a maintainer, I want the row to protect its own identity column regardless of what the shell around it does, so that the next sidebar, rail or column change does not silently bring this back a fifth time.
- **`AIS-US-3`** — As a reviewer, I want a test that goes red when the identity column starves, so that "no horizontal overflow" can never again stand in for "the name is readable".

## 6. Functional Requirements

### Required (MUST)

- **`AIS-R-1` — Identity floor.** At every width the row can be given, the AoW **name** MUST keep **at least 80px** of visible width beside a fully visible code chip (≈50px) — and beside the ⓘ fallback button (≈24px incl. gap) in the branches where it is shown. Expressed as a track floor: identity ≥ **140px** in the full branch (50 chip + 10 gap + 80 name), ≥ **164px** in the shed/stacked branches (+24 for ⓘ). The name truncates with an ellipsis and keeps its full value available (existing tooltip binding untouched); the chip is never clipped.
- **`AIS-R-2` — No overflow trade.** The fix MUST NOT convert starvation into overflow: at every width, the row's `scrollWidth` MUST equal its `clientWidth`, the AoW list MUST NOT gain a horizontal scroller, and `document.documentElement.scrollWidth === clientWidth` (`OSF-AC-9`) MUST still hold.
- **`AIS-R-3` — Container-relative degradation.** The row's degradation MUST be a function of the width available to the row itself, not of the viewport: two rows given the same width MUST render with the same track structure regardless of sidebar state, rail fold or viewport. *(This is the requirement that ends the recurrence.)*
- **`AIS-R-4` — Degradation order preserved.** The shedding order approved in `OSF-DD-8` stands: the achievement figure is shed first; then the bar and figures stack under identity + actions. `Report` MUST never become icon-only; the row MUST never scroll horizontally.
- **`AIS-R-5` — Skeleton parity.** The loading skeleton row MUST carry the same track structure and the same degradation steps as the real row, so the skeleton→content swap never jumps.
- **`AIS-R-6` — Layout-shaped regression gate.** An automated test MUST render the row in a **real browser layout engine**, sweep the row's container width across the full supported range in small steps, and FAIL when the measured identity column is below the floor or the row overflows at any step. It MUST be red on today's template and green after the fix.

### Should (SHOULD)

- **`AIS-R-10` — Sibling measurement.** `reporting-aow-table`'s rows SHOULD be measured under the same harness, and the verdict (starves / does not, with numbers) recorded in `execution.md`. No fix in this spec.
- **`AIS-R-11` — Pattern documented.** `program-overview/CLAUDE.md` SHOULD state the new rule (floor + container-keyed ladder) and retire the sentence that says the identity minimum must never be raised.

### Could (MAY)

- **`AIS-R-20`** The name floor MAY be tuned upward (e.g. 100px) if the measurement task shows the bar can absorb it at every supported width without triggering a shed earlier than today.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Responsive** | `OSF-NFR-Responsive` five widths × scope on/off × section expanded remain the acceptance surface for the real page; the container sweep covers every width in between. |
| **Accessibility** | No change to the ARIA contract of `RGS-DD-1..4` (name button `aria-pressed`, `sr-only` verb, pinnable tooltip). Existing Jest specs stay green. |
| **Browser support** | Container queries: Chrome/Edge ≥ 105, Safari ≥ 16, Firefox ≥ 110 — all ≥ 3 years old; PRMS is desktop-first on managed laptops. Accepted. |
| **Performance** | `container-type: inline-size` on the list creates one containment context; no measurable cost at ≤ 20 rows. |
| **i18n** | No new strings. |
| **Backwards compatibility** | Client-only, no payload, no migration. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `AIS-AC-1` | The row mounted in a real browser, the list wrapper's **container-query width** swept from the row's documented absolute floor (≈330px, `design.md` `AIS-DD-3`) **to 1000px in 8px steps**, with a long AoW name | Each step lays out | The **name span's** `clientWidth` ≥ **80px** and the code chip's right edge is inside the identity cell, at every step; where the name does not fit (`scrollWidth > clientWidth`) its computed `text-overflow` is `ellipsis` |
| `AIS-AC-2` | Same sweep | Each step lays out | Row `scrollWidth === clientWidth` at every step; no ancestor scroller appears |
| `AIS-AC-3` | Same sweep, `richLoading = true` (skeleton) | Each step lays out | The skeleton row's `grid-template-columns` track count equals the real row's at the same width |
| `AIS-AC-4` | The current (unfixed) template | The sweep test runs | It **fails** (red) with the starving widths listed — this is the Bug-Mode proof |
| `AIS-AC-5` | The real Overview page at 1600 / 1280 / 1100 / 900 / 768, scope off and on | The page renders (`skeletons === 0`, `rows > 0`, double-read) | `grid-template-columns` of every AoW row shows identity ≥ 140px; `OSF-AC-9` clean; screenshot at 1280 shows code + name on every row |
| `AIS-AC-6` | Any width where a track is shed | The row renders | The achievement figure is the first thing shed, the info-button fallback appears exactly when it is shed (never both, never neither), `Report` keeps its label |
| `AIS-AC-7` | `reporting-aow-table` rows under the sweep | Each step lays out | A verdict with numbers is recorded; no code change in this spec |

### Scenarios

#### `AIS-R-1` / `AIS-R-2` — Main case
- GIVEN an AoW row inside a container of any width between the row's absolute floor (≈330px query width) and 1000px
- WHEN the browser lays it out
- THEN the code chip and at least 80px of name are visible
- AND the name shows an ellipsis with its full value in the tooltip when it does not fit
- BUT it must NOT overflow its container by a single pixel
- AND IT MUST show no horizontal scrollbar on the row, the list, the card or the page

#### `AIS-R-3` — Same width, same layout
- GIVEN two rows given exactly the same container width, one under a 1100px viewport with the rail beside it and one under a 768px viewport with the rail folded
- WHEN both lay out
- THEN both resolve to the same `grid-template-columns` structure
- BUT the layout must NOT depend on any `min-[…]:`/`max-[…]:` viewport variant on the row or its cells

#### `AIS-R-6` — The gate sees the defect
- GIVEN the sweep test and the unfixed template
- WHEN the test runs
- THEN it fails and names the widths where identity < 140px
- AND IT MUST pass on the fixed template with zero failing steps
- BUT it must NOT be satisfied by any assertion on class names, `scrollWidth` alone, or jsdom

### Defect classes this spec can produce → the gate that catches each

| Defect class | Can jsdom see it? | Gate |
|---|---|---|
| Identity track starves (→ 0px) / name < 80px | **No** | Cypress **component** test (real Chromium layout): `npm run test:ct -- --spec <row sweep spec>` — `AIS-AC-1` |
| Row overflows its container (the historical trade) | No | Same test, `AIS-AC-2` |
| Skeleton and row ladders drift apart | Partly (string parity) | Jest parity test on the two class strings **plus** the CT sweep in loading state (`AIS-AC-3`) |
| A Tailwind variant typo emits no CSS (silent) | No | Same CT test — a missing rule starves at narrow widths and fails `AIS-AC-1` |
| Shell-level widths differ from the harness (rail, sidebar) | No — CT mounts the component without the shell | **Human/T6 browser pass on the real page at the five widths** (`AIS-AC-5`). Claude-in-Chrome was unreachable on 2026-09-03; this pass is the last task and blocks archive, never the code tasks |
| ARIA / gesture regression while editing the cells | Yes | Existing Jest specs: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview` |
| Info-button ↔ achievement cell exclusivity breaks | No | CT sweep asserts exactly one of the two is displayed at each step (`AIS-AC-6`) |

Accepted blind spot: a visual defect that is neither a width nor a visibility (e.g. a colour or weight regression) has no automated gate here; it is covered by the screenshot at 1280 in `AIS-AC-5` and nothing else.

## 9. Dependencies & Assumptions

- **Upstream:** none. `richRows` and `richLoading` are existing inputs.
- **Consequence to disclose (owner):** with the list ≈561px wide at 1280 and ≈382px at 1100 (rail beside it), the row will render the **no-achievement** branch at 1280 and the **stacked 2×2** branch at 1100 and 900; only 1600 and 768 (rail folded) show every track. That is the honest outcome of a 300px rail beside a narrow list — a section-level follow-up (`design.md` §13), not something the row should hide by starving.
- **Downstream:** `changes/progress-by-aow-w3` adds columns to this row — it MUST build on the container ladder, not beside it. `changes/w12-category-card-scope` shares no markup.
- **Assumptions:** Tailwind 4.3's `@container` / `@min-[N]:` / `@max-[N]:` compile in this build (verified 2026-09-03 with the package's own `compile()`: emits `container-type: inline-size` and `@container (width < N)` / `(width >= N)`). `@max-[N]` is **exclusive** (`< N`), the same trap as the viewport variant — same-value tiling applies.
- **Assumption:** Cypress component testing runs on this machine (`cypress` 14.5.1 binary present; `npm run test:ct`, port via `CT_DEV_SERVER_PORT`).

## 10. Open Questions

- `AIS-OQ-1` *(from proposal OQ-1)* Raise the floor **and** re-key the ladder on the container — **resolved:** both; a floor without a container ladder overflows at ~382px, a ladder without a floor starves. See `design.md` `AIS-DD-1/2`.
- `AIS-OQ-2` *(OQ-2)* Minimum useful identity width — **resolved as a name invariant:** ≥ 80px of name ⇒ identity ≥ 140px (full branch) / ≥ 164px (branches showing ⓘ); `AIS-R-20` allows tuning after measurement.
- `AIS-OQ-3` *(OQ-3)* Layout assertion instead of overflow assertion — **resolved:** yes, `AIS-R-6`.
- `AIS-OQ-4` *(OQ-4)* Does `reporting-aow-table` starve — **deferred to measurement** (`AIS-R-10`, `AIS-AC-7`); no fix here.

## 11. Out-of-Band Notes

- Not parallel-safe with `changes/progress-by-aow-w3` (same template, same row). Run this first; that spec's task DoD should cite the container ladder.
- Parallel-safe with `changes/w12-category-card-scope`.
- Kaizen `KZ-OAH-1` standardization #1 (pending on default branch) says "any track holding text is `minmax(0,1fr)`". This spec **amends** that rule: a `0` minimum is exactly what permits collapse; the correct floor is the smallest readable width, with the ladder keyed on the container. Record the amendment at archive.

## Required cross-references

- `docs/prd.md` — G2, PMU oversight stories · `docs/ux-ui/design.md` §9 (breakpoints, "never hide columns silently"), §10 · `docs/trd/trd.md` §6 (client structure), §10 (Cypress) · `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, `max-[N]` exclusivity) · `program-overview/CLAUDE.md` (ladder note to be amended).
