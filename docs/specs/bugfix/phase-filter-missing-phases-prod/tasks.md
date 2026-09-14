# Tasks — Programme Results: default phase must not lock onto a data-free phase before rows load

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/phase-filter-missing-phases-prod` |
| Depth | Lite |
| Based on | `requirements.md` (REQ-1, REQ-2), `design.md` (D-1, D-2) |

## Coverage Map (scenario-level, closes before execution)

| Requirement · Scenario | Clause | Owning task |
|---|---|---|
| REQ-1-S1 (real case: older phase has the data) | "settles on … shows real rows," "must NOT show 0 results," "must NOT require manual clear" | TASK-1 |
| REQ-1-S2 (explicit `?phase=` param unaffected) | "applied immediately," "must NOT wait for phaseOptions" | TASK-1 |
| REQ-1-S3 (genuinely-empty programme unaffected) | "unchanged … isNothingYet shown," "must NOT be confused with filtered-empty" | TASK-1 |
| REQ-2-S1 (timing-independent correctness, D-1's edge case) | "final settled value always matches," "must NOT depend on load timing" | TASK-1 |
| Manual prod-scale confirmation (requirements.md §8) | — | TASK-2 |

---

## TASK-1 — Client: defer the auto-derived default-phase commit until load settles

| Field | Value |
|---|---|
| Status | Done |
| Size | S |
| Dependencies | None |
| Requirements | REQ-1 (all 3 scenarios), REQ-2 |
| Design refs | design.md §8 (Frontend / UX Component Architecture), D-1, D-2 |
| Skills | `angular-developer`, `systematic-debugging` (Bug Mode) |

**Scope**
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`, the "URL → filters" effect (currently `:1072-1104`):
  - On the auto-derived branch only (`urlPhase === null`), do not call `this.filter.selectedPhase.set(phase)` while `this.data.loading()` is `true`. Leave `selectedPhase()` at its current value until loading resolves.
  - Read `this.data.loading()` in the effect's TRACKED scope (i.e., alongside `params` and `defPhase`, before entering the existing `untracked(...)` block) — per design.md D-1, this is required so the effect reliably re-fires on the `true → false` transition even if `defaultPhase()`'s recomputed value happens to equal its pre-load guess.
  - The explicit-URL-param branch (`urlPhase !== null`) MUST remain completely unguarded — apply it immediately regardless of `loading()`.
  - Do NOT reorder the constructor's effects (design.md D-2) — the load-triggering effect (`:1024-1028`) must stay registered before this one.
- Do NOT touch the "Filters → URL" mirror effect (`:1112-1145`), `defaultPhase()` itself (`:948-989`), or `phaseOptions()` derivation (`programme-results.service.ts:356-363`) — all confirmed correct in `proposal.md`.

**Tests** (in `programme-results.component.spec.ts`)
1. **Regression test (mandatory, Bug Mode) — REQ-1-S1 / REQ-2-S1:** unlike every existing test in this file (which mocks the row-load HTTP call synchronously via `of(...)`), use a `Subject`/deferred `Observable` for `GET_AllResultsWithUseRole` so the response resolves AFTER the component's first `fixture.detectChanges()` — reproducing the exact async-race timing from `proposal.md`. Seed the mocked data such that `phaseOptions()` will resolve to a phase different from the mocked global active phase (mirroring SP08: global active = "Reporting 2026", real data only in "Reporting 2025 - P25"). Assert:
   - Immediately after the first `detectChanges()` (before the deferred response resolves), `selectedPhase()` is NOT the wrong global-fallback value locked into the URL (i.e., `router.navigate` has not been called with the phantom phase, or `selectedPhase()` is still `null`).
   - After flushing the deferred response and running `detectChanges()` again, `selectedPhase()` equals `component.defaultPhase()` and equals the real data's phase ("Reporting 2025 - P25") — not the phantom value.
   - **Must fail on current code, pass after the fix** — run against the unmodified effect first to confirm it goes red (locks onto the global fallback and never self-corrects without a manual `clearAll()`), then apply the fix and confirm green.
   - **Disqualifier:** if the mocked response resolves synchronously (same tick as `detectChanges()`), the test does not exercise the race and proves nothing — the deferred `Subject`/observable must genuinely resolve on a later tick (e.g., via `fakeAsync` + `tick()`, or a manually-flushed `Subject.next()` called after the first assertion block).
2. **Explicit URL param test — REQ-1-S2:** with the SAME deferred/unresolved mock in place (load still pending), initialize the component with `?phase=Reporting%202025%20-%20P25` already in `queryParams()`. Assert `selectedPhase()` equals that explicit value immediately, on the very first `detectChanges()` — before the deferred response ever resolves. Proves the guard does not delay the explicit-param path.
3. **Genuinely-empty programme test — REQ-1-S3:** mock an empty response (`items: []`) delivered on the same deferred timing. Assert that after the response resolves, the existing "nothing reported yet" (`isNothingYet`)-equivalent view flag is `true` and unchanged from current behavior — proves the guard doesn't blur this state with REQ-1-S1's filtered-empty case.

**Done criteria**
- All three new tests green; existing tests in `programme-results.component.spec.ts` (including `clearAll writes createdBy null, restores defaultPhase...`, line ~1068) remain green, unmodified — they already use synchronous mocks and are unaffected by a guard that only changes async-load timing behavior.
- `npx jest --silent --reporters=summary --no-coverage` clean for this spec file.
- `npx ng lint --quiet` clean.
- Client coverage thresholds (50/60/60/60) unaffected or improved.

---

## TASK-2 — Manual verification: confirm the fix in prod on SP08

| Field | Value |
|---|---|
| Status | Pending |
| Size | XS |
| Dependencies | TASK-1 (deployed) |
| Requirements | Manual defect class (requirements.md §8 — no automated check reaches real prod data) |
| Design refs | proposal.md (original Chrome/live-fetch evidence this task re-validates) |
| Skills | none (manual, browser-based) |

**Scope**
- After the fix is deployed to prod:
  1. Navigate to `https://reporting.cgiar.org/result-framework-reporting/entity-details/SP08/results` with no `?phase=` query param.
  2. Observe the resting state after the initial load completes.

**Verification**
- **Pass:** the tab settles on `Phase: Reporting 2025 - P25` and shows the programme's 462 real results — no "0 results" state, no need to manually clear filters.
- **Disqualifier / inconclusive:** if SP08's data has since changed (e.g., it has now reported into "Reporting 2026"), this exact repro no longer applies — re-run the check against whichever programme currently has the same shape (real data only in a phase other than the global active one), or note the shape no longer reproduces and confirm via the automated tests from TASK-1 instead.

**Done criteria**
- Finding recorded in this task's status (pass / fail / inconclusive-with-reason) before the spec is archived.

---

## Task Dependency Graph

```
TASK-1 (client fix + regression tests) ──> TASK-2 (manual prod re-verification)
```

No circular dependencies. TASK-2 requires TASK-1 deployed.

## Estimated Output

| Metric | Estimate |
|---|---|
| Tasks | 2 |
| Estimated LOC | ~15–25 production (one effect body in `programme-results.component.ts`) + ~70–100 test code (three new scenarios needing deferred/delayed mocks) |
| PR Strategy | **Single PR.** One file's production change, one file's test change, well under the ~400 LOC split threshold. |

## Recommended First Task

**TASK-1** — it is the entire fix; TASK-2 is a post-deploy manual check with nothing to do until TASK-1 ships.
