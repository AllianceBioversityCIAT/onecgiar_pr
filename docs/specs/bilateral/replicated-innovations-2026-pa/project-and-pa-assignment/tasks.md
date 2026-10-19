# Tasks — Let Centers pick the 2026 project and P/A on replicated innovations

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` (`PAA`) |
| Linked spec | `requirements.md` (PAA-R-1..R-6, AC-1..AC-8) + `design.md` (DD-1..DD-5) |
| Ticket | Freshdesk INC-164073 (due 2026-10-24); commits use `[SPEC:bilateral/replicated-innovations-2026-pa/project-and-pa-assignment]` (`PAA-OQ-1`) |
| Owner | Santiago Sanchez |
| Status | not-started |
| Approval Mode | `gated` |
| Budget (tripwire) | 4 tasks · ~90 production LOC · ~180 test LOC · 1 review round per task (2 max on T-1) |

**PR strategy:** one branch off `qa-development-2026-ss`, one commit per code task (T-1, T-2, T-3), all client-only. No server, migration or payload commit. T-4 produces evidence only (no commit).

**Skills (Skill Map):** `angular-developer` for every code task; `spartan` + `tailwind-design-system` for T-1 (template/visual); `tdd` for T-3.

**Test discipline (every task):** Jest always `--maxWorkers=2`, scoped with `--testPathPattern`, one run at a time on the machine; lint only touched files. Jest specs assert the **rendered DOM** (zoneless; `fixture.detectChanges()` / `await fixture.whenStable()`), never only class properties.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1, 2026-10-16).
- [x] `design.md` approved (Phase 2, 2026-10-16).
- [x] Blocking open questions resolved: none block code. `PAA-OQ-2` (reply to Nicoleta), `PAA-OQ-4` (28634 data check) and `PAA-OQ-5` (HITL save result) are non-code and tracked in T-4 / §7.
- [x] CLARISA dependencies: none new (catalogue endpoint unchanged).
- [x] No conflicting in-flight spec on `section-zero-dashboard` / `section-contributors` / `bilateral-creation.service` (sibling child #2 touches `bilateral-overview` only).
- [x] Migration: n/a (no schema change).
- [x] Copy-regression grep run 2026-10-16: no `*.spec.ts` / `*.cy.ts` asserts "No project linked" or "cannot be changed here" in the bilateral module (DD-4 / DD-5 breakage risk = new specs only).

## 3. Task list

### [x] `PAA-T-1` — Section 0: project + P/A picker in the no-lead-project state

- **Type:** client
- **Description:** In `section-zero-dashboard`, extract the Program field + assignment actions block of the linked-project branch into `ng-template`s (DD-1: `#programField` + `#assignmentActions`) and render it from that branch unchanged. In the final `@else` branch, when `canEditAssignment()` and a result is loaded (`currentResultId`), render a no-project block: `app-bilateral-project-selector variant="inline" [deferCommit]="true"` wired to `onProjectCandidate`, the shared Program/actions templates, and the R-6 hint (`noProjectLinkHint`, styled with `bp-primary-help`). Read-only and the create wizard keep "No project linked" / "Select a project to begin". Add `noProjectLinkHint` to `bilateral-primary-assignment.copy.ts` and expose it on the component. No change to `saveAssignment` / computed logic expected (P-4); if a test shows `assignmentPrimary` presenting the 2025 P/A as a *selected* value for a project that does not include it, keep `requiresPrimarySelection` authoritative and show the 2025 P/A only as "current". Update `section-zero-dashboard/CLAUDE.md` (new branch, re-stamp `Verified:`).
- **Implements:** PAA-R-1, PAA-R-2, PAA-R-3, PAA-R-6, PAA-AC-1..AC-6; DD-1, DD-2, DD-4
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/section-zero-dashboard.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/section-zero-dashboard.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/section-zero-dashboard.component.spec.ts`
  - `onecgiar-pr-client/src/app/internationalization/bilateral-primary-assignment.copy.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-zero-dashboard/CLAUDE.md`
- **Depends on:** —
- **Blocks:** PAA-T-4
- **Estimate:** M
- **Review:** full (template refactor of the shared assignment block used by RRC / declined / error paths)
- **Verification:**
  - **Falsifier:** with an editable result whose `selectedProject()` is null, the DOM does not contain `app-bilateral-project-selector`, or still contains "No project linked"; or picking a two-Program project enables Save / calls `PATCH_primaryAssignment`; or a read-only no-project result renders any save button; or the linked-project branch DOM differs from today (RRC single-allocation chip, declined suffix, error text).
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=section-zero-dashboard --silent --reporters=summary --no-coverage` — new cases fail before the change (selector absent, "No project linked" present) and pass after. Cases: (1) editable + no project → selector + R-6 hint rendered, no "No project linked"; (2) read-only + no project → text present, no selector, no save button; (3) pick 1-Program project → Program preselected, Save enabled, PATCH called once with `{project_id, primary_science_program_id}`; (4) pick 2-Program project → Save disabled, 0 PATCH calls; (5) PATCH error → generic save-error text in DOM, project not shown as linked; (6) untouched → 0 PATCH calls; (7) existing linked-project cases still green.
  - **Disqualifier:** the shared `ng-template` cannot carry the linked branch's context (RRC chip, declined suffix, `primaryPickerDisabled`) without changing its behaviour → stop and re-specify DD-1 (fallback: a small child component), do not fork the markup.
  - **Consumers:** `bilateral-primary-assignment.copy.ts` gains a key (additive; existing keys untouched). `onProjectCandidate`, `saveAssignment` reused, not changed. No other component renders Section 0's template.
