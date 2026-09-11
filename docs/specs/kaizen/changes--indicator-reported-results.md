# Kaizen Entry — changes/indicator-reported-results

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/indicator-reported-results` · Prefix `IRR` |
| Date | 2026-09-04 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Standard, Change track |
| Outcome | Complete — 5/5 `[x]`, 0 rework rounds, Cypress CT gate green twice, live SP01 PASS |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 | tasks.md |
| Reviewer FAIL rework attempts | **0** (PASS ×4 first attempt; T-5 manual) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` (accepted) | archive-summary §4 |
| Judgment-day severe findings | **1** (`Draft (8)` omitted from the status set) + 2 warnings + 1 info — **inline fallback**, both judge spawns and retries failed on the harness | judgment.md |
| Validation FAIL / WARN | 0 / 1 (grey pill for Approved/Pending Review — spec-conformant, confirmed live) | execution.md T-5 |
| `/akili-quick` escalations | 0 | — |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | source ≈480 vs 320; **tests ≈1 100 vs 450**; total ≈1 600 vs the 1 000 trip → exceeded on test code (third recurrence of `KZ-REH-1`); review rounds 0/0/0/0 vs ≤1 | execution.md Summary, design.md §14 |
| Runtime failures | **7** spawn failures: judges ×4 (pane timeout), T-4 Reviewer ×1 (usage limit) + ×2 (pane timeout); resolved by the rule (retry → escalate → user chose retry → ran) | execution.md T-4, judgment.md |
| Concurrency | a second session committed in the same checkout throughout; no sweep this time (explicit-pathspec discipline held) | execution.md pre-flight |

## Lessons

- **KZ-changes--indicator-reported-results-1 — A mapping copied "verbatim" from another surface must be checked against the value set the new surface will actually feed it.** (Product + Methodology, Medium)
  - Root cause: design §6.2 mandated copying the Results-tab `STATUS_TOKENS` (statuses 1/2/3) as-is, while the same spec's `IRR-R-3` deliberately widened the population to statuses 1/2/3/5/6. Nobody contrasted the map's domain with the new value set: the T-3 Reviewer's advisory predicted the grey Approved pill and T-5 confirmed it live on `#8970`. The gap is spec-conformant (R-2.1's fallback), so no gate could fail — it was a design-time omission, invisible to every downstream check.
  - Evidence: execution.md — `IRR-T-3` ADVISORY (risk / real data); `IRR-T-5` live read A (`#8970` Approved → `--pr-status-not-started-*`); design.md §6.2 *Status pill* row.
  - Standardization: → P1 (local `docs/specs/general-setup/design.md`) · upstream to AKILI (`/akili-specify` Step 2.2 guidelines).

## Noted, not a lesson

- **Test-LOC under-estimate** — recurrence of `KZ-REH-1` (REH → AIS → KCR → IRR, four specs): a 337-line Cypress CT plus 22 DOM tests dwarfed the 450 estimate; source also overran because SHOULD/MAY items were delivered. See P2.
- **Agent-pane creation failures** — new failure mode this run (Orca/tmux `Timed out waiting for split pane handle`), seven times across judgment-day and the T-4 Reviewer. The `/akili-specify` inline-fallback rule and the `/akili-execute` Reviewer-never-inline rule both behaved as designed; the judgment-day inline pass still caught a severe finding. Candidate Methodology note: the Reviewer escalation menu could carry a "retry after N minutes" default, since the runtime recovered on its own. Feeds recurrence.
- **Provider/session-limit worker death** — recurrence (REH ×1, MRF ×3, CVT/OPF ×1, KCR ×1, IRR ×1): the T-4 Reviewer died at its first tool call. See P3.
- **Concurrent session in the same checkout** — recurrence of `KZ-MRF-3`; explicit-pathspec diffs and commits prevented any sweep this time. See P4.
- **jsdom drops `var()` inline styles**, so token-pair assertions cannot read `el.style`; the Implementer probed it and the Cypress CT closed the gap with a live-probe colour comparison. Reusable pattern (`resolveToken` probe) — worth a line in the client test guide if it recurs.
- **Reviewer report truncation** did not recur once briefs asked for `STATUS:` first + a word cap (KCR lesson applied in every brief; one T-4 report was cut only in its last advisory).
- **Second reason class in IRR-R-4.1** ("other phases") had no wording anywhere; the Implementer used the single defined sentence. Spec-authoring slip, recorded.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch. Step 3 of `/akili-archive` found **no** `guide-sync` (both folder guides were updated inside T-5 as spec deliverables — exempt), **no** falsified root-guide claim (`factual-sweep` empty), and **no** affected TRD ADR (`trd-adr` empty).

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` → §6 Frontend Plan / §6.3 Design system usage (append) |
| Edit | Add: "When the design reuses a lookup or token map from another surface (status pairs, type icons, labels), state the **value set this surface will feed it** and confirm the copied map covers every value; a verbatim copy carries the source's blind spots into a surface that may show more states." |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI methodology — `/akili-specify` Step 2.2 design guidelines |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) |
| Edit | Add `changes/indicator-reported-results` as a source (fourth recurrence); note "a real-browser CT gate alone is 300+ LOC — budget it as its own line". Keep Medium. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | MRF P4 / provider-limit resume-pattern row (no `KZ-id` yet — digest absent until apply on `master`) |
| Edit | Add `changes/indicator-reported-results` as a source (Reviewer died at first tool call; re-spawned after the limit reset). |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-3` (two sessions on one worktree) |
| Edit | Add `changes/indicator-reported-results` as a source; note "explicit-pathspec diffs + commits and a `git log -3` check before each commit prevented any sweep on this run — the defence works". Severity stays High. |
| Severity | High |
| Status | pending |
