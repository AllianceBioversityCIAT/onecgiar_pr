# Execution Log — RIR breeding exclusion, innovation packages and copy v3

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/rir-breeding-exclusion` |
| Approval Mode | gated |
| Branch / worktree | `spec/rir-breeding-exclusion` · `D:\PRMS\onecgiar_pr-rir` |
| Baseline | `093655d2c` |
| Started | 2026-11-25 |
| Leader | Claude Code, `opus` (T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` (T2) / `akili-reviewer.md` (T3) |

**Run notes**
- `akili doctor --agents` (v2.42.0): `leader.md` `primary-instructions` OUTDATED (matched 2.36.0); implementer and reviewer CURRENT; tester `context-alignment` CUSTOM-EDITED. Not fixed on the spec branch (shared-file discipline) → pending item: run `akili doctor --agents --fix` on `staging`.
- The worktree had no `onecgiar-pr-server/node_modules`. `package.json` and the lockfile are identical to the main checkout (`git diff 093655d2c 8ed2ffcc9`, empty), so the Leader created a junction to `D:\PRMS\onecgiar_pr\onecgiar-pr-server\node_modules`. It is gitignored. The worktree also has no `.env`, which RBX-T-2 `migration:check` needs.
- Source of the 114 codes: Ruth Mawia's workbook "SP01-breeding results excluded from Center update.xlsx", sheet "Results excluded from notification", column "PRMS Code", rows 3–116. The Leader extracted the list (114 distinct integers, first 26541, last 28704, sum 2109948; 17, 347, 14855 and 28595 present). The Implementer extracted it independently and got an identical list.

## Task Execution History

### RBX-T-1 — Frozen template copy module (v2 + v3) and the exclusion code list

- **Status:** PASS on attempt 2
- **Date:** 2026-11-25
- **Skills:** `nestjs-expert`, `tdd` (task defaults). **Effort:** high on attempt 1 (raised above the medium default because the task needs verbatim copy and byte-exact equality); xhigh on attempt 2 (rework bump).

#### Attempt 1 — FAIL

- **Files changed** (new, under `onecgiar-pr-server/src/api/replicated-innovation-reminders/templates/`): `rir-template-copy.ts`, `rir-template-copy.spec.ts`, `rir-breeding-exclusion-codes.ts`, `rir-breeding-exclusion-codes.spec.ts`
- **Implementer verification:**
  - `npx jest src/api/replicated-innovation-reminders/templates --maxWorkers=2 --silent` → 2 suites, 39 tests, all passed
  - eslint on the touched files: clean
  - `npm run build`: exit 0
- **Falsifier reds** (each applied, run, then reverted):
  - (a) Deleted the `.kind { … }` style line → all four v2 equality tests red (`- .kind { display:inline-block; margin:0 0 14px; … }`).
  - (b) Changed Center "in mid-February {{nextYear}}" to "at the end of January {{nextYear}}" → 1 failed, 32 passed (`Center email: greeting, intro, SP header, paragraphs, mid-February  Expected: > -1  Received: -1`).
  - (c) Deleted code 28704 → 4 failed (`Expected length: 114 Received length: 113`; `Expected: 28704 Received: undefined`; `Expected: 2109948 Received: 2081244`).
- **Evidence re-run** (Leader inline, same command): 2 suites, 39 tests, passed → **VERIFIED**
- **Implementer Not Done / Assumptions** (verbatim; assumptions only, nothing owed, no blocker):
  > The v2 equality test ran green on the first run, so I have no pre-code red for it. The falsifier red above is the evidence. · For spec (a), the fake runner also emulates the `REPLACE` that `1791900000000` runs. I ran that migration's real `up`; I did not hand-apply the cell swap. · The v3 MELIA greeting keeps the v2 form (`{{spCode}}{{#if spName}} – {{spName}}{{/if}}`), because the brief says v2 wins for "unchanged" pieces. · The v3 assertions use literal paragraph text from §6.5 with the years filled in. I put "reported in 2025" only in the Center assertions, where §6.5 has it, and "(2027, 2028 and beyond)" in all four. · The spec's test URL contains no `=`, because Handlebars escapes `=` in values. · I added exports `RIR_Q4_TEMPLATE_NAME`, `RIR_FINAL_TEMPLATE_NAME`, `RIR_MELIA_TEMPLATE_NAME`, `RIR_CENTER_TEMPLATE_NAME` and `RirTemplateBodies`, and an extra assertion that v3 Q4 and final share one body. Neither was in the brief. · The scratchpad holds my own extraction scripts (`read.js`, `codes.js`, `codes.json`); nothing from there is in source.
