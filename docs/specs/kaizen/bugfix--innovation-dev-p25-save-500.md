# Kaizen — `bugfix/innovation-dev-p25-save-500`

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Branch context | spec branch (`qa-development-2026-ss` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-08-bugfix--innovation-dev-p25-save-500/` |

## Metrics

| Signal | Value |
|---|---|
| Reviewer FAIL rework | 0 (the spec's own attempt got Reviewer PASS on the first pass — the defect isn't in the review loop) |
| HALT / FATAL_FAIL | 0 |
| Pivot Record | 0 |
| PRODUCT_BUG findings | 0 (the bug itself was correctly diagnosed and independently confirmed closed — just not by this spec's patch) |
| **Implementation drift** | **1, severe** — this spec's own designed-and-Reviewer-PASSed fix (`IDEV-T-1`, an 8-site explicit `qN` guard patch) was never the code that shipped. The bug was independently closed by a teammate's commit (`0f849b61d`, same ticket P2-3557, dated one day *before* this spec's own proposal date) via a structurally different fix (`_saveNestedQuestionGroup`). See `archive-summary.md` §7 for the full reconstruction. |
| Judgment-day severe findings | not run |
| Validation FAIL/WARN | not run |
| `/akili-quick` escalations | 0 |
| Budget | 1 task estimated / 1 actual (on paper) — but the task's actual output was discarded/superseded, so the real "cost" of this cycle is closer to a full diagnosis-and-implementation pass that produced no surviving deliverable |

## Lessons

- **KZ-IDEV-1 — The pre-flight "no conflicting in-flight spec" check only searches `docs/specs/`, so it cannot detect that the SAME defect (and ticket) had already been fixed by a teammate working entirely outside AKILI's own tracking.** (Methodology, High)
  - Root cause: `tasks.md` §2's pre-flight checklist item reads, verbatim: *"No conflicting in-flight spec touching `innovation_dev/` (checked `docs/specs/bugfix/`, `docs/specs/results/` — none found)"*. This check is scoped to `docs/specs/` — it has no mechanism to check git history, open PRs, or the ticket tracker (Jira/`P2-*`) for a fix already landed by someone not using the AKILI workflow for that specific change. The result: this spec's `proposal.md` correctly diagnosed the exact root cause via live repro, `design.md`/`tasks.md` correctly planned a fix, and `execution.md` correctly implemented and Reviewer-PASSed it — all of it wasted effort, because commit `0f849b61d` (same ticket, **P2-3557**, authored by Yecksin Mauricio) had already closed the same defect one day *before* this spec's own proposal date, via a completely independent lineage this session never saw.
  - Evidence: `archive-summary.md` §3/§7 (git log for `innovation_dev.service.ts` showing only `0f849b61d` ever touched this defect, dated 2026-09-02, vs. this spec's own dates of 2026-09-03); `tasks.md` §2's pre-flight checklist line quoted above.
  - Standardization → P1: a bug-mode proposal/spec that names a specific ticket ID (here, none was actually cross-referenced — the ticket number P2-3557 only surfaced later, in the *shipped* commit's message, not in this spec's own `proposal.md`, which recorded "Ticket(s): none provided") should, at minimum, prompt a `git log --all --grep=<slug-derived-keywords>` or an explicit "has anyone already touched this exact method/file recently, on any branch?" check before or during `/akili-specify`'s pre-flight — not just a `docs/specs/` grep. This is a gap in the AKILI methodology's conflict-detection step, not something to fix locally in this project's docs.
  - **This is recorded here for upstreaming to the AKILI methodology repository — no local edit is proposed** (per the skill's own rule: Methodology lessons get no local edit).

## Noted, not a lesson

- The spec's own diagnosis was genuinely correct and independently arrived at the same root cause a teammate had already fixed — this is not a diagnosis failure, it's a coordination/visibility gap. Worth remembering when reading `execution.md`'s Reviewer PASS: a PASS verdict only proves the reviewed patch is internally correct, never that it is the patch that will actually reach production, especially on a fast-moving shared branch with frequent upstream merges.
- This branch (`qa-development-2026-ss`) has several `align with origin/performance-refactor` merge commits in the surrounding period — consistent with a scenario where this spec's own local commit (if one was ever made) was superseded by an incoming merge that already carried the upstream fix. The exact mechanics could not be fully reconstructed from available git history and are not chased further here — the important fact (bug closed, by different code) is already established.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-IDEV-1, Methodology — recorded for AKILI upstream, not a local project edit) | AKILI methodology (`/akili-specify` and `/akili-execute` pre-flight sections, upstream repo) | Add to the pre-flight "no conflicting in-flight spec" check: "This check is scoped to `docs/specs/` and cannot see fixes landed outside AKILI tracking. For a Bug-mode spec, also check whether the target file(s)/method(s) have any commit in the last N days on any reachable branch (`git log --all --since=<window> -- <file>`), and whether the bug report cites or implies an existing ticket ID that might already be closed elsewhere." | High | pending (methodology — not applicable to local shared files) |
| 2 | guide-sync | — | None — no project-local guide needs updating; the gap is in AKILI's own pre-flight procedure, not in this project's `CLAUDE.md`/`AGENTS.md`. | — | n/a |
| 3 | factual-sweep | root guides | No falsified root-guide claims found this cycle. | — | n/a |
| 4 | trd-adr | — | No TRD ADR overturned — no architecture decision recorded in the TRD for this module to supersede. | — | n/a |
| 5 | digest-update | — | No recurrence of an existing `docs/specs/kaizen/` lesson found (checked for prior "drift"/"superseded"/"parallel fix"/"conflicting spec" entries — none). | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch. Item 1 is Methodology-targeted and has no local apply path regardless of branch — it is recorded here for whoever maintains the AKILI-SPECS methodology repository to pick up.)*
