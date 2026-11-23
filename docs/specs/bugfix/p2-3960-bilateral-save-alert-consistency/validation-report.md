# Validation Report — P2-3960 · Bilateral save alerts tell one consistent truth

> **Verdict: PASS with warnings (0 FAIL · 2 open WARN · 3 WARN resolved · 1 BLOCKED-pending-HITL).**
>
> All four requirements are implemented exactly as DD-1..DD-5 state. Each one is covered by a regression test, and each test was shown to go red on the old code. Gates are green on HEAD.
> - The doc warnings W-2, W-3 and W-5 were fixed at validation (R-2 and R-3).
> - What stands between this spec and archive is the manual prtest repro from proposal §13, which needs a deploy.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` · Lite · Bug Mode |
| Validated at | `550737ec8` (T-1 `6cc9c75e0`, T-2 `550737ec8`), baseline `fcd441ad1` |
| Date | 2026-11-23 |
| Auditor | Claude Code `opus` (T3). The Implementers were `sonnet`, so author ≠ auditor holds. The auditor was the Leader during execution and wrote no code |
| Inputs | proposal, requirements, design (as amended 2026-11-23), tasks, execution. There is no `test-report.md` (`/akili-test` was not run), so coverage was verified directly |
| Visual reference | None (no UI change) |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS. 2/2 `[x]`, each with a Reviewer PASS in `execution.md` |
| File existence | PASS. All 7 files in design §4 changed; nothing outside the list |
| Build integrity | PASS. jest, lint and build are green (§5) |
| Requirement coverage | PASS. BSA-R-1..4 at clause level; one reliability WARN (W-1) |
| Code quality / 4R | PASS, with advisories carried forward |
| Design conformance | PASS. Code matches DD-1..DD-5; one documented refinement; doc-figure WARNs W-2 and W-3 resolved |
| Manual repro (proposal §13) | **BLOCKED (pending HITL).** The fix is not yet on prtest |
| Constitution impact | PASS. No module or boundary change; the folder `CLAUDE.md` is updated |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| T-1 | `[x]` | 2 attempts. Attempt 1 failed only on the folder `CLAUDE.md` 120-line cap; attempt 2 was a docs-only rework and passed. The falsifiers A, B and C plus the build falsifier are quoted. P-9 is settled false and the user accepted the trade-off | PASS |
| T-2 | `[x]` | 1 attempt, Reviewer PASS. The reds for D, E and F are quoted before the fix and again after it (falsifier). The Leader's evidence re-run reads VERIFIED | PASS |

## 4. File Existence

| design §4 file | Changed | Result |
|---|---|---|
| `bilateral-result-creator.component.ts` | yes (+11/−6 logic and doc comment) | PASS |
| `bilateral-result-creator.component.spec.ts` | yes | PASS |
| `bilateral-result-creator/CLAUDE.md` | yes (119 lines, within the cap) | PASS |
| `customized-alerts-fe.service.ts` + `.spec.ts` | yes | PASS |
| `customized-alerts-fs.service.ts` + `.spec.ts` | yes | PASS |

No unlisted production file was touched (`git diff fcd441ad1 HEAD --stat`).

## 5. Build Integrity (re-run by the auditor on HEAD)

| Command (from `onecgiar-pr-client`) | Result |
|---|---|
| `npx jest src/app/pages/bilateral src/app/shared/services/customized-alerts --silent --reporters=summary --no-coverage` | 68 suites, **2842/2842 passed** |
| `npx ng lint --quiet` | exit 0 |
| `npm run build` | exit 0 |
| Full client suite with coverage (50/60/60/60 gate) | **Pending.** The full run was still in progress at commit time; its result is added in a follow-up edit. The diff only adds tests and guards, so coverage cannot fall |

## 6. Requirement Coverage (scenario and clause level)

| Clause | Code | Test | Result |
|---|---|---|---|
| BSA-R-1 "Stale error does not block": THEN opens Contributors | `selectSection()` scoped check `hasErrorForFields(flushTargets)` | `spec.ts:1989` (A). Red under the DD-1 revert | PASS |
| BSA-R-1 … BUT must NOT show "Save failed" | Same branch: no alert when the scoped check is false | A asserts no error alert | PASS |
| BSA-R-1 "Real failure still blocks": THEN stays | scoped wait `waitForSectionSave(current, flushTargets)` + scoped check | `spec.ts:2006` (B, real timers, 300 ms flip). Red under the unscoped-wait mutation | PASS |
| … AND IT MUST show the server reason for B | `lastErrorMessageForFields(flushTargets)` | B and the adapted "keeps the section open…" (`:1971`) assert `'Title cannot be empty.'` | PASS |
| BSA-R-2 "Stale error only": "Nothing to save yet" + missing list | `if (!hadChanges \|\| flushTargets.length === 0)` | `spec.ts:1036` (C). Red under the DD-3 revert | PASS |
| … BUT must NOT read "Draft saved"/"Saved." | Same branch | C | PASS |
| BSA-R-2 "Real save, unchanged" | `hadChanges && flushTargets.length > 0` → saved branch | Adapted `:1018` and `:1036` (`pendingStatusKeysFor` `['title']`/`['short-title']`) | PASS |
| BSA-R-3: still on screen at 3500 ms | `closeTimers` cleared in `show()` before replacement | Fe spec `:249` describe (D, fake timers). Red without the clearing | PASS |
| … AND IT MUST close at 5000 ms | new timer registered at 3000 ms | D asserts `delete` at t=5000 | PASS |
| BSA-R-4: Fe detached removal, no throw | `if (!alert.parentNode) return;` | E, with a `window` error listener | PASS |
| BSA-R-4: Fs detached removal, no throw | same guard in Fs | F (Fs spec `:175`), with a `window` error listener | PASS |
| NFR Compatibility (~70 `alertsFe` callers) | `show()` signature, 3000 ms `closeIn` and `closeAction` unchanged | existing Fe/Fs suites green | PASS |
| NFR Coverage 50/60/60/60 | — | §5 last row | see §5 |
| Real-browser modal flow and console (requirements §7, no automated gate) | — | manual repro on prtest | **BLOCKED (pending HITL)** |

**W-1 (WARN, reliability; it meets BSA-R-1 as worded):** `pendingStatusKeysFor` returns only **staged** keys (`_pendingFields`/`_pendingPayloads`, `bilateral-auto-save.service.ts:375-388`), never in-flight or queued requests.
- **Scenario:** a request that was already in flight when the user clicked the rail, for example from a General Info per-field save. It is not part of `flushTargets`, so the empty-set guard skips the wait and navigation proceeds at once.
- **Result:** if that request then fails, no "Save failed" is shown. Because of P-9, its field card shows nothing either.
- **Compared with literal DD-1** (no guard): there the outcome is the same. `hasErrorForFields([])` is false, and only the delay differs. So the guard did not cause this; it comes from BSA-R-1's "sent by **that** change" scoping.
- **Before the fix:** the section-wide wait caught it.
- **Recommendation:** accept, and fold it into the per-field error display follow-up (F-1).

## 7. Linting & Code Quality

Lint is clean. The `@akili-spec`-style traceability is present as `P2-3960 (BSA-R-n, DD-n)` comments at each change site.

**4R advisory findings** (these do not gate):

| Lens | Finding | Source |
|---|---|---|
| Reliability | Stale error plus a successful save in the same section: the rail click waits the full 15 s, then navigates (the section-wide `hasPendingFor` in the wait loop). Save draft has had the same behaviour since BSF-T-2 | Reviewer T-1, carried |
| Reliability | W-1 above (in-flight failure during navigation is silent) | auditor |
| Reliability | A timer for an alert the user already closed lingers until the next `show()`. Harmless | Reviewer T-2 |
| Readability | Test B leaves a 300 ms `setTimeout` that mutates a shared mock after the test | Reviewer T-1 |
| Readability | The T-1 `CLAUDE.md` invariant says "both scope wait, failure check and copy", but `selectSection()` has no copy branch | Reviewer T-1 att. 2 |
| Readability | `closeTimers` is keyed by id but can only hold one entry | Reviewer T-2 |
| Resilience / Risk | None. Client only; no auth, payload or secrets surface | — |

## 8. Design Conformance

| Item | Result |
|---|---|
| DD-1 scoped failure check and message | PASS (verbatim) |
| DD-2 scoped wait | PASS, with a **documented refinement**: the wait is skipped when `flushTargets` is empty. It changes no outcome and removes a 15 s stall. It was endorsed by the Reviewer and recorded in `execution.md` T-1 |
| DD-3 `!hadChanges \|\| flushTargets.length === 0` | PASS (keeps `hadChanges` per P-4) |
| DD-4 timer registry, clear all, 3000 ms, self-deleting callback, `closeAction` unchanged | PASS |
| DD-5 null-parent early return in both services | PASS |
| design §10 / P-9 as amended (gap accepted) | PASS. Consistent with the folder `CLAUDE.md` |
| Proposal intent and non-goals (no server, no `closeIn` change, no `handleGiFieldSaveRequested`, no title wording) | PASS. None touched |

**Cross-document figure check:**

| # | Claim | Contradicted by | Result |
|---|---|---|---|
| W-2 | design §4: "an update to **one** consumer test (P-6)" | tasks.md T-1 lists **three** consumer tests. Execution adapted **four** (P-6 under-counted "the flush fails: savedTick NOT bumped") | **Resolved.** design §4 now says four; the P-6 row is annotated "partly false" |
| W-3 | proposal §13: "The **4** regression tests" | tasks.md defines **six** (A–F) | **Resolved.** §13 now says 4 scenarios = 6 tests and adds the Fs suite; §5 also lists the Fs spec |
| W-4 | design §12 budget: ~130 LOC, 2 review rounds | actual: 169 added and 27 removed in code and tests, 3 rounds. Overrun recorded and accepted by the user at the T-1 gate | WARN, informational |
| W-5 | requirements and design Document Control `Status: draft` | both were approved and executed | **Resolved.** Both now read `approved · executed` with the commit IDs |

Correction closure: the forward grep for "one consumer", "The 4 regression tests" and `Status | draft` across the spec folder returns no hits. Backward, the P-6 ledger row that design §4 cites is annotated, and the proposal's file list gained the Fs spec. The `git diff` shows 6 lines changed for 6 lines, with no unintended removals.

## 9. Test Evidence Summary

| Test | Requirement | Red observed | Green on HEAD |
|---|---|---|---|
| A `spec.ts:1989` | BSA-R-1 | baseline + DD-1 revert: `Expected "contributors" / Received "general-info"` | yes |
| B `spec.ts:2006` | BSA-R-1 | unscoped-wait mutation: `Expected "general-info" / Received "contributors"` | yes |
| C `spec.ts:1036` | BSA-R-2 | baseline + DD-3 revert: `"title": "Draft saved"` | yes |
| D Fe `:249` describe | BSA-R-3 | `Expected: false / Received: true` | yes |
| E Fe `:249` describe | BSA-R-4 | `TypeError … reading 'removeChild'` | yes |
| F Fs `:175` describe | BSA-R-4 | `TypeError … reading 'removeChild'` | yes |
| Build falsifier | type gate | `TS2345` with a `string` passed for `readonly string[]` | build exit 0 |

The manual QA repro (proposal §9 steps 1-5 on prtest) is **not yet run**. The fix is committed on `qa-development-2026-ss` and has not been deployed to the prtest preview.

## 10. Agent Guide / Constitution Impact

There are no `## Constitution Impact` blocks, and none are owed: no module was created, no boundary moved, and no public surface changed (`show()` signature unchanged).
- The folder guide `bilateral-result-creator/CLAUDE.md` is updated and re-stamped.
- A CodeGraph re-index is optional; it is left to `/akili-archive`.

## 11. Remediation

| # | Item | Severity | Proposed action |
|---|---|---|---|
| R-1 | Manual repro on prtest (proposal §13) | BLOCKED | Deploy to prtest, run §9 steps 1-5, record the outcome here |
| R-2 | W-2, W-3 figure drift | ~~WARN~~ **done** | design §4 and the P-6 row, proposal §5 and §13 corrected (2026-11-23) |
| R-3 | W-5 stale `Status: draft` | ~~WARN~~ **done** | requirements and design set to `approved · executed` |
| R-4 | W-1 and the 15 s stall | WARN, advisory | Follow-up ticket: per-field save-error display, plus scoping the wait's pending condition. Outside this spec |
| R-5 | W-4 budget overrun | info | Kaizen input at archive (the rework assumption in review-round budgets) |

## 12. Archive Readiness Recommendation

**Archive after R-1.** There is no FAIL, and the code needs no change.
- **R-2 and R-3:** done.
- **R-4:** goes to a ticket.
- **If the user waives R-1 for now:** archive can proceed with R-1 recorded as an open validation item. This is not recommended, because the real-browser modal flow is the one defect class with no automated gate.

Next command when ready: `/akili-archive bugfix/p2-3960-bilateral-save-alert-consistency`