- **Reviewer verdict: FAIL** (verbatim):

  > STATUS: FAIL
  > SUMMARY: The v3 copy matches design §6.5 paragraph by paragraph: all five developer/MELIA paragraphs, all five Center paragraphs, both intros, the Center SP header and the greetings, with the en dashes in place. The 114-code module is correct: I counted 114, and it opens with 26541, closes with 28704 and includes 17, 347 and 14855. The falsifiers fail on the behavioural assertions. One blocking defect: the v2 Center body is not what the database holds before SR-167303, so `down` would not restore the bodies byte for byte (RBX-R-5). The cause is a gap in the design premise, not careless work by the Implementer, but it gates the task.
  >
  > ISSUES:
  > 1. **Discovered Issue:** A third landed migration rewrites an RIR template, and both DD-7 and the spec (a) fixture leave it out. `onecgiar-pr-server/src/migrations/1793400000000-RCF-CenterRouting.ts:67-71` runs `REPLACE('{{resultCount}} bilateral innovation(s)' → '{{resultCount}} innovation(s)')` on the row `email_template_replicated_innovation_center`. It runs before the new `1793600000000`, so every database that migration reaches already has the Center intro without "bilateral". `buildRirTemplatesV2()` still has `'…your center has {{resultCount}} bilateral innovation(s), reported in previous years…'` (diff line 563). The 1793600000000 `down` would therefore put "bilateral" back into the Center email and silently undo the landed RCF copy fix. The other three bodies are not affected. Spec (a) stays green only because the fake runner never runs 1793400000000.
  >    * **Violated Rule:** `requirements.md` RBX-R-5: "GIVEN prdb at v2 … after down … the 4 bodies equal v2 byte for byte", and "restores the exact v2 bodies". `design.md` §6.4 ("v2 reproduces the bodies in PROD today") and §9 DD-7 name only 1791700000000 and 1791900000000, which is a premise gap. `src/CLAUDE.md` §9 forbids changing the RCF migration, so the fix belongs in v2.
  >    * **Remediation Suggestion:**
  >      - In `buildRirTemplatesV2()`, Center intro: change `{{resultCount}} bilateral innovation(s)` to `{{resultCount}} innovation(s)`.
  >      - In spec (a), also run `new RCFCenterRouting1793400000000().up(runner)` after 1791900000000. The fake runner must:
  >        - answer the ICARDA `SELECT cc.code AS code …` with `[{ code: 'X' }]`, because `resolveIcardaCode` throws on an empty result;
  >        - ignore the `center_reminder_routing` DDL and INSERT.
  >
  >        Its existing REPLACE branch already handles the `[from, to, name, from]` parameters.
  >      - Add a guard assertion that the landed Center body does not contain `bilateral innovation(s)`.
  >      - Leader: amend design §6.4, §9 DD-7 and the §11 ledger to name the three migrations, and correct the "Reversion challenge" item 2 (the live v2 Center intro already has no "bilateral").
  >      - Grep confirmed that no other migration in `src/migrations` names an RIR template.
  >
  > ADVISORY:
  > - RISK: Item 1 also shows that the frozen v2 can fall out of date whenever a later migration patches a template. The module header could list every migration v2 reproduces, so the next copy change knows it has to update that list.
  > - READABILITY: The extra exports (`RIR_*_TEMPLATE_NAME`, `RirTemplateBodies`) are in scope. The migration needs the names to UPDATE by name, and the specs avoid repeating string literals. The "Q4 and final share one body" assertion follows from §6.5 ("Q4 and final share one body"). Accepted.
  > - Implementer assumptions:
  >   - The fake runner runs the real `up` without hand-patching the cell. Confirmed: the guard at spec line 177 proves the REPLACE branch fired.
  >   - The MELIA greeting keeps the v2 conditional `{{#if spName}}`. Correct: §6.5 says "Greetings: unchanged", and the plain form shown in §6.5 is shorthand.
  >   - There is no `=` in the test URL. This is valid: Handlebars escapes `=` as `&#x3D;`.
  > - RELIABILITY: The fake runner's REPLACE drops the last parameter as the trailing `INSTR` argument. That holds for both migrations' call shapes, but a comment saying so would help the next maintainer.

- **Runtime events:** none
- **Spawns:**
  - Implementer: 30 calls, 143,338 tokens, ended complete
  - Reviewer: 11 calls, 71,819 tokens, ended fail
- **Leader adjudication:** the Leader confirmed the finding inline (`1793400000000-RCF-CenterRouting.ts:66-70` calls `replaceInCenterTemplate(WITH_BILATERAL, WITHOUT_BILATERAL)`). The gap is in the design's premise list. RBX-R-5's meaning does not change: the requirement was always "restore the bodies in PROD today". So this is an execute-time spec edit, not a Pivot.
- **Decisions made: execute-time spec edits** (2026-11-25, Leader; none changes what an approved requirement means):
  - `design.md` §6.4 (v2 bullet), §9 DD-7, §9 "Reversion challenge" item 2 and §11 P-11: now name `1793400000000-RCF-CenterRouting` as the third landed migration that writes RIR template bodies.
  - `requirements.md` §3 System Context: context line extended. No requirement changed.
  - `tasks.md` RBX-T-1 spec (a) and the Disqualifier: the RCF migration added.
  - `proposal.md` is left as historical record.
  - Carry-forward: these sections are named conformance checks in the attempt-2 Reviewer brief and in RBX-T-2's.

#### Attempt 2 — PASS

