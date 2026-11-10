# Kaizen Entry — changes/portfolio-typology-bar-chart

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-typology-bar-chart` (INC-168045) |
| Date | 2026-11-10 |
| Branch | `qa-development-2026-ss` (spec branch; apply-capable branch is `staging`) |
| Archive Run | 1 |
| Approval Mode | gated (user later: "continua hasta que termines") |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 7 (5 planned + T-6, T-7 from pivot) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-3: `rgba()` decal colour literal) | execution.md — TBC-T-3 attempt 1 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 1 (P-1 at T-5 HITL: Center tab, colours, hover) | execution.md — ## Pivot Record: TBC-T-5 |
| Budget tripwires | 1 (LOC ~875 vs ~650 after T-3; tests-heavy; user continued) | execution.md — ## Budget tripwire |
| Continuations / checkpoints | 1 continuation (T-7) / 0 | execution.md — TBC-T-7 |
| Runtime events | 1 provider-limit death (T-7) → resume-by-message | execution.md — TBC-T-7 |
| PRODUCT_BUGs / validation FAIL-WARN | n/a (no test/validation report; HITL instead) | — |
| `REVIEW_WAIVED` / `REVIEW_SKIPPED` | 0 / 0 | execution.md |
| Escaped defects | 0 known (PRTest smoke pending) | — |
| Drift attributable | none | — |

## Lessons

- **KZ-changes--portfolio-typology-bar-chart-1 — An open-question default that removed shipped behaviour (OQ-3: drop the Center tab) went into execution unconfirmed and was reversed at the HITL, costing two extra tasks.** (Product + Methodology)
  - **Root cause:** `requirements.md` §10 listed OQ-3 under "defaults applied — confirm at this gate"; the tasks pre-flight "OQ-1 / OQ-3 confirmed (defaults applied otherwise)" let execution start on the default. Nothing distinguished a removal default from a harmless one.
  - **Evidence:** requirements.md §10 (OQ-3); tasks.md §2 pre-flight; execution.md — ## Pivot Record: TBC-T-5 (user: "anteriormente también teníamos por centro").
  - **Standardization:** → P1 (local) + P2 (upstream).

- **KZ-changes--portfolio-typology-bar-chart-2 — Categorical chart colours were chosen as opacity steps within three level hues; the user could not tell types apart ("un gris, luego un gris más oscuro").** (Product)
  - **Root cause:** DD-4 optimised for level grouping and existing tokens; no rule says categorical series need distinct hues, and readability had no gate before the final HITL task.
  - **Evidence:** design.md TBC-DD-4 (superseded) → §15 TBC-DD-7; execution.md — Pivot Record P-1.
  - **Standardization:** → P3.

- **KZ-changes--portfolio-typology-bar-chart-3 — A planned compile-gate falsifier (assign `null` into `setSelection` → `ng build` red) could never fire because the client compiles with `"strict": false`.** (Product)
  - **Root cause:** the falsifier assumed strict null checks; the client tsconfig is not strict, and no guide says so.
  - **Evidence:** tasks.md TBC-T-4 Falsifier; execution.md — TBC-T-4 decisions (runtime falsifier substituted).
  - **Standardization:** → P4.

## Noted, not a lesson

- T-3's colour test grepped `#` hex only and let an `rgba()` literal through (one rework round); fixed with an rgb/hsl check — test-quality slip, below the lesson bar.
- Budget overrun was test-heavy (mutation-backed falsifiers on 3 pure seams); production LOC was on budget.
- `design.md` P-9 missed that the page spec counts `app-pr-viz-chart` hosts (execute-time edit to §10).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/tasks.md` (pre-flight checklist) |
| Edit | Add: "An open question whose default **removes** shipped behaviour (a tab, view, column, export) must be explicitly confirmed by the user before the task that removes it starts — a default-applied removal is not allowed." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI `/akili-specify` open-questions gate / `tasks.md` template |
| Edit | Same rule as P1: removal defaults are confirm-required, never default-applied. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` §7 (tokens) / charts guidance |
| Edit | Add: "Categorical chart series (one per category, e.g. result type) use distinct hues from `--pr-color-*` tokens, each ≥ 3:1 on white; never separate categories by opacity steps of one hue. Reference map: archive `2026-11-10-changes--portfolio-typology-bar-chart` design §15 DD-7." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` §21.7 gotchas |
| Edit | Add: "Client `tsconfig.json` has `strict: false` — `ng build` does not catch null/undefined type errors; a falsifier relying on a nullability compile error must be a runtime test." |
| Severity | Low |
| Status | pending |
