# Design — Innovation Packages filter shows Initiatives instead of Science Programs only

**Depth:** Lite (Bug Mode). Not architecturally significant — no new module, no persistence/API change, no NFR-scenario impact. `software-architect` Decision Spine not invoked. No visual design needed (data-source swap on an existing, already-styled filter strip) — `ui-ux-pro-max`/`frontend-design` not invoked.

Linked: `docs/specs/bugfix/ipsr-initiative-filter-removal/requirements.md` (`IPF-R-1..3`, `IPF-AC-1..4`).

## 1. Summary

The fix is a data-source correction, not new logic: `AuthApiService.updateUserData()` already fetches a Science-Program-scoped list (`GET_initiativesByUserByPortfolio().ipsr`, stored as `dataControlSE.myInitiativesListIPSRByPortfolio`) alongside the flat, cross-era list (`GET_initiativesByUser()`, stored as `dataControlSE.myInitiativesList`) — it simply wires the IPSR filter to the wrong one. The fix repoints `ipsrListFilterService.updateMyInitiatives(...)` (both call sites) and four dependent references in `InnovationPackageListComponent` to the already-scoped list. No service, entity, or API change. The Results module's equivalent wiring (`resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList)`) is untouched — it deliberately stays on the flat list.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched only** — no server module touched.
  - `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` — `updateUserData()`. **Correction (recorded during `IPF-T-1` execution):** this design was drafted citing `auth.service.ts` for `updateUserData()`; the method actually lives in `api.service.ts` (`auth.service.ts` holds only the `GET_initiativesByUser()`/`GET_initiativesByUserByPortfolio()` HTTP calls it references below, which remain correct). All `auth.service.ts:1xx` line citations for `updateUserData()` in this document should be read as `api.service.ts` at the same line numbers — see `execution.md` `IPF-T-1`.
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts`.
- **No external integrations touched.** `GET_initiativesByUserByPortfolio` (CLARISA-backed, per `docs/trd/trd.md` §2 `clarisa-initiatives`) is already called every session; this design does not add a fetch, only redirects which already-fetched array feeds the filter.

### 2.2 Interaction (before / after)

```
[AuthApiService.updateUserData()]
  forkJoin([ GET_allRolesByUser, GET_initiativesByUser, GET_initiativesByUserByPortfolio ])
    └── next:
          dataControlSE.myInitiativesList = GET_initiativesByUser.response            (flat, mixed INI+SP)
          dataControlSE.myInitiativesListIPSRByPortfolio = ...ipsr split (sorted)      (SP-only, already correct)
          dataControlSE.myInitiativesListReportingByPortfolio = ...reporting split     (unaffected by this fix)

          BEFORE: ipsrListFilterService.updateMyInitiatives(dataControlSE.myInitiativesList)        ← BUG
          AFTER:  ipsrListFilterService.updateMyInitiatives(dataControlSE.myInitiativesListIPSRByPortfolio)

          resultsListFilterSE.updateMyInitiatives(dataControlSE.myInitiativesList)                  ← UNCHANGED (out of scope)
    └── error: same swap applied to the error-branch fallback call (IPF-R-2)

[InnovationPackageListComponent]
  BEFORE: deselectInits() / everyDeselected / ngOnDestroy() / initsSelectedJoinText
          all read dataControlSE.myInitiativesList directly                            ← desync risk (IPF-R-3)
  AFTER:  all four read dataControlSE.myInitiativesListIPSRByPortfolio
