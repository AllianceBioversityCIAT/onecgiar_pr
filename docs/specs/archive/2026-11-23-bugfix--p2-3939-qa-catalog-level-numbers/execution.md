# Execution Log — QA catalog level rules on level numbers (P2-3939)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (base `b143445bd`) |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `akili-implementer` (`sonnet`, T2) / `akili-reviewer` (`opus`, T3) — author ≠ auditor holds |
| Started | 2026-11-23 |

### Pre-run notes

- `akili doctor --agents` (akili-specs v2.44.0): `leader.md` § `primary-instructions` OUTDATED (matched 2.36.0); `tester.md` § `context-alignment` CUSTOM-EDITED; implementer/reviewer CURRENT. Not fixed here (shared-file write discipline, `.agents/`) — pending item: run `akili doctor --agents --fix` on `staging`.
- Pre-flight P-5 (`SELECT id, level` on test + prod) not yet supplied by the user — Low, fixture realism only; LVL-T-1 proceeded with synthetic fixtures. Pending.
- Commits: root `AGENTS.md` §6 "Do not commit unless the user explicitly asks" overrides the command's Step 3 commit; no commit made by the Leader.

## 2. Task Execution History

### LVL-T-1 — Level-number lookups + Innovation Use rule (regression first)

- **Final status:** PASS (attempt 1)
- **Date:** 2026-11-23
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `tdd` (task defaults, no deviation). **Effort:** `high` (payload contract; above the T2 `medium` default — correctness-critical class, `max` barred on T2).

#### Attempt 1

- **Files changed** (`onecgiar-pr-server/src/api/qa-catalog/`): `values/lookup-sources.ts` (+9), `definitions/sections/innovation-use.ts` (+28/−7), `definitions/closed-control-lists.ts` (1/1), `qa-catalog.display-rules.spec.ts` (1/1), `qa-catalog.required-follows-form.spec.ts` (1/1), `values/lookup-sources.spec.ts` (2/2), new `qa-catalog.level-numbers.spec.ts` (168 lines).
- **Red run (before any definition changed):** `npx jest src/api/qa-catalog/qa-catalog.level-numbers.spec.ts` → assertion `expect(holds(rule.required_when, own)).toBe(expected)` (spec line 95) failed on:
  - level 4 / row id 5: `Expected: false  Received: true`
  - level 9 / row id 10: `Expected: true  Received: false`
  - level 7 / row id 3: `Expected: true  Received: false`
  (4 LVL-R-1 tests also red on the then-missing key — not counted as the red.)
- **Green:** level-numbers spec 10/10.
- **Mutations (post-change code, each reverted, `cmp`-confirmed):**
  1. Explanation condition re-pointed at `innovation_use.use_level.innovation_use_level` (row id) → the same 3 rule reds; 3 failed / 7 passed.
  2. Lookup `value_column: 'id'` → 6 failed / 4 passed (3 rule reds, field-contract `value_column` expected `level`, resolver levels `[4,9,2,null]` came back as ids, batched SELECT `Expected: ArrayContaining ["id","level"] Received: ["id"]`).
- **tsc:** `npx tsc --noEmit -p tsconfig.json` exit 0; falsifier `type: 'numbr'` → TS2322 (`Type '"numbr"' is not assignable to type '"number" | "boolean" | … | "list"'. Did you mean '"number"'?`), reverted.
- **eslint:** `npx eslint "src/api/qa-catalog/**/*.ts" --quiet` exit 0.
- **Full qa-catalog (Implementer):** `Test Suites: 3 failed, 49 passed, 52 total · Tests: 3 failed, 1227 passed, 1230 total` — 2 baseline reds (`qa-catalog.snapshot.spec.ts`: CRLF + legitimate drift from the new key, owned by LVL-T-3; `qa-catalog.module.spec.ts`: JwtService TypeError) + `qa-catalog.controller.spec.ts` "valid year -> 200 with the contract body" `Exceeded timeout of 5000 ms` under 7 cold workers; passes alone (59/59) and in the Leader re-run → classified flaky/load, not a regression.
- **Evidence re-run (Leader-inline, non-author): VERIFIED** — `npx jest` on `qa-catalog.level-numbers`, `qa-catalog.display-rules`, `qa-catalog.required-follows-form`, `values/lookup-sources`, `qa-catalog.controller`, `qa-catalog.shape` → `Test Suites: 6 passed, 6 total · Tests: 270 passed, 270 total`; `tsc --noEmit` clean; eslint clean.
- **Reviewer verdict:** PASS — "LVL-T-1 passes. It does what DD-1, DD-2, DD-3 and DD-8 ask, covers every obligation of LVL-R-1 that falls in this task, covers LVL-R-2 in full, and keeps LVL-NFR-1 and LVL-NFR-3." Falsifier requirement met (condition read from `CATALOG_FIELDS`; values via real `resolveLookups` over `fixtureRunner`); test binding shape matches `read-plan.ts:333` / `lookup.resolver.ts:93`.
- **runtime events:** none.

