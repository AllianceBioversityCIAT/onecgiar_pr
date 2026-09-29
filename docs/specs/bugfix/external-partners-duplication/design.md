# Module Spec — Design: External Partners Duplication (bugfix)

Requirements: `docs/specs/bugfix/external-partners-duplication/requirements.md`.

---

## 1. Summary

Two independent, defense-in-depth fixes: (1) the client never lets an institution live in both the ToC bucket and the "Other(s) External Partners" bucket at once (load-time and select-time); (2) the server collapses any duplicate `institutions_id` it still receives, before deciding create-vs-reactivate, so at most one `results_by_institution` row can ever exist per `(result_id, institutions_id, institution_roles_id)` from this path — and a residual DB constraint failure is translated into a plain message instead of a raw driver string. The biggest accepted trade-off: the exact historical mechanism that produced the two duplicate rows for result 9657 is not reproduced against a live database (`EPD-OQ-1`); the server fix is written to be correct regardless of that mechanism (it prevents the divergent state rather than tracing exactly how it was reached), so it does not block on that investigation, but a cleanup migration decision does.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `EPD-P-1` | `SavePartnersV2Dto.institutions` has no server-side uniqueness constraint on `institutions_id` today | `onecgiar-pr-server/src/api/results/results_by_institutions/dto/save-partners-v2.dto.ts` | Read the DTO: plain `ResultsByInstitution[]`, no custom `class-validator` array-uniqueness decorator | `verified` | N/A — this is exactly the gap being closed |
| `EPD-P-2` | `ChangeTracker.trackChangesForObjects` keys strictly on the caller-supplied field (`id`) and silently collapses same-key duplicates via `Map`, never surfacing the collision | `onecgiar-pr-server/src/shared/utils/change-tracker.ts` | Read the implementation: `added`/`newMap` both built via `new Map(...)`, last-write-wins on a repeated key; entries with `id === undefined` bypass the map entirely and always land in `added` | `verified` | N/A — confirms the collision path this design closes at the caller, not inside the shared utility |
| `EPD-P-3` | `_upsertAddedPartnerInstitutions` decides create-vs-reactivate per incoming "added" row independently, with no de-dup across rows in the same call | `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.ts:1049-1153` | Read the method: `existingMap` is looked up per `incoming` in a `for` loop with no removal/marking after a match, so two incoming rows with the same `institutions_id` both resolve independently (both reactivate the same existing row, or both get pushed to `institutionsToCreate`) | `verified` | N/A — this is the exact gap `EPD-R-3`/`EPD-DD-2` closes |
| `EPD-P-4` | `result_institutions_budget.result_institution_id` is `NOT NULL` at the DB/entity level | `onecgiar-pr-server/src/api/results/result_budget/entities/result_institutions_budget.entity.ts:19-24` | Read the `@Column` decorator: `nullable: false` | `verified` | N/A |
| `EPD-P-5` | Live `results_by_institution` rows for result 9657 (or any other result) currently contain a duplicate institution+role pair | Production/test database | **Not verified — no DB query tool available in this session/spec harness** | `assumed` | If false, `EPD-T-1`'s cleanup-migration decision is moot and the follow-up is dropped; if true, a data cleanup follow-up is filed |
| `EPD-P-6` | The client bug (both buckets showing the same institution) reproduces identically on the non-IPSR W1/W2 Contributors & Partners screen, since both consume the same `normal-selector` component | `onecgiar-pr-client/.../normal-selector/` used from both `rd-contributors-and-partners.component.html` and `ipsr-contributors.component.html:284` | **Not verified — not manually tested on W1/W2 in this session** | `assumed` | If false (W1/W2 has some guard IPSR lacks), narrow `EPD-R-1`/`EPD-R-2`'s test coverage claim accordingly; the fix is in the shared component either way, so no design change needed |

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `api/results/results_by_institutions/results_by_institutions.service.ts` (business logic); `api/results-framework-reporting/contributors-partners/contributors-partners.service.ts` (error-message assembly, no logic change needed there — the fix is upstream, at the source of the error).
- **Client modules touched:** `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts` (`applyTocMappingOnLoad`, `onOtherPartnerSelect`, `onPartnerSelect`); `pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.ts` (selection handlers already delegate to the service — no template change expected).
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

