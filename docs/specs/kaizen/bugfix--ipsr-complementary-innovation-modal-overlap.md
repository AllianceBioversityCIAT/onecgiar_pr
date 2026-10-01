# Kaizen Entry — bugfix/ipsr-complementary-innovation-modal-overlap

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/ipsr-complementary-innovation-modal-overlap` |
| Date | 2026-10-01 |
| Branch | `qa-development-2026-mc-2` (Branch Context: **spec**; apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 (T-1 `[x]`, T-2 `[x]`, T-3 `[~]` partial) | tasks.md |
| Reviewer FAIL rework attempts | 4 (T-1 ×3, T-3 ×1) | execution.md — T-1 attempts 1–3, T-3 attempt 1 |
| HITL failures (implicit FAIL) | 2 (T-3 `ICM-AC-8`, after attempts 2 and 3) | execution.md — T-3 HITL entries |
| HALTs / FATAL_FAILs | 1 / 0 (T-1 after 3 attempts; the user authorized a 4th) | execution.md — `## HALT: ICM-T-1` |
| Pivots | 2, both user-requested (× on header-less modals; "Add project" buttons) | execution.md — both `## Pivot Record` blocks |
| Budget tripwire | fired 3× (~100 → ~920 LOC); the user accepted each | design.md §12; execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test` run) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate` run; accepted) | archive-summary.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects (§3) | 0 by definition (no `REVIEW_SKIPPED` task). Note: `ICM-AC-8` failed at HITL after a Reviewer PASS (T-3 a2) | execution.md |
| Deferred requirement | `ICM-R-7`, user-accepted | archive-summary.md |

## Lessons

- **KZ-bugfix--ipsr-complementary-innovation-modal-overlap-1 — In Cypress, `Cypress.config('viewportWidth')` stays at the configured default after `cy.viewport()`.** (Product, High)
  - Root cause: the T-1 centering assertion read `Cypress.config('viewportWidth')` to compute gaps. That value stays at 1280 while the app window is 1440, so every case would have gone red for the wrong reason. Neither the Implementer nor its self-check noticed; the Reviewer flagged it and a Leader probe confirmed it.
  - Evidence: execution.md — T-1 attempt 2 Reviewer FAIL and the Leader probe `expected 'config=1280 inner=1440'`; `execution-reviews/icm-t1-a2.md` item 1.
  - Standardization: → P1

- **KZ-bugfix--ipsr-complementary-innovation-modal-overlap-2 — A webpack-built CT harness can be green on a CSS-cascade defect that the live esbuild dev server shows.** (Product, High)
  - Root cause: `ng serve` uses `@angular/build:dev-server` (esbuild/Vite; `angular.json:101`), while Cypress CT and Jest compile with webpack. The add-project panel computed `position: relative` in CT but `static` on the user's live `ng serve`. The CT gate therefore passed before the fix and could not discriminate the defect. Three T-3 attempts were spent before the user deferred it. The *why* of the divergence is unconfirmed; the *fact* of it is evidenced.
  - Evidence: execution.md — T-3 HITL entries (`ICM-DIAG … "panelPos":"static"`), attempt-3 diagnosis (CT pre-fix: panel `relative`, both rules present), `## Deferral`.
  - Standardization: → P2

- **KZ-bugfix--ipsr-complementary-innovation-modal-overlap-3 — Implementer self-checks verified a copy, not the shipped artifact.** (Product + Methodology, Medium)
  - Root cause: twice the Implementer's "self-check" ran something other than the deliverable. In T-1 attempt 1 its harness inlined a copy of the snippet (`repo snippet verbatim in harness: False`). In T-1 attempt 3 it ran its own spec and then deleted it. Only the Leader's non-author re-run against the shipped files gave real evidence, and in attempt 3 it found the precondition-timeout defect. The brief asked for a self-check but did not require it to load the shipped file by path.
  - Evidence: execution.md — T-1 attempt 1 evidence re-run, attempt 3 Leader re-run.
  - Standardization: → P3 (local) + P4 (upstream)

## Noted, not a lesson

- **Recurrence of `KZ-RTA-2`** (`should('be.visible')` is not a geometry check). Here it appeared as a false *negative*: Cypress treats a covered `position: fixed` descendant as not visible, so a `×` precondition timed out on exactly the bug state (T-1 HALT). This is recorded as the `digest-update` P5, not as a new lesson.
- The budget estimate excluded test code and the Plan B evidence tool. Every tripwire was test-driven (Cypress spec 252 → 438 LOC incl. helpers, pr-dialog spec 76). Below the lesson bar; it feeds the recurrence check on estimation.
- P-9 (Cypress token) was user-stated "configured" but refuted. `UNVERIFIED` + owner worked as designed: it was caught at the execute pre-check.
- The Orca CLI was unavailable (`Unable to determine Orca.app path from symlink`), which blocked live-browser verification by the agent.
- The public surface of the shared `app-pr-dialog` changed (new `floatingClose` input), but no `## Constitution Impact` block was written at T-3. It is recovered here as P6.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §9 (`### E2E (Cypress)`) |
| Edit | Add: "Geometry assertions MUST read the real window (`win.innerWidth`, element rects), never `Cypress.config('viewportWidth'|'viewportHeight')` — those stay at the configured default after `cy.viewport()`; assert `win.innerWidth === requested` right after each `cy.viewport`." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §9 (`### 🛑 Verifying in a REAL browser`) |
| Edit | Add: "Cypress CT and Jest compile with webpack; `ng serve`/production use `@angular/build` (esbuild). A CT green is not evidence for a CSS-cascade/positioning defect seen on `ng serve` — keep a HITL (or authenticated E2E) check on the live dev server in the DoD for such tasks." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/implementer.md` (append-only) |
| Edit | Append: "A self-check harness MUST load the shipped artifact by path (`<script src>`, `import` from the delivered module) — never an inlined copy — and must not be deleted before the Leader can re-run it; report the load path." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-execute` Step 2.2 brief contract: when a task asks the Implementer for a self-check, the brief MUST require the check to import/load the shipped deliverable by path and keep the check file until the evidence re-run, so the non-author re-run exercises the same artifact. |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-RTA-2` |
| Edit | Add source spec `bugfix/ipsr-complementary-innovation-modal-overlap`, plus the recurrence note: "also false-*negative* — `be.visible` fails on a `position: fixed` descendant that another element covers (Cypress coverage check); for stacking tests use existence + `getClientRects()` preconditions and `elementFromPoint` probes." Severity stays High (caused a HALT here). |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §8 (Shared layer / Component rules) |
| Edit | Add: "`app-pr-dialog` header-less dialogs that lack their own close control opt in to `[floatingClose]="true"` (top-right `×`, same `hide()` path as Escape); default `false` — never infer a `×` from `!showHeader`." |
| Severity | Low |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root `CLAUDE.md` / `AGENTS.md` |
| Edit | None. No root-guide claim was falsified this cycle (client-only CSS/component change; module list, commands and stack are unchanged). |
| Severity | — |
| Status | n/a |

### P8

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | None. No TRD ADR was overturned (`ICM-DD-1` / `ICM-DD-2` are module-level client decisions). |
| Severity | — |
| Status | n/a |

*(Branch Context = spec. Nothing above was written to shared files. These items await the apply phase on `staging`.)*
