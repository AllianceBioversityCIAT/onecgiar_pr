# Kaizen Entry — bugfix/stale-bundle-refresh-prompt

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/stale-bundle-refresh-prompt` (`SBR`) |
| Date | 2026-10-14 |
| Branch | qa-development-2026-mc-2 (spec branch — every edit below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | interactive |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 1 of 1 (`SBR-T-1`) | tasks.md |
| Reviewer FAIL rework attempts | 1 (attempt 1 — did not consume the 3-attempt ceiling, Pivot Detection applied) | execution.md — `SBR-T-1` attempt 1 |
| HALTs / FATAL_FAILs | 0 / 0 | execution.md |
| Pivots | 1 (`SBR-T-1` — toast added under a key with no matching render host) | execution.md — `## Pivot Record: SBR-T-1` |
| PRODUCT_BUGs | n/a — `/akili-test` not run | — |
| Validation FAIL / WARN | n/a — no `validation-report.md` (accepted at `/akili-archive` readiness gate) | archive-summary.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 — task explicitly marked not skip-eligible (`checklist` depth) | tasks.md "Skip-eligible tasks" |
| Escaped defects (§3) | 0 known; manual TEST smoke check still pending (tracked in archive-summary.md follow-ups) | tasks.md §6 |
| ADVISORY findings (final PASS) | 3, all non-gating | execution.md — `SBR-T-1` attempt 2 Reviewer verdict |

## Lessons

- **KZ-bugfix--stale-bundle-refresh-prompt-1 — A Testing Plan for a UI-visibility requirement specified an assertion on the underlying service's in-memory state, not on the rendered DOM.** (Product + Methodology, High)
  - Root cause: `design.md` §10's original Testing Plan and `tasks.md`'s Falsifier both specified asserting `PrToastService.toasts()` contains the expected entry. That assertion is **necessary but not sufficient** for a requirement that says "MUST show a visible... banner" (`SBR-R-1`/`SBR-R-2`) — `PrToastComponent` only renders a toast whose key matches a *mounted host's* `[key]`, so a toast can sit in the service's list and never appear on screen. Attempt 1 passed every test and was still invisible; the Reviewer's own report named it directly: "The tests only check the service's toast list, so they pass on a toast nobody can see."
  - Evidence: `execution.md` — `## Pivot Record: SBR-T-1`; attempt 1 Reviewer `STATUS: FAIL` Issue 1.
  - This generalizes beyond this stack: any test suite for a UI element whose visibility is gated by a separate render/mount mechanism (a keyed host, a feature flag, a conditional slot) must include a post-`detectChanges()` (or framework-equivalent) DOM-level assertion before a "shows a banner/toast/modal" requirement can be marked verified.
  - Standardization: → P1 (local), P2 (upstream half)

## Noted, not a lesson

- **Recurrence of an existing lesson, not a new one:** the Pivot's actual trigger — `design.md`'s Premise Ledger (`SBR-P-3`) asserted `PrToastService` "already supports a sticky, keyed toast... rendered as an ARIA live region," true of the *service*, but never checked the *render path* (`PrToastComponent`'s host-key filter, and that no host existed for the new key) against the component's actual source. This is the same root cause as `KZ-results--intermediate-outcome-aow-visibility--target-tooltip-1` ("a design decision asserted an existing shared component 'already does X' without verifying it against that component's source") and its already-recorded second occurrence in `bilateral/rejected-result-correction` (`bilateral-sp-selector` / status-badge host-mounting gap). This is the **third** recorded occurrence of this exact pattern. Recorded as a `digest-update`, not a new lesson — see P3.
- **Good practice worth keeping:** the attempt-2 Implementer discovered a non-obvious Angular JIT template-scope memoization quirk (a declared NgModule component's first compilation in a spec file fixes its directive scope — `PrToastComponent` had to be added to the *outer* `beforeEach`'s imports, not only the nested helper's) and verified it empirically with a throwaway instrumented test before writing the real one, rather than guessing. One occurrence; not generalized into a lesson, but the brief's "report your lookup/verification notes" field is exactly what surfaced it — worth noting that the field earns its keep here.
- Both `<app-pr-toast>` hosts (the pre-existing `globalUserNotification` one and the new `stale-bundle-refresh` one) share identical fixed positioning with no stacking/offset differentiation (Reviewer ADVISORY, attempt 2) — deferred to the manual TEST smoke check, not actioned; below the lesson bar (single occurrence, no rework caused).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Testing Plan guidance) |
| Edit | When a requirement is about UI visibility ("MUST show a banner/toast/modal"), the Testing Plan must require a DOM-level assertion taken after change detection runs — an assertion against only the underlying service's/store's in-memory state is not sufficient evidence of visibility. |
| Severity | High |
| Status | pending |
| Upstream | see P2 |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | `methodology` |
| Edit | Recommend the AKILI Testing Plan / Falsifier template (`docs/specs/general-setup/design.md` and `task.md`'s Verification section) state generically: a UI-visibility requirement's Falsifier/Testing Plan must name a rendered-output check (DOM query, snapshot, or screenshot), not only a data-layer/service-state check, whenever the feature's visibility is gated by a mechanism separate from the data write (a keyed host, a flag, a conditional slot). |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--intermediate-outcome-aow-visibility--target-tooltip-1` |
| Edit | Add source spec `bugfix/stale-bundle-refresh-prompt` (design's Premise Ledger verified `PrToastService` could render a sticky keyed toast but never checked `PrToastComponent`'s host-key filter or that a host existed for the new key — execution.md `## Pivot Record: SBR-T-1`). Third recorded occurrence of this root cause (tooltip case; `bilateral/rejected-result-correction`'s host-mounting case; this one). Recurrence noted; severity already at ceiling (High) — recommend prioritizing P1's application at the next apply pass given the recurrence count. |
| Severity | High |
| Status | pending |

**Step 3 (`/akili-archive` Constitution & Graph Sync) pending items: none.** No `## Constitution Impact` block exists in `execution.md` (no new module/package, no module-boundary move — the change is confined to `AppComponent`/`app.component.html` plus one new i18n constants file, all within the existing `onecgiar-pr-client` client module). The factual-claims sweep of root `CLAUDE.md`/`AGENTS.md` found no assertion this cycle falsified. No TRD/ADR impact (`execution.md` Pivot Record: "ADR impact: none"). This spec is not listed in any `family.md` manifest. `.codegraph/` exists — a re-index is recommended (Step 3 item 6, runs on any branch).
