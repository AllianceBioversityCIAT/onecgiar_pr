# Tasks — Progress Tracker Results Browse in the Report Form

## 1. Scope of this task list

- **Module / feature:** `lab-report-form` + new `pt-results-browse` (client only), child 2 of the `progress-tracker-pull-bridge` family
- **Linked spec:** `./requirements.md` + `./design.md`
- **Owner / driver:** Juan Carlos Cadavid (PRMS)
- **Status:** `not-started`
- **Budget (design.md §13):** 7 tasks · ≈ 2,440 LOC · 2 review rounds — a **tripwire**, not a cap
- **No server file and no migration is in scope.** A diff touching `onecgiar-pr-server/` is out of scope by definition.

## 2. Pre-flight checklist

- [ ] `requirements.md` approved · `design.md` approved
- [ ] `PTB-OQ-1`, `PTB-OQ-2`, `PTB-OQ-3` resolved in `design.md` (§6.2, §6.3, `DD-7`) — ✅
- [ ] 🛑 **`P-13` is open by design:** child 1's envelope is an approved contract, not shipped code. `PTB-T-2` builds against stubs and re-asserts once `PTM-T-4` lands. Do **not** wait for child 1 to start
- [ ] 🛑 **Read `design.md` `P-2` before touching the template.** Three reveal-condition sites (`:198`, `:307`, `:370`); the one at `:370` owns the `@else` and the create footer
- [ ] `npx tsc --noEmit` green on a clean branch (ts-jest hides missing type imports)
- [ ] Cypress CT harness runs locally (`npm run test:ct:changed`)

## 3. Task list

---

### [x] `PTB-T-1` — Client API methods  ✅ PASS

- **Type:** `client`
- **Description:** Add `GET_progressTrackerResults(tocIndicatorId, params)` and `GET_progressTrackerReadyCounts(programId, params)` to `results-api.service.ts`, following the `GET_cgspaceSearch` shape (`:384-386`). ⚠️ Use `baseApiBaseUrl` (`:35`), **not** `apiBaseUrl` (`:33`) — these routes are not under `api/results/`.
- **Implements:** `PTB-R-6a`, `PTB-R-6b`, `PTB-R-7`
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+ `.spec.ts`)
- 🛑 **Consumed-contract notes from child 1's shipped `PTM-T-4` (verified against the real controller, 2026-09-22):**
  - **`refresh` accepts only the literal `true`/`false`.** `?refresh=1` returns **400** — the server DTO uses `forbidNonWhitelisted: true` with a strict boolean. Do **not** send `1`/`0`.
  - The response is the house envelope: the status is at **`body.response.status`**, never top level, and the payload carries `generated_at` and `evidence_fingerprint` (projected from upstream `cache`) alongside `results[]`.
  - The server routes carry **no `@ApiOkResponse`**, so Swagger will not describe the envelope shape — read `../progress-tracker-indicator-mapping/design.md` §4.1 as the contract instead.
- **Depends on:** — · **Blocks:** `PTB-T-2`
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** change `baseApiBaseUrl` to `apiBaseUrl` → the URL assertion **must** go red. The fixture asserts the **full** built URL string ends in `api/progress-tracker/indicators/123/results`; an assertion that only checks the path suffix would pass under both and prove nothing — this is exactly the `apiBaseUrl` trap in `design.md` §4.
  - **Red run:** `npx jest src/app/shared/services/api/results-api.service.spec.ts --silent` — red on the URL assertion before the methods exist.
  - **Disqualifier:** if the route needs a header the interceptor does not attach, stop — `design.md` `P-7` says it should not, and a per-call header here would diverge from every other method in the service.
  - **Consumers:** `results-api.service.ts` is injected widely, but this task **adds** methods and changes none, so no existing consumer is affected. `grep -rn "GET_progressTracker" src` → 0 hits before this task.
- **Definition of done:**
  - [ ] Both methods added; naming follows `HTTP_METHOD_descriptiveName` (`onecgiar-pr-client/CLAUDE.md`)
  - [ ] `npx tsc --noEmit` green · `npx ng lint --quiet` clean

---

