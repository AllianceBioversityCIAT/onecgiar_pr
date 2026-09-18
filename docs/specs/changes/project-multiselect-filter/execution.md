# Project Multiselect Filter — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Approval Mode | gated |
| Execution Status | completed — PASS |
| Active Task | none (all tasks [x]) |
| Started | 2026-09-18 |
| Leader Model | `gpt-5.6-sol` |
| Requested Implementer Model | `gpt-5.6-luna` |
| Actual Implementer Binding | `opencode-go/glm-5.2` reported by the wrapper; host model selection was opaque |
| Approved Budget | 1 task; approximately 90 changed LOC; 1 review round (wave 2 revised budget accepted) |

## 2. Task Execution History

### `PMF-T-1` — Expose and verify the project multiselect

- **Current status:** awaiting user adjudication of the keyboard-activation HITL item
- **Implementer attempts:** 1
- **Requirements:** `PMF-R-1`, `PMF-R-2`, `PMF-NFR-1..5`, `PMF-AC-1..4`
- **Effort:** medium
- **Skills loaded:** `angular-developer`, `spartan`, `ui-ux-pro-max`
- **Reviewer verdict:** Attempt 1 FAIL — implementation conforms statically, but mandatory browser evidence is missing

#### Attempt 1 — Implementer

**Files changed**

- `bilateral-results-list.component.ts`: normalized project IDs, row-derived options, retained deep-link options, and selection handling.
- `bilateral-results-list.component.html`: Project multiselect between Source and Created by.
- `bilateral-results-list.component.spec.ts`: five focused project-filter cases.
- `bilateral-results-list/CLAUDE.md`: project-filter contract and refreshed verification stamp; corrected the documented column-storage key from v3 to the existing v4.

**Changed-line evidence**

| File | Added | Removed |
|---|---:|---:|
| Component TypeScript | 46 | 0 |
| Component template | 15 | 0 |
| Component tests | 159 | 0 |
| Local guide | 18 | 3 |
| **Total** | **238** | **3** |

**Verification evidence**

| Gate | Result |
|---|---|
| Focused Jest command from `tasks.md` | PASS — 3 suites, 145/145 tests; five new PMF cases executed. |
| `npx ng lint --quiet` | PASS — all files pass linting. |
| `npm run build:dev` | PASS — application bundle generated in 25.455 seconds with only pre-existing global Sass deprecation warnings. |
| `git diff --check` on the four implementation files | PASS. |
| Browser at 1280px/900px | NOT RUN — no authenticated `token` + `user` state was available, and the existing worktree dev server could not be proven to serve the current bundle. |

**Environment variance**

- Local Node is `v22.12.0`; `docs/infrastructure.md` §6 pins Node 20.x. Automated checks passed, but this is not evidence of Node 20 conformance.
- Spartan MCP and CodeGraph tools were not exposed to the Implementer. It loaded the required skills and read the real existing multiselect/touched files instead; no Spartan API or shared component was invented.

**Not Done / Assumptions (Implementer report)**

- Browser verification required by `PMF-AC-4` remains open for an authenticated, current worktree bundle.
- Actual changed lines exceed the approved budget: 238 additions and 3 removals versus approximately 90 changed LOC. The largest delta is 159 lines of focused scenario/negative-clause tests.
- The wrapper could not select or confirm `gpt-5.6-luna`; it reported `opencode-go/glm-5.2` as the actual binding.

## 3. Budget Tripwire

Execution exceeded the approved LOC estimate by 148 added lines (approximately 164% over the 90-LOC estimate). Scope remains the four approved files and one task; the overrun comes from fuller test coverage and guide detail, not a new module or contract.

Per the approved design and `/akili-execute`, the Leader stopped before independent review and requested approval for the revised implementation budget. Browser evidence must still be completed or explicitly adjudicated before `PMF-T-1` can become `[x]`.

**Decision:** User selected option 1 on 2026-09-18, accepting the `opencode-go/glm-5.2` implementation and revised 238-addition/3-removal budget. Independent review may proceed. Browser evidence remains required.

#### Attempt 1 — Reviewer

- **Model:** `opencode-go/deepseek-v4-pro` — independent from Implementer model `opencode-go/glm-5.2`.
- **Verdict:** `STATUS: FAIL`
- **Static/code conclusion:** The four-file diff conforms to `PMF-R-1`, `PMF-R-2`, `PMF-DD-1..4`, the declared boundaries, and the automated gates.

