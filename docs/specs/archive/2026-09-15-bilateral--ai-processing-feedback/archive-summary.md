# Archive Summary: Bilateral AI Processing Feedback

## 1. Document Control
- **Spec Path:** `docs/specs/bilateral/ai-processing-feedback/`
- **Archive Target:** `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/`
- **Archive Date:** 2026-09-15
- **Branch:** `qa-development-2026`
- **Final Status:** SHIPPED / PASS (all 10 tasks completed and verified)

## 2. Executive Summary
This feature overhauls the user experience and reliability of bilateral AI text mining in PRMS. It replaces the previous silent/blocking wait states with a real-time 6-stage stepper panel (`app-ai-processing-panel`), provides expected completion ranges based on historical mix classes, surfaces queue position under concurrency, introduces adaptive polling, adds a background TypeORM sweeper for stalled/timed-out jobs, and enforces AI provenance transparency across five client surfaces.

## 3. Requirements & Quality Gates Delivered
- `APF-R-1`: Stage model and queue position computed at read time (`BilateralAiJobStage`, `queue_position`).
- `APF-R-2`: Asynchronous cron sweeper (`bilateral-ai-sweeper.cron.ts`) for stalled (30 min) and timed-out (15 min attempt) jobs with liveness count.
- `APF-R-3`: Retry lifecycle (retries stay `PROCESSING` up to `max_attempts = 3`, final `FAILED` with code).
- `APF-R-4`: Terminal notifications via in-app bell (`notifications_type_id = 13`) and email templates (`email_template_bilateral_ai_results_ready`, `email_template_bilateral_ai_failed`).
- `APF-R-5`: Retry endpoint (`POST jobs/:jobId/retry`) reusing stored S3 sources without re-upload; 410 on missing keys.
- `APF-R-6`: Processing panel component (`app-ai-processing-panel`) with 6-stage stepper, elapsed time from `queue_entry_date`, expected range, attempt badges, and `aria-live` announcements.
- `APF-R-7`: "Still running" non-failing state on client timeout, adaptive polling intervals (5s → 15s → 30s).
- `APF-R-8`: Single-surface gating (`panelVisible = true` suppresses global modal; elsewhere global modal takes over).
- `APF-R-9`: "Try again" action re-enqueues same job id and resets panel to queued.
- `APF-R-10`: Persistent dual-slot "AI job running" chip in center header (nav end slot ≥ 640px, identity row < 640px without scroll at 375px).
- `APF-R-11`: Collapsible "coming soon" disclosure on creation set-up step.
- `APF-R-12`: AI provenance transparency notice across 5 surfaces (Drafts list, draft card, promoted editor, detail read-only, completion dialog).
- Defect Gates: D1 (sweeper concurrency), D2 (conditional updates), D3 (single surface), D4 (honest copy without invented %), D5 (notification idempotency), D6 (payload normalization), D7 (CT layout at 375px, 900px, 1280px), D8 (PRMS design tokens), D9 (contract doc), D10 (a11y & reduced motion), D11 (HITL verification).

## 4. Test Evidence Summary
- **Backend Unit & Integration Specs:**
  - `src/api/bilateral-ai`: 9 suites, 175 passed (`bilateral-ai.controller.spec.ts`, `bilateral-ai.service.spec.ts`, `bilateral-ai-sweeper.cron.spec.ts`, `bilateral-ai-notifications.service.spec.ts`, etc.).
  - Migrations: `1788760000000-AddBilateralAiJobStage`, `1788761000000-AddBilateralAiJobFinishedNotificationType`, `1788762000000-AddBilateralAiTerminalEmailTemplates` executed and verified.
- **Frontend Unit Specs:**
  - `ai-processing-panel.component.spec.ts`: 21 tests passed.
  - `bilateral-page-header.component.spec.ts`: 58 tests passed.
  - `bilateral-ai.service.spec.ts`, `bilateral-ai-upload.component.spec.ts`, `my-draft-results.component.spec.ts`: all green.
- **Cypress Component Tests:**
  - `ai-processing-panel.cy.ts`: 3/3 passed (1280px, 900px, 375px responsive layout, reduced motion disabled animations).
  - `bilateral-page-header.cy.ts`: 1/1 passed (chip visible at 375px without scroll, zero document overflow).
  - `bilateral-overview.cy.ts`: 2/2 passed.
- **Build & Lint:**
  - `npm run build:dev`: Exit 0, AOT compilation clean.
  - `npx ng lint`: All files pass linting with 0 errors.

## 5. Files Changed & Added
- **Server:**
  - `src/api/bilateral-ai/entities/bilateral-ai-job.entity.ts`
  - `src/api/bilateral-ai/constants/bilateral-ai-job-stage.enum.ts`
  - `src/api/bilateral-ai/dto/bilateral-ai-job-response.dto.ts`
  - `src/api/bilateral-ai/dto/bilateral-ai-expectations.dto.ts`
  - `src/api/bilateral-ai/bilateral-ai.controller.ts`
  - `src/api/bilateral-ai/services/bilateral-ai.service.ts`
  - `src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts`
  - `src/api/bilateral-ai/services/bilateral-ai-file-storage.service.ts`
  - `src/api/bilateral-ai/crons/bilateral-ai-sweeper.cron.ts`
  - `src/api/notification/notification.service.ts`
  - `src/migrations/1788760000000-AddBilateralAiJobStage.ts`
  - `src/migrations/1788761000000-AddBilateralAiJobFinishedNotificationType.ts`
  - `src/migrations/1788762000000-AddBilateralAiTerminalEmailTemplates.ts`
  - `docs/bilateral-result-summaries.en.md`
- **Client:**
  - `src/app/pages/bilateral/bilateral-ai-job.model.ts`
  - `src/app/pages/bilateral/services/bilateral-ai.service.ts`
  - `src/app/pages/bilateral/components/ai-processing-panel/*`
  - `src/app/pages/bilateral/components/ai-provenance-notice/*`
  - `src/app/pages/bilateral/components/bilateral-ai-upload/*`
  - `src/app/pages/bilateral/components/bilateral-page-header/*`
  - `src/app/pages/bilateral/components/bilateral-ai-completion-dialog/*`
  - `src/app/pages/bilateral/pages/bilateral-result-creator/*`
  - `src/app/pages/bilateral/pages/my-draft-results/*`
  - `src/app/pages/bilateral/pages/bilateral-ai-draft-detail/components/draft-result-card/*`

## 6. Accepted Warnings & Follow-Up Items
- **Pre-existing tab strip swipe:** At viewports below 640px, the center tab strip already overflows by design as a scrollable container (`overflow-x-auto`). Chip placement uses the hero identity slot under 640px (Pivot Option A) to guarantee visibility. A follow-up quick can optimize the tab strip collapse if desired.
- **S3 403 vs 404 policy:** S3 bucket permissions on HEAD without `s3:ListBucket` return 403 on missing keys. Production policy configuration should be verified in AWS.
