# Tasks — Bilateral Innovation Use: `count_unit` / `use_nature` on actors

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `bilateral` — Innovation Use actor follow-up answers on `POST /api/bilateral/create` |
| Linked spec | `./requirements.md` (BIF-R-1..11, BIF-AC-1..11) + `./design.md` (BIF-DD-1..7, Premise Ledger P-1..14) |
| Ticket | P2-4106 (Enhancement, epic P2-3094) |
| Base branch | `performance-refactor` (bilateral work never goes on `staging`) |
| Owner / driver | Juan David |
| Approval Mode | gated |
| Status | approved (2026-11-11, Juan David — Phase 3 gate "Continue") · execution not-started |
| Budget (design Step 2.4) | 6 code tasks (T-1..T-6) · ~380 LOC · ~8 review rounds. T-7 is a manual HITL check, not counted. **Tripwire:** stop and re-plan if the diff passes ~500 LOC or 11 review rounds |

**Order at a glance:** T-1 (rules) and T-2 (DTO) run in parallel → T-3 (handler) → T-4 (service + read) → T-5 (contract doc). T-6 (QA AI label) is **deferred** — no AI QA owner. T-7 runs on PRMS TEST after the merge.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-11-10).
- [x] `design.md` approved (2026-11-10).
- [x] Blocking open questions resolved: OQ-1 = Farmers only, OQ-2 = ignore + warning, OQ-3 = 400 (Santiago, Slack). BIF-OQ-1 (SO) is non-blocking: it flips one predicate (BIF-DD-4).
- [x] No CLARISA dependency.
- [x] No migration (columns exist — migration `1793300000000`).
- [ ] Branch cut from `performance-refactor`, and `git log` shows P2-4048 there (`farmer-follow-up.constant.ts` exists).
- [ ] No in-flight spec touches `innovation-use.handler.ts` or the `outcomes[].warnings` builder (`grep -rl "innovation-use.handler\|outcomes\[\]" docs/specs --include=*.md` outside `archive/`).

## 3. Task list

Skills for every server task: `nestjs-expert`; `tdd` for T-1, T-3 and T-4; `api-design-principles` for T-2, T-4 and T-5.

### [x] BIF-T-1 — Pure rules function and applicability predicates

- **Type:** server
- **Description:** Add `asksCountUnit(typeId)` and `asksUseNature(typeId)` to `farmer-follow-up.constant.ts`; both are `=== FARMERS_ACTOR_TYPE_ID` today. Create `innovation-use-actor-follow-up.rules.ts`, a pure function that takes `[{ actor, index, actorTypeId }]` and returns `{ actors, warnings }` or throws `BadRequestException`. It implements design §5 steps 1–9 in that order, with the exact messages in §4.4 and the warning shape in §4.2. It does no I/O and no logging.
- **Implements:** BIF-R-2, R-3, R-4, R-6, R-7, R-9, R-11 · BIF-AC-2, AC-3 (rule part), AC-4, AC-6, AC-7, AC-9, AC-10 · BIF-DD-4, DD-7
- **Files (expected):** `src/api/results/result-actors/farmer-follow-up.constant.ts`; `src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.ts` (new); `…rules.spec.ts` (new)
- **Depends on:** —
- **Blocks:** T-3
- **Estimate:** M
- **Review:** full (adds exports to a constants file the centre form also reads)
- **Verification:**
  - **Falsifier:** Each of these inputs gives a different outcome from the one stated:
    - `{type 1, count_unit:'Households'}` must give a 400 with `actors[0].count_unit must be one of: households, individuals; received "Households".`
    - `{type 3, use_nature:'bogus'}` must give a 400 (invalid on any type).
    - `{type 1, households, how_many: null}` must give a 400 on `how_many`.
    - `{type 1, households, how_many:50, women:30, women_youth:40}` must return no throw and only `how_many` kept, with breakdown and `has_*` cleared and `sex_and_age_disaggregation = true`.
    - `{type 3, count_unit:'individuals', use_nature:'innovation_applied'}` must return both dropped plus two `*_not_applicable` warnings.
    - `{type 1}` with no fields must return two `*_missing` warnings.
    - Two type-1 rows with the same pair must give `actor_duplicate_merged` on index 1 only.
    - Two type-1 rows with different `use_nature` must give no duplicate warning.
    - Patching `asksUseNature` to return true for every type in a test must change only the `use_nature` cases (AC-9).
  - **Red run:** `npx jest src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts` (fails: module missing).
  - **Disqualifier:** a rule needs data the function cannot get without I/O, for example the catalogue. In that case, re-specify the signature in design §5 before patching.
  - **Consumers:** `farmer-follow-up.constant.ts` is imported by the centre-form writer, the v2 controller and the QA catalog. Only exports are added and nothing existing changes. Check with `grep -rln "farmer-follow-up.constant" src`.
