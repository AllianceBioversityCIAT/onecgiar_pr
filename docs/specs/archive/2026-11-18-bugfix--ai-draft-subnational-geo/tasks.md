# Module Spec — `tasks.md`

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Type / Depth | Bug (Bug Mode) · Lite |
| Ticket | INC-168504 |
| Requirements | [`requirements.md`](./requirements.md) · Design: [`design.md`](./design.md) |
| Budget | 2 tasks · ~200 LOC (60 prod + 140 test) · 1–2 review rounds |
| PR strategy | Single PR (< 400 LOC) |

**Verification command (server):** `npx jest --testPathPattern=bilateral --maxWorkers=2 --silent --reporters=summary --forceExit` · type-check `npx tsc --noEmit -p tsconfig.json`

---

## ADS-T-1 — Regression tests (red first)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | none |
| Requirements | ADS-FR-1 (both scenarios), FR-2, FR-3, FR-4, FR-5, FR-6 |
| Design | §7 helper table + geo block table |
| Skills | `nestjs-expert`, `tdd` |
| Review | `checklist` — test-only diff, behavior pinned by assertions |

**Scope**
- Backend route: `nestjs-expert` · test-first
- **First step — settle P-7:** compare `clarisa_subnational_scopes.code` with 3 stored AI `extracted_mds` (QA DB, user-run query). Record the outcome in `execution.md`. If codes differ in format → STOP, Pivot Protocol.
- New `describe('populateResultFromExtractedMds — Sub-national geo (INC-168504)')` in `bilateral.service.spec.ts`. Real `handleRegions` / `handleCountries` / `handleSubnationals` / `lookupSubnationalAreas`; only repositories mocked (`_geoScopeRepository`, `_clarisaCountriesRepository`, `_resultCountryRepository`, `_clarisaSubnationalAreasRepository`, `_resultCountrySubnationalRepository`, `_resultRepository`, `logger`).
- Cases:

| Case | Fixture | Asserts | Req |
|---|---|---|---|
| a. Reported (regression) | scope 5, `[{iso_alpha_2:'CO', subnational_areas:['CO-CUN']}]`; CLARISA has `CO-CUN` (country CO) | `_resultRepository.save` with `geographic_scope_id: 5`; subnational writers receive `CO-CUN`; `logger.warn` not called | FR-1 |
| b. Two countries | CO/`CO-CUN` + KE/`KE-30`, both in CLARISA | scope 5; both codes written | FR-1 |
| c. None resolves | CO/`XX-NOPE`; CLARISA returns `[]` | scope 4; `updateCountries` called with CO id; one warn containing `XX-NOPE`; subnational writers not called | FR-2 |
| c2. None resolves, 2 countries | CO + KE, no code resolves | scope 3 | FR-2 |
| d. Partial | `CO-CUN` + `XX-NOPE` | scope 5; only `CO-CUN` written; one warn containing `XX-NOPE` | FR-3 |
| e. Foreign code | draft country CO, code `KE-30` (CLARISA country KE) | treated as unresolved → scope 4, warn | FR-4 |
| f. No half-write | CLARISA subnational `find` rejects | `updateCountries` **not** called; warn logged; promote does not throw | FR-5 |
| g. Scope 4 untouched | scope 4, `[{iso_alpha_2:'CO'}]` | `_clarisaSubnationalAreasRepository.find` not called; scope 4 saved | FR-6 |

**Verification fields**

| Field | Value |
|---|---|
| Falsifier | Revert the T2 change (or replace the helper result with `geoFocus.subnational_areas ?? []`) → a, b, d go red on the `geographic_scope_id: 5` assertion; c/e red on `geographic_scope_id: 4`; f red on `updateCountries` not called. Fixture a diverges from the mutation because the root `subnational_areas` is absent. |
| Red run | Observed 2026-11-17 at `385d46e44` with a temporary probe of case a (real handlers, mocked repos; probe deleted after the run): `× reported case saves scope 5` → `expect(jest.fn()).not.toHaveBeenCalled() … Received number of calls: 1 — "populateResultFromExtractedMds: geo_focus skipped for result 11 — At least one subnational area identifier (id or name) must be provided."` Red on the behavioral assertion, same message as PROD. Cases b–f are observed red by T1 itself. |
| Disqualifier | A red caused by mock setup (`find is not a function`, DI error, timeout) is not a red; only a failure on the `geographic_scope_id` / `warn` / `updateCountries` assertions counts. Case g green before the fix is expected (guard, not regression). |
| Consumers | `bilateral-ai.service.spec.ts` (mocks `populateResultFromExtractedMds` — unaffected, signature unchanged); `bilateral.service.spec.ts:1488` "who leads" suite (no `geo_focus`, unaffected). Grep: `grep -rln "populateResultFromExtractedMds" src --include=*.spec.ts` → 2 files. |

**Done criteria**
- P-7 outcome recorded.
- Cases a–f red on their behavioral assertion against `385d46e44`; g green. Red output quoted in `execution.md`.

---

## ADS-T-2 — Normalize AI Sub-national geo on promote

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S |
| Depends on | ADS-T-1 |
| Requirements | ADS-FR-1..FR-6 |
| Design | §7, DD-1..DD-4 |
| Skills | `nestjs-expert` |
| Review | `full` — data-write ordering and fallback logic |

**Scope**
- Backend route: `nestjs-expert`
- `bilateral.service.ts`: private `resolveAiSubnationalAreas` (design §7 steps 1–5) + scope-5 branch in the geo block of `populateResultFromExtractedMds` (`:5641-5668`). Resolution before any write; existing `try/catch` kept.
- **Must NOT** touch `lookupSubnationalAreas`, `handleSubnationals`, `handleCountries`, `validateGeoFocus`, the `/api/bilateral/*` DTOs or `bilateral-result-summaries.en.md`.

**Verification fields**

| Field | Value |
|---|---|
| Falsifier | Same as T1: removing the scope-5 branch turns cases a–f red. Second mutation: drop the country filter (DD-3) → case e red (scope 5 instead of 4). |
| Red run | Inherited from ADS-T-1 (same tests). |
| Disqualifier | Any pre-existing `bilateral` suite newly red = regression, not a pass. `tsc` errors count even if Jest is green. |
| Consumers | `bilateral-ai.service.ts:854` (sole caller; signature unchanged). |

**Done criteria**
- T1 cases a–g green; full `--testPathPattern=bilateral` green; `tsc --noEmit` clean; ESLint quiet on the file.
- `git diff --stat` shows only `bilateral.service.ts` + `bilateral.service.spec.ts`.
- Diff of `lookupSubnationalAreas` / `handleSubnationals` / `handleCountries` empty.

---

## Coverage map

| Clause | Owner |
|---|---|
| FR-1 Scenario "reported case" (incl. BUT no warn) | T1 a → T2 |
| FR-1 Scenario "several countries" | T1 b → T2 |
| FR-2 + BUT not null | T1 c, c2 → T2 |
| FR-3 | T1 d → T2 |
| FR-4 | T1 e → T2 |
| FR-5 + AND IT MUST keep warn/no throw | T1 f → T2 |
| FR-6 + BUT not change lookup | T1 g + T2 Done (empty diff of shared handlers) |
| P-7 UNVERIFIED (High) | T1 first step |
