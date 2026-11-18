# Execution Log — `bugfix/ai-draft-subnational-geo`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Ticket | INC-168504 |
| Branch | `qa-development-2026-ss` |
| Base commit | `385d46e44` |
| Approval Mode | gated |
| Leader | Claude Code — `opus` (T1) |
| Implementer / Reviewer wrappers | `.claude/agents/akili-implementer.md` / `akili-reviewer.md` |
| Persona drift (`akili doctor --agents`, 2026-11-17) | leader `primary-instructions` OUTDATED (2.36.0); tester `context-alignment` CUSTOM-EDITED; implementer + reviewer CURRENT — reported to the user, no fix applied |
| Started | 2026-11-17 |

## 2. Task Execution History

### Pre-task — P-7 settled (ADS-T-1 first step)

- **Date:** 2026-11-17 · **Run by:** user (QA DB, screenshots shared in session)
- **CLARISA format:** `clarisa_subnational_scopes` CO rows: `CO-AMA` (866) … `CO-CAU` (875), `country_iso_alpha_2 = CO`, `is_active = 1`. `CO-CUN` present (country CO).
- **KH (Cambodia):** 24 rows `KH-1` … `KH-25`, **no leading zeros**, all `is_active = 1`, `country_iso_alpha_2 = KH`. `KH-12` absent (ids 2,723 … 2,769).
- **Stored AI drafts (`bilateral_ai_drafts`, scope_code 5):**
  - id 1: `KH` → `["KH-20","KH-6","KH-21","KH-2"]`
  - id 2: `KH` → `["KH-15","KH-2","KH-1","KH-17","KH-6"]`
  - id 5: `KH` → `["KH-5","KH-4","KH-8","KH-15"]`
  - Shape confirms requirements §2: nested per country, ISO 3166-2 strings, no root `subnational_areas`.
- **Outcome:** every AI code in the sample matches a CLARISA `code` byte-for-byte → **P-7 VERIFIED**. No Pivot. `KH-12` absence is covered by ADS-FR-3 (partial resolution).

### ADS-T-1 — Regression tests (red first) — PASS

- **Date:** 2026-11-17 · **Final status:** PASS · **Attempts:** 1
- **Attempt 1**
  - files changed: `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts` (+219, new describe `populateResultFromExtractedMds — Sub-national geo (INC-168504)` after "who leads")
  - Implementer verification: targeted `-t "Sub-national geo"` → a, b, d RED `Expected: ObjectContaining {"geographic_scope_id": 5} / Number of calls: 0`; c RED `Expected value: 4 / Received array: []`; c2 RED `Expected value: 3 / Received array: []`; e RED `Expected value: 4 / Received array: []`; f RED `updateCountries Expected number of calls: 0 / Received number of calls: 1`; g GREEN. Full `--testPathPattern=bilateral`: `Test Suites: 1 failed, 50 passed, 51 total` · `Tests: 7 failed, 1793 passed, 1800 total` (the 7 = a–f). `tsc --noEmit` exit 0.
  - Evidence re-run (Leader-inline, targeted command): **VERIFIED** — `Tests: 7 failed, 276 skipped, 1 passed, 284 total`, same assertion messages.
  - Reviewer verdict: **PASS** (checklist) — all 8 cases + table assertions present; traced green against a correct design §7 implementation; reds are behavioral, not mock setup; asserts behavior, not helper internals.
  - runtime events: none
- spawns: implementer 34 calls, 136937 tokens, ended complete; reviewer not reported by host
- **ADVISORY (4R, recorded only — not tasks):**
  - RELIABILITY: FR-2 "none sent" branch (scope 5 country with no `subnational_areas`) untested; a helper could call `In([])`.
  - READABILITY: warns in c/d not asserted to include the result id (NFR observability).
  - RELIABILITY: `matchWhere` only understands `In(...)` + plain values; other operators silently match nothing.
  - READABILITY: case b checks the union of written codes (current all-to-all writer).
- **Requirements covered:** ADS-FR-1..FR-6 (pinned by tests a–g; behavior lands in ADS-T-2)
- **Decisions made:** T1 diff (230 lines) delivered to the Reviewer by scratchpad path rather than inline — deviation from the ≤300-line inline rule, same content. Commit deferred: root `AGENTS.md` §6 "Do not commit unless the user explicitly asks" overrides the execute Step 3 commit; offered at closure.
- **Issues encountered:** unattributed working-tree changes from another session (client portfolio-overview files, server `results-framework-reporting.*`, `result.repository.*`, `detail-filters/`) — not touched, excluded from this spec's diff. Full bilateral suite takes ~16 min here.
- **Budget running totals:** tasks 1/2 · LOC +219 test / 0 prod (budget ~140 test + ~60 prod) · review rounds 1 (budget 1–2). **BUDGET TRIPWIRE:** total LOC 219 already exceeds the ~200 spec budget after T1 alone (test LOC +56% over ~140); with T2's ~60 prod the projection is ~280 (+40%). Cause: in-line `matchWhere` fixture helper + 8 cases with real handlers (mocks for 7 repositories). Escalated to the user.
- **Gate:** STOPPED — budget tripwire (never auto-approved).
- **Final verification:** a–f red, g green at `385d46e44` + spec diff.
- **Tripwire resolution (2026-11-17):** user chose option 1 — "acepta el exceso y sigue con T2". Revised budget: ~280 LOC total (~220 test + ~60 prod), review rounds 1–2 unchanged. User away; routine gates pre-approved, exceptions (HALT, Pivot, new tripwire, FATAL_FAIL, destructive) still stop.