- **Definition of done:**
  - [ ] Every §5 row has at least one test, and the falsifier list above is covered.
  - [ ] `npx eslint` clean on the touched files; `npx tsc --noEmit -p tsconfig.json` clean.
  - [ ] No secrets or payload bodies in messages (only the rejected code and the index).

### [x] BIF-T-2 — DTO keeps both fields through the whitelist

- **Type:** server
- **Description:** On `InnovationUseActorDto`, add `count_unit` and `use_nature` with `@IsOptional() @IsString()` and `@ApiPropertyOptional({ enum: [...], nullable: true, description })`. Do not use `@IsIn` (BIF-DD-2). Add a test that runs the real `ValidationPipe({ whitelist: true, transform: true })` over a `RootResultsDto` payload with a nested actor and asserts that both fields survive. Follow the pattern of `dto/create-bilateral-result-code.dto.spec.ts`.
- **Implements:** BIF-R-1 · BIF-AC-1 (input part) · P-1
- **Files (expected):** `src/api/bilateral/dto/create-bilateral.dto.ts`; `src/api/bilateral/dto/create-bilateral-actor-follow-up.dto.spec.ts` (new)
- **Depends on:** —
- **Blocks:** T-4 (the E2E path only works once the fields pass the pipe)
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** Two payloads:
    - With `actors[0] = { actor_type_id: 1, how_many: 5, count_unit: 'households', use_nature: 'innovation_applied' }`, the transformed DTO must still carry both keys.
    - With `count_unit: 'Households'`, the pipe must pass it through and not reject it (the rules own the code check).
  - **Red run:** `npx jest src/api/bilateral/dto/create-bilateral-actor-follow-up.dto.spec.ts` (fails before: keys stripped).
  - **Disqualifier:** the controller's pipe options turn out to differ from `whitelist: true` (for example `forbidNonWhitelisted`). If so, re-check P-1 and the AC-2 message path.
  - **Consumers:** `InnovationUseActorDto` is used only by `create-bilateral.dto.ts` (check with `grep -rn "InnovationUseActorDto" src`). Swagger output changes additively.
- **Definition of done:**
  - [ ] Swagger shows both fields with their enums.
  - [ ] Lint and `tsc` clean.

### [ ] BIF-T-3 — Handler: preflight hook and `prepareActors` normalisation

- **Type:** server
- **Description:**
  - Add the optional `collectOutcomeWarnings?(ctx: { bilateralDto }): Promise<BilateralActorWarning[]>` to `bilateral-result-type-handler.interface.ts`, and export the `BilateralActorWarning` type from there or from the rules file.
  - In `InnovationUseBilateralHandler`:
    - `collectOutcomeWarnings` returns `[]` for non-IU payloads or when there are no actors. Otherwise it resolves each actor's type with the existing `resolveActorTypeId` (same 400 messages) and runs the rules, returning their warnings.
    - `prepareActors` stops forcing `null` (it deletes `:159-166`). It resolves types, runs the rules, then `validateYouthWithinGender` on the normalised actor, after step 8. It passes the normalised actors to the writer and drops the warnings (they were already collected).
    - Remove the IFC-R-10 comment.
