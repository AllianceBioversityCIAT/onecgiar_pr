# Test Report — `changes/kp-cgspace-browse`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/kp-cgspace-browse/` (requirements rev 2, design rev 2) |
| Date | 2026-08-27 |
| Leader | session model (T1) |
| Testers | **0 spawned — all suites run inline by the Leader.** Reason: (a) the author tests already exist for every suite (execution.md cites them); (b) subagent sessions hit the account's weekly usage limit during `/akili-execute` (rev-server, impl-client terminated); (c) a second session is concurrently editing the same checkout, so authoring new tests now would race it. Recorded as a deployment deviation. |
| Standing rule | **Never run a package's full Jest suite locally** (user, 2026-08-26). Every command below is path-scoped. Coverage thresholds are delegated to CI. |
| Overall status | **PASS with gaps** — all automated suites green; 2 client Reviewer findings still open in the working tree; HITL suite (T-9) not run. |

## 2. Summary

| Suite | Command (scoped) | Result |
|---|---|---|
| Backend unit + controller e2e (supertest) | `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit src/api/results/results-knowledge-products` | **4 suites / 56 tests passed** |
| Frontend unit | `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage <modal folder> tests/mocks/spartanBrainMock.spec.ts` | **3 suites / 62 tests passed / 1 snapshot** |
| Lint (scoped) | server `eslint src/api/results/results-knowledge-products/**` · client `ESLINT_USE_FLAT_CONFIG=false eslint <modal folder>/** results-api.service.ts` | clean |
| Migrations | `npm run migration:check` | 0 pending |
| Integration (live CGSpace) | manual captures in `cgspace-discovery/fixtures/README.md` (10 calls, all 200) | evidence recorded; not automated by design |
| E2E / HITL (`KPB-T-9`) | — | **NOT RUN** (needs local stack + human/T6 review) |

Requirements with automated evidence: **16 / 17** (R-13 partially — see gaps). Product bugs found by tests: **0**. Open Reviewer findings (not test failures): **2 blocking-class items in the client** still visible in the tree — see §8.

## 3. Backend Unit Tests

| File | Tests | Proves |
|---|---|---|
| `cgspace-discovery/cgspace-discovery.mapper.spec.ts` | 7 | HAL→DTO against the recorded fixture; missing DOI/country → `null`/`[]`; year parsing; `handleUrl`/`itemUrl`. |
| `cgspace-discovery/cgspace-discovery.service.spec.ts` | 19 | Solr escaping; params incl. `f.dateIssued=[Y TO Y],equals`; sort only when no query; cache hit/expiry/eviction (200 & 20); 502 wrapper for timeout/500/network/404/missing env; **no-leak assertion on `JSON.stringify(result)` + every logger arg**; facets success/cache/error. |
| `cgspace-discovery/dto/cgspace-search-query.dto.spec.ts` | 12 | `validate()` with transform: query-or-filter, 3–200, size 1–25, page ≥ 0, repository enum, year format, trim. |
| `results-knowledge-products.controller.spec.ts` | 18 (7 new supertest routes) | Real Nest app: 200 with DTO defaults; 400 for `size=100`, non-whitelisted, `query=ab`; facets defaults / `size=101` / non-whitelisted. Mutation-proven: removing the per-route pipe fails exactly these 7. |

## 4. Frontend Unit Tests

| File | Tests | Proves |
|---|---|---|
| `components/kp-cgspace-browse/kp-cgspace-browse.component.spec.ts` | 18 | facets on init; 400 ms debounce + Enter immediate (fakeAsync); inputs enabled while loading; `<3` chars + no filter → no call + hint; filter-only search; exact empty/error copy + switch-to-manual; retry; non-admin Year lock chip `aria-disabled`; admin change/clear year; card meta, ≤3 chips, monospace handle; `itemSelected` DTO; `busy` disables Use; `View details` allow-list + `noopener,noreferrer`; malicious host rejected; Load more; facet fallback. |
| `aow-hlo-create-modal.component.spec.ts` (new describe `KPB-T-7`) | 9 new (+ existing 35) | tabs only for KP (indicator or category 6), non-KP snapshot (AC-2); `itemUrl` uuid form + `handleSource='browse'` + `GET_mqapValidation` passes regex; manual `10947` still rejected; **Browse vs Manual `POST_createResult` body `toEqual` + no Discovery-only keys**; already-reported → no create; clean/close resets. |
| `tests/mocks/spartanBrainMock.spec.ts` | 7 | `BrnTabs*` stubs export names, roles tablist/tab/tabpanel, activation + outputs. |

## 5. Integration Tests

Live CGSpace Discovery captures (fixture task `KPB-T-1`, 2026-08-26): search, `f.itemtype`, year-range forms (ISO pair → 0 hits; `YYYY,equals` / `[Y TO Y],equals` constrain correctly), facets `itemtype`/`affiliation` (values expose `label`). Not automated (external, public service); the recorded fixture is the contract the unit tests pin. MQAP resolution of a `10947` uuid URL: **inconclusive locally** (401 invalid key) → HITL.

## 6. E2E Tests

None automated (design §10: Cypress not in scope). HITL checklist in `KPB-T-9`: live search, filters, locked Year chip (non-admin) vs editable (admin), Use this item → DB-row parity with Manual entry, error state with dead host, keyboard navigation of tabs, screenshot vs `mockup/browse-cgspace.png` (T6 review). **Pending.**

## 7. Coverage & Traceability

