# Proposal — AI draft promotion drops the Sub-national geographic scope

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Slug | `ai-draft-subnational-geo` — derived from free-text argument |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | INC-168504 (number given by the user; `INC-` prefix follows the branch's commit convention — confirm) |
| Branch | `qa-development-2026-ss` |
| Requirement source | Diagnosis supplied in the brief, re-checked against the code in this session |
| Depends on | none |
| Parallel-safe | yes — touches only the AI promote path in `bilateral.service.ts`; no migration, no `/api/bilateral/*` contract change |
| Status | Proposed — 2026-11-17 |

## 2. Intent

When an AI draft with a Sub-national geographic focus is promoted, the result must keep that scope, its countries and the subnational areas the AI read. Today it keeps none of the scope and only part of the countries.

## 3. Problem / Current Behavior

| # | Current behavior | Evidence |
|---|---|---|
| P1 | The AI service sends Sub-national focus nested per country: `countries:[{iso_alpha_2:"CO", subnational_areas:["CO-CUN"]}]` — ISO 3166-2 codes as strings, no root `subnational_areas`. | Client already reads that shape: `onecgiar-pr-client/.../draft-result-card.component.ts:37-40` (`geo_focus.countries[].subnational_areas`, keyed by `iso_alpha_2`) |
| P2 | `populateResultFromExtractedMds` passes the **root** `geoFocus.subnational_areas ?? []` (empty) to `handleCountries`. | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:5649-5655` |
| P3 | `handleCountries` writes the countries first (`updateCountries`, `handleResultCountryArray`), then `handleSubnationals` → `lookupSubnationalAreas([])` throws `BadRequestException("At least one subnational area identifier…")`. | `bilateral.service.ts:6623-6643`, `:6743`, `:6800-6803` |
| P4 | The catch only logs `geo_focus skipped`; the `save({ geographic_scope_id })` after `handleCountries` never runs. Result: no geographic scope, countries half-written. | `bilateral.service.ts:5656-5667` |
| P5 | Even with strings in the right place, `lookupSubnationalAreas` matches only `{id}` / `{name}` objects, so raw ISO codes would still resolve nothing. | `bilateral.service.ts:6787-6803` |
| P6 | PROD impact: 81 of 192 AI drafts (42%) are Sub-national. | Figure from the brief — `UNVERIFIED — confirm at source before relying on it` (owner: requester, PROD query) |

## 4. Proposed Outcome

- A promoted Sub-national draft gets `geographic_scope_id = 5`, its countries, and the subnational areas whose ISO 3166-2 codes exist in `clarisa_subnational_scopes.code`.
- If **no** code resolves, the result is saved at country level (scope 4, or 3 when several countries) with a `warn` naming the unresolved codes — never left without a scope.
- Codes that do not resolve while others do are dropped with a `warn`; the resolved ones are kept.
- No geography is half-written: subnational resolution happens **before** any country/subnational write.

## 5. Scope

- `populateResultFromExtractedMds` geo block only (the AI promote path).
- A small private helper that: collects subnational entries from `countries[].subnational_areas` (plus root `subnational_areas`, if present, for tolerance); accepts strings or `{id|name|code}` objects; resolves strings against `clarisa_subnational_scopes.code` to `{ id }`; decides scope 5 vs the country-level fallback.
- Regression tests in `bilateral.service.spec.ts`.

## 6. Non-Goals

- No change to `lookupSubnationalAreas`, `handleSubnationals`, `handleCountries`, `validateGeoFocus`.
- No change to the `/api/bilateral/*` contract (root `subnational_areas` with `{id|name}`) or to `bilateral-result-summaries.en.md`.
- No change to the AI service payload.
- **Out of scope (separate ticket):** `handleSubnationals` writes every subnational to every country of the result (`bilateral.service.ts:6747-6777`); also affects the bilateral API.
- No backfill of already-promoted results (see OQ-2).

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Result submitters promoting AI drafts | Geography section arrives filled instead of empty |
| `BilateralAiService` promote (`bilateral-ai.service.ts:854`) | Only caller of `populateResultFromExtractedMds` — no signature change |
| `bilateral.service.spec.ts` (`populateResultFromExtractedMds` suites, `:1488`) | New regression cases |
| Related spec | `docs/specs/bugfix/bilateral-geography-extra-metadata` (bilateral geography; not modified) |

## 8. Visual Reference

- Source: None
- Notes: backend-only fix; the existing geography section and draft card already render the data.

## 9. Bug Diagnosis

### Observed Symptom
A promoted AI draft whose `extracted_mds.geo_focus.scope_code = 5` ends with no geographic scope; the server log shows `populateResultFromExtractedMds: geo_focus skipped for result <id> — At least one subnational area identifier (id or name) must be provided.`

### Reproduction Steps
1. AI draft with `extracted_mds.geo_focus = { scope_code: 5, countries: [{ iso_alpha_2: "CO", subnational_areas: ["CO-CUN"] }] }`.
2. Promote the draft.
3. **Expected:** scope Sub-national, country CO, subnational Cundinamarca. **Actual:** `geographic_scope_id` null, CO row written, no subnational, warn in log.

### Root Cause (confirmed)
Shape mismatch on the AI path only: the code reads subnationals at the root and as `{id|name}` objects (bilateral API contract), while the AI sends them nested per country as ISO code strings. The empty root list makes `lookupSubnationalAreas` throw after countries are written, and the swallowing `catch` skips the scope save. Path confirmed at `bilateral.service.ts:5641-5667 → 6605-6643 → 6733-6743 → 6786-6803`.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -S "geoFocus.subnational_areas"` and `-S "geo_focus skipped"` → only `1038e3129 ✨ feat(bilateral-ai): populate result fields on draft promote` (introduces the bug). `git log --all -i --grep=subnational` → no commit touching this path (`bdc0a75c9` is client display only). `git log --all --oneline --grep="168504"` → no hits. | Not fixed on any branch |
| **Live path?** | `BilateralAiService` promote (`bilateral-ai.service.ts:854`) → `populateResultFromExtractedMds` (`bilateral.service.ts:5605`) → geo block `:5641` → `handleCountries :6605` → `handleSubnationals :6733` (scope 5 branch) → `lookupSubnationalAreas :6786` throws | On the path — root cause confirmed |
| **Siblings on the same state** | Bilateral API create `bilateral.service.ts:620-645` and preflight `:5194-5206` read root `subnational_areas` as `{id|name}` — correct for their contract. `handleSubnationals` all-to-all assignment `:6747-6777` | API siblings unaffected; all-to-all is a separate, out-of-scope defect |
| **Downstream consumers** | `bilateral-ai.service.ts:854` (sole caller); `bilateral-ai.service.spec.ts` mocks it; `draft-result-card.component.ts` reads `extracted_mds` directly (unaffected); geography green-check reads saved rows | No contract change; consumers gain data |

- Data integrity: today's half-write leaves results with countries but no scope. The fix resolves before writing, so a failure leaves geography consistently empty or consistently country-level.
- Security: none.

### Fix Strategy
Smallest safe correction: normalize the AI `geo_focus` into the shape the existing handlers already accept, inside `populateResultFromExtractedMds` only. Route: `/akili-specify` (Lite) in **Bug Mode** — logic and data change, regression test red → green.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Normalize on the AI path (recommended)** | Helper collects nested + root subnationals, resolves ISO strings via `clarisa_subnational_scopes.code` → `{id}`, picks scope 5 or the country-level fallback, then calls the unchanged handlers | Touches one method; API and shared lookups untouched |
| B. Teach `lookupSubnationalAreas` to match `code` | Add `code: In(codes)` to the shared lookup | Changes behavior of the bilateral API and the resubmission preflight — out of the agreed scope |
| C. Make the AI service send the API shape | Change the producer | Outside this repo; 192 existing drafts keep the old shape |

## 11. Recommended Approach

Option A. It fixes all existing drafts as stored, keeps every shared handler and the public contract byte-identical, and the fallback guarantees a scope is always saved.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R1 | ISO 3166-2 codes from the AI may not match `clarisa_subnational_scopes.code` format exactly — `UNVERIFIED — confirm at source before relying on it` (owner: implementer, sample query on PROD/QA). Mitigation: fallback to country level + warn. |
| R2 | Multi-country Sub-national drafts: the out-of-scope all-to-all defect will attach every area to every country. Visible after this fix; tracked separately. |
| R3 | A resolved code whose `country_iso_alpha_2` is not among the draft's countries — decide in specify whether to drop it (recommended) or keep it. |
| OQ-1 | Ticket 168504: is the prefix `INC-`? Is there a Jira description or acceptance criteria to pull in? |
| OQ-2 | Backfill the Sub-national results already promoted without scope (re-run the geo block from stored `extracted_mds`)? Not in this spec unless requested. |

## 13. Success Criteria

- Promoting the reproduction draft saves scope 5, CO, and Cundinamarca; no `geo_focus skipped` warn.
- Promoting a Sub-national draft with no resolvable code saves country-level scope + countries and logs one warn.
- Bilateral API create/resubmit tests unchanged and green.
- `npx jest --testPathPattern=bilateral --maxWorkers=2` green; new regression test red before the fix.

## 14. Next Step

```text
/akili-specify bugfix/ai-draft-subnational-geo   (Bug Mode, Lite)
```
