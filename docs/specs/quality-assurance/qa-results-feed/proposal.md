# Proposal — Results feed for the QA platform

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/quality-assurance/qa-results-feed/` |
| Slug | `qa-results-feed` — literal path given in the argument |
| Type | **Change** — no endpoint lets QA read result values today |
| Deliverable | software |
| Approval Mode | gated |
| Status | **approved 2026-10-28** by Juan David (gated) — proceed to `/akili-specify` |
| Owner | Juan David Delgado |
| Date | 2026-10-28 |
| Ticket(s) | [P2-4037](https://cgiarmel.atlassian.net/browse/P2-4037) — Reporting sub-task, created 2026-10-28 under the consumer story [P2-3905](https://cgiarmel.atlassian.net/browse/P2-3905) (epic P2-3902) |
| Baseline | `docs/trd/trd.md` — ADR-001 (LITE, no new always-on compute), ADR-004 (additive-only external payloads), QAS-10 (no secrets in logs) · `.cursorrules` |
| Related specs | `quality-assurance/qa-field-catalog` (pattern + field keys + storage bindings) |
| Depends on | `quality-assurance/qa-field-catalog` (executed; 2026 catalog live at revision 30) |
| Parallel-safe | **yes** — new routes in the existing `qa-catalog` module, read-only, no schema change |
| Kaizen | `docs/specs/kaizen-log.md` does not exist — no Active Lessons apply |

## Intent

QA can already ask Reporting *which* fields exist per phase year (`GET /api/qa/catalog`). This change lets it ask *which results* to load and *what their values are*, expressed only in catalog `field_key`s, so QA never reads `prdb` directly again.

## Problem / Current Behavior

| # | Today | Source |
|---|---|---|
| 1 | The only QA route is `GET /api/qa/catalog`; it projects definitions and reads no result data. | `onecgiar-pr-server/src/api/qa-catalog/qa-catalog.controller.ts:35-50`, `qa-catalog.service.ts:31-45` ("pure projection … no DB read") |
| 2 | The qa-catalog mapper only projects **definitions** (result type, section, field, subfield, condition) to the response. There is no value reader to reuse. | `src/api/qa-catalog/qa-catalog.mapper.ts:21-81` |
| 3 | Every catalog field already declares where its data lives: 181 bindings in 2026 — 86 `column`, 52 `relation`, 31 `path`, 12 `lookup`. | `src/api/qa-catalog/definitions/types.ts:40-150`; count via `grep -rho "kind: '[a-z]*'" definitions/sections \| sort \| uniq -c` |
| 4 | Only 2026 is catalogued (`P25`, revision 30). | `src/api/qa-catalog/definitions/versions.ts` |
| 5 | W1/W2 vs W3/Bilateral is `result.source`: `'Result'` = pooled W1/W2, `'API'` (`SourceEnum.Bilateral`) = W3/bilateral, including SGP-02 results created in the UI. | `src/api/results/entities/result.entity.ts:51-54, 505-513, 551-574` |
| 6 | `result_code` is not unique: each phase gets its own `result` row (new `id`) under its `version_id`. | `result.entity.ts:66-69` (no unique index), `:266-271` |
| 7 | A submission is a `submission` row (`results_id`, `status`, `status_id`, `created_date`); unsubmit writes a new row with `status=false` and sets `result.status_id=1`. | `src/api/results/submissions/entities/submission.entity.ts`; `submissions.service.ts:177-224` |
| 8 | Unsubmit checks role and justification only — nothing about QA. | `submissions.service.ts:177-224` |
| 9 | `result.in_qa` exists and is read by the result lists, but no code in this repo writes it. | `result.entity.ts:259-264`; `grep -rn in_qa src` → only reads + migration `1699026813384` |
| 10 | Program membership: `results_by_inititiative.initiative_role_id` marks lead vs contributor; `clarisa_initiatives` carries `id` and `official_code`. | `src/api/results/results_by_inititiatives/entities/*.ts`; `src/clarisa/clarisa-initiatives/entities/clarisa-initiative.entity.ts` |
| 11 | A `phase_year` can map to more than one `version` (`app_module_id` separates Reporting and IPSR phases). | `src/api/versioning/entities/version.entity.ts:57, 79` |
| 12 | `/api/qa/catalog` is excluded from the JWT middleware by path. | `src/app.module.ts:154` |

## Proposed Outcome

1. **`GET /api/qa/results`** — paginated list of eligible results for one `phase_year`.
2. **`POST /api/qa/results/details`** — values for up to N results, keyed by catalog `field_key`, plus `catalog_version`; ineligible ids go to `not_eligible` with a reason.
3. **A binding-driven value reader** inside `api/qa-catalog` that turns each field's storage binding into a value. The catalog is the whitelist: a field not in the catalog cannot be read.
4. Contract doc `onecgiar-pr-server/docs/qa-catalog.en.md` extended with both routes and a change-log entry.

### Eligibility (both routes)

| Rule | Predicate |
|---|---|
| Status | `result.status_id = 3` (Submitted) and `is_active = 1` |
| Funding | `result.source = 'Result'` (excludes W3 and Bilateral, item 5) |
| Phase | `result.version_id` ∈ versions whose `phase_year` = requested year (which versions: OQ-4) |
| Catalog | `phase_year` has a catalog in `CATALOG_VERSIONS`; otherwise 404, as `/qa/catalog` does |

### Draft shapes (final in `/akili-specify`)

```json
// GET /api/qa/results?phase_year=2026&program_ids=1,5&result_type_keys=policy_change&page=1&page_size=100
{
  "phase": 2026,
  "page": 1, "page_size": 100, "total": 1342,
  "items": [{
    "result_id": 41231, "result_code": 8812,
    "program": { "clarisa_id": 5, "code": "SP05" },
    "result_type_key": "policy_change",
    "submitted_at": "2026-09-14T15:02:11Z"
  }]
}
```

```json
// POST /api/qa/results/details  { "phase_year": 2026, "result_ids": [41231, 40001] }
{
  "phase": 2026, "catalog_version": "2026.30",
  "results": [{ "result_id": 41231, "result_code": 8812, "result_type_key": "policy_change",
                "values": { "general.title": "…", "geography.countries": ["CO", "KE"] } }],
  "not_eligible": [{ "result_id": 40001, "reason": "not_submitted" }]
}
```

`not_eligible.reason` ∈ `not_found` · `not_submitted` · `other_phase` · `not_w1w2`. *(Extended at specify, 2026-10-28: `type_not_catalogued` · `no_lead_program` — see `requirements.md` QRF-R-8.)* Order of `items`: fixed (proposed `submitted_at, result_id`), so a page is stable while the set is unchanged.

## Scope

| In | Detail |
|---|---|
| Routes | Both endpoints in `QaCatalogController` under `/api/qa`, `ClarisaApiKeyGuard` + `@BilateralClarisaEndpoint`, `@SkipThrottle`, no `ResponseInterceptor` envelope, JWT-middleware exclusion for the new paths |
| Validation | `phase_year` required (never defaulted from the clock) → 400 when missing; `page_size` and batch size capped; unknown `result_type_keys` → 400 |
| Value reader | One reader per binding kind (`column`, `relation`, `path`, `lookup`), batched per field across the requested results (no N+1); output whitelisted by catalog key |
| Program | Lead program only (`initiative_role_id` = lead), returned as CLARISA id + `official_code` |
| Contract doc | Both routes, eligibility, `not_eligible` reasons, change log |

## Non-Goals

- Notifying Reporting when QA approves a result (separate spec).
- Results in Editing or any status other than Submitted.
- Syncing changes made after QA loaded a result (no deltas, no webhooks).
- Blocking unsubmit — only once Q2 is decided, and then as its own spec.
- New catalog keys; a value without a catalog field is not exposed.
- Phases other than those with a catalog (today 2026 only).

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| QA platform (P2-3905) | New consumer of both routes |
| `onecgiar-pr-server` `api/qa-catalog` | New controller methods, DTOs, a read-only value reader, repository queries |
| `app.module.ts` | JWT exclude list gains the two paths |
| CLARISA | The QA client's key must be granted the two new endpoints (`@BilateralClarisaEndpoint`) |
| Docs | `docs/qa-catalog.en.md` change log; TRD §7 row update recorded as pending (shared-file discipline → applied on `staging`) |

## Visual Reference

- Source: None
- Location: —
- Notes: backend-only change; no UI surface.

## Requirement Delta Preview

### ADDED Requirements

- `GET /api/qa/results` lists only Submitted, W1/W2 results of the requested phase year, filterable by `program_ids` (CLARISA ids) and `result_type_keys` (catalog keys), stably ordered, with `total`.
- `POST /api/qa/results/details` returns, per eligible result, the values of the catalog fields valid for that year and that result type, keyed by `field_key`, plus `catalog_version`.
- An id that does not exist, is not Submitted, is from another phase or is not W1/W2 goes to `not_eligible` with its reason; the rest of the batch still returns 200.
- Missing `phase_year` → 400; year without catalog → 404; missing/invalid key → 401; batch above N or `page_size` above max → 400.
- No value outside the catalog is ever returned.

### MODIFIED Requirements

- `/api/qa/*` grows from one route to three (additive, ADR-004).

### REMOVED Requirements

- none.

## Approach Options

| | A. Generic binding-driven reader (**recommended**) | B. Hand-written SQL per result type | C. Reuse existing result-detail services |
|---|---|---|---|
| How | Read each field through its declared binding, batched by field | One query per result type, like the old `QA_RESULTS_2025/*.sql` | Call the services behind the Angular form, then rename fields to keys |
| Key fidelity | By construction — the catalog *is* the query plan | Manual; drifts as soon as a field is added | Manual mapping, two shapes to keep aligned |
| New field cost | Zero (the catalog line already exists) | Edit SQL | Edit mapping |
| Risk | Edge cases in `path`/`lookup` semantics (pick, qualifiers, year match) | Recreates the 9×1 000-line queries we are replacing | Services are per-result, user-scoped, and some carry JWT assumptions; N+1 |

## Recommended Approach

**Option A.** The catalog spec already modelled every binding precisely so a reader could be built later (`types.ts` doc comments: DD-12, DD-13, QAC-T-22); building it now makes the catalog the single source of truth for both shape and values.

1. **Eligibility query** — one repository query over `result` + `version` + lead `results_by_inititiative` + `clarisa_initiatives` + latest active `submission`, used by both routes.
2. **Value reader** — a pure resolver per binding kind, fed by batched queries keyed by `result_id`; subfields resolve from their parent element's row (DD-12). Unit tests per kind reuse the existing per-type fixtures.
3. **Projection** — whitelist by catalog key, fields filtered with `isValidIn(field, year)` and the result's type; value typing follows the field `type`.
4. **Golden checks** — for a handful of real 2026 results per type, compare the reader's output to the form, during `/akili-test`.

## Risks, Dependencies, And Open Questions

### Open questions (left open as instructed)

| ID | Question | Facts that bear on it | Owner |
|---|---|---|---|
| **Q1** | Stable identity within a phase: `result.id` or `result_code`? | Inside one phase both identify one row; across phases only `result_code` survives (item 6). Draft shapes return both so either answer is cheap. | Product / QA lead |
| **Q2** | Block unsubmit of a result already in QA? | Unsubmit checks nothing about QA today (item 8). `result.in_qa` exists, is shown in lists, but nothing in this repo sets it (item 9) — who writes it: `UNVERIFIED — confirm with the QA platform owner`. Out of this spec either way. | Product |
| **Q3** | Field for KP auto-validation | Depends on Ángel's criterion; if it needs a new catalog key, that is a qa-field-catalog change, not this one. | Ángel |
| OQ-4 | Which versions does `phase_year` cover — Reporting only, or Reporting + IPSR (innovation packages live in IPSR phases)? | Item 11; `innovation_package` is a catalog result type. | Juan David |
| OQ-5 | Batch max N and `page_size` max | **Resolved 2026-10-28:** N = 50, `page_size` ≤ 200 (see `requirements.md`). | Juan David |
| OQ-6 | `submitted_at` source: latest active `submission` row with `status=true`? | Item 7; a resubmitted result has several rows. | Spec |
| OQ-7 | Results with no lead program, or a lead that is not a Science Program | `UNVERIFIED — confirm at source` | Spec |

### Risks

| Risk | Mitigation |
|---|---|
| The 2026 catalog includes fields that hold people's names/emails (lead contact, contributors). Per the rule they are "in the catalog", so they would be exposed. | Explicit review of person-bearing keys at specify; exclusion list if the QA lead does not need them. |
| `path`/`lookup` semantics read wrongly (pick order, year qualifiers) → plausible but wrong values. | Per-kind unit tests + golden comparison against the form. |
| Large batches over 181 bindings → slow request on the container. | Batch per field, cap N, measure on prtest. |
| Unsubmit after load leaves QA holding stale data. | Accepted (sync is out of scope); `details` reports it as `not_submitted` on a re-fetch. |

## Success Criteria

- `GET /api/qa/results?phase_year=2026` returns only Submitted W1/W2 results of 2026, never a W3/Bilateral or Editing one, with a `total` that matches a direct DB count.
- Paging through the full set with a fixed `page_size` returns every eligible result exactly once.
- `POST /api/qa/results/details` returns only catalog keys valid in 2026 for each result's type, with `catalog_version` equal to `/qa/catalog`'s.
- A batch mixing valid and invalid ids returns 200 with the invalid ones in `not_eligible`.
- No request without a valid key gets a 200; no request without `phase_year` gets anything but 400.

## Next Step

```text
/akili-specify quality-assurance/qa-results-feed
```
