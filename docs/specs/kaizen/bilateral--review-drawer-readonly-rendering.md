# Kaizen Entry — bilateral/review-drawer-readonly-rendering

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/review-drawer-readonly-rendering` |
| Date | 2026-09-21 |
| Branch | qa-development-2026 (spec branch — Branch Context `spec`, not apply-capable) |
| Archive Run | 1 |
| Approval Mode | pre-approved |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (RDR-T-1, RDR-T-2) | tasks.md |
| Reviewer FAIL rework attempts | 0 — both tasks PASS on the first round | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 — no `## Pivot Record` | execution.md |
| PRODUCT_BUGs | 0 | no `test-report.md` (tests authored in-task) |
| Judgment-day severe findings | n/a — no judgment pass run | — |
| Validation FAIL / WARN | n/a — no `validation-report.md`; two Reviewer PASSes + HITL accepted in its place | archive-summary.md §6 |
| Tasks closed under `REVIEW_WAIVED` | 0 | tasks.md — "`skip-eligible` tasks: none" |
| Tasks closed under `REVIEW_SKIPPED` | 0 | tasks.md |
| Escaped defects | 0 — HITL 8/8 applicable checks PASS | execution.md § HITL |
| `/akili-quick` escalation | **1 — this spec IS the escalation** | archive-summary.md §8 |
| Drift attributable to this spec | 0 | `git diff` scope held to the 6 declared files |
| **Vacuous gates caught pre-merge** | **2** | execution.md — RDR-T-1 predicate mismatch, RDR-T-2 global `readOnly` |
| **Budget overrun** | ~396 LOC vs ~145 budgeted (2.7×); implementation *under* (31 vs ~21), gates 3× over | execution.md § Budget reconciliation |
| Pre-existing red gates repaired | 12 (11/48 + 1/3), none caused by this spec | `f0d2bb0b3` |

Not a clean run: the two vacuous gates and the budget overrun are real signals.

## Lessons

- **KZ-bilateral--review-drawer-readonly-rendering-1 — A component test that asserts "the control is not operable" is vacuous whenever a GLOBAL drives the same branch as the input under test, and only a paired positive case reveals it.** (Product + Methodology, **High**)
  - Root cause (5W1H — *why did a gate pass while proving nothing?*): every `pr-*` control picks its read-only branch from `readOnly() || rolesSE.readOnly`, and `RolesService._readOnly` starts `true` (`roles.service.ts:22`). `RDR-T-2` mounted the real children and asserted "locked ⇒ zero operable controls" — which the **harness default** satisfied on its own, with or without the `[readOnly]` binding the spec exists to add. The suite would have shipped green having tested nothing. What exposed it was not review and not the absence assertions: it was the two `disabled = false` **falsifier** cases going red, because a harness stuck in read-only cannot produce an operable control either. An absence-only suite has no such signal.
  - Evidence: `execution.md` § "The important finding — the gate was vacuous on its first run" (4 passing / 2 failing, and the 2 failures were the falsifiers); `pr-textarea.component.html:14`, `pr-input.component.html:27`, `pr-select.component.html:19` (the shared switch expression); `roles.service.ts:22`.
  - Note the generalization: this is not about `readOnly`. It is about any gate whose expected state is also the harness's default — a disabled-by-default flag, an empty-by-default list, a feature flag that ships off. The absence assertion and the harness agree for the wrong reason.
  - Standardization → P1 (local), P2 (upstream).

- **KZ-bilateral--review-drawer-readonly-rendering-2 — `/akili-quick`'s "lightest applicable check" updates the suite it can see and silently abandons the suite that owns the same surface.** (Methodology, **High**)
  - Root cause (5W1H — *why did 12 gates sit red without anyone noticing?*): `e89889bdf` (`quick/bilateral-review-default-pending`) changed the page's default status filter **and** the `activeFilterCount()` semantics. It diligently updated `bilateral-review.component.spec.ts` (+44 lines) — the Jest spec a changed-files walk surfaces — and never ran `bilateral-review.cy.ts`, which owned nine gates over the same surface. `/akili-quick` Step 2 asks for "the component's existing test if one already covers the surface", singular, and explicitly forbids authoring new tests; nothing in it asks *which* suites own the surface. The 9 CT gates went red on 2026-09-14 and stayed red through at least two further commits and one full spec cycle.
  - This is the same failure mode as `project-client-verification-tsc-and-page-ct` (Jest green while the page CT was red for a day), now recurring one level up: at `/akili-quick`, where the whole point is not to run much.
  - Evidence: `git show --stat e89889bdf` (Jest spec updated, no `.cy.ts`); `f0d2bb0b3` commit body (nine gates traced to that commit); `bilateral-review/CLAUDE.md` § "CT repair 2026-09-21".
  - Standardization → P3 (local), P4 (upstream).

