# Tasks — Split the AoW row's two gestures

**4 tasks · ~230 LOC · one PR.** Three of the seven defect classes have no automated gate, so `RGS-T-4` is not optional polish — it is the only check that can see them.

## 1. Scope & Metadata

| Field | Value |
|---|---|
| Spec Path | `changes/aow-row-gesture-split` · Prefix `RGS` |
| Depth | Standard · **Approval Mode:** `gated` |
| Files | `program-overview.component.{html,ts}` · `program-overview.scope.spec.ts` · `program-overview.oah-hero.spec.ts` · a shared home for `.pr-collapse` |
| Parallel-safe | **no** — `changes/progress-by-aow-w3` touches the same markup |

## 2. Pre-Flight

- [x] `proposal.md`, `requirements.md`, `design.md` written; reversion challenge run (`design.md` §7)
- [x] Root cause of the enlarged scope verified: the row is a `<div>`, zero `role="button"` in the file
- [ ] **A runnable app with a real Science Program** — `RGS-T-4` cannot run without it, and it is the only gate for D4/D5/D6/D7

## 3. Task List

### `RGS-T-1` — The AoW code+name becomes a real control [x]

- **Type:** `client` · **Size:** `M` · **Depends on:** — · **Blocks:** `RGS-T-2`
- **Implements:** `RGS-R-3`, `RGS-R-6` · **Design ref:** `RGS-DD-1`, `RGS-DD-3`, `RGS-DD-5`
- **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`
- **Scope:** wrap the AoW code chip + name in a `<button type="button">` inside the identity cell, at **both** row sites (`:527` skeleton, `:621` real row). The achievement glyph stays a **sibling**, never a descendant.
- **Definition of done:**
  - [x] A native `<button type="button">` — **BUT it must NOT** be a `<div role="button">`: that role is children-presentational and can hide `Report` from assistive tech (`RGS-DD-1`).
  - [x] The row stays a plain `<div>` with **no ARIA role**, so its three existing buttons stay independently reachable.
  - [x] Accessible name describes **filtering** by that Area of Work — **BUT it must NOT** say "open" while the activation filters (`RGS-R-3`, and the scenario's negative clause).
  - [x] Visible focus: `focus-visible:shadow-[var(--pr-focus-ring)]`. **BUT it must NOT** use `ring-[var(--pr-focus-ring)]` — that token is a box-shadow value and paints nothing.
  - [x] `min-w-0` + `truncate` on the button. **AND IT MUST NOT** introduce a fixed width: a rigid track here re-creates `KZ-OAH-1`, which has already recurred three times in this component.
  - [x] Both row sites structurally identical; the existing skeleton↔row parity guard extended, not bypassed.
- **Verification:** `npx jest … dashboard-lab` — assert the element is a `BUTTON`, its accessible name contains the filter verb **and NOT** the old one, and Enter **and** Space both activate.
- **What disqualifies the evidence:** a class-presence assertion offered as proof of the focus ring. jsdom loads no Tailwind, so it proves the class, never the paint — that is `RGS-T-4`'s job. A test asserting only "some focus class exists" would have passed against the live `ring-[…]` bug.
- **Input that would make it fail:** replace the `<button>` with a `<div role="button">` → the tag assertion fails. Revert the name to the navigation wording → the negative assertion fails.

---

### `RGS-T-2` — Split the gestures, and render the selected state [ ]

- **Type:** `client` · **Size:** `M` · **Depends on:** `RGS-T-1` · **Blocks:** —
- **Implements:** `RGS-R-1`, `RGS-R-2`, `RGS-R-4` · **Design ref:** `RGS-DD-2`, `RGS-DD-4`, `RGS-DD-6`
- **Skills:** `angular-developer` · **Effort:** `high`
- **Scope:** the row body and the name button both call the scope selection; `Report` and `→` keep navigating. The active row renders its selected state.
- **Definition of done:**
  - [ ] Row body click → scope selection via the existing `selectScope` / `scopeChange` path. **BUT it must NOT** touch `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, `OverviewLink`, or the `?scope=` value shape.
  - [ ] `Report` and `→` navigate and **do not** change the scope — the existing `stopPropagation()` guards are preserved, not rewritten.
  - [ ] Clicking the **already-selected** row does nothing (`RGS-DD-6`) — not a toggle.
  - [ ] Selected state: `border-2` toggling `--pr-color-primary-300` ↔ `transparent`. **AND IT MUST** carry `border-2` in **both** branches so rows do not shift as the selection moves.
  - [ ] `aria-pressed` on the name button reflects the active scope.
  - [ ] **`program-overview.oah-hero.spec.ts:379-401` REWRITTEN.** It currently asserts `rowEl.click()` emits `openAow`; that premise is deliberately reverted. This is a named obligation from the reversion challenge, not a discovery for the Implementer. **AND IT MUST** still assert that `Report` and `→` *do* emit `openAow` — do not delete the coverage, re-point it.
  - [ ] `component.spec.ts:932` reviewed: its premise ("the row's own click must not ALSO fire") is now vacuous. Update or remove it with a one-line note saying which surviving assertion carries the invariant (`KZ-OAH-3`).
