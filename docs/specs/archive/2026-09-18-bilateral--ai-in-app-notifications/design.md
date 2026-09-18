# Module Spec — `design.md`: Bilateral AI In-Platform Notifications

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/ai-in-app-notifications/` |
| **Type** | Change / Policy Enforcement |
| **Approval Mode** | gated (default) |
| **Author** | AKILI specify (T1 Architect) |
| **Date** | 2026-09-18 |
| **Linked Requirements** | `docs/specs/bilateral/ai-in-app-notifications/requirements.md` (`AIN-R-1` .. `AIN-R-4`, `AIN-AC-1` .. `AIN-AC-7`) |
| **Depends on** | `archive/2026-09-15-bilateral--ai-processing-feedback` (APF) |
| **Kaizen Lessons** | `KZ-bilateral--ai-processing-feedback-1` (single-surface notification and clear user expectations) |

---

## 2. Executive Summary

This technical design details the architectural changes required to eliminate outbound email notifications for AI-assisted bilateral extraction jobs while consolidating completion awareness strictly within the PRMS web platform.

The solution requires targeted modifications across two packages:
1. **Server (`onecgiar-pr-server`):** In `BilateralAiNotificationsService.notifyTerminal()`, suppress the execution of `sendTerminalMail()`. Maintain `notificationService.emitBilateralAiJobNotification()` to record in-app notification rows in the database, preserving deep links to draft results.
2. **Client (`onecgiar-pr-client`):** In `AiProcessingPanelComponent`, update the disclaimer and announcement copy in `ai-processing-panel.component.html` to remove all mentions of email, directing users to look for in-platform notifications.

---

## 3. Architecture Overview

### 3.1 Component & Interaction Topology

```
[Bilateral AI Job Worker / Poller / Controller]
        │
        ▼
BilateralAiNotificationsService.notifyTerminal(job, outcome, options)
        │
        ├──► 1. Query CLARISA institution (center acronym)
        ├──► 2. Query duration from MySQL (TIMESTAMPDIFF)
        ├──► 3. Build outcome copy + encoded deep link
        │
        ├──► 4. NotificationService.emitBilateralAiJobNotification(userId, copy + link)
        │         └── INSERT INTO result_notification (persisted in DB)
        │
        └──► 5. [SUPPRESSED] sendTerminalMail()
                  └── (SES email dispatch permanently bypassed)