- **Definition of done:**
  - [ ] Red run green; existing `section-zero-dashboard` cases unchanged and green.
  - [ ] `npx eslint <touched .ts files> --quiet` clean.
  - [ ] Copy in `internationalization/`; Spartan / existing `bp-*` classes reused, no new tokens.
  - [ ] Folder `CLAUDE.md` updated, `Verified:` re-stamped.
  - [ ] No logging added (`.cursorrules`).
  - [ ] Commit only on owner approval: `✨ feat(bilateral) [SPEC:bilateral/replicated-innovations-2026-pa/project-and-pa-assignment]: project and primary program picker when a result has no lead project` (no apostrophes / quotes / `$`).

### [x] `PAA-T-2` — Contributors helper points to Project information

- **Type:** client
- **Description:** Replace the helper "Assigned from the project's mapping; it cannot be changed here." under the read-only P/A in `section-contributors` with `contributorsPrimaryHelp` ("Change the primary Science Program in Project information, above."), added to `bilateral-primary-assignment.copy.ts`. Add a Jest DOM case. Re-grep `*.spec.ts` / `*.cy.ts` for the old string (DD-5; pre-flight found none) and update any hit in this task. Update `section-contributors/CLAUDE.md`.
- **Implements:** PAA-R-5, PAA-AC-8; DD-5
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/section-contributors.component.spec.ts`
  - `onecgiar-pr-client/src/app/internationalization/bilateral-primary-assignment.copy.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md`
- **Depends on:** — (shares `bilateral-primary-assignment.copy.ts` with T-1: additive keys, run after T-1 or merge carefully)
- **Blocks:** PAA-T-4
- **Estimate:** S
- **Review:** skip-eligible (copy string + one DOM test, no shared symbol moved)
- **Verification:**
  - **Falsifier:** the rendered Contributors section still contains "cannot be changed here", or the new helper text is absent.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=section-contributors --silent --reporters=summary --no-coverage` — new case fails before, passes after.
  - **Disqualifier:** product rejects pointing to Section 0 (e.g. wants the picker in Contributors) → stop; that is proposal Option B, out of scope.
  - **Consumers:** none (no shared symbol changed; copy file gains a key).
- **Definition of done:**
  - [ ] Red run green.
  - [ ] Old-string grep clean across `src` and `cypress`.
  - [ ] Lint clean on touched files; copy in `internationalization/`.
  - [ ] Folder `CLAUDE.md` updated.
  - [ ] Commit only on owner approval: `🎨 style(bilateral) [SPEC:bilateral/replicated-innovations-2026-pa/project-and-pa-assignment]: contributors helper points to project information for primary program`.

