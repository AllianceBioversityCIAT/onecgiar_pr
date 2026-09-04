# type-knowledge-product (bilateral)

**Verified:** 2026-09-02 · branch performance-refactor · 3e87d5e60

## What it is
Section 5 of the bilateral form: Knowledge Product. Everything on screen except the **MELIA block**
is repository metadata mirrored from CGSpace — read-only, and never sent back. The MELIA answers are
the only editable fields and the only payload.

## Contract
- Endpoints, all shared with the pooled-funding KP form (no bilateral-specific one):
  `GET results/results-knowledge-products/get/result/:id` and
  `PATCH results/results-knowledge-products/upsert/:id` via `BilateralApiService.GET_knowledgeProduct`
  / `PATCH_knowledgeProductMelia`, plus `PATCH_resyncKnowledgeProduct`, `GET_clarisaMeliaStudyTypes`
  and `GET_tocMeliaStudies` / `GET_ostMeliaStudies`.
- State: `body` = `KnowledgeProductBodyMapped` (display only) and `melia` = the five answers that
  travel. `buildSavePayload()` (`:230-252`) sends **exactly** `isMeliaProduct`, `ostSubmitted`,
  `clarisaMeliaTypeId`, `ostMeliaId`, `tocMeliaStudyId` — the whole `ResultsKnowledgeProductSaveDto`.
- Saving goes through `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey:
  'type-specific', executor })`. `PATCH_knowledgeProductMelia` has **exactly one non-spec caller** in
  the client — the executor in `queueSave()` (`:221-227`) — and `patchByEndpoint`'s `typeSpecific`
  case throws (`../../../services/bilateral-auto-save.service.ts:428`), so `queueSave()` is provably
  the only route to that endpoint. `flush()` can only re-dispatch what `queueSave()` already queued.
- Load state: `loading = signal(true)` and `loadFailed = signal(false)`, both set in `publish()`
  (`:144-164`), which runs on **every** outcome.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)` — one item, plus one
  or two more as the MELIA tree opens. Never `handle` (P2-3384).

## Where it is used
- `../section-type-specific.component.html:20` — rendered when the result type is Knowledge Product (6).

## Traps (⚠️ = already broke something)
- 🥇 **The template is the load gate, and it is load-bearing — do not loosen it.** Audited 2-Sep-2026
  (P2-3556) against the data-loss chain that hit the three sibling sections; **this one is not
  vulnerable, and the template is the only reason**. `…component.html:2,7,19` replaces the entire field
  list with a loading line or an error box, and `:244` withholds the entire actions row, so on a failed
  or in-flight load there is **no control to type in and no Save to press**. That is why `queueSave()`
  needs no `loaded()` guard of its own, unlike `../type-innovation-dev` (`6e88e275b`) and
  `../type-policy-change` / `../type-capacity-sharing` (`1fef02f2a`), whose templates render the form
  regardless. Two lock tests in the spec (`Load gate (P2-3556)`) fail the moment the gate is removed.
- ⚠️ **What it would cost if it were loosened** — e.g. by swapping the full-block hide for the inline
  `app-alert-status` the three siblings now use: `melia` is a field initializer of five `null`s
  (`:50-56`), so a form that never loaded is indistinguishable from one the user emptied, and the
  server reads that as a wipe. `upsert` treats a falsy `isMeliaProduct` as "not a MELIA product" and
  nulls the other four answers (`onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts:1937-1946`),
  then writes `is_melia`, `melia_previous_submitted`, `melia_type_id`, `ost_melia_study_id` and
  `toc_melia_study_id` (`:1966-1984`). **Five columns in one autosave.**
- ⚠️ **Omitting a key does NOT protect here** — it is worse. `undefined` is still falsy at `:1937`, so
  the four sub-answers are nulled anyway, while TypeORM drops the omitted column from the SQL: the row
  is left with `is_melia = 1` and every sub-answer NULL, a state no form can produce. Only
  `tocMeliaStudyId` has a deliberate three-state contract (`dto/results-knowledge-product-save.dto.ts:5`,
  service `:1959-1963`), and it exists for the P22 form, which has no ToC picker at all.
- ⚠️ **This endpoint answers a missing record with a real 404, not a 200 skeleton.**
  `findOneByResultId` throws `{ status: 404 }` both for an unknown result (`:1742-1748`) and for a
  result with no `results_knowledge_products` row (`:1759-1765`), and `ResponseInterceptor` copies that
  onto the HTTP status (`onecgiar-pr-server/src/shared/Interceptors/Return-data.interceptor.ts:30,46`).
  Measured on prtest 2-Sep-2026: result `999999` → `404 "There is not a Result with the id 999999"`,
  result `3` → `404 "…does not have a linked Knowledge Product Details"`, result `1` → `200`.
  **Unlike `../type-policy-change`, 404 here is NOT the ordinary state of a new record** and must keep
  counting as a failure: a bilateral KP cannot exist without its row, because a failed
  `populateKPFromCGSpace` de-activates the result and aborts creation
  (`onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts:189-204`).
- ⚠️ **A 200 always carries a truthy `response`**, so `publish(falsy, false)` — the one state that
  would render an editable, empty, savable form — is unreachable: the mapper always returns a DTO
  (`results-knowledge-products.service.ts:1827-1839`) and the error path always sets a status ≥ 400
  (`shared/handlers/error.utils.ts:12-16`), which the client interceptor rethrows
  (`shared/interceptors/general-interceptor.service.ts:81-83`).
- ⚠️ **An empty MELIA-study option list does not clear the stored answer.** `GET_tocMeliaStudies` is
  skipped entirely when the program id is unresolved (`:119-128`) and both study GETs fall back to `[]`
  on error, so the select can render with a value that is not in its options. `app-pr-select.writeValue`
  sets its signal **without** calling `onChange` (`custom-fields/pr-select/pr-select.component.ts:100-121`),
  so no `ngModelChange` fires and nothing is autosaved. Do not "fix" the empty dropdown by resetting
  the model — that is the one edit that would turn this into a wipe.
- ⚠️ **`isTocMeliaPortfolio()` is a PHASE-YEAR gate, not a portfolio gate** — `reportingYear() >= 2025`
  (`:28,68`). It decides which study picker is offered *and* which key `buildSavePayload` sends, so a
  wrong answer sends `ostMeliaId: null` over a stored `toc_melia_study_id`. Bilateral only ever runs on
  the 2025-2030 portfolio; the unresolved year falls back to the ToC branch on purpose.
- ⚠️ **The spec's `build()` runs the first change detection** (`:43-47`), so `ngOnInit` fires. A test
  that creates the component without it renders nothing and asserts nothing.

## Pending / Coming soon
- Nothing. The section is feature-complete for bilateral; Sync is hidden for Journal Articles unless
  the user is an admin (`canSync()`, `:81`).