- **Verification:** `npx jest … dashboard-lab`. Dispatch a click on the row, on `Report`, and on `→`; assert exactly one of `scopeChange` / `openAow` fires each time and never both.
- **What disqualifies the evidence:** a green suite whose row-click test was deleted rather than re-pointed. The test count must be explained, never absorbed.
- **Input that would make it fail:** remove `stopPropagation` from `onOpenAowRowAction` → the "never both" assertion fails.

---

### `RGS-T-3` — Make the AoW section collapsible, without inheriting the pattern's defect [ ]

- **Type:** `client` · **Size:** `M` · **Depends on:** — · **Blocks:** —
- **Implements:** `RGS-R-7`, `RGS-R-8`, `RGS-R-6` · **Design ref:** `RGS-DD-7`
- **Skills:** `angular-developer`, `ui-ux-pro-max` · **Effort:** `high`
- **Scope:** a disclosure control on the AoW progress section, reusing `reporting-aow-table`'s `.pr-collapse` CSS from a shared home.
- **Definition of done:**
  - [ ] `<button>` trigger with `aria-expanded`, keyboard-operable, visible focus ring (`shadow-[…]`, not `ring-[…]`).
  - [ ] `.pr-collapse` reused — `grid-template-rows: 0fr → 1fr`, `overflow:hidden` on `.pr-collapse-inner`, `prefers-reduced-motion` honoured. **AND IT MUST** be moved to a shared home rather than copy-pasted.
  - [ ] **`inert` on the container while collapsed.** **BUT it must NOT** rely on `aria-hidden` over focusable content — the source pattern collapses 20 buttons with zero `inert`, leaving them tabbable while telling screen readers to ignore them. That is an explicit ARIA violation and this task exists partly to not inherit it.
  - [ ] `aria-hidden` dropped rather than layered on top of `inert`.
  - [ ] Expanding restores full keyboard access.
  - [ ] Default state chosen and stated (expanded, unless the owner says otherwise).
- **Verification:** `npx jest … dashboard-lab` — assert `aria-expanded` flips, `inert` is present when collapsed and absent when expanded, and the trigger responds to Enter and Space.
- **What disqualifies the evidence:** asserting `inert` is present and calling keyboard-unreachability proven. **jsdom does not implement `inert` and cannot walk a real tab order** — the attribute is presence, the behaviour is `RGS-T-4`. Record that limit in the test file rather than letting a green run imply more than it checked.
- **Input that would make it fail:** drop `inert` → the attribute assertion fails. Swap the trigger to a `<div>` → the keyboard assertions fail.

---

