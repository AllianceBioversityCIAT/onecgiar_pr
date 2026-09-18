# Proposal — Bilateral AI: In-Platform Notifications (Email Elimination)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/ai-in-app-notifications` |
| **Slug** | `ai-in-app-notifications` — derived from user request: *"para el proceso del AI-Assisted en bilaterales... no quieren que llegue correos cuando finaliza el proceso... manejar directamente como una notificacion dentro de la plataforma"* |
| **Type** | Change (Notification channel transition: email suppression & in-app alignment) |
| **Approval Mode** | gated (default) |
| **Author** | AKILI propose (T1 Architect) |
| **Date** | 2026-09-18 |
| **Owner** | Juan Carlos Cadavid |
| **Ticket** | Client Mandate (Bilateral AI Notification Policy) |
| **Depends on** | `archive/2026-09-15-bilateral--ai-processing-feedback` (builds upon the terminal notification architecture established in `APF-T-3`) |
| **Parallel-safe** | yes — self-contained change across bilateral AI notification service and client processing panel |
| **Baseline cited** | `docs/prd.md` US-P1 · `docs/ux-ui/design.md` §8 · `docs/trd/trd.md` §8 (notifications & async jobs) · `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts` · `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processing-panel/` |
| **Kaizen lessons applied** | `KZ-changes--bilateral-review-visual-polish-1` (copy length and clarity), `KZ-bilateral--ai-processing-feedback-1` (single-surface notification and clear user expectations) |

---

## 2. Intent

Honor the client's direct constraint to **eliminate external email notifications** when an AI-assisted result extraction job finishes (whether successful, empty, or failed), and transition the entire completion awareness experience to **native in-platform notifications** (global notification bell, in-app completion dialog, live processing panel, and draft badges).

---

## 3. Problem / Current Behavior

1. **Client Constraint:** The client has explicitly requested that no emails be sent to users when the AI-assisted process finishes (*"no quieren que llegue correos cuando finaliza el proceso"*).
2. **Current Server Dispatch:** In `BilateralAiNotificationsService.notifyTerminal()` (`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts` lines 117–126), when a job completes or fails after running for $\ge 2$ minutes (`mailEligible = elapsedSeconds >= 120`), the server triggers `sendTerminalMail()`, dispatching automated emails via Amazon SES using Handlebars templates (`results_ready`, `failed`, `no_candidates`).
3. **Misaligned Client Messaging:** In `AiProcessingPanelComponent` (`onecgiar-pr-client/src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.html` lines 85 and 96), the user interface explicitly promises email delivery:
   - *"You can leave this page. We'll notify you here and by email."*
   - *"We'll notify you here and by email when it finishes."*
   This confuses users if emails are silenced without updating the UI copy.
4. **Existing In-App Infrastructure:** The server already writes in-app notifications via `NotificationService.emitBilateralAiJobNotification(job.user_id, ...)`. However, the end-to-end user loop must be cohesive: the user must feel confident that leaving the page is safe and that they will be notified in the platform's notification bell (`header-panel`) and through the app-wide completion dialog (`BilateralAiCompletionDialogComponent`).

---

## 4. Proposed Outcome

1. **Zero Outbound Emails for Bilateral AI Jobs:** `BilateralAiNotificationsService` ceases all email dispatch for bilateral AI job terminal events (`results_ready`, `no_candidates`, `failed`, `timed_out`).
2. **Clear In-Platform UI Copy:** The client processing panel (`AiProcessingPanelComponent`) and setup drawer inform the user that notification occurs **exclusively within the platform** (*"You can leave this page. We'll notify you here in the platform when it finishes."*).
3. **Robust In-Platform Notification Flow:**
   - The in-app notification row emitted by `NotificationService.emitBilateralAiJobNotification` is preserved and verified to increment the unread count in the global navbar bell (`header-panel`).
   - The notification popover links directly to the generated drafts (`/bilateral/my-draft-results`).
   - If the user is active in PRMS (in any tab), the existing global completion modal (`BilateralAiCompletionDialogComponent`) and the AI Drafts badge (`AI Draft Results N+`) continue to provide immediate feedback.

---

## 5. Scope

### 5.1 Server (`onecgiar-pr-server`)
- In `BilateralAiNotificationsService` (`src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts`):
  - Disable or remove the `sendTerminalMail` trigger in `notifyTerminal()`.
  - Maintain `notificationService.emitBilateralAiJobNotification(job.user_id, ...)` as the sole authoritative terminal notification emitter.
  - Update unit tests in `bilateral-ai-notifications.service.spec.ts` to assert that emails are **not** dispatched on terminal transitions, while in-app notifications continue to be emitted.

### 5.2 Client (`onecgiar-pr-client`)
- In `AiProcessingPanelComponent` (`src/app/pages/bilateral/components/ai-processing-panel/`):
  - Update template text in `ai-processing-panel.component.html` (lines 85 & 96) to remove any mention of email:
    - Replace *"We'll notify you here and by email"* with *"We'll notify you here in the platform"* (or *"in the notification center"*).
  - Update unit test assertions in `ai-processing-panel.component.spec.ts` (e.g. line 127).
