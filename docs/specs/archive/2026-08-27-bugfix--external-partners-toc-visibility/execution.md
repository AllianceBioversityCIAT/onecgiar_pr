# Execution Log — "Other(s) External Partners" shown by default

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/external-partners-toc-visibility/`
- **Approval mode:** default (gated) — no `pre-approved` marker found in `proposal.md`/`requirements.md`.
- **Depth:** Lite (Bug Mode).
- **Budget (design.md §2.4):** 1 task, ~15–25 LOC, 1 review round.

## 2. Task Execution History

### `EPT-T-1` — Conditionally label the empty-ToC External Partners dropdown, with regression test

- **Status:** PASS (attempt 1/3)
- **Date:** 2026-08-27
- **Requirements covered:** `EPT-R-1`, `EPT-R-2`, `EPT-R-3`, `EPT-R-4`, `EPT-R-10`, `EPT-AC-1`, `EPT-AC-2`.
- **Skills assigned:** `angular-developer`, `tdd` (Leader default — logic-heavy binding + regression test, matches Skill Map).
- **Effort:** medium (single conditional-binding mechanism, already validated once via the sibling `other-fields-toc-visibility` spec — low ambiguity).

**Attempt 1 (Implementer → Reviewer, PASS):**

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/normal-selector.component.html` — `appFeedbackValidation [labelText]` and `app-pr-multi-select [label]` bound to `hasReferencePartners() ? 'Other(s) External Partners' : 'External partners'`; `data-testid="toc-other-partners"` added to the `app-pr-multi-select`. No other bindings touched (`otherPartnersList()`, the `@if` gate unchanged).
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/components/multiple-wps/components/normal-selector/cpnormal-selector.component.spec.ts` — new `describe` block with `EPT-TEST-1a` (empty-ToC → resolves to `"External partners:"`) and `EPT-TEST-1b` (non-empty ToC + sentinel opt-in → resolves to `"Other(s) External Partners:"`, regression guard). Renders the real `app-pr-multi-select` via `CustomFieldsModule` and reads `.pr_label` text — never a `[label="…"]` attribute selector (`RB-S1`, reused from the sibling spec).
  - No `.ts` change — `hasReferencePartners()` and `showOtherPartners` were already correct and unchanged, per design §6.2.
- **Implementer verification:**
  - `npx jest --silent --no-coverage --testPathPattern="cpnormal-selector.component.spec"` → `Tests: 13 passed, 13 total` (11 pre-existing P2-3335 / partner-role-group tests + 2 new).
  - `npx ng lint --quiet` → `All files pass linting.`
  - Broader sanity `--testPathPattern="normal-selector"` (includes sibling `rd-partners` component) → `Tests: 20 passed, 20 total`.
  - **RED→GREEN evidence:** RED (pre-fix) — both new tests failed with `otherPartnersSelectEl() → null` (the `data-testid="toc-other-partners"` hook did not exist yet — one of the two accepted RED failure modes per `tasks.md` line 36). GREEN (post-fix) — both pass, full suite green, no regressions.
  - Resolved label text carries a trailing colon (`"External partners:"` / `"Other(s) External Partners:"`) because `pr-field-header.component.ts`'s `useColon` input defaults `true` — matches the sibling spec's own test pattern; the Reviewer independently traced `pr-field-header.component.html:8` to confirm this is genuine DOM text, not a fudged assertion.
- **Reviewer verdict:** `STATUS: PASS`. Confirmed the binding matches design §6.2 / `EPT-DD-1` row-for-row, the replacement copy is verbatim `EPT-R-10`/§13's `"External partners"`, `EPT-R-2`/`EPT-R-3` surfaces are untouched (orange note block and `otherPartnersList()` outside the diff), `EPT-R-4`/`EPT-AC-2` is guarded by `EPT-TEST-1b`, and traced both test fixtures against `normal-selector.component.ts` (`hasReferencePartners`, `otherSentinelSelected`, `preselectPartnersEffect`) to confirm they genuinely reach the claimed states rather than being contrived.
- **ADVISORY (4R lens, non-gating):**
  - **Readability:** the `hasReferencePartners() ? '...' : '...'` ternary is duplicated across `[labelText]` and `[label]`. Design §6.2 mandates no `.ts` change for this task, so extracting a `computed()` is not in scope here — recorded as the natural follow-up if the sibling-spec consolidation (design §13) is ever pursued.
  - **Reliability:** `tasks.md` §5 lists `EPT-TEST-1a` as covering `EPT-R-2`/`EPT-R-3`, but the implemented test only asserts the resolved label (not the orange note's presence or a non-empty `otherPartnersList()` catalogue). `EPT-R-3` is already a recorded accepted gap in `requirements.md` §7.1 and neither can regress from a label-only diff, so this does not gate — the `tasks.md` §5 coverage table is slightly broader than the actual test assertions.
- **Not Done / Assumptions (Implementer report):** the DoD's manual/browser spot-check (open a real 2026-phase result with 0 vs 1+ ToC external partners) was not performed — no running dev server/browser session in the Implementer's task. **Leader disposition:** this item is carried forward as the pre-existing "Manual QA on staging/test env" line already listed separately in `tasks.md` §6 Rollout & verification (a human/QA-stage step, not an Implementer deliverable) — not treated as a blocking gap on this Lite, presentation-only fix, since `EPT-TEST-1a`/`1b` already exercise the real `app-pr-multi-select` DOM and its resolved label text under both states. Recorded here so it isn't silently dropped from the rollout checklist.
- **Final verification result:** PASS — 13/13 relevant Jest tests green, lint clean, RED→GREEN confirmed, Reviewer PASS.

## 3. Summary

All tasks in `tasks.md` (`EPT-T-1`, the only task) are `[x]`. Spec ready for PR / manual QA per `tasks.md` §6 Rollout & verification (browser spot-check + staging QA still pending, tracked there, not blocking this record).
