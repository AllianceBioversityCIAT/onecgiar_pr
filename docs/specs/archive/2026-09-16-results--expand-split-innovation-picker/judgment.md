# Judgment Day — Round 1

**Target:** `docs/specs/results/expand-split-innovation-picker/design.md`
**Scope:** contrasted against `requirements.md` and `proposal.md` in the same folder, plus the real source files the design cites.
**Mode:** blind dual review, two independent judges (general-purpose, read-only), launched in parallel.

---

## CONFIRMED SEVERE (both judges, same underlying flaw)

### F1 — Wholesale replacement of `mergeSplitCatalogue` on each debounced search is unsafe

**Location:** `design.md` §6.2 / §2.2 sequence diagram ("mergeSplitCatalogue replaced with the new page").

Both judges independently flagged the same mechanism as broken, from two different angles:

- **Judge A (stability):** `rd-annual-updating.component.ts` lines 207–229 carry an extensive comment documenting a **previously-fixed NG0103 "could not stabilize" production bug** caused by handing `pr-multi-select` a fresh array reference on every change-detection pass (fixed via a `selectionCache`). The design's plan to reassign `mergeSplitCatalogue` on every debounced keystroke reproduces the exact reference-churn shape that caused that bug, and neither §6.2 nor the Testing Plan mentions this history or a compatibility check.
- **Judge B (data loss):** `selectedTargets()` (`component.ts:277-281`) resolves each stored `target_result_id` by `.find()`-ing it **inside `mergeSplitCatalogue`**, dropping (`.filter(!!option)`) anything not found. If a user selects a target, then types a search term that narrows the catalogue to exclude that already-selected item, the selection silently disappears from the value bound to `pr-multi-select`, and the next change event persists the smaller selection into `generalInfoBody.merge_split_targets` — a real, code-grounded data-loss bug, not a hypothetical.

**Disposition:** CONFIRMED SEVERE — fix required in `design.md` before `tasks.md`.

### Related WARNING (Judge A only, same area — folded into the same fix)

`loadMergeSplitCatalogue()` (`component.ts:183`) is guarded by a private `mergeSplitCatalogueRequested` flag ("fetch once"). Design.md never states whether the new search-triggered fetch reuses this guarded method (which would silently no-op after first load, breaking `SIP-AC-5`) or is a separate call. Must be resolved as part of the F1 fix.

---

## SUSPECT (severity disagreement between judges — not auto-fixed, escalated for a explicit call)

### F2 — `RES-DD-2`'s pivot away from a "new" picker component is reconciled against `proposal.md` but not against `requirements.md`'s own "In scope" wording

- Judge A: WARNING.
- Judge B: SEVERE — argues `requirements.md` is the approved baseline design.md must trace to, and its §3 "In scope" bullet still literally says "a new, purpose-built... picker component"; `RES-DD-2` only argues against `proposal.md`'s Option A, never against this line in the approved requirements doc itself.

**Disposition:** judges disagree on severity of the same fact. Per protocol, this is not treated as an auto-fix, but the underlying fact (unreconciled wording) is real per both judges — recommend a small textual reconciliation in `requirements.md` §3 alongside the F1 fix, decided with the user below.

---

## WARNING / SUGGESTION (info — recorded, not auto-fixed)

| # | Judge(s) | Finding | Location |
|---|---|---|---|
| W1 | B only | `RES-DD-1`'s "reversion challenge" answers only "what code breaks," not the business risk `proposal.md` §11 raised (a submitter could target a mid-review/about-to-be-rejected innovation) — still listed live in `requirements.md` §4 persona table. | `design.md` §12 `RES-DD-1` |
| W2 | B only | `SIP-AC-5`'s only planned test asserts the API was *called* with the search term, not that the rendered list actually narrows — "request sent" ≠ "list correctly narrowed." | `design.md` §10 |
| W3 | B only | Budget (5 tasks / 150–220 LOC / 1–2 rounds) doesn't reserve room for the F1 fix, which adds non-trivial logic + a new test case. | `design.md` "Budget" |
| S1 | A only | `results.controller.ts` line 769 Swagger description ("QA'd or Approved, never discontinued") becomes stale once the filter drops; not listed as a touch point. | `design.md` §5 |
| S2 | A only | No CT/browser check for catalogue-replacement stability, only a spy assertion — same root as F1's test gap. | `design.md` §10 |
| S3 | B only | i18n resolution left as a footnote rather than a blocking sub-task, despite NFR making it a MUST. | `design.md` §6.3/§13 |
| S4 | B only | The manual `limit=50` staging check has no named owner/timing/gate. | `design.md` §8 |

**Verified accurate by both judges (no issue):** the "80 instances / 34 templates" `pr-multi-select` figure, the "exactly two internal usages" of `MERGE_SPLIT_TARGET_STATUS_IDS`, the "no bilateral/platform-report reader of `merge_split_targets`" claim, the quoted info-text strings, and full `SIP-R-*`/`SIP-AC-*` requirement coverage (every ID has a design section or test row).

---

## Round 1 disposition — CLOSED

User decision (2026-09-16): fix F1 directly without a scoped re-judgment round 2; reconcile F2 by updating `requirements.md` §3.

- **F1 — fixed.** `design.md` §2.2/§6.2 rewritten: search path is a new unguarded `searchMergeSplitCatalogue(term)` method (never reuses the fetch-once-guarded `loadMergeSplitCatalogue()`); catalogue reassignment does a selection-preserving merge (currently-selected candidates are kept even if excluded by the search term) and reuses the existing NG0103-fix stable-reference pattern instead of a bare overwrite. Recorded as new ADR `RES-DD-3`. Testing Plan gained two rows (selection-preservation regression test, NG0103-pattern-reuse check) and the Budget was revised (5→6 tasks, 150–220→190–260 LOC, 1–2→2 review rounds).
- **Related guard gap — fixed** as part of F1 (see `RES-DD-3` decision #1).
- **F2 — reconciled.** `requirements.md` §3 "In scope" bullet updated to state the extend-`pr-multi-select` decision explicitly, with a note that it supersedes the earlier "new... component" wording, citing `design.md`'s `RES-DD-2`.

WARNING/SUGGESTION rows (W1–W3, S1–S4) remain `info` per protocol (single-judge, non-severe) — not fixed in round 1. Carried forward as `design.md` Open Gaps / follow-up candidates for a future spec if they resurface.

**No scoped re-judgment (round 2) was run**, per explicit user instruction — fixes above are recorded as applied but not re-verified by a second blind pass.

**JUDGMENT: APPROVED ✅** (round 1, fixes applied without re-judgment, per user direction)
