# Execution Log — QA AI traffic light on "Submit for review" (W3/Bilateral)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/qa-ai-traffic-light/` |
| Module code | `BIL-QAI` |
| Approval Mode | gated (inherited) |
| Branch | `JuanGuzman-io/feature-p2-3150-bilateral` (== `origin/performance-refactor` at `d3d58a986` on 2026-09-16; worktree `orca/workspaces/onecgiar_pr/hermit`) |
| Target branch | `performance-refactor` |
| Ticket | P2-3698 (sub-task of P2-3150) |
| Leader | Claude Fable 5.1 (T1) · Implementer wrapper `akili-implementer` (sonnet, T2) · Reviewer wrapper `akili-reviewer` (opus, T3) |
| Budget (design.md) | 11 tasks · ~1 500 production LOC + ~1 300 test LOC · 3 review rounds. Tripwire: > 14 tasks, > 2 200 production LOC, > 5 review rounds |
| Created | 2026-09-16 |

### Pre-flight (2026-09-16)

| Check | Result |
|---|---|
| `requirements.md` / `design.md` approved | Yes (Document Control, owner, 2026-09-16) |
| `BIL-QAI-OQ-1` | Resolved → `docs/bilateral-module/integration-contracts.md` (T-1) |
| Contract handoff to Daniela | Already sent 2026-09-16 (vault note → *Handoff del contrato*). T-1 does **not** send Slack; it adds the repo-copy pointer to the vault note |
| Conflicting in-flight specs touching `bilateral-center.service.ts` / `submitForReview` | None in flight. Hits are archived/shipped specs (`archive/2026-09-14-bilateral--manual-create-drawer`, `bugfix/p2-3652-*`, `bilateral/webhook-external-platforms`, `notifications/bilateral-review-decision` → gets the supersession note in T-11) |
| Local environment (`docs/infrastructure.md` §6) | Worktree had no `node_modules` → `npm ci` run in `onecgiar-pr-server` (2026-09-16, exit 0). Client deps pending until the client wave. Node in shell is **v22.23.2** (contract says 20.x; nvm has v20.13.1 — recorded deviation, switch if a native module misbehaves). Docker daemon **off**. |
| Database for T-2 (`migration:generate` / `migration:check`) | **Blocked, probe-confirmed:** no `onecgiar-pr-server/.env` in the worktree; the main checkout `.env` points at a remote `DB_HOST` that is **not reachable** (TCP connect failed — likely VPN). No local MySQL on 3306. Decision pending from the owner at the first gate (connect VPN / copy `.env` into the worktree). T-2 stays `[ ]` until then; memory rule forbids hand-written migrations. |
| CodeGraph | `.codegraph/` exists but neither the `codegraph` CLI nor the MCP tools are available in this session → briefs omit graph lookups; workers explore by file |
| Human gate `T-11(a)` (proxy ceiling ≥ 65 s in TEST) | Owner-only (TEST environment). Must land **before `T-8`**. Flagged at the first gate |
| Skills for Implementers | `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `tdd`, `angular-developer`, `ui-ux-pro-max`, `cognitive-doc-design` — all present in the session |

### Wave plan

- **Wave 1 (2026-09-16):** `T-1 ∥ T-3` (disjoint files: docs+README+vault vs new `services/quality-assessment/` files; no shared build output). `T-2` held on the DB blocker.
- Next: `T-2` (after DB access) → `T-4 ∥ T-5` → `T-6` → `T-7 ∥ T-8` (T-8 also gated by `T-11(a)`) → `T-9` → `T-10` → `T-11(b)(c)`.

## Task Execution History

### `BIL-QAI-T-1` — Freeze contract v0.1 and document it in the repo

| Field | Value |
|---|---|
| Status | in progress (rework) |
| Date | 2026-09-16 |
| Skills assigned | `api-design-principles`, `cognitive-doc-design` (task list, no deviation) |
| Effort | attempt 1 `medium` → attempt 2 `high` |
| Leader decisions | Slack handoff **not** re-sent: the vault note already records the 2026-09-16 DM to Daniela; the Implementer only appended the repo-copy pointer to the vault note. CodeGraph omitted from the brief (tools unavailable). |

**Attempt 1** — Implementer (sonnet) · files: `docs/bilateral-module/integration-contracts.md` (+148, new `## Quality assessment (outbound)`), `onecgiar-pr-server/README.md` (+4), vault note (+1 bullet under *Handoff del contrato*). Verification: greps for the section heading, `contract_version`, `visibility`, both `BILATERAL_AI_QUALITY_*` keys — all present; disqualifier check inside the new section: only `request_id` (permitted) and the prose stating the prohibition. No `Not Done`.

