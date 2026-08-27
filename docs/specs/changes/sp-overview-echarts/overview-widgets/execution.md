# Execution Log: `changes/sp-overview-echarts/overview-widgets`

## Document Control
- **Spec Path:** `docs/specs/changes/sp-overview-echarts/overview-widgets/`
- **Owner:** j.cadavid@cgiar.org
- **Started:** 2026-08-27
- **Branch:** `qa-development-2026` (spec branch — shared-file write discipline applies)
- **Triad:** Leader (Claude Fable 5, T1) · Implementer `akili-implementer` wrapper (sonnet, T2) · Reviewer `akili-reviewer` wrapper (opus, T3)
- **Approval Mode:** gated for OVW-T-1; **pre-approved (j.cadavid@cgiar.org, 2026-08-27)** for OVW-T-2 → OVW-T-4 ("continue T-2→T-4 sin pausas") — routine continue gates auto-pass and are logged; HALT / Pivot / budget tripwire / FATAL_FAIL still stop.
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

## Task `OVW-T-2` — Navigable rows/segments in `program-overview` + deliberate spec rewrite

- **Status:** PASS · **Date:** 2026-08-27 · **Attempts:** 1
- **Implementer:** `akili-implementer` (sonnet) · effort `medium` · skills `angular-developer`
- **Reviewer:** `akili-reviewer` (opus) · lens checklist

### Attempt 1
- **Files (3):** `program-overview.component.{ts,html,spec.ts}` (+156/−53 incl. Leader's `execution.md` Approval-Mode edit, which is Leader bookkeeping — confirmed mine; the user authorisation quoted there is verbatim: "continue T-2→T-4 sin pausas").
- **Changes:** `emitLink(link)` → `openResults.emit` only (no `inject()`, no Router); rows `[disabled]="!bar.link"` + `(click)`; Tailwind `disabled:` variants; `#comingSoon` template + outlets removed (`NgTemplateOutlet` import dropped); meter slices get a transparent full-slice overlay `<button>` when linked (keeps `div.h-[44px] > span.pr-figure-sm` assertion T-4 requires unchanged); legend items button/span by link.
- **Five pinned assertions rewritten by name:** h2 order (unchanged, 6 — T-3 extends), `svg===0` (unchanged — T-3 replaces), `button[aria-label]` count → linked rows + linked segments, "rows disabled" → inverted (only `Not specified` disabled), "Coming soon" → 0. **New:** emission payload via `openResults.subscribe`; disabled row emits nothing (DOM + `emitLink(null)`); zero-count legend not a button; boundary asserted by source grep (Angular 21 `Router` is `providedIn: 'root'`, so a DI-absence test would be inert — Reviewer accepted as the correct replacement).
- **Deviations adjudicated (Reviewer):** (a) overlay button per slice — accepted, better reading of the spec; (b) `aria-label` → `null` on the disabled `Not specified` row — accepted, inside the sanctioned "non-button row" option, accessible name still "Not specified N"; (c) grep boundary test — accepted.
- **Verification (Implementer, full suite):** jest 480/480 suites, **6769 tests** (+5); lint clean; `ng build` OK; `grep -c "Coming soon"` template → 0; diff limited to the three files.
- **Reviewer verdict:** `STATUS: PASS` — "the five pinned assertions are rewritten by name with new expected values, the 'Coming soon' chips and the unconditional `disabled` are gone, every linked row/segment/legend item is a real keyboard-native button emitting one typed `OverviewLink`, and the presentational boundary holds."
- **Presence caveat (DoD 3, recorded):** `button` presence + `aria-label` prove markup only — that a click actually lands on the Results tab with the right chips is **not** proven here; it is OVW-AC-3 (manual/T6 after T-4).
- **ADVISORY (recorded, not tasked):** `hover:brightness-95` on the transparent overlay is inert (tint the overlay or use `group-hover`); slice `aria-label` uses wire vocabulary ("Editing") while tooltip/legend use the slot label ("In progress") — consider `segment.label`; boundary grep could be `not.toMatch(/@angular\/router/)`; no explicit `focus-visible` ring on rows/overlays (`--pr-focus-ring` exists); add a comment on the conditional `aria-label` pointing at OVW-DD-3.
- **Requirements covered:** OVW-R-1 (*No "Coming soon" left*; *Status segment / legend* BUT zero-count; *Category row* real button) · OVW-R-5 (child side: BUT NOT navigate from inside).
- **Gate:** continue → **auto-approved (pre-approved mode)**.
