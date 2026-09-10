# Requirements — Split the AoW row's two gestures

**One line:** clicking an AoW row filters the page to that Area of Work; `Report` and `→` keep navigating — and the row becomes a real, keyboard-operable control, which today it is not.

## 1. Module / Feature

| Field | Value |
|---|---|
| Spec Path | `changes/aow-row-gesture-split` |
| Prefix | `RGS` |
| Type | **Change** |
| Depth | **Standard** — raised from the proposal's `Lite` by a specify-phase discovery (§2) |
| Approval Mode | `gated` → **`pre-approved`** from `RGS-T-3` (owner request; `execution.md` §6) |
| Date | 2026-09-02 |
| Depends on | none · **Parallel-safe: no** (shares `program-overview.component.html` with `changes/progress-by-aow-w3`) |
| Source | `proposal.md`; owner request 2026-09-02 |

## 2. Context — and the discovery that changed the scope

The archived `overview-aow-cross-filter` spec gave the Overview a working ToC-scope filter. The most obvious thing to click — an AoW row — does not use it: the row and its action buttons both emit the same `openAow` output, so one destination is offered through two affordances while the page's own new axis is reachable only from the control at the top.

**Discovered while specifying, and it enlarges the change:** the row is a bare `<div>` with a `(click)` handler (`program-overview.component.html:620`) — **not** a `<button>`, as `proposal.md` originally stated. Verified: zero `role="button"` in the file, and its single `tabindex` belongs to the scope listbox. The row is therefore **already inaccessible**: not focusable, not announced as interactive, not activatable by keyboard.

Re-pointing its click without fixing that would ship a second inaccessible control — the exact "treatment not carried to the site the task changed" failure the archived spec hit twice (`execution.md` §14, §19). So making the row a real control is in scope.

## 3. In Scope / Out of Scope

### In scope

- The row body selects its Area of Work as the page scope.
- `Report` and `→` keep navigating, unchanged.
- The row becomes a genuine interactive control: focusable, keyboard-operable, accessibly named for what it now does.
- A visible selected state when the row's AoW is the active scope.
- Both row sites — the skeleton (`:527`) and the real row (`:621`) — stay structurally consistent.

### Out of scope

- The scope control, the `?scope=` contract, `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`.
- What `Report` / `→` navigate to.
- Any server change or payload field.
- The AoW row's responsive ladder (`max-[900px]` / `max-[1101px]` / `max-[1280px]`) — preserved, not revisited.

## 4. Personas Affected

| Persona | Effect |
|---|---|
| Science Program user (mouse) | Gains a one-click filter on the row they were already looking at |
| **Keyboard-only user** | Gains access to a control that is unreachable today |
| **Screen-reader user** | Gains an announced, correctly-named control where today there is silence |

## 5. User Stories

- **`RGS-US-1`** As an SP user, I want clicking an AoW row to focus the page on that Area of Work, so I do not have to go back to the control at the top.
- **`RGS-US-2`** As a keyboard user, I want to reach and operate the AoW row, so the primary affordance on this surface is not mouse-only.

## 6. Functional Requirements

### Required (MUST)

- **`RGS-R-1`** The row body MUST select its Area of Work as the page scope, using the same mechanism the scope control uses.
- **`RGS-R-2`** `Report` and `→` MUST continue to navigate, and MUST NOT also change the scope.
- **`RGS-R-3`** The row MUST be a genuine interactive control: reachable by keyboard, operable by both Enter and Space, and carrying an accessible name that describes **filtering**, not opening.
- **`RGS-R-4`** When a row's AoW is the active scope, the row MUST render a visible selected state, and MUST expose that state programmatically.
- **`RGS-R-5`** The change MUST NOT alter the row's responsive ladder or reintroduce horizontal overflow.

### Should (SHOULD)

- **`RGS-R-6`** The two row sites (skeleton and real row) SHOULD remain structurally consistent, so a later change to one cannot silently diverge from the other.

### Required (MUST) — collapsible section

*Added 2026-09-02 at the design gate, owner request. Scope growth is disclosed in the design budget.*

