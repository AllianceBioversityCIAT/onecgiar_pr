# Module Spec: W1/W2 "Bilateral project tagged" notification (Tasks)

> **Answer first:** 5 tasks in 2 lanes, about 260 LOC (about 60% tests).
>
> - **Server lane:** T1 → T2.
> - **Client lane:** T3 → T4. It is independent of the server lane until the manual gate T5. The client tests use stored-text fixtures, so they don't need the server.
>
> There is no migration. The branch `qa-development-2026-ss` is clean.

## 1. Scope of this task list

- **Module / feature:** `notifications` / W1/W2 bilateral-project-tagged notification
- **Linked spec:** `requirements.md` (WPT-R-1..R-8, NFR-1..6) + `design.md` (DD-1..DD-5, §7–§9)
- **Owner / driver:** Santiago Sanchez
- **Status:** not-started

## 2. Pre-flight checklist

- [x] `proposal.md` approved (2026-10-01), D-1..D-6
- [x] `requirements.md` approved at the Phase 1 gate (2026-10-01)
- [x] `design.md` accepted at the Phase 2 gate (2026-10-01)
- [x] No migration (NFR-2), so `migration:check` is not a gate
- [x] There are no conflicting files on the branch
- [ ] Memory rules: scoped Jest only, run the affected client specs before any commit, no auto-commit

## 3. Task list

### [x] WPT-T-1: Server: enriched label and per-type dedup

- **Type:** server
- **Description:**
  - **Label:** `notifyTaggedBilateralProjects` sets each target's label to `<shortName ?? fullName ?? 'project <id>'> (<owner acronym || owner code>)`, using the `centerIndex` already loaded.
  - **Lookup:** `getAlreadyNotifiedUserIds` also selects the row type and returns the users grouped by tagged type.
  - **`emitFor` without `leadIn`:** filters each target against its own type's set and records the users only into that set.
  - **`emitFor` with `leadIn` (BCT):** keeps using the union set.
  - **Tests and comments:** rewrite the test "drops users … by either tagged type" (`spec.ts:250`) to the per-type rule, citing D-6. Update the `emitFor` doc comment (design §10.1).
- **Implements:** WPT-R-1 (all three scenarios), WPT-R-5 (all scenarios), WPT-R-7 (server half), WPT-NFR-1
- **Design:** §7.1, §7.2, DD-1, DD-4, §10.1
- **Files (expected):** `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ `.spec.ts`)
- **Depends on:** none · **Blocks:** WPT-T-2, WPT-T-5
- **Estimate:** S · **Review:** full (shared emitter, dedup contract, BCT safety)
- **Skills:** `nestjs-expert`, `tdd`
- **New cases (minimum):**
  1. Acronym `ABC` → `B-A1080 (ABC)`
  2. Null acronym → `B-A1080 (<code>)`, and never `()`
  3. No `shortName` → `fullName (ABC)`
  4. Prior `RESULT_BILATERAL_PROJECT_TAGGED` row for U: `notifyTaggedCenters` **does** notify U
  5. Prior `RESULT_BILATERAL_PROJECT_TAGGED` row for U: `notifyTaggedBilateralProjects` does **not** notify U
  6. One call with two ABC projects: one emit for ABC's users
  7. BCT with project `B-A1080` (owner ABC) and Center ABC, where ABC users get **only** the project emit
  8. BCT AC32: a prior direct `RESULT_CENTER_TAGGED` row still blocks U in BCT
- **Verification:**
  - **Falsifier:** case 4 fails against today's code (cross-type set), and that proves the change is needed. Cases 7 and 8 fail if the per-type rule leaks into BCT. Case 2 fails on `B-A1080 ()`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern "result-tagged-notification.service.spec" --silent --reporters=summary --forceExit` (case 4 is red before the change, and all cases are green after)
  - **Consumers stay green:** `npx jest --testPathPattern "results_by_institutions.service.spec|apply-framework-result-associations" --silent --reporters=summary --forceExit` (WPT-R-7: both triggers still call the method with the same arguments)
  - **Disqualifier:** stop and escalate in either case:
    - any existing BCT assertion (`describe('notifyBilateralContributorsOnSubmission …')`) has to be **edited** to go green, since that is a BCT regression
    - a test other than `spec.ts:250` needs its dedup expectation changed
