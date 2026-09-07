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

### `BRT-T-3` — Page shell: band mount, toolbar, status chips, KPI strip, URL sync — attempt 1 **FAIL** — 2026-09-07

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), effort high, skills `angular-developer`, `frontend-design` |
| Files (new) | `bilateral-review.component.{ts,html,spec.ts}` (ts 397 / html 359), `bilateral-review.query-params.ts`, `components/bilateral-review-kpis/*`; `bilateral-review.copy.ts` extended (+45) — 8 files, +1378/−1 |
| Verification (Implementer) | `npx jest …/bilateral-review --silent` → Suites 12/12, Tests 304/304 · `npx ng lint --quiet` clean |
| Implementer judgment calls | (a) popover "Clear filters" clears Center/Project/Category; filtered-empty "Clear filters" also resets search + chip. (b) KPI/chip counts over `searchFiltered` only (design §6.2 literal). (c) Expand all / view switch inert against the placeholder (T-4). |
| Reviewer (opus) | **FAIL** — 2 issues (verbatim): **1.** "The match count never renders when a search returns zero rows. `bilateral-review.component.html:57` guards with `@if (matchCount(); as count)`, and `0` is falsy … Violated: R-9, R-4; design §6.2 Toolbar. Remediation: `@if (search() && matchCount() !== null)`; add a spec case asserting `0 matches` renders with the filtered-empty state." **2.** "No test can distinguish the three KPI slots that all read `3` … Violated: tasks.md T-3 Verification (KZ-KCR fixture rule). Remediation: keep the AC-4 fixture; add one all-distinct case to the KPI component spec (e.g. 9/7/4/3/2 → decided 5), asserting each `data-testid` separately." |
| ADVISORY (recorded) | Reliability: `loading` starts `false` → one empty-state paint before the skeleton (init `true`); root-scoped service keeps the previous program's rows during a new fetch (legacy cleared first). Readability: two "Clear filters" controls — split judged acceptable (R-8 binds the popover control; CF-R-1/2 hold on its axes). Counts over `searchFiltered` = design §6.2, conformant. Popover has no focus trap = parity with the exemplar. Deferred to T-4: Editing neutral chip, Expand/Collapse label toggle. INFO: LOC over estimate (397 vs 300, 359 vs 320) — budget tracked in §14 tripwire (added source so far ≈ 1,550 incl. tests? no: source ≈ 1,000; tests ≈ 900). |
| Leader decisions | Both judgment calls (a)(b) accepted as conformant. The two Reliability advisories are two-line fixes on files this attempt already owns → folded into attempt 2 as "advisory fixes" (not new scope; recorded). |

### `BRT-T-3` — attempt 2 **PASS** — 2026-09-07

| Field | Value |
|---|---|
| Implementer | `akili-implementer` (sonnet), effort high (rework) |
| Fix delta | html:51-57 match-count guard `@if (search() && matchCount() !== null)`; ts:115 `loading` starts `true`; ts:257-263 programCode effect clears `tableData`/`tableResults` inside `untracked` before `loadResults`; KPI spec all-distinct 9/7/4/3/2 → decided 5; page spec all-distinct 3/4/2/1/0 → decided 1, `0 matches` assertion, cold-render skeleton test, program-switch clearing test (114 delta lines) |
| Verification | `npx jest …/bilateral-review --silent` → Suites 12/12, Tests 308/308 · `npx ng lint --quiet` clean |
| Reviewer (opus, scoped) | **PASS** — both FAIL issues resolved as specified; advisory fixes correct and minimal (no effect loop, one request per code); only the four named files touched; attempt-1 conformance re-checked on the tree. |
| ADVISORY (recorded) | Reliability: mount without `entityId` would hold the skeleton (latent; route always supplies it). Reliability: badge keeps the previous program's count until the new list lands (rows clear first) — cosmetic, ≤ 1 fetch window. Testability: one placeholder-`li` assertion passes vacuously during the skeleton branch; adjacent assertions carry the proof. |
| Requirements | BRT-R-4, R-6, R-7, R-8, R-9, R-15, R-20, R-31, R-32 (KPI/toolbar wrap); AC-4, 5, 6, 7, 10, 15 (partial), 19 |
| Budget check | Added source so far ≈ 1,000 LOC (T-1 ≈ 200, T-2 ≈ 60 net edits, T-3 ≈ 760 excl. spec); tests ≈ 1,300. Under the 1,500 added-source tripwire; T-4 (~240) + T-6 (~50) projected ≈ 1,300. |
| HITL look #2 | **Deferred to after T-6**: the page has no route until T-6 lands, so it is not reachable in the browser yet. Owner look will happen at the T-6 gate (T-4/T-5 corrections fold into T-7/T-8 if needed). Recorded per KZ-MWB-2 intent. |
| Gate | auto-approved (pre-approved mode). Reviewer rounds for T-3: 2 (second round = fix verification). |

