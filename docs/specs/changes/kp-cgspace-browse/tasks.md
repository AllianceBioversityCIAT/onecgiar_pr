# Tasks — Browse CGSpace when reporting a Knowledge Product

## 1. Scope of this task list

- **Module / feature:** `results` › `results-knowledge-products` (server) + `result-framework-reporting` › `aow-hlo-create-modal` (client) — `kp-cgspace-browse`
- **Linked spec:** `requirements.md` (rev 2) + `design.md` (rev 2) + `judgment.md`
- **Depth:** Standard · **Budget (from design §14):** 9 tasks · ~780 LOC incl. tests · 1–2 review rounds — `/akili-execute` stops and escalates when exceeded
- **Approval Mode:** gated
- **Owner / driver:** Juan Carlos Cadavid
- **Status:** archived 2026-08-26 — server tasks T-1..T-4 reviewed PASS; client tasks T-5..T-7 and gates T-8..T-9 accepted by the user as working without formal `/akili-validate` (user decision 2026-08-26)
- **Execution rule (user, 2026-08-26):** every Implementer/Tester verification runs Jest **scoped by path** to this spec's files; the full package suites are never run locally — CI owns that gate.

## 2. Pre-flight checklist

- [ ] `requirements.md` approved (rev 2).
- [ ] `design.md` approved (rev 2, Judgment Day round 1 fixes applied).
- [ ] Open questions resolved (KPB-OQ-1..4 all resolved/deferred).
- [ ] No CLARISA dependency.
- [ ] No conflicting in-flight spec touching `results-knowledge-products` or `aow-hlo-create-modal` (`docs/specs/` searched).
- [ ] No migration in scope — `npm run migration:check` green on a clean branch.
- [ ] `CGSPACE_DISCOVERY_URL` value agreed for local (`https://cgspace.cgiar.org/server/api`).

## 3. Task list

### [x] `KPB-T-1` — Record a live CGSpace HAL fixture and pin the metadata contract
- **Type:** `tests | docs`
- **Description:** Fetch one real Discovery response (`query=maize&size=3`, plus one call with `f.itemtype=…,equals` and one with the `dcterms.issued` year range) and save a trimmed, anonymised HAL fixture. Record in the fixture README the exact keys for title, authors, type, issued year, affiliation, DOI, country, uri, uuid, handle, and the accepted year-range filter form. Also confirm MQAP resolves a `https://cgspace.cgiar.org/items/<uuid>` URL for a `10947/…` item (design §13 / JD-21) and note the result. This closes the "to confirm" items in design §3.3.
- **Implements:** `KPB-R-9` (contract), `KPB-R-12` (year filter form), design §3.3 gaps
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/cgspace-search.hal.json`, `fixtures/README.md`
- **Depends on:** —
- **Blocks:** `KPB-T-2`, `KPB-T-3`
- **Estimate:** S
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:** `python3 -c "import json;d=json.load(open('…/cgspace-search.hal.json'));o=d['_embedded']['searchResult']['_embedded']['objects'][0]['_embedded']['indexableObject'];print(o['uuid'],o['handle'],sorted(o['metadata']))"` prints uuid/handle and the key list; README lists every key named in design §3.3. **Fails if:** any of `dc.title`, `dc.contributor.author`, `dcterms.issued`, `dcterms.type`, `cg.contributor.affiliation`, `dc.identifier.uri` is absent from the fixture, or the year-range filter call returned 4xx. **Evidence is worthless if:** the fixture was hand-written instead of captured (README must cite the request URL path + date).
- **Definition of done:**
  - [x] Fixture ≥ 2 items, one lacking DOI and country.
  - [x] README contract table filled; MQAP `10947` check recorded (pass/fail).
  - [x] No secrets; no full upstream URLs beyond the public host in README.

### [x] `KPB-T-2` — `CgspaceDiscoveryMapper` + DTOs (TDD)
- **Type:** `server`
- **Description:** Pure mapper HAL → `CgspaceSearchPageDto` / `CgspaceItemDto` per design §3.3/§4.1: pinned traversal path, arrays for multi-valued metadata, `[]`/`null` for missing, `year` from first 4 digits of `dcterms.issued`, `handleUrl` and `itemUrl` derived. DTO classes with class-validator rules for `CgspaceSearchQueryDto` (incl. `@ValidateIf` query-or-filter, `repository` enum) and `CgspaceFacetQueryDto`.
- **Implements:** `KPB-R-4` (card data), `KPB-R-9`, `KPB-R-30`, `KPB-AC-10`
- **Files (expected):** `cgspace-discovery/cgspace-discovery.mapper.ts`, `cgspace-discovery/dto/cgspace-search-query.dto.ts`, `dto/cgspace-facet-query.dto.ts`, `dto/cgspace-item.dto.ts`, `cgspace-discovery.mapper.spec.ts`, `dto/cgspace-search-query.dto.spec.ts`
- **Depends on:** `KPB-T-1`
- **Blocks:** `KPB-T-3`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `tdd`, `api-design-principles`
- **Verification:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products/cgspace-discovery` green. **Fails if:** fixture item 2 (no DOI/country) does not map to `doi: null`, `countries: []`; or `validate()` accepts `size=100`, a 201-char `query`, `repository=melspace`, or a body with neither query nor filter. **Presence caveat:** DTO decorator presence is not proof — the spec must run `validate()` from `class-validator` with `plainToInstance` (transform) exactly as the controller pipe will.
- **Definition of done:**
  - [x] Red → green commits per `tdd`.
  - [x] Lint clean; ≥ 80 % lines on new files.
  - [x] Commit `✨ feat(cgspace-discovery): Add Discovery HAL mapper and query DTOs`.

