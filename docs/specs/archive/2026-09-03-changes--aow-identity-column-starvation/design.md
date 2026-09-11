# Design — AoW identity column starvation (`changes/aow-identity-column-starvation`)

**One line:** give the identity track a real floor (≥ 80px of name) and re-key the row's degradation ladder on the **row's own container width** (CSS container queries via Tailwind 4 `@container` / `@min-[N]:` / `@max-[N]:`), so the row protects itself no matter what the shell does — then prove it with a Cypress **component** test that sweeps container widths in a real layout engine.

## 1. Summary

Three prior fixes shed tracks at viewport breakpoints; the width the row actually receives is not monotonic in the viewport (row content ≈881 / 561 / **382** / 481 / 609px at 1600 / 1280 / 1100 / 900 / 768 — derived from `proposal.md` §2's tracks, measured by `AIS-T-1`/`T-5`), so each fix was green where it looked and wrong where it did not. This design (a) replaces `minmax(0,1fr)` with a per-branch floor (`minmax(143px,1fr)` full branch, `minmax(167px,1fr)` where the ⓘ fallback shares the cell — 143/167 after `AIS-T-1` measured the chip at 51.1px; the pre-measurement estimate was 140/164) on the identity track, (b) moves every responsive rule on the row and its cells from viewport variants to container-query variants with thresholds **derived from the tracks' minimums** so that no branch can ever need more than its container, and (c) adds a browser-measured sweep test that fails on starvation or overflow. Client-only; no data, API or migration changes. Linked: `requirements.md` (same folder), `docs/ux-ui/design.md` §9, `docs/trd/trd.md` §6/§10, `onecgiar-pr-client/CLAUDE.md` §5.

**Traceability**

| Requirement | Design |
|---|---|
| `AIS-R-1` floor | `AIS-DD-2` |
| `AIS-R-2` no overflow trade | `AIS-DD-1`, `AIS-DD-3` (thresholds ≥ branch minimum) |
| `AIS-R-3` container-relative | `AIS-DD-1` |
| `AIS-R-4` shed order | `AIS-DD-3` |
| `AIS-R-5` skeleton parity | `AIS-DD-4` |
| `AIS-R-6` layout gate | `AIS-DD-5` |
| `AIS-R-10` sibling table | `AIS-DD-6` |
| `AIS-R-11` docs | `AIS-DD-7` |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client module:** `pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/` — `program-overview.component.html` (skeleton row ≈`:564`, real row ≈`:676`, their cells to ≈`:870`), `program-overview.component.spec.ts` (parity test), a new `program-overview.row-layout.cy.ts` (Cypress CT), `CLAUDE.md` (pattern note).
- **Server, API, data:** untouched.
- **Global styles:** untouched — Tailwind 4 emits `@container` and the arbitrary container variants from the template alone (verified against the installed package on 2026-09-03).

### 2.2 The mechanism, in one diagram

```
[list wrapper ×2: skeleton :537, real :620]  ← @container (container-type: inline-size); query width Q = wrapper content box
   └── [row grid]  border box = Q; content box = Q − 36  (px-[16px] ×2 + border-2 ×2)
        Q ≥ T_restack : minmax(143px,1fr) | minmax(120px,240px) | max-content | max-content(achv, wide) | max-content
        T_full ≤ Q < T_restack : same 5 tracks, achievement cell restacked vertically (today's `max-[1280px]` rules)
        T_stack ≤ Q < T_full   : minmax(167px,1fr) | minmax(120px,240px) | max-content | max-content       (achievement shed → ⓘ in identity cell)
        Q < T_stack            : minmax(167px,1fr) | max-content                                            (2×2: identity+bar in col 1 / figures+actions in col 2)
        absolute floor : max(167,120) + 16 + max(112.8,75.6) + 36 ≈ 332 → 340px query width — below any supported width (min derived 382 + 36 = 418)
        SHIPPED (AIS-T-2, measured): T_restack = 700 · T_full = 630 · T_stack = 560 — arithmetic in the template's ladder comment
```

Estimates with today's track maxima (figures ≈54px, achievement ≈107px restacked / A_wide unstacked, actions ≈112px, gaps 16px): `T_full ≈ 140+120+54+107+112+64+36 = 633 → 640`, `T_stack ≈ 164+120+54+112+48+36 = 534 → 540`, `T_restack = T_full − 107 + A_wide` (measured). They are finalised by `AIS-T-1`'s measurement, never by eye. Rule: **each branch's threshold ≥ Σ(minimum of every track in the branch) + gaps + 36px row chrome**, so `1fr` can never be asked for a negative leftover; the stacked branch's minimum is per-**column** (`max` of the two cells sharing a column), not a sum of row cells.

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None.

## 6. Frontend Plan

### 6.1 Routes / modules

No route or module change.

### 6.2 Components & services

- `ProgramOverviewComponent` template only. No TS logic change; the row's inputs (`richRows`, `richLoading`) already support the fixture the test needs.
- No new component. A dedicated CT spec mounts `ProgramOverviewComponent` with `mountComponent` from `cypress/support/ct-utils.ts` (`HttpClientTestingModule`, `provideRouter([])`, `NoopAnimationsModule` already supplied), sets `richRows` to a fixture with a long AoW name and an achievement figure, keeps `aowSectionExpanded` at its default `true`, sets `cy.viewport(1500, 900)` so the `flex min-w-0 flex-1` column beside the 300px rail (`:430`, `:535`) is wider than any sweep step, and drives the **list wrapper's** width (`data-testid="aow-rows"` / `"aow-rows-skeleton"`, added by `AIS-T-1` as test hooks on `:620` / `:537`) with an inline `width` — the wrapper's content box (= inline width − 40px of `p-[20px]`) is the container-query width `Q` the ladder reads; the test reports in `Q`. Never the host: the host also contains the rail.

### 6.3 Design system usage

- **Tailwind-first** (client `CLAUDE.md` §5 hard rule 19): all changes are utilities in the template. First use of `@container` in the codebase — `AIS-DD-7` documents it.
- Tokens, typography, colours: unchanged.
- **Responsive plan:** the row stops using viewport variants entirely; the section (rail fold at `max-[1024px]`) keeps its viewport variant — out of scope, and now harmless to the row.
- **A11y:** the ⓘ fallback button and the achievement cell keep their mutually exclusive display (`RGS` rework finding); only the variant prefix changes (`max-[1101px]:` → `@max-[600px]:`). Focus ring, `aria-pressed`, `sr-only` verb untouched.
- **i18n:** no strings.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

No change. No secrets involved.

## 8. Performance & Capacity

`container-type: inline-size` establishes size containment on the list wrapper; layout cost is per-container and negligible at ≤ 20 rows. No bundle impact (CSS only).

## 9. Observability

None needed. The CT test's output is the evidence artefact (`execution.md` records the measured table).

## 10. Testing Plan

| Layer | Purpose | Command |
|---|---|---|
| **Cypress component (real Chromium)** | `AIS-AC-1..4, 6`: sweep the list container-query width 336→1000px in 8px steps, assert name span ≥ 80px (and chip inside the cell, ellipsis when truncated), `scrollWidth === clientWidth`, skeleton track count = row track count, exactly one of {achievement cell, ⓘ button} displayed. Red on today's template. | `CT_DEV_SERVER_PORT=8090 npm run test:ct -- --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/program-overview.row-layout.cy.ts"` |
| Jest (jsdom) | `AIS-AC-3` string half: skeleton and row `class` ladders are token-identical for every `grid-cols-`/`@min-`/`@max-`/`[grid-column`/`[grid-row` token; existing ARIA/gesture specs stay green | `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview --silent` |
| Human / T6 browser pass | `AIS-AC-5`: real page, five widths × scope on/off, `grid-template-columns` per row + 1280 screenshot | manual, recorded in `execution.md` |
| Lint | template/TS hygiene | `npx ng lint --quiet` |

Disqualifiers are in `tasks.md` per task (a sweep whose steps are not laid out, a fixture whose name fits without truncation, a "green" that only ran the jsdom half).

## 11. Backwards Compatibility & Migration Plan

Client-only CSS. Rollback = revert the single PR. Browser support for container queries is ≥ 3 years old on every engine (`requirements.md` §7); no flag.

## 12. Design Decisions

### `AIS-DD-1` — Re-key the row's ladder on its container, not the viewport

- **Context:** the width the row receives depends on the sidebar, the 300px summary rail and its fold point, card padding and any future column — none of which the row controls. Every previous fix keyed on the viewport and was invalidated by the next shell change (`KZ-OAH-1` ×4).
- **Decision:** **both** list wrappers directly around the rows — the skeleton branch (`:537`) and the real branch (`:620`), identical classes — become size containers (`@container`); every responsive rule on the row and its cells uses `@min-[N]:` / `@max-[N]:` container variants. `AIS-R-3` is then true by construction.
- **Alternatives:** *(a)* keep viewport variants and move the breakpoints again — the fourth time this was done; rejected as the recurrence mechanism itself. *(b)* JS `ResizeObserver` setting a class — works but adds TS/state for something CSS now does natively; rejected. *(c)* fold the summary rail earlier (`max-[1101px]`) so the container never drops to 382px — fixes today's numbers only, leaves the row defenceless against the next change; rejected, though it remains a legitimate *section-level* follow-up.
- **Consequences:** first `@container` in the codebase (documented, `AIS-DD-7`). Tailwind's `@max-[N]` is exclusive (`width < N`) exactly like the viewport variant — the same-value tiling rule from `program-overview/CLAUDE.md` carries over. The section-level rail fold stays viewport-keyed and no longer matters to the row.

### `AIS-DD-2` — The identity track gets a real floor: `minmax(143px,1fr)` / `minmax(167px,1fr)`

- **Context:** `minmax(0,…)` *replaces* the automatic minimum; a `0` floor is explicit permission to collapse. Content can never widen a track whose floor is zero (`proposal.md` §5). `OSF-T-2b` forbade raising the floor because with a viewport ladder it converted starvation into overflow — that objection is correct **and** is exactly why `AIS-DD-1` is a prerequisite: with thresholds derived from the branch minimums, a floor cannot overflow.
- **Decision:** the invariant is **≥ 80px of name**. Expressed per branch on both sites (skeleton + row): `minmax(143px,1fr)` in the full branches (code chip **51.1px measured** incl. padding/border + 10px gap + 80 name, rounded up; the pre-measurement estimate was 140) and `minmax(167px,1fr)` in the shed and stacked branches, where the ⓘ fallback button (`:746–:755`, ~14px + 10px gap) shares the identity cell. Enough for "Accelerated…" to be recognisable; the tooltip carries the rest. `AIS-R-20` allows tuning after measurement.
- **Alternatives:** *(a)* `minmax(min-content,1fr)` — the min-content of a `truncate` span is 0, so this changes nothing; rejected. *(b)* a fixed-width identity column — re-creates `KZ-OAH-1`'s original form (a px track transcribed from a canvas); rejected. *(c)* `minmax(200px,1fr)` — pushes the absolute floor to 328px and the full-branch threshold past 660px, shedding the achievement figure at widths where it fits today; rejected pending measurement.
- **Consequences:** the bar still grows to 240px before the identity gets leftover (grid sizing gives `1fr` only what remains after non-flexible tracks maximise). At a branch threshold the identity sits at exactly its floor and the name is truncated — by design; the floor is the guarantee, not the target. **Reversion challenge:** this reverts `OSF-T-2b`'s explicit "MUST NOT raise the identity min". *What does removing that rule break?* — under the old viewport ladder, overflow at 382px containers. Under `AIS-DD-1`'s derived thresholds (which include the 36px row chrome), nothing: the sweep test (`AIS-DD-5`) is the proof, and `AIS-T-2`'s DoD requires it green from the absolute floor (≈330px query) up. Recorded; design not changed.

### `AIS-DD-3` — Thresholds are derived from track minimums, then measured — never chosen by eye

- **Context:** every earlier breakpoint was chosen from the viewport widths in the NFR and then measured after the fact.
- **Decision:** for each branch, `threshold = Σ(minimum of every track in the branch) + gaps + 36` (the row's own `px-[16px]`×2 + `border-2`×2 — a container query measures the wrapper's content box, which is the row's **border** box), rounded up to the next 10px. With today's estimates: full (5 tracks, achievement restacked) `140+120+54+107+112+64+36 = 633 → 640` = `T_full`; restack step `T_restack = T_full − 107 + A_wide` where `A_wide` is the unstacked achievement cell's max-content (measured); no-achievement (4 tracks) `164+120+54+112+48+36 = 534 → 540` = `T_stack`; stacked (2×2) per-**column** minimum `max(164,120) + 16 + max(112,54) + 36 = 328 → 330` (absolute floor, no branch below it). `AIS-T-1` measures the real `max-content` widths with the widest realistic content (`999/999`, `100%`, a two-line-capable achievement figure, unstacked and restacked) and `AIS-T-2` writes the rounded results into the template **with the arithmetic in a comment**, per `KZ-OAH-1`'s standardization (a px value carries its derivation).
- **Alternatives:** keep `640/540` as constants — rejected; they are estimates until measured (measured and shipped by `AIS-T-2`: 700 / 630 / 560). Drop the restack step and map today's `max-[1280px]` rules to `T_full` — rejected: below `T_full` the cell is `hidden`, so those rules would be dead CSS and `OSF-DD-8`'s "restack, then shed" order silently lost.
- **Consequences:** the degradation order of `OSF-DD-8` is preserved: restack achievement → shed achievement (ⓘ) → stack 2×2. At `Q ≥ T_restack` the row is identical to today's ≥ 1280 viewport branch. **Disclosed outcome with today's shell** (query ≈ row content + 36): 1600 → ≈917 full · **1280 → ≈597 < 640: no-achievement branch** on the primary laptop width · **1100 → ≈418 < 540 and 900 → ≈517 < 540: stacked 2×2** · 768 → ≈645: full. That is the honest outcome of a 300px rail beside a narrow list, and it is a section-level question (`AIS-DD-1` alt. c) for a follow-up, not something this row should hide by starving. `AIS-T-5` records which branch each width actually lands in.

### `AIS-DD-4` — Skeleton and row ladders are one string, asserted twice

- **Context:** `OSF-DD-8` / `RGS-DD-5`: the two sites must move in lockstep or the swap jumps.
- **Decision:** both sites carry byte-identical grid + variant class tokens. A Jest test extracts the responsive token set (`grid-cols-*`, `@min-*`, `@max-*`, `[grid-column:*]`, `[grid-row:*]`) from each site's root element and asserts set equality; the CT sweep additionally mounts with `richLoading = true` and compares track counts per step, which is the behavioural half the string test cannot give.
- **Alternatives:** a shared Angular template fragment for the grid class — rejected as churn for two sites that a test can pin.
- **Consequences:** a future edit to one site fails Jest in milliseconds before the CT run.

### `AIS-DD-5` — The regression gate is a container sweep in a real browser (Cypress CT), not a viewport check

- **Context:** `AIS-R-6`; every prior gate was overflow-shaped. jsdom lays out nothing. The app's e2e path needs an authenticated session (no `cypress.env.js` on this machine) and would also bake the shell into the measurement.
- **Decision:** a Cypress **component** spec mounts `ProgramOverviewComponent` (already-configured CT harness: `cypress.config.js` `component`, `npm run test:ct`, `mountComponent` helper) and drives the **list wrapper's container-query width** `Q` from the absolute floor (≈330, rounded up to the next multiple of 8 → 336) to 1000px in 8px steps (84 steps), reading `getComputedStyle(row).gridTemplateColumns`, the chip's and the identity cell's `getBoundingClientRect()`, the name span's `clientWidth`/`scrollWidth`/computed `text-overflow`, and `scrollWidth/clientWidth` at each step. The assertion is the property, not five hand-picked widths: name ≥ 80px and chip inside the cell at every step, ellipsis when the name does not fit, no overflow at every step, exactly one of {achievement cell, ⓘ} displayed, skeleton track count = row track count. **Red first:** the spec is committed against the unfixed template and its failing widths recorded in `execution.md` before `AIS-T-2` begins.
- **Alternatives:** *(a)* Jest string assertions on the class list — presence, not behaviour; rejected as the gate (kept only as the fast parity check). *(b)* e2e with a real login — blocked by auth, and it measures the shell, not the row's contract; kept as the human `AIS-AC-5` pass. *(c)* five fixed viewports in CT — the exact blindness this spec is fixing; rejected.
- **Consequences:** CT dev-server on a session port (`CT_DEV_SERVER_PORT`, `cypress.config.js` comment). Runtime ≈ 1–2 min. The input that makes it fail is concrete: put `minmax(0,1fr)` back, or add a fixed 150px track, and the sweep goes red at the narrow steps.

### `AIS-DD-6` — `reporting-aow-table` is measured, not fixed

- **Context:** `proposal.md` OQ-4 asks whether the sibling table shares the defect.
- **Decision:** `AIS-T-3` mounts `ReportingAowTableComponent` under the same sweep with assertions relaxed to *report* (no fail) and records the verdict. If it starves, a proposal is filed with the numbers attached; if not, the question is closed.
- **Alternatives:** fix it here if it is "the same pattern" — rejected; that component's rows carry different tracks, a different owner spec and their own gestures; folding them in widens a defect fix into a two-component refactor.
- **Consequences:** one extra CT spec (report-only), no template change.

### `AIS-DD-7` — Document the pattern where the next maintainer will look

- **Decision:** `program-overview/CLAUDE.md`'s ladder paragraph is rewritten: *the identity column carries a measured floor (143px full branch / 167px with the ⓘ fallback, = chip 51.1 + 10 + ≥ 80 name); the row's ladder is container-keyed (`@container` on the list, `@min-/@max-[N]:` on the row) with thresholds derived from track minimums; `@max-[N]` is exclusive.* The old sentence "never raises the identity minimum" is deleted (it was true only under the viewport ladder). Archive promotes the pattern to `docs/ux-ui/design.md` §9 Patterns and amends `KZ-OAH-1` standardization #1 (`requirements.md` §11) — on the default branch, per shared-file discipline.

## 13. Open Gaps & Follow-ups

- **Section-level follow-up (not this spec):** at 1280 the list is ≈561px (query ≈597) and at 1100/900 ≈382/481px (query ≈418/517) because the 300px rail sits beside it; the row will show the no-achievement branch at 1280 and the stacked branch at 1100 and 900. Folding the rail earlier (`AIS-DD-1` alt. c) is a legitimate proposal if the owner wants more tracks visible at those widths — it is the shell's width, not the row, that decides.
- `reporting-aow-table` verdict → possible proposal (`AIS-DD-6`).
- The real-page `AIS-AC-5` pass needs a browser with a session; Claude-in-Chrome was down on 2026-09-03. If it is still down at execution, the task is reported **blocked on environment** and handed to the owner with the exact script, never marked done.
- Risk: the CT build compiles `ProgramOverviewComponent` with `PrVizChartComponent` and Spartan popover imports; if the CT dev-server rejects one of them, the fallback is a thin host component in the spec file that reuses the **row template fragment verbatim** — recorded as a deviation, since it weakens `AIS-R-5`'s "same template" claim.

## 14. Budget (tripwire for `/akili-execute`)

| Measure | Expected | Trip |
|---|---|---|
| Tasks | 5 (`AIS-T-1..5`) | > 6 |
| LOC | ≈ 240 (CT spec ≈ 120, template ≈ 60 changed lines incl. two `@container` wrappers + two test ids, Jest ≈ 30, docs ≈ 30) | > 400 |
| Reviewer rounds | ≤ 1 per task; a second FAIL escalates to the user | 2nd FAIL on any task |
| Verification | `npx jest <program-overview dir>` and the single CT spec — never the full client suite | full-suite run |

Sized against the design: matches Standard (5 small tasks, one component, one harness). Not Lite — the container-query migration touches ≈15 cells and needs its own harness. Not Full — no data, API or auth surface.

## Required cross-references

`requirements.md` (same folder) · `docs/prd.md` · `docs/ux-ui/design.md` §9 · `docs/trd/trd.md` §6, §10 · `onecgiar-pr-client/CLAUDE.md` §5 · `program-overview/CLAUDE.md` · archived `overview-aow-cross-filter/design.md` `OSF-DD-8` · `proposal.md`.
