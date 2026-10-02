# Design — Bilateral lead W3/bilateral project shown apart from contributors

## Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/lead-project-not-in-contributors` |
| Depth | **Lite** |
| Status | approved (2026-10-02) |
| Requirements | `./requirements.md` (approved 2026-10-02) |
| Precedent | P2-3864, commit `155f1c091`: the same display-only pattern applied to the lead Center |

## 1. Summary

This is a client-only change in a single component, `section-contributors`. The component gets three signal-derived views:

- the lead project id;
- a label for the new read-only field;
- lead-free versions of the picker options, the picker model and the chips.

The stored selection (`selectedProjectIds()`) and the save path stay exactly as they are. The architecture, data model, API, backend and shared contracts don't change.

## 2. Files

| File | Change |
|---|---|
| `section-contributors.component.ts` | New computeds (DD-1 … DD-3) |
| `section-contributors.component.html` | New read-only block; picker and chips rebound to the lead-free views |
| `section-contributors.component.spec.ts` | New `describe` for LPC-R-1…3; the markup-contract assertion at ~L2303 updated to the new binding |
| `CLAUDE.md` (same folder) | One line, next to the P2-3864 note |

## 3. Design Decisions

| DD | Decision | Covers |
|---|---|---|
| **DD-1** | **Signal-derived lead id.** `leadProjectIdSig` is the id of `creationService.selectedProject()`, counted only when that id is in `availableProjects()`. This is the same rule `hydrateLeadAndSelection` uses to set `readonlyLeadProjectId`, and it is why the display filter and the `onProjectsChange` re-add guard always agree. When the lead is not in the catalogue, or the catalogue failed, the id is `null`, so nothing is filtered (LPC-R-3, last scenario). It can't be built from `readonlyLeadProjectId`, because that is a plain field and a `computed()` would not react to it. P2-3864 hit the same constraint. | LPC-R-2, LPC-R-3 |
| **DD-2** | **Lead-free views.** `contributingProjectOptions` = `filteredProjectOptions()` without the lead; `contributingProjectDisabledOptions` = its disabled subset, which is empty in practice. `displayedContributingProjectIds` = `selectedProjectIds()` without the lead, order kept. The picker's `[options]`, `[disableOptions]` and `[ngModel]`, plus the chip `@for`, bind to these. The model and the options both leave out the lead, so `writeValue` never has a model id that isn't in the options (NFR-2). `onProjectsModelChange` → `onProjectsChange` already re-adds `readonlyLeadProjectId`, so the PATCH is unchanged. `filteredProjectOptions`, `availableProjectsComputed` and `disabledProjectOptions` stay as they are: existing specs pin them, and `lockedCenterInstitutionIds` still reads `selectedProjectIds()`. | LPC-R-2, LPC-R-3 |
| **DD-3** | **Read-only field.** `leadProjectLabel` = the lead's short name, falling back to its full name, looked up through `getProjectDisplayName`; it is `null` when DD-1 gives `null`. The new block uses the same markup as "Lead center": `.sc-block` + `app-pr-field-header label="Lead W3/bilateral project" [readOnly]="true"` + `.sc-readonly-value`. It goes inside `@if (leadProjectLabel())`, directly above `.sc-block--projects`. No new tokens (NFR-1). | LPC-R-1 |
| **DD-4** | **Leave the dead pieces in place.** `isLeadProject()` stays, since the spec at ~L987 still uses it. The `&--project.sc-chip-readonly` SCSS rule also stays: removing it is cleanup and not required. | — |

## 4. Reversion challenge (Step 2.3)

The change takes away the starred lead chip and the disabled lead option. Asked "what does removing this break?":

| Possible breakage | Addressed by |
|---|---|
| `writeValue` drops a model id and the next tick saves a shortened list | DD-2: the model and the options are both lead-free, and the re-add guard restores the lead |
| Hiding the lead when `readonlyLeadProjectId` is null, so a later save would omit it | DD-1: the same catalogue rule as the guard, so a hidden lead is always re-added |
| Read-only viewers can no longer see the lead | DD-3: the new field renders in read-only mode too |
| Existing specs that assert `disabledProjectOptions` / `filteredProjectOptions` | Those computeds are kept as they are; only the markup-contract line changes |

Outcome: no breakage left that the design doesn't handle.

## 5. Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 1 | ~35 production (TS ≈ 20, HTML ≈ 15) + ~90 spec | 1 |

This matches Lite depth.
