# Module Spec: W3/Bilateral "Bilateral project tagged" notification (Tasks)

> **Answer first:** there are 3 code tasks plus 1 manual gate. BPT-T-1 (server emit) and BPT-T-3 (client) are independent and can run in parallel lanes, but **only one runs Jest at a time**. BPT-T-2 (server read) follows T-1, because it uses the same shape. BPT-T-4 is the human visual and real-data gate.

## 1. Scope of this task list

`requirements.md` BPT-R-1..R-5 and BPT-NFR-1..6, implemented through `design.md` §7–§9. No migration, no endpoint, no caller change.

## 2. Pre-flight checklist

- [ ] Branch `qa-development-2026-ss` is clean
- [ ] `w1w2-project-tagged` code is present (`segments`, `parseTaggedProjectLabel`, amber chip)
- [ ] Jest always with `--maxWorkers=2` and `--testPathPattern`. Never the full suite. One Jest run on the machine at a time
- [ ] No commit without the user's go-ahead

## 3. Task list

### [x] BPT-T-1: Server: Center-reported text at emit time

- **Type:** server
- **Description:**
  - Add optional `text` to `TaggedTarget`. `emitFor` stores `target.text` verbatim when it's set, and otherwise uses today's logic.
  - In `notifyBilateralContributorsOnSubmission`, project targets set `text = "<reporter> has tagged the bilateral project <code> from your center (<owner>)"`. The reporter is `reportingCenterLabel || 'A CGIAR Center'`. Center targets are untouched.
  - Update the doc comments in `emitFor` and the BCT method, citing BPT-R-1 and DD-2.
- **Implements:** BPT-R-1 (all three scenarios), BPT-NFR-5, BPT-NFR-6
- **Design:** §7.1, DD-1, DD-2, §10.1
- **Files:** `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ `.spec.ts`)
- **Depends on:** none · **Blocks:** BPT-T-2, BPT-T-4
- **Estimate:** S · **Review:** full (shared emitter, BCT safety)
- **Skills:** `nestjs-expert`, `tdd`
- **Cases (minimum):**
  1. Reporter `ICRISAT`, project `B-A1187`, owner `ABC` → exact `toBe` on the new text, plus `not.toContain` for `reported by`, `of your center`, `Click to see the result.` and `()`
  2. Owner acronym null **and** `''` → owner code
  3. Reporter acronym `''` → leading Center code. No leading Center → `A CGIAR Center` and the warning is logged
  4. The same submission's Center target text is byte-identical to today's (`reported by … has tagged the <name>. Click to see the result.`)
  5. Direct flow (`notifyTaggedBilateralProjects`) still stores `B-A1080 (ABC)`. The override must not leak into it
  6. Existing BCT dedup and ordering tests (AC32, project-before-Center) pass **unedited**
- **Feature edits allowed:** only the 4 old-text assertions at spec lines ~693, ~726, ~769 and ~919 change to the new text.
- **Verification:**
  - **Red then green:** `cd onecgiar-pr-server && npx jest --testPathPattern "result-tagged-notification.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit`. Case 1 is red on current code and green after.
  - **Consumers:** `npx jest --testPathPattern "bilateral.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit` stays green
  - **Falsifiers:**
    - Case 2 fails if `||` becomes `??`
    - Case 4 fails if the override is applied to Center targets
    - Case 6 fails if `leadIn` is dropped for project targets (per-type dedup leak)
  - **Disqualifier:** any BCT assertion other than the 4 listed has to be edited to go green. That is a regression: stop and escalate.
- **Definition of done:**
  - [ ] Cases 1–6 green, with the red run recorded
  - [ ] `npx tsc --noEmit -p onecgiar-pr-server` clean
  - [ ] `npx eslint` on the 2 touched files with `--quiet` clean

### [x] BPT-T-2: Server: `message` for the Center-reported shape

- **Type:** server
- **Description:**
  - Add private `parseCenterReportedProjectText`, the twin of the client parser, with a sync comment.
  - Make it the first check in the `RESULT_BILATERAL_PROJECT_TAGGED` case of `buildResultNotificationDescription`. A match returns `<reporter> has tagged the bilateral project <code> from your center (<owner>) to result<identity>`.
  - No match → the existing path.
- **Implements:** BPT-R-3, BPT-R-4 (server half), BPT-NFR-1, BPT-NFR-2
- **Design:** §7.2, §9, DD-3
- **Files:** `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ `.spec.ts`)
- **Depends on:** BPT-T-1 · **Blocks:** BPT-T-4
- **Estimate:** S · **Review:** standard
- **Skills:** `nestjs-expert`, `tdd`
- **Cases:**
  - The §9 shape table as `it.each`
  - A message with code and title, without a title, and without either
  - The existing legacy composed test (~L721), the W1/W2 enriched and bare tests, and the `RESULT_CENTER_TAGGED` tests stay **unedited**
- **Verification:**
  - `cd onecgiar-pr-server && npx jest --testPathPattern "notification/notification.service.spec" --maxWorkers=2 --silent --reporters=summary --forceExit`
  - **Falsifier:** move the new check after `isComposedTaggedText`, and the BPT message case must go red. Revert it.
  - **Disqualifier:** editing any existing assertion means stop.
- **Definition of done:**
  - [ ] Green, with the falsifier red run recorded
  - [ ] tsc and eslint quiet clean
  - [ ] No repository call added in the branch

### [x] BPT-T-3: Client: text parts and avatar

- **Type:** client
- **Description:**
  - In `notification-type.constants.ts`:
    - export `parseCenterReportedProjectText`, the twin with the §9 table, with a sync comment
    - make it the first check in the `RESULT_BILATERAL_PROJECT_TAGGED` case, returning the 6 `segments` from design §8.1 built from `NOTIFICATION_PROJECT_TAGGED_COPY`
  - In `notification-item.component`:
    - add the `isCenterReportedProjectRow` getter
    - add the `@else if` → `<i class="pi pi-briefcase" aria-hidden="true">` branch after `isApprovedDecisionUpdateRow`
    - add the `notification_avatar_project_tagged` SCSS modifier (8px radius, `--pr-status-in-progress-bg/fg`)
  - Copy file: doc comment only.
- **Implements:** BPT-R-2 (both scenarios), BPT-R-4 (client half), BPT-R-5 (both scenarios), BPT-NFR-2..4
- **Design:** §8.1–§8.4, §9, DD-3, DD-4
- **Files:**
  - `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ spec)
  - `…/notification-item/notification-item.component.ts`, `.html`, `.scss` (+ spec)
  - `internationalization/notification-project-tagged.copy.ts`
