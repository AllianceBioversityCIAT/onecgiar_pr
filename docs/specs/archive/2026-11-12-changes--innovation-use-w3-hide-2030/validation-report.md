# Validation Report — Hide the 2030 Use Projection on W3/Bilateral Innovation Use (`IWH`)

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-w3-hide-2030` |
| Ticket | INC-168060 (Nicoleta Trifa, 2026-11-11) |
| Validated at | `301963541` (qa-development-2026-ss = performance-refactor) |
| Date | 2026-11-12 |
| Auditor | Claude Code `opus` (T3). Implementer was `sonnet`, so author ≠ auditor holds |

## 1. Summary

**Verdict: PASS with 4 WARN. Archive-ready once the PRTest visual check (W-1) is done or accepted as pending.**

| Result | Count |
|---|---|
| PASS | 14 |
| WARN | 4 |
| FAIL | 0 |
| BLOCKED | 0 |

Both forms behave as specified, the payloads are untouched, and the data fix ran in PROD and PRTest. The open items are a HITL visual check and doc hygiene. None of them is a code defect.

## 2. Task Completion

| Task | Status | Evidence | Result |
|---|---|---|---|
| IWH-T-1 shared form gate | `[x]` | red run quoted, 3 falsifiers observed, Leader re-run, Reviewer PASS | PASS |
| IWH-T-2 bilateral block removed | `[x]` | red run quoted, 2 falsifiers observed, Leader re-run, Reviewer PASS (full) | PASS |
| IWH-T-3 data fix (user-run) | `[x]` | PROD 1+1 rows (32686, 32740), PRTest 148 rows + 12071, `still_null = 0`, disqualifier not triggered | PASS |

## 3. File Existence

| File (design §5) | Expected | Found in `301963541` | Result |
|---|---|---|---|
| `innovation-use-form.component.ts` | getter `hides2030Projection` | yes | PASS |
| `innovation-use-form.component.html` | `@if (!hides2030Projection)` around the 2030 block | yes, opens before the `2030-to-be-determined` radio, closes right before `<!-- Estimates CGIAR Component -->` | PASS |
| `type-innovation-use.component.html` | P2-3428 block deleted + INC-168060 comment | yes (`.html:292`) | PASS |
| `type-innovation-use.component.ts` | `hasActorMissingType` current-use only | yes | PASS |
| Both folder `CLAUDE.md` | gate line / P2-3428 marked removed / `Verified:` re-stamp | yes | PASS |

Line numbers moved since design (`3e54aa295`: `:449-794` → now `:469-836`) because the later IUY commit added lines above. The boundaries are the same elements.

## 4. Build Integrity

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc -p tsconfig.app.json --noEmit` (run by auditor) | exit 0, no output → PASS |
| Jest (related) | `npx jest --findRelatedTests` on 6 files, `--maxWorkers=2` (pre-commit gate, same code tree as `301963541`) | 27/27 suites, 1420/1420 tests → PASS |
| Lint | `ESLINT_USE_FLAT_CONFIG=false npx eslint` on 4 touched `.ts` | clean → PASS |
| Environment boot | not run (template-only change; PRTest check covers runtime) | n/a |

## 5. Requirement Coverage

Scenario and clause level.

| Clause | Owner | Code evidence | Test evidence | Result |
|---|---|---|---|---|
| R-1 W3 → THEN block not rendered | T-1 | `@if (!hides2030Projection)` | T-1 test 1 (red run observed) | PASS |
| R-1 AND current use unchanged | T-1 | wrap starts after `app-studies-link`; nothing above touched | 24-27 related suites green | PASS |
| R-1 BUT payload unchanged | T-1 | getter is display-only; no `body` write | T-1 test 5 | PASS |
| R-1 AND IT MUST show while `source_name` unknown | T-1 | optional chain → `undefined !== 'W3/Bilaterals'` → shown | T-1 test 4; falsifier `return true` → red | PASS |
| R-1 W1/W2 → rendered as today | T-1 | — | T-1 test 2 | PASS |
| R-1 IPSR → rendered as today | T-1 | outer `@if (isP25() && !isIpsr)` (`.html:399`) already excludes IPSR; getter adds `!isIpsr` | T-1 test 3 at getter level (deviation documented in `execution.md`) | PASS |
| R-2 THEN block not rendered | T-2 | markup deleted | T-2 test 1 | PASS |
| R-2 AND current use, readiness, P2-3424 unchanged | T-2 | readiness `:216-287`, P2-3424 `:294` intact | T-2 test 4 + P2-3424 tests | PASS |
| R-2 BUT stored 2030 sent as loaded | T-2 | `buildPayload` `.ts:841-847` unchanged | T-2 test 3 | PASS |
| N-1 no migration/endpoint/token | T-1, T-2 | client-only diff | — | PASS |
| N-2 scoped tests, 2 workers | T-1, T-2 | commands in `execution.md` | — | PASS |

