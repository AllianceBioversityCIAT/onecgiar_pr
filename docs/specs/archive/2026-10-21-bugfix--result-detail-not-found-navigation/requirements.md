# Requirements — Result detail: leave the not-found screen, and send IPSR codes to the IPSR module

## 1. Document Control

| Field | Value |
|---|---|
| Module / Sub-feature | `results` / Result detail routing (not-found screen, section guard) |
| Spec Path | `bugfix/result-detail-not-found-navigation` |
| Depth | Lite + Bug Mode (client only; three small fixes, each with a regression test) |
| Type | Bug |
| Approval Mode | gated |
| Status | approved 2026-10-14 |
| Proposal | `proposal.md` (2026-10-14) |
| Ticket | P2-3969 |
| Extends | `archive/2026-09-21-changes--unsaved-changes-alert` (guard, `UCA-*`); P2-3574 / `bb0058bf6` (not-found screen, `phaseLink()`) |

## 2. Executive Summary

When Result detail cannot resolve a code, the user is trapped: every navigation away is cancelled by a guard that throws. When the code belongs to an Innovation Package, nothing sends the user to the IPSR module. This holds both for the phase links on the not-found screen and for a code that resolves through the Reporting route. Both bugs were reproduced in prod with code 11719. Fixing them makes the not-found screen leavable, makes the IPSR phase links open IPSR, and redirects resolved IPSR results into IPSR.

## 3. Glossary

| Term | Meaning |
|---|---|
| Not-found screen | Result detail's "Not reported in this phase" / "Result not found" state, shown when the code→id conversion returns 404 |
| Error screen | The sibling state shown when the conversion fails with any status other than 404 |
| Phase chip | A link on the not-found screen to one phase the code was reported in |
| IPSR phase | A phase whose module is IPSR (`app_module_id = 2`) |
| IPSR result | A result with `result_type_id` 10 (Innovation Package) or 11 (Complementary innovation) |
| Reporting route / IPSR route | `/result/result-detail/{code}/…` and `/ipsr/detail/{code}/…` |

## 4. System Context & Scope

How the system behaves today. Every claim is cited.

- Without `?phase`, the code→id conversion always returns 404. The server returns `null` when no phase is given (`result.repository.ts:1870` `if (!version) return null;`; `results.service.ts:2867` → 404).
- On 404 or error the outlet is not rendered (`result-detail.component.html:64`). The section's `canDeactivate` guard then receives `null` and throws (`unsaved-changes.guard.ts:21`). The navigation is cancelled. Reproduced in prod on 2026-10-14.
- Phase chips reuse the current route and change only `?phase` (`result-detail.component.ts:246-248`). The phase rows include `app_module_id` (`versioning.service.ts:1689-1705`; `version.entity.ts:79-83`).
- No rule in Result detail checks `result_type_id`. The type is known once `GET_resultById` returns (`current-result.service.ts:56`).
- IPSR detail always renders its outlet (`innovation-package-detail.component.html:72`), so its guarded sections never receive `null`.
- The "types 10/11 → IPSR route" rule already exists in four places: `notification-navigation.service.ts:55`, `notification-item.component.ts:1692`, `request-decision.ts:20`, `share-request-modal.component.ts:94`. Whether the IPSR route actually renders a type-11 result is `UNVERIFIED — confirm at source before relying on it`. Note that IPSR's own UI edits type 11 in a modal (`complementary-innovation.component.ts:139`).

**In scope:** the guard's null case; the target of the phase chips; the IPSR redirect from the Reporting route.

**Out of scope:**
- the reverse redirect (Reporting result under the IPSR route);
- rewriting the ~30 link builders;
- server changes;
- copy and design of the not-found screen;
- moving the guard off the inner routes.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Any PRMS user following a stale or phase-less result link | Can leave the not-found or error screen |
| IPSR submitter / reviewer reaching a package from a Reporting link (search, results list, ToC modals, AI assistant, phase chip) | Lands on the IPSR screen: 6 sections, Annual updating, Package and Assess |
| PO (reporter of P2-3969) | Ticket closed with prod-reproducible evidence |

## 6. Functional Requirements

### RDN-R-1 — The not-found and error screens never block navigation (MUST)

When Result detail shows the not-found or the error screen, every navigation away (in-app link, sidebar, Back to results, browser back) SHALL complete normally.

#### Scenario: Leaving the not-found screen (reproduction of P2-3969, Issue 1)

- GIVEN the user opened `/result/result-detail/11719/general-information` with no `?phase`, and the not-found screen is shown
- WHEN the user clicks **Back to results**, or sidebar **Home**
- THEN the URL changes to the target route and the target screen renders
- BUT the navigation must NOT be cancelled, and no `TypeError … hasUnsavedChanges` must be raised
- AND IT MUST behave the same on the error screen (non-404 conversion failure)

#### Scenario: Guard behaviour with a mounted section is unchanged

- GIVEN a section is mounted and has unsaved changes
- WHEN the user leaves through the sidebar
- THEN the Save/Discard dialog opens exactly as today (`UCA-R-2`)
- AND IT MUST still auto-save silently on Back/Next (`UCA-R-1`), and still consume the one-shot silent flag on a clean or empty leave (`UCA-DD-2`)

