# Validation Report — Bilateral AI Draft Results: "New" Indicator

**Verdict: PASS. Ready to archive.** 0 FAIL, 0 BLOCKED. The 2 WARNs found by this audit were fixed on 2026-10-27 at the user's request (§11).

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/ai-draft-new-indicator/` |
| Branch | `qa-development-2026-mc-2` (uncommitted working tree; base `c3dd5409c`) |
| Date | 2026-10-27 |
| Auditor | Claude Code, `opus` (T3). The Implementer was `sonnet`, so author ≠ auditor holds |
| Inputs | `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `test-report.md`, `judgment.md`, and the working-tree diff |
| Proposal / Visual Reference | None (created directly by `/akili-specify`) |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | PASS (2/2 `[x]`, Done checkboxes ticked after WARN-1 was fixed) |
| File existence | PASS (7/7 files planned in `design.md` §2.1 changed; nothing unplanned) |
| Build integrity | PASS (lint, `tsc`, dev build, Jest) |
| Requirement coverage | PASS (5/5 requirements, 8/8 AC, every `BUT` / `AND IT MUST` clause) |
| Code quality (4R) | PASS · 6 advisory notes |
| Design conformance | PASS (DD-1..DD-5); the budget overrun was accepted by the user |
| Accessibility evidence | PASS (WARN-2 fixed: the `sr-only` text now starts with an explicit space, asserted in C1) |
| Agent guide | PASS (`my-draft-results/CLAUDE.md` is 119 lines, `Verified:` bumped) |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| `ADN-T-1` Service | `[x]` done | `execution.md`: Reviewer PASS (opus), evidence re-run VERIFIED, falsifiers recorded | PASS |
| `ADN-T-2` Component / template / copy / guide | `[x]` done | `execution.md`: Reviewer PASS, evidence VERIFIED, HITL approved ("Apruebo") | PASS |
| Done-criteria checklists (`tasks.md:91-95`, `:166-171`) | `[x]`, except `:95` (commit format, pending until the user commits) | The evidence is in `execution.md` and this report | PASS (WARN-1 fixed) |
| Rollout items (`tasks.md:221-223`) | `[ ]` | PR, CI and staging QA happen after merge | Expected, not a finding |

## 4. File Existence

| File (`onecgiar-pr-client/src/app/…`) | Planned | Changed |
|---|---|---|
| `pages/bilateral/services/bilateral-ai.service.ts` (+ `.spec.ts`) | Yes | Yes |
| `pages/bilateral/pages/my-draft-results/my-draft-results.component.ts` / `.html` (+ `.spec.ts`) | Yes | Yes |
| `pages/bilateral/pages/my-draft-results/CLAUDE.md` | Yes | Yes |
| `internationalization/bilateral-ai-processes.copy.ts` | Yes | Yes |

No server, migration or payload file changed, which matches `design.md` §3–§5. `bilateral-result-summaries.en.md` is untouched.

## 5. Build Integrity

All commands were run by the auditor on 2026-10-27.

| Command (from `onecgiar-pr-client/`) | Result |
|---|---|
| `npx ng lint --quiet` | `All files pass linting.` |
| `npx tsc -p tsconfig.app.json --noEmit` | exit 0 |
| `npx ng build --configuration development` (`ADN-D5` gate) | `Application bundle generation complete.` The NG8113 warning (`PrFilterSelectComponent is not used within the template of MyDraftResultsComponent`) is pre-existing: the import is already present at `HEAD` and this diff does not touch it |
| `npx jest src/app/pages/bilateral --silent --reporters=summary --no-coverage` | `Test Suites: 65 passed, 65 total` · `Tests: 2610 passed, 2610 total` |

The local stack boot smoke was skipped. The change is client-only, and the real component already ran in Chrome during the HITL Cypress CT probe.

## 6. Requirement Coverage

Coverage was checked at scenario and clause level. Test evidence comes from `test-report.md` §7, cross-checked against the code.

