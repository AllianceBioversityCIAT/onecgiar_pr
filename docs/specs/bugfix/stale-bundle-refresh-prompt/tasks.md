# Module Spec — `tasks.md`

**Spec:** `bugfix/stale-bundle-refresh-prompt` · Links `requirements.md` + `design.md` (same folder) · `docs/prd.md` · `docs/trd/trd.md:412` · `onecgiar-pr-client/src/CLAUDE.md`.

---

## 1. Scope of this task list

- **Module / feature:** `onecgiar-pr-client` — app shell (`AppComponent`) + i18n
- **Linked spec:** `requirements.md` + `design.md`
- **Target phase:** next client release
- **Owner / driver:** M. Giraldo (QA)
- **Status:** complete — `SBR-T-1` PASSed attempt 2 (see `execution.md`)

---

## 2. Pre-flight checklist

- [x] `requirements.md` approved (user: Continue)
- [x] `design.md` approved (user: Continue)
- [x] Open questions: none outstanding in either document
- [x] No CLARISA dependency (client-only, no catalog involved)
- [x] No conflicting in-flight spec: `docs/specs/bugfix/*` siblings (`bilateral-approved-open-route`, `bilateral-geography-extra-metadata`, `bilateral-project-codes`, `p2-3382-bilateral-long-term-degree`, `p2-3652-bilateral-versioning-guard-dead-branch`) touch Bilateral *business logic*, not `app.component.ts`/routing/toast infra — no overlap
- [x] No migration — N/A

---

## 3. Task list

### `SBR-T-1` — Detect stale lazy-chunk import failures and prompt refresh

- **[x] Status:** PASS (attempt 2, 2026-10-14) — Reviewer `STATUS: PASS` with 3 non-gating ADVISORY findings. Pivot (see `execution.md` Pivot Record) added a second `<app-pr-toast key="stale-bundle-refresh" />` host and a DOM-level render assertion; both now in place and verified. Attempt 1 did not count against the 3-attempt ceiling per Pivot Detection (detection/dedup/reload logic was correct on attempt 1; only the render path was missing). Full audit trail in `execution.md`.
- **Type:** `client` + `tests`
- **Description:** In `AppComponent.ngOnInit()`, add a second `router.events` subscription (alongside the existing `NavigationEnd` one) filtered to `NavigationError`. When the error message matches a known dynamic-import/chunk-load failure pattern, show a sticky, keyed `PrToastService` toast ("A new version of PRMS is available — refresh to continue") with a "Refresh now" action that calls `window.location.reload()`; skip re-adding if the keyed toast is already visible. Add a new `stale-bundle-refresh.copy.ts` i18n constants file for the banner strings. Log (via `logger.service.ts`) the attempted route + error message on detection. **Added 2026-10-14 (Pivot, `SBR-P-3b` in `design.md`):** also add a second `<app-pr-toast key="stale-bundle-refresh" />` host in `app.component.html` (alongside the existing `key="globalUserNotification"` host at line 91) — `PrToastComponent` only renders toasts whose key matches a mounted host's `[key]` input, and no host existed for this new key on attempt 1 (Reviewer FAIL, see `execution.md`). Without this host the toast is added to `PrToastService.toasts()` but never renders.
- **Implements:**
  - `SBR-R-1` — both its scenario clauses: "app's root-level listener receives the Router's `NavigationError`" AND "must not leave the click silently doing nothing" AND "must not be a one-shot flag" (re-evaluates every qualifying event, not just the first in the session).
  - `SBR-R-2` — "sticky toast is shown with the approved copy" clause.
  - `SBR-R-3` — "`window.location.reload()` is invoked" clause.
  - `SBR-R-4` — "wired once, globally (app-root level)" clause; test scope limited to `/bilateral/**` per the explicit narrowing in the same requirement.
  - `SBR-R-10` — "existing toast is reused (same key) rather than a second toast being added" clause.
  - Negative scenario "Unrelated navigation errors are not mistaken for a stale bundle" — both its clauses ("MUST NOT show the banner" AND "MUST NOT suppress... whatever existing handling... already receives", satisfied by construction since the listener is additive and a non-matching error triggers no action at all).
