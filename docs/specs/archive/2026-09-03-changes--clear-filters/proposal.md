# Proposal — One visible way to clear the Overview's filters

**One line:** the SP Overview has two filter dimensions and no visible way to reset them together — and the change that just shipped made getting *into* a filtered state one click while getting out stayed two, hidden inside a dropdown.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` |
| Slug | `clear-filters` — derived from the owner's free-text request |
| Type | **Change** |
| Approval Mode | `gated` |
| Date | 2026-09-02 |
| Depends on | `changes/aow-row-gesture-split` (complete, 4/4) · **Parallel-safe: no** — same file |
| Source | Owner request 2026-09-02 (screenshot of the filter bar), plus findings measured while closing `aow-row-gesture-split` |
| Escalated from | `/akili-quick` — failed the triviality gate on *cosmetic-only* and *no behavior change*; recorded rather than fast-tracked |

## 2. Intent

Give the Overview one visible, discoverable control that returns the filter bar to its unfiltered state.

## 3. Problem / Current Behavior

**There is no clear button.** Verified in the running app by enumerating every `<button>` on the page and matching against `clear|reset|all` — **zero matches**.

> **Correction (archive, 2026-09-03):** this sentence is **false**. The sweep pattern actually run was `clear|reset|limpiar|all scopes|todos` — not bare `all` — so the pre-existing conditional **"Show all sections"** button (`program-overview.component.html:350-356`, rendered when `activeSection() !== 'all'`) never matched. It clears the **section axis only**; the scope axis still had no visible reset, so the asymmetry that motivated this spec stands and the requirements are unaffected (Reviewer adjudication 1, `execution.md` §4). Recorded here so the evidence trail is honest; see `execution.md` §2.

The bar carries **two independent filter axes**, and they expose their reset asymmetrically:

| Axis | State | "No filter" value | How you clear it | Visible? |
|---|---|---|---|---|
| Section tabs | `activeSection` — a signal **local to `program-overview`** (`:321`) | `'all'` | the **"All Sections" tab** | ✅ one click, always on screen |
| Scope | `overviewScope` — a signal **owned by the host `dashboard-lab`** (`:1436`), passed down as `selectedScope` input, changed via `scopeChange` output | `null` | the **"All scopes" option inside the dropdown** (`:1113`) | ❌ requires opening the listbox first |

### What the last change made worse

`changes/aow-row-gesture-split` made an AoW row body set the scope. So today:

- **Entering** a scoped state: **1 click**, on the largest target on the page.
- **Leaving** it: **2 clicks**, on a control the user has to know is there.

That asymmetry did not exist before, because the row was not a filter entry point.

### It also re-opens a decision that was correct at the time

`RGS-DD-6` decided *"clicking the already-selected row does nothing — `All scopes` in the control is the documented way to clear."* That was reasonable **when the row was not an entry point**. It now is, so the premise the decision rested on has changed. This proposal does not overturn `RGS-DD-6` — it removes the pressure on it by making the documented way to clear actually visible.

### A third inconsistency, found while investigating

The two axes already disagree about re-clicking an active filter:

- **Sections toggle off**: `setActiveSection` (`:324`) — `activeSection() === section && section !== 'all' ? 'all' : section`.
- **Scope does not**: `RGS-DD-6`, deliberately, so one gesture never means two things depending on invisible state.

Both behaviours are individually defensible; together they are unpredictable. Worth settling here rather than leaving it to be discovered.

## 4. Proposed Outcome

A single visible control in the filter bar that, in one activation, returns **both** axes to their unfiltered state: section → `'all'`, scope → `null` (which also drops `?scope=` from the URL).

## 5. Scope

- One new control in the filter bar of `program-overview.component.html`.
- Resets `activeSection` to `'all'` **and** emits `scopeChange.emit(null)`.
- A visibility rule (see `OQ-1`) and a precedence rule against "All Sections" (see `OQ-2`).
- Accessible name, keyboard operability, visible focus ring — this component's standing bar, and the reason the previous spec ran three review rounds.

## 6. Non-Goals

- **No change to `?scope=`, `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, or `OverviewLink`.** The clearing mechanism already exists and is already exercised: `scopeChange` is typed `string | null`, the host binds `(scopeChange)="overviewScope.set($event)"`, and `null` already flows to `scope: overviewScopeParam ?? null` when the URL is written (`dashboard-lab.component.ts:1219`). This change **calls** an existing contract; it does not alter one.
- No change to what the section tabs or the scope control individually do.
- **Not** revisiting the AoW row's responsive ladder — that is `changes/aow-identity-column-starvation`.
- No new design token.

