# Archive Summary — `changes/kp-cgspace-browse`

## 1. Document Control
| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/kp-cgspace-browse/` |
| Archive path | `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/` |
| Archive date | 2026-08-27 |
| Branch | `qa-development-2026` (spec branch — shared-file syncs recorded as pending items) |
| Final status | **Shipped to branch** — 9/9 tasks `[x]`; scoped tests green; Judgment Day round 1 fixed; validation-report absent (accepted: Reviewer audits + user HITL) |
| Commits | `d0015ca19` (implementation, concurrent session) · `1f6c036f1` (fixes + spec docs) |

## 2. Requirements delivered
KPB-R-1..R-13, R-20..R-22, R-30 — all with automated evidence except visual/a11y-keyboard (HITL, user-declared). See `test-report.md` §7.

## 3. Files changed (from execution.md)
- Server: `api/results/results-knowledge-products/cgspace-discovery/{service,mapper,dto/*,fixtures/*}`, controller (+2 routes, Swagger), module providers, controller spec (supertest), `serverless.yaml`, `README.md`, `docs/infrastructure.md`.
- Client: `aow-hlo-table-create-modal/components/kp-cgspace-browse/*`, modal `{html,ts,spec}` + snapshot, `results-api.service.ts`, `tests/mocks/spartanBrainMock.{ts,spec.ts}`.
- Out of spec (same commits, user-accepted): `api/feedback/*`, `sync-button`, `dashboard-lab`, `section-bottom-bar`, `results-knowledge-products.service.ts`.

## 4. Test evidence
Server 4 suites / 56 tests · Client 3 suites / 62 tests / 1 snapshot (all path-scoped; full suites delegated to CI by user rule). Details in `test-report.md`.

## 5. Validation
No `validation-report.md`. Substitutes: Judgment Day (`judgment.md`, 3 confirmed severe fixed), Reviewer PASS on T-1..T-4, client round-1 findings all addressed, user HITL "funcionando bien".

## 6. Accepted warnings / follow-ups
| Item | Route |
|---|---|
| `kp-cgspace-browse.component.scss` (`::ng-deep !important` on `app-pr-select`) — `KPB-DD-8` | Follow-up: add width inputs to `app-pr-select`, delete SCSS |
| Reviewer re-audit of client attempt 2 waived | Accepted risk |
| HITL items not individually evidenced (DB parity, dead host, keyboard, screenshot, MQAP `10947`) | PR reviewer |
| `spartanBrainMock.ts:168` pre-existing lint error | Unrelated |
| Browse tab on other KP surfaces; MELSpace/WorldFish | Future proposals |
| `CGSPACE_DISCOVERY_URL` must be set in every Lambda env (no fallback) | Ops before deploy |

## 7. Historical notes
- Two sessions worked the same checkout concurrently (protocol violation); resolved by auditing the foreign implementation as attempt 1.
- Subagent sessions hit the account weekly usage limit mid-run; remaining fixes applied by the Leader inline with user approval.
- Proposal → spec drift: endpoint path, PrimeNG→Spartan tabs, Year default→hard constraint (server 422).
