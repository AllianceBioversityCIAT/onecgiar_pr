# Requirements — Innovation Packages filter shows Initiatives instead of Science Programs only

**Depth:** Lite (Bug Mode). Single wrong data-source wiring + four dependent references in one component; no data model, no API, no payload change.

## 1. Module / Feature

- **Module:** `bugfix/ipsr-initiative-filter-removal` (client-only; `pages/ipsr/pages/innovation-package-list-content`, `shared/services/api/api.service.ts`)
- **Correction (`IPF-T-1`, recorded during execution):** `updateUserData()` — and thus this fix — lives in `shared/services/api/api.service.ts`, not `auth.service.ts`. `auth.service.ts` only holds the `GET_initiativesByUser()` / `GET_initiativesByUserByPortfolio()` HTTP calls (both already correct, untouched). Every `auth.service.ts` reference below describing `updateUserData()` should be read as `api.service.ts`; see `execution.md` `IPF-T-1` entry.
- **Sub-feature:** Innovation Packages list — "Submitter(s)" filter chip data source
- **Owner:** Current user (santiago.sanchez@cgiar.org)
- **Status:** draft
- **Ticket(s):** None provided — business request via screenshot + description (see `proposal.md`)

## 2. Context

The Innovation Packages list (`/ipsr/list/innovation-list`, `pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list`) renders a "Submitter(s)" filter chip row sourced from `IpsrListFilterService.filters.general[0].options`. Per `proposal.md` §3 (Bug Diagnosis), that array is populated from `dataControlSE.myInitiativesList` — a flat list spanning **every** portfolio era the user belongs to (legacy Initiatives, `INI-xx`, plus current Science Programs, `SP-xx`) — instead of `dataControlSE.myInitiativesListIPSRByPortfolio`, a Science-Program-scoped list that is **already fetched every session** and **already consumed** by this same module for a different purpose (`innovation-package-list.component.ts:58`, reporting-access gating). Business wants Innovation Packages (a P25/Science-Program-era module, `docs/prd.md` US-P3 "manage IPSR pathways") to show **only** Science Programs — Initiatives are a P22-era concept that, per the business quote, "doesn't make sense... for packages."

This touches `docs/ux-ui/design.md` §6 (Filter strip pattern, `src/styles/filters-list.scss`) and `docs/prd.md` US-S2 (type-specific sections incl. IPSR pathway) / US-P3 (PMU manages IPSR pathways). Neither `docs/prd.md` nor `docs/trd/trd.md` yet documents the "Science Program" portfolio concept by name (both still describe the CGIAR taxonomy as "Initiatives → Centers → Partners") — this is a pre-existing baseline gap, not something this spec resolves (see Out-of-Band Notes).

Full diagnosis: `docs/specs/bugfix/ipsr-initiative-filter-removal/proposal.md` §3 (Bug Diagnosis).

## 3. In Scope / Out of Scope

### In scope

- Swap the IPSR list filter's data source from `myInitiativesList` (flat, mixed) to `myInitiativesListIPSRByPortfolio` (already-scoped, Science-Program-only) in `api.service.ts` (`updateUserData()`).
- Align the four dependent references in `innovation-package-list.component.ts` (`deselectInits`, `everyDeselected`, `ngOnDestroy`, `initsSelectedJoinText`) to the same scoped source, so "select all"/"deselect all" stays consistent with the rendered chips.
- Regression test proving no `INI-*`-shaped entry reaches the IPSR filter's rendered options.
- Manual verification against a real account with mixed Initiative/Science-Program membership.

### Out of scope

- The Results module's filter (`ResultsListFilterService.updateMyInitiatives`) — same pattern, deliberately different scope (it intentionally spans both eras plus a "Pre-2022 results" chip).
- Any table column change in `innovation-package-custom-table` — no Initiative data renders there today (confirmed in `proposal.md` §3 Impact & Scope); nothing to remove.
- Any backend/API change — `GET_initiativesByUserByPortfolio`'s `ipsr` split already exists and is already fetched.
- "Phases" filter chips — unaffected, not part of the reported defect.
- A defensive client-side prefix guard (filter to `official_code` starting with `SP`) — added only if `IPF-OQ-1` (below) resolves to "the server-side split is not reliably Science-Program-only."

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Initiative/Center staff) with both legacy Initiative and Science Program memberships | Sees only Science Program chips in the Innovation Packages "Submitter(s)" filter — Initiative chips disappear. |
| PMU / portfolio lead | Same — IPSR pathway list filter is Science-Program-only, matching the module's current portfolio era. |

