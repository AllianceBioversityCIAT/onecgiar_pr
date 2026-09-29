# Tasks — QA AI: edit Title/Description in the verdict drawer, with optional AI suggestions (W3/Bilateral)

## 1. Scope of this task list

- **Module / feature:** `bilateral` · `qa-ai-text-suggestions` (`BIL-QTS`)
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Ticket:** [P2-3848](https://cgiarmel.atlassian.net/browse/P2-3848) (Enhancement under epic P2-2338; INC-163884 insumo 5). Commits from here on use `[P2-3848]`
- **Owner / driver:** Juan David Delgado
- **Status:** `in-progress` — amended 2026-09-29 for P2-3848 (T-7…T-9 added, owner-approved 2026-09-29)
- **Branch:** based on `performance-refactor` (bilateral work never on `staging`)

## 2. Pre-flight checklist

- ✅ `requirements.md` approved (Phase 1, 2026-09-29)
- ✅ `design.md` approved (Phase 2, 2026-09-29)
- ✅ Open questions resolved (OQ-1…OQ-4)
- ✅ No migration (design §3)
- [x] `P-11` settled: `JSON_KEYS` over `bilateral_quality_assessments.sections` on prtest + prod (T-1 first step, owner)
- [x] `environment.ts` (client) and `.env` (server) present in the worktree before any suite runs

## 3. Task list

### [x] `BIL-QTS-T-1` — Settle P-11 and write the contract addition

- **Type:** `docs`
- **Description:**
  - **First step:** the owner runs, on prtest and prod, a query listing the distinct keys under each `sections.<key>` of `bilateral_quality_assessments` (`JSON_KEYS`), then records the result in `design.md` P-11 with the date.
  - If any key outside `verdict, score, comments, strengths, issues, fields` appears, stop and follow the Pivot Protocol for DD-2.
  - Then amend `docs/bilateral-module/integration-contracts.md` §Quality assessment:
    - add `suggestions` to the Response JSON example;
    - add a key/type/rule table;
    - add the PRMS-side handling rules (requirements R-7/R-8);
    - add a self-contained *For the AI team* block (R-11);
    - add a change-log row stating it is additive-optional, so `contract_version` stays `0.2`.
- **Implements:** `BIL-QTS-R-7`, `BIL-QTS-R-11`; settles P-11
- **Files (expected):** `docs/bilateral-module/integration-contracts.md`, `docs/specs/bilateral/qa-ai-text-suggestions/design.md` (P-11 row only)
- **Depends on:** —
- **Blocks:** T-2
- **Estimate:** S
- **Review:** `checklist`. Documentation of a contract, no code
- **Verification:**
  - **Falsifier:** the contract copy says the version bumps, or makes `suggestions` required, or omits any R-8 drop rule. `grep -n "suggestions" docs/bilateral-module/integration-contracts.md` shows the key without its word limits (30/300) → FAIL.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** P-11 returns a key outside the known set that some reader needs → re-specify DD-2 instead of documenting around it.
  - **Consumers:** none (no shared symbol changed). Readers of the doc: the AI team (Daniela)
- **Definition of done:**
  - [x] P-11 row carries the query as run, its counts and the date, or a `Pivot` note
  - [x] Contract section, table, *For the AI team* block and change-log row present; `contract_version` literal unchanged (`0.2`)
  - [x] No secret/host in the doc

### [x] `BIL-QTS-T-2` — Server: allow-list rebuild and suggestion normalizer (write + read)

- **Type:** `server`
- **Description:**
  - In `bilateral-quality-rules.ts`, add the optional `suggestions` to `QualitySectionResult`, a pure `normalizeSuggestions(raw, verdict, sent?)` implementing design §5 steps 1–7, and a word counter that is bit-for-bit the client's `WordCounterService.counter` algorithm (P-10).
  - In `bilateral-quality-assessment.client.ts`:
    - rebuild each section in `sanitizeScores` from the allow-list (DD-2);
    - call the normalizer with the outbound payload's GI title/description as `sent`;
    - log one line with `request_id` and drop/keep counts when anything was dropped (no text).
  - In `bilateral-quality-assessment.service.ts`, run the normalizer without `sent` on the row → DTO path (`:434`).
  - Do **not** touch `isValidAiResponse`.
- **Implements:** `BIL-QTS-R-6`, `BIL-QTS-R-8` (every row of its table, trim-and-verbatim, never truncated, no text in logs), `BIL-QTS-R-9`, `BIL-QTS-R-10` (served half)
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts`, `…/bilateral-quality-assessment.client.ts`, `…/bilateral-quality-assessment.service.ts`, and their `*.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-3
- **Estimate:** M
- **Review:** `full`. Changes a stored/served shape (`sections`) and an outbound-contract reader
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fixtures must flip the named assertion if the named rule is mutated away:
    - (a) GI `amber` + `suggestions.title` of 31 words → no `title` kept. Mutating the limit to `> 31` keeps it → red.
    - (b) GI `green` + a valid title → nothing kept.
    - (c) title equal to the sent title after trim → dropped.
    - (d) `suggestions: 42` → response `completed`, no `suggestions`, verdicts intact.
    - (e) `evidence` section with `debug: "x"` → stored section has no `debug`. Restoring `...rest` → red.
    - (f) GI `fields: ['title']` still carried (existing `client.spec.ts:484-495`).
    - (g) a stored row whose GI `suggestions.title` is 40 words → the DTO serves none.
    - (h) a 12-word title containing `\n` counts the same as the client counter. The fixture uses `"a\nb c"` so a whitespace-regex counter (3) and the client algorithm (2) disagree.
    - (i) logger spy: no call argument contains the suggestion text.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="quality-assessment"`. It must be red on (a), (d), (e), (g) before the change and green after, and the red must come from the assertions, not from compile errors. Then run `npx tsc --noEmit`, which must be red when a spec assigns `suggestions: { title: 1 }` into `QualitySectionResult`.
  - **Disqualifier:** any existing `quality-assessment` spec breaks because a fixture relies on an unknown section key being persisted → stop; that is a P-11/P-13 refutation (Pivot), not a fixture to patch.
  - **Consumers:** `bilateral-quality-assessment.client.spec.ts`, `bilateral-quality-assessment.service.spec.ts`, `bilateral-quality-rules.spec.ts`, `bilateral-quality-payload.builder.spec.ts` (P-14). Served-shape readers: dialog, UI service and `bilateral-field-quality-flag` (P-13; optional field, no break)
- **Definition of done:**
  - [x] All nine falsifier fixtures present and green; each of (a), (d), (e), (g) observed red before the change
  - [x] `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` and `npx tsc --noEmit` clean
  - [x] No suggestion text in any log call

### [x] `BIL-QTS-T-3` — Client: view type and `markStale()`

- **Type:** `client`
- **Description:** In `BilateralQualityAssessmentView` (`bilateral-quality-assessment-ui.service.ts:21`), add the optional `suggestions?: { title?: string; description?: string }` to the section type. Add `markStale()`, which replaces the held view with `is_current: false` and is a no-op when none is held. Nothing else in the service changes.
- **Implements:** `BIL-QTS-R-4` (client stale state), `BIL-QTS-R-10` (typed read)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-quality-assessment-ui.service.ts` + spec
- **Depends on:** T-2
- **Blocks:** T-4, T-5
- **Estimate:** S
- **Review:** `checklist`. Additive type and one method
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** `markStale()` on a held current view → `assessment().is_current === false`. With nothing held → still `null`, no throw. Mutating it to set `true` → red.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-quality-assessment-ui.service`, red before (method missing → assertion on `is_current`, not a TypeError from setup; call it via a guarded helper) and green after. `npx tsc -p tsconfig.app.json --noEmit` clean.
  - **Disqualifier:** the view is shared by reference with another holder that must stay current → re-specify (currently only the UI service holds it, P-13).
  - **Consumers:** `bilateral-quality-assessment-ui.service.spec.ts`, `bilateral-quality-assessment-dialog.component.spec.ts`, `bilateral-result-creator.component.spec.ts`, `bilateral-field-quality-flag.component.ts` (reads `sections`)
- **Definition of done:**
  - [x] Tests green, `npx ng lint --quiet` clean, type-check clean

### [x] `BIL-QTS-T-4` — Client: GI edit block in the drawer

- **Type:** `client`
- **Description:** In `bilateral-quality-assessment-dialog`:
  - **New inputs:** `editable`, `currentTitle`, `currentDescription`, `savingField`, `resultTypeId`, `lastSaveResult` (design §6.1, added 2026-09-29).
  - **New outputs:** `giFieldSaveRequested`, `recheckRequested`.
  - **Draft signals:** `draftTitle`/`draftDescription`, seeded from the inputs.
  - **`canEditGi`** computed per design §6.1.
  - **Layout (§6.2):** for each field, the optional AI-suggestion sub-block with **Apply**/*Applied*, the `app-pr-input` / `app-pr-textarea` with word-count validation via `WordCounterService` (30/300, title required and not the draft placeholder), and **Save**.
  - **Footer:** **Check again** in the submit slot whenever `stale()`.
  - **Unsaved guard (§6.3):** an inline strip on every exit path and on Check again.
  - **Rendering:** suggestion text through interpolation with `white-space: pre-line`.
  - **a11y:** labelled controls, `aria-live` for save state.
- **Implements:**
  - `BIL-QTS-R-1`, every scenario: *Amber GI* incl. `AND IT MUST keep` pill/comments/*See feedback*/*Go to*; *Not flagged* incl. `BUT … no other section card`; *Not editable* incl. `AND IT MUST NOT … while running or submitting`, and KP / `unavailable` / `skipped_kp_rule`.
  - `BIL-QTS-R-2`: *Invalid value* incl. `AND IT MUST NOT send`; the field-side half of *Save fails* (typed value stays, Save stays enabled).
  - `BIL-QTS-R-3`: *Apply*, *No suggestion* incl. `AND IT MUST show no placeholder`, *Already applied*.
  - `BIL-QTS-R-4`: footer half of *After a save* (Check again shown, submit hidden) and `AND the user can still edit … the other field`; *Stale for another reason*; UI half of `BUT it must NOT allow Submit anyway on the stale assessment`.
  - `BIL-QTS-R-5`.
  - `BIL-QTS-R-10`: rendered half.
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/*` (`.ts`, `.html`, `.scss`, `.spec.ts`)
- **Depends on:** T-3
- **Blocks:** T-5
- **Estimate:** L
- **Review:** `full`. The dialog's public inputs/outputs change and it has several branch conditions
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`, `tdd`
- **Verification:**
  - **Falsifier:** a `canEditGi` truth-table spec over verdict {green, amber, red, grey} × status {completed, unavailable, skipped_kp_rule} × editable × running × submitting × KP.
    - Only amber/red + completed + editable + idle + non-KP shows the fields.
    - Mutating the verdict condition to include `green` must turn at least one row red. The fixture includes a `green` row with a valid suggestion, so the mutation is observable.
    - Further specs:
      - suggestion absent → no `[data-testid=gi-suggestion-title]` and no placeholder text;
      - Apply → draft equals the suggestion, and no output is emitted;
      - a 31-word draft → Save disabled and no emit;
      - `stale` → Check again present and submit absent;
      - a dirty field + *Make adjustments* → the strip shows and `dismissed` is not emitted until Discard;
      - a suggestion containing `<b>x</b>` renders the literal text (`textContent` contains `<b>`).
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-quality-assessment-dialog`. The new specs are red on their behavioural assertions before the template exists (query returns null → expectation fails), then green. Type-check clean.
  - **Disqualifier:** if the drawer's 520 px width cannot hold the fields without breaking the existing card layout (seen at T-6), re-specify the layout rather than shrinking fonts.
  - **Presence ≠ behaviour:** these specs prove the conditions and outputs, not the layout. Layout goes to T-6 (jsdom cannot measure it).
  - **Consumers:** `bilateral-result-creator.component.html:44-51` (the only host of the dialog), `bilateral-result-creator.component.spec.ts`, `bilateral-quality-assessment-dialog.component.spec.ts`. Grep the CSS hooks `bqa-dialog__` in `onecgiar-pr-client/cypress` before renaming any
- **Definition of done:**
  - [x] Every scenario/clause above has a named spec
  - [x] Existing dialog specs still green (content parity with `qa-ai-verdict-drawer`)
  - [x] Lint + type-check clean; no new colour tokens

### [x] `BIL-QTS-T-5` — Client: creator wiring (save through autosave, stale on success, Check again)

- **Type:** `client`
- **Description:** In `bilateral-result-creator`:
  - **Bind** the new dialog inputs: `editable` = `!isFormReadOnly()`, the current values from `creationService`, `savingField`, `resultTypeId`, and `lastSaveResult` (`{field, ok, seq}` set when each drawer save settles, design §6.1).
  - **Handle `giFieldSaveRequested`** per DD-3:
    1. write `creationService.resultTitle/Description`;
    2. `autoSaveService.updateField(field, value, 'text')`;
    3. `flush(getEndpointKeys('general-info'))`, then `waitForSectionSave('general-info')`;
    4. on `hasErrorFor` → error alert with `lastErrorMessageFor`, no stale;
    5. else → `qualityAssessment.markStale()` and a success alert naming *General information*.
  - **Handle `recheckRequested`** by calling `submitResult()` (DD-4).
- **Implements:**
  - `BIL-QTS-R-2` *Save a new title*: persisted; confirmation; header and section show it without reload; `BUT … no later autosave writes the previous value back`.
  - `BIL-QTS-R-2` *Save fails*: alert; `AND IT MUST NOT mark stale`.
  - `BIL-QTS-R-4` *After a save* (stale set).
  - `BIL-QTS-R-4` *Check again*: same guards and running state; `AND IT MUST NOT submit`.
  - `BIL-QTS-R-1` *Not editable* (`editable` source).
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.{ts,html,spec.ts}`
- **Depends on:** T-4
- **Blocks:** T-6
- **Estimate:** M
- **Review:** `full`. Touches shared form state (P-1…P-3) and the submit path
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:**
    - (a) After a drawer save of title `"New"`, a subsequent section Save draft on General information sends `title: "New"`, never the older staged value. The fixture stages `title: "Old"` in autosave first, so a direct-PATCH implementation leaves `"Old"` staged and the assertion goes red.
    - (b) A save whose flush ends in `hasErrorFor` → `markStale` not called.
    - (c) `recheckRequested` → `qualityAssessment.run` called once, and `submitAfterQualityDecision` / `PATCH_bilateralSubmitForReview` never called.
    - (d) `recheckRequested` with an unsaved section → the unsaved alert shows and `run` is not called.
    - (e) A read-only result → `editable` input false.
    - Timing: use deferred observables for the flush/wait so (a) exercises the ordering. A synchronous mock is not evidence.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-result-creator`. (a) and (c) are red on their assertions before the handlers exist. Type-check clean.
  - **Disqualifier:** if `flush` of `generalInfo` sends fields the user did not intend in a way the owner rejects at T-6 → re-specify DD-3 (per-field flush), don't hack around it.
  - **Consumers:** `bilateral-result-creator.component.spec.ts`, `bilateral-auto-save.service` (called, not changed), `bilateral-quality-assessment-ui.service.spec.ts`
- **Definition of done:**
  - [x] Falsifiers (a)–(e) green; (a) and (c) observed red first
  - [x] Lint + type-check clean

### [x] `BIL-QTS-T-7` — Server: field-revision endpoint with server-decided provenance *(amendment 2026-09-29, P2-3848 AC11)*

- **Type:** `server`
- **Description:** Add `POST /api/bilateral/center/quality-assessment/:resultId/field-revisions` (design §4, DD-9) in `bilateral-center.controller.ts` → a service method that: applies the same user/edit guard as `assess`; validates `field ∈ {title, description}`; loads the assessment by id and requires it to belong to `resultId`; reads the result's current value for the field as `new_value`; runs the read-side normalizer on the stored `general_information.suggestions`; writes one `result_field_revision` row (`AI_SUGGESTED` if `trim(new_value)` equals the kept suggestion for that field, else `USER_EDIT`; `proposal_id` null; `change_reason 'bilateral_qa_drawer:assessment=<id>'`); returns `{ provenance }`. Register `ResultFieldRevision` in the bilateral module's `TypeOrmModule.forFeature`. No text in any log.
- **Implements:** `BIL-QTS-R-13` (all scenarios, server half)
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral-center.controller.ts`, `…/services/bilateral-center.service.ts` (or the quality-assessment service), a DTO, `bilateral.module.ts`, specs
- **Depends on:** T-2
- **Blocks:** T-9
- **Estimate:** S–M
- **Review:** `full`. New endpoint writing a stored audit row; authorization surface
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** (a) saved value equals the stored suggestion after trim → row `AI_SUGGESTED`; mutating the comparison to always `USER_EDIT` → red. (b) saved value differs → `USER_EDIT`. (c) client body carries an extra `provenance: 'AI_SUGGESTED'` with a non-matching value → row is `USER_EDIT` (DTO whitelist). (d) assessment of another result → 404 and no row. (e) a stored suggestion that the read-side normalizer drops (e.g. 40-word title) → `USER_EDIT` even if the value matches it. (f) logger spy: no argument contains the field text. (g) user without edit rights → same refusal as `assess`, no row.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral-center|quality-assessment"` red on (a), (c), (d) before, green after; `npx tsc --noEmit` clean.
  - **Disqualifier:** `result_field_revision.result_id` cannot reference bilateral results, or the entity's enum lacks `title`/`description` in the target DB → stop (would need a migration; re-specify DD-9).
  - **Consumers:** `bilateral-center.controller.spec.ts`, `bilateral-center.service.spec.ts`, `api/ai` specs that build `ResultFieldRevision` (entity unchanged), `bilateral.module` DI graph (grep specs that construct the service)
- **Definition of done:**
  - [x] Falsifiers (a)–(g) green; (a), (c), (d) observed red first
  - [x] eslint + `tsc --noEmit` clean; `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` / `AGENTS.md` updated if they list center endpoints

### `BIL-QTS-T-8` — Client: dialog Accept & save and suggestion labels *(amendment 2026-09-29, P2-3848 AC6–AC8)*

- **Type:** `client`
- **Description:** In `bilateral-quality-assessment-dialog`, replace **Apply** with **Accept & save** (DD-7: set the draft to the suggestion, then call the existing `saveTitle()` / `saveDescription()`); relabel the suggestion caption to **Suggested title** / **Suggested description**; keep the *Applied* state; `aria-label`s "Accept and save suggested title/description". No new outputs.
- **Implements:** `BIL-QTS-R-3` as amended (all scenarios, UI half)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-quality-assessment-dialog/*`
- **Depends on:** T-4
- **Blocks:** T-9
- **Estimate:** S
- **Review:** `full`. Changes an existing action's behaviour and its selector
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** (a) Accept & save → `giFieldSaveRequested` emitted once with the suggestion text; mutating it back to copy-only → red. (b) a suggestion the drawer's validation would block (e.g. the draft placeholder) → no emit. (c) caption text is "Suggested title" / "Suggested description". (d) while `savingField` is set the button is disabled. (e) after `lastSaveResult {ok:true}` the block shows *Applied*.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-quality-assessment-dialog` — (a), (c) red on assertions first; `npx tsc -p tsconfig.app.json --noEmit` clean.
  - **Disqualifier:** "Accept & save" does not fit beside the suggestion at 520 px → report for T-6, don't shrink fonts.
  - **Consumers:** dialog spec, creator spec (host), `onecgiar-pr-client/cypress` (grep the old `Apply` test ids before renaming)
- **Definition of done:**
  - [ ] Falsifiers green; existing dialog specs updated only where they asserted Apply
  - [ ] Lint + type-check clean

### `BIL-QTS-T-9` — Client: re-run on close and provenance call *(amendment 2026-09-29, P2-3848 AC3/AC11)*

- **Type:** `client`
- **Description:** In `bilateral-result-creator` (DD-8, DD-9): (1) add `giSavedSinceOpen`, set on each ok drawer save, cleared on drawer open and when Check again runs; in `dismissQualityAssessment()` and `goToQualitySection()` call `submitResult()` once when it is set, the held assessment is stale and the form is editable, then clear it. (2) After a successful drawer save, call the T-7 endpoint through a new API-service method (`POST_bilateralQualityFieldRevision`, client naming rule) with `{field, assessment_id, old_value}`; catch and swallow errors (no alert, no text logged); never change `lastGiSaveResult` because of it.
- **Implements:** `BIL-QTS-R-12` (all scenarios), `BIL-QTS-R-13` (client half)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/*` (+ folder `CLAUDE.md` re-stamp), the bilateral API service file that holds `quality-assessment` calls + its spec
- **Depends on:** T-5, T-7, T-8
- **Blocks:** T-6
- **Estimate:** M
- **Review:** `full`. Submit/run path and a new outbound call
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** (a) ok save then dismiss → `qualityAssessment.run` once; two ok saves then dismiss → still once. (b) no ok save → dismiss runs nothing. (c) failed save only → nothing runs. (d) ok save, Check again, dismiss → `run` once total. (e) read-only → nothing runs. (f) ok save → revision endpoint called once with `{field, assessment_id, old_value}` where `old_value` is the value before the save; failed save → not called. (g) revision call errors → no alert, `lastGiSaveResult.ok` stays true. Use deferred observables.
  - **Red run:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-result-creator` — (a), (f) red on assertions first (not TypeError); type-check clean.
  - **Disqualifier:** the running drawer reappearing on close is rejected by the owner at T-6 → re-specify DD-8 (background run), don't patch.
  - **Consumers:** creator spec, API service spec, `bilateral-quality-assessment-ui.service.spec.ts`
- **Definition of done:**
  - [ ] Falsifiers (a)–(g) green; (a), (f) observed red first
  - [ ] Lint + type-check clean; folder `CLAUDE.md` re-stamped

### `BIL-QTS-T-6` — Manual verification at the HITL pause (layout and cross-component)

- **Type:** `rollout`
- **Description:** On a local stack (`docs/infrastructure.md` §6), stub or record an AI response with GI `amber` and a valid `suggestions.title`, then walk through:
  1. open the drawer;
  2. Accept & save;
  3. the header and General information section show the new title;
  4. press Save draft on General information → the title does not revert;
  5. the stale notice and Check again appear;
  6. Check again → running state → new verdict;
  7. repeat with no `suggestions` at all → fields editable, no suggestion block;
  7a. *(amendment)* Accept & save on a suggestion → saved in one click, labelled "Suggested title"; close the drawer → the check re-runs once and a new verdict shows; confirm one `result_field_revision` row with `AI_SUGGESTED` (and `USER_EDIT` for an adjusted save);
  8. check layout at the drawer's 520 px minimum, at 900 px, and at 375 px phone width. Fields, buttons and the suggestion block must sit inside the card with no horizontal scroll or clipping.
- **Implements:** the manual gates in requirements §7 (drawer ↔ form sync, layout); NFR *Layout*
- **Files (expected):** `docs/specs/bilateral/qa-ai-text-suggestions/execution.md` (evidence only)
- **Depends on:** T-5, T-9 (amended 2026-09-29)
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`. Human evidence, recorded with screenshots
- **Verification:**
  - **Falsifier:** the header or GI section still shows the old title after a drawer save, or it reverts after Save draft, or any control overflows the card at 520 px or 375 px → FAIL.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** production fonts (text and `material-icons-round`) not loaded in the session → the layout reading is not evidence; reload with fonts before judging.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] Screenshots at 520/900/375 and a step log in `execution.md`
  - [ ] Owner sign-off

## 4. Dependency graph

```
BIL-QTS-T-1 (P-11 + contract)
   └── BIL-QTS-T-2 (server normalizer + allow-list)
         └── BIL-QTS-T-3 (client type + markStale)
               └── BIL-QTS-T-4 (dialog GI block)
                     └── BIL-QTS-T-5 (creator wiring)
                           └── BIL-QTS-T-6 (manual HITL)
```

Linear on purpose. T-3/T-4 could start from a stubbed type, but T-4's specs pin the served shape T-2 defines, so parallelizing buys little.

## 5. Coverage closure (scenario / clause → task)

| Requirement · scenario / clause | Task |
|---|---|
| R-1 Amber GI · `AND IT MUST keep` existing card content | T-4 |
| R-1 Not flagged · `BUT no other section card` | T-4 |
| R-1 Not editable (read-only, KP, `unavailable`, `skipped_kp_rule`) · `AND IT MUST NOT` while running/submitting | T-4 (condition) + T-5 (`editable` source) |
| R-2 Save a new title · persisted, confirmation, header/section refresh · `BUT no autosave rewrite` | T-5 (+ T-6 manual) |
| R-2 Invalid value · `AND IT MUST NOT send` | T-4 |
| R-2 Save fails · alert, value kept, Save enabled · `AND IT MUST NOT mark stale` | T-4 (field) + T-5 (alert, no stale) |
| R-3 Apply · No suggestion (`AND IT MUST show no placeholder`) · Already applied | T-4 |
| R-4 After a save · stale set · Check again shown · other field still editable | T-5 (stale) + T-4 (footer, editing) |
| R-4 Check again · guards, running, new verdict · `AND IT MUST NOT submit` · `BUT never Submit anyway on stale` | T-5 + T-4 (UI) + existing server guard (P-7) |
| R-4 Stale for another reason | T-4 |
| R-5 unsaved-edit warning on every exit and Check again | T-4 |
| R-6 garbage suggestions → still completed | T-2 (d) |
| R-7 contract keys, v0.2 kept | T-1 |
| R-8 every drop rule · trim/verbatim · never truncate · no text in logs | T-2 (a)–(c), (h), (i) |
| R-9 allow-list | T-2 (e), (f) |
| R-10 served · rendered as text with line breaks | T-2 (g) + T-4 |
| R-11 AI-team block | T-1 |
| NFR accessibility | T-4 |
| NFR layout (520 px / phone) | T-6 |
| R-3 as amended (Accept & save, labels) | T-8 |
| R-12 re-run on close | T-9 (+ T-6 manual) |
| R-13 provenance row | T-7 (server) + T-9 (client call) |

## 6. Test plan

| Gate | Command |
|---|---|
| Server unit | `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="quality-assessment"` (never the full suite) |
| Server types / lint | `npx tsc --noEmit` · `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` |
| Client unit | `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage bilateral-quality-assessment bilateral-result-creator` |
| Client types / lint | `npx tsc -p tsconfig.app.json --noEmit` · `npx ng lint --quiet` |
| Manual | T-6 |

## 7. Rollout & verification

- There is nothing to toggle. With the AI silent, only edit + Check again is visible.
- After merge to `performance-refactor` the pipeline deploys prtest. UAT goes to Cami (screen ticket).
- Send the T-1 *For the AI team* block to Daniela once merged.

## 8. Roll-back plan

Revert the commits. There is no migration and no data to undo; stored `suggestions` inside assessment rows are inert without the client.

## Required cross-references

`requirements.md` · `design.md` · `proposal.md` · `docs/bilateral-module/integration-contracts.md` · `docs/specs/bilateral/qa-ai-traffic-light/` · `docs/specs/bilateral/qa-ai-verdict-drawer/`