### `RGS-T-4` — Browser verification pass [ ]

- **Type:** `tests` · **Size:** `M` · **Depends on:** `RGS-T-2`, `RGS-T-3` · **Blocks:** —
- **Implements:** verification of `RGS-R-4`, `RGS-R-5`, `RGS-R-8`; `RGS-AC-3`, `RGS-AC-4`, `RGS-AC-5`, `RGS-AC-7`
- **Design ref:** `requirements.md` §9 (D4, D5, D6, D7) · **Skills:** `orca-cli` · **Effort:** `high`
- **Files:** `execution.md` only.
- **Scope:** the only gate for the four defect classes jsdom cannot see.
- **Definition of done:**
  - [ ] **D5 — focus ring:** focus the name button so `matches(':focus-visible')` is true, read computed `outline` and `boxShadow`. A non-`none` box-shadow carrying the ring is the pass.
  - [ ] **D4 — selected-state contrast:** sample computed colours, compute ratios by the WCAG relative-luminance formula, against **both** adjacent surfaces (the row fill and the card), each ≥3:1.
  - [ ] **D7 — collapsed section is genuinely unreachable:** with the section collapsed, walk the real tab order and confirm focus **never enters it**; expand and confirm access returns.
  - [ ] **D6 — layout:** at 1600 / 1280 / 1100 / 900 / 768, scope on and off, `scrollWidth === clientWidth`, and the AoW name column never collapses. Record widths as numbers.
  - [ ] Every reading states **viewport, scope state, collapse state, and that loading finished**.
- **Verification:** the recorded numbers are the verification.
- **What disqualifies the evidence, and this list is earned:**
  - a reading taken with **`set viewport` in sequence on one page load** — proven to give irreproducible false positives; use a fresh `goto` per width;
  - a reading taken **during the loading skeleton** — no data means nothing overflows; gate on skeletons being gone;
  - **`overflowsParent` offered instead of page-level** — true and irrelevant;
  - **900px inferred from 768px passing** — 900 is the squeeze band, more constrained than 768 because the sidebar rail renders there;
  - any measurement whose **condition is unrecorded**.
  - An inconclusive result is a legitimate outcome and must be reported as one.
- **Input that would make it fail:** collapse the section and Tab — if focus lands on a row button, D7 fails. Set the selected border to `--pr-border` (1.27:1) — D4 fails.

---

## 4. Dependency Graph

```
RGS-T-1 (name button) ──► RGS-T-2 (gestures + selected state) ──┐
                                                                ├──► RGS-T-4 (browser gate)
RGS-T-3 (collapsible + inert) ──────────────────────────────────┘
```

`RGS-T-1`/`T-2` and `RGS-T-3` touch the same file — **not parallel-safe with each other.** Run in document order.

## 5. Clause Coverage

| Clause | Owner |
|---|---|
| Scenario "row filters instead of navigating" | `RGS-T-2` |
| Scenario "actions still navigate, and only navigate" | `RGS-T-2` |
| Scenario "collapsed section is genuinely gone" | `RGS-T-3` (attribute) + `RGS-T-4` (real tab order) |
| Scenario "keyboard user can operate the row" | `RGS-T-1` (jest) + `RGS-T-4` (visible ring) |
| `AC-1` `AC-2` | `RGS-T-2` · `AC-3` → `T-1`+`T-4` · `AC-4` → `T-2`+`T-4` · `AC-5` → `T-4` · `AC-6` → `T-3` · `AC-7` → `T-3`+`T-4` |
| `oah-hero.spec.ts:379` rewrite | `RGS-T-2`, explicit DoD bullet |

## 6. Next Step

```text
/akili-execute changes/aow-row-gesture-split
```

Start with `RGS-T-1`. `RGS-T-4` cannot run without a live app against a real Science Program — if that is unavailable, report BLOCKED rather than closing on jest alone, because jest is blind to four of this spec's seven defect classes.
