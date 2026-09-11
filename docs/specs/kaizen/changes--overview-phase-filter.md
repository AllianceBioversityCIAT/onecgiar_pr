# Kaizen Retrospective: `changes--overview-phase-filter`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` (archived 2026-08-28) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Delivered with 1 Reviewer FAIL (load-bearing, pre-ship catch), 2 HITL hotfixes, 2 pre-review scope remediations, 1 Reviewer session-limit death (respawned) |

## Metrics
| Metric | Target | Actual |
|---|---|---|
| Tasks / rounds | 5 / 5 | 5 / 6 (T-4 ×2) + hotfixes h1, h2 |
| LOC (budget ~520) | ~520 | ~1,100 (scope amendments + rewritten tests) |
| Runtime failures | 0 | 1 Reviewer death (session limit); 3 idle-without-report nudges |

## Lessons

### KZ-OPF-1 (Product) — wire-shape fixtures: the TYPE axis is a diverging axis
- **Root cause:** `version.id` is a bigint → TypeORM serializes it as a STRING; numeric fixture ids let `versionId: p.id` pass every test while every strict `typeof === 'number'` wrapper guard silently dropped the param in production (hotfix h2). KZ-TCM-1 ("fixture must include the axis that diverges") extends to types, not just values.
- **Evidence:** archived `execution.md` h2 entry; red-proof 421/423 with the normalization reverted.
- **Standardize (pending, spec branch):** one line in `onecgiar-pr-client/src/CLAUDE.md`: "TypeORM bigint columns arrive as STRINGS — fixtures for id-bearing payloads MUST use string ids, and any `typeof === 'number'` guard needs a `Number()` normalization at the value's origin."

### KZ-OPF-2 (Methodology) — a design that cites a payload fact must not contradict it two sections later
- **Root cause:** design §5 recorded "the progress payload carries ONE version per request" and §8 still said "options = `sp.versions`" — the selector would have shipped inert; only the Reviewer's cross-section read caught it. The Correction Closure sweep ran on Adjust rounds but nothing swept *internal* cross-section consistency at design time.
- **Evidence:** T-4 attempt-1 FAIL, execution.md; design.md §8 corrected in place.
- **Standardize:** Methodology (upstream to AKILI repo): design Step 2.4 sizing should include a one-pass "does any section contradict a §5 data-model fact?" check.

### KZ-OPF-3 (Product) — loading computeds must derive from cache-presence, not in-flight sets
- **Root cause:** effects populate in-flight sets AFTER the render a selection write triggers → one frame of data-empty + loading-false → empty states flash instead of skeletons (hotfix h1). The invariant "current key absent from cache ⇒ loading (when a fetch is warranted)" is timing-proof by construction.
- **Evidence:** h1 entry; red immediacy test at spec.ts:1454.
- **Standardize (pending, spec branch):** one line in `dashboard-lab/CLAUDE.md` (fold into queued rewrite): loading computeds read cache-presence, never `loadingXKeys` (those are HTTP de-dup guards only).

## Noted, not a lesson
- The dev-server-serves-stale-bundle confounder recurred (W12's stale dist twin): a broken tree (concurrent session's in-flight type error) froze `ng serve` at the last good build — diagnosis cost ~40 min against correct code. Third recurrence of "verify the running artifact before trusting live behavior".
- Concurrent-session interference recurred despite the one-session-per-checkout convention (foreign uncommitted edits mid-run; trend commit landed mid-diagnosis; LineChart registration done by this session to unblock both). Recurrence noted toward a stronger standardization.
- Idle-without-report subagent nudges: 3 more occurrences (KZ-CVT-2 class).
- The trend feature's `loadProgramResults` is phase-keyed but phase-blind in its fetch — flagged as follow-up for its owner.

## Pending Items
| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | standardization | `onecgiar-pr-client/src/CLAUDE.md` (KZ-OPF-1) | high | Bigint-as-string wire rule + Number() at origin + string-id fixtures. | pending |
| 2 | standardization | AKILI methodology repo (KZ-OPF-2) | medium | Design internal-consistency check at Step 2.4. | pending |
| 3 | guide-sync | `dashboard-lab/CLAUDE.md` + `program-overview/CLAUDE.md` | medium | Fold into queued rewrites: phase selector, `activeSelection`/`effectiveVersionId` resolver, per-phase Map caches, cache-presence loading (KZ-OPF-3), meter overlay, `meterLoading`/`bilateralLoading` inputs, `phaseLabelOverride`. | pending |
| 4 | factual-sweep | root `CLAUDE.md` + `onecgiar-pr-client/CLAUDE.md` | medium | Root guide still says "Angular 21 frontend (PrimeNG…)" — PrimeNG is fully removed from the client (verified in T-4); replace with the custom-fields/`app-pr-select` reality. | pending |
| 5 | digest-update | follow-up proposals | low | Bilateral 81-vs-79 universe cotejo; ToC-family loading view gate; error-test parameterization; pr-select ARIA; exemplar endpoint 4xx alignment; trend fetch phase-blindness. | pending |
| 6 | trd-adr | none | — | No ADR overturned (additive feature). | n/a |
