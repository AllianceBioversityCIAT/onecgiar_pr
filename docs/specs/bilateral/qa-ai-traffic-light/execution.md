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

