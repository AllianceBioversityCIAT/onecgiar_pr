# Design — Integrate bilateral module into performance-refactor

## Context

- `performance-refactor` = Angular **21.2** + Spartan (brain/helm) + Tailwind 4. `primeng` is **absent from package.json**; `src/styles/primeng-custom-styles.scss` is deleted. Custom fields (`app-pr-select`, `app-pr-multi-select`, …) were rewritten as signal-based CVAs (`input()`/`output()`/`signal()`, `standalone: false`, registered via `CustomFieldsModule`).
- Juanda's branch `origin/001-AI-Driven-Evidence-Quality-Assessment-Module` = Angular 19 + PrimeNG 19, forked from `master` lineage (merge-base `5f3bb5330`). **Not dev-contaminated** (0 merge commits from dev). It adds `pages/bilateral/` (result creator with auto-save, MDS tracker, per-type sections), RFR-home center cards, Center-User admin role, ~53 server files, and OpenSpec/docs artifacts.
- Uncommitted local WIP exists (dashboard-lab ×3, untracked `openspec/changes/guided-result-reporting-flow/`) belonging to another session — the merge does not touch those paths and must leave them intact.

## Goals / Non-Goals

**Goals:**
1. Merge the branch locally (no push) preserving both sides' features in the 14 conflicted files.
2. Zero `primeng` imports/tags anywhere after migration; module compiles under Angular 21 strict build.
3. Bilateral module fully functional in the browser (creator flow, selects, accordion, auto-save paths reachable).
4. Bilateral UI matches the brand line (violet accent + navy-carbon chrome, Tailwind-only new styles).
5. `docs/system-design/design.md` documents the brand design line if missing.

**Non-Goals:**
- No new backend logic; server files arrive merge-only. Backend deploy remains Juanda's.
- No AI/text-mining integration work (contract still draft per Juanda's handoff).
- No push/PR/deploy — Yeck authorizes that separately.
- No re-refactor of Juanda's service architecture (signals/services stay as he wrote them unless Ng21 breaks them).

## Decisions

### D1 — Git strategy: true merge, not cherry-pick
`git merge origin/001-AI-Driven-Evidence-Quality-Assessment-Module` into `performance-refactor`. Branch is clean of dev; a merge preserves history and makes future syncs trivial. Cherry-picking 33 commits would multiply conflict passes.

### D2 — Conflict resolution policy (per file group)
| Grupo | Política |
|---|---|
| `user-management` ×6 | **Ours as UI skeleton** (redesigned admin), graft Juanda's Center-User role logic (TS logic, template bindings for role, spec updates). |
| `rfr-home` ×3 | **Ours as base** (insights widget + compact toggle + branding); insert his center-cards block + `center-report-stub` route wiring, restyled to brand. |
| `header-panel` ×2 | Combine: our redesign + his notification pop-up additions. |
| `routing-data.ts` | Union: add `bilateral` route into our table. |
| `primeng-custom-styles.scss` | **Keep deleted.** His additions were PrimeNG overrides for the module → replaced by the pr-* custom fields' own styling (nothing to port). |
| Server ×3 (`results-center.dto`, `toc-results.repository`, `toc-results.service.spec`) | Mechanical both-sides merge; compile-checked only via lint/ts, never run locally. |

### D3 — PrimeNG replacement map (data flow: API → service → component → template)
| PrimeNG | Reemplazo | Notas |
|---|---|---|
| `<p-select [options] [(ngModel)] optionLabel optionValue placeholder>` ×5 | `<app-pr-select>` | Same-shaped inputs exist (`options`, `optionLabel`, `optionValue`, `placeholder`, `required`, `disabled`); CVA → `[(ngModel)]` works as-is. Add `editable: true` where `RolesService.readOnly` would hide the control outside result-detail context. |
| `<p-multiSelect>` ×6 | `<app-pr-multi-select>` | Same CVA pattern; verify grouped options + disabled options props against current component API before wiring. |
| `MessageService` (primeng/api) in `bilateral-result-creator` | `api.alertsFe.show({id,title,description,status,closeIn})` (`CustomizedAlertsFeService`) | Same pattern as `result-creator.component.ts:209-240`. |
| `.p-accordion*` SCSS overrides (×10 hits) | Delete; `bilateral-accordion` is Juanda's own component — restyle it directly (Tailwind). |
| `SelectModule`/`MultiSelectModule` imports | `CustomFieldsModule` (or the standalone import path used by peer sections). |

### D4 — Angular 21 compatibility pass
- Known gotcha (memoria `project_ng21_spartan_cd_signals`): plain boolean/object fields set async and read in template stop rendering → convert those flags in bilateral components to `signal()`.
- Standalone semantics: Angular 19 defaults `standalone: true`; the module's declared-vs-imported wiring must be normalized to how peer pages on this branch do it (explicit `standalone: false` for NgModule-declared components).
- Keep his `@if/@for` / `*ngIf` as-is unless the build complains — no gratuitous rewrites (regla: cambios mínimos).

### D5 — Brand/UI pass (after functional green)
- Tokens: violet accent `#6b6dc4→#6461bc` (use `brand-*` Tailwind tokens / `--pr-color-primary-*`), chrome gradient `#1e202f→#1f2235` for headers/dark surfaces, Poppins, `material-icons-round`.
- **New styles: Tailwind utilities only** — no new custom SCSS classes (regla de memoria). Existing SCSS Juanda wrote may stay if functional, but visual retouches land as Tailwind.
- Run `/impeccable` guidance over the module's key screens (creator shell, section zero dashboard, accordion sections) for hierarchy/spacing/states.
- If `docs/system-design/design.md` lacks the violet/chrome design line, add a "Design Decisions" entry documenting: brand palette, gradient usage rules, Tailwind-first rule, icon set, dark-chrome table headers.

### D6 — Verification gates (in order)
1. `ng build` (production) green.
2. Jest: full client suite — Juanda's specs adapted if Ng21 render behavior breaks them (same class of fix as commit `c33f4a96f`).
3. Browser: `npm start` → navigate to bilateral route, exercise creator happy path against prtest back; screenshot evidence to `.local-screenshots/`.
4. Adversarial review (ultracode workflow): finders + refuting verifiers over the merged/migrated diff.

## Risks / Trade-offs

- [RFR home / user-management hand-merge drops a feature] → post-merge diff audit against both parents (`git diff HEAD^1`, `HEAD^2`) + browser check of both screens.
- [Bilateral server endpoints not deployed on prtest → module can't fully exercise E2E] → verify with read-only curl; if absent, functional verification is UI + mocked/unreachable-API tolerant paths, and flag to Yeck that runtime E2E needs Juanda's backend deploy.
- [pr-multi-select API mismatch (his grouped/filtered usage)] → verify each binding against the component source before swap; extend usage, never the shared component, unless strictly required.
- [His Jest specs assume Angular 19 rendering] → adapt specs per the established Ng21 fixes; do not delete tests.
- [Merge brings `.cursor/.gemini/.opencode` tooling files] → accept as-is (docs/tooling, zero runtime impact).

## Open Questions

- Whether prtest already serves `/api/bilateral/*` for this branch's isolated CloudFront env (checked during verification; affects how far "100% funcional" can be proven E2E).
