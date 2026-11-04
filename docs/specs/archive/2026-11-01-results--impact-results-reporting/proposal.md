# Proposal — Impact Results Reporting (P2-3901)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/results/impact-results-reporting` |
| **Slug** | `impact-results-reporting` — derived from free-text argument (Jira URL P2-3901 + "implementarlo de la mejor forma") |
| **Type** | Change |
| **Approval Mode** | gated (default) |
| **Date** | 2026-10-29 |
| **Ticket** | [P2-3901](https://cgiarmel.atlassian.net/browse/P2-3901) — User Story, parent epic P2-3094 (Q4 2026 Strategic Enhancements). Spec updated 2026-10-28 (Nicoleta's field list + James Hammond's typology) |
| **Requester** | Angel Jarrin (BA) on behalf of Nicoleta / PMU |
| **Visual source** | *Impact Results Reporting — User Guide*, **Version 2, 2026-10-29** (supersedes v1 of 2026-10-20) |
| **Packages** | `onecgiar-pr-server` + `onecgiar-pr-client` |
| **Depends on** | none |
| **Parallel-safe** | no (touches result creation, P25 validation functions, contributors section) |
| **Proposed split** | 3 child specs — see §11 (pending approval; no `family.md` written yet) |

---

## 2. Intent

Let a Science Program report a result **at impact level** from its Reporting page, using the **standard result form** (not a separate one), so long-term change CGIAR research contributed to is captured in PRMS instead of outside it. Capability matters more than volume: Nicoleta expects few or no impact results this year — *"we just need to have it as an option."*

---

## 3. Problem / Current Behavior

| Today | Evidence |
|---|---|
| No way to create an impact-level result. The creator only offers levels 3 and 4 | client `result-level.service.ts:12-16, :84` |
| The data model **already has** level `Impact` (id 1) and type `Impact Contribution` (id 9), linked in `result_by_level (1,9)` | server `migrations/1665720566708-insertResultLevelType.ts:36, :76, :125`; `ResultLevelEnum.IMPACT=1`, `ResultTypeEnum.IMPACT_CONTRIBUTION=9` |
| Type 9 has no type-specific table, no info page and no `validation_*_P25` function | server report §1, §6 |
| SP Reporting cards are `aow \| intermediate \| 2030`; no impact card | `reporting-aow-table.component.ts:104` |
| Every V2-created result gets a `results_toc_result` row with `planned_result=false`; `validation_contributor_partner_P25` then requires a ToC narrative → an impact result would **never turn green** | `results.service.ts:3373-3381`; `migrations/1762866499786-updatepartnersContributors.ts:37-39` |
| P25 linked-results search returns all P25 results but only Innovation Dev/Use from P22–P24 → BR8 ("any portfolio") not met | `results.controller.ts:743` |
| Geography offers Global / Regional / Country / Sub-national / TBD with no per-type restriction | `geoscope-management.component.ts:30-35` |

---

## 4. Proposed Outcome

Behavior as described in User Guide v2 and P2-3901 AC 1–19:

1. **Entry point** — SP Reporting page shows an **Impact results** card after *2030 outcomes* (sibling, not nested): `IMPACT` tag, "5 Impact Areas · no targets", `NEW` chip, one row per CGIAR Impact Area with its result count and a **Report result** action.
2. **Creation** — *Report result* opens the standard report drawer in **impact mode**: level 1 / type 9 fixed, no indicator, no target fields; the chosen Impact Area travels in the payload.
3. **Result detail — five sections, in this order:**

| # | Section | Impact-specific behavior |
|---|---|---|
| 1 | General information | Chosen area pre-scored **2 – Principal**, the other four **0**; editable; sub-component required for every area at 2 (rule already exists) |
| 2 | Contributors & partners | **No ToC block**; Centers, SP/Accelerator, W3/bilateral project, external partners as usual, with copy stating "whole intervention and scaling endeavour" |
| 3 | Geographic location | **Regional and Country only** (no Global, Sub-national, TBD) |
| 4 | Evidence | Standard, with impact copy ("include the MELIA study…") |
| 5 | **Impact level info** (new) | Type of impact result (Learning / Accountability study, definitions shown) · CGIAR's contribution (≤ 100 words, live word counter) · *Already reported in PRMS?* Yes/No → on Yes, a searchable multi-select of results from **any phase/portfolio**, filters *Phase/portfolio* + *Result type*, current phase first, selected list with remove, **Done** |

4. **Submit** through the normal flow once all five sections are green.
5. **Identifiable** as an impact result in the sidebar badge (`IMPACT RESULT`), the result header (`Impact · Impact Area <name>`), the Results Center and the SP Results tab.

---

## 5. Scope

**In scope**

- Server: impact-mode creation with score prefill; new `impact-level-info` persistence + catalog; P25 green check for the new section; ToC exemption in the contributors validation for type 9; geography guard; cross-portfolio result search; per-Impact-Area counts for the SP card.
- Client: Impact results card; impact mode in the report form; new `impact-level-info` page; section order and ToC/geo restrictions for type 9; BR9 labels in lists and header.
- Tests per package gates (server Jest, client Jest; CT for the new page).

---

## 6. Non-Goals

- **Targets** of any kind for impact results (BR1).
- Quality-assessment behaviour for impact results (guide v2 last page; ticket "Not in scope").
- Public dashboard / bilateral / platform-report payloads — the new table lives outside `summary/`, so `bilateral-result-summaries.en.md` is untouched.
- The **indicator/topic** field and "additional impact-specific fields" from v1 — removed in v2.
- Adding a server-side completeness guard to `submitFunction` (pre-existing gap for **all** result types — see Risk R3; separate ticket).
- Authoring new definitions for the study types (adopted as written by James Hammond).

---

## 7. Affected Users, Systems, And Specs

| Area | Files / modules (from code exploration) |
|---|---|
| Creation (server) | `results-framework-reporting/create` → `create-result-from-framework.handler.ts`, `results.service.ts` `createOwnerResult` / `createOwnerResultV2`, `create-results-framework.dto.ts` |
| Impact area scores | `result` `*_tag_level_id` (tag = score+1), `result_impact_area_score`, `validation_general_information_P25` (unchanged) |
| Green checks | `results-validation-module.repository.ts:48-85`, `validation_maps`, `validate_sections_mapped_batch`, `validation_contributor_partner_P25`, `validation_geo_location_P25` |
| Linked / previous results | `linked_result`, `ContributorsPartnersService` (single writer for innovation-use links), `results.controller.ts:743` |
| SP Reporting (client) | `dashboard-lab.component.{ts,html}`, `reporting-aow-table.component.{ts,html}`, `indicator-drawer`, `lab-report-form`, `create-result-payload.util.ts` |
| Result detail (client) | `routing-data.ts` (`rdResultTypesPages`, `resultDetailRouting`), `result-sections.service.ts`, `rd-general-information`, `rd-contributors-and-partners`, `rd-geographic-location` / `geoscope-management`, `rd-evidences` |
| Lists | `results-list.component`, `programme-results` (+ filter service, section labels), `result-header` |
| Related specs | archive `2026-08-26-results--bugfix-impact-area-scores`; `results/linked-results-filters` |
| Users | SP submitters (create/edit), PMU (reads lists) |

---

## 8. Visual Reference

- **Source:** User Guide (design mockup screenshots, sample data).
- **Location:** `C:\Users\santiagosanchez\Downloads\Impact Results Reporting - User Guide (3).pdf` — v2, 2026-10-29. *Recommend copying it to `docs/specs/results/impact-results-reporting/evidence/impact-results-user-guide-v2.pdf` so it survives with the spec (4.3 MB — pending user decision).*
- **Screens covered:** Reporting page Impact results card · General info scores + sub-component · Impact level info (type dropdown with definitions, 100-word counter, Yes/No, results picker with filters and selected list) · Evidence with MELIA copy · Submit.
- v1 (2026-10-20) is **superseded** and must not be used.

---

## 9. Requirement Delta Preview

### ADDED

- **R-A1** Impact results card on SP Reporting (AC 1–2), with per-area counts.
- **R-A2** Impact-mode creation: level 1 / type 9, carries `impact_area_id`, no target/indicator inputs (AC 3, 17).
- **R-A3** Score prefill at creation: chosen area tag 3, others tag 1 — only on create, never overwriting (AC 4–5).
- **R-A4** `Impact level info` section, type 9 only (AC 11–16), stored in a new `results_impact_level` table + `impact_study_type` catalog (2 rows with definitions) + `results_impact_previous_result` join table (N rows, points to a specific `result.id`).
- **R-A5** Cross-portfolio result search endpoint for the picker (query, phase/portfolio, type; current phase first; paginated) (AC 15, BR8).
- **R-A6** `validation_impact_level_P25` + `validation_maps` row `impact-level-info` (AC 18).
- **R-A7** BR9 display: "Impact result" label/badge in header, sidebar, Results Center, SP Results (own category/section key instead of "Other") (AC 19).

### MODIFIED

- **R-M1** Contributors & partners hides the ToC block (and the generic "linked results" question, see OQ-2) for type 9; `validation_contributor_partner_P25` skips ToC checks for type 9 (AC 7–8).
- **R-M2** Geography for type 9 limited to Regional / Country, client option filter + server guard + `validation_geo_location_P25` (AC 9, BR6).
- **R-M3** Section order for type 9: Evidence (4) before Impact level info (5).
- **R-M4** Evidence info copy for type 9 (AC 10, behavior unchanged).

### REMOVED

- none.

---

## 10. Approach Options

| | A — Reuse level 1 / type 9 + dedicated impact tables **(recommended)** | B — Reuse `linked_result` + existing Contributors linking UI | C — New result type (e.g. 12 "Impact result") |
|---|---|---|---|
| Model | New `results_impact_level`, `impact_study_type`, `results_impact_previous_result` | Previous results stored in `linked_result` | New type + level link + everything below |
| Fit to BR8 (any portfolio, specific phase row) | ✅ stores the exact `result.id` shown in the picker | ❌ `linked_result` resolves a code to its newest version, and the search excludes non-innovation P22–P24 types | ✅ |
| Collision risk | Low — new writer, new tables | **High** — `ContributorsPartnersService` is the single writer of `linked_result`; two sections would overwrite each other | Low |
| Reuse | Type 9 already wired in delete/recover, bilateral filter, qa-catalog, portfolio label map | Max reuse | Duplicates type 9 wiring; type 9 left orphaned |
| Cost | Medium | Low upfront, high hidden | Highest |

**Why A:** the catalog rows already exist, so no taxonomy change; dedicated tables keep the impact section's writes isolated from the contributors single-writer (no data races), and they store the exact phase row the user picked, which is what the guide shows (`#9821 · Reporting 2026 · P25`). It is the smallest change that meets every AC without bending an existing contract.

---

## 11. Recommended Approach — and split into 3 child specs

| # | Child spec | Content | Depends on | Parallel-safe |
|---|---|---|---|---|
| 1 | `results/impact-results-reporting/server-foundation` | Create with `impact_area_id` + prefill; migration (3 tables + catalog seed + `validation_maps` row + `validation_impact_level_P25` + updated `validation_contributor_partner_P25` / `validation_geo_location_P25` with working `down`); impact-level GET/PATCH (100-word guard); geo guard; cross-portfolio search; per-area counts | none | no |
| 2 | `results/impact-results-reporting/sp-reporting-entry` | Impact results card (4th `kind`), impact mode in `lab-report-form` / payload util, navigation to detail | 1 | yes (with 3) |
| 3 | `results/impact-results-reporting/result-detail-impact` | `impact-level-info` page + picker; section order; hide ToC/linked block in contributors; geo option filter; evidence copy; BR9 labels | 1 | yes (with 2) |

Build order by MoSCoW: all three are **Must** (AC 1–19 span them); 1 is the foundation, 2 and 3 can run in parallel worktrees afterwards.

---

## 12. Risks, Dependencies, And Open Questions

| ID | Risk / question | Mitigation / owner |
|---|---|---|
| **R1** | Live DB may differ from seed migrations (`result_by_level (1,9)`, `result_type 9 is_active`). Some `_P25` function bodies are **not in the repo** (`result-questions/CLAUDE.md:64-69`) | Read live rows and live function bodies before writing the migration (memory: *verify SQL fixes against real data*) |
| **R2** | Existing type-9 rows (likely P22) — new required section must not turn them red | Section is mapped only for P25; verify row counts per portfolio |
| **R3** | Server `submitFunction` does not check completeness — only the client blocks Submit | Out of scope here; raise a separate ticket (affects all types) |
| **R4** | Phase rollover / replication: new tables must be copied (or not) when results are versioned (W2) | **OQ-3** |
| **R5** | Shared prdb: browser checks must not click write buttons (memory) | Verify via served bundle + Jest/CT |
| **OQ-1** | Card counts: count by **Principal score per area** (a result scored 2 in two areas counts in both) or by the **entry-point area** (needs storing it)? | Recommend Principal score — no extra column, reflects the edited truth. Angel/Nicoleta |
| **OQ-2** | P25 Contributors already has a "linked results" question for 2026+. Hide it for impact results (Impact level info replaces it) or keep both? | Recommend hide — avoids two "link results" questions. Angel |
| **OQ-3** | Should impact results replicate into the next phase like innovations? | Nicoleta |
| **OQ-4** | Label in lists: "Impact result" (display) vs DB name "Impact Contribution" — rename the DB row? | Recommend client display label only; DB rename would change exports/bilateral. Angel |
| **OQ-5** | Who may report: any SP member with `canReportResults`, same as 2030 outcomes? | Assume yes |
| **OQ-6** | Picker scope: include results in Editing status, or only QA'ed/Submitted? Guide shows "reported results" | Recommend all non-deleted results, status shown as a chip. Angel |

---

## 13. Success Criteria

- AC 1–19 of P2-3901 pass on PRTest, walked step by step against User Guide v2.
- An impact result created from the card reaches **5 of 5 sections complete** with no ToC data and can be submitted.
- Non-impact results: zero behavior change (regression on contributors, geography and general-info validations).
- `npm run migration:check:ci` green; touched specs green with `--findRelatedTests`.

---

## 14. Next Step

After approval (and answers to OQ-1…OQ-6, or acceptance of the recommended defaults):

```text
/akili-specify results/impact-results-reporting
```

That writes `family.md` with the three children of §11, then specifies child 1 (`server-foundation`) first.
