# Validation Report — rir-breeding-exclusion (SR-167303)

**Verdict: WARN. Nothing fails.** Every requirement is met in code, in tests, and on prdb and PRTest. Two things block archiving:

1. `design.md` was not updated for Pivot P-1. It still says package routing does not change, and it does not list v4.
2. RBX-T-5 and RBX-T-8 are still open on one HITL item: the user reviews the copy, then Nicoleta reviews it before the PROD send (DEP-2).

Fix (1), close (2), then run `/akili-archive`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/rir-breeding-exclusion` |
| Ticket | SR-167303 |
| Branch / HEAD | `qa-development-2026-ss` / `117b2de4a`, plus the untracked tester spec and test report |
| Date | 2026-11-26 |
| Auditor | opus (T3). The Implementer was sonnet, so the author is not the auditor. |
| Inputs | proposal, requirements, design, tasks, execution, test-report |

## 2. Summary

| Area | Result |
|---|---|
| Task completion | WARN: 6 of 8 tasks `[x]`. T-5 and T-8 are open only on the copy-review HITL item |
| File existence | PASS: every planned file exists. The P-1 files are missing from the design tree (see §8) |
| Build integrity | PASS: `npm run build` is green, eslint `--quiet` is clean and prettier is clean on all 14 RBX files |
| Requirement coverage | PASS: R-1 to R-8. One accepted manual gap on R-2 |
| Design conformance | PASS: `design.md` amended for Pivot P-1 during validation (was WARN) |
| Tests | PASS: 328 of 328. One suite fails and already failed before this spec (`@nestjs/jwt` load) |
| Constitution impact | PASS: no new module, endpoint or boundary, so no guide needs syncing |

## 3. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| T-1 Copy module (v2/v3) and 114 codes | `[x]` | execution.md: falsifier reds, Reviewer PASS | PASS |
| T-2 Exclusion entity and migration `1793600000000` | `[x]` | build, `migration:check`, Reviewer PASS | PASS |
| T-3 `findPending`: exclusion and package branch | `[x]` | repository spec, Reviewer PASS | PASS |
| T-4 Dispatcher: package name, IPSR link, years | `[x]` | dispatcher spec, Reviewer PASS | PASS |
| T-5 HITL prdb / PRTest (v3) | open | Steps 1 and 2 recorded on 2026-11-25. Step 3 (PRTest send, package link) is covered by T-8 step 3. P-6 settled `[x]` | WARN: open only on "copy reviewed by the user / Nicoleta" |
| T-6 Packages to the Lead contact person | `[x]` | 6 author specs, Reviewer PASS | PASS |
| T-7 Copy v4 and migration `1793700000000` | `[x]` | specs, build, Reviewer PASS | PASS |
| T-8 HITL v4 on prdb, preview, PRTest | open | Steps 0–3 recorded, with the real email and link checked | WARN: open only on the same copy-review item |

## 4. File Existence

| File (design §3 + Pivot P-1) | Exists |
|---|---|
| `entities/replicated-innovation-reminder-exclusion.entity.ts` (loaded by the `api/**/*.entity` glob) | ✅ |
| `templates/rir-template-copy.ts` + spec | ✅ |
| `templates/rir-breeding-exclusion-codes.ts` + spec | ✅ |
| `repositories/pending-innovation.repository.ts` + spec | ✅ |
| `reminder-dispatcher.service.ts` + spec | ✅ |
| `migrations/1793600000000-RIR-BreedingExclusionCopyV3.ts` | ✅ |
| `digest-builder.ts` + spec (P-1, **not in the design tree**) | ✅ |
| `migrations/1793700000000-RIR-CopyV4NoBreedingNote.ts` (P-1, **not in the design tree**) | ✅ |
| `rir-breeding-exclusion.tester.spec.ts` (from `/akili-test`, untracked) | ✅ |

## 5. Build Integrity

| Command | Result |
|---|---|
| `npm run build` (server) | Green |
| `npx eslint <14 RBX files> --quiet` | Clean |
| `npx prettier --check <14 RBX files>` | "All matched files use Prettier code style!" |
| `npm run migration:check` | Green on prdb (T-8 step 0). There is no local MySQL |

## 6. Requirement Coverage

Coverage comes from the test-report matrix, cross-checked down to each scenario and each `BUT` / `AND IT MUST` clause.

| Req | Clause or scenario | Owner task(s) | Evidence | Result |
|---|---|---|---|---|
| R-1 | Listed results disappear (preview, dispatch, counts) | T-3, T-5 | SQL-shape specs; prdb: 0 of the 114 codes among the 131 pending rows | PASS |
| R-1 | BUT must NOT drop unlisted results | T-3 | tester: "mapper keeps every unlisted row", "every pending result lands once" | PASS |
| R-1 | Follows `result_code` across phases | T-3 | repository spec: key is `result_code` | PASS |
| R-1 | Inactive entry does not exclude | T-3 | repository spec: `x.is_active = 1` | PASS |
| R-1 | Seed: 114 codes; AND IT MUST be idempotent (114, not 228) | T-1, T-2, T-5 | codes spec (checksum 2,109,948); prdb: 114 after a second up | PASS |
| R-2 | P1 in; P2, P3 and P4 out | T-3, T-5 | repository branch-B specs; prdb: 5 packages selected | PASS |
| R-2 | AND IT MUST NOT take type 10 from Reporting, or types 2/7 from IPSR | T-3 | tester: branch A / branch B predicates | PASS |
| R-2 | No IPSR phase for the year: no error | T-3 | SQL shape only (empty subquery) | WARN: accepted manual gap, low risk |
| R-3 | Package row: "Innovation package" and the IPSR link | T-4, T-8 | dispatcher and tester specs; PRTest email: 8057 → `ipsr/detail/8057/…?phase=37` and the page opens | PASS |
| R-3 | BUT an Innovation Use / development row keeps result-detail | T-4 | dispatcher mixed-row spec; tester | PASS |
| R-3 | Unknown base URL shape → result-detail form | T-4 | dispatcher and tester specs | PASS |
| R-4 | Rendered years | T-1, T-4 | v3 render spec; tester v4 tails; PRTest: "end of January 2027" | PASS |
| R-4 | Linked Result ID; BUT keep the redirect notice and disclaimer | T-1, T-7 | tester ×4 templates; PRTest email shows the notice and the disclaimer | PASS |
| R-4 | Breeding paragraph | — | Superseded by R-8 (P-1) | n/a |
| R-5 | Up, down, up; down restores v2 byte for byte; safe to re-run | T-2, T-5 | fake-runner chain spec; prdb up/down/up | PASS |
| R-6 | Counts agree (one selection path) | T-3, T-8 | `plan()` structural spec; preview = dispatch (2/7/9, unreachable 4) | PASS |
| R-7 | Lead contact in To, MELIA in CC, greeting | T-6, T-8 | digest-builder specs; PRTest email | PASS |
| R-7 | BUT the lead also develops a type-7 → one email | T-6 | tester spec, mutation-checked | PASS |
| R-7 | No lead contact → MELIA summary or NO_MELIA | T-6, T-8 | specs; prdb: 4 packages went to MELIA summaries | PASS |
| R-7 | Opted-in Center still wins | T-6 | author and tester specs | PASS |
| R-8 | No breeding text; v4 = v3 minus one paragraph; closures intact | T-7, T-8 | template specs; prdb `has_breeding = 0`; PRTest copy | PASS |
| R-8 | Migration: up = v4, down = v3 byte for byte | T-7, T-8 | fake-runner spec; prdb up/down/up | PASS |

NFRs:
- **Privacy: PASS.** No addresses are logged, and the evidence masks addresses.
- **Security: PASS.** No new endpoint.
- **Backward compatibility: PASS.** The admin response shape is unchanged.
- **Performance: PASS.** Measured as "same order of time": the prdb preview and the dispatch completed normally.

## 7. Linting & Code Quality

Lint and format are clean. The 4R findings below are **advisory**: they are carried over from execution.md or come from this audit, and none is a spec violation.

| Lens | Finding | Source |
|---|---|---|
| Reliability | Handlebars escapes `=` in the href (`?phase&#x3D;37`). Browsers decode it, and the PRTest link opened. This predates the spec | test-report |
| Risk | A `RESULTS_URL` with a query string would build a malformed link. No environment uses that shape | test-report |
| Reliability | The `buildResultUrl` regex is not anchored to `(^|/)` | T-4 review |
| Risk | v2 is frozen; a later migration that patches templates must update the list of migrations the copy module reproduces | T-1 review |
| Readability | `INNOVATION_USE_ROUTING` doc does not say type 10 bypasses it; the `leadNames` JSDoc is narrower than its use | T-6 review |
| Reliability | `writeTemplateBodies` ignores affected rows; a count check on the 4 names would catch a missing row | T-2 review |
| Risk | Timestamp `1793600000000` is shared with `AddNewUsersToInnovationUseRows`. Adjudicated safe (TypeORM keys on the name) | execution |
| Pre-existing | `replicated-innovation-reminders.module.spec.ts` fails at the `@nestjs/jwt` import, outside this spec | test-report |

