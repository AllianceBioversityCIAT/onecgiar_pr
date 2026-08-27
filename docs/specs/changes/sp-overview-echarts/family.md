# Spec Family — `changes/sp-overview-echarts`

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/sp-overview-echarts/` |
| **Date created** | 2026-08-27 |
| **Last updated** | 2026-08-27 |
| **Spec-family status** | open |
| **Source proposal** | `./proposal.md` (approved 2026-08-27 by j.cadavid@cgiar.org, 3-chunk split) · follow-on of OpenSpec `p2-3298-3303-overview-breakdown-charts` · unblocks P2-3408 |

---

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `changes/sp-overview-echarts/results-tab-filter-deeplink` | none | yes | pending |
| 2 | `changes/sp-overview-echarts/viz-chart-echarts` | none | yes | pending |
| 3 | `changes/sp-overview-echarts/overview-widgets` | `changes/sp-overview-echarts/results-tab-filter-deeplink`, `changes/sp-overview-echarts/viz-chart-echarts` | no | pending |

**Column semantics** — per `docs/specs/general-setup/family.md`. `Parallel-safe: yes` on #1 and #2 because they touch disjoint files (`programme-results/**` vs `shared/components/pr-viz-chart/**` + `package.json`); #3 edits `dashboard-lab` + `program-overview` and consumes both siblings.

**Closed-set rule:** adding a child requires a HITL-approved edit to this table before any folder is created.

---

## 3. PRMS-specific ordering hints

- All three children are **client-only** (`onecgiar-pr-client`); no migrations, no `/api/bilateral/*` or `/api/platform-report/*` payload changes.
- #2 adds a dependency (`echarts`) to `package.json` / `package-lock.json` — the only shared-file touch; #1 must not edit `package.json`.
- #1 and #2 may run concurrently in separate worktrees (fleet pattern). #3 starts only when both rows read `done`.

---

## 4. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-08-27 | Family created from `./proposal.md` §5 (3 chunks, RICE-ordered) | j.cadavid@cgiar.org (product owner / lead) |