- **spawns:** implementer 140 calls, ~238k tokens, ended complete (reported "waiting on its own background work" after hand-back); reviewer not reported by host, ended complete.
- **ADVISORY (4R, advisory only):**
  - READABILITY: `qa-catalog.level-numbers.spec.ts` declares module-level `const test = (leaf, values) => …`, shadowing Jest's global `test`; rename (e.g. `testLeaf`).
  - READABILITY: new field relies on equal `order: 26` + key tie-break to sit after the level field; breaks if a key is renamed.
  - RISK: rule only as true as `clarisa_innovation_use_levels.level` (requirements §7 accepted risk) — mention in T-3 contract text.
- **Requirements covered:** LVL-R-1 (Innovation Use field: resolved from row, repeated row id 13 → 2, value/list unchanged, unset level), LVL-R-2 (level 4 / id 5 not required; level 9 / id 10 required), LVL-NFR-1, LVL-NFR-3, LVL-NFR-2 (no migration).
- **Decisions made:** new field `order: 26` (equal to the level field; tie-break by key) to avoid renumbering existing fields (LVL-NFR-1). `lookup-sources.spec.ts` "distinct sources used" pin 7 → 8; LVL-T-2 must raise it to 9 (readiness source registered, unused until T-2). No execute-time spec edits.
- **Issues encountered:** controller spec timeout under load (above). One D28 reference remains at `ipsr-step-3.ts:30` — LVL-T-2 scope (header gap note rewrite).
- **Forward pointers → LVL-T-2:** bump `lookup-sources.spec.ts` pin 8 → 9; remove/rewrite the D28 reference at `ipsr-step-3.ts:30`.
- **Forward pointers → LVL-T-3:** snapshot will show the new entry at order 26; contract text should carry the "only as true as the `level` column" risk.
- **Running totals vs budget (design §10):** tasks 1/3 · LOC ≈ 210 / ~260 (tripwire > 400) · review rounds 1/4 — within budget; LOC is front-loaded by the 168-line regression spec, watch at T-2.
- **Final verification:** VERIFIED + Reviewer PASS.
- **Gate:** gated mode — awaiting user at continue gate.

### LVL-T-2 — IPSR Step 3 level rules

- **Status:** `[~]` blocked at the first step (P-7), awaiting user — 2026-11-23
- **Skills:** `nestjs-expert`, `tdd`. **Effort:** `high`.

#### Attempt 1 (no code written — not a FAIL, no attempt consumed)

- **Result:** Implementer reported blocker "P-7 unsettled on the test DB" before any code change; tree unchanged for this task (`git status` on `src/api/qa-catalog` shows only LVL-T-1 files).
- **Probe (deferral assumption tested):** no `.env*` in repo root or `onecgiar-pr-server` (depth 3); no `DB_*` / `MYSQL*` env vars in the shell; no `mysql` CLI, no `docker` on PATH → DB unreachable from this session. Credentials not guessed or printed.
- **Secondary source found:** `onecgiar-pr-server/src/migrations/1769532691577-CreatIPSRGreen.ts:312-420` creates `validation_ipsr_step_three_P25` (only migration naming it). Body saved to session scratchpad `vs3.sql` (no credentials). Level conditions (verbatim excerpt from the migration):
  - `(SELECT cirl.level FROM clarisa_innovation_readiness_level cirl WHERE cirl.id = rbip.readiness_level_evidence_based) != 0 AND (rbip.readinees_evidence_link IS NULL OR rbip.readinees_evidence_link = '')`
  - `(SELECT ciul.level FROM clarisa_innovation_use_levels ciul WHERE ciul.id = rbip.use_level_evidence_based) != 0 AND (rbip.use_evidence_link IS NULL OR rbip.use_evidence_link = '')`
  - current-use rows gated on the same `ciul.level != 0` for `rbip.use_level_evidence_based`.
