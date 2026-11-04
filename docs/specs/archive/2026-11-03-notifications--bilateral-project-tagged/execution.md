# Execution Log: notifications/bilateral-project-tagged

## Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bilateral-project-tagged` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Leader | Opus 5.5 (T1) · Implementer: `akili-implementer` wrapper (T2) · Reviewer: `akili-reviewer` wrapper (T3) |
| Started | 2026-10-02 |
| Scheduling | Serial (T-1 → T-2 → T-3 → T-4) instead of the T-1 ∥ T-3 lanes from tasks.md §5: the machine rule allows one Jest run at a time, and parallel Implementers would each run Jest |
| Budget (design §10.2) | 4 tasks · ~220 LOC · ≤2 review rounds per code task. Tripwire: >6 tasks, >~350 LOC, or 3 rounds |

## Task Execution History

### BPT-T-1: Server: Center-reported text at emit time — PASS

- **Date:** 2026-10-02
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` (as listed) · medium
- **Files changed:**
  - `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+43/−12): `TaggedTarget.text?`. `emitFor` stores `target.text ?? (<existing ternary>)`. BCT project targets get `"<reporter> has tagged the bilateral project <code> from your center (<owner>)"`, where reporter = `(reportingCenterLabel || 'A CGIAR Center').trim()`. `label` and `leadIn` are kept. Doc comments cite BPT-R-1/DD-2.
  - `…/result-tagged-notification.service.spec.ts` (+255): new describe block "Center-reported project text (BPT-R-1)" with 6 tests. The only existing assertions edited are the 4 permitted ones (~694, ~728, ~772, ~923).
- **Implementer verification:**
  - Red: 6 new BPT tests failed on unmodified code (6 failed / 46 passed).
  - Green: `npx jest --testPathPattern "result-tagged-notification.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit` → `Tests: 52 passed, 52 total`. Re-run after prettier `--fix`: still 52/52.
  - Consumers: `bilateral.service.spec` → `Tests: 131 passed, 131 total`.
  - Falsifiers (applied, went red, reverted):
    - `||`→`??` on `ownerCenterLabel`: 2 red (case 2)
    - `text` override on Center targets: 7 red (case 4)
    - `leadIn` dropped from the BCT `emitFor` call: 6 red (case 6, AC32 dedup/ordering)
  - `npx tsc --noEmit -p .` (server): clean. `npx eslint <2 files> --quiet`: clean.
- **Case coverage:**
  - Cases 1–4: new tests
  - Case 5: direct flow `B-A1080 (ABC)`, covered by the existing unedited test (spec L173, L200)
  - Case 6: the existing AC32 and ordering tests, unedited
- **Leader check (disqualifier):** `git diff` shows only the 4 permitted assertion hunks plus the new block. No other BCT assertion was edited. This closes the Reviewer's stated limit (no git access).
- **Reviewer verdict (attempt 1): `STATUS: PASS`.** "BPT-T-1 meets BPT-R-1 (all three scenarios), NFR-5 and NFR-6. The emit change is additive and gated on the target. Center targets and the direct flow store the same text as before, and the BCT dedup and ordering path is untouched." The Reviewer confirmed:
  - explicit precedence parentheses
  - the upstream `||` acronym→code chain, with the warning unchanged
  - `centerCode` is guarded non-falsy, so no `()`
  - `leadIn` is still passed unconditionally
- **ADVISORY (4R, non-gating, recorded only):**
  - RELIABILITY: a whitespace-only acronym (`'  '`) is truthy, so it skips the code fallback and `.trim()` then yields `()`. The same applies to the reporter. Unlikely with CLARISA data. Fix would be `acronym?.trim() || centerCode`. Not required by the spec.
  - RELIABILITY: `projectCode` uses `??`, so an empty `shortName` won't fall back to `fullName`. Same as the existing label, so not a regression.
  - READABILITY: the comment at spec ~L1255–1256 ("CIP is the reporting-ineligible lead fallback path") doesn't match the test. There is no leading row; CIP is a plain contributor.
