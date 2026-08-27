# Archive Summary: `changes/sp-overview-echarts/overview-widgets`

| Field | Value |
|---|---|
| Archive Date / Status | 2026-08-27 · **Done** (4/4 tasks PASS; T-1 in 2 attempts, rest attempt 1) |
| Requirements | OVW-R-1..R-5 full; OVW-R-6 delivered for W1/W2 loading (via T-4 forward pointer) + reduced motion; bilateral loading skipped per design §13 escape hatch (recorded) |
| Files | `dashboard-lab.component.{ts,html,spec.ts}`, `program-overview.component.{ts,html,spec.ts}`, NEW `program-overview.charts.{ts,spec.ts}` |
| Evidence | Final: jest 481/481 (6805), lint + `ng build` clean; link vocabulary gated (real `status_name`, plural `W3/Bilaterals`); 5 pinned spec assertions rewritten by name; budget: 4 tasks / 1 rework round (within), LOC over estimate on test code only (recorded, no tripwire) |
| Commits | `6d412de17`, `93ecd530a`, `a0e03ffa0`, `5faa42b55` + quicks `88a4aec3c`/`22bd8006e` (axis labels), `7630fe05a` (card order, §6.2 amendment), `ef4914230` (donut violet palette, OVW-DD-5a) |
| Follow-ups | Rollout §6; OQ-1 (bar excludes QAed) proposal candidate; bars↔heatmap toggle → future proposal (reverts OVW-DD-4); guide rewrites → pending items (kaizen entry) |
| Notes | 2 Implementer spawns died on expired auth (no work lost, no attempt consumed); T-1's rework was evidence-completeness (6-slot mapping test), not a code defect; the HITL visual pass surfaced 3 real UX fixes within minutes — exactly what the T6 gate exists for |
