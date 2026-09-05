# Kaizen Entry — changes/my-work-board

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/my-work-board` · Prefix `MWB` |
| Date | 2026-09-05 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`) |
| Archive Run | 1 |
| Approval Mode | `pre-approved` (user, 2026-09-04) · Depth Standard |
| Outcome | 13/14 tasks PASS; T-13 phase 2 deferred by the user; My results tab live on `qa-development-2026` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 14 (6 planned + 8 added on user review) | tasks.md |
| Reviewer FAIL rework attempts | 7 (T-4 ×2, T-7 ×1, T-9 ×1, T-14 ×2 — one of them a fix-caused regression) + 1 in-attempt adjustment (T-3) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (three premises corrected by Judgment Day before execution) | judgment.md |
| Judgment-day severe findings | 8 confirmed (both judges + parent verification), 13 INFO/WARNING; no re-judgment (YOLO) | judgment.md |
| PRODUCT_BUGs | n/a (no `/akili-test`) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; Reviewer PASS per task + live user review) | — |
| `/akili-quick` escalations | 0 (three quick-track cosmetic edits done inline by the Leader, recorded) | execution.md |
| Drift attributable | none (`docs/specs/audits/` holds no report) | — |
| Budget | 6 tasks / ~1,350 LOC → 14 / ~3,260 (user-added scope, each recorded); review rounds ≤ 1 per task exceeded twice (T-4, T-14) with recorded adjudication | design.md §1, execution.md |
| Runtime failures | Implementer killed by an API session limit (T-4), Claude Code restart mid-task (T-11), stale `ng serve` + unreachable DB (T-6) — all recovered | execution.md |
| Concurrency | second session in the same checkout: 2 foreign sweeps of this spec's working tree (`9e0d9b54f`-era, `b1ca9ef1f`), coordination messages expired unapproved, user-authorised take-over of 4 change groups | execution.md |

## Lessons

- **KZ-changes--my-work-board-1 — A proposal's data-source premises must be verified in code (writer + reader) before `/akili-specify` closes Phase 1; otherwise Judgment Day is the first place they die, and only if it runs.** (Product + Methodology, High)
  - Root cause (5W1H): `proposal.md` asserted completeness "persists per section in `validation`" (unwritten since 2023 — `green-checks.service.ts` says so), a five-status vocabulary (DB has eight), and server-side phase filtering (the Results tab filters labels client-side). None was checked against a writer/reader in code; the design and six tasks were built on them. The two blind judges found all three (8 severe) and the Leader verified each in ~10 minutes — the same check that would have taken 10 minutes at propose time.
  - Evidence: `judgment.md` L-1, L-3, L-5; `execution.md` "Take-over" and "Judgment Day" notes; `requirements.md` §2 rewritten.
  - Standardization: → P1 (local requirements template) · upstream to AKILI (`/akili-propose` Step 1.1: "each data-source claim names its writer and reader in code before the Approach Options section").

- **KZ-changes--my-work-board-2 — Schedule the user's first real-page look right after the first UI task lands, not after the last task; review-driven scope otherwise arrives as a second spec-sized wave.** (Product + Methodology, Medium)
  - Root cause: the plan put the human look at T-6 (after T-1…T-5). The user's first live review then produced T-8 (three layout corrections), T-10, T-14 and the rename — 8 tasks (+120 % budget) that each re-opened files just committed, forcing serialisation with concurrent work. A look after T-4 would have folded T-8/T-10 into the same pass.
  - Evidence: `tasks.md` T-8/T-10/T-14 "Added by user request (screenshots)"; `execution.md` budget lines; user message "lleva 22 minutos".
  - Standardization: → P2 (task template §6 Rollout) · upstream to AKILI (`/akili-specify` Step 3.2: "the first task that renders UI ends with a HITL look; later UI tasks inherit its corrections").

- **KZ-changes--my-work-board-3 — A layout/behaviour CT must click the node the real defect path focuses and must be run against its FAIL input before it counts as a gate; a green CT that cannot observe the defect is evidence of nothing.** (Product, Medium) — recurrence-adjacent to `KZ-changes--sp-shell-app-viewport-3` (falsifier rule); recorded as a lesson because the failure mode is new (Cypress focuses the nearest focusable *ancestor* of the click point, so a row-centre click never reached the checkbox that the live defect detached).
  - Root cause: T-14 attempt 1's CT "panel stays open while ticking" was green with and without the fix; the Implementer's own live diagnosis showed the checkbox was the focused node, but the CT clicked `.option`. The Reviewer caught it; attempt 2 clicked `input[type="checkbox"]`, asserted `isConnected` + `activeElement`, and ran the FAIL input (RED at both viewports).
  - Evidence: `execution.md` — `MWB-T-14` attempt 1 FAIL (issue 1) and attempt 2 entry (FAIL-input runs quoted).
  - Standardization: → P3 (client source-tree guide, CT gotcha, 2 lines) · digest-update on `KZ-changes--sp-shell-app-viewport-3` → P4.

## Noted, not a lesson