### [x] `PAA-T-3` — Hydrate the loaded lead project from an already-loaded catalogue

- **Type:** client
- **Description:** In `BilateralCreationService.loadResult`, when `projects()` already holds the result's lead project, build the selected project from that catalogue entry (with its `sciencePrograms`) instead of `sciencePrograms: []`. Keep the existing late-catalogue enrichment in `getProjects`. Lead project absent from the catalogue → keep today's `[]` without error.
- **Implements:** PAA-R-4, PAA-AC-7; DD-3 (premise P-5)
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-creation.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-creation.service.spec.ts`
- **Depends on:** —
- **Blocks:** PAA-T-4
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** catalogue set **before** `loadResult` with lead project `A-AG10156` → `[SP06, SP07]`; after `loadResult`, `selectedProject().sciencePrograms` is empty.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=bilateral-creation.service --silent --reporters=summary --no-coverage` — cases: (1) catalogue before → Programs hydrated (red before, green after); (2) catalogue after → enrichment unchanged; (3) lead not in catalogue → `[]`, no throw.
  - **Disqualifier:** `loadResult` and the catalogue use incompatible project identifiers (id vs code) so the match cannot be made without a server change → stop and re-specify.
  - **Consumers:** `selectedProject` is read by `section-zero-dashboard` (assignment pickers), `section-contributors` (read-only lead project), the ToC default block (BIL-TOC). The change only fills data that was empty; list each consumer in the Implementer report and confirm none relied on `sciencePrograms` being `[]` right after load.
- **Definition of done:**
  - [ ] Red run green; existing service cases green.
  - [ ] Lint clean on touched files.
  - [ ] Commit only on owner approval: `🔧 fix(bilateral) [SPEC:bilateral/replicated-innovations-2026-pa/project-and-pa-assignment]: hydrate lead project programs from loaded catalogue`.

### [~] `PAA-T-4` — Build + HITL browser verification on real results

- **Type:** rollout
- **Description:** After T-1..T-3: run `npm run build:dev` once in `onecgiar-pr-client` (nothing else running; templates are not type-checked by `tsc`). Then, with the local stack (shared prdb, prod mailer), confirm the served bundle has the change and check **without clicking Save**:
  - 27270 (group B, ILRI): Section 0 shows the picker + R-6 hint; the ILRI catalogue lists; choosing a two-Program project leaves Save disabled; Submit state unchanged vs before the change (R-3).
  - 28073 (group A, AfricaRice, A-AG10156): Program picker lists SP06 and SP07 with SP09 as current; no "no alternative" message (R-4).
  - Any read-only no-project result: "No project linked", no picker.
  - Contributors helper shows the new copy.
  The **save** (lead row created, default ToC block shown afterwards) is run by the owner on the result they designate (`PAA-OQ-5`), and recorded here.
- **Implements:** PAA-R-1..R-5 on real data; defect classes "real data shape", "default ToC after linking", "new submit blocker" (requirements §8)
- **Files (expected):** none (evidence recorded in `execution.md`)
- **Depends on:** PAA-T-1, PAA-T-2, PAA-T-3
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist (evidence against the bullet list above)
- **Verification:**
  - **Falsifier:** any bullet above observed otherwise in the browser, or the owner's save does not create the lead project / show the default ToC block.
  - **Red run:** n/a (no test gate; HITL)
  - **Disqualifier:** the real payload breaks the picker in a way T-3 does not cover → open a rework task on T-1/T-3, do not patch in place during the check.
  - **Consumers:** none (no shared symbol changed)
- **Definition of done:**
  - [ ] `npm run build:dev` green.
  - [ ] Screenshots / notes for 27270, 28073, read-only case, Contributors helper.
  - [ ] Owner's save result recorded (result code, project, P/A, ToC block shown).
  - [ ] No Save clicked by the agent on the shared prdb.

### [x] `PAA-T-5` — Picker lists the result's lead Center catalogue

