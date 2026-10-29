# Requirements — Bilateral AI Queue Confirmation Card: Informational Style

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-queue-card-info` |
| **Spec Path** | `docs/specs/bilateral/ai-queue-card-info/` |
| **Type** | Enhancement (UX) — follow-up to the queued-toast spec |
| **Depth** | **Lite** — client-only, one template block, no new tokens, no new logic |
| **Approval Mode** | gated (no proposal; created directly by `/akili-specify`) |
| **Requirement prefix** | `AQC` (AI Queue Card): `AQC-R-n`, `AQC-AC-n`, defect classes `AQC-Dn` |
| **Owner** | Maria Camila Giraldo (M.Giraldo@cgiar.org) |
| **Status** | draft — awaiting Phase 1 approval |
| **Ticket(s)** | Follow-up to P2-4034 (ticket id of this follow-up not provided) |
| **Source of intent** | Ticket text of 2026-10-29 (reproduced 2/2 on prtest, Bilateral > IRRI, admin) |
| **Builds on** | `docs/specs/archive/2026-10-27-bilateral--ai-queue-toast-info/` (`AQT-R-1`; its `OQ-1` is the question this spec answers) · `docs/specs/bilateral/ai-processing-queue/` (`AIQ-R-7` B) |
| **Baseline cited** | `docs/ux-ui/design.md` §10 a11y · `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, no hex, `--pr-*` tokens) |

---

## 1. Executive Summary

Right after a successful AI submission the user sees two notices for one event: the toast (already blue with an `info` icon) and the inline confirmation card, which is still green with a `task_alt` check. The card reads as "done" although the job is only queued.

This spec moves that card to the platform's blue informational family and the `info` icon. Text, the **Open AI processes** and **Choose another project** actions, and their behavior stay exactly as they are.

---

## 2. Glossary

| Term | Meaning here |
|---|---|
| **Confirmation card** | The inline block `data-testid="aiu-confirmation-card"` at the top of the AI upload panel, shown after a `202` (`bilateral-ai-upload.component.html:1-32`) |
| **Queued toast** | The global toast from `AQT-R-1`; already `info` (blue) |
| **Info family** | The `--pr-color-blue-*` scale: the same family the `pr-toast--info` variant uses |
| **Success family** | `--pr-status-approved-fg` / `--pr-status-approved-bg` (green) |

---

## 3. System Context & Scope

### 3.1 Current behavior (evidence as run at `36a367680`)

