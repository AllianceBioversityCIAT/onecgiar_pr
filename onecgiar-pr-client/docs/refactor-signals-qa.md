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

## 3. Phase B (pending, not done yet)

Once each component resets reactively, the legacy `*ngIf`-toggle reset hacks in the 13 consumer files above can be removed one at a time (each with its own QA). This section will be updated as those land.

---

## Change tracking (OpenSpec)

| Component | OpenSpec change | Status |
|---|---|---|
| `pr-input` | `refactor-pr-input-signals` | Done, committed `6661baa56` |
| `pr-select` | `refactor-pr-select-signals` | Done (this commit) |
| `pr-multi-select` | (next) | Pending |
