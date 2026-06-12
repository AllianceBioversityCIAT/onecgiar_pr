# AGENTS.md - `onecgiar-pr-server/src/api/results` (Bilateral Management & Review)

This is the module-level guide for any AI coding agent managing Bilateral results within the Results module. It complements the ingestion guide at `../bilateral/AGENTS.md`.

## Read Order

1. `../../AGENTS.md` (Source-tree patterns)
2. `../bilateral/AGENTS.md` (Ingestion flow)
3. This file

## 60-Second Mental Model

While the `bilateral/` module handles **headless ingestion**, the `results/` module (via `ResultsService`) handles the **lifecycle management** of those results. This includes progress tracking for science programs, technical review workflows (Approve/Reject), and metadata updates.

```text
api/results/
├── results.controller.ts     # Management surface (Review, Title, Progress)
├── results.service.ts        # Business logic for updates and decisions
├── result.repository.ts      # complex queries for progress and status
└── dto/                      # ReviewDecisionDto, UpdateTocMetadataDto, etc.
```

## Key Mechanisms

### Science Program Progress
The `getScienceProgramProgress` method aggregates results by science program (Portfolio 3). It calculates progress percentages based on indicator contributions and groups results by status (Editing, Submitted, etc.).

### Bilateral Review Workflow
Bilateral results enter the system in `PENDING_REVIEW` status.
1. **Review Decision** (`reviewBilateralResult`): Admin/PMU leads can Approve or Reject.
   - **Approve**: Moves status to `APPROVED` and triggers ToC mapping updates.
   - **Reject**: Moves status back to `REJECTED` and requires a justification.
2. **Review Updates**: While in review, certain fields (ToC metadata, data standards) can be adjusted via `updateBilateralResultReview` and `updateBilateralResultTocMetadata`.

### Title & Metadata Integrity
- **Title Updates** (`updateBilateralResultTitle`): Restricted to results in `EDITING` status (or Admin). Enforces uniqueness within the active phase.
- **Audit Trail**: Every decision or update is recorded in `ResultReviewHistory` to maintain a clear path of changes.

## Endpoint Mapping (Frontend -> Service)

| Frontend Endpoint | Method in `ResultsService` |
|---|---|
| `GET /api/results/get/science-programs/progress` | `getScienceProgramProgress` |
| `GET /api/results/pending-review?programId=<id>` | `getPendingReviewCount` |
| `GET /api/results/by-program-and-centers` | `getResultsByProgramAndCenters` |
| `GET /api/results/bilateral/<resultId>` | `getBilateralResultById` |
| `PATCH /api/results/bilateral/<resultId>/title` | `updateBilateralResultTitle` |
| `PATCH /api/results/bilateral/review-update/toc-metadata/<id>` | `updateBilateralResultTocMetadata` |
| `PATCH /api/results/bilateral/review-update/data-standard/<id>` | `updateBilateralResultReview` |
| `PATCH /api/results/bilateral/<resultId>/review-decision` | `reviewBilateralResult` |

## Related Reporting Services
The `ResultsFrameworkReportingService` provides additional ToC-specific data used in the Bilateral dashboard:
- `getGlobalUnitsByProgram`: Progress by work package.
- `getWorkPackagesByProgramAndArea`: Detailed ToC results.
- `getProgramIndicatorContributionSummary`: Summary by result type and status.

## Anti-Patterns

- **Status Bypassing**: Never manually update `status_id` without going through the review methods or validation.
- **Missing Justification**: REJECT decisions **must** include a justification.
- **Ignoring Source**: Management logic for Bilateral results should check `source = SourceEnum.Bilateral` where appropriate.
- **Direct ToC Manipulation**: Use `ResultsTocResultsService` for ToC-related updates to ensure indicator targets are correctly synced.