**Load (client, `EPD-DD-1`):**

```
[GET Contributors & Partners response: institutions[] with mixed from_toc]
  └── RdContributorsAndPartnersService.applyTocMappingOnLoad()
        ├── split by from_toc (existing logic, unchanged)
        ├── NEW: dedupe — drop any institutions_id from the "other" bucket
        │         that is already present in the "toc" bucket (and vice versa)
        └── render: one chip per institution, in exactly one bucket
```

**Save (server, `EPD-DD-2` + `EPD-DD-3`):**

```
[PATCH institutions payload, possibly containing a duplicated institutions_id]
  └── ResultsByInstitutionsService.savePartnersInstitutionsByResultV2()
        ├── NEW: dedupeIncomingInstitutions(data.institutions) — collapse to
        │         one logical entry per institutions_id before anything else runs
        ├── handleInstitutions(...) — unchanged from here on, now guaranteed
        │         to receive at most one entry per institutions_id
        └── catch (error):
              NEW: if error is a known DB constraint failure (NOT NULL / FK),
                   log the raw error and throw a plain-language ServiceError
                   instead of returning the raw driver message
```

---

## 3. Data Model Changes

None. No entity, column, or migration change. `EPD-P-5`'s cleanup (if confirmed necessary) is a follow-up outside this spec's scope (see `requirements.md` Out of Scope).

### 3.1 Entities

No changes.

### 3.2 Migrations

None required by this spec.

### 3.3 CLARISA / external-data implications

None.

---

## 4. API Surface

### 4.1 New / changed endpoints

No endpoint added or renamed. The existing `PATCH` Contributors & Partners endpoint (resolved by `ContributorsPartnersService.updateContributorsAndPartners` → `applyPartnersSectionUpdate` → `ResultsByInstitutionsService.savePartnersInstitutionsByResultV2`) changes internal behavior only:

| Field | Value |
|---|---|
| **Method + path** | Unchanged (`PATCH /api/results-framework-reporting/contributors-partners/:resultId`, exact route per existing controller — not touched by this spec). |
| **Version** | `api` (unchanged). |
| **Auth** | Unchanged — JWT required, existing role gating. |
| **Request DTO** | `SavePartnersV2Dto` unchanged in shape; behavior on a duplicated `institutions_id` changes from "may crash" to "silently collapsed to one logical entry, delivery flags unioned". |
| **Response DTO** | Unchanged shape. On a residual DB constraint failure, `message` changes from the raw driver string to a plain-language sentence (see `EPD-R-4`). |
| **Errors** | New case: constraint failure on the partners save → `400` with a plain message (was: `500`-shaped raw error text bubbling through `returnErrorRes`, see `EPD-DD-3`). |
| **Telemetry** | New: `Logger.error` on the translated constraint failure, logging the original driver message and the `result_id` (no partner PII/secrets — institution names are not secrets, but keep the log to id-level fields to stay minimal). |

### 4.2 Bilateral / platform-report impact

None — this endpoint is not `/api/bilateral/*` or `/api/platform-report/*`. No change log entry needed.

---

## 5. Server Workflow / Business Rules

**`EPD-DD-2` — dedupe incoming institutions before `handleInstitutions` runs.**

Add a private method on `ResultsByInstitutionsService`:

- Input: the raw `data.institutions` array (may be empty/undefined).
- Group by `institutions_id` (ignore the sentinel-like sentinel concept — this DTO does not carry the client's `OTHER_PARTNERS_CODE` sentinel; that is stripped client-side before the payload is built, per the client's own save-time filter — confirm this holds and is not bypassed by any other caller of this service method).
- When a group has more than one entry:
  - Prefer the entry that carries a defined `id` (a known, already-persisted row) as the base — this is the one `_upsertAddedPartnerInstitutions`/`ChangeTracker` should treat as authoritative for reactivation.
  - If none carries an `id`, keep the first occurrence as the base.
  - Union the `delivery` arrays across all entries in the group (so a role picked in either bucket survives — this matches the observed UI shape, where the SAME chip in each bucket can independently reflect delivery toggles).
  - Prefer `from_toc: true` when any entry in the group has it (a partner is "from ToC" if it is from ToC in either copy).
- Output: one entry per distinct `institutions_id`, same order of first appearance.
- Call this at the top of `savePartnersInstitutionsByResultV2`, before `oldPartners` is computed and before `handleInstitutions`/`syncInstitutionFromTocFlags` run, so every downstream consumer of `data.institutions` in that method already sees the deduplicated list.

This closes `EPD-R-3` without needing to know *how* the duplicate arrived (client bug, stale tab, a future caller) — it is a boundary invariant on the save path itself, independent of the unconfirmed historical mechanism (`EPD-P-5`).

**`EPD-DD-3` — translate a DB constraint failure into a plain message.**

In `savePartnersInstitutionsByResultV2`'s existing `catch (error)` block:

- Detect a `QueryFailedError`-shaped driver error whose code matches a known constraint class (MySQL `ER_BAD_NULL_ERROR` / errno `1048`, and `ER_NO_REFERENCED_ROW*` for FK violations, in case a similar gap exists elsewhere in the same method).
- On match: `this._logger.error(...)` the raw error (message + result id, no payload dump — payloads can carry unrelated free text), then `throwServiceError('There was a problem saving the selected partners. Please review your External Partners selection and try again.', HttpStatus.BAD_REQUEST)` instead of falling through to `returnErrorRes({ error, debug: true })`, which currently echoes the raw driver message into `message`.
- Any other error type keeps the existing `returnErrorRes` behavior (no regression for unrelated failures).

No transaction/concurrency change beyond this — the existing `_dataSource.transaction(...)` wrapper is untouched; the dedupe runs before the transaction body reads `data.institutions`, so it has no interaction with rollback semantics.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Touches `RdContributorsAndPartnersService` (root-provided) and `CPNormalSelectorComponent`, both already shared between the W1/W2 and IPSR routes — no new wiring needed.

### 6.2 Components & services

**`EPD-DD-1` — single dedup rule, applied at every mutation point of the two buckets.**

Add one helper on `RdContributorsAndPartnersService`, e.g. `private excludeInstitutionsIn(list: any[], excludeIds: Set<number>): any[]`, and use it at:

1. **`applyTocMappingOnLoad()`** (`rd-contributors-and-partners.service.ts:599-613`): after computing `tocPartners` and `otherPartners` from the raw `allPartners` split, remove from `otherPartners` any `institutions_id` that is also present in `tocPartners` (by identity, not by `from_toc` — a same-id row in both must never happen; keep the ToC-flagged copy, drop the "other" copy). This is the exact defensive case in `EPD-AC-1`.
2. **The "Other(s)" dropdown selection handler** (`onOtherPartnerSelect`, wherever the multi-select's `(selectOptionEvent)` is wired — currently the raw `[(ngModel)]="otherPartnersSelected"` binding in `normal-selector.component.html:209` plus the component's `onOtherPartnerSelect($event)`): reject/filter an option whose `institutions_id` is already in `partnersBody.institutions`.
3. **The ToC-bucket dropdown selection handler** (`onPartnerSelect`, wired at `normal-selector.component.html:73`): reject/filter an option whose `institutions_id` is already in `otherPartnersSelected`.

