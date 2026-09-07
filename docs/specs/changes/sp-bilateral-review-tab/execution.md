# Execution Log — `changes/sp-bilateral-review-tab`

## Document Control

| Attribute | Value |
|---|---|
| **Spec path** | `docs/specs/changes/sp-bilateral-review-tab/` |
| **Approval Mode** | pre-approved (owner, 2026-09-07) — routine continue gates auto-pass and are logged here; HALT / Pivot / budget tripwire / FATAL_FAIL stop for the owner |
| **Owner limits** | ≤ 1 Reviewer round per task (second FAIL escalates); targeted `npx jest <path>`; `npx ng lint --quiet`; build only on T-1/T-6; progress line per task boundary; cut offered after T-5 |
| **Budget** | 8 tasks · ~1,200 added source LOC (≈ 600 net) · ~1,900 test LOC · tripwire ~1,500 added source LOC or any third attempt |
| **Leader** | Fable 5.1 (T1) · Implementer `akili-implementer` (sonnet, T2) · Reviewer `akili-reviewer` (opus, T3) |
| **Branch / checkout** | `qa-development-2026` at `87ef89bf8` (Orca worktree); other sessions commit in this checkout — explicit-path commits only |
| **Started** | 2026-09-07 |
| **Environment** | `ng serve` on :4200 (Orca tab proxies :53131) already running; local MySQL reachable (checked earlier this session). Node 22.12 (contract says 20.x — pre-existing, not blocking Jest) |

## Pre-flight (Leader, 2026-09-07)

- `requirements.md`, `design.md` approved; `judgment.md` one pass, 9 severe fixed; OQs resolved; no migration.
- Conflicting in-flight specs: `changes/result-detail-back-rail` (result-detail, disjoint). Last 7 days touched `reporting-program-band` (favorites, hierarchical filters) and `routing-data.ts` (my-work) — all merged; no open worktree on those files.
- Wave 1: T-1 ∥ T-2 (disjoint files; shared dev server is read-only for both; no build during workers).

## Task Execution History

### `BRT-T-2` — Relocate drawer and service; shared access rule — **PASS** (attempt 1) — 2026-09-07

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), effort medium, skill `angular-developer` |
| Reviewer | `akili-reviewer` (opus) — diff `.t2-attempt1.diff` (41 files, +151/−56, renames with `-M`) |
| Files | `git mv` `bilateral-results.service.{ts,spec.ts}` → `pages/bilateral-review/services/`; whole `result-review-drawer/` tree (drawer, interfaces, AGENTS.md, 5 content components, save-changes dialog) → `pages/bilateral-review/components/result-review-drawer/`; import depths fixed in moved files + legacy shell; 4 cross-folder importers re-pointed (`results-list`, `notification-item`, `programme-results` + spec, `dashboard-lab` + 2 specs); new `bilateral-review-access.service.{ts,spec.ts}`; drawer `canEditInDrawer` = `isAdmin \|\| (statusId == 5 && access.isProgramMember(entityId))`; drawer AGENTS.md link depths only. One-line import fix inside T-1's `bilateral-review-count.service.ts` (forced by the move; recorded) |
| Verification | `npx jest <8 paths> --silent` → Suites 42/42, Tests 980/980 · `npx ng lint --quiet` clean · `grep "bilateral-results/"` outside the legacy folder → empty · `git status` shows R/RM renames |
| Requirements | BRT-R-14, BRT-R-18 (relocation + importers), scenario "Non-reviewer" drawer clause |
| Decisions | No service members removed: all 10 trim candidates still used by the legacy shell → deferred to T-6 (per brief rule). |
| Reviewer summary | PASS — every hunk is an import-depth fix inside a rename, a re-pointed importer, or the one sanctioned behavior change; status guard preserved; `canEditDataStandards` untouched; drawer spec cases discriminate. |
| ADVISORY (recorded, no rework) | (1) Reliability: "approve/reject controls absent" is covered via `canEditInDrawer()` only — drawer harness uses `template: ''`; DOM-absence lands in T-7 CT / HITL. (2) Spec hygiene: T-2's literal grep is unsatisfiable while `routing-data.ts:639` still lazy-loads the legacy page (deleted in T-6); the intended importer check passes. (3) Readability: drawer AGENTS.md §3b/§11.2 still inline the pre-refactor body — T-8 guide task. |
| Not Done / Assumptions (Implementer, verbatim) | "The 'approve/reject buttons absent' assertion for member+status_id 6 can only be verified via canEditInDrawer() itself in this spec — the existing spec harness overrides the drawer's template to ''." Leader: accepted as harness limitation, forwarded to T-7. |
| Gate | auto-approved (pre-approved mode) |

