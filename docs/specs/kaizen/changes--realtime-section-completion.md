# Kaizen Entry — changes/realtime-section-completion

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/realtime-section-completion` |
| Date | 2026-09-08 |
| Branch | qa-development-2026-ss (spec branch — default branch is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed (original plan) | 4 (`RSC-T-1`..`RSC-T-4`), all superseded by a 2-line fix | tasks.md |
| Reviewer FAIL rework attempts | 4 (`RSC-T-1` attempts 1–3, original budget; +1 on the "fresh P25 budget" attempt) | execution.md |
| HALTs | 1 (`## HALT: RSC-T-1`, 3-attempt ceiling reached) | execution.md |
| FATAL_FAILs | 0 | execution.md |
| Pivots | 2 (`## Pivot Record: RSC-T-1 / RSC-DD-3` — `rd-contributors-and-partners` side effect, resolved into the P25 rescope; `## Second Pivot` — spec re-scoped away from autosave entirely, discarding all prior implementation work) | execution.md |
| PRODUCT_BUGs | N/A — no `/akili-test` phase run | — |
| Validation FAIL / WARN | N/A — no `/akili-validate` phase run | — |
| Drift attributable to this spec | none found | `docs/specs/audits/` holds only a scaffold `README.md` |

## Lessons

- **KZ-changes--realtime-section-completion-1 — A requirement that infers a background-persistence mechanism from a stated outcome needs the mechanism itself signed off, not just the outcome.** (Product + Methodology — dual: the root cause is a generic specify-phase gap, not PRMS-specific)
  - Root cause: `requirements.md`'s original §2 Context reasoned "the indicator only refreshes after a save round-trip, therefore autosave is needed" and built an entire debounced-background-save design around that inference. The user never actually confirmed *autosave* (silent, more-frequent persistence, with its own side-effect blast radius) as the mechanism — only the *outcome* (a live-updating label). This was only surfaced ~a full execution cycle later (3 rework attempts, a HALT, 2 pivots) when the user stated plainly: *"yo nunca pedí un autosave, lo que yo pedí fue que este campo se actualizara..."*
  - Evidence: `requirements.md` §2 Context (original); `execution.md`'s "Second Pivot: spec re-scoped away from autosave entirely" section, quoting the user's clarification verbatim.
  - Standardization: → P1 (local), plus an upstream recommendation (below).

- **KZ-changes--realtime-section-completion-2 — A second Pivot against the same design decision, within one task's rework loop, is itself a signal to re-confirm the design with the user — not just patch the newest exception.** (Methodology — `/akili-execute`'s Pivot Protocol / the Leader persona)
  - Root cause: the first Pivot (`rd-contributors-and-partners`'s email/socket side effect) was patched with a per-section exclusion. The very next Reviewer FAIL (attempt 3) found the *same class* of side effect on a second section (`rd-theory-of-change`) — a second occurrence of the identical design-decision failure (`RSC-DD-3`'s "no section has a save side effect" assumption). The Leader treated it as another exception to patch (the P25 rescope) rather than as a pattern strong enough to ask the user "do you want to reconsider the mechanism itself?" One more full Implementer→Reviewer round (the P25-gate fix, itself FAILed on an `ngOnDestroy` bypass) ran before the user's own unprompted clarification ended the whole approach — a round that a design-level check-in after the *second* same-shaped exception could plausibly have skipped.
  - Evidence: `execution.md` — `## Pivot Record: RSC-T-1 / RSC-DD-3` (first occurrence) immediately followed by attempt 3's FAIL report citing `rd-theory-of-change` (second occurrence, same violated rule: `requirements.md` §3 / `RSC-DD-3`); the "fresh budget" attempt 1 FAIL (`ngOnDestroy` bypass) is the extra round this lesson flags as avoidable.
  - Standardization: → P2 (local).

- **KZ-changes--realtime-section-completion-3 — At least 2 of the 11 Result Detail sections silently email + socket-notify other users on an ordinary save; this was undocumented anywhere before this spec's audit.** (Product)
  - Root cause: no folder guide recorded that `rd-contributors-and-partners` and `rd-theory-of-change`'s save handlers call `ShareResultRequestService.resultRequest(...)` (email + socket notification to contributing-initiative users) whenever the pending-contributor payload is non-empty — a real side effect beyond the green-checks refresh every other section's save causes. A future spec that assumes any Result Detail section's save is side-effect-free (as this one originally did) will rediscover this the hard way.
  - Evidence: `design.md` §12 `RSC-DD-3` (the amended audit, itself independently re-verified by a Reviewer tracing `results-toc-results.service.ts` → `share-result-request.service.ts`).
  - Standardization: → P3 (local).

## Noted, not a lesson

- The Implementer→Reviewer loop caught three genuinely subtle, real bugs during the (ultimately abandoned) autosave work — an Angular effect/view-hook ordering defect, a stale one-shot signal read, and a destroy-time guard bypass. This is the triad working exactly as designed (`author ≠ auditor` catching what a single pass would have missed), not a defect to standardize against. Recorded here only so a future reader does not mistake "lots of rework" for "the review process failed" — it succeeded three times in a row before the scope itself was found to be wrong.

## Pending Items

**Branch Context: spec branch (`qa-development-2026-ss`, default is `master`).** All items below are recorded, not written — no shared file (persona, guide, template, TRD, or digest) was edited by this retrospective. Present to the user now; apply on the default branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` |
| Edit | Add to the Context/Scope section's guidance: "When the mechanism you infer to satisfy a stated outcome has materially larger blast radius than the outcome itself (e.g., persisting data more often or silently, adding a background job, introducing a new side effect) — restate the mechanism back to the user explicitly and get sign-off on it, not just the outcome, before writing `design.md`." |
| Severity | Medium |
| Status | pending |
| Note | Dual lesson — also recommend upstreaming this exact addition to the AKILI methodology repository's own general-setup `requirements.md` template, since the root cause (outcome-vs-mechanism conflation at specify time) is not PRMS-specific. |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (Pivot Protocol section, or the Error Handling § Pivot Protocol in `/akili-execute`) |
| Edit | Add: "If a second Pivot against the same design decision occurs within one task's rework loop, escalate a design-level re-confirmation to the user before dispatching another attempt — do not treat the second occurrence as just another exception to patch." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` (traps table) |
| Edit | Add a trap entry: "`rd-contributors-and-partners` and `rd-theory-of-change`'s save handlers trigger an email + socket notification to contributing-initiative users whenever the pending-contributor payload is non-empty (traced in the archived `realtime-section-completion` spec's `RSC-DD-3`) — don't assume any Result Detail section's save is side-effect-free." |
| Severity | Low |
| Status | pending |