### [x] `KPB-T-3` — `CgspaceDiscoveryService` with fail-soft, Solr escaping and bounded TTL cache
- **Type:** `server`
- **Description:** Implement `search(dto)` and `facets(name, dto)` per design §5: param assembly (`dsoType=item`, filters `f.<facet>=<v>,equals`, year range on `dcterms.issued`, sort rule), Solr escaping, `timeout(8000)`, `catchError` → `{response:{}, message:'CGSpace search is temporarily unavailable', status:502}` for every failure incl. missing env, `upstream_4xx` warn log, structured `cgspace.search` / `cgspace.facets` logs (no URL/query text/body), bounded TTL map (200/20 entries, 60 s / 10 min, evict oldest). Success returns `{response, message, status:200}`.
- **Implements:** `KPB-R-9`, `KPB-R-10`, `KPB-R-12` (year param), `KPB-R-22`, `KPB-AC-7`, `KPB-AC-11`; NFR Security/Observability
- **Files (expected):** `cgspace-discovery/cgspace-discovery.service.ts`, `cgspace-discovery.service.spec.ts`
- **Depends on:** `KPB-T-2`
- **Blocks:** `KPB-T-4`
- **Estimate:** M
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`
- **Verification:** same jest command green with mocked `HttpService` cases: success, timeout, 500, 404, missing env, cache hit, eviction at 201st key, escaping of `*:* OR (a"b)`. **Fails if:** any returned object or any `Logger` call argument, when `JSON.stringify`-ed, contains `cgspace.cgiar.org` or the query text in an error path; or a rejected Axios promise escapes the service (test: `await expect(service.search(dto)).resolves.toMatchObject({status:502})`). **Evidence is worthless if:** the "no-leak" assertion only checks the message string and not the full serialized wrapper + logger args.
- **Definition of done:**
  - [x] All cases above green; lint clean.
  - [x] `.cursorrules` respected (no URL/secret in logs).
  - [x] Commit `✨ feat(cgspace-discovery): Add CGSpace Discovery search service`.

### [x] `KPB-T-4` — Controller routes, module wiring, env var and infra registration
- **Type:** `server | infra | docs`
- **Description:** Add `@Get('cgspace/search')` and `@Get('cgspace/facets/:name')` to `ResultsKnowledgeProductsController`, each with `@Query(new ValidationPipe({transform:true, whitelist:true, forbidNonWhitelisted:true}))`; register `CgspaceDiscoveryService` + mapper in `ResultsKnowledgeProductsModule` providers. Add `CGSPACE_DISCOVERY_URL` to `serverless.yaml` env allowlist, the local `.env` example, and `docs/infrastructure.md` §6 env list. Swagger tags on the new routes.
- **Implements:** `KPB-R-9`, `KPB-AC-10`; NFR Security (JWT via middleware — route not excluded)
- **Files (expected):** `results-knowledge-products.controller.ts`, `results-knowledge-products.module.ts`, `onecgiar-pr-server/serverless.yaml`, `onecgiar-pr-server/.env.example` (or equivalent), `docs/infrastructure.md`
- **Depends on:** `KPB-T-3`
- **Blocks:** `KPB-T-7`
- **Estimate:** S
- **Skills:** `nestjs-expert`, `aws-serverless`
- **Verification:** `npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products` green (controller spec via `@nestjs/testing` with the pipe: `size=100` → 400, valid → 200 wrapper with `response.items`); `npm run migration:check` green; `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` clean; `curl -s -o /dev/null -w '%{http_code}' localhost:<port>/api/results/results-knowledge-products/cgspace/search?query=maize` → `401` without auth header (proves JWT applies). **Fails if:** the controller test without the pipe would also pass (assert the 400 case explicitly); or the 401 curl returns 200/404. **Evidence is worthless if:** the local server was started with the route in the JWT exclude list.
- **Definition of done:**
  - [x] Both routes documented in Swagger; module providers registered.
  - [x] Env var in all three places; no value committed beyond the public default.
  - [x] Commit `✨ feat(results-knowledge-products): Expose CGSpace search and facets endpoints`.

### [x] `KPB-T-5` — Extend the Spartan brain Jest mock with `BrnTabs*` stubs
- **Type:** `tests`
- **Description:** Add minimal standalone stub directives for `BrnTabsDirective`, `BrnTabsListDirective`, `BrnTabsTriggerDirective`, `BrnTabsContentDirective` (names verified against `node_modules/@spartan-ng/brain/tabs` exports) to `tests/mocks/spartanBrainMock.ts`, exposing `role` attributes so a11y presence assertions can run. Prerequisite for every client test.
- **Implements:** enables tests for `KPB-R-1`, `KPB-R-11`; NFR Accessibility (presence level)
- **Files (expected):** `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts`
- **Depends on:** —
- **Blocks:** `KPB-T-6`, `KPB-T-7`
- **Estimate:** S
- **Skills:** `angular-developer`
- **Verification:** `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` still green (no regression in existing specs) and a throwaway spec importing `BrnTabsDirective` from `@spartan-ng/brain/tabs` compiles. **Fails if:** an existing spec that relies on the mock breaks, or the exported names differ from the real entrypoint (`grep -o 'export.*Brn[A-Za-z]*Tabs[A-Za-z]*' node_modules/@spartan-ng/brain/tabs/index.d.ts`). **Presence caveat:** stubs prove compile-ability only; real keyboard behaviour is the HITL check in `KPB-T-9`.
- **Definition of done:**
  - [x] Mock extended; full client suite green.
  - [x] Commit `🔧 fix(tests): Add BrnTabs stubs to spartan brain mock`.

### [x] `KPB-T-6` — `KpCgspaceBrowseComponent` (search, filters, states, cards) — TDD
- **Type:** `client`
- **Description:** New standalone OnPush component per design §6.2/§6.3: inputs `busy`, `phaseYear`, `isAdmin`; output `itemSelected`; signals + `toObservable` → `debounceTime(400)` → `distinctUntilChanged` → `switchMap`; Enter runs immediately; min 3 chars unless a filter is set; Type/Center selects from facets (prefix type-ahead, clearable → param omitted); Year locked chip for non-admin (`year=phaseYear` always sent), editable list `phaseYear-10..phaseYear` for admin; states idle/loading (inputs enabled)/empty/error/results with the exact copies from design §6.2; counter `Showing N of M items from CGSpace`; cards per R-4 (first author + "et al.", ≤ 3 country chips, monospace handle); Load more; **Use this item** (disabled when `busy`, `aria-label`); **View details** host allow-list + `noopener,noreferrer`. Tailwind-only styling; `aria-live` region. `ResultsApiService.GET_cgspaceSearch` / `GET_cgspaceFacet` added.
- **Implements:** `KPB-R-2`, `KPB-R-3`, `KPB-R-4`, `KPB-R-6`, `KPB-R-11`, `KPB-R-12`, `KPB-R-20`, `KPB-AC-3`, `KPB-AC-4`, `KPB-AC-6`, `KPB-AC-7` (client half), `KPB-AC-8`, `KPB-AC-12`, `KPB-AC-14`; NFR Accessibility/Responsiveness/Performance (debounce)
- **Files (expected):** `…/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component.{ts,html,spec.ts}`, `shared/services/api/results-api.service.ts`
- **Depends on:** `KPB-T-5` (mock), `KPB-T-2` (DTO shape — may proceed in parallel against the design DTO)
- **Blocks:** `KPB-T-7`
- **Estimate:** L
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd`
- **Verification:** `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting` green with cases: `ab` → no call (AC-8); `maize` + 400 ms → one call with `year=<phaseYear>` for non-admin (AC-3/AC-12); Enter at 100 ms → immediate call; Type change → re-call with `type=` (AC-4); clear Type → param absent; filter-only (no query) → call (AC-14); admin can clear year, non-admin has no clear control (AC-12); 502 → error state with copy + tab-switch link, inputs still enabled; empty → copy with Manual entry hint; `itemSelected` emits DTO; `View details` with `https://evil.example/…` uri does **not** open (falls back to `itemUrl`). **Fails if:** the non-admin request ever lacks `year`; or the loading state disables the search input (assert `input.disabled === false` while `status()==='loading'`). **Evidence is worthless if:** timers are not faked (`jest.useFakeTimers`) — real-time debounce tests pass by accident. **Not provable here:** layout, contrast, visual fidelity → `KPB-T-9`.
- **Definition of done:**
  - [x] All cases green; ≥ 80 % lines; lint clean (`npx ng lint --quiet`).
  - [x] No SCSS beyond `:host`; tokens `--pr-color-primary-300` / gray only.
  - [x] Commit `✨ feat(kp-cgspace-browse): Add CGSpace browse component for KP reporting`.

### [x] `KPB-T-7` — Integrate tabs into `AowHloCreateModalComponent` and wire selection to MQAP sync
- **Type:** `client`
- **Description:** Add brain tabs (Browse default / Manual entry) rendered iff `currentResultIsKnowledgeProduct()`; move the existing handle + Sync markup verbatim under Manual; mount `<app-kp-cgspace-browse>` under Browse with `[hidden]` when not active (R-21); pass `phaseYear` (`dataControlSE.reportingCurrentPhase.phaseYear`) and admin flag; `onCgspaceItemSelected(item)` sets `handler = item.itemUrl`, `handleSource='browse'`, calls `GET_mqapValidation()` unchanged (regex already accepts the uuid URL — DD-4); manual edit resets `handleSource`; existing-result and 422 responses flow through the current handlers (R-13); reset browse state on drawer close.
- **Implements:** `KPB-R-1`, `KPB-R-5`, `KPB-R-7`, `KPB-R-8`, `KPB-R-13`, `KPB-R-21`, `KPB-AC-1`, `KPB-AC-2`, `KPB-AC-5`, `KPB-AC-9`, `KPB-AC-13`
- **Files (expected):** `aow-hlo-create-modal.component.{ts,html,spec.ts}`
- **Depends on:** `KPB-T-5`, `KPB-T-6`, `KPB-T-4` (for the live path; unit tests mock the API)
- **Blocks:** `KPB-T-8`, `KPB-T-9`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Verification:** modal spec green with: KP indicator → tabs present, Browse active (AC-1); category `result_type_id=6` on allowed indicator → tabs present (R-1 rev 2); non-KP → **DOM snapshot identical to the pre-change snapshot** (AC-2 — capture the baseline snapshot *before* editing the template, commit it first); `onCgspaceItemSelected({itemUrl:'https://cgspace.cgiar.org/items/<uuid>'})` → `GET_mqapValidation` called, no `mqapUrlError` (AC-9 browse half); manual `https://hdl.handle.net/10947/4262` → regex error (AC-9 manual half, R-7 unchanged); with MQAP mocked to the same payload, `POST_createResult` body from Browse path `toEqual` body from Manual path (AC-5, `BUT` clause: assert body contains no `authors`/`countries`/`affiliations` keys from the Discovery DTO); MQAP mock returning an existing-result shape → existing handler invoked, `POST_createResult` not called (AC-13). **Fails if:** the non-KP snapshot differs by even an attribute; or the Browse-path body carries any Discovery-only field. **Evidence is worthless if:** the baseline snapshot was regenerated after the template change (check its commit precedes this task's diff).
- **Definition of done:**
  - [x] All cases green; lint clean; existing modal specs unchanged and green.
  - [x] Commit `✨ feat(aow-hlo-create-modal): Add Browse CGSpace / Manual entry tabs for KP results`.

### [x] `KPB-T-8` — Scoped test, lint and migration gate (never the full suites locally)
- **Type:** `tests`
- **Description:** **Hard rule (user, 2026-08-26): never run a package's full Jest suite locally — it exhausts machine resources.** Run only the spec's own spec files by path, lint both packages scoped, `migration:check`. The full-suite/coverage-threshold gate is delegated to CI on the PR. Fix only test/lint fallout inside this spec's files.
- **Implements:** gate for all `KPB-R-*`; NFR Backwards compatibility
- **Files (expected):** —
- **Depends on:** `KPB-T-4`, `KPB-T-7`
- **Blocks:** `KPB-T-9`
- **Estimate:** S
- **Skills:** `nestjs-expert`, `angular-developer`
- **Verification:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products && npx eslint "src/api/results/results-knowledge-products/**/*.ts" --quiet && npm run migration:check`; `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal && npx ng lint --quiet`. **Fails if:** any command exits non-zero. Coverage thresholds are checked by CI only (recorded as an accepted local gap). **Evidence is worthless if:** run with `--passWithNoTests`, or if the path filter matched zero spec files (the summary must list ≥ 1 suite per package); if a spec is flaky, run it three times — a pass rate < 3/3 is inconclusive, not green.
- **Definition of done:**
  - [x] Four commands green, output summary lines pasted in `execution.md`.

### [x] `KPB-T-9` — HITL smoke, visual and accessibility check (T6-routed)
- **Type:** `rollout | docs`
- **Description:** With local server (`CGSPACE_DISCOVERY_URL` set) and client running (`docs/infrastructure.md` §6), open `/result-framework-reporting/entity-details/SP04?tocView=aows` → a KP indicator → Report. Perform: search `maize`, filter by Type and Center, confirm the locked Year chip as non-admin (and editable as admin), Use this item → title populated, create the result, compare with a Manual-entry creation of the same handle in the DB (`result_knowledge_product` row equality except ids/timestamps); trigger the error state by pointing the env var at an unreachable host; keyboard-navigate the tabs; compare screenshot against `mockup/browse-cgspace.png`. Record results (incl. the `10947` MQAP check from T-1) in `execution.md`.
- **Implements:** `KPB-AC-1`, `KPB-AC-5`, `KPB-AC-7`, `KPB-AC-12`; defect classes "visual fidelity", "a11y keyboard/contrast", "real CGSpace drift" (requirements §9 — no automated gate)
- **Files (expected):** `docs/specs/changes/kp-cgspace-browse/execution.md` (+ screenshots under `mockup/actual-*.png`)
- **Depends on:** `KPB-T-8`
- **Blocks:** —
- **Estimate:** S
- **Skills:** `playwright-cli` (if installed) or manual; screenshot review routed to **T6 Multimodal**
- **Verification:** human/T6 sign-off recorded per item as PASS/FAIL with screenshot paths. **Fails if:** the DB rows differ in any non-id/timestamp column; the error state does not appear within 10 s of a dead host; arrow keys do not move between tabs; any text on the Browse panel fails WCAG AA contrast on visual inspection against tokens. **Evidence is worthless if:** the comparison creation used a different handle or a different user role; or screenshots are not attached.
- **Definition of done:**
  - [ ] All items PASS or explicitly accepted as risk by the user.
  - [ ] Spec status → `in-review`.

## 4. Dependency graph

```
KPB-T-1 (fixture)                     KPB-T-5 (jest brain mock)
   └── KPB-T-2 (mapper + DTOs)            └──────────────┐
         └── KPB-T-3 (service)                            │
               └── KPB-T-4 (controller/env)   KPB-T-6 (browse component)  ← parallel with T-2..T-4
                         └──────────────┬─────────┘
                                        └── KPB-T-7 (modal integration)
                                              └── KPB-T-8 (full gates)
                                                    └── KPB-T-9 (HITL / T6)
```
Parallel branches: **{T-1→T-2→T-3→T-4}** (server) ∥ **{T-5→T-6}** (client). T-7 joins both.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KPB-TEST-1` | unit (server) | R-4 data, R-9, R-30, AC-10 | `cgspace-discovery/cgspace-discovery.mapper.spec.ts`, `dto/*.spec.ts` |
| `KPB-TEST-2` | unit (server) | R-10, R-12 (year param), R-22, AC-7, AC-11 | `cgspace-discovery/cgspace-discovery.service.spec.ts` |
| `KPB-TEST-3` | integration (server, `@nestjs/testing`) | R-9 + pipe, AC-10 | `results-knowledge-products.controller.spec.ts` |
| `KPB-TEST-4` | unit (client) | R-2, R-3, R-4, R-6, R-11, R-12, R-20, AC-3/4/6/7/8/12/14 | `kp-cgspace-browse.component.spec.ts` |
| `KPB-TEST-5` | unit (client) | R-1, R-5, R-7, R-8, R-13, R-21, AC-1/2/5/9/13 | `aow-hlo-create-modal.component.spec.ts` |
| `KPB-TEST-6` | HITL / T6 | visual, a11y keyboard/contrast, live CGSpace, DB parity | `execution.md` |

Scenario-clause coverage: R-5 `BUT not persist Discovery data` → TEST-5 (body key assertion); R-5 `AND IT MUST identical body` → TEST-5; R-10 `BUT no upstream URL/stack/body` → TEST-2 (serialized wrapper + logger args); R-1 non-KP byte-identical → TEST-5 snapshot; R-11 loading inputs enabled → TEST-4; R-12 always-send-year → TEST-4 + TEST-6.

## 6. Rollout & verification
- [ ] PR(s) opened with the commit convention; CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] `CGSPACE_DISCOVERY_URL` set in dev/test/prod Lambda env before merge to `staging`.
- [ ] Manual QA on test env per requirements §8 happy paths (T-9 checklist).
- [ ] No bilateral / platform-report change → no downstream notice.
- [ ] Post-deploy: `cgspace.search` logs flowing; no 5xx spike on the route.

## 7. Cleanup & follow-ups
- [ ] Spec status → `shipped`.
- [ ] Promote `KPB-DD-7` (first Spartan tabs usage + Tailwind segmented style) into `docs/ux-ui/design.md` §8 inventory; note the CGSpace Discovery integration in `docs/trd/trd.md` integrations (via `/akili-archive`, on the default branch).
- [ ] File follow-up specs: Browse tab on the other three KP surfaces; MELSpace/WorldFish + dedup.
- [ ] Update `proposal.md` OQ table if any HITL finding changes the assumptions.

## 8. Roll-back plan
1. Revert the PR(s) in reverse order (client PR, then server PR if split).
2. No migration to revert.
3. Remove `CGSPACE_DISCOVERY_URL` from env allowlists (optional — harmless if left).
4. Verify the KP drawer shows the pre-change single handle field (non-KP snapshot + Manual flow).
5. No downstream consumers to notify.

## Required cross-references
- `docs/specs/changes/kp-cgspace-browse/requirements.md`, `design.md`, `judgment.md`
- `docs/prd.md` (US-S1, US-S5, G4/M4.2, AC-3, AC-8, AC-9) · `docs/ux-ui/design.md` §7–§10, §12 · `docs/trd/trd.md` · `docs/infrastructure.md` §6
