# Kaizen Retrospective: `changes--kp-cgspace-browse`

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/kp-cgspace-browse/` → `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse/` |
| **Archive Slug** | `changes--kp-cgspace-browse` |
| **Date** | 2026-08-27 |
| **Branch Context** | `qa-development-2026` (spec branch) — all shared-file edits recorded as pending |
| **Run Classification** | Rework run (2 Reviewer FAILs, 3 severe Judgment Day findings, 1 concurrency incident) |

## 2. Metrics

| Metric | Target | Actual | Delta |
|---|---|---|---|
| Tasks | 9 | 9 | 0 |
| LOC (incl. tests) | ~780 | ~1,100+ (client spec alone +450) | +40 % (tripwire not escalated — user reviewed) |
| Review rounds | 1–2 | server 2 · client 1 (+ waived re-audit) | within |
| Reviewer FAILs | 0 | 2 (T-4 evidence gaps; client blocking ×2) | +2 |
| Judgment Day severe (confirmed) | — | 3 (path, cache module, year 422 gate) | fixed before tasks |
| HALT / FATAL / Pivot | 0 | 0 | 0 |
| PRODUCT_BUG from tests | 0 | 0 | 0 |

## 3. Lessons

### KZ-KPB-1 (Product) — Verify integration constraints in the *existing* service before designing a selector on top of it
- **Root cause:** design rev 1 treated the reporting-year rule as a UX default; `findOnCGSpace` already enforced a 422 for non-admins (`results-knowledge-products.service.ts:604-673`). Caught only by Judgment Day (JD-3).
- **Evidence:** `judgment.md` JD-3; `design.md` DD-6.
- **Standardization proposal:** add to `docs/specs/general-setup/design.md` §5 one line: "List every validation/throw the downstream service already performs on the data your feature feeds it." → pending item.

### KZ-KPB-2 (Product) — Fixture-first for external APIs
- **Root cause:** the research notes' field names were wrong for CGSpace; a live capture (T-1) settled keys, filter forms and facet shapes in one task and prevented a silent empty-results bug (ISO-timestamp year filter returns 0 hits).
- **Evidence:** `fixtures/README.md`; `execution.md` T-1.
- **Standardization proposal:** `onecgiar-pr-server/CLAUDE.md`: "New external-API integrations start with a recorded fixture task (captured, not hand-written) that pins field names and filter syntax." → pending item.

### KZ-KPB-3 (Methodology) — One AKILI session per checkout is not self-enforcing
- **Root cause:** a second session implemented the spec in the same worktree during `/akili-specify`, then marked `tasks.md` `[x]` without evidence; the Leader discovered it via `git status`.
- **Evidence:** `execution.md` "Concurrency incident"; `.agents/leader.md` concurrency protocol.
- **Upstream suggestion (AKILI repo):** `/akili-execute` Step 0 should diff `git status` against the spec's file list and stop on foreign changes before spawning.

## 4. Noted, not a lesson
- Subagents hit the account weekly usage limit mid-run; the Leader-inline fallback with explicit user approval worked as designed.
- The user's "never run full suites locally" rule was honoured throughout; coverage gate moved to CI.

## 5. Pending Items

| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | guide-sync | `onecgiar-pr-server/src/CLAUDE.md` + `AGENTS.md` (integrations list) | low | Add: "`api/results/results-knowledge-products/cgspace-discovery/` — read-only proxy to the CGSpace DSpace 7 Discovery API (search + facets); MQAP remains the metadata source after selection. Env: `CGSPACE_DISCOVERY_URL` (required)." | pending |
| 2 | guide-sync | `docs/ux-ui/design.md` §8 component inventory | low | Add: "Tabs — `@spartan-ng/brain/tabs` primitives styled with Tailwind (first use: `kp-cgspace-browse`, `KPB-DD-7`)." | pending |
| 3 | factual-sweep | `docs/ux-ui/design.md` §12 | low | Note the accepted `::ng-deep` SCSS exception for `app-pr-select` overrides (`KPB-DD-8`) or add the width inputs and remove it. | pending |
| 4 | trd-adr | `docs/trd/trd.md` integrations / ADR index | low | New integration "CGSpace Discovery API proxy" (no ADR superseded; additive). | pending |
| 5 | standardization (KZ-KPB-1) | `docs/specs/general-setup/design.md` §5 | medium | "List every validation/throw the downstream service already performs on the data your feature feeds it." | pending |
| 6 | standardization (KZ-KPB-2) | `onecgiar-pr-server/CLAUDE.md` | low | "External-API integrations start with a captured fixture task pinning field names and filter syntax." | pending |
| 7 | codegraph | — | — | Re-index (`codegraph sync`) after merge. | pending |