The dropdown **options lists themselves** (`dropdown1OptionsPartners()`, `otherPartnersList()`) should also exclude already-selected-in-the-sibling-bucket institutions where those getters already filter by other criteria — extending an existing filter is preferred over adding a second, redundant one; if no such getter exists for one of the two dropdowns, add the exclusion inline where the `[options]` binding is computed, not in the template.

### 6.3 Design system usage

No new UI, no new tokens, no new strings beyond the server's translated error message (already routed through the existing "There was an error saving the section" dialog — no new component).

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

No change. No new endpoint, no new role. The translated error message (`EPD-R-4`) reduces information disclosure (no more raw column/table names reaching the client) — a small improvement, not a new surface.

---

## 8. Performance & Capacity

Negligible: the dedupe pass is O(n) over an array bounded by the number of partners a human selects on one result (tens, not thousands). No new query, no new round-trip.

---

## 9. Observability

- New: one `Logger.error` call in `savePartnersInstitutionsByResultV2`'s catch block, logging the original driver error message + `result_id` when a constraint failure is translated. No secrets, no full payload dump.
- No new metric/counter; this is a rare-path fix, not a hot-path change.

---

## 10. Testing Plan (forward-looking)

- **Client unit tests** (`rd-contributors-and-partners.service.spec.ts`): a fixture where the GET response's `institutions` array contains the same `institutions_id` twice with different `from_toc` values — assert the institution ends up in exactly one of `partnersBody.institutions` / `otherPartnersSelected` after `applyTocMappingOnLoad()`. A second test: selecting an institution already in one bucket via the sibling dropdown does not duplicate it.
- **Server unit tests** (`results_by_institutions.service.spec.ts`): call `savePartnersInstitutionsByResultV2` with an `institutions` array containing two entries for the same `institutions_id` (one with `id`, one without, differing `delivery`) — assert exactly one row is created/reactivated and its `delivery` is the union; assert no `result_institutions_budget` NOT NULL failure for an innovation-type result.
- **Server unit test** for the constraint-translation branch: mock the repository/transaction to throw a `QueryFailedError`-shaped error with `errno: 1048`, assert the returned `message` is the plain-language string (not the raw driver text) and that `Logger.error` was called.
- Coverage uplift: `results_by_institutions.service.ts` and `rd-contributors-and-partners.service.ts` are both already covered by existing suites — this spec adds cases, not new files.