- **Files changed:** `templates/rir-template-copy.ts` (v2 Center intro `{{resultCount}} bilateral innovation(s)` → `{{resultCount}} innovation(s)`; header lists the three migrations v2 reproduces, with a note to add any later rewrite) · `templates/rir-template-copy.spec.ts` (spec (a) also runs the real `RCFCenterRouting1793400000000().up`; the fake runner answers the ICARDA lookup with `[{code:'X'}]` and ignores the `center_reminder_routing` DDL/INSERT; guards: no ignored statement wrote to `template`; Center before RCF has "bilateral", after RCF it has none; the other three bodies are unchanged by RCF; v2 Center has no "bilateral"). The codes files are untouched.
- **Implementer verification:**
  - Red before the fix: 2 failed, 40 passed (Center byte-equality and the new "no bilateral" guard; `- … your center has {{resultCount}} innovation(s), reported in previous years …` / `+ … {{resultCount}} bilateral innovation(s) …`)
  - After the fix: 2 suites, 42/42 passed
  - eslint on the 2 touched files: exit 0
  - `npm run build`: exit 0
- **Falsifier reds** (each reverted; `cmp` identical to green):
  - (a) Dropped the `.kind` line → 4 failed (all v2 byte-equal tests).
  - (a′) Put "bilateral" back in the v2 Center intro → 2 failed (Center byte-equal; `v2 Center intro has no "bilateral"`, `Expected substring: not "bilateral innovation(s)"`).
- **Evidence re-run** (Leader inline, `npx jest src/api/replicated-innovation-reminders/templates --maxWorkers=2 --silent`): 2 suites, 42/42 passed → **VERIFIED**
- **Implementer Not Done / Assumptions** (verbatim; assumptions only, nothing owed): `1791500000000-RIR-CreateReminderTables` also names the Q4 and final templates. It only creates the rows, and 1791700000000 overwrites their bodies by name, so it does not affect v2. The fixture's pre-seeded "legacy q4/final" rows stand in for it. The Reviewer's grep claim ("no other migration names an RIR template") is therefore slightly off, with no effect on v2. · Nothing committed. · Another 26 node processes were running on the machine when I started, and I did not check whether any of them was a test run.
- **Reviewer verdict: PASS**
  - Attempt-1 FAIL resolved: v2 Center intro equals the post-`1793400000000` body.
  - The fake runner was traced against the source of all three migrations.
  - All four named conformance checks hold (§6.4, DD-7, P-11 as reworded, tasks.md spec (a) and Disqualifier).
  - v3 re-checked verbatim against §6.5.
  - Only 4 migrations name RIR templates; `1788762000000` predates RIR and targets other rows.
- **ADVISORY** (non-gating):
  - RELIABILITY: the fake `UPDATE … SET template = ?` branch sets a body even when the row does not exist, while a real UPDATE changes nothing. Harmless today because Q4 and final are pre-seeded. Suggestion: apply the update only when `bodies.has(name)`.
  - READABILITY: the REPLACE branch assumes a trailing INSTR guard param. A one-line assertion (`params[params.length-1] === from`) would make a future param shape fail loudly.
- **Runtime events:** none
- **Spawns:**
  - Implementer: 25 calls, 124,386 tokens, ended complete
  - Reviewer: 14 calls, 75,307 tokens, ended pass
- **Decision (execute-time spec edit, 2026-11-25):** `design.md` §11 P-11 reworded. The earlier "no other migration names an RIR template" was disproved by `1791500000000`; the corrected text is "no other migration leaves an RIR body in effect". The Reviewer confirmed it.

**RBX-T-1 summary**
- Requirements covered: RBX-R-1 (seed content: 114 codes), RBX-R-4 (v3 copy, years, breeding paragraph, linked ID, redirect notice, disclaimer), RBX-R-5 (v2 bodies byte-exact for `down`).
- Final verification: 42/42 green, lint clean, build green.
- Commit: not made. The user commits only on explicit go-ahead.
- Running budget (tripwire: >7 tasks, >~1,300 LOC, >9 rounds):
  - tasks 1 of 5 done
  - LOC 668 (copy 273 + spec 318 + codes 26 + spec 51)
  - review rounds 2
  - within budget. Note: T-1 alone used 668 LOC against its ≈480 estimate (≈260 copy + ≈220 specs). The overrun is in the spec fixtures (DD-7 runner); watch the total.
- Carry-forward to RBX-T-2's Reviewer brief: the §6.4, DD-7 and P-11 amendments (named conformance checks), and the missing worktree `.env` (needed by `migration:check`).

### RBX-T-3 — Selection: exclusion list and innovation packages in `findPending`

- **Status:** PASS on attempt 1
- **Date:** 2026-11-25
- **Skills:** `nestjs-expert`, `tdd`. Effort: high, raised above the medium default because this is the core selection (a wrong predicate emails the wrong people).
- **Order note:** the Leader ran T-3 before T-2. T-3 does not depend on T-2 (`tasks.md` §4), and T-2's `migration:check` is waiting on a worktree `.env`. The classifier blocked the Leader from copying it, so the user has been asked to copy it.

#### Attempt 1 — PASS

