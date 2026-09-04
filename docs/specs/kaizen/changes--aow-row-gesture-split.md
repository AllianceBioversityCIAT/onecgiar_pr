# Kaizen — `changes/aow-row-gesture-split`

| Field | Value |
|---|---|
| Spec | `changes/aow-row-gesture-split` · Prefix `RGS` |
| Date | 2026-09-03 |
| Branch Context | **spec branch** (`qa-development-2026`; default pin `master`) — every standardization is recorded pending, none applied |
| Outcome | Complete, 4/4, Reviewer PASS on each |

## Metrics

| Signal | Value |
|---|---|
| Reviewer rework rounds | **3** total: `T-1` 2 FAILs, `T-3` 1 FAIL, `T-2`/`T-4` clean first pass |
| HALT / FATAL_FAIL / Pivot | **0** |
| Budget | ~640 LOC vs ~230 estimated (**278%**); 7 review rounds vs 1 |
| Requirements retired mid-flight | 1 (`RGS-AC-5` second clause) |
| Defects caught by the Reviewer | 4, all would have shipped |
| Defects escaping every automated gate | **1** — D6 layout, found only by the browser pass |
| `/akili-quick` escalations | 0 (this spec); 1 downstream (`clear-filters`) |

## Lessons

### `KZ-RGS-1` — An `ADVISORY` relayed into a rework brief inherits none of the scrutiny a FAIL gets

**Root cause.** `/akili-execute`'s Structured Feedback rule requires FAIL reports to be passed verbatim and unparaphrased, which implicitly subjects them to the Leader's attention. Advisories have no such rule, so the Leader forwarded a READABILITY advisory ("these two class assertions are redundant") into `RGS-T-1`'s rework brief without checking it. Only one of its two claims was true; the other assertion, `hidden`, was load-bearing. Cost: **one full Implementer + Reviewer round**, the single largest avoidable expense in the run.

**Evidence.** `execution.md` → `RGS-T-1` attempt 2 FAIL; the Reviewer identified and corrected its own round-1 imprecision unprompted.

**Target: Methodology.** The gap is in AKILI itself, not this project.

**Proposed standardization** (`.agents/leader.md`, Delegation Discipline — 2 lines):
> An `ADVISORY` carried into a rework brief must be verified by the Leader first. Advisories are the least-vetted findings in a run; the Structured Feedback rule that protects FAIL reports does not cover them, and relaying one unexamined has cost a full rework round.

### `KZ-RGS-2` — An acceptance criterion asserted a property the same spec placed out of scope

**Root cause.** `RGS-AC-5` required "the AoW name never collapses" while `requirements.md` §3 and `design.md` `RGS-DD-3` both put the responsive ladder **out of scope**. The AC was unsatisfiable within its own spec from the moment it was written, and nothing in `/akili-specify`'s checklist compares ACs against the declared non-goals. It surfaced only at `RGS-T-4`, the last task, after the measurement had already been taken.

**Evidence.** `requirements.md` §8 retirement note; `execution.md` → `RGS-T-4`.

**Target: Methodology.**

**Proposed standardization** (`/akili-specify` Verification Checklist — 1 line):
> Every acceptance criterion is checkable against the spec's own §3 Out of Scope: an AC that requires a fix the same document forbids is unsatisfiable by construction and must be rewritten or the scope widened.

### `KZ-RGS-3` — The budget was never re-baselined after scope grew

**Root cause.** `design.md` §8 raised the estimate once (160 → 230 LOC) when the owner added the collapsible section at the design gate, but the *LOC* figure was not re-derived from the enlarged design — only the task count. Actuals landed at 278%. Because `RGS-T-2` and `RGS-T-4` passed first time, the overrun is provably **sizing, not churn**, and the tripwire fired on a number that was stale rather than on genuine excess.

**Evidence.** `design.md` §8; `execution.md` §3 budget tripwire.

**Target: Product** — and specifically the test-to-production ratio: this component's suites run 2–3× its production code, which no estimate in this spec accounted for.

**Proposed standardization** (`docs/specs/general-setup/design.md` budget section — 1 line):
> When scope grows at the design gate, re-derive **all three** budget numbers from the enlarged design, not just the task count — and size the test share from the target component's measured test-to-production ratio.

## Noted, not a lesson

- **Concurrency violation.** A second session wrote to this checkout mid-run (`dashboard-lab.component.ts`, `reporting-aow-table.component.html`), costing the full-directory test signal and forcing path-scoped verification and diffs. Root `CLAUDE.md` already forbids this ("one AKILI session per checkout; extra sessions on `git worktree`") — the rule exists and was not followed, so there is nothing to standardize.
- **Reviewer teammate panes do not terminate on `shutdown_request`.** All three `akili-reviewer` agents acknowledged shutdown in prose and kept running; `TaskStop` killed them instantly. Implementer agents terminated normally. Harness behaviour, not methodology — feedback filed separately.
- **The Reviewer audited the Leader's own reasoning and found a real hole** (`RGS-T-1`'s `truncate` was a clipping ancestor the Leader's first three D6 experiments would not have caught). This worked as designed; recorded as evidence the `author ≠ auditor` gate is worth its cost, not as a defect.

## Pending Items

All await the default-branch apply phase; nothing below was written on this branch.

| # | Kind | Target | Severity | Content |
|---|---|---|---|---|
| 1 | `standardization` | `.agents/leader.md` → Delegation Discipline | **high** | `KZ-RGS-1`'s 2-line rule above — cost one full rework round in this run |
| 2 | `standardization` | `/akili-specify` Verification Checklist | medium | `KZ-RGS-2`'s 1-line AC-vs-out-of-scope check |
| 3 | `standardization` | `docs/specs/general-setup/design.md` | medium | `KZ-RGS-3`'s 1-line budget re-derivation rule |
| 4 | `guide-sync` | `…/components/program-overview/CLAUDE.md` | medium | Record the gesture split (row + identity button filter; `Report`/`→` navigate), the `aria-pressed`/`border-2` selected state, and the collapsible section with `inert`. Its `:510`/`:588` skeleton/row line refs are now stale |
| 5 | `guide-sync` | `…/components/reporting-aow-table/CLAUDE.md` | low | `.pr-collapse` now lives in `src/styles/collapse.scss`, not the component's own `.scss` |
| 6 | `factual-sweep` | root `CLAUDE.md` | low | No falsified factual assertion found this cycle — CodeGraph status, stack and command lines all still true. Recorded as swept, not skipped |
| 7 | `trd-adr` | `docs/trd/trd.md` | low | No ADR overturned. `RGS-DD-1`'s rejection of `role="button"` and `RGS-DD-7`'s `inert`-over-`aria-hidden` rule are component-level decisions, not architecture — no superseding ADR warranted |

**Methodology lessons for upstreaming to the AKILI repo:** `KZ-RGS-1` and `KZ-RGS-2`. Both are gaps in the methodology itself, not in this project.