```

No sequence diagram needed beyond this — there is no new async call, no new state transition, no new signal. The mechanism is "read a different already-populated array," applied at five call sites across two files.

## 3. Data Model Changes

None. No entity, DTO, or migration touched. `myInitiativesListIPSRByPortfolio` already exists as a `DataControlService` field (`data-control.service.ts:19`) and is already populated every session.

## 4. API Surface

None. No endpoint added/changed. `GET_initiativesByUserByPortfolio` (`auth.service.ts:122-129`) is called exactly as today — same request, same response shape consumed differently on the client (by `api.service.ts`'s `updateUserData()`).

## 5. Server Workflow / Business Rules

None — purely client-side wiring. `IPF-OQ-1` (is the server's `ipsr` split guaranteed Science-Program-only) is a **verification** question about existing server behavior, not a server change this spec makes.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. No new lazy-loaded module. No new guard.

### 6.2 Components & services

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` (`updateUserData()`, `next` handler, ~:103) | Change `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList)` → `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesListIPSRByPortfolio)`. `resultsListFilterSE.updateMyInitiatives(...)` on the line above stays untouched (still fed `myInitiativesList`). |
| `api.service.ts` (`updateUserData()`, `error` handler, ~:108) | Same swap in the error branch: `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesListIPSRByPortfolio)` — `IPF-R-2`. **Correction (`IPF-T-1` execution finding):** this row's original "handles undefined gracefully" claim was wrong — `updateMyInitiatives()` guards the `forEach` with `initiatives?.forEach(...)` but the following `[...header, ...initiatives]` spread is unguarded and throws `TypeError` on `undefined` (empirically confirmed). **Correction (`IPF-T-1` rework, Reviewer FAIL):** the "not reachable today" claim in the previous revision of this row was also wrong — `myInitiativesListIPSRByPortfolio` only defaults to `[]` in `data-control.service.ts` *until* `updateUserData()`'s `next` handler overwrites it with `GET_initiativesByUserByPortfolio?.response?.ipsr?.sort(...)`, which evaluates to `undefined` whenever a 200 response omits the `ipsr` key (or returns it `null`) — a case `IPF-OQ-1` leaves open, so it cannot be assumed impossible. Fixed at the assignment site in `api.service.ts` (`... ?? []`), so the `error` handler now only ever receives an array by the time it runs; `ipsr-list-filter.service.ts` correctly stays "No change" per the row below — the guard belongs at the data source, not the consumer. |
| `innovation-package-list.component.ts` — `checkIpsrReportingAccess()` (~:58) | **No change** — already correctly reads `myInitiativesListIPSRByPortfolio`. Cited here only to confirm this is the precedent the other four call sites are being aligned to. |
| `innovation-package-list.component.ts` — `initsSelectedJoinText` getter (~:88) | `const myInitiativesList = this.api.dataControlSE?.myInitiativesList;` → `const myInitiativesList = this.api.dataControlSE?.myInitiativesListIPSRByPortfolio;` (local variable name kept for minimal diff; it now holds the scoped list). |
| `innovation-package-list.component.ts` — `everyDeselected` getter (~:94) | `return this.api.dataControlSE.myInitiativesList.every(...)` → `return this.api.dataControlSE.myInitiativesListIPSRByPortfolio.every(...)`. |
| `innovation-package-list.component.ts` — `deselectInits()` (~:98) | `this.api.dataControlSE.myInitiativesList.forEach(...)` → `this.api.dataControlSE.myInitiativesListIPSRByPortfolio.forEach(...)`. |
| `innovation-package-list.component.ts` — `ngOnDestroy()` (~:102) | `this.api.dataControlSE?.myInitiativesList.forEach(...)` → `this.api.dataControlSE?.myInitiativesListIPSRByPortfolio.forEach(...)`. |
| `ipsr-list-filter.service.ts` | **No change.** `updateMyInitiatives()` already applies no filtering logic beyond prepending `'All results'` — trusting its input is correct behavior; the fix is entirely about what's passed in. |

No new component is created. No component is deleted.

### 6.3 Design system usage

No new tokens, no new component. The filter strip continues to use `src/styles/filters-list.scss` exactly as today (`docs/ux-ui/design.md` §6, §8 item 4) — only the chip data changes, not the markup or styling.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

Unaffected — no new endpoint, no new role check, no change to JWT/guard posture. `myInitiativesListIPSRByPortfolio` is populated from the same authenticated `GET_initiativesByUserByPortfolio()` call as before.

