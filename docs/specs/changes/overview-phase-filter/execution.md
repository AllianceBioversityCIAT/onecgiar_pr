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

### OPF-T-4 — attempt 1 (report received, remediation in flight)
- Implementer: selector via `app-pr-select` (project's real select primitive — **design §8's "PrimeNG select" is stale: PrimeNG is fully removed from the client**; Implementer correctly followed the in-file exemplar; correction recorded, no rework); `phaseSelectorOptions`/`onPhaseOptionSelected`/`loadingMeter`; `phaseLabel` fixed to the selected program; `latestVersion` no longer falls through to the Open row when the overlay is null/loading (T-3 advisory (1) closed) and the same leak fixed in `totalResults(sp)`; 6 tests incl. positive DD-3 wiring (d) and cached-null meter (e). Scoped Jest 410/410; lint + tsc clean.
- **Not Done / Assumptions (4 items, verbatim gist):** (1) no per-card loading input exists on `program-overview` for meter/bilateral cards → page-level spinner only; (2) `app-pr-select` has no programmatic ARIA label (shared-component gap) → `role="search" aria-label` landmark mitigation; (3) tests assert computeds, not rendered DOM (file convention + presence-assertion caveat); (4) `reporting-program-band`'s eyebrow binds `reportingCurrentPhase` directly, untouched (outside file scope).
- **Leader adjudication:** (1) and (4) are spec clauses (OPF-R-2 per-card loading; design §8 eyebrow) → **scope amended**: `program-overview` gains `meterLoading`/`bilateralLoading` inputs mirroring `w12HeatmapLoading`; `reporting-program-band` gains an optional label override input (default byte-identical). Remediation dispatched to the same Implementer before Review; no attempt consumed. (2) accepted residual (OPF-N-2 is SHOULD; shared-component fix out of scope — follow-up candidate). (3) accepted — D4 is the HITL's by design.
- **Remediation delta (same attempt):** `program-overview` gains `meterLoading`/`bilateralLoading` inputs (4 `@if` gates extended with `|| loading()` + `[loading]` on the chart hosts, mirroring the w12Heatmap/tocMap mechanism); `reporting-program-band` gains `phaseLabelOverride` (default `''` ⇒ byte-identical); dashboard-lab wires `loadingMeter()`, new `loadingBilateral` computed, and `phaseLabel()` on both band usages. Tests (f)/(g) added. Scoped Jest 414/414; lint + tsc clean. Reviewer spawned on the full 660-line diff.

### OPF-T-5 — Leader-inline verification (owner-approved compression, 2026-08-28)
- Owner asked "estaba tan complejo el cambio?" → Leader proposed running T-5 inline (verification, not code — permitted for the Leader) to save a spawn; proceeding on that basis.
- **Live authenticated probe** (in-memory JWT from `.env`, secrets never printed; server confirmed fresh — `versionId` honored, so not the W12 stale-server confounder). Version rows: 34 = Reporting 2025 (closed, ToC 9913…), 36 = Reporting 2026 (open, ToC 7baf…).

| Endpoint | `versionId=34` | absent | invalid |
|---|---|---|---|
| `toc-results/2030-outcomes` | 200 · year 2025 · ToC 9913… · 5 | 200 · 2026 · 7baf… · 5 | `abc` → **400**, `9999` → **404** |
| `toc-results/intermediate-outcomes` | 200 · 2025 · 9913… · 0 | 200 · 2026 · 7baf… · 0 | — |
| `toc-results` (AOW01) | 200 · 2025 · 9913… · 10 | 200 · 2026 · 7baf… · 10 | — |
| `indicator-contribution-summary` | 200 · total **32** (editing 32) | (v36) total **11** (editing 10, submitted 1) | — |
| `science-programs/progress` | 200 · SP04 versions `[{34, 2025, total 32}]` | `[{36, 2026, total 11}]` | — |

