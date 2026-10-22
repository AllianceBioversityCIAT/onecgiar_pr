# Kaizen Entry — bugfix/primary-request-decision-state

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-request-decision-state` |
| Date | 2026-10-21 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 of 2 (1 code + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 0 (T-1 PASS on attempt 1) | execution.md PRDS-T-1 |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted) | — |
| Budget | 1 code task + 1 HITL, 1 review round, ~55 / ~111 / ~10 LOC vs ~60 / ~120 / ~15: within budget | execution.md PRDS-T-1 Budget check |
| Runtime issues | `npx eslint` unusable in the client (substituted `ng lint --lint-file-patterns`); T-2 step 4 unreachable | execution.md PRDS-T-1 Lint, PRDS-T-2 |

## Lessons

No new lessons. The one recurring signal (scoped client lint) is recorded as a recurrence below, not a new lesson.

## Noted, not a lesson

- **Spec scenario unreachable on the live system.** `PRDS-R-2` "SP rejected" cannot occur in the inbox because the server already hides a Rejected primary card (`PRIMARY_PREPARATION_STATUS_IDS`, `bugfix/primary-notify-on-submit-regression` PNR-DD-3/4). The specify step did not check what the server lists before writing the scenario. First occurrence in the entries checked; the cost was small (the guard is harmless and the user closed step 4 as N/A). If it recurs, a "check the server's visibility filter for each state a client scenario assumes" line fits the specify checklist.
- Three Reviewer ADVISORY items (empty SP code on a decided row, raw SP code vs `| spLabel`, duplicated chip-word ternary). The first was closed by the PRTest check on row 9861. The others are optional code follow-ups listed in the archive summary.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-1` (from `docs/specs/kaizen/bilateral--replicated-innovations-2026-pa--center-overview-w3-scope.md`; its P1 `factual-sweep` of `AGENTS.md` is still pending) |
| Edit | Recurrence +1 (`bugfix/primary-request-decision-state`, PRDS-T-1): `npx eslint <files>` cannot run in the client (ESLint 9, no `eslint.config.*`), and the spec's DoD still prescribed it. The Implementer substituted `npx ng lint --quiet --lint-file-patterns <files>`, which worked. When P1 of the earlier entry is applied to `AGENTS.md`, list this command as a working scoped alternative next to `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet`. |
| Severity | Low |
| Status | pending |