| Requirement / clause | Owning task | Code evidence | Tests | Result |
|---|---|---|---|---|
| R-1: mark fresh own jobs only | T-1, T-2 | `bilateral-ai.service.ts` `detectTerminalTransitions`, which filters `newlyTerminal` to `COMPLETED && resultCount > 0` · component `isNew: Boolean(jobId) && freshIds.has(sessionId)` | S1, S6, C1, C2, new "different polls" | PASS |
| R-1 BUT: not a job already terminal when first seen | T-1 | Reuses `newlyTerminal`, which requires the previous poll to show the job active (P-2) | S4 | PASS |
| R-1 AND IT MUST: not another user's job | T-1 (premise) | The server scopes the jobs list to the caller (P-1, verified at `c3dd5409c`) | C1 (teammate group unmarked) | PASS (assumption-backed, documented in §9 C-2) |
| R-1: failed or empty job | T-1 | Same filter | S2, S3 | PASS |
| R-2: auto-refresh plus the mark | T-1, T-2 | `loadAllDrafts()` once per poll, plus the latest-wins `draftsRequestSeq` | S1, S6, S8–S10 | PASS |
| R-2 BUT: keep filters and the Review aside | T-2 | The list swap goes through signals and does not touch filter or `selectedDraft` state | C3 | PASS |
| R-3: leave and come back | T-2 | `ngOnDestroy → consumeShownFreshJobs()` | C5, C7, new "leave and come back" | PASS |
| R-3: in-tab actions keep the mark | T-2 | Consume only on destroy or center change | C4 | PASS |
| R-3: not visited yet → stays fresh | T-1 | Root singleton (P-5); the component consumes only ids it actually showed | new S and C "not visited" tests | PASS |
| R-3 AND IT MUST: lost on reload after finish | T-1 | In-memory signal; a terminal job at first poll is not marked | S4 | PASS |
| R-3: switch center and come back | T-2 | Center effect `previous != null && current !== previous` | C6, C6b, new "A -> B -> A" | PASS |
| R-4: visible "New", icon `aria-hidden`, accessible name, copy file | T-2 | Template plus `BILATERAL_AI_PROCESSES_COPY.drafts.newBadge`; `sr-only` text has a leading space | C1 (with the new leading-space assertion) | PASS |
| R-4: no overflow at 375 / 900 / 1000 / 1280 | T-2 | Badge in the `flex-wrap` left cluster | HITL probe (header height +2 px only at 375, 0 items pushed out) | PASS (HITL) |
| R-5: no write, data unchanged | T-1, T-2 | No write call on any path | S11, C8, new any-verb Proxy tests (service + component) | PASS |
| NFR: at most one reload per poll, no localStorage | T-1 | One `loadAllDrafts()` per poll; signal only | S6, new "different polls" | PASS |

`test-report.md` records no `PRODUCT_BUG`, `FAIL` or flaky entry. Its three accepted gaps all have a mitigation (HITL, assumption C-2, first-poll path).

## 7. Linting & Code Quality

Lint and type checks are clean (§5). The 4R sweep found no spec violations. All notes below are **advisory**: they come from `execution.md` or from this audit, and they do not drive the verdict.

| # | Lens | Note | Source |
|---|---|---|---|
| A-1 | Readability | The `mdr-new-badge` class has no reader; `data-testid` is the real hook | execution.md |
| A-2 | Readability | The guide trim dropped two facts: "Submit for review is the only path toward P/A review" and the reason `BilateralAiService` refetches per switch | execution.md |
| A-3 | Resilience | A fresh id that arrives during the X→null gap is consumed later than expected. Related: if a center change and a list swap ever landed in the same change-detection flush, B's fresh ids would be consumed while on A (the Tester reproduced this synthetically; async GET ordering prevents it in the app) | execution.md + test-report §8 |
| A-4 | Risk (a11y) | The `sr-only` span had no leading space. **Resolved** by WARN-2's fix | execution.md → closed |
| A-5 | Reliability | Author test 11 checks only `POST_`/`DELETE_`. **Resolved:** the any-verb Proxy tests added by `/akili-test` cover all write verbs | execution.md → closed |
| A-6 | Docs | `onecgiar-pr-client/CLAUDE.md` rule 21 ("Icons from `@ng-icons/lucide` only") conflicts with `docs/ux-ui/design.md` §7 / DD-12 (`material-icons-round`). Pre-existing; the badge follows the page and the UX doc | execution.md |

