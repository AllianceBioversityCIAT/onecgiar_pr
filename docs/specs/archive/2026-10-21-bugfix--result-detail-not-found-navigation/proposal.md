# Proposal — Result detail: frozen navigation on not-found, and IPSR codes not redirected

> **Answer first:** two independent client-only bugs, both confirmed in production on 2026-10-14 with result code 11719.
> (1) A null-check in `UnsavedChangesGuard` unfreezes every not-found screen.
> (2) Result detail must send IPSR codes (types 10/11) to `/ipsr/detail`, using the phase's `app_module_id` on the not-found screen and the result type once it has loaded.
> No server, data or migration change is needed.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/result-detail-not-found-navigation` |
| Slug | `result-detail-not-found-navigation` (derived; `/akili-propose` was invoked without an argument, so the slug was derived from ticket P2-3969) |
| Type | Bug |
| Ticket | [P2-3969](https://cgiarmel.atlassian.net/browse/P2-3969) (parent epic P2-2340 "Bugs 2026") |
| Approval Mode | gated |
| Package | `onecgiar-pr-client` only |
| Base branch | `performance-refactor` (the P2 bug flow; see memory *Ready For UAT = mergeado*) |
| Depends on | none |
| Parallel-safe | yes |
| Date | 2026-10-14 |

## 2. Intent

A user who lands on Result detail with a code that does not resolve must be able to leave the screen. A user who opens an Innovation Package code through any Reporting link must end up in the IPSR module, which is the only screen that shows the package correctly.

## 3. Problem / Current Behavior

| # | Claim | Source |
|---|---|---|
| C1 | `/result/result-detail/11719/general-information` (no `?phase`) shows "Not reported in this phase". The chips listed are IPSR 2026/2025/2024/2023. | Reproduced in prod (Chrome, 2026-10-14) |
| C2 | On that screen, clicking **Back to results** or sidebar **Home** leaves `location.href` unchanged. Each click logs `TypeError: Cannot read properties of null (reading 'hasUnsavedChanges') at e.canDeactivate`. | Reproduced in prod; console read via the extension |
| C3 | The outlet renders only when the code was converted. | `result-detail.component.html:64` — `<router-outlet *ngIf="this.currentResultSE.resultIdIsconverted">` |
| C4 | The guard dereferences `component` with no null check. | `shared/guards/unsaved-changes.guard.ts:21` — `if (!component.hasUnsavedChanges())` |
| C5 | The guard sits on the inner `{path:'', component}` route of every section (12 Reporting sections, 7 IPSR sections). With no outlet the routed component is never created, so Angular passes `null`. | `rd-*-routing.module.ts:12`; `ipsr-*-routing.module.ts:9-10`; same mechanism documented in `archive/2026-09-21-changes--unsaved-changes-alert/execution.md:20` |
| C6 | The phase chips link to the Reporting route for every phase, IPSR phases included: `/result/result-detail/11719/general-information?phase=9` (also `=7`, `=5`, `=2`). | Prod DOM; `result-detail.component.ts:246-248` — `phaseLink()` reuses `router.url` |
| C7 | With `?phase=9` the package opens inside Reporting result detail: 4 sections, "2 of 4 sections complete". `/ipsr/detail/11719/general-information?phase=9` shows "4 of 6 complete", Annual updating and Package and Assess. | Reproduced in prod (screenshots) |
| C8 | `GET api/versioning/result/code/:code` returns full `version` rows, so each phase carries `app_module_id`. | `versioning.service.ts:1689-1705`; `version.entity.ts:79-83` |
| C9 | `app_module_id == 2` is IPSR and `== 1` is Reporting. | `phases.service.ts:29-30` |
| C10 | The type-based rule already exists elsewhere: types 10 and 11 go to `/ipsr/detail`. | `notification-navigation.service.ts:55` (`resultDetailUrl`) |

## 4. Proposed Outcome

- **Leaving a not-found screen:** from any not-found or error screen in Result detail (Reporting or IPSR), Back to results, the sidebar and browser back all navigate normally.
- **Not-found chips:** an IPSR phase chip points to `/ipsr/detail/{code}/general-information?phase={id}`, and a Reporting chip keeps today's link.
- **Resolved IPSR codes:** when an IPSR result (type 10/11) resolves on the Reporting route, the app redirects to the same code and phase in `/ipsr/detail`, using `replaceUrl`. Every Reporting entry point that builds `/result/result-detail/...` is covered without touching any of them.

## 5. Scope

- **In scope:**
  - `UnsavedChangesGuard`: a null or `undefined` component passes, consumes the silent flag and returns `true`.
  - `ResultDetailComponent.phaseLink()`: picks the route base from the phase's `app_module_id`.
  - `ResultDetailComponent`: once `GET_resultById` returns `result_type_id` ∈ {10, 11}, it redirects to `/ipsr/detail`.
- **Regression tests:**
  - guard with a `null` component;
  - router-level test of leaving the not-found screen;
  - chip href for an IPSR phase;
  - the redirect for type 10/11.

## 6. Non-Goals

- Rewriting the ~30 call sites that build `/result/result-detail/...` for IPSR codes. The redirect at the destination makes this unnecessary.
- The reverse redirect (a Reporting code opened under `/ipsr/detail`). Nobody reported it; it is listed as an open question.
- Server changes, and any change to the not-found screen's copy or design.
- Moving the guard back to the outer route nodes. The 2026-09-21 inner-route decision stays.

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| All PRMS users opening a stale or wrong-phase result link | Unblocked navigation |
| IPSR users following Reporting links (search, results list, notifications, ToC modals) | Land in the correct module |
| `shared/guards/unsaved-changes.guard.ts` (+ spec) | Null branch |
| `pages/results/pages/result-detail/result-detail.component.{ts,html,spec.ts}` | Chip links, redirect |
| `archive/2026-09-21-changes--unsaved-changes-alert`, `bugfix/ipsr-unsaved-changes-guard` | Related specs; this fix adds defence in depth without changing their routing decision |
| P2-3574 (`bb0058bf6`) | Introduced the not-found screen and `phaseLink()`. This spec extends it. |

## 8. Visual Reference

- **Source:** None.
- **Location:** n/a
- **Notes:** no new UI. The not-found screen keeps its design and only its chip `href` changes. Prod screenshots from the reproduction are cited in §3.

## 9. Bug Diagnosis

### Observed Symptom
- **Bug 1:** the user is stuck on "Not reported in this phase" / "Result not found". Every navigation is silently cancelled.
- **Bug 2:** an IPSR code opened through Reporting stays in Reporting, and so does any phase chip clicked from there. The package shows 4 of its 6 sections and no Annual updating or Package and Assess.

### Reproduction Steps
Environment: prod `https://reporting.cgiar.org`, admin user, 2026-10-14. Read-only steps; nothing was saved.

