# Execution Log: W1/W2 "Bilateral project tagged" notification

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/w1w2-project-tagged` |
| Branch | `qa-development-2026-ss` |
| Baseline commit | `79cc05979` |
| Approval Mode | gated |
| Leader | Claude Code (opus) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` |
| Started | 2026-10-01 |

## 2. Task Execution History

Run 1 (2026-10-01): WPT-T-1 (server lane) and WPT-T-3 (client lane) ran in parallel. They are independent: different packages, no shared build output, and scoped Jest only.

### WPT-T-1: Server: enriched label and per-type dedup

- **Status:** PASS (attempt 2 of 3)
- **Date:** 2026-10-01
- **Skills / effort:** `nestjs-expert`, `tdd` · high. Attempt 2 was bumped to xhigh.
- **Requirements covered:** WPT-R-1 (all three scenarios), WPT-R-5 (all scenarios), WPT-R-7 (server half), WPT-NFR-1
- **Final verification:**
  - own spec: 46/46
  - consumer specs `results_by_institutions.service.spec|apply-framework-result-associations`: 43/43
  - `tsc --noEmit` clean, eslint quiet clean
- **Decisions:**
  - The `notificationRepo.find` mock rows in the pre-existing BCT AC32 tests and the "suppresses … (same type)" test now include `obj_notification_type.type`, because the new select reads it. Their assertions are unchanged. The Reviewer ruled this is **not** disqualifier 1 or 2.
  - The `'P-1568-WBS0'` → `'P-1568-WBS0 (CENTER-06)'` label assertion change comes from the WPT-R-1 feature itself.

#### Attempt 2: PASS

- **Files changed:** spec file only. The Leader verified the production diff is byte-identical to attempt 1 (`cmp`).
  - Case 2 gained the `acronym: ''` variant.
  - Case 8 was rewritten to be cross-type: a prior `RESULT_CENTER_TAGGED` row, with a non-lead project target owned by CIP.
- **Falsifier red runs** (each mutation temporary and reverted):
  - (a) `unionNotified` always built: case 4 FAILED
  - (b) `unionNotified = null`: case 8 FAILED (an emit fired)
  - (c) `||` changed to `??`: case 2 FAILED (`Received: "B-A1080 ()"`)
- **Reviewer: PASS.**
  - Both issues are resolved, and the production hunk is unchanged.
  - Case 8 guards against a vacuous pass via `getUserIdsByCenter('CIP')`.
  - The disqualifiers are still not triggered.
- **ADVISORY (carried):**
  - Check on real data that TypeORM fills in `obj_notification_type.type` for the nested select. **Forward pointer to WPT-T-5 gate 2:** a later save that links a second ABC project must add no row.
  - A `?? new Set()` hardening for a future third type. Recorded only.

#### Attempt 1: FAIL