- **Files changed:** `repositories/pending-innovation.repository.ts` (WHERE: `((r.version_id = ? AND r.result_type_id IN (2, 7)) OR (r.result_type_id = 10 AND r.version_id IN (SELECT ipv.id FROM version ipv INNER JOIN version rpv ON rpv.id = ? WHERE ipv.app_module_id = 2 AND ipv.is_active = 1 AND ipv.status = 1 AND ipv.phase_year = rpv.phase_year)))`, common predicates unchanged, `AND NOT EXISTS (SELECT 1 FROM replicated_innovation_reminder_exclusion x WHERE x.result_code = r.result_code AND x.is_active = 1)`, params `[versionId, versionId]`, doc comment updated) · `repositories/pending-innovation.repository.spec.ts` (params pin `[V, V]`; the `:45`/`:51` pins replaced by a combined branch A assertion; a branch B group (6 assertions) and an exclusion group (4 assertions) added) · `digest-builder.ts` (comment only, names type 10). Diff: +116 / −15.
- **Red run** (new assertions written first): 11 failed, 29 passed. Examples: `Expected substring: "(r.version_id = ? AND r.result_type_id IN (2, 7))"`, `Expected substring: "x.result_code = r.result_code"`, `Expected pattern: /\w+\.status = 1/`, `Expected substring: "NOT EXISTS"`.
- **Green:**
  - repository spec 40/40
  - module run 13 suites, 266 tests green, which includes the consumer `reminder-dispatcher.service.spec.ts`
  - eslint on the 3 touched files clean
  - `npm run build` green
- **Mutations** (each red, then reverted):
  - `x.result_code = r.id` → `keys the exclusion on result_code…` red
  - drop `AND ipv.status = 1` → `requires the IPSR phase to be open: status = 1 (DD-8)` red
  - drop the phase_year join → `pins the IPSR phase_year…` red
  - drop `x.is_active = 1` → red
  - drop `app_module_id = 2` → 2 red
- **Evidence re-run** (Leader inline, `npx jest src/api/replicated-innovation-reminders/repositories --maxWorkers=2 --silent`): 2 suites, 40/40 → **VERIFIED**
- **Implementer Not Done / Assumptions** (verbatim; assumptions only, nothing owed): This proves SQL text only, not row selection on real data. That is RBX-T-5. · The year-join assertion is alias-neutral, as briefed. It captures both aliases and checks `INNER JOIN version <bound> ON <bound>.id = ?` and `FROM version <ipsr>`. · The "NOT EXISTS applies to both branches" assertion is index-based: it only checks that `NOT EXISTS` comes after `r.is_active = 1`, so it is weaker than the others. · Python rewrote the touched files with CRLF line endings; the diff stat stays small and eslint is clean.
  - Leader check: `git ls-files --eol` shows `i/lf w/crlf`; git normalizes the endings and the diff is small. No issue.
- **Reviewer verdict: PASS.** Matches §6.1 / DD-1 / DD-8. A and B sit inside one parenthesised OR; the common predicates and NOT EXISTS are ANDed at top level, so the exclusion applies to both branches. Columns verified against `version.entity.ts:57,64,79`. Every RBX-R-2 negative is covered, RBX-R-1 keys on `result_code` + `is_active`, and RBX-R-6 is one statement. The named checks (§6.4, DD-7, P-11) are not contradicted.
- **ADVISORY** (non-gating):
  - RELIABILITY: the "applies to every branch" test still passes for `… AND r.is_active = 1 OR NOT EXISTS (…)`. Suggestion: assert no `OR` between the OR group's closing paren and `NOT EXISTS`.
  - RISK: `findPending` fails with a missing-table error until the RBX-T-2 migration runs. T-2 and T-3 must ship and deploy together: a deploy that carries T-3 without the migration takes the module down. Leader note: both ship in one commit/PR on this branch, and Jenkins applies migrations on deploy.
  - RELIABILITY: a NULL `phase_year` on the bound version would empty branch B silently. Check it in the RBX-T-5 prdb count.
- **Runtime events:** none
- **Spawns:**
  - Implementer: 54 calls, 149,799 tokens, ended complete
  - Reviewer: ended pass (host usage not yet reported at the time of writing)
- **Requirements covered:** RBX-R-1 (key and active flag: SQL), RBX-R-2 (selection and negatives: SQL), RBX-R-6 (one statement)
- **Running budget:** tasks 2 of 5; LOC ≈ 668 + 131 = 799; review rounds 3. Within the tripwire (>7 tasks, >~1,300 LOC, >9 rounds).
- **Gate:** the user said "continua hasta que termines" (2026-11-25), so routine gates are pre-approved and this gate auto-passes. Logged `auto-approved (user instruction)`.

### RBX-T-4: Dispatcher, package type name, IPSR link and year variables

- **Status:** PASS on attempt 1
- **Date:** 2026-11-25
- **Skills:** `nestjs-expert`, `tdd`
- **Effort:** medium
- **Concurrency:** the Implementer ran while the RBX-T-3 Reviewer (read-only, no tests) was active. Only one Jest run happened at a time.

