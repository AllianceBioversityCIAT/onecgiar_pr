# Kaizen Entry — notifications/bilateral-primary-sp-request

## Document Control

| Field | Value |
|---|---|
| Spec Path | `notifications/bilateral-primary-sp-request` |
| Date | 2026-11-13 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 11 | tasks.md |
| Reviewer FAIL rework attempts | 11 (T-1, T-2, T-3, T-4, T-5, T-7, T-8, T-9, T-10 once each; T-6 twice) | execution.md §2, §3 |
| HALTs / FATAL_FAILs | 1 budget tripwire (about 3.5x LOC, about 20 review rounds); the user chose "Continue to the end" | execution.md Budget Tripwire |
| Pivots | 1 (PSR-T-6 / DD-9, approval-time release) | execution.md Pivot Record |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Judgment-day severe findings | none recorded | — |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 3 found by the user after a Reviewer PASS: migration `down` table name; `DrawerHeaderParts` TS2339; Nest boot crash #2. A 4th (boot DI forwardRef) was found by a Leader check | execution.md T-1 attempt 1, "Post-T-8 compile defect", "Boot crash #2", T-3 follow-up |

## Lessons

- **KZ-notifications--bilateral-primary-sp-request-1 — A migration `down` copied from an exemplar kept the exemplar's wrong table name, and a mocked QueryRunner test could not see it.** (Product + Methodology, High)
  - Root cause: PSR-T-1's `down` used `` `notification` `` where the table is `notifications` (`@Entity('notifications')`). The Implementer copied it from `1787520000000-SeedContributionDecisionNotificationTypes.ts`, whose own `down` had the same bug. The Reviewer wrote that the exemplar used the same names and passed it. Only the user's real `migration:revert` failed (`ER_NO_SUCH_TABLE`). Two older migrations had the same bug and were fixed out of spec.
  - Evidence: execution.md "User DB verification of attempt 1" (Falsifier 2 FAIL) and "Out-of-spec fix".
  - Standardization: → P1

- **KZ-notifications--bilateral-primary-sp-request-2 — A new constructor dependency passed every unit test and crashed the Nest boot twice, because specs mock providers and cannot see module-level resolution.** (Product + Methodology, High)
  - Root cause: `PrimaryProgramRequestService` params resolved to `undefined` through an import cycle (`NotificationService`), and `ResultsTocResultsModule` and `ResultsPackageTocResultModule` re-provide `ShareResultRequestService` locally, so the new required param had no provider there. The Leader's metadata check verified param types, not per-module resolution. Only a real Nest bootstrap catches this. The user hit it on `start:dev`.
  - Evidence: execution.md "PSR-T-3 follow-up (post-T-6)" and "Boot crash #2".
  - Standardization: → P2

## Noted, not a lesson

- Several FAILs were "a test that can't fail" (T-2 round tests, T-6 release criteria, T-7 duplicate exclusion, T-4 visibility with a mock that ignores `where`). This is the existing vacuous-test family, recorded as P3.
- `DrawerHeaderParts` TS2339 (Jest and `tsc` do not type-check templates) repeats `KZ-bugfix--lead-center-full-catalog-1`. Recorded as P4.
- Folder `CLAUDE.md` rule was applied correctly in this spec (docs-only rework in T-10 attempt 2).
- The Leader ran Opus 5.5 with Implementer and Reviewer wrappers as registered.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification guidance for `db` tasks) |
| Edit | Add: "A migration task's `up` AND `down` must check every table and column name against the entity decorators (`@Entity`, `@Column`), never against an exemplar migration. When the task copies an exemplar, audit the exemplar's `down` too. A mocked QueryRunner test cannot prove a table name: run `migration:revert` then `migration:run` on a disposable DB." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification guidance for `server` tasks) |
| Edit | Add: "A server task that adds a constructor dependency must (a) grep `*.module.ts` for modules that re-provide the service (`grep -rn \"^\\s+<Service>,$\" --include=*.module.ts`) and (b) run a real Nest bootstrap, or a `Test.createTestingModule` over the real modules, before PASS. Unit specs with mocks cannot see DI resolution or import cycles." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bilateral--review-drawer-readonly-rendering-1 |
| Edit | Add `notifications/bilateral-primary-sp-request` as a source (recurrence, 4+ Reviewer FAILs): tests that mock a repository or ignore `where` cannot fail when the criteria, filter or exclusion is removed (T-4 visibility, T-6 `releaseContributors` find criteria, T-7 duplicate exclusion). Extend the lesson to "assert the criteria / filter value, or make the mock honour it". |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | KZ-bugfix--lead-center-full-catalog-1 |
| Edit | Add `notifications/bilateral-primary-sp-request` as a source (recurrence): T-8's template read two fields missing from a local interface, Jest and `tsc --noEmit` stayed green (306 specs), and the user hit TS2339 in `ng serve`. T-10 then added `ng build --configuration development` to its verification. |
| Severity | High |
| Status | pending |