No `test-report.md` exists. Coverage was checked against the task tests in `execution.md`. That is enough for a Lite spec (see W-4).

## 6. Linting & Code Quality

Spec violations: none.

**4R advisory findings** (do not change the verdict):

| # | Lens | Finding |
|---|---|---|
| A-1 | readability | `readonly projection2030Copy` (`type-innovation-use.component.ts:118`) is no longer used by the template. Kept by scope. Candidate for removal in a later cleanup. |
| A-2 | risk (low) | A typeless 2030 actor can now reach the server instead of being blocked client-side. The writer matches by `actor_type_id IsNull` per section. This was already the behaviour before; worth a one-line server check that section 2 and section 1 typeless rows cannot collide. |
| A-3 | readability | The wrapped shared-form lines were not re-indented (minimal diff on purpose). |
| A-4 | process | LOC budget overrun (≈265 changed vs ~120), driven by ~86 lines of deleted markup the spec mandated. Net added ≈150. Flagged at the gate. |

## 7. Design Conformance

| Item | Result | Note |
|---|---|---|
| DD-1 gate on `source_name` | PASS | reuses `W3_BILATERALS_SOURCE_NAME` and the existing signal |
| DD-2 delete bilateral markup | PASS | `showProjection2030Lists`, `projection2030`, `addProjection2030*` kept as listed |
| DD-3 payloads unchanged | PASS | both forms, tested |
| DD-4 data fix, not function change | PASS | `validation_innovation_use_P25` untouched |
| P-10 (NULL is the only cause) | Falsified, documented | 32686 and 32740 still red because of empty Estimates budget rows (SP12 + 3 institutions; SP02). User-fillable, not IWH. Recorded in `execution.md` |
| Cross-document figures | WARN (W-3) | see below |

**Cross-document figure check:**
- P-8 "3 prod rows" vs T-3 "2 rows": consistent. The 2026 scope excludes the 2025 row 29318.
- T-3 "149 PRTest rows" vs execution "148 + 12071": consistent.
- `requirements.md` §3 and §7 still refer to an **IWH-T-0** data query with a Pivot when rows > 0. No T-0 exists: the check was done during specify (P-8) and became T-3. This is a stale reference (W-3).

## 8. Design Review (UI)

| Field | Value |
|---|---|
| Change type | block removal only (`Design route: none`), no new UI |
| Impeccable / detector | not run: no new screen or component to critique |
| Visual evidence | PROD view of 25962 and PRTest view of 9603 (before/after the T-3 data fix), in `execution.md`. **No view yet of the new build** |
| Gate | WARN (W-1): an empty gap or orphan divider where the block was can only be seen in the browser |

## 9. Test Evidence Summary

| Suite | Result |
|---|---|
| `innovation-use-form.component.spec.ts` (`IWH — 2030 block by source`, 5 tests) | green |
| `type-innovation-use.component.spec.ts` (absence test, `hasActorMissingType` inverse, `buildPayload`) | green |
| Related consumers (zoneless, step-n1, innovation-use-info, fields-manager) | green inside the 27 suites |
| Falsifier mutations | 5 observed red, all reverted |
| Cypress | not applicable (no Cypress consumer) |

## 10. Agent Guide / Constitution Impact

No `## Constitution Impact` in `execution.md`: no module, boundary or public surface changed. Both folder `CLAUDE.md` files were updated and re-stamped. Nothing pending for archive beyond the usual CodeGraph sync.

## 11. Remediation

| ID | Level | Item | Owner | Blocks archive? |
|---|---|---|---|---|
| W-1 | WARN | PRTest visual check after the `301963541` deploy: result 5093 (W1/W2) still shows the 2030 block; one bilateral IU under "Complete full metadata" shows no 2030 block and no empty gap | Santiago / Leader (view-only browser check) | No, if accepted as pending |
| W-2 | WARN | Q-1: tell the P2-3428 requester that the bilateral block was removed per INC-168060 | Santiago | No |
| W-3 | WARN | `requirements.md` §3/§7 mention IWH-T-0. Reword to "data check (P-8) → IWH-T-3" | archive step — applied 2026-11-12 | No |
| W-4 | WARN | No `test-report.md`. Task-level tests + falsifiers cover every clause. `/akili-test` is optional for this Lite spec | — | No |
| — | data | Submitters of 32686 (SP12 + 3 institutions) and 32740 (SP02) fill Investment amounts to turn the section green | Nicoleta / submitters | No |

## 12. Archive Readiness Recommendation

**Ready to archive.** All tasks `[x]`, 0 FAIL, the 4 WARN have owners and none is a code defect. Do W-1 before or right after archiving; W-3 can be applied during archive.

```text
/akili-archive changes/innovation-use-w3-hide-2030
```