**Discovered Issue:** `PMF-AC-4` manual browser verification is NOT RUN. Placement geometry, no horizontal overflow at 1280px/900px, visible focus, keyboard open/select/remove/close, and loading/empty/error presentation have no rendered evidence. `PMF-NFR-2` and `PMF-NFR-3` therefore remain unverified because Jest DOM presence is explicitly insufficient.

**Violated Rule:** `requirements.md` §8 `PMF-AC-4` and §9 browser defect-class gate; `tasks.md` PMF-T-1 Definition of done; `design.md` §8.4 and §11; `PMF-NFR-2` and `PMF-NFR-3`.

**Remediation Suggestion:** Use a current worktree bundle with both authenticated localStorage keys, then exercise the Project field at 1280px/900px: placement, search/two-project OR behavior, chips and comma URL, individual removal, Clear all, keyboard open/select/remove/close, visible focus, overflow, and no additional project-specific loading/empty/error surface.

**ADVISORY:** Automated gates ran on Node v22.12.0 rather than pinned 20.x. Re-running on Node 20 would reduce false-green risk but does not gate this task. The guide's v3-to-v4 accuracy correction is acceptable but would ideally be isolated in future.

#### Browser verification (Leader-run, authenticated Orca session)

The missing `PMF-AC-4` evidence was collected by the Leader against the live authenticated session in the Orca embedded browser (`http://qa-development-2026.orca.localhost:63760/bilateral/AfricaRice/results`), after confirming the served bundle is current (`window.ng` exposes `onProjectFilterChange` with the new normalization body).

| Item | Result |
|---|---|
| Current bundle | Confirmed — `onProjectFilterChange` present via `window.ng.getComponent`. |
| Popover placement | Opens in the existing Filters dialog; group order `Phase, Source, Project, Created by, Center role`; visible Project label and `Filter by project` group name. |
| Options | 21 real project options from loaded rows; deduplicated; labels match the Project column. |
| Two-project selection | Selected ids `[1368, 1369]`; URL became `?phase=36&project=1368,1369&role=lead&source=w3` (comma list, unrelated params preserved); two labelled chips; filtered 32 of 89 rows with **0 rows outside the two selected projects**. |
| Single chip removal | Removed the A-AG10171 chip: selection `[1368]`, URL `project=1368`, chip gone, all remaining rows project 1368. |
| Clear all | `projectFilter` empty, `project` removed from URL (phase/role/source kept), 0 project chips. |
| Escape | Closes the popover (document keydown handler exercised live). |
| Viewports | No horizontal overflow at desktop (1229–1536 css px) and at exactly **900px** (viewport 750 device px × app zoom) with the popover open; iPad emulation (820px) also without overflow. |
| Loading/empty/error | The diff adds no new state markup beyond the field; existing page states remain authoritative; option behavior under loading/error covered by the component Jest cases. |

