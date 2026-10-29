# Module Spec — `design.md`

## 1. Document Control

- **Module / feature:** `results` / `program-full-names-labels-part-2`
- **Depth:** Standard · **Status:** `approved` (2026-10-13)
- **Linked:** `requirements.md` (PF2-R-1..4, sites M1–M6, S1–S4) · `proposal.md` (Option A) · Part 1 archive (rule + pipe, DD-5)

## 2. Executive Summary

Each server query that already resolves a P/A code also selects the P/A name, as a new alias placed next to the code. AI jobs, which have no join, get one batched lookup. Each client site then swaps its code-only binding for Part 1's `scienceProgramLabel` (in `.ts` mappers) or `spLabel` (in templates). No endpoint, route, schema, migration or existing field changes. The only documented contract touched is the AI-jobs payload under `/api/bilateral/*`.

## 3. Architecture Overview

```
server (additive SELECT)                           client (Part 1 rule)
ipsr.repository ───────────── M1, S1 ───────────▶ ipsr list / creator / steps
admin-panel.repository ────── M2 ───────────────▶ global-completeness-status
contribution-to-indicator-result.repository M3 ─▶ outcome-indicator details-table
result-review-history.repository ── M4 ─────────▶ bilateral-results-list, rejection notice
share-result-request.repository ── S2 ──────────▶ notification-item-innovation
bilateral-ai.service (batched lookup) ── S3 ────▶ ai-job-card, ai-processes-drawer
(no server change) ─────────── M5, M6, S4 ──────▶ already-loaded data
```

P25 IPSR (`v2 ipsr-framework/...`) calls the same `ipsr.repository` methods (`getResultInnovationById`, `getInnovationCoreStepOne`). One server change covers P22 and P25 (proposal OQ3, resolved).

## 4. Directory Structure

Paths: `S:` = `onecgiar-pr-server/src/api/`, `C:` = `onecgiar-pr-client/src/app/`.

| Site | Server file → method (new alias) | Client file(s) |
|---|---|---|
| M1 | `S:ipsr/ipsr.repository.ts` → `getAllInnovationPackages`: add `ci.name AS submitter_name`, `ci.short_name AS submitter_short_name` (join `ci` exists) | `C:pages/ipsr/.../innovation-package-custom-table.component.{ts,html}`; `update-ipsr-result-modal.component.{ts,html}` |
| S1 | same repo → `getResultsInnovation` (both correlated subqueries: add sibling subqueries or a join for `initiative_name`), `getResultInnovationById`, `getInnovationCoreStepOne`, `getStepTwoOne` (add `ci.name`) | `results-innovation-output-list`, `innovation-package-creator`, `step-n1`, `selected-innovations` |
| M2 | `S:results/admin-panel/admin-panel.repository.ts` → `reportResultCompleteness`: add `ci.name AS initiative_name` | `C:shared/components/global-completeness-status/*` |
| M3 | `S:contribution-to-indicators/repositories/contribution-to-indicator-result.repository.ts` → `getContributingResultsQuery`: add `main_ci.name AS result_submitter_name` in **both** UNION branches. `_flattenedResultsQuery` json_object is **not** extended (exports, DD-5) | `C:pages/outcome-indicator/.../details-table/*`, `models/indicator-data.model.ts`, `indicator-results-modal.component.ts` (rows added from the modal), `services/indicator-details.service.ts` |
| M4 | `S:results/result-review-history/result-review-history.repository.ts` → `getReviewHistoryByResultId`: add `ci.name AS initiative_name` | `C:pages/bilateral/services/bilateral-review-history.interface.ts`, `bilateral-results-list.component.html`, `bilateral-rejection-notice.component.html` |
| S2 | `S:results/share-result-request/share-result-request.repository.ts` → `getRequestByUser`, `getPendingByUser`: add `ci.name` / `ci2.name` as `requester_name` / `approving_name` (joins exist) | `C:.../notification-item-innovation/*` |
| S3 | `S:bilateral-ai/services/bilateral-ai.service.ts` → `listJobs` (+ single-job projection): batched `clarisa_initiatives` lookup by `program_code` → `program_name`; contract doc `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | `C:pages/bilateral/bilateral-ai-job.model.ts`, `ai-job-card.component.html`, `ai-processes-drawer.component.ts` |
| M5 | — | `C:pages/ipsr/.../innovation-package-detail.component.html:65` → label from `initiative_official_code` + `initiative_name` |
| M6 | — | `C:pages/ipsr/.../table-innovation.component.{ts,html}` (+ searchable `full_name` in `complementary-innovation.component.ts`) |
| S4 | — | shell-topbar + header-panel role menu; `rd-contributors-and-partners` SP chips (459, 501); `update-notification`; `manage-user-modal` `display_label`; `phase-detail` toast; `section-zero-dashboard` + `section-contributors` banners (name via the bilateral context SP list); `ipsr-list-filter.service.ts` `buildIpsrProgramOptions` + stale comment; `lab-report-form` ToC-branch select (`optionLabel="sp_label"` + `sp_label` on the "Other(s)" sentinel) |

Alias names are fixed here so client and server agree. If an alias collides with an existing column in that query, the Implementer prefixes it (`submitter_*` / `initiative_*`) and records the change in `execution.md`.

## 5. Data Model

No change. Names come from `clarisa_initiatives.name` / `short_name`, already joined (or correlated) in each query.

## 6. API Design

| Endpoint | New field(s) | Contract doc |
|---|---|---|
| `GET api/ipsr/all-innovation-packages` | `submitter_name`, `submitter_short_name` | — |
| `POST api/ipsr/all-innovations`; `GET api/ipsr/innovation/:id` (+ v2 twin); `GET .../get-step-one/:id`; `GET .../get/step-two/:id` | `initiative_name` (next to the code each returns) | — |
| `POST api/results/admin-panel/report/results/completeness` | `initiative_name` | — |
| `GET contribution-to-indicators/get/indicator/:tocId` | `result_submitter_name` | — |
| `GET api/results/bilateral/:resultId/review-history` | `initiative_name` | — (route is under `/api/results`) |
| IPSR share-request notifications | `requester_name`, `approving_name` | — |
| `GET api/bilateral/center/ai/jobs` (+ `jobs/:jobId`) | `program_name` (`string \| null`) | **Yes**: field list + dated change-log row |

All fields are additive. A missing name is `null`, never `"null"` (PF2-R-1).

## 7. Backend Module Design

- **Raw SQL edits are SELECT-list additions only.** No WHERE, GROUP BY, ORDER BY or paging changes. In `getAllInnovationPackages`, `reportResultCompleteness` and `getContributingResultsQuery`, check whether the query is grouped. If it is, `ci.name` must be functionally dependent on the grouped key: it is, because `ci.id` is joined 1:1 with the code. Otherwise wrap it in `ANY_VALUE()` / `MAX()` to satisfy `ONLY_FULL_GROUP_BY`.
- **`getResultsInnovation`** chooses its code through `IF(role=2, subquery, subquery)`. Mirror the same `IF` for the name, so code and name always come from the same branch.
- **S3 lookup:** one `In(codes)` query against `ClarisaInitiative` per response, mapped `official_code → name`. Mirror the existing `projectNameById` / `centerAcronymById` pattern (`bilateral-ai.service.ts:326-349`). If a code matches more than one initiative (different portfolios), prefer the active one. If that is still ambiguous, return `null`, never a guess.
- **Error handling:** unchanged. A lookup miss yields `null`.
- **Observability:** none added. No logging of payloads.
- **Rollback:** revert the commit. Nothing persists.

## 8. Frontend / UX Component Architecture

- **Rule:** every label goes through `scienceProgramLabel(code, name, …)` in `.ts`, or `| spLabel` when the template already holds an `{official_code, name}` object. No inline string templates (Part 1 PFN-R-3).
- **Tables (M1, M2, M3, M6, S1 picker):** the cell renders the label with ellipsis + `[attr.title]` (Part 1 DD-3 pattern). The completeness table also builds a client-side search `full_name` (`results-api.service.ts:963`); include the name so search matches it. Excel builders keep the code (DD-5).
- **Option lists (S4):** compute `sp_label` once at load with `withScienceProgramLabel` (Part 1 DD-2). `optionValue` / ids are untouched.
- **Bilateral banners (S4):** resolve the name from the already-loaded bilateral context SP list by code. On a miss, show the code. The server payload is not changed.
- **Outcome-indicator rows added from the modal:** they come from `get/all/roles` (`submitter_name` already there) or from IPSR rows (M1 adds `submitter_name`). Map both into `result_submitter_name`.
- **Design tokens:** none added.

## 9. Shared Contracts

- `CurrentResult`-style client interfaces gain only optional fields.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` gets the `program_name` field plus a change-log row (PF2-R-4).
- No change to Part 1's shared rule or pipe.