## 8. Performance & Capacity

Unaffected — no new query, no new HTTP call, no new payload size. `GET_initiativesByUserByPortfolio` is already fetched in the same `forkJoin` as `GET_initiativesByUser`; this design does not add a fetch, only changes which already-resolved array is read.

## 9. Observability

None added. No new log line needed — pure data-source rewiring with no new failure mode to observe.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):**
  - `api.service.spec.ts` (extend, or create if it does not yet cover `updateUserData()`) — mock `GET_initiativesByUser()` to return a mixed `INI-*`/`SP-*` array and `GET_initiativesByUserByPortfolio()` to return an `ipsr` split containing only `SP-*` entries; assert `ipsrListFilterService.updateMyInitiatives` is called with the `ipsr`-scoped array, not the flat one, in **both** the success and error branches (`IPF-R-1`, `IPF-R-2`). This is the primary regression test — it directly encodes the bug's reproduction (mixed membership) and its absence is exactly what let the original wiring ship wrong.
  - `innovation-package-list.component.spec.ts` (extend — already exists per `git status`, confirm current coverage) — assert `deselectInits()`, `everyDeselected`, `ngOnDestroy()`, and the array read inside `initsSelectedJoinText` all operate on `dataControlSE.myInitiativesListIPSRByPortfolio`, using a spy/mock that gives the two `DataControlService` arrays visibly different contents so a test reading the wrong one fails observably (`IPF-R-3`).
  - `ipsr-list-filter.service.spec.ts` — **no change expected**; existing tests already call `updateMyInitiatives()` directly with a fixture array and don't assert on the caller's data source, so they remain valid regardless of which array `api.service.ts` passes in. Run unmodified to confirm no incidental break.
  - `results-list-filter.service.spec.ts` — run unmodified as the `IPF-R-10`/`IPF-AC-4` regression guard; must stay green with zero assertion changes, confirming the Results module's filter is untouched.