```

### 3.2 Frontend Consumption Flow

```
[Result Submitter]
        │
        ├── Initiates AI extraction via Setup Drawer
        │     └── Sees: "You can leave this page. We'll notify you here in the platform when it finishes."
        │
        ├── Navigates away (or switches tabs)
        │     └── AI extraction runs in background
        │
        └── Returns to PRMS / Stays on PRMS
              ├── Header Panel Bell (#notifTrigger) displays unread badge count
              ├── Dropdown displays: "AI-assisted processing finished — N drafts ready for [Centre] · [Link]"
              ├── Clicking link navigates to: /bilateral/[Centre]/drafts
              └── If still in app: BilateralAiCompletionDialog opens floating modal
```

---

## 4. Extended Directory Structure

The files affected are strictly contained within existing modules:

```text
onecgiar_pr/
├── onecgiar-pr-server/
│   └── src/api/bilateral-ai/services/
│       ├── bilateral-ai-notifications.service.ts       # Suppress sendTerminalMail call
│       └── bilateral-ai-notifications.service.spec.ts  # Update test assertions (0 sendEmail calls)
└── onecgiar-pr-client/
    └── src/app/pages/bilateral/components/ai-processing-panel/
        ├── ai-processing-panel.component.html          # Update copy (remove email references)
        └── ai-processing-panel.component.spec.ts       # Update test expectation string
```

---

## 5. Data Model

**No database schema migrations or entity alterations are required.**
- `result_notification` entity is reused as-is.
- `bilateral_ai_job` entity is unmodified.
- No configuration flags or new tables are added.

---

## 6. API Design

**No HTTP or REST endpoint contracts are modified.**
- Endpoints under `/api/bilateral-ai/*` maintain their exact request/response signatures.
- Deep link format generated for notifications remains identical:
  `${frontendBase}/bilateral/${encodedAcronym}/drafts` (or `/create?job=${jobId}` on failure).

---

## 7. Backend Module Design (`onecgiar-pr-server`)

### 7.1 `BilateralAiNotificationsService` Modifications

- In `notifyTerminal(job: BilateralAiJob, outcome: BilateralAiTerminalOutcome, options: NotifyTerminalOptions)`:
  - Keep institution lookup, deep link construction, and outcome copy generation intact.
  - Maintain call to `this.notificationService.emitBilateralAiJobNotification(job.user_id, `${copy} ${link}`)`.
  - Remove or deactivate the `if (mailEligible) { await this.sendTerminalMail(...) }` block.
  - Retain `sendTerminalMail` as a deprecated private helper or isolate it to avoid unused-method lint warnings, ensuring zero invocations during runtime.
  - Preserve fail-safe logging in `try/catch` block to ensure any database notification failure does not bubble up to abort worker loops.

### 7.2 Unit Test Design (`bilateral-ai-notifications.service.spec.ts`)

- Update existing test suites under `describe('notifyTerminal')`:
  - Assert that `stubs.notificationService.emitBilateralAiJobNotification` is called once with the correct target user ID, copy, and link.
  - Assert that `stubs.emailService.sendEmail` is `not.toHaveBeenCalled()`.
  - Remove or adapt obsolete assertions that expected `stubs.templateRepository.findOne` or `stubs.emailService.sendEmail` to be called on jobs $\ge 120$ s.
  - Add explicit test case verifying that jobs running $\ge 120$ seconds do NOT send emails (`AIN-AC-1`, `AIN-AC-3`).

---

## 8. Frontend Component Architecture (`onecgiar-pr-client`)

### 8.1 `AiProcessingPanelComponent` Copy Alignment

- File: `ai-processing-panel.component.html`
  - In `processing` state block (around line 85):
    - Replace:
      `You can leave this page. We'll notify you here and by email.`
    - With:
      `You can leave this page. We'll notify you here in the platform when it finishes.`
  - In `still_running` state block (around line 96):
    - Replace:
      `<p class="m-0 mt-[4px] text-[12.5px] text-[var(--pr-text-secondary)]">We'll notify you here and by email when it finishes.</p>`
    - With:
      `<p class="m-0 mt-[4px] text-[12.5px] text-[var(--pr-text-secondary)]">We'll notify you here in the platform when it finishes.</p>`

### 8.2 Unit Test Design (`ai-processing-panel.component.spec.ts`)

- In test `APF-R-7: still running never says "timed out" and keeps ticking the elapsed clock`:
  - Update assertion:
    - Replace: `expect(text()).toContain("notify you here and by email");`
    - With: `expect(text()).toContain("notify you here in the platform");`
    - Add assertion: `expect(text().toLowerCase()).not.toContain('email');`

---

## 9. Shared Contracts & Interfaces

No changes required to shared interfaces or DTOs.

---

## 10. Design Decisions

### `AIN-DD-1`: Complete Deactivation of Outbound AI Terminal Emails
- **Context:** The client explicitly mandated that no emails be sent to users upon AI processing completion.
- **Decision:** Remove the call to `sendTerminalMail()` in `BilateralAiNotificationsService.notifyTerminal()`.
- **Alternatives Considered:**
  - *Add an environment flag `ENABLE_AI_EMAIL_NOTIFICATIONS`:* Rejected. The client requirement is an organization-wide mandate, not an environment-specific toggle. A dead flag adds configuration debt.
- **Consequences:** Zero emails sent; zero Amazon SES usage for bilateral AI extraction.

### `AIN-DD-2`: In-Platform Notification Bell as Authoritative Channel
- **Context:** Users who leave the page need an accessible record that their extraction finished and where to view drafts.
- **Decision:** Keep `emitBilateralAiJobNotification()`, which writes directly to `result_notification`. This notification is queried by `header-panel.component.html` and alerts the user with a red dot badge and direct hyperlink.
- **Consequences:** Reliable, persistent notification that stays inside PRMS without external clutter.

### `AIN-DD-3`: Synchronous Copy Realignment in Client Panel
- **Context:** The client UI previously stated *"We'll notify you here and by email"*.
- **Decision:** Update the copy to *"We'll notify you here in the platform when it finishes."* in both the standard processing panel and the still-running state.
- **Consequences:** Immediate user clarity; no misleading promises of external email alerts.

---

## 11. Step 2.3 — Challenge Reversions

> **Question:** "What does removing outbound email notifications break?"
>
> **Analysis:**
> - Removing `sendTerminalMail` means users who close their browser completely will not receive an alert in Outlook / Gmail.
> - **Why this does not break user workflows:**
>   1. This is the exact requested institutional policy: users and managers explicitly complained about email inbox clutter from repeated AI extractions and requested that notifications be confined to the platform.
>   2. The in-platform notification persists in the MySQL database. When the user logs back into PRMS at any future point, the bell badge (`header-panel`) indicates unread notifications with the exact summary and direct link.
>   3. Users remaining on the platform receive immediate feedback via the completion modal dialog and the AI drafts count tab badge.
> - **Conclusion:** The reversion is fully safe, intended, and aligned with client requirements.

---

## 12. Step 2.4 — Budget Tripwire

| Metric | Budget | Rationale |
|---|---|---|
| **Expected Tasks** | 2 | Task 1: Server service & unit tests; Task 2: Client template & unit tests. |
| **Expected Net LOC** | < 60 LOC | Minor deletion / bypass in server service; test updates; 2-line template copy tweak. |
| **Expected Review Rounds** | 1 | Straightforward policy compliance change with clear testable assertions. |

If implementation exceeds 2 tasks or 100 LOC, the Leader MUST pause and escalate to the user.

---

## 13. Defect Prevention & Verification Plan

| Defect Risk | Prevention / Verification |
|---|---|
| Server sends email on $\ge 120$ s jobs | Server unit test asserts `emailService.sendEmail` has zero calls even with mocked 360 s elapsed time. |
| In-app notification lost | Server unit test asserts `notificationService.emitBilateralAiJobNotification` is called with exact text and link. |
| Client still shows "by email" | Client unit test asserts `text().toLowerCase()` does NOT contain `'email'`. |
| Lint or compilation errors | `npx eslint` in server and `npx ng lint` in client. |
