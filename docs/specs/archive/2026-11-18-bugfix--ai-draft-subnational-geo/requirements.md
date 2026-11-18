# Module Spec — `requirements.md`

## 1. Module / Feature

| Field | Value |
|---|---|
| Spec Path | `bugfix/ai-draft-subnational-geo` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Ticket | INC-168504 |
| Proposal | [`proposal.md`](./proposal.md) — approved 2026-11-17 |
| Module | `onecgiar-pr-server` · `api/bilateral` (AI draft promote path) |

## 2. Context

**Answer first:** promoting an AI draft whose geo focus is Sub-national must save scope 5, its countries and the subnational areas it names. Today it saves no scope and leaves countries half-written.

| Today | Evidence |
|---|---|
| AI `extracted_mds.geo_focus` nests subnationals per country as ISO 3166-2 strings: `countries:[{iso_alpha_2:"CO", subnational_areas:["CO-CUN"]}]` | `onecgiar-pr-client/.../draft-result-card.component.ts:37-40` reads that shape |
| The promote path passes the root `geoFocus.subnational_areas ?? []` (empty) | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:5649-5655` |
| Countries are written, then `lookupSubnationalAreas([])` throws 400 | `bilateral.service.ts:6623-6643`, `:6800-6803` |
| The catch logs `geo_focus skipped`; `geographic_scope_id` is never saved | `bilateral.service.ts:5656-5667` |
| `lookupSubnationalAreas` matches only `{id}` / `{name}` objects, never a code string | `bilateral.service.ts:6787-6803` |
| AI ISO codes have the same format as `clarisa_subnational_scopes.code` | `UNVERIFIED — confirm at source before relying on it` (settled in design / task 1) |

## 3. In Scope / Out of Scope

### In scope
- Geo block of `populateResultFromExtractedMds` (AI promote path only).

### Out of scope
- `lookupSubnationalAreas`, `handleSubnationals`, `handleCountries`, `validateGeoFocus` — unchanged.
- `/api/bilateral/*` contract and `bilateral-result-summaries.en.md` — unchanged.
- AI service payload.
- `handleSubnationals` writing every area to every country (separate ticket).
- Backfill of results already promoted (proposal OQ-2).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (AI drafts) | The promoted result arrives with its Sub-national scope, countries and areas filled |

## 5. User Stories

- As a submitter promoting a Sub-national AI draft, I want its geography carried over, so I do not re-enter it.

## 6. Functional Requirements

### Required (MUST)

**ADS-FR-1 — Sub-national geography survives promotion.** When `geo_focus.scope_code = 5` and at least one nested subnational code resolves in CLARISA, the system SHALL save `geographic_scope_id = 5`, the countries, and the resolved subnational areas.

#### Scenario: The reported case (regression)
- GIVEN an AI draft with `geo_focus = { scope_code: 5, countries: [{ iso_alpha_2: "CO", subnational_areas: ["CO-CUN"] }] }`
- AND `CO-CUN` exists in `clarisa_subnational_scopes.code`
- WHEN the draft is promoted
- THEN the result is saved with `geographic_scope_id = 5`, country CO and subnational `CO-CUN`
- BUT it must NOT log `geo_focus skipped`

#### Scenario: Several countries, codes nested in each
- GIVEN `countries: [{ iso_alpha_2: "CO", subnational_areas: ["CO-CUN"] }, { iso_alpha_2: "KE", subnational_areas: ["KE-30"] }]`, both codes in CLARISA
- WHEN promoted
- THEN both codes are passed on as resolved subnational areas and the scope is 5

**ADS-FR-2 — Country-level fallback.** When the scope is 5 but **no** subnational code resolves (none sent, or none found in CLARISA), the system SHALL save the countries and a country-level scope (4 for one country, 3 for several) and log one `warn` naming the unresolved codes.

#### Scenario: No code resolves
- GIVEN scope 5, `countries: [{ iso_alpha_2: "CO", subnational_areas: ["XX-NOPE"] }]`
- WHEN promoted
- THEN `geographic_scope_id = 4`, country CO saved, one warn naming `XX-NOPE`
- BUT it must NOT leave `geographic_scope_id` null

**ADS-FR-3 — Partial resolution keeps what resolves.** When some codes resolve and others do not, the system SHALL keep scope 5 with the resolved areas and log one `warn` naming the unresolved codes.

**ADS-FR-4 — Code must belong to a draft country.** A resolved code whose CLARISA country (`country_iso_alpha_2`) is not among the draft's countries SHALL be treated as unresolved.

**ADS-FR-5 — No half-written geography.** Subnational codes SHALL be resolved before any country or subnational row is written.
- AND IT MUST keep the existing behavior for a geo error raised after that point (warn, no throw out of promote).

**ADS-FR-6 — Other scopes and the bilateral API unchanged.** Promotion with scope ≠ 5, and every `/api/bilateral/*` create/resubmit path, SHALL behave exactly as before.
- BUT it must NOT change `lookupSubnationalAreas` or the root-level `subnational_areas` handling of the API.

### Defect classes this spec can produce → gate

| Defect class | Gate |
|---|---|
| Reported bug persists (scope 5 not saved) | Jest regression test on `populateResultFromExtractedMds` — red before, green after |
| Codes not translated to `{id}` (lookup still throws) | Same test asserts the subnational ids handed on |
| Fallback leaves scope null / wrong scope | Jest test, no-resolve case → scope 4 |
| Half-write (countries written before failure) | Jest test asserts the subnational resolution query runs before `updateCountries` |
| Regression on the bilateral API path | Existing `bilateral.service.spec.ts` suites stay green |
| Type mismatch on the helper | `npx tsc --noEmit -p tsconfig.json` (server) |
| AI code format ≠ CLARISA code format | No automated check in repo — sample query on QA DB at task 1 (human check); mitigated by ADS-FR-2 fallback |

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | At most one extra CLARISA query per promotion (all codes in one `IN`) |
| Observability | Every dropped code appears in one `warn` with the result id |
| Compatibility | No contract, schema or migration change |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ADS-AC-1` | Reported draft (CO / CO-CUN) | Promote | Scope 5, CO, CO-CUN; no `geo_focus skipped` |
| `ADS-AC-2` | Scope 5, no code resolves | Promote | Scope 4 (or 3), countries saved, one warn |
| `ADS-AC-3` | Scope 5, one code resolves, one not | Promote | Scope 5, resolved area kept, one warn |
| `ADS-AC-4` | Code belongs to a country not in the draft | Promote | Treated as unresolved |
| `ADS-AC-5` | Scope 4 draft / bilateral API create | Promote / POST | Unchanged behavior; existing tests green |

## 9. Dependencies & Assumptions

### Upstream dependencies
- `clarisa_subnational_scopes` populated (`code`, `country_iso_alpha_2`).

### Downstream consumers
- `bilateral-ai.service.ts:854` (only caller, signature unchanged).

### Assumptions
- PROD impact 81/192 drafts is user-stated (`UNVERIFIED`).

## 10. Open Questions

| ID | Question |
|---|---|
| OQ-2 | Backfill already-promoted Sub-national results? (not in this spec) |
