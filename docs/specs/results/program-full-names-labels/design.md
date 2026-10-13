# Module Spec — `design.md`

## 1. Document Control

- **Module / feature:** `results` / `program-full-names-labels`
- **Depth:** Lite · **Status:** `approved` (2026-10-13)
- **Linked:** `requirements.md` (PFN-R-1..3, sites S1–S8)

## 2. Executive Summary

The label rule already exists as `withScienceProgramLabel()` inside the AOW/HLO create modal. It moves to `shared/` and gets two thin entry points: a string function (for `.ts` mappers and chips) and a pure pipe (for templates). Each site then swaps its code-only binding for one of them. Server, DB and API are untouched. The Results Center Program column gets a wider default width plus ellipsis and a tooltip.

## 3. Architecture Overview

```
shared/utils/science-program-label.util.ts
   scienceProgramLabel(code, name?, initiativeName?, shortName?) → "CODE - Name" | "CODE" | "Name" | ""
   withScienceProgramLabel(obj) → { ...obj, sp_label }      (moved here, same behavior)
shared/pipes/sp-label.pipe.ts  (standalone, pure)
   obj | spLabel  → scienceProgramLabel(obj.official_code, obj.name, obj.initiative_name, obj.short_name)
        │
        ├── .ts users: results-list (S1), results-list-filters (S2), global-search-palette.service (S4),
        │              lab-report-form (S5), outcome-indicator (S6), user-management (S7)
        └── templates: results-to-update-modal (S3), notification-item + pop-up-notification-item (S8)
```

## 4. Directory Structure (paths under `onecgiar-pr-client/src/app/`)

| File | Change |
|---|---|
| `shared/utils/science-program-label.util.ts` (+ `.spec.ts`) | **New.** Label rule + `withScienceProgramLabel` |
| `shared/pipes/sp-label.pipe.ts` (+ `.spec.ts`) | **New.** Standalone pure pipe |
| `pages/result-framework-reporting/.../aow-hlo-create-modal.component.ts` | Delete the local helper; import it from shared and **re-export** it so the existing spec import keeps working |
| `shared/interfaces/current-result.interface.ts` | Add optional `submitter`, `submitter_name`, `submitter_short_name` (already returned by the server) |
| `pages/results/.../results-list/results-list.component.{ts,html,scss}` | S1: `programLabel()`; Program column width 88px → ~200px; ellipsis + `title` |
| `pages/results/.../results-list-filters/results-list-filters.component.ts` | S2: chip label and `displayName` built through the shared rule |
| `pages/results/.../results-to-update-modal/results-to-update-modal.component.html` (+ `.ts` if a mapper is needed) | S3: two submitter spots |
| `shared/components/global-search-palette/global-search-palette.service.ts` + `.component.html` | S4: add `submitterLabel` to the row model, render it in the chip |
| `pages/result-framework-reporting/.../lab-report-form/lab-report-form.component.{ts,html}` | S5: map options through `withScienceProgramLabel`; `optionLabel="sp_label"` |
| `pages/outcome-indicator/outcome-indicator.component.ts` (`mapInitiativeData`) + `indicator-results-modal.component.html` | S6: add `sp_label`; `optionLabel="sp_label"`, `optionValue` unchanged |
| `pages/admin-section/pages/user-management/user-management.component.{ts,html}` | S7: entity options get `sp_label`; chip uses the same rule |
| `pages/results/.../notification-item/notification-item.component.{ts,html}`, `shared/components/header-panel/.../pop-up-notification-item.component.{ts,html}` | S8: `obj_*_initiative | spLabel` at 9 + 4 spots; pipe added to `imports` |

## 5–7. Data Model / API / Backend

None. The client interface declares fields the server already returns (`result.repository.ts` selects `ci.name AS submitter_name`, `ci.short_name AS submitter_short_name`).

## 8. Frontend Component Architecture

- **S1, Program cell:** the dot keeps `programDotColor(programCode(r))`. The text becomes `programLabel(r)` = the rule applied to `submitter ?? initiative_official_code` + `submitter_name ?? initiative_name ?? submitter_short_name ?? initiative_short_name`. The cell uses the existing `rc-program` styles plus `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the text span, and `[attr.title]` = the full label. This is the same tooltip mechanism the Center cell already uses, so no new component is needed.
- **S1, column width:** `RC_COLUMNS.program.width` changes from `88px` to `200px` (`minPx` 72 → 120). The column stays user-resizable, and column prefs persisted by users keep their own width.
- **S2, S5–S7, dropdowns:** each option list gets `sp_label` once, at load (not per change-detection cycle). The templates switch to `optionLabel="sp_label"`. `optionValue` / `dataKey` / filter payloads are left as they are (PFN-R-1 BUT clause). The dropdown search filters on the label, so code and name both match.
- **S8, notifications:** the pipe runs on the initiative object, so a missing name falls back to the code (PFN-R-2).
- **Design tokens:** none added; only existing classes/variables are reused.

## 9. Shared Contracts

- `withScienceProgramLabel` keeps its signature and output; only its home moves. It is re-exported from the old module path, so there are no broken imports.
- `CurrentResult` gains only optional fields.

## 10. Design Decisions

| DD | Decision | Why / rejected alternative |
|---|---|---|
| DD-1 | Lift the existing helper into `shared/` and wrap it with a pure pipe | Reuses tested behavior (PFN-R-3). Rejected: per-component string templates, which would drift (S2 already uses a space instead of `" - "`) |
| DD-2 | Compute `sp_label` at load for option lists; use the pipe in templates | No function calls in templates on hot lists; pure pipes memoize |
| DD-3 | Program column: widen to 200px + ellipsis + native `title` tooltip | Shows the name at a glance, as Nicoleta asked, and long names stay one line. Rejected: code only + tooltip (does not meet the request); full wrap (row heights jump). Spartan `hlmTooltip` was rejected for the cell: hundreds of rows means hundreds of overlay directives, and the adjacent Center cell already uses `title` |
| DD-4 | S2: switch `displayName` from `CODE Name` to `CODE - Name` | Same format everywhere. Search still matches both |
| DD-5 | Keep filter values and Excel exports as code | Exports feed downstream sheets; changing columns is a contract change (out of scope) |

**Reversion challenge (Step 2.3):** DD-4 changes the delivered `displayName` text. *What does removing the old format break?* Only specs that assert the exact `"SP01 Name"` string; the filter value is the id, not the label. The tasks update any such assertion; no user-facing behavior is lost.

## 11. Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 3 | ~120 prod + ~90 test | 1–2 |

**Above Lite** (Lite expects 1 task). This is kept as Lite because each site is a binding swap with no logic. If execution exceeds 4 tasks or ~300 LOC, stop and escalate.