Reviewer (opus) → **FAIL**. Field-by-field comparison against the vault contract: identical (only the placeholder gloss "…texto del nodo…" translated). One issue:

> 1. **Discovered Issue:** The two new bullets were inserted *between* the three `BULK_HANDOFF_*` keys and the paragraph that describes them, orphaning that paragraph's referent. `onecgiar-pr-server/README.md:45` now reads `Missing any of the three degrades POST /api/bilateral/center/handoff to a 503 … leaving them unset keeps PROD dark by design.` while sitting under a list of **five** bullets — two of which (`BILATERAL_AI_QUALITY_URL`, `BILATERAL_AI_QUALITY_TIMEOUT_MS`) have no 503 behaviour at all and are governed by the opposite rule stated two lines later. The most available reading contradicts `BIL-QAI-R-7`.
> **Violated Rule:** `.agents/reviewer.md` §2 *Stability & Integrity*; `tasks.md` T-1 DoD ("README keys listed" = prose accuracy); `requirements.md` `BIL-QAI-R-7` *Service not configured*.
> **Remediation:** (a) move the two bullets after the line-45 paragraph, or (b) scope the sentence to `BULK_HANDOFF_*`.

ADVISORY (recorded, not gating):
- RELIABILITY: `constraints.timeout_seconds: 60` is pinned while the bound is `BILATERAL_AI_QUALITY_TIMEOUT_MS`; the doc never says the former derives from the latter. → carried as a **forward pointer to `T-4`/`T-5`**: derive `timeout_seconds` from the env value in the builder/client.
- READABILITY: the contract never says when the AI itself should emit `evidence[].verdict = grey` (blocked/unreachable URL per Glossary).
- READABILITY: the bullet "any key ending in `_id`" is absolute and then carved out by `request_id` a paragraph later.
- RISK: "five keys, **in this order**" adds an ordering guarantee the frozen vault contract does not make.

**Attempt 2** — Implementer (sonnet, effort `high`) · file: `onecgiar-pr-server/README.md` only — the two `BILATERAL_AI_QUALITY_*` bullets moved below the "Missing any of the three…" paragraph, directly above the `MICROSERVICE_API_KEY` paragraph (Reviewer option (a)). Verification: `sed -n 36,50p README.md` shows trio → 503 sentence → new bullets → reuse paragraph; `git diff --stat` integration-contracts +148 (unchanged), README +5. No `Not Done`.

Reviewer (opus, same session) → **PASS**. Summary: "The README insertion point was moved so the `Missing any of the three …` paragraph again follows only the three `BULK_HANDOFF_*` keys, restoring its referent without touching any existing line; the contract copy in `integration-contracts.md` remains a faithful field-by-field transcription of vault contract v0.1 and satisfies `BIL-QAI-R-2`, `R-3`, `R-12` and the *Latency window* env keys." Nothing new; attempt-1 advisories stand.

