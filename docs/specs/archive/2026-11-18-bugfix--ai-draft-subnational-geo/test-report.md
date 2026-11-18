# Test Report — `bugfix/ai-draft-subnational-geo`

**Status: PASS.** Every functional requirement (ADS-FR-1..FR-6), every acceptance criterion (ADS-AC-1..AC-5) and both NFRs have passing test evidence. 14 targeted tests, 1806/1806 in the `bilateral` suites, no product bugs, one accepted gap (manual check on QA).

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Ticket | INC-168504 |
| Date | 2026-11-18 |
| Branch / base | `qa-development-2026-ss` @ `385d46e44` + uncommitted spec diff |
| Leader / Tester | Claude Code — `opus`, inline (see Summary) |
| Implementer model (code under test) | `sonnet` (`akili-implementer` wrapper) |

## 2. Summary

| Item | Value |
|---|---|
| Suites planned | 1 — backend unit (`bilateral.service.spec.ts`). No frontend, integration or E2E scope: the change is one private helper on the server's promote path |
| Testers spawned | 0 — **run inline by the Leader**. Lite depth, single suite (Deployment Rule). The `akili-tester` wrapper is bound to `sonnet`, the Implementer's model, so the Tester model rule rules it out; the Leader runs on `opus` |
| Author TDD tests | Cases a–g (ADS-T-1) **cited, not rewritten** |
| New tests | 6 (h–m) for scenarios a–g leave open |
| Product bugs | 0 |
| Skills | `nestjs-expert`, `tdd` per the Skill Map (not loaded: inline, existing harness reused) |

### Commands run

| Command | Result |
|---|---|
| `npx jest src/api/bilateral/bilateral.service.spec.ts -t "Sub-national geo" --coverage=false --forceExit` | `Tests: 276 skipped, 14 passed, 290 total` |
| `npx jest --testPathPattern=bilateral --maxWorkers=2 --silent --reporters=summary --forceExit --coverage=false` | `Test Suites: 51 passed, 51 total` · `Tests: 1806 passed, 1806 total` |
| `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| `npx eslint src/api/bilateral/bilateral.service.spec.ts --quiet` | exit 0 (after `--fix` of 3 prettier line-wrap errors in the new tests) |
| Mutation check (temporary, restored): remove the code-prefix fallback, the root-level collection and the empty-codes early return | `Tests: 3 failed, 276 skipped, 11 passed` — failures exactly `h`, `j`, `k`; production file restored and confirmed (`grep -c` = 1 for each line) |

## 3. Backend Unit Tests

File: `onecgiar-pr-server/src/api/bilateral/bilateral.service.spec.ts`, describe `populateResultFromExtractedMds — Sub-national geo (INC-168504)`. The real `handleRegions` / `handleCountries` / `handleSubnationals` / `lookupSubnationalAreas` run; only repositories and the logger are mocked.

| Case | Origin | Proves | Result |
|---|---|---|---|
| a. Reported (CO / CO-CUN) | ADS-T-1 | Scope 5, CO-CUN written, no warn | ✅ |
| b. Two countries | ADS-T-1 | Scope 5, both codes written | ✅ |
| c. None resolves | ADS-T-1 | Scope 4, country kept, one warn, no subnational writes | ✅ |
| c2. None resolves, 2 countries | ADS-T-1 | Scope 3 | ✅ |
| d. Partial | ADS-T-1 | Scope 5, only CO-CUN, one warn naming XX-NOPE | ✅ |
| e. Foreign code | ADS-T-1 | KE-30 on a CO draft → unresolved → scope 4 | ✅ |
| f. No half-write | ADS-T-1 | CLARISA failure → `updateCountries` never called, no throw | ✅ |
| g. Scope 4 untouched | ADS-T-1 | No subnational lookup, scope 4 | ✅ |
| h. None sent | `/akili-test` | Scope 5 + no codes → scope 4, **no CLARISA query** (no `In([])`), one warn | ✅ |
| i. Warn content | `/akili-test` | The single warn names `result 11` and every unresolved code; not `geo_focus skipped` | ✅ |
| j. Code-prefix backup | `/akili-test` | CLARISA row with null `country_iso_alpha_2` kept via `CO-` prefix | ✅ |
| k. Root-level codes | `/akili-test` | Root `subnational_areas` codes collected with nested ones | ✅ |
| l. One query | `/akili-test` | Codes from two countries (with a duplicate) → exactly one `code IN` query, de-duplicated | ✅ |
| m. Late geo error | `/akili-test` | `updateCountries` rejects after resolution → `geo_focus skipped` warn, no throw, scope 5 not saved | ✅ |

## 4. Frontend Unit Tests

Not in scope — backend-only bugfix (design §8).

## 5. Integration Tests

Not in scope. The fix calls no new endpoint and changes no SQL beyond one TypeORM `find`; the real-DB behavior is covered by the manual check in §9.

## 6. E2E Tests

Not in scope — no user-flow change.

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Test Type | Test | Result | Notes |
|---|---|---|---|---|---|
| ADS-FR-1 | Reported case (regression) | Unit | a | ✅ | |
| ADS-FR-1 | BUT must NOT log `geo_focus skipped` | Unit | a (`warn` not called), i | ✅ | |
| ADS-FR-1 | Several countries | Unit | b | ✅ | |
| ADS-FR-2 | No code resolves (none found) | Unit | c, c2 | ✅ | |
| ADS-FR-2 | None sent | Unit | h | ✅ | New |
| ADS-FR-2 | BUT must NOT leave scope null | Unit | c, c2, h (scope saved 4/3) | ✅ | |
| ADS-FR-3 | Partial resolution | Unit | d, i | ✅ | |
| ADS-FR-4 | Code of a non-draft country | Unit | e | ✅ | |
| ADS-FR-4 / DD-3 | Null `country_iso_alpha_2` → code prefix | Unit | j | ✅ | New |
| ADS-FR-5 | Resolve before any write | Unit | f | ✅ | |
| ADS-FR-5 | AND IT MUST keep warn / no throw after that point | Unit | m | ✅ | New |
| ADS-FR-6 | Scope ≠ 5 unchanged | Unit | g | ✅ | |
| ADS-FR-6 | Bilateral API create/resubmit unchanged; BUT must NOT change `lookupSubnationalAreas` | Unit (regression) | existing 51 `bilateral` suites, 1806 tests | ✅ | Shared handlers absent from the diff (verified at ADS-T-2 review) |
| Design §7 step 1 | Root-level codes collected | Unit | k | ✅ | New |
| NFR Performance | ≤ 1 extra CLARISA query | Unit | l | ✅ | New |
| NFR Observability | Dropped codes in one warn with the result id | Unit | i | ✅ | New |
| ADS-AC-1 … AC-5 | — | Unit | a / c,c2,h / d / e / g + suite | ✅ | |

## 8. Remediation

None required — no failures.

## 9. Accepted Gaps

| Gap | Why not automated | Manual verification |
|---|---|---|
| Real CLARISA data + real MySQL collation | Unit tests mock the repositories; the repo has no DB-backed integration harness for the promote path | On QA after deploy, promote one Sub-national draft (e.g. `bilateral_ai_drafts.id` 1, KH) and check: `results.geographic_scope_id = 5`, a `result_country` row for KH, and its `result_country_subnational` rows for KH-20 / KH-6 / KH-21 / KH-2 |
| Lowercase codes / iso (case sensitivity) | Not a requirement; recorded as an ADS-T-2 advisory only. Current AI data is upper-case (P-7 sample) | — |
