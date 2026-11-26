# Archive Summary — RIR breeding exclusion, innovation packages and copy v4

**Outcome: delivered.** Reminder emails skip the 114 B4T breeding results, include innovation packages (to their Lead contact, with the P/A MELIA in copy), and use copy v4 without the breeding paragraph. All checked on prdb and in real PRTest emails; copy approved by the user.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/rir-breeding-exclusion/` |
| Archive Path | `docs/specs/archive/2026-11-26-changes--rir-breeding-exclusion/` |
| Archive Date | 2026-11-26 |
| Ticket | SR-167303 |
| Branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |
| Final Status | **Done** — validation WARN closed by the user's copy approval |

## Requirements Delivered

| ID | What | Status |
|---|---|---|
| RBX-R-1 | Exclusion list (114 `result_code`s, idempotent seed, follows the code across phases) | ✅ |
| RBX-R-2 | Innovation packages in the universe (same-year IPSR phase) | ✅ (one accepted manual gap: "no IPSR phase" checked by SQL shape only) |
| RBX-R-3 | Package row "Innovation package" + `ipsr/detail/…` link | ✅ |
| RBX-R-4 | Copy v3 with year variables | ✅ (superseded in the final state by R-8) |
| RBX-R-5 | Reversible rollout: up → down → up | ✅ |
| RBX-R-6 | Preview = dispatch counts | ✅ (131 pending; 2/7/9 + 4 unreachable) |
| RBX-R-7 | Packages to the Lead contact, MELIA in CC (Pivot P-1) | ✅ |
| RBX-R-8 | Copy v4 without the breeding paragraph (Pivot P-1) | ✅ |

## Files Changed

Server only, `onecgiar-pr-server/src/`:

| Area | Files |
|---|---|
| Selection | `repositories/pending-innovation.repository.ts` (+ spec), `entities/replicated-innovation-reminder-exclusion.entity.ts` |
| Routing / presentation | `digest-builder.ts`, `reminder-dispatcher.service.ts` (+ specs) |
| Copy and seed | `templates/rir-template-copy.ts`, `templates/rir-breeding-exclusion-codes.ts` (+ specs) |
| Migrations | `1793600000000-RIR-BreedingExclusionCopyV3.ts`, `1793700000000-RIR-CopyV4NoBreedingNote.ts` |
| Tester suite | `rir-breeding-exclusion.tester.spec.ts` (44 tests) |

## Test Evidence

- Tester suite: 44/44. Module + migrations: 328/328 tests; 1 suite fails to load (`@nestjs/jwt`), pre-existing and unrelated.
- prdb: 114 codes; `has_breeding = 0` on the 4 templates; up/down/up for both migrations.
- PRTest campaign 14: 18 sent, 4 unreachable, 0 failed; real emails read; package 8057 link opens the IPSR detail.

## Validation

WARN, no FAIL. Both WARN items closed: `design.md` amended for Pivot P-1; copy approved by the user 2026-11-26.

## Accepted Warnings / Follow-ups

| Item | Owner |
|---|---|
| DEP-2: Nicoleta reviews a campaign email of each type before she schedules the PROD send | User / Nicoleta |
| PROD rollout: staging → `master` PR; Jenkins runs both migrations; post-deploy check 114 codes and v4 bodies | Release |
| RBX-OQ-5 (116 vs 114 codes) and RBX-OQ-6 ("mid-February" vs "10 February") — defaults kept | Nicoleta |
| Copy nits accepted as is: "innovation(s)" plural, "Surname, Name" greeting, "reported in 2025" vs "in previous years" | — |
| Pre-existing `replicated-innovation-reminders.module.spec.ts` load failure (`@nestjs/jwt`) | Backlog |

## Historical Notes

- Pivot P-1 (2026-11-26) came from Nicoleta's answers to RBX-OQ-1 and RBX-OQ-4.
- Migration timestamp `1793600000000` is shared with `AddNewUsersToInnovationUseRows`; kept on purpose (TypeORM keys on name; disjoint tables).
- Roll-back order: migration `down` first, then revert the code (tasks.md §8).

## Diagrams

None; the spec has no `diagrams/` folder.
