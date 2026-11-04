# Tasks — Bilateral AI Queue Toast: Informational Style

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `ai-queue-toast-info`
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md)
- **Owner / driver:** Maria Camila Giraldo (M.Giraldo@cgiar.org)
- **Status:** `in-progress` — `AQT-T-1` is `[x]` (Reviewer `PASS` + `AQT-D4` HITL check confirmed, see `execution.md`); spec moves to `shipped` once committed and rolled out (§6/§7)

---

## 2. Pre-flight checklist

Approval evidence (not execution evidence — tracked in prose per project convention, checkboxes reserved for `/akili-execute` evidence):

- `requirements.md`: approved by the user, 2026-10-27.
- `design.md`: approved by the user, 2026-10-27.
- Open questions: `OQ-1` resolved to its stated default (out of scope).
- CLARISA dependencies: n/a — no CLARISA involvement.
- Conflicting in-flight specs: none — `docs/specs/bilateral/ai-draft-spotlight` is archived; no other open spec touches `bilateral-ai-upload.component.ts` or `bilateral-ai.service.ts`.
- Migration: n/a — no schema change.

---

## 3. Task list

### `AQT-T-1` — Switch the queued toast to info severity and lock its test coverage `[x]`

> Reviewer `PASS` on all automated gates + `AQT-D4` HITL visual check confirmed by the user 2026-10-27 (see `execution.md`).

- **Type:** `client`, `tests`
- **Description:** Change the one literal that drives the queued toast's look (`severity: 'success'` → `'info'`) at the AI-upload submit handler, update the existing assertion that pins the old value, and close the two test gaps named in `requirements.md` §8: a render-level lock on the shared toast host's `info` variant (`AQT-D2`), and a lock on the unrelated "ready" completion toast so it can't drift off `success` by accident (`AQT-D5`).
- **Implements:** `AQT-R-1` (both scenarios), `AQT-R-2`, `AQT-NFR-1`, `AQT-NFR-2`, `AQT-AC-1`, `AQT-AC-2`, `AQT-AC-3`, `AQT-AC-4`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.ts` (`:596`)
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.spec.ts` (`:323`)
  - `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.component.spec.ts` (new test)
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` (new test)
- **Depends on:** `—`
- **Blocks:** `—` (only task in this spec)
- **Estimate:** `S`
- **Review:** `checklist` — single call site plus three test files, no shared symbol, selector, or payload contract changed.
- **Verification:**
  - **Falsifier:**
    - (D1) Revert `bilateral-ai-upload.component.ts:596` to `severity: 'success'` → the updated assertion at `bilateral-ai-upload.component.spec.ts:323` (`severity: 'info'`) fails.
    - (D2) Mutate `pr-toast.component.ts`'s `icons` map to `info: 'check_circle'` → the new `pr-toast.component.spec.ts` render test fails on the DOM icon-text assertion (real-artifact lock: read the rendered element, not the class list alone).
    - (D3) Mutate the queued toast's `action.run` to call `this.bilateralAiService.openDrawer()` directly instead of `this.onOpenAiProcesses()` → the existing `runAction` assertion at `bilateral-ai-upload.component.spec.ts:329-331` fails (already in place; this task must not weaken it).
    - (D5) Mutate `bilateral-ai.service.ts`'s "is ready" branch (`:481`) to `severity: 'info'` → the new locking assertion in `bilateral-ai.service.spec.ts` fails.
  - **Red run:**
    - (D1) `npx jest --silent --testPathPattern=bilateral-ai-upload.component.spec` — observed red on current code (`Expected: "info", Received: "success"`) before the `:596` edit; green after. Implementer quotes the exact observed line in `execution.md` before closing this task.
    - (D2)/(D5) — target behavior already exists and is already correct (not greenfield): the red is produced by applying the named mutation above, observed, then reverted to confirm green. `predicted — not applicable (mutation-based lock, observed at execution time)`.
  - **Disqualifier:** `AQT-D4` (is the rendered blue actually the platform's standard informational blue?) has **no automated gate** — jsdom cannot assert real color. If the HITL visual check (submit once locally, compare against the screenshot referenced in `requirements.md` §17 Source of intent) shows a mismatched blue, stop and re-specify the token before merging; do not rely on the Jest gates alone for this defect class.
  - **Consumers:** The `severity` literal at `bilateral-ai-upload.component.ts:596` has exactly one reader — the Jest assertion this task updates (`P-2` in `design.md`'s Premise Ledger: single call site, confirmed by `grep -rn "POST_bilateralAiJob(" onecgiar-pr-client/src/app --include='*.ts'` → 1 hit). `pr-toast.component.ts`'s `icons` map and `PrToastSeverity` type are read by three other callers (`websocket.service.ts:120`, `bilateral-ai.service.ts:465`, `bilateral-ai.service.ts:490`) — none of them change in this task; the new render test in `pr-toast.component.spec.ts` is the lock for that shared surface, not a sweep of all callers (they are untouched).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`). — pending: not yet committed.
  - [x] Lint clean (`npx ng lint --quiet` from `onecgiar-pr-client/`). — verified by Leader re-run, `execution.md` attempt 1.
  - [x] All four Jest assertions above pass; only the touched module's specs run (`npm run test -- --testPathPattern="bilateral-ai-upload.component.spec|pr-toast.component.spec|bilateral-ai.service.spec"`), per `onecgiar-pr-client/CLAUDE.md` §21.7 rule 25. — 103/103 passed, verified by Leader re-run.
  - [x] Client coverage thresholds (50/60/60/60) still met. — unaffected (only additive test assertions + one literal change).
  - [x] No secret or token leaked in logs or messages (`.cursorrules`). — confirmed by Reviewer.
  - [x] HITL visual check done: submitted once locally, queued toast compared against the screenshot in the Source of intent — blue `info` accent, `info` icon, same copy and **View** action. — confirmed by the user 2026-10-27 (`execution.md` follow-up).
  - [x] `git diff --stat` confirms no non-test line of `bilateral-ai.service.ts` changed (scope gate for `AQT-D5`). — confirmed by Leader re-run and Reviewer.

