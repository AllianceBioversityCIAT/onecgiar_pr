# Execution Log: Persistent emerging-result CTA that opens the Reporting aside

## Document Control

- **Spec Path:** `docs/specs/changes/emerging-result-cta-placement`
- **Type:** Change
- **Approval Mode:** gated
- **Leader:** Cursor Grok 4.6 (this session)
- **Status:** complete (2026-09-05)
- **Started:** 2026-09-05
- **Budget / Sizing:** 5 tasks · ~700 LOC · ≤ 1 Reviewer round per task
- **Judgment:** round 1 FAIL; owner fix-only (C1–C4 in `design.md`); re-judge skipped
- **Active Lessons:** KZ-REH-2 (no native `[disabled]` on gated CTAs) · KZ-MRF-2 (existing `--pr-*` only)

## Wave 1

Parallel: `ERC-T-1` ∥ `ERC-T-2` (disjoint files). Skills: T-1 `angular-developer` + `tdd` + `ui-ux-pro-max` (band chrome); T-2 `angular-developer` + `tdd` (form contract). Effort: medium.

---

## Task Execution History

### `ERC-T-1` — Band CTA, split emits, fail-closed `canReportEmerging`
- **Status:** PASS
- **Implementer:** `akili-implementer` (`4d894174-7d52-45db-b4d9-b956e17027eb`) · model `claude-sonnet-5-thinking-high`
- **Reviewer:** `akili-reviewer` (`dcd37278-24c3-475d-8480-50865956f995`) · model `claude-opus-5-thinking-high` · **PASS**
- **Skills:** `angular-developer` · `tdd` · `ui-ux-pro-max`
- **Requirements Covered:** `ERC-R-1` (control), `ERC-R-2` (emits), `ERC-R-5` (input half), `ERC-R-11`, `ERC-R-20`, `ERC-AC-1`/`AC-2`/`AC-3` (emit)
- **Files Modified:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band/reporting-program-band.component.ts`
  - `…/reporting-program-band.component.html`
  - `…/reporting-program-band.component.spec.ts`
- **Verification Summary:** Jest `reporting-program-band.component.spec` — 93 passed / 93 total.
- **Advisories (non-gating):** expanded cluster may overrun title padding at 640–899px — extend HITL (`ERC-TEST-7`) to ~700px; two collapsed tests select the expanded copy (reachable-filter tests still cover condensed).
- **No commit** (owner: execute without commit unless asked).

### `ERC-T-2` — `lab-report-form` emerging mode + Output/Outcome chooser
- **Status:** PASS
- **Implementer:** `akili-implementer` (`985e7f9d-428e-46b3-966e-36567c72a0c8`) · model `gpt-5.6-sol-medium`
- **Reviewer:** `akili-reviewer` (`1d9e1698-4b09-4473-895c-c7eb1ad04d31`) · model `claude-opus-5-thinking-high` · **PASS**
- **Skills:** `angular-developer` · `tdd`
- **Requirements Covered:** `ERC-R-3` (form half), `ERC-R-7`, `ERC-AC-5`/`AC-9`
- **Files Modified:**
  - `…/lab-report-form/lab-report-form.component.ts`
  - `…/lab-report-form.component.html`
  - `…/lab-report-form.component.spec.ts`
  - `…/lab-report-form/CLAUDE.md`
- **Verification Summary:** Jest `lab-report-form.component.spec` — 56 passed / 56 total (red phase 7 failures before green).
- **Advisories (non-gating):** dead-end `categoryUnavailable` copy before a level is picked; submit synthesis depends on `resultTypes().find`; RFUX describe mock lacks `outputOutcomeLevelsSig`.
- **Leader note:** `lab-report-form` and `indicator-drawer` also have in-flight `changes/report-result-form-ux` edits in this worktree. T-3 must add emerging mode without reverting RFUX 3-card work.
- **No commit.**

### `ERC-T-3` — `indicator-drawer` emerging mode
- **Status:** PASS
- **Implementer:** Cursor Grok 4.6 (inline; owner requested no subagents)
- **Reviewer:** skipped (single-agent execute per owner)
- **Skills:** `angular-developer` · `tdd`
- **Requirements Covered:** `ERC-R-3` (drawer half), `ERC-R-6`, `ERC-R-12`, NFR no contributor GET, `ERC-AC-5`/`AC-8`
- **Files Modified:**
  - `…/indicator-drawer/indicator-drawer.component.{ts,html,spec.ts}`
  - `…/indicator-drawer/CLAUDE.md`
- **Verification Summary:** Jest `indicator-drawer.component.spec` — 72 passed / 72 total (includes `ERC-T-3` emerging describe).
- **No commit.**

### `ERC-T-4` — dashboard-lab open path, hub unhook, query consume
- **Status:** PASS
- **Implementer:** Cursor Grok 4.6 (inline)
- **Reviewer:** skipped
- **Skills:** `angular-developer` · `tdd`
- **Requirements Covered:** `ERC-R-2` (host), `ERC-R-3` hub/band, `ERC-R-4` cancel/returnTab, `ERC-R-5`, `ERC-R-6`, `ERC-AC-2`…`AC-8`
- **Files Modified:**
  - `…/dashboard-lab/dashboard-lab.component.{ts,html}`
  - `…/dashboard-lab/dashboard-lab.hub.spec.ts`
  - `…/dashboard-lab/CLAUDE.md`
- **Verification Summary:** Jest `dashboard-lab.hub.spec` — 54 passed / 54 total.
- **No commit.**

### `ERC-T-5` — Results / My results hop, Smart Back origin, P2-3569 lock
- **Status:** PASS
- **Implementer:** Cursor Grok 4.6 (inline)
- **Reviewer:** skipped
- **Skills:** `angular-developer` · `tdd`
- **Requirements Covered:** `ERC-R-1` (Results/My results hosts), `ERC-R-4`, `ERC-R-5`, `ERC-R-10`, `ERC-DD-5`, `ERC-AC-6`/`AC-7`
- **Files Modified:**
  - `…/programme-results/programme-results.component.{ts,html,spec.ts}`
  - `…/my-work-board/my-work-board.component.{ts,html,spec.ts}`
  - `…/report-result-form/innovation-link-surfaces.spec.ts`
- **Verification Summary:** Jest scoped pattern (7 files) — 484 passed / 484 total.
- **No commit.**

## Execute complete

All five tasks PASS. Manual HITL (`ERC-TEST-7` collapsed bar at 375px) remains for the owner.