> Runtime note (2026-09-07): Reviewer for T-1 attempt 1 died mid-audit ("session limit reached", host account) before emitting a verdict — environment failure, not a work FAIL. Re-spawned once with the identical brief after `/login`; no rework attempt consumed.

### `BRT-T-1` — Band: fifth tab, path, badge, explainer — attempt 1 **FAIL** — 2026-09-07

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), effort medium, skill `angular-developer` |
| Files | `reporting-program-band.component.{ts,html,spec.ts}`, `reporting-program-band.favorites.spec.ts`, `dashboard-lab/services/reporting-guide.service.{ts,spec.ts}`, new `bilateral-review/bilateral-review.copy.ts`, new `bilateral-review/services/bilateral-review-count.service.{ts,spec.ts}` (+161/−14 in band folder) |
| Leader adjudication (mid-attempt) | Two pre-existing band `it` blocks hard-coded the 4-tab literal; the brief's "no existing assertion edits" was stricter than BRT-R-5's intent. Approved updating those two literals (+ "four"→"five" titles). Recorded here so the Reviewer treats it as sanctioned. |
| Verification (Implementer) | `npx jest <band + dashboard-lab/services + bilateral-review/services> --silent` → Suites 7/7, Tests 215/215 · `npx ng lint --quiet` clean · band html hunk at 257–283, `@if (showToolbar())` at 379 |
| Reviewer (opus, re-spawned after runtime death) | **FAIL** — 1 issue (verbatim): "`bilateral-review.copy.ts` exports `tabLabel` and `badgeAriaLabel(n)`, but the band template consumes neither. Line 276 … hardcodes `Bilateral review` and line 280 hardcodes `[attr.aria-label]=\"bilateralReviewCount() + ' pending review'\"`. Only `explainer` is actually wired. Violated: design.md §6.2 'label from copy'; §6.3 'Copy: bilateral-review.copy.ts'. Remediation: expose the map on the component and bind both strings." Everything else conformed (DOM order, anchor clone, badge gating, `ensure()` guard, count service semantics, `stepTabs` untouched, spec edits limited to stub + adjudicated literals + new `it`s). |
| ADVISORY (recorded) | Reliability: `refresh()` during an in-flight request lets two responses race (last write wins). Readability: `count(code)` allocates a `computed` per read; "centralised" spelling in the copy docstring. |

### `BRT-T-1` — attempt 2 **PASS** — 2026-09-07

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), effort high (rework), skill `angular-developer` |
| Fix delta | `reporting-program-band.component.ts:~126` `readonly copy = BILATERAL_REVIEW_COPY`; html `:276` `{{ copy.tabLabel }}`, `:280` `[attr.aria-label]="copy.badgeAriaLabel(bilateralReviewCount()!)"`; copy docstring "centralized" |
| Verification | jest (band + dashboard-lab/services + bilateral-review/services) → Suites 7/7, Tests 215/215 · `npx ng lint --quiet` clean · diff stat: 5 files, +179/−14 |
| Reviewer (opus, scoped re-review) | **PASS** — FAIL resolved; copy file has no dead members; one html hunk (254–288) closes before `@if (showToolbar())` at 379; only the two adjudicated `it` blocks changed; DOM order / `preserve` / `fact_check` / badge gating / 7 tour steps all hold. |
| Requirements | BRT-R-1 (tab), R-2, R-3, R-5, R-19, R-20; AC-1, AC-2, AC-3, AC-16; scenario "Sibling tabs unchanged" |
| Decisions | Adjudicated literal update of two pre-existing tests (see attempt 1). Reviewer count for T-1: 2 rounds (owner limit ≤ 1 exceeded by one narrow copy-binding round; recorded, not escalated — second round was the fix verification, not a new defect). |
| Gate | auto-approved (pre-approved mode) |
| HITL look #1 | see below |

**HITL look #1 (Leader, Orca browser, SP02 Reporting tab, viewport 1280 → 1536 CSS px):** DOM tabs = `Overview, Reporting, Results, Bilateral review, My results`; badge `aria-label` = "143 pending review" (SP02 has 143 W3 rows, all pending — consistent with the legacy page's "All Centers 143"); toolbar controls unchanged (search, Only pending, Favorites, Catalogue/Remaining, Grouped/All indicators all present; 359 typology chips). Screenshot `scratchpad/hitl1-reporting.png` reviewed by the Leader; owner look pending at the next gate (pre-approved mode: not blocking).