#### Attempt 1: PASS

- **Files changed:**
  - `reminder-dispatcher.service.ts`:
    - `RESULT_TYPE_NAMES[10] = 'Innovation package'`
    - new exported pure `buildResultUrl(resultsUrl, typeId, code, versionId)`: type 10 with a base matching `^(.*)result/result-detail/?$` becomes `…ipsr/detail/<code>/general-information?phase=<v>`; anything else falls back to today's concatenation; an `undefined` base is guarded
    - `resultUrl` built through the helper
    - template data adds `previousYear` (phaseYear − 1) and `nextNextYear` (phaseYear + 2)
  - `reminder-dispatcher.service.spec.ts`: 8 new tests, 39 existing tests unchanged
  - Diff: +112 / −2. Both files normalized to LF.
- **Red run:** the first run failed to compile because the export was missing; that does not count as a red. Against a baseline stub of today's behaviour:
  - Expected `Innovation package|https://x/ipsr/detail/9001/general-information?phase=9;`, received `|https://x/result/result-detail/9001/...`.
  - Years: expected `2025|2026|2028`, received `|2026|`.
  - Type 10 with trailing slash: received the result-detail URL.
  - Type 10 without trailing slash: received `https://x/result/result-detail9001/...`.
- **Mutation:** type-10 check set to `false`. 3 failed (the package render and both type-10 rows); the 2/7 rows stayed green. Reverted.
- **Green:**
  - Spec: 47/47.
  - eslint: clean (prettier `--fix` only).
  - `npm run build`: green.
  - The existing type-7 render spec (`https://prms.test/result/`) was not edited.
- **Evidence re-run:** Leader ran inline `npx jest src/api/replicated-innovation-reminders/reminder-dispatcher.service.spec.ts --maxWorkers=2 --silent`. Result: 1 suite, 47/47, **VERIFIED**.
- **Implementer behaviour notes** (verbatim):
  - Types 2/7, and a package with another base shape such as `…/result/`, keep today's `${base}${code}/…` concatenation. With a no-slash base that gives the malformed `…result-detail9001/…`, exactly as today. I left it unchanged as instructed.
  - An `undefined` base does not throw; it yields the string `"undefined9001/…"`, as today.
  - A package plus a type-2 row land in the MELIA summary message, so the render spec uses the `T_MELIA` template.
- **Reviewer verdict: PASS.** Conforms to §6.3, DD-3, DD-4, P-6 and RBX-R-3. It supplies the RBX-R-4 data keys: every `{{key}}` in the v3 bodies is provided. The consumer pins `:126`, `:550` and `:567-585` are untouched. The named checks (§6.4, DD-7, P-11) are not contradicted.
- **ADVISORY** (non-gating):
  - READABILITY: `INNOVATION_PACKAGE_TYPE_ID = 10` duplicates `ResultTypeEnum.INNOVATION_USE_IPSR` (`src/shared/constants/result-type.enum.ts:11`). The enum's name is misleading for packages, so the local constant is defensible.
  - RELIABILITY: the regex is not anchored to a path separator before `result/` (suggestion: `(^|/)`).
  - RELIABILITY: the new render spec restores `process.env.RESULTS_URL` outside a `finally`. This copies the existing pattern in the file.
  - RISK: P-6 is still UNVERIFIED. Keep the RBX-T-5 check that a package link opens `ipsr/detail`.
  - Today's behaviour, backlog only: types 2/7 with a no-slash base, and an `undefined` base.
- **Runtime events:** none
- **Spawns:**
  - Implementer: 20 calls, 111,931 tokens, ended complete.
  - Reviewer: ended pass. The host had not reported its usage when this entry was written.
- **Requirements covered:** RBX-R-3 (package link, Innovation Use keeps result-detail, unknown base shape), RBX-R-4 (years: data side)
- **Running budget:** tasks 3 of 5, LOC ≈ 799 + 114 = 913, review rounds 4. Within the tripwire.
- **Gate:** `auto-approved (user instruction "continua hasta que termines")`.

### RBX-T-2: Exclusion entity and migration `1793600000000-RIR-BreedingExclusionCopyV3`

- **Status:** PASS. Closed after `migration:check` (see below). Earlier state: `[~]`. Both lens Reviewers PASSED. One DoD item was owed: `npm run migration:check`. It needs `onecgiar-pr-server/.env` in the worktree. The classifier blocked the Leader from copying it, so the user was asked to copy it.
- **Date:** 2026-11-25
- **Skills:** `nestjs-expert`. `tdd` dropped: the task has no test gate (P-7).
- **Effort:** xhigh. The migration runs on PROD data and the dial calls for `max`, but `max` is barred on T2, so the T2 ceiling `xhigh` applies.

#### Attempt 1: PASS (2 parallel lens Reviewers), DoD item owed

- **Files changed** (new, LF):
  - `src/api/replicated-innovation-reminders/entities/replicated-innovation-reminder-exclusion.entity.ts`
  - `src/migrations/1793600000000-RIR-BreedingExclusionCopyV3.ts`
  - No registration line was needed: `config/orm.config.ts:15` globs `api/**/*.entity{.ts,.js}`.
