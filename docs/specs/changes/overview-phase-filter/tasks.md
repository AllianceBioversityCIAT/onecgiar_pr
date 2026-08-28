# Tasks: Overview Phase Filter

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Depth** | Standard · Approval Mode gated |
| **Status** | Draft — pending Phase 3 approval |
| **Date** | 2026-08-28 |
| **Budget** | 5 tasks · ~520 LOC · 5 review rounds (design.md §11) |

## 2. Task Graph

```
OPF-T-1 (server ToC versionId) ──┐
OPF-T-2 (client API wrappers) ───┼──▶ OPF-T-3 (resolver + loaders) ──▶ OPF-T-4 (selector UI + states) ──▶ OPF-T-5 (switch tests + live HITL)
        (T-1 ∥ T-2: disjoint packages)
```

---

## OPF-T-1 — Server: version-row ToC override + `versionId` on the ToC family

- **Status:** `[x]` · **Size:** M (~140 LOC) · **Depends:** none
- **Requirements:** OPF-R-6 (all clauses), OPF-R-3 (absent-param clause, server side)
- **Design:** design.md §6, §7, DD-2
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Scope:** `reporting-toc-context.service.ts` (version-row override path), `results-framework-reporting.service.ts` (3 methods take normalized optional versionId), `results-framework-reporting.controller.ts` (3 routes gain the query param, normalized exactly like `getProgramIndicatorContributionSummary` — the exemplar). No other endpoint touched.
- **Tests:** unit specs — (a) override with versionId 34 returns that row's `phase_year` + `toc_pahse_id`; (b) **diverging-axis fixture (KZ-TCM-1): two version rows sharing `phase_year` with different `toc_pahse_id`** — a year-equality implementation returns the wrong ToC phase and fails; (c) absent versionId hits the existing `resolve()` path with identical output; (d) non-numeric/unknown versionId → 4xx; (e) any touched raw SQL asserts placeholder-count === params length (KZ-W12-1).
- **Verification:** `npx jest --silent --reporters=summary --forceExit src/api/results-framework-reporting` (server pkg). **Failing input the gate can see:** fixture (b) — wrong impl picks the other row. **Disqualifier:** green suites with fixture (b) absent or with both rows sharing `toc_pahse_id` prove nothing — the fixture MUST make wrong ≠ right; a run where the new specs never executed (path typo, describe.skip) is not evidence.
- **Done:** 3 routes accept the param, defaults byte-identical, specs above green, lint clean.

## OPF-T-2 — Client: `versionId` on the four API wrappers