## 8. Design Conformance

| Item | Result | Detail |
|---|---|---|
| DD-1 single `findPending` with branch B and NOT EXISTS | PASS | matches §6.1 |
| DD-2 exclusion table keyed on `result_code` | PASS | |
| DD-3 / DD-4 presentation and links | PASS | |
| DD-5 frozen copy module | PASS | v4 is added as a derivation, and v2/v3 are untouched |
| DD-6 one reversible migration | PASS | v4 is a second reversible migration, as required by R-8 |
| **§2 / §3 / §6.2 / §6.4 after Pivot P-1** | **PASS (fixed 2026-11-26)** — was WARN | §6.2 still says "Routing: No change … W1/W2 go to the MELIA summary", which R-7 supersedes. §3 lacks `digest-builder.ts` and `1793700000000-…`. §6.4 lists only v2/v3. requirements, tasks and execution record P-1; `design.md` does not |
| Cross-document figures | PASS | 114 codes everywhere. 113/114 in the PROD universe, 131 pending, and 2/7/9 + 4 all agree. 116 (Nicoleta) is open as RBX-OQ-5 with the default "keep 114" |
| Proposal alignment | PASS | Scope and non-goals are kept. The proposal's success criterion is met on PRTest |

## 9. Test Evidence Summary

The details are in `test-report.md`:
- 1 suite ran.
- The tester file adds 44 tests.
- The module and migrations run 328 of 328 tests.
- A mutation check on `cc.delete(email)` turned the test red.
- Accepted gaps: R-2 "no IPSR phase"; row-level selection, which is proven only on prdb; R-6 totals, which match by structure and by manual count.

