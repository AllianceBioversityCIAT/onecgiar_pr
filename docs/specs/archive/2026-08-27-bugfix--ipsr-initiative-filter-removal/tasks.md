# Tasks — Innovation Packages filter shows Initiatives instead of Science Programs only

**Linked spec:** `docs/specs/bugfix/ipsr-initiative-filter-removal/requirements.md` + `design.md`.
**Module / feature:** `bugfix/ipsr-initiative-filter-removal` (client-only)
**Status:** done — IPF-T-1 + IPF-T-2 code complete, Reviewer-PASSed, mandatory manual browser verification completed by the user (2026-08-27); both tasks committed together in one commit.
**Owner / driver:** Current user (santiago.sanchez@cgiar.org)

## 1. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved.
- [x] Open questions resolved or explicitly deferred (`IPF-OQ-1` — resolved by manual verification, a mandatory DoD item in `IPF-T-2`, not by design change; if it comes back unfavorable, `IPF-DD-1` Alternative 2 becomes a follow-up, not a blocker for this fix).
- [x] No CLARISA dependency change — client-only, no catalog/endpoint change.
- [x] No conflicting in-flight spec touching the same files (verified: no other `docs/specs/` entry references `api.service.ts`'s `updateUserData()` or `innovation-package-list.component.ts`).
- [x] No migration involved (client-only).

## 2. Task list

### `IPF-T-1` — `api.service.ts`: repoint IPSR filter to the Science-Program-scoped list [x]

**Ship-order note (Reviewer, attempt 3 PASS):** this task alone leaves the admin deselect-all path broken (mutates the flat list, not the scoped list the chips now render from) — that's `IPF-T-2`'s declared scope. Do NOT commit/deploy `IPF-T-1` standalone; land it together with `IPF-T-2` in one commit/PR, per §7 Roll-back plan below (already assumes a single PR for both tasks).

**Correction (recorded during execution, see `execution.md`):** this task's description below and the `design.md`/`requirements.md` it cites originally named `auth.service.ts`; the actual file is `onecgiar-pr-client/src/app/shared/services/api/api.service.ts` (`auth.service.ts` holds only the unrelated `GET_initiativesByUser()`/`GET_initiativesByUserByPortfolio()` HTTP calls, untouched). The fix itself, line numbers, and code snippets below are otherwise accurate as written.

- **Type:** `client | tests`
- **Description:** In `api.service.ts`'s `updateUserData()`: change `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesList)` (success branch, ~:103) and the matching call in the `error` branch (~:108) to `this.ipsrListFilterService.updateMyInitiatives(this.dataControlSE.myInitiativesListIPSRByPortfolio)`. Do **not** change the adjacent `this.resultsListFilterSE.updateMyInitiatives(this.dataControlSE.myInitiativesList)` calls (Results module stays on the flat list, `IPF-R-10`). Before finalizing, read `ipsr-list-filter.service.ts:25-32`'s `updateMyInitiatives(initiatives)` implementation and confirm it does not throw when `initiatives` is `undefined` (possible in the error branch if the whole `forkJoin` failed before `myInitiativesListIPSRByPortfolio` was ever assigned) — `design.md` §13 flags this as unverified, not assumed safe. **Regression test (Bug Mode, mandatory):** add/extend `auth.service.spec.ts` to mock `GET_initiativesByUser()` returning a mixed `INI-*`/`SP-*` array and `GET_initiativesByUserByPortfolio()` returning an `ipsr` split containing only `SP-*` entries; assert `ipsrListFilterService.updateMyInitiatives` is called with the `ipsr`-scoped array (not the flat one) in both the success and error branches. Confirm the test is RED against pre-fix code (asserting the corrected call would fail because pre-fix code calls with the flat list) and GREEN after.
- **Implements:** `IPF-R-1`, `IPF-R-2`, `IPF-R-10`, `IPF-AC-1`, `IPF-AC-2`, `IPF-AC-4`
- **Design refs:** `design.md` §6.2 rows 1-2, §12 `IPF-DD-1`, §13 (undefined-input gap)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/api.service.ts`, `onecgiar-pr-client/src/app/shared/services/api/api.service.spec.ts`
- **Depends on:** —
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer` (client service work, Angular 21 — per root `CLAUDE.md` Skill Map); `tdd` (regression test is the primary deliverable, not an afterthought).
- **Definition of done:**
  - [x] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` commit convention.
  - [x] Lint clean (`npx ng lint --quiet` from `onecgiar-pr-client/`).
  - [x] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="api.service"` green (378/378).
  - [x] Regression test confirmed RED pre-fix / GREEN post-fix — done for both the core swap and the attempt-2 undefined-guard fix.
  - [x] `updateMyInitiatives(undefined)` confirmed non-throwing — resolved as *unreachable* (guarded at the data-assignment site with `?? []` rather than inside the consumer), per Reviewer PASS attempt 2. See `execution.md`.
  - [x] `resultsListFilterSE.updateMyInitiatives(...)` calls confirmed unchanged (byte-for-byte, Reviewer-verified both attempts).
  - [x] No secret/token leaked — n/a surface, confirmed.

### `IPF-T-2` — `innovation-package-list.component.ts`: align dependent references + manual verification [x]

**Code PASS (Reviewer, see execution.md).** Blocked from `[x]` only by the mandatory manual browser verification below (DoD items 5-6) — no automated substitute exists for `IPF-OQ-1`.

- **Type:** `client | tests`
- **Description:** In `innovation-package-list.component.ts`, change all four references from `dataControlSE.myInitiativesList` to `dataControlSE.myInitiativesListIPSRByPortfolio`: `initsSelectedJoinText` getter (~:88), `everyDeselected` getter (~:94), `deselectInits()` (~:98), `ngOnDestroy()` (~:102). Leave `checkIpsrReportingAccess()` (~:58) unchanged — it already reads the correct scoped list and is the existing precedent this task aligns the other four to. **Regression test (Bug Mode, mandatory):** extend `innovation-package-list.component.spec.ts` with a mock `DataControlService` where `myInitiativesList` and `myInitiativesListIPSRByPortfolio` hold **visibly different, distinguishable contents** (e.g. the flat list includes an extra `INI-*`-tagged entry the scoped list does not), then assert `deselectInits()`, `everyDeselected`, and `ngOnDestroy()` operate only on the scoped list's entries, and that `initsSelectedJoinText` does not include the flat-only entry. Confirm RED against pre-fix code, GREEN after. **Mandatory manual verification (`IPF-OQ-1`, no automated substitute exists per `requirements.md` §7.1):** using a real account with both legacy Initiative and Science Program CLARISA memberships (inject `token` **and** `user` in `localStorage` per client `CLAUDE.md` §9), open `/ipsr/list/innovation-list` and confirm the "Submitter(s)" chip row shows zero `INI-*` entries, then open `/result/results-outlet/results-list` and confirm its filter is unchanged (still shows Initiatives + Science Programs + "Pre-2022 results").
- **Implements:** `IPF-R-3`, `IPF-AC-1`, `IPF-AC-3`, `IPF-AC-4`
- **Design refs:** `design.md` §6.2 rows 3-6, §10 (manual/browser check), §12 `IPF-DD-1` reversion challenge
- **Files (expected):** `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.ts`, `innovation-package-list.component.spec.ts`
- **Depends on:** `IPF-T-1` (same underlying `myInitiativesListIPSRByPortfolio` field; running after confirms the upstream source is already correctly populated before verifying downstream consumers)
- **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`; `tdd`.
- **Definition of done:**
  - [x] Code merged via commit convention.
  - [x] Lint clean.
  - [x] `npx jest --silent --reporters=summary --no-coverage --testPathPattern="innovation-package-list"` green.
  - [x] Regression test confirmed RED pre-fix / GREEN post-fix.
  - [x] Manual verification against a real mixed-membership account completed and confirmed by the user (2026-08-27) — no `INI-*` entries leaked through `myInitiativesListIPSRByPortfolio`; server-side `ipsr` split confirmed Science-Program-only, so `IPF-OQ-1` resolves favorably and `IPF-DD-1` Alternative 2's fallback guard is not needed.
  - [x] Results module list (`/result/results-outlet/results-list`) confirmed unchanged during the same manual check (`IPF-AC-4`).
  - [x] No secret/token leaked.

## 3. Dependency graph

```
IPF-T-1 (api.service.ts data-source swap)
   └── IPF-T-2 (component references + manual verification)
```

Sequential, not parallel — `IPF-T-2`'s manual verification and dependent-reference alignment both assume `myInitiativesListIPSRByPortfolio` is already correctly wired into the filter by `IPF-T-1`.

## 4. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `IPF-TEST-1` | unit (Jest) | `IPF-R-1`, `IPF-R-2`, `IPF-R-10`, `IPF-AC-1`, `IPF-AC-2`, `IPF-AC-4` | `onecgiar-pr-client/src/app/shared/services/api/api.service.spec.ts` |
| `IPF-TEST-2` | unit (Jest) | `IPF-R-3`, `IPF-AC-1`, `IPF-AC-3` | `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-package-list/innovation-package-list.component.spec.ts` |
| `IPF-TEST-3` | existing suite, run unmodified | `IPF-R-10`, `IPF-AC-4` (regression guard) | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/services/results-list-filter.service.spec.ts` |
| `IPF-TEST-4` | manual/browser | `IPF-OQ-1`, `IPF-AC-1`, `IPF-AC-4` | Manual QA note in `IPF-T-2`'s DoD |

Client coverage MUST stay above 50/60/60/60.

## 5. Rollout & verification

- [ ] PR opened with commit convention.
- [ ] CI green (lint, `npx jest --silent --reporters=summary`, build).
- [ ] Manual QA on staging/test env: real mixed-membership account, both `/ipsr/list/innovation-list` and `/result/results-outlet/results-list` checked (same as `IPF-T-2`'s manual DoD item, re-confirmed on staging).
- [ ] No bilateral/platform-report impact — nothing to notify downstream.
- [ ] No admin/role/phase change — no runbook update needed.

## 6. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged and verified in staging.
- [ ] If `IPF-OQ-1`'s manual check surfaces a server-side leak, file a follow-up spec for `design.md` `IPF-DD-1` Alternative 2 (centralized guard in `updateMyInitiatives()`) — do not silently expand this spec's scope to cover it.
- [ ] Optionally file a documentation follow-up to promote "Science Program" into `docs/prd.md`/`docs/trd/trd.md` (`requirements.md` §11 Out-of-Band Notes) — not blocking.
- [ ] No `docs/prd.md` Open Questions resolved by this spec.

## 7. Roll-back plan

1. Revert the PR (single PR covers both tasks — total diff is small, ~20-40 LOC).
2. No migration to revert (client-only).
3. No feature flag involved.
4. Confirm the Innovation Packages filter returns to its pre-fix behavior (mixed INI/SP chips) by re-checking the flat `myInitiativesList` wiring is restored.
5. No downstream consumer to notify.

## Required cross-references

- `docs/specs/bugfix/ipsr-initiative-filter-removal/requirements.md`, `design.md` (same folder).
- `docs/prd.md` — `US-S2`, `US-P3`.
- `docs/ux-ui/design.md` — §6 Layout Patterns.
- `docs/trd/trd.md` — §2 Domain Modules (`ipsr`).
