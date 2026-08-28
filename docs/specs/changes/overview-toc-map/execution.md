# `changes/overview-toc-map` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/changes/overview-toc-map/` |
| **Approval mode** | gated — user launched `/akili-execute … fast and efficient`: Leader proceeds through routine PASS gates, stops at TCM-T-4 HITL (precedent: overview-chart-view-toggle run) |
| **Branch** | `qa-development-2026` @ base `e62586480` (includes the parallel session's radar/KPI/tabs commit) |
| **Triad** | Leader: session model (T1) · Implementer: `akili-implementer` (T2) · Reviewer: `akili-reviewer` (T3, read-only) |
| **Budget (design §1)** | 4 tasks · ~430 LOC · 1 review round per task |
| **Kaizen applied** | KZ-CVT-1 (pathspec-only commits — shared worktree), KZ-CVT-2 (briefs name the return channel) |

## 2. Task Execution History

## TCM-T-1 — Wrapper registration + pure `buildTocMapModel`

### Attempt 1 — Reviewer FAIL (2026-08-28)

- **Files:** `pr-viz-chart.component.ts` (+3-edit TreeChart registration) + `.spec.ts` (13→14 count, cited), new `dashboard-lab.toc-map.ts` (284) + `.spec.ts` (255, 12 cases).
- **Implementer verification:** FULL suite 483/6934 green; lint clean; `ng build` exit 0.
- **Runtime note:** Reviewer's first session dropped mid-response (API connection lost); resumed via nudge — no attempt consumed by the runtime failure.
- **Reviewer verdict: STATUS: FAIL** — one gating issue:
  1. **Discovered Issue:** AoW branch `done/total` computed over `is_aow === true` output-tier nodes only; `overviewAowProgress` (`dashboard-lab.component.ts:944-962` via `indicatorsByAow`/`fromTier` :1636-1649) filters by TIER ONLY — no `is_aow` filter. On output-tier nodes with `is_aow: false`/absent (real per the repo's own pinned spec `dashboard-lab.component.spec.ts:180-204` and the folder guide's "Trampa nueva 2026-08-26"), map says 0/0 while the card says 0/2. Fixture blind on this axis (all outputs `is_aow: true`) → agreement test green by accident.
  2. **Violated Rule:** TCM-R-3 scenario "the two cards can never disagree — one shared derivation"; requirements §9 defect-class row 2; TCM-DD-4 "exact AoW-card counting rule".
  3. **Remediation:** restrict the Program-level dedupe partition to the OUTCOME tier (matching `:1646`'s definition of shared-ness); all output-tier nodes stay on their AoW branch; add fixture output nodes with `is_aow: false` and `is_aow` absent (≥1 achieved + 1 unachieved indicator) — current code goes red on them; fix the docblocks/comments claiming "exact overviewAowProgress rule".
- **Reviewer adjudications accepted by Leader:** dedupe mechanism itself PASS; no-truncation-in-model PASS (correct layering; **forward pointer → TCM-T-2:** truncated-title fallback for null-code leaves is now UNOWNED — TCM-T-2 must own it as a label/tooltip assertion or TCM-R-2's final AND-clause ships unproven); purity + label constants PASS; wrapper registration PASS (union typecheck genuinely exercised only when T-2 writes a tree option — close there).
- **Leader decision (spec-clause conflict):** TCM-R-2's "per-AoW branches contain only `is_aow: true` nodes" read literally conflicts with TCM-R-3's absolute on this input class. Resolved in favor of TCM-R-3 (the outcome-tier-only partition satisfies both; the literal both-tier reading violates a MUST). One-line clarification added to TCM-R-2's clause citing this entry — recorded amendment, not silent rewrite.
- **Leader inclusion under the same issue (not advisory creep):** the `done` predicate must use `Number(value ?? 0) > 0` semantics (card-exact), not `parseFloat` — TCM-DD-4 demands the EXACT rule; coercion is part of exactness.
- **ADVISORY (recorded, non-gating, die here):** silent drop of key-less shared nodes (pin or comment deliberately); `a.code.localeCompare` throws on absent code (`String(a.code ?? '')` would uniformize no-throw); `outcomes2030Label` override untested.

### Attempt 2 — Reviewer PASS (2026-08-28)

- **Status: PASS** (attempt 2 of 3) · rework effort: high
- **Remediation applied:** output-tier `is_aow` filter removed (all HLOs stay on their AoW branch; branch `done/total` ≡ `overviewAowProgress` by construction); outcome-tier partition unchanged; `done` predicate now card-exact `Number(value ?? 0) > 0` (`isAchieved`), `parseFloat` confined to Σ sums; docblocks corrected (the ownedOutcomeNodes comment now cites the codebase's sharedness definition, TCM-R-3, and why attempt 1 was wrong).
- **Fixture hole closed:** AOW01 outputs += `A4` (`is_aow: false`) + `A5` (`is_aow` not-strictly-true), each with achieved+unachieved indicators; agreement values now AOW01 2/6, AOW02 3/7. **Red→green experiment run in-file:** reintroducing the attempt-1 partition turned 3 tests red exactly on the new axis; Reviewer independently confirmed by hand re-derivation (2/6 both sides; old code 1/3 vs 2/6 red).
- **Verification:** FULL suite 483 suites / 6934 tests green; lint clean. (`ng build` green from attempt 1; union typecheck genuinely exercised at TCM-T-2.)
- **Reviewer:** STATUS: PASS — all 5 DoD items green; scope/static clean.
- **Forward pointers → TCM-T-2 (carry into its brief):** (1) truncated-title fallback for null-code leaves is UNOWNED — TCM-T-2 must own it as a label/tooltip assertion or TCM-R-2's final AND-clause ships unproven; (2) the wrapper union typecheck is only exercised when T-2 writes a real tree option — `ng build` there closes it.
- **ADVISORY (recorded, die here):** key-less shared nodes silently dropped (pin or comment); `a.code.localeCompare` throws on absent code; outcome-tier absent-`is_aow` fixture line would complete tier symmetry; `outcomes2030Label` override untested; `programNodesByKey` comment one-line touch-up.
