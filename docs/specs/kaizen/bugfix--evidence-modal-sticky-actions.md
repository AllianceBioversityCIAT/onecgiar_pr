# Kaizen — `bugfix/evidence-modal-sticky-actions`

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Branch context | spec branch (`qa-development-2026-ss` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-08-bugfix--evidence-modal-sticky-actions/` |

## Metrics

| Signal | Value |
|---|---|
| Reviewer FAIL rework | 0 — both Implementer/Reviewer-cycled attempts (1, 2) got Reviewer PASS on their first pass; the rework driver was **live user-reported regressions found after PASS**, not Reviewer rejections |
| Live-verification-driven rework rounds | **4 attempts total** for a single task (`EVM-T-1`), each fixing a different real, previously-invisible defect: double-scroll-ancestor ambiguity (attempt 1→2), a Chromium sticky-over-fixed compositing quirk (attempt 3), and an unrelated pre-existing radio-selection bug + density pass (attempt 4) |
| HALT / FATAL_FAIL | 0 |
| Pivot Record | 0 (attempt 2 switched from the design's own DD-1 to its own pre-authorized DD-2 fallback — an anticipated branch, not a pivot) |
| PRODUCT_BUG findings | 1, incidental — `evidence-item.component.ts`'s `evidencesType` used numeric `id: 0/1` against the boolean `is_sharepoint`, so the "Source of evidence" radio never rendered as selected; found during attempt 4's unrelated density pass, not by any test |
| Judgment-day severe findings | not run |
| Validation FAIL/WARN | not run (`validation-report.md` not produced); Reviewer ADVISORY notes only, all accepted non-blocking |
| `/akili-quick` escalations | 0 |
| Budget | 1 task estimated / 1 actual (but 4 attempts, not the ≤1 review round `design.md` §Budget projected) · ~20-40 LOC estimated — actual footprint materially larger across 4 attempts (structural rewrite + height buffer + spacing pass + an unrelated bug fix), a Lite-depth sizing miss worth noting but not escalating retroactively |

## Lessons

- **KZ-EVM-1 — A single live-browser check at one viewport height cannot prove a CSS scroll-container fix is correct, because different heights can make a *different* element the actual scrolling ancestor.** (Product, High)
  - Root cause: attempt 1's `position: sticky` fix was verified live at an extremely short viewport (1280×575), where the popup's content genuinely exceeded `.evidence_modal`'s own `85vh` cap — so `.evidence_modal` was, at that height, the element that actually scrolled, and the sticky pinning held. At a normal desktop height (~1911×952, where the user hit the regression), the same content fit inside `.evidence_modal`'s cap without needing its own scroll — so the **outer** `.pr-dialog` (with its own independent `max-height: 90vh; overflow: auto`) became the element that scrolled instead. `position: sticky` only reacts to its element's own nearest scrolling ancestor, so at that height the sticky declarations had **zero effect** — not degraded, not partial, genuinely inert — and the header/footer rode along with the rest of the block, producing the exact overlap the user reported. The short-viewport live check could not have caught this because it never exercised the "outer container scrolls instead" code path at all.
  - Evidence: `execution.md` §3.5 ("Reopened — user-reported regression at normal desktop width"), specifically the root-cause paragraph explaining why `.evidence_modal.scrollTop` never moves at that height; `design.md` `EVM-DD-1`'s own accepted-risk note (which underestimated the failure mode as "~5-10px overflow," not "pinning has zero effect").
  - Standardization → P1: when verifying a fix for nested/ambiguous scroll containers (a CSS `overflow`/`max-height` cap on more than one ancestor in the same subtree), a single live check MUST include at least two materially different viewport heights — one short enough to force the intended scrolling ancestor, and one at a "normal" desktop height where the content might fit without needing it — because these can silently activate a *different* scrolling ancestor with no visible warning until a real user hits it.

- **KZ-EVM-2 — A `position: sticky` ancestor can paint above a deeply-nested `position: fixed` descendant regardless of z-index, when the descendant isn't portaled to `document.body`.** (Product, Medium)
  - Root cause: `app-pr-dialog`'s mask (`.pr-dialog-mask`, `position: fixed; inset: 0; z-index: 1100`) rendered **behind** the app shell's sticky header (`.app-shell-header`, `position: sticky; z-index: 30`) at their overlap point — the reverse of what the z-index values alone predict. Live A/B testing (raising the mask's z-index to 1,000,000, trying `translateZ(0)`, `will-change: transform`, `isolation: isolate`) changed nothing — ruling out a fixable stacking-context issue. Root cause: `pr-dialog` renders inline in the component tree rather than via a CDK-overlay-style portal appended to `document.body`, which is what exposes any sufficiently tall dialog to this Chromium compositing-layer-ordering behavior whenever a `position: sticky` ancestor exists earlier in the DOM.
  - Evidence: `execution.md` §3.6 ("dialog header rendering behind the app shell's fixed top bar") — the full empirical z-index/stacking-context elimination sequence.
  - Standardization → P2: this is a `pr-dialog`-level architectural finding, not specific to `rd-evidences` — any sufficiently tall `app-pr-dialog` opened while the test-environment banner (`.app-shell-header`) is visible is exposed to the same class of bug. `pr-dialog` currently has no `CLAUDE.md`; this finding is exactly the kind of "already broke something" trap that folder-doc convention exists to capture before a second consumer rediscovers it independently.

## Noted, not a lesson

- Attempt 4's incidental discovery of the `is_sharepoint`/`evidencesType` boolean-vs-numeric radio bug is a good example of a live density-pass catching a real, previously-invisible defect that no automated test had ever exercised (no test asserted which radio rendered checked) — not a process gap, just evidence that live UI passes have value beyond the specific defect being chased. No standardization needed; this is what manual QA is for.
- The Leader's attempts 3–4 were correctly kept out of the Implementer/Reviewer loop (single-file, single-root-caused, self-verified live) per the existing delegation-threshold rule in `.agents/leader.md` — followed exactly as designed, not a deviation worth recording.
- `design.md`'s own Budget (§2.4: "1 task, ~20-40 LOC, 1 review round") undershot the actual footprint (4 attempts, several files, an unrelated bug fix folded in) — but this was driven entirely by real, sequentially-discovered defects rather than scope creep or a bad estimate; no Lite-vs-Standard depth-sizing rule violation to flag; noted for completeness, not actioned.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-EVM-1) | `onecgiar-pr-client/CLAUDE.md` §9 "Verifying in a REAL browser" | Add a third trap: "**3. One viewport height is not enough to verify a nested-scroll-container fix.** When more than one ancestor in a subtree has its own `max-height`/`overflow` (e.g. a dialog shell wrapping a component's own scroll box), a `position: sticky` fix that holds at one viewport height can have **zero effect** at another, because a *different* ancestor becomes the actual scrolling element and `position: sticky` only reacts to its own nearest scrolling ancestor. Verify at least two materially different heights: one short enough to force the intended scroll container, one at a normal desktop height where content might fit without needing it." | High | pending |
| 2 | guide-sync | `onecgiar-pr-client/src/app/shared/components/pr-dialog/CLAUDE.md` (create — does not exist yet) | Create a short folder doc noting: "`.pr-dialog-mask` (`position: fixed`) can render **behind** a `position: sticky` ancestor earlier in the DOM (e.g. the app shell's `.app-shell-header`) regardless of z-index — empirically confirmed, not fixable by raising z-index, `transform`, `will-change`, or `isolation` (all tried live, none changed paint/hit-test order). Root cause: `pr-dialog` renders inline in the component tree rather than via a `document.body` portal. Any sufficiently tall dialog opened while a sticky ancestor is visible (e.g. the test-environment banner) is exposed. Worked around per-consumer in `rd-evidences` (a height buffer); not fixed at the source. See `docs/specs/archive/2026-09-08-bugfix--evidence-modal-sticky-actions/execution.md` §3.6 for the full empirical trace." | Medium | pending |
| 3 | factual-sweep | root guides | No falsified root-guide claims found this cycle. | — | n/a |
| 4 | trd-adr | — | No TRD ADR overturned — client-only CSS/markup fix, no architecture decision recorded in the TRD to supersede. | — | n/a |
| 5 | digest-update | — | No recurrence of an existing `docs/specs/kaizen/` lesson found (checked for prior "position: sticky"/"compositing"/"pr-dialog"/"scrolling ancestor" entries — none). | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
