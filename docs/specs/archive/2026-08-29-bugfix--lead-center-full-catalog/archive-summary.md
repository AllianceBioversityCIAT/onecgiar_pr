# Archive Summary — Lead Center Independent of Contributing Centers

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/lead-center-full-catalog/` |
| Archive date | 2026-08-29 |
| Final status | **PASS — shipped** (5/5 tasks, live-browser-verified, committed `c56be9d79`) |
| Branch | qa-development-2026-ss (spec branch — see Constitution Sync below) |

## 2. Requirements Delivered

All functional requirements delivered and verified: `LC-R-1`..`LC-R-4`, `LC-R-10` (original scope) plus `LC-R-14`..`LC-R-17` (generalized `LC-DD-5` auto-sync, superseding the narrower `LC-R-11`..`LC-R-13`). All `LC-AC-1`..`LC-AC-4` and `LC-AC-8`..`LC-AC-11` confirmed, including live in a real browser against result 8952.

## 3. Files Changed Summary (from `execution.md`)

- `rd-contributors-and-partners.service.ts` — `setPossibleLeadCenters()` sources the full CLARISA catalog unconditionally; `tryAutoAssignLeadCenter()` gated on the Contributing-Centers union; new `onLeadCenterSelected()` implementing target-field-aware auto-sync (`LC-DD-4`→`LC-DD-5`); `applyTocMappingOnLoad`'s sentinel-reconciliation bug fixed.
- `rd-contributors-and-partners.component.ts` / `.html` — stale empty-state note removed; Lead Center `(selectOptionEvent)` wired to `onLeadCenterSelected`; `deleteOtherCenter` clears the auto-add tracker.
- `rd-contributors-and-partners.service.spec.ts` / `.component.spec.ts` — `LC-TEST-1`..`LC-TEST-15` (15 test IDs, several with sub-cases).
- `ipsr-contributors.component.spec.ts` — `LC-TEST-8` confirms shared-service inheritance, zero IPSR code change.
- `rd-contributors-and-partners/CLAUDE.md` — "Lead center" trampa rewritten across all 5 tasks.

## 4. Test Evidence Summary

169/169 Jest tests passing (final state), `npx ng lint --quiet` clean, `npx ng build --configuration development` clean (added after the §2.3 process gap — see Kaizen). No `test-report.md` produced; evidence lives entirely in `execution.md`'s per-task Verification blocks.

## 5. Validation Summary

No `validation-report.md`. Live-browser verification (§2.4) against real backend, real result 8952, real Cypress-driven Chromium: full catalog present, stale note gone, single correctly-targeted Contributing Centers field, zero console errors, section shows green-checked complete.

## 6. Accepted Warnings / Follow-Ups

- Non-gating ADVISORY items recorded per task in `execution.md` (reliability edge cases, readability nits) — none actioned, none escalated.
- `design.md` §13 Open Gap: a stale `leadCenterCode` referencing a deactivated catalog center is a known, unchanged, out-of-scope edge case (`tasks.md` §7).
- Cross-spec interaction at `rd-contributors-and-partners.component.html:163` (Other(s) auto-activation gate) was resolved jointly with `bugfix/toc-unmapped-orange-notes` — see that spec's archive.

## 7. Historical Notes

- Started as a 3-task Lite bugfix (`LC-T-1`..`LC-T-3`); grew to 5 tasks after two rounds of post-completion live-browser testing surfaced a genuine persistence gap (`LC-GAP-1`) and then a targeting defect (`LC-DD-5` superseding `LC-DD-4`) — both in-spec amendments, not pivots.
- §2.3 process gap: Jest + `ng lint` alone missed a build-breaking TypeScript error for 5 tasks straight; only caught by an unplanned live-browser check. Captured as Kaizen lesson `KZ-bugfix--lead-center-full-catalog-1`.
- Concurrent-session `git stash` interference during `LC-T-5` recovered without data loss; unexplained reflog activity during the run flagged to the user, unresolved.
