# Kaizen Entry — bugfix/bilateral-save-pill-not-clearing

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/bilateral-save-pill-not-clearing` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-mc-2 |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | 0 (both failures were `FATAL_FAIL`, which by rule consume no rework attempt) | execution.md |
| HALTs / FATAL_FAILs | 2 `FATAL_FAIL`s (attempt 1, attempt 2) | execution.md |
| Pivots | 2 (`BSP-T-1`, both full Pivot Records) | execution.md — Pivot Record: BSP-T-1 ×2 |
| Checkpoints | 1 (attempt 2, mid-attempt — correctly caught and resolved a real gap) | execution.md |
| PRODUCT_BUGs | 0 (all caught pre-ship) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | 0 / 0 | folded into 3 Reviewer rounds, all `full` depth |
| Tasks closed under `REVIEW_WAIVED` (by flag) | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` (by task) | 0 | execution.md |
| Escaped defects (§3) | 0 | n/a — both FATAL_FAILs caught before any PASS, nothing shipped broken |

## Lessons

- **KZ-bugfix--bilateral-save-pill-not-clearing-1 — A verified exception to a safety rule was treated as a singleton instead of a member of a class; the class had a second, unverified member that broke the rule the same way.** (Product + Methodology, High)
  - Root cause: `design.md`'s original Premise Ledger (attempt 1) correctly carried forward Evidence's `showDraft()` gap (a component-local "unsaved" signal invisible to the autosave service) as a known, accepted exception — but never asked "is Evidence the ONLY section with this shape of gap, or could others exist?" `section-toc.component.ts`'s narrative field has the identical shape (a component-local staging delay invisible to `fieldStatus()`), found only because attempt 2's Reviewer was EXPLICITLY instructed to hunt adversarially for a third gap — it would not have surfaced from a routine review.
  - Evidence: `execution.md` — attempt 2's `FATAL_FAIL` (ToC double-debounce, `section-toc.component.ts:435-453,576-582`); `design.md` P-10 (Evidence, the known instance) vs. P-12 (ToC, the newly-found one) — same shape, discovered one Reviewer-round apart.
  - Why High: this was caught by an explicit, deliberate instruction to hunt ("be adversarial, specifically look for a third gap") — a routine review depth would very plausibly have missed it, since the Reviewer's own first-pass review (attempt 2's initial check before the adversarial ask) did not surface it on its own.
  - Standardization: → P1 (local) and P2 (upstream).

## Noted, not a lesson

- The checkpoint mechanism worked exactly as designed in attempt 2: the Implementer found a real gap (GI-drawer's `'general-info'` vs. `openSectionName()` distinction), correctly identified it as the task's own named Disqualifier condition, and stopped rather than silently working around it — resolved in the same pass with a one-line correction, no attempt consumed. Worth noting as a positive confirmation, not a lesson (the mechanism is already institutionalized).
- Two `FATAL_FAIL`s on the same task, zero shipped defects — a strong, concrete demonstration of the Fail-Fast rule's value under real pressure (a long session, user fatigue risk, pressure to just ship). No process change indicated; recording as a confirmed-working-as-designed data point.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` |
| Edit | In the Premise Ledger section's guidance, add: "When a premise documents a KNOWN EXCEPTION to a safety rule (e.g., 'component X's local state is invisible to the shared check, so X is carved out'), explicitly ask whether the exception is a singleton or a member of a class — grep for the same *shape* of gap (a component-local signal/timer that delays reaching the shared state) across sibling components before accepting the carve-out as closed." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | Propose adding to `/akili-execute`'s Reviewer guidance (or the `reviewer.md` persona): when a design document names an accepted exception to a safety invariant, the Reviewer's checklist should include "does this exception generalize to other components with the same structural shape?" as a standing adversarial check — not only when the Leader explicitly asks for it (as happened here), since a routine review pass would plausibly miss it otherwise. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bugfix--field-card-save-pill-truncation-1` |
| Severity | High (raised from the original's High — second occurrence in the same session) |
| Edit | Recurrence: attempt 1's `FATAL_FAIL` here (the "only the open section has unsaved data" premise, false because `selectSection()` skips its flush during the quality-assessment drawer's `'refreshing'` window) is the same meta-pattern as `KZ-bugfix--field-card-save-pill-truncation-1` — a claim verified against the common/sampled case, not the full reachable state space (there, 2 sampled widths instead of the general CSS Grid guarantee; here, the "normal" navigation path instead of every `isSubmitting()`-gated state). Add this spec as a second source when promoting that lesson to the digest. |
| Status | pending |
