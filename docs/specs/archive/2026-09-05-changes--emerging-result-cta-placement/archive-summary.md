# Archive Summary — Persistent emerging-result CTA that opens the Reporting aside

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/emerging-result-cta-placement` |
| Archive Date | 2026-09-05 |
| Branch | `qa-development-2026` |
| Commit | `b1ca9ef1f` |
| Archive Run | 1 |

## 2. Original Spec Path

`docs/specs/changes/emerging-result-cta-placement/`

## 3. Final Status

**Shipped** — all five tasks PASS; scoped Jest 484/484 green on the ERC pattern. Manual HITL (`ERC-TEST-7`, collapsed band at 375px / ≥900px) deferred to owner QA.

## 4. Requirements Delivered

| ID | Outcome |
|---|---|
| `ERC-R-1` | Outline **Report emerging result** on band (expanded + collapsed) when `canReportEmerging` is true; hosts on Overview, Reporting, Results, My work |
| `ERC-R-2` | Split emits: *Where to report* ≠ emerging; emerging opens aside without hub prerequisite |
| `ERC-R-3` | Hub card + band open emerging aside (`emergingMode`, Output/Outcome chooser); legacy modal not used from hub/band |
| `ERC-R-4` | Hop from Results / My work with `rememberResultDetailOrigin()` before navigate; cancel restores `returnTab`; create does not overwrite origin |
| `ERC-R-5` | `canReportEmerging` defaults `false`; AVISA / no programme → CTA absent |
| `ERC-R-6` | Planned row Report stays non-emerging with indicator context |
| `ERC-R-7` | Shell phase only; no second phase picker; no ToC indicator id on emerging payload |
| `ERC-R-10` | Hop degradation documented (not in-place drawer on Results / My work) |
| `ERC-R-11` | Tab order Tour → Emerging → Where to report |
| `ERC-R-12` | Escape + dirty-confirm reused in emerging drawer |
| `ERC-R-20` | Collapsed label may shorten; accessible name stays full |
| `ERC-AC-1`…`AC-9` | Covered by scoped unit tests per `tasks.md` §5 |

## 5. Files Changed Summary

From `execution.md` and commit `b1ca9ef1f` (37 files, +4094 / −242):

| Area | Files |
|---|---|
| Spec triplet + judgment + execution | `docs/specs/changes/emerging-result-cta-placement/*` |
| Band | `reporting-program-band.component.{ts,html,spec.ts}` |
| Form | `lab-report-form.component.{ts,html,spec.ts}`, `CLAUDE.md` |
| Drawer | `indicator-drawer.component.{ts,html,spec.ts}`, `CLAUDE.md` |
| Host | `dashboard-lab.component.{ts,html}`, `dashboard-lab.hub.spec.ts`, `CLAUDE.md` |
| Results / My work | `programme-results.component.{ts,html,spec.ts}`, `my-work-board.component.{ts,html,spec.ts}` |
| Modal host | `where-to-report-modal/*` (new) |
| Lock | `innovation-link-surfaces.spec.ts` |
| Design | `docs/ux-ui/design.md` (RFUX patterns, same branch) |

## 6. Test Evidence Summary

| Suite | Result |
|---|---|
| Scoped ERC pattern (7 files) | **484 passed / 484 total** |
| `reporting-program-band.component.spec` | 93 / 93 |
| `lab-report-form.component.spec` | 56 / 56 (7 red before green on T-2) |
| `indicator-drawer.component.spec` | 72 / 72 |
| `dashboard-lab.hub.spec` | 54 / 54 |
| `programme-results.component.spec` | 108 / 108 |
| `my-work-board.component.spec` | 69 / 69 |
| `innovation-link-surfaces.spec` | 4 / 4 |

No `test-report.md` or `validation-report.md` — absence accepted; evidence lives in `execution.md` and scoped Jest runs.

## 7. Validation Summary

- **Judgment Day round 1:** FAIL (4 confirmed severe C1–C4); owner fix-only, re-judge skipped; design patched before execute.
- **`/akili-validate`:** not run as a separate artifact.
- **Unresolved FAIL:** none post-execute.

## 8. Accepted Warnings Or Follow-Ups

| Item | Owner |
|---|---|
| `ERC-TEST-7` HITL — collapsed band overflow / contrast at 375px and ≥900px | Manual QA |
| Full four-tab manual QA (hub, AVISA, planned Report, hop cancel, Smart Back with query) | Manual QA |
| Optional: promote three-button band cluster to `docs/ux-ui/design.md` §12 | Design backlog |
| Server-side AVISA refuse (Judgment Day J2-S3 suspect) | Out of scope |
| `docs/specs/changes/report-result-form-ux/` still untracked on branch | Parallel spec |

## 9. Historical Notes

- T-1/T-2 executed via AKILI subagents (Sonnet implementer, Opus reviewer); T-3–T-5 completed inline on Grok after owner blocked subagent usage.
- Concurrent `changes/report-result-form-ux` edits landed in the same commit on `lab-report-form` / `indicator-drawer`.
- P2-3569 lock retargeted from dead `app-report-result-form` host to live `lab-report-form.showsInnovationLink`.
- Legacy `showReportModal` / `app-report-result-form` remain in tree but hub and band no longer open them for emerging.