- **Files changed:** `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ `.spec.ts`)
  - label `${projectCode} (${acronym || centerCode})` from `centerIndex`
  - `getAlreadyNotifiedUserIds` returns `Map<type, Set<user>>`
  - `emitFor`: per-type set without `leadIn`, union set with it
  - doc comment updated
- **Verification (Implementer):**
  - own spec: 45/45
  - consumer specs: 43/43
  - tsc clean, eslint quiet clean
  - the red run for case 4 was not captured explicitly
- **Reviewer: FAIL.** The production code is correct and both disqualifiers were not triggered:
  - BCT AC32 fixture enrichment only, assertions unchanged
  - the `(same type)` rename keeps its assertion
- **Issues:** two test-only issues, verbatim:
  1. **Discovered Issue:** Case 8 ("BCT: a prior direct RESULT_CENTER_TAGGED row still blocks the user") cannot detect the per-type rule leaking into BCT.
     - Its only BCT target is a Center target (CIP), which is `RESULT_CENTER_TAGGED`, and its prior row has the same type. Under a leaked per-type rule, CIP still checks the `RESULT_CENTER_TAGGED` set, finds user 21, and the test stays green.
     - The mutation is `const unionNotified = null`: case 7 fails under it, but case 8 passes.
     - Case 8 also duplicates the existing AC32 test at spec.ts:906.
     - **Violated Rule:** `tasks.md` § WPT-T-1 Verification ("Cases 7 and 8 fail if the per-type rule leaks into BCT"); `design.md` §10.1 (BCT AC32, union set covers prior rows of both types).
     - **Remediation:** make case 8 cross-type. Keep the prior `RESULT_CENTER_TAGGED` row for user 21, give the BCT call a non-lead project target whose owner Center's users include 21 (a `resultsByProjectsRepo` row plus a `centerRepo` entry), assert no emit, and confirm red with `unionNotified` forced to `null` and green with the real code.
  2. **Discovered Issue:** Case 2 cannot detect the `()` defect class.
     - No fixture uses an empty-string acronym, so an `acronym ?? centerCode` implementation would pass all three variants, and `not.toContain('()')` can never fail.
     - **Violated Rule:** `tasks.md` § WPT-T-1 Verification ("Case 2 fails on `B-A1080 ()`"); `requirements.md` WPT-R-1 Fallbacks ("IT MUST NOT store an empty `()`").
     - **Remediation:** add `['an empty acronym', { acronym: '', name: 'Empty' }]` to the case 2 `it.each`, expecting `'B-A1080 (CENTER-07)'`. Do not change the production code.
- **ADVISORY:**
  - **Risk:** mocks cannot prove that TypeORM fills in `obj_notification_type.type` for the nested select. If it doesn't, dedup silently fails open. Check on T5 gate 2: a later save that adds a second ABC project must add no row.
  - **Reliability:** `notifiedByType.get(target.type)` would be undefined for a future third type. A `?? new Set()` fallback would harden it.
  - **Evidence:** record a red run for case 4, and one for the corrected case 8 under the leak.

### WPT-T-2: Server: description for the push and message

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-01
- **Skills / effort:** `nestjs-expert`, `tdd` · medium
- **Requirements covered:** WPT-R-2 (push sentence, fallbacks, parentheses), WPT-R-3 and WPT-R-4 (server half), WPT-NFR-5
- **Run:** in parallel with WPT-T-4 (the client lane). The user approved continuing to the end on 2026-10-01.

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/api/notification/notification.service.ts`:
    - private `parseTaggedProjectLabel`, a character-for-character twin of the client one, with a sync comment
    - the bare branch of `RESULT_BILATERAL_PROJECT_TAGGED` builds the new sentence
    - the composed/empty check still runs first
  - `notification.service.spec.ts`:
    - the old-sentence assertions (~L453 message, ~L638) were updated
    - new tests: enriched, parentheses in the name, `a Science Program`, and `A user` (via the new `emitterOverride` param on the spec helper)
    - negative asserts: `as contributor`, `The result`, `created by`, `Click to see the result.`, `()`
- **Verification:**
  - `notification/notification.service.spec`: 53/53
  - `result-tagged-notification.service.spec`: 46/46, unchanged
  - tsc clean, eslint quiet clean
  - **Red run:** with the `isComposedTaggedText` guard removed, the 2 composed-shape tests failed (51/53). The guard was reverted; the Leader confirmed no marker is left.
- **Disqualifier:** not triggered. No `RESULT_CENTER_TAGGED` or BCT assertion changed.
- **Reviewer: PASS.**
  - All five shapes and both fallbacks are pinned with exact `toBe` assertions.
  - The twin contract holds for the regex, the trims and the degenerate-input choices (DR-2).
  - The branch adds no repository call (NFR-5).
- **ADVISORY:**
  - The degenerate `(ABC)` input gives an empty code and a double space, the same as the client twin. The emitter can't produce it.
  - The degenerate inputs could be pinned in a shared `it.each` in both specs.
  - The `message` path is asserted only with a legacy bare row.

  All recorded only.

### WPT-T-4: Client: render `segments` in 3 consumers, plus the amber chip

- **Status:** PASS (attempt 2 of 3)
- **Date:** 2026-10-01
- **Skills / effort:** `angular-developer`, `spartan`, `tailwind-design-system` · medium. Attempt 2 was bumped to high.
- **Requirements covered:** WPT-R-2 (inbox, Updates and bell surfaces), WPT-R-6, WPT-R-8, WPT-NFR-3, WPT-NFR-4
- **Final verification:**
  - the 4 matching suites: 236/236
  - `notification-type.constants.spec`: 56/56
  - `ng lint` clean
  - This was unchanged by attempt 2, which touched docs only.
- **Forward pointer to WPT-T-5 gate 1:** the class assertions prove the token is wired, not that the amber is visible. Do the visual check against `mockup/project-tagged-row.png`.

#### Attempt 2: PASS