---

## 4. Dependency graph

```
AQT-T-1   (only task — no dependencies, nothing blocked)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `AQT-TEST-1` | unit (client) | `AQT-R-1`, `AQT-AC-1` | `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-ai-upload/bilateral-ai-upload.component.spec.ts:320-327` (updated) |
| `AQT-TEST-2` | unit (client) | `AQT-R-1`, `AQT-AC-2` | same file, `:329-331` (existing, re-verified unchanged) |
| `AQT-TEST-3` | unit (client) | `AQT-R-2`, `AQT-AC-3`, `AQT-D2` | `onecgiar-pr-client/src/app/shared/components/pr-toast/pr-toast.component.spec.ts` (new) |
| `AQT-TEST-4` | unit (client) | `AQT-R-1` completion scenario, `AQT-AC-4`, `AQT-D5` | `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` (new) |

Client coverage MUST stay above 50/60/60/60 per `onecgiar-pr-client/package.json`.

---

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, Jest, build).
- [ ] Manual QA: submit an AI job on a test project, confirm the queued toast is blue/`info` and the ready toast is still green/`success` (`AQT-D4` HITL substitute).
- [ ] No bilateral/platform-report payload touched — no downstream-consumer notice needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped`.
- [ ] No new UX pattern introduced (reuses the existing `info` variant) — nothing to promote into `docs/ux-ui/design.md` §12.
- [ ] `OQ-1` (inline confirmation card style) stays open, out of scope per `requirements.md` default — leave it recorded there, no action here.

---

## 8. Roll-back plan

1. Revert the merged PR.
2. No migration, no feature flag, no CLARISA cache to roll back.
3. Confirm the queued toast reads `success` (green) again on the reverted build.

---

## Required cross-references

- [`requirements.md`](./requirements.md), [`design.md`](./design.md) — same folder.
- `onecgiar-pr-client/CLAUDE.md` §9 ("run only the touched module's specs"), §21.7 rule 25.