- **`RGS-R-7`** The AoW progress section MUST be collapsible from a disclosure control that states its expanded state programmatically.
- **`RGS-R-8`** While collapsed, the section's contents MUST NOT be reachable by keyboard and MUST NOT be announced by assistive technology. Zero height is not enough: the rows contain focusable controls, and content that is invisible but still tabbable is a worse defect than the one collapsing solves.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Accessibility | WCAG 2.1 AA. Keyboard operability (2.1.1), visible focus (2.4.7) using `--pr-focus-ring` via `shadow-[…]`, name-in-name consistency (2.5.3), non-text contrast ≥3:1 for the selected indicator (1.4.11) |
| Responsive | `OSF-NFR-Responsive` widths unchanged: 1600 / 1280 / 1100 / 900 / 768 |
| Performance | No new network call; selection is client state the host already owns |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RGS-AC-1` | An SP Overview with AoW rows, no scope active | The user clicks a row body | The page filters to that AoW and `?scope=` reflects it; **BUT it must NOT** navigate away |
| `RGS-AC-2` | Same | The user clicks `Report` or `→` | Navigation happens as today; **BUT it must NOT** change the scope or leave the page filtered |
| `RGS-AC-3` | Keyboard focus on the page | The user Tabs to a row and presses Enter, then Space | Both activate the filter; **AND IT MUST** show a visible focus indicator on the row |
| `RGS-AC-4` | A scope is active | The matching row renders | It is visibly and programmatically marked selected; **AND IT MUST** reach ≥3:1 against its adjacent surface |
| `RGS-AC-5` | The Overview at 1600 / 1280 / 1100 / 900 / 768, scope on and off | The page renders | `scrollWidth === clientWidth` at every width — **met, measured** (`RGS-T-4`). ~~the AoW name never collapses~~ **RETIRED 2026-09-02** — see the note below |
| `RGS-AC-6` | The AoW section is expanded | The user activates the disclosure control | The section collapses and the control reports `aria-expanded="false"`; **AND IT MUST** be operable by keyboard |
| `RGS-AC-7` | The AoW section is collapsed | The user Tabs through the page | Focus **skips every control inside the section**; **BUT it must NOT** land on an invisible row button, name button, `Report` or `→` |

> **`RGS-AC-5`, second clause — retired at the `RGS-T-4` gate, owner-approved.**
>
> The clause "the AoW name never collapses" asserted a property this spec **explicitly declined to own**: §3 puts "the AoW row's responsive ladder (`max-[900px]` / `max-[1101px]` / `max-[1280px]`) — preserved, not revisited" **out of scope**, and `design.md` `RGS-DD-3` says "nothing in the responsive ladder is touched". An AC cannot require a fix the same document forbids; the clause was unsatisfiable within its own spec from the moment it was written.
>
>
> `RGS-T-4` measured it and it **fails at 1280 / 1100 / 900** in both scope states: the identity track collapses to ~0–27px and the AoW code+name are not legibly rendered. *(Precisely: at 1254px inner width the track is 3.7px and the ~50px code chip paints ~46px outside its own cell, overlapping the sibling track; the name span resolves to width 0. There is no page-level overflow — `scrollWidth === clientWidth` holds — because the overflow is absorbed inside the row and the section's own `overflow:hidden`.)* The Leader then proved the failure is **pre-existing, not introduced here**, by three independent experiments (recorded in `execution.md` `RGS-T-4`): reverting `RGS-T-2`'s 2px border in-browser leaves the track byte-identical; neutralising `RGS-T-3`'s collapse wrapper leaves it byte-identical; and the responsive ladder is byte-identical to base commit `ca39bcf32` — same `grid-cols` strings, same counts of every breakpoint class and of `minmax(0,1fr)`.
>
> Root cause: the identity track's four `max-content`/fixed siblings consume ~531px of a ~539px content box, so `minmax(0,1fr)` resolves to ~0. This is **`KZ-OAH-1`, fourth recurrence** — the starvation this spec's own `RGS-DD-3` names as "already recurred three times in this component". Notably it produces **no horizontal overflow** (`scrollWidth === clientWidth` holds at every width), so it passes a naive overflow check while failing visibly — which is why the first clause of `RGS-AC-5` is met and the second is not.
>
> **A proposed refinement was tested and rejected on measurement.** `RGS-T-4`'s Reviewer argued the *collapse* is pre-existing but the *silent* disappearance is partly `RGS-T-1`'s: its `truncate` (`overflow:hidden`) button would be the clipping ancestor turning a visible overlap into silence, and `RGS-R-5`'s "no overflow introduced" would hold only because that `truncate` suppresses it. Plausible, and it named a reading the Leader's first four experiments had not taken — so it was taken. **It does not hold.** With the button neutralised (`display:contents` + `overflow:visible`, faithfully reconstructing the pre-`RGS-T-1` markup where the chip was a direct flex child of the cell), the chip's geometry is **identical**: width 50px, right edge 681px, ~46px outside a 4px cell, in both states; and `scrollWidth === clientWidth` in both states too. `RGS-T-1` changed neither the clipping nor the overflow. The rendered symptom is as pre-existing as the cause.
>
> *(First attempt at this measurement targeted `cell.querySelector('span')`, which returns the `.sr-only` span `RGS-T-1` added as the button's first child — not the code chip. Recorded because it is the "measuring the wrong signal" trap this spec's own §9 exists to guard against, and it produced a clean-looking false negative before being caught.)*
>
> **Carried out of this spec as its own proposal**, not absorbed here: fixing it would contradict two approved decisions (§3, `RGS-DD-3`) and grow a spec already at ~192% of its LOC budget. `RGS-R-5` ("MUST NOT alter the ladder or reintroduce horizontal overflow") is **met** — nothing was altered and no overflow was introduced.

### Scenarios

#### Scenario: The row filters instead of navigating

- GIVEN the SP Overview with no scope selected
- WHEN the user clicks the body of the `AOW02 — Accelerated Breeding` row
- THEN the page filters to `AOW02` and the URL gains `?scope=AOW02`
- AND the scope control's trigger shows that scope as active
- BUT it must NOT navigate to the AoW view
- AND IT MUST leave `PROGRAMME_RESULTS_QUERY_PARAM_MAP` and `OverviewLink` untouched

#### Scenario: The actions still navigate, and only navigate

- GIVEN the same row
- WHEN the user clicks `Report` (or the `→` arrow)
- THEN navigation happens exactly as it does today
- BUT it must NOT also select the scope — the click must not reach the row body
- AND IT MUST keep working when the row is already the selected scope

#### Scenario: A collapsed section is genuinely gone, not merely invisible

- GIVEN the AoW progress section is collapsed
- WHEN a keyboard user Tabs from the control above it to the content below it
- THEN focus never enters the section
- AND assistive technology does not announce its rows
- BUT it must NOT achieve this with `aria-hidden` alone over focusable content — that is an explicit ARIA violation and leaves the controls tabbable
- AND IT MUST restore full keyboard access when the section is expanded again

#### Scenario: A keyboard user can operate the row

- GIVEN a keyboard-only user on the Overview
- WHEN they Tab through the page
- THEN the AoW row receives focus in document order and shows a visible focus ring
- AND pressing Enter or Space filters the page to that AoW
- AND IT MUST announce a name describing filtering by that Area of Work
- BUT it must NOT announce a name that says "open" while the activation filters

## 9. Defect classes this spec can produce, and the gate for each

The archived spec's central lesson: **a gate blind to the defect class the work produces is not a gate**, and jsdom is blind to most of what this change touches.

| # | Defect class | Gate | Can it actually see it? |
|---|---|---|---|
| D1 | Wrong handler wiring (row navigates, or button also filters) | `jest` — dispatch a click on each and assert the emitted output / non-propagation | **Yes** |
| D2 | Keyboard inoperable (missing `tabindex`, no Enter/Space) | `jest` — dispatch real `KeyboardEvent`s | **Yes** |
| D3 | Accessible name still describes navigation | `jest` — assert the computed name contains the filter verb **and NOT** the old one | **Yes**, with the negative half |
| D4 | **Selected-state contrast below 3:1** | **jsdom cannot evaluate contrast.** Substitute: browser measurement with `getComputedStyle` + the WCAG relative-luminance formula, recorded as a number | **No automated gate** |
| D5 | **Focus ring computes to nothing** | jsdom loads no Tailwind CSS, so a class assertion proves presence only. Substitute: browser reading of computed `boxShadow` under a real `:focus-visible` | **No automated gate** |
| D6 | **Layout regression / overflow at some width** | jsdom performs no layout. Substitute: browser sweep at the five widths, page-level, **fresh page load per width** | **No automated gate** |
| D7 | **Collapsed content still tabbable** (the house pattern's own gap — `reporting-aow-table` collapses 20 buttons with zero `inert`) | `jest` can assert the attribute that removes them; it **cannot** walk a real tab order. Substitute: browser check that Tab skips the collapsed section | **Partial** — attribute yes, behaviour no |

D4–D6 have **no automated gate** and are covered by browser measurement at named conditions. This is not a formality: the archived spec found seven defects in exactly these classes while `jest`, `ng lint` and `ng build` were all green.

**Measurement conditions are mandatory, not optional.** A number without its condition is not evidence — six distinct false-clean variants were recorded in one spec (`archive/2026-09-02-changes--overview-aow-cross-filter/execution.md` §22). Every reading here states its viewport, its scope state, and that the page finished loading.

## 10. Dependencies & Assumptions

### Upstream

- `selectScope(key)` → emits `scopeChange`; the host owns scope state. No new plumbing needed.
- `onOpenAowRowAction(row, $event)` already calls `stopPropagation()` — the mechanism that makes the two gestures separable already exists and is tested.

### Assumptions

- `A-1` The host's `scopeChange` handler needs no change; the row reuses the existing path.
- `A-2` `selectedScope()` is already available to the component (it drives the control's `aria-selected`), so the selected-row state needs no new input.

## 11. Open Questions

- **`RGS-OQ-1`** Clicking the **already-selected** row: clear the scope (toggle) or do nothing? The proposal recommends *do nothing*; `All scopes` in the control is the documented way to clear. **Owner decision at design time.**
- **`RGS-OQ-2`** Does the row's selected state reuse the control's active-option treatment (`border-2` + `--pr-color-primary-300`, already measured at 5.78:1), or does a full-width row need a different encoding?

## Requirement ID Index

| ID | Behavior | Covered by AC |
|---|---|---|
| `RGS-R-1` | Row body selects the scope | `RGS-AC-1` |
| `RGS-R-2` | Actions navigate only | `RGS-AC-2` |
| `RGS-R-3` | Row is a real keyboard control | `RGS-AC-3` |
| `RGS-R-4` | Visible + programmatic selected state | `RGS-AC-4` |
| `RGS-R-5` | No layout regression | `RGS-AC-5` (first clause; second clause retired — see §8 note) |
| `RGS-R-6` | Both row sites consistent | design-level; task-owned |
| `RGS-R-7` | Section is collapsible | `RGS-AC-6` |
| `RGS-R-8` | Collapsed content unreachable | `RGS-AC-7` |
