# Execution Log — `bugfix/smart-back-button`

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/smart-back-button` |
| Type | Bug |
| Depth | Lite |
| Approval Mode | gated |
| Started | 2026-09-03 |
| Leader | session (T1 orchestration) |
| Budget | 2 tasks · ~40–80 LOC · 1 review round |

## Task Execution History

### SBB-T-1 — Add failing regression for sibling-SP Back

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-09-03 |
| Attempts | 1 |
| Requirements | SBB-R-1 (sidebar hop red), SBB-R-2 (ping-pong red), SBB-R-3 (Center → SP added, already green) |
| Skills | `angular-developer`, `tdd` (as tasked; no deviation) |
| Effort | medium |

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.spec.ts` only. `smart-navigation.service.ts` untouched.
- **Implementer verification:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="smart-navigation.service.spec"` → 2 failed, 14 passed, 16 total.
  - SBB-TEST-1 FAIL: expected `Back to Science programs` / home; got `Back` / `…/entity-details/SP08`
  - SBB-TEST-2 FAIL: second resolve contained `/entity-details/SP01/overview`
  - SBB-TEST-3 PASS (recorded per DoD): Center → SP already `Back to Bilateral results`
  - 13 existing catalog / drill-down / tab / fallback examples PASS
- **Reviewer:** `STATUS: PASS` — regressions are red for the specified sibling fallthrough (`getBackTarget` generic `{ label: 'Back' }`) and the `back()` + NavigationEnd invert. SBB-TEST-3 added and recorded green. Existing examples untouched.
- **ADVISORY (reliability, not a gate):** SBB-TEST-2 reads `navigateByUrl.mock.calls[0][0]` unguarded. Do not mint a new task from this.

#### Decisions

- SBB-TEST-1 seeds `/entity-details/SP08` (not `/overview`). Reviewer accepted: still a sibling `/entity-details/` hop; produced the exact current-code destination named in `requirements.md` §12.
- SBB-TEST-3 green on current code is expected and kept as a stability guard for SBB-T-2.

#### Issues

None. No `Not Done / Assumptions` that leave scope owed.

#### Final verification

Red-on-current-code for SBB-TEST-1 and SBB-TEST-2. Production service unchanged.

### SBB-T-2 — Fix shell resolver and `back()` history

| Field | Value |
|---|---|
| Final status | PASS |
| Date | 2026-09-03 |
| Attempts | 1 |
| Requirements | SBB-R-1, SBB-R-2, SBB-R-3 (all green) |
| Skills | `angular-developer`, `tdd` (as tasked; no deviation) |
| Effort | medium |
| Continue gate | user said `continue` (gated) |

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts` only. Spec file untouched (T-1 expectations unchanged).
  - Shell branch (section 4): `isSameProgram` → `isEntityDetails` (`prev.includes('/entity-details/')`); skip all siblings, then existing catalog ladder or home.
  - `back()`: after `getBackTarget()`, `lastIndexOf` + `splice` the sanitized current URL, then `navigateByUrl`. `fallbackUrl` early return unchanged (bilateral header path).
- **Implementer verification:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="smart-navigation.service.spec"` → 16 passed, 16 total.
  - SBB-TEST-1 PASS (was FAIL)
  - SBB-TEST-2 PASS (was FAIL)
  - SBB-TEST-3 PASS
  - 13 existing catalog / drill-down / tab / fallback PASS
- **Reviewer:** `STATUS: PASS` — SBB-DD-1 and SBB-DD-2 implemented in the shell branch and `back()` only; resolve-before-splice keeps the first destination; drill-down / center / bilateral-header paths intact; T-1 assertions unmodified so the green run is a real gate.
- **ADVISORY:** none from this Reviewer.

#### Decisions

- Drop current URL via `splice` rather than ignoring NavigationEnd (both allowed by SBB-DD-2). `getBackTarget()` runs first so the first click still uses the pre-pop history.
- No band / bilateral-header change (SBB-DD-3). No stale-label escalation.

#### Issues

None. No `Not Done / Assumptions`.

#### Final verification

16/16 green on the scoped Jest file. Budget: 2 tasks, ~20 LOC in the service + T-1 tests already committed; under the ~40–80 / 2-task tripwire.

## Summary

All tasks in `bugfix/smart-back-button` are `[x]` with matching PASS evidence. Shell Back skips sibling `/entity-details/` URLs and `back()` does not restack the left page.

## Post-completion product decision (2026-09-03)

HITL after T-2: the band Back always read **Back to Science programs** and did not return Overview → Reporting (same-program tabs are `/entity-details/` and are skipped). The user asked to **remove the button** rather than restore tab-to-tab Back.

Removed from `app-reporting-program-band` (expanded + collapsed). `SmartNavigationService` and the bilateral header Back are unchanged. Scoped band Jest: 57 passed.

