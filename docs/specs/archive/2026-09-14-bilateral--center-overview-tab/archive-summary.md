# Archive Summary: Bilateral Center Overview Tab

## 1. Document Control

| Field | Value |
|---|---|
| **Original Spec Path** | `bilateral/center-overview-tab` |
| **Archived Path** | `docs/specs/archive/2026-09-14-bilateral--center-overview-tab/` |
| **Archive Date** | 2026-09-14 (execution closed 2026-09-15 ~22:00 Bogotá) |
| **Final Status** | `executed` — 8/8 tasks PASS, 3 HITL findings fixed and independently reviewed; PRs not yet opened |
| **Branch** | `qa-development-2026` (spec branch — shared-file syncs recorded as pending items) |
| **Approval Mode** | `pre-approved` (applied at execute start per project feedback; spec text said `gated`) |
| **Owner** | Juan Carlos Cadavid |
| **Ticket** | `COV-OQ-1` still open — commits carry `[SPEC:bilateral/center-overview-tab]` |

---

## 2. Outcome

A new **Overview** tab, first in the center shell (`/bilateral/:acronym/overview`, Reporting stays the landing), showing five KPI cards and six analytical cards for one reporting phase, all filterable from one controls row and all deep-linked into Reporting / Results / Draft Results so that **every figure equals the destination's visible count** — verified live on AfricaRice for phases 2026 and 2025 with zero unexplained mismatches. One additive server field (`project_id`). Phase shared across the four tabs.

---

## 3. Requirements Delivered

| Requirement | Summary | Evidence |
|---|---|---|
| `COV-R-1` | Overview route + first tab, `**` → `home` unchanged, legacy `'overview'` alias retired | T-6 PASS; live: `/bilateral/AfricaRice` → `/home` |
| `COV-R-2` | Phase selector (P25 reporting phases, Open default, `?phase=` deep link, invalid stripped) | T-5 PASS; H-2 fixed string ids; live `?phase=34` → 2025 |
| `COV-R-3` | Filter popover (6 dimensions), badge, chips, Clear keeps phase, Escape/outside close, keyboard, center-switch reset | T-5 PASS (rework: focus trap added) |
| `COV-R-4` | Controls row sticky inside `#workArea`, one vertical scroll | CT: `top` constant at 1280×720 and 1280×1000; live scrollTop 0→3200 |
| `COV-R-5` | Shared phase via `BilateralContextService.selectedVersionId`, tab links carry `?phase=` | T-2/T-6/T-7; live round trip Overview → Results → Overview |
| `COV-R-6` | Five KPI formulas + deep links | T-3 PASS; live 71 / 1 / 3 / 73 / 3 of 21 reconciled |
| `COV-R-7` | Status meter + tiles (ramp colors, status pills), `Number()` normalization | T-3/T-4/T-5; live tiles sum 71 |
| `COV-R-8` | Needs-attention rules, empty state, zero rows visible | T-3/T-5 |
| `COV-R-9` | By-project bars, not-started chips → Reporting highlight, no-project row | T-3/T-4/T-5/T-7; H-1 fixed highlight (string ids) |
| `COV-R-10` | SP contribution (dedupe per project), links | T-3/T-4/T-5; live 3 · 28 reconciled |
| `COV-R-11` | Type groups by id, unknown → Other, zero types in table | T-3/T-4 |
| `COV-R-12` | Weekly cumulative pace, window bucketing, fallback | T-3/T-4; live footnote "38 created outside the window" |
| `COV-R-13` | One query-param contract + one filter function for all tabs | T-2 (`bilateral-query-params.ts`, `bilateral-result-filter.ts`) |
| `COV-R-14` | Results tab URL-driven, default byte-identical, invalid stripped, column picker local | T-7 PASS on rework (search round-trip guard) |
| `COV-R-15` | Reporting reads `program`/`project`/`multi` (highlight, not filter); Drafts reads `project` | T-7; H-1 |
| `COV-R-16` | Additive `project_id` on center results | T-1; live 71 rows, id/name null-consistent |
| `COV-R-17` | Per-card skeleton / error + Retry / empty; partial failure `0 of N` | T-3 amendment (per-stream errors) + T-5 rework |
| `COV-R-18` | a11y tables, named controls with counts, `aria-current`, focus, reduced motion | T-4/T-5/T-6/T-8; contrast checked by eye only |
| `COV-R-19` | Responsive grid 5 / 3 / 2 / 1, no horizontal scroll, fixed chart heights | CT 5/5/3/1 (after the breakpoint fix); live 1536 / 1080 / 450 CSS px |
| `COV-R-20`–`22` | Constant, cache per key, drafts reuse | T-3 |
| `COV-R-30`/`31` (MAY) | Not scheduled | design §13 |

All 25 `COV-AC-n` closed; `COV-AC-9/12/13/14/20/23` closed live (`execution.md` reconciliation table).

---

## 4. Files Changed (from `execution.md`)

