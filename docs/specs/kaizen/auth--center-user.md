# Kaizen Entry — auth/center-user

## Document Control

| Field | Value |
|---|---|
| Spec Path | `auth/center-user` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 (deferred, manual) |
| Approval Mode | n/a — never executed |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 0 AKILI tasks PASS | `task.md` — all Phase 1 TBR |
| Reviewer FAIL rework attempts | 0 | n/a |
| HALTs / FATAL_FAILs | 0 | n/a |
| Pivots | 0 | n/a |
| Validation | n/a | never validated |

## Lessons

- **KZ-auth--center-user-1 — Defer stale module specs instead of leaving them in active taxonomy.** (Methodology, Medium)
  - Root cause: `auth/center-user` stayed `in-progress` while bilateral/cognito shipped against partial role implementation; no owner updated the spec.
  - Evidence: Phase 1 code landed (migrations, `CENTER_USER` enum) but `task.md` remained TBR; user confirmed no active work 2026-09-18.
  - Standardization: → P2 — archive deferred specs with `archive-summary.md` noting code drift vs spec.

- **KZ-auth--center-user-2 — Spec path references in sibling specs should use archive path after defer.** (Methodology, Low)
  - Root cause: `notifications/bilateral-review-decision` and others still link to `docs/specs/auth/center-user/`.
  - Standardization: → P3 — update references only when those specs are next edited; archive-summary lists dependents.

## Noted, not a lesson

- Center User role may still be required for full bilateral RBAC; defer is organizational, not a product rejection.

## Pending Standardizations (apply on `master`)

| ID | Target | Action |
|---|---|---|
| P2 | AKILI archive guide | Note "deferred with partial code" archive-summary template |
| P3 | `notifications/bilateral-review-decision/requirements.md` | Point dependency link at archive path when next touched |
