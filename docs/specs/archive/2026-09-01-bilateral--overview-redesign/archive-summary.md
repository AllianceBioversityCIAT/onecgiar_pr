# Archive Summary — `bilateral/overview-redesign`

The Bilateral Center Overview tab (`/bilateral/:acronym/home`) went from a flat list of project codes to a KPI-led catalog: a summary strip that doubles as a one-click filter, a debounced multi-attribute search, and a Grid/Table switch persisted per session. All three tasks passed review; the shipped styling took a different route from the one `design.md` specified — see Accepted Warnings.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bilateral/overview-redesign/` |
| Archive date | 2026-09-01 |
| Final status | **Done** — `BIL-OVW-T-1`..`T-3` `[x]`, three Reviewer **PASS** verdicts |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Judgment Day | 1 pass, fix-only — **APPROVED** after FIND-01..FIND-05 (`judgment.md`) |
| Shipped in | `fd7c3826a` (35-file commit; subject names an unrelated feature — see Historical Notes) |

## Original Spec Path

`docs/specs/bilateral/overview-redesign/`

## Archive Date

2026-09-01

## Final Status

**Shipped on `qa-development-2026`.** All required tasks complete. `test-report.md` and `validation-report.md` absent — **accepted**: execute evidence lives in `execution.md` (scoped Jest 12/12 on the component, 876/876 across `pages/bilateral`; `ng lint` clean), and no `/akili-validate` was run. Consistent with the precedent set by `changes/kp-report-modal-auto-create`.

## Requirements Delivered

| ID | AC | Outcome |
|---|---|---|
| `BIL-OVW-R-1` | AC-1 | `kpiSummary` computed → `total`, `byProgram[]` (deduped per project, sorted desc), `multiProgramCount` |
| `BIL-OVW-R-2` | AC-2 | KPI cards filter on click; `setProgramFilter` / `setMultiProgramOnly` are mutually exclusive |
| `BIL-OVW-R-3` | AC-3 | Card grid: mono code badge, 2-line clamped full title, summary snippet, SP chips with allocations |
| `BIL-OVW-R-4` | AC-4 | Dense table view with dark chrome header |
| `BIL-OVW-R-5` | AC-4 | `viewMode` read/written to `sessionStorage` key `pr.bilateral.viewMode`, try/catch guarded |
| `BIL-OVW-R-6` | AC-5 | Token-normalized (NFD, diacritic-stripped) AND-search across code, title, summary, description, SP name/shortName/code |
| `BIL-OVW-R-7` | AC-6 | Empty state with working `Reset Filters` |
| `BIL-OVW-R-8` | AC-7 | `selectAndCreate()` delegates to `BilateralCreationService.selectProject` |

## Files Changed Summary

From `execution.md`, all under `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/`:

| Area | File | Delta in `fd7c3826a` |
|---|---|---|
| Logic | `bilateral-projects-panel.component.ts` | +160 |
| Template | `bilateral-projects-panel.component.html` | +335 |
| Styles | `bilateral-projects-panel.component.scss` | +631 (229 → 674 lines) |
| Tests | `bilateral-projects-panel.component.spec.ts` | +247 (new) |

No server, no migration, no API change.

## Test Evidence Summary

- Component spec: **12/12 passed**.
- Module scope `npx jest src/app/pages/bilateral`: **30 suites / 876 tests passed**.
- `npx ng lint --quiet`: clean.
- Full client Jest not run (repo rule: touched module only).
- No browser verification recorded for the responsive breakpoints (FIND-04's fix) — jsdom cannot measure them.

## Validation Summary

No `validation-report.md`. No unresolved FAIL findings. Conformance rests on Judgment Day (5 findings, all resolved pre-execution) plus three Reviewer PASS verdicts in `execution.md`.

**Caveat on the T-2 PASS.** The Reviewer recorded "verified against all UI/UX criteria," and the criteria it checked were the spec's. The spec itself was out of step with the client guide (next section) — so a clean review here is not evidence of guide conformance.

## Accepted Warnings Or Follow-Ups

1. **Design-token and icon debt — carried, not introduced clean.** The shipped SCSS holds **16 hardcoded hex literals** (`#1e202f`, `#7c3aed`, `#5733c4`, …; 6 before this spec) and the template uses **12 `pi pi-*` PrimeIcons classes** (7 before). `onecgiar-pr-client/CLAUDE.md` hard rules 8, 19 and 21 — no hardcoded hex, Tailwind-first for new styling, `@ng-icons/lucide` only, no new primeicons — have been in force since **2026-08-21**, seven days before execution. `design.md` §2/§4 itself prescribed PrimeIcons, and `judgment.md` FIND-05 declared colours "normalized to CSS variables" — a resolution the implementation did not carry. Follow-up: migrate the 10 new hexes to `var(--pr-color-*)` and the 5 new icons to Lucide; a full Tailwind migration of the 674-line SCSS is a separate, larger change.
2. **Component folder doc missing.** Sibling bilateral components (`section-geography`, `bilateral-results-list`, `my-draft-results`, …) each carry a `CLAUDE.md`; `bilateral-projects-panel/` has none, despite now owning a `sessionStorage` key, a `bpp_` class namespace, and non-obvious filter-exclusivity rules. Recorded as a `guide-sync` pending item.
3. **Root-guide claims falsified by the `performance-refactor` merge** (`853c606b0`, 2026-09-01), not by this spec — but caught by its sweep. Recorded as a `factual-sweep` pending item.
4. **`requirements.md` Status still reads `draft`** on a shipped spec. Cosmetic; archived as-is.
5. No commit requested at archive time.

## Historical Notes

- **Judgment Day earned its keep on state, not on style.** FIND-01 (missing `sessionStorage` persistence for `viewMode`) was a High confirmed by both judges and would have failed AC-4 in the field; FIND-02 (filters surviving a center switch → false empty state) was a latent data bug. Both were fixed in `design.md` before any code. The gate had no lens for the client guide's styling rules, which is where the spec actually drifted.
- **Traceability leak.** The implementation, this spec's whole document set, and two other specs' archives all landed in one 35-file commit (`fd7c3826a`, +4584/−180) whose subject is `feat(reporting): add collapsible explainer panels…`. Nothing links the commit to this spec; `git log` on the component path shows only unrelated subjects.
- `proposal.md` is historical; `requirements.md` + `design.md` supersede it.
- The mockup (`mockup/overview-mockup.html`, 1257 lines) is preserved in the archive as the visual reference.