## 10. Design Decisions

| DD | Decision | Why / rejected alternative |
|---|---|---|
| DD-1 | Extend existing queries (proposal Option A) | Smallest additive change. Rejected: a client catalogue lookup, which adds a second source of truth and misses other phases/portfolios |
| DD-2 | Fixed alias names per site (§6) | Client and server agree without discovery. A collision is prefixed and recorded |
| DD-3 | M3 export path (`_flattenedResultsQuery`) not extended | Exports keep the code column (Part 1 DD-5); this also limits the blast radius on a shared query |
| DD-4 | S3 batched lookup, `null` on ambiguity | No join exists; a guess would mislabel a job. Mirrors the existing project/center lookups |
| DD-5 | Bilateral banners resolve the name client-side | Avoids a second `/api/bilateral` contract change for text the client can already resolve |
| DD-6 | S4 legacy formats (`CODE Name`, HTML `full_name`) switch to `CODE - Name` | One format everywhere (PF2-R-3) |
| DD-7 | M5 fixes the binding to fields the API already returns | The blank header is a client binding bug; no server change is needed |

**Reversion challenges (Step 2.3)**, for decisions that remove delivered behavior:
- **DD-6, lab-report-form ToC select (`full_name` → `sp_label`).** What breaks: the bold acronym and search by acronym. Part 1's Reviewer already judged the same switch on the sibling select acceptable. The task keeps `short_name` searchable only if the select supports a separate filter field; otherwise this is an accepted loss, recorded.
- **DD-6, `manage-user-modal` `display_label`.** What breaks: anything that compares or searches on the old string. The task first greps `display_label` consumers; if one uses it as a value or key, that site is left unchanged and recorded.
- **DD-6, `buildIpsrProgramOptions` `displayName`.** What breaks: only specs asserting the old string, as in Part 1 DD-4; filter values are ids. The task updates those assertions.

## 11. Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC | Expected review rounds |
|---|---|---|
| 6 | ~250 prod (server ~90, client ~160) + ~600 test (2–3×, per `KZ-results--program-full-names-labels-2`) | 6–9 |

Standard depth fits. **Tripwire:** more than 7 tasks, or more than ~400 prod LOC, triggers a stop and escalation. If the budget is under pressure, drop S3 (contract change) and the S4 tail first; neither blocks the Must sites.