| Field | Value |
|---|---|
| **Final status** | **PASS** (attempt 2 of 3) |
| Requirements covered | `BIL-QAI-R-2` (shape, five keys), `R-3` (evidence fields), `R-12` (optional score), NFR *Latency window* (env keys); `BIL-QAI-OQ-1` closed |
| Final verification | greps per work order green; Reviewer field-by-field match against the vault contract |
| Issues | README placement (attempt 1) — fixed |
| Forward pointers | → `T-4`/`T-5`: derive `constraints.timeout_seconds` from `BILATERAL_AI_QUALITY_TIMEOUT_MS` (advisory RELIABILITY) · → owner at gate: decide whether to drop "in this order" and add the AI-side grey trigger to the contract copy (advisories RISK/READABILITY — out of T-1 scope, not minted as tasks) |
| Commit | see below |

### `BIL-QAI-T-3` — Pure rules: grey, KP decision tree, content hash, outstanding flags (TDD)

| Field | Value |
|---|---|
| **Final status** | **PASS** (attempt 1 of 3) |
| Date | 2026-09-16 |
| Skills assigned | `tdd`, `nestjs-expert` (task list, no deviation) |
| Effort | `high` (business rules with literal expectations) |
| Files | `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/bilateral-quality-rules.ts` (+358), `.../bilateral-quality-rules.spec.ts` (+615) — both new |
| Requirements covered | `BIL-QAI-R-3` (grey clause), `R-4` (grey never recolours), `R-6` (hash determinism), `R-8` (outstanding flags), `R-9` (all three scenarios), `AC-10`, `AC-11` (rule half) |

**Attempt 1** — Implementer (sonnet). Red → green: spec written first (import error), then implementation. Verification (verbatim): `npx jest --silent --reporters=summary --forceExit --testPathPattern="bilateral-quality-rules"` → `Test Suites: 1 passed · Tests: 61 passed`; coverage `bilateral-quality-rules.ts | 100 | 100 | 100 | 100`; `npx eslint "src/api/bilateral/services/quality-assessment/**/*.ts" --quiet` → exit 0; grep for `@nestjs`/`typeorm` imports → none. Note: `--collectCoverageFrom` must be relative to `src/` (jest `rootDir`). No `Not Done`.

Implementer judgment calls: (1) `is_melia = true` + Journal Article + agreeing rows → `green` (design §5 branch 2 has no MELIA guard); (2) `KpRuleInput.evidence_count?: number` as the KP evidence shape; (3) removed a defensive `payload.sections?.evidence ?? []`.

**Leader adjudication (1):** `green` is correct. The owner's original SQL tree in the vault note (*Árbol KP*) has no MELIA guard on the Journal Article branch; `requirements.md` R-9 *Fallthrough* "a KP that is MELIA" is shorthand for the non-JA MELIA case. Reviewer concurred.

Reviewer (opus) → **PASS**. Summary: "`bilateral-quality-rules.ts` implements the four pure functions exactly as `design.md` §5 specifies, the reason/rationale strings match the design and the frozen contract character-for-character, and the 61-test table-driven suite carries literal expectations (no tautology) including both falsifying inputs from the work order; purity, `@akili-spec` header, 100 % branch coverage and lint are satisfied."

