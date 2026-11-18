# Proposal — Innovation Use: `use_nature` on every actor type (W1/W2 + W3/Bilateral)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/innovation-use-nature-all-actors` |
| Slug | `innovation-use-nature-all-actors` — derived from free-text argument ("INC-168062 — Innovation Use: extender use_nature … a TODOS los actor types …") |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Ticket | **INC-168062** (Freshservice, "Change for innov use"), raised by Nicoleta Trifa (SO), 10 Nov 2026 · Agent: Juan David Delgado · **Due Fri 20 Nov 2026 16:53** |
| Requirement source | Ticket print `C:\Users\User\Downloads\CHANGE INNO USE.pdf` (7 pages: Nicoleta 10 Nov; Daniel Lozano 10 Nov; Juan David 10 Nov ×2; Nicoleta 16 Nov; Daniel 16 Nov; Daniel 18 Nov). Not copied into the repo: it carries third-party e-mail addresses |
| Business decision | **Option B** — `use_nature` applies to every actor type, **in W3 and in the Centre form (W1/W2)**, so both workflows store the same data. Stated by Daniel Lozano, 16 Nov ("Since Nicoleta has confirmed Option B"); Nicoleta's own 16 Nov reply asks to "prioritize … adding the second question to all actor type for innov use (otherwise the API will not work)". Her inline red comments are **not** in the PDF — see OQ-7 |
| Supersedes | `bilateral/innovation-use-actor-follow-up` BIF-OQ-1 = (a) "Farmers only" (decided 2026-11-10, per Marc Schut's original request) · `archive/2026-11-03-changes--innovation-use-farmer-count-nature` IFC-R-1 ("away from Farmers both answers go") **for `use_nature` only** |
| Related specs | `bilateral/innovation-use-actor-follow-up` (P2-4106, BIF) · `archive/2026-11-03-changes--innovation-use-farmer-count-nature` (P2-4048, IFC) · `archive/2026-11-12-bugfix--innovation-use-youth-required` (IUY, current live green-check body) · `archive/2026-11-12-changes--innovation-use-w3-hide-2030` (IWH, W3 gating pattern on both W3 surfaces) |
| Depends on | none — columns (`1793300000000-AddFarmerCountNatureToResultActors`), DTO fields and rules from P2-4048 / P2-4106 are already on `master` (`git merge-base --is-ancestor 0eba92126 origin/master` → yes) |
| Parallel-safe | no — shares `farmer-follow-up.constant.ts`, `innovation-use.service.ts` (4 callers) and the live green-check function with any other Innovation Use work |
| Migration | none (columns exist, `varchar(32)` NULL). **Manual SQL:** the live `validation_innovation_use_P25` function (see §3 C-9) |
| External consumers | SO bulk uploader (Daniel Lozano) — no change on their side; they re-test on TEST the same day and release the uploader once on prod. MEL / IITA producers — more warnings (R-c) |
| HITL decision owners | Santiago Sánchez (PRMS product) · Nicoleta Trifa (SO, template/MDS owner) for OQ-7 |
| HITL decisions | **Resolved 2026-11-18 by Santiago Sánchez (Claude Code session):** OQ-1 = `use_nature` **required** for every actor type in W1/W2 (green check) · OQ-2 = **both blocks** (current use + 2030) · OQ-3 = W3 screens **show + edit, not blocking** · OQ-4 = non-Farmers rows show **only the question card, no title** |
| Author / date | Santiago Sánchez (with Claude Code) · 2026-11-18 |

## 2. Intent

Make **"What best characterises the nature of this innovation use number?"** (`use_nature`) a question of **every** Innovation Use actor row — not only Farmers — in the bilateral API, the shared writer, the Centre form and both W3 screens, and keep two rows of the **same** actor type apart when their nature differs. `count_unit` (households / individuals) **stays Farmers-only**. This unblocks the SO bulk uploader, which already sends the agreed payload.

## 3. Problem / Current Behavior

| # | Today | Evidence |
|---|---|---|
| C-1 | The single applicability switch for `use_nature` is Farmers-only | `onecgiar-pr-server/src/api/results/result-actors/farmer-follow-up.constant.ts:56` (`asksUseNature = isFarmers`); `:53` `asksCountUnit` identical |
| C-2 | Bilateral rules drop `use_nature` on non-Farmers rows (set `null` + warning `actor_use_nature_not_applicable`) and only warn "missing" on Farmers. This is why TEST results 10118, 10119, 10120 (ids 12586–12588) stored `use_nature = NULL` for Extension agents, Other and Researchers | `…/bilateral/handlers/innovation-use-actor-follow-up.rules.ts:90-104` (drop), `:113` (missing); TEST observation from Daniel's 18 Nov e-mail — `UNVERIFIED — confirm at source before relying on it` (query `result_actors` for result ids 12586-12588) |
| C-3 | The duplicate warning `actor_duplicate_merged` only considers Farmers rows; key `count_unit|use_nature` | `…rules.ts:139-151` |
| C-4 | Shared writer `saveAnticipatedInnoUser`: a row **without** `result_actors_id` is matched on `(result_id, is_active, section_id, actor_type_id)` + `other_actor_type` for type 5; `count_unit` + `use_nature` join the key **only for Farmers**. So for Researchers 25 `information_received` + Researchers 12 `innovation_applied` the second row **updates** the first (TEST result 10120) | `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts:474-500` |
| C-5 | `buildActorData` already stores `toUseNature(el.use_nature)` for **any** type — the writer is not the blocker for point 1, the rules are | `innovation-use.service.ts:684-685` |
| C-6 | `saveAnticipatedInnoUser` has **4 callers**: v2 controller (W1/W2 P25 form), bilateral handler, `results-framework-reporting/innovation_dev/innovation_dev.service.ts:229`, review update `results/results.service.ts:5434`. The last two do not send `use_nature` → today non-Farmers rows match by type and **update** | `grep saveAnticipatedInnoUser` as run 2026-11-18 · lesson **KZ-changes--innovation-use-farmer-count-nature-1** (a caller list written from memory missed 3 of 4) |
| C-7 | Centre form: the follow-up block (both questions + title "Follow-up questions for actor type Farmers/…") renders only on Farmers rows, in current use **and** the 2030 block; `onActorTypeChange` clears **both** answers when leaving Farmers; `removeOther` lets only "Other" and Farmers repeat — any other type is one row per result | `onecgiar-pr-client/src/app/shared/components/innovation-use-form/innovation-use-form.component.html:120, :561, :852-900` · `.ts:515-518` (`removeOther`), `:546-555` (gate), `:580-592` (`onActorTypeChange`) · copy in `farmer-follow-up.ts` |
| C-8 | The shared form hides the block for W3: `isFarmerFollowUpResult()` returns false when `source_name === 'W3/Bilaterals'` (and for IPSR, and phase year < 2026) | `innovation-use-form.component.ts:546-550` |
| C-9 | Completeness (green check) is a **live SQL function** maintained outside migrations; it requires both answers only on active Farmers rows (`ra.actor_type_id = 1`), sections 1 and 2, `phase_year >= 2026`, `source <> 'API'`. The repo migration copy is stale | Latest body `docs/specs/archive/2026-11-12-bugfix--innovation-use-youth-required/sql/validation_innovation_use_P25.after.sql:221-231` (section 1) and `:427-437` (section 2) · `innovation-use/CLAUDE.md:66, :71` · live body `UNVERIFIED — confirm with SHOW CREATE FUNCTION on prtest before relying on it` |
| C-10 | QA catalog marks `use_nature` required **and** visible only for Farmers | `onecgiar-pr-server/src/api/qa-catalog/definitions/sections/innovation-use.ts:151-154` (`FARMERS_RULE`), `:267-275` · snapshot `qa-catalog/__snapshots__/qa-catalog.snapshot.json` |
| C-11 | Second W3 surface — the bilateral editor `type-innovation-use` — has no follow-up questions at all. It loads via `GET summary/innovation-use/get/result/:id` (entity read, so both columns already come back) and saves via `PATCH summary/innovation-use/create/result/:id` → `results/summary/innovation_dev.service.ts` `saveAnticipatedInnoUser` (**a different, legacy writer**) which never writes `count_unit` / `use_nature` | `onecgiar-pr-client/src/app/pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.html:99-111` · `.ts:776-791` · `shared/services/api/bilateral-api.service.ts:193-199` · `onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts:164-300` (no `count_unit`; `grep -rn count_unit src/api/results/summary` → no hit) · `summary.service.ts:389` (read) |
| C-12 | The W1/W2 page always sends both fields on every row (`?? null`) — no change needed there | `…/innovation-use-info/innovation-use-info.component.ts:457-466` |
| C-13 | Bilateral resubmission deactivates every stored actor first and re-adds, so it inherits the new key with no extra work | `…/bilateral/services/bilateral-resubmission.service.ts:1127-1130` |
| C-14 | Public contract still says Farmers-only for `use_nature` | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md:331, :521, :523, :526, :546, :561` · change log `:741` |

## 4. Proposed Outcome

| Surface | After this change |
|---|---|
| Bilateral `POST /api/bilateral/create` (+ resubmission) | `use_nature` stored on **every** actor type. Missing on any active row → stored empty + `actor_use_nature_missing` warning. `actor_use_nature_not_applicable` no longer fires. `count_unit` unchanged (Farmers only; elsewhere ignored + warning). Two rows of the same type with different `use_nature` → two rows. Same type + same key → merged + `actor_duplicate_merged` on any type |
| Shared writer (4 callers) | Row identity without id = `actor_type_id` + `use_nature` (+ `count_unit` for Farmers, + `other_actor_type` for Other) — **without** changing behaviour for callers that do not send `use_nature` (see §10, DD-proposal) |
| Centre form W1/W2 (2026+, not IPSR) | Every active actor row shows the `use_nature` question (required); Farmers rows also show `count_unit` as today. Changing type keeps `use_nature`, clears only `count_unit` (and the Households single-total path). Every actor type may be added more than once |
| Green check (live SQL) | `use_nature` required on every active actor row of every type in sections 1 and 2 (non-TBD), 2026+, `source <> 'API'`; `count_unit` still Farmers-only |
| W3 screens (shared form for W3 + bilateral editor) | Both answers visible and editable (`count_unit` only on Farmers). W3 completeness unchanged (decision OQ-3) |
| QA catalog | `use_nature` required/visible for every type; `count_unit` stays `FARMERS_RULE` |
| Docs | `bilateral-result-summaries.en.md` (actors table, ingestion steps, warnings, alignment table, change-log row) + Swagger; field note for SO's "PRMS Normalizer Technical Field Documentation" |

**Acceptance payload (Daniel, result 10120 — `current_innovation_use_numbers.actors`):**

```json
[
  { "actor_type_id": 2, "how_many": 25, "sex_and_age_disaggregation": false, "women": 10, "men": 15, "use_nature": "information_received" },
  { "actor_type_id": 2, "how_many": 12, "sex_and_age_disaggregation": false, "women": 5,  "men": 7,  "use_nature": "innovation_applied" }
]
```

→ two active Researchers rows, each with its own `use_nature`, no `not_applicable` warning.

## 5. Scope

Ordered by what unblocks the ticket. **Release cut 1** (server) can go to TEST before the UI.

| # | Ticket point | Item | Priority |
|---|---|---|---|
| 1 | Daniel 18 Nov #1 | `asksUseNature` → every resolved actor type (one predicate, BIF-DD-4) | Must |
| 2 | Daniel 18 Nov #2 | Rules: generalise step 9 duplicate warning to every type, key = type + `other_actor_type` (type 5) + `count_unit` + `use_nature`; message no longer says "Farmers" | Must |
| 3 | Daniel 18 Nov #2 | Shared writer match key in `innovation-use.service.ts:484-496` extended to `use_nature` for every type, presence-gated for callers that do not send it (C-6) | Must |
| 4 | Daniel 16 Nov #4 / Juan David 10 Nov §5 | Contract doc + change-log row + Swagger `ApiProperty` text on `InnovationUseActorDto.use_nature`; field note for SO | Must |
| 5 | Option B (Centre form) | Shared form: split the block — `use_nature` on every active row, `count_unit` + title on Farmers rows only; `onActorTypeChange` keeps `use_nature`; `removeOther` lets every type repeat (2026+ scope only) | Must |
| 6 | Option B (Centre form) | Live green check `validation_innovation_use_P25`: `use_nature` on every type (both sections); `before/after/checks.sql` under the spec, applied by hand on prtest then prod | Must |
| 7 | Option B | QA catalog rule for `use_nature` + snapshot | Must |
| 8 | Daniel 16 Nov #3 ("if possible") | Shared form on W3 results: show both answers (gate C-8 relaxed for the block only) | Should |
| 9 | Daniel 16 Nov #3 | Bilateral editor `type-innovation-use`: both answers on the actor card + legacy writer `results/summary/innovation_dev.service.ts` persists `count_unit` / `use_nature` (same whitelist) | Should |
| 10 | Daniel 18 Nov "let us know" | Reply on INC-168062 with TEST date (after release cut 1) and prod date | Must (comms) |
| 11 | Uploader path `/ingest` | **Second repo `onecgiar_result_functions` (fetcher):** docs only — `services/fetcher/src/docs/guides/08-innovation-use.md` (`use_nature` "Farmers only" → every type; drop the `actor_use_nature_not_applicable` row; mixed groups for any type), `02-changelog.md`, `openapi.json`; `validator/schemas/innovation_use.json` only the `use_nature` description text. Schema already accepts `use_nature` on any type (enum only, no type condition — commit `7a27c43`) | Must |
| 12 | Prod release | `7a27c43` (P2-4106 fetcher) is on `dev` / `dev-fetcher` only, **not `main`**. Prod ingestion deploys from `main` (`.github/workflows/jenkins-trigger-prod-ingestion.yml`) and AJV runs `removeAdditional: true` (`validator/ajv.js:6`), so on prod the fetcher **strips** `count_unit` / `use_nature` before PRMS sees them. Promote `dev-fetcher` → `main` together with the PRMS prod deploy | Must (release) |

## 6. Non-Goals

- `count_unit` on non-Farmers types (stays Farmers-only everywhere).
- IPSR (step 1 keeps today's form; `isIpsr` gate untouched).
- Phase years ≤ 2025 (Centre form gate `FARMER_FOLLOW_UP_MIN_PHASE_YEAR = 2026` untouched).
- A bilateral 2030 projection block (not ingested; hidden on W3 by IWH).
- Back-filling `use_nature` on stored rows (NULL stays NULL until answered; TEST rows 10118-10120 are re-sent by the uploader).
- AI QA payload (BIF deferred it; still deferred).
- New codes, renames, a MySQL ENUM, any migration.
- The SO template, its "Other user type" macro column and the uploader (owned by SO).
- Changing the W3 MDS completeness / submit gate (unless OQ-3 decides otherwise).

## 7. Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| SO bulk uploader (Daniel Lozano) · template (Nicoleta Trifa) | Unblocked; no change on their side |
| MEL, IITA (current producers) | Now get `actor_use_nature_missing` on **every** actor row they send (was Farmers only) — additive warnings, never a failure |
| Centre submitters (W1/W2, 2026) | One new required question per non-Farmers row; existing 2026 results with non-Farmers rows may turn incomplete (OQ-1) |
| Centre users on W3 screens | Can see / complete both answers |
| QA reviewers | See `use_nature` on every row (QA catalog) |
| Server | `farmer-follow-up.constant.ts`, `bilateral/handlers/innovation-use-actor-follow-up.rules.ts` (+ spec), `results-framework-reporting/innovation-use/innovation-use.service.ts` (+ specs `…farmer-count-nature.spec.ts`, `…farmer-follow-up.spec.ts`), `results/summary/innovation_dev.service.ts` (item 9), `qa-catalog/definitions/sections/innovation-use.ts`, `qa-catalog/definitions/closed-control-lists.ts` (comments), `qa-catalog/__snapshots__/…`, `docs/bilateral-result-summaries.en.md`, `bilateral/dto/create-bilateral.dto.ts` (Swagger text only) |
| Client | `shared/components/innovation-use-form/*` (+ `farmer-follow-up.ts` copy, specs, `CLAUDE.md`), `pages/bilateral/components/section-type-specific/type-innovation-use/*` (+ spec, `CLAUDE.md`) |
| DB | Live function `validation_innovation_use_P25` (manual SQL, prtest then prod) |
| Unchanged, verified consumers | `innovation-use-info.component.ts` (already sends both fields), bilateral read mapper `bilateral.service.ts:2966-2967` (already returns both on every row — only its comment "Only a Farmers row has them stored" changes), resubmission (C-13) |
| Specs | BIF-OQ-1 and IFC-R-1 superseded for `use_nature`; note it in both folders' `CLAUDE.md` and in `innovation-use/CLAUDE.md` §"Seguimiento Farmers" at archive |

## 8. Visual Reference

- Source: Ticket screenshots (INC-168062 PDF p.1–2: the existing Farmers block, and the `use_nature` card shown above an open Actor type dropdown with a red arrow across all five types) + the IFC mock-up `docs/specs/archive/2026-11-03-changes--innovation-use-farmer-count-nature/mockup/farmer-follow-up-questions.png` (codes, labels, descriptions — verbatim copy).
- Location: `C:\Users\User\Downloads\CHANGE INNO USE.pdf` (local, not committed) · the archived mockup path above.
- Notes: no new visual design. The same question card is reused on non-Farmers rows; the open point is only the block title (OQ-4). Mockup generation offered as optional, not required.

## 9. Requirement Delta Preview

### ADDED Requirements

- **R-1** Bilateral: `use_nature` (`information_received` | `innovation_applied`) is stored on every active Innovation Use current-use actor whose type resolves, any `actor_type_id`.
- **R-2** Bilateral: missing `use_nature` on any active row → result accepted, field `NULL`, warning `actor_use_nature_missing` with the row `index`.
- **R-3** Shared writer: a row without `result_actors_id` whose payload **carries** the `use_nature` key is matched on `use_nature` (whitelisted, `IsNull()` when empty) for every type; Farmers additionally on `count_unit`; Other additionally on `other_actor_type` (today).
- **R-4** Centre form (2026+, not IPSR, W1/W2): every active actor row shows the `use_nature` question, required; the count-unit question and the Farmers title stay Farmers-only.
- **R-5** Centre form: every actor type may be selected on more than one row (one row per nature of use).
- **R-6** Green check: section incomplete when an active actor row (any type) in a non-TBD block has `use_nature` NULL or outside the two codes (2026+, `source <> 'API'`).
- **R-7** W3 screens (shared form on W3 results and bilateral editor): both answers shown and editable with the same rules (`count_unit` Farmers only); the bilateral editor's save persists them.

### MODIFIED Requirements

- **M-1** (was BIF-R-2 / step 4) `actor_use_nature_not_applicable` is no longer emitted; the code stays in the warning-code union and the doc as **retired**, so existing consumers that switch on it do not break.
- **M-2** (was BIF-R-11 / step 9) `actor_duplicate_merged` applies to every type; key = type (+ `other_actor_type`) + `count_unit` + `use_nature`; message: "Another actor of the same type with the same count_unit and use_nature was sent; the rows are stored as one and the later one wins."
- **M-3** (was IFC-R-1) Leaving Farmers clears `count_unit` (and restores the grid after Households) but keeps `use_nature`.
- **M-4** (was IFC-R-4 / IFC-DD-7) "Only Other and Farmers repeat" → every type repeats, inside the follow-up scope only.
- **M-5** QA catalog `use_nature`: `required_when` / `visible_when` = any actor type (no longer `FARMERS_RULE`).
- **M-6** Contract doc: `use_nature` "Applies to" = every actor type; mixed groups = one row per `use_nature` for any type.

### REMOVED Requirements

- None (the warning code is retired, not removed — M-1).

### 9.4 Scenarios `/akili-specify` must turn into tests

| # | Given | Then |
|---|---|---|
| S-1 | Bilateral, Daniel's 10120 payload (Researchers 25 `information_received` + 12 `innovation_applied`) | 201; two active rows type 2 with their codes; no `not_applicable`, no `duplicate_merged` |
| S-2 | Bilateral, Researchers ×2 same `use_nature` | one row, later wins, `actor_duplicate_merged` on index 1 |
| S-3 | Bilateral, Extension agents (type 3) without `use_nature` | 201, NULL, `actor_use_nature_missing` |
| S-4 | Bilateral, Other ×2 with different `other_actor_type`, same `use_nature` | two rows (no merge warning) |
| S-5 | Bilateral, type 4 with `count_unit: households` | `count_unit` dropped + `actor_count_unit_not_applicable`; `use_nature` stored |
| S-6 | Bilateral, `use_nature: "applied"` on type 2 | 400 `actors[0].use_nature must be one of: …` (unchanged) |
| S-7 | Bilateral, Daniel's 6-actor payload of 16 Nov (Farmers received / applied / households, Researchers received / applied, Other) | 6 active rows; Farmers households total only |
| S-8 | Review-update caller (`results.service.ts:5434`) sends a Researchers row **without** id and **without** the `use_nature` key on a result whose stored Researchers row has `innovation_applied` | **updates** the stored row (no new row) — today's behaviour kept |
| S-9 | Centre form, 2026 W1/W2: add Researchers | `use_nature` question shown, required; no count-unit question; no Farmers title |
| S-10 | Centre form: Farmers row with both answers → change type to Policy actors | `count_unit` cleared (+ grid back if it was Households), `use_nature` kept |
| S-11 | Centre form: add a second Researchers row | allowed by the type select |
| S-12 | Green check: 2026 W1/W2 result, active Researchers row with `use_nature` NULL | red; answered → green; W3 (`source='API'`) unaffected |
| S-13 | Shared form on a W3 2026 result | both answers rendered on the right rows; 2030 block still hidden (IWH) |
| S-14 | Bilateral editor: set `use_nature` on a Researchers card, save, reload | value persisted through `PATCH summary/innovation-use/create/result/:id` |
| S-15 | IPSR step 1 and a 2025 result | no question rendered (unchanged) |

### 9.5 Field-alignment note (to send to SO for the "PRMS Normalizer Technical Field Documentation")

| Path | Type | Allowed | Applies to | Missing | Not applicable | Invalid |
|---|---|---|---|---|---|---|
| `innovation_use.current_innovation_use_numbers.actors[].count_unit` | string, exact case | `households`, `individuals` | Farmers (`actor_type_id` 1) | warning `actor_count_unit_missing` | ignored + `actor_count_unit_not_applicable` | 400 |
| `innovation_use.current_innovation_use_numbers.actors[].use_nature` | string, exact case | `information_received`, `innovation_applied` | **every actor type** | warning `actor_use_nature_missing` | n/a | 400 |
| Rule | — | `households` ⇒ `how_many` required (400), breakdown discarded | Farmers | — | — | — |
| Rule | — | Mixed groups: one row per `use_nature`, any type; rows are not summed. Row identity = `actor_type_id` + `use_nature` (+ `count_unit` Farmers, + `other_actor_type` Other) | all | — | — | — |

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Predicate flip + presence-gated key, full Option B** (recommended) | Flip `asksUseNature`; generalise step 9; writer adds `use_nature` to the key for every type **only when the incoming row has the `use_nature` property** (`'use_nature' in el`), Farmers keep today's always-on key; Centre form + green check + QA catalog; W3 screens as Should items | Delivers exactly Option B; S-8 holds, so the review-update and `innovation_dev` callers (C-6) keep updating instead of inserting duplicates; Farmers behaviour byte-identical | Touches the 4-caller writer (needs the caller sweep KZ-…-1 asks for); green check is manual SQL |
| B — Always-on key for every type | Same as A but `use_nature` (`IsNull()` when absent) always in the key | Simplest diff | **Regression:** callers without the field stop matching rows that have an answer → duplicate active rows on review update (C-6) |
| C — W3 only (bilateral) | Flip the predicate for bilateral only (a bilateral-scoped predicate) + writer key; leave the Centre form Farmers-only | Smallest; fastest to TEST | Contradicts Option B ("including in the Centre form, to ensure W1/W2 and W3 remain aligned"); W1/W2 and W3 data diverge — the exact problem Juan David flagged on 10 Nov |

## 11. Recommended Approach

**Option A**, delivered in two release cuts inside one spec:

1. **Cut 1 — server (items 1–4, 7):** unblocks Daniel; goes to PRMS TEST first, then the TEST date is posted on INC-168062.
2. **Cut 2 — UI + green check (items 5, 6, 8, 9):** Centre form, live SQL (prtest → prod with `checks.sql` before/after), W3 screens.

Why: it is the only option that matches the confirmed business rule end to end while keeping every existing caller's behaviour (S-8). The predicate seam was designed for this (BIF-DD-4: "if SO extends `use_nature` to every actor type, only `asksUseNature` changes") — but BIF's own proposal §10 already warned that the predicate alone is **not** enough: the writer key must follow it. That warning is item 3.

Skills for `/akili-specify` tasks: `nestjs-expert` + `tdd` (server), `api-design-principles` (contract), `angular-developer` + `tailwind-design-system` (client), `systematic-debugging` not needed.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed handling |
|---|---|---|
| ~~OQ-1~~ **Resolved: required** (Santiago, 2026-11-18) — still run §12.1 to report the impact to Nicoleta | Is `use_nature` **required** (green check / submit gate) for non-Farmers rows in W1/W2 2026? Nicoleta's screenshot shows the card with the REQUIRED pill. If yes, 2026 W1/W2 results that already have non-Farmers rows turn incomplete | Recommend **required** (Option B parity). Before specify, measure the impact on prtest/prod with the count query in §12.1; send the number to Nicoleta with the decision |
| ~~OQ-2~~ **Resolved: both blocks** | Apply to the **2030 projection** block (section 2) too? The Farmers block appears there today | Recommend **yes** (same template both blocks, same green-check sections) |
| ~~OQ-3~~ **Resolved: show + edit, not blocking** | On W3 screens, is `use_nature` only shown/editable, or does it count for W3 completeness / MDS tracker? Daniel asks to "check or complete" | Recommend **show + editable, not blocking** (W3 green check keeps `source <> 'API'`; bilateral MDS tracker unchanged) — warnings already flag missing answers |
| ~~OQ-4~~ **Resolved: no title on non-Farmers rows** | Block copy on non-Farmers rows: the title says "Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers" | Recommend: non-Farmers rows show **only** the `use_nature` card, no title; Farmers keep title + both cards. Question and option texts verbatim (IFC copy) |
| **OQ-5** | Due date Fri 20 Nov (2 days) | Cut 1 is realistic for TEST by 20 Nov; cut 2 likely after. Tell Daniel and Nicoleta explicitly |
| **OQ-6** | Deploy branch for TEST | P2-4106 went `qa-development-2026-ss` → `performance-refactor` (PRMS TEST, auto-deploy on merge). Confirm the same route at execute time |
| **OQ-7** | Nicoleta's 16 Nov inline red comments are not in the ticket print | Ask for them (or the e-mail) before specify; they may hold copy or OQ-1/OQ-2 answers |
| R-a | Writer change hits 4 callers (KZ-changes--innovation-use-farmer-count-nature-1) | Specify runs `codegraph_callers saveAnticipatedInnoUser` and lists all 4 with a test per caller class (S-8) |
| R-b | Live green check differs from the archived body (C-9) | `SHOW CREATE FUNCTION validation_innovation_use_P25` on prtest **before** editing; save as `before.sql`; apply prtest → prod (Santiago) right after the code deploy |
| R-c | MEL/IITA see many new `actor_use_nature_missing` warnings | Additive; call it out in the change-log row |
| R-d | Duplicate-type rows in the Centre form could collide on the same `use_nature` (merged on save) | Out of the ticket; document; optional client hint later |
| R-e | Retiring `actor_use_nature_not_applicable` | Keep it in the TS union and docs as "retired, no longer emitted" (M-1) |
| R-f | Legacy writer (`results/summary/innovation_dev.service.ts`) used by the bilateral editor and possibly other pages | Item 9 writes only whitelisted codes and only when the key is present, so callers that do not send them are untouched; specify lists its callers |
| R-h | Fetcher (`onecgiar_result_functions`) prod is behind: P2-4106 fields not on `main` (item 12) — the uploader would lose both answers on prod even after PRMS ships | Release checklist: merge fetcher `dev-fetcher` → `main` in the same window as PRMS prod; re-test `/ingest` on prod with the 10120 payload |
| R-g | Bilateral AI-draft promotion may build actors through the same create path | `UNVERIFIED — confirm at source before relying on it`; specify checks whether promotion goes through `InnovationUseBilateralHandler` |

### 12.1 Impact query for OQ-1 (run read-only on prtest and prod before specify)

```sql
-- 2026+ W1/W2 Innovation Use results with an active non-Farmers actor lacking use_nature, by status.
-- Column/table names follow validation_innovation_use_P25 (archive sql); confirm against the live schema.
SELECT r.status_id, COUNT(DISTINCT r.id) AS results, COUNT(*) AS actor_rows
FROM result r
JOIN version v        ON v.id = r.version_id
JOIN result_actors ra ON ra.result_id = r.id AND ra.is_active = 1
WHERE r.is_active = 1
  AND r.result_type_id = 2
  AND v.phase_year >= 2026
  AND r.source <> 'API'
  AND ra.actor_type_id <> 1
  AND ra.use_nature IS NULL
GROUP BY r.status_id;
```

`UNVERIFIED — confirm at source before relying on it`: the `version`/`phase_year` join and `result_type_id = 2` for Innovation Use are taken from `ResultTypeEnum` and the green-check body, not run.

## 13. Success Criteria

- S-1…S-15 green as unit / component tests; targeted server jest + eslint + `tsc`, client jest + `ng lint` green.
- On PRMS TEST: Daniel's 10120 and 6-actor payloads POSTed directly to `/api/bilateral/create` store the expected rows (GET `/:id` shows them); then re-tested by Daniel through the uploader.
- Centre form on TEST: a 2026 W1/W2 result shows the question on every type, saves and reloads two Researchers rows, green check red/green as S-12.
- Live green check applied on prtest, then prod, with `checks.sql` before/after recorded.
- Contract doc change-log row, Swagger and the SO field note delivered; INC-168062 answered with TEST and prod dates.

## 14. Next Step

```text
/akili-specify changes/innovation-use-nature-all-actors
```

Standard depth (two modules, a 4-caller shared writer, a manual SQL function, a public contract change). OQ-1…OQ-4 resolved (Document Control). OQ-7 (Nicoleta's red comments) can arrive in parallel; OQ-5 and OQ-6 are settled at the specify gate.
