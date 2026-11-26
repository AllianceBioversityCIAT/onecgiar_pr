# Validation Report — Innovation Use 2026: W3/Bilateral aligned with the pooled form

**Verdict: PASS for code, NOT archive-ready yet.** 0 FAIL · 4 WARN · 0 BLOCKED. Every automated check is green. The open item is **IWA-T-3**: the PRTest check, the live API spot check and Nicoleta's acceptance. It runs after the merge and deploy.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-2026-w3-pooled-alignment` |
| Date | 2026-11-26 |
| Branch / HEAD | `qa-development-2026-ss` @ `e5654d462` (base `990646d3e`) |
| Validator | Claude Opus 5.5 (T3). Implementer was `sonnet`, so author ≠ auditor holds |
| Inputs | `proposal.md`, `requirements.md`, `design.md`, `tasks.md`, `execution.md`, `test-report.md` |
| Working tree | Validation artefacts and remediations #2/#3 committed after this report. The unrelated `rir-breeding-exclusion` changes are untouched |

## 2. Summary

| Area | Result |
|---|---|
| Tasks | T-1 PASS · T-2 PASS · T-3 **open** (by design: post-deploy) |
| Files | PASS |
| Build · lint | PASS (`ng build` exit 0 · `ng lint` "All files pass linting.") |
| Requirements IWA-R-1..R-5 | 4 PASS · 1 WARN (R-1 tile on a newly typed row → T-3) |
| Negative / strict clauses | All 6 implemented and asserted |
| Design conformance (DD-1..DD-5) | PASS |
| Proposal intent, non-goals | PASS |
| Tests | 483/483 in the affected folders. Full client run: 5 failures outside the spec, caused by the local environment (WARN) |
| Design review | WARN: visual check deferred to the T-3 human pause |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| IWA-T-1 | `[x]` | `execution.md`: red quoted (3 of 7), green 193/193, Leader re-run, 2 falsifier probes, Reviewer `PASS`, commit `63c79f70e` | PASS |
| IWA-T-2 | `[x]` | `execution.md`: red quoted, green 478/478, grep 0 hits in production code, 2 falsifier probes, Reviewer `PASS`, commit `e5654d462`; Verification amendment approved at the gate | PASS |
| IWA-T-3 | `[ ]` | Blocked by design until the merge to `performance-refactor` and the PRTest deploy | WARN (expected, blocks archive) |

## 4. File Existence

| File (design §4) | Expected | Actual | Result |
|---|---|---|---|
| `type-innovation-use.component.html` | modified | modified (+51/−32) | PASS |
| `type-innovation-use.component.ts` | "no logic change expected" | untouched (`git diff --stat` empty) | PASS |
| `type-innovation-use.component.spec.ts` | new IWA specs | +127, one real-template `describe` | PASS |
| `type-innovation-use/CLAUDE.md` | layout note | updated (layout + DD-3 caveat) | PASS |
| `innovation-use-form/farmer-follow-up.ts` | two phrases removed | done | PASS |
| `innovation-use-form.component.spec.ts` | expectations updated | updated + `not.toContain` assertions | PASS |
| `innovation-use-form/CLAUDE.md` | amendment (tasks T-2) | done | PASS |
| `type-innovation-use.pooled-alignment.spec.ts` | not in design | added by `/akili-test` (Tester suite) | PASS (test-only, uncommitted) |
| Server / API files | none | `git diff --stat 990646d3e..HEAD -- onecgiar-pr-server` empty | PASS |

## 5. Build Integrity

| Command (in `onecgiar-pr-client`) | Result |
|---|---|
| `npx ng build --configuration development` | exit 0 · `Application bundle generation complete. [144.134 seconds]` |
| `npx ng lint --quiet` | exit 0 · `All files pass linting.` |
| `npx eslint …` (bare) | Not usable: ESLint 9 finds no flat config. Linting runs through `ng lint` (the AGENTS.md command). Not a finding |
| Migrations | n/a (no server change) |
| Environment boot smoke | Not run. This is a template-only change; the live check is T-3 on PRTest |

## 6. Requirement Coverage

Primary evidence: the `test-report.md` matrix, cross-checked clause by clause against `requirements.md` and the diff.

