# Execution Log — `bilateral/ai-draft-new-indicator`

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/ai-draft-new-indicator/` |
| Branch | `qa-development-2026-mc-2` (spec branch; default `master`, integration `staging`) |
| Approval Mode | gated |
| Leader | Claude Code, `opus` (T1) |
| Implementer wrapper | `.claude/agents/akili-implementer.md` (`sonnet`, T2) |
| Reviewer wrapper | `.claude/agents/akili-reviewer.md` (`opus`, T3), author ≠ auditor |
| Persona drift | `akili doctor --agents` on 2026-10-27: "No persona drift blocking CI" |
| Budget (design) | 2 tasks · ~290 LOC · 3 review rounds |
| Started | 2026-10-27 |

---

## Task Execution History

### ADN-T-1 — Service: fresh-job set, reload on completion, latest-wins guard

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-10-27 |
| Requirements covered | ADN-R-1 (set side), ADN-R-2 (reload), ADN-R-3 ("stays fresh", "lost on reload after finish"), ADN-R-5 (service), ADN-AC-3, ADN-AC-4 (reload), ADN-AC-8 (service) |
| Skills / effort | `angular-developer`, `tdd` (task defaults, no deviation) · effort medium, with an in-brief "think carefully" on the guard |
| Implementer attempts | 1 |

**Attempt 1**
- Files changed: `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts` (+32), `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.spec.ts` (+175 / −1, the `Subject` import).
- Implementer verification: service spec `Tests: 55 passed, 55 total`; `npx jest src/app/pages/bilateral` → `65 passed` suites, `2592 passed` tests; `ng lint --quiet` → `All files pass linting.`; dev build OK.
- First reds (quoted by the Implementer):
  - Tests 1–7 and 11: `TypeError: service.freshDraftJobIds is not a function`. Test 11 also hit `service.consumeFreshDraftJobs is not a function`. These are greenfield missing-member reds, as predicted.
  - Test 8: behavioral `- "draft_id": 2 / + "draft_id": 1`.
  - Tests 9 and 10 were green at baseline; they are regression locks.
  - The behavioral red for test 1 is the Leader's specify-time probe: `Expected: 1 / Received: 0`.
- Falsifiers, run post-change and reverted:
  - Drop `resultCount > 0` → test 2 `Expected: 0 / Received: 1`.
  - Add ids for every COMPLETED job outside `newlyTerminal` → test 4 `Expected: 0 / Received: 1`.
  - Reload per job instead of per poll → test 6 `Expected: 1 / Received: 2`.
  - Remove the guard → test 8 red.
  - Put a `string[]` in `freshDraftJobIds` → `tsc` TS2345, with the tests still green.
- Evidence re-run (Leader inline, non-author): **VERIFIED**. Service spec 55/55; bilateral 65 suites / 2592 tests; `ng lint --quiet` clean; `tsc -p tsconfig.app.json --noEmit` OK.
- Reviewer (`akili-reviewer`, opus, lens checklist): **PASS**. Summary: the behavior matches tasks ADN-T-1, design §6.2, DD-1 and DD-2; every count assertion is tick-flushed; test 5 exercises P-2 + P-13; the guard is safe for all 5 callers; no existing expectation was edited.
- Runtime events: none.

**Not Done / Assumptions (Implementer, verbatim summary):** two early falsifier runs used a `sed` that did not apply; they were redone with Python edits, and the results above come from the redo. `freshDraftJobIds` is a plain writable `signal` (the `unseenFinishedIds` idiom). Tests 2–4 ("zero extra drafts call") also pass at baseline. No blocker and no owed item, so no continuation.

**ADVISORY (4R, not gating):**
- Readability: design §6.2 said "read-only signal". Fixed by an execute-time edit (below).
- Spec accuracy: the tasks red-run note groups tests 9 and 10 with greenfield members; they exercise `loadAllDrafts` only. A traced falsifier for test 10: move `++draftsRequestSeq` above the null-center return → test 10 red. Not executed.
- Reliability: test 11 filters only `POST_` / `DELETE_`. A future `PATCH_` / `PUT_` would go unchecked.
- Resilience: there is no service-level test of a completion with a null center (P-11). ADN-T-2's component tests cover the next-visit load.

**Decisions made:**
- Execute-time spec edits made 2026-10-27, without changing any requirement's meaning:
  - `design.md` §6.2, row `BilateralAiService`: "public read-only signal" → "public signal holding a `ReadonlySet<string>` (writable, like `unseenFinishedIds`)".
  - `tasks.md` ADN-T-1 Description: same wording.
  - Both are carried as a named conformance check into the ADN-T-2 Reviewer brief.
- **No commit.** Root `AGENTS.md` §6 says "Do not commit unless the user explicitly asks", and that overrides Step 3's commit. The changes stay uncommitted for the user.

**Spawns:**
- Implementer: 19 calls, 107,681 tokens, ended complete.
- Reviewer: 10 calls, 90,779 tokens, ended complete.

**Running totals vs budget:** tasks 1/2 · LOC 207/~290 · review rounds 1/3. Within budget. ADN-T-2 has ~83 LOC of headroom against a ~150+ LOC estimate, so the LOC tripwire is likely to fire at the ADN-T-2 finalize.

### ADN-T-2 — Component, template, copy and guide: the "New" badge and its lifecycle

| Field | Value |
|---|---|
| Final status | **`[~]` — Reviewer PASS (attempt 1); the HITL visual check (`ADN-D6` / `ADN-D7`) is still open, so the task is not closable** |
| Date | 2026-10-27 |
| Requirements covered | ADN-R-1 (group side), ADN-R-2 (UI + BUT clause), ADN-R-3 (all scenarios), ADN-R-4 (Jest-evaluable bullets), ADN-R-5 (component), ADN-AC-1, ADN-AC-2, ADN-AC-4 (UI), ADN-AC-5..ADN-AC-8 |
| Skills / effort | `angular-developer`, `tailwind-design-system`, `tdd` (task defaults) · medium |
| Implementer attempts | 1 |

**Attempt 1**
- Files changed:
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts` (+41)
  - `.component.html` (+11)
  - `.component.spec.ts` (+189 / −1)
  - `my-draft-results/CLAUDE.md` (+24 / −25, now 119 lines)
  - `onecgiar-pr-client/src/app/internationalization/bilateral-ai-processes.copy.ts` (+8)