**Budget (Step 2.4):** expected tasks: **6**. Expected LOC: **~180–260** (client ~60-90, server ~60-90, tests ~60-90 across both). Expected review rounds: **1–2** (the server change touches a shared method, `handleInstitutions`'s caller — `full` review; the client change is `checklist`-level, isolated to one service + one component). If `/akili-execute` finds itself materially over this (e.g., touching `ChangeTracker` itself, or needing a migration), it should stop and escalate rather than continue silently.

---

## 11. Backwards Compatibility & Migration Plan

- No API contract change (additive-only: same shapes, different internal collapsing + a friendlier error string on one failure path).
- No feature flag needed — this is a correctness fix, always-on.
- No data backfill in this spec. If `EPD-T-1` confirms live duplicate rows, a separate follow-up spec handles the cleanup migration (out of scope here, per `requirements.md`).
- Rollback: revert the PR(s); no migration to revert since none is added.

---

## 12. Design Decisions (ADRs)

### `EPD-DD-1` — Client-side bucket-exclusivity dedup, at load and at every selection point

- **Context:** the observed bug (12 selected, 6 distinct) is a direct rendering consequence of `applyTocMappingOnLoad()`'s from_toc split having no cross-bucket awareness, and every place that can add to either bucket shares the same blind spot.
- **Decision:** add one exclusion rule, applied identically at load time and at both selection handlers, rather than special-casing the load path only.
- **Alternatives considered:** (a) fix only the load-time split (cheaper, but a user could still re-introduce the duplicate by picking the same institution from the sibling dropdown mid-session — rejected, doesn't close `EPD-R-2`); (b) merge the two dropdowns into one control that only ever shows each institution once, removing the two-bucket concept — rejected as out of scope, it would redesign the P2-3066 UX rather than fix the defect within it.
- **Consequences:** three call sites to touch instead of one; in exchange, the invariant "an institution lives in exactly one bucket" holds everywhere, not just on a fresh load.

### `EPD-DD-2` — Server-side dedup by `institutions_id` before create-vs-reactivate logic runs

- **Context:** `_upsertAddedPartnerInstitutions` has no protection against two incoming rows sharing an `institutions_id` (`EPD-P-3`); this is the mechanism most likely (though not confirmed, `EPD-P-5`) to have produced the historical duplicate DB rows, and is reachable by any future caller of this method, not only the client bug being fixed today.
- **Decision:** collapse duplicates at the top of `savePartnersInstitutionsByResultV2`, before `oldPartners`/`handleInstitutions` see the array, rather than patching `_upsertAddedPartnerInstitutions` or `ChangeTracker` internally.
- **Alternatives considered:** (a) fix `ChangeTracker.trackChangesForObjects` to dedupe by a secondary key — rejected, that utility is shared by other callers (`syncInstitutionFromTocFlags`'s caller, delivery-diffing) and changing its semantics risks an unrelated regression; (b) add a `class-validator` custom decorator rejecting duplicate `institutions_id` in the DTO — rejected as the primary fix because it would turn a recoverable, mergeable duplicate (see the delivery-union rule) into a hard `400` for a payload the client-side fix (`EPD-DD-1`) should mostly prevent anyway, which is a worse failure mode than silently normalizing it; kept as a possible follow-up hardening, not required here.
- **Consequences:** the fix is a single, well-scoped boundary check; it does not require understanding or reproducing the exact historical race (`EPD-P-5` stays `assumed`), which keeps this spec unblocked by that investigation.

### `EPD-DD-3` — Translate known DB constraint failures instead of passing the raw driver message through

- **Context:** `savePartnersInstitutionsByResultV2`'s catch block currently returns `returnErrorRes({ error, debug: true })`, which is how `Column 'result_institution_id' cannot be null` reached the user verbatim, concatenated with the (successful) ToC message.
- **Decision:** detect the known constraint-failure shapes and translate them; leave all other errors on the existing path.
- **Alternatives considered:** (a) wrap ALL errors from this method in a generic "something went wrong" message — rejected, it would hide genuinely useful validation errors (e.g. `Result Not Found`) that are already deliberately specific; (b) fix this only at the higher `ContributorsPartnersService.updateContributorsAndPartners` message-joining layer — rejected, that layer only joins strings it is handed, the raw text originates lower and should be cleaned at the source.
- **Consequences:** a narrow, explicit allowlist of translated error shapes (NOT NULL, FK) rather than a blanket catch — keeps other error messages exactly as informative as they are today.

---

## 13. Open Gaps & Follow-ups

- `EPD-OQ-1` (live duplicate rows) and `EPD-OQ-2` (W1/W2 parity) remain open; `EPD-T-1` investigates both before implementation tasks land, but does not block them (per `EPD-P-5`/`EPD-P-6`'s "if false" columns).
- If `EPD-T-1` confirms live duplicate rows exist, file a follow-up spec for a data-cleanup migration — explicitly out of scope here.
- The alternative considered in `EPD-DD-2` (a `class-validator` uniqueness decorator on `SavePartnersV2Dto.institutions`) is a reasonable future hardening if a *different* caller is later found to send duplicates in a way the merge rule handles poorly — not needed for this fix.

---

## Required cross-references

- `docs/specs/bugfix/external-partners-duplication/requirements.md` (same folder).
- `docs/prd.md` — `AC-1`, `AC-8`, `AC-9`.
- `docs/ux-ui/design.md` — External Partners / P2-3066 split.
- `docs/trd/trd.md` — Contributors & Partners workflow, `results_by_institution` data model.
