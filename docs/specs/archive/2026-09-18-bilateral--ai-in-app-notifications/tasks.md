# Module Spec — `tasks.md`: Bilateral AI In-Platform Notifications

## 1. Scope of this Task List

- **Module / Feature:** `bilateral` / `ai-in-app-notifications`
- **Linked Spec:**
  - Requirements: [`docs/specs/bilateral/ai-in-app-notifications/requirements.md`](./requirements.md)
  - Technical Design: [`docs/specs/bilateral/ai-in-app-notifications/design.md`](./design.md)
  - Proposal: [`docs/specs/bilateral/ai-in-app-notifications/proposal.md`](./proposal.md)
- **Driver:** Juan Carlos Cadavid
- **Status:** ready-to-execute
- **Approval Mode:** gated (default)
- **Parallel Safety:** Yes (`AIN-T-1` and `AIN-T-2` operate on completely separate packages: server vs client).

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` is complete and approved.
- [x] `design.md` is complete and approved.
- [x] Open questions in `requirements.md` and `design.md` are resolved.
- [x] No database migrations or schema alterations required.
- [x] No conflicting in-flight specs touching `bilateral-ai-notifications.service.ts` or `ai-processing-panel.component.html`.

---

## 3. Task List

### `AIN-T-1` — Server: Suppress Bilateral AI Outbound Emails and Retain In-App Notifications

- **Status:** `[x]` (PASS · 2026-09-18)
- **Type:** `server`
- **Description:** Deactivate email transmission in `BilateralAiNotificationsService.notifyTerminal()` for all terminal outcomes (`results_ready`, `no_candidates`, `failed`, `timed_out`). Maintain in-app notification persistence via `notificationService.emitBilateralAiJobNotification()`. Update server unit tests to assert zero outbound SES calls and verify continued in-app database writes.
- **Implements:** `AIN-R-2`, `AIN-R-3`, `AIN-R-4`, `AIN-AC-1`, `AIN-AC-2`, `AIN-AC-3`, `AIN-AC-7`
- **Design Reference:** `design.md` §7.1, §7.2, `AIN-DD-1`, `AIN-DD-2`
- **Files:**
  - `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-notifications.service.ts`
  - `onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-notifications.service.spec.ts`
- **Depends on:** `—` (Can run immediately)
- **Blocks:** None
- **Estimate:** S (≤ 0.5 day, ~25 LOC diff)
- **Skills:** `nestjs-expert`
- **Definition of Done:**
  - [ ] `notifyTerminal()` does NOT call `sendTerminalMail()`.
  - [ ] In-app notification write via `notificationService.emitBilateralAiJobNotification()` remains fully operational.
  - [ ] `sendTerminalMail` is retained as a private method or annotated with `@deprecated` with no unused variable/method lint warnings.
  - [ ] `bilateral-ai-notifications.service.spec.ts` assertions updated:
    - Tests for `results_ready`, `no_candidates`, and `failed` assert `expect(stubs.emailService.sendEmail).not.toHaveBeenCalled()`.
    - Tests assert `expect(stubs.notificationService.emitBilateralAiJobNotification).toHaveBeenCalledTimes(1)`.
    - Timezone skew / duration test verifies that jobs $\ge 120$ s do NOT send email.
  - [ ] Unit tests pass:
    ```bash
    cd onecgiar-pr-server && npx jest src/api/bilateral-ai/services/bilateral-ai-notifications.service.spec.ts --silent
    ```
  - [ ] Lint passes:
    ```bash
    cd onecgiar-pr-server && npx eslint "src/api/bilateral-ai/services/bilateral-ai-notifications.service*.ts" --quiet
    ```

---

### `AIN-T-2` — Client: Update Processing Panel Copy to In-Platform Notifications & Align Tests

- **Status:** `[x]` (PASS · 2026-09-18)
- **Type:** `client`
- **Description:** Update UI copy in `AiProcessingPanelComponent` (`ai-processing-panel.component.html`) for both `processing` and `still_running` states, removing all promises of email notification and stating that notifications are delivered within the platform. Update unit test assertions in `ai-processing-panel.component.spec.ts` to reflect the new copy.
- **Implements:** `AIN-R-1`, `AIN-AC-4`, `AIN-AC-5`, `AIN-AC-6`
- **Design Reference:** `design.md` §8.1, §8.2, `AIN-DD-3`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.spec.ts`
- **Depends on:** `—` (Can run in parallel with `AIN-T-1`)
- **Blocks:** None
- **Estimate:** S (≤ 0.5 day, ~10 LOC diff)
- **Skills:** `angular-developer`
- **Definition of Done:**
  - [ ] Line 85 in `ai-processing-panel.component.html` updated to:
    `You can leave this page. We'll notify you here in the platform when it finishes.`
  - [ ] Line 96 in `ai-processing-panel.component.html` updated to:
    `<p class="m-0 mt-[4px] text-[12.5px] text-[var(--pr-text-secondary)]">We'll notify you here in the platform when it finishes.</p>`
  - [ ] Zero occurrences of `"by email"` or `"and by email"` remain in `ai-processing-panel.component.html`.
  - [ ] Unit test in `ai-processing-panel.component.spec.ts` (`APF-R-7`) updated:
    - Asserts `expect(text()).toContain("notify you here in the platform");`
    - Asserts `expect(text().toLowerCase()).not.toContain('email');`
  - [ ] Unit tests pass:
    ```bash
    cd onecgiar-pr-client && npx jest src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.spec.ts --silent
    ```
  - [ ] Lint passes:
    ```bash
    cd onecgiar-pr-client && npx ng lint --quiet
    ```

---

## 4. Execution Sequence & Traceability Matrix

| Task | Package | Requirements Covered | Acceptance Criteria | Dependencies | Parallel-Safe |
|---|---|---|---|---|---|
| `AIN-T-1` | `onecgiar-pr-server` | `AIN-R-2`, `AIN-R-3`, `AIN-R-4` | `AIN-AC-1`, `AIN-AC-2`, `AIN-AC-3`, `AIN-AC-7` | None | Yes |
| `AIN-T-2` | `onecgiar-pr-client` | `AIN-R-1` | `AIN-AC-4`, `AIN-AC-5`, `AIN-AC-6` | None | Yes |

---

## 5. Verification Commands Summary

Execute from repository root:

```bash
# Server verification
cd onecgiar-pr-server && npx jest src/api/bilateral-ai/services/bilateral-ai-notifications.service.spec.ts --silent && npx eslint "src/api/bilateral-ai/services/bilateral-ai-notifications.service*.ts" --quiet

# Client verification
cd onecgiar-pr-client && npx jest src/app/pages/bilateral/components/ai-processing-panel/ai-processing-panel.component.spec.ts --silent && npx ng lint --quiet
```
