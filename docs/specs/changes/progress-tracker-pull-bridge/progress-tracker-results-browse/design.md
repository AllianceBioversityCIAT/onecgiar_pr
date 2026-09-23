# Design — Progress Tracker Results Browse in the Report Form

## 1. Summary

A new standalone `pt-results-browse` component sits **beside** `kp-cgspace-browse` — same shape, same idiom, zero changes to the shipped KP browse. `lab-report-form` gains a third entry mode so a non-KP indicator sees `Manual entry | Progress Tracker` and a KP indicator sees three tabs, and "Use this result" pre-fills the form without persisting anything.

The biggest constraint this design accepts: **the gate condition that reveals the rest of the form is duplicated at three sites in the host template, and the third one owns the create footer.** Adding a mode means updating all three in lockstep — that is the whole risk of this child, and it is why the ledger enumerates them and a regression test pins the footer.

- **Requirements:** `./requirements.md` · **Proposal:** `./proposal.md` · **Family:** `../family.md`
- **Consumed contract:** `../progress-tracker-indicator-mapping/design.md` §4.1 — ⚠️ **amended 2026-09-22**: the status is at **`body.response.status`** (nested in the house envelope `{ statusCode, message, response }`), and the payload now also carries **`generated_at`** and **`evidence_fingerprint`** (projected from upstream `cache`), which `PTB-R-16` needs to send back as provenance
- **Baseline:** `docs/ux-ui/design.md` §7/§8/§10 · `docs/trd/trd.md` §5 W1, §6 · `onecgiar-pr-client/CLAUDE.md`

---

## 1A. Premise Ledger