- **Migration up:**
  1. CREATE TABLE IF NOT EXISTS, with the RCF column pattern.
  2. One multi-row INSERT IGNORE with 228 bound params: 114 codes plus the reason.
  3. Four `UPDATE \`template\` … WHERE name = ?` statements to `buildRirTemplatesV3()`.
  4. A guard throws if a body is missing.
- **Migration down:** four UPDATEs to `buildRirTemplatesV2()`, then DROP TABLE IF EXISTS. The header documents the four futures.
- **Implementer verification:**
  - `npm run build`: exit 0.
  - eslint and prettier: clean.
  - Capturing-runner simulation of the compiled migration: `up` ran 6 statements and `down` 5; 228 placeholders for 228 params; the up bodies equal v3 and the down bodies equal v2; only `template` and the exclusion table were touched.
  - An offline TypeORM metadata dump matches the DDL on every column.
- **Static gate:** `grep -n "WHERE name"` returns line 122, `'UPDATE \`template\` SET \`template\` = ?, last_updated_date = CURRENT_TIMESTAMP WHERE name = ?;'`. `UPDATE \`template\`` appears once. The only writes are CREATE/INSERT IGNORE/DROP on the exclusion table and the UPDATE on `template`.
- **Evidence re-run** (Leader, inline): `npm run build` passed with no errors, and the static gate gave the same output. **VERIFIED** for build and static gate. `migration:check` was not run (no `.env`).
- **Implementer Not Done / Assumptions** (verbatim):
  - `migration:check` is owed: `.env` is missing, checked twice, and I did not create it. Run `npm run migration:check` after it is copied. Note that this script only compares migration file names with the `migrations` table. It prints no schema diff, so the expected pending list is only `RIRBreedingExclusionCopyV31793600000000`.
  - The UPDATE is a plain single-quoted string rather than a template literal. With escaped backticks the file would contain `UPDATE \`template\``, which the brief's grep would not match.
  - Added a small guard: the migration throws if a template name has no body. Otherwise an undefined bound param would be written as NULL and wipe the template.
  - The class declaration wraps onto two lines (prettier), like `1791800000000`. Its `name` property equals the class name, so `migration:check` resolves it correctly.
  - Finding for the Leader: the `**/templates/*` asset glob in `nest-cli.json` copies T-1's `templates/` folder, specs included, into `dist/shared/templates/api/...` on build. It is harmless and `dist` is gitignored, but the folder name collides with that glob.
- **Reviewer, conformance + reliability lens: PASS.** It meets §4, §6.6, DD-2/5/6/7 and RBX-R-1/4/5. The static gate is confirmed. The DDL is byte-identical to the RCF audit columns and `BaseEntity`. `result_code` is bigint (P-3). The seed is idempotent. It also confirmed that `scripts/check-pending-migrations.ts` compares names only.
- **Reviewer, risk + resilience lens: PASS.**
  - Only the 4 named rows and the new table are written. `last_updated_date` is real on `template`.
  - Partial `up` or `down` converges on re-run (MySQL implicit DDL commit, TypeORM default transaction mode `all`).
  - `down` dropping the table is required by §6.6 and RBX-R-5.
  - 228 params are client-side escaped, so there is no placeholder limit.
  - The bigint-to-bigint correlation is collation-free. No secrets or PII.
- **ADVISORY** (non-gating):
  - Roll-back order (RISK): run `down` first, then revert. **Applied as an execute-time spec edit to `tasks.md` §8 (2026-11-25).** It changes no requirement: it orders the two steps §8 already lists.
  - `writeTemplateBodies` ignores affected rows. Suggestion: `SELECT COUNT(*) … WHERE name IN (4 names)`, and throw if the count is not 4. A strict `=== 1` affected-rows check would break the safe re-run.
  - DD-2's reasoning ("so `migration:check` stays clean") overstates that gate, which checks names only. Entity/DDL drift is evidenced only by the Implementer's offline metadata dump.
  - INSERT IGNORE downgrades truncation to a warning. There is no exposure today (73-character reason).
  - With migrations run in a batch, this migration stays recorded even if a later one fails. Its state is consistent either way.
  - `nest-cli.json` `**/templates/*` copies the `templates/` folder into `dist`. Harmless, backlog only.
- **Runtime events:** none
- **Spawns:**
  - Implementer: 54 calls, 172,067 tokens, ended partial (`migration:check` owed).
  - Reviewer (conformance): 22 calls, 65,141 tokens, ended pass.
  - Reviewer (risk): 16 calls, 66,065 tokens, ended pass.
- **Requirements covered:**
  - RBX-R-1: seed, idempotent.
  - RBX-R-4: no other template row modified.
  - RBX-R-5: `down` writes v2 and drops the table.
- **Running budget:**
  - tasks 4 of 5 implemented
  - LOC ≈ 913 + 168 = 1,081 (tripwire ~1,300)
  - review rounds 6 (tripwire 9)
  - Within budget.