## 5. User Stories

- **`IPF-US-1`** — As a result submitter or PMU lead with mixed Initiative/Science Program membership, I want the Innovation Packages "Submitter(s)" filter to show only Science Programs, so that the filter matches the module's current (P25) portfolio scope and I'm not offered a meaningless legacy filter.
  Refines `US-S2`, `US-P3`.

## 6. Functional Requirements

### Required (MUST)

- **`IPF-R-1`** When populating the Innovation Packages list's "Submitter(s)" filter chips, the system MUST use `dataControlSE.myInitiativesListIPSRByPortfolio` (the IPSR-portfolio-scoped list) instead of `dataControlSE.myInitiativesList` (the flat, cross-era list) as the source passed to `IpsrListFilterService.updateMyInitiatives(...)`.
- **`IPF-R-2`** The system MUST apply the same source correction in both the success and error branches of `ApiService`'s `updateUserData()` (`api.service.ts:103` success path, `:108` error path) so the filter never falls back to the flat list under any code path.
- **`IPF-R-3`** `InnovationPackageListComponent.deselectInits()`, `.everyDeselected`, `.ngOnDestroy()`, and `.initsSelectedJoinText` MUST read from `dataControlSE.myInitiativesListIPSRByPortfolio` instead of `dataControlSE.myInitiativesList`, so "select all admin" / "deselect all" / cleanup behavior stays consistent with the chips actually rendered.

### Should (SHOULD)

- **`IPF-R-10`** The fix SHOULD NOT change `ResultsListFilterService.updateMyInitiatives` or any of its call sites — the Results module's cross-era filter (Initiatives + Science Programs + "Pre-2022 results") is out of scope and must render identically before and after this fix.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | No change to the Results module's filter behavior, no API/payload change — client-side data-source wiring only. |
| **Consistency** | Within the Innovation Packages list, "select all"/"deselect all"/chip-join text MUST all derive from the same array as the rendered chips — no two of `IPF-R-1..3`'s call sites may diverge on which list they read. |
| **Correctness under real data** | The fix MUST be verified against a real (or realistically mocked) account whose CLARISA memberships include both `INI-*` and `SP-*` entries — a mock containing only one era would not exercise the defect. |

### 7.1 Defect classes this spec can produce, and what catches each

