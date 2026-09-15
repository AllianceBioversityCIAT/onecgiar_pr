# Archive Summary — Browse Knowledge Products across CGSpace, MELSpace and WorldFish

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kp-multi-repository-browse` |
| Module Code | `KPM` |
| Archived Path | `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse/` |
| Archive Date | 2026-09-14 |
| Final Status | `executed` — Tasks T-1..T-9 `[x]`, T-10 docs/config `[x]`, local stack HITL smoke `[x]`, QA live smoke accepted as post-deploy follow-up |
| Branch | `qa-development-2026` (spec branch — default pin `master`) |
| Approval Mode | `pre-approved` (routine gates auto-approved) |
| Owner | Juan Carlos Cadavid |

---

## 2. Outcome

The Knowledge Product (KP) Browse panel across all three creation/reporting surfaces (`lab-report-form`, `aow-hlo-create-modal`, `report-result-form`) now searches across **three** CGIAR knowledge repositories simultaneously: **CGSpace**, **MELSpace**, and **WorldFish Digital Archive**.

Users can filter by individual repository, keep multiple active, or search all at once. The server handles parallel fan-out, per-source caching, failure isolation, and facet unions. Duplicate items across repositories are automatically collapsed using normalized DOI and title/type/year heuristics, displaying primary badges and "Also in <Repo>" notes. If a repository fails or times out, healthy results are served with a non-blocking retry notice.

---

## 3. Requirements Delivered

| Requirement | Description | Evidence / Verification |
|---|---|---|
| `KPM-R-1` | Source strip with 3 toggle chips, lead-in text, all selected on open | `KPM-T-6` unit tests, Cypress CT |
| `KPM-R-2` | Selection rules: last chip non-interactive with `aria-disabled`, "Select all" toggle, debounced search re-run | `KPM-T-6` unit tests |
| `KPM-R-3` | Unified search across selected repositories with facet translation | `KPM-T-4`, `KPM-T-6` unit tests |
| `KPM-R-4` | Merged list with per-item repository badges, round-robin ordering, and dynamic counter | `KPM-T-5`, `KPM-T-7` unit tests |
| `KPM-R-5` | Cross-repository deduplication (DOI match priority, title/type/year fallback, primary survivor order) | `KPM-T-5` (20 tests), `KPM-T-7` unit tests |
| `KPM-R-6` | Per-repository counts and unavailable status badge with explanatory tooltip | `KPM-T-6`, `KPM-T-7` unit tests |
| `KPM-R-7` | Partial results rendering with inline retry button per failed source; error state only when all fail | `KPM-T-7` unit tests, HITL Run B |
| `KPM-R-8` | Server search contract: `repository` list param, `sources[]` status array, 8s timeout, ok-only caching, no host/secret leaks | `KPM-T-2`, `KPM-T-4` unit tests |
| `KPM-R-9` | Facet union for `itemtype` and `affiliation` with normalized label merging | `KPM-T-4` unit tests |
| `KPM-R-10` | Fixture-first API capture of MELSpace and WorldFish responses | `KPM-T-1` fixtures & README |
| `KPM-R-11` | Copy generalization across browse component, hosts, and server messages; validated via gate script | `KPM-T-8`, `scripts/kp-copy-gate.sh` |
| `KPM-R-12` | Selection parity: *Use this item* maps `itemUrl`, triggers MQAP sync, produces identical `POST_createResult` payload | `KPM-T-8` parity tests |
| `KPM-R-13` | Graceful degradation for unconfigured repository base URLs (`unconfigured` status) | `KPM-T-4`, `KPM-T-10` unit tests |
| `KPM-R-14` | Distinct UI states: idle, loading, results, results + partial notice, empty, and error | `KPM-T-6`, `KPM-T-7` unit tests |
| `KPM-R-15` | External detail link host allow-list for CGSpace, MELSpace, WorldFish, and Handle.net | `KPM-T-7` unit tests |
| `KPM-R-20` | Dynamic *Load more* pagination based on `page.hasMore` | `KPM-T-4`, `KPM-T-7` unit tests |
| `KPM-R-21` | Selection state persistence across tab switching inside active drawer session | `KPM-T-6` unit tests |
| `KPM-R-22` | Structured server telemetry logging `kp.discovery.search` without URL or query leaks | `KPM-T-4` unit tests |
| `KPM-R-23` | Accessible live region announcements for search counter and partial failures | `KPM-T-7` unit tests |

All acceptance criteria `KPM-AC-1` through `KPM-AC-17` were verified and fulfilled.

---

## 4. Files Changed Summary

### Server
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/repositories.config.ts` (new) — Adapter registry and parameter translation.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/merge.ts` (new) — Interleave, DOI/title normalization, and key-partition deduplication.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/merge.spec.ts` (new) — 20 test cases verifying merge and deduplication.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.service.ts` — Parallel fan-out, error classification, ok-only caching, telemetry.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.service.spec.ts` — 31 test cases covering fan-out, timeouts, caching, and facet union.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/cgspace-discovery.mapper.ts` & `.spec.ts` — Adapter-driven mapping from DSpace 7 HAL nodes.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/dto/*` — DTOs for `repository` queries, sources, and merged page metadata.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/*` — Captured HAL fixtures for MELSpace and WorldFish.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.controller.ts` & `.spec.ts` — Swagger annotations and query pipe updates.
- `onecgiar-pr-server/src/api/results/results-knowledge-products/results-knowledge-products.service.ts` & `.spec.ts` — Neutral sync message copy.
- `onecgiar-pr-server/serverless.yaml` — Added `MELSPACE_DISCOVERY_URL` and `WORLDFISH_DISCOVERY_URL` environment variables.

### Client
- `kp-repositories.constants.ts` (new) — Repository configuration, statuses, and host allow-lists.
- `kp-cgspace-browse.component.ts`, `.html`, `.spec.ts` — Source strip, selection signals, badges, retry notices, counter.
- `kp-cgspace-browse.cy.ts` (new) — Cypress component test covering 1536 / 840 / 375 px viewports and wrapping.
- `results-api.service.ts` — Added `repositories` parameter support to facet and search endpoints.
- `aow-hlo-create-modal.component.{ts,html,spec.ts}` — Generalized repository copy and selection banner.
- `lab-report-form.component.{ts,html,spec.ts}` & `CLAUDE.md` — Generalized repository copy and selection banner.
- `report-result-form.component.{ts,html,spec.ts}` — Generalized repository copy and selection banner.
- `result-creator.component.html` & `change-result-type-modal.component.html` — Repository-neutral helper text.
- `scripts/kp-copy-gate.sh` (new) — Falsifiable copy gate script preventing regression to CGSpace-only text.

### Documentation & Infrastructure
- `README.md` & `docs/infrastructure.md` — Environment variable documentation for MELSpace and WorldFish.
- `onecgiar-pr-server/src/CLAUDE.md` & `onecgiar-pr-server/AGENTS.md` — Updated discovery proxy integration notes.

---

## 5. Test Evidence Summary

- **Server Unit Tests:**
  - `cgspace-discovery/`: 5 suites / 85 tests passing.
  - `results-knowledge-products/`: 7 suites / 122 tests passing.
- **Client Unit Tests:**
  - KP Browse and host components: 7 suites / 603 tests passing.
  - All test suites verify aria attributes, request parameters, debounce timings, and error flows.
- **Cypress Component Tests (CT):**
  - `kp-cgspace-browse.cy.ts`: 8 passing tests across 1536px (desktop), 840px (tablet), and 375px (mobile) viewports with zero document overflow.
- **Automated Copy Gate:**
  - `scripts/kp-copy-gate.sh`: Exits with code 0 (clean).
- **HITL Local Smoke Test:**
  - Executed on local dev stack (`hitl/hitl-report.md`) with 7 screenshots and 3 `sources[]` JSON captures confirming multi-repo search, badge rendering, graceful timeout handling, and retry mechanics.

---

## 6. Validation Summary

Every task underwent rigorous implementer execution and independent reviewer audit:
- `KPM-T-1`: Captured live fixtures; reviewer confirmed raw DSpace HAL compliance.
- `KPM-T-2`: Adapter registry & DTO validation pipe; reviewer confirmed enum parsing and 400 rejection.
- `KPM-T-3`: Adapter mapper; reviewer confirmed snapshot parity for CGSpace and concrete fixture mappings for MELSpace and WorldFish.
- `KPM-T-4`: Parallel fan-out & ok-only caching; dual-lens reviewer audit (reliability/resilience + risk/security) confirmed zero leak of hostnames or secrets.
- `KPM-T-5`: Merge and deduplication; Reviewer attempt 1 caught transitive-closure bridging bug; attempt 2 introduced partition-based key grouping and passed.
- `KPM-T-6`: Client source strip & selection rules; reviewer confirmed accessible attributes (`aria-pressed`, `aria-disabled`) and debounce behavior.
- `KPM-T-7`: Badges, notice, retry, and host allow-list; Reviewer attempt 1 caught missing badge assertions; attempt 2 added explicit badge assertions and passed.
- `KPM-T-8`: Copy generalization & selection parity; Reviewer attempt 1 caught aliased parity test; attempt 2 implemented true manual sync payload derivation and passed.
- `KPM-T-9`: Cypress CT responsive sweep; Reviewer attempt 1 caught tautological height-only wrap check; attempt 2 asserted row occupancy via `top` coordinates across viewports and passed.
- `KPM-T-10`: Configuration, documentation, and HITL smoke; local stack testing successfully validated all search and failure flows.

---

## 7. Accepted Warnings Or Follow-Ups

1. **QA Live Smoke Follow-Up (`KPM-T-10`):**
   Once the branch is deployed to the QA environment with `MELSPACE_DISCOVERY_URL` and `WORLDFISH_DISCOVERY_URL` configured in AWS Lambda, run the post-deploy live smoke checklist documented in `execution.md`.
2. **Design §13 Follow-Ups:**
   - Remaining CGSpace copy in non-blocking sibling modals (`result-creator.component.html:101`, `change-result-type-modal.component.html:54,58,68`).
   - Partial notice display when results list is empty.
   - Adding `npm run kp:copy-gate` script shortcut in `package.json`.
   - Expanding `normalizeDoi` prefix stripping to include `http://` and `dx.doi.org`.
   - Pre-existing `KPB` loading overlay boundary refinement.

---

## 8. Historical Notes

- **Model Rate Limit Resilience:** Handled multiple session rate limits (sonnet and fable 429s) via structured role rotation while strictly preserving author ≠ auditor separation.
- **Algorithmic Refinement:** Prevented transitive merging of distinct publications sharing generic titles by moving from union-find to strict partition-based grouping by key.
