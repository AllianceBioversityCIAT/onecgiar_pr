# Module Spec — Requirements: External Partners Duplication (bugfix)

## 1. Module / Feature

- **Module:** `results` (server: `api/results/results_by_institutions`, `api/results-framework-reporting/contributors-partners`) / `ipsr` (client consumer) — shared client component lives under `results/rd-contributors-and-partners`.
- **Sub-feature:** External Partners duplicate rendering + duplicate-payload save failure.
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** approved
- **Ticket(s):** none yet — found via manual use on prtest, IPSR result 9657, phase 37.
- **Type:** Bug
- **Proposal:** `docs/specs/bugfix/external-partners-duplication/proposal.md` (approved 2026-09-28)

---

## 2. Context

The "External Partners" step of Contributors & Partners (shared by W1/W2 `rd-contributors-and-partners` and IPSR `ipsr-contributors`, via the common `normal-selector` component, P2-3066's ToC/"Other(s)" split) rendered 12 selected partners for a result that has only 6 distinct institutions — each one duplicated across the ToC-derived bucket and the "Other(s) External Partners" bucket. Saving in that state failed with a raw SQL error (`Column 'result_institution_id' cannot be null`) instead of a clear message, and the ToC half of the same PATCH had already succeeded, producing a confusing concatenated message.

Touches `docs/ux-ui/design.md`'s External Partners flow (P2-3066 split) and `docs/trd/trd.md`'s Contributors & Partners workflow / `results_by_institution` + `result_institutions_budget` data model (see `AC-1` Typed result integrity).

---

## 3. In Scope / Out of Scope

### In scope

- Preventing an institution from ever appearing in both the ToC-derived bucket and the "Other(s) External Partners" bucket, on load and on selection.
- Preventing a duplicated/mismatched `institutions_id` in the save payload from creating a second `results_by_institution` row for the same result+institution+role.
- Turning a database constraint failure in the partners save path into a clear, actionable message instead of a raw driver error string.
- Regression tests for all of the above.

### Out of scope

- The ToC mapping save path (already succeeds; not implicated).
- Redesigning the ToC / "Other(s)" two-bucket UX itself (P2-3066) — only its dedup logic is in scope.
- A data-cleanup migration for already-affected results, unless the investigation task (`EPD-T-1`) confirms live duplicate rows exist and the user approves a follow-up.
- Knowledge Product "Additional partners" and non-innovation result types are **not** redesigned, only re-verified not to regress (`handleInstitutions` is shared code).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can no longer create a visually and functionally duplicated partner list; a genuine save failure now reads as an actionable message |
| QA reviewer | Sees an accurate, non-duplicated partner list when reviewing Contributors & Partners |
| PMU lead | Downstream aggregates (bilateral/report summaries reading `results_by_institution`) stop risking a double-counted partner if the server-side root cause is confirmed |
| Platform admin | N/A |

---

## 5. User Stories

- **`EPD-US-1`** — As a result submitter, I want the External Partners section to never show the same partner twice, so that I can trust the partner count and roles I'm reporting.
- **`EPD-US-2`** — As a result submitter, I want a partner save failure to explain what went wrong in plain language, so that I don't have to guess (or ask engineering) why "Save" failed.
- **`EPD-US-3`** — As a PMU lead, I want the underlying `results_by_institution` data to never contain two rows for the same result+institution+role, so that partner counts in downstream reports are accurate.

Refines project-level `AC-1` (Typed result integrity), `AC-8` (Observability — error messages must be actionable, not raw internals).

---

## 6. Functional Requirements

### Required (MUST)

- **`EPD-R-1`** The system MUST NOT allow the same `institutions_id` to be present in both `partnersBody.institutions` (ToC bucket) and `otherPartnersSelected` ("Other(s)") at the same time, on load.
- **`EPD-R-2`** When the user selects a partner already present in the sibling bucket via either dropdown, the system MUST NOT add a second, duplicate entry.
- **`EPD-R-3`** When the server receives an `institutions` payload containing more than one entry for the same `(result_id, institutions_id, institution_roles_id)`, the system MUST collapse them to a single logical entry before deciding create-vs-reactivate, so at most one `results_by_institution` row exists per `(result_id, institutions_id, institution_roles_id)` after the save.
- **`EPD-R-4`** When a partner save fails on a known database constraint (e.g., a NOT NULL violation on `result_institutions_budget.result_institution_id`), the system MUST return a message that names the affected partner/section in plain language, and MUST NOT leak the raw column/table name or driver error text to the client.

### Should (SHOULD)

- **`EPD-R-10`** The system SHOULD log the raw driver error (server-side log only, no secrets) when it translates a constraint failure to a friendly message, so engineering can still diagnose recurrences.

### Could / Nice-to-have (MAY)

- **`EPD-R-20`** The system MAY expose a one-off diagnostic (script or repository method) to detect existing duplicate `results_by_institution` rows for a given result, to support `EPD-T-1`'s investigation without ad-hoc SQL.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No change to the `PATCH` Contributors & Partners request/response shape for callers that never send duplicates — additive only (`AC-4` n/a here, this endpoint is not bilateral/platform-report). |
| **Data integrity** | After the fix, `results_by_institution` MUST have at most one active row per `(result_id, institutions_id, institution_roles_id)` produced by this save path. |
| **Security** | No new endpoint; no change to JWT/role gating. Error messages MUST NOT leak DB schema details (`AC-9`). |
| **Observability** | Constraint-failure translations MUST log the original error server-side (no PII/secrets) so recurrences are diagnosable. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `EPD-AC-1` | A result whose saved partner data has the same `institutions_id` stored once with `from_toc: true` and once with `from_toc: false` | The External Partners section loads | The institution renders exactly once, in the ToC bucket, and never in "Other(s) External Partners" |
| `EPD-AC-2` | A partner already selected in one bucket | The user opens the sibling dropdown and tries to pick the same institution | It is not offered / not added again — no duplicate chip appears |
| `EPD-AC-3` | A save payload whose `institutions` array contains two entries for the same `institutions_id` + role (one with an existing `id`, one without) | The user clicks Save | Exactly one `results_by_institution` row exists afterward for that institution+role; the save succeeds (no NOT NULL error) |
| `EPD-AC-4` | A partner save that still hits a database constraint failure (defense-in-depth case) | The failure occurs | The user sees a plain-language message identifying the section/partner, never a raw SQL/driver string |
| `EPD-AC-5` | The original repro shape (6 ToC partners mirrored as 6 "Other" duplicates on IPSR result 9657-like data) | The section is loaded and saved end-to-end | No duplication is rendered and the save succeeds |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-8` Observability and notifications, `AC-9` Security and secrets.

**Defect classes this spec can produce, and what catches each:**

| Defect class | Verification |
|---|---|
| Client renders/allows a duplicate across the two buckets | Client unit test (`normal-selector`/`rd-contributors-and-partners.service.spec.ts`) with a fixture holding both `from_toc` values for one institution — `EPD-AC-1`, `EPD-AC-2` |
| Server creates two `results_by_institution` rows for one logical partner | Server unit/integration test on `handleInstitutions`/`_upsertAddedPartnerInstitutions` with a duplicated incoming array — `EPD-AC-3` |
| A raw DB error reaches the client | Server test asserting the translated message shape when the repository throws a NOT NULL error (mocked) — `EPD-AC-4` |
| Whether *live* duplicate rows already exist in the database for affected results | **No automated check available in this repo (no DB query tooling in the spec/test harness).** Accepted as a human-verified step: `EPD-T-1` requires a manual DB read (or a one-off script) against a real environment before deciding whether a cleanup migration is needed. Recorded as an open risk, not silently skipped. |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `clarisa-institutions` (CLARISA catalog) — unaffected, read-only dependency of the existing dropdowns.
- `results_by_institutions` module (server) — the module being hardened.
- `result_institutions_budget` (`api/results/result_budget`) — the table whose NOT NULL constraint surfaced the bug.

### Downstream consumers

- `results/summary` builders and `bilateral`/`platform-report` payloads read `results_by_institution` — a duplicate row there would double-count a partner; this spec's server fix (`EPD-R-3`) protects them, but no direct change is made to those modules.
- W1/W2 `rd-contributors-and-partners` and IPSR `ipsr-contributors` both consume the shared `normal-selector` component and the shared server endpoint — both benefit from the same fix.

### Assumptions

- The exact mechanism by which two DB rows were created for the same institution+role has not been reproduced against a live database (see `EPD-OQ-1`). The fix in `EPD-R-3` is written to be correct regardless of the precise mechanism (it collapses duplicates before they can diverge), so it does not depend on confirming the mechanism first — but the investigation (`EPD-T-1`) should still run to close `EPD-OQ-1`/`EPD-OQ-2` and to decide on a cleanup migration.

---

## 10. Open Questions

- `EPD-OQ-1` — Does result 9657 (or any other result) currently hold duplicate `results_by_institution` rows for the same institution+role? Needs a database read before deciding whether a cleanup migration is in scope.
- `EPD-OQ-2` — Does the identical duplication reproduce on the W1/W2 Contributors & Partners screen (non-IPSR), since it shares `normal-selector`? Not yet tested.

Both are carried into `EPD-T-1` as investigation prerequisites; they do not block writing the fix (see Assumptions above), but they do block deciding on a cleanup migration and on closing `EPD-OQ-2`'s parity claim.

---

## 11. Out-of-Band Notes

None.

---

## Required cross-references

- `docs/prd.md` — `AC-1` Typed result integrity, `AC-8` Observability and notifications, `AC-9` Security and secrets.
- `docs/ux-ui/design.md` — External Partners / P2-3066 ToC-"Other(s)" split flow.
- `docs/trd/trd.md` — Contributors & Partners workflow, `results_by_institution` / `result_institutions_budget` data model.
- `docs/specs/bugfix/external-partners-duplication/proposal.md` — approved Bug Diagnosis this spec converts into requirements.
