# Requirements — Impact Results: Result Detail

## 1. Module / Feature

| Field | Value |
|---|---|
| **Module** | `onecgiar-pr-client` — `pages/results/pages/result-detail` (sections, header, sidebar) + `pages/results` list + SP Results tab |
| **Sub-feature** | Impact results — result detail (child 3 of 3, see [`../family.md`](../family.md)) |
| **Owner** | Santiago Sanchez |
| **Status** | approved (2026-10-31) |
| **Ticket** | P2-3901 (AC 6–16, 18–19) |
| **Depth** | **Standard** — client-only, consumes server contracts E2–E5 and the green checks already live on PRTest (child #1 `done`) |
| **Type / Approval Mode** | Change · gated (inherited from [`../proposal.md`](../proposal.md)) |
| **Visual source** | User Guide v2 (2026-10-29), steps 2–7. The PDF is **not in the repo**; screen anatomy comes from proposal §4.3 and the server contracts. Exact copy marked *(guide)* is confirmed at the HITL pause |

**Requirement prefix:** `IRD` (Impact Results — Detail).

---

## 2. Executive Summary

When a P25 **impact result** (level 1 / type 9) is opened, its detail page has five sections in this order: General information, Contributors & partners, Geographic location, Evidence, and a new **Impact level info** section.

| Section | What changes for impact results |
|---|---|
| Impact level info (new) | Study type (Learning / Accountability, with its definition shown), CGIAR contribution (≤ 100 words, live counter), and "Already reported in PRMS?" Yes/No. On Yes, a picker searches results from any phase or portfolio |
| Contributors & partners | No Theory of Change block and no generic "linked results" question |
| Geographic location | Offers only Regional and Country |
| Evidence | Shows MELIA copy |

Everywhere the result appears it reads as an **Impact result**: sidebar badge, header, Results Center, and SP Results tab. Every other result type behaves exactly as today.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Impact result** | P25 result with level 1 (Impact) and type 9 (Impact contribution) |
| **Impact level info** | New detail section, route path `impact-level-info`, green check key `impact-level-info` |
| **Study type** | Catalog value: 1 Learning study, 2 Accountability study (E2), each with a definition |
| **CGIAR contribution** | Free text statement, 1–100 words |
| **Previous results** | Results already reported in PRMS that this impact result builds on. Each is a specific phase row (`result.id`), from any portfolio and type |
| **Principal area** | An Impact Area whose score on the result is **2 – Principal** (tag 3) |
| **E2–E5** | Server contracts from child #1 ([`../server-foundation/design.md`](../server-foundation/design.md) §4): E2 `GET impact-level/study-types` · E3 `GET impact-level/get/result/:id` · E4 `PATCH impact-level/save/result/:id` · E5 `GET impact-level/previous-results/search` |

---

## 4. System Context & Scope

- **PRD:** G1 (submission completeness); US-S1/US-S2 (fill and submit a result); AC-1 (typed result integrity); AC-6 (completeness at submit).
- **TRD:** client result-detail module; W1 result lifecycle (fill → green checks → submit).
- **UX:** `docs/ux-ui/design.md` form, section and sidebar patterns; User Guide v2 steps 2–7.
- **Server:** E2–E5, the `impact-level-info` green check, the contributors ToC exemption, and the geography guard ([`../server-foundation/`](../server-foundation/)). All of these are already live.

### In scope

- The Impact level info page: form, word counter, Yes/No, previous-results picker, save, and green check refresh.
- Section order and visibility for impact results.
- Contributors & partners: hide the ToC block and the generic linked-results question; save without those fields.
- Geographic location: limit the options to Regional and Country.
- Evidence: impact copy.
- BR9 labels: sidebar badge, header, Results Center, SP Results tab.
- A warning before changing the type of an impact result, because that change deletes its impact data.

### Out of scope

- Any server change. Server gaps found here are recorded in §10; they are not fixed in this spec.
- General information scoring. The prefill already ships from child #1, and the existing "sub-component required at Principal" rule is unchanged.
- QA behavior for impact results (proposal non-goal), including adding the two new tables to the QA catalog scope (see IRD-OQ-3).
- Phase replication (proposal OQ-3, still with Nicoleta).
- P22–P24 type-9 results: they keep today's sections.
- Renaming the DB `result_type` row (proposal OQ-4: display label only).

---

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| SP submitter | Fills the five impact sections and submits once all are green |
| Reader without edit rights / guest | Sees the same sections read-only |
| PMU lead | Identifies impact results in the Results Center and the SP Results tab |

**IRD-US-1** — As an SP submitter, I want an Impact level info section that captures the study type, CGIAR's contribution, and the results already reported, so that the impact claim is complete and traceable.
**IRD-US-2** — As an SP submitter, I want the impact result form to hide questions that do not apply (ToC, generic linked results, Global or Sub-national geography), so that I can reach 5/5 green without workarounds.
**IRD-US-3** — As a PMU lead, I want impact results labelled as such in every list, so that I can find them without opening each result.

---

## 6. Functional Requirements

### Requirement IRD-R-1: Section set and order (MUST)

For a P25 impact result, the detail sidebar SHALL list exactly these sections in order: General information, Contributors & partners, Geographic location, Evidence, Impact level info. Each section SHALL show its green check from the server.

#### Scenario 1.1: P25 impact result

- GIVEN a P25 result with type 9
- WHEN the detail page opens
- THEN the sidebar shows the five sections in the order above
- AND Impact level info is the last section, after Evidence
- BUT it must NOT show Theory of Change, Links to results, or any other type page

#### Scenario 1.2: Other results unchanged

- GIVEN a P25 result of any other type, or a P22–P24 type-9 result
- WHEN the detail page opens
- THEN its sections and order are the same as before this change
- AND IT MUST NOT show Impact level info

---

### Requirement IRD-R-2: Impact level info — load (MUST)

The section SHALL load the study-type catalog (E2) and the stored values (E3) and show the form with those values.

#### Scenario 2.1: First visit

- GIVEN a new impact result with nothing saved yet
- WHEN the user opens Impact level info
- THEN the study type is empty, the contribution is empty with the counter at 0 / 100, and "Already reported in PRMS?" has no answer

#### Scenario 2.2: Saved values

- GIVEN saved values (type, statement, Yes, 2 previous results)
- WHEN the section opens
- THEN all four values show, including the 2 previous results as removable items with code, title, type, phase, portfolio and status

#### Scenario 2.3: Load fails

- GIVEN E2 or E3 fails
- WHEN the section opens
- THEN an error message shows and save is unavailable
- BUT it must NOT show an empty form as if nothing were saved

While the data loads, the section SHALL show its loading skeleton.

---

### Requirement IRD-R-3: Study type (MUST)

The user SHALL choose one study type from the catalog. The definition of each type SHALL be visible to the user (guide: definitions shown next to or under the options).

#### Scenario 3.1: Choose type

- GIVEN the catalog has Learning study and Accountability study
- WHEN the user picks one
- THEN that value is selected and its definition is visible

---

### Requirement IRD-R-4: CGIAR contribution with word limit (MUST)

The statement SHALL accept up to **100 words**, with a live counter. Words are counted the way the server counts them.

#### Scenario 4.1: Within limit

- GIVEN the user types 87 words
- THEN the counter shows 87 / 100 and save is allowed

#### Scenario 4.2: Over limit

- GIVEN the user types 101 words
- THEN the counter flags the excess and save is blocked with a message
- AND IT MUST use the same word count as the server, so a text the client accepts is never rejected by E4 for word count

---

### Requirement IRD-R-5: Already reported in PRMS (MUST)

The section SHALL ask "Already reported in PRMS?" with Yes/No.

- **Yes:** the user can add previous results with the picker (IRD-R-6) and remove them from the selected list.
- **No:** any selected results are dropped on save. If results are already selected, the user is warned before they are discarded.

#### Scenario 5.1: Switch Yes → No with links

- GIVEN Yes with 2 selected results
- WHEN the user switches to No and saves
- THEN the save sends No and the stored links are cleared
- AND the user was told the 2 links will be removed

---

### Requirement IRD-R-6: Previous-results picker (MUST)

On Yes, the user SHALL be able to search results from **any phase and any portfolio** (E5).

| Element | Behavior |
|---|---|
| Search | By title or exact result code |
| Filters | Phase/portfolio, and result type |
| Results order | Open reporting phase first (server order) |
| Each item | Code, title, type, phase, portfolio, status |
| Selected list | Items can be added and removed; nothing is stored until the section is saved |
| Done | Closes the picker and keeps the selection |
| Paging | Supported for long lists |

The current result SHALL never be offered.

#### Scenario 6.1: Search across portfolios

- GIVEN the user searches "rice"
- WHEN results return
- THEN items from P22–P25 appear, current phase first, each with its phase and portfolio

#### Scenario 6.2: Add, remove, Done

- GIVEN 3 items added and 1 removed
- WHEN the user clicks Done and saves
- THEN exactly the 2 remaining results are stored

#### Scenario 6.3: No matches

- GIVEN a search with no matches
- THEN an empty-state message shows

#### Scenario 6.4: Already selected

- GIVEN a result already in the selected list
- THEN it shows as selected in the search results and cannot be added twice

---

### Requirement IRD-R-7: Save and green check (MUST)

Save SHALL send the section to E4, show success or the server's error message, and refresh the green checks. After a successful save, the section SHALL turn green exactly when the server rule is met:

- a study type is set;
- the statement has 1–100 words;
- the Yes/No question is answered;
- No is answered, or at least one previous result is selected.

Unsaved changes SHALL be protected like the other sections (leave-page guard).

#### Scenario 7.1: Complete

- GIVEN type set, 40 words, Yes with 1 result
- WHEN the user saves
- THEN a success message shows and the Impact level info check turns green

#### Scenario 7.2: Incomplete

- GIVEN Yes with no results
- WHEN the user saves
- THEN the save succeeds and the check stays not-green
- BUT it must NOT block saving partial data

#### Scenario 7.3: Server error

- GIVEN E4 returns 400 (for example "Previous results do not exist or are inactive: 123")
- THEN the server's message is shown and the form keeps the user's input

---

### Requirement IRD-R-8: Contributors & partners without ToC (MUST)

For an impact result, Contributors & partners SHALL hide the whole ToC block and the generic linked-results question. The ToC block covers:

- the planned-result question;
- the financial-resources question;
- the work-package / ToC selector;
- "Why is the result being reported?".

Centers, SP/Accelerator, W3/bilateral projects and external partners stay as today. Save SHALL NOT send the hidden linked-results fields. The section SHALL be able to turn green with no ToC data. Copy SHALL tell the user to cover the whole intervention and scaling endeavour *(guide)*.

#### Scenario 8.1: Impact result

- GIVEN an impact result
- WHEN Contributors & partners opens
- THEN no ToC question and no linked-results question is shown
- AND after the partners are filled and the section is saved, the check turns green

#### Scenario 8.2: Other types unchanged

- GIVEN a P25 type 1 result
- THEN the ToC block and the linked-results question show as before

---

### Requirement IRD-R-9: Geography — Regional and Country only (MUST)

For an impact result, Geographic location SHALL offer only Regional and Country. Global, Sub-national and "To be determined" are not offered. This applies to both the main scope question and the extra-scope question.

#### Scenario 9.1: Options

- GIVEN an impact result
- WHEN Geographic location opens
- THEN only Regional and Country can be chosen

#### Scenario 9.2: Legacy value outside the set

- GIVEN a stored scope of Global (for example a phase copy)
- WHEN the section opens
- THEN no allowed option is preselected, the user is asked to pick Regional or Country, and the check stays red until saved
- AND IT MUST NOT silently change the stored value without a save

#### Scenario 9.3: Other types unchanged

- GIVEN any non-impact result
- THEN the scope options are the same as today

---

### Requirement IRD-R-10: Evidence copy (MUST)

For an impact result, the Evidence info box SHALL add the impact guidance: include the MELIA study or evaluation that documents the impact *(guide — exact text confirmed at HITL)*. Evidence behavior and rules are unchanged.

---

### Requirement IRD-R-11: Impact result labels — BR9 (MUST)

| Place | Shows |
|---|---|
| Detail sidebar badge | `IMPACT RESULT` |
| Result header | `Impact · Impact Area <name>`, where `<name>` is the Principal area. If there are several Principal areas, their names are joined. If there is none, the header shows `Impact` only |
| Results Center | "Impact result" as the type label |
| SP Results tab | "Impact result" as the category, in its own group instead of "Other" |

The DB name "Impact Contribution" SHALL stay unchanged (display label only).

#### Scenario 11.1: Header follows the scores

- GIVEN an impact result whose climate score is 2 and whose other scores are 0
- THEN the header reads `Impact · Impact Area Climate adaptation & mitigation`
- AND if the user later scores gender 2 as well, the header shows both areas

---

### Requirement IRD-R-12: Type-change warning (SHOULD)

When the user changes the type of an impact result, the confirmation SHALL warn that its Impact level info and previous-result links will be deleted.

---

### Requirement IRD-R-13: No regression (MUST)

Results that are not P25 impact results SHALL keep their current sections, order, contributors questions, geography options, evidence copy, labels and save bodies.

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| **IRD-NFR-1** | **Accessibility.** All new controls have labels. The word counter is announced politely. The picker can be used by keyboard: search, filters, add/remove, Done. Removed items keep focus order sane. |
| **IRD-NFR-2** | **Layout.** The new section and the picker work at 1280 px and 900 px width without horizontal scroll. |
| **IRD-NFR-3** | **Styling.** Existing `--pr-*` tokens and the shared form components (`app-pr-select`, `app-pr-textarea`, `app-pr-yes-or-not`); new primitives use Spartan (team rule). |
| **IRD-NFR-4** | **Performance.** E5 is debounced (≥ 300 ms) and paged (≤ 20 per page). The section makes at most one E2 call and one E3 call per open. |
| **IRD-NFR-5** | **Copy.** U.S. English, matching guide v2. |
| **IRD-NFR-6** | **Read-only.** When the result is not editable (submitted, or no rights), all new inputs are disabled, the same as in other sections. |

---

## 8. Defect classes and their gates

| Defect class | Gate |
|---|---|
| Wrong section set or order; impact page shown for non-P25 or other types | Jest: section-filter spec with P25 type 9, P25 type 1, and P22 type 9 |
| Save body wrong (fields, `null` clears, No drops ids, hidden contributors fields sent) | Jest: component and API specs, comparing bodies key by key |
| Word count differs from the server's | Jest: shared counter cases (spaces, line breaks, punctuation, 100 vs 101 words) |
| Picker logic (exclude self, dedupe, remove, Done keeps selection, paging) | Jest: picker spec with mocked E5 |
| Contributors or geo restriction leaking into other types | Jest: contributors and geoscope specs with type 9 and non-9 |
| Green check not refreshed after save | Jest: spy on the green-check reload |
| Labels wrong in header, sidebar, lists | Jest: header, sidebar, results-list and programme-results specs |
| **Visual/layout** (picker look, definitions placement, counter, 900 px) | **No reliable automated check.** Substitute: Cypress CT of the section and picker at 1280 and 900 px, plus a human check at the HITL pause against guide v2 (T6) |
| Real end-to-end: 5/5 green with no ToC, then submit | Manual PRTest walk-through by the user (shared prdb: the user clicks, not the agent) |
| Exact guide copy | Human check at the HITL pause (the PDF is not in the repo) |

Accepted risk: pixel match with the guide and exact copy are human-gated.

---

## 9. Requirement ID Index

| ID | Title | Priority |
|---|---|---|
| IRD-R-1 | Section set and order | MUST |
| IRD-R-2 | Impact level info — load | MUST |
| IRD-R-3 | Study type | MUST |
| IRD-R-4 | Contribution word limit | MUST |
| IRD-R-5 | Already reported Yes/No | MUST |
| IRD-R-6 | Previous-results picker | MUST |
| IRD-R-7 | Save and green check | MUST |
| IRD-R-8 | Contributors without ToC | MUST |
| IRD-R-9 | Geography Regional/Country | MUST |
| IRD-R-10 | Evidence copy | MUST |
| IRD-R-11 | Impact result labels (BR9) | MUST |
| IRD-R-12 | Type-change warning | SHOULD |
| IRD-R-13 | No regression | MUST |
| IRD-NFR-1..6 | A11y, layout, styling, performance, copy, read-only | MUST |

---

## 10. Assumptions, open questions and known server gaps

| ID | Item | Default used |
|---|---|---|
| IRD-A-1 | The header area comes from the Principal score(s), because the result stores no entry-point area | As IRD-R-11 |
| IRD-A-2 | The extra-scope geography question is also limited to Regional/Country | Yes |
| IRD-A-3 | The picker's phase/portfolio filter options come from the existing versioning endpoints; the type filter comes from the result types list | Yes |
| IRD-A-4 | The SP Results tab gets its own "Impact result" group | Yes (proposal R-A7) |
| IRD-OQ-1 | Exact guide copy: Evidence MELIA text, contributors "whole intervention" text, study-type definitions placement | Confirmed by the user at the HITL pause |
| IRD-OQ-2 | Nicoleta: reject a non-empty ToC on create (child #1 decision 1) | Not blocking; the client sends no ToC |
| IRD-OQ-3 | QA catalog: add the two impact tables to the catalog scope (child #1 FP-12) | Out of scope here; separate follow-up with Juan (next catalog revision 33) |
| IRD-G-1 | Server gap: E3 returns linked results that were soft-deleted, with no active flag | Recorded; the client shows what E3 returns |
| IRD-G-2 | Existing gap: the client requires a lead center but `validation_contributor_partner_P25` does not when the result is led by a partner | Unchanged |