- **Requirements covered:** BPT-R-1 (3 scenarios), BPT-NFR-5, BPT-NFR-6
- **Decisions:** ran tasks serially (see Document Control).
- **Issues:** none.
- **Final verification:** 52/52 + 131/131 green, tsc and eslint clean.
- **Commit:** not committed. Waiting for the user's go-ahead (standing rule: no auto-commit).

### BPT-T-2: Server: `message` for the Center-reported shape — PASS

- **Date:** 2026-10-03
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` (as listed) · medium
- **Files changed:**
  - `onecgiar-pr-server/src/api/notification/notification.service.ts` (+~55): private `parseCenterReportedProjectText` with the end-anchored regex `^(.+?) has tagged the bilateral project (.+) from your center \(([^()]+)\)\s*$`. Each part is trimmed, and any empty part returns `null`. It carries a sync comment naming the client twin and runs as the first check in the `RESULT_BILATERAL_PROJECT_TAGGED` case. On a match it returns `<reporter> has tagged the bilateral project <code> from your center (<owner>) to result<identity>`, using the W1/W2 identity rule.
  - `…/notification.service.spec.ts` (+88, 0 lines removed): nested describe "Center-reported shape (BPT-R-3/R-4)".
    - The §9 table as `it.each`: 3 matches and 5 non-matches. The non-matches assert today's composed, enriched, bare, empty and `()` output.
    - 3 identity tests: code+title, code only, neither.
- **Implementer verification:**
  - Red: implementation stashed, 6 new tests red / 60 passed.
  - Green: `npx jest --testPathPattern "notification/notification.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit` → `Tests: 66 passed, 66 total`. Re-run after prettier `--fix`: 66/66.
  - Falsifier: moving the check after the composed fallback turned 6 tests red. Reverted, back to 66/66.
  - `npx tsc --noEmit -p .`: clean. eslint `--quiet` on the 2 files: clean.
  - The new branch adds no repository call and no `await` (NFR-1).
- **Leader check:** the diff of the spec file is additions only, so the disqualifier was not triggered.
- **Reviewer verdict (attempt 1): `STATUS: PASS`.** "BPT-T-2 meets BPT-R-3, BPT-R-4 (server half), design §7.2, §9 and DD-3." The Reviewer checked:
  - (a) Empty identity ends in `… to result`, the same as the W1/W2 branch.
  - (b) The regex matches §7.2.
  - (c) All 8 §9 rows are pinned through `message`. A wrong split cannot be seen on the server, because the message rebuilds the original order. Accepted for NFR-2 on the server.
  - (d) No existing assertions edited.
  - (e) No query added.
- **ADVISORY (4R, non-gating):**
  - Reliability: the §9 rows never exercise "last ` from your center (`" or "shortest reporter". A direct `service['parseCenterReportedProjectText']` `it.each` asserting reporter / code / owner would make the twin pin literal.
  - Readability: the identity expression is duplicated in two branches of the same case.
- **Forward pointer → BPT-T-3:** the client spec must pin the full `{ reporter, code, owner }` parse result for every §9 row. On the client, the split decides what is shown in bold, which the server spec cannot prove.
- **Requirements covered:** BPT-R-3, BPT-R-4 (server half), BPT-NFR-1, BPT-NFR-2 (server half)
- **Issues:** none.
- **Commit:** not committed. Waiting for the user's go-ahead.

### BPT-T-3: Client: text parts and avatar — PASS

