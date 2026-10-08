# Proposal — Default Every System Table To 100 Rows Per Page

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/table-pagination-default-100-rows` |
| Slug | `table-pagination-default-100-rows` — taken directly from the user's own path argument (already kebab-case, no derivation needed) |
| Type | **Change** |
| Approval Mode | `gated` (default — no explicit pre-approval mandate given) |
| Parent Spec | none |
| Depends on | `bugfix/pr-table-paginator-dropdown-select` (shipped, commit `b936ebf2f`) — not a hard dependency, but this change relies on that fix so every table's dropdown *correctly displays* whatever default this spec sets |
| Parallel-safe | n/a (not a spec-family chunk) |
| Date | 2026-10-08 |
| Requested by | M. Giraldo |

## 2. Intent

Make every table in the system that already has pagination enabled default to showing 100 rows per page (instead of each table's current smaller default — 5, 8, 10, or 20 depending on the table), matching the bilateral results table's existing behavior.

## 3. Problem / Current Behavior

This follows directly from `bugfix/pr-table-paginator-dropdown-select` (shipped), which only fixed the paginator dropdown's **visual display** so it correctly reflects whatever `[rows]` value a table is actually bound to — it explicitly left "changing any table's `rows` default or `rowsPerPageOptions`" as a Non-Goal. The user then opened a different table (`programme-results`, under `result-framework-reporting`) and observed it correctly showing "10 of 77" — confirming that table's dropdown is *not* buggy, it is simply configured to default to 10. The user wants that default changed, system-wide, to 100.

**Note on citations below:** these values come from a repo-wide audit run earlier this session (`grep -rn "app-pr-table\|app-pr-group-table" src/app --include=*.html`, followed by a read of each matched file's `[rows]`/`[rowsPerPageOptions]`/`[paginator]` bindings) by a delegated research pass, not re-executed line-by-line by this proposal's author. `/akili-specify`'s Premise Ledger MUST re-verify each cited value with a fresh file:line citation before any task is finalized — treat the table below as a scoping aid, not a citable primary source in its own right.

All pagination in `onecgiar-pr-client` routes through exactly two shared components — `shared/components/pr-table/pr-table.component.ts`/`.html` (`app-pr-table`) and `pr-group-table.component.ts`/`.html` (`app-pr-group-table`); PrimeNG has been fully removed from this codebase. The audit found **25 real consumers** of these two components under `src/app/` (one further file, `bilateral-review-table.component.html`, only mentions them in a stale comment post-migration to a hand-rolled table and was excluded).

| Category | Count | Members |
|---|---|---|
| **Already matches target** — no change needed | 1 | `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html` (`[rows]="100"`, options `[10,25,50,100]`) |
| **`100` already in `rowsPerPageOptions`** — only `[rows]` default needs to change | ~12 | `user-report`, `ipsr/.../results-innovation-output-list`, `ipsr/.../table-innovation`, `ipsr/.../innovation-package-custom-table`, `ipsr/.../update-ipsr-result-modal`, `outcome-indicator/.../indicator-results-modal`, `result-framework-reporting/.../programme-results` (the table the user directly observed), `results-outlet/.../results-to-update-modal`, `results-outlet/.../results-list` (main platform results list), `shared/components/global-completeness-status`, `shared/components/phase-management-table`, `shared/sections-components/links-to-results-global` |
| **`100` NOT in `rowsPerPageOptions`** — options list must gain `100` before the default can be set to it | ~6 | `admin-section/.../user-management` (options `[10,25,50]`), `outcome-indicator/.../eioi-home` (options `[8,12,20]`), `outcome-indicator/.../details-table` (options `[10,20,30,40,50]`), `outcome-indicator/.../wp-home` (options `[8,12,20]` — **uses `app-pr-group-table` with grouped/expandable rows**, `groupRowsBy`/`prTableExpandedRow`), 2 near-duplicate `mapped-results-modal` components (`rd-contributors-and-partners` and `rd-theory-of-change/.../toc-initiative-out/multiple-wps`, both options `[5,10,15]`) |
| **No pagination UI at all** (`[paginator]` unbound → defaults `false`) — **out of scope**, confirmed with user | 6 | `admin-section/.../result-history-of-changes-modal`, `dashboard-lab/.../indicator-drawer`, `dashboard-lab/.../reporting-aow-table`, `entity-aow/.../aow-hlo-table` (grouped+expandable, fully unpaginated today), `aow-hlo-table/.../aow-target-details-drawer`, `aow-hlo-table/.../aow-view-results-drawer` |

Touches `docs/ux-ui/design.md` §5 (table styling rule — unaffected, this is a config value, not a visual change) and `docs/prd.md` `G4` (platform reliability/performance) given the performance flags below. No `docs/prd.md` `AC-*` names pagination defaults directly.

## 4. Proposed Outcome

Every table listed in the "already matches" and "needs default change" categories above (18 tables total: 1 unchanged + 12 default-only + 6 needing options+default, including the 2 small modals per the user's explicit choice to include them) shows 100 rows per page by default. The 6 tables with no pagination UI remain untouched — there is no dropdown or default to change on them.

## 5. Scope

### In scope

- Change `[rows]` to `100` on the ~12 tables that already have `100` in `rowsPerPageOptions`.
- Add `100` to `rowsPerPageOptions` AND change `[rows]` to `100` on the ~6 tables that don't have it yet (`user-management`, `eioi-home`, `details-table`, `wp-home`, both `mapped-results-modal` copies) — **user confirmed both small modals are included**, despite their typically small dataset, for full system consistency.
- Update any existing spec (`.spec.ts`) assertion that pins a table's current default `rows` value (e.g. `expect(component.rows).toBe(10)`) to the new `100`.
- **Explicit manual verification task** for the 3 performance-flagged tables — `results-list` (main platform results, rich cell renderers/exports/row actions), `programme-results` (per-program results, similar rich renderers), and `wp-home` (grouped `app-pr-group-table` with expandable rows — "100 rows" here means up to 100 independently-expandable groups, a different and likely heavier render cost than a flat table) — **user confirmed: proceed with the same change, verify performance/scroll manually afterward, not a hard gate blocking the other 15 tables.**

### Out of scope

- The 6 tables with no pagination UI enabled (`result-history-of-changes-modal`, `indicator-drawer`, `reporting-aow-table`, `aow-hlo-table`, `aow-target-details-drawer`, `aow-view-results-drawer`) — **user confirmed** this scoping explicitly. `aow-hlo-table` and `reporting-aow-table` already render fully unpaginated today (pre-existing unbounded-render risk, not introduced or fixed by this spec) — worth a future look, not this one.
- Deduplicating the 2 near-duplicate `mapped-results-modal` components — apply the same value change to both, do not merge them.
- Any further fix to the paginator dropdown's display mechanism — already shipped in `bugfix/pr-table-paginator-dropdown-select`.
- Changing `rowsPerPageOptions` for any table beyond adding `100` where it's missing (e.g. not rationalizing option lists like `[8,12,20]` → something else).

## 6. Non-Goals

- Virtual scrolling, server-side pagination, or any architectural change to how `pr-table`/`pr-group-table` fetch or render rows — this is a default-value change only.
- Redesigning `wp-home`'s grouped/expandable interaction model, even though it's the highest-risk table in scope.

## 7. Affected Users, Systems, And Specs

**User-facing:** anyone using any of the 18 in-scope tables — result submitters, QA reviewers, PMU leads, platform admins (user-management/user-report), IPSR editors.

**Affected files:** the ~18 table-consumer `.html` files listed in §3, plus their `.spec.ts` siblings wherever a default-`rows` assertion exists (to be enumerated precisely at design time via the Premise Ledger's consumer sweep — this proposal's count is a scoping estimate, not a final list).

**No server, API, or payload surface touched** — purely a client-side template/config change.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: this is a numeric default-value change, not a new visual pattern — no mockup needed. The already-shipped `bugfix/pr-table-paginator-dropdown-select` guarantees the dropdown will correctly *display* whatever default this spec sets.

## 9. Requirement Delta Preview

### MODIFIED Requirements

- Each of the ~12 "default-only" tables: `[rows]` changes from its current value (5, 8, 10, or 20 depending on the table) to `100`.
- Each of the ~6 "needs options update" tables: `rowsPerPageOptions` gains `100` as a new entry, AND `[rows]` changes to `100`.
- Any `.spec.ts` assertion pinning a changed table's old default `rows` value is updated to assert `100`.

### ADDED Requirements

- A manual browser verification step (performance/scroll, no automated gate) specifically for `results-list`, `programme-results`, and `wp-home`.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| A. One spec, Standard depth, tasks grouped by edit-shape | Group the ~18 tables into a handful of tasks by the shape of their edit (e.g. one task for the ~12 "default-only" tables, one task for the ~6 "needs options+default" tables, `wp-home` isolated as its own task given its grouped/expandable risk, plus one manual-verification task for the 3 risk-flagged tables) rather than one task per file. | Keeps traceability (every file still named per task) without inflating to ~18 near-identical tasks. Matches the homogeneity of the change — this is one feature (a consistent default), not 18 distinct decisions. |
| B. Split into multiple specs via `family.md` chunking | Separate specs per category (default-only vs. options-needed vs. `wp-home` risk). | More process overhead (multiple proposal/design/task cycles) for a change that is mechanical and uniform in intent — the Scope Chunking mechanics exist for *multi-faceted* epics, and this is one bounded feature, not several. Rejected for this change. |
| C. Reactive, table-by-table as each is reported | Fix tables one at a time as users notice the old default. | Already declined by the user in favor of a systematic sweep ("todas las tablas del sistema"). |

## 11. Recommended Approach

**Option A** — one spec at **Standard** depth (not Lite: it spans ~18 files across admin-section, ipsr, outcome-indicator, result-framework-reporting, results-outlet, shared, and shared/sections-components — wider breadth than a Lite spec's "narrow UI tweak" category, even though each individual edit is small; not Full: no API/data/auth/migration surface, no architectural risk). Group tasks by edit-shape rather than one task per file, with `wp-home` isolated as its own task given its distinct risk profile (grouped/expandable rows), and a dedicated manual-verification task for the 3 performance-flagged tables.

## 12. Risks, Dependencies, And Open Questions

- **Performance risk (user-accepted, verification planned):** `results-list` and `programme-results` have rich per-row rendering (status chips, action buttons); `wp-home` renders grouped, independently-expandable rows — 100 of either is a heavier page than 100 flat rows. User explicitly chose to proceed and verify manually rather than exclude these tables.
- **Consumer/test sweep:** every changed table's `.spec.ts` must be checked for an assertion pinning the old default — this is the main "redo work" per file, same pattern as `bugfix/pr-table-paginator-dropdown-select`'s own Consumer Sweep.
- **Pre-existing, explicitly out-of-scope risk (informational only):** `aow-hlo-table` and `reporting-aow-table` already render fully unpaginated, uncapped lists today — unrelated to this spec, flagged for a possible future look.
- **Open question:** none blocking — all scope decisions (include the 2 small modals; proceed on the 3 risk-flagged tables with manual verification; exclude the 6 no-pagination tables) were confirmed with the user during this session.

## 13. Success Criteria

- All ~17 changed tables (12 default-only + 6 needing options+default, net of the 1 already-matching bilateral table) default to showing 100 rows per page.
- Every changed table's rows-per-page dropdown correctly displays "100" on load (leveraging the already-shipped dropdown fix).
- No change to any of the 6 out-of-scope, no-pagination tables.
- All affected `.spec.ts` default-value assertions updated and green; `npx jest` and `npx ng lint` clean for every touched file.
- Manual browser/performance spot-check completed and recorded for `results-list`, `programme-results`, and `wp-home`.

## 14. Next Step

```text
/akili-specify changes/table-pagination-default-100-rows
```
at **Standard** depth.
