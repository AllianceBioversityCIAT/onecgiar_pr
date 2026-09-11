# Execution Log — Hide indicator-only UI in emerging-result creation (Lite)

## 1. Document Control
- Spec: `changes/emerging-creation-hide-indicator-ui`
- Depth: Lite
- Approval mode: gated (default — no `pre-approved` marker found in Document Control)

## 2. Task Execution History

### Task EHU-T-1 — Gate Card 2 and the ToC-attribution note behind `!isEmerging()` + regression test
- **Final status:** PASS (attempt 2 of 3)
- **Date:** 2026-09-11
- **Requirements covered:** EHU-R-1, EHU-R-2, EHU-R-3 (all scenarios, requirements.md §5)
- **Design references:** design.md DD-1, DD-2
- **Skills used:** `angular-developer`, `tdd` (attempt 1); `angular-developer` (attempt 2)
- **Effort:** medium (both attempts)

#### Attempt 1
- **Files changed:**
  - `onecgiar-pr-client/.../lab-report-form/lab-report-form.component.html` — Card 2's `@if` gained `!isEmerging() &&`; the shared `@if` that originally wrapped Card 2 + Card 3 + `autoCreateHint` + the sticky create footer + its `@else` (browse-mode footer) was split into two independent blocks so Card 3/footer/`@else` stay intact for emerging results. Only the `toc-attribution-note` div inside Card 3 got its own `@if (!isEmerging())`.
  - `onecgiar-pr-client/.../lab-report-form/lab-report-form.component.spec.ts` — added `EHU-AC-1/2` (emerging: Card 2 + note absent, Centers/Science selects present) and `EHU-AC-3` (non-emerging: both present) tests in the `RFUX-T-2` DOM-rendering describe block; added `outputOutcomeLevelsSig` to the `mount()` test harness (required for the component to render in emerging mode without a seeded category).
  - `onecgiar-pr-client/.../lab-report-form/CLAUDE.md` — re-stamped `Verified:` line; added a "Trampa: Card 2 / Card 3 compartían un solo `@if`" note.
- **Implementer verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lab-report-form.component.spec"` → 95/95 passed. Red-before-fix proof: reverted HTML to HEAD, ran `-t "EHU-AC"` — emerging-mode assertion failed as expected (Card 2 still rendered), non-emerging assertion passed; re-applied fix → 95/95 green.
- **Deviation from literal task brief (recorded, not a scope violation):** `tasks.md` instructed adding `!isEmerging() &&` to the single existing `@if` at line 325. The Implementer discovered that `@if` actually wrapped Card 2, Card 3, `autoCreateHint`, and the sticky create footer (owning its `@else`) — applying the literal instruction would have hidden Card 3's Centers/Science Programs selects and the entire create footer in emerging mode, violating EHU-R-2 and making emerging creation impossible. The Implementer split the block instead (Card 2: `!isEmerging() && (...)`, closing after its own `</section>`; Card 3: original condition unchanged, still owning the `@else`). Reviewer verified this independently against design.md DD-1/DD-2 and confirmed it is the only spec-compliant approach.
- **Reviewer verdict (attempt 1): FAIL**
  - Discovered Issue: the new `CLAUDE.md` trap note claimed both `@if` blocks close "each after its own `</section>`" — true for Card 2, **false for Card 3** (its `@if` stays open through the sticky footer and `@else`). A maintainer trusting the note could "rebalance" the block and strip the `Create and continue` footer in emerging mode.
  - Violated Rule: tasks.md Done criteria (CLAUDE.md must accurately record the visibility exception); `onecgiar-pr-client/CLAUDE.md` §10 Folder docs.
  - Remediation: describe the real asymmetric structure — Card 3's `@if` stays open past its `</section>`, wraps `autoCreateHint` + the sticky footer, and owns the `@else`.
  - ADVISORY (non-gating): the compressed "Desviaciones conocidas del diseño" section dropped the two concrete deviation descriptions (chevron button vs thin chevron; counter format) — readability lens.

#### Attempt 2
- **Trigger:** Reviewer FAIL above (doc accuracy), plus a new finding surfaced by the user testing the live build mid-review (not from Implementer or Reviewer): Card 3's header was a hardcoded literal ("3. Collaboration & Attribution"); with Card 2 hidden in emerging mode the visible sequence read "1. ... 3. ..." with no "2.", which reads as broken numbering.
- **Files changed:**
  - `lab-report-form.component.html:395` — Card 3 header number made reactive: `{{ isEmerging() ? '2' : '3' }}. Collaboration & Attribution`. Card 1's header (never hidden) and Card 2's own header (only visible when non-emerging) untouched.
  - `lab-report-form.component.spec.ts` — added header-text assertions inside the existing `EHU-AC-3` (expects "3. Collaboration & Attribution") and `EHU-AC-1/2` (expects "2. Collaboration & Attribution") test cases (not new test cases — total count stayed 95).
  - `lab-report-form/CLAUDE.md` — corrected the trap note per the Reviewer's remediation (Card 3's `@if` stays open through the footer and owns the `@else`; documented the reactive header number). File is exactly 120 lines (at the cap). The advisory (restoring the two concrete deviation lines) was not pursued — no line budget remained after the mandatory accuracy fix; left as a standing advisory.
- **Implementer verification:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lab-report-form.component.spec"` → `Tests: 95 passed, 95 total`.
- **Reviewer verdict (attempt 2): PASS**
  - Confirmed the reactive header produces 1→2→3 (non-emerging) and 1→2 (emerging, no gap), non-emerging output byte-identical to before (EHU-R-3).
  - Confirmed the new assertions are behavioral, not tautological — the emerging-mode header assertion would have failed pre-fix.
  - Confirmed the CLAUDE.md trap note now accurately matches the real `@if` nesting (re-traced independently) and the file is within its 120-line cap.
  - ADVISORY (non-gating, unchanged from attempt 1): the "Desviaciones conocidas del diseño" compression remains a standing readability item — genuinely blocked by the line cap. Trivial: `Verified:` line 3 says "comparten" while the trap-note heading (line 84) says "compartían" — cosmetic, fold in only if the file is edited again.

- **Decisions made:**
  - Split one shared `@if` into two independent blocks rather than literally editing the single condition, since the literal instruction was based on a mistaken assumption about the block's actual span (verified structurally by both Implementer and Reviewer).
  - Extended task scope by one small addendum (Card 3 header renumbering) in response to a live-testing finding that the approved requirements/design did not anticipate (they covered DOM presence, not header numbering). Treated as a necessary in-scope correction to avoid shipping a visible regression caused directly by this task's own change, not as new unapproved feature work — no new file was touched beyond the three already in the task's file list.
- **Issues encountered:** one Reviewer FAIL (documentation accuracy, attempt 1), resolved in attempt 2.
- **Final verification result:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="lab-report-form.component.spec"` → 95/95 passed, 0 regressions.

## 3. Summary

All tasks in `tasks.md` (EHU-T-1, the only task) are complete. Requirements EHU-R-1, EHU-R-2, EHU-R-3 are satisfied and verified by Jest (95/95 green, including the pre-existing ECN-AC-1 test from `bugfix/emerging-contribution-not-required`). `lab-report-form/CLAUDE.md` is updated and re-stamped. No files outside the task's declared scope were touched. Spec ready for commit (pending user go-ahead — no auto-commit).
