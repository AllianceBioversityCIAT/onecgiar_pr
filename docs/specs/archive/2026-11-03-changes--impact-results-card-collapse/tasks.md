# Tasks — Impact results card: expand / collapse

## 1. Scope

- **Spec:** `changes/impact-results-card-collapse` (`requirements.md` + `design.md`) · Depth **Lite** · Module `ICC`
- **Owner:** Santiago Sanchez · **Status:** not-started
- **Pre-flight:** requirements approved 2026-11-03 · design approved 2026-11-03 · no open questions · no migration · no conflicting in-flight spec on `impact-results-card`.

## 2. Tasks

### ICC-T-1 — Collapsible Impact results card

| Field | Value |
|---|---|
| Status | `[x]` done 2026-11-03 — Reviewer PASS attempt 1, manual check by user, budget overrun accepted (see execution.md) |
| Size | S (~50 LOC) |
| Depends on | — |
| Requirements | ICC-R-1 (1.1, 1.2), ICC-R-2 (2.1), ICC-R-3 (3.1), ICC-NFR-1, ICC-NFR-2 |
| Design | §2, §3, ICC-DD-1..4 |
| Skills | `angular-developer`, `tailwind-design-system` |

**Scope** (only these files under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/impact-results-card/`):
1. `.ts` — `expanded = signal(true)`, `toggle()`, list id, `NgIcon` + `provideIcons({ lucideChevronDown })`.
2. `.html` — chevron `<button>` first in header (`aria-expanded`, `aria-controls`, `aria-label="Impact results"`, icon `aria-hidden`), `(click)="toggle()"` on `<header>` only, `cursor-pointer`, `border-b` only when expanded, `<ul [id]>` inside `@if (expanded())`. AoW chevron classes (design §3).
3. `.spec.ts` — see Tests.
4. `CLAUDE.md` (folder guide) — replace "chevron" in the ⚠️ prohibition line; add a one-line note on the toggle (ICC).

**Tests** (Jest spec; clause ownership):

| Clause | Assertion |
|---|---|
| 1.1 THEN rows hidden + chevron rotates | after header click: 0 `impact-row`; button `aria-expanded="false"` |
| 1.1 AND click again shows rows 1–5 with counts | second click: 5 rows, names in order, counts rendered |
| 1.1 BUT header must NOT disappear | collapsed: `impact-tag`, title, `impact-new-chip`, "5 Impact Areas · no targets", `impact-total` present |
| 1.1 AND IT MUST keep Total identical | `impact-total` text equal before/after collapse (loaded case) |
| 1.2 THEN expanded on first render | initial: 5 rows, `aria-expanded="true"` |
| 1.2 BUT must NOT persist | no `localStorage.setItem` call during toggle (spy) |
| 2.1 THEN `aria-expanded` flips; `aria-controls` → list id | button click toggles attr; `aria-controls` equals `ul` id while expanded |
| 2.1 AND accessible name contains "Impact results" | button `aria-label` matches /Impact results/ |
| 2.1 BUT chevron not announced | `ng-icon` has `aria-hidden="true"` |
| 3.1 THEN no new counts request | `GET_impactLevelCounts` call count unchanged after 2 toggles |
| 3.1 AND Report emits area id | existing test kept green |
| 3.1 BUT no bar / ratio / % / By AOW | existing negative test kept minus the `ng-icon, [aria-expanded]` clause |
| Enter/Space (2.1 WHEN) | **Gap in jsdom** — covered by native `<button>`; manual check below |

**Verification:**
- `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests <touched .ts files>` → green.
- `npx eslint <touched .ts files> --quiet` → clean.
- CT (existing, single spec): `impact-results-card.component.cy.ts` still green (card defaults expanded). Run alone, never alongside Jest.
- Manual (HITL, local stack, no write buttons): header click + Tab → Enter/Space toggles; chevron aligned at 1280 and 900 px; Total not pushed off-card.

**Would-fail inputs:** seeding `signal(false)` fails 1.2; putting `(click)` on both button and header (double toggle) fails 1.1 second-click; reading `expanded()` inside `rxResource.params` fails 3.1; using `[hidden]` instead of `@if` fails the 0-rows assertion.

**Disqualifiers:** a green run where the toggle tests do not reach `aria-expanded="false"` (e.g. click on a selector that matches nothing) is not evidence — the collapse test must assert both states. A presence check for `ng-icon` proves the chevron exists, not that it rotates or aligns — rotation/alignment is the manual 1280/900 check only. If CT is skipped (suite known red on this branch), say so; do not report it as passed.

**Done when:** all Tests rows green, lint clean, CT green or explicitly reported, manual check recorded in `execution.md`, budget (1 task / ~50 LOC / 1 round) not exceeded.

## 3. Coverage

| Requirement | Scenario / clause | Task |
|---|---|---|
| ICC-R-1 | 1.1 THEN / AND / BUT / AND IT MUST · 1.2 THEN / BUT | ICC-T-1 |
| ICC-R-2 | 2.1 WHEN (manual) / THEN / AND IT MUST / BUT | ICC-T-1 |
| ICC-R-3 | 3.1 THEN / AND / BUT | ICC-T-1 |
| ICC-NFR-1 | tokens / AoW pattern | ICC-T-1 (review) |
| ICC-NFR-2 | 900 px | ICC-T-1 (manual) |
