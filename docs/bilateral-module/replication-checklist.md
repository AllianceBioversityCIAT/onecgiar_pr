# Bilateral Module Replication Checklist

Use this checklist to rebuild the bilateral module in another tool while preserving PRMS behavior and contracts.

## Phase 0: Context And Decisions

- [ ] Read `docs/bilateral-module/README.md`.
- [ ] Read `docs/bilateral-module/frontend.md`.
- [ ] Read `docs/bilateral-module/backend.md`.
- [ ] Read `docs/bilateral-module/integration-contracts.md`.
- [ ] Read `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` for field-level export contracts.
- [ ] Decide if ingestion endpoints are public, API-key protected, HMAC protected, mTLS protected, or internal-only.
- [ ] Decide if frontend will replicate the full Result Framework Reporting module or only Bilateral Results Review.
- [ ] Decide whether ToC editing is in scope for the first release or read-only in phase 1.

## Phase 1: Backend Foundation

- [ ] Create or map core result entity with `result_code`, `result_type_id`, `result_level_id`, phase/year, `status_id`, `source`, `is_active`, and audit columns.
- [ ] Create or map user entity for creator, submitter, reviewer, and external users.
- [ ] Create or map CLARISA adapters for initiatives, centers, institutions, geography, projects, policy types/stages, and innovation catalogs.
- [ ] Create or map ToC adapters for levels, ToC result lookup, indicators, and targets.
- [ ] Create or map typed result tables for KP, capacity sharing, innovation development, innovation use, and policy change.
- [ ] Create review history/audit storage.
- [ ] Create soft-delete conventions for all result associations.

## Phase 2: Ingestion API

- [ ] Implement `POST /api/bilateral/create` or an adapter endpoint.
- [ ] Support single `result`, bulk `results`, and direct `data` payload shapes.
- [ ] Validate required common fields.
- [ ] Validate required type-specific blocks by `result_type_id`.
- [ ] Validate Science Program IDs against CLARISA initiative official codes.
- [ ] Resolve active reporting phase and active year.
- [ ] Find or create external users without blocking on AD lookup.
- [ ] Enforce unique title for non-KP results within active phase.
- [ ] Implement Knowledge Product metadata/handle special case.
- [ ] Implement geography validation by scope.
- [ ] Implement lead and contributing center writes.
- [ ] Implement ToC lead and contributing program mapping.
- [ ] Implement contributing partners/institutions.
- [ ] Implement evidence writes.
- [ ] Implement contributing bilateral projects and budget metadata.
- [ ] Implement type-specific handlers.
- [ ] Wrap the entire create flow in a transaction.
- [ ] Return enriched result data after create.

## Phase 3: Review Backend

- [ ] Implement pending-review count by Science Program.
- [ ] Implement grouped table rows by program and center selection.
- [ ] Implement bilateral detail endpoint with common fields, ToC metadata, geography, centers, projects, initiatives, institutions, evidence, type response, and contributor ToC rows.
- [ ] Implement inline title update with status/source/uniqueness rules.
- [ ] Implement ToC metadata update with required justification.
- [ ] Implement data-standard update with required justification.
- [ ] Implement approve/reject endpoint.
- [ ] Require rejection justification.
- [ ] Write review history for every decision and meaningful review update.
- [ ] Ensure review endpoints require authenticated user and role/program authorization.
- [ ] Ensure all review endpoints verify `source = Bilateral`.

## Phase 4: Export And Sync Contracts

- [ ] Implement `GET /api/bilateral/list` or equivalent paginated contract.
- [ ] Implement source, portfolio, phase year, result type, status, date, center, initiative, and title-search filters.
- [ ] Implement `GET /api/bilateral/results` or equivalent raw sync contract.
- [ ] Emit wrapper shape `{ type, result_id, data }`.
- [ ] Emit common result fields.
- [ ] Emit type-specific summaries.
- [ ] Use CLARISA-facing ids and labels in exported payloads.
- [ ] Add payload-shape tests for every supported type.
- [ ] Document every contract change in a changelog.

## Phase 5: Frontend Foundation

- [ ] Implement authenticated API client using `auth` header or agreed adapter.
- [ ] Normalize response envelopes at a single boundary.
- [ ] Implement route `/result-framework-reporting/entity-details/:entityId` or equivalent.
- [ ] Implement route `/result-framework-reporting/entity-details/:entityId/results-review` or equivalent.
- [ ] Implement Science Program detail page entry banner with pending count.
- [ ] Implement Bilateral Results page shell with breadcrumb, sidebar, filters, table, and drawer.
- [ ] Implement frontend state store equivalent to `BilateralResultsService`.
- [ ] Implement center sidebar with all-centers and per-center pending badges.
- [ ] Hydrate center and search filters from URL.
- [ ] Fetch all-center rows on initial load to populate badges, even when deep-linked to one center.

## Phase 6: Frontend Table And Filters

- [ ] Fetch grouped table rows by selected centers.
- [ ] Flatten rows for filter option computation.
- [ ] Search across result code, title, indicator category, ToC title, and indicator.
- [ ] Filter by indicator category, status, and lead center.
- [ ] Group table by bilateral project.
- [ ] Show contributor badges when `initiative_role_name === 'Contributor'`.
- [ ] Show `Review result` only for pending results and users with review permission.
- [ ] Show `See result` for non-pending or read-only users.
- [ ] Refresh table and all pending counts after approve/reject.

