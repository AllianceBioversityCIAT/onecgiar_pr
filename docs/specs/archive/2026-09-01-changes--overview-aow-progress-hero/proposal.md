# Proposal — `changes/overview-aow-progress-hero`

## 1. Document Control

| Field | Value |
|---|---|
| Type | Change |
| Spec path | `changes/overview-aow-progress-hero` |
| Slug | `overview-aow-progress-hero` — derived from free-text argument ("darle más protagonismo a Progress by area of work") |
| Approval Mode | pre-approved (owner standing mandate, 2026-08 — YOLO: 1 judgment pass fix-only, ≤1 Reviewer round, targeted jest only) |
| Author | j.cadavid (owner) + Claude, 2026-08-31 |
| Depends on | none (builds on archived `changes/mass-reporting-flow` + `changes/reporting-entry-hub` mechanics) |

## 2. Intent

Make **"Progress by area of work"** the visual and operational centrepiece of the Science Program **Overview** tab: the place a focal point looks to answer *"how are we doing and where do I act next"* — not one more card in the grid.

## 3. Problem / Current Behavior

`program-overview` section 8 (`program-overview.component.html:674`) renders flat rows: code chip + name + slim 8px bar + `done/total` + % pill + Report. At real early-cycle data (SP01: 2/392, most rows 0%) the section reads as an inert list — the bars are visually empty, the overall "1%" chip is small, nothing says *what to do next*, and the two outcome rows double its height while carrying 12 KPIs. `AowProgressRow` today is only `{code, name, done, total}` — no status split, no evidence tie-in.

## 4. Proposed Outcome

A promoted hero section (directly under the "Where to report" hub) where a focal point can, at a glance: read overall progress (ring + big mono figures + with-evidence/in-progress/not-started counts), see AoWs **sorted by remaining work** with **segmented status bars** (Reported · In progress · Not started — true KPI counts, so a continuous bar is honest even at 1%), and act per row (**Report** → Reporting tab; **open** → By-AOW focused view via the existing `openAowFocused`). Outcomes collapse to footer chips. One primary CTA: **Continue reporting** (Reporting + Only-pending on).

## 5. Scope

- `program-overview` section 8 redesign (hero layout, summary rail, segmented rows, outcome chips) + section promotion in the Overview order.
- Host enrichment: extend `AowProgressRow` with the status split + evidence counts (data already loaded — `indicatorsByAow` has every indicator; zero-target rule via the shared `buildRatio`/`pendingOf`).
- Loading skeletons from the first render (KZ-MRF-1: "not yet started" = loading; no partial sums that jump).
- Row actions wired to existing navigation (`openAowFocused`, Reporting-tab deep links).

## 6. Non-Goals

No new endpoints; no change to the Reporting tab; no dark mode; no per-HLO drill-down inside the Overview (that is the Reporting tab's job); no changes to the other Overview cards beyond reflow.

## 7. Affected Users, Systems, And Specs

- Users: reporting focal points + PMU leads (Overview readers).
- Code: `program-overview` (§8 + `AowProgressRow`), `dashboard-lab` host (row enrichment computed, section order), no server changes.
- Specs: consumes mechanics from archived `changes/mass-reporting-flow` (zero-target rule, `openAowFocused`, skeleton discipline) — cite, don't re-derive.

## 8. Visual Reference

- Source: Design canvas (Claude Design preview)
- Location: `docs/specs/changes/overview-aow-progress-hero/mockup/` (`Main.dc.html`, `DirectionB.dc.html`, `DirectionC.dc.html`, `RowStates.dc.html`, `canvas.json`) · published: https://claude.ai/code/artifact/c426b8a5-0f28-46c6-ad66-6706faf6ef1d
- Notes: Option A (recommended) full section + row anatomy with loading/loaded/complete states; Options B (data-first chart) and C (amplified rows) as alternates. All figures are SP01 sample values; status splits marked as host-derived.

## 9. Requirement Delta Preview

### ADDED
- Summary rail: overall ring + mono figures, with-evidence / in-progress / not-started counts, **Continue reporting** CTA.
- Segmented per-AoW status bar (counts, not %-of-% — honest at near-zero progress) + "N KPIs remaining" subline + per-row open action.
- Remaining-work sort (mirrors the Reporting tab's burn-down sort).
- Loading skeletons + complete-state row ("View results").

### MODIFIED
- Section position (promoted below the hub); outcome rows → footer chips; row anatomy (bigger identity, mono figures).
- `AowProgressRow` gains `inProgress`, `notStarted`, `withEvidence` (derived client-side).

### REMOVED
- The standalone "Overall" pill (absorbed by the summary rail); the two full-height outcome rows.

## 10. Approach Options

| Option | Motivation | Tradeoff |
|---|---|---|
| **A · Mission control (recommended)** | Summary + action in one hero; segmented bars informative even at 1%; reuses existing nav | Largest visual change; needs `AowProgressRow` enrichment |
| B · Data-first chart | One-glance chart (echarts pattern exists) | Weak per-row actionability; near-zero % barely paints |
| C · Amplified rows | Minimal delta, zero data changes | Modest prominence gain; ignores "what next" |

## 11. Recommended Approach

**Option A.** It is the smallest path that actually answers the intent (prominence AND direction): all data is already client-side, both row actions already exist (`openAowFocused`, Reporting links), and the segmented bar solves the real problem the current design has at early-cycle data — an all-grey list. B and C stay on the canvas as decision references.

## 12. Risks, Dependencies, And Open Questions

- **KZ-MRF-1 applied**: rows/rail must skeleton until sums are final (`!toc` loading definition already in the host).
- **Phantom-token guard**: any new `--pr-*` token goes to `colors.scss` first; `design-tokens.spec.ts` sweeps the module (KZ-MRF-2).
- **Concurrency**: another session works this same worktree — re-check `git diff HEAD` before commits (KZ-MRF-3).
- OQ-1: does "Continue reporting" open the grouped view or the least-complete AoW's By-AOW view? (Mockup assumes grouped + Only-pending.)
- OQ-2: keep the Overview's old done/total rule or adopt the Reporting tab's zero-target rule here? (Judgment C-5 recorded the divergence; this section adopting `buildRatio` would close it for one more surface.)

## 13. Success Criteria

- The section reads first on the Overview after the hub; overall %+counts legible without hover.
- Every AoW row shows the status split and a working Report/open action; sort = remaining work.
- Skeletons until final numbers (no jumping sums); folder suites + lint green; live pass on dev.

## 14. Next Step

```text
/akili-specify changes/overview-aow-progress-hero
```
