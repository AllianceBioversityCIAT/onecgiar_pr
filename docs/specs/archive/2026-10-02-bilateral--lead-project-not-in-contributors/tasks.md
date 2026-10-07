# Tasks — Bilateral lead W3/bilateral project shown apart from contributors

## Document Control

| Field | Value |
|---|---|
| Spec | `bilateral/lead-project-not-in-contributors` |
| Depth | **Lite** |
| Status | approved (2026-10-02) |
| Requirements / Design | `./requirements.md` · `./design.md` (approved 2026-10-02) |

## T1 — Lead project apart + lead-free contributors views

| Field | Value |
|---|---|
| Status | [x] done — Reviewer PASS + manual check confirmed (2026-10-02) |
| Size | S |
| Depends on | — |
| Requirements | LPC-R-1, LPC-R-2, LPC-R-3, NFR-1, NFR-2 |
| Design | DD-1, DD-2, DD-3, DD-4 |
| Skills | `angular-developer`, `spartan` (visual: reuse the existing read-only pattern, no new component) |

**Scope** (all under `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/`):
1. `.ts`: add `leadProjectIdSig`, `contributingProjectOptions`, `contributingProjectDisabledOptions`, `displayedContributingProjectIds` and `leadProjectLabel` (DD-1…DD-3). Do not touch `selectedProjectIds`, `onProjectsChange`, `buildContributorsPayload` or `lockedCenterInstitutionIds`.
2. `.html`: add a "Lead W3/bilateral project" read-only block above `.sc-block--projects`, inside `@if (leadProjectLabel())`. Rebind the picker `[options]`/`[disableOptions]`/`[ngModel]` and the chip `@for` to the lead-free views, and drop `isLeadProject(id)` from the chip markup.
3. `.spec.ts`: add a new `describe('LPC · lead W3/bilateral project shown apart')` with the tests below, and update the markup-contract assertion at ~L2303 to the new `[options]` binding.
4. `CLAUDE.md` (same folder): add one line next to the P2-3864 note.

**Tests: each scenario/clause is owned here**

| Test | Clause | Would FAIL if… |
|---|---|---|
| a. `leadProjectLabel()` is the lead's short name, falling back to its full name | LPC-R-1 main | the label is read from the wrong field, or comes back null while a lead is resolved |
| b. `leadProjectLabel()` is `null` when there is no `selectedProject` (result with no lead) | LPC-R-1 "no lead" | the block shows `-` or an empty value |
| c. `displayedContributingProjectIds()` is `[A, B]`, in that order, with lead L stored | LPC-R-2 main | L is still listed, or the order changes |
| d. `contributingProjectOptions()` leaves out L both with the page-Center pill and with "All centers", and keeps a selected project from another Center | LPC-R-2 BUT | L is offered, or the P2-3859 union is lost |
| e. After `onProjectsModelChange([A, B])` the payload includes `{ id: L, is_lead: true }` plus A and B | LPC-R-3 main / AND IT MUST | the lead is missing from any saved payload |
| f. After `removeProject(A)` the payload is `[L(is_lead)]` and the displayed list is `[]` | LPC-R-3 | the chip removal drops L |
| g. With the lead id not in `availableProjects()`, the lead-free views equal the old ones (nothing filtered) | LPC-R-3 "not resolvable" | a lead that can't be re-added gets hidden |
| h. Markup contract: the block label, `@if (leadProjectLabel())`, and the picker and chips bound to the lead-free views | LPC-R-1/2 bindings | the template is still bound to `filteredProjectOptions()` / `selectedProjectIds()` |

Test h only checks that the bindings are present. It cannot prove placement or styling.

**Verification**
- `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage --testPathPattern=section-contributors`: green, including the existing P2-3859/P2-3864/BCT suites.
- `npx ng lint --quiet` on the touched files.
- **Manual browser check (HITL):** run it on one manual result with a lead (e.g. `R-A-2018-144`) and on one API-ingested result with a lead (e.g. result code 8896, which has 2 projects). On both, the field shows above the picker and the lead appears in neither the chips nor the dropdown. Saving still keeps the lead after a reload. (No API-ingested result without a lead exists as of 2026-10-02; the "no lead" case is covered by test b only.)

**Disqualifiers:** the evidence does not count if any of these hold:
- an existing section-contributors spec was edited to make it pass, other than the L2303 binding line;
- the payload tests read `selectedProjectIds()` instead of the saved payload;
- the manual check is skipped. Report it as pending; a green Jest run is not a substitute for it.

**Done when** tests a–h pass, the scoped suites are green, lint is clean, and the manual check has been confirmed by the user.
