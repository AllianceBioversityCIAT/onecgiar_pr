# Proposal — Innovation Packages filter shows Initiatives instead of Science Programs only

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `ipsr-initiative-filter-removal` — derived from free-text argument (business request pasted inline, no ticket number given) |
| Spec Path | `docs/specs/bugfix/ipsr-initiative-filter-removal/` |
| Type | Bug |
| Approval Mode | gated |
| Ticket | None provided — business request via screenshot + description |
| Reporter | Business (quoted: "It doesn't make sense to have all these [Initiatives] for packages.") |
| Assignee | Current user (santiago.sanchez@cgiar.org) |

## 2. Intent

The Innovation Packages list (`/ipsr/list/innovation-list`) must only ever present **Science Program** (`SP-xx`) data in its "Submitter(s)" filter chips — never legacy **Initiative** (`INI-xx`) codes. Initiatives are a pre-2022/P22 concept; Innovation Packages/IPSR is a P25-era, Science-Program-scoped module, and the module already has the correctly-scoped data available — it just isn't the data source actually wired to the filter.

## 3. Problem / Current Behavior

The "Submitter(s)" filter chip row on the Innovation Packages list mixes Initiative codes (`INI-35`, `INI-26`, `INI-47-D4`, `INI-D7`, `INI-D1`, `INI-50`, `INI-17`, `INI-30`, `INI-16`, …) with Science Program codes (`SP-B6`, `SP02`, `SP06`, …), and users can filter by either. Per the business, only Science Programs belong here.

### Reproduction Steps

1. Log in as a user whose CLARISA memberships span both the legacy Initiatives portfolio (pre-2022/2024) and the current Science Programs portfolio (2025+).
2. Go to `/ipsr/list/innovation-list` (Innovation Packages).
3. Look at the "Submitter (s)" filter chip row at the top of the list.
4. Observe: chips include both `INI-xx` codes and `SPxx` codes, and both are selectable to filter the table.

### Root Cause (confirmed)

Confirmed in code — the IPSR list filter is wired to the wrong, unscoped data source, even though the correctly-scoped one already exists and is already used elsewhere in the same component:

- `onecgiar-pr-client/src/app/shared/services/api/auth.service.ts:76-108` (`updateUserData`) fetches **two** distinct initiative datasets from the server in the same `forkJoin`:
  - `GET_initiativesByUser()` → flat, unfiltered list across **all** portfolios (Initiatives + Science Programs mixed) → stored as `dataControlSE.myInitiativesList`.
  - `GET_initiativesByUserByPortfolio()` → **already portfolio-scoped**, split into `{ reporting: [...], ipsr: [...] }` → stored as `dataControlSE.myInitiativesListReportingByPortfolio` and `dataControlSE.myInitiativesListIPSRByPortfolio` respectively.
- Lines 102-103 wire the filter chip services to the **wrong** (flat, mixed) list for both modules:
  ```ts
  this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList);
  this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList);
  ```
- `IpsrListFilterService.updateMyInitiatives()` (`onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service.ts:25-32`) populates `filters.general[0].options` — the exact array rendered as chips in `ipsr-list-filters.component.html:2-12` — verbatim from whatever it's handed. It has no filtering logic of its own; it trusts its input.
- **Proof the IPSR-scoped list is already the intended source for this module:** `innovation-package-list.component.ts:58` (`checkIpsrReportingAccess`) already reads `this.api.dataControlSE.myInitiativesListIPSRByPortfolio` — the correctly-scoped, Science-Program-only list for the IPSR module — for a *different* purpose (gating reporting access). The filter-chip wiring simply never got pointed at the same list.

So the fix is a data-source correction, not new logic: the IPSR list filter must be populated from `myInitiativesListIPSRByPortfolio` (already computed, already portfolio-scoped to the module) instead of the flat `myInitiativesList`.

### Impact & Scope