### [x] `PTB-T-2` — `pt-results-browse` component: six states  ✅ PASS (attempt 3 — post-PASS compile fix)

- **Type:** `client`
- **Description:** Standalone `OnPush` component with signal `input()`/`output()` and one injected `ResultsApiService`, mirroring `kp-cgspace-browse`'s shape (`design.md` `P-5`, §6.1). Maps child 1's envelope to six states and renders each. Emits `proposalSelected` and `switchToManual`.
- **Implements:** `PTB-R-3`, `PTB-R-4`, `PTB-R-5`, `PTB-R-8`, `PTB-R-20`, `PTB-R-21`, `PTB-R-23`; `PTB-AC-3`–`PTB-AC-7`
- **Files (expected):** `.../lab-report-form/components/pt-results-browse/pt-results-browse.component.{ts,html,scss}` (+ `.spec.ts`)
- **Depends on:** `PTB-T-1` · **Blocks:** `PTB-T-3`, `PTB-T-6`
- **Estimate:** `L` · **Review:** `full` — six-state machine and the contract boundary with an unshipped sibling (`P-13`)
- **Verification:**
  - **Falsifier:** change the `status: 'unavailable'` branch to fall through to `'empty'` → `PTB-AC-7` **must** go red. Fixtures must include **all three** envelope statuses **and** a transport-level rejection, because `unavailable` is reachable two ways (`PTB-R-8`) and a fixture set carrying only the HTTP-200 path would leave the transport branch untested and the mutation invisible there.
  - **Red run:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/components/pt-results-browse --silent` — red on each state's **rendered-output** assertion, not on a missing import. Stub `ResultsApiService` per `design.md` `P-10`; do **not** use `HttpTestingController`.
  - **Disqualifier:** if child 1's real envelope (once `PTM-T-4` lands) differs from `design.md` `P-13`, this task **re-opens** rather than adapting silently — the mapping is a requirement (`PTB-R-8`), not an implementation detail.
  - **Consumers:** none yet — `PTB-T-3` is the first host. New component, new selector.
- **Definition of done:**
  - [ ] All six states render and are mutually exclusive
  - [ ] The Manual escape is present in `not_found`, `unavailable`, **and reachable during `loading`** (`PTB-R-5`)
  - [ ] No response string is echoed into the UI; no `console.log` of a body (`.cursorrules`)
  - [ ] `npx tsc --noEmit` green; client coverage ≥ 50/60/60/60

---

### [x] `PTB-T-3` — Host integration: the third entry mode and the three reveal sites  ✅ PASS (attempt 2)

- **Type:** `client`
- **Description:** Extend `KpEntryMode` at `lab-report-form.component.ts:54` to `'browse' | 'manual' | 'progress-tracker'` (**one file** — `design.md` `P-3`). Move the tab switcher out of `@if (currentResultIsKnowledgeProduct())` (`:84-196`) so a non-KP indicator gets two options and a KP indicator three. Mount the panel `[hidden]`-toggled. **Default the mode per indicator type** (see the falsifier). 🛑 Update **all three** reveal-condition sites together.
- **Implements:** `PTB-R-1`, `PTB-R-2`, `PTB-R-13`, `PTB-R-22`; `PTB-AC-1`, `PTB-AC-2`
- **Files (expected):** `.../lab-report-form/lab-report-form.component.ts`, `.../lab-report-form.component.html`
- **Depends on:** `PTB-T-2` · **Blocks:** `PTB-T-4`, `PTB-T-6`
- **Estimate:** `L` · **Review:** `full` — the structural edit; `design.md` `DD-5` is the highest-risk decision in this child
- **Verification:**
  - **Falsifier:** **the default-mode breakage the reversion challenge found.** `kpEntryMode` initializes to `'browse'` at `:331`. Leave that default unchanged and render a **non-KP** indicator → the form selects a tab that does not exist for it, and the assertion "a non-KP indicator shows the Progress Tracker or Manual panel, never an empty tab body" **must** go red. A fixture using only a KP indicator would pass under both the broken and fixed default — the non-KP fixture is the one that distinguishes them.
  - **Red run:** `npx jest .../lab-report-form/lab-report-form.component.spec.ts --silent` — red on the tab-count assertions for both indicator types before the change.
  - **Disqualifier:** if the three reveal sites cannot be updated consistently — e.g. Card 2's `!isEmerging() && (…)` needs a different condition from the other two — **stop and escalate**. Divergent conditions across those three sites is precisely the shape of the recorded prior regression; do not resolve it by guessing.
  - **Consumers:** from `design.md` `P-3`, `KpEntryMode` is declared independently at `report-result-form.component.ts:27`, `bilateral-manual-create-form.component.ts:50`, `aow-hlo-create-modal.component.ts:110` (inline union) — **none of them is touched by this task, and none may be**. Editing them is out of scope (parent `S-out-1`).
- **Definition of done:**
  - [ ] Non-KP → two options, **no** Browse repositories tab; KP → three tabs (`PTB-AC-1`, `PTB-AC-2`)
  - [ ] All three reveal sites (`:198`, `:307`, `:370`) updated together; `:370`'s `@else` intact
  - [ ] Default mode correct per indicator type
  - [ ] The three sibling components are untouched — `git diff --stat` names no file outside this task's list

---

### [x] `PTB-T-4` — Emerging-mode regression: the create footer must still render  ✅ PASS

- **Type:** `tests`
- **Description:** Pin the regression `lab-report-form/CLAUDE.md` records for spec `changes/emerging-creation-hide-indicator-ui`: with `isEmerging()` true, the sticky **Create and continue** footer renders and is reachable.
- **Implements:** `PTB-R-12`; `PTB-AC-14`
- **Files (expected):** `.../lab-report-form/lab-report-form.component.spec.ts`
- **Depends on:** `PTB-T-3` · **Blocks:** —
- **Estimate:** `S` · **Review:** `full` — this is the guard for the spec's highest-severity defect class (`D-1`)
- **Verification:**
  - **Falsifier:** add `!isEmerging() &&` to the `@if` at `:370`, or close it immediately after its `</section>` → the footer assertion **must** go red. Both mutations must be tried, because they break it differently: the first changes the condition, the second orphans the `@else`. A test asserting only that *some* footer exists would stay green under the second mutation, since the `@else` branch renders a Cancel-only footer — **the assertion must name the `Create and continue` control specifically**, not "a footer".
  - **Red run:** `npx jest .../lab-report-form.component.spec.ts -t emerging --silent` — must be observed red under each mutation and green with the mutation reverted.
  - **Disqualifier:** if the existing emerging-mode tests must be edited to accommodate `PTB-T-3`, the host change is wrong (`PTB-R-13`). Fix the change, not the tests.
  - **Consumers:** `none (no shared symbol changed)` — this task adds a test only.
- **Definition of done:**
  - [ ] Assertion names the `Create and continue` control, not a generic footer
  - [ ] Proven red under **both** named mutations, reverted afterwards
  - [ ] The whole pre-existing `lab-report-form` suite green **unchanged**

---

### [x] `PTB-T-5` — Pick-to-prefill mapping and the create payload  ✅ PASS (attempt 2, after the KP-pick ruling)

- **Type:** `client`
- **Description:** `onPtResultSelected(proposal)` beside `onCgspaceItemSelected` (`:349-386`), writing through `patch()` and **not** touching `mqapJson` (`design.md` `DD-3`). Title truncated to 30 words with a visible notice; type only when the indicator leaves it open; KP handle when present. `create-result-payload.util.ts` carries the draft description + provenance tail in `toc_progressive_narrative` and the provenance fields.
- **Implements:** `PTB-R-9`, `PTB-R-10`, `PTB-R-11`, `PTB-R-14`, `PTB-R-15`, `PTB-R-16`, `PTB-R-17`, `PTB-R-18`; `PTB-AC-8`–`PTB-AC-13`, `PTB-AC-17`
- **Files (expected):** `.../lab-report-form/lab-report-form.component.{ts,html}`, `.../shared/report-result/create-result-payload.util.ts` (+ specs)
- **Depends on:** `PTB-T-3` · **Blocks:** —
- **Estimate:** `L` · **Review:** `full` — changes a payload builder with a second production caller (`design.md` `P-4`)
- **Verification:**
  - **Falsifier:** remove the `indicatorFixesResultType` guard so the proposal's type always wins → `PTB-AC-9` **must** go red. The fixture needs **two** indicators — one that fixes the type and one that leaves it open — because a single open-type fixture would let guarded and unguarded code produce the same result. Separately, for `PTB-R-17`: change the default `toc_progressive_narrative` from `''` to the draft for all callers → the `reporting-aow-table` payload test **must** go red.
  - **Red run:** `npx jest .../lab-report-form.component.spec.ts .../create-result-payload.util.spec.ts --silent` — red on the truncation-notice and type-guard assertions.
  - **Disqualifier:** if pre-filling a KP handle leaves `missingFields()` permanently reporting `Repository link/handle`, **stop** — `design.md` `P-8` shows `mqapJson` is what clears it, and forcing `mqapJson` from a PT proposal would fake MQAP metadata. Re-specify the KP pick instead.
  - **Consumers:** from `design.md` `P-4`, `buildCreateResultPayload`'s production callers are `lab-report-form.component.ts` **and `reporting-aow-table.component.ts`** — plus `create-result-payload.util.spec.ts`. All three must be run, not only compiled. Sweep as run: `grep -rn "buildCreateResultPayload" --include='*.ts' src cypress` → 40 hits / 4 files.
- **Definition of done:**
  - [ ] Truncation notice visible, not silent (`PTB-AC-8`)
  - [ ] Type guard proven with both indicator fixtures (`PTB-AC-9`, `PTB-AC-10`)
  - [ ] `reporting-aow-table` still sends `''` (`PTB-AC-13`)
  - [ ] Countries / impact areas / gender split absent from the payload (`PTB-AC-17`)
  - [ ] No create request issued on selection (`PTB-AC-11`)

---

### [x] `PTB-T-6` — Cypress CT: tab layout geometry at two viewports  ✅ PASS (final attempt; D-8 found and fixed by requester decision)

- **Type:** `tests`
- **Description:** The only gate that can see defect class `D-8`. Mount `lab-report-form` (or the tab strip in isolation) per the harness in `design.md` `P-9` and **measure rendered geometry** — not class presence — for the two-tab and three-tab cases.
- **Implements:** `PTB-R-1`, `PTB-R-2`; `PTB-AC-1`, `PTB-AC-2` (layout half)
- **Files (expected):** `.../lab-report-form/lab-report-form.tabs.cy.ts` — ⚠️ **amended 2026-09-22 (requester-approved):** plus the tab-strip markup in `.../lab-report-form.component.html`, only for the narrow short labels (`design.md` §6.3, "Narrow tab labels"). The CT found the D-8 wrap this gate exists for
- **Depends on:** `PTB-T-3` · **Blocks:** —
- **Estimate:** `M` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** set the tab strip to `flex-wrap: nowrap` with a fixed min-width so three tabs overflow → the no-horizontal-overflow assertion **must** go red at the narrow viewport. If it stays green, the viewport pair is wrong.
  - **Red run:** `npx cypress run --component --spec "src/**/lab-report-form.tabs.cy.ts"`.
  - **Rendered-measurement checklist** (mandatory — the gate asserts size/overflow):
    - **Baseline:** measure the **two-tab** strip first; the three-tab assertion is a comparison against it, not an absolute.
    - **Fonts:** assert the production text and icon faces are loaded, or self-host them in the harness — a missing icon font has produced a false red in this repo before.
    - **Geometry, not classes:** bounding rects and scroll metrics; never `have.class`.
    - **Two viewports** differing on the dimension the gate depends on — one wide, one in the narrow band where three tabs starve. State both in **effective CSS px** and name the host zoom.
    - **Clip containment:** the strip sits inside the scrollable aside; compare against that ancestor's rect.
  - **Disqualifier:** if the CT harness cannot mount `lab-report-form` (too many providers), fall back to mounting the tab strip in isolation and **say so in the spec header** — do not silently downgrade to a Jest class-presence assertion, which cannot see this defect class at all.
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] Two viewports, baseline measured, fonts asserted, geometry read
  - [ ] Proven red under the named mutation
  - [ ] `npm run test:ct:changed` green

---

### [x] `PTB-T-7` — Static leak sweep: no upstream identity in the client  ✅ PASS (attempt 2)

- **Type:** `tests`
- **Description:** Assert that no client source references a Progress Tracker host, base URL or API key, and that every PT call targets the PRMS origin. This is the **static half** of `PTB-AC-16`; the dynamic half is the network-log inspection at the TEST walkthrough.
- **Implements:** `PTB-R-6a`, `PTB-R-6b`, `PTB-R-7`; `PTB-AC-16` (static half). ⚠️ **Amended 2026-09-22:** the guard must look for the **base URL and API key**, and for the client *sending* a PT id — it must **NOT** flag a PT id appearing in a *received* response body (`PTB-R-6c`)
- **Files (expected):** `.../pt-results-browse/pt-client-leak-guard.spec.ts`
- **Depends on:** `PTB-T-2` · **Blocks:** —
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** add `const X = 'https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging';` to any file under `src/app/pages/result-framework-reporting/` → the guard **must** go red. The pattern must cover `synapsis-analytics`, `execute-api`, and `PT_INTEROP` — a guard matching only one of the three would miss the others.
  - **Red run:** `npx jest .../pt-client-leak-guard.spec.ts --silent` — **green on today's tree**, so the falsifier run is mandatory evidence, not optional.
  - **Disqualifier:** this guard covers source text only. It **cannot** prove the browser issues no such request — if that is claimed, the claim is wrong. Record the limit in the spec header and leave the dynamic half to the walkthrough (`requirements.md` §9, `D-10`).
  - **Consumers:** `none (no shared symbol changed)`.
- **Definition of done:**
  - [ ] All three patterns covered; proven red under the named mutation
  - [ ] The header states what the guard **cannot** prove

---

## 4. Dependency graph

```
PTB-T-1 (api methods)
   └── PTB-T-2 (component, six states) ──┬── PTB-T-3 (host: third mode + 3 reveal sites) ──┬── PTB-T-4 (emerging footer regression)
                                          │                                                 ├── PTB-T-5 (prefill + payload)
                                          │                                                 └── PTB-T-6 (CT tab geometry)
                                          └── PTB-T-7 (static leak guard)
