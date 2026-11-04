# Proposal — Program full names next to codes (Part 2)

**In one line:** finish Nicoleta's request by showing `CODE - Name` on the screens that still print a bare P/A code. On most of them the server already joins `clarisa_initiatives` and only needs to return `ci.name` / `ci.short_name` as well. The client then reuses Part 1's `scienceProgramLabel` / `spLabel`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `results/program-full-names-labels-part-2` |
| Type | Change |
| Approval Mode | gated |
| Status | `approved` → specified (2026-10-13) |
| Requested by | Nicoleta Trifa: *"Please make sure all data fields/filters have the full names, not just codes"* (no Jira ticket) |
| Depends on | `results/program-full-names-labels` (Part 1, archived `docs/specs/archive/2026-10-13-results--program-full-names-labels/`, commit `44a7528a1`) |
| Parallel-safe | no: it touches shared result/IPSR repositories |

## 2. Intent

Every place where a user reads a Science Program or Accelerator should show its name, not just its code. Part 1 covered the sites where the client already had the name. Part 2 covers the rest.

## 3. Problem / Current Behavior

A code-level sweep (2026-10-13) found three groups:

| Group | What happens today |
|---|---|
| **A. Server gap** | The API returns only `official_code`, although the SQL already joins `clarisa_initiatives` (or a correlated subquery could add the name). |
| **B. Client-only leftovers** | The name is already in the client data. Part 1's sweep did not list these sites. |
| **C. Real bug** | The IPSR package detail header ("Submitter") binds `detailData.official_code`, a field the API does not return, so it renders **blank**. |

