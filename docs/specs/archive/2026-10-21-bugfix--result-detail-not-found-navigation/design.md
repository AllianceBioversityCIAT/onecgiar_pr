# Design — Result detail: leave the not-found screen, and send IPSR codes to the IPSR module

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/result-detail-not-found-navigation` |
| Depth | Lite + Bug Mode |
| Type | Bug |
| Approval Mode | gated |
| Status | approved 2026-10-14 |
| Requirements | `requirements.md` (RDN-R-1..3) |
| Verified at | `60ad81e8b` (branch based on `performance-refactor`) |

## 1. Summary

The fix is three client-only changes in two production files, plus tests:

1. **Guard:** `UnsavedChangesGuard` treats a missing routed component as "nothing to protect". It consumes the silent flag and lets the navigation through (RDN-R-1).
2. **Chips:** `ResultDetailComponent.phaseLink` takes the whole phase row and picks the IPSR route when `app_module_id` is 2 (RDN-R-2).
3. **Redirect:** `ResultDetailComponent` gets an effect on the loaded result. When the result is an IPSR result for the code in the URL, it replaces the route with the IPSR route for the same code and phase. It fires once (RDN-R-3).

There is no server, data, API or migration change.

### Budget (tripwire for `/akili-execute`)

| Expected tasks | Expected LOC (prod + tests) | Expected review rounds |
|---|---|---|
| 3 | ~25 prod + ~150 tests | 3 (one per task) |

## 1A. Premise Ledger

**Count:** 11 rows. 10 verified and 1 `UNVERIFIED` (High: 0, Low: 1).

**Blast-radius triggers:**
- `live-path`: the design names user actions (leave the not-found screen, open a Reporting link).
- `shared-state`: the guard is shared by 19 routes.
- `consumer`: the `phaseLink` signature changes, and the behaviour of the exported guard changes.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | On the not-found and error states the section outlet is not rendered | location | `result-detail.component.html:64` `<router-outlet *ngIf="this.currentResultSE.resultIdIsconverted">`; the error and not-found branches sit under `@if (!this.currentResultSE.resultIdIsconverted)` (`:71-73`) | 60ad81e8b | RDN-R-1 has a different cause; DD-1 does not fix it — **High** | — |
| P-2 | The guard dereferences `component` with no null check | location | `shared/guards/unsaved-changes.guard.ts:21` `if (!component.hasUnsavedChanges())` | 60ad81e8b | DD-1 is unnecessary — **High** | — |
| P-3 | Leaving the not-found screen goes through that guard with `component = null`. Dispatch: sidebar or Back click → `Router.navigate` → canDeactivate checks on the active tree → the inner `{path:'', component: RdGeneralInformationComponent, canDeactivate}` (`rd-general-information-routing.module.ts:12`) → guard `:21` throws | live-path | Prod 2026-10-14: `TypeError: Cannot read properties of null (reading 'hasUnsavedChanges') at e.canDeactivate` ×2, `location.href` unchanged after both clicks (Chrome console via extension) | prod bundle `main-N5QF3LNA.js` | Fix location wrong — **High** | — |
| P-4 | Every guarded route: 12 Reporting inner routes and 7 IPSR inner routes | shared-state | `grep -rl "canDeactivate: \[UnsavedChangesGuard\]" onecgiar-pr-client/src/app/pages/results \| grep routing.module` → 12; same under `pages/ipsr` → 7. Reporting: rd-general-information, rd-partners, rd-contributors-and-partners, rd-geographic-location, rd-evidences, rd-links-to-results, rd-theory-of-change, cap-dev-info, innovation-dev-info, innovation-use-info, knowledge-product-info, policy-change-info. IPSR: ipsr-general-information, ipsr-contributors, step-n1, step-two-basic-info, complementary-innovation, step-n3, step-n4 | 60ad81e8b | DD-1 scope underestimated — Low | — |
| P-5 | IPSR detail always renders its outlet, so its 7 routes only hit the new null branch if a future change hides that outlet | location | `innovation-package-detail.component.html:72` `<router-outlet></router-outlet>` (unconditional) | 60ad81e8b | IPSR would need its own not-found work — Low | — |
| P-6 | `/ipsr/detail/{code}/general-information?phase=` renders a type-11 (Complementary innovation) result | data-env | `UNVERIFIED — confirm at source before relying on it`. The convention exists (`notification-navigation.service.ts:55`, `notification-item.component.ts:1692`, `request-decision.ts:20`, `share-request-modal.component.ts:94`), but IPSR edits type 11 in a modal (`complementary-innovation.component.ts:139`) | — | DD-3 drops 11 from its type set; RDN-R-3 type-11 scenario takes the exclusion branch — Low | T3 first step: open one type-11 code on the IPSR route in test (read-only) |
| P-7 | The by-code phases endpoint returns `app_module_id` per row, and 2 means IPSR | data-env | `versioning.service.ts:1694` `this._versionRepository.find({where:{id: In(versions_id)}})` (full entity); `version.entity.ts:79-83` column `app_module_id`; `phases.service.ts:29-30` `app_module_id == 2` → ipsr, `== 1` → reporting | 60ad81e8b | DD-2 needs another discriminator — **High** | — |
| P-8 | A code without `?phase` never resolves, so a resolved result always has the URL's phase | existence | `result.repository.ts:1870` `if (!version) return null;` → `results.service.ts:2867` 404 | 60ad81e8b | DD-3 needs a phase fallback — Low | — |
| P-9 | The redirect trigger is reached. Dispatch: Reporting link → `ResultDetailComponent.ngOnInit` → `getData()` → `GET_resultIdToCode` 200 → `currentResultSE.GET_resultById()` (`result-detail.component.ts:189`) → `dataControlSE.currentResultSignal.set(response)` (`current-result.service.ts:58`) carrying `result_type_id` (`:56`) | live-path | Cited lines; the component already runs an `effect` on the same signal (`result-detail.component.ts:59-64`) | 60ad81e8b | DD-3 hook moves — **High** | — |
| P-10 | IPSR's own links into the Reporting route are for type 7 (innovations), never 10 or 11, so DD-3 cannot loop them | other | `complementary-innovation.component.ts:139` (type 11 → modal; otherwise → `/result/result-detail` `:192`); `table-innovation.component.ts:68`, `step-n3.component.ts:304`, `step-n1.component.html:18` open core and linked innovations | 60ad81e8b | DD-3 would redirect a link IPSR opens on purpose — Low | — |
| P-11 | Consumers of the changed surfaces | consumer | `grep -rn "phaseLink" onecgiar-pr-client/src onecgiar-pr-client/cypress` → `result-detail.component.html:105`, `result-detail.component.ts:246`, `result-detail.component.spec.ts:413`. `grep -rln "UnsavedChangesGuard" onecgiar-pr-client/src/app \| grep spec` → `unsaved-changes.guard.spec.ts`, `rd-general-information-routing.canDeactivate.spec.ts`, 6 section specs. `grep -rln "hasUnsavedChanges\|Not reported\|not-found-phases" onecgiar-pr-client/cypress` → 0 | 60ad81e8b | Missed test breakage — Low | — |

Already fixed? None on any branch. Recorded in proposal §9, Blast Radius: `git log --all --grep=P2-3969` returns 0, and the guard is unguarded on `origin/master`, `staging` and `performance-refactor`.

## 2. Architecture Overview

Everything lives in the Angular client, in `pages/results/pages/result-detail/` and `shared/guards/`. No change to modules or routes.

```
Reporting URL ─► ResultDetailComponent.getData
                   ├─ code→id 404/err ─► not-found/error screen (no outlet)
                   │      ├─ chips: phaseLink(phase) ─► IPSR base if app_module_id=2   [DD-2]
                   │      └─ leave ─► guard(component=null) ─► allow                   [DD-1]
                   └─ code→id 200 ─► GET_resultById ─► currentResultSignal
                          └─ effect: type∈IPSR_TYPES ∧ same code ─► navigate IPSR, replaceUrl  [DD-3]