```

**Parallel-friendly:** `T-7` runs alongside `T-3`. After `T-3`, the three leaves `T-4`, `T-5`, `T-6` are independent. **`T-4` should land immediately after `T-3`** — it is the guard for `T-3`'s own risk.

**No migration in this child**, so none of the family's migration-ordering constraints apply.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PTB-TEST-1` | unit (client) | `PTB-R-6a`, `PTB-R-6b`, `PTB-R-7` | `shared/services/api/results-api.service.spec.ts` |
| `PTB-TEST-2` | unit (client) | `PTB-R-3`–`PTB-R-8`, `PTB-AC-3`–`PTB-AC-7` | `.../pt-results-browse/pt-results-browse.component.spec.ts` |
| `PTB-TEST-3` | unit (client) | `PTB-R-1`, `PTB-R-2`, `PTB-R-13`, `PTB-AC-1`, `PTB-AC-2` | `.../lab-report-form/lab-report-form.component.spec.ts` |
| `PTB-TEST-4` | unit (client) | `PTB-R-12`, `PTB-AC-14` | same file, emerging-mode describe |
| `PTB-TEST-5` | unit (client) | `PTB-R-9`–`PTB-R-11`, `PTB-R-14`–`PTB-R-18`, `PTB-AC-8`–`PTB-AC-13`, `PTB-AC-17` | same file + `create-result-payload.util.spec.ts` |
| `PTB-TEST-6` | cypress CT | `PTB-AC-1`, `PTB-AC-2` (layout) | `.../lab-report-form/lab-report-form.tabs.cy.ts` |
| `PTB-TEST-7` | guard (client) | `PTB-AC-16` (static) | `.../pt-results-browse/pt-client-leak-guard.spec.ts` |