ADVISORY (recorded, not gating — none minted as tasks):
- RELIABILITY/RISK: `applyGreyRule` joins AI `evidence[]` to payload evidence by **array position** and ignores `item.index`, which the contract carries as the join key. A reordered response grades the wrong item grey; a private item the AI omits never gets a grey entry, although R-3 says it "MUST be graded grey regardless of what the AI answers". Not gated because design §5 literally writes `evidence[i]`. → **Escalated to the owner at the gate as a design clarification** (design §5 *Grey rule*: match by `index`, append grey for missing items). If approved, folded into the brief of the task that consumes the rule (`T-6`).
- RESILIENCE: 100 % branch coverage does not exercise the length-mismatch path (`response.evidence` longer than payload evidence). One extra case would pin it.
- RISK: `contentHash(payload: Record<string, unknown>)` rejects a value typed as the exported `QualityPayload` (TS2345, no implicit index signature). → **Forward pointer to `T-4`**: widen to `QualityPayload | Record<string, unknown>` and add one spec case `contentHash(buildPayload())` (compile-fix inside T-4's `tsc --noEmit` DoD).
- RELIABILITY: with the defensive `?? []` removed, `applyGreyRule` throws on a 2xx body lacking `evidence`/`sections`/per-section arrays. → **Forward pointer to `T-5`**: the light schema check MUST treat `sections`, `evidence` and each section's `strengths`/`issues` arrays as required keys (else `malformed`), so the orchestrator never 500s (R-7).
- READABILITY: `is_isi`/`is_peer_reviewed` both `false` is reported as "do not match" although the rule is "both must be true"; `evidence_count` optional means a forgetful caller silently drops the KP evidence listing (→ `T-6` brief: always pass it). Spec file lacks the literal `@akili-spec` tag (cosmetic).

| Commit | see below |

### Gate 1 (2026-09-16) — owner decisions

- Continue with wave 2: `T-4 ∥ T-5` (both depend only on `T-1`/`T-3`; disjoint files under `services/quality-assessment/`; **neither edits `bilateral.module.ts`** — provider registration is `T-6`'s, entity registration `T-2`'s, to avoid a shared-file collision).
- `T-2` DB access: owner connects VPN; Leader copied the main checkout `.env` into the worktree (gitignored, verified). `T-2` starts once a TCP probe to `DB_HOST` succeeds.
- **Spec amendment approved:** `design.md` §5 *Grey rule* now matches response evidence by `index` and appends grey entries for omitted payload items (was the literal `evidence[i]`). `tasks.md` `T-6` description carries the rule update as approved scope. Correction closure sweep: forward grep `evidence[i]` / "by position" across the spec folder → only the design paragraph (amended) and this log; backward: `requirements.md` R-3/R-4 already state the intent, no citation asserts the old wording. No ADR overturned (not in the TRD).
- `T-11(a)` (proxy ≥ 65 s in TEST) remains owner-only; required before `T-8`.
- Contract-copy advisories ("in this order", AI-side grey trigger) surfaced to the owner; no change requested at this gate.

### Wave 2 (2026-09-16)

`T-4 ∥ T-5` spawned after gate 1; `T-2` joined once the TCP probe to `DB_HOST` succeeded (VPN up, `.env` copied). Three concurrent workers — within the 3–4 ceiling; disjoint files (`services/quality-assessment/{builder,mappers,fixtures}` · `services/quality-assessment/client` · `entities/ + repositories/ + migrations/ + bilateral.module.ts`), no shared build output. Effort `high` on all three (T-2 would merit `max` per the effort dial for migrations, but the tier is T2 — kept at `high`, review compensates with **parallel lens reviewers**, as the command requires for migration-touching tasks).

### `BIL-QAI-T-5` — AI HTTP client with timeout mapping and body-free logging

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Skills assigned | `nestjs-expert`, `error-handling-patterns` (task list, no deviation) |
| Effort | `high` |
| Files | `services/quality-assessment/bilateral-quality-assessment.client.ts` (+304), `.spec.ts` (+346), `fixtures/ai-response.v0.1.json` (+47) — all new |
| Forward pointers consumed | T-1 advisory → `timeoutMs()`/`timeoutSeconds()` exposed for `constraints.timeout_seconds` · T-3 advisory → schema check requires `sections` (five keys, `strengths`/`issues` arrays), `evidence[]` with `index`, verdict enums |

**Attempt 1** — Implementer (sonnet). Verification (verbatim excerpts): `npx jest … --testPathPattern="bilateral-quality-assessment.client"` → `Test Suites: 1 passed · Tests: 10 passed`; `grep -n "JSON.stringify" …client.ts` → none; eslint quiet clean; `tsc --noEmit` clean (Leader re-ran after T-2 saw a transient TS2339 in the spec mid-edit: clean). Public API: `timeoutMs()`, `timeoutSeconds()`, `isConfigured()`, `assess(payload, {resultId}) → AiClientOutcome` (`ok | not_configured | timeout | http_error | malformed`, never throws). One `Logger` line per call, template `event=bilateral_quality_assessment_client …`. Axios `timeout` + `Promise.race` guard at the same ms. No `Not Done`.

Review mode: **parallel lens reviewers** (security surface — secrets in logs): Reviewer A = RISK + RELIABILITY, Reviewer B = READABILITY + RESILIENCE, both gating on spec conformance.

### `BIL-QAI-T-2` — Entity, repository and pruned migration for `bilateral_quality_assessments`

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Skills assigned | `nestjs-expert` (task list, no deviation) |
| Effort | `high` (T2 tier cap; migration correctness compensated by parallel lens review) |
| Files | `entities/bilateral-quality-assessment.entity.ts` (+152), `repositories/bilateral-quality-assessment.repository.ts` (+34, new folder), `bilateral.module.ts` (+6: import, `forFeature`, provider), `src/migrations/1789566953005-BilateralQualityAssessments.ts` (+160) |

**Attempt 1** — Implementer (sonnet). Migration generated against the dev DB (VPN) and **pruned**: the generator emitted drift for **31 unrelated tables** (ai_review_*, bilateral_ai_*, clarisa_project*, clarisa_global_unit*, notifications, otp_challenges, result, result_*, results_*, template, user_notification_settings, users, webhook_delivery) — all removed; only `bilateral_quality_assessments` kept verbatim (1 `CREATE TABLE`, 2 FK `ALTER TABLE`; `down` = 2 drop FK, 2 drop index, 1 drop table). Verification (verbatim excerpts): `npm run migration:check` → `Pending: 1 — BilateralQualityAssessments1789566953005` (**expected**: generated, not run; the owner runs migrations — memory rule; the check is green once applied); `tsc --noEmit` clean for the task's files; `grep -c "createTable\|CREATE TABLE"` = 1; `grep "new Date"` in the entity → none; eslint clean. Deviations recorded by the Implementer: composite index `(result_id, created_at)` **ascending** (TypeORM `@Index` has no per-column DESC precedent in this repo; `findLatestByResultId` orders `created_at DESC, id DESC` explicitly); `version_id` plain nullable bigint, no FK (design §3.1 marks no FK); repository provided but not exported (sibling pattern). No `Not Done`.

Leader note: **`migration:check` green requires the owner to run the migration on the dev DB** (`npm run migration:run`) — raised at gate 2. Review mode: **parallel lens reviewers** (migration surface).

**T-5 attempt 1 verdicts.** Reviewer A (RISK+RELIABILITY) → **PASS** — every log path traced (two `Logger` statements, ids/status/elapsed only; `classify()` reads only `error.code`/`response.status`); privacy test is behavioural (the `http_error` case embeds the host in `error.message` and the test proves it never surfaces); timeout proven at 4999 ms unsettled / 5000 ms `timeout`; schema check meets the Leader constraints; fixture matches the contract Response block key-for-key.
Reviewer B (READABILITY+RESILIENCE) → **FAIL**:
> 1. Outbound body missing `contract_version` (and `constraints.timeout_seconds` only reachable via a collaborator that does not exist yet); `QualityPayload` has no `contract_version`. Violates contract Request block / design §4.5. Remediation: set at call time next to `request_id`, or assign to T-4/T-6 and record ownership.
> 2. `score` never validated nor normalised; JSDoc defers to "callers" that do not exist. `"68"` or `900` would reach `overall_score tinyint`. Violates the Leader constraint for T-5 backed by contract §*Optional score* and design §3.1. Remediation: `sanitizeScores` keeping only integers 0–100; two spec cases.

**Leader adjudication:** Issue 1 → **out of T-5 scope, owned by `T-4`** (builder sets `contract_version: '0.1'` and `constraints.timeout_seconds` from opts; `QualityPayload` gains `contract_version` — instruction sent to the T-4 Implementer mid-run). Design §5 *Hash* keeps `contract_version` inside the hash (a contract bump ⇒ fresh assessment) — Reviewer B's counter-argument recorded, design not changed. Issue 2 → **in scope** (Leader constraint in the brief). Rework attempt 2 (effort `xhigh`) on issue 2 only; one advisory typo ("four colours") folded in as a one-word fix in the same file.

ADVISORY (T-5, recorded, not gating): A: pre-existing leak in `bilateral-ai/services/bilateral-ai-text-mining.service.ts:37-57` (logs request/response bodies and host + axios message) — **outside this spec; needs its own ticket**; guard `setTimeout` never cleared on success (pending 60 s timer, hence `--forceExit`); Logger spy covers log/warn/error only and asserts `length > 0` not `5`; outbound request config (URL path, `X-API-Key`, Axios timeout) not asserted; `isValidAiResponse` predicate wider than its checks (`request_id`, `summary`, `comments`, `reason` unchecked) → **T-6/T-7 must not assume them**. B: `SECTION_KEYS` duplicated from the rules file (export + import instead); 2xx `text/html` maps to `malformed` but untested; no `maxContentLength` bound (design §8 ≤ 32 KB budget); observable not unsubscribed on guard timeout (bounded only by the equal Axios timeout — comment it); default-timeout and trailing-slash-trim branches untested; `http_status?` offered on `timeout`/`not_configured` where always absent. → `T-6` brief: pass one `requestId` end-to-end (the client currently mints its own and overwrites the builder's).

**T-5 attempt 2** — Implementer (sonnet, effort `xhigh`). Files: client + spec only. Added `sanitizeScore`/`sanitizeScores` (integer 0–100 kept, anything else → `null`, new object, applied after `isValidAiResponse` and before `outcome: 'ok'`), removed the "callers treat it as absent" JSDoc, "four colours" → "three". Spec +3 cases (68 kept; `"68"` → null; section `900` → null; outcome `ok` in all). Mechanical compile fix: `buildPayload()` gained `contract_version: '0.1'` because T-4 made the field required on `QualityPayload` mid-run. Verification (verbatim): `Tests: 13 passed`; `grep JSON.stringify` → none; eslint clean; `tsc | grep client` → nothing. Re-review sent to Reviewer B with the exact attempt-1 → attempt-2 delta.

Reviewer B (re-review of the delta) → **PASS**. Summary: "Issue 2 is fixed at the correct boundary with real behavioural coverage (valid score kept, string and out-of-range sanitized to `null`, outcome stays `ok` in all three), and the 'four colours' advisory is applied; Issue 1 is out of scope per the Leader's adjudication to T-4." New advisories: `sanitizeScores` rebuilds `sections` from the five known keys, so an **unknown sixth section key is dropped on the `ok` path** (matches T-9's "unknown key ignored" rule — noted here so `T-6`/`T-9` do not rediscover it); no test asserts a valid *section* score survives (fixture `general_information.score: 91` unasserted).

| Field | Value |
|---|---|
| **Final status** | **PASS** (attempt 2 of 3; Reviewer A PASS on attempt 1, Reviewer B PASS on attempt 2) |
| Requirements covered | `BIL-QAI-R-7` *Timeout* (client outcome) and *Service not configured*; NFR *Privacy / secrets*; `BIL-QAI-AC-15` |
| Final verification | `Tests: 13 passed`; no `JSON.stringify`; eslint clean; tsc clean for the client files |
| Decisions | `score` sanitized to `null` (not key-dropped) — matches `number \| null` types and nullable columns · `contract_version`/`constraints` are the builder's (T-4), client sends `{...payload, request_id}` |
| Review rounds consumed (budget) | 1 extra round (T-1 and T-5 each needed one rework) — cumulative rework rounds: 2 of the 5-round tripwire |
| Commit | chained after T-4 (spec depends on `QualityPayload.contract_version` introduced by T-4) |

**T-2 attempt 1 — Reviewer A (RELIABILITY+RISK) → PASS.** All 19 columns match design §3.1 in type/length/nullability/order; `created_at` SQL-defaulted in entity and DDL; FK types match referenced PKs (`result.id` bigint, `users.id` int); `ON DELETE NO ACTION` on both FKs (correct for audit history); `down` reverses `up` with byte-identical names in the right order; exactly one table altered; ascending composite index judged conformant (MySQL serves `ORDER BY created_at DESC` via backward scan; a DESC index would re-open generator drift). `migration:check` `Pending: 1` carried as the open gate for the server group close (owner runs it).
ADVISORY (A): `down` has no `IF EXISTS` guards — a partially applied `up` would leave the table after a failed revert; sibling migration uses a single `DROP TABLE IF EXISTS` (more robust) · `sections`/`evidence` are `json NOT NULL` with no default → **T-6 must insert `sections: {}` / `evidence: []` explicitly on the `running` row** (else `ER_NO_DEFAULT_FOR_FIELD`), and the TS type `Record<QualitySectionKey, …>` forces a cast for that row · **`decided_at` must be stamped from SQL (`NOW()`), never a JS `Date`** (mysql2 local-time rule) → T-7 brief · `migration:revert` destroys the audit trail (disclosed in header; design §11 accepts) · `IDX_…_result_id` redundant with the composite index (kept: design asks for it).

**T-2 attempt 1 — Reviewer B (READABILITY+RESILIENCE) → PASS.** Column set 1:1 with §3.1; unions match spec value lists verbatim; verdict/section/evidence types imported from the rules file; `@akili-spec` on entity and migration; module registration mirrors the `BilateralHandoffCode` sibling, three additive hunks only; `findLatestByResultId` correct and T-6's other reads (latest non-running, `FOR UPDATE` lock) buildable on the inherited surface.
ADVISORY (B): **`bigint` columns (`id`, `result_id`, `version_id`) come back from mysql2 as strings** — T-7's "same result / same assessment id" checks must coerce with `Number(...)` on both sides (`where` comparisons are unaffected); `had_outstanding_flags` is `tinyint` → test truthiness, never `=== true` · `sections`/`evidence` `json NOT NULL` need `{}`/`[]` placeholders on the `running`/`not_configured` inserts (or a follow-up making them nullable; decide in T-6) · status/decision literals: consider `const` value maps or string enums before T-6 spreads them · migration header says "never updated" while the entity JSDoc correctly says "after `decided_at` is stamped" — align wording (cosmetic) · entity JSDoc does not name `BaseEntity`/`Auditable` explicitly · `IDX_…_result_id` redundant with the composite (kept per design).

| Field | Value |
|---|---|
| **Final status** | **PASS** (attempt 1 of 3; both lens Reviewers PASS) |
| Requirements covered | `BIL-QAI-R-8` (persistence fields); NFR *Backwards compatibility* (additive table) |
| Final verification | `tsc --noEmit` clean; `createTable` count 1; no `new Date`; eslint clean; `migration:check` → `Pending: 1` (this migration) — **open gate: owner runs `npm run migration:run` on the dev DB before the server group closes** |
| Decisions | Ascending composite index accepted (backward scan; DESC would re-open generator drift) · `version_id` no FK · repository not exported |
| Forward pointers | → `T-6`: insert `sections: {}` / `evidence: []` on non-terminal rows; pass `evidence_count` to `evaluateKpRule`; single `requestId` end-to-end; unknown sixth section key is dropped by the client · → `T-7`: `decided_at` from SQL `NOW()`; `Number(...)` coercion on bigint comparisons; truthiness on `had_outstanding_flags` |
| Commit | see below |

