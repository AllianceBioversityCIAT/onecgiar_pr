# Archive Summary — Favorite Indicators & Focus View on the Reporting Tab

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/reporting-favorite-indicators` · Prefix `RFI` |
| Archive Date | 2026-09-06 |
| Branch | `qa-development-2026` (spec branch; default pin `master`) — developed on `feat/reporting-favorite-indicators` in a sibling worktree, merged `ba71b5a8f`, ff `9591679b2` |
| Commit at archive | `9591679b2` |
| Archive Run | 1 |
| Approval Mode | `pre-approved` (user "YOLO MODE", 2026-09-05) · Depth Standard |

## 2. Original Spec Path

`docs/specs/changes/reporting-favorite-indicators/`

## 3. Final Status

**Shipped to `qa-development-2026`** — 4/4 tasks PASS (1 rework round, test fixture only); `RFI-HITL-1` PASS on the worktree dev server (DOM-measured, 6 viewports); merged tree: `tsc` clean, `ng lint` clean, 13 suites / 459 tests green. No `/akili-test` and no `/akili-validate` run — absence accepted under YOLO: Reviewer PASS per task (author ≠ auditor) plus the live check stand in.

## 4. Requirements Delivered

| ID | Outcome |
|---|---|
| `RFI-R-1.1`–`1.4` | Star toggle first in both action cells (grouped + flat), `emitAndStop` isolation, `aria-pressed`/label/glyph; table stays presentation-only |
| `RFI-R-2.1`–`2.7` | `★ Favorites (N)` switch after *Only pending*, hidden in By AOW; favorites-only step drops settled empty cards, keeps loading ones; ratio pinned to the full set via `__allIndicators`; view-gated active filter; *Clear filters* turns it off, never deletes pins; dedicated empty state; session persistence |
| `RFI-R-3.1`–`3.4` | `localStorage` `pr.reporting.favorites.v1.<userId>`, programme-scoped, `rowKey`-identical keys, storage-failure tolerant, no PII |
| `RFI-R-4.1`–`4.2` | AND composition after `applyBurndownFilterAndSort`; identity (same reference) when off |
| `RFI-R-10` | Tracks +32px grouped / +34px flat; three shared-grid floors 820→852px |
| `RFI-AC-1`…`AC-16` | All covered by the four new spec files (see §6) |

## 5. Files Changed Summary

8 commits on the feature branch (+ merge + 1 post-merge test fix), 20 files, +1,981 / −23 before merge:

| Area | Files |
|---|---|
| New service | `dashboard-lab/services/reporting-favorites.service.ts` (+ spec) |
| Table | `reporting-aow-table.component.{ts,html,scss}`, `reporting-aow-table.favorites.spec.ts` (new), `reporting-aow-table/CLAUDE.md` |
| Band | `reporting-program-band.component.{ts,html}`, `reporting-program-band.favorites.spec.ts` (new) |
| Host | `dashboard-lab.component.{ts,html}`, `dashboard-lab.favorites.spec.ts` (new), `dashboard-lab/CLAUDE.md` |
| Spec docs | proposal, requirements, design (§15 judgment pass), tasks, execution, kaizen entry |

## 6. Test Evidence Summary

| Suite | Result |
|---|---|
| `reporting-favorites.service.spec.ts` | 16/16 |
| `reporting-aow-table.favorites.spec.ts` + existing table spec | 151/151 |
| `reporting-program-band.favorites.spec.ts` + existing band spec | 93/93 |
| `dashboard-lab.favorites.spec.ts` + `mrf-burndown-session` + `design-tokens` | 24/24 (AC-8 mutation-proved red under a swapped pipeline order) |
| Merged tree, both specs (RFI + RHSF), 13 suites | 459/459 |
| `RFI-HITL-1` (Orca embedded browser, SP01, requested 1280/1024/900/768/750/640) | no page overflow; action cells on one line; toggle / focus / reload persistence / clear / unpin verified |

## 7. Validation Summary

Not run (`/akili-validate`). Substitute evidence: one blind T3 judgment pass on the design (14 findings, 11 fixed pre-code), Reviewer PASS on every task, HITL-1. Accepted by the user's YOLO mandate.

## 8. Accepted Warnings Or Follow-Ups

- Pins are per browser and die on explicit sign-out (`AuthService.logout()` clears `localStorage`) → follow-up `changes/user-preferences-api`.
- No stars in the By AOW view rows or the indicator drawer; no `fav=1` URL param (wait for RHSF-T-5's URL sync) → follow-ups.
- Advisories left open: `__allIndicators` JSDoc in the table still names Only-pending as its only writer; dead `plannedBrowseView === 'indicators'`; no `inert` on `.pr-collapse`; no cross-tab pin sync; top-level-only payload validation in `load()`.
- Focus switch is session-global while pins are programme-scoped — accepted as `RFI-DD-5`.

## 9. Historical Notes

- Built in a sibling git worktree while RHSF was executed by another agent in the same checkout on the same three components; zero collisions; merge had no conflicts; one harness-only test fix after the merge (RHSF consumers pre-warm `reportingGroupsForTable`).
- One runtime interruption: the T-2 Implementer was killed by the session rate limit and resumed with its context intact.
- The result-type quick filter from the same user brief was deliberately not built here — RHSF-T-3 owns it.
