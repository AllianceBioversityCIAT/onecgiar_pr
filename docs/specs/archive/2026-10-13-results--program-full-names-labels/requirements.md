# Module Spec — `requirements.md`

## 1. Document Control

- **Module:** `results` (cross-page labels: results, result-framework-reporting, outcome-indicator, admin, notifications)
- **Sub-feature:** `program-full-names-labels`
- **Depth:** Lite · **Status:** `approved` (2026-10-13)
- **Requested by:** Nicoleta Trifa: *"Please make sure all data fields/filters have the full names, not just codes. Example: add P/A title next to the codes here"* (Results Center → Program column)
- **Part:** 1 of 2. Covers the frontend-only sites, where the name is already in the client data. Part 2 (IPSR tables, completeness status, history of changes, outcome-indicator details table, bilateral review history, AI job cards) needs backend changes and goes through a separate `/akili-propose`.

## 2. Executive Summary

Wherever a Science Program / Accelerator (P/A) appears as a bare code (`SP10`) in a filter, filter chip or table cell, and the client already holds its name, the UI SHALL show `CODE - Name` (e.g. `SP10 - Gender Equality and Inclusion`). Data, endpoints and filter values stay unchanged; only the visible label changes.

## 3. Glossary

| Term | Meaning |
|---|---|
| P/A | Science Program or Accelerator (CLARISA initiative, `official_code` + `name` / `short_name`) |
| P/A label | The display string `CODE - Name`. Name fallback order: `name` → `initiative_name` → `short_name`; with no name, just `CODE` |
| Site | One UI place listed in §4 |

## 4. Scope

| # | Site | Kind |
|---|---|---|
| S1 | Results Center: **Program** column | table cell |
| S2 | Results Center: applied-filter chip for Submitter/Program, plus the Program filter options (today `CODE Name`, no separator) | chip + dropdown |
| S3 | Results Center: "Results to update" modal, submitter cell | table cell |
| S4 | Global search palette (⌘K): program chip on result rows | chip |
| S5 | Dashboard Lab report form: "Other Science Programs" multiselect | dropdown |
| S6 | Outcome indicator: results modal, Submitter column filter | dropdown |
| S7 | Admin › User management: Entity filter and its chip | dropdown + chip |
| S8 | Notifications (page + header pop-up): owner / shared-with P/A mentions | inline text |

- **Out:** see Part 2 above; Excel exports (code column kept); context labels where the page itself already names the program (dashboard-lab bands, sidebar); bilateral screens that already show the name.

## 5. Functional Requirements

### PFN-R-1 — Show the P/A label instead of the bare code

Every site S1–S8 SHALL render the P/A label when the name is available.

#### Scenario: Results Center Program column (S1)

- GIVEN a result row with `submitter = "SP10"` and `submitter_name = "Gender Equality and Inclusion"`
- WHEN the Results Center list renders
- THEN the Program cell shows `SP10 - Gender Equality and Inclusion` next to the program-colour dot
- AND IT MUST stay on one line, truncate with an ellipsis when it overflows, and expose the full label as a tooltip/`title`
- BUT the dot colour must NOT change (it still keys off the code)

#### Scenario: Dropdown option and chip (S2, S5, S6, S7)

- GIVEN a filter dropdown with P/A options carrying `official_code` and `name`
- WHEN the user opens it, or selects an option and sees the applied chip
- THEN each option and chip reads `CODE - Name`
- AND typing either the code or part of the name in the dropdown search finds the option
- BUT the selected **value** sent to the API or used for filtering must NOT change (still the id/code it is today)

#### Scenario: Text mentions (S3, S4, S8)

- GIVEN a row or notification that today prints only the code
- WHEN it renders
- THEN it prints the P/A label

### PFN-R-2 — Graceful fallback

#### Scenario: Name missing

- GIVEN a P/A object with a code but no `name`, `initiative_name` or `short_name`
- WHEN any site renders it
- THEN it shows just the code (never `SP10 - `, `SP10 - undefined` or `SP10 - null`)
- AND with neither code nor name, the site keeps its current empty placeholder (`—` in S1)

### PFN-R-3 — One format everywhere

All sites SHALL build the label through one shared rule, with the separator `" - "`, so the format cannot drift between pages.

## 6. Non-Functional Requirements

- Client-only. No server, DB or API contract change. The only change on the contract side is declaring the already-returned fields `submitter_name` / `submitter_short_name` on the client interface.
- Visual tweaks (column width, truncation, tooltip) use the existing Spartan/PrimeNG pieces already on each screen and existing tokens; no new design token.

## 7. Defect classes → gate

| Defect class | Caught by |
|---|---|
| Wrong format / separator, or `undefined` / `null` leaking into a label | Jest: shared label helper unit cases (PFN-R-2, R-3) |
| A site still shows only the code (missed wiring) | Jest: one assertion per touched component spec where one exists; plus `grep` of the sites in §4 at review |
| Filter **value** changed, so filtering breaks | Jest: existing filter specs stay green; review checks that `optionValue` and filter payloads are untouched |
| Results Center column overflows, wraps, or pushes the table layout | **No automated check** (jsdom cannot measure layout). Substitute: manual browser check at the HITL pause on the Results Center at 1280px and 1920px |
| Name not present in real data for some rows | **No automated check.** Accepted: the fallback shows the code (PFN-R-2) |

## 8. Requirement ID Index

| ID | Sites |
|---|---|
| PFN-R-1 | S1–S8 |
| PFN-R-2 | S1–S8 |
| PFN-R-3 | S1–S8 |