### ADS-T-2 — Normalize AI Sub-national geo on promote — PASS

- **Date:** 2026-11-17 · **Final status:** PASS · **Attempts:** 1
- **Attempt 1**
  - files changed: `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts` (+64 / -3: new private `resolveAiSubnationalAreas` with `// @akili-spec bugfix/ai-draft-subnational-geo`; scope-5 branch in the geo block of `populateResultFromExtractedMds`). Spec file untouched by this task.
  - Implementer verification: targeted `Tests: 276 skipped, 8 passed, 284 total`; full bilateral `Test Suites: 51 passed, 51 total` · `Tests: 1800 passed, 1800 total`; `tsc --noEmit` clean; `eslint --quiet` rc=0 (prettier auto-fix on the helper return-type line). Falsifier mutation 2 (country filter forced `true`) → `Tests: 1 failed, 276 skipped, 7 passed`, file restored (`grep -c "return true ||"` = 0). Mutation 1 inherited from ADS-T-1 red run.
  - Evidence re-run (Leader-inline): **VERIFIED** — targeted `Tests: 276 skipped, 8 passed, 284 total`; `tsc rc=0`; `eslint rc=0`; full bilateral `Test Suites: 51 passed, 51 total` · `Tests: 1800 passed, 1800 total`.
  - Reviewer verdict: **PASS** (full, 4R sweep) — resolution awaited before `handleRegions`/`handleCountries`; scope ≠ 5 and scope-5-without-countries paths pass identical arguments to before; early return avoids `In([])`; fallback 4/3 reaches both `handleCountries` and the saved `geographic_scope_id`; DD-3 filter with code-prefix backup; one warn with `result <id>` and every unresolved code; shared handlers, DTOs and payload doc not in diff.
  - runtime events: none
- spawns: implementer 35 calls, 141627 tokens, ended complete; reviewer 6 calls, 73393 tokens, ended complete
- **ADVISORY (4R, recorded only — not tasks):**
  - RELIABILITY: TS matching is case-sensitive while MySQL `IN` is case-insensitive — a lowercase code (`co-cun`) resolves but is also reported unresolved; a lowercase `iso_alpha_2` would drop a valid area. Fix candidate: `toUpperCase()` normalization.
  - RELIABILITY: mixed drafts (some countries with `iso_alpha_2`, some id/name-only) drop codes of the id-only countries — per DD-3 as written; worth a design note.
  - RESILIENCE: pass-through `{id}`/`{name}` objects are not pre-validated, so an invalid name still throws after countries are written (pre-existing; FR-5 covers codes only).
  - READABILITY: unrecognized entries are silently skipped, not listed in the warn.
  - READABILITY: the "zero codes sent" fallback warn prints an empty list `[]`; wording like "no sub-national codes sent" would triage better.
- **Requirements covered:** ADS-FR-1..FR-6, ADS-AC-1..AC-5, NFR performance (≤1 extra query) and observability (warn with result id).
- **Decisions made:** FR-2 "none sent" handled by an early return before the `find` (no new test, per narrow-never-widen). Diff delivered to the Reviewer by scratchpad path. Commit deferred per root `AGENTS.md` §6.
- **Issues encountered:** none in task scope. Other session's working-tree changes still untouched.
- **Budget running totals:** tasks 2/2 · LOC 283 added / 3 removed (219 test + 64 prod) vs revised ~280 (original ~200, overrun accepted by the user) · review rounds 2 (budget 1–2) — within the revised budget.
- **Gate:** auto-approved (pre-approved mode).
- **Final verification:** full bilateral 1800/1800 green; tsc + eslint clean; shared handlers unchanged.

## 3. Summary

| Item | Value |
|---|---|
| Tasks | 2/2 PASS, 1 attempt each, 0 HALT / Pivot / waiver / skip |
| Diff | `bilateral.service.ts` +64/-3 · `bilateral.service.spec.ts` +219 |
| Verification | full `--testPathPattern=bilateral` 51 suites / 1800 tests green; tsc clean; eslint quiet |
| P-7 | VERIFIED on QA DB (CO and KH codes match CLARISA byte-for-byte) |
| Budget | LOC overran original ~200 (tripwire after T1); user accepted revised ~280; final 283 |
| Pending | Commit (awaiting the user's explicit ask); OQ-2 backfill (out of spec); 9 advisories recorded above for a possible follow-up proposal |
