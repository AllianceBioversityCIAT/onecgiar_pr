# Design — Bilateral AI Queue Toast: Informational Style

## Document Control

| Field | Value |
|---|---|
| **Module** | `bilateral` |
| **Sub-feature** | `ai-queue-toast-info` |
| **Depth** | Lite — client-only, one call site, no new styles |
| **Status** | draft — awaiting Phase 2 approval |
| **Requirements** | [`requirements.md`](./requirements.md) (`AQT-R-1`, `AQT-R-2`, `AQT-NFR-1`, `AQT-NFR-2`) |
| **Baseline cited** | `docs/ux-ui/design.md` §10 (a11y, live regions) · `onecgiar-pr-client/CLAUDE.md` §5 (Tailwind-first, no new SCSS) |

---

## 1. Executive Summary

Flip one literal — `severity: 'success'` → `severity: 'info'` — on the queued-toast call in `bilateral-ai-upload.component.ts:596`. The shared toast host (`app-pr-toast`) already renders an `info` variant (blue border, `info` icon) with zero changes needed. No new component, no new CSS, no API/DTO change. The only other work is closing two test gaps: locking the call site's severity assertion to `info`, and adding a regression lock so the unrelated "ready" completion toast (`bilateral-ai.service.ts`) can't silently drift off `success` later.

---

## 2. Architecture Overview

Pure client change inside `onecgiar-pr-client`. No server module touched, no new integration.

```
[bilateral-ai-upload.component.ts onSubmit() success handler]
  └── messageService.add({ key: 'globalUserNotification', severity: 'info', ... })
        └── [app-pr-toast host] (pr-toast.component.ts/html/scss — UNCHANGED)
              ├── iconFor('info') → 'info'            (already mapped, :27-32)
              └── class pr-toast--info → blue border  (already styled, :99-102)
```

The completion ("`<label>` is ready") toast in `bilateral-ai.service.ts:478-485` is untouched and stays `success` — it is a separate call site (`AQT-R-1` completion scenario).

---

## 3. Extended Directory Structure