- Implementer verification:
  - Component suite: 2 suites / 112 tests pass.
  - Bilateral: 65 suites / 2602 tests pass.
  - `ng lint --quiet` clean; dev build has no errors.
  - `wc -l CLAUDE.md` = 119.
- First reds were all behavioral:
  - Test 1: `isNew` → Expected true / Received undefined.
  - Test 2: badges → Expected 2 / Received 0.
  - Test 5: `consumeSpy` → Expected 1 / Received 0.
  - Test 7: consumed `[]`.
  - Test 8 was green at baseline (a negative lock).
- Defect found by the tests: a `draft-77` fallback id was marked new. Fixed with `isNew: Boolean(jobId) && freshIds.has(sessionId)` (test 1b).
- Falsifiers, all run post-change and reverted:
  - `isNew = isCurrentUser` → test 1 (Expected false / Received true).
  - Consume from `allDrafts()` → test 7 (D missing).
  - Consume on null→X → tests 6 / 6b (Expected 0 calls / Received 1).
  - Early return before the `sessionGroups()` read → tests 5, 6, 6b, 7.
  - Icon only → test 1 (`"auto_awesomegenerated in your latest AI run"`).
- Consumers grep for `mdr-session-card|mdr-creator-badge`: hits are only in the component html (240, 241, 245, 260, 261), scss (221, 245), spec and `CLAUDE.md`:81. None in `cypress`. No existing expectation or fixture changed.
- Evidence re-run (Leader inline, non-author): **VERIFIED**. 112/112 component, 2602/2602 bilateral, `ng lint` clean, `tsc -p tsconfig.app.json --noEmit` OK, `CLAUDE.md` 119 lines.
- Reviewer (`akili-reviewer`, opus, checklist): **PASS**. It checked:
  - the named execute-time edit — the component only reads `freshDraftJobIds` and consumes through `consumeFreshDraftJobs`;
  - the center rule (`previous != null && current !== previous`);
  - effect read order;
  - `shownFreshIds` survival;
  - the badge markup against §6.3 / pattern 10, strings from the copy file only, and the test-1 selector against the real template.
  - It confirms the guide trim kept every ⚠️ trap.