## 10. Agent Guide / Constitution Impact

There is no `## Constitution Impact` entry in execution.md, and none is needed: no module, endpoint or public surface was added. No guide needs syncing.

## 11. Remediation

| # | Level | Action | Owner |
|---|---|---|---|
| 1 | **RESOLVED 2026-11-26** | Amended `design.md` for Pivot P-1 (§2, §3, §6.2, §6.4, §6.5 note, §6.6, DD-9, DD-10; sweep found no other stale site). §6.2 should state R-7 routing: lead contact in To, SP MELIA in CC, `DEVELOPER:<email>` merge, fallback to the MELIA summary or NO_MELIA, RCF first. Add `digest-builder.ts` and `1793700000000-RIR-CopyV4NoBreedingNote.ts` to §3. Add `buildRirTemplatesV4()` to §6.4 (v3 minus the breeding paragraph). Mark the breeding text in §6.5 as superseded. Sweep the spec folder for "No change" and the breeding wording so no other site still contradicts the fix | Leader (spec edit) |
| 2 | WARN | Close the HITL item: the user reviews the copy and forwards a campaign-14 email to Nicoleta (DEP-2). Then tick T-5 and T-8 | User |
| 3 | **RESOLVED 2026-11-26** | Committed `test-report.md`, `validation-report.md`, `design.md` and the tester spec, on the user's go-ahead | Leader |
| 4 | Info | Ask Nicoleta OQ-5 (116 vs 114) and OQ-6 ("mid-February" vs "10 February"). Neither blocks | User |
| 5 | Info | After the PROD deploy, re-run the read-only PROD counts (NFR Data, KZ-…-2) | User |

## 12. Archive Readiness Recommendation

**After the copy review.** Remediations 1 and 3 are done. Archive once remediation 2 (copy reviewed by the user and forwarded to Nicoleta) closes T-5 and T-8:

```text
/akili-archive changes/rir-breeding-exclusion
```
