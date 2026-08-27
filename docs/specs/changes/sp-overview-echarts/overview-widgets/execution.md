# Execution Log: `changes/sp-overview-echarts/overview-widgets`

## Document Control
- **Spec Path:** `docs/specs/changes/sp-overview-echarts/overview-widgets/`
- **Owner:** j.cadavid@cgiar.org
- **Started:** 2026-08-27
- **Branch:** `qa-development-2026` (spec branch — shared-file write discipline applies)
- **Triad:** Leader (Claude Fable 5, T1) · Implementer `akili-implementer` wrapper (sonnet, T2) · Reviewer `akili-reviewer` wrapper (opus, T3)
- **Approval Mode:** gated (user asked for "fast and efficient" pacing; no explicit pre-approval mandate recorded)
- **Budget (design.md §1):** 4 tasks / ~600 LOC / 1–2 review rounds
- **Leader decisions at start:**
  - Order strictly serial T-1 → T-2 → T-3 → T-4 (all touch `program-overview.component.*`).
  - Skills: `angular-developer` all tasks; `tdd` on T-1 and T-3 (vocabulary/matrix logic); `ui-ux-pro-max` on T-3/T-4 (chart cards).
  - Effort: `medium` for all (well-specified Standard tasks); bump per rework rule.

---

## Task Execution History

## Task `OVW-T-1` — Link payloads and navigation in the parent (`dashboard-lab`)

- **Status:** PASS · **Date:** 2026-08-27 · **Attempts:** 2
- **Implementer:** `akili-implementer` (sonnet) · skills `angular-developer` + `tdd`
- **Reviewer:** `akili-reviewer` (opus) · lens checklist

### Attempt 1 — effort `medium` → Reviewer `STATUS: FAIL`
- **Files:** `dashboard-lab.component.{ts,html,spec.ts}`, `program-overview.component.{ts,spec.ts}` (+280/−35). Leader mid-task adjustment: added the `openResults` output **declaration** in `program-overview` so the parent's `(openResults)` binding compiles under `strictTemplates` (jest could not see it — the parent spec overrides the template to `''`); `ng build` added to the verification set.
- **Verification (Implementer):** jest 480/480 suites, 6763 tests; lint clean; `ng build` clean (pre-existing warnings only); singular-origin grep 0 hits.
- **Reviewer FAIL (verbatim issue):**
  1. **Discovered Issue:** The slot→`status_name` mapping is asserted for only three of the six slots (`in-progress`, `in-qa` link-null only, `not-started` fallback). `submitted`, `approved`, `discontinued` have no assertion; the `discontinued` appended-segment branch is newly modified code with its own `statusNameOf`/`linkOf` call site and is invisible to the suite. **Violated Rule:** `tasks.md` §OVW-T-1 → OVW-R-1 *Status segment / legend* "AND IT MUST map every slot → spec over all 6 slots" (requirements.md:76). **Remediation:** one test with non-zero counts on ids 1–6 asserting per slot key both `statusName` and `link.status` in a single `toEqual`.
- **ADVISORY (recorded, not gating):** `linkOf` could yield `{status:''}` for an id outside the catalogue with a blank wire name (unreachable today); `onOverviewLink` navigates on an empty intent — consider early return.

### Attempt 2 — effort `high` → Reviewer `STATUS: PASS`
- **Change:** one test added, no implementation change — `'maps every one of the six status slots (incl. the appended discontinued slot) to its own statusName + link'` (ids 1–6 at non-zero counts, single ordered `toEqual` over `[key, statusName, link.status]` triples, discontinued last).
- **Verification (Implementer):** jest 480/480 suites, **6764 tests**; lint clean; diff-stat same 5 files (+304/−35).
- **Reviewer verdict:** `STATUS: PASS` — "The six-slot mapping is now asserted end to end, including the separately-coded discontinued branch, and the rework touched only the spec file — every other file is bit-identical to the version I already audited." Reviewer verified non-regression structurally via unchanged blob hashes on the other four files.
- **ADVISORY (carried, not gating, not tasked):** guard `linkOf` against an empty resolved name; early-return in `onOverviewLink` when no key maps.

- **Requirements covered:** OVW-R-1 (Category W1/W2 BUT NOT origin / AND IT MUST NOT other params; Category W3 + center AND IT MUST plural / BUT Not specified; Status segment THEN status_name / AND IT MUST all 6 slots / BUT zero-count) · OVW-R-5 (parent side: URL from sibling #1 constants, one `navigate`).
- **Decisions:** Leader added the `openResults` output declaration to T-1 scope (compile safety under `strictTemplates`; T-2 wires it). `ng build` added to the gate for this task.
- **Issues:** 1 rework round (test coverage of the MUST clause), within the 1–2 round budget.