## Phase 7: Review Drawer

- [ ] Load CLARISA projects and institutions before processing detail.
- [ ] Load bilateral detail by result id.
- [ ] Normalize centers to center codes.
- [ ] Normalize projects to project ids.
- [ ] Normalize contributing initiatives from both legacy array and object bucket shapes.
- [ ] Preserve primary initiatives as read-only.
- [ ] Preserve accepted and pending contributing initiatives separately.
- [ ] Normalize institutions to ids while preserving original record ids.
- [ ] Normalize `resultTypeResponse` to one object internally.
- [ ] Render common fields and project summary.
- [ ] Render geography editor or read-only geography display.
- [ ] Render centers, projects, initiatives, institutions, and evidence.
- [ ] Render type-specific content for result types 1, 2, 5, 6, and 7.
- [ ] Implement inline title edit.
- [ ] Implement evidence link add/remove.
- [ ] Implement ToC dirty tracking.
- [ ] Implement data-standard dirty tracking.
- [ ] Require justification for saving ToC or data-standard changes.
- [ ] Disable approve while ToC is incomplete or unsaved changes exist.
- [ ] Implement approve confirmation.
- [ ] Implement reject justification dialog.
- [ ] Restore read-only and body-scroll state when drawer closes.

## Phase 8: Testing

Backend tests:

- [ ] DTO validation for common payloads.
- [ ] DTO validation for each type-specific block.
- [ ] Ingestion transaction rollback on invalid CLARISA code.
- [ ] External user creation path.
- [ ] KP metadata and duplicate behavior.
- [ ] Each handler writes expected tables.
- [ ] `listAllResults` filters and pagination.
- [ ] Sync wrapper shape.
- [ ] Detail endpoint shape per result type.
- [ ] ToC update with justification.
- [ ] Data-standard update with empty arrays and type-specific body.
- [ ] Approve/reject transition and review history.

Frontend tests:

- [ ] State store computed pending counts.
- [ ] Center selection and URL hydration.
- [ ] Filter Apply/Cancel behavior.
- [ ] Table grouping and search fields.
- [ ] Drawer detail normalization.
- [ ] Dirty tracking for ToC and data standards.
- [ ] Approve button enablement rules.
- [ ] Type-specific update body mapping.
- [ ] Read-only restoration on drawer close/destroy.

End-to-end tests:

- [ ] Ingest one result for each supported type.
- [ ] Open Science Program review page.
- [ ] Select center and search for result.
- [ ] Open review drawer.
- [ ] Save ToC with justification.
- [ ] Save data standards with justification.
- [ ] Approve a result and verify counts/table refresh.
- [ ] Reject a result with justification and verify counts/table refresh.
- [ ] Validate exported payload shape after approval/rejection.

## Minimal Viable Rebuild

If time is constrained, build in this order:

1. Backend ingestion for one or two result types.
2. Backend grouped table, detail, and approve/reject endpoints.
3. Frontend center sidebar and grouped table.
4. Read-only review drawer.
5. Approve/reject with justification.
6. Inline title edit.
7. Data-standard editing.
8. ToC editing.
9. Remaining type-specific edit panels.
10. Export/sync payload completeness.

For a two-week proof of concept, defer full ToC editing and use a read-only ToC display if the ToC tree cannot be ported quickly.

## Critical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| ToC tree not ported | Review drawer cannot fully approve results requiring ToC completion. | Start read-only, then port `app-cp-multiple-wps` as shared component. |
| Global read-only mutation copied | UI state leaks across pages/drawers. | Use explicit editability props and route-scoped state. |
| Status id string/number mismatch | Review buttons show incorrectly. | Coerce `status_id` at API boundary. |
| Sidebar count uses filtered table | Pending badges become wrong. | Maintain separate all-result count source. |
| KP treated as normal payload | Wrong title/metadata/evidence. | Use handle-based metadata sync. |
| CLARISA ids confused with PRMS join ids | Downstream contract breaks. | Normalize export payloads to CLARISA ids/labels. |
| Contract changes undocumented | Downstream consumers break. | Require changelog and payload tests. |
| Public ingestion unprotected | Security incident. | Add perimeter auth and monitoring. |

## Anti-Patterns To Avoid

- Do not collapse ingestion and review APIs into one endpoint.
- Do not directly update `status_id` outside the review decision service.
- Do not hard-delete associations that should be soft-deleted.
- Do not log headers or payload secrets.
- Do not rename backend-compatible typos without a versioned contract.
- Do not skip payload fixture tests.
- Do not let frontend-only role checks be the sole authorization layer.
- Do not rely on array position for lead center if your UI allows reordering; add an explicit lead marker.
- Do not ship missing design tokens that make the UI unreadable.

## Definition Of Done

- [ ] Ingestion creates complete bilateral results for all supported types.
- [ ] Review workspace shows accurate pending counts by center.
- [ ] Review drawer can load, edit, save, approve, and reject.
- [ ] Review history records all decisions and update justifications.
- [ ] Export payloads match documented contract.
- [ ] Security posture for ingestion and review endpoints is documented and tested.
- [ ] Unit, integration, and E2E tests cover core flows.
- [ ] Documentation is updated with endpoint and payload changes.