- **Date:** 2026-10-03
- **Attempts:** 1
- **Skills / effort:** `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` (as listed) · medium
- **Files changed** (+224 / −1):
  - `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts`:
    - exported `parseCenterReportedProjectText`, a twin of the server's with the same regex and trims, plus a sync comment
    - it runs as the first check in `RESULT_BILATERAL_PROJECT_TAGGED` and returns the 6 `segments` from §8.1, built from `NOTIFICATION_PROJECT_TAGGED_COPY`
  - `…/notification-type.constants.spec.ts`:
    - the §9 table pinned as the full `{reporter, code, owner}` result, including all 4 null rows (closes the BPT-T-2 forward pointer)
    - tests for the flattened sentence, emphasis `['ICRISAT','B-A1187','ABC']`, parentheses in the code, and an order guard
  - `…/notification-item/notification-item.component.ts`: `isCenterReportedProjectRow` getter.
  - `….html`: `@else if` → `pi pi-briefcase` placed after `isApprovedDecisionUpdateRow`, plus an `[ngClass]` modifier on the avatar.
  - `….scss`: `.notification_avatar_project_tagged` (8px radius, `--pr-status-in-progress-bg/fg`).
  - `….spec.ts`: 6 tests covering the getter true/false cases, the briefcase plus modifier with no initials, W1/W2 rows keeping their initials, and approved-row precedence.
  - `internationalization/notification-project-tagged.copy.ts`: doc comment only, no new key.
- **Implementer verification:**
  - Red: 12 failures in the constants spec and 4 in the item spec, before the implementation.
  - Green: `npx jest --testPathPattern "notification-type.constants|notification-item.component|update-notification.component|pop-up-notification-item" --maxWorkers=2 --no-coverage --silent --reporters=summary` → `Test Suites: 5 passed · Tests: 344 passed, 344 total`.
  - Falsifier: with the check moved after `isComposedTaggedText`, 4 BPT tests went red. Reverted, back to green.
  - `ng lint --quiet`: "All files pass linting." `npx tsc -p tsconfig.app.json --noEmit`: clean.
- **Leader check:** `git diff -U0` on both spec files shows no removed lines, so the disqualifier was not triggered.
- **Reviewer verdict (attempt 1): `STATUS: PASS`.** "BPT-T-3 meets design §8.1–§8.4, §9, DD-3 and DD-4 and requirements BPT-R-2, R-4, R-5 and NFR-2..4. The client parser is an exact twin of the server's." The Reviewer checked:
  - (a) `to result` appears once: it comes from `centerClauseWithLabel.after`, and the row adds only the identity.
  - (b) `segments` replace the lead/prefix blocks, so no emitter name or SP code is shown, and there are no buttons.
  - (c) The twin regex is byte-identical.
  - (d) The `@if` order is correct, and `NgClass` is available (non-standalone module, already bound in the same branch).
  - (e) Only the tokens the spec mandates are used.
  - (f) AI-job precedence is guaranteed by type.
  - (g) No assertion was edited.
- **ADVISORY (4R, non-gating):**
  - RISK (convention): the folder guide `…/notification-item/CLAUDE.md` should get a BPT-T-3 bullet and a re-stamped `Verified:` in the same commit (client CLAUDE.md §10, src/CLAUDE.md §22). It is not in the task's Files list, so it is recorded here for the commit step and was not sent back for rework.
  - READABILITY: the item-spec test named "AI-job and approved-decision … still win" only exercises the approved branch.
  - RELIABILITY: no rendered-DOM test asserts the full Updates-row sentence for this shape. BPT-T-4 should eyeball the "to result 9322" join.
- **Finding carried to BPT-T-4 (possible design gap, Leader note):** BPT-R-2 asks for 4 emphasized tokens, including the result code `9322`. Design §8.1 delegates the result code to "the existing row rendering, exactly as for W1/W2". The Reviewer reports that this rendering styles `9322` as a `font-mono` underlined link, not `<b>`. If the mockup shows `9322` in bold, the visual gate will expose a requirements↔design gap. That would be resolved through the Pivot Protocol, not as T-3 rework.
- **Requirements covered:** BPT-R-2 (both scenarios, with the result code's emphasis subject to the T-4 check), BPT-R-4 (client half), BPT-R-5 (presence), BPT-NFR-2..4
- **Issues:** none.
- **Commit:** not committed. Waiting for the user's go-ahead.
