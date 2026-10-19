# Archive Summary — SP Overview: Total General reconciles + drill-down

**Outcome:** delivered. The Total General headline now equals its three rows, a composition bar shows their shares, and every row/segment opens the list behind its number. The Results tab gained a Replication filter. 5/5 tasks PASS; live parity confirmed on SP05.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/sp-overview-total-drilldown/` |
| Archive Date | 2026-10-15 |
| Branch | `qa-development-2026-ss` (spec branch — shared-file syncs recorded as pending) |
| Final Status | **Complete** — all tasks `[x]`; not yet committed at archive time |
| Approval Mode | gated |

## Requirements Delivered

| Req | What | Evidence |
|---|---|---|
| STD-R-1 | Headline = replicated + new + pending review (status 5), program-wide; tooltip names the three parts | T-2, T-3 Jest; T-5 live 9 = 1 + 6 + 2 |
| STD-R-2 | Composition bar (plain DOM, TS widths, 6px min, zero dropped, skeleton, empty track, dot legend) | T-2 Jest; T-5 rendered widths, 6.9px tiny probe, contrast |
| STD-R-3 | Rows + segments navigate (Results / Bilateral review), no `section` stamping, no section toggle | T-2 emits, T-3 navigation specs; T-5 live URLs |
| STD-R-4 | Results tab Replication filter (control, chips, `?replication=`, whitelist, clear) | T-1 Jest 476/476 |
| STD-R-5 | Count parity | T-5: 1 = 1, 6 = 6, 2 = 2 |

## Files Changed Summary

| Area (`onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/`) | Files |
|---|---|
| `programme-results/` | `services/programme-results-query-params.ts`, `services/programme-results-filter.service.ts` (+spec), `programme-results.component.{ts,html}` (+spec), `CLAUDE.md` |
| `dashboard-lab/components/program-overview/` | `program-overview.component.{ts,html}` (+spec), `CLAUDE.md` |
| `dashboard-lab/` | `dashboard-lab.component.{ts,html}` (+spec), `CLAUDE.md` |

Size: ≈ +480 / −60 lines across 15 files (budget ~350 — overrun accepted by the user, mostly tests).

## Test Evidence Summary

| Task | Command (scoped, `--maxWorkers=2`) | Result |
|---|---|---|
| T-1 | `--testPathPattern="programme-results\|my-work-board"` | 12/12 suites · 476/476 |
| T-2 | `--testPathPattern="program-overview.component.spec"` | 82/82 |
| T-3 | `--testPathPattern="dashboard-lab.component.spec"` | 86/86 (red run shown) |

No `test-report.md` (`/akili-test` not run) — absence accepted; per-task Jest evidence above.

## Validation Summary

No `validation-report.md` (`/akili-validate` not run) — absence accepted. T-5 HITL live check served as validation and was signed off by the user: parity on all three rows, contrast ≥ 3:1 vs both gradient ends, tiny segment ≥ 6px, focus ring visible (incl. single segment), no overflow at 320px card width.

## Accepted Warnings Or Follow-Ups

| # | Item | Owner / next step |
|---|---|---|
| 1 | Cyan-300 vs amber-300 = 1:1 luminance — accepted (2px gap, distinct hue, labelled rows); design §8.2 corrected | Accepted |
| 2 | Row click no longer switches section (SR-164368 reverted); section control lives in the Filter popover | Tell Nicoleta in the handoff |
| 3 | Advisories: T-1 S-4.3 test with a real unknown value; T-1 S-4.4 explicit count; T-2 one aria-label map; T-2 `-bar` exclusion tighter; T-3 no-initiative-code spec | Optional test tightening, not scheduled |
| 4 | True ~360px viewport screenshot not taken (window resize unavailable) | Accepted (320px card probe instead) |
| 5 | Commit pending — T-2 must ship with T-4's guides | User |
| 6 | CodeGraph re-index | User (`codegraph sync`) |

## Historical Notes

- Supersedes `STG-R-2` of `archive/2026-10-08-changes--sp-overview-total-general-card` (headline = replicated + new) and the SR-164368 row → section toggle.
- User-approved deviations: Lucide `lucideArrowRight` instead of `pi-arrow-right` (client UI rule 21); T-4 widened to `dashboard-lab/CLAUDE.md`.
- T-2 needed 2 attempts: the bar track's `overflow-hidden` clipped the segments' focus ring.
- The Bilateral review tab omits `status=pending` from its URL (default value) while still applying it.