- **To close:** once `.env` is present, the Leader runs `npm run migration:check` in `onecgiar-pr-server`. The expected pending list is only `RIRBreedingExclusionCopyV31793600000000`. The output then gets quoted here, and the task flips to `[x]`.
- **Owed DoD item closed (2026-11-25).** The user copied `.env` into the worktree. It is gitignored (`git check-ignore` confirmed). The Leader then ran `npm run migration:check` in `onecgiar-pr-server`, read-only, with the migration NOT applied:
  ```
  📊 Migration Status:
     Total migrations: 504
     Executed: 512
     Pending: 1
  ❌ Found 1 pending migration(s):
     - RIRBreedingExclusionCopyV31793600000000
  ```
  - This is the expected state: only `1793600000000` is pending. Exit code 1 is how the script reports a pending migration.
  - "Executed 512 > total 504": the local DB holds migrations from other branches. This is not a defect.
  - Reminder: this script checks migration names only, not schema drift (see the advisory above).
- **RBX-T-2 final:** PASS. Requirements RBX-R-1 (seed), RBX-R-4 (by-name only) and RBX-R-5 (up/down). `auto-approved (user instruction "continua hasta que termines")`.

## Summary (code tasks complete; RBX-T-5 HITL pending)

| Task | Result | Attempts | Review |
|---|---|---|---|
| RBX-T-1 | PASS | 2 (1 FAIL: v2 Center missed the RCF migration) | full |
| RBX-T-2 | PASS | 1 (+ owed `migration:check`, closed) | 2 parallel lens Reviewers |
| RBX-T-3 | PASS | 1 | full |
| RBX-T-4 | PASS | 1 | checklist |
| RBX-T-5 | pending (user HITL) | — | — |

**Budget.** About 1,081 LOC against a ~1,300 tripwire, 6 review rounds against 9, and 5 tasks against 7. Within budget.

**Spec edits during execution** (none changes what a requirement means):
- `design.md`: §6.4, DD-7, the Reversion challenge item 2, and P-11 (three landed migrations).
- `requirements.md`: §3 context.
- `tasks.md`: RBX-T-1 spec (a) and Disqualifier, and the §8 roll-back order.

**Pending items:**
- Run `akili doctor --agents --fix` on `staging` (leader persona drift).
- Run `codegraph sync` and kaizen at `/akili-archive`.
- Advisories are recorded per task, as backlog only.

### RBX-T-5: HITL. Step 1: prdb up → down → up (2026-11-25)

The user ran these commands from the worktree `D:\PRMS\onecgiar_pr-rir\onecgiar-pr-server`. The DB in the logs is `prdb`, which is also the DB of the PRTest environment. The evidence is the user's terminal and DBeaver screenshots in this session (transcript: the user messages after "resuelve tu").
- **First up:** `npm run migration:run` → `INSERT INTO prdb.migrations … [1793600000000,"RIRBreedingExclusionCopyV31793600000000"]` · `Migration … has been executed successfully.` · `COMMIT`
- **Down:** `npm run migration:revert` → the template UPDATEs to v2, then `DROP TABLE IF EXISTS replicated_innovation_reminder_exclusion` · `DELETE FROM prdb.migrations …` · `Migration … has been reverted successfully.` · `COMMIT`
- **Second up:** `npm run migration:run` → `… has been executed successfully.` · `COMMIT`
- **Post-state checks** (prdb, read-only, DBeaver):

  | Check | Result |
  |---|---|
  | `replicated_innovation_reminder_exclusion` | filas 114 · distintos 114 · activos 114 · checksum 2,109,948 (equals the sheet; **114, not 228** after the second up → RBX-R-1 idempotency observed) |
  | 4 RIR templates | all 4 show `tiene_v3 = 1` ("Breeding for Tomorrow"), `tiene_link = 1`, `tiene_bilateral = 0`, `last_updated_date` 2026-11-25 19:59:40 |
  | `migrations` | 1 row: id 574, timestamp 1793600000000, `RIRBreedingExclusionCopyV31793600000000` |

- **Down state:** not read through SQL between the runs. The evidence is the down log (v2 UPDATEs, DROP, `DELETE FROM migrations`, COMMIT), plus RBX-T-1 spec (a), which proves `buildRirTemplatesV2()` is byte-equal to the landed bodies.
- **Step 1 result:** PASS (RBX-R-1 seed and idempotency, RBX-R-5 up/down/up).
- **Note:** prdb is PRTest's DB, so the v3 bodies are live there before the new code is deployed. Until the deploy, a PRTest send would render empty `{{previousYear}}` / `{{nextNextYear}}`. Do not send from PRTest until this branch is deployed.

### RBX-T-5: HITL. Step 2a–2c: prdb hand counts (2026-11-25, user-run, read-only, DBeaver screenshots in session)

- **2a, phases:**
  - Reporting 2026 = `version.id` **36** (`app_module_id` 1, `status` 1, active).
  - IPSR 2026 = id **37** (`app_module_id` 2, `status` 1, active).
