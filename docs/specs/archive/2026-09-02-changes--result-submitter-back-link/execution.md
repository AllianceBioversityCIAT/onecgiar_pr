# Execution Log — `changes/result-submitter-back-link`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/result-submitter-back-link` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Started | 2026-09-02 |
| Status | complete — RSBL-T-1 PASS; RSBL-T-2 PASS (HITL owner-closed 2026-09-02: commit and archive) |

## 2. Task Execution History

### RSBL-T-1 — Add the red Jest cases: Submitter is missing on the strip

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-09-02 |
| Attempts | 1 |
| Requirements | RSBL-R-1 (THEN/AND), RSBL-R-2 (THEN/AND no new window), RSBL-R-6 (name), RSBL-AC-1, AC-2, AC-6 |
| Design | RSBL-DD-3 |

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Implementer** (`claude-sonnet-5-thinking-high`): added `describe('submitter (Science Program)')` with three cases on the existing SP04 / Multifunctional Landscapes fixture. Queries `[data-testid="result-header-submitter"]`. Production `.html` / `.ts` untouched.
- **Verification:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - 24 existing cases: PASS
  - 3 new Submitter cases: FAIL — `TypeError: Cannot read properties of null (reading 'textContent'/'getAttribute')` (no Submitter node)
- **Reviewer** (`gpt-5.6-sol-medium`, author ≠ auditor): `STATUS: PASS` — three SP04 cases fail for the intended missing node; text, same-tab route, no `target`, accessible name asserted; production untouched.
- **ADVISORY:** none.

#### Decisions

- Skills kept as specified: `tdd`, `angular-developer`. Effort `medium`.
- No `@akili-spec` on production — test-only. Case names cite the requirements.
- Implementer assumption (not a gap): testid on the anchor; T-2 may place it on a wrapper if the value lands differently.

#### Issues

None.

#### Final verification

Red regression is in place. RSBL-T-2 may now paint the strip and turn these cases green.

### RSBL-T-2 — Paint Submitter, turn the cases green, HITL wrap

| Field | Value |
|---|---|
| Final status | **PASS** — Reviewer PASS on template/getters/Jest; HITL owner-closed |
| Date | 2026-09-02 |
| Attempts | 1 |
| Requirements | RSBL-R-1..R-7, R-10, AC-1..AC-7 |
| Design | RSBL-DD-1, DD-2, DD-3 (Jest half) |

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Implementer** (`claude-sonnet-5-thinking-high`): identity-strip item after funding / before status — muted “Submitter” sibling + primary `routerLink` to `['/result-framework-reporting/entity-details', officialCode]`. Getters `officialCode` (trim, no normalize) and `submitterValue` (`{code} - {name}` or code alone). `@if (officialCode)`. `data-testid` and `aria-label="Submitter: {value}"` on the anchor. T-1 cases kept; added missing / empty / whitespace-only / code-only / `SGP-02`. No `LabReportFormComponent` edit.
- **Verification:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="result-header.component.spec"`
  - `Test Suites: 1 passed, 1 total` · `Tests: 32 passed, 32 total`
  - Lint: `npx ng lint --quiet` — All files pass linting
- **HITL:** agent could not log in. Owner closed the gate on 2026-09-02 with `commit and archive` (same pattern as FOVL-T-2). No written two-width defect reported.
- **Reviewer** (`gpt-5.6-sol-medium`, author ≠ auditor): `STATUS: PASS` — template, getters, and scoped Jest conform to R-1..R-6, R-10, AC-1..AC-6, DD-1/DD-2/DD-3 Jest half. R-7/AC-7 left Leader-owned.
- **ADVISORY:** none.

#### Decisions

- Skills kept as specified: `angular-developer`, `ui-ux-pro-max`. Effort `medium`.
- Task stayed `[~]` until the owner closed HITL. Code was already committed (`63d749989`).

#### Issues

None remaining after owner close-out.

#### Final verification

Jest green (32). HITL accepted by owner archive instruction. RSBL-T-2 `[x]`.

## 3. Summary

Both tasks complete. Spec ready to archive. No `/akili-test` / `/akili-validate` run — scoped Jest + Reviewer PASS + owner HITL close-out live in this log.