Client coverage ≥ 50/60/60/60. **`npx tsc --noEmit` is part of every task's gate** — ts-jest erases type-only imports and has let a non-compiling change pass a green suite in this repo.

### Coverage closure — every AC and strict clause owned

| AC / clause | Owning task |
|---|---|
| `PTB-AC-1` + *must NOT render Browse repositories* | `PTB-T-3` (logic) + `PTB-T-6` (layout) |
| `PTB-AC-2` + *IT MUST keep Browse repositories for the existing flow* | `PTB-T-3` + `PTB-T-6` |
| `PTB-AC-3` + *IT MUST keep a route back to Manual entry* | `PTB-T-2` |
| `PTB-AC-4` | `PTB-T-2` |
| `PTB-AC-5` + *must NOT be presented as an error* | `PTB-T-2` |
| `PTB-AC-6` + *IT MUST offer the Manual escape* | `PTB-T-2` |
| `PTB-AC-7` + *must NOT surface upstream host/URL/raw error* | `PTB-T-2` (+ `PTB-T-7` static) |
| `PTB-AC-8` | `PTB-T-5` |
| `PTB-AC-9` + *must NOT be replaced by the proposal's type* | `PTB-T-5` |
| `PTB-AC-10` | `PTB-T-5` |
| `PTB-AC-11` + *must NOT have issued any create request* | `PTB-T-5` |
| `PTB-AC-12` | `PTB-T-5` |
| `PTB-AC-13` | `PTB-T-5` (incl. the `reporting-aow-table` caller) |
| `PTB-AC-14` + *IT MUST be reachable* | `PTB-T-4` |
| `PTB-AC-15` (no test edited) | `PTB-T-3`, `PTB-T-4`, `PTB-T-5` — each DoD requires the pre-existing suite green **unchanged** |
| `PTB-AC-16` + *must NOT contain a PT id or key* | `PTB-T-7` (static) + TEST walkthrough (dynamic) |
| `PTB-AC-17` + *must NOT appear in the create payload* | `PTB-T-5` |

