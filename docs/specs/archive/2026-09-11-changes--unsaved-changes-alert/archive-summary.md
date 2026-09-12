# Archive Summary — Unsaved Changes Warning on Navigation (`UCA`)

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/unsaved-changes-alert/` |
| Archive date | 2026-09-11 |
| Ticket | [P2-3638](https://cgiarmel.atlassian.net/browse/P2-3638) |
| Owner / driver | Santiago Sanchez Correa |
| Branch | `qa-development-2026-ss` (not the default branch — see §9) |
| Commits | `d49591a28` — WIP checkpoint; `5812d73f3` — `✨ feat(unsaved-changes-alert,linked-results-filters): merge performance-refactor, resolve conflicts` |

## 2. Final Status

**Shipped.** All 11 implementation tasks (`UCA-T-1`–`UCA-T-11`) PASSed Reviewer and are committed on this branch. `UCA-T-12` (the dedicated manual-QA + folder-doc-update task) was not run as its own AKILI task, but the user has since manually tested the feature across Result Detail sections in a real browser and confirmed it correct (2026-09-11) — accepted as satisfying `UCA-T-12`'s functional DoD. The `beforeunload` native-prompt case (no automated test can prove this) is covered by that manual pass.

## 3. Requirements Delivered

| Requirement | Delivered as |
|---|---|
| `UCA-R-1`, `UCA-AC-1`/`UCA-AC-2` | Next/Back always save first via `section-bottom-bar`'s silent-save intent (`UCA-T-5`), no dialog on this path |
| `UCA-R-2`, `UCA-AC-3`/`UCA-AC-4`/`UCA-AC-5` | `UnsavedChangesGuard` (`CanDeactivate`) opens a Save/Discard `hlm-dialog` on any other dirty-section navigation (sidebar click, browser back/forward) |
| `UCA-R-3` | Dialog exposes exactly two actions, no third |
| `UCA-R-4` | Save-then-resume / Discard-then-resume both land on the originally requested destination |
| `UCA-R-5`, `UCA-AC-6` | Clean sections navigate instantly, zero save/dialog |
| `UCA-R-6`, `UCA-AC-7`/`UCA-AC-8` | `beforeunload` directive warns on tab close/refresh with unsaved edits |
| `UCA-R-10` | Shared primitives (`SectionDirtyTrackerService`, guard, dialog, intent flag) built generically, reused across 10+ section folders |

## 4. Files Changed Summary

- **Shared primitives (`UCA-T-1`–`UCA-T-5`):** `section-dirty-tracker.service.ts`, `unsaved-navigation-intent.service.ts`, `unsaved-changes.guard.ts`, the Save/Discard dialog + service (`hlm-dialog`-based), a `beforeunload` directive wired at `resultDetailRouting`, and `section-bottom-bar`'s silent-save intent flag.
- **Per-section wiring (`UCA-T-6`–`UCA-T-11`), 10+ folders:** `rd-general-information`, `rd-geographic-location`, `rd-evidences`, `rd-partners` (P22), `rd-contributors-and-partners` (P25), `rd-theory-of-change`, `rd-links-to-results`, and all 5 `rd-result-types-pages/*` variants — each got a component-local dirty snapshot + `CanComponentDeactivate` implementation.
- **`rd-contributors-and-partners`/`rd-partners` (`UCA-T-9`, the hardest task):** `reconcileLeadFieldsAfterLateCatalogue(source)` with a `source: 'centers' | 'institutions'` discriminator, `normalizeTocResultsForDiff()`, a hydration guard on `preselectPartnersEffect`, plus both folders' `CLAUDE.md`.

## 5. Test Evidence Summary

Per-task Reviewer-verified throughout `execution.md`: `npx ng lint --quiet` clean; `npm run build` clean; final `rd-partners`/`rd-contributors-and-partners` suite → 143/143 green; the two most recently landed sections (`innovation-use-info`, `policy-change-info`) → 51/51 and 36/36 green respectively, coverage well above the 50/60/60/60 gate. No `migration:check` applies (client-only).

## 6. Validation Summary

No standalone `/akili-validate` report — validation is the per-task Reviewer PASS embedded in `execution.md`, 11/11 tasks. `UCA-T-9` alone required 4 attempts (3 within the normal ceiling, triggering a HALT; a 4th user-authorized past it) before reaching PASS — see §8. The spec-wide manual QA (`UCA-T-12`) was completed by the user directly rather than as a recorded AKILI task, per the user's explicit request to archive now.

## 7. Accepted Warnings / Follow-Ups

| Item | Status |
|---|---|
| `result-detail/CLAUDE.md` update describing the new guard/dialog mechanism | **Pending, recorded in §9** — apply on `master` |
| Recurring ADVISORY (5+ occurrences across sections): a section's load GET doesn't handle its own error branch, leaving `hasUnsavedChanges()` fail-open | Not fixed — flagged in `execution.md` as "increasingly warranted" for a spec-wide fix; not attempted here (out of this spec's declared scope) |
| Pre-existing risk (not introduced by this spec): `setLeadCenterOnLoad`/`setLeadPartnerOnLoad` overwrite the live model unconditionally on a late catalogue emission | Noted, confirmed practically unreachable for the same-catalogue field; not fixed (pre-existing, cross-catalogue case is the one this spec's `UCA-T-9` fix actually closed) |
| `UCA-R-10`'s adoption by IPSR and the bilateral result creator | Explicitly deferred — not attempted here |
| Follow-up if a future section needs a non-generic (per-field) dirty diff | Noted for future maintainers — the whole-object diff is not assumed universal |

## 8. Historical Notes

This is the largest and most contested spec in the batch: 11 implementation tasks across 10+ independently-touchable Result Detail sections. `UCA-T-9` (`rd-partners` + `rd-contributors-and-partners`) is the standout — the only section with three independent ToC/catalogue-driven async writers into tracked state plus a real side effect (a contribution email) on a spurious save, and it took 4 attempts (a HALT at 3, user-authorized past the ceiling) to close cleanly:

1. Attempt 1 found child-mutation false-dirty firing a spurious email, and untracked mandatory lead fields causing silent data loss.
2. Attempt 2's own fix for the untracked fields reintroduced false-dirty via a late-catalogue race, and surfaced a third unguarded child writer.
3. Attempt 3's catalogue-race reconciliation was itself subtly wrong — it substituted BOTH lead fields on any late emission, silently erasing a genuine concurrent edit to the field the emitting catalogue never touched.
4. Attempt 4 (user-authorized) scoped the substitution to a `source` discriminator, closing the bug; the only remaining issue (stale folder-doc description of the fix) was closed directly by the Leader on the Reviewer's explicit recommendation rather than spending a 5th attempt.

The Leader also made one deliberate, recorded protocol deviation: at the HALT, it did not run the literal `git restore . && git clean -fd` rollback, because this spec's execution never committed between tasks (per the user's standing no-auto-commit preference) and a blanket restore would have destroyed 9 other already-PASSed tasks' uncommitted work alongside `UCA-T-9`'s. It left `UCA-T-9`'s files in their attempt-3 state and escalated to the user instead — judged as following the protocol's intent over its literal text.

## 9. Pending Items (spec-branch deferral)

Recorded per `/akili-archive` Step 3's branch gate (session is on `qa-development-2026-ss`, not the default branch `master`). No shared file was edited by this archive pass.

### 9.1 — `guide-sync`

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` — add an entry describing the new guard/dialog mechanism (where it lives: `SectionDirtyTrackerService`, `UnsavedChangesGuard`, the Save/Discard dialog, the `beforeunload` directive) and which sections it covers (all routed Result Detail sections). Re-stamp `Verified:`.
- `rd-partners/CLAUDE.md` and `rd-contributors-and-partners/CLAUDE.md` — already updated in-spec through `UCA-T-9` attempt 4 (the `source`-discriminator fix and its `Verified:` stamp); no further action needed for these two.

**Severity:** low (documentation-only; the mechanism itself is shipped and correct).

### 9.2 — `factual-sweep`

None found beyond the guide-sync above — no stale root-guide claim (stack, structure, module list) was falsified by this spec.

### 9.3 — `trd-adr`

None. `docs/trd/trd.md` W1 was cited as context only in `requirements.md`; no architecture decision it records was overturned.

### 9.4 — `standardization` (Product)

Proposed edit to `docs/specs/general-setup/design.md` or the client `CLAUDE.md`'s testing conventions: a section's load-GET error branch should be a checked item in the per-section dirty-tracking DoD, not an ADVISORY that recurred silently 5+ times across this one spec before being flagged as "increasingly warranted." Recommend a spec-wide follow-up ticket to close the gap uniformly rather than per-section.

**Severity:** medium (fail-open on save-guard state; no confirmed incident yet, but the same gap recurred across 5 independent sections in one spec).
