# Requirements — One visible way to clear the Overview's filters

**One line:** add a visible control that returns both filter axes to unfiltered in one activation. Nothing else about the existing controls changes.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` · Prefix `CF` |
| Type | **Change** · Depth **Lite** |
| Approval Mode | `pre-approved` (owner, 2026-09-02 — standing preference; HALT / Pivot / budget still stop) |
| Date | 2026-09-02 |
| Depends on | `changes/aow-row-gesture-split` (complete) · **Parallel-safe: no** — shares `program-overview.component.html` with `changes/progress-by-aow-w3` and `changes/w12-category-card-scope` |
| Source | `proposal.md`; owner decisions on `OQ-1`…`OQ-5` recorded in §5 |

## 2. Context

The Overview has two filter axes that expose their reset asymmetrically: sections via the always-visible **"All Sections"** tab, scope only via an option **inside** the scope dropdown. `changes/aow-row-gesture-split` then made an AoW row click set the scope — so entering a filtered state costs one click and leaving it costs two, on a control the user must already know exists.

Verified in the running app: enumerating every `<button>` on the page and matching `clear|reset|all` returns **zero**.

> **Correction (archive, 2026-09-03):** this sentence is **false**. The sweep pattern actually run was `clear|reset|limpiar|all scopes|todos` — not bare `all` — so the pre-existing conditional **"Show all sections"** button (`program-overview.component.html:350-356`, rendered when `activeSection() !== 'all'`) never matched. It clears the **section axis only**; the scope axis still had no visible reset, so the asymmetry that motivated this spec stands and the requirements are unaffected (Reviewer adjudication 1, `execution.md` §4). Recorded here so the evidence trail is honest; see `execution.md` §2.

## 3. Scope

**In:** one new control in the filter bar that resets `activeSection` → `'all'` and emits `scopeChange` → `null`.

**Out:** the `?scope=` contract, `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`, the host's `overviewScope` handling (all already accept `null` — this spec *calls* those contracts, it does not change them) · what the section tabs or scope control individually do · the AoW row's responsive ladder (`changes/aow-identity-column-starvation`) · any new design token.

## 4. Functional Requirements

- **`CF-R-1`** A visible control MUST reset **both** axes in one activation: section to `'all'`, scope to `null`.
- **`CF-R-2`** The control MUST be present only while at least one axis is filtered, and absent when neither is.
- **`CF-R-3`** The control MUST be a genuine interactive control: a native `<button>`, keyboard-operable by Enter and Space, with a visible focus indicator and an accessible name describing clearing.
- **`CF-R-4`** The change MUST NOT alter the responsive ladder or introduce horizontal overflow at 1600 / 1280 / 1100 / 900 / 768.

### Non-functional

| Dimension | Target |
|---|---|
| Accessibility | WCAG 2.1 AA — keyboard operability (2.1.1), visible focus (2.4.7) via `--pr-focus-ring` as `shadow-[…]`, name-in-name (2.5.3) |
| Responsive | `OSF-NFR-Responsive` widths unchanged |
| Performance | No new network call; both resets are existing client-state paths |

## 5. Owner decisions (`OQ-1`…`OQ-5`, settled 2026-09-02)

| # | Question | Decision |
|---|---|---|
| `OQ-1` | Shown-when-active, or always-but-disabled? | **Shown only when at least one axis is active** → `CF-R-2` |
| `OQ-2` | Precedence with "All Sections" | **Both coexist.** "All Sections" stays the way to clear sections alone; the new control clears both. The overlap is accepted deliberately — neither affordance is removed or altered |
| `OQ-3` | Re-clicking an active filter: sections toggle off, scope does not | **Leave both exactly as they are.** No existing behaviour changes. The inconsistency is real and is recorded in §7 for a separate decision — this spec does not resolve it, and `RGS-DD-6` stands untouched |
| `OQ-4` | Label | **"Clear filters"** — the owner's own words. Accepted that the bar now carries three vocabularies for adjacent ideas ("All Sections", "All scopes", "Clear filters"); recorded in §7 |
| `OQ-5` | Announce the change to AT? | **No `aria-live`.** The controls' own state changes (tab selection, scope trigger label) carry it. Focus stays on the control, which then disappears per `CF-R-2` — see `CF-AC-4` |

## 6. Acceptance Criteria & Scenarios

| ID | Given | When | Then |
|---|---|---|---|
| `CF-AC-1` | A scope is active and/or a section tab other than "All Sections" is selected | The user activates the control | Both reset: section `'all'`, `scopeChange` emits `null`; **BUT it must NOT** navigate or change anything else |
| `CF-AC-2` | Neither axis is filtered | The bar renders | The control is **not present**; **BUT it must NOT** be merely invisible-but-focusable |
| `CF-AC-3` | Keyboard focus on the page, a filter active | The user Tabs to the control and presses Enter, then Space | Both keys clear; **AND IT MUST** show a visible focus indicator |
| `CF-AC-4` | The control has keyboard focus and is activated | The filters clear and `CF-R-2` removes the control | Focus **MUST NOT** be lost to `<body>` — it moves to a defined, sensible neighbour |
| `CF-AC-5` | The Overview at 1600 / 1280 / 1100 / 900 / 768, with a filter active | The bar renders | `scrollWidth === clientWidth` at every width |

### Scenario: One click returns the page to unfiltered

- GIVEN the Overview with `?scope=AOW01` active and the "W1/W2" section tab selected
- WHEN the user activates **Clear filters**
- THEN the section returns to `'all'` and `scopeChange` emits `null`
- AND the control disappears, because nothing is filtered any more
- BUT it must NOT touch `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`, or the `?scope=` value shape — it emits `null` through the existing output and the host owns the URL
- AND IT MUST leave "All Sections" and the scope dropdown working exactly as before

### Scenario: A keyboard user can clear, and does not lose their place

- GIVEN a keyboard-only user with a filter active
- WHEN they Tab to **Clear filters** and press Enter (or Space)
- THEN both axes clear
- AND IT MUST show a visible focus ring before activation
- BUT it must NOT drop focus to `<body>` when the control removes itself — `CF-AC-4`

## 7. Recorded, deliberately not fixed here

- **The two axes disagree on re-click** (sections toggle off, scope does not — `RGS-DD-6`). Both defensible alone, unpredictable together. `OQ-3` chose not to change existing behaviour; worth its own decision.
- **Three vocabularies for adjacent ideas** in one bar: "All Sections", "All scopes", "Clear filters".

## 8. Defect classes this spec can produce, and the gate for each

The lesson this component keeps re-teaching: **a gate blind to the defect class the work produces is not a gate.** On `changes/aow-row-gesture-split`, jest (221 specs), `ng lint` and `ng build` were all green while a layout defect was live at three of five widths.

| # | Defect class | Gate | Can it see it? |
|---|---|---|---|
| D1 | Clears one axis but not the other | `jest` — assert `activeSection() === 'all'` **and** `scopeChange` emitted `null` | **Yes** |
| D2 | Visibility rule wrong (shows when nothing active, or hides when something is) | `jest` — assert presence/absence across all four state combinations | **Yes** |
| D3 | Not keyboard-operable / wrong accessible name | `jest` — native `<button>`, accessible name, not `disabled`, not `tabindex=-1` | **Yes** |
| D4 | **Focus ring computes to nothing** | jsdom loads no Tailwind: a class assertion proves presence, never paint. `ring-[var(--pr-focus-ring)]` is a box-shadow value and paints nothing — this exact bug cost a rework round on `RGS-T-1` | **No automated gate** → browser reading of computed `boxShadow` under real `:focus-visible` |
| D5 | **Overflow at a narrow width** | jsdom performs no layout. The bar sits above rows whose identity column already starves at 1280/1100/900 | **No automated gate** → browser sweep, page-level `scrollWidth`/`clientWidth`, fresh load per width |
| D6 | **Focus lost to `<body>`** when the control removes itself | `jest` can assert `document.activeElement` after activation | **Yes** — and it is the one behaviour most likely to be missed, because it only appears *after* a successful clear |

D4 and D5 have no automated gate. Given the Lite depth, they are covered by a **browser check at the closing HITL pause** rather than a dedicated task — the surface is one button, and the app is already running. If that check cannot be performed, record it as an accepted risk rather than closing on jest alone.

## Requirement ID Index

| ID | Behaviour | Covered by |
|---|---|---|
| `CF-R-1` | Resets both axes | `CF-AC-1` |
| `CF-R-2` | Present only when filtered | `CF-AC-2` |
| `CF-R-3` | Real keyboard control | `CF-AC-3` |
| `CF-R-4` | No layout regression | `CF-AC-5` |
| — | Focus not lost on self-removal | `CF-AC-4` |
