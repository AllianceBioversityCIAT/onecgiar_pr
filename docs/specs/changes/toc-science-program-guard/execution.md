# Execution Log — Guard Against Removing All ToC-Planned Science Programs

## 1. Document Control

- **Spec path:** `docs/specs/changes/toc-science-program-guard`
- **Branch:** `qa-development-2026-ss`
- **Approval mode:** default (gated) — no `pre-approved` marker found in Document Control of the spec triplet
- **Executor:** AKILI Leader (this session)

---

## 2. Task Execution History

### `TOC-SP-T-1` — Add the minimum-Science-Program guard to delete handlers

- **Final status:** PASS
- **Date:** 2026-08-29
- **Attempts:** 1

#### Attempt 1

- **Implementer (akili-implementer, effort medium; skills: `angular-developer`, `tdd`):**
  - Files changed:
    - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` — added `getRealScienceCount()`, `hasTocPlannedScience` getter, `blockIfLastScience(willRemoveCount)`; wired both into `deleteScience`/`deleteOtherScience` per `TOC-SP-DD-1`/`TOC-SP-DD-2`.
    - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` — added `describe('TOC-SP-T-1 — minimum Science Program guard')` with 6 cases (`TOC-SP-AC-1`, `AC-2`, `AC-3`, `AC-3b`, `AC-4`, sentinel-cascade).
    - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` — new dated entry documenting `TOC-SP-DD-1`/`TOC-SP-DD-2`; re-stamped `Verified:` line.
  - Verification: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → `Test Suites: 1 passed, 1 total; Tests: 69 passed, 69 total` (63 pre-existing + 6 new). `npx ng lint --quiet` → `All files pass linting.`
  - Not Done / Assumptions: none. Noted pre-existing `CLAUDE.md` length overrun (was already over the 120-line cap in `COMPONENT-DOCS.md` before this task's addition) — not caused by this task, not fixed here.
- **Reviewer (akili-reviewer, lens-checklist mode):**
  - **STATUS: PASS.** All of `TOC-SP-R-1..3` / `TOC-SP-AC-1..4` plus the mandated sentinel-cascade and negative/boundary checks confirmed met against `design.md` §6.2/§6.3, `TOC-SP-DD-1`, `TOC-SP-DD-2`, verbatim. Scope-out list untouched. Files match declared set exactly.
  - **ADVISORY (non-gating, recorded only):**
    1. **Spec-doc conflict:** `requirements.md` §7 NFR says the alert string MUST go through `src/app/internationalization/`; `design.md` §6.3 / `tasks.md` DoD explicitly mandate a plain hardcoded string instead (matching sibling notes). Implementer correctly followed the later, more specific approved artifacts. `requirements.md` §7 should be amended at archive so a future `/akili-audit` doesn't flag this as drift.
    2. **Reliability:** the guard only covers the chip `×` delete handlers; untick-in-dropdown on `app-pr-multi-select` (`component.html:325`, two-way `ngModel` on `scienceSelected`) bypasses `blockIfLastScience` entirely. This is consistent with `TOC-SP-DD-1`'s explicit scope (delete handlers only, `onScienceSelect` in Scope-out) but means `TOC-SP-US-1`'s user-facing promise is only partially enforced in the real UI. Candidate for a follow-up spec.
    3. **Reliability (minor, non-blocking):** when the real count is already 0 (e.g. orphan sentinel chip with an empty `otherScienceSelected`), deleting the sentinel is still blocked with an alert claiming "at least one is required" even though no real SP would be removed. Matches the `<= 0` formula in `design.md` §2.2 exactly (not a violation); a `getRealScienceCount() === 0` short-circuit would remove the trap.
    4. **Reliability (informational):** `hasTocPlannedScience` uses raw `tocReferenceSynergyInitiativeIds()`, diverging from the component's own resolved-ref `hasReferenceScience` used elsewhere in the file for a related but distinct "ToC presence" notion. Conformant with design §6.2's explicit formula; flagged for awareness only.
    5. **Readability:** folder `CLAUDE.md` is now ~176 lines against the 120-line cap in `COMPONENT-DOCS.md`; pre-existing overrun, not chargeable to this task — due a compaction pass at archive.

**Requirements covered:** `TOC-SP-R-1`, `TOC-SP-R-2`, `TOC-SP-R-3`, `TOC-SP-AC-1`, `TOC-SP-AC-2`, `TOC-SP-AC-3`, `TOC-SP-AC-4`.

**Decisions made:** None beyond what `design.md` (`TOC-SP-DD-1`, `TOC-SP-DD-2`) already specified — implementation followed the design exactly.

**Issues encountered:** None blocking. See ADVISORY items above (recorded, not gating, not converted into new tasks per Leader Guardrails).

**Final verification result:** PASS — Jest 69/69 green, lint clean, Reviewer STATUS: PASS.

---

## 3. Summary

All tasks in `tasks.md` are complete:

- `TOC-SP-T-1` — `[x]` PASS on first attempt.

No HALT, no Pivot, no budget tripwire (1 task, ~1 review round, well within the design.md Budget of 1 task / ~45–60 LOC / 1 review round — actual ≈130 LOC across component+tests+doc, still within Lite-depth tolerance for a single combined implementation+test task).

**Not committed.** Per standing instruction, no `git commit` without explicit user go-ahead.

**Open follow-ups (deferred, not blocking this spec):**
- Reconcile `requirements.md` §7 NFR (i18n) against the shipped hardcoded-string decision, at archive.
- Consider a follow-up spec for the dropdown-untick bypass path (ADVISORY #2).
- Compact `rd-contributors-and-partners/CLAUDE.md` against the 120-line cap, at archive.
- File a separate `bugfix/` proposal for the "reappears in Contributing CGIAR Centers" report only if reproduced (already noted in `tasks.md` §7, unrelated to this task's advisories).
