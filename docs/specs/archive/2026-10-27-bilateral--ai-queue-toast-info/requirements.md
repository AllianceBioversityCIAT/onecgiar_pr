# Requirements — Bilateral AI Queue Toast: Informational Style

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-queue-toast-info` |
| **Spec Path** | `docs/specs/bilateral/ai-queue-toast-info/` |
| **Type** | Enhancement (UX) |
| **Depth** | **Lite** — client-only, one toast call site, no new styles |
| **Approval Mode** | gated (no proposal; created directly by `/akili-specify`) |
| **Requirement prefix** | `AQT` (AI Queue Toast): `AQT-R-n`, `AQT-AC-n`, defect classes `AQT-Dn` |
| **Owner** | Maria Camila Giraldo (M.Giraldo@cgiar.org) |
| **Status** | draft — awaiting Phase 1 approval |
| **Ticket(s)** | — (not provided) |
| **Source of intent** | User request 2026-10-27 (enhancement ticket text + screenshot of the toast) |
| **Builds on** | `docs/specs/bilateral/ai-processing-queue/` (`AIQ-R-7` B: "a toast confirms with a **View** action"; `AIQ-R-11`: completion toasts) |
| **Baseline cited** | `docs/prd.md` §5 (AI helpers) · `docs/ux-ui/design.md` §10 a11y (toasts use live regions) |

---

## 1. Executive Summary

When a user submits evidence for AI draft generation, the global toast says "`<project>` was added to the AI queue" but is styled as **success**: a green border and a green `check_circle` icon. That reads as "done", even though the job has only been queued.

This spec changes that one toast to the platform's **info** severity: a blue border and the `info` icon. The text, the **View** action, and every other toast stay the same. The "ready" completion toast stays green, so queued and finished now look different.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Queued toast** | The global toast shown right after a successful AI job submission (`202`) from the bilateral AI upload |
| **Completion toast** | The sticky toast shown when a polled job reaches a terminal state (`AIQ-R-11`) |
| **Info / success style** | The variants the shared PRMS toast host (`app-pr-toast`) draws for severity `info` / `success` |

---

## 3. System Context & Scope

### 3.1 Current behavior (evidence as run at `38853f264`)

| # | Today | Evidence |
|---|---|---|
| C-1 | The queued toast is sent with `severity: 'success'`, key `globalUserNotification`, copy summary/detail and a **View** action that calls `onOpenAiProcesses()` | `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.ts:594-603` (severity at `:596`) |
| C-2 | The toast host maps `success` → `check_circle` and `info` → `info` icons. The `pr-toast--success` variant is green (`--pr-color-green-500`) and `pr-toast--info` is blue (`--pr-color-blue-500`) | `shared/components/pr-toast/pr-toast.component.ts:27-32`; `pr-toast.component.scss:92-104` |
| C-3 | This is the only client call site that submits an AI job, and so the only place that shows the queued toast. Retry (`retryJob`) shows no toast | `grep -rn "POST_bilateralAiJob(" onecgiar-pr-client/src/app --include='*.ts'` (non-spec) → 1 call: `bilateral-ai-upload.component.ts:580`; `bilateral-ai.service.ts:237-259` |
| C-4 | Other in-progress or neutral platform notices already use `info`: the websocket notification, the grouped "N jobs finished" toast, and "finished — no results" | `sockets/websocket.service.ts:120`; `bilateral-ai.service.ts:465,490` |
| C-5 | The "`<label>` is ready" completion toast uses `success` | `bilateral-ai.service.ts:478-485` (severity at `:481`) |

### 3.2 In scope

- The severity of the queued toast only.

### 3.3 Out of scope

- The inline confirmation card under the upload header (the green banner in the screenshot with **Open AI processes** / **Choose another project**). It is not a toast; see `OQ-1`.
- Toast copy, the toast host's styles or icons, and the completion toasts (C-5 stays `success`).
- The "Recording saved" toast (`bilateral-ai-upload.component.spec.ts:604`). It reports an action that did finish, so `success` is correct.

---

## 4. Personas

| Persona | Impact |
|---|---|
| Bilateral result submitter (center staff using AI drafts) | No longer misreads "queued" as "drafts ready" |

---

## 5. Functional Requirements

### Requirement AQT-R-1: Queued toast uses the informational style (MUST)

The system SHALL show the queued toast with the **info** severity of the shared toast host.

#### Scenario: Successful AI submission

- GIVEN a user on the bilateral AI upload with a project and valid evidence
- WHEN they submit and the API accepts the job
- THEN a global toast appears with a blue (info) accent and the `info` icon
- AND its summary is unchanged: "`<project>` was added to the AI queue"
- AND its detail is unchanged: "We'll notify you when it finishes. You can keep working in the meantime."
- AND IT MUST still offer the **View** action, which opens AI processes through the same handler as today (`onOpenAiProcesses()`, so a host drawer closes instead of stacking)
- BUT it must NOT show the green `check_circle` icon or the green success accent

#### Scenario: Completion stays distinct

- GIVEN a queued job of the user
- WHEN it completes with drafts
- THEN the "`<label>` is ready" toast still uses the success style
- BUT the queued toast and the ready toast must NOT share a style

### Requirement AQT-R-2: Consistency with platform info notices (MUST)

The queued toast SHALL use the existing `info` variant of `app-pr-toast`, with no new colors, icons, or CSS. It then looks the same as the other `info` notices (C-4).

---

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| AQT-NFR-1 | Accessibility is unchanged: the toast keeps `role="alert"` and the visible text. Meaning does not depend on color alone, because the icon changes as well |
| AQT-NFR-2 | No API, payload, or server change |

---

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AQT-AC-1 | Valid AI upload | Submit → `202` | The toast has `severity: 'info'`, the same summary/detail, and a **View** action (`AQT-R-1`) |
| AQT-AC-2 | Toast shown | Click **View** | AI processes opens through `onOpenAiProcesses()` (`AQT-R-1`) |
| AQT-AC-3 | Host renders an `info` toast | — | The element has class `pr-toast--info` and the icon text `info`, not `check_circle` (`AQT-R-1`, `AQT-R-2`) |
| AQT-AC-4 | Job completes with drafts | Poll | The ready toast is still `success` (`AQT-R-1` completion scenario) |

---

## 8. Defect Classes → Gate

| ID | Defect class | Gate |
|---|---|---|
| AQT-D1 | Call site still sends `success` (or another severity) | Jest: the upload spec asserts `severity: 'info'` on the queued toast (red on current code) |
| AQT-D2 | The `info` variant does not render the info icon or class (the host mapping drifts) | Jest: a `pr-toast` component spec renders an `info` toast and reads the real DOM icon text and class |
| AQT-D3 | **View** action lost or rerouted | Jest: the existing upload spec runs `action.run()` and asserts the drawer opens or `openedAiProcesses` emits |
| AQT-D4 | Blue is not actually the platform's "standard informational blue" on screen | No automated contrast/color check in jsdom. **Substitute:** a human visual check at the HITL pause (submit once locally, compare with the screenshot) |
| AQT-D5 | The ready completion toast changes by accident | Scope gate: `git diff --stat` must not touch `bilateral-ai.service.ts`. No existing spec asserts the ready toast's severity (`grep -n "is ready\|severity: 'success'" bilateral-ai.service.spec.ts` → 0 hits), so the task adds one assertion locking `success` |

---

## 9. Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| OQ-1 | The inline confirmation card in the screenshot ("`<project>` was added to the AI queue", green background) also signals "queued". Should it move to an info/neutral style too? | Out of scope: the ticket names only "the notification" (the toast) |

---

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| AQT-R-1 | Queued toast uses the informational style | MUST |
| AQT-R-2 | Consistency with platform info notices | MUST |
| AQT-NFR-1 | Accessibility unchanged; not color-only | MUST |
| AQT-NFR-2 | No API change | MUST |
