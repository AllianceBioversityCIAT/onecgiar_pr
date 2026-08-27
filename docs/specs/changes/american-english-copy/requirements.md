# `changes/american-english-copy` — Requirements

## 1. Module / Feature

- **Module:** `changes` (cross-cutting copy — client-wide)
- **Sub-feature:** British → American English standardization of all user-facing copy
- **Owner:** j.cadavid@cgiar.org
- **Status:** draft
- **Depth:** Lite · **Type:** Change · **Approval Mode:** gated
- **Linked proposal:** `proposal.md` (adjusted 2026-08-27: generalized from programme-only to all British spellings, per user feedback)

## 2. Context

PRMS mixes British and American spellings in user-facing copy; CGIAR's official terminology is American English. A ~50-stem sweep (proposal §3) found rendered-copy hits for **programme(s)** (~15–20 files) and **licence** (2 sites); every other British hit is a comment, an identifier, or a data-coupled name (e.g. the `licence` DTO field / DB column from the CGSpace contract). Reported example: "Report results linked to the **programme's** 2026 ToC".

## 3. In Scope / Out of Scope

### In scope
- All **rendered user-facing text** in `onecgiar-pr-client/src` containing any British spelling: labels, headings, tooltips, aria-labels, placeholders, banners, error/toast messages, table/filter labels, CSV filename fallback.
- Jest expectations pinning the old strings.

### Out of scope
- Identifiers, types, classes, sort/filter keys, folders, routes, localStorage keys (proposal §6).
- Data-coupled names: `licence` field/column, `s7_kp_licence` key, CLARISA-matched strings.
- DB/CLARISA data values and out-of-repo templates (accepted risk).
- Code comments and ops log messages.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| All PRMS users | Consistent American spelling in every screen; no functional change. |

## 5. User Stories

- **`AEC-US-1`** — As a PRMS user, I want all platform copy in CGIAR's official American English, so that terminology is consistent and professional.

## 6. Functional Requirements

### Required (MUST)

- **`AEC-R-1`** All rendered user-facing text in the client MUST use American English spelling, applying case- and inflection-preserving replacement over the sweep word list. Confirmed pairs: `programme(s)→program(s)` (incl. possessives), `licence→license` (display copy only). The sweep MUST re-check the full British-stem list (organis-, colour, behaviour, favourite, centre, analyse, catalogue, -ise/-isation stems, labelled/modelled, whilst, amongst, artefact, defence, fulfil, enrol, grey) and treat any new rendered-copy hit as in scope.

#### Scenario: Reported label (main case)
- GIVEN the dashboard-lab reporting band with reporting year 2026
- WHEN the heading renders
- THEN it reads "Report results linked to the program's 2026 ToC" (and the no-year fallback "…the program's ToC")

#### Scenario: Licence display copy
- GIVEN the result-review drawer KP content and the results-list export filters
- WHEN the license heading and the filter label render
- THEN they read "License:" and "Knowledge Product — license"
- BUT it must NOT change the bound field `?.licence` or the key `s7_kp_licence`

#### Scenario: Platform-wide sweep
- GIVEN any client screen
- WHEN any label, tooltip, aria-label, placeholder, banner, or error message renders
- THEN it contains no case variant of any word on the British-stem list
- BUT it must NOT alter text interpolated from data (official names may legitimately contain "Centre"/"Programme")

- **`AEC-R-2`** The change MUST be copy-only.

#### Scenario: No structural change
- GIVEN the full diff of this spec
- WHEN it is reviewed and compiled
- THEN only string literals in templates/TS and test expectations differ
- BUT it must NOT rename any identifier, type, class, sort/filter key, route, file, or folder (e.g. `programmeCode`, `ProgrammeResultsComponent`, `pages/programme-results/`)
- AND IT MUST leave `pr.programmeResults.visibleColumns` byte-identical (renaming silently resets users' saved columns)
- AND IT MUST leave the `licence` DTO/entity field, the DB column reads (`result.repository.ts` rows), and `s7_kp_licence` untouched (external CGSpace contract + export/filter key)

- **`AEC-R-3`** Jest specs pinning the old strings MUST be updated in the same change; the client suite MUST stay green.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No API, route, field-name, or persisted-key change (AEC-R-2). |
| Consistency | Zero British spellings remaining in rendered copy (AEC-R-1 audit). |

## 8. Acceptance Criteria

- **`AEC-AC-1`** Audit sweep over `onecgiar-pr-client/src` (`*.html`, `*.ts`, case-insensitive, full word-list regex) returns hits ONLY in allowlist categories: identifier/key, file/folder path, comment, **data-coupled name**. Any rendered string-literal hit = FAIL.
- **`AEC-AC-2`** `npx jest --silent --reporters=summary --no-coverage` green in `onecgiar-pr-client`.
- **`AEC-AC-3`** Diff inspection confirms no identifier/route/storage-key/field-name changes.

## 9. Defect Classes → Gates

| Defect class | Gate | Input that would make the gate FAIL |
|---|---|---|
| Missed occurrence (British copy survives) | AEC-AC-1 classified audit over the word-list regex | Re-adding `label: 'Programme-level'` or `<h4>Licence:</h4>` produces an unclassifiable hit |
| Over-replacement (identifier/key/field renamed) | Compile + jest (AEC-AC-2) + guard: post-change grep counts of `programmeCode|ProgrammeResults|pr\.programmeResults|\.licence|s7_kp_licence` equal pre-change baseline | Renaming the `licence` field drops its count and breaks the CGSpace mapping compile |
| Stale test pins | AEC-AC-2 jest run | A spec still asserting "programme's 2026 ToC" fails red |
| Transforming bound data | No automated gate — **human diff check at the HITL pause**: no new pipes/transform functions on interpolated values | A diff adding a text-transform on a binding |
| Incomplete word list (British word not on the list) | Partially covered — the list came from a ~50-stem sweep of this codebase; a word outside it is a **recorded residual risk**, handled as follow-up if QA reports one | — (explicit blind spot) |
| DB-stored copy outside repo | **Accepted risk** (proposal §12) | — (explicit blind spot) |

The audit is a classification, not a bare presence check: every remaining hit must land in an allowlist category; an exit-0 grep with unclassified hits is inconclusive and MUST be reported as such, never passed.

## 10. Requirement ID Index

| ID | Summary | Scenario(s) | Covered by task |
|---|---|---|---|
| AEC-R-1 | American spelling in all rendered copy (word list) | Reported label · Licence display copy · Platform-wide sweep | AEC-T-1, AEC-T-2 |
| AEC-R-2 | Copy-only; no structural/field/persisted-key change | No structural change | AEC-T-1, AEC-T-2 |
| AEC-R-3 | Tests updated, suite green | — | AEC-T-1 |