- Runtime events: none.

**Not Done / Assumptions (Implementer):**
- The HITL visual check at 375/900/1000/1280 px is not done (jsdom cannot evaluate it). This is the user's check per tasks.md.
- The `sr-only` text is exactly `generated in your latest AI run`, so the accessible name reads "New generated in your latest AI run", with no dash.
- Test 5 uses the real `BilateralAiService`, as the existing spec does.
- `CLAUDE.md` prose was condensed to stay ≤ 120 lines.
- This is an owned item with no blocker. Under `gated`, it cannot be closed by a re-spawn: the open item is the user's HITL check, not Implementer work.

**ADVISORY (4R, not gating):**
- Readability: the `mdr-new-badge` class has no reader (it is an unused hook; `data-testid` is the real hook).
- Readability: the guide trim dropped two small facts: "Submit for review is the only path toward P/A review", and "`BilateralAiService` refetches `draftList()` per switch" (the filter-trap reason). There is room for one line.
- Resilience: a fresh id arriving during the X→null gap is consumed later than expected; consider a line in the P-10 trap.
- Risk (a11y): "New" and the `sr-only` suffix rely on flex blockification for a separating space. Add a leading space in the `sr-only` span, or verify with VoiceOver at the HITL pause.

**Spawns:**
- Implementer: 31 calls, 192,295 tokens, ended partial (Not Done: HITL).
- Reviewer: 14 calls, 117,029 tokens, ended complete.

**Running totals vs budget:**
- Tasks 2/2 attempted, 1 closed.
- **LOC ≈ 480** (service 207 + component 273, guide churn included) **vs ~290 budgeted**: +65 %. **Budget tripwire fired.**
- Review rounds 2/3, within budget.

## Budget Tripwire: ADN-T-2

- **Delta:** ≈ 480 LOC actual vs ~290 budgeted (+190). Tasks (2/2) and review rounds (2/3) are within budget.
- **Cause:** the tests, not the production code. Production code is ~92 LOC (32 service + 41 component + 11 html + 8 copy) against ~80 estimated. Tests are ~364 LOC against ~190 estimated. The 19 test cases cover 11 + 8 scenarios, plus a 1b case for the fallback defect the tests caught, and each needs a multi-poll / multi-center harness. The guide churn is +24 / −25 (net −1).
- **Stop rule:** "No mandate widens pre-approval … The exceptions in `/akili-propose` Step 1 *Approval Mode* (HALT, Pivot, budget tripwire, `FATAL_FAIL`, `PRODUCT_BUG`, destructive actions) still stop." The tripwire is never logged `auto-approved`, so the run is stopped for the user.

## Budget Tripwire resolution: ADN-T-2

The user **accepted the overrun** (AskUserQuestion, 2026-10-27: "Aceptar el exceso"). It is not auto-approved.

## HITL visual check: ADN-T-2 (`ADN-D6` / `ADN-D7`)

- **Route:** the user chose "Captura automática" (AskUserQuestion, 2026-10-27).
- **Probe:** a temporary Cypress CT spec mounted the **real** `MyDraftResultsComponent` with real global styles in Chrome. The spec was `src/app/pages/bilateral/pages/my-draft-results/zz-adn-visual-probe.cy.ts`, deleted after the run, and `git status` confirms nothing remains.
  - Stubbed: `BilateralAiService` signals, `ApiService`, `ActivatedRoute`.
  - Fixture: own fresh job A (2 drafts), own old job B, and a teammate's job C, all with a long project name.
  - It measured job A's header **before** (empty fresh set) and **after** (`{A}`) at 375 / 900 / 1000 / 1280 × 900 px, with host zoom 100 %.
