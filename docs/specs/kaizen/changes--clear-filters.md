# Kaizen Entry — changes/clear-filters

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` · Prefix `CF` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `pre-approved` · Depth Lite |
| Outcome | Complete with accepted risk — 1/1, Reviewer PASS attempt 1; D4/D5 browser gates unmeasured |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 | tasks.md |
| Reviewer FAIL rework attempts | **0** | execution.md §4 |
| HALTs / FATAL_FAILs | 0 (one **environment blocker**: Reviewer spawn failed ×3, cleared on attempt 4) | execution.md §3 |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a — no `test-report.md` (Lite) | — |
| Judgment-day severe findings | none recorded | design.md |
| Validation FAIL / WARN | n/a — no `validation-report.md` | — |
| `/akili-quick` escalations into this spec | **1** (triviality gate correctly refused "cosmetic-only") | proposal.md §1 |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | 257 LOC vs ~140 (**184%**); prod 57 vs 35, test 200 vs 105; review rounds 1 vs 1 | execution.md §2, design.md §6 |
| Defects escaping every automated gate | **unknown** — the two browser-only classes (D4 paint, D5 layout at 4 widths) were never measured | execution.md §5 |
| Spec evidence found false mid-run | **1** — "no clear/reset button, zero matches" | execution.md §2 |

## Lessons

- **KZ-changes--clear-filters-1 — A "verified absent" claim is only as true as the search pattern, and the pattern was not recorded beside the claim.** (Product + Methodology, Medium)
  - Root cause: the Leader's live-page sweep matched `clear|reset|limpiar|all scopes|todos`, then wrote the claim as `clear|reset|all` — a stronger pattern than the one run. Nobody could re-run it because the real pattern lived only in the session. The pre-existing `Show all sections` button was therefore invisible to the proposal, `OQ-2` was put to the owner over an incomplete picture, and the bar now carries a subset control that is redundant in 3 of 4 states (Reviewer adjudication 2).
  - Evidence: execution.md — §2 "A factual error in this spec's own evidence"; §4 adjudications 1–2; proposal.md §3 / requirements.md §2 (corrected in place at archive).
  - Why it is not `KZ-002` (methodology: "aggregate claims are grep-falsified, not trusted"): that rule makes the *auditor* re-grep; this one makes the *author* leave a re-runnable pattern so the audit is possible at all.
  - Standardization: → P1 (local) · upstream to AKILI (`/akili-propose` Problem/Current Behavior guidance).

- **KZ-changes--clear-filters-2 — A browser-only gate needs a capability probe in Pre-Flight, not a first attempt at close.** (Product + Methodology, Medium)
  - Root cause: `tasks.md` §2 pre-flighted "a runnable app" — the wrong capability. D4 needs real keyboard modality (`:focus-visible` is never satisfied by programmatic focus) and D5 needs a viewport that actually resizes; the session's driven tab could do neither (`innerWidth` pinned at 1653 across every `orca viewport` call; `keypress Tab` never moved focus), although `RGS-T-4` had driven the same control one day earlier. The gap was discovered after the task closed, so the only honest outcome left was "inconclusive". A 60-second probe before `CF-T-1` started would have routed the check to a human or another host while the work was still open.
  - Evidence: execution.md §5 (D4 attempt table, D5 `--height` silent failure then pinned width); tasks.md §2 pre-flight; requirements.md §8 D4/D5 rows.
  - Related, not the same root cause: `KZ-changes--overview-aow-cross-filter-1` fixes DoDs that omit the *condition*; here the condition was fully specified and the *capability* to produce it was never checked.
  - Standardization: → P2 (local) · upstream to AKILI (`task.md` template Pre-flight).

## Noted, not a lesson

- **Budget miss recurred (184%) despite applying `KZ-RGS-3`'s ratio rule.** `design.md` §6 sized tests at 2–3× production from measured evidence; actual was 3.5× (200/57), and production itself ran 163% because the focus hand-off needed a `viewChild`. The rule was followed and still under-sized — this component's ratio under a disqualifier-driven test contract is ≥3.5×, not 2–3×. Recorded as `digest-update` P3, not a new lesson.
- **Reviewer spawn failed ×3 on `Failed to create teammate pane: Timed out waiting for the Orca runtime to respond`** with `orca status` healthy; succeeded unprompted on attempt 4. The Leader correctly refused to review inline and committed the code as *pending audit* with the checkbox withheld — the `author ≠ auditor` rule held under pressure. Harness behaviour; second pane anomaly in two days (see `changes--aow-row-gesture-split.md`, shutdown ignored). Feeds recurrence.
- **The focus hand-off target paints no indicator** (`All Sections` tab: `focus-visible:outline-none`, no ring). `CF-AC-4` is met literally and its rationale half-delivered. Pre-existing and out of scope; a real product gap, carried as follow-up F2 in `archive-summary.md`, not a methodology lesson.
- **`/akili-quick` escalation worked as designed** — the triviality gate refused a behaviour change dressed as a cosmetic one. Evidence the gate earns its cost.
- **Five identical D5 readings were discarded rather than published** when `orca viewport` failed silently on a missing `--height`. Worth noting as the gate behaving correctly; `requirements.md` §8's "fabricated evidence" clause did its job.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` → §2 Context (evidence guidance) |
| Edit | Add: "A negative-existence claim (*'no X exists — verified'*) MUST quote the exact search command or pattern **and its scope** beside the claim, verbatim as run. A claim whose pattern cannot be re-run is an assumption, not evidence — and a pattern paraphrased after the fact is a different pattern." |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI methodology — `/akili-propose` §3 Problem / Current Behavior |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` → §2 Pre-flight checklist |
| Edit | Add: "For every DoD or closing check with **no automated gate** (browser-only: paint, layout at widths, real keyboard modality), Pre-flight MUST include a smoke probe of the *capability* the check needs — the viewport actually resizes, `:focus-visible` actually becomes true — run **before the first task starts**. A failed probe reassigns the check to a named human or another host while the work is still open; it never becomes 'inconclusive' at close." |
| Severity | Medium |
| Status | pending |
| Upstream | AKILI methodology — `task.md` template, Pre-flight |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-RGS-3` (`changes--aow-row-gesture-split.md`) |
| Edit | Add `changes/clear-filters` as a second source. Recurrence note: "Rule applied (test share sized at 2–3× from measured ratio) and still 184% — `program-overview` suites under a disqualifier-driven DoD run ≥3.5× production; treat 2–3× as the floor, and add a `viewChild`/focus-management allowance to production LOC whenever a control removes itself on activation." Severity stays Medium; recurrence count 2. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/CLAUDE.md` → `## Invariants` + `Verified:` stamp |
| Edit | Add: "**Clear filters** (`CF-T-1`): rendered only while `activeSection() !== 'all' \|\| selectedScope() !== null` (`showClearFilters`, removed from DOM, never hidden). `clearFilters()` sets `activeSection` **directly** (never via `setActiveSection`) and emits `scopeChange(null)`; on success focus moves synchronously to the `All Sections` tab (`allSectionsTabRef`), which is unconditional in the template — keep it that way. Its `ml-auto` is the negation of `Show all sections`' predicate; never give both an auto margin." Re-stamp `Verified:` to the archive commit. **Merge with** `changes--aow-row-gesture-split.md` P4 (same file, differing edits — Decide case at apply). |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | No assertion falsified by this cycle (stack, commands, CodeGraph status, module lists all still true). Recorded as swept, not skipped. The already-queued PrimeNG-removal correction (`changes--kp-cgspace-browse.md`) is untouched by this spec. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | No ADR overturned. `CF-DD-1`…`CF-DD-5` are component-level decisions (DOM removal over hiding, direct signal set, focus hand-off target); `RGS-DD-6` explicitly left standing. No superseding ADR warranted. |
| Severity | Low |
| Status | pending |

**Methodology lessons for upstreaming to the AKILI repo:** `KZ-changes--clear-filters-1` (record the pattern beside a negative-existence claim) and `KZ-changes--clear-filters-2` (capability probe for browser-only gates in Pre-flight). Neither names anything PRMS-specific.