- **Implementer observations:** the migration's function reads only the core record (`rbip`); in the part read it does **not** read the complementary innovations' own readiness/use levels. `NULL != 0` → NULL → an unresolved level passes the gate (consistent with DD-6 residual gap).
- **Leader note:** this is a creation script, not a read of the deployed function; the deployed body may differ. The complementary observation is in tension with requirements LVL-R-6 ("complementary elements: the function requires evidence") and with DD-4's `required_confirmed: true` for the two complementary lists — escalated to the user as a P-7 decision, not adjudicated by the Leader.
- **spawns:** implementer 9 calls, ~89k tokens, ended partial (blocker).
- **runtime events:** none.
- **Leader correction (same day):** the "complementary not read" observation came from the migration, which is an older ~108-line body than the deployed function the catalog code was written from (`ipsr-step-3.ts` header cites VS3:231-264 for complementary elements, read 2026-10-09 from `tmp/validation_ipsr_step_three_P25`, no longer in the repo). Also, the complementary evidence lists are relation subfields with no `required_confirmed` property (only the two core lists carry `required_confirmed: true` via `base`). A first user answer accepting an amendment was given on that wrong premise; the Leader withdrew it before editing any spec document.
- **P-7 decision (user, 2026-11-23):** "As approved". P-7 is settled as: core lists — VS3 gates on `level != 0` (migration `1769532691577-CreatIPSRGreen.ts`, verbatim above); complementary lists — `level != 0` or NULL per the code header's 2026-10-09 reading of the deployed function (`UNVERIFIED — confirm at source before relying on it`; the deployed body was not re-read). DD-4 / DD-5 implemented unchanged; no spec edit.

#### Attempt 1 — continued after the P-7 decision (resume-by-message, same worker; no attempt consumed)

- **Final status:** PASS (attempt 1) — 2026-11-23
- **Files changed** (`onecgiar-pr-server/src/api/qa-catalog/`): `definitions/sections/ipsr-step-3.ts` (+95/−16), `qa-catalog.ipsr-step-3.spec.ts` (+120/−22), `qa-catalog.level-numbers.spec.ts` (168 → 470 lines, S3 block appended; T-1 block prettier only, no semantic change — Reviewer-checked), `values/lookup-sources.spec.ts` (distinct-sources pin 8 → 9).
- **Red run (before definitions changed):** `npx jest src/api/qa-catalog/qa-catalog.level-numbers.spec.ts -t "IPSR"`. A first setup red ("lookup resolver: field ipsr_step_3.core.readiness_level_number is not in the catalog") was discarded and the helper fixed. Behavioral reds:
  - `complementary subfield use_evidences › level 2 stored as repeated row id 13`: Expected true, Received false
  - `core list ipsr_step_3.core.use_evidences › level 2 stored as repeated row id 13`: Expected true, Received false
  - `ipsr_step_3.core.current_use.actors › use level 2 stored as repeated row id 13`: Expected true, Received false
