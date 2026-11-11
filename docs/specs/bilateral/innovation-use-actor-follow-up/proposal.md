# Proposal — Bilateral (W3) Innovation Use: `count_unit` and `use_nature` on actors

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/innovation-use-actor-follow-up` |
| Slug | `innovation-use-actor-follow-up` — derived from free-text argument ("Bilateral (W3) Innovation Use: accept count_unit and use_nature on actors"); placed under the `bilateral/` module taxonomy |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | P2-4106 (Enhancement, epic P2-3094) |
| Related spec | `docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature` (P2-4048, centre form) · P2-4067 partner warnings |
| Depends on | none (columns and helpers already shipped by P2-4048) |
| Parallel-safe | yes — touches `api/bilateral/*` and the bilateral payload doc only; no migration |
| HITL decision owners | Santiago (product) · Nicoleta Trifa (SO, template owner) — see OQ-1 |
| HITL decisions | **Resolved 2026-11-10 by Santiago Sánchez (Slack DM, 10:36 -05):** OQ-1 = (a) *"solo farmers, así fue la solicitud de Marc Schut"* · OQ-2 = *"warning más ignorar"* · OQ-3 = *"tu recomendación está bien"* (400) |
| Author / date | Juan D. Guzmán · 2026-11-10 |

## 2. Intent

Let W3/bilateral producers (the SO bulk upload tool, MEL, IITA…) send the two Farmers follow-up answers that the centre form already collects, so a W3 Innovation Use result carries the same `count_unit` / `use_nature` data as a W1/W2 one — **without breaking any producer that does not send them yet**.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| C-1 | The bilateral handler overwrites both answers with `null` for every actor | `src/api/bilateral/handlers/innovation-use.handler.ts:162-166` |
| C-2 | Even before C-1, the fields never reach the handler: `InnovationUseActorDto` does not declare them, and `/create` runs `ValidationPipe({ whitelist: true })`, which strips undeclared properties | `src/api/bilateral/dto/create-bilateral.dto.ts:427-…` (no `count_unit`/`use_nature`; `grep` over `src/api/bilateral` hits only the handler) · whitelist posture: `src/api/bilateral/CLAUDE.md` §4 |
| C-3 | The shared writer already stores the whitelisted codes (`toCountUnit`/`toUseNature`, unknown → NULL silently) and tells Farmers rows apart by `(actor_type_id, count_unit, use_nature)` when the row has no id; **other actor types match by type only** | `src/api/results-framework-reporting/innovation-use/innovation-use.service.ts:490-496` (match) and `:683-685` (`buildActorData`) |
| C-4 | Bilateral does **not** ingest a 2030 projection block: the handler hard-codes `innov_use_2030_to_be_determined: true` and the DTO has no 2030 field | `innovation-use.handler.ts:102` · `grep "2030" create-bilateral.dto.ts` → no hit |
| C-5 | The centre form's "Households" path = tick `sex_and_age_disaggregation = true` and clear women/men/youth, keeping only `how_many` | client `shared/components/innovation-use-form/innovation-use-form.component.ts:592-606` (`onCountUnitChange`) |
| C-6 | `outcomes[].warnings` exists (P2-4067) but its type is partner-only (`field: 'contributing_partners'`) and is computed **before** the transaction | `src/api/bilateral/bilateral.service.ts:242-256` (type), `:388-396` (computed), `:766-768` (emitted) |
| C-7 | Read surfaces map actors without the two fields: `mapInnovationUseBilateralActor` (used for GET `/:id` and per-section reads S1/S2); the QA payload builder reads only `result_actors_id` + `how_many` | `bilateral.service.ts:2923`, `:3001`, `:3673`, `:3685` · `services/quality-assessment/bilateral-quality-payload.builder.ts:170-178` |
| C-8 | The green check `validation_innovation_use_P25` excludes `source = 'API'` → no submit-gate impact for bilateral | `src/api/results-framework-reporting/innovation-use/CLAUDE.md` §"Seguimiento Farmers" (live body in the archived spec `sql/`) — `UNVERIFIED — confirm with SHOW CREATE FUNCTION on prtest before relying on it` |
| C-9 | The resubmission path (`updated` outcome) re-runs the handler's `resolveAndValidate`, so it inherits any handler change | `services/bilateral-resubmission.service.ts:113`, `:708` |

## 4. Proposed Outcome

On `POST /api/bilateral/create` (and the resubmission path), an Innovation Use **current-use** actor:

- accepts `count_unit` and `use_nature` with the exact centre-form codes;
- stores them on Farmers rows (`actor_type_id = 1`);
- with `count_unit = households`, stores only `how_many` (breakdown cleared, `sex_and_age_disaggregation = true`);
- may appear as Farmers more than once, one row per answer pair, and each is stored as its own row;
- missing answer → result accepted, answer stored empty, warning on `outcomes[].warnings`;
- invalid code → `400` naming `actors[i].<field>` and the allowed values.

`GET /api/bilateral/:id` and the QA payload return both fields on every actor.

## 5. Scope

- `InnovationUseActorDto`: two optional string fields.
- `InnovationUseBilateralHandler.prepareActors`: validate, normalise, collect warnings (replace the forced `null`).
- Households normalisation (handler-side, before the shared writer).
- Warning plumbing: widen the warning type and attach actor warnings to the same `outcomes[]` row as partner warnings.
- Read mappers (`mapInnovationUseBilateralActor`, QA payload builder).
- Payload doc `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` + change-log row + Swagger.
- Unit tests on the handler; fixture tests on the read mappers.
- A **field-alignment note** (§9.4) for the fetcher schema and the PRMS Normalizer Technical Field Documentation.

## 6. Non-Goals

Centre form (unless OQ-1 = c), IPSR, phase ≤ 2025 results, converting households to people in any total, a bilateral 2030 projection block (C-4 — not ingested today; adding it is its own change), Innovation Development anticipated users, the fetcher schema/docs in `onecgiar_result_functions`, the bulk upload tool and the Excel template, any migration.

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| SO bulk upload tool (Daniel Lozano) · template (Nicoleta Trifa) | Can send both fields |
| MEL, IITA (current producers) | No break; start receiving warnings on Farmers rows |
| Fetcher (`onecgiar_result_functions`) | Must not strip the fields (out of scope here — alignment note only) |
| QA reviewers / AI QA | See the answers in the QA payload |
| `api/bilateral` handler, DTO, service mappers, QA builder | Code changes |
| `InnovationUseService.saveAnticipatedInnoUser` | Read-only dependency under option (a); **must change under (b)/(c)** — see §10 |
| Spec P2-4048 (archived) | IFC-R-10 "no bilateral change" is superseded for bilateral by this spec |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: backend/API-only change; the centre-form mockup of P2-4048 (`docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/mockup/`) is the reference for the codes and labels only.

## 9. Requirement Delta Preview

### ADDED Requirements

- **R-1** Accept `count_unit` (`households` \| `individuals`) and `use_nature` (`information_received` \| `innovation_applied`) on `innovation_use.current_innovation_use_numbers.actors[]`, exact-case, same whitelist as `farmer-follow-up.constant.ts`.
- **R-2** `count_unit` and `use_nature` are stored only on Farmers rows (`actor_type_id = 1`, resolved from id or name) — OQ-1 = (a). A valid code on any other actor type is not stored and returns a warning `actor_count_unit_not_applicable` / `actor_use_nature_not_applicable` — OQ-2 (extended to `use_nature` by consistency, since both fields share the Farmers-only rule).
- **R-3b** `count_unit = households` without `how_many` → `400 actors[i].how_many is required when count_unit is households` — OQ-3.
- **R-3** `count_unit = households` → store `how_many` only; `women`, `men`, `women_youth`, `men_youth` and the `has_*` flags are cleared and `sex_and_age_disaggregation = true` (the centre form's single-total path, C-5). The youth-within-gender check is skipped for that row.
- **R-4** Two or more Farmers rows in one result with different answer pairs are stored as separate rows (e.g. 3,800 `information_received` + 1,200 `innovation_applied`).
- **R-5** Missing answer on a Farmers row → result accepted, field stored `NULL`, warning on `outcomes[].warnings`: `{ field: 'innovation_use.actors', index, code: 'actor_count_unit_missing' | 'actor_use_nature_missing', message }`.
- **R-6** Value present but not in the whitelist → `400` `actors[i].count_unit must be one of: households, individuals; received "<v>".` (same style as `actor_type_name`). Checked in the preflight, so nothing is written.
- **R-7** GET `/:id` (all sections) and the QA payload return `count_unit` and `use_nature` on every actor (`null` when empty). Additive.

### MODIFIED Requirements

- **M-1** `outcomes[].warnings` becomes a union of partner warnings (P2-4067, unchanged) and actor warnings. Existing partner entries keep their exact shape.
- **M-2** Handler no longer forces both fields to `null` (C-1).

### REMOVED Requirements

- None.

### 9.4 Scenarios `/akili-specify` must turn into tests

| # | Given | Then |
|---|---|---|
| S-1 | Farmers, `households`, `how_many: 500`, `women: 200, men: 300` | one row, `how_many = 500`, breakdown NULL, `sex_and_age_disaggregation = true`, no warning on count_unit |
| S-2 | Farmers ×2: `information_received` 3,800 + `innovation_applied` 1,200, both `individuals` | two active rows |
| S-3 | Non-Farmers (e.g. type 2) with `count_unit: households` and/or `use_nature: innovation_applied` | 201, both stored NULL, `actor_*_not_applicable` warning(s), no 400 |
| S-3b | Farmers, `households`, no `how_many`, `women: 200` | 400, nothing written |
| S-4 | Farmers with neither field (MEL/IITA payload today) | 201, both NULL, two warnings with the row's `index` |
| S-5 | `use_nature: "applied"` | 400, nothing written |
| S-6 | GET `/:id` of S-2 | both actors carry their codes |
| S-7 | Resubmission (`updated`) with the S-2 payload | same rows as a fresh create |

### 9.5 Field-alignment note (for fetcher schema / Normalizer docs)

| Path | Type | Allowed | Applies to | Missing | Invalid |
|---|---|---|---|---|---|
| `innovation_use.current_innovation_use_numbers.actors[].count_unit` | string, exact-case | `households`, `individuals` | `actor_type_id = 1` (or `actor_type_name` resolving to it) | warning `actor_count_unit_missing` | 400 |
| `innovation_use.current_innovation_use_numbers.actors[].use_nature` | string, exact-case | `information_received`, `innovation_applied` | `actor_type_id = 1` only | warning `actor_use_nature_missing` | 400 |
| Rule | — | Either field on a non-Farmers actor is ignored | — | — | warning `actor_count_unit_not_applicable` / `actor_use_nature_not_applicable` |
| Rule | — | `households` ⇒ `how_many` required (400 if absent); breakdown is discarded | — | — | — |
| Rule | — | one Farmers row per `use_nature`; do not sum the two | — | — | — |

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Handler-only normalisation** (recommended) | DTO fields; `prepareActors` validates (400), normalises households, drops `count_unit` off Farmers, collects warnings; the resolved warnings are returned by `resolveAndValidate` and read by the service in the existing pre-transaction step next to partner warnings. Shared writer untouched. | Smallest diff; centre form and `saveAnticipatedInnoUser` (4 callers) unchanged; warnings and writes come from the same resolution (P2-4067 rule) | Rules live in the handler, not shared with the centre form (mirrors how youth validation already lives there) |
| B — Push rules into `InnovationUseService` | Households clearing and type-gating in `buildActorData` for every caller | One home for the rule | Changes the centre-form writer (4 callers) for a W3 need; re-opens P2-4048's verified behaviour |
| C — DTO-level validation (`@IsIn`) | class-validator rejects bad codes | Free 400 | Error comes as the generic validation array, not `actors[i]` style; still needs handler work for warnings/households |

**OQ-1 must be a single condition.** In option A, one predicate `asksUseNature(actorTypeId)` (default `id === FARMERS_ACTOR_TYPE_ID`) decides whether `use_nature` is stored and warned. ⚠️ Finding: under (b)/(c) that predicate is **not enough on its own** — `saveAnticipatedInnoUser` matches non-Farmers rows by type only (C-3), so two "Researchers" rows with different `use_nature` would collapse into one. (b)/(c) therefore also need the match key in `innovation-use.service.ts:492-496` to follow the same predicate, which touches the centre-form writer.

## 11. Recommended Approach

**Option A with OQ-1 = (a) Farmers-only (confirmed by Santiago)**, because it is the only path that changes no code outside `api/bilateral`, keeps MEL/IITA payloads valid, and reuses two existing patterns (actor_type 400 style; P2-4067 pre-transaction warnings). Export `asksUseNature` from `farmer-follow-up.constant.ts` so (b)/(c) is a one-line change plus the match key noted above.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed handling |
|---|---|---|
| ~~OQ-1~~ **Resolved** | `use_nature` on every actor type? | **(a) Farmers only** — Santiago, 2026-11-10, per Marc Schut's original request. The SO email's "every actor type" is not adopted; tell Nicoleta/Daniel |
| ~~OQ-2~~ **Resolved** | Valid code on a non-Farmers actor | **Ignore + warning** — Santiago, 2026-11-10 |
| ~~OQ-3~~ **Resolved** | `households` without `how_many` | **400** — Santiago, 2026-11-10 |
| OQ-4 | Ticket key | Owner to supply |
| R-a | Two Farmers rows with the **same** answer pair (incl. both missing) still merge into one row (last wins) — today's behaviour for every bilateral Farmers duplicate (C-3) | Keep; document in the payload doc; optionally warn `actor_duplicate_merged` (decide in specify) |
| R-b | MEL/IITA start getting warnings on every Farmers row | Additive and expected; tell producers in the change-log row |
| R-c | Fetcher strips unknown fields → TEST shows nothing even if PRMS works | E2E on PRMS TEST must post directly to `/api/bilateral/create` first, then through the fetcher once `onecgiar_result_functions` ships |
| R-d | Live green-check body differs from repo (C-8) | `UNVERIFIED` — confirm `source <> 'API'` exclusion on prtest before release |
| Dep | Deploy is automatic on merge to the environment branch; bilateral work goes on `performance-refactor`, not `staging` (team memory) | Branch from `performance-refactor` at execute time — confirm |

## 13. Success Criteria

- S-1…S-7 pass as unit/fixture tests (handler + read mappers).
- A MEL/IITA-shaped payload (no new fields) returns 201 with the same stored rows as before plus warnings.
- On PRMS TEST: a direct POST with S-1 + S-2 data, then GET `/:id`, shows the stored codes and the households single total.
- Payload doc change-log row and Swagger updated; targeted jest + lint green.

## 14. Next Step

```text
/akili-specify bilateral/innovation-use-actor-follow-up
```

Standard (Lite) depth: single module, no migration, additive contract change. OQ-1..3 resolved (Document Control); ticket P2-4106; SO clarification on `use_nature` scope pending (see P2-4106 open point).