## 8. Design Conformance

| Decision | Implementation | Result |
|---|---|---|
| DD-1: separate, immutably replaced fresh-id signal | `freshDraftJobIds = signal<ReadonlySet<string>>`, replaced via `update(new Set)`. Changing "read-only" to "writable" in the design was an execute-time amendment, recorded in `execution.md` | PASS |
| DD-2: one reload per poll; latest wins; counter after the null return | Matches line for line (`++draftsRequestSeq` comes after `if (centerId == null) return`) | PASS |
| DD-3: group-level mark; the `draft-<id>` fallback is never new | `Boolean(jobId) && …` | PASS |
| DD-4: badge only, pattern-10 violet tokens, text label, no card accent | `bg-violet-50 text-violet-700 border-violet-200`, `auto_awesome`, `aria-hidden`; card untouched | PASS |
| DD-5: consume only what was shown, on destroy and on center change away from non-null | `shownFreshIds` effect reads `sessionGroups()` first; center effect; `ngOnDestroy` | PASS |

**Cross-document figure check**

| Figure | Finding |
|---|---|
| Budget ~290 LOC vs ≈480 actual | The tripwire fired and the user accepted it (`execution.md`). Recorded, not drift |
| Guide "already at the 120-line cap" (design §6.2) vs 119 now | Consistent with the trim |
| "3 GETs per reload" (requirements NFR, design §6.2 and §8) | Consistent; the lookups are unchanged in the diff |
| Accessible name example "New — generated in your latest AI run" (R-4) vs shipped "New generated in your latest AI run" | The R-4 text says "e.g.", so this is not drift. Noted under WARN-2 |
| Test counts: tasks.md 11 + 8, execution.md "19 test cases … plus a 1b case", test-report "S 1–11 · C 1–8 + 1b" | Consistent: 20 author cases in total. The test-report's wording "19" in the user summary counts scenarios, not cases |

## 9. Test Evidence Summary

The source is `test-report.md` (overall PASS), re-run by the auditor with the same 65 / 2610 result.

| Evidence | Count |
|---|---|
| Author TDD tests (service + component) | 11 + 8 (+1b) |
| Tester gap tests | 8 |
| HITL visual probe | 4 widths, approved 2026-10-27 |
| Product bugs | 0 |

## 10. Agent Guide / Constitution Impact

`execution.md` says Constitution Impact: **none**. `DraftSessionGroup` gained an additive field. The folder guide `my-draft-results/CLAUDE.md` was updated in scope (119 lines ≤ 120, `Verified: 2026-10-27 · … ADN-T-2`). No module boundary changed, and no TRD or `## Module Guides` update is needed.

## 11. Remediation

| ID | Severity | Finding | Recommended action |
|---|---|---|---|
| WARN-1 | Low | `tasks.md` Done-criteria checkboxes were unticked while both tasks were `[x]` | **Fixed:** ticked. `:95` stays open (commit format) until the user commits; no secret or `console.*` was added by the diff |
| WARN-2 | Low | The accessible-name separator depended on flex blockification | **Fixed:** the template renders `{{ ' ' + newBadgeCopy.srSuffix }}`, and C1 asserts the leading space. Re-run: bilateral Jest 65 / 2610 passed, `ng lint` clean |
| A-1..A-4, A-6 | Advisory | See §7 | Carry into the `/akili-archive` kaizen and follow-ups; no action required to archive |

## 12. Archive Readiness Recommendation

**Ready to archive.**

- Both tasks are `[x]`.
- No FAIL findings.
- Both WARNs are fixed and re-verified.
- Tests cover every requirement and clause.
- Execute-time drift (DD-1 wording, budget) is recorded in `execution.md`.

Next command:

```text
/akili-archive bilateral/ai-draft-new-indicator
```