**Keyboard limitation (recorded):** the automation channel dispatches untrusted synthetic key events — JS keydown listeners fire (Escape proven), but browser-native default behaviors (click synthesis from Enter/Space on buttons/checkboxes, Tab focus traversal order, the `:focus-visible` heuristic and its default outline) do not. Native activation therefore could not be exercised by the harness. The trigger (`a.field[tabindex=0]`) and checkboxes are the existing shipped `app-pr-filter-multiselect` instance (PMF-DD-4 — the same control as Created by; no new interactive element was introduced by the diff), and no project CSS removes focus outlines from it (the app's global `.custom_select .field` rules define none), so browser-default `:focus-visible` presentation applies. This item is routed to the human HITL gate for adjudication.

#### Attempt 2 — Reviewer (evidence confirmation)

- **Model:** `opencode-go/deepseek-v4-pro`.
- **Verdict:** `STATUS: FAIL` — with the browser evidence above, three sub-items were still unproven: native Enter/Space keyboard activation, the exact 900px viewport, and a visible focus ring.
- **Closed after this verdict:** exact 900px was then measured with the popover open and no overflow. Visible focus: no project CSS suppresses the browser-default focus ring; the untrusted-event channel cannot set `:focus-visible`, so the ring itself could not be screenshotted by the harness.
- **Outcome:** the remaining item (native Enter/Space activation on the reused shipped control) is presented to the user as the spec's named HITL gate (`requirements.md` §9: "Manual browser check at the Phase 1/implementation HITL gate").

## Pivot Record: PMF-T-1

**Date:** 2026-09-18

**Trigger:** User feedback during the browser HITL check — the Project filter options do not show the center's projects ("parece que los proyectos no son los del centro"). The user's referenced images cannot be read by the session model; the claim was confirmed directly in the live data.

**Confirmed observation:** AfricaRice's loaded rows (89) carry 20 distinct displayed projects, of which 14 use non-`A-AG` codes belonging to other Centers (C0172, KOICA-UPLB, BMGF-1000 Farms, POSHAN, CANADA-GAC, D-100828, D-100860, 1572-MIPO/CIP, 1523-BMGF/RTB, 1078-CHI0, 2025P029, R0223, A-HP2023-002, …). Most of these appear only in rows where AfricaRice contributes (`is_leading_result !== 1`). The center's own bilateral catalog (21 `A-AG` projects, per the Overview "Results by project" panel) is drowned out, and catalog projects with zero loaded rows never appear as options at all.

**Root cause:** Approved `PMF-DD-1` derives options from every loaded row's displayed project, including rows where the center only contributes and where the displayed project belongs to another Center's catalog. This is a spec design defect surfaced by the user, not an implementation bug — the code implements the approved decision exactly.

**Affected spec items:** `PMF-R-1` (option source), `PMF-NFR-1` (no-additional-request constraint), `PMF-DD-1` and `PMF-DD-3`, `PMF-AC-1`, task `PMF-T-1` scope/ownership table, budget. No server payload or contract changes.

**Alternatives (pending user choice):**

| Option | Option source | Trade-off |
|---|---|---|
| A — Center project catalog (recommended) | The center's bilateral project catalog via the existing `GET_bilateralProjects` service the Overview already consumes | Complete center list (21), includes projects with zero results (selecting them shows the existing filtered-empty state); adds one catalog request + its loading/error handling; catalog is active-year scoped. |
| B — Center-only rows | Row-derived options filtered to projects present in the center catalog | No foreign projects; still misses zero-result projects; still needs the catalog fetch to filter. |
| C — Lead-row projects only | Row-derived options restricted to `is_leading_result === 1` rows | No fetch; loses contributing-row project filtering entirely and still misses zero-result projects. |

**Status:** Task remains `[~]`. Pending user selection of the option source; spec documents will then be amended (requirements/design/tasks) with the two-direction correction sweep before implementation resumes.

**Decision:** User selected **Option A (center project catalog)** on 2026-09-18, adding the phase-awareness reminder. Spec documents were amended (option source = center catalog per selected phase year; server gains an optional `year` query parameter), the correction sweep closed (proposal recorded as superseded with an amendment note), and the revised budget (≈450 total changed LOC, 2 review rounds) was approved. Wave 2 implementation resumes from here.

#### Wave 2 — Implementer (attempt 1)

- **Model:** `opencode-go/glm-5.2` (wrapper binding; `gpt-5.6-luna` requested; user pre-accepted the fallback).
- **Skills:** `angular-developer`, `spartan`, `ui-ux-pro-max`, `nestjs-expert`.
- **Files changed:** 12 files — client component/template/spec/guide, `bilateral-api.service.ts` (+spec), server `bilateral-center.controller.ts` (+spec), `bilateral-center.service.ts` (+spec), `bilateral-projects.service.ts` (+spec). Cumulative diff **+755/−17 = 772 changed LOC**.
- **Verification:** client focused Jest 3 suites 150/150 (10 PMF cases); extra affected client suites 113/113; client lint PASS; client `build:dev` PASS; server Jest `src/api/bilateral` 32 suites 577/577 (year-filter and pass-through cases confirmed); `git diff --check` clean. Server ESLint reports 68 pre-existing violations — proven byte-identical at HEAD (stdin lint of HEAD content) plus 5 from another session's in-flight `cgspace-discovery` edits; per-file baseline comparison shows **zero new violations from this task**.
- **Not Done:** none — user explicitly adjudicated the HITL gate and directed completion via `/akili-execute`.
- **Budget:** 772 changed LOC vs the pivot-approved ≈450 — accepted by user on 2026-09-18.

#### Wave 2 — Review & Finalization

- **Verdict:** `STATUS: PASS`
- **Verification Evidence:**
  - Client Jest: 3 suites passed, 150/150 passed (`bilateral-results-list.component.spec.ts`, `bilateral-result-filter.spec.ts`, `bilateral-query-params.spec.ts`).
  - Server Jest: 32 suites passed, 577/577 passed (`src/api/bilateral`).
  - Client Lint: clean (0 errors).
  - Client build (`npm run build:dev`): PASS.
  - Server ESLint: 0 new violations introduced.
  - HITL browser verification accepted by user.

## 4. Summary

Task `PMF-T-1` is finalized and marked `[x]`. The center-catalog project multiselect filter is implemented across client and server with full backwards compatibility, phase-year awareness, deduplicated union, and zero regressions. All tasks in this specification are complete.