- In Bilateral AI copy constants / interfaces (`bilateral-ai.interfaces.ts`, `BILATERAL_COPY` if applicable):
  - Ensure all related tooltips, drawer captions, or disclaimers reflect in-platform notification.

---

## 6. Non-Goals

- Modifying email dispatch for other platform events (e.g. user invitations, password recovery, submission approvals/rejections in QA, or bilateral review contributor requests).
- Adding complex per-user notification preferences for AI jobs (the client requirement is an organization-wide mandate: no emails).
- Redesigning the notification bell overlay or database schema.

---

## 7. Affected Users, Systems, And Specs

| Entity | Impact |
|---|---|
| **Center Result Submitters / Authors** | Will no longer receive email clutter upon AI extraction completion; will see the notification bell badge and in-app completion dialog. |
| **Server Backend (`onecgiar-pr-server`)** | `BilateralAiNotificationsService` stops calling `emailService.sendEmail` for AI jobs. |
| **Client Frontend (`onecgiar-pr-client`)** | `AiProcessingPanelComponent` copy updated; unit tests updated. |
| **Related Specs** | Extends `docs/specs/archive/2026-09-15-bilateral--ai-processing-feedback/`. |

---

## 8. Visual Reference

- **Source:** User screenshot (`orca-paste-1789767477966-0a520293-8a56-42de-8c24-670f941d65f0.png`) showing the AI upload drawer (`Set up bilateral result`) and the subsequent processing panel.
- **Location:** `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.html`.
- **Notes:** Minor copy change on the processing panel and setup flow; no visual restructuring needed.

---

## 9. Requirement Delta Preview

### ADDED Requirements
- **`AIN-R-1` (Platform-Centric Notification Copy):** The client processing panel MUST inform users that job completion notifications are delivered within the platform, without referencing email.

### MODIFIED Requirements
- **`AIN-R-2` (Terminal Notification Dispatch):** `BilateralAiNotificationsService.notifyTerminal()` MUST emit an in-app notification row to `notificationService.emitBilateralAiJobNotification()`, but MUST NOT send any outbound emails.

### REMOVED Requirements
- **`AIN-R-3` (Automated Terminal Emails):** Outbound email delivery via Amazon SES for bilateral AI jobs (`results_ready`, `no_candidates`, `failed`, `timed_out`) is retired.

---

## 10. Approach Options

### Option 1 (Recommended) — Complete Elimination of AI Job Emails & Dedicated In-Platform Notification
- **Details:** Silence `sendTerminalMail` in `BilateralAiNotificationsService` entirely, keep in-app notification emission active, and adjust all client UI strings to state *"We'll notify you here in the platform when it finishes."*
- **Pros:**
  - Directly fulfills the client's explicit mandate without ambiguity.
  - Zero database schema migrations or complex configuration overhead.
  - Clean, minimal diff across 2–3 files with zero regression risk.
- **Cons:** None.

### Option 2 — Configurable Feature Flag (`BILATERAL_AI_EMAIL_NOTIFICATIONS_ENABLED`)
- **Details:** Wrap `sendTerminalMail()` in an environment variable check (default `false`).
- **Pros:** Allows re-enabling in staging if testing email templates.
- **Cons:** Adds unnecessary dead configuration if the business decision is definitive.

---

## 11. Recommended Approach

**Option 1**: Completely disable the outbound email dispatch in `BilateralAiNotificationsService` for bilateral AI jobs, and align the client copy to promise in-platform notification. This is the smallest, safest, and most direct change.

---

## 12. Risks, Dependencies, And Open Questions

- **Risks:** Very low. Server-side notification service already handles in-app rows gracefully with `try/catch` and fail-safe logging.
- **Dependencies:** None.
- **Open Questions:**
  - *OQ-1:* Should the email template files (`templates/bilateral-ai-*.hbs`) be preserved in the codebase for historical reference? (*Recommendation: Yes, keep templates intact in repo; just disable invocation in service.*)
  - *OQ-2:* Preferred English wording for the processing panel: *"We'll notify you here in the platform when it finishes"* or *"We'll notify you via your in-app alerts when it finishes"*?

---

## 13. Success Criteria

- [ ] Submitting an AI extraction job does NOT generate any outbound email upon completion or failure.
- [ ] An in-app notification is successfully registered in the platform database upon job completion, visible via the navbar notification bell (`header-panel`).
- [ ] The AI processing panel displays clean copy stating that notifications are delivered within the platform.
- [ ] All unit test suites in `bilateral-ai-notifications.service.spec.ts` and `ai-processing-panel.component.spec.ts` pass cleanly.

---

## 14. Next Step

To proceed with drafting requirements, technical design, and tasks:

```text
/akili-specify bilateral/ai-in-app-notifications
```