| Defect class | Catching command / check |
|---|---|
| Filter still shows `INI-*` chips (the bug itself, un-fixed) | Jest unit test asserting `IpsrListFilterService.filters.general[0].options` contains no entry whose `official_code`/`name` matches an `INI-*` pattern, given a mixed mock input to `updateUserData`/`updateMyInitiatives`. |
| Fix applied only to the success path, not the error path of `updateUserData` (`IPF-R-2`) | Jest test exercising the error branch of the mocked `forkJoin` and asserting the same non-`INI-*` invariant holds. |
| Filter chips corrected but `deselectInits`/`everyDeselected`/`ngOnDestroy`/`initsSelectedJoinText` still reference the flat list (`IPF-R-3`) — chips look right but "select all"/"deselect all" silently desyncs | Jest test on `InnovationPackageListComponent` asserting each of the four call sites reads `myInitiativesListIPSRByPortfolio`, not `myInitiativesList` (property source assertion, not just output). |
| Results module filter accidentally changed (`IPF-R-10` regression) | Existing `results-list-filter.service.spec.ts` run unmodified — must stay green with no assertion changes. |
| Server-side `ipsr` split of `GET_initiativesByUserByPortfolio` is not actually Science-Program-only for some phase/portfolio combination (`IPF-OQ-1`) | **No automated check exists for this** — it is a server-payload-shape question, not a client logic defect. Substituted by an explicit manual verification step (real account, both memberships) recorded as a mandatory DoD item in `tasks.md`, and treated as an accepted risk until confirmed. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `IPF-AC-1` | A user whose CLARISA memberships include both legacy Initiatives and current Science Programs, session data loaded via `updateUserData()` success path | The Innovation Packages list renders | The "Submitter(s)" filter chips contain only Science-Program-shaped entries; no `INI-*` entry is present. |
| `IPF-AC-2` | Same user, `updateUserData()`'s `GET_allRolesByUser`/`GET_initiativesByUser`/`GET_initiativesByUserByPortfolio` call errors | The Innovation Packages list renders (error-path fallback) | The "Submitter(s)" filter chips still contain no `INI-*` entry — same invariant as `IPF-AC-1`. |
| `IPF-AC-3` | Same user, Innovation Packages list loaded | User clicks a "deselect all" / "select all" affordance driven by `deselectInits()`/`everyDeselected` | Only Science-Program entries are toggled; behavior is consistent with what the chips display (no reference to an `INI-*` entry that isn't rendered). |
| `IPF-AC-4` (regression guard) | Same mixed-membership user | The Results module list (`/result/results-outlet/results-list`) renders | The Results filter is **unchanged** — still shows Initiatives, Science Programs, and "Pre-2022 results" exactly as before this fix. |

Cross-cutting project ACs that already apply (do NOT restate): `AC-1` (typed result integrity — unaffected), `AC-9` (no secrets in logs — unaffected).

### Scenario detail for `IPF-AC-1`

```
### Requirement: Innovation Packages filter is Science-Program-only

The system SHALL populate the Innovation Packages "Submitter(s)" filter from the
IPSR-portfolio-scoped initiatives list, not the flat cross-era list.

#### Scenario: User has both legacy Initiative and Science Program memberships
- GIVEN a user whose `GET_initiativesByUserByPortfolio` response's `ipsr` array contains only
  Science-Program-shaped entries, while the flat `GET_initiativesByUser` response mixes
  `INI-*` and `SP-*` entries
- WHEN `updateUserData()` completes and the Innovation Packages list initializes its filters
- THEN `IpsrListFilterService.filters.general[0].options` contains every entry from the
  `ipsr`-scoped list (plus the `'All results'` sentinel)
- BUT it must NOT contain any entry present only in the flat list's `INI-*` subset
- AND IT MUST leave `ResultsListFilterService.filters.general[0].options` fed from the
  flat list, unchanged (`IPF-AC-4`)
```

## 9. Dependencies & Assumptions

### Upstream dependencies

- `AuthApiService.GET_initiativesByUser()` and `GET_initiativesByUserByPortfolio()` (`auth.service.ts:113-129`) — both already exist. Both are already fetched in the same `forkJoin` inside `ApiService.updateUserData()` (`api.service.ts`). No new HTTP call.
- `DataControlService.myInitiativesList` / `myInitiativesListReportingByPortfolio` / `myInitiativesListIPSRByPortfolio` (`data-control.service.ts:17-19`) — all three already exist and are already populated.

### Downstream consumers

- None beyond `IpsrListFilterService` and `InnovationPackageListComponent` — no API/payload consumer is affected.

### Assumptions

- `myInitiativesListIPSRByPortfolio` (the `ipsr` split of `GET_initiativesByUserByPortfolio`'s response) is assumed to be server-side guaranteed Science-Program-only for the current portfolio. This is `IPF-OQ-1` below — an assumption to verify, not yet a confirmed fact.

## 10. Open Questions

- `IPF-OQ-1` — Is `myInitiativesListIPSRByPortfolio`'s `ipsr` split guaranteed Science-Program-only server-side for every phase/portfolio combination, or could a transitional phase still return `INI-*` entries under `ipsr`? Resolve via manual check (real account, both memberships) before or during `design.md`; if the server ever returns a mixed set, `design.md` must add a client-side prefix guard (`official_code` starting with `SP`) as a defensive measure — this would still satisfy `IPF-R-1..3` as written, just with an added guard clause.

## 11. Out-of-Band Notes

- Neither `docs/prd.md` nor `docs/trd/trd.md` documents the "Science Program" portfolio concept by name yet (both describe the taxonomy as "Initiatives → Centers → Partners" only) — this spec does not attempt to update those baseline docs; flagged as a baseline-doc gap for a future `/akili-constitution` pass, not blocking this fix.
- The proposal (`proposal.md` §9 Approach Options) flags a defensive `official_code` prefix filter as a fallback if `IPF-OQ-1` resolves unfavorably — not adopted by default.

## Required cross-references

- `docs/prd.md` — `US-S2`, `US-P3`.
- `docs/ux-ui/design.md` — §6 Layout Patterns (filter strip, `src/styles/filters-list.scss`).
- `docs/trd/trd.md` — §2 Domain Modules (`ipsr` → `pages/ipsr`).
- `docs/specs/bugfix/ipsr-initiative-filter-removal/proposal.md` — Bug Diagnosis (root cause, reproduction).
