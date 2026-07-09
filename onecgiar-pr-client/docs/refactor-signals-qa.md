# Refactor UI — Signals migration · QA & test guide

> **Branch rule (this refactor branch).** While this work is NOT yet in `staging`, every refactored custom field MUST be documented here: **what changed, which public contract is preserved, the compatibility bridges/hacks introduced, and exactly which fields/sections to test** — so QA and Yeck can verify it actually works, especially around the bridges and the legacy reset hacks.

**Branch:** `front-redesign-fields` · **Scope:** migrate `custom-fields/*` to Angular signals **without changing public APIs** (same selectors, same `@Input`/`@Output`, same `[(ngModel)]`), so consuming screens are not touched.

**Golden rule for QA:** the components should behave **exactly as before**. Any visible/behavioral difference is a regression to report. Nothing about the look or the flow should change — only the internals.

---

## 1. `app-pr-input` — DONE (commit `6661baa56`)

**What changed (internal only):** `@Input()` → `input()` signals; removed a `computed` that mutated state; removed side effects from the value getter; word count is now a reactive `computed`. Public API unchanged.

**Compatibility bridges / risks:** none external. `[(ngModel)]` preserved via a signal-backed getter/setter.

**Fields / sections to test** (it's the most-used field — 184 usages / 49 screens):

| Where | What to check |
|---|---|
| Result Detail → **General Information** → *Title of Result* | Type text → word counter (e.g. `2 / 30`) updates live; header turns green when filled; DESCRIPTION shows. ✅ verified by Yeck. |
| Any **link** field (e.g. evidence links) | Paste a URL → invalid-URL tooltip appears for bad links; trims spaces. |
| Any **number / currency** field | Numeric input works; no negatives; decimals per config. |
| Any **email** field | Invalid email shows the error message. |
| Any read-only / static view | Shows the value (or "Not provided" / "Not applicable") like before. |

---

## 2. `app-pr-select` — DONE (this change)

**What changed (internal only):**
- `@Input()` → `input()` signals; `value` backed by a signal (CVA `[(ngModel)]` unchanged).
- Options are now decorated (selected/disabled) over a **cloned copy** — the original list passed by the parent is **never mutated** (fixes a bug where two selects sharing the same list corrupted each other's selection).
- Dropdown reset is now **reactive**: setting the model to `null`/`''` clears the visible selection on its own.
- Removed dead code; overlay positioning kept identical.

**Compatibility bridges (must keep working):**
- **`_value` / `fullValue` bridge** → the **User Management "Clear filters"** button resets the filter dropdowns by poking `_value`/`fullValue` via `@ViewChild`. The refactor keeps these public, so this must still work **without** any change to User Management.

**Fields / sections to test** (90 usages / 43 screens) — ranked by fragility. The ToC/Contributors screens are **excluded from automated tests**, so manual QA here is essential:

| # | Where | What to check |
|---|---|---|
| 1 | **Admin → User Management** | Set some filter dropdowns (status / CGIAR / entities) → click **Clear filters** → all dropdowns clear and the table resets. **Highest risk.** |
| 2 | **Innovation Use** form | Change *Organization type* → the *Sub-type* dropdown clears and reloads correctly. |
| 3 | Result Detail → **Theory of Change** → multiple WPs | Switch between WP tabs → each tab shows its correct TOC selections (node / output / outcome / EOI). |
| 4 | Result Detail (P25) → **Contributors & Partners** | Toggle *planned result*; add / delete / switch contribution tabs → child dropdowns clear/repopulate correctly. |
| 5 | **IPSR → Contributors** | Change *planned result* → dependent dropdowns clear. |
| 6 | Result Detail → **Geographic location** (geoscope) | Change *Geo scope* → region/country selectors clear/show per scope. |
| 7 | **IPSR → Innovation package geoscope** | Change *Country* → sub-national level selects reset. |
| 8 | Modals: **Share request** (ToC section), **Partners request**, **Retrieve**, **Step-N4** (add partner/bilateral/project) | Open/close → selects inside reset cleanly. |
| 9 | **Lead center / Lead partner** (Partners / Contributors) | Toggle *is lead by partner* → the sibling dropdown (center vs partner) clears. |

**Key thing to confirm around the hacks:** everywhere the app currently destroys+recreates a select to reset it (the `*ngIf` false→true trick), the field must still end up **empty/repopulated correctly**. If any dropdown keeps a stale selection after a parent change or tab switch → report it.

---

## 3. `app-pr-multi-select` — DONE (this change)

**What changed (internal only):**
- `@Input()` → `input()` signals; `@Output()` → `output()` (`selectOptionEvent`, `removeOptionEvent` unchanged).
- `value` backed by a signal; `get/set value` is a side-effect-free CVA bridge (`[(ngModel)]` unchanged).
- **Flat mode**: `optionsIntance()` decorates (selected/disabled) a set of **stable clones** — the original list passed by the parent is **never mutated** (same shared-list bug fix as `pr-select`). It re-derives flags from the **current bound value on every change-detection** (like the pre-signals getter), so both reactive resets and **external in-place mutations of the model are reflected**.
- The old `get optionsIntance()` **reassigned the model** (`this.value = []` / all-options) as a side effect of a getter on every change-detection. That model mutation moved into `selectAllF()` (explicit) — same end state, no getter side effects.

**Bug found & fixed after the first cut (why `optionsIntance` is a per-CD method, not a `computed`):**
- Several parents deselect by **mutating the bound array in place** — e.g. Contributors & Partners does `partnersBody.contributing_center.splice(i, 1)` and renders its own chips. An in-place splice does **not** change the array reference, so Angular never calls `writeValue`.
- The first refactor made `optionsIntance` a `computed` (only recomputes on signal-reference change) **and** made `writeValue` build a new array via `.map()` (decoupling from the parent's array). Result regression: removing a center from outside left its **dropdown checkbox still checked**.
- Fix: `optionsIntance()` is a plain method that re-derives every cycle from the current value; `writeValue` **keeps the exact array reference** when every entry is already an object (only remaps when raw IDs are passed). Locked by regression tests in `pr-multi-select.component.spec.ts` (`reflects an external in-place removal (splice)`).
- Removed dead `_beforeValueLength`; DI moved to `inject()`.
- Preserved verbatim: `logicalDeletion` (soft-delete `is_active`), `confirmDeletion` dialog, `selectedPrimary` / `cannotRemoveOptionValues` chip guards, `displayLabelFormatter`, search, `cdk-virtual-scroll`, chip UI, `showSelectAll`.

**Compatibility bridges (must keep working):**
- **`_value` bridge** → **User Management "Clear filters"** resets the **Entity** multi-select via `@ViewChild` (`entitiesSelect._value = []`, `entitiesSelect.writeValue([])`). The refactor keeps `_value` public, so this works **without** any change to User Management.

**Known caveat (deliberate):**
- **Grouped mode** (`[group]="true"`, only in **User Management** and the **Create/Manage user** modal) keeps its previous in-place decoration (mutates the original grouped children). It was NOT rewritten to the pure-clone model to avoid risk on the admin entity picker. QA the grouped entity selector explicitly (points 1–2 below).

**Fields / sections to test** (58 usages / 32 templates) — ranked by fragility. Many overlap the `pr-select` screens; the ToC/Contributors screens are **excluded from automated tests**, so manual QA here is essential:

| # | Where | What to check |
|---|---|---|
| 1 | **Admin → User Management** | Set the **Entity** filter (grouped) → **Clear filters** → it clears and the table resets. Also open the entity picker, select across groups, apply. **Highest risk.** |
| 2 | **Admin → Create/Manage user modal** | Grouped **Entity** multi-select: select entities across groups, save. |
| 3 | **IPSR → Innovation Use → Step 1** | SDG targets, **experts** (`logicalDeletion` — removing a saved one greys the chip, keeps it), EOI outcomes, action-area outcomes, impact areas, institutions, geoscope: select/deselect → chips + checkboxes update. |
| 4 | **IPSR → Contributors** | Centers, **non-CGIAR partners** (`confirmDeletion`), ToC: add/remove shows confirm dialog; planned-result change clears dependent selects. |
| 5 | **Result Detail (P25) → Contributors & Partners** | **Contributing CGIAR Centers**: select a few → **remove a center from the chip list outside the dropdown** → reopen the dropdown, its **checkbox must be unchecked** (this was the reported regression). Also bilateral projects / results multi-selects (`displayLabelFormatter`, `confirmDeletion`), multiple-WPs normal-selector. **No coverage.** |
| 6 | **Result Detail → Theory of Change** | SDG / impact-area / action-area targets (`confirmDeletion`); switching WP tabs keeps the correct selections. **No coverage.** |
| 7 | **Result Detail → Partners (P22)** + normal-selector | Institution multi-select select/remove. |
| 8 | **Result Detail → Cap-dev / Policy-change info** | Their multi-selects select/remove. |
| 9 | **Bilateral → Result review drawer** (+ policy-change-content) | `cannotRemoveOptionValues` (lead projects show no delete button), `displayLabelFormatter`. |
| 10 | **Init Admin → General results report** | `showSelectAll`: "Select all" selects every option; "Unselect all" clears; chip removal (`removeOptionEvent`). |
| 11 | **Init Admin → Completeness status** + **Global completeness status** | Filter multi-selects (`confirmDeletion` on global). |
| 12 | **Geoscope management** (+ sub-geoscope) & **IPSR geoscope creator** (+ sub-geoscope) | Region/country multi-selects reset on geo-scope/country change. |
| 13 | **Result-framework AOW → HLO create modal** | Multi-select inside the modal resets on open/close. |

**Key thing to confirm around the hacks:** everywhere a parent still destroys+recreates the field to reset it (the `*ngIf` false→true trick), the field must still end up **empty/repopulated correctly**. Any stale selection after a parent change / tab switch → report it.

---

## 4. Phase B (pending, not done yet)

Once each component resets reactively, the legacy `*ngIf`-toggle reset hacks in the 13 consumer files above can be removed one at a time (each with its own QA). A later change should also port `pr-multi-select` **grouped mode** to the pure-clone model. This section will be updated as those land.

---

## Change tracking (OpenSpec)

| Component | OpenSpec change | Status |
|---|---|---|
| `pr-input` | `refactor-pr-input-signals` | Done, committed `6661baa56` |
| `pr-select` | `refactor-pr-select-signals` | Done, committed `2cbc75908` |
| `pr-multi-select` | `refactor-pr-multi-select-signals` | Done (this commit) |