- **Manual/browser check (mandatory, not substitutable):** `IPF-OQ-1` (whether the server's `ipsr` split is guaranteed Science-Program-only) has no automated check — a Jest mock can only assert the client reads the right *array*, not that the server always populates that array correctly. Verify with a real account carrying both legacy Initiative and Science Program CLARISA memberships, per the client `CLAUDE.md` §9 browser-verification method (inject `token` **and** `user` in `localStorage`). Recorded as a mandatory task DoD item, not assumed.
- Coverage uplift: no threshold change expected — this touches two files already under Jest coverage (`api.service.ts`, `innovation-package-list.component.ts`), adding assertions rather than new untested surface.

## 11. Backwards Compatibility & Migration Plan

- No database migration. No API contract change. No feature flag needed — ships as a normal client release.
- No data backfill.
- No downstream consumer to notify (bilateral/platform-report unaffected).
- Rollback = revert the PR; no data-side cleanup needed since nothing persisted changes shape.

## 12. Design Decisions (ADRs)

### `IPF-DD-1` — Repoint to the existing scoped list, rather than add client-side filtering

- **Context:** The correct data (`myInitiativesListIPSRByPortfolio`) already exists, is already fetched every session, and is already consumed by this exact component for a related purpose (`checkIpsrReportingAccess`, line 58). The wrong list is wired in at exactly one origin point (`api.service.ts`) plus four downstream references that read the same wrong list directly instead of going through the filter's own `options`.
- **Decision:** Swap the data source at the five call sites (§6.2) rather than add a client-side `official_code.startsWith('SP')` filter over the flat list. Reusing the already-scoped list is simpler, doesn't duplicate filtering logic, and matches the precedent already set by `checkIpsrReportingAccess`.
- **Alternatives considered:**
  1. Client-side prefix filter (`myInitiativesList.filter(i => i.official_code?.startsWith('SP'))`) applied at each call site — rejected as the default because it duplicates logic across (now five, not one) call sites and doesn't fix the underlying wrong-list wiring, only papers over its symptom. Kept as the `IPF-OQ-1` fallback if the server-side split proves unreliable.
  2. Filter inside `IpsrListFilterService.updateMyInitiatives()` itself (client-side, but centralized in one place) — rejected as the default for the same reason as #1 (masks the wrong input rather than fixing it) but is the better fallback shape if `IPF-OQ-1` requires a guard, since it centralizes the filter in one function instead of five call sites.
- **Consequences:** If `IPF-OQ-1`'s manual verification finds the server-side `ipsr` split is not reliably Science-Program-only, this decision must be revisited — Alternative 2 (centralized guard inside `updateMyInitiatives()`) becomes the recommended addition, not a full redesign.
- **Reversion challenge (Step 2.3):** This design **removes existing, shipped capability** — users with legacy Initiative membership currently can filter the Innovation Packages list down to just their Initiative's submissions; after this fix they cannot. Challenge question: *what does removing this break?* Answer: nothing beyond the explicitly requested behavior — the `'All results'` sentinel (unconditionally prepended by `updateMyInitiatives()` regardless of input) still surfaces every result including ones tied to legacy Initiatives; only the ability to filter *down to* a specific legacy Initiative is lost, which is exactly what the business asked for ("it doesn't make sense to have all these [Initiatives] for packages"). No hidden data, no broken downstream consumer — confirmed no further design change needed.

## 13. Open Gaps & Follow-ups

- **Open question carried from `requirements.md`:** `IPF-OQ-1` — must be resolved (manual check) before/during task execution; if unfavorable, apply `IPF-DD-1` Alternative 2 as an added guard.
- **Minor gap to verify in task execution, not a design change:** confirm `IpsrListFilterService.updateMyInitiatives(initiatives)` behaves safely when `initiatives` is `undefined` (possible in the error-branch call per §6.2) — `initiatives?.forEach(...)` guards the loop, but `[...initiatives]`-style spreads elsewhere in the codebase have been a source of `TypeError` on `undefined` in similar patterns; confirm by reading the exact implementation (`ipsr-list-filter.service.ts:31`, `...initiatives` spread) before shipping, not assumed safe by inspection alone.
- **Follow-up (not this spec):** promote the "Science Program" portfolio concept into `docs/prd.md`/`docs/trd/trd.md` — both baseline docs still describe only the Initiatives taxonomy (`requirements.md` §11 Out-of-Band Notes).

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Expected tasks | 2: (1) `api.service.ts` data-source swap (both branches) + regression test; (2) `innovation-package-list.component.ts` four-reference alignment + test + mandatory manual verification of `IPF-OQ-1`. |
| Expected LOC | ~20–40 (five one-line call-site changes across two files, plus new/extended Jest assertions — no new component, no new service method, no new data flow) |
| Expected review rounds | 1 (single well-understood data-source swap with a clear precedent already in the same file; the only real risk is the `IPF-R-3` desync, which is explicit in the requirements and design) |

**Sizing check against declared depth (Lite):** the estimate (2 tasks, ~20–40 LOC, 1 review round) sits comfortably inside Lite — no depth change recommended. This is smaller than the sibling bugfix (`other-fields-toc-visibility`, 5 tasks/~150 LOC) precisely because the correct data source already exists in the codebase; the fix is pure rewiring, not new branching logic.

## Required cross-references

- `docs/specs/bugfix/ipsr-initiative-filter-removal/requirements.md` (same folder) — `IPF-R-1..3`, `IPF-R-10`, `IPF-AC-1..4`.
- `docs/specs/bugfix/ipsr-initiative-filter-removal/proposal.md` — Bug Diagnosis, Approach Options.
- `docs/prd.md` — `US-S2`, `US-P3`.
- `docs/ux-ui/design.md` — §6 Layout Patterns (filter strip).
- `docs/trd/trd.md` — §2 Domain Modules (`ipsr`).