| Area | Files | LOC |
|---|---|---|
| Server | `result.repository.ts` (+14), `.spec.ts` (+30), `results.controller.ts` (Swagger) | ~45 |
| Contracts (new) | `pages/bilateral/bilateral-query-params.ts` + spec, `bilateral-result-filter.ts` + spec, `services/bilateral-center-result.interface.ts`, `bilateral-context.service.{ts,spec.ts}` | ~1,300 |
| Overview (new) | `pages/bilateral-overview/` — `component.{ts,html,scss,spec}`, `components/overview-controls/*`, `aggregate.ts` + spec, `charts.ts` + spec, `fixtures.ts`, `bilateral-overview.cy.ts`, `CLAUDE.md`; `services/bilateral-overview.service.{ts,spec.ts}` | ~5,700 |
| Route + header | `shared/routing/routing-data.ts`, `bilateral-routing.spec.ts` (new), `bilateral-page-header.component.{ts,html,spec.ts}` | ~180 |
| Other tabs | `bilateral-results-list.component.{ts,html,spec.ts}` + `CLAUDE.md`, `bilateral-projects-panel.component.{ts,html,scss,spec.ts}`, `my-draft-results.component.{ts,spec.ts}` | ~1,000 |
| **Total** | 9 commits `909baa5f7` … `e3b473c59` | **~8,300** (budget 1,700 → re-based 5,500 by the user at the tripwire) |

---

## 5. Test Evidence

| Gate | Result |
|---|---|
| Server Jest | `result.repository.spec.ts` 39/39; `migration:check` 0 pending |
| Client Jest (final, Leader) | `src/app/pages/bilateral` + `shared/routing`: **44 suites, 1,284/1,284** |
| Typecheck / lint / build | `tsc --noEmit` clean · `ng lint --quiet` clean · `build:dev` complete (page AOT-compiled from T-6 on) |
| Cypress CT | `bilateral-overview.cy.ts` 2/2 — KPI columns 5/5/3/1 at 1280×720 / 1280×1000 / 900×800 / 375×800, no horizontal scroll, sticky `top` constant at both 1280 heights |
| Perf | 5,000 rows / 200 projects aggregated in 8.35 ms median (7.17 / 8.35 / 9.76), spread 31 % |
| Live HITL | Reconciliation table on AfricaRice (21 rows) + server row count + phase round trip + 6 screenshots in `evidence/` |
| `test-report.md` / `validation-report.md` | **Absent — accepted by the user at archive** (2026-09-15); evidence lives in `execution.md` |

---

## 6. Validation Summary

No `/akili-validate` run. Independent Reviewer verdicts: 14 rounds, 2 FAILs (T-7 search round-trip + missing read-path tests; T-5 projects-error state, popover focus trap, hard-coded shadow), both fixed on the single allowed rework and PASSed; one T-5 round-2 FAIL adjudicated as non-spec (test for a Leader-added item, carried into T-8). Three HITL findings (H-1 highlight id type, H-2 phase id type, H-3 legacy selector look) fixed and PASSed.

---

## 7. Accepted Warnings and Follow-Ups

| # | Item | Home |
|---|---|---|
| 1 | "No bilateral project" row (30) links to the unfiltered Results scope (71) — `COV-R-9` C literal; a `project=none` value would make it reconcile | proposal candidate |
| 2 | `/overview?status=pending` scopes the cards with no chip/badge (`status` is a contract key but not a popover dimension) | proposal candidate |
| 3 | `bilateral-results-list.component.ts` `asCurrentResult` compares `item.id === result.version_id` with string `Phases.id` — change-phase modal "From phase" likely blank | `/akili-quick` |
| 4 | Listbox options need `tabindex="-1"` (single tab stop) — Overview phase control **and** SP Overview scope control | `/akili-quick` |
| 5 | Nine legacy `pi pi-*` icons in `bilateral-projects-panel.component.html` | icon-migration cleanup |
| 6 | `STATUS_KEY_LABELS` duplicated in three files → hoist into the contract | `/akili-quick` |
| 7 | KPI cards / tiles / rows carry only the `--pr-focus-ring` halo (popover controls got the solid border) | `/akili-quick` |
| 8 | CT: add a 700×800 viewport (the 640–899 band the cascade bug governed); replace `cy.wait(200)` with a `scrollWidth` stability poll | next CT touch |
| 9 | `entry()` allocates a computed per call — page calls it once per key (done); document in service | docs |
| 10 | Contrast on pills/hero checked by eye, not measured | `/akili-validate` if run |

Shared-file syncs (design §4 screen row, TRD notes, parent guide index, stale results-list line, model-routing refresh, Tailwind breakpoint rule) are **pending items** in `docs/specs/kaizen/bilateral--center-overview-tab.md` for the default-branch apply phase.

---

## 8. Historical Notes

- **Design corrected three times during execute:** `COV-DD-3` defaults (phase excluded from the "any key" test; explicit `all` values on deep links and Results writes), §6.3 KPI grid classes (named vs arbitrary breakpoints), §6.2 phase selector widget (`app-pr-select` → token combobox/listbox). Each recorded in `design.md` with the date.
- **Gates that earned their keep:** CT caught the Tailwind v4 cascade defect (deck capped at 2 columns) that Jest and two Reviewers passed; the live HITL caught string ids from the projects and versioning APIs defeating strict comparisons in three components (Jest fixtures used numbers); the user's own look caught the legacy selector.
- **Runtime:** ≈ 7 h wall clock; provider session limits killed four workers (sonnet 17:20, session model ~19:00); rotation opus / sonnet / session model kept author ≠ auditor on every round.
- **Budget:** 1,700 LOC estimated, ~8,300 delivered (≈ 60 % tests; the L page task alone 2,600). Tripwire fired after task 4; user re-based with "continue".
- **Concurrency:** two sibling sessions committed in the same checkout during the run (`d32ed78b9`, `aa9a7c904`, `5ac5029a4`); explicit-path commits and the pre-flight rule (T-6/T-7 waited for the header/drafts edits to land) avoided any conflict.
- **Next:** open PR 1 (`909baa5f7` + `7b2ad4144`) and PR 2 (remaining commits) against `staging`; resolve `COV-OQ-1`.