- Confirmed limited to the **Innovation Packages / IPSR list module** (`pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/`). The Results module's equivalent filter (`ResultsListFilterService.updateMyInitiatives`, fed by the same flat `myInitiativesList`) is a **separate, deliberate** design — its options array explicitly appends a `'Pre-2022 results'` chip (`results-list-filter.service.ts:110`), meaning the Results list is intentionally meant to span both eras. That is out of scope for this bug and must not be touched.
- No table column shows Initiative data today — `innovation-package-custom-table.component.html` only renders `columnOrder` (title/submitter/status/etc.) plus a fixed `result_code`/PDF/action set; no `INI-*` values render as columns. So "remove Initiative columns from the table" (from the original ask) has **no code to change** — it is already Science-Program-only at the table level. Confirm this with the business during `/akili-specify` so expectations match reality.
- Two other properties on `innovation-package-list.component.ts` read `dataControlSE.myInitiativesList` directly instead of going through the filter's `options` array — `deselectInits()` (line 98), `everyDeselected` (line 94), `ngOnDestroy()` (line 102), and `initsSelectedJoinText` (line 88). If only the filter's *display* source is swapped and these are left pointed at the flat list, the "select all admin" / "deselect all" / cleanup behaviors would drift out of sync with what's actually shown as chips. These call sites need to move to the same `myInitiativesListIPSRByPortfolio` source in the same fix — `/akili-specify` should treat this as part of the bounded fix, not a follow-up.
- No backend change needed — `GET_initiativesByUserByPortfolio` and its `ipsr` split already exist and are already fetched on every session; this is purely a client wiring correction.

### Fix Strategy

Not cosmetic — it's a data-source correction touching a service call site and several component references that must stay consistent with each other. Route to **`/akili-specify` (Bug Mode)**, which will require a regression test (red before / green after).

Recommended shape for `/akili-specify` to detail:
- Change `auth.service.ts:103` to call `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesListIPSRByPortfolio)` (and the matching call in the `error` handler at line 108) instead of `myInitiativesList`. Leave `resultsListFilterSE.updateMyInitiatives(...)` untouched (Results module keeps the flat, cross-era list by design).
- Update `innovation-package-list.component.ts`'s `deselectInits()`, `everyDeselected`, `ngOnDestroy()`, and `initsSelectedJoinText` to read `myInitiativesListIPSRByPortfolio` instead of `myInitiativesList`, so "select all / deselect all" stays consistent with the chips actually rendered.
- Verify `myInitiativesListIPSRByPortfolio` is guaranteed Science-Program-only for the current (2025+/P25) portfolio server-side — confirm with a real account that has both legacy Initiative and Science Program memberships that the `ipsr` split of `GET_initiativesByUserByPortfolio` never includes `INI-*` entries. If the server ever does return a mixed set here, the fix must add a client-side guard (filter to `official_code` starting with `SP`) — this needs a quick manual check during `/akili-specify` before assuming the server payload alone is sufficient.

## 4. Proposed Outcome

| Scenario | Current behavior | Expected behavior |
|---|---|---|
| User with both legacy Initiative and Science Program memberships opens Innovation Packages list | "Submitter(s)" chips show a mix of `INI-xx` and `SP-xx`/`SPxx` codes | "Submitter(s)" chips show **only** Science Program codes |
| Same user opens Results list (`/result/results-outlet/results-list`) | Chips mix Initiatives, Science Programs, and a "Pre-2022 results" option | Unchanged — this list is intentionally cross-era and is out of scope |
| "Select all" / "deselect all" behavior on Innovation Packages list | Iterates the flat, mixed `myInitiativesList` | Iterates the same Science-Program-only list the chips are built from |

## 5. Scope

- `onecgiar-pr-client/src/app/shared/services/api/auth.service.ts` — swap the data source passed to `ipsrListFilterService.updateMyInitiatives(...)` in both the `next` and `error` branches.
- `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts` — align `deselectInits()`, `everyDeselected`, `ngOnDestroy()`, `initsSelectedJoinText` to the same scoped source.
- Regression test(s): extend `ipsr-list-filter.service.spec.ts` and/or `innovation-package-list.component.spec.ts` to assert only Science-Program-shaped entries populate the filter, and that a mixed input to `auth.service.ts`'s `updateUserData` never reaches the IPSR filter as Initiatives.
- Manual verification against a real account with mixed Initiative/Science Program membership (browser check per client `CLAUDE.md` §9 — inject `token` **and** `user`).

## 6. Non-Goals

- No change to the Results module's filter (`ResultsListFilterService`) — it deliberately spans both Initiatives and Science Programs plus a "Pre-2022 results" option.
- No new table columns or column removal in `innovation-package-custom-table` — none currently render Initiative data.
- No backend/API changes — `GET_initiativesByUserByPortfolio`'s `ipsr` split already exists and is already fetched.
- No change to how Science Program chips filter/join logic works (`onSelectChip`, `cleanAllFilters`) — only which array feeds them.

## 7. Affected Users, Systems, And Specs