```

## 3–5. Data Model / API / Server

None. The design reads existing fields only: `app_module_id` (P-7) and `result_type_id` (P-9).

## 6. Frontend Plan

| File | Change | Req |
|---|---|---|
| `shared/guards/unsaved-changes.guard.ts` | Early branch for a missing component: consume the silent flag, return `true` | RDN-R-1 |
| `pages/results/pages/result-detail/result-detail.component.ts` | `phaseLink` takes the phase row. Base `/ipsr/detail/{code}/general-information` when `app_module_id == 2`, otherwise today's `router.url` path. New effect for the IPSR redirect with a one-shot flag | RDN-R-2, RDN-R-3 |
| `pages/results/pages/result-detail/result-detail.component.html:105` | Passes `phase` instead of `phase.id` | RDN-R-2 |

The chips keep their plain `href`: a full document load, for the reuse-strategy reason given in the doc comment at `:240-244`.

## 7–9. Security / Performance / Observability

- **Security:** no change to auth, headers or permissions.
- **Performance:** no new request.
- **Section mounting:** the Reporting section may mount and issue its own GETs before `GET_resultById` returns. That is the same timing as today; see DD-3.
- **Observability:** the `TypeError` disappears from the console.

## 10. Testing Plan

| Test | Proves | Red today? |
|---|---|---|
| Guard unit: `canDeactivate(null)` returns `true`, does not throw, consumes the silent flag | RDN-R-1 | Yes (TypeError) |
| Router-level: real `Router`, a parent component whose outlet is hidden while the child route carries the guard; navigating away resolves `true` and lands on the target | RDN-R-1 through the real tree | Yes |
| Existing guard and routing specs stay green | RDN-R-1 negative (`UCA-R-1/2`, `UCA-DD-2`) | — |
| `phaseLink` with an IPSR row, a Reporting row and a row with no module; rendered chip `href` | RDN-R-2 | IPSR case yes |
| Redirect: type 10 navigates with `replaceUrl` and `queryParams.phase`; type 7 does not; a stale result whose code differs from the URL does not; it fires once | RDN-R-3 | Type-10 case yes |

## 11. Backwards Compatibility

Every existing link keeps working. Non-IPSR results and Reporting chips behave exactly as today.

## 12. Design Decisions

### RDN-DD-1 — Null check in the guard, not a structural change

A missing routed component means nothing can hold unsaved changes. The guard consumes the one-shot silent flag (`UCA-DD-2`, so it cannot leak into the next navigation) and allows the navigation.

**Rejected:**
- Rendering an empty outlet on the not-found screen. That would mount sections with no result id: the original `results/get/null` problem.
- `canDeactivate` on the parent `ResultDetailComponent`. Too wide.

**Step 2.3 challenge — "what does removing the throw break?"** The throw was the only loud signal for a guard misplaced on an outer `loadChildren` node. After this change, such a misconfiguration would let a dirty section leave silently, with no dialog. That case is still caught: the static route-table test in `rd-general-information-routing.canDeactivate.spec.ts:103` fails whenever a componentless entry carries `canDeactivate`. The design keeps that test unchanged, and T1 must leave it green. No other breakage was found.

### RDN-DD-2 — The chip target comes from the phase's module

`phaseLink` receives the phase row:
- `app_module_id == 2` → `/ipsr/detail/{code}/general-information?phase={id}`. The modules do not share section paths.
- Anything else, including a missing value → today's `router.url` path plus `?phase={id}`.

**Rejected:** inferring the module from the result type. On the not-found screen no result has loaded, so there is no type.

### RDN-DD-3 — Redirect at the destination, in an effect on the loaded result

A new `effect` in `ResultDetailComponent` fires when all of these hold:
- `currentResultSignal().result_type_id` is in the IPSR type set;
- the result's `result_code` equals `api.resultsSE.currentResultCode` (this rejects a stale result);
- the redirect has not fired yet for this code. The flag is keyed by code, not a plain boolean, because the reuse strategy keeps this component alive across in-app navigations (`result-detail.component.ts:240-244`).

It calls `router.navigate(['/ipsr/detail', code, 'general-information'], { queryParams: { phase: currentResultPhase }, replaceUrl: true })`. The phase is always the URL's (P-8).

The IPSR type set is `{10, 11}`, matching the four existing call sites. If P-6 is refuted, the set becomes `{10}` and the exclusion is recorded in `execution.md` (RDN-R-3 type-11 branch). This is not a pivot.

**Accepted trade-off:** the Reporting section can mount for one round trip before the redirect. Holding the outlet until the type is known would delay every result's first paint, so it was rejected. The section's guard sees a clean component and allows the redirect. The visual flash has no automated gate and is checked by a human in the test environment (requirements §7).

**Rejected:**
- Patching about 30 link builders (proposal Option B).
- Returning the type from the `get/transform` endpoint (Option C: a server contract change).

## 13. Open Gaps

- **P-6 (type 11):** settled by T3's first step.
- **Reverse redirect** (Reporting result under the IPSR route): out of scope (proposal OQ1).

## Cross-references

- `requirements.md`;
- `proposal.md` §9;
- `archive/2026-09-21-changes--unsaved-changes-alert` (`UCA-R-1`, `UCA-R-2`, `UCA-DD-2`);
- `docs/trd/trd.md` (client routing);
- `docs/prd.md` `AC-5`.
