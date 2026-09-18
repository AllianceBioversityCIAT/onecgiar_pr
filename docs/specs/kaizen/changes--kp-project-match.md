# Kaizen Entry — changes/kp-project-match

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-project-match` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (KPPJ-T-1..3) PASS, 1 attempt each | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 1 (CGSpace `f.project` 400 → "unavailable"; fixed pre-archive) | QA session / live facet audit |
| Judgment-day severe findings | 0 | n/a |
| Validation FAIL / WARN | n/a (no `validation-report.md`) | accepted at archive |
| `/akili-quick` escalation | 0 | n/a |

## Lessons

- **KZ-changes--kp-project-match-1 — Adapter facet names must match live Discovery `/discover/facets`.** (Product, High)
  - Root cause: `repositories.config.ts` mapped CGSpace `facets.project = 'project'`, but CGSpace (2026-09) exposes no `project` facet. Bilateral strict tag filter sent `f.project=…`, CGSpace returned HTTP 400, UI showed "CGSpace unavailable".
  - Evidence: QA session live curl audit; fix removes CGSpace project facet; `cgspace-discovery.service.spec.ts` (a1b) now asserts `f.project` only on MEL/WorldFish.
  - Standardization: → P1, P2.

- **KZ-changes--kp-project-match-2 — Free-text search hits must not be read as project-tag matches.** (Product, Medium)
  - Root cause: Users typed repository free-text labels (e.g. `IRRI - USDA Fertilize Right`) in the search box and saw results plus "No project tags matched", interpreting it as failure rather than "search worked, highlight did not".
  - Evidence: QA session UX review; fixed with Info-styled notice explaining search text vs project highlight vs SP badge.
  - Standardization: → P3.

## Noted, not a lesson

- Rollout manual checks in `tasks.md` §7 still open — staging-only, not blocking archive.
- Post-spec scope grew (responsive filters, drawer subtitle, BMT label copy) without a child spec — acceptable for a `changes/` track on the same branch.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/README.md` |
| Edit | Add: "Before adding a facet to `RepositoryAdapterFacets`, confirm the name exists on that host's `GET /discover/facets` response; omit the key when absent so `translateParams` skips it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — Integrations / DSpace Discovery |
| Edit | Note: CGSpace Discovery has no `project` facet (2026-09); bilateral strict project-tag Solr filter applies to MELSpace and WorldFish only; CGSpace project alignment is client-side highlight on `cg.identifier.project`. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` — UX impact checklist |
| Edit | For client-side "highlight" features paired with search: specify separate copy for (a) full-text search results, (b) highlight match count, (c) zero-highlight Info when items exist. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | codegraph |
| Target | `.codegraph/` |
| Edit | Re-index (`codegraph sync`) after merge so `buildProjectMatchCandidates` and bilateral drawer wiring are visible. |
| Severity | Low |
| Status | pending |