| # | Today | Evidence |
|---|---|---|
| C-1 | The card uses the success family for border, background, icon and title, and the secondary button's border and text; the icon is `task_alt` | `bilateral-ai-upload.component.html:4` (border, bg), `:8` (icon), `:10` (title), `:25` (button) |
| C-2 | The toast's info variant is blue: `--pr-color-blue-500` on the left border and the icon | `shared/components/pr-toast/pr-toast.component.scss:99-103` |
| C-3 | The card's only other copy and actions: title `copy.confirmation.title(project)`, subtitle, **Open AI processes** (`onOpenAiProcesses()`), **Choose another project** (`onChooseAnotherProject()`) | `bilateral-ai-upload.component.html:10-11,19,27`; `internationalization/bilateral-ai-processes.copy.ts` |
| C-4 | **The "You are reporting on behalf of" banner is violet, not blue**: it uses the `--pr-color-primary-*` scale. The ticket names it as a blue reference; it is not one. See `OQ-1` | `bilateral-ai-upload.component.scss:15-29` (`--pr-color-primary-50/100/600/400`) |
| C-5 | The `info` icon already exists in this same template (the banner's `<i>info</i>`) | `bilateral-ai-upload.component.html:49` |

### 3.2 In scope

- Icon, border, background and text colors of the confirmation card and the color of its secondary button.

### 3.3 Out of scope

- Copy, button behavior, show/hide logic (`justSubmittedProjectName()`), the toast, the completion ("ready") toast, the "reporting on behalf" banner (not touched, even though it is violet).

---

## 4. Personas

| Persona | Impact |
|---|---|
| Bilateral result submitter (center staff using AI drafts) | The inline card no longer looks like "the drafts are done" |

---

## 5. Functional Requirements

### Requirement AQC-R-1: The card reads as informational, not as success (MUST)

The confirmation card SHALL show the `info` icon and the blue info family, in place of the `task_alt` icon and the success family.

#### Scenario: Card after a successful submission

- GIVEN a user whose AI submission was accepted (`202`)
- WHEN the confirmation card renders
- THEN its icon is `info`
- AND its border, background, title and icon colors come from the `--pr-color-blue-*` scale
- AND its text is unchanged: "`<project>` was added to the AI queue" and "It keeps running in the background — you can keep reporting while it works."
- BUT it must NOT show `task_alt` or any `--pr-status-approved-*` token
- AND IT MUST stay legible: text over the card background meets WCAG AA contrast (≥ 4.5:1 for text, ≥ 3:1 for the icon)

### Requirement AQC-R-2: Actions keep working (MUST)

#### Scenario: Open AI processes

- GIVEN the card is visible
- WHEN the user clicks **Open AI processes**
- THEN `onOpenAiProcesses()` runs exactly as today (drawer opens, `openedAiProcesses` emits, card dismissed)

#### Scenario: Choose another project

- GIVEN the card is visible
- WHEN the user clicks **Choose another project**
- THEN `onChooseAnotherProject()` runs exactly as today and `chooseAnotherProject` emits
- AND the secondary button uses the blue family too, so it does not keep a green outline on a blue card
- AND IT MUST keep a visible focus ring (`--pr-color-primary-300` outline, unchanged)

### Requirement AQC-R-3: Consistent with the toast (SHOULD)

The card SHOULD use the same blue family the queued toast uses (`--pr-color-blue-*`), with no new tokens, no hex values and no new SCSS.

---

## 6. Non-Functional Requirements

| ID | Requirement |
|---|---|
| AQC-NFR-1 | Accessibility unchanged: `role="status"` stays, the icon stays `aria-hidden`, meaning never depends on color alone (the icon changes too) |
| AQC-NFR-2 | No API, payload, or server change; no new i18n string |
| AQC-NFR-3 | Tailwind utilities in the template only (client rule: no new SCSS, no hex) |

---

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AQC-AC-1 | Submission accepted | Card renders | Icon text is `info`, never `task_alt` (`AQC-R-1`) |
| AQC-AC-2 | Card rendered | Inspect classes | Card root and children carry `--pr-color-blue-*` tokens and none of `--pr-status-approved-*` (`AQC-R-1`, `AQC-R-3`) |
| AQC-AC-3 | Card rendered | Read text | Title and subtitle are unchanged (`AQC-R-1`) |
| AQC-AC-4 | Card rendered | Click each button | Both actions behave as today (`AQC-R-2`) |
| AQC-AC-5 | Real browser, card visible | Look at it beside the toast | It reads as informational and not as a completed state; contrast passes AA (`AQC-R-1`) |

---

## 8. Defect Classes → Gate

| ID | Defect class | Gate |
|---|---|---|
| AQC-D1 | Icon still `task_alt` | Jest: render the real template, read the icon element's text (red on current code) |
| AQC-D2 | A success token survives on any card element (root, icon, title, secondary button) | Jest: assert the card's `outerHTML` contains no `status-approved` and does contain `pr-color-blue`. **Presence-assertion caveat:** this proves the tokens are in the markup, not that they paint blue |
| AQC-D3 | Text or actions lost or rerouted | Jest: existing specs (`open-drawer` / `choose-another` clicks and the card text) stay green, unmodified |
| AQC-D4 | The tokens paint something other than blue, or contrast fails (jsdom cannot resolve CSS variables or measure contrast) | **No automated gate. Substitute:** a human visual check at the HITL pause (submit once locally, compare card vs toast) plus the contrast arithmetic recorded in `execution.md`. Accepted risk if skipped |
| AQC-D5 | Tailwind does not emit an arbitrary `var(--pr-color-blue-*)` utility, so the class is present but inert | Covered by `AQC-D4` (needs a real build); additionally `npm run build` must pass |

---

## 9. Open Questions

| ID | Question | Default if unanswered |
|---|---|---|
| OQ-1 | The ticket says the "reporting on behalf of" banner uses the "correct informational blue", but it is violet (`--pr-color-primary-*`, C-4). The card cannot match both the blue toast and a violet banner. Which does it follow? | Follow the **toast** (blue scale), as the ticket's goal and `AQC-R-3` state. The banner is left alone |

---

## 10. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| AQC-R-1 | Card reads as informational, not success | MUST |
| AQC-R-2 | Actions keep working | MUST |
| AQC-R-3 | Consistent with the toast | SHOULD |
| AQC-NFR-1 | Accessibility unchanged | MUST |
| AQC-NFR-2 | No API / i18n change | MUST |
| AQC-NFR-3 | Tailwind utilities only | MUST |