No new files. Touched files only:

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.ts` | `:596` `severity: 'success'` → `severity: 'info'` |
| `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.spec.ts` | `:323` update expected `severity` to `'info'` |
| `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.component.spec.ts` | Add one test: render an `info` toast, read the real DOM class + icon text |
| `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` | Add one locking assertion: the "is ready" toast keeps `severity: 'success'` |

---

## 4. Data Model

N/A — no entity or migration change (`AQT-NFR-2`).

---

## 5. API Design

N/A — no endpoint, DTO, or payload change (`AQT-NFR-2`).

---

## 6. Backend Module Design

N/A — client-only change; no `onecgiar-pr-server` module touched.

---

## 7. Frontend / UX Component Architecture

- **`bilateral-ai-upload.component.ts:596`** — the only line that changes in production code. Summary (`this.copy.toast.summary(projectLabel)`), detail (`this.copy.toast.detail`), `key`, and `action` (`onOpenAiProcesses()`) are all unchanged — only the `severity` literal flips.
- **`pr-toast.component.ts` / `.html` / `.scss`** — no change. The `info` variant already exists and is already used by three other call sites (`websocket.service.ts:120`; `bilateral-ai.service.ts:465` grouped "N jobs finished"; `bilateral-ai.service.ts:490` "finished — no results"), which is the evidence for `AQT-R-2` (consistency with existing info notices).
- **`bilateral-ai.service.ts:478-485`** (ready/completion toast) — no change. Stays `severity: 'success'`.

A11y (`AQT-NFR-1`): `role="alert"` and the visible summary/detail text are unaffected by the severity change — `pr-toast.component.html` renders `role="alert"` regardless of severity, and `iconFor()` only changes which icon glyph is shown, not whether text is present.

---

## 8. Shared Contracts or Package Extensions

N/A — `PrToastSeverity` (`pr-toast.service.ts`) already includes `'info'` as a member; no type or contract change.

---

## 9. Design Decisions

### `AQT-DD-1` — Reuse the existing `info` variant; no new severity, class, or helper

- **Context:** `AQT-R-2` requires the queued toast to use the platform's existing `info` variant with "no new colors, icons, or CSS."
- **Decision:** Change only the `severity` literal at the one call site.
- **Alternatives considered:**
  1. Add a new "queued" severity/style to `app-pr-toast` — rejected: duplicates `info`'s existing semantics and directly violates `AQT-R-2`.
  2. Extract a `showQueuedToast()` helper on the component — rejected: only one call site exists today (`C-3`: `grep -rn "POST_bilateralAiJob(" onecgiar-pr-client/src/app --include='*.ts'` → 1 hit), so a helper is a premature abstraction for a one-line change.
- **Consequences:** Zero new surface area; the change is a single literal swap.
- **Reversion challenge (Step 2.3):** This DD changes the visual severity of an already-shipped toast (green `success` → blue `info`), which is a reversion of shipped visual behavior — not skipped under the Lite exemption because the behavior has both a visible surface (user-facing toast color) and an existing test (`bilateral-ai-upload.component.spec.ts:320-327`). **Challenge: "what does removing the `success` styling from the queued toast break?"** **Answer:** Nothing. The only consumer of this literal's value is the Jest assertion this same task updates; no other code branches on this toast's severity (it only drives `pr-toast`'s internal class/icon lookup, which is itself unchanged).

### `AQT-DD-2` — Add a regression lock for the unrelated "ready" toast (`AQT-D5`)

- **Context:** `D5` names "the ready completion toast changes by accident" as a defect class with no existing automated gate — confirmed absent (`P-3` below).
- **Decision:** Add one assertion in `bilateral-ai.service.spec.ts` asserting `severity: 'success'` on the `announceTerminalJob` "is ready" path (`:481`), in addition to the scope gate (`git diff --stat` must not touch non-test lines of `bilateral-ai.service.ts`).
- **Alternatives considered:** Rely only on the manual `git diff --stat` scope check — rejected: not automated, and the requirement (`D5`) explicitly calls for the Jest lock as the primary gate, with the diff check as a secondary net.
- **Consequences:** One additional test; acts as a tripwire if a future change to `bilateral-ai.service.ts` accidentally touches this unrelated toast.

---

## 10. Premise Ledger

**Count:** 3 verified, 0 `UNVERIFIED`.
**Blast-radius triggers:** none apply — the change swaps a literal `severity` value already reached through an existing, unchanged dispatch path (`C-1`/`C-3` in `requirements.md`); it adds no branch point, touches no state shared across components, and changes no exported symbol, selector, or emitted event.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `app-pr-toast` already renders severity `info` with a blue border and the `info` icon glyph, with no CSS/markup changes needed | `existence` | `pr-toast.component.scss:99-102` (`&--info { border-left-color: var(--pr-color-blue-500); ...; color: var(--pr-color-blue-500) }`); `pr-toast.component.ts:27-32` (`icons` map: `info: 'info'`); `pr-toast.component.html:4` (`class="pr-toast pr-toast--{{ toast.severity \|\| 'info' }}"`) | `38853f264` | `AQT-R-2` would be unmet; the task would need to add CSS/markup to `pr-toast` — **High** | — (verified) |
| P-2 | `bilateral-ai-upload.component.ts:580-603` is the only client call site that submits a bilateral AI job and shows the queued toast | `existence` | `grep -rn "POST_bilateralAiJob(" onecgiar-pr-client/src/app --include='*.ts'` → 1 hit (`bilateral-ai-upload.component.ts:580`) | `38853f264` | A second call site would need the same change, adding a second task — **High** | — (verified) |
| P-3 | No existing test asserts the "is ready" completion toast's severity, so `AQT-DD-2`'s lock is a net-new assertion | `existence` (negative) | `grep -n "is ready\|severity: 'success'" onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` → 0 hits | `38853f264` | The task would only need to confirm an existing assertion rather than add one — **Low** | — (verified) |

---

## 11. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~20 (1-line prod change + 1-line updated assertion + ~10-line new `pr-toast` render test + ~10-line new lock assertion) |
| Expected review rounds | 1 |

Matches the declared **Lite** depth — no resize needed.

---

## Required cross-references

- [`requirements.md`](./requirements.md) (same folder)
- `docs/ux-ui/design.md` §10 (a11y / live regions)
- `onecgiar-pr-client/CLAUDE.md` §5 (styling rules — no new SCSS needed here)