- **Files changed:** `notification-item/CLAUDE.md` only.
  - The chip bullet now covers amber for project tagged, green for WCT and violet for every other type.
  - A new bullet describes the `segments` loop.
  - New stamp: `**Verified:** 2026-10-01 · qa-development-2026-ss · WPT-T-4`. The WCT-T-5 stamp is now `**Prior verification:**`.
- **Runtime incident:** the first run of this attempt was cut off by an API network error (ENOTFOUND) partway through the doc edit, which left a duplicate WCT-T-5 block. The Leader resumed the same Implementer, which removed the duplicate. This is recorded as a runtime failure, not a work FAIL.
- **Reviewer: PASS.**
  - The issue is resolved.
  - Against the baseline the diff has only the 2 intended hunks.
  - The prior stamps are unchanged apart from WCT-T-5's label.
  - The doc matches the code.

#### Attempt 1: FAIL

- **Files changed:**
  - `notification-item.component.{ts,html,spec.ts}`
  - `update-notification.component.{html,spec.ts}`
  - `pop-up-notification-item.component.{html,spec.ts}`
- **What changed:**
  - A `segments` loop with `<b>` for emphasized pieces and a trailing `{{ ' ' }}` before the link.
  - The chip label comes from the copy file, with the colour `--pr-status-in-progress-bg/-fg`.
- **Verification:**
  - the 4 matching suites: 236/236 (222 existing + 14 new)
  - `notification-type.constants.spec`: 56/56
  - `ng lint` clean
  - No true pre-edit baseline: the Implementer tried `git stash`, outside its brief, and the sandbox denied it. The Leader confirmed the stash list is unchanged. The Reviewer ruled the disqualifier satisfied because everything is green after the change.
- **Reviewer: FAIL.** All functional checks pass:
  - the falsifier, via the bold assertion
  - the emitter is not bold
  - the link
  - the BCT exact `toBe`
  - the chip, WCT green, the violet chip for other types, no Accept/Decline
  - tokens and copy
- **Issue** (verbatim summary):
  - **Discovered Issue:** `notification-item/CLAUDE.md` (a folder doc) was not updated or re-stamped. It now says something false: every non-WCT update type is violet. It also doesn't describe the `segments` loop.
  - **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 *Folder docs* (and `src/CLAUDE.md` §22): touching any file in a folder with its own `CLAUDE.md` means updating it and re-stamping `**Verified:**` in the same commit. The WCT-T-5 precedent did this.
  - **Remediation:** update the chip section (project → amber + `chipLabel`, WCT green, others violet) and the sentence section (the `segments` loop in place of `lead`/`prefix`, `<b>` for emphasized pieces, the trailing space). Re-stamp `**Verified:** 2026-10-01 · qa-development-2026-ss · WPT-T-4`.
  - The Leader confirmed no other touched folder in this spec (server or client) has a folder `CLAUDE.md`.
- **ADVISORY:** the one-line `@for`/`@if` mixes `{{{` and `}}}}`, which is hard to read and easy for a formatter to break. Suggest a whitespace-sensitivity comment.

### WPT-T-5: Manual gate: visual match and real recipients

- **Status:** `[~]` partial. Gates 1 and 4 PASS on the inbox. The bell, the Updates list, and gates 2 and 3 are pending.
- **Date:** 2026-10-01
- **Setup:** fixture rows inserted in the **local** DB by the user (DBeaver):

  | Row | `notification_id` | `text` |
  |---|---|---|
  | Enriched | 49028 | `B-A1080 (ABC)` |
  | Legacy bare | 49029 | `B-A1080` |
  | BCT composed | 49030 | `reported by AR has tagged the B-A1080 of your center (ABC). Click to see the result.` |

  All three: `target_user` 575, `result_id` 12198 (result code 9730), type 9.
