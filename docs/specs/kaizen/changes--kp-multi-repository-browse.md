# Kaizen Entry — changes/kp-multi-repository-browse

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-multi-repository-browse` · Module code `KPM` |
| Date | 2026-09-14 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `pre-approved` |
| Outcome | 9/10 tasks PASS; T-10 local HITL smoke completed; QA live smoke accepted as post-deploy follow-up |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 10 planned (9 automated, 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 4 (T-5 attempt 1, T-7 attempt 1, T-8 attempt 1, T-9 attempt 1) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| Judgment-day severe findings | 0 | judgment.md |
| PRODUCT_BUGs | 0 automated; 1 pre-existing UI gap noted during HITL (overlay clipping) | execution.md |
| Validation FAIL / WARN | 0 / 0 | archive-summary.md |
| Budget tripwire | Overrun (+1,750 net LOC) accepted as thorough test volume | execution.md |
| Runtime rate limits | 5 worker kills (sonnet/fable 429s) handled by model rotation | execution.md |

## Lessons

### L1 — Partition-based key matching vs transitive-closure clustering for multi-entity deduplication
- **Root Cause:** In `KPM-T-5`, an initial union-find implementation clustered two distinct publications with different DOIs whenever a third DOI-less publication shared the same title. This broke the requirement that different DOIs must never collapse.
- **Evidence:** `execution.md` KPM-T-5 attempt 1 Reviewer audit; `merge.ts`.
- **Classification:** Product + Methodology.
- **Action:** In multi-source entity deduplication, partition by primary unique keys (e.g. DOI) first. Group secondary candidate matches strictly, and only attach an unkeyed entity to a primary cluster if exactly one primary cluster matches.

### L2 — Row-occupancy geometry assertions over container-height checks for responsive wrap verification
- **Root Cause:** In `KPM-T-9`, checking whether container height exceeds one chip height passed trivially at all widths due to container padding (`p-[10px]`), creating a false positive for responsive wrapping.
- **Evidence:** `execution.md` KPM-T-9 attempt 1 Reviewer audit; `kp-cgspace-browse.cy.ts`.
- **Classification:** Methodology.
- **Action:** Verify flex wrapping in component tests by checking the count of distinct bounding rect `top` coordinates across child items (`new Set(tops).size >= 2`) rather than testing aggregate container height.

### L3 — Reference isolation and distinctness assertions in parity regression tests
- **Root Cause:** In `KPM-T-8`, testing equivalence between Browse selection and Manual entry captured references to the same mutable service singleton (`resultBody`), causing `toEqual` to succeed vacuously by object identity.
- **Evidence:** `execution.md` KPM-T-8 attempt 1 Reviewer audit; `report-result-form.component.spec.ts`.
- **Classification:** Methodology.
- **Action:** In parity tests comparing alternate user flows, snapshot captured payloads via deep cloning at emission time and assert `expect(capturedA).not.toBe(capturedB)` alongside structural equality.

## Noted, not a lesson

- **Fixture-First Resilience:** Capturing live DSpace 7 HAL API fixtures for MELSpace and WorldFish prior to implementation revealed unexpected metadata field divergences (e.g. `cg.contributor.center` on MELSpace instead of `cg.contributor.affiliation`), preventing downstream mapping bugs early.
- **Graceful Degradation Contract:** The per-source error classification (`ok`, `timeout`, `error`, `unconfigured`) and ok-only caching ensured that an outage in one repository never delays or degrades results from healthy repositories.

## Pending Items

### P1

```yaml
ID: P1
Spec: changes/kp-multi-repository-browse
Kind: trd-adr
Target: docs/trd/trd.md
Section: Integrations
Severity: low
Status: pending
Content: |
  - Update integrations row to "DSpace Discovery proxy (CGSpace, MELSpace, WorldFish)".
```

### P2

```yaml
ID: P2
Spec: changes/kp-multi-repository-browse
Kind: guide-sync
Target: docs/specs/kaizen/changes--kp-cgspace-browse.md
Section: ## Pending Items
Severity: low
Status: pending
Content: |
  - Mark pending item #1 (server guide env list) as resolved.
```

### P3

```yaml
ID: P3
Spec: changes/kp-multi-repository-browse
Kind: factual-sweep
Target: .agents/model-routing.md
Section: Registry
Severity: low
Status: pending
Content: |
  - Refresh T1 Architect row reflecting active Claude / Gemini generation models.
```
