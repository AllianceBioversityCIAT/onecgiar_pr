# Module Spec — `tasks.md` (Lite)

## Task 1 — Surface missing-Impact-Area alerts inside the evidence dialog

- **Status:** [x] done — see execution.md (PASS, 2026-09-28)
- **Size:** S (~25 LOC across 3 files)
- **Dependencies:** none
- **Requirements covered:** `IPSR-R-1`, `IPSR-R-2`, `IPSR-R-3`, `IPSR-R-10` (scenarios `IPSR-AC-1`, `IPSR-AC-2`, `IPSR-AC-3`)
- **Design references:** `design.md` §2.2 (data flow), §7 `IPSR-DD-1`, `IPSR-DD-2`, `IPSR-DD-3`

### Scope

1. `ipsr-step3-evidence-list.component.ts` — add `@Input() missingPrincipalImpactAreas: IpsrPrincipalImpactArea[] = [];` (import the type from `../../model/Ipsr-step-3-body.model` if not already imported).
2. `ipsr-step3-evidence-list.component.html` — inside the dialog's `@if (dialogVisible)` block, as the first child of the scrollable content div (`ipsr-step3-evidence-list.component.html:216`), add:
   ```html
   @for (area of missingPrincipalImpactAreas; track area) {
     <app-alert-status status="warning" [collapsible]="false" [description]="copy.principalImpactAreaAlert(copy.impactAreaNames[area])"
         data-testid="dialog-principal-impact-area-alert"></app-alert-status>
   }
   ```
   (`app-alert-status` is already available — `ipsr-step3-evidence-list.component.ts` imports `CustomFieldsModule`, which exports it.)
3. `step-n3-complementary-innovations.component.ts` — add `@Input() missingPrincipalImpactAreas: IpsrPrincipalImpactArea[] = [];` (mirror the existing `@Input` pattern in that file; import the type if not already imported).
4. `step-n3-complementary-innovations.component.html` — add `[missingPrincipalImpactAreas]="missingPrincipalImpactAreas"` to both `<app-ipsr-step3-evidence-list>` call sites (lines ~31 and ~49).
5. `step-n3.component.html` — add `[missingPrincipalImpactAreas]="missingPrincipalImpactAreas()"` to:
   - both `<app-ipsr-step3-evidence-list>` call sites (core innovation, lines ~37 and ~53), and
   - the `<app-step-n3-complementary-innovations>` (or equivalent) call site that hosts `step-n3-complementary-innovations.component` — confirm exact selector/line via `Grep "app-step-n3-complementary-innovations" step-n3.component.html` before editing (not yet read in this spec's exploration).
6. Do **not** touch `missingPrincipalImpactAreas()` / `principalImpactAreaAlert()` in `step-n3.component.ts`, the page-level alert block (`step-n3.component.html:9-12`), or any backend/API file.

### Tests

- Extend `ipsr-step3-evidence-list.component.spec.ts`: mount with `missingPrincipalImpactAreas: ['environmental_biodiversity']` (or the correct enum value from `IpsrPrincipalImpactArea`), open the dialog, assert an element with `data-testid="dialog-principal-impact-area-alert"` renders with the expected text (`IPSR-AC-1`/`IPSR-AC-2` proxy — component-level, not full page). Also assert **no** such element renders when the input is `[]` or omitted (`IPSR-AC-3`).
- Extend `step-n3-complementary-innovations.component.spec.ts` (if such a spec exists — confirm via `Glob`) to assert the input is forwarded to the child, OR skip if that spec doesn't test child bindings today (record which in the PR note).
- Run only the touched specs: `npx jest --testPathPattern="ipsr-step3-evidence-list|step-n3-complementary-innovations|step-n3\.component" --silent --no-coverage` (per `feedback_no_full_test_suites` memory / client `CLAUDE.md` §9 "run only the touched module's specs").
- **What a green run cannot prove:** Jest/jsdom does not verify the alert's visual position inside the dialog (i.e., that it truly renders above the tag checkboxes and is visible without scrolling) — that is a presence-assertion only. Confirm placement with one manual check in the browser per `IPSR-AC-1`'s scenario before marking the task done.
- **Disqualifier:** if the new dialog test passes only because `missingPrincipalImpactAreas` defaults to a non-empty array in the test bed (masking a real empty-state bug), the check is not evidence — explicitly assert the empty-input case too (already listed above) to falsify that failure mode.

### Done criteria

- [ ] All 5 scope edits applied; `npm run build` (or `ng lint` at minimum) passes with no new template errors — templates aren't type-checked by `tsc --noEmit` (see client `src/CLAUDE.md` §21.7 warning), so a full build is the real gate for template mistakes.
- [ ] New and existing tests in the touched spec files pass (`npx jest --testPathPattern=...` above green).
- [ ] Manual browser check: open `http://localhost:4200/ipsr/detail/<id>/ipsr-innovation-use-pathway/step-3?phase=<n>` on a package with a principal score of 2 and no tagged evidence; opening any "Add New Evidence"/"Edit Evidence" dialog (core or a complementary item, either level) shows the same warning text as the page banner, above the tag checkboxes; a package/step with none of these warnings shows no alert block in the dialog.
- [ ] Page-level alert block above "Core innovation" still renders exactly as before (regression check, `IPSR-R-10`).

### Relevant skills

- `angular-developer` (standalone component `@Input`, template `@for`)
- `spartan` — not applicable here (no new Spartan/Helm component; reuses existing `app-alert-status` from `custom-fields`), but still consult the client `CLAUDE.md` styling rules if the alert needs any spacing utility.

## Coverage Traceability

| Requirement / Scenario | Task |
|---|---|
| `IPSR-R-1` | Task 1 (scope 2) |
| `IPSR-R-2` | Task 1 (scope 1, 3, 4, 5) |
| `IPSR-R-3` (empty-list no-render) | Task 1 (scope 2, test: empty-input assertion) |
| `IPSR-R-10` (page banner unchanged) | Task 1 (scope 6 — explicit non-touch; done-criteria regression check) |
| `IPSR-AC-1` | Task 1 (manual browser check + component test) |
| `IPSR-AC-2` | Task 1 (manual browser check on a complementary item) |
| `IPSR-AC-3` | Task 1 (component test, empty-input case) |

## Estimated LOC & PR Strategy

- **Estimated total LOC:** ~25 (implementation) + ~20-30 (tests) ≈ 50-55 LOC.
- **PR strategy:** Single PR — one small, cohesive prop-drilling change; splitting would add coordination overhead for no benefit.