- **Font:** Manrope, the production face per `onecgiar-pr-client/CLAUDE.md` §5, so the fonts-loaded condition holds.
- **Measurements** (from the probe's JSON report as printed in the session transcript):

| Width | Header height before → after | Items outside header | Ellipsis-truncated items (before / after) | Doc horizontal excess (before / after) | Badge |
|---|---|---|---|---|---|
| 375 | 173 → 175 px | 0 | 0 / 0 | 665 / 665 (pre-existing baseline, unchanged) | 59×21 at y=45, in header |
| 900 | 76 → 76 | 0 | 0 / 0 | 0 / 0 | 59×21 at y=13, in header |
| 1000 | 76 → 76 | 0 | 0 / 0 | 0 / 0 | 59×21 at y=13, in header |
| 1280 | 48 → 48 | 0 | 1 / 1 (project title `xl:truncate`, baseline) | 0 / 0 | 59×21 at y=13, in header |

- **Contrast:** the computed fg is `oklch(0.491 0.27 292.581)` (violet-700) on bg `oklch(0.969 0.016 293.756)` (violet-50). That is the pattern-10 pair, roughly 7:1, which passes AA for 11 px semibold text.
- **Visual review (Leader, T6-capable model reading the screenshots):**
  - 375: the badge wraps onto the same second line as "2 drafts", which already wrapped in the baseline, so no new row is added.
  - 900 / 1000 / 1280: one row, with the badge right after "Created by you".
  - Teammate and old groups: no badge.
- **Evidence retained:** `adn-before-375.png`, `adn-after-375.png` and `adn-probe-report-375.json` in the session scratchpad (`…/scratchpad/adn-visual/`). The 900/1000/1280 images were viewed in session, then removed by Cypress's `trashAssetsBeforeRuns` on a 375-only re-run, so their numbers are recorded above from the transcript.
- **Probe noise (not product defects):** two tests errored on stub gaps in other components (`drawerOpen`, `draftCountDisplay` missing from the stub). The measurement for each viewport was taken before the error, and the 375 re-run with the gaps filled passed 2/2.
- **Advisory raised by the probe:** `onecgiar-pr-client/CLAUDE.md` rule 21 says "Icons from `@ng-icons/lucide` only", while `docs/ux-ui/design.md` §7 / DD-12 and this page use `material-icons-round`. The badge follows the page and the design doc. This is a pre-existing doc conflict, out of scope.
- **Result:** **PASS**, pending the user's approval of the captures. No header item is pushed out of view, no truncation is added beyond the baseline, the badge is visible at all 4 widths, and contrast is AA.
- **User approval:** "Apruebo" (2026-10-27). The HITL check is closed, and so is the ADN-T-2 Done criterion "HITL visual check passed at all 4 widths against the measured baseline".

**ADN-T-2 final status: PASS**: Reviewer PASS (attempt 1), evidence re-run VERIFIED, HITL approved.

---

## Summary

| Task | Status | Attempts | Reviewer | Evidence re-run |
|---|---|---|---|---|
| ADN-T-1 Service | `[x]` PASS | 1 | PASS (opus) | VERIFIED |
| ADN-T-2 Component / template / copy / guide | `[x]` PASS | 1 | PASS (opus) + HITL approved | VERIFIED |

- **Totals:**
  - LOC ≈ 480 vs ~290 budget. The tripwire fired and the user accepted it.
  - Review rounds: 2 of 3.
  - Checkpoints: 0. Continuations: 0. Runtime events: 0.
- **Final verification:**
  - `npx jest src/app/pages/bilateral` → 65 suites / 2602 tests pass.
  - `ng lint --quiet` clean.
  - `tsc -p tsconfig.app.json --noEmit` OK.
  - `my-draft-results/CLAUDE.md` is 119 lines.
- **Not committed:** root `AGENTS.md` §6. The working tree holds 7 client files plus this spec folder.
- **Constitution Impact:** none. No new module or boundary change; `DraftSessionGroup` gained an additive field, and its folder guide was updated in scope.
- **Open advisories for `/akili-archive`:**
  - The `mdr-new-badge` class is unused.
  - The guide trim dropped 2 facts.
  - The `sr-only` text has no leading space.
  - Test 11 filters only `POST_`/`DELETE_`.
  - Lucide vs `material-icons-round` doc conflict.