| Req | Clause | Owner task | Code evidence | Test evidence | Result |
|---|---|---|---|---|---|
| R-1 | 2026 order Actors → Organizations → Measures, collapsed | T-1 | `.html` outlet after the Actors block, inside `@if (TBD !== true)` | Author test 1 | PASS |
| R-1 | AND counts in the "Organizations" tile | T-1 / T-3 | `totals` reads `body.organization` (P-2, unchanged) | Tester test A: loaded row = 2 with metadata collapsed. Typing into a new row → gap G-1 | **WARN**: completes at T-3 |
| R-1 | BUT must NOT enter the MDS or submit gate | T-1 | `updateMds()` untouched | Author test 7 (`['use-actors','use-measures','use-investment']`) | PASS |
| R-1 | AND MUST NOT render twice | T-1 | Two outlets, mutually exclusive on `currentUseTotalLabels` | Author test 1 (count 1 collapsed and expanded) + Leader falsifier (`Expected 1, Received 2`) | PASS |
| R-1 | 2025: Organizations stays in full metadata | T-1 | `@if (!currentUseTotalLabels)` in full metadata | Author test 2 | PASS |
| R-1 | TBD hides Organizations | T-1 | Outlet inside the TBD block | Author test 3 + Tester test B (expanded too) | PASS |
| R-2 | Hidden on 2026 actor and organization cards | T-1 | `@if (!currentUseTotalLabels)` around both textareas | Author test 4 | PASS |
| R-2 | Saved payload still carries `"x"` | T-1 | `buildPayload` untouched (P-3) | Author test 5 (actor `x`, organization `y`) | PASS |
| R-2 | BUT must NOT send `null` / `""` | T-1 | — | Author test 5 `toBe('x')` + Leader falsifier (`Received null`) | PASS |
| R-2 | AND MUST still show on 2025 | T-1 | Gate | Author test 4 (2 occurrences) | PASS |
| R-3 | 2026 "Add actor / Add organization / Add other"; 2025 "Add another …" | T-1 | `[name]` bound to the gate on both buttons | Author test 6 | PASS |
| R-4 | Phrases gone on both screens | T-2 | Constant edited | Pooled: author `not.toContain`; W3: Tester test D (falsifier bites) | PASS |
| R-4 | Rest unchanged word for word | T-2 | Diff shows only the two phrases removed | Exact-equality expectations + test D | PASS |
| R-4 | MUST change in one place only | T-2 | — | `git grep … ':!*.spec.ts' ':!*.md'` → exit 1, 0 hits (re-run here) | PASS |
| R-5 | `/api/bilateral/*` unchanged | T-1 / T-3 | Server diff empty; component `.ts` untouched | Tester test E (same payload keys 2025 vs 2026) | PASS for code. The live byte-identical check (proposal §13) is T-3 |
| NFR-1 | Build green | T-1 | — | `ng build` exit 0 (re-run here) | PASS |
| NFR-2 | W3 suite green, coverage not lowered | T-1 | — | 483/483 · global coverage 83.93/77.42/81.65/84.63, above the 60/50/60/60 gate | PASS |

Clause-level check: every scenario and every `BUT` / `AND IT MUST` clause in `requirements.md` §6 has a named owner task and a named assertion. No orphans.

## 7. Linting & Code Quality

Lint is clean. There are no spec violations.

**4R advisory (not gating):**

| Lens | Finding | Source |
|---|---|---|
| Readability | The comment "One actor card and one organization card, shared by current use and the 2030 Use Projection…" sat above `#organizationsBlock`, and its 2030 part was stale | Reviewer T-1. **Fixed 2026-11-26**: moved above `#actorCard`, 2030 part rewritten; W3 jest 198/198 |
| Reliability | A hidden `addressing_demands` still counts as "row has figures" (`hasActorMissingType`). Accepted (DD-3, Low) and documented in the folder `CLAUDE.md` | design DD-3 |
| Reliability | `NG0100 ExpressionChangedAfterItHasBeenChecked` came up in jsdom while updating the tile after editing a new row. It is not proven to be a product defect; watch the browser console during T-3 | test-report G-1 |
| Risk | `NG0303: Can't bind to 'inert'` console noise in the real-template specs | Implementer note T-1 |
| Readability | `innovation-use-form/CLAUDE.md:73` quotes the removed phrases, which adds an avoidable grep hit | Reviewer T-2 |
| Risk | `.agents/leader.md` is outdated and `tester.md` is custom-edited (`akili doctor`). Pending for `staging` | execution run notes |