1. Open `/result/result-detail/11719/general-information`. Expected: not-found screen with 4 IPSR chips. Actual: as expected.
2. Click **Back to results**, then sidebar **Home**. Expected: navigation. Actual: URL unchanged, `TypeError … hasUnsavedChanges` ×2 in the console. **(Bug 1)**
3. Inspect the chip hrefs. Expected: `/ipsr/detail/...`. Actual: `/result/result-detail/11719/general-information?phase=9|7|5|2`. **(Bug 2a)**
4. Open `?phase=9` on the Reporting route. Expected: redirect to IPSR. Actual: package rendered in Reporting, "2 of 4 sections complete". **(Bug 2b)**
5. Open `/ipsr/detail/11719/general-information?phase=9`. Result: correct screen, "4 of 6 complete".

### Root Cause (confirmed)
- **Bug 1:** the not-found branch never renders the outlet (C3). The section route has still matched, and the guard on its inner node (C5) runs with `component = null`. It throws at `unsaved-changes.guard.ts:21` (C4), and the router turns the throw into a `NavigationError`, which cancels the navigation. The 2026-09-21 fix moved the guard to the inner route so that a componentless node no longer passes `null`. It never added the null check, so this second way of reaching `null` was left open.
- **Bug 2a:** `phaseLink()` builds the link from `router.url` and ignores which module the phase belongs to (C6), although the phase row already carries `app_module_id` (C8, C9).
- **Bug 2b:** Result detail has no rule that redirects by result type. The rule exists only in the notification service (C10).

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git fetch --all`, then `git log --all --oneline -i --grep="P2-3969"`: no hits. `git log --all -- …/unsaved-changes.guard.ts`: one commit, `5812d73f3`. `git show <ref>:…/unsaved-changes.guard.ts \| grep -n hasUnsavedChanges` on `origin/master`, `origin/staging` and `origin/performance-refactor`: all at line 21, unguarded. `git log --all -S"phaseLink"`: only `bb0058bf6` (P2-3574), which introduced it. | **Not fixed** on any branch |
| **Live path?** | Sidebar or Back click → `Router.navigate` → `canDeactivate` checks on the active route tree → the inner section route (`rd-general-information-routing.module.ts:12`) → `UnsavedChangesGuard.canDeactivate(null)` → throws at `:21`. The prod bundle's stack points at `e.canDeactivate`, matching this path. | **On path** |
| **Siblings on the same state** | (a) All 12 Reporting `rd-*` / `rd-result-types-pages/*` inner routes carry the guard (`*-routing.module.ts:12`). Any of them reached through a not-found or error code freezes in the same way, because the error branch (`resultLoadFailure() === 'error'`) also hides the outlet. (b) 7 IPSR inner routes carry it (`pages/ipsr/**/ *-routing.module.ts:9-10`). Whether IPSR detail also hides its outlet on a missing code is `UNVERIFIED — confirm at source before relying on it` (owner: specify phase). The guard null check covers them either way. | Guard fix covers all 19 routes; the chip and redirect fixes are confined to `ResultDetailComponent` |
| **Downstream consumers** | `shared/guards/unsaved-changes.guard.spec.ts` (9 cases, none with `null`); `rd-general-information-routing.canDeactivate.spec.ts` (router-level); `result-detail.component.spec.ts` (43 cases). The ~30 files that build `/result/result-detail/...` (e.g. `smart-navigation.service.ts`, `header-panel.component.ts`, `change-phase-modal.component.ts`, `assistant-tools.ts`) benefit from the redirect and are not edited. No server consumer. | Tests to extend: guard spec, result-detail spec |

- **Data integrity / security:** none. The guard change only lets clean navigations through when there is no component, so nothing can be dirty and there is nothing to save. The redirect is a client-side route swap with the same auth header and the same permissions.

### Fix Strategy
- **Guard:** `if (!component) { this.intentSE.consumeSilent(); return true; }` before line 21.
- **Chips:** `phaseLink(phase)` uses the base `/ipsr/detail` when `phase.app_module_id == 2`, and `/result/result-detail` otherwise.
- **Redirect:** when `result_type_id ∈ {10, 11}` on the Reporting route, call `router.navigate(['/ipsr/detail', code, 'general-information'], { queryParams: { phase }, replaceUrl: true })`.
- **Route:** logic and behaviour change, so `/akili-specify` (Lite) in **Bug Mode** with regression tests (red before, green after). Not `/akili-quick`.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Guard null check + chip by `app_module_id` + type redirect in Result detail** | Three small changes in two files | Fixes every entry point at the destination; reuses data already returned; ~3 files of tests | The redirect costs one extra round trip (`GET_resultById`) before navigating |
| B. Guard null check + patch every link builder | Fix the URL at each of the ~30 sources | No extra hop | Large diff and easy to miss a source; new links regress the bug |
| C. Server-side: `resultIdToCode` returns 404 plus the module | Backend tells the client where to go | Single source of truth | Contract change for a client routing bug; does not cover a code that resolves (2b) |

## 11. Recommended Approach

**Option A.** It is the smallest safe path. The guard fix is one line and covers 19 routes. The chip fix reads a field the endpoint already returns. The redirect sits where every Reporting link ends, so no call site has to change. It mirrors the existing rule in `notification-navigation.service.ts:55`. To avoid flashing Reporting sections before the redirect, the redirect should run before `getGreenChecks` and `GET_versioningResult` fire. The exact hook is decided in design.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Kind |
|---|---|---|
| R1 | The redirect hook must run before the section component makes requests and before `pdfSE` / sidebar state is set for Reporting, or the user sees a flash or triggers redundant GETs. | Risk |
| R2 | Opening a result from inside IPSR on purpose through Reporting must not loop. Some IPSR steps link to `/result/result-detail` for *innovation* results (type 7), not packages. The redirect is gated on 10/11 only. | Risk |
| OQ1 | Should a Reporting code opened under `/ipsr/detail` redirect back (the mirror case)? Proposed answer: out of scope until someone reports it. | Open question |
| OQ2 | Does IPSR detail have its own not-found branch that hides its outlet (sibling b)? Confirm in specify. | Open question |
| OQ3 | When there is no `?phase`, which phase does the redirect use? Proposed: the phase the result resolved in (`currentResultPhase`, or the version returned). | Open question |

No Active Lessons apply: `docs/specs/kaizen-log.md` does not exist in this checkout.

## 13. Success Criteria

- **SC1:** On prod-equivalent data, from `/result/result-detail/11719/general-information`, Back to results and sidebar navigation work, and the console shows no `hasUnsavedChanges` TypeError.
- **SC2:** The IPSR chips on that screen point to `/ipsr/detail/11719/general-information?phase=…`.
- **SC3:** `/result/result-detail/11719/general-information?phase=9` ends at `/ipsr/detail/11719/general-information?phase=9`, showing 6 sections, and the history is not polluted.
- **SC4:** Reporting results (types 1–9) are unaffected: no redirect, and the chips keep the Reporting route.
- **SC5:** New regression tests fail on the current code and pass after the fix. The client Jest gate stays green.

## 14. Next Step

```text
/akili-specify bugfix/result-detail-not-found-navigation
```

Run it in **Bug Mode** (Lite) with mandatory regression tests.
