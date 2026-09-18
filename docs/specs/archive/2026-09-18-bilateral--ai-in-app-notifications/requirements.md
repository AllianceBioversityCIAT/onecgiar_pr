# Module Spec — `requirements.md`: Bilateral AI In-Platform Notifications

## 1. Module / Feature

- **Module:** `bilateral`
- **Sub-feature:** `ai-in-app-notifications`
- **Owner:** Juan Carlos Cadavid
- **Status:** in-review
- **Ticket(s):** Client Mandate (Bilateral AI Notification Policy)
- **Document Control:**
  - **Spec Path:** `docs/specs/bilateral/ai-in-app-notifications/`
  - **Type:** Change / Policy Enforcement
  - **Approval Mode:** gated (default)
  - **Author:** AKILI specify (T1 Architect)
  - **Date:** 2026-09-18
  - **Depends on:** `archive/2026-09-15-bilateral--ai-processing-feedback` (APF)

---

## 2. Context

The OneCGIAR PRMS Bilateral Result AI extraction pipeline allows users to upload documents and audio recordings to automatically draft bilateral reporting results. Previously, under `APF-T-3`, when an AI extraction job concluded after running for $\ge 2$ minutes, the backend dispatched an automated email notification via Amazon SES (using Handlebars email templates) alongside an in-app database notification.

The client has established an explicit institutional constraint: **no email notifications should be sent to users when the AI-assisted process finishes**. All completion awareness must be delivered directly within the PRMS platform.

This specification formalizes:
1. Complete suppression of outbound emails for all bilateral AI job terminal events (`results_ready`, `no_candidates`, `failed`, `timed_out`).
2. Preservation and verification of native in-platform notifications (`emitBilateralAiJobNotification`), alerting users via the global navbar notification bell (`header-panel`) with deep links to their draft results.
3. Alignment of client processing panel copy in `AiProcessingPanelComponent` (`ai-processing-panel.component.html`), eliminating any mention of email delivery and reinforcing the in-platform notification model.

### Constitutional Baseline Links
- `docs/prd.md`: US-P1 (Bilateral reporting), G4 / M4.1 (System reliability and clear user feedback).
- `docs/ux-ui/design.md`: §8 (Notification center, floating alerts, and feedback patterns).
- `docs/trd/trd.md`: §8 (Async background workers, notifications, and event handling).
- Prior Spec: `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/requirements.md` (`APF-R-2`, `APF-R-3`, `APF-R-7`).

---

## 3. In Scope / Out of Scope

### In Scope
- Suppressing `sendTerminalMail` execution in `BilateralAiNotificationsService.notifyTerminal()` for all terminal outcomes.
- Retaining `notificationService.emitBilateralAiJobNotification()` as the sole authoritative completion notifier.
- Updating UI copy in `AiProcessingPanelComponent` (`processing` and `still_running` states) to state that notifications are delivered within the platform.
- Updating server unit tests (`bilateral-ai-notifications.service.spec.ts`) to verify zero SES calls and preserve in-app persistence.
- Updating client unit tests (`ai-processing-panel.component.spec.ts`) to match new in-platform wording.

### Out of Scope
- Altering email notifications for other PRMS platform workflows (e.g., user invitations, password recovery, QA review approvals/rejections, bilateral contributor requests).
- Deleting Handlebars email templates from the repository (`src/shared/tools/email-template/templates/`).
- Database schema changes to notification tables or job tables.
- Changes to the in-app notification bell drawer or polling frequency.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| **Result Submitter / Center Staff** | No longer receives unwanted terminal emails. When an AI job completes or fails, an in-app notification alert appears in the top navigation bell with a link to view draft results. Processing screen states clearly that notification occurs in the platform. |
| **QA Reviewer / PMU Lead** | Not directly affected. |
| **System Administrator** | Reduced Amazon SES outbound traffic and zero risk of spam complaints related to repetitive AI job extraction retries. |

---

## 5. User Stories

- **`AIN-US-1`** — As a result submitter uploading documents for AI bilateral result extraction, I want to be notified inside PRMS when extraction finishes without receiving emails, so that my external inbox remains uncluttered while I receive actionable notifications directly where I work.
  - *Refines `docs/prd.md` US-P1 and `APF-US-1`.*
- **`AIN-US-2`** — As a result submitter monitoring extraction progress, I want the processing panel to accurately describe how I will be notified, so that I understand I can navigate away and check PRMS notifications upon completion.
  - *Refines `docs/ux-ui/design.md` §8.*

---

## 6. Functional Requirements

### Required (MUST)

- **`AIN-R-1` (In-Platform Copy Alignment):**
  The client processing panel MUST inform users that job completion notifications are delivered within the platform, and MUST NOT promise or reference email notifications.

  #### Scenario: User leaves page during active processing
  - GIVEN an active bilateral AI extraction job in `processing` state
  - WHEN the processing panel renders
  - THEN the disclaimer banner MUST read: `"You can leave this page. We'll notify you here in the platform when it finishes."`
  - BUT it must NOT contain the phrase `"by email"` or `"and by email"`.

  #### Scenario: User observes still running state
  - GIVEN an active bilateral AI extraction job in `still_running` state
  - WHEN the still running panel renders
  - THEN the announcement subtitle MUST read: `"We'll notify you here in the platform when it finishes."`
  - BUT it must NOT contain the phrase `"by email"` or `"and by email"`.