- **Green:** level-numbers + lookup-sources 60/60; ipsr-step-3 32/32.
- **Mutations (definitions restored byte-identical, scratchpad `mutate.js`):** a1 core readiness gate → row-id field: 3 failed · a2 core use: 4 failed · a3 complementary readiness: 3 failed · a4 complementary use: 5 failed · a5/a6/a7 current_use actors / organizations / measures → `core.use_level`: 3 failed each · (b) `visible_when` on `core.readiness_evidences`: 1 failed (**structural-only coverage** — no behavioural test exercises it; "stays visible" is a declared property) · (c) current use keyed on `core.current_use_level`: 15 failed.
- **Full qa-catalog (Implementer):** `Test Suites: 2 failed, 50 passed, 52 total · Tests: 2 failed, 1278 passed, 1280 total` — baseline reds only (snapshot: CRLF + legitimate drift, owned by LVL-T-3; module: JwtService). tsc clean, eslint clean.
- **Evidence re-run (Leader-inline, non-author): VERIFIED** — 7 suites (level-numbers, ipsr-step-3, lookup-sources, lookup.resolver, shape, display-rules, required-follows-form) → `Test Suites: 7 passed · Tests: 297 passed`; `tsc --noEmit` clean; eslint clean.
- **Reviewer verdict:** PASS — "LVL-T-2 does what LVL-R-1 (S3), R-3, R-4 and R-6 and DD-1/4/5/6 ask, and it applies the user's P-7 decision as recorded." Guard replacement matches design §7 Step 2.3 (exact gate, no `visible_when`, gate target `lookup` with `value_column: 'level'`).
- **ADVISORY (4R, advisory only — recorded, not work):**
  - RELIABILITY: mutation (b) is caught only structurally; Reviewer expected 2 failing tests (level-numbers structural + `assertIpsrStep3` on the real catalog) vs the 1 reported — unconfirmed whether `assertIpsrStep3` was in that `-t IPSR` run.
  - RELIABILITY: `resolvedS3` builds deferred bindings by hand rather than from `read-plan`; production wiring of relation-list lookup subfields rests on P-3 / `lookup.resolver.spec`.
  - READABILITY: "row rules unchanged" asserted for measures subfields only, not actors/organizations.
  - RISK: ship T-2 with T-3 (version bump + change-log) so the QA app gets the signal.
- **runtime events:** none (the P-7 stop was a blocker → user decision, resumed by message).
- **spawns:** implementer (P-7 stop) 9 calls, ~89k tokens, ended partial · implementer (resumed) 47 calls total, ~220k tokens, ended complete · reviewer not reported by host, ended complete.
- **Requirements covered:** LVL-R-1 (S3 fields), LVL-R-3, LVL-R-4, LVL-R-6 (code note), LVL-NFR-1, LVL-NFR-2.
- **Decisions made:** P-7 as recorded above; new S3 number entries take `order` equal to their level field (tie-break by key), as T-1. No execute-time spec edits.
- **Forward pointers → LVL-T-3:** snapshot will carry 5 new keys; contract text must state the complementary NULL gap and that VS3 complementary rules are cited from the 2026-10-09 read; ship T-2+T-3 in the same PR.
- **Running totals vs budget (design §10):** tasks 2/3 · LOC ≈ 770 changed (T-1 ≈ 210, T-2 ≈ 560) vs ~260 expected, **tripwire > 400 exceeded** · review rounds 2/4. **Budget tripwire fired → stop and escalate to the user before LVL-T-3** (never auto-approved). Cause: enumeration-wide behavioural + structural tests (7 gates × fixtures, mutation-proof structure) — tests ≈ 75% of the LOC; definitions ≈ 130 lines.
- **Final verification:** VERIFIED + Reviewer PASS.
- **Budget tripwire decision (user, 2026-11-23):** "accept the overrun, continue with LVL-T-3". Logged as a user decision, not auto-approved.

### LVL-T-3 — Version bump, contract and snapshot