- **Definition of done:**
  - [ ] Red run green, with the 8 cases
  - [ ] Consumer specs green
  - [ ] `npx tsc --noEmit -p onecgiar-pr-server` and eslint quiet on the touched files
  - [ ] No secrets or PII beyond the existing log lines

### [x] WPT-T-2: Server: description for the push and message

- **Type:** server
- **Description:**
  - Add `parseTaggedProjectLabel(text)`, a private helper that splits off the last trailing `(…)` with non-empty contents and returns `{ code, centerLabel | null }`. Add a sync comment pointing at the client twin.
  - In the `RESULT_BILATERAL_PROJECT_TAGGED` case:
    - empty or composed text (checked first) → the existing suffix fallback
    - anything else → `{emitter ?? 'A user'} from {SP ?? 'a Science Program'} has tagged the bilateral project {code} from your center ({label}) to result {code} - {title}`
    - no label → leave out ` ({label})`
  - Update the old-sentence assertions (`notification.service.spec.ts:453, 638`).
- **Implements:** WPT-R-2 (push clause, fallbacks, parentheses scenario), WPT-R-3 (server half), WPT-R-4 (server half)
- **Design:** §7.3, §9, DD-2
- **Files (expected):** `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ `.spec.ts`)
- **Depends on:** WPT-T-1 (same stored shape) · **Blocks:** WPT-T-5
- **Estimate:** S · **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Cases (the same five-shape table as WPT-T-3):**

| Shape | Text | Expected description |
|---|---|---|
| Enriched | `B-A1080 (ABC)` | `… project B-A1080 from your center (ABC) to result …` |
| Parentheses in the name | `Seeds (Phase 2) project (ABC)` | code `Seeds (Phase 2) project`, label `ABC` |
| Legacy bare | `B-A1080` | `… project B-A1080 from your center to result …` |
| BCT composed | `reported by AR has tagged the B-A1080 of your center (ABC). Click to see the result.` | `The result 9341 - <title> reported by AR …`, exactly as today |
| Empty | `null` | `There is a new update on …`, as today |

  Also cover a missing emitter → `A user` and a missing SP → `a Science Program`.
- **Verification:**
  - **Falsifier:** the BCT row produces a `from your center (ABC).`-style sentence, which means the parser ran before the composed check. The legacy row yields `()`. The enriched row still contains `as contributor`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern "notification/notification.service.spec" --silent --reporters=summary --forceExit`
  - **Disqualifier:** if a `RESULT_CENTER_TAGGED` or BCT description assertion changes, stop and escalate (out of scope).
- **Definition of done:**
  - [ ] All shapes green; the old-sentence assertions updated, not deleted
  - [ ] tsc and eslint quiet on the touched files

### [x] WPT-T-3: Client: copy file, parser twin, `segments` text parts

- **Type:** client
- **Description:**
  - **New copy file:** `internationalization/notification-project-tagged.copy.ts` holds the sentence pieces and `chipLabel: 'Bilateral project tagged'` (WPT-NFR-3).
  - **Interface:** `NotificationTextParts` gains an optional `segments: { text: string; emphasize: boolean }[]`.
  - **Parser twin:** `parseTaggedProjectLabel` in `notification-type.constants.ts`, with a sync comment.
  - **`RESULT_BILATERAL_PROJECT_TAGGED` case:**
    - composed or empty text → unchanged fallback
    - anything else → the `segments` from design §8.1. Emphasized: SP, code and label. Not emphasized: emitter. `prefix` is set to the joined plain sentence and `suffix` to null.
  - Update the old-sentence assertions (`notification-type.constants.spec.ts:388, 399, 449`).
