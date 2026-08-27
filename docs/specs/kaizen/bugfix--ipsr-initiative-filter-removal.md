# Kaizen Entry — bugfix/ipsr-initiative-filter-removal

## Metrics

| Signal | Value |
|---|---|
| Reviewer rework attempts | `IPF-T-1`: 2 (attempt 1 FAIL, attempt 3 REOPEN-before-commit) of 3-attempt ceiling. `IPF-T-2`: 0 (PASS attempt 1). |
| HALTs / FATAL_FAILs | 0 formal, but see REOPENED event below (functionally equivalent — caught before commit) |
| Pivot Records | 0 |
| PRODUCT_BUG findings | 0 formally tagged, but the REOPENED defect (blank/inert filter chips) is the same class |
| Judgment Day severe findings | n/a (no judgment.md for this spec) |
| Validation FAIL / WARN counts | 1 FAIL (attempt 1, undefined-guard gap) — closed attempt 2. 1 REOPEN (real UI defect, both prior PASSes missed it) — closed attempt 3. |
| `/akili-quick` escalations | 0 |
| Drift attributable to this spec | none — file-path citations in `requirements.md`/`design.md`/`tasks.md` were corrected in place (documentation fix, not drift) |

**Result: NOT a clean run.** One lesson distilled.

## Lessons

### `KZ-IPF-1` (Methodology) — Source-level Reviewer audit is necessary but not sufficient for a UI-rendering data-source swap

- **Root cause:** Two independent Reviewer PASSes (`IPF-T-1` attempts 1 and 2) verified the data-source swap by confirming the *correct array reference* reached the consumer (`toHaveBeenCalledWith(scopedArray)` / source-level trace of `updateMyInitiatives`'s implementation) — neither rendered the template nor traced which display field (`.name`) the swapped array's items actually carried. The old array (`myInitiativesList`) was enriched with `.name` in a loop the new array (`myInitiativesListIPSRByPortfolio`) never went through, so the swap shipped correct *wiring* with a broken *render* (blank, inert filter chips) — caught only by the user's real browser check, one task-boundary earlier than the process's own designated manual-verification checkpoint (`IPF-T-2`'s `IPF-OQ-1`).
- **Evidence:** `docs/specs/archive/2026-08-27-bugfix--ipsr-initiative-filter-removal/execution.md`, section "Reopened — 2026-08-27 (real defect found by manual browser verification, before commit)" — root cause paragraph and "Why the automated checks missed it" paragraph.
- **Target:** Methodology (AKILI review process) — no local edit made; classified for upstreaming, not a Product-code fix (the Product-side fix — the missing enrichment loop — already shipped in the same spec).

## Noted, not a lesson

- The `?? []` guard gap (attempt 1 FAIL) is a standard defensive-coding miss with a standard catch (Reviewer traced the reachable path) — not a process gap, just a normal rework cycle.
- Dead getters (`initsSelectedJoinText`, `everyDeselected`) with no consumer in `src/` — a cleanup opportunity, not a defect with a root cause.

## Pending Items

**Kind: standardization** (Methodology-classified lesson — no local edit; recorded for upstreaming to the AKILI methodology repository, per the skill's "Methodology lessons get no local edit" rule)

- Proposed addition to the Reviewer persona's DoD checklist (methodology-level, not this repo's `.agents/reviewer.md` specifically — applies to any AKILI project): for a spec whose fix **repoints a data source feeding a rendered list/table**, the Reviewer's verification MUST include tracing the specific **display field(s)** the template reads from the new source (not only asserting array identity/reference reaches the consumer) — because a swapped array can be wired correctly and still render broken if it lacks a field an old, differently-populated array had. Severity: medium (caught before commit here, but only because the user happened to check the browser before merging — the mandatory-manual-verification gate that should have caught it was one task-boundary later).
- Archived on spec branch `qa-development-2026` (default branch: `master`) — this pending item awaits the default-branch apply phase; no shared file was touched.

**Kind: guide-sync**

- Target: `onecgiar-pr-client/src/CLAUDE.md` §5.2 (top-level state/orchestration services table, `data-control.service.ts` row).
- Proposed lines (verbatim, 1-3 lines): note that `myInitiativesList` (flat, cross-era) vs. `myInitiativesListIPSRByPortfolio`/`myInitiativesListReportingByPortfolio` (already portfolio-scoped) are **not interchangeable** and must be **enriched in sync** (`.role`/`.name`/`.official_code_short_name`) wherever `ApiService.updateUserData()` populates them — a data-source repoint that swaps one array for the other without mirroring its enrichment loop will wire the correct reference but render blank/broken display fields (see `docs/specs/archive/2026-08-27-bugfix--ipsr-initiative-filter-removal/`).
- Severity: medium (exactly the defect class that shipped and was caught only by manual browser check).
- Archived on spec branch — pending the default-branch apply phase; no guide was touched.
