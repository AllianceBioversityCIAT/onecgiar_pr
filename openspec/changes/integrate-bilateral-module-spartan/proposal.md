# Proposal — Integrate bilateral module into performance-refactor (PrimeNG → Spartan migration)

> **Scope type:** full-stack merge, **frontend-only implementation work**. Server files arrive already implemented by Juanda's branch (merge-only, conflict resolution preserves both sides — no new backend logic is authored here).
> **Jira:** Epic [P2-2965](https://cgiarmel.atlassian.net/browse/P2-2965) (Bilateral AI-driven evidence quality assessment module).
> **Baseline:** `docs/prd.md`, `docs/system-design/design.md` (UI/UX), `docs/detailed-design/detailed-design.md`, `docs/specs/bilateral-ai-workflow/` (Juanda's spec, arrives with the merge).

## Why

Juanda developed the bilateral result-creation module (branch `origin/001-AI-Driven-Evidence-Quality-Assessment-Module`, 33 commits, ~245 files) on top of `master` — Angular 19 + PrimeNG 19. Our `performance-refactor` branch has since moved to **Angular 21 + Spartan UI + Tailwind 4 with PrimeNG fully removed**. His module will not compile or render on this branch as-is. It must be brought over, de-PrimeNG-ified, adapted to Angular 21 behavior, and aligned to the new brand design line so the module is 100% functional on the redesigned stack.

## What Changes

- **Merge** `origin/001-AI-Driven-Evidence-Quality-Assessment-Module` into `performance-refactor` (local merge, no push), resolving ~14 conflicts:
  - `admin-section/user-management` (×6) — combine Juanda's Center-User role logic with our redesigned admin UI.
  - `result-framework-reporting-home` (×3) — integrate his center-card section + `center-report-stub` route into our redesigned RFR home.
  - `header-panel` (×2) — combine notification pop-up changes.
  - `shared/routing/routing-data.ts` — add the `bilateral` route.
  - `src/styles/primeng-custom-styles.scss` — **stays deleted** (deleted in HEAD); any style his module needed moves into the module itself as Tailwind.
  - Server (×3): `results-center.dto.ts`, `toc-results.repository.ts`, `toc-results.service.spec.ts` — mechanical resolution keeping both sides' intent.
- **Migrate the bilateral module off PrimeNG** (the only remaining PrimeNG consumer after merge):
  - `<p-select>` (×5) / `<p-multiSelect>` (×6) → `app-pr-select` / `app-pr-multi-select` (Spartan-based custom fields).
  - `MessageService` (primeng/api) in `bilateral-result-creator` → project alerts service.
  - `.p-accordion` style overrides → native styles of the module's own `bilateral-accordion`.
  - Remove `primeng/*` imports and any dead PrimeNG module wiring.
- **Angular 21 compatibility pass**: template-bound async booleans → signals (known Ng21+Spartan CD gotcha), standalone/NgModule wiring, control-flow consistency.
- **Brand/UI alignment**: restyle the bilateral module surfaces to the new design line — violet accent `#6b6dc4` (`brand-*` tokens), navy-carbon chrome gradient `#1e202f → #1f2235`, Poppins, material-icons-round, **new styles in Tailwind only** (no new custom SCSS classes).
- **Document the brand rules** in `docs/system-design/design.md` if the violet/chrome design line is not yet captured there (it currently describes the pre-redesign token set).
- **Verification**: production build green, Jest suite green (including Juanda's specs), module exercised in the browser end-to-end.

## Capabilities

### New Capabilities
- `bilateral-module-integration`: the bilateral result-creator module (routing, sections, auto-save, MDS tracker) compiles, renders and functions on the Angular 21 + Spartan + Tailwind stack with zero PrimeNG dependencies, styled per the new brand line.

### Modified Capabilities
<!-- none — no requirement-level change to existing capabilities; conflict resolution preserves both sides' existing behavior -->

## Impact

- **Client:** new `src/app/pages/bilateral/` (~90 files), conflict-touched admin/user-management, RFR home, header-panel, routing tables; deletion of `primeng-custom-styles.scss` upheld.
- **Server:** ~53 files arrive from Juanda's branch via merge (bilateral endpoints, clarisa mappings, center-user role). No new server logic authored; deploy of those endpoints remains Juanda's side.
- **Docs:** `docs/specs/bilateral-ai-workflow/` arrives with merge; `docs/system-design/design.md` gains the current brand design-line rules if absent.
- **Risk:** RFR home and user-management are heavily diverged — resolution must preserve our redesign AND his features; mitigated by post-merge build/test/browser gates and adversarial review.
