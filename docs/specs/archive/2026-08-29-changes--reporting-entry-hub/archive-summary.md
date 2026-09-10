# Archive Summary — Reporting Entry Hub

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/changes/reporting-entry-hub/` |
| Archive date | 2026-08-29 |
| Approval mode | pre-approved (owner, 2026-08-28) |
| Final status | **Shipped on branch `qa-development-2026`** — 5/5 code tasks PASS; T-6 deferred (budget); T-7 manual pass open (auth-blocked for agents) |
| Judgment day | 1 pass, fix-only — APPROVED ✅ (`judgment.md`) |
| Commits | `2914f7a24` → `7979a76dd` (16 commits, all `[SPEC:changes/reporting-entry-hub]`) |

## 2. What shipped

A "Where to report" hub on the Science Program Overview: W1/W2 lane (AoW rows + program-level Intermediate/2030, deep links) and W3 lane (my centers × projects funding the program, search-first, Create result with preselection), fed by the new JWT endpoint `GET api/results-framework-reporting/reporting-entry-hub/projects?programId=` (reuses `BilateralProjectsService`, cap 300, per-center `error` degradation). Plus the `onOpenAow` routing fix (`byAow`+`tocAow` for AoW codes) and, from post-execution addenda: KPI-card and lane skeletons, tooltips on truncated names, clickable footer "Report emerging result", AoW context banner with tier-complete stats on the By-AOW view, outcomes tier + working Section filter there, redesigned indicator cards (state chip, labelled progress), compact filters on By-AOW, polished Section dropdown and a Clear-filters button.

## 3. Requirements delivered

REH-R-1…R-10 and REH-R-12 delivered (unit-verified); REH-R-11 (SHOULD, recently-used sort) deferred by its own budget gate; REH-R-13 (MAY) not owned. REH-AC-1…AC-15 covered at unit level; AC-5 end-to-end and AC-14 focus-visibility owed to the manual pass (T-7).

## 4. Files changed (from `execution.md`)

- **Server (new):** `api/results-framework-reporting/services/reporting-entry-hub.service.{ts,spec.ts}`, `dto/reporting-entry-hub-projects.dto.ts`; controller + module edits.
- **Client (new):** `dashboard-lab/components/reporting-entry-hub/*` (component, template, spec, `hub-copy.ts`).
- **Client (edited):** `dashboard-lab.component.{ts,html,spec.ts}` (+`dashboard-lab.hub.spec.ts` new), `program-overview.component.*`, `reporting-program-band.*`, `shared/services/api/results-api.service.ts`, `tests/mocks/ngIconsLucideMock.ts`.

## 5. Test evidence

Targeted suites only (owner mandate): server 10+3+20 green; client 27–102 per touched suite, all green at each commit; `npx ng lint --quiet` and server eslint clean throughout; `ng build --configuration development` 0 errors; no migration. Coverage relies on CI's full run.

## 6. Validation

No `/akili-validate` run (owner skipped; judgment-day pass + per-task opus Reviewer audits stand as the conformance evidence). No unresolved FAIL findings.

## 7. Accepted warnings / follow-ups

1. **T-7 manual browser checklist** (in `execution.md`) — blocked for agents (Cognito rejects the embedded-browser origin; credentials off-limits). Owner to run or provide an authenticated session.
2. `REH-T-6` recently-used sort — deferred (budget), revisit on demand.
3. Advisories recorded, not tasks: `getProjectsByCenter` resolves `institutionId` before `code` (collision risk, pre-existing); `Show all N` label vs 300-cap truncation; `aria-controls` dangles while collapsed; collapsed hub makes `onFocusHub` a no-op (expand-then-focus candidate); `hubIsActivePhase` fails open while the phase overlay is in flight; `Number(id)` normalisation at the creator hand-off if endpoints ever diverge.
4. Type/Category/Status filters are hidden on By-AOW rather than made functional there — pipeline ready if users ask.

## 8. Historical notes

Budget tripwire fired (estimate ~650 non-test LOC, actual 1 311 — template density, not scope); owner's standing mandate let execution finish, recorded in `execution.md`. One Implementer died to a provider session limit mid-T-5; a resumer verified the complete partial work (runtime-failure fallback, no inline code). The spec was amended twice during execution via Leader adjudication (REH-AC-4 search-expansion wording; both closed with sweeps). Nine post-execution addenda were user-driven polish, each with targeted tests and its own commit.