Two of Part 1's candidate sites turned out **not to be sites**:
- the completeness "History of submissions" modal shows no P/A code;
- "history of changes" is the bilateral review history (both entries in Part 1's list were the same data).

## 4. Proposed Outcome

On every in-scope site the user reads `SP10 - Gender Equality and Inclusion` instead of `SP10`, with the same rule and fallback as Part 1: no name → code only, and no `undefined`/`null`. Filter values, ids, routing keys and export columns are unchanged.

## 5. Scope

Sites are grouped by priority (MoSCoW), so the tail can be trimmed at `/akili-specify` without re-proposing. Paths: `C:` = `onecgiar-pr-client/src/app/`, `S:` = `onecgiar-pr-server/src/`.

### Must

| # | Site | Client | Server change |
|---|---|---|---|
| M1 | IPSR Innovation Package list, **Submitter** column (+ update-ipsr modal) | `innovation-package-custom-table` | `ipsr.repository.ts` `getAllInnovationPackages`: add `ci.name`, `ci.short_name` (join exists, line ~689) |
| M2 | Completeness status, **Submitter** column (admin + init-admin share one component) | `global-completeness-status` | `admin-panel.repository.ts` `reportResultCompleteness`: add `ci.name` (join exists) |
| M3 | Outcome-indicator details table, **Submitter** column | `details-table` (+ rows added from the modal) | `contribution-to-indicator-result.repository.ts` `getContributingResultsQuery`: add `main_ci.name` in **both** UNION branches |
| M4 | Bilateral review history (results list + rejection notice) | `bilateral-results-list`, `bilateral-rejection-notice` | `result-review-history.repository.ts` `getReviewHistoryByResultId`: add `ci.name` (join exists; the webhook caller ignores extra columns) |
| M5 | IPSR package detail header, **Submitter** (bug C) | `innovation-package-detail.component.html:65` | none: API already returns `initiative_official_code` + `initiative_name` |
| M6 | IPSR step 2, complementary-innovations **Lead** column | `table-innovation` | none: API already returns `initiative_name` |

### Should

| # | Site | Server change |
|---|---|---|
| S1 | IPSR creator: innovation picker **Lead**, selected-core chip; step 1 core chip; step 2 selected chips | `ipsr.repository.ts` `getResultsInnovation` (two correlated subqueries), `getResultInnovationById`, `getInnovationCoreStepOne`, `getStepTwoOne` |
| S2 | IPSR notifications ("Request from SPxx…") | `share-result-request.repository.ts` `getRequestByUser` / `getPendingByUser`: add names (joins exist; queries shared with results notifications, additive only) |
| S3 | AI job cards (bilateral AI queue) | `bilateral-ai.service.ts` `listJobs`: batched name lookup by `program_code` (no join today). **`/api/bilateral/*` contract**: change-log row in `bilateral-result-summaries.en.md` + fixture test |
| S4 | Client-only leftovers (group B) | none. Covers: shell-topbar / header-panel role menu; `rd-contributors-and-partners` SP chips; `update-notification`; `manage-user-modal` `display_label` (old `CODE Name` format); phase-detail toast; bilateral primary-assignment banners (`section-zero-dashboard`, `section-contributors`, via the context SP list); `ipsr-list-filter.service.ts` `buildIpsrProgramOptions` + its stale comment; the lab-report-form ToC-branch select (`full_name` → `sp_label`, plus `sp_label` on the "Other(s)" sentinel) |

### Could (default: out unless Nicoleta asks)

- Dropdowns still on the legacy `full_name` (`CODE - <b>short</b> - Name`, which is not bare): outcome-indicator header, type-one-report, quality-assurance.
- Sites showing `CODE short_name` (short name instead of full name): ipsr-contributors, rd-contributors line 528, result-review-drawer, ToC initiative components.
- The compact `bell-program-chip` in the header pop-up.

## 6. Non-Goals

- Excel/CSV exports keep the code column, as in Part 1 DD-5. Notably the completeness client-side Excel and the outcome-indicator `_flattenedResultsQuery` exports.
- No change to filter values, ids, routing keys or query params.
- No new P/A data source and no DB schema or migration change.
- Center acronyms (`center_acronym`) are Centers, not P/A, and stay out.

## 7. Affected Users, Systems, And Specs

- **Users:** SP/PMU leads (IPSR, outcome indicators), admins (completeness), Centers and bilateral reviewers (review history, AI queue).
- **Server modules:** `ipsr`, `results/admin-panel`, `contribution-to-indicators`, `results/result-review-history`, `results/share-result-request`, `bilateral-ai`.
- **Client modules:** `ipsr`, `shared/global-completeness-status`, `outcome-indicator`, `bilateral`, shell/header, `result-detail` contributors, admin.
- **Specs:** Part 1 (shared rule, DD-5 exports); `bilateral-result-summaries.en.md` (S3 only).

## 8. Visual Reference

- Source: None
- Location: —
- Notes: same `CODE - Name` text treatment as Part 1. Narrow table columns reuse Part 1's ellipsis + `title` pattern. No new component.

## 9. Requirement Delta Preview

### ADDED Requirements
- API responses for M1–M4 and S1–S3 include the P/A name alongside the code (additive fields).

### MODIFIED Requirements
- In-scope sites render the P/A label (`CODE - Name`) through the shared rule instead of the bare code.
- The IPSR package detail header shows the submitter label instead of a blank (M5).
- Old `CODE Name` / `CODE short_name` displayNames in scope (S4) switch to `CODE - Name`.

### REMOVED Requirements
- None.

## 10. Approach Options

| Option | How | Trade-off |
|---|---|---|
| **A. Extend the existing queries** (recommended) | Add `ci.name` (and `ci.short_name` where useful) to each query that already joins `clarisa_initiatives`, plus a batched lookup for AI jobs. The client maps through `scienceProgramLabel` / `spLabel`. | Small, additive and local; each site is one SELECT column plus one binding. Touches several repositories. |
| B. Client-side lookup by code | Fetch the initiatives catalogue once (`GET_AllInitiatives`) and resolve names by `official_code` in a shared client service. | No server change, but a second source of truth. It misses names for other phases/portfolios unless the catalogue spans them, and adds load-order coupling. |
| C. One shared server helper | A SQL fragment or view that every query joins. | Over-engineered for ~8 additive columns, and the raw-SQL repositories don't share a builder. |

## 11. Recommended Approach

**Option A**, specified as **one spec with tasks grouped by area**: server+client per module, then the client-only leftovers. Must comes first, so a trim at the Should line still ships a coherent increment.

Expected shape (refined in `/akili-specify`):

1. IPSR server + client (M1, M5, M6, S1).
2. Completeness + review history (M2, M4).
3. Outcome-indicator details (M3).
4. IPSR notifications + AI job cards (S2, S3, with the contract change-log).
5. Client-only leftovers (S4).

Kaizen carry-forward (Part 1 entry, still pending apply on `staging`):
- **KZ-results--program-full-names-labels-1:** lint with `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`.
- **KZ-results--program-full-names-labels-2:** budget test LOC at 2–3× production.
- **KZ-results--program-full-names-labels-3:** drive chip/filter falsifiers through the real control.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Mitigation |
|---|---|---|
| R1 | **M3 query is shared** with the outcome/EOI exports (`_flattenedResultsQuery`) | Add the column only where needed; keep `result_submitter` unchanged; scoped server specs on both callers |
| R2 | **S2 queries are shared** with the results notifications flow | Additive columns only; existing notification specs must stay green |
| R3 | **S3 changes a `/api/bilateral/*` payload** | Change-log row in `bilateral-result-summaries.en.md` (mandatory per root CLAUDE.md) + fixture test |
| R4 | `admin-panel.repository.ts` interpolates ids straight into SQL (pre-existing) | Do not widen it; only add the SELECT column. Flagged, not fixed here |
| R5 | Locally created IPSR rows use code `INIT-0<id>` with no name | Fallback shows the code (PFN-R-2 behaviour) |
| R6 | Budget: ~10 server queries + ~15 client sites is larger than Part 1 | Must/Should split; recommend trimming S3/S4 if the budget tripwire fires |
| OQ1 | Does Nicoleta need every Should item, or only the Must tables? | Ask her with Part 1's screenshot; the default proposal keeps Must + Should |
| OQ2 | AI job cards: is the SP name worth a bilateral contract change, or is the card title enough? | Decide at `/akili-specify`; S3 can be dropped cleanly |
| OQ3 | P25 IPSR creator endpoint (`v2 ipsr-framework/...`) was not checked for S1 | Verify during specify |

## 13. Success Criteria

- Every Must and Should site renders `CODE - Name`, with code-only fallback and never `undefined`/`null`.
- The IPSR package detail header shows the submitter (no blank).
- Server responses are additive: existing server and client specs on values and payloads stay green.
- `bilateral-result-summaries.en.md` change-log is updated if S3 ships.
- Exports are unchanged.

## 14. Next Step

```text
/akili-specify results/program-full-names-labels-part-2
```