- **Depends on:** none · **Blocks:** BPT-T-4
- **Estimate:** S · **Review:** standard
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `tdd`
- **Cases:**
  - The §9 table
  - The flattened sentence equals `ICRISAT has tagged the bilateral project B-A1187 from your center (ABC) to result`
  - Emphasized segments are exactly `['ICRISAT','B-A1187','ABC']`, with no `The result`
  - Parentheses-in-code case
  - Old composed, enriched, bare and empty rows produce the same output as today (the existing tests at ~527 and ~573 stay unedited)
  - Avatar: a Center-reported row renders `.pi-briefcase` and the modifier class with no initials. A W1/W2 enriched row renders initials. AI-job and approved rows are unchanged
- **Verification:**
  - `cd onecgiar-pr-client && npm run test:local -- --testPathPattern "notification-type.constants|notification-item.component|update-notification.component|pop-up-notification-item"`, or `npx jest … --maxWorkers=2 --no-coverage`
  - **Falsifier:** swap the order against `isComposedTaggedText`, and the BPT sentence case must go red. Revert it.
  - **Gap:** jsdom asserts the class and icon (presence) and cannot prove colour or radius. That's covered at BPT-T-4.
  - **Disqualifier:** an existing copy or segment assertion needs editing. Stop.
- **Definition of done:**
  - [ ] The 4 scoped specs are green, with the falsifier recorded
  - [ ] `npx eslint` on the touched files with `--quiet` clean
  - [ ] `npx tsc -p onecgiar-pr-client/tsconfig.app.json --noEmit` clean (`noPropertyAccessFromIndexSignature`)

### [ ] BPT-T-4: Manual gate: visual match and real recipients (HITL)

- **Type:** manual
- **Steps:**
  1. Locally, as an ICRISAT (or any Center) user, submit a bilateral result tagging a non-lead project owned by another Center whose owner resolves.
  2. As a user of the owner Center: one Updates row and one bell row. The sentence and bold match `mockup/bct-project-tagged-row.png`. There's an amber briefcase, an amber `Bilateral project tagged` chip and a `W3/Bilateral` chip. Clicking opens the result in `view`.
  3. Same submission: the `CG Center tagged` rows (if any) keep the old text, and the submitter gets nothing.
  4. An old BCT row (if any) still renders the composed fallback.
- **Implements:** BPT-R-1 (real data), BPT-R-2, BPT-R-5 (colour and radius, the gap from T-3)
- **Depends on:** BPT-T-1, T-2, T-3
- **Disqualifier:** if the result never reaches Pending Review, or the project's owner doesn't resolve, the run is **inconclusive**, not a pass. Pick another project.
- **Done:** the user confirms the visual match. A screenshot is attached to `execution.md`.

## 4. Clause coverage

| Requirement / clause | Task |
|---|---|
| R-1 "Acronyms resolve": exact text; NOT `reported by` / `of your center` / `Click…`; NOT `()` | T-1 case 1 |
| R-1 "Fallbacks": owner code; reporter code; `A CGIAR Center` + warning | T-1 cases 2, 3 |
| R-1 "Center targets and BCT unchanged": Center text; guard, recipients, submitter, ordering, dedup; owner-less skip | T-1 cases 4, 6 (existing skip test unedited); T-4 step 3 |
| R-2 "Center-reported row": sentence; 4 bold tokens; NOT `The result` / person / SP; no Accept/Decline + `view` | T-3 (3 tokens incl. result code from existing rendering); T-4 step 2 |
| R-2 "Parentheses" | T-3 and T-2 table |
| R-3 message + missing identity parts | T-2 |
| R-4 "Shape precedence": byte-identical old shapes; check before composed; composed must NOT match | T-2 and T-3 tables + falsifiers |
| R-5 "Avatar by shape": briefcase amber; W1/W2 initials; NOT Requests / AI / approved | T-3 (presence); T-4 (visual) |
| NFR-1 no new query | T-2 DoD |
| NFR-2 twins | T-2, T-3 (same §9 table) |
| NFR-3 copy file | T-3 |
| NFR-4 tokens / icon | T-3, T-4 |
| NFR-5 never throws | T-1 (existing try/catch untouched) |
| NFR-6 no secrets in logs | T-1 |

## 5. Estimate and PR strategy

- **LOC:** ~220 (≈60 production + ≈160 tests). **Single PR / commit set** on `qa-development-2026-ss`, with no split needed.
- **Order:** T-1 ∥ T-3 (parallel lanes, Jest serialized) → T-2 → T-4.