## Noted, not a lesson

- **`RDR-T-1` found something real on its own first run too**, which is worth recording as evidence that the gate was not ceremonial: it initially demanded `readOnly` predicate ≡ `disabled` predicate and went red on three `innovation-use-content` fields already pinned `[readOnly]="true"` (permanently computed). The invariant was corrected to "at least as strict" — same predicate, or the literal `true`. Not a lesson: the gate behaved exactly as intended and the fix was a one-line refinement, not a root cause.
- **The accepted D4 risk turned out not to be reachable.** `requirements.md` §8 recorded "a `pr-select` paints `Not provided` because its catalog has not loaded" as a blind spot with no automated gate. HITL opened the drawer at the earliest possible moment (`openedAtMs: 0`) and sampled at 0.8s/2s/5s/9s; labels were present in every sample, because the drawer's own `isLoadingInformation` gate covers the catalog fetch. Recording a risk that measurement then retires is the system working, not a miss.
- **Two read-only idioms now coexist in cards 2–4** (text for inputs/selects/textareas, greyed-but-control-shaped for `pr-radio-button` / `pr-range-level`). Accepted by `design.md` DD-2 and confirmed live in HITL. A real UX seam, but owned by shared controls used across every non-editable screen — not this spec's root cause.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` — §3 Verification fields, beside the `Falsifier` bullet |
| Edit | Add: "An **absence** assertion (no operable control, no node, no call) is paired in the same task with a **presence** case under the opposite input. A harness whose default already satisfies the absence — a flag that starts on, a list that starts empty — makes the absence case pass without the change under test; the presence case is the only thing that detects it." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology — `/akili-specify` Step 3.2, Falsifiability block, rule 3 (*real-artifact lock*) |
| Edit | Extend the rule: a gate is also inert when the **harness default** independently satisfies its expected state. Require the paired opposite-input case, and name the class — global service flags, feature flags shipped off, empty-by-default collections — alongside the existing fragment/plumbing examples. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` — §9, near "RULE — run the component tests to validate any change to `custom-fields/`" |
| Edit | Add: "Before changing a page's behaviour — including from `/akili-quick` — run `npm run test:ct:changed` (or `npm run affected` to see why). A `*.cy.ts` reaches its subject through `templateUrl`, so a changed-files walk over imports does not surface it: `quick/bilateral-review-default-pending` updated the Jest spec and left nine CT gates red for a week." |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | upstream |
| Target | AKILI methodology — `/akili-quick` Step 2 (*Verify*) |
| Edit | Replace "the component's existing test if one already covers the surface" with a sweep: enumerate **every** suite that owns the surface (unit, component, e2e — including suites CI skips) and run them all. "Lightest applicable check" must mean the lightest check that still covers the surface, not the first suite found. |
| Severity | High |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-REH-1` (LOC budgets under-count) — **eighth recurrence** (REH → AIS → KCR → RGS → RAC → MWB → COT → **RDR**) |
| Edit | Raise severity and record the new mode: here the *implementation* came in **under** estimate (31 lines vs ~21 planned) while the two gates cost 3× their budget (~365 vs ~125). The budget was not wrong about the change; it was wrong about the evidence. Budget the gates separately from the diff. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | — none required |
| Edit | The two folder guides this cycle touched (`result-review-drawer/AGENTS.md` §3b, `bilateral-review/CLAUDE.md`) were written inside the implementation commits as the spec's own deliverable, which `tasks.md` names — the shared-file discipline's stated exemption. Step 3 item 3's factual sweep of the root `CLAUDE.md`/`AGENTS.md` was run and found **no** claim this cycle falsified (layout, test gates, and CodeGraph lines all still true). Recorded so a later reader sees the sweep ran rather than inferring it was skipped. |
| Severity | Low |
| Status | superseded |
