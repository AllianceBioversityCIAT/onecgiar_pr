# Tasks — QA AI traffic light on "Submit for review" (W3/Bilateral)

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `qa-ai-traffic-light` (`BIL-QAI`)
- **Linked spec:** `./requirements.md` (approved 2026-09-16) + `./design.md` (approved 2026-09-16) + `./proposal.md`
- **Ticket:** [P2-3698](https://cgiarmel.atlassian.net/browse/P2-3698) (sub-task of P2-3150) — commit scope `[P2-3698]`
- **Owner / driver:** Juan David Delgado
- **Approval Mode:** gated
- **Status:** in-progress, **amended to contract v0.2** (pivot at execution gate 2, 2026-09-16; `execution.md` § *Pivot Record: contract v0.2*). `T-1`, `T-2`, `T-3`, `T-4`, `T-5` are PASSed and committed; `T-1b`, `T-4b`, `T-5b` rework three of them in place. Amendment approved by the owner at execution gate 3 (2026-09-16); execution resumed with `T-1b ∥ T-2b ∥ T-12`.
- **Budget (from `design.md`, re-baselined at the v0.2 pivot, approved by the owner at gate 3 (2026-09-16)):** **16 tasks · ~1 900 production LOC + ~1 600 test LOC · 5 review rounds; tripwire > 19 tasks / > 2 600 LOC / > 7 review rounds — re-baselined at the v0.2 pivot, approved at gate 3.** The original 11-task budget was tripped by the pivot (its tripwire was > 14 tasks); three of the five rework rounds are already consumed (`T-1`, `T-5`, `T-4`).
- **Target branch:** `performance-refactor` (memory rule: bilateral work never bases on `staging`). Work on a feature branch; no merge without the owner.

## 2. Pre-flight checklist

- [x] `requirements.md` approved · `design.md` approved (v0.1 base).
- [ ] **v0.2 amendment approved by the owner** (`requirements.md` `R-2`/`R-3`/`R-4`/`R-7`/`R-8`/`R-15`, `design.md` §3–§6 + `DD-11`/`DD-12`, this list). Blocks every `*b` task, `T-12`, and the resumption of `T-6`.
- [x] `BIL-QAI-OQ-1` resolved (contract copy → `docs/bilateral-module/integration-contracts.md`). `OQ-4`/`OQ-5` carried as contract defaults (AI returns overall; no `result_code`). `OQ-3` accepted risk. `OQ-2` is a human gate inside `BIL-QAI-T-11`, required **before `BIL-QAI-T-8`** starts.
- [x] No conflicting in-flight spec touching `bilateral-center.service.ts` / `submitForReview` (search `docs/specs/`; `notifications/bilateral-review-decision` is shipped and only gets a note).
- [x] `npm run migration:check` green — T-2 migration `BilateralQualityAssessments1789566953005` applied by the owner on the dev DB (2026-09-16).
- [x] Skills available to the Implementer: `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `tdd`, `angular-developer`, `ui-ux-pro-max`.

## 3. Task list

### [x] `BIL-QAI-T-1` — Freeze contract v0.1 and document it in the repo

- **Type:** `docs`
- **Description:** Copy the AI-service contract v0.1 from the vault note into `docs/bilateral-module/integration-contracts.md` (new section *Quality assessment (outbound)*): request/response shapes, section keys, evidence `source`/`visibility` rules, optional `score`, `contract_version`, error/timeout semantics, the definitions-only rule. Add `BILATERAL_AI_QUALITY_URL`, `BILATERAL_AI_QUALITY_TIMEOUT_MS` (default 60000) and the reuse of `MICROSERVICE_API_KEY` to the server `README.md` → Environment. Hand the section to Daniela (Slack, short — memory rule for PO-style messages applies to length, not audience).
- **Implements:** `BIL-QAI-R-2` (shape, five keys), `BIL-QAI-R-3` (evidence fields), `BIL-QAI-R-12` (optional score), NFR *Latency window* (env keys)
- **Files (expected):** `docs/bilateral-module/integration-contracts.md`, `onecgiar-pr-server/README.md`
- **Depends on:** — · **Blocks:** `BIL-QAI-T-4`, `BIL-QAI-T-5`
- **Estimate:** S
- **Skills:** `api-design-principles`, `cognitive-doc-design`
- **Verification:** `grep -n "quality-assessment\|contract_version\|visibility" docs/bilateral-module/integration-contracts.md` shows the section; `grep -n "BILATERAL_AI_QUALITY" onecgiar-pr-server/README.md` shows both keys.
  - *Disqualifier:* a grep hit inside a code fence that is not the outbound section (e.g. a stray mention) is not evidence; the section heading must be present.
  - *Falsifying input:* a section documenting `result_id` or any `*_id` field in the request → FAIL (violates the definitions-only rule).
  - *Presence note:* this proves the document exists, not that Daniela's endpoint matches it; the match is proven by `BIL-QAI-T-5`'s contract fixture and, later, a real call in TEST.
- **Definition of done:** section present with a change-log line dated; README keys listed; handoff message sent and noted in the vault note.
- **Superseded by v0.2 → see `BIL-QAI-T-1b`.** The text above records what was executed; the contract copy it produced is rewritten, not extended.

### [~] `BIL-QAI-T-1b` — Contract v0.2 copy and the per-type label enumeration for Daniela

- **Type:** `docs`
- **Description:** Rewrite `docs/bilateral-module/integration-contracts.md` § *Quality assessment (outbound)* to **contract v0.2** per `design.md` §4.5: `contract_version: "0.2"`; per-type `type_specific.fields` table with the frozen English labels and typed values (count and USD objects, single `Length of training`, `Innovation developers` never substituted, `fields: {}` for Other output / Other outcome, Knowledge product unchanged and never sent); the `impact_areas` block as a **sibling of `sections`** with the `{name, score, subcomponents[]}` shape and the explicit *absent or empty ⇒ not applicable, not grey, no penalty* clause; the closed evidence-tag vocabulary **Gender · Youth · Nutrition · Environment & biodiversity · Poverty** replacing the wrong v0.1 example `["Gender","Climate"]`, with the note that the Climate pillar has no evidence tag (GAP-6); response `status` + `degraded_reason` as required fields; section-level `grey` with the same meaning as evidence grey and excluded from the overall; the PRMS status-mapping table (§4.5) including `unavailable_reason = ai_unavailable`; the note that Innovation use carries no non-binary/unknown counts (GAP-7) and that a non-disaggregated row feeds `total` only. Drop the "five keys, **in this order**" ordering guarantee (the frozen contract never made it; flagged as an advisory at `T-1`). Add one dated change-log line. Then draft the per-type label enumeration message for Daniela — short, the table plus the four semantics notes — for the **owner to send**. `onecgiar-pr-server/README.md` is **unchanged** (no env key moves in v0.2).
- **Implements:** `BIL-QAI-R-2` (typed per-type schema, frozen labels, `impact_areas` + no-penalty clause), `BIL-QAI-R-3` (tag vocabulary), `BIL-QAI-R-4` (section grey), `BIL-QAI-R-7`/`R-8` (`status`, `degraded_reason`), `BIL-QAI-GAP-5` (bump procedure exercised)
- **Files (expected):** `docs/bilateral-module/integration-contracts.md`; draft message in `execution.md` (owner sends)
- **Depends on:** v0.2 amendment (approved gate 3) · **Blocks:** `BIL-QAI-T-4b`, `BIL-QAI-T-5b`
- **Estimate:** S
- **Skills:** `api-design-principles`, `cognitive-doc-design`
- **Verification:** `grep -n 'contract_version.*0\.2\|impact_areas\|degraded_reason\|Environment & biodiversity' docs/bilateral-module/integration-contracts.md` shows all four; `grep -n '"Climate"\|in this order\|"0\.1"' docs/bilateral-module/integration-contracts.md` returns **no hit inside the outbound section**; the per-type table lists all six result types.
  - *Disqualifier:* a section that documents v0.2 while leaving the v0.1 request example in place is not evidence — both the prose and the JSON example must be v0.2, because the example is what the AI team reads first.
  - *Falsifying input:* a request example whose `impact_areas` sits inside `sections`, or a `type_specific.fields` entry with a number as a string (`"12 women"`), → FAIL: those are the two shapes v0.2 exists to forbid.
  - *Presence note:* this proves the document says v0.2, not that Daniela's endpoint implements it; the match is proven by `T-5b`'s contract fixture and a real call in TEST.
- **Definition of done:** section is v0.2 end to end; change-log line dated; message drafted for the owner and recorded in `execution.md`; no `README.md` diff.

### [x] `BIL-QAI-T-2` — Entity, repository and pruned migration for `bilateral_quality_assessments`

- **Type:** `db`
- **Description:** Create `BilateralQualityAssessment` entity (columns per `design.md` §3.1, `created_at` default `CURRENT_TIMESTAMP` set by SQL), a thin repository, register both in `bilateral.module.ts`. Generate the migration with `npm run migration:generate --name=BilateralQualityAssessments` and **prune it to this one table** (reversible `down`).
- **Implements:** `BIL-QAI-R-8` (persistence fields), NFR *Backwards compatibility* (additive)
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/entities/bilateral-quality-assessment.entity.ts`, `.../repositories/bilateral-quality-assessment.repository.ts`, `.../bilateral.module.ts`, `onecgiar-pr-server/src/migrations/<ts>-BilateralQualityAssessments.ts`
- **Depends on:** — · **Blocks:** `BIL-QAI-T-6`, `BIL-QAI-T-7`
- **Estimate:** S
- **Skills:** `nestjs-expert`
- **Verification:** `cd onecgiar-pr-server && npm run migration:check` green; `npx tsc --noEmit` clean (memory rule: entity changes need tsc, focused jest does not see hand-built entity specs); `grep -c "createTable\|CREATE TABLE" src/migrations/<ts>-BilateralQualityAssessments.ts` = 1.
  - *Disqualifier:* a migration touching any other table (the generator has emitted 27 tables for one column) — count of altered tables must be exactly 1 or the file is not evidence of a clean migration.
  - *Falsifying input:* an entity column typed `datetime` with a JS `Date` default → `created_at` would be born in local time (vault rule); the review greps `new Date()` in the entity and fails on a hit.
- **Definition of done:** migration present, pruned, reversible; `migration:check` green; `bilateral.module.ts` registers entity + repository; commit `✨ feat(bilateral) [P2-3698]: …`.

### [x] `BIL-QAI-T-2b` — Additive migration `AddAiStatusToBilateralQualityAssessments`

- **Type:** `db`
- **Description:** Add two nullable columns to `BilateralQualityAssessment` per `design.md` §3.1 — `ai_status varchar(16) NULL` (the AI's own `completed` | `partial`) and `degraded_reason varchar(255) NULL` — and extend the `unavailable_reason` value set **in application code only** with `ai_unavailable` (the column is already `varchar(32)`, so no DDL). Generate the migration with `npm run migration:generate --name=AddAiStatusToBilateralQualityAssessments` and **prune it to these two columns on this one table** (reversible `down` drops both). `T-2`'s migration is **not** edited: it is already generated and queued for the owner's `migration:run`, and rewriting a migration that may have run in a dev DB is how environments diverge (`design.md` §3.2).
- **Implements:** `BIL-QAI-R-7` scenarios *The AI answers `partial`* / *The AI answers `unavailable`* (storage half) · `BIL-QAI-R-8` (persist `ai_status`, `degraded_reason`) and scenario *A degraded run is legible to the reviewer* clause "default both fields to `null` for every pre-v0.2 row and for KP rows"
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/entities/bilateral-quality-assessment.entity.ts`, `onecgiar-pr-server/src/migrations/<ts>-AddAiStatusToBilateralQualityAssessments.ts`, the `unavailable_reason` union type wherever it is declared
- **Depends on:** `BIL-QAI-T-2` (migration applied on dev, 2026-09-16), v0.2 amendment (approved gate 3) · **Blocks:** `BIL-QAI-T-6`, `BIL-QAI-T-7`
- **Estimate:** S
- **Skills:** `nestjs-expert`
- **Verification:** `cd onecgiar-pr-server && npm run migration:check` green; `npx tsc --noEmit` clean (memory rule: entity changes need `tsc`; focused jest does not see hand-built entity specs); the migration's `up` contains exactly two `ADD COLUMN` statements and zero statements naming any other table.
  - *Disqualifier:* a migration that also re-emits `bilateral_quality_assessments` as a `CREATE TABLE`, or touches any other table, is not evidence of a pruned file — the generator has emitted 27 tables for one column before.
  - *Falsifying input:* a `down` that drops the whole table instead of the two columns → FAIL; running it would destroy the audit rows `T-2` exists to keep.
- **Definition of done:** two columns nullable with no default; `down` drops only them; `migration:check` green; `tsc --noEmit` clean; **owner runs `migration:run`** (memory rule: the owner runs migrations).

### [x] `BIL-QAI-T-3` — Pure rules: grey, KP decision tree, content hash, outstanding flags (TDD)

- **Type:** `server`
- **Description:** `bilateral-quality-rules.ts` exporting four pure functions per `design.md` §5: `applyGreyRule(response, payload)`, `evaluateKpRule(input)`, `contentHash(payload)`, `hasOutstandingFlags(row)`. Table-driven tests written **first**.
- **Implements:** `BIL-QAI-R-3` scenario *Private repository file* clause "graded grey regardless of what the AI answers" · `BIL-QAI-R-4` scenario *Grey never colours a section* (both clauses) · `BIL-QAI-R-6` hash determinism (basis of scenarios *Edit then resubmit*, *Closed tab, unchanged content*) · `BIL-QAI-R-9` scenarios *Not MELIA, not JA*, *Journal Article with matching metadata*, *Fallthrough* incl. "names the mismatching or missing fields" · `BIL-QAI-R-8` "whether amber/red flags were outstanding" · `BIL-QAI-AC-10`, `AC-11` (rule half)
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts` + `.spec.ts`
- **Depends on:** — · **Blocks:** `BIL-QAI-T-4`, `BIL-QAI-T-6`, `BIL-QAI-T-7`
- **Estimate:** M
- **Skills:** `tdd`, `nestjs-expert`
- **Verification:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral-quality-rules"` green with the matrix: KP {MELIA ∈ {T,F}} × {type ∈ {JA, other}} × {rows ∈ {both agree, mismatch each of 4 fields, WoS missing, CGSpace missing}}; grey: private item with AI `green` ⇒ `grey`; hash: same payload with keys in different order ⇒ same hash; different `request_id` ⇒ same hash; one label changed ⇒ different hash.
  - *Disqualifier:* a matrix test that builds expectations by calling the function under test (tautology) is not evidence; expected verdicts are literal.
  - *Falsifying input:* JA with `is_isi` true on CGSpace and `null` on WoS must yield `grey` naming `is_isi`; if the rule returns `green`, FAIL. A section verdict that changes after `applyGreyRule` → FAIL.
- **Definition of done:** 100 % branch coverage on the rules file; no imports from Nest/TypeORM (pure); lint clean.

### [x] `BIL-QAI-T-4` — Definitions-only payload builder with per-type fixtures

- **Type:** `server`
- **Description:** `bilateral-quality-payload.builder.ts`: five section mappers projecting the enriched detail (`BilateralService.findOne` + `ResultsService.getBilateralResultById` blocks) to labels; evidence mapper (`source`, `visibility`, `link: null` for private, no `sp_*` keys); type-specific mapper per `ResultTypeEnum`; final denylist pass (`/_id$|^id$|_code$/`, bare integers outside the numeric-label allowlist). Fixtures: one saved-result snapshot per result type (6) captured from TEST-like data, serialized payload asserted.
- **Implements:** `BIL-QAI-R-2` scenario *Labels, never identifiers* (all three clauses) · scenario *Payload reflects saved content* clause "derive `content_hash` from the persisted data only" · `BIL-QAI-R-3` scenarios *Private repository file* (clauses 1–2) and *Public URL evidence* · `BIL-QAI-AC-2`, `AC-3`
- **Files (expected):** `.../quality-assessment/bilateral-quality-payload.builder.ts`, `.../mappers/*.mapper.ts`, `.../fixtures/*.json`, `.spec.ts`
- **Depends on:** `BIL-QAI-T-1`, `BIL-QAI-T-3` · **Blocks:** `BIL-QAI-T-6`
- **Estimate:** L
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest ... --testPathPattern="bilateral-quality-payload"` green; the spec asserts on `JSON.stringify(payload)`: `0` matches of `/"[a-zA-Z_]*_id"|"id"|"[a-z_]*_code"/`, `0` matches of `sharepoint|sp_|document_id|folder_path` for private items, five section keys present for all six fixtures, `type_specific.type` equals the fixture's type.
  - *Disqualifier:* a fixture with an empty section counts only if the section key is still present as `{}`/`[]`; a green run over a fixture that lacks a whole section is not evidence for that section.
  - *Falsifying input:* a fixture whose ToC node is present only as `toc_result_id` with no title → the builder must either resolve the title or fail the test; passing with an empty `theory_of_change.result` is a FAIL (mapper fallback missing).
  - *Presence note:* the denylist regex proves absence of id-shaped keys, not that the labels are the ones the form paints; the fixture for each type is reviewed by the owner against a real result in TEST at the HITL pause (recorded in `BIL-QAI-T-11`).
- **Definition of done:** six fixtures; denylist pass unit-tested with a deliberately id-bearing input; DI graph compiles (`npx tsc --noEmit`) — if `BilateralCenterService → orchestrator → BilateralService/ResultsService` cycles, fall back to repositories per `DD-2` and record it in `execution.md`.
- **Superseded by v0.2 → see `BIL-QAI-T-4b`.** The text above records what was executed; the type-specific mapper it shipped emits v0.1's flat labelled fields and is rewritten, and `impact_areas` did not exist.

### [ ] `BIL-QAI-T-4b` — Type-specific mapper v0.2, label constants, impact-areas mapper, tag-vocabulary fix

- **Type:** `server`
- **Description:** Bring the payload builder to contract v0.2 (`design.md` §4.5, §5 *Payload builder — v0.2 amendments*). (a) **Label constants:** one exported `as const` per result type next to the type-specific mappers; every mapper builds `fields` by indexing its constant, so the payload, the fixtures and the contract copy have one source of truth. (b) **Typed values** replacing v0.1's flat labelled fields: Policy change `{Policy type, Policy stage, Implementing organizations[], USD amount {amount, status}}`; Innovation use `{User types[] (free-text actor type as "Other: <text>"), Number of people using {total, women, men, women_youth, men_youth}, Other quantitative measures[{unit_of_measure, quantity}] (the **whole list** — v0.1 read `measures[0]`), Investment (USD) {total = Σ kind_cash over initiative/bilateral-project/partner budgets, null when none}}`; Capacity sharing `{Number of people trained {total computed, female, male, non_binary, unknown}, Length of training (single Long-term|Short-term|null), Delivery method, Implementing organizations[]}`; Innovation development `{Innovation typology, Readiness level (existing "Level N — name"), Innovation developers — **verbatim or null, never the lead contact person**}`; Knowledge product unchanged (still built for hashing, never sent); Other output / Other outcome `fields: {}`. (c) **Impact-areas mapper**: `dac_scores.<pillar>.tag_title` + `impact_area_names[]` (sub-components only at Principal), cross-checked against `getBilateralResultById.impactAreaScores[]`; emits `[{name, score, subcomponents[]}]` at payload **root, sibling of `sections`**, `[]` when the result tags no pillar, and **inside the content hash**. (d) **Evidence tags**: the five booleans → `Gender · Youth · Nutrition · Environment & biodiversity · Poverty`; never `Climate`. (e) `contract_version` → `'0.2'`. (f) Fixtures and spec updated for all six types, **plus `indicators[]` populated in one fixture** so the owner's `T-11` review finally sees a resolved indicator label (carried over from the `T-4` advisory).
- **Implements:** `BIL-QAI-R-2` scenarios *Type-specific fields carry frozen labels and typed values* (all clauses) and *Impact areas travel as an optional block* (all clauses) · `BIL-QAI-R-3` scenario *Evidence tags come from a closed vocabulary* · `BIL-QAI-R-15` scenario *The payload reports what the user wrote* · `BIL-QAI-AC-2`, `AC-16`, `AC-18` (payload half)
- **Files (expected):** `.../quality-assessment/mappers/*.mapper.ts` (+ new `impact-areas.mapper.ts`), `.../quality-assessment/field-labels.ts` (new), `bilateral-quality-payload.builder.ts`, `.../fixtures/*.json`, `.spec.ts`
- **Depends on:** `BIL-QAI-T-1b`, `BIL-QAI-T-4` · **Blocks:** `BIL-QAI-T-6`
- **Estimate:** L
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral-quality-payload|impact-areas"` green, incl.: for each of the six fixtures `Object.keys(fields)` equals that type's constant **in both directions** (no extra key, no missing mandatory key); `typeof fields["Number of people trained"] === 'object'` and every count is a number; `fields["Length of training"]` is a string or `null`, never an object; Innovation development with a cleared column ⇒ `fields["Innovation developers"] === null` while the fixture's lead contact person is non-empty; an Innovation use row with `sex_and_age_disaggregation: false` and `how_many: 9` ⇒ `total` includes 9 and the four parts do not; Principal pillar ⇒ non-empty `subcomponents`, Significant ⇒ `[]`, no tag ⇒ `impact_areas: []`; `JSON.stringify(payload)` contains `0` matches of `"Climate"`; two payloads differing only in a pillar tag level ⇒ different `contentHash`; the existing `AC-2` denylist assertions still pass.
  - *Disqualifier:* a parity test that reads the constant to build the expectation **and** to build the payload proves nothing — one side must be a literal. Assert the constant against literal label strings once, then assert the payload against the constant.
  - *Falsifying input:* rename one label in a constant without touching the fixture — the parity test must FAIL. If it passes, the fixtures are not really reading the constant and `AC-16` has no gate. Likewise: a builder that falls back to the lead contact person must make the `Innovation developers === null` case FAIL.
  - *Presence note:* parity proves the payload matches the constant, not that the constant matches the **form's visible text** — that is the owner's fixture review at `T-11`.
- **Definition of done:** six fixtures regenerated at v0.2, one carrying `indicators[]`; label constants exported and referenced by both mappers and fixtures; `tsc --noEmit` clean; eslint clean; scoped jest green.

### [x] `BIL-QAI-T-5` — AI HTTP client with timeout mapping and body-free logging

- **Type:** `server`
- **Description:** `bilateral-quality-assessment.client.ts` on `HttpService` (already provided by `bilateral.module.ts`): env-driven URL/timeout, `X-API-Key` from `MICROSERVICE_API_KEY`, `not_configured` short-circuit, outcome mapping `timeout | http_error | malformed | ok`, light response schema check, `Logger` lines with ids/status/elapsed only. Contract fixture test: a canned v0.1 response parses to the internal shape.
- **Implements:** `BIL-QAI-R-7` scenarios *Timeout* clause "stored `unavailable`" (client half: outcome) and *Service not configured* · NFR *Privacy / secrets* · `BIL-QAI-AC-15`
- **Files (expected):** `.../quality-assessment/bilateral-quality-assessment.client.ts` + `.spec.ts`, `.../fixtures/ai-response.v0.1.json`
- **Depends on:** `BIL-QAI-T-1` · **Blocks:** `BIL-QAI-T-6`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `error-handling-patterns`
- **Verification:** `npx jest ... --testPathPattern="bilateral-quality-assessment.client"` green with: never-resolving `post` + fake timers ⇒ `timeout` at exactly the configured ms; 503 ⇒ `http_error`; 200 with `{}` ⇒ `malformed`; env unset ⇒ `not_configured` and `post` not called. `Logger` spy: every emitted string matches `/^event=bilateral_quality_assessment/` or a fixed error template and contains none of: the request title string, the URL host, the key value.
  - *Disqualifier:* a log assertion that only checks `logger.log` was called *n* times is not evidence; the assertion must inspect every emitted string.
  - *Falsifying input:* inject a payload whose title is `LEAK-MARKER-9f3` and a key `KEY-MARKER-a1`; any log line containing either marker → FAIL.
- **Definition of done:** grep gate `grep -n "JSON.stringify" bilateral-quality-assessment.client.ts` returns no log-related hit; lint clean.
- **Superseded by v0.2 → see `BIL-QAI-T-5b`.** The text above records what was executed; its schema check rejects a grey **section** as `malformed`, which v0.2 makes a valid answer.

### [ ] `BIL-QAI-T-5b` — AI client schema check v0.2: section grey, `status`, `degraded_reason`

- **Type:** `server`
- **Description:** Widen `bilateral-quality-assessment.client.ts` to contract v0.2 (`design.md` §5 *AI client — v0.2 schema check*). (a) **Section verdict enum** widens to `green | amber | red | grey`; `overall.verdict` stays on the three colours — v0.1 rejected a grey section as `malformed`, which under v0.2 throws away a usable verdict. (b) `status` (`completed | partial | unavailable`) and `degraded_reason` (`string | null`) join the **required** keys; a body missing either is `malformed`. (c) The outcome object carries `ai_status` and `degraded_reason` through to the orchestrator alongside the existing sanitised `score`. (d) `degraded_reason` is truncated to 255 characters and stripped of anything URL- or host-shaped before it leaves the client, so a careless AI-side message cannot become a leak, and it is **never logged**. (e) Unknown response keys stay ignored (forward compatibility, unchanged). (f) The `ai-response.v0.1.json` fixture is replaced by a v0.2 fixture, plus fixtures for `partial` and for AI `unavailable`.
- **Implements:** `BIL-QAI-R-4` scenario *A grey section is rendered, not rejected* clause "must NOT be treated as a malformed response" · `BIL-QAI-R-7` scenarios *The AI answers `partial`* and *The AI answers `unavailable`* (client half: outcome + sanitisation) · NFR *Privacy / secrets* · `BIL-QAI-AC-15`, `AC-17` (client half)
- **Files (expected):** `.../quality-assessment/bilateral-quality-assessment.client.ts` + `.spec.ts`, `.../fixtures/ai-response.v0.2.json`, `.../fixtures/ai-response.partial.json`, `.../fixtures/ai-response.unavailable.json` (v0.1 fixture removed)
- **Depends on:** `BIL-QAI-T-1b`, `BIL-QAI-T-5` · **Blocks:** `BIL-QAI-T-6`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `error-handling-patterns`
- **Verification:** `npx jest ... --testPathPattern="bilateral-quality-assessment.client"` green, incl.: a body whose `type_specific` section verdict is `grey` ⇒ outcome `ok` (not `malformed`) and the grey survives into the parsed shape; `overall.verdict: "grey"` ⇒ `malformed`; body without `status` ⇒ `malformed`; body without `degraded_reason` ⇒ `malformed`; `status: "partial"` ⇒ outcome carries `ai_status: 'partial'` and the reason; `status: "unavailable"` ⇒ outcome distinguishable from a transport failure; a 400-character reason ⇒ stored at 255; a reason containing `https://ai-internal.example/x` ⇒ the URL is stripped. `Logger` spy: no emitted line contains any part of `degraded_reason`.
  - *Disqualifier:* a log assertion that only counts `logger.log` calls is not evidence; every emitted string must be inspected (same rule as `T-5`).
  - *Falsifying input:* a `degraded_reason` of `LEAK-MARKER-9f3 at https://ai-internal.example` — any log line containing the marker, or a persisted reason still containing the URL, → FAIL. A grey section that yields `malformed` → FAIL: that is the exact v0.1 behaviour this task removes.
- **Definition of done:** v0.1 fixture gone; three v0.2 fixtures present; `grep -n "JSON.stringify" bilateral-quality-assessment.client.ts` still returns no log-related hit; eslint clean; scoped jest green.

### [ ] `BIL-QAI-T-6` — Orchestrator, shared `assertSubmittable`, running lock, `POST` and `GET latest` endpoints

- **Type:** `server`
- **Description:** `bilateral-quality-assessment.service.ts` (`assess`, `getLatest`) per `design.md` §2.2/§5; extract `assertSubmittable(user, resultId)` from `submitForReview` (status, `assertCenterPermission`, owner SP, Innovation Use MDS gate) and reuse it; running-row lock in SQL (`created_at > NOW() - INTERVAL … SECOND`) returning 202; short-circuit on current hash; KP branch via `evaluateKpRule` with **no** HTTP; terminal update regardless of client abort; single structured log line. Controller: two thin handlers with Swagger; `AssessmentResponseDto`. The assessment path must **not** call `emitBilateralSubmittedNotification`. **Amendment (gate 1, 2026-09-16):** update `applyGreyRule` in `bilateral-quality-rules.ts` (+ its spec) to match response evidence by `index` and append grey entries for payload items the AI omitted, per the amended `design.md` §5 *Grey rule*; always pass `evidence_count` to `evaluateKpRule`. **Amendment (gate 2b, v0.2 pivot):** persist the v0.2 outcome fields — the status mapping table in `design.md` §4.5 is the contract: AI `completed` **or** `partial` ⇒ row `status = completed` with `ai_status` and `degraded_reason` set; AI `unavailable` ⇒ row `status = unavailable`, `unavailable_reason = 'ai_unavailable'`, `degraded_reason` kept; transport failures keep their existing reason and leave both new columns `null`; the KP branch never sets them. A **grey section verdict passes through unchanged** (`applyGreyRule` touches evidence only) and `hasOutstandingFlags` is untouched, so grey neither raises nor clears a flag. The structured log line gains `ai_status=…` and **must not** carry `degraded_reason`. Also map `BilateralResultFormReadError` to a generic 4xx without logging or surfacing the upstream message (carried over from the `T-4` advisory).
- **Implements:** `BIL-QAI-R-1` scenario *Submit triggers the assessment* clauses "must NOT change `status_id`, write review history, or fire the submitted notification" and "keep the three existing pre-submit guards" (server-side gates) · scenario *No second submission while the check runs* incl. "enforced server-side" · `BIL-QAI-R-6` scenario *Closed tab, unchanged content* (server: `is_current`, stored verdict returned) and *Leaving while running* clause "server MUST finish and store" · `BIL-QAI-R-7` scenario *Timeout* clause "assessment row stored with `status = unavailable`" · `BIL-QAI-R-9` all three scenarios' "no AI call" / `skipped_kp_rule` clauses · `BIL-QAI-AC-1`, `AC-7`, `AC-8`, `AC-9` (server half), `AC-10`, `AC-11`, `AC-14`
- **Files (expected):** `.../quality-assessment/bilateral-quality-assessment.service.ts` + `.spec.ts`, `.../dto/assessment-response.dto.ts`, `bilateral-center.service.ts` (refactor + two delegating methods + spec updates), `bilateral-center.controller.ts` (+2 routes) + `.spec.ts`
- **Depends on:** `BIL-QAI-T-2`, `BIL-QAI-T-2b`, `BIL-QAI-T-3`, `BIL-QAI-T-4`, `BIL-QAI-T-4b`, `BIL-QAI-T-5`, `BIL-QAI-T-5b` · **Blocks:** `BIL-QAI-T-7`, `BIL-QAI-T-8`
- **Estimate:** L
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:** `npx jest ... --testPathPattern="bilateral-center|bilateral-quality-assessment.service"` green, incl.: `assess` on a result never touches `Result` via `manager.update` (spy) and never calls the notification emitter; second `assess` while a `running` row is 5 s old ⇒ 202 with the same id; `running` row 120 s old ⇒ new run; hash equal to latest completed ⇒ no `post`, `is_current: true`; KP result ⇒ `post` never called, row `skipped_kp_rule` with `ai_status` and `degraded_reason` both `null`; client `timeout` ⇒ row `unavailable`, HTTP 200 to the caller; the 11 existing `submitForReview` cases still pass through `assertSubmittable`; Innovation Use result without MDS ⇒ `assess` rejects exactly like submit. **(v0.2)** AI `partial` ⇒ row `status = 'completed'`, `ai_status = 'partial'`, reason stored, `unavailable_reason` null; AI `unavailable` ⇒ row `status = 'unavailable'`, `unavailable_reason = 'ai_unavailable'`, reason stored; a response with one grey section ⇒ row stored with that grey intact and `had_outstanding_flags` unaffected by it; `Logger` spy confirms `ai_status` is present in the line and no part of `degraded_reason` is.
  - *Disqualifier:* a test that stubs `assertSubmittable` itself when testing `assess` proves nothing about gate parity; the parity test must run the real `assertSubmittable` with the same fixtures the 11 submit cases use. Likewise, asserting the status mapping against a stubbed client that returns an already-mapped row proves nothing — feed the mapping the client's real outcome shape.
  - *Falsifying input:* an Innovation Use result lacking MDS must make `assess` throw; if `assess` returns 200, FAIL. A KP result must produce zero `HttpService.post` invocations; one invocation → FAIL. An AI `partial` that lands as row `status = 'unavailable'` → FAIL: that is the mapping this amendment exists to fix.
- **Definition of done:** endpoints documented in Swagger; log line format matches `design.md` §4.1; `npx eslint` quiet; scoped jest green; `execution.md` records the DI outcome from `T-4`.

### [ ] `BIL-QAI-T-7` — Submit with optional decision body; additive `quality_assessment` on both reads; change log

- **Type:** `server`
- **Description:** `SubmitForReviewDto { assessment_id?, decision? }` with `class-validator`; controller `@Body()` + `@ApiBody({ required: false })`, Swagger description updated; `submitForReview(user, resultId, dto?)`: without dto identical to today; with dto → `validateForSubmit` (same result, status ≠ running, undecided, hash == current, `submitted_without_check` ⇔ `unavailable`, `submitted_anyway` ⇔ `completed|skipped_kp_rule`), stamp `decision/decided_at/had_outstanding_flags` **inside the existing transaction**, comment `Submitted for review by the reporting center — quality check: <overall> (<decision>)`. Add `quality_assessment` (latest non-running row, else `null`) to `getBilateralResultById` and to `findOne`/`enrichBilateralResultResponse`; change-log row + line 470 update in `bilateral-result-summaries.en.md`; pre-change fixture comparison tests. **(v0.2)** the exposed block carries `ai_status` and `degraded_reason` as always-present keys (`null` when they do not apply), so a Program reviewer can tell a complete assessment from a degraded one; the decision vocabulary is **unchanged** — an AI `partial` is stored as `status = completed` and therefore submits as `submitted_anyway`, while `submitted_without_check` keeps meaning "no verdict existed".
- **Implements:** `BIL-QAI-R-5` scenario *Submit anyway on red* (server clauses: transition identical, row `submitted_anyway`, `had_outstanding_flags = true`) · `BIL-QAI-R-7` scenario *Timeout* clause "recording `decision = submitted_without_check`" · `BIL-QAI-R-8` scenarios *Decision stamped on submit* (all clauses incl. "reject … another result or whose content hash no longer matches") and *Additive payload* (all clauses) · `BIL-QAI-AC-6` (server), `AC-9` (decision), `AC-12`, `AC-13`
- **Files (expected):** `bilateral/dto/submit-for-review.dto.ts`, `bilateral-center.controller.ts` + `.spec.ts`, `bilateral-center.service.ts` + `.spec.ts`, `api/results/results.service.ts` (+block), `bilateral.service.ts` (+block) + payload spec, `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** `BIL-QAI-T-2`, `BIL-QAI-T-2b`, `BIL-QAI-T-3`, `BIL-QAI-T-6` · **Blocks:** `BIL-QAI-T-10`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:** `npx jest ... --testPathPattern="bilateral-center|results.service|bilateral.service"` green, incl.: no-body call ⇒ byte-identical behaviour to the 11 existing cases; foreign `assessment_id` ⇒ 400 and `manager.update` not called; stale hash ⇒ 400 with the fixed message; `submitted_without_check` on a `completed` row ⇒ 400; red row + `submitted_anyway` ⇒ `had_outstanding_flags` true computed from the row even if the client sends `false`; a thrown error after the stamp and before commit rolls back both. **(v0.2)** a `partial` row (status `completed`, `ai_status` `partial`) accepts `submitted_anyway` and **rejects** `submitted_without_check`; a row with one grey section and four green ⇒ `had_outstanding_flags` false; the exposed block carries both new keys, `null` on a `skipped_kp_rule` row. Payload fixture: `JSON.stringify(before)` equals `JSON.stringify(after)` once `quality_assessment` is deleted from `after`, for `findOne` and `getBilateralResultById`.
  - *Disqualifier:* a payload comparison that normalises both sides (sorting arrays, dropping nulls) before comparing is not evidence of "byte-identical"; compare raw serialisation minus the one added key.
  - *Falsifying input:* rename any existing key in the enrichment while the test runs → the comparison must FAIL; if it passes, the comparison is not seeing existing fields.
- **Definition of done:** change-log row present; Swagger updated; `tsc --noEmit` clean; scoped jest green.

### [ ] `BIL-QAI-T-8` — Client API methods and `BilateralQualityAssessmentService` state machine

- **Type:** `client`
- **Description:** Add `POST_bilateralQualityAssessment`, `GET_bilateralQualityAssessmentLatest`, `PATCH_bilateralSubmitForReview(resultId, body?)` to `shared/services/api/bilateral-api.service.ts`; route `BilateralCreationService.submitResult(resultId, body?)` through it (keep the `resultStatusId` `tap`; drop the raw `HttpClient` use if nothing else needs it). New `BilateralQualityAssessmentService` (`providedIn: 'root'`) with signals `state`, `assessment`, `isCurrent`, `elapsedSeconds`, methods `run`, `loadLatest`, `openStored`, `reset`; 202 ⇒ poll `latest` every 3 s until terminal or window+grace; RxJS `timeout(window + 10 s)` ⇒ `unavailable` (`client_timeout`); **never navigates, never toasts**. Rewrite `bilateral-creation.service.spec.ts` submit cases (body optional).
- **Implements:** `BIL-QAI-R-1` scenario *No second submission* (client: same assessment shown on 202) · `BIL-QAI-R-6` scenario *Closed tab, unchanged content* clause "pressing Submit opens the stored verdict without re-running" (service half) · `BIL-QAI-R-7` scenarios *Timeout* clause "within the window ± 2 s" (client state) and *Service not configured* (renders unavailable from the row) · `BIL-QAI-R-11` `isCurrent` · `BIL-QAI-AC-8`, `AC-9` (client), `AC-14` (client)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/bilateral-api.service.ts` + `.spec.ts`, `pages/bilateral/services/bilateral-creation.service.ts` + `.spec.ts`, `pages/bilateral/services/bilateral-quality-assessment.service.ts` + `.spec.ts`
- **Depends on:** `BIL-QAI-T-6` (contract shape; can start on the DTO once `T-6` lands), human gate `OQ-2` from `T-11` · **Blocks:** `BIL-QAI-T-9`, `BIL-QAI-T-10`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/services src/app/shared/services/api` green, incl.: 200 ⇒ `ready`; 202 ⇒ `running` then polls (fake timers, 3 s cadence) ⇒ `ready`; never-completing request ⇒ `unavailable` at window+10 s; `loadLatest` with `is_current: true` ⇒ `isCurrent` true; `openStored` ⇒ `ready` with **zero** POSTs; `Router.navigate` and alerts service **never** called (spies). Specs stub `environment` values (memory rule: never read the real env file).
  - *Disqualifier:* a polling test that advances time once and asserts "called" is not evidence of cadence; assert call count against elapsed time (e.g. 9 s ⇒ 3 polls).
  - *Falsifying input:* a 202 whose `latest` never leaves `running` must end in `unavailable` at window+grace, not spin forever; a test with an infinite mock that passes has a broken guard → FAIL.
- **Definition of done:** `HTTP_METHOD_descriptiveName` naming; `ng lint --quiet` clean; scoped jest green; `submitResult` body-optional tests replace the `toEqual({})` assertion.

### [ ] `BIL-QAI-T-9` — `app-bilateral-quality-review-dialog` + `app-bilateral-verdict-badge`

- **Type:** `client`
- **Description:** Standalone OnPush dialog per `design.md` §6.2/§6.3 with four phases (working · verdict · unavailable · running-elsewhere), inputs from the service signals, outputs `submitAnyway`/`adjust`; `app-pr-dialog` shell cloned from the AI completion dialog (`showHeader=false`, hand-rolled header, `closable`, `closeOnEscape`, `dismissableMask=true`, `(onHide) → adjust`); rotating tips with the copy in §6.3 and the 20 s adaptive notice; `aria-live` region; badge component with icon + text per verdict; Tailwind-first, tokens only, brand gradient on **Submit anyway**; 720 px max, full width < 640 px. **(v0.2)** two additions per `design.md` §6.2/§6.3: a **grey section row** — same row layout as the other four, grey badge (`remove_circle_outline` + the words **Not evaluated**), the AI's reason as the comment, no *what to fix* / *what is good* lists, reading as an absence rather than a failure; and the **`partial` notice** — one neutral line above the section list (accents tint, `info_outline`, deliberately outside the traffic-light palette so it cannot be read as a verdict): *"Part of this result could not be assessed. &lt;degraded_reason&gt;"*, rendered through interpolation as plain text only, shown when `ai_status === 'partial'` and never otherwise. The unavailable phase shows `degraded_reason` when the AI supplied one. Tip copy updated: grey now covers *"private file, blocked link, or nothing to assess in that section"*.
- **Implements:** `BIL-QAI-R-4` scenario *Window for every colour* (all clauses incl. "must NOT annotate the form"), *Grey never colours a section* (render clause: grey items listed with reason) and *A grey section is rendered, not rejected* (render clauses) · `BIL-QAI-R-5` scenario *Dismissal is Make adjustments* (X, Esc, backdrop ⇒ single `adjust` output, no HTTP) · `BIL-QAI-R-7` scenarios *The AI answers `partial`* / *`unavailable`* (render clauses: notice, reason verbatim, no host or body) · `BIL-QAI-R-10` all clauses (200 ms is asserted in `T-10`; live region here) · `BIL-QAI-R-13` · NFR *Accessibility*, *Design system* · `BIL-QAI-AC-4`, `AC-5` (component half), `AC-17` (render half)
- **Files (expected):** `pages/bilateral/components/bilateral-quality-review-dialog/*.{ts,html,scss,spec.ts}`, `pages/bilateral/components/bilateral-verdict-badge/*.{ts,html,spec.ts}`
- **Depends on:** `BIL-QAI-T-8` (types) · **Blocks:** `BIL-QAI-T-10`
- **Estimate:** L
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Verification:** `npx jest ... src/app/pages/bilateral/components/bilateral-quality-review-dialog src/app/pages/bilateral/components/bilateral-verdict-badge` green, incl.: green/amber/red fixtures each render the overall badge text, exactly five section rows, and the evidence list with grey items' reason; X, Esc and backdrop each emit `adjust` exactly once and `submitAnyway` never; unavailable fixture renders both CTAs; fake timers: tip text changes over time and the 20 s notice appears at 20 s; every badge has non-empty text next to its icon; `role="dialog"` + `aria-live` present. **(v0.2)** a fixture with one grey section renders four coloured rows and one grey row carrying the words *Not evaluated* plus the AI's reason, with no fix/strength list on that row and the overall badge unchanged; `ai_status: 'partial'` ⇒ exactly one notice containing the reason text; `ai_status: 'completed'` and `null` ⇒ zero notices; a `degraded_reason` containing `<b>x</b>` renders as literal text, not markup.
  - *Disqualifier:* asserting the CSS class `bg-[var(--pr-color-green-500)]` proves presence of a class, not colour or contrast — jsdom cannot measure either. Recorded gap → **human T6 visual review in `T-11`** (desktop + 375 px, working + verdict + unavailable + **grey-section and `partial` states**).
  - *Falsifying input:* a fixture with six section keys must still render five rows (unknown key ignored) — if six render, FAIL; a badge with icon only and empty label → FAIL; a grey section that renders with the amber or red treatment → FAIL (grey must read as an absence, not a problem).
- **Definition of done:** scoped jest green; `ng lint --quiet` clean; no new SCSS beyond `@keyframes` and `:host`; screenshots of the three states attached to `execution.md` for the T6 gate.

### [ ] `BIL-QAI-T-10` — Wire the creator: `submitPhase`, run/openStored, decision → submit, rail chip, `beforeunload`

- **Type:** `client`
- **Description:** In `bilateral-result-creator.component`: replace `isSubmitting` with `submitPhase` (`idle|assessing|deciding|submitting`), `canSubmitFromRail` requires `idle`, rail label/icon per phase; `submitResult()` keeps the three guards then `qa.openStored()` if `isCurrent` else `qa.run(rid)`; `onQualityDecision(decision)` → `creationService.submitResult(rid, {assessment_id, decision})` with the existing `bilateralSubmitSuccess`/`bilateralSubmitError` alerts; `ngOnInit` → `qa.loadLatest(rid)` after load; host `<app-bilateral-quality-review-dialog>`; `[appBeforeUnloadWarning]="qa.isRunning"`; rail chip "Quality check available" when `isCurrent`. Rewrite `bilateral-result-creator.component.spec.ts` cases listed in `design.md` DD-9.
- **Implements:** `BIL-QAI-R-1` scenario *Submit triggers the assessment* (client clauses: working state opens, button disabled + busy, no submit call before decision, three guards unchanged) · `BIL-QAI-R-5` scenario *Submit anyway on red* (client: PATCH with body fires only from the CTA) · `BIL-QAI-R-6` scenarios *Edit then resubmit* (client: `run` when not current), *Closed tab, unchanged content* (chip + `openStored`), *Leaving while running* (warning armed while running, leave allowed) · `BIL-QAI-R-10` "visible within 200 ms" · `BIL-QAI-R-11` · `BIL-QAI-AC-1`, `AC-5` (page half), `AC-6` (client), `AC-7`, `AC-8`
- **Files (expected):** `pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.{ts,html,spec.ts}`
- **Depends on:** `BIL-QAI-T-7`, `BIL-QAI-T-8`, `BIL-QAI-T-9` · **Blocks:** `BIL-QAI-T-11`
- **Estimate:** M
- **Skills:** `angular-developer`
- **Verification:** `npx jest ... src/app/pages/bilateral/pages/bilateral-result-creator` green, incl.: click ⇒ `qa.run` called, `submitResult` on the creation service **not** called, `submitPhase() === 'assessing'`, dialog present in the DOM within one change-detection cycle (proxy for 200 ms); with `isCurrent` ⇒ `openStored` and no `run`; `submitAnyway` output ⇒ `submitResult(42, {assessment_id, decision: 'submitted_anyway'})` exactly once; `adjust` output ⇒ zero submit calls and `submitPhase` back to `idle`; the three refusal cases (`bilateralSubmitUnsavedSections`, `bilateralSubmitInvalidFields`, read-only) still refuse **before** `run`; `beforeunload` handler calls `preventDefault` only while `running`.
  - *Disqualifier:* "dialog present within one CD cycle" is a proxy for the 200 ms clause and cannot measure wall time; the wall-time check is the human gate in `T-11` (working state visible on click in TEST). A test that asserts `submitPhase` without asserting `canSubmitFromRail()` is false during `deciding` misses the re-enable bug DD-9 found → both must be asserted.
  - *Falsifying input:* a `run` that resolves synchronously with `ready` must leave the button disabled (`deciding`); if `canSubmitFromRail()` is true while the dialog is open, FAIL.
- **Definition of done:** scoped jest green (whole `pages/bilateral` run: `npx jest ... src/app/pages/bilateral`); `ng lint --quiet`; `ng build --configuration development` OK; alert ids unchanged.

### [~] `BIL-QAI-T-12` — Innovation developers field restored in the bilateral form

- **Type:** `client`
- **Description:** Give the bilateral Innovation development section its own **Innovation developers** field again (`R-15`, `design.md` `DD-12`). (a) Restore the textarea removed at `type-innovation-dev.component.html:44-46`: label **"Innovation developers"**, `app-pr-textarea`, optional, matching the standard PRMS result form (`pages/results/.../innovation-dev-info.component.html:140-147`). (b) Remove the silent overwrite at `type-innovation-dev.component.ts:277`, which copies the Section-1 *Lead contact person* into the column on every save; replace it with a **prefill on first load only when the stored value is empty**, so an edited value survives and a cleared value stays cleared (persisted as `null`). (c) Persist through the existing path — `BilateralApiService.PATCH_innovationDev` (`shared/services/api/bilateral-api.service.ts:144`) scheduled by `BilateralAutoSaveService.schedulePayload`, hitting the legacy `PATCH api/results/summary/innovation-dev/create/result/:id`. **No new endpoint.** (d) Correct the `pages/bilateral/.../CLAUDE.md` note that documented the field's removal. (e) **Server verification, not server work:** confirm the legacy summary endpoint persists an explicit `null`/empty for `innovation_developers` rather than dropping the key — if it drops it, a cleared value cannot round-trip and the task escalates to the Leader with the evidence rather than patching the server unannounced. The ingest handler's own lead-contact fallback (`handlers/innovation-development.handler.ts:56-75,95`) is **out of scope** — it belongs to the bulk-upload path, and the owner of that module is notified per the module-ownership rule, not edited here.
- **Implements:** `BIL-QAI-R-15` scenario *The user writes their own innovation developers* (all clauses) · `BIL-QAI-AC-18` (form half)
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-dev/type-innovation-dev.component.{html,ts,spec.ts}`, `onecgiar-pr-client/src/app/pages/bilateral/**/CLAUDE.md`
- **Depends on:** v0.2 amendment (approved gate 3) (client-only; independent of the whole server chain) · **Blocks:** `BIL-QAI-T-11`(b) fixture review
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral/components/section-type-specific/type-innovation-dev` green, incl.: stored value empty + lead contact "A. Rivera" ⇒ field renders prefilled with "A. Rivera"; stored value "CIAT breeding team" + lead contact "A. Rivera" ⇒ field renders "CIAT breeding team" (**no** prefill); user clears the field and saves ⇒ the scheduled payload carries `innovation_developers: null` or `''`, **not** the lead contact person; changing the lead contact person afterwards and saving ⇒ the payload's `innovation_developers` is unchanged; the field is not required and does not affect the MDS tracker.
  - *Disqualifier:* a test that asserts only "the textarea exists in the DOM" proves the markup came back, not that the overwrite is gone — the overwrite lives in the save path, so at least one assertion must inspect the **payload** the component schedules.
  - *Falsifying input:* set the stored value to "CIAT breeding team", change the lead contact person, trigger a save — if the scheduled payload carries the lead contact person, FAIL. That is precisely the "check that can never fail" behaviour this task removes.
  - *Presence note:* jest proves the client no longer overwrites; it does not prove the legacy endpoint stores a cleared value. That is the (e) verification, done against TEST and recorded in `execution.md`.
- **Definition of done:** field visible, optional and editable; no lead-contact overwrite on save; a cleared value round-trips; `ng lint --quiet` clean; scoped jest green; the CLAUDE.md note corrected; (e)'s finding recorded in `execution.md`.

### [ ] `BIL-QAI-T-11` — Docs sweep and human gates (proxy ceiling, T6 visual review, copy, fixture sanity)

- **Type:** `docs` + `rollout`
- **Description:** (a) **Human gate, before `T-8`:** in TEST, point `BILATERAL_AI_QUALITY_URL` at a stub that sleeps 62 s and call `POST quality-assessment` through the front door; confirm the response is the app's `unavailable` DTO, not a proxy 504. If the proxy cuts earlier, set the default timeout just under it and record the number in `design.md` §8. (b) **Human gates at the client HITL pause:** T6 visual review of the dialog states at desktop and 375 px (contrast, colour + text carrier, no horizontal scroll) — **(v0.2)** now five states: working, verdict, unavailable, **verdict with a grey section**, **verdict with the `partial` notice**; owner reads the tip copy and the `partial` notice copy; owner compares one payload fixture per type against the real form in TEST. **(v0.2)** the fixture review is now the gate for `AC-16`'s blind spot — the frozen label constants must match the form's **visible text** word for word, which no test can check — and it must settle the two open data questions surfaced at `T-4`: whether Innovation use totals should come from `how_many` (the innovation-use guide's rule) or from the summed gender columns (what the mapper does), and the reading of the `indicators[]` label now populated in one fixture. (c) **Docs sweep** (design DD-9 list): `pages/bilateral-result-creator/CLAUDE.md`, `section-zero-dashboard/CLAUDE.md`, `type-innovation-use/CLAUDE.md`, server `api/bilateral/CLAUDE.md`, `bilateral.module.ts` route comment, `innovation-use-mds-validator.service.ts` header, `docs/bilateral-module/backend.md` + `frontend.md` (new sections), one-line supersession note in `docs/specs/notifications/bilateral-review-decision/design.md`. Vault note updated with outcomes. **(v0.2)** the sweep also covers the contract version: no guide may still describe the outbound payload as v0.1 or as free label→value pairs. The `type-innovation-dev` CLAUDE.md note is `T-12`'s, not this task's.
- **Implements:** NFR *Latency window* (proxy ≥ 65 s), *Accessibility* and *Design system* human gates, `BIL-QAI-R-10`/`R-13` human gate (copy), `BIL-QAI-R-2` fixture sanity (labels are the form's — `AC-16` blind spot), `BIL-QAI-AC-17` (visual half), `BIL-QAI-OQ-2`
- **Files (expected):** the guides above, `docs/bilateral-module/{backend,frontend}.md`, `docs/specs/notifications/bilateral-review-decision/design.md`, vault note
- **Depends on:** (a) none — runs first; (b)(c) `BIL-QAI-T-10`, `BIL-QAI-T-12`
- **Estimate:** S
- **Skills:** `cognitive-doc-design`
- **Verification:** (a) a recorded response body from TEST showing `status: "unavailable", unavailable_reason: "timeout"` after ≥ 60 s — *disqualifier:* a 504/502 or an HTML error page is a FAIL of the environment, not a pass; *falsifying input:* the 62 s stub is precisely the input that fails a 29 s proxy. (b) **five** screenshots × two widths attached to `execution.md` with a written verdict per state; *disqualifier:* screenshots without the 375 px set are incomplete, and a set without the grey-section and `partial` states does not gate `AC-17`. (c) `grep -rn "submit-for-review" onecgiar-pr-client/src/app/pages/bilateral/**/CLAUDE.md onecgiar-pr-server/src/api/bilateral/CLAUDE.md` — every hit describes the assessment step; *falsifying input:* a guide still stating "Submit transitions immediately" → FAIL.
- **Definition of done:** proxy number recorded; visual verdict recorded; docs updated; vault note has the outcomes section.

## 4. Dependency graph

Wave 1 (done): `T-1`, `T-2`, `T-3`, `T-4`, `T-5`. Wave 2 is the v0.2 amendment, which re-enters the graph **before** `T-6`.

```
[v0.2 amendment approved by the owner]
      │
      ├──► BIL-QAI-T-1b (contract v0.2 copy)          ◄── supersedes T-1
      │          │
      │          ├──► BIL-QAI-T-4b (type_specific v0.2 + labels + impact areas)  ◄── T-4
      │          └──► BIL-QAI-T-5b (client schema check v0.2)                    ◄── T-5
      │
      ├──► BIL-QAI-T-2b (ai_status + degraded_reason migration)                  ◄── T-2
      │
      └──► BIL-QAI-T-12 (innovation developers field — client only, no server dependency)
                 │
   T-4b, T-5b, T-2b, T-3 ──► BIL-QAI-T-6 (orchestrator + assertSubmittable + POST/GET + status mapping)
                                          │
                                          ├──► BIL-QAI-T-7 (submit body + additive reads + change log) ◄── T-2b, T-3
                                          │
                                          └──► BIL-QAI-T-8 (client API + QA service)  ◄── T-11(a) proxy gate
                                                     │
                                                     └──► BIL-QAI-T-9 (dialog + badge + grey row + partial notice)
                                                                │
                                                     T-7 ──────►BIL-QAI-T-10 (creator wiring)
                                                                │
                                              T-12 ────────────►BIL-QAI-T-11(b)(c) (human gates + docs)
```

Parallel-friendly: **`T-1b ∥ T-2b ∥ T-12`** the moment the amendment is approved, then **`T-4b ∥ T-5b`** after `T-1b` — both live under `services/quality-assessment/` but touch different files (`T-4b`: mappers, `field-labels.ts`, builder, fixtures; `T-5b`: the client and its fixtures), so they do not collide. `T-12` is client-only and shares nothing with the server chain, so it can run beside any of them. Later, as before: `T-7 ∥ T-8` after `T-6`. The two halves are separate PRs (§6).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-QAI-TEST-1` | unit (server, pure) | R-3 grey clause, R-4 grey scenario, R-6 hash, R-8 flags, R-9 all, AC-10/11 | `api/bilateral/services/quality-assessment/bilateral-quality-rules.spec.ts` |
| `BIL-QAI-TEST-2` | unit + fixtures (server) | R-2 all clauses, R-3 both original scenarios, AC-2, AC-3 | `.../bilateral-quality-payload.builder.spec.ts` |
| `BIL-QAI-TEST-2b` | unit + fixtures (server) | R-2 *typed labels* + *impact areas* scenarios, R-3 *tag vocabulary*, R-15 payload clause, AC-16, AC-18 (payload half) | `.../bilateral-quality-payload.builder.spec.ts`, `.../mappers/impact-areas.mapper.spec.ts` |
| `BIL-QAI-TEST-3` | unit (server) | R-7 timeout/not-configured, AC-15 (Logger spy) | `.../bilateral-quality-assessment.client.spec.ts` |
| `BIL-QAI-TEST-3b` | unit (server) | R-4 *grey section not malformed*, R-7 *partial* / *unavailable* (client half), AC-15 (reason never logged), AC-17 (client half) | `.../bilateral-quality-assessment.client.spec.ts` |
| `BIL-QAI-TEST-4` | unit (server) | R-1 both scenarios, R-6 server clauses, R-7 row, R-9 no-HTTP, AC-1/7/8/9/10/11/14 | `.../bilateral-quality-assessment.service.spec.ts`, `bilateral-center.service.spec.ts`, `bilateral-center.controller.spec.ts` |
| `BIL-QAI-TEST-5` | unit + payload fixture (server) | R-5 server, R-8 both scenarios, AC-6/9/12/13 | `bilateral-center.service.spec.ts`, `results.service.spec.ts`, `bilateral.service.spec.ts` |
| `BIL-QAI-TEST-6` | unit (client) | R-1 client, R-6 openStored, R-7 client, R-11, AC-8/9/14 | `pages/bilateral/services/bilateral-quality-assessment.service.spec.ts`, `bilateral-creation.service.spec.ts`, `shared/services/api/bilateral-api.service.spec.ts` |
| `BIL-QAI-TEST-7` | unit (client) | R-4 (incl. *grey section rendered*), R-5 dismissal, R-7 *partial* notice, R-10, R-13, AC-4, AC-5, AC-17 (render half) | `.../bilateral-quality-review-dialog.component.spec.ts`, `.../bilateral-verdict-badge.component.spec.ts` |
| `BIL-QAI-TEST-8` | unit (client) | R-1 client, R-5 CTA, R-6 all client clauses, R-11, AC-1/5/6/7/8 | `.../bilateral-result-creator.component.spec.ts` |
| `BIL-QAI-TEST-12` | unit (client) | R-15 *The user writes their own innovation developers* (all clauses), AC-18 (form half) | `.../type-innovation-dev/type-innovation-dev.component.spec.ts` |
| `BIL-QAI-TEST-9` | human (TEST env) | NFR latency window (OQ-2), R-10 200 ms wall time | `execution.md` record |
| `BIL-QAI-TEST-10` | human T6 visual | NFR a11y + design system, R-13 copy, the grey-section and `partial` states (AC-17 visual half) | screenshots in `execution.md` |
| `BIL-QAI-TEST-11` | human | R-2 labels match the form — the `AC-16` blind spot — plus the `how_many` totals question and the `indicators[]` fixture | owner check, `execution.md` |

Scoped runs only: server `npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral"`; client `npx jest --silent --reporters=summary --no-coverage src/app/pages/bilateral src/app/shared/services/api`. Never the full server suite (memory rule). Server thresholds 5/20/35/40, client 50/60/60/60 must hold.

**Scenario coverage closure** (every scenario and `BUT`/`AND IT MUST` clause owned): R-1 → T-6 (server), T-10 (client) · R-2 → T-4 + **T-4b** (typed labels, impact areas), T-1b (contract), T-11 (human label sanity) · R-3 → T-3 (grey clause), T-4 (fields), **T-4b** (tag vocabulary) · R-4 → T-9 (render), T-3 (grey never recolours), **T-5b** (grey section is not malformed), **T-9** (grey row) · R-5 → T-7 (server), T-9 (dismissal), T-10 (CTA) · R-6 → T-3 (hash), T-6 (server), T-8/T-10 (client) · R-7 → T-5 (outcome), T-6 (row + **status mapping**), T-7 (decision), T-8 (state), **T-2b** (columns), **T-5b** (`status`/`degraded_reason`), **T-9** (`partial` notice) · R-8 → T-2 + **T-2b** (fields), T-3 (flags), T-7 (stamp, additive, both new keys) · R-9 → T-3 (rule), T-6 (no HTTP, status) · R-10 → T-9 (live region), T-10 (CD proxy), T-11 (wall time) · R-11 → T-8, T-10 · R-12 → T-1b, T-2, T-7 (stored verbatim) · R-13 → T-9 · **R-15 → T-12 (form), T-4b (payload), T-11 (owner sees the field in TEST)** · `BIL-QAI-R-14` (MAY, section deep-link) → **not scheduled**; recorded as deferred in §7.

## 6. Rollout & verification

- **PR strategy (chained, ~1 900 LOC after the v0.2 re-baseline):**
  - **PR 1 — server** (`T-1`+`T-1b`, `T-2`+`T-2b`, `T-3`, `T-4`+`T-4b`, `T-5`+`T-5b`, `T-6`, `T-7`): review first the contract v0.2 section and the label constants (they are what the AI validates strictly), then `bilateral-quality-rules.ts` and the payload fixtures, then the orchestrator's status mapping, then the submit change. Out of scope: any UI. **Two** migrations run by the owner in TEST after merge. Inert until the env URL is set.
  - **PR 2 — client** (`T-8`, `T-9`, `T-10`, `T-11`): review first the QA service state machine, then the dialog (grey row + `partial` notice), then the creator wiring. Links PR 1. Out of scope: server.
  - **PR 3 — innovation developers field** (`T-12`): small, client-only, independent of the other two. Review the save path, not the markup — the defect it fixes is the silent lead-contact overwrite, not the missing textarea. Can merge before or after PR 2.
  - PR descriptions follow `cognitive-doc-design` review-empathy rules (what to review first, what is out of scope, link previous/next PR).
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Owner runs **both** migrations in TEST (`BilateralQualityAssessments`, then `AddAiStatusToBilateralQualityAssessments`); sets `BILATERAL_AI_QUALITY_URL` when Daniela's endpoint is up.
- [ ] Owner sends the contract v0.2 per-type label enumeration to Daniela (`T-1b` draft) and confirms her service is on v0.2 before the URL is pointed at it.
- [ ] Manual QA on TEST per `requirements.md` scenarios with a Center User account (guest accounts are read-only and the button is disabled — vault note).
- [ ] Change-log row communicated to downstream consumers (additive block).
- [ ] Post-deploy: log lines `event=bilateral_quality_assessment` flowing; `unavailable_reason=timeout` rate observed.

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`; kaizen entry via `/akili-archive`.
- [ ] GAP-1 (Back during run) and R-14 (section deep-link) filed as follow-ups if users ask.
- [ ] GAP-6 (no climate evidence tag) and GAP-7 (no non-binary/unknown counts in Innovation use) raised with the form owners — they are schema gaps this spec documents but does not fix; DM the owning module per the module-ownership rule rather than opening tickets unilaterally.
- [ ] Ingest-path lead-contact fallback (`handlers/innovation-development.handler.ts:56-75,95`) surfaced to the bulk-upload module owner — same defect as `DD-12`, different path, deliberately out of `T-12`'s scope.
- [ ] Promote DD-1 (synchronous LITE call with persisted outcome) to `docs/trd/trd.md` §11 via archive sync on the default branch.
- [ ] Update `docs/prd.md` OQ-5 if the PO decides AI helpers become a product goal.
- [ ] Registry re-baseline note (`.agents/model-routing.md`, updated 2026-08) recorded as pending, applied on the default branch.

## 8. Roll-back plan

1. Revert PR 2 (client) — restores the direct submit; server endpoints stay harmless.
2. Revert PR 1 (server) if needed; `npm run migration:revert` twice — first drops the two v0.2 columns, then `bilateral_quality_assessments` (rows are audit-only, no FK from other tables).
2b. Revert PR 3 (innovation developers) independently if the field causes trouble; the column and both reads predate this spec, so reverting only restores the hidden lead-contact prefill.
3. Unset `BILATERAL_AI_QUALITY_URL` as the fastest kill switch without a deploy: the flow shows the unavailable state and submission proceeds.
4. Compare `findOne` / `getBilateralResultById` against the pre-change fixtures (only `quality_assessment` disappears).
5. Note the rollback in the change log and tell Daniela.

## Required cross-references

- `./requirements.md`, `./design.md`, `./proposal.md`
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`, `docs/bilateral-module/integration-contracts.md`
