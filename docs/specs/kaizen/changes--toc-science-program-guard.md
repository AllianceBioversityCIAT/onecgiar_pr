# Kaizen Entry — changes/toc-science-program-guard

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/toc-science-program-guard` |
| Date | 2026-08-31 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (`TOC-SP-T-1..3`) | tasks.md |
| Reviewer FAIL rework attempts | 0 (PASS on attempt 1, all three tasks) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 2, same day, both post-PASS/post-approval corrections (`TOC-SP-DD-3`, `TOC-SP-DD-4`) | execution.md — `## Pivot Record` (×2) |
| PRODUCT_BUGs | n/a (no `test-report.md`) | — |
| Validation FAIL / WARN | n/a (no `validation-report.md`); evidence is inline per-task Reviewer PASS verdicts | execution.md |

## Lessons

None distilled this pass — both Pivots (`TOC-SP-DD-3`, `TOC-SP-DD-4`) recur the exact root cause already captured by the twin `changes/toc-center-guard` spec's `KZ-changes--toc-center-guard-1` (same day, same "counting/threshold rule spanning two state sources approved without a worked example" pattern, same DD-3/DD-4 shape). Recorded as a recurrence, not a duplicate lesson — see Pending Items P1.

## Noted, not a lesson

- Reviewer ADVISORY: `requirements.md` §7 NFR mandates the alert string go through i18n, but `design.md`/`tasks.md` explicitly approved a hardcoded string matching sibling notes — a spec-doc internal conflict that survived to archive uncorrected in `requirements.md` (accepted, recorded in `archive-summary.md` §7). Below the lesson bar alone; feeds recurrence if a future spec in this component repeats an NFR/design conflict.
- Reviewer ADVISORY: the guard only covers the delete handlers, not the `app-pr-multi-select` dropdown-untick path — consistent with the approved scope (`TOC-SP-DD-1`), not a defect, but a partial-enforcement gap worth a follow-up spec if it recurs elsewhere.
- `rd-contributors-and-partners/CLAUDE.md` length against the 120-line cap (`COMPONENT-DOCS.md`) — pre-existing overrun before this spec, same condition already noted in the twin spec's entry (`changes--toc-center-guard.md`); still unresolved after two specs' worth of dated entries added to the same file.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--toc-center-guard-1` |
| Edit | Add `changes/toc-science-program-guard` as an additional source spec (same-day twin, same root cause: counting/threshold rule spanning two state sources approved without a concrete worked example, causing two same-day post-approval Pivots — `TOC-SP-DD-3`/`TOC-SP-DD-4` mirroring `TOC-C-DD-4`/`TOC-C-DD-5`). Severity stays High (two independent recurrences on the same day strengthens, does not weaken, the case for P1's standardization). |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep candidate (deferred — see note) |
| Target | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md` |
| Edit | Compaction pass needed against the 120-line cap in `onecgiar-pr-client/docs/COMPONENT-DOCS.md` — now carries dated entries from three specs (`lead-center-full-catalog`, `toc-center-guard`, `toc-science-program-guard`). Not a root-cause lesson (no rework/pivot caused by it), recorded here only so it is not lost; a dedicated pass should size and execute the compaction rather than a 1–3 line edit. |
| Severity | Low |
| Status | pending |