- **Type:** client
- **Description:** In `bilateral-project-selector.component.ts`, the constructor effect requests the catalogue with `creationService.resultLeadCenterCode()` when the variant is `inline` and that code is known; otherwise it keeps `ctx.centerInstitutionId()` (create wizard unchanged). Add Jest cases. Update the folder `CLAUDE.md` if the component folder has one. Added in execute on owner request (two Alliance Centers: `CIAT (Alliance)` / `Bioversity (Alliance)`).
- **Implements:** PAA-R-7, PAA-AC-9; DD-6
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-project-selector/bilateral-project-selector.component.ts`, `.spec.ts`, folder `CLAUDE.md` if present
- **Depends on:** PAA-T-1
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** inline variant, page Center institution id 49, `resultLeadCenterCode()` = `CENTER-03` → `getProjects` called with 49 (or not with `CENTER-03`); or the wizard variant calls it with the result code.
  - **Red run:** `npx jest --maxWorkers=2 --testPathPattern=bilateral-project-selector --silent --reporters=summary --no-coverage`
  - **Disqualifier:** `resultLeadCenterCode` is not the same Center the server's `getLeadCenter` returns → stop and re-specify.
  - **Consumers:** `getProjects` callers unchanged; `projects()` readers (section-zero-dashboard pickers, loadResult hydration T-3) get the lead Center list — identical in the normal flow.
- **Definition of done:** red→green; existing selector cases green; lint clean; commit on owner approval: `🔧 fix(bilateral) [SPEC:bilateral/replicated-innovations-2026-pa/project-and-pa-assignment]: project picker lists the result lead center catalogue`.

## 4. Dependency graph

```
PAA-T-1 ─┐
PAA-T-2 ─┼── PAA-T-4 (build + HITL)
PAA-T-3 ─┘
PAA-T-1 ── PAA-T-5 (added in execute)
```

T-1, T-2 and T-3 are independent and parallel-safe on disjoint files, except `bilateral-primary-assignment.copy.ts` (T-1 and T-2 each add one key): run T-2 after T-1, or have one Implementer own the copy file. Only one task runs Jest at a time.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PAA-TEST-1` | unit (client, DOM) | R-1, R-2, R-3, R-6, AC-1..AC-6 | `section-zero-dashboard.component.spec.ts` |
| `PAA-TEST-2` | unit (client, DOM) | R-5, AC-8 | `section-contributors.component.spec.ts` |
| `PAA-TEST-3` | unit (client) | R-4 (data side), AC-7 | `bilateral-creation.service.spec.ts` |
| `PAA-TEST-4` | HITL browser | R-1..R-5 on real data, AC-7, R-3 submit state | `execution.md` evidence (T-4) |
| `PAA-TEST-5` | build | template type-check | `npm run build:dev` (T-4) |

Client coverage stays above 50/60/60/60.

## 6. Rollout & verification

- [ ] Commits per task, on owner approval only; `onecgiar-pr-server/src/a.py` never staged (explicit paths).
- [ ] Push to `qa-development-2026-ss`; PRTest smoke via `performance-refactor` when the owner promotes it.
- [ ] Reply to Nicoleta (INC-164073): what changed, `PAA-OQ-2` (no P/A change without a project), and that Centers can now link a 2026 project in Section 0.
- [ ] No bilateral payload change → no change-log entry in `bilateral-result-summaries.en.md`.

## 7. Cleanup & follow-ups

- [ ] `PAA-OQ-4`: run the 28634 `results_by_projects` check (SQL given inline in chat).
- [ ] Debt: versioning does not replicate `results_by_projects` (separate spec).
- [ ] Sibling child #2 `center-overview-no-project-line` (`/akili-specify`).
- [ ] Update `family.md` child 1 status when done.

## 8. Roll-back plan

1. Revert the T-1..T-3 commits (client only).
2. No migration, flag or payload to undo.
3. Lead projects / P/A saved by users through the existing endpoint stay valid data; nothing to clean.

## Required cross-references

`requirements.md` · `design.md` · `proposal.md` · `../family.md` · `docs/prd.md` G3 · `docs/ux-ui/design.md` §8 · `docs/trd/trd.md` (bilateral module) · `section-zero-dashboard/CLAUDE.md` · `section-contributors/CLAUDE.md`