## 8. Design Conformance

| Decision | Implementation | Result |
|---|---|---|
| DD-1 one `ng-template`, two exclusive outlets | Matches; both outlets inside an `[inert]="readOnly()"` wrapper (Tester test C) | PASS |
| DD-2 out of MDS / submit gate | `updateMds()` untouched; author test 7 | PASS |
| DD-3 hide in template, model untouched | `@if` around the textareas only; `buildPayload` untouched | PASS |
| DD-4 labels via the 2026 gate | Matches | PASS |
| DD-5 edit the shared constant | Matches; no W3-only copy | PASS |
| Gate semantics | `currentUseTotalLabels` treats an unresolved year as 2026 (`phaseYear ?? MIN`), the same as IU26 | PASS |

**Proposal alignment:** all three non-goals hold (no schema change and no data deletion, no new MDS, no restyle beyond moving Organizations). The proposal's "change … QA catalog in one commit" (OQ-1 row) was settled at specify by design P-5 (the server holds labels only), so not touching the catalog is correct. Visual Reference: no mockup, the W1/W2 form is the target, and order and labels match it (`innovation-use-form.component.html:336,440,498`).

**Cross-document figure check:**

| Figure | Documents | Result |
|---|---|---|
| Budget ~180 LOC vs actual +194/−38 | design §12 vs execution | Overrun recorded and accepted at the T-1 gate |
| Tasks 3 | design §12 = tasks.md | Consistent |
| Test counts 193 → 478 → 483 | execution T-1, T-2, test-report | Consistent (T-1 folder only; both folders; +5 Tester tests) |
| 2 pinned spec assertions (P-6 / DD-5) | design, tasks, execution | Consistent |

**Design review (UI):** this is a parity-only re-layout of an existing screen with no new surface (tasks.md "Design route"). `impeccable-bridge` was not engaged, and no detector scan ran because the app was not running. The visual look is a declared "no automated check" defect class, gated by the T-3 human pause → **WARN (unverified visual / first visit)** until T-3 is recorded.

## 9. Test Evidence Summary

| Source | Result |
|---|---|
| `test-report.md` | PASS · 0 `PRODUCT_BUG` · gaps G-1 (tile on typed new row) and G-2 (visual), both routed to T-3 |
| Affected folders | 6 suites, 483/483 |
| Full client | 707/710 suites, 15,498/15,503 tests. The 5 failures are in `general-interceptor.service.spec.ts`, `impact-level-info.component.spec.ts` and `quality-assurance.component.spec.ts`. None imports a changed file, and all 3 depend on the local `environment.ts` (`qaUrl: ''`). **WARN**: outside the spec; CI is the authoritative gate |

## 10. Agent Guide / Constitution Impact

`execution.md` has no `## Constitution Impact` section; no module or boundary changed. Both folder `CLAUDE.md` files were updated in the same commits as the code. Nothing is pending for `/akili-archive` besides the existing `akili doctor` item for `staging`. → PASS.

## 11. Remediation

| # | Severity | Item | Action |
|---|---|---|---|
| 1 | Required for archive | IWA-T-3 not done | Merge to `performance-refactor`, deploy to PRTest, run the read-only check (8427 2026, a 2025 W3 result, 6433 W1/W2), the `/api/bilateral` before/after spot check and the console check for NG0100. Then draft the reply to Nicoleta |
| 2 | Housekeeping | `test-report.md`, `validation-report.md` and the Tester spec were uncommitted | **Done**: committed together with fix #3 (spec files only) |
| 3 | Optional | Stale comment above `#organizationsBlock` | **Done**: moved above `#actorCard`, 2030 mention rewritten |
| 4 | Outside the spec | 3 client suites fail with the local `environment.ts` | Follow-up: make them independent of `environment.qaUrl`/`apiBaseUrl`, or run them with the CI env |

## 12. Archive Readiness Recommendation

**Not yet.** The code is conformant and ready to merge: no FAIL, every clause is tested, and build and lint are green. Archive after IWA-T-3 is recorded in `execution.md` and Santiago confirms at the HITL pause; Nicoleta's acceptance can follow outside the repo. Then run:

```text
/akili-archive changes/innovation-use-2026-w3-pooled-alignment
```
