# Archive Summary — Partner Role: exclusive "Other" selection (`PRL`)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/partner-role-exclusive-selection/` |
| Archive date | 2026-09-11 |
| Ticket | none (voice-note request, see `proposal.md`) |
| Owner / driver | Santiago Sanchez Correa |
| Branch | `qa-development-2026-ss` (not the default branch — see §9) |
| Commit | `188940e9a` — `🔧 fix(rd-contributors-and-partners) [SPEC:changes/partner-role-exclusive-selection]: block Scaling/Demand/Innovation while Other is active` |

## 2. Final Status

**Shipped.** `PRL-T-1` (the spec's only task) PASSed Reviewer on attempt 1/3, is committed on this branch, and has since been manually verified by the user in a real browser (confirmed 2026-09-11): dim/no-op/restore behavior checked in both delivery blocks.

## 3. Requirements Delivered

| Requirement | Delivered as |
|---|---|
| `PRL-R-1`, `PRL-R-2` | `isRoleBlockedByOther` guard; `Scaling`/`Demand`/`Innovation` render dimmed + `aria-disabled="true"` and are no-ops while `Other` is active |
| `PRL-R-3` | Deselecting `Other` restores normal interactive state |
| `PRL-R-4`, `PRL-R-5` | Existing multi-select and "Other clears others" behavior unchanged (regression-tested) |
| `PRL-R-6` | Guard applied identically to both delivery blocks (ToC-partners and "Other(s)" partners chip lists) |

## 4. Files Changed Summary

- `rd-contributors-and-partners.component.ts` / `.html` / `.spec.ts` — `isRoleBlockedByOther`, guard placement in `onSelectDeliveryPartners`, `.delivery.blocked` class on both delivery blocks.
- `rd-contributors-and-partners.service.spec.ts` — unit coverage for the guard and no-regression cases.
- One out-of-scope mock-only repair in a sibling spec file (pre-existing test broke from an unconditional new template binding); judged non-behavioral and in-bounds by the Reviewer.

## 5. Test Evidence Summary

`npx jest --silent --reporters=summary --no-coverage -- --testPathPattern="rd-contributors-and-partners"` → 276/276 passed. `npx ng lint --quiet` clean. Full detail in `execution.md`.

## 6. Validation Summary

No standalone `/akili-validate` report — Reviewer verdict PASS on attempt 1/3 covered all five `PRL-AC-*` via assertions that evaluate the actual DOM class/attribute and array identity (not vacuous checks). Manual browser QA (task DoD §6) completed by the user post-implementation, closing the one gap the automated Reviewer pass could not itself exercise (real hover/click).

## 7. Accepted Warnings / Follow-Ups

| Item | Status |
|---|---|
| `rd-contributors-and-partners/CLAUDE.md` doc update (new `isRoleBlockedByOther` method + guard) | **Pending, recorded in §9** — apply on `master` per shared-file write discipline |
| Reviewer ADVISORY: `blocks().forEach` assertions could pass vacuously if the second `.chips_container` stopped rendering | Not fixed — recommend asserting `blocks().length === 2` explicitly if this test is touched again |
| Reviewer ADVISORY: sibling spec's mock reimplements `isRoleBlockedByOther`'s logic instead of delegating to its own stub | Not fixed — low risk, noted for future drift |
| `opacity: 0.45` dim convention | Consistent with existing `.globalDisabled`; flagged only if this "blocked" pattern is later promoted into `docs/ux-ui/design.md` as a reusable token |

## 8. Historical Notes

Single-task, Lite-depth spec that shipped cleanly on the first Reviewer round — no rework, no Pivot, no HALT. The only friction was an out-of-scope sibling test file broken by an unrelated new template binding, resolved with a minimal mock-only fix rather than expanding this task's scope.

## 9. Pending Items (spec-branch deferral)

Recorded per `/akili-archive` Step 3's branch gate (session is on `qa-development-2026-ss`, not the default branch `master`). No shared file was edited by this archive pass.

### 9.1 — `guide-sync` — `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`

Add one entry documenting: the new `isRoleBlockedByOther(option, roleId)` method on `RdContributorsAndPartnersService`, and the Other-exclusive click guard on `onSelectDeliveryPartners` (no-op when a non-`Other` role is clicked while `Other` is active for that row). Re-stamp the `Verified:` line.

**Severity:** low (documentation-only; behavior already shipped and correct).

### 9.2 — `factual-sweep`

None found. No factual claim in the root guides was falsified by this change (single-method fix, no new module, no architecture shift).

### 9.3 — `trd-adr`

None. No `docs/trd/trd.md` entity/API is touched by this spec.