- **Implements:** BIF-R-1, R-3, R-5, R-6, R-7 · BIF-AC-1, AC-3, AC-5, AC-7 · BIF-DD-1, DD-3
- **Files (expected):** `src/api/bilateral/handlers/innovation-use.handler.ts`; `…/bilateral-result-type-handler.interface.ts`; `…/innovation-use.handler.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-4
- **Estimate:** M
- **Review:** full (shared handler interface; live write path)
- **Verification:**
  - **Falsifier:** With the writer mocked:
    - A Farmers households row `{how_many:50, women:30, women_youth:40}` reaches `saveInnovationUse` with `count_unit:'households'`, a null breakdown and `sex_and_age_disaggregation:true`, and it throws no youth 400.
    - A type-3 row with both codes reaches the writer with both `null`.
    - A Farmers row with both codes reaches it with both codes, not null.
    - `collectOutcomeWarnings` on `actor_type_name:'nope'` throws the existing `Invalid actors[0].actor_type_name` message.
    - Every existing `innovation-use.handler.spec.ts` case still passes unchanged, except the one asserting forced null, which is rewritten to the new rule and has its old assertion quoted in the PR.
  - **Red run:** `npx jest src/api/bilateral/handlers/innovation-use.handler.spec.ts`
  - **Disqualifier:** making the rules run requires changing `resolveAndValidate`'s return shape that resubmission relies on (P-4). Stop and re-check BIF-DD-1.
  - **Consumers:**
    - The interface is implemented by every handler under `handlers/`. The hook is optional, so no other handler changes. Confirm with `grep -rln "implements BilateralResultTypeHandler" src`.
    - `prepareActors` is private and called only through `resolveAndValidate`, which serves `afterCreate` and the resubmission preflight `bilateral.service.ts:5118`.
- **Definition of done:**
  - [ ] All handler cases listed above are covered by tests.
  - [ ] Lint and `tsc` clean.

### [ ] BIF-T-4 — Service: call the hook before any write, merge warnings, read mapper

- **Type:** server
- **Description:**
  - In `bilateral.service.ts`:
    1. Add `BilateralOutcomeWarning = BilateralPartnerWarning | BilateralActorWarning` and type the warning array with it.
    2. Right after the partner warnings (`:388-396`) and before the `updated` branch, call `handler.collectOutcomeWarnings?.({ bilateralDto })` for the result's type handler. Append its output after the partner warnings, and emit one `logger.log` with counts by code (design §9).
    3. Add `count_unit` and `use_nature` (value or `null`) to `mapInnovationUseBilateralActor` (`:2923`), which covers its 3 call sites.
  - Add a writer-interaction proof to the existing `innovation-use.service.farmer-count-nature.spec.ts`: two Farmers rows with different pairs produce two inserts, and the same pair produces one insert plus one update. This is read-only on writer code.
- **Implements:** BIF-R-5, R-6, R-8 (GET part), R-11 · BIF-AC-5, AC-6, AC-8 (GET part), AC-10 · BIF-DD-1, DD-5 · P-3, P-6, P-10, P-11
- **Files (expected):** `src/api/bilateral/bilateral.service.ts`; `src/api/bilateral/bilateral.service.spec.ts`; `src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-count-nature.spec.ts`
- **Depends on:** T-2, T-3
- **Blocks:** T-5, T-7
- **Estimate:** M
- **Review:** lenses (payload contract on `outcomes[].warnings` and the read shape; ordering relative to the fake transaction)
- **Verification:**
  - **Falsifier:**
    - A hook that throws a 400 means `dataSource.transaction` is **never** called.
    - With 1 partner warning and 2 actor warnings, `outcomes[0].warnings` has length 3. Element 0 deep-equals today's partner warning, and elements 1–2 carry `field:'innovation_use.actors'`.
    - The `updated` path also carries actor warnings.
    - A non-IU result calls no hook and its warnings are unchanged (`bilateral.service.spec.ts:2549`, `:6677` pass untouched).
    - The GET mapper on a Farmers households row returns `count_unit:'households'`, `use_nature:…` and `how_many`. On a non-Farmers row it returns both keys as `null`. No existing key is renamed.
    - Writer proof: the same pair gives 1 `save` + 1 `update`.
  - **Red run:** `npx jest src/api/bilateral/bilateral.service.spec.ts -t "actor"` and `npx jest src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-count-nature.spec.ts`
  - **Disqualifier:** the hook cannot be placed before the `updated` branch without restructuring the create loop. In that case, stop and re-plan BIF-DD-1.
  - **Consumers:**
    - `outcomes[].warnings` is read by the Fetcher (P2-4067) and its shape is additive.
    - `mapInnovationUseBilateralActor` has 3 call sites (`:3001`, `:3673`, `:3685`).
    - `BilateralPartnerWarning` is used only in this file (P-11).
- **Definition of done:**
  - [ ] Ordering is proven by a test (hook before `transaction`).
  - [ ] Partner-warning tests pass untouched.
  - [ ] Lint and `tsc` clean. Run scoped jest only (never the full suite).

### [ ] BIF-T-5 — Contract doc and field-alignment note

- **Type:** docs
- **Description:** In `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`:
  - update §3 Innovation Use actors (input and read) with both fields, their codes and their applicability;
  - add an "Ingestion — actor follow-up" subsection with the §5 rules table, the §4.4 400 messages and the warning codes;
  - add a change-log entry (P2-4106).
  - Carry over the field-alignment table from `requirements.md` §10 so the fetcher schema and the PRMS Normalizer Technical Field Documentation can be aligned.
- **Implements:** BIF-R-10 · proposal §9.5 deliverable
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** T-4 (the doc describes what shipped)
- **Blocks:** T-7
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** any message, code or field name in the doc that differs from the strings in `innovation-use-actor-follow-up.rules.ts`. To catch it, grep each code and each message prefix in both files.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** —
  - **Consumers:** external readers (Fetcher, SO bulk uploader) — notify after the merge (§6).
- **Definition of done:**
  - [ ] Change-log entry is present and dated.
  - [ ] Every code and message matches the code verbatim.

### [ ] BIF-T-6 — QA AI payload label (DEFERRED — no owner)

- **Status:** deferred, 2026-11-11 (Juan David). The AI QA owner (Daniela) left and nobody owns that project. The labels are frozen and strictly validated (P-12), and P-13 cannot be confirmed by anyone, so shipping the label blind risks rejected payloads and a forced re-assessment of every Innovation Use result.
- **Effect:** BIF-R-8 / BIF-AC-8 are met through GET `/:id` only. The QA AI payload is not touched by this spec.
- **To re-open:** a separate ticket, once someone owns the AI QA contract. The proposed label stays in design BIF-DD-6.
- **Execute:** skip.

### [ ] BIF-T-7 — Manual E2E on PRMS TEST (HITL)

- **Type:** rollout
- **Description:** After the merge to `performance-refactor` (which deploys automatically to prtest):
  1. Send a direct `POST /api/bilateral/create` with the BIF-AC-1, AC-3, AC-5, AC-6 and AC-10 payloads, bypassing the Fetcher.
  2. Call `GET /api/bilateral/:id` on each and check both fields, plus the `warnings` in the POST response.
  3. Also send one AC-2 payload and confirm the 400 leaves **no** row behind (search by title).
  4. Run `SHOW CREATE FUNCTION validation_innovation_use_P25` on prtest to settle P-14.
- **Implements:** BIF-AC-11 · settles P-14
- **Files (expected):** none (evidence goes in `execution.md`)
- **Depends on:** T-4, T-5 merged and deployed
- **Blocks:** release
- **Estimate:** S
- **Review:** n/a (human check)
- **Verification:**
  - **Falsifier:** a stored Farmers row read back with `count_unit = null` after a POST that sent `households`. That would mean the Fetcher, the pipe or the deploy dropped it; check the deployed commit first (prtest pipeline branch).
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** prtest is not on the merged commit. Confirm the branch before diagnosing anything.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] The result codes used, and what each one showed, are recorded in `execution.md`.
  - [ ] The P-14 result is recorded in the design ledger.

## 4. Dependency graph

```
BIF-T-1 (rules) ──┐
                  ├── BIF-T-3 (handler) ──┐