- **Design references:** `design.md` §2.2 (sequence), §6.2 (component/service plan), `SBR-DD-1`, `SBR-DD-2`, `SBR-DD-3`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/app.component.ts` (edit)
  - `onecgiar-pr-client/src/app/app.component.html` (edit — add `<app-pr-toast key="stale-bundle-refresh" />` host; added 2026-10-14, Pivot `SBR-P-3b`)
  - `onecgiar-pr-client/src/app/app.component.spec.ts` (edit — new test block)
  - `onecgiar-pr-client/src/app/internationalization/stale-bundle-refresh.copy.ts` (new)
- **Depends on:** — (first and only task)
- **Blocks:** — (none)
- **Estimate:** `M`
- **Review:** `checklist` — standard scoped task; no shared contract (`PrToastService` API, `AppComponent`'s public surface) changes, no migration, no auth/payload touch.
- **Skills:** `angular-developer` (component/routing/signal work, per Skill Map); `tdd` (red-before/green-after regression test authored alongside the fix, assigned per Leader convention for logic-heavy tasks). `systematic-debugging` was already applied during Phase 2 exploration (scout-verified root cause) and is not re-invoked here.
- **Verification:**
  - **Falsifier:** In the test, configure `RouterTestingModule` so the real `/bilateral` route's `loadChildren` is overridden to `() => Promise.reject(new Error("TypeError: Failed to fetch dynamically imported module: https://prtest.ciat.cgiar.org/bilateral.module-abc123.js"))`, then `router.navigateByUrl('/bilateral/CIAT/home')` (the exact path the W3 "Where to report" row resolves to, per `reporting-entry-hub.component.html:318`). **Correct vs. mutated divergence:** on the *post-fix* code, `prToastSE.toasts()` must contain exactly one entry keyed `'stale-bundle-refresh'`; the *mutation* "delete the `NavigationError` subscription" (equivalent to pre-fix code) must leave `toasts()` empty for the same navigation — this is the row the fixture must diverge on. A second, unrelated case (`loadChildren` rejects with a plain `Error('Guard rejected')`) must leave `toasts()` empty on both pre- and post-fix code (negative control — this row must NOT diverge, proving the match is pattern-based, not "any `NavigationError` at all"). **Added 2026-10-14 (Pivot, `SBR-P-3b`):** the falsifier's assertion on `prToastSE.toasts()` alone is NOT sufficient — attempt 1 passed this exact assertion while the banner was provably unrenderable (no host for its key). The test MUST also call `fixture.detectChanges()` and assert the toast's message/action are present in the **rendered DOM** (e.g. via the new `<app-pr-toast key="stale-bundle-refresh">` host's template output), not just the service's in-memory list. A mutation that removes the new host from `app.component.html` (but leaves the `NavigationError` subscription intact) MUST now also cause this DOM-level assertion to fail — add this as a second mutation row.
  - **Red run:** `npx jest src/app/app.component.spec.ts` — before the fix, the new assertion ("`toasts()` contains the stale-bundle entry after navigating to the rejecting route") fails because nothing currently subscribes to `NavigationError` (confirmed absent: `SBR-P-2`). Implementer MUST run this test file and observe the specific new assertion fail (not a setup/compile error) before writing the fix, per the `tdd` skill.
  - **Disqualifier:** If, in this Angular version/Router config, a rejected `loadChildren`/`loadComponent` does **not** surface as a `Router.events` `NavigationError` (e.g. it throws synchronously outside the event stream, or surfaces only as an unhandled promise rejection) — the falsifier test itself will show this immediately (no `NavigationError` event received by the test's own spy, independent of whether `AppComponent`'s handler exists yet). If that occurs, abandon the `Router.events` approach and re-specify using a `window.addEventListener('unhandledrejection', ...)` listener instead (flagged as the fallback in `design.md` §13 if needed).
  - **Consumers:** `PrToastService.add()` call sites found via `grep -rln "PrToastService" onecgiar-pr-client/src --include="*.spec.ts"` (18 files, e.g. `pr-toast.service.spec.ts`, `bilateral-ai-upload.component.spec.ts`, `settings.component.spec.ts`, full list in `design.md` §1A reasoning) — informational only; `add()`'s signature is unchanged, so none require edits. `app.component.spec.ts` is the one pre-existing suite exercising the touched `ngOnInit()` method directly — verified it still passes unmodified alongside the new test block (no behavior of the existing `NavigationEnd` subscription changes).
- **Definition of done:**
  - [~] Code merged via project commit convention (`🔧 fix(app-shell): ...` or similar, per root `CLAUDE.md`) — commit pending, about to be made.
  - [x] Lint clean (`npx ng lint --quiet`); `npm run build` succeeds (catches template/type errors `ts-jest` would miss, per `src/CLAUDE.md` §21.8).
  - [x] New Jest assertions added to `app.component.spec.ts`; red-before/green-after observed and reported by the Implementer (not predicted).
  - [x] Client coverage thresholds (50/60/60/60) still met — additive-only change, accepted by Reviewer (see `execution.md` attempt 2).
  - [x] No secret/token/webhook logged (`.cursorrules`) — confirmed the logger call only includes the route string and error message.
  - [x] Banner copy added as `stale-bundle-refresh.copy.ts` (not hardcoded inline), consumed by `AppComponent`.
  - [x] **(Added 2026-10-14, Pivot `SBR-P-3b`)** A second `<app-pr-toast key="stale-bundle-refresh" />` host is mounted in `app.component.html`, and a test proves the toast actually renders in the DOM (not just that it's present in `PrToastService.toasts()`).
  - [x] Negative scenario covered: an unrelated `NavigationError` does not add a toast (explicit test case, not just the happy path).
  - [x] Dedup scenario covered: firing the qualifying error twice leaves exactly one toast entry.
  - [ ] Manual smoke check on a local build: simulate by throwing from a route's `loadChildren` temporarily (or via dev tools blocking the chunk request) and confirm the toast renders and "Refresh now" reloads — then revert the manual simulation before commit. **Still pending — human-check gate, not satisfiable by CI/agent** (see `execution.md` Summary, "Outstanding").

---

## 4. Dependency graph

```
SBR-T-1  (only task — no dependents, no dependencies)
```

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `SBR-TEST-1` | unit/integration (client, Jest + `RouterTestingModule`) | `SBR-R-1`, `SBR-R-2`, `SBR-R-3`, `SBR-R-4` (main case + reload action) | `onecgiar-pr-client/src/app/app.component.spec.ts` |
| `SBR-TEST-2` | unit (client, same file) | `SBR-R-10` (dedup) | `onecgiar-pr-client/src/app/app.component.spec.ts` |
| `SBR-TEST-3` | unit (client, same file) | Negative scenario — unrelated `NavigationError` ignored | `onecgiar-pr-client/src/app/app.component.spec.ts` |

Server coverage unaffected (no server change). Client coverage must stay ≥ 50/60/60/60.

---

## 6. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, Jest, `npm run build`; no migration gate applies).
- [ ] Manual QA on TEST: force a stale-chunk condition (deploy a change, keep an old tab open, click a Bilateral result / W3 project row) and confirm the banner + reload work end-to-end — this is the one check nothing in CI can substitute for (a real stale-vs-fresh deploy pair), recorded here as the accepted human-check gate for that specific condition.
- [ ] No bilateral/platform-report payload touched — no change-log entry needed.
- [ ] No admin/role/phase change — no runbook update needed.

---

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` after TEST verification.
- [ ] File a follow-up (not in this spec) if a future browser-wording change is observed to slip past the regex match (`design.md` §13).
- [ ] Consider promoting the de-dup check (`SBR-DD-3`) into `PrToastService` itself if a second caller needs the same pattern.

---

## 8. Roll-back plan

1. Revert the PR.
2. No migration, no feature flag, no data to unwind.
3. No downstream consumer notification needed (client-only, no payload change).

---

## Skip-eligible tasks

**None.** `SBR-T-1` is `checklist` depth — it introduces new user-facing behavior (a global error-detection listener), so it gets a full conformance Reviewer pass, not a skip.

---

## Required cross-references

- `docs/specs/bugfix/stale-bundle-refresh-prompt/requirements.md`, `design.md` (same folder).
- `docs/prd.md`, `docs/trd/trd.md:412`.
- `onecgiar-pr-client/src/CLAUDE.md` (routing §4, service shape §21.1, i18n §21.6, build gotcha §21.8).