- **`AIN-R-2` (Terminal In-App Notification Retention):**
  When a bilateral AI job reaches a terminal state (`results_ready`, `no_candidates`, `failed`), `BilateralAiNotificationsService.notifyTerminal()` MUST persist exactly one in-app notification row for the job owner via `NotificationService.emitBilateralAiJobNotification()`.

  #### Scenario: Successful extraction with generated drafts
  - GIVEN a bilateral AI job with `status = COMPLETED` and `result_count = 2`
  - WHEN `notifyTerminal(job, 'results_ready', options)` is executed
  - THEN `notificationService.emitBilateralAiJobNotification(job.user_id, ...)` MUST be called with the outcome copy and deep link
  - AND IT MUST include the center acronym and destination drafts URL.

- **`AIN-R-3` (Zero Outbound Emails for AI Jobs):**
  `BilateralAiNotificationsService.notifyTerminal()` MUST NOT dispatch any outbound email via `EmailService.sendEmail()`, regardless of job duration or outcome.

  #### Scenario: Long-running job reaching terminal outcome
  - GIVEN a bilateral AI job that ran for $\ge 120$ seconds
  - WHEN `notifyTerminal()` executes for any outcome (`results_ready`, `no_candidates`, `failed`)
  - THEN `EmailService.sendEmail()` MUST NOT be called
  - AND no email template lookup MUST be performed for notification purposes.

### Should (SHOULD)

- **`AIN-R-4` (Code Cleanliness & Dead Code Management):**
  `BilateralAiNotificationsService` SHOULD retain the private helper `sendTerminalMail` annotated with deprecation or safely bypass its invocation inside `notifyTerminal()`, preventing dead-code lint errors while keeping the codebase clean and ready should an opt-in policy ever be requested.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Elimination of external SES SMTP/API network calls reduces `notifyTerminal` execution latency by $\ge 150$ ms. |
| **Security & Privacy** | Eliminates transmission of Center result counts, draft URLs, and user names over unencrypted external email SMTP channels. |
| **Reliability** | Eliminates notification delivery failures caused by email bounces, unconfigured SES credentials, or rate limits (`APF-R-4`). In-app notification write failures remain safely caught and logged without aborting the job. |
| **Maintainability** | Clean diff with zero database migrations or breaking changes to contracts. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `AIN-AC-1` | A bilateral AI job completing with `results_ready` after $\ge 120$ s | `notifyTerminal(job, 'results_ready')` runs | An in-app notification row is created via `emitBilateralAiJobNotification`, and `emailService.sendEmail` is NOT called. |
| `AIN-AC-2` | A bilateral AI job completing with `no_candidates` | `notifyTerminal(job, 'no_candidates')` runs | An in-app notification row is created via `emitBilateralAiJobNotification`, and `emailService.sendEmail` is NOT called. |
| `AIN-AC-3` | A bilateral AI job completing with `failed` | `notifyTerminal(job, 'failed')` runs | An in-app notification row is created via `emitBilateralAiJobNotification`, and `emailService.sendEmail` is NOT called. |
| `AIN-AC-4` | A user viewing `AiProcessingPanelComponent` in `processing` view | The component renders | The banner states `"You can leave this page. We'll notify you here in the platform when it finishes."` and does not contain `"email"`. |
| `AIN-AC-5` | A user viewing `AiProcessingPanelComponent` in `still_running` view | The component renders | The announcement states `"We'll notify you here in the platform when it finishes."` and does not contain `"email"`. |
| `AIN-AC-6` | Client test suite `ai-processing-panel.component.spec.ts` | Executed via Jest | Passes 100% with updated assertion matching the new in-platform text. |
| `AIN-AC-7` | Server test suite `bilateral-ai-notifications.service.spec.ts` | Executed via Jest | Passes 100% verifying in-app notifications and absence of `sendEmail` calls. |

---

## 9. Dependencies & Assumptions

### Upstream Dependencies
- `NotificationService.emitBilateralAiJobNotification`: Existing server service that writes notification records into the PRMS database.
- `header-panel.component.html`: Existing client component that polls and displays unread in-app notifications via the top navigation bell.

### Assumptions
- In-app notification delivery is sufficient for users who leave the page, as unread notifications persist in the database and display a badge upon their next visit or active session in PRMS.
- Users who remain on the page or in other tabs receive immediate feedback via the in-app completion modal (`BilateralAiCompletionDialogComponent`) and the AI Draft Results badge.

---

## 10. Open Questions

- *OQ-1:* Should Handlebars templates (`templates/bilateral-ai-*.hbs`) be deleted?
  - **Resolution:** No. Retain templates in repo to prevent bundle or repository path discrepancies.
- *OQ-2:* Exact wording on client banner:
  - **Resolution:** `"You can leave this page. We'll notify you here in the platform when it finishes."` (concise, clear, and adheres to PRMS voice guidelines).

---

## 11. Defect Classes & Verification Gates

| Defect Class | Detection Gate |
|---|---|
| Accidental email dispatch from server | Automated Jest test: `expect(stubs.emailService.sendEmail).not.toHaveBeenCalled()` in `bilateral-ai-notifications.service.spec.ts`. |
| In-app notification suppression | Automated Jest test: `expect(stubs.notificationService.emitBilateralAiJobNotification).toHaveBeenCalledTimes(1)`. |
| Lingering "by email" copy on frontend | Automated Jest test: `expect(text()).not.toContain('by email')` and `expect(text()).toContain('notify you here in the platform')` in `ai-processing-panel.component.spec.ts`. |
| Angular template compile or lint error | `npx ng lint --quiet`. |

---

## 12. Required Cross-References

- `docs/prd.md`: US-P1 (Bilateral reporting)
- `docs/ux-ui/design.md`: §8 (In-app notifications)
- `docs/trd/trd.md`: §8 (Async jobs & notification services)
- `docs/specs/bilateral/ai-in-app-notifications/proposal.md`