- **2b, hand-SQL universe** (`@V = 36`, written independently of the repository SQL with `EXISTS` / `NOT IN`):

  | Type | Count |
  |---|---|
  | 2 | 115 |
  | 7 | 11 |
  | 10 | **5** (packages from IPSR 2026) |
  | **Total** | **131** |

  Packages enter the universe (RBX-R-2, real data).
- **2c, listed codes that would have entered without the exclusion** (type 2/7 in version 36): **0**.
  - In prdb the test data holds none of Ruth's codes as replicated Editing rows with an owner SP, so the exclusion cannot be observed on prdb data.
  - The real-data exclusion proof moves to the post-deploy PROD read-only check (pre-check 25-Nov: 113/114 in the PROD universe, 1,918 → 1,805).
  - The predicate itself is covered by the RBX-T-3 spec.
- **Pending:** 2d. `pending_total` from the worktree server must equal 131, and the preview must show 5 "Innovation package" rows.

### RBX-T-5: HITL. Step 2d: app vs hand count (2026-11-25)

**Setup.** Server started from the worktree (`npm run start:dev`, `http://localhost:3400`, DB prdb). Client started from the main checkout (`npm start`, `http://localhost:4200`, `apiBaseUrl` = `http://localhost:3400/`). No server or client was running before.

**User check.** Screenshot of Admin > Reminders: Pending **131** (Reporting 2026), without a reachable recipient **4**. The preview showed 17 messages and 127 results, with packages listed in the MELIA summaries.

**Leader check** (Claude in Chrome, read-only GETs through the page session):
- `GET …/campaigns`: `pending_total` **131**, `unreachable_total` **4**.
- `GET …/campaigns/13/preview`: 131 rows total, 127 in messages + 4 unreachable. All 131 `result_code`s are distinct. Totals: 17 messages, 127 results, 1 CC.
- Rows by message type, result type and version:

  | Message | Type | Version | Rows |
  |---|---|---|---|
  | CENTER | 2 | 36 | 106 |
  | CENTER | 7 | 36 | 4 |
  | DEVELOPER | 7 | 36 | 1 |
  | MELIA_SUMMARY | **10** | **37** | **5** |
  | MELIA_SUMMARY | 2 | 36 | 5 |
  | MELIA_SUMMARY | 7 | 36 | 6 |
  | UNREACHABLE | 2 | 36 | 4 |

- Packages: 5745 (SP01), 7607 (SP03), 8528 (SP06), 8057 (SP07), 5829 (SP09). All are in IPSR 2026 (v37) and all routed to the MELIA summary, as RIR-OQ-7 / RBX-OQ-1 require (W1/W2 → MELIA).
- Cross-check of all 131 rows against the full 114-code list: **0** listed codes present.

**Result.**
- `pending_total` 131 = hand count 131 (RBX-R-6 counts agree).
- Packages are selected from the same-year open IPSR phase and routed to MELIA (RBX-R-2, real data).
- No excluded code leaks (RBX-R-1, consistent with 2c = 0 on prdb).

**Not observable here.** The preview payload carries no `resultTypeName` or `resultUrl`; both are rendered only at dispatch. The package name and the IPSR link stay covered by the RBX-T-4 specs, and the human check is RBX-T-5 step 3 (PRTest send, open a package link, P-6).

**Observation, needs the user's attention.** prdb (PRTest's DB) holds campaign **13: Q4_NOTICE, PENDING, scheduled 2026-11-30 15:08 UTC**. The user's earlier screenshot showed "No reminder scheduled", so the campaign was created after it. The v3 bodies are already live in prdb. If the campaign fires from a server that does not run this branch, the email renders empty `{{previousYear}}` / `{{nextNextYear}}`. It must not fire before this branch is deployed to PRTest, or it should be cancelled or rescheduled.

### Pre-commit finding: migration timestamp shared with IU26 (2026-11-25)

- `origin/performance-refactor` and `origin/qa-development-2026-ss` already carry `1793600000000-AddNewUsersToInnovationUseRows.ts` (commit `f106093d4`, spec `changes/innovation-use-2026-total-and-new-users`).
  - This branch's migration uses the same timestamp: `1793600000000-RIR-BreedingExclusionCopyV3.ts`.
  - The tasks.md pre-flight premise ("`1793600000000` is above the latest on every branch", listed 2026-11-25) went stale the same day.
- **Decision (Leader): keep the timestamp.** TypeORM 0.3 matches executed and pending migrations by `name`:
  - `MigrationExecutor.getPendingMigrations` uses `executedMigration.name === migration.name`;
  - `checkForDuplicateMigrations` rejects duplicate names only.
- Why keeping it is safe:
  - The two names differ: `AddNewUsersToInnovationUseRows1793600000000` and `RIRBreedingExclusionCopyV31793600000000`.
  - The two migrations touch disjoint tables, so their relative order does not matter.
  - `scripts/check-pending-migrations.ts` also compares names.
- Why not rename: renaming would force a revert and re-apply on prdb two days before the release, and the RIR migration is already recorded there (id 574).
- Follow-up for `/akili-archive` kaizen: the pre-flight check should re-list migrations on the integration branches right before the commit, not only at specify time.