- **Final status:** PASS (attempt 1) — 2026-11-23
- **Skills:** `nestjs-expert` (task default). **Effort:** `medium`.
- **Revision check:** `git fetch` + `git show <ref>:onecgiar-pr-server/src/api/qa-catalog/definitions/versions.ts | grep revision` on `origin/staging`, `origin/master`, `origin/performance-refactor`, `origin/qa-development-2026-ss` → all `revision: 35`; took 36.
- **Files changed** (`onecgiar-pr-server/`): `src/api/qa-catalog/definitions/versions.ts` (35 → 36), `src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` (+7/−2: revision, content_hash, +5 keys, none removed), `src/api/qa-catalog/qa-catalog.controller.spec.ts:134`, `src/api/qa-catalog/qa-catalog.service.spec.ts:173` and `src/api/qa-catalog/qa-catalog.shape.spec.ts:1029` (both hard-pinned 2026.35 / 35 — consumers missed by the spec's P-12 grep), `docs/qa-catalog.en.md` (+13/−12).
- **LF route:** temp `git worktree` at HEAD (`core.autocrlf=false`) in the session scratchpad, `node_modules` junctioned, uncommitted qa-catalog changes copied as LF; snapshot regenerated there (`written (450 keys)`), copied back byte-identical; worktree removed (`git worktree list` → main tree only, Leader-checked).
- **Red (LF, before the bump):** `year 2026: content changed without a revision bump (revision 35)`; "committed snapshot is current": content_hash expected `8325…a90` vs committed `b2258…f78`, 5 keys missing.
- **Green:** LF — snapshot / controller / service / shape: 4 suites, 183 tests. Full qa-catalog on LF 50/52 (module baseline + a self-inflicted CRLF snapshot from `git stash pop` in the worktree, fixed, then green). Main copy full qa-catalog: `51/52 suites, 1280/1280 tests` — only `qa-catalog.module.spec.ts` (baseline JwtService). The snapshot suite also passes on the main copy now (rewritten files are LF in the working copy; git normalizes on commit). tsc clean, eslint clean.
- **Doc sweep:** `D28` 0 hits; "no condition stated" 0; `2026.35` only historical (v1.35 row, `actor_use_nature` v1.35 qualifier); "not expressible" only the intentional evidence-cap / any-of note at `qa-catalog.en.md:242`, historical v1.22, and the v1.36 row; "row id" / "level gate" only the new text and T-1/T-2 comments. Each read by the Implementer, re-run by the Reviewer.
- **Evidence re-run (Leader-inline, non-author): VERIFIED** — snapshot, controller, service, shape → `Test Suites: 4 passed · Tests: 183 passed`; tsc clean; eslint clean.
- **Reviewer verdict:** PASS — "LVL-T-3 does what the task asks." The contract states the DD-3..DD-7 rules accurately; LVL-R-5 (version, v1.36 row, gap/D28 removal, no rename/removal) and LVL-R-6 (NULL gap with every named element) met; P-7 provenance and the `level`-column risk stated honestly.
- **ADVISORY (4R, advisory only):**
  - READABILITY: the rewritten S3 note at `qa-catalog.en.md:242` is one long paragraph; sub-bullets would scan better.
  - RISK: mixed notation `in [1, ..., 9]` / `in [1..9]`; one notation matching the JSON would avoid misreadings.
  - RISK (DD-7): re-check the free revision at merge time (delivery checklist).
- **runtime events:** none.
- **spawns:** implementer 37 calls, ~138k tokens, ended complete · reviewer not reported by host, ended complete.
- **Requirements covered:** LVL-R-5, LVL-R-6 (contract text), LVL-NFR-1 (additive only), LVL-NFR-2.
- **Decisions made:** two extra version pins updated (service, shape specs) — mechanical, same obligation as the named controller pin. Commit DoD item not executed: root `AGENTS.md` §6 (commit only on user request).
- **Running totals vs budget (design §10):** tasks 3/3 · LOC ≈ 800 changed (+ snapshot regenerate) vs ~260 expected (tripwire fired at T-2, overrun accepted by the user) · review rounds 3/4.
- **Final verification:** VERIFIED + Reviewer PASS.

## 3. Summary

All three tasks PASS on the first attempt, each with a non-author evidence re-run (VERIFIED) and an independent Reviewer (`opus`) over a `sonnet` Implementer.

- **Fix:** the QA catalog now states level rules on the level number (0–9) through five read-only `lookup` entries (`value_column: 'level'`) instead of the stored row id. Innovation Use explanation: visible/required at levels 5–9 (was row ids 5–9). IPSR Step 3: four evidence lists required at level 1–9; core current-use lists visible at core use level 1–9. Catalog `2026.36`, contract v1.36.
- **User decisions:** P-7 settled "as approved" (core from migration; complementary from the 2026-10-09 code read, UNVERIFIED); budget overrun accepted (~800 vs ~260 LOC; ~75% tests).
- **Open / pending:**
  - P-5 pre-flight (`SELECT id, level` on test + prod) — not supplied; fixtures synthetic.
  - Deployed `validation_ipsr_step_three_P25` body not re-read (complementary rule provenance).
  - Not committed (user to request). PR to `staging`: re-check free revision at merge (DD-7); ship T-1..T-3 together.
  - Rollout (tasks.md §6): notify QA app owner of 2026.36; follow-up ticket for `innovation-use.service.ts` `Level_6` vs row id.
  - Persona drift: `akili doctor --agents --fix` on `staging` (`leader.md` primary-instructions outdated).
  - Advisories recorded per task (none minted as work).