- Findings: OPF-R-6 holds live (version-row ToC context differs per phase; 4xx not empty-200); OPF-R-3 baseline intact (11 = W12 baseline); **meter = matrix in both phases (32/32, 11/11)** — cross-card consistency (OPF-R-2) verified server-side. `progress` returns exactly one version row per request, confirming DD-3.
- Remaining for T-5: scoped suites after T-4 lands; HITL visual checklist (D4) presented to the owner; `dashboard-lab.toc-map.ts:90` comment touch-up (advisory).
- **Reviewer verdict (attempt 1): FAIL — 2 issues.** (1) **Load-bearing:** `sp.versions` carries exactly ONE row (server pins `filters.versionId`, results.service.ts:1818) → selector structurally inert; test (a) green only via an impossible two-version fixture. Design §8 contradicted design §5 — **spec error owned by the Leader**; design.md §8 corrected in place (option source = `PhasesService.phases.reporting` filtered by the program's portfolio; Open tag from `status`). (2) `phaseLabelOverride` bound unconditionally altered the Reporting-tab eyebrow (out of scope) and the Overview default path (OPF-R-3 violation). 6/8 audit points passed (meter no-fallthrough non-vacuous, per-card loading null-safe, gates regression-free, SCSS scoped/tokenized, scope clean).
- ADVISORY recorded: no Jest run compiles the dashboard-lab template (`template: ''` overrides) → `npm run build` added to attempt 2's gate; `role="search"`→`group`; indentation; ghost "0" under the meter skeleton — HITL glance.
- **Attempt 2 dispatched** (effort bumped to xhigh) with both remediations + real-shape fixture (`sp.versions.length === 1`, ≥2 same-portfolio phases + 1 foreign-portfolio phase) + `selectedPhaseLabel` computed for the conditional override.
- **Attempt 2 delivered:** `phaseSelectorOptions` ← `reportingPhases()` (PhasesService) filtered by `obj_portfolio.id === sp.portfolioId`, Open tag from `status`; `selectedPhaseLabel` conditional override at both band usages; role=group; real-shape fixture (`versions.length===1`, 2 same-portfolio + 1 foreign phase excluded). **Scope addition (Leader-approved):** `shared/interfaces/phasesList.interface.ts` +1 additive line (`obj_portfolio.id?`). Scoped Jest 416/416; lint, tsc, **`npm run build` clean** (pre-existing warnings only). Sent to the same Reviewer for re-audit.
- **Runtime failure:** the attempt-1 Reviewer instance died mid-re-audit (session limit, resets 4pm America/Bogota). Per the Reviewer fallback rule (never inline), a fresh Reviewer was spawned scoped to the 2 remediated issues + delta side effects.
- **Re-review verdict (attempt 2): PASS.** Option source verified end-to-end (PhasesService → `GET /api/versioning` → `relations: {obj_portfolio: true}` → `ClarisaPortfolios.id` on the wire; interface addition additive-only); regression test non-vacuous against the real 1-row payload shape; `selectedPhaseLabel` null-gated at both band usages with a value-level default-path proof; tests (d)/(e)/(e2) not weakened — (e) strictly stronger. Reviewer caveat: read-only wrapper could not re-run commands — Implementer's evidence (416/416, lint, tsc, build) stands, re-confirmed by the Leader's final scoped suites below.
- ADVISORY (recorded as polish follow-ups, no rework): `totalResults()` missing `?? 0` on the overlay branch; redundant `.slice()`; `phaseTagTone` stamped unconditionally; plus the earlier `dashboard-lab.toc-map.ts:90` stale comment. None behavioral.
- Landed: commit below (pathspec-only).
- **T-5 closure (Leader-inline):** final scoped suites green — server RFR **166/166**, client dashboard-lab + shared API **842/842** (19 suites). Live probe evidence recorded above (fresh server verified). Switch-hardening tests were delivered inside T-3 (a–f) and T-4's rewritten block, so no separate Tester spawn was needed. Remaining gate: **owner HITL visual check (D4)** — checklist presented in the session. Task marked `[x]`; the HITL outcome is the archive gate, not a task gate.

## Run Summary (2026-08-28)
5/5 tasks complete. Budget: 5 tasks (5 actual) · ~520 LOC (~1,100 actual incl. the T-4 scope amendments and rewritten tests — overage driven by the Leader's two spec gaps, both recorded) · 5 review rounds (6 actual: T-4 took 2). 1 Reviewer FAIL (T-4 a1 — load-bearing option-source bug caught before ship); 1 Reviewer runtime death (session limit, respawned); 2 pre-review scope remediations (T-3 tab leak, T-4 sibling-component clauses). Commits: a064feadb (spec), b6edef6c5 (T-2), ffe4114bc (T-1), 8f83e29fd (T-3), a57cd2040 (T-4).