- **Concurrent session in the same checkout — recurrence of `KZ-MRF-3`** (MRF → KCR → AIS → RGS → SAV → **MWB**): two sweeps of this spec's tree into foreign commits, one non-delivered coordination round (cross-session messages expired unapproved), one user-authorised take-over of 273 uncommitted lines (which carried a spec/impl contradiction fixed on take-over). New mode: the foreign commit also captured this spec's `execution.md` entry. → digest-update P5.
- **A Leader-applied "fix" that traded one layout defect for another** (chips `shrink-0 whitespace-nowrap` → column overflow) — caught by the user's screenshot, not by any gate; the CT fixture had no long category labels. Sub-threshold; feeds the "fixture realism" recurrence check.
- **Two Reviewer FAILs were about evidence quality, not behaviour** (T-14 ×2: unobservable CT, a cited measurement that did not exist). The Reviewer persona's evidence rules worked as designed.
- **Runtime interruptions** (API session limit, Claude Code restart, stale dev server, DB behind VPN) cost ~1 h total; each recovery was clean because the working tree and `execution.md` held the state. Memory note saved (`project-orca-agent-spawn-and-stale-dev-server`).
- **YOLO's "≤ 1 review round" was exceeded twice** with recorded adjudication (T-4 fix-caused regression; T-14 evidence round). Both second rounds were narrower than the first — the limit worked as a tripwire, not a wall.
- **Budget under-count — recurrence of `KZ-REH-1`** (seventh spec): tests ≈ 2× production LOC again (CT 14 cases ≈ 1,100 lines).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` — §2 Context guidance |
| Edit | Add: "Every data-source claim the spec rests on (a table, an endpoint, a status vocabulary, a URL/phase model) names its **writer and reader in code** (`grep`/`git log -S`), or is marked *unverified* and routed to Judgment Day — a premise nobody wrote to since 2023 is not a data source." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` — §6 Rollout & verification |
| Edit | Add: "The first task that renders UI ends with a **HITL look on the real page** (Orca browser) before the next UI task starts; corrections from that look are folded into the running task, never appended as new tasks after the last one." |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/src/CLAUDE.md` — Cypress CT gotchas (near the CT harness notes) |
| Edit | Add: "Cypress `click()` focuses the nearest focusable **ancestor** of the click point, not a focusable child; to exercise a `:focus-within` panel, click the `input`/`button` itself and assert `document.activeElement` + `isConnected` after the action. Run the spec's FAIL input before calling a CT a gate." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--sp-shell-app-viewport-3` |
| Edit | Add `changes/my-work-board` as a source (T-14 attempt 1: a CT click that could not reach the focused node; fixed by clicking the checkbox + FAIL-input run); keep severity Medium; note the new mode "unobservable click target". |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-MRF-3` |
| Edit | Sixth recurrence (`changes/my-work-board`): two foreign sweeps of a running spec's tree (one captured its `execution.md`), cross-session coordination expired unapproved, take-over authorised by the user. Raise severity to **High**; recommend a per-session `git worktree` be enforced by the Orca workspace, not by convention. |
| Severity | High |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/my-work-board/CLAUDE.md` (new) + parent `## Module Guides` index in `onecgiar-pr-client/src/CLAUDE.md` |
| Edit | Child guide (≤ 60 lines): purpose (read-only status board, 4th SP tab), the status→column table, phase = client-side label filter, badge scoped per (code, phase), `include_completeness` only in Mine scope, viewport lock ≥ 900 / snap strip below, chip aggregation ≥ 3 + `+N more`, `pr-viewport-page`, the board-local multi-value filter copy pending T-13 phase 2. Index row: `my-work-board/` → "My results board (`changes/my-work-board`)". |
| Severity | Medium |
| Status | pending |

### P7

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/CLAUDE.md` |
| Edit | Add: "`returnTab` accepts `results` and `my-work`; `closeReportModal()` returns to it, `onResultCreated()` never does (the modal owns post-creation navigation)." |
| Severity | Low |
| Status | pending |

### P8

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` — `W1` prose (see `pending-archive.md` `MWB-PA-1` for the verbatim replacement) |
| Edit | Replace "Submit transitions to `status_id=2` … QA reviewer transitions to `status_id=3`" with the code-verified order: submit → 3 (Submitted), QA → 2 (Quality Assessed) or back to 1 (`submissions.service.ts`). |
| Severity | High |
| Status | pending |

### P9

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/ux-ui/design.md` — §5 rule 2, §4 screen inventory, §5 tab list (see `MWB-PA-2`…`PA-4`) |
| Edit | Rule 2: scope "MUST land on General Information" to external deep links (`pdf_link`/`prms_link`); in-app section navigation (panel menu, My results Continue) is exempt (`MWB-DD-10`). §4: add the *My results* board. §5: enumerate the SP tab strip Overview · Reporting · Results · My results. |
| Severity | Medium |
| Status | pending |

### P10

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `docs/trd/trd.md` — §4 API surface (see `MWB-PA-5`) |
| Edit | Add the row: `GET results/get/all/roles/filter/:userId` accepts `include_completeness=true` → `completeness: { complete, total, missing[] } | null` per eligible item (status 1/8, non-IPSR, cap 60, concurrency 5); default payload unchanged. |
| Severity | Medium |
| Status | pending |

### P11

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — Architecture Overview & Decisions (no ADR number allocated here) |
| Edit | Decision: "Result completeness for list surfaces is computed on the server by folding the v2 validation procedure per eligible item (Editing/Draft, non-IPSR, capped, bounded concurrency) behind an opt-in query flag; the legacy `validation` snapshot table is not a data source." Supersedes: none (new decision; cites `MWB-DD-1`, `judgment.md` L-1). |
| Severity | Medium |
| Status | pending |

**Methodology lessons for upstreaming to the AKILI repo:** `KZ-changes--my-work-board-1` (verify data-source premises in code at propose time), `KZ-changes--my-work-board-2` (HITL look after the first UI task).