- **Implements:** WPT-R-2 (text, emphasis map, fallbacks, parentheses), WPT-R-3, WPT-R-4 (client half), WPT-NFR-3
- **Design:** §8.1, §9, DD-2, DD-3
- **Files (expected):** `onecgiar-pr-client/src/app/internationalization/notification-project-tagged.copy.ts` (new), `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ `.spec.ts`)
- **Depends on:** none · **Blocks:** WPT-T-4
- **Estimate:** S · **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Cases:** the same five-shape table as WPT-T-2. For the enriched row, assert that `segments.filter(s => s.emphasize).map(s => s.text)` equals `['SP09', 'B-A1080', 'ABC']` and that the joined text equals the mockup sentence. Also cover `A user` and `a Science Program`.
  - **Falsifier:**
    - the emphasized list includes the emitter name, or misses `ABC`
    - the BCT row returns `segments`
    - another type (for example `RESULT_CENTER_TAGGED`) returns `segments`
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern "notification-type.constants.spec" --silent --reporters=summary --no-coverage`
  - **Presence caveat:** these tests prove the data shape, not what is rendered. Rendering is WPT-T-4's job.
  - **Disqualifier:** if a `RESULT_CENTER_TAGGED` case in this spec needs editing, stop.
- **Definition of done:**
  - [ ] Spec green; the old assertions updated
  - [ ] `npx ng lint --quiet` clean on the touched files (or `npx eslint <files>`)

### [x] WPT-T-4: Client: render `segments` in 3 consumers, plus the amber chip

- **Type:** client
- **Description:**
  - **Templates:** `notification-item`, `update-notification` and `pop-up-notification-item` loop over `parts.segments` when present (`<b>` for emphasized). They skip the `lead` and `prefix` blocks in that case and leave the link markup unchanged.
  - **Chip label:** `rowTypeChipLabel` maps `RESULT_BILATERAL_PROJECT_TAGGED` to the copy `chipLabel`.
  - **Chip colour:** `rowTypeChipColorClass` (update source) maps it to `!bg-[var(--pr-status-in-progress-bg)] !text-[var(--pr-status-in-progress-fg)]`. The WCT green branch is unchanged.
- **Implements:** WPT-R-2 (inbox, Updates and bell surfaces), WPT-R-6 (all clauses), WPT-R-8, WPT-NFR-4
- **Design:** §8.2, §8.3, §8.4, DD-5
- **Files (expected):**
  - `.../results-notifications/components/notification-item/notification-item.component.{ts,html,spec.ts}`
  - `.../update-notification/update-notification.component.{html,spec.ts}`
  - `shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.{html,spec.ts}`
- **Depends on:** WPT-T-3 · **Blocks:** WPT-T-5
- **Estimate:** S · **Review:** full
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Cases (per consumer, with an enriched fixture):**
    - the DOM `textContent` (whitespace-normalised) contains the mockup sentence
    - the `<b>` elements' texts include `SP09`, `B-A1080` and `ABC`, but not `Lucia Ferrari`
    - the result link still renders `9341 - <title>`
  - **Inbox only:**
    - the chip text is `Bilateral project tagged` and its class contains `pr-status-in-progress`
    - a `RESULT_CENTER_TAGGED` fixture still gets `CG Center tagged` with `pr-status-approved`
    - another Updates type keeps the violet class
    - the row has no Accept or Decline buttons
  - **Regression:** a BCT composed fixture renders `The result … Click to see the result.` with no duplicated text
  - **Falsifier:** a consumer that wasn't updated renders an empty sentence or `undefined`, because `segments` is ignored while `lead` is unset. The test fails on the missing sentence.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern "notification-item.component.spec|update-notification.component.spec|pop-up-notification-item.component.spec" --silent --reporters=summary --no-coverage`
  - **Presence caveat:** a class assertion proves the token is wired, not that the colour is visible or matches the mockup. jsdom cannot evaluate colour, so that check is WPT-T-5.
  - **Disqualifier:** if those suites were already red before the change (memory: the client suite is broadly red on this branch), record the baseline failures first. Only new failures count against this task. A pre-existing red is not a pass, and it is not this task's failure either.
- **Definition of done:**
  - [ ] The 3 specs green (or no new failures against the recorded baseline)
  - [ ] Lint clean on the touched files