- **Status:** `[x]` · **Size:** S (~60 LOC) · **Depends:** none (∥ T-1, disjoint package)
- **Requirements:** OPF-R-6 (client emission), OPF-R-3 (absent ⇒ no param emitted)
- **Design:** design.md §6, §8 (loaders)
- **Skills:** `angular-developer`
- **Scope:** `results-api.service.ts` only — optional `versionId` on `GET_ScienceProgramsProgress`, `GET_2030Outcomes`, `GET_IntermediateOutcomes`, `GET_TocResultsByAowId`. Mimic `GET_IndicatorContributionSummary` (~:1428): append `versionId=` **only when a finite number**.
- **Tests:** wrapper specs assert (a) URL contains `versionId=34` when passed 34; (b) URL contains **no** `versionId` for `undefined`, `null`, and `NaN` — the NaN case is the failing input a lax `if (versionId)` misses… actually `if (versionId)` also drops 0; assert NaN/undefined excluded AND a finite value included.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage src/app/shared/services/api` (client pkg). **Disqualifier:** asserting only the happy path (param present) cannot fail for the emission bug this task exists to prevent; both directions must be asserted.
- **Done:** 4 wrappers parameterized, absent-param URLs byte-identical to today, specs green.

## OPF-T-3 — Dashboard-lab: selection signal, single resolver, loaders rewired, per-phase caches

- **Status:** `[x]` · **Size:** L (~180 LOC) · **Depends:** OPF-T-2 (and OPF-T-1 for live behavior, not for compile)
- **Requirements:** OPF-R-2 (all clauses), OPF-R-4 (all clauses), OPF-N-1, OPF-N-3
- **Design:** design.md §8, DD-1, DD-3, DD-4
- **Skills:** `angular-developer`, `tdd`
- **Scope:** `dashboard-lab.component.ts` — `selectedVersionId` signal (null = follow Open, reset on program change/init); `effectiveVersionId` computed that ALSO reads `reportingPhaseVersion()` (KZ-W12-2 — the tracked-read comment pattern already in the file at :372 is the exemplar); rewire the four loader paths (`refreshSelectedSummaries`, `loadBilateralRows`, ToC loaders, meter refetch-on-selection per DD-3) to consume it; extend the `code::versionId` Map-cache pattern (`summaryCacheKey` exemplar) to bilaterals and ToC stores; renders read only the current key (DD-4).
- **Tests:** component specs — (a) default path: no selection ⇒ same calls as today, **zero extra requests** (OPF-N-1: assert call counts); (b) selection 34 ⇒ every loader called with 34; (c) **A→B→A with different fixture data per phase** (KZ-TCM-1 axis): final render shows A's data, B's response arriving late lands invisibly in B's key (OPF-R-4 BUT-clause); (d) cache reuse on return (no refetch, OPF-N-3); (e) late `reportingPhaseVersion` bump converges the default path.
- **Verification:** `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/dashboard-lab`. **Failing input:** fixture (c) with per-phase divergent data — an untracked-signal or single-key implementation shows B's data under A. **Disqualifier:** fixtures where phases A and B carry identical data cannot distinguish stale from fresh — such a green is not evidence; mocks missing `reportingPhaseVersion` (the hotfix-a1 blindness) disqualify test (e).
- **Done:** one resolver feeds all loaders, `loadBilateralRows` reactivity gap closed, specs above green, lint clean.

## OPF-T-4 — Selector UI + per-card loading/empty states

- **Status:** `[x]` · **Size:** M (~90 LOC) · **Depends:** OPF-T-3
- **Requirements:** OPF-R-1 (all clauses), OPF-R-5 (all clauses), OPF-N-2
- **Design:** design.md §8 (Selector, States), DD-5, DD-6
- **Skills:** `angular-developer`, `frontend-design`
- **Scope:** `dashboard-lab.component.html/.scss` + minimal `.ts` glue — PrimeNG select in the Overview header band; options from `sp.versions` sorted `phaseYear` desc, label "«phaseName» · «phaseYear»", "Open" tag where `versionId === reportingCurrentPhase.phaseId`; per-card loading state while the current key fetches; existing empty states wired for sparse phases. Tokens per `docs/ux-ui/design.md` §7 — assert token *names*, not resolved values (jsdom returns '' — KZ-SPO-1 precedent).
- **Tests:** (a) options exclude phases absent from `sp.versions` (OPF-R-1 BUT); (b) Open tag only on the active phase row; (c) empty-phase fixture renders each card's empty state, no thrown errors (OPF-R-5).
- **Verification:** same dashboard-lab Jest command. **Presence-assertion caveat (recorded):** a rendered `<p-select>` in jsdom proves presence, not operability or visual correctness — those are defect class **D4, owned by the HITL visual check in OPF-T-5**, not by this task's gate.
- **Done:** selector renders with correct options/default/tag, empty states verified by fixture, specs green, lint clean.

## OPF-T-5 — Switch-hardening tests + live HITL verification

- **Status:** `[x]` *(Leader-inline, owner-approved compression; switch-hardening tests were delivered inside T-3/T-4)* · **Size:** M (~50 LOC tests + probe script reuse) · **Depends:** OPF-T-3, OPF-T-4
- **Requirements:** OPF-R-3 (regression clauses), OPF-R-2 Scenario (live), defect classes D3 + D4 (requirements.md §8)
- **Design:** design.md §3, §8
- **Skills:** `angular-developer`, `systematic-debugging` (if the probe diverges)
- **Scope:** (1) full scoped suites both packages; (2) **authenticated live probe** (in-memory JWT pattern from W12 — secrets never printed): each of the 5 endpoints called with explicit `versionId` of a closed phase and with none, comparing counts against the Results tab filtered to that phase; (3) prepare the HITL checklist: SP04 default view identical to the 11-baseline, switch to Reporting 2025, verify all four cards move together, switch back.
- **Verification:** scoped Jest summaries + probe outputs (status codes + counts). **Failing input:** a probe against a closed phase whose Results-tab count ≠ endpoint count; HTTP 500 on any explicit-versionId call (the exact W12 live-failure class unit suites cannot see). **Disqualifier:** probe run against a stale local server process (the W12 confounder) — re-verify the server build stamp before trusting any probe; counts compared against a *different* phase's Results tab are not evidence.
- **Done:** suites green, probe 200s with matching counts, HITL checklist presented to the owner at the gate.

---

## 3. Coverage Map (clause granularity)

| Requirement clause | Owner |
|---|---|
| R-1 default + options + BUT no-foreign-phases + Open marker | T-4 |
| R-2 all-cards re-scope + ToC context + BUT no-mixed-phase + loading | T-3 (data) / T-4 (loading UI) / T-5 (live) |
| R-3 identical default + no dup requests + suites green | T-3(a) + T-5 |
| R-3 absent-param server default | T-1(c) / T-2(b) |
| R-4 round-trip + cache reuse + BUT no-stale + AND IT MUST signal pairing | T-3(c,d,e) |
| R-5 empty states + BUT no broken chart + selector usable | T-4(c), T-5 HITL |
| R-6 explicit versionId + version-row derivation + BUT absent default + 4xx | T-1(a,b,c,d) |
| R-7 (MAY) | Deferred — DD-5, not owned; recorded gap, not a defect |
| N-1 zero extra requests | T-3(a) |
| N-2 a11y semantics | T-4 (component semantics) + T-5 HITL |
| N-3 cache reuse | T-3(d) |

## 4. PR / Landing Strategy

Estimated **~520 LOC** → above the 400-LOC single-PR comfort line. Recommendation: land as **two logical commits on the spec branch** (1: server T-1, 2: client T-2..T-5), merged to `performance-refactor` together per the team's current cadence. If the team requests PRs: PR-1 server (reviewable standalone — contract + specs), PR-2 client (depends on PR-1), each description leading with what-to-review-first per `cognitive-doc-design`.