## 6. Rollout & verification

- [ ] PR(s) per the strategy below; CI green (lint, tests, build, SonarCloud)
- [ ] **Family-level TEST walkthrough** once child 1 is deployed: Report → Progress Tracker → drafts → Use this result → Create → **Editing** with provenance (parent `SC-1`)
- [ ] **Browser network log inspected** during that walkthrough: one PRMS call per open, one `POST …/create`, **no** request to the Progress Tracker upstream host (the `PT_INTEROP_BASE_URL` origin). PRMS's own `reviewApiUrl` (`execute-api`) and `bulkUploaderUrl` (`synapsis-analytics.com`) are pre-existing and **not** a failure (parent `SC-3` as narrowed 2026-09-22, defect class `D-10`)
- [ ] **Human check of the `loading` state** against a throttled response — the only gate for `D-9`
- [ ] Visual confirmation of tab labels/ordering and the post-pick banner (`PTB-OQ-1`, `PTB-OQ-2`)

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `../family.md` child 2 `Status` → `done`; family status → `complete`
- [ ] Update `.../lab-report-form/CLAUDE.md`: the switcher is no longer KP-only, and record the three-site reveal condition explicitly so the next spec does not rediscover it
- [ ] `docs/ux-ui/design.md` §8 gains the new panel if it introduces a reusable pattern
- [ ] File the follow-ups: mount in `aow-hlo-create-modal` and `report-result-form` (`S-out-1`), ready-counts badge (`S-out-2`), grey-out (`S-out-3`)

## 8. Roll-back plan

1. Revert the PR(s) in reverse order. **No migration to revert** — this child has none.
2. The new component is unreferenced once the host hunks are reverted; no orphan state remains.
3. Confirm `toc_progressive_narrative` returns to `''` for both production callers of the payload builder (`design.md` `P-4`).
4. Re-run the pre-existing `lab-report-form` suite and the emerging-mode regression to confirm the host is back to baseline.
5. No downstream consumer to notify; no server or payload contract was changed.

---

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `../family.md` · `../progress-tracker-indicator-mapping/design.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-client/CLAUDE.md` · `.../lab-report-form/CLAUDE.md` · `.cursorrules`