| Requirement | Scenario / clause | Type | Test | Result |
|---|---|---|---|---|
| R-1 | tabs for KP indicator; category 6; non-KP unchanged (AC-1, AC-2) | client unit | modal spec: "show tabs…(AC-1)", "…result_type_id=6 (R-1 rev 2)", "NOT show tabs…(AC-2)" + snapshot | ✅ |
| R-2 | debounce; Enter; ≥3 chars (AC-3, AC-8) | client unit | browse spec: debounce 400ms; Enter immediate; idle+hint <3 | ✅ |
| R-3 | Type/Center from facets; clearable; filter-only search (AC-4, AC-14) | client unit | browse spec: load facets; "<3 chars if Type filter (AC-14)"; admin clear year | ⚠️ "clear Type → param absent" not asserted explicitly (Reviewer non-blocking) |
| R-4 | card content; counter; ≤3 chips | client unit | browse spec "results card…(R-4)" | ✅ |
| R-5 | Use this item → same sync; **BUT no Discovery data persisted; AND IT MUST identical body** (AC-5) | client unit | modal spec "identical POST_createResult body… NO Discovery-only keys (AC-5)" | ✅ |
| R-6 | View details new tab, allow-list (AC-6) | client unit | browse spec allow-list / malicious host | ✅ (allow-list includes `doi.org` — undocumented widening, see §8) |
| R-7 | Manual entry parity (AC-9 manual half) | client unit | modal spec "fail regex… 10947 (R-7)" + existing handler tests untouched | ✅ |
| R-8 | browsed handle accepted (AC-9 browse half) | client unit | modal spec "update handler to itemUrl… pass regex" | ✅ |
| R-9 | server endpoint, DTO (AC-3, AC-10) | server unit + supertest | dto spec; controller supertest 400/200 | ✅ |
| R-10 | fail-soft; **BUT no upstream URL/stack/body** (AC-7) | server unit / client unit | service spec 7, 8, **9 (no-leak on wrapper + logger)**; browse spec error copy + switch link | ✅ |
| R-11 | idle/loading(inputs enabled)/empty/error/results | client unit | browse spec: loading enabled (R-11); empty copy; error copy | ⚠️ empty/error not inside `aria-live` region (Reviewer non-blocking) |
| R-12 | Year locked non-admin, always sent (AC-3, AC-12) | client unit + server | browse spec lock chip; service spec 3 (`f.dateIssued`) | ✅ |
| R-13 | already-reported item (AC-13) | client unit | modal spec "abort creation… already-reported (AC-13)" | ✅ (server 409 path mocked; not integration-proven) |
| R-20 | admin Year default | client unit | browse spec admin change/clear | ✅ |
| R-21 | state persists across tabs, resets on close | client unit | modal spec "reset kpEntryMode… cleanModal" | ✅ (persistence across tab switch not asserted; host destroys modal on close) |
| R-22 | 60 s / 10 min bounded cache | server unit | service spec 5, 5b, 6, 10b | ✅ |
| R-30 | `repository` enum → 400 | server unit | dto spec "repository is not…" | ✅ |
| AC-11 | logs without URL/secret | server unit | service spec 9 | ✅ |
| NFR a11y | roles present | client unit | mock spec roles; browse spec `aria-disabled`, `aria-label` | ⚠️ presence only; keyboard/contrast → HITL |
| Visual fidelity | mockup | — | — | ❌ HITL T-9 pending |

## 8. Remediation

| # | Item | Owner / route |
|---|---|---|
| 1 | **Client Reviewer FAIL round 1 not re-audited.** Items visibly resolved in the tree by the concurrent session: min-length gating (test "idle… <3 chars (AC-8)" + filter-only), Center prefix type-ahead (`GET_cgspaceFacet('affiliation', prefix, 100)`), `distinctUntilChanged`. Still open: `doi.org` in `ALLOWED_HOSTS` (design §7 lists two hosts) and a new `kp-cgspace-browse.component.scss` with `::ng-deep !important` overrides (violates ux-ui §12 Tailwind-only / design §6.3); mock still exports `*Directive` aliases; modal spec original text edited; snapshot brittleness (`id="rootN"`); `brnTabsContent` panels. | Resume `/akili-execute` T-5/T-6/T-7 attempt 2 → Reviewer re-audit (blocked by usage limit at time of writing). |
| 2 | README wording "defaults to … when unset" is false (no in-code fallback). | One-line doc fix before merge (T-4 advisory). |
| 3 | `KPB-T-8` scoped gate — run once the client rework lands (server half already green). | Leader. |
| 4 | `KPB-T-9` HITL/T6: DB parity Browse vs Manual, dead-host error, keyboard, screenshot, MQAP `10947` uuid URL (JD-21). | User + T6 review. |
| 5 | Unrelated changes in the same tree (`api/feedback/*`, `sync-button`, `dashboard-lab`, `section-bottom-bar`, `results-knowledge-products.service.ts`) are **not part of this spec** and were not tested here; they must not ride in this spec's PR. | Other session / user. |

## 9. Accepted Gaps

| Gap | Reason |
|---|---|
| No local coverage-threshold run | User rule: full suites never run locally; CI enforces 5/20/35/40 and 50/60/60/60. |
| Live CGSpace behaviour not automated | External public service; contract pinned by recorded fixture + README; drift caught at HITL. |
| MQAP `10947` resolution | API key not usable locally; HITL T-9. |
| Visual fidelity, contrast, keyboard | Not measurable in jsdom; routed to HITL/T6 per requirements §9. |
| Testers not spawned | Author tests already cover every suite; account usage limit + concurrent editing session made delegation unsafe. |
