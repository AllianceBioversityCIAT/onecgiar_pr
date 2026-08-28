# Execution Log: Overview Phase Filter

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Mode** | fast & efficient (owner directive 2026-08-28): scoped verification only, no full-suite reruns; guardrails recorded, never silent |
| **Leader** | Claude Fable 5 (session main) — writes no code |
| **Started** | 2026-08-28 |
| **Budget (design §11)** | 5 tasks · ~520 LOC · 5 review rounds |

## Task Entries

### OPF-T-1 — Server: version-row ToC override (attempt 1: in flight)
- Implementer spawned (akili-implementer wrapper, effort high) ∥ with T-2 — disjoint packages, width 2.
- Brief: pointers to OPF-R-6/R-3, design §6/§7/DD-2; exemplar `getProgramIndicatorContributionSummary`; KZ-W12-1 + KZ-TCM-1 copied.

### OPF-T-2 — Client: API wrappers versionId (attempt 1: in flight)
- Implementer spawned (effort medium) ∥ with T-1.
- Brief: exemplar `GET_IndicatorContributionSummary` (~:1428); both-directions URL assertions required.

### OPF-T-2 — attempt 1 → PASS (2026-08-28)
- Implementer report: 4 wrappers parameterized mimicking `GET_IndicatorContributionSummary`; both-directions URL tests per method (present finite / NaN omitted); scoped Jest 7 suites · 426 tests green; `ng lint --quiet` clean (direct eslint invocation unavailable — no flat config; fallback pre-authorized in brief).
- Reviewer verdict: **PASS** — guard byte-identical to exemplar, `?` vs `&` correct per method (verified against live file, diff hunk headers were misleading), absent-param URLs byte-identical, `year` back-compat intact.
- ADVISORY (recorded, no rework): (1) a `null as any` case would pin nullable-signal callers if T-3 holds one — deferred to T-3's fixtures; (2) `typeof === 'number'` redundant with `Number.isFinite` — kept deliberately for exemplar-parity; consolidate only if a helper is ever extracted.
- Landed: commit below (pathspec-only, KZ-CVT-1).

### OPF-T-1 — attempt 1 → PASS (2026-08-28)
- Implementer: `resolveByVersionId` in reporting-toc-context.service.ts (+71) derives `{phase_year, toc_pahse_id}` from the version row (`WHERE v.id = ?`); `resolveTocContextForRequest` in the RFR service routes versionId vs legacy year (versionId wins); 3 controller routes gain the param; +437 spec lines across 3 spec files. Scoped Jest 17 suites · 166 tests green; lint clean.
- Reviewer: **PASS**, all 7 audit points held. Key adjudications:
  1. **`is_active` semantics cleared** — soft-delete flag (VersionBaseEntity), NOT the open-phase flag (`status`); `findVersionPhaseById` matches `$_findPhase` (versioning.service.ts:190) exactly, so closed phases resolve. Not a bug.
  2. **Exemplar deviation accepted** — OPF-R-6's 4xx clause beats design §6's "normalize like the exemplar": the exemplar's silent NaN→undefined fallback is precisely the empty-200 class R-6 forbids. Requirement wins over exemplar (recorded precedence).
  3. **Assertion-arity edit adjudicated, not rework** — controller spec `toHaveBeenCalledWith(..., '2024', undefined)` forced by Jest arity on the new trailing optional; no behavior change; D5 gate independently intact.
- ADVISORY (recorded, no rework): (1) `Number()` parity coercion on `phase_year` — latent, costless, candidate for T-5 touchup; (2) stronger diverging-axis fixture variant (branch on SQL shape) if T-5 revisits; (3) exemplar endpoint now the odd-one-out on garbage versionId (silent fallback vs 400) — follow-up candidate, OUT of this spec's scope; (4) legacy-year validation precedence unreachable via our client.
- Landed: commit below (pathspec-only).

### OPF-T-3 — attempt 1 (report received, remediation in flight)
- Implementer: +191/-47 component, +279 spec; `selectedVersionId` signal, `effectiveVersionId` resolver (tracked `reportingPhaseVersion()` read), 4 loaders rewired (incl. `loadBilateralRows` W12 gap closed), `bilateralRowsByKey` / 3-segment `tocCacheKey` / `meterOverlayByKey` Map caches; tests (a)-(e) incl. a red→green non-vacuity check of (c). Scoped Jest 403/403; lint + tsc clean.
- **Not Done / Assumptions (verbatim gist):** `tocVersionForKey()` gates on `selectedVersionId() !== null` component-wide — a closed-phase selection on Overview would silently scope the Planned/Reporting tabs' shared ToC loaders too. Flagged for Leader decision.
- **Leader adjudication:** real design gap (requirements §4 scope = Overview only; hidden state on other tabs). Fixed at the resolver (DD-1): new `activeSelection` computed = selection only while `rfrView()==='overview'`; consumed by both `effectiveVersionId` and `tocVersionForKey`; selection itself persists across tabs (DD-5 unchanged). Test (f) required. Remediation dispatched to the same Implementer before Review (no attempt consumed — scope gap, not a FAIL).
- **Remediation delta (same attempt):** `activeSelection` computed = `rfrView()==='overview' ? selectedVersionId() : null` — single gate consumed by `effectiveVersionId`, `tocVersionForKey`, `latestVersion` overlay check and the overlay effect; `selectedVersionId` untouched (persists across tabs). Test (f) added with a Subject-backed `route.data` (view switch → default phase everywhere, switch back → 34 without re-selection); non-vacuity verified red→green. Scoped Jest 404/404, lint + tsc clean. Reviewer spawned on the full diff (838 lines).
- **Reviewer verdict: PASS** — single resolver confirmed (every phase consumer derives from `effectiveVersionId`/`activeSelection`; tracked read first); one view-gate; test (a) asserts call counts; test (c) holds B's Subject until after return to A with divergent fixtures (`IND-A`/`IND-B`); test (e) uses a real signal with fallback ≠ real phase; 3 adapted tests mechanical; no `bilateralRows.set/update` or template binding remains.
- ADVISORY → **folded into T-4 as requirements** (per-card states are T-4's scope): (1) meter overlay error/null must render the meter's zeroed state, never fall through to the Open phase row (would create the mixed-phase page R-2 forbids via the error path); (2) positive test for the DD-3 overlay effect (select 34 → `GET_ScienceProgramsProgress(34)` fires); (3) `phaseLabel` eyebrow must reflect the selected phase deterministically (today keys off `allPrograms()[0]`). Recorded only: error results pinned in cache for the session (consistent with the file's `cacheToc` idiom — retry semantics unchanged for ToC, narrowed for bilaterals); `dashboard-lab.toc-map.ts:90` comment still documents the 2-segment key — T-5 touch-up.
- Landed: commit below (pathspec-only).
