# my-draft-results

**Verified:** 2026-08-27 · branch performance-refactor · dab9ea9dc

## What it is
The **Drafts** tab of the bilateral center dashboard (P2-3169). Lists every AI-generated result
suggestion the center still has to decide on, and offers Review (read-only aside), Promote (creates
the real result) and Delete on each one.

## Contract
- Route: `/bilateral/:centerAcronym/drafts`. No inputs — everything comes from services.
- State: `BilateralAiService` owns it. `draftList()` = source of truth for the list,
  `isDraftListLoaded()` = loading gate, `isPromoting()` = full-screen overlay,
  `projectNameMap()` / `initiativeNameMap()` = id → label lookups.
  `BilateralContextService.centerInstitutionId()` decides which center's drafts are fetched.
- Endpoint: `GET /api/bilateral/center/ai/drafts?centerId=` via
  `BilateralApiService.GET_bilateralAiDrafts`, plus `POST …/drafts/:id/promote` and
  `DELETE …/drafts/:id`. All three are wrapped by `BilateralAiService`, never called from here.
- Children reused from the detail page: `app-draft-result-card`, `app-draft-evidence-list`
  (`../bilateral-ai-draft-detail/components/…`).

## Where it is used
- `src/app/shared/routing/routing-data.ts` — the `drafts` child route of the bilateral center.
- `../../components/bilateral-page-header/` renders the tab and its pending-drafts badge
  (`activeTab="drafts"`).

## The payload behind the card (P2-3169 AC2)
`listDrafts` on the server loads `relations: { job: true, result: true }`
(`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai.service.ts:192-202`), so every row
carries more than the draft columns:

| Card field | Comes from |
|---|---|
| Title | `extracted_mds.title` |
| Indicator category | `extracted_mds.indicator` |
| Result type (Output/Outcome) | `result.result_level_id` — 3 Outcome, 4 Output |
| AI-Assistant session | `job_id` (+ `job.created_date`, `job.result_count` in the tooltip) |
| Generation date | `created_date` |
| Draft status | `result.status_id` (8 = Draft) |

The level and the status are stamped by the server when the draft is created, from
`TYPE_BY_INDICATOR` (same file, `:37-48` and `createDraftFromCandidate` at `:397-410`).

## Traps (⚠️ = already broke something)
- ⚠️ `BilateralAiDraft` (`../../services/bilateral-ai.interfaces.ts`) **does not model the `result`
  relation** even though the endpoint always returns it. This component reads it through a local
  `DraftResultRelation` cast. Model it on the shared interface the next time that file is touched,
  and delete the cast here.
- ⚠️ TypeORM serialises `bigint`/`int` columns as **strings** — `status_id` arrives as `"8"`, not
  `8`. Always `Number(...)` before comparing against `BILATERAL_STATUS`.
- ⚠️ There is no shared client catalogue for result levels. `RESULT_LEVEL_LABELS` here duplicates
  the private `RESULT_LEVELS` of `../../components/bilateral-result-level-selector/`. If either
  changes, change both.
- Every draft in this list is status `Draft` in practice: promote and decline both set
  `is_discarded = true` on the server, which drops the row out of the endpoint's `where`. The status
  is still read from the payload rather than hardcoded, so a server-side change surfaces instead of
  lying.
- The status chip replaced a decorative "completeness" ring that drew a fixed 50% arc with the word
  `Draft` printed inside. Neither number came from the payload — do not bring it back.
- `promoteDraft` navigates away and `discardDraft` reloads the route; both drop the draft from
  `draftList()` optimistically, so nothing here needs to refetch.

## Pending / Coming soon
- The mockup's Drafts card (`.design-snapshots/PRMS-Reporting.dc.html:1101-1140`) has a search box,
  a per-card kebab menu and a source-document link that this page does not implement. Not part of
  P2-3169.