Verified: 11 · UNVERIFIED: 2 · High Impact: 1 · Low Impact: 1
Blast-radius triggers: **live-path, shared-state, consumer** — all three fire. The design changes a template reached by a named user action, a condition read by three sibling blocks, and a payload builder with more than one caller.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `P-1` | The user action "open the Report tab in the aside" reaches `lab-report-form` through one host, unbranched. | `live-path` | `indicator-drawer.component.html:213` `<app-lab-report-form` → `lab-report-form.component.ts:85` `selector: 'app-lab-report-form'`. `grep -rn "app-lab-report-form" src/app --include='*.html'` → **1 production hit** (the rest are `.spec.ts` stubs at `indicator-drawer.component.spec.ts:394,543,550,1256,1302,1314`) | `24a91da0e` | The hunks land in a component the aside does not mount and nothing renders. Impact: **High** | — |
| `P-2` | 🛑 The reveal condition `!currentResultIsKnowledgeProduct() \|\| kpEntryMode() === 'manual' \|\| createResultBody().handler` is written at **three** sites, and the third owns the `@else` that carries the create footer. | `shared-state` | Control-flow block matching over `lab-report-form.component.html` (720 lines), run this session. **All three siblings:** `:198` opens → closes `:304` (Card 1 title region); `:307` opens as `!isEmerging() && (…same…)` → closes `:368` (Card 2); **`:370` opens → stays open to `:709`, where `@else` (`:709-719`) renders the Cancel-only footer, and `:704` is the `Create and continue` button**. Also `:84` `@if (currentResultIsKnowledgeProduct())` → closes `:196`, which is the block the tab switcher lives inside (`:86-107`) | `24a91da0e` | Updating only the sites a grep for "Card 3" finds orphans the `@else` and **deletes the create footer in emerging mode** — the exact regression `lab-report-form/CLAUDE.md` records for spec `changes/emerging-creation-hide-indicator-ui`. Impact: **High** | — |
| `P-3` | `KpEntryMode` is **not** a shared type — it is declared independently in three components, plus one inline union. Extending the host's copy touches one file. | `consumer` | `grep -rn "KpEntryMode\|'browse' \| 'manual'" --include='*.ts' src \| grep -v spec` → `report-result-form.component.ts:27`, `bilateral-manual-create-form.component.ts:50`, `lab-report-form.component.ts:54` (three separate `export type` declarations) + `aow-hlo-create-modal.component.ts:110` (inline union). Scope: `onecgiar-pr-client/src` | `24a91da0e` | Either the wrong file is edited, or three unrelated components are dragged into scope. Impact: Low, but it is the difference between a 1-file and a 4-file change | Copied into `PTB-T-3`'s `Consumers` field |
| `P-4` | `buildCreateResultPayload` has **two** production callers, not one. | `consumer` | `grep -rn "buildCreateResultPayload" --include='*.ts' src cypress` → **40 hits / 4 files**: `shared/report-result/create-result-payload.util.ts` (definition), `create-result-payload.util.spec.ts`, `dashboard-lab/components/lab-report-form/lab-report-form.component.ts`, **`dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`**. Scope: `onecgiar-pr-client/src` **and** `onecgiar-pr-client/cypress` | `24a91da0e` | `PTB-R-17`'s blast radius is wider than the proposal assumed; `reporting-aow-table` must keep sending `''`. Impact: Low | Copied into `PTB-T-5`'s `Consumers` field |
| `P-5` | `kp-cgspace-browse` is a standalone, `OnPush`, signal-input component with a single five-value status signal and exactly one injected dependency. | `location` | `kp-cgspace-browse.component.ts:358-366` (`@Component`, `imports: [...]`, `ChangeDetectionStrategy.OnPush`, no `standalone` key) · `:377-393` (12 `input()`s) · `:396-397` (`output<CgspaceItemDto>()`, `output<void>()`) · `:411` `status = signal<'idle' \| 'loading' \| 'empty' \| 'error' \| 'results'>('idle')` · `:368` `inject(ResultsApiService)` — the only `inject(` in the file | `24a91da0e` | The sibling has no pattern to mirror and `DD-1`'s "copy the shape" argument loses its basis. Impact: Low | — |
| `P-6` | The client sets **no** HTTP timeout anywhere on this path — neither in the API service nor in an interceptor. | `data-env` | `grep -rn "timeout" src/app/shared --include='*.ts'` → 10 hits, **0** in `results-api.service.ts` and **0** in `shared/interceptors/`; all 10 are `clearTimeout` comments or `.spec.ts`. `grep -rn "\btimeout(" src/app --include='*.ts' \| grep -v spec` → **3 hits**, all off this path (`save-button.service.ts:174,201`, `bilateral-quality-assessment-ui.service.ts:63`) | `24a91da0e` | `DD-4` is unnecessary — a client bound already exists and the 20 s cold call would already be cut. Impact: Low | — |
| `P-7` | The auth header is `auth`, not `Authorization`, applied by the single interceptor, with three pass-through exclusions. | `other` | `general-interceptor.service.ts:48-52` (`setHeaders: { auth: … }`) — the only `HttpInterceptor` in `src` (`grep -rln "HttpInterceptor" src --include='*.ts'` → 1 file). Exclusions `:36` (no token + PRMS base URL), `:38` (elastic base URL), `:44` (`assets/`). `grep -rn "Authorization" src/app --include='*.ts'` → **0 hits** on request headers | `24a91da0e` | The new API methods need explicit header wiring. Impact: Low | — |
| `P-8` | `onCgspaceItemSelected` sets exactly **two** form fields plus the MQAP blob, and that blob is what clears the handle entry in `missingFields()`. | `location` | `lab-report-form.component.ts:349-386`; the writes are `:370` `mqapJson.set(resp.response)`, `:371` `patch('handler', url)`, `:372` `patch('result_name', resp.response?.title ?? '')`. Coupling at `:854` — `if (currentResultIsKnowledgeProduct() && !mqapJson()) missing.push('Repository link/handle')` | `24a91da0e` | `DD-3`'s "mirror the existing selection handler" loses its reference, and a PT pick on a KP indicator could leave the form permanently unsavable. Impact: **High** | — |
| `P-9` | The Cypress CT harness mounts with `componentProperties` + a provider stub and **no** `HttpClientTestingModule`; CT specs are colocated under `src/`. | `existence` | `kp-cgspace-browse.cy.ts:92-103` (`cy.mount(KpCgspaceBrowseComponent, { componentProperties, providers: [{ provide: ResultsApiService, useValue: { … of(…) } }] })`) · `cypress.config.js:173` `specPattern: 'src/**/*.cy.ts'`, `:174` supportFile, `:134` `tsConfig: 'tsconfig.ct.json'` · `package.json:23` `"test:ct"`, `:28` `"test:ct:changed"` | `24a91da0e` | `PTB-T-6`'s CT gate has no harness and defect class `D-8` loses its substitute. Impact: **High** | — |
| `P-10` | Jest in this area stubs HTTP by **replacing the API service**, not with `HttpTestingController`. | `existence` | `kp-cgspace-browse.component.spec.ts:90-101` (TestBed `providers: [{ provide: ResultsApiService, useValue: mockResultsApiService }]`); `grep -n "HttpTestingController" …spec.ts` → **0 hits**; `grep -n "provideHttpClientTesting" …spec.ts` → **0 hits**. `HttpClientTestingModule` is imported at `:2`/`:96` only so the injector resolves. Sibling suite size: `grep -c "it(" …spec.ts` → **75** | `24a91da0e` | The new specs adopt a stubbing style foreign to the area. Impact: Low | — |
| `P-11` | Both i18n patterns are live, and the **immediate neighbourhood uses inline strings**. | `data-env` | `kp-cgspace-browse` uses inline template copy — `grep -n "internationalization\|terminology" kp-cgspace-browse.component.ts` → **0 hits**; `grep -rn "internationalization" …/aow-hlo-table-create-modal/` (whole subtree) → **0 hits**; inline examples at `kp-cgspace-browse.component.html:240,265,312`. The copy-file pattern **is** live elsewhere: `grep -rn "BILATERAL_MANUAL_CREATE_COPY\|BILATERAL_HEADER_INFO_COPY" src --include='*.ts' \| grep -v '^src/app/internationalization'` → **8 files** (e.g. `bilateral-sp-selector.component.ts:5,14`) | `24a91da0e` | `DD-6` picks the wrong convention for the neighbourhood. Impact: Low | — |
| `P-12` | Upstream latencies are template 1.4 s, cache hit 1.1 s, cold 20.2 s. | `data-env` | **User-reported** from live curls no command in this repository reproduces — `../family.md` §5.1 | — | `DD-4`'s loading design is tuned to the wrong numbers; the states stay correct but the copy and the first-paint target move. Impact: Low | `PTB-T-6`'s CT records observed timings against a stubbed delay; real confirmation is the family-level TEST walkthrough |
| `P-13` | Child 1 returns **HTTP 200 always**, with `status` of `ok \| not_found \| unavailable` at **`body.response.status`** — nested inside the house envelope `{ statusCode, message, response }`, **not** at the body top level. *(Corrected 2026-09-22 from child 1's shipped `PTM-T-3`; the original sketch read the status at the top level, which `ResponseInterceptor` makes impossible.)* | `other` | `../progress-tracker-indicator-mapping/design.md` §4.1 and `PTM-DD-1`. **This is a sibling spec's design, not shipped code** — citation rule (d) makes another spec's summary a secondary source, and the module does not exist yet | — | `PTB-R-8`'s status→state mapping is wrong at every branch and `PTB-T-2` is rewritten. Impact: **High** | Child 1's `PTM-T-4` ships the controller; this child's `PTB-T-2` asserts against the real envelope at integration. Owner: `PTB-T-2` |

> **The two open rows are the two things that do not exist yet.** `P-13` is the High one: this child is deliberately built contract-first against a sibling that has not shipped, which is what makes the two children parallel-safe (`../family.md` §2). The mitigation is that the contract is *written down* in child 1's approved design and fixed in its route signature — but until `PTM-T-4` lands, it is a promise, and the ledger says so rather than pretending otherwise. `P-12` is Low: wrong numbers change the loading copy, not the state machine.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `shared/services/api/results-api.service.ts` · `shared/report-result/create-result-payload.util.ts` · `dashboard-lab/components/lab-report-form/` (`.ts`, `.html`) · **new** `dashboard-lab/components/lab-report-form/components/pt-results-browse/`
- **Server modules touched:** **none**
- **External integrations:** none directly — every call goes to the PRMS origin (`PTB-R-7`)

### 2.2 Component placement

`pt-results-browse` is a **sibling of** `kp-cgspace-browse`, not a generalization of it (`DD-1`). It lives under the host that mounts it, because `lab-report-form` is its only host in this child; promoting it to a shared location is the follow-up that mounts it in the other two surfaces (parent `S-out-1`).

### 2.3 Sequence — open, pick, create

```
[user opens the Report tab in the aside]                       indicator-drawer.component.html:213  (P-1)
  └── lab-report-form renders
        └── user selects the "Progress Tracker" tab
              └── <app-pt-results-browse> (already mounted, [hidden]-toggled)      (DD-2)
                    └── ResultsApiService.GET_progressTrackerResults(tocIndicatorId, params)
                          └── GET /api/progress-tracker/indicators/{id}/results     PRMS origin only
                                │  ⚠️ post-interceptor shape — the status is NESTED, not top level:
                                │     { statusCode: 200, message, response: { status, … } }
                                ├── response.status 'ok'          -> 'results' | 'empty'
                                ├── response.status 'not_found'   -> 'not_found'
                                ├── response.status 'unavailable' -> 'unavailable'
                                └── transport failure             -> 'unavailable'   (PTB-R-8)
        └── (proposalSelected) -> onPtResultSelected($event)
              ├── patch('result_name', truncate30(title))  + truncation notice     (PTB-R-9)
              ├── patch type ONLY when the indicator leaves it open                (PTB-R-10)
              ├── patch('handler', knowledge_product_handle) when KP + present     (PTB-R-11)
              └── ptDraft.set({ description, result_key, evidence_fingerprint })
                    -> NOTHING PERSISTED; banner shown                             (PTB-R-14/15)
        └── user presses "Create and continue"
              └── buildCreateResultPayload({ …, ptDraft })
                    └── toc_progressive_narrative = description + provenance tail  (PTB-R-16)
                          └── POST /api/results-framework-reporting/create   (exactly one)
```

---

## 3. Data Model Changes

**None.** This child adds no entity, no migration, and no server DTO. The provenance fields it sends were made storable by child 1.

---

## 4. API Surface

No new endpoint. Two client methods consuming child 1's routes, following `HTTP_METHOD_descriptiveName` and the `GET_cgspaceSearch` shape (`results-api.service.ts:384-386`):

| Method | Calls | Notes |
|---|---|---|
| `GET_progressTrackerResults(tocIndicatorId, params)` | `GET {base}api/progress-tracker/indicators/{tocIndicatorId}/results` | `params` a plain object, as `GET_cgspaceSearch` does. `tocIndicatorId` is the **PRMS** id |
| `GET_progressTrackerReadyCounts(programId, params)` | `GET {base}api/progress-tracker/programs/{programId}/ready-counts` | Ships unused — the badge is parent `S-out-2` |

The `auth` header is attached by the existing interceptor; no per-call header wiring (`P-7`).

⚠️ `results-api.service.ts:33` sets `apiBaseUrl = environment.apiBaseUrl + 'api/results/'`. These routes are **not** under `api/results/`, so they must use `baseApiBaseUrl` (`:35`), not `apiBaseUrl`. Getting this wrong yields a 404 that looks like `not_found`.

---

## 5. Server Workflow / Business Rules

**None.** No server change.

---

## 6. Frontend Plan

### 6.1 `pt-results-browse` component contract

Mirrors `P-5`'s shape: standalone, `OnPush`, signal `input()`/`output()`, one injected dependency (`ResultsApiService`).

| Member | Shape |
|---|---|
| `tocIndicatorId` | `input<string \| number>()` — the PRMS id |
| `indicatorFixesResultType` | `input<boolean>(false)` — drives `PTB-R-10` |
| `isKnowledgeProduct` | `input<boolean>(false)` |
| `busy` | `input<boolean>(false)` |
| `proposalSelected` | `output<PtProposalDto>()` |
| `switchToManual` | `output<void>()` |
| `status` | `signal<'idle' \| 'loading' \| 'results' \| 'empty' \| 'not_found' \| 'unavailable'>('idle')` |
| `proposals`, `selectedKey`, `expandedKey` | supporting signals |

Six rendered states (`PTB-R-3`); `picked` is the host's banner, not a seventh component state — the component emits and the host renders the banner, exactly as the KP browse does (`P-8`).

### 6.2 Host changes in `lab-report-form`

1. `KpEntryMode` at `lab-report-form.component.ts:54` extends to `'browse' | 'manual' | 'progress-tracker'` — **one file** (`P-3`).
2. The tab switcher moves **out** of `@if (currentResultIsKnowledgeProduct())` (`:84-196`) so a non-KP indicator gets two options and a KP indicator three.
3. 🛑 **All three reveal-condition sites** (`:198`, `:307`, `:370`) extend to keep the form revealed on the Progress Tracker tab once a proposal is picked, and `:370` keeps its `@else` intact (`P-2`, `DD-5`).
4. `onPtResultSelected(proposal)` added beside `onCgspaceItemSelected` (`:349-386`), writing through the same `patch()` mechanism (`P-8`).
5. The PT panel is mounted and `[hidden]`-toggled like the browse panel at `:109-110` (`PTB-R-22`).

### 6.3 Design system usage

Reuse `kp-cgspace-browse`'s visual language and `docs/ux-ui/design.md` §7 tokens. The prototype screenshots (Guide §6, Figures 5–8) are a **layout and state** reference only — no token is derived from them. Tabs keep `role="tablist"`/`role="tab"`/`aria-selected`, as `:87-105` already does.

**Narrow tab labels** *(added 2026-09-22, requester-approved — `PTB-T-6`'s CT measured the KP three-tab strip wrapping at a 390 px aside: "Browse repositories" and "Progress Tracker" went to two lines, 57 px vs 35 px)*: below a 640 px aside width the tabs read **Browse · Manual · Tracker**, and the full names stay available as the accessible name (`aria-label`) and `title`. At 640 px and above the full labels render. *(Clarified 2026-09-22 at `PTB-T-6`'s review: the 640 px threshold is measured with a container query on the **tab strip**, the aside minus its scroll-body padding, so the switch happens at an aside of about 664–688 px. The error runs the safe way, because short labels stay on slightly longer. A container query is used because the aside can be resized independently of the viewport.)* The single-line gate in `PTB-T-6` stays as written. **Out of scope, recorded as a follow-up:** the KP browse-mode Cancel-only footer's unconditional `-mx-6 px-6` bleeds 6 px past the aside below 640 px. It predates this spec (`HEAD:…/lab-report-form.component.html:711`).

### 6.4 Copy

Inline template strings plus exported TS constants, matching the immediate neighbourhood (`P-11`). Not the `internationalization/*.copy.ts` pattern — that is live but belongs to the bilateral area.

---

## 7. Security & Authorization

| Concern | Position |
|---|---|
| Upstream identity | The client holds no base URL or key, and **sends** PRMS ids only, to the PRMS origin only (`PTB-R-6a`, `PTB-R-6b`, `PTB-R-7`). It **may receive** the PT id inside `result_key` and `source.pt_url` (`PTB-R-6c`) — which is what makes `PTB-R-16` (send provenance back) and `PTB-R-23` ("Open in Progress Tracker") implementable *(amended 2026-09-22)* |
| Auth | The existing `auth` interceptor covers the new calls (`P-7`) |
| Error surfaces | Child 1 never sends an upstream message; the component renders its own copy per state and never echoes a server string (`PTB-AC-7`) |

---

## 8. Performance & Capacity

Target: first meaningful paint within **1.5 s** on the template/cached path (`P-12`: template 1.4 s, cache 1.1 s). The cold AI path can reach ~20 s, and the UI must stay interactive with the Manual escape reachable throughout (`PTB-R-5`, `PTB-R-21`).

**No client-side timeout is added** (`DD-4`): none exists today on this path (`P-6`), and child 1's server timeout is deliberately the authority so the user gets a *classified* `unavailable` rather than a browser-invented one (`PTB-R-8`, requirements §7).

---

## 9. Observability

Client-side only, no new telemetry. The component must not `console.log` any response body (`.cursorrules`).

---

## 10. Testing Plan (forward-looking)

Jest for the state machine, the mapping rules and the payload; **one Cypress CT** for tab layout geometry at two viewports (the only gate that can see defect class `D-8`); a human check at the HITL pause for `D-9`. Full mapping in `requirements.md` §9. Stubbing follows `P-10` — replace `ResultsApiService`, not `HttpTestingController`. Gates: client Jest ≥ 50/60/60/60, `npx ng lint --quiet`, `npx tsc --noEmit`.

---

## 11. Backwards Compatibility & Migration Plan

Additive. No migration, no server change, no removal. The one structural edit is the template gate, which is why `PTB-R-12`/`PTB-R-13` forbid editing any existing test to accommodate it.

---

## 12. Design Decisions

### `PTB-DD-1` — A sibling component, not a generalized one

`pt-results-browse` is new code beside `kp-cgspace-browse`, which is untouched. Generalizing the KP browse would refactor a component that shipped twice and is live across three repositories, to accommodate a source whose response shape, states and pre-fill rules are entirely different — putting the working KP flow at risk for a first integration. The KP browse's shape is copied (`P-5`), its code is not.

**Rejected:** a shared "external source" component; inlining the panel into `lab-report-form`, already the largest and most trap-laden component in the module.

### `PTB-DD-2` — Mounted and `[hidden]`-toggled, not `@if`-swapped

Matches `:109-110` and satisfies `PTB-R-22`: switching tabs must not remount and re-fetch a 20 s draft.

### `PTB-DD-3` — Pre-fill writes through `patch()`, mirroring `onCgspaceItemSelected`

`P-8` shows the existing handler writes `handler` and `result_name` through `patch()` and that `mqapJson` is what clears the handle entry in `missingFields()` (`:854`). `onPtResultSelected` uses the same mechanism and — critically — **does not touch `mqapJson`**, because a PT proposal is not MQAP metadata. For a KP indicator, pre-filling the handle therefore leaves the existing MQAP sync as the path that clears the missing-field entry, which keeps the KP contract intact.

### `PTB-DD-4` — No client-side timeout; the server owns the bound

`P-6` shows no client timeout exists on this path today, and child 1's timeout is pinned below the gateway ceiling on purpose. Adding a shorter client bound would convert a classified `unavailable` into an unclassified transport error and lose the distinction `PTB-R-8` depends on.

### `PTB-DD-5` — The three reveal sites change together, and the footer is pinned by a test

🛑 The single highest-risk edit in this child. `P-2` enumerates the three sites; `:370` owns the `@else` and the create footer. The design requires the edits to be made together **and** `PTB-T-4` to assert the footer renders in emerging mode — because this exact regression has shipped before (`lab-report-form/CLAUDE.md`, spec `changes/emerging-creation-hide-indicator-ui`).

### `PTB-DD-6` — Inline copy, matching the neighbourhood

`P-11`: the KP browse and its whole modal subtree use inline strings; the copy-file pattern is live but belongs to bilateral. New code should read like the code around it.

### `PTB-DD-7` — Non-KP indicators keep the form visible on the PT tab (`PTB-OQ-3` resolved)

For a non-KP indicator the reveal condition's first clause `!currentResultIsKnowledgeProduct()` is already `true`, so the rest of the form is visible regardless of tab. This design **does not change that** — the panel appears above a visible form, and the Cancel-only footer remains a KP-browse-before-selection behavior. This is a consequence of an existing condition, not a free choice; inverting it would alter behavior for indicators that never open the PT tab, violating `PTB-R-13`.

### Reversion challenge (Step 2.3)

**Trigger fires.** Moving the tab switcher out of `@if (currentResultIsKnowledgeProduct())` (`:84`) changes the conditions under which delivered behavior renders — a non-KP indicator that today has *no* switcher will have one.

**Challenge — "what does removing this gate break?"** Three concrete breakages, each now addressed:
1. *Emerging mode loses the create footer* — the recorded prior regression. Addressed by `DD-5` + `PTB-T-4`'s assertion.
2. *A non-KP indicator gains a tab strip where the design has none today* — addressed by `PTB-T-6`'s CT measuring the two-tab and three-tab layouts at two viewports, and `PTB-AC-1` asserting Browse repositories does **not** appear for non-KP.
3. *`kpEntryMode` defaults to `'browse'`* (`lab-report-form.component.ts:331`) — for a **non-KP** indicator that value would now select a tab that does not exist for it. **The design must default the mode per indicator type**, and `PTB-T-3` owns it. This breakage was found by the challenge and was not in the proposal.

---

## 13. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | **7** |
| Expected LOC | **≈ 2,440** (≈ 940 implementation, ≈ 1,500 tests) |
| Expected review rounds | **2** |

Depth **Full** was chosen before the design and the design confirms it: a structural template change on the live reporting entry point, with a recorded prior regression in the same `@if` chain. Tripwire, not a cap.

---

## 14. Open Gaps & Follow-ups

| # | Gap | Owner |
|---|---|---|
| `P-13` | Child 1's envelope is an approved design, not shipped code | `PTB-T-2` asserts against the real controller once `PTM-T-4` lands |
| `P-12` | Latencies are user-reported | Family-level TEST walkthrough |
| `D-9` | The 20 s loading experience cannot be asserted | Human check at the HITL pause |
| `D-10` | Stray browser requests invisible to unit tests | Network-log inspection during the TEST walkthrough (needs child 1 deployed) |
| `PTB-OQ-1`, `PTB-OQ-2` | Tab labels/ordering; banner reuse | Resolved in §6.2/§6.3 (narrow short labels added 2026-09-22); confirm visually at the HITL pause |
| `PTB-G-4` | Pre-existing KP browse-mode footer bleed below 640 px | Follow-up outside this child (requester decision 2026-09-22) |
| — | Mounting in the other two create surfaces; the ready-counts badge; grey-out | Parent `S-out-1`, `S-out-2`, `S-out-3` |

---

## Required cross-references

`./requirements.md` · `./proposal.md` · `../family.md` · `../progress-tracker-indicator-mapping/design.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-client/CLAUDE.md` · `.../lab-report-form/CLAUDE.md` · `.cursorrules`
