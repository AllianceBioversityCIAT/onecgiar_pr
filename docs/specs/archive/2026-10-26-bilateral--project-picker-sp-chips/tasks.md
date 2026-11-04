# Tasks — Science Program chips in the replicated-result project picker (`PSC`)

## 1. Scope

| Field | Value |
|---|---|
| Linked spec | `requirements.md` + `design.md` (this folder) |
| Depth | Lite |
| Approval Mode | gated |
| Status | complete (2026-10-26) |
| Budget | 1 task · ~150 LOC · 1 review round (design.md §1) |

## 2. Pre-flight

- [x] Proposal approved (2026-10-26); OQ-1..4 defaults accepted.
- [x] `requirements.md` / `design.md` approved (2026-10-26).
- [x] No migration, no server change, no CLARISA dependency.
- [x] No in-flight spec touching `bilateral-project-selector` (PAA archived).

## 3. Tasks

### PSC-T-1 — Chip row, default chip and OR filter in the inline project picker

| Field | Value |
|---|---|
| Status | `[x]` — Reviewer PASS + manual layout check PASS 2026-10-26 |
| Size | S (~60 prod LOC + ~90 spec LOC) |
| Depends on | — |
| Requirements | PSC-R-1, R-2, R-3, R-4, R-5, NFR-1..4 |
| Design | §2 signal table, §6.2, §6.3, §10, DD-1..DD-5 |
| Skills | `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` |
| Files | `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-project-selector/bilateral-project-selector.component.{ts,html,scss,spec.ts}` only |

**Scope**

1. `.ts`: normalization helper; `programChips`, `defaultProgramCode`, `showProgramChips` computeds; `selectedProgramCodes` linkedSignal; `toggleProgram`, `clearPrograms`; extend `filteredProjects` (program predicate skipped when `showProgramChips()` is false); import Spartan button/badge.
2. `.html`: chip group after `.bps-search` (design §6.2); empty-state branch for active chips; all chip/clear clicks stop propagation.
3. `.scss`: `.bps-chips` wrap layout, existing tokens only.
4. `.spec.ts`: add `isReplicated` / `selectedPrimarySp` to the service mock; cases below (write red first per `tdd`).

**Clause ownership (every scenario and BUT / MUST clause)**

| Clause | Test |
|---|---|
| S-1.1 chips per program with code, short name, count; sorted by code | "renders deduped, counted, code-sorted chips for a replicated inline result" |
| S-1.2 no chips for non-replicated / wizard; **BUT list and search MUST behave as today** | "no chip row when not replicated" + "no chip row in wizard variant" — each also asserts `filteredProjects()` equals the text-only filter |
| S-1.3 only present programs; **MUST dedupe by code**; **MUST NOT render row when no mappings** | dedupe case (two projects SP06 → one chip count 2) + "no row when every project has empty sciencePrograms" |
| S-2.1 default SP06 selected, list = SP06 projects | "pre-selects the stored primary chip" |
| S-2.2 id mismatch still selects SP06; **BUT a same-id/different-code program MUST NOT be selected** | fixture: primary `{programId: 52, programCode: 'sp06 '}`, mappings `{269,'SP06'}` and `{52,'SP02'}` → only SP06 pressed |
| S-2.3 primary missing / code absent → none selected, full list | two cases |
| S-2.4 selection kept across close/reopen; **MUST re-seed when saved primary code changes** | toggle → `toggleDropdown()` ×2 → still toggled; then set `selectedPrimarySp` to SP03 → only SP03 selected |
| S-3.1 OR union, each project once | SP01+SP03 fixture with a project mapped to both |
| S-3.2 chips ∧ search | SP06 + "potato" |
| S-3.3 deselect last → full list | toggle off |
| S-3.4 dropdown stays open, nothing selected; **BUT MUST NOT change staged project / Program / stored value** | DOM click on a chip: `showDropdown()` true, `projectSelected` not emitted, `setLeadProject` and `selectProject` not called |
| S-4.1 empty message + *Clear filters* clears | DOM: text "No projects for the selected programs", click clear → no chip pressed |
| R-5 native buttons, `aria-pressed`, group label | DOM attribute asserts (presence only — keyboard comes from native `<button>`) |

**Verification**

```bash
cd onecgiar-pr-client
npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --findRelatedTests src/app/pages/bilateral/components/bilateral-project-selector/bilateral-project-selector.component.ts
npx eslint src/app/pages/bilateral/components/bilateral-project-selector --quiet
```

Plus `--findRelatedTests` must include `section-zero-dashboard` and `bilateral-result-creator` specs (consumers) — both green, unchanged.

**What would make the check fail (falsifiability)**

- Matching the default by id → S-2.2 fixture selects SP02 → red.
- Dropping the `showProgramChips` gate in `filteredProjects` → S-1.2 text-only equality fails when a stale selection exists → red.
- AND instead of OR → S-3.1 union count drops → red.
- Missing `stopPropagation` → S-3.4 `showDropdown()` false via overlay → red (only if the test clicks through the DOM, not by calling `toggleProgram` directly — the test MUST click the rendered button).

**Disqualifiers**

- A test that calls `toggleProgram()` directly does not prove S-3.4 or R-5; it must use the rendered button.
- `aria-pressed` presence does not prove visual selected state or layout — that is the manual check below.
- If any existing selector / Section 0 / wizard spec had to be edited to pass (other than extending the mock with the two new signals), stop and report: that is a behavior change outside scope.

**Manual check (HITL, layout — no automated gate)**

Local stack (`npm start`), a replicated CIP result → Section 0 → open Project dropdown: chips wrap inside the dropdown with no horizontal scroll, list still scrolls, default chip pressed, toggling filters. Open/close only — **never click Save** (shared prdb + prod mailer).

**Done when**

- All clause tests above green; related consumer specs green; eslint clean on touched files.
- Diff limited to the 4 selector files; no server diff.
- Manual layout check reported (pass, or screenshot of the issue).
- No commit without explicit user go-ahead.

## 4. Estimated LOC & PR

~150 LOC, single commit / single PR to `qa-development-2026-ss` → normal flow.