### RDN-R-2 — Phase chips open the module the phase belongs to (MUST)

Each phase chip on the not-found screen SHALL link to the IPSR route's General information (`/ipsr/detail/{code}/general-information?phase={id}`) when its phase is an IPSR phase, because the two modules do not share section paths. Otherwise it SHALL link to the Reporting route, keeping the current section path and `?phase={id}`.

#### Scenario: IPSR code on the Reporting route (P2-3969, Issue 2a)

- GIVEN the not-found screen for code 11719 lists IPSR 2026 (id 9), IPSR 2025 (7), IPSR 2024 (5), IPSR 2023 (2)
- WHEN the chips render
- THEN each chip points to `/ipsr/detail/11719/general-information?phase={id}`
- BUT it must NOT point to `/result/result-detail/…`

#### Scenario: Reporting code keeps today's link

- GIVEN the not-found screen lists a Reporting phase (`app_module_id = 1`)
- WHEN the chips render
- THEN that chip points to `/result/result-detail/{code}/{current section}?phase={id}`, unchanged from today
- AND IT MUST fall back to the Reporting route when a phase row has no `app_module_id`

### RDN-R-3 — A resolved IPSR result opened on the Reporting route is redirected to IPSR (MUST)

When a code resolves on the Reporting route and the result is an IPSR result, the app SHALL replace the current route with the IPSR route for the same code and phase.

#### Scenario: Innovation Package through the Reporting route (P2-3969, Issue 2b)

- GIVEN the user opens `/result/result-detail/11719/general-information?phase=9`, and 11719 is `result_type_id = 10`
- WHEN the result loads
- THEN the URL becomes `/ipsr/detail/11719/general-information?phase=9`
- AND IT MUST replace the history entry, so that browser back does not return to the Reporting URL and loop
- BUT the Reporting section and its sidebar ("2 of 4 sections") must NOT remain on screen once the redirect has fired

#### Scenario: Non-IPSR results are untouched

- GIVEN a result with `result_type_id` in 1–9
- WHEN it opens on the Reporting route
- THEN no redirect happens and Result detail behaves exactly as today
- BUT a type-7 innovation opened from IPSR's own links (step 1, step 2, step 3) must NOT be redirected

#### Scenario: Complementary innovation (type 11)

- GIVEN a result with `result_type_id = 11`
- WHEN it opens on the Reporting route
- THEN it is redirected like type 10, **only if** premise P-6 (design) confirms that the IPSR route renders a type-11 result; otherwise type 11 is excluded and the exclusion is recorded

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | The redirect adds no request beyond the `GET_resultById` already made. Result detail SHOULD NOT issue Reporting-only section requests after the redirect has fired. |
| Backwards compatibility | Every existing `/result/result-detail/...` link keeps working. Non-IPSR behaviour is unchanged. |
| Security | No change to auth (`auth` header) or permissions. The redirect is client-side only. |
| Observability | The guard no longer logs a `TypeError` on the not-found or error screens. |

### Defect classes and their gates

| Defect class | Gate |
|---|---|
| Guard still throws on a `null` component | Jest guard unit test with `null` (red today) |
| Guard fix bypassed through the real route tree (unit passes, router still cancels) | Router-level Jest test: real `Router`, the not-found state, `navigateByUrl` resolves `true` |
| Chip points to the wrong module | Jest component test reading the rendered `href` |
| Missing redirect, wrong target, no `replaceUrl`, or redirect of a non-IPSR type | Jest component test with a `Router` spy, checking target, `queryParams` and `replaceUrl`; negative case for type 7 |
| Brief flash of Reporting UI before the redirect | **No automated check** (jsdom cannot see a paint). Substitute: a human check on the test environment at the HITL pause, after merge to `performance-refactor` |
| Type error in a typed contract (e.g. `Phases` object passed where a number was expected) | `npx tsc -p onecgiar-pr-client/tsconfig.app.json --noEmit` |
| Lint | `npx ng lint --quiet` |

## 8. Requirement ID Index

| ID | Title | Source |
|---|---|---|
| RDN-R-1 | Not-found and error screens never block navigation | Proposal §9, Issue 1 |
| RDN-R-2 | Phase chips open the module of their phase | Proposal §9, Issue 2a |
| RDN-R-3 | Resolved IPSR result on the Reporting route redirects to IPSR | Proposal §9, Issue 2b |

**Cross-references:**
- `docs/prd.md` `AC-5` (phase / versioning correctness);
- `docs/ux-ui/design.md` (Result detail and IPSR detail screens);
- `docs/trd/trd.md` (client routing; `versioning` module endpoint `GET api/versioning/result/code/:code`).

**Proposal open questions, resolved:**
- **OQ2 (IPSR outlet):** IPSR detail always renders its outlet (§4), so it is not a sibling of RDN-R-1.
- **OQ3 (phase when the URL has none):** a code without `?phase` never resolves (§4), so the redirect always has the URL's phase.
- **OQ1 (reverse redirect):** stays out of scope.