## 7. Affected Users, Systems, And Specs

| | |
|---|---|
| Users | Science Program users on the Overview — mouse, keyboard and screen-reader alike |
| Files | `program-overview.component.{html,ts}`; **no host change expected** (`scopeChange(null)` is already handled) |
| Specs | `changes/aow-row-gesture-split` (`RGS-DD-6` premise) · `changes/overview-aow-cross-filter` (archived — introduced the scope axis, `OSF-R-1`) |

## 8. Visual Reference

- Source: **Owner screenshot** of the live filter bar (2026-09-02), plus the running app at `…/entity-details/SP04/overview`.
- Location: no file artifact; the surface is inspectable live.
- Notes: the screenshot shows the exact bar — `All Sections | W1/W2 11 | W3 / Bilateral 5 | Areas of Work 5` and `Scope: Agroecology+ Solutions & Innovati… ▾`. A mockup is offered but not required; the control is one button in an existing bar.

## 9. Requirement Delta Preview

### ADDED

- A visible control that resets both filter axes in one activation.
- A rule for when it is shown or enabled.

### MODIFIED

- `RGS-DD-6`'s *rationale* (not its behaviour): "the documented way to clear" becomes a visible affordance instead of a dropdown option.
- Possibly `setActiveSection`'s toggle behaviour, if `OQ-3` resolves toward consistency.

### REMOVED

- Nothing.

## 10. Approach Options

| | Option | Trade-off |
|---|---|---|
| **A** | **"Clear filters" button, shown only when at least one axis is active** | Smallest, self-explanatory, zero clutter when there is nothing to clear. Button appears/disappears — some find that jumpy. **Recommended.** |
| B | Always-visible button, disabled when nothing is active | Stable layout, discoverable before it is needed. A permanently disabled control is visual noise on the common unfiltered path. |
| C | An `×` affordance on each active filter instead of one shared button | Most precise, matches the "filter chip" idiom, scales if a third axis is ever added. More surface, and does **not** deliver the one-click reset the owner asked for. |

## 11. Recommended Approach

**Option A.** It is the smallest change that fixes the asymmetry, it needs no new token, and it reuses two mechanisms that already exist and are already tested. Option C is the better long-term idiom if the bar ever grows a third axis — worth recording, not worth building now.

## 12. Risks, Dependencies, And Open Questions

| Risk | Note |
|---|---|
| Same file as an active spec | `changes/progress-by-aow-w3` and `changes/w12-category-card-scope` also target `program-overview.component.html`. **Parallel-safe: no.** |
| Layout | The bar sits above the AoW rows, whose identity column already starves at 1280/1100/900 (`aow-identity-column-starvation`). A control added to this bar must not consume horizontal room at those widths. |
| a11y | Clearing changes content without moving focus — needs a decision on whether the change is announced. |

- **`OQ-1`** Shown only when a filter is active (A), or always-but-disabled (B)?
- **`OQ-2`** **Precedence with "All Sections".** The owner chose section+scope knowing it duplicates that tab. If both exist, does the button also visually reset the tab selection, and is the tab still the primary way to clear sections alone? A rule is required, not an implicit outcome.
- **`OQ-3`** Should re-clicking an active *scope* now toggle it off, for consistency with sections — or should sections **stop** toggling, for consistency with `RGS-DD-6`? Settling this is arguably worth more than the button itself.
- **`OQ-4`** Label: "Clear filters" (owner's words) vs "Reset" vs "Show all". The bar already says "All Sections" and "All scopes", so "Clear" introduces a third vocabulary for the same idea.
- **`OQ-5`** Does clearing announce itself to assistive technology (`aria-live`), or is the updated control state enough?

## 13. Success Criteria

- One visible control returns both axes to unfiltered in a single activation, by mouse **and** by keyboard.
- `?scope=` is dropped from the URL; the section returns to `all`.
- Keyboard-operable with a visible focus ring using `focus-visible:shadow-[var(--pr-focus-ring)]` — **never** `ring-[…]`, which is a box-shadow value and paints nothing (`KZ`, cost a full review round on `RGS-T-1`).
- No horizontal overflow introduced at 1600 / 1280 / 1100 / 900 / 768.
- `OQ-1` through `OQ-5` answered in `requirements.md`, not left to the Implementer.

## 14. Next Step

```text
/akili-specify changes/clear-filters
```

Recommend **Lite** depth if `OQ-2` and `OQ-3` resolve simply; **Standard** if `OQ-3` changes the section toggle, because that modifies behaviour users already rely on.