- **Users:** Any user with IPSR/Innovation Package access whose CLARISA memberships include legacy Initiatives (pre-2025) alongside current Science Programs — reproducible today with an account that has both.
- **Systems/code:**
  - `onecgiar-pr-client/src/app/shared/services/api/auth.service.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/services/ipsr-list-filter.service.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/components/ipsr-list-filters/`
- **Related code (do not touch):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service.ts` — same pattern, deliberately different scope.
- **No spec exists yet** under `docs/specs/` for the IPSR list filter — `/akili-specify` for this bug is the first formal spec touching it.

## 8. Visual Reference

- Source: Screenshot provided by the user (two copies of the same `/ipsr/list/innovation-list` view), with a red circle in the original ticket marking the Initiative filter chips to remove.
- Location: Not persisted as a file in this session — the screenshots showed the current "Submitter(s)" chip row (`All results`, `SP02`, `SP06`, `SP07`, `SP09`, `SP12`) and table (`RESULT CODE`, `TITLE`, `SUBMITTER`, `STATUS`, `PHASE YEAR`, `PHASE PORTFOLIO`, `CREATED BY`, `PDF`, `ACTION`). Re-attach if a fresh screenshot with visible `INI-xx` chips is needed during `/akili-specify` for a pre/post comparison.
- Notes: This is a data-wiring fix on an existing, already-styled filter strip (`styles/filters-list.scss`) — no new visual design is needed.

## 9. Approach Options

1. **Swap the IPSR filter's data source to the already-scoped `myInitiativesListIPSRByPortfolio` (recommended).** Smallest safe change: the correct data already exists and is already fetched every session; only the wiring in `auth.service.ts` plus the four related references in `innovation-package-list.component.ts` need to change. No backend change, no new API call.
2. **Client-side filter by `official_code` prefix (`SP`) wherever the flat list is consumed.** Works without relying on server-side portfolio scoping being exactly right, but duplicates filtering logic across call sites and papers over rather than fixes the fact that the wrong array is wired in. Only worth doing as a defensive addition if Option 1's verification step (server confirmed to always return SP-only under `ipsr`) turns up an edge case.
3. **Do nothing / cosmetic-only chip hiding (CSS).** Rejected — chips would still be selectable/functional under the hood via `onSelectChip`, and the ticket explicitly asks for the underlying filter data to change, not just its visibility.

**Recommended: Option 1**, with Option 2's prefix guard added defensively only if the manual verification step during `/akili-specify` shows the server-side `ipsr` split isn't reliably Science-Program-only.

## 10. Recommended Approach

Option 1, executed as a Bug-Mode spec: swap the IPSR filter's data source in `auth.service.ts`, align the four dependent references in `innovation-package-list.component.ts`, verify against a real mixed-membership account, and add a regression test asserting the IPSR filter never receives Initiative-shaped entries.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** The four call sites in `innovation-package-list.component.ts` that read `dataControlSE.myInitiativesList` directly (`deselectInits`, `everyDeselected`, `ngOnDestroy`, `initsSelectedJoinText`) must all move together with the filter's data source, or "select all"/"deselect all" will silently desync from what's rendered as chips — this is the main way a partial fix could look done in the UI but leave a residual bug.
- **Open question:** Is `myInitiativesListIPSRByPortfolio`'s `ipsr` split guaranteed Science-Program-only server-side for every phase/portfolio combination, or could a transitional phase still return `INI-*` entries under `ipsr`? Needs a quick manual check (real account, both memberships) during `/akili-specify` before deciding whether Option 2's defensive prefix guard is also needed.
- **Open question:** confirm with the business whether "Phases" chips (`IPSR 2023 - P22 (Closed)`, etc., unaffected by this bug) should remain as-is — the ticket only calls out the Submitter(s)/Initiative chips, so Phases are assumed out of scope.
- **Dependency:** none outside the client — no server/API contract change required for Option 1.

## 12. Success Criteria

- On the Innovation Packages list, the "Submitter(s)" filter chips show only Science Program codes for a user with both legacy Initiative and Science Program memberships.
- "Select all" / "deselect all" and any join/summary text built from the filter selection stay consistent with the chips actually shown (no desync between the four dependent references and the filter's own options).
- The Results module's filter is unchanged (still shows Initiatives + Science Programs + "Pre-2022 results").
- A regression test fails against the pre-fix code (asserts an `INI-*` entry reaches the IPSR filter's options) and passes after the fix.

## 13. Next Step

```text
/akili-specify bugfix/ipsr-initiative-filter-removal
```

Run in **Bug Mode** — convert the confirmed root cause above into a fix plan and a mandatory regression test covering `auth.service.ts` and `innovation-package-list.component.ts`.
