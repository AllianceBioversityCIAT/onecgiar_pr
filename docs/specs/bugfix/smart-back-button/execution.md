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