- **Gate 1, inbox** (localhost:4200 `/result/results-outlet/results-notifications`, real Chrome): **PASS.**
  - Enriched row reads `Yeckzin Zuñiga from SP05 has tagged the bilateral project B-A1080 from your center (ABC) to result 9730 - scrambled`.
  - Its `<b>` texts are `[SP05, B-A1080, ABC]`; the emitter is not bold.
  - The chip reads `Bilateral project tagged`, computed bg `rgb(254,243,199)` (#fef3c7) and fg `rgb(180,83,9)` (#b45309), so amber per design §8.4.
  - None of the 3 rows has buttons (no Accept/Decline).
  - Evidence: DOM and computed-style read via the javascript tool, plus a page screenshot. The zoom capture timed out (CDP), and the page had 559 notifications.
- **Gate 4: PASS.**
  - The legacy bare row reads `… B-A1080 from your center to result 9730 - scrambled`, with `<b>` `[SP05, B-A1080]` and no `()`.
  - The BCT row reads `The result 9730 - scrambled reported by AR has tagged the B-A1080 of your center (ABC). Click to see the result.`. Its suffix is in `<b>`, which is pre-existing behaviour (baseline template L64–65 `<b> {{ parts.suffix }} </b>`), so it is unchanged.
- **Bell and Updates list: not observed in the browser.**
  - Opening the bell from automation didn't render `app-pop-up-notification-item` (0 nodes), and the window viewport shrank to 241px.
  - `app-update-notification` doesn't render in the current inbox design.
  - Both stay covered by WPT-T-4's DOM specs. A visual look by the user is pending.
- **Gates 2 and 3: pending** (they need real users and data, and a prtest deploy). **Carried forward pointer:** gate 2 must confirm that a later save linking a second ABC project adds no row, proving TypeORM fills in `obj_notification_type.type` (WPT-T-1 advisory).
- **Cleanup:** delete the fixture rows 49028–49030 when done.

### WPT-T-3: Client: copy file, parser twin, `segments` text parts

- **Status:** PASS (attempt 1 of 3)
- **Date:** 2026-10-01
- **Skills / effort:** `angular-developer`, `tdd` · medium. These are the task's own skills, unchanged.
- **Requirements covered:** WPT-R-2 (text, emphasis map, fallbacks, parentheses), WPT-R-3, WPT-R-4 (client half), WPT-NFR-3

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/internationalization/notification-project-tagged.copy.ts` (new): `verb`, `centerClauseWithLabel {before, after}`, `centerClauseNoLabel`, `chipLabel`
  - `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts`:
    - optional `segments` field on `NotificationTextParts`
    - private `parseTaggedProjectLabel` (`/^(.*)\(([^()]+)\)\s*$/`), with a sync comment pointing at the server twin
    - the bare branch of `RESULT_BILATERAL_PROJECT_TAGGED` builds `segments`, sets `prefix` to the joined sentence and `suffix` to null
    - the composed/empty check still runs first
  - `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.spec.ts`:
    - the 3 old-sentence assertions were updated, not deleted
    - new tests: enriched mockup row, parentheses in the name, the `A user` fallback, and two falsifiers (BCT composed and `RESULT_CENTER_TAGGED` both get no `segments`)
- **Verification:**
  - Baseline before the edit: `npx jest --testPathPattern "notification-type.constants.spec" --silent --reporters=summary --no-coverage` gave 51/51 passed, so nothing was red beforehand.
  - After the edit: 56/56 passed.
  - `npx ng lint --quiet`: "All files pass linting." Standalone `npx eslint <files>` has no config at that cwd. The DoD allows either.
- **Disqualifier:** not triggered. No `RESULT_CENTER_TAGGED` case was edited.
- **Reviewer:** **PASS.** The diff matches design §8.1 and WPT-R-2/R-3/R-4/NFR-3:
  - Composed and empty text is checked first and falls back with no `segments` (DD-2).
  - The five-part `segments` table emphasizes SP, code and label; the emitter stays plain.
  - All five shapes, both fallbacks and the three falsifiers are covered.
- **ADVISORY (4R, non-gating):**
  - READABILITY: the case-header comment (`notification-type.constants.ts` ~L292-293) says the emitter is "its own emphasized `segments` entry". The code correctly keeps the emitter plain (WPT-R-2). Suggested wording: "The SP code, project code and (when present) Center label are each their own emphasized entry; the emitter is plain text (WPT-R-2)." Recorded only; the user decides whether to fix it before the commit.
  - RELIABILITY: degenerate text gives odd but harmless results:
    - `"(ABC)"` → empty code
    - `"B-A1080 ()"` → kept whole as the code

    The server emitter can't produce either (WPT-T-1 owns that). **Forward pointer to WPT-T-2:** the server twin must make the same choices for these inputs so the twins stay in sync (DR-2).
- **Not Done / Assumptions (Implementer):** none in scope. It noted that the server twin is WPT-T-2 and the consumers are WPT-T-4.
- **Decisions:** none beyond the spec.
- **Gate:** gated mode. Awaiting the user at the continue/pause gate.