BIF-T-2 (DTO) ────┼───────────────────────┴── BIF-T-4 (service + read) ──┬── BIF-T-5 (doc) ── BIF-T-7 (E2E, HITL)
                  │                                                       └── BIF-T-6 (QA label, DEFERRED)
```

T-1 and T-2 are parallel-safe, with no shared files. T-6 is deferred and is not part of this execution.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BIF-TEST-1 | unit (pure) | R-2, R-3, R-4, R-6, R-7, R-9, R-11 · AC-2, 3, 4, 6, 7, 9, 10 | `src/api/bilateral/handlers/innovation-use-actor-follow-up.rules.spec.ts` |
| BIF-TEST-2 | unit (real ValidationPipe) | R-1 · AC-1 input | `src/api/bilateral/dto/create-bilateral-actor-follow-up.dto.spec.ts` |
| BIF-TEST-3 | unit (handler) | R-1, R-3, R-5, R-7 · AC-1, 3, 5, 7 | `src/api/bilateral/handlers/innovation-use.handler.spec.ts` |
| BIF-TEST-4 | unit (service) | R-6, R-8, R-11 · AC-6, 8, 10; ordering vs transaction | `src/api/bilateral/bilateral.service.spec.ts` |
| BIF-TEST-5 | unit (writer, read-only proof) | R-5, R-11 · AC-5, 10 | `src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-count-nature.spec.ts` |
| BIF-TEST-7 | manual E2E | AC-11 | PRMS TEST (HITL) |

Type gate: `npx tsc --noEmit -p tsconfig.json` (the entity and specs are built by hand, so jest alone misses compile errors). Run only these paths — never the full backend suite.

## 6. Rollout & verification

- [ ] Commits are `✨ feat(bilateral) [P2-4106]: …` / `📝 docs(bilateral) [P2-4106]: …` with `[SPEC:bilateral/innovation-use-actor-follow-up]`.
- [ ] Merge to `performance-refactor` only on explicit order (it deploys prtest automatically).
- [ ] T-7 E2E is done before release.
- [ ] Notify Daniel Lozano (bulk uploader) and the Fetcher owners with the change-log link and the field-alignment table.
- [ ] Jira P2-4106: a comment documenting what shipped (in English), including the BIF-DD-1 side effect (actor-type 400s now pre-write).

## 7. Cleanup & follow-ups

- [ ] BIF-OQ-1: when SO answers "every type", open a follow-up for `asksUseNature` plus the writer's match key (and a centre-form ticket if wanted).
- [ ] Note on P2-4106: QA AI label deferred (no AI QA owner); follow-up ticket when someone owns it.
- [ ] Note on P2-4106: other types' `afterCreate` validations can still orphan a header (out of scope).
- [ ] Spec status → `shipped` at `/akili-archive`.

## 8. Roll-back plan

1. Revert the P2-4106 commits on `performance-refactor` (no migration).
2. Rows written while the change was live keep valid codes in existing columns, so there is no data fix. After the revert, the bilateral handler forces nulls again only for new writes.
3. Confirm with GET `/:id` that actors no longer carry the two keys (or carry null), and that `outcomes[].warnings` holds only partner warnings.
4. Notify Daniel and the Fetcher owners.

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `docs/prd.md` (AC-1, AC-4, AC-9) · `docs/ux-ui/design.md` (not affected) · `docs/trd/trd.md` (bilateral ingestion) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` · `docs/bilateral-module/integration-contracts.md` (T-6) · archived spec `docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/`.