### [~] WPT-T-5: Manual gate: visual match and real recipients

- **Type:** manual (HITL)
- **Description:**
  - **Gate 1 (localhost:4200, real browser):** create a fixture or real notification, then compare the inbox row, the Updates item and the bell to `mockup/project-tagged-row.png`. Check:
    - the amber chip
    - bold `SP09`, code and acronym; the emitter not bold
    - the link
    - no Accept or Decline
  - **Gate 2 (localhost or prtest):** one W1/W2 save adds Center ABC and an ABC project. An ABC Center User sees 2 rows (project and center). Re-saving adds none.
  - **Gate 3 (prtest, after deploy):** create a result from the Results Framework that links a bilateral project. The owner's Center User gets the row.
  - **Gate 4:** an old `Result Bilateral Project Tagged` row (legacy bare) reads `… from your center to result …`. A BCT row reads as before.
- **Implements:** the visual defect class (requirements §7), WPT-R-5 on real data, WPT-R-7 end to end, WPT-R-3 and WPT-R-4 on real rows
- **Design:** §8.4, §10.1
- **Depends on:** WPT-T-1..T-4
- **Skills:** `playwright-cli` (only if installed); otherwise manual
- **Verification:** a screenshot per gate, recorded in `execution.md`
  - **Falsifier:** the chip is violet or green, `()` is visible, there's only one row in gate 2, or the row appears for the saver
  - **Disqualifier:** a gate run against seed data whose project owner doesn't resolve (R-5) is not evidence. Choose a project with a known `organization_code`.
- **Definition of done:** [ ] Gates 1–4 recorded as PASS, or as FAIL with a follow-up

## 4. Clause coverage

| Requirement clause | Owner |
|---|---|
| R-1 acronym / code fallback / no `()` / `fullName` fallback | T1 cases 1–3 |
| R-1 BCT text byte for byte | T1 (existing BCT cases unedited), T2 BCT shape |
| R-2 sentence and emphasis map | T3 (data), T4 (DOM ×3), T5 gate 1 (visual) |
| R-2 push sentence | T2 |
| R-2 BUT no `The result` / `as contributor` / `created by` / `Click to see the result.` | T2 + T3 enriched case (negative asserts) |
| R-2 AND `A user` / `a Science Program` | T2, T3 |
| R-2 parentheses in the name | T2, T3 |
| R-3 legacy bare, and MUST NOT `()` / `(undefined)` | T2, T3, T5 gate 4 |
| R-4 composed unchanged, BUT `(ABC).` not parsed | T2, T3, T4 regression, T5 gate 4 |
| R-5 center and project on one save | T1 case 4, T5 gate 2 |
| R-5 later save adds the Center | T1 case 4 |
| R-5 same type twice / two projects on one save | T1 cases 5, 6 |
| R-5 BCT keeps cross-type | T1 cases 7, 8 |
| R-5 re-save silent, saver never notified, MUST NOT fail the save | T1 (existing cases kept green), T5 gate 2 |
| R-6 label and amber, other chips unchanged, CG Center stays green | T4 |
| R-7 Results Framework | T1 consumer run, T5 gate 3 |
| R-8 informational only | T4 (no buttons), T5 gate 1 |
| NFR-1 non-fatal | T1 consumer run (existing throw cases) |
| NFR-2 no migration or API change | T1–T4 file scope (no entity or DTO files) |
| NFR-3 copy file | T3 |
| NFR-4 tokens only | T4 |
| NFR-5 no read-path query | T2 (parser only, no repository call), Reviewer check |
| NFR-6 scoped Jest | every red run is `--testPathPattern` |

## 5. Estimate and PR strategy

| Task | Prod LOC | Test LOC |
|---|---|---|
| T1 | ~35 | ~70 |
| T2 | ~25 | ~35 |
| T3 | ~35 | ~30 |
| T4 | ~20 | ~25 |
| **Total** | **~115** | **~160** (~275) |

The total is under ~400 LOC, so **one PR** against `staging` is enough. Review order: T1 (dedup) → T2 → T3 → T4.
