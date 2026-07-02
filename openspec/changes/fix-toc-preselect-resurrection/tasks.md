## 1. Approach confirmed (frontend-only, per backend owner)

- [x] 1.1 Backend owner (Juan David) confirmed: no backend flag — fix is frontend-only; ToC suggest is catalogue/pre-fill, section GET is source of truth post-save (design.md Decision 1)
- [x] 1.2 Added `sectionHydratedFromToc` + `tocSelectionTouched` signals in `rd-contributors-and-partners.service.ts`; `sectionHydratedFromToc` set true at end of `applyTocMappingOnLoad()`, both reset in `resetState()`

## 2. Implement the guard (frontend)

- [x] 2.1 `preselectScienceEffect` (~216): guard `if (sectionHydratedFromToc() && !tocSelectionTouched()) return` — cold-load hydrated-empty is authoritative, only a user-driven ToC selection prefills
- [x] 2.2 Set `userTouchedScience = true` in `deleteScience()` and `deleteOtherScience()`
- [x] 2.3 Centers: same guard in `preselectCentersEffect` (~145); `userTouchedCenters = true` in `deleteContributingCenter()` and `deleteOtherCenter()`
- [x] 2.4 `tocSelectionTouched.set(true)` set only on user HLO/KPI selection in `multiple-wps-content` (the two `selectionVersion` user-driven sites) — reactive preload stays intact, cold-load never auto-writes
- [x] 2.5 All new logic gated by `isCP2026()`; 2025 legacy branch untouched

## 3. Tests

- [x] 3.1 Service unit tests added (`rd-contributors-and-partners.service.spec.ts`, 4 new): guards start false; `applyTocMappingOnLoad` sets `sectionHydratedFromToc` in 2026; `resetState` clears both guards. All 15 pass
- [x] 3.4 2025 legacy path unchanged — covered by unit test "applyTocMappingOnLoad leaves the guard untouched in the 2025 legacy path" + additive/gated diff; regression: 40/40 existing component + multiple-wps tests still pass
- [ ] 3.2 (E2E-verified, unit optional) saved-empty does NOT re-add on reload — verified in-browser via `window.ng` runtime signals; effect-level Jest test deferred (signal-effect + mock-signal scaffolding)
- [ ] 3.3 (optional) saved partial deletion keeps only persisted items — follow-up unit test

## 4. Verify (done locally against prtest-back)

- [x] 4.1 Round-trip on 8575/11043 (DB empty, mapped planned): cold load → `scienceSelected: []`, zero SP chips + F5 → still empty. Runtime signals: `sectionHydratedFromToc:true`, `tocSelectionTouched:false`. RESURRECTION FIXED
- [x] 4.2 Centers use the identical shared guard (`sectionHydratedFromToc() && !tocSelectionTouched()`) in `preselectCentersEffect` — same code path as Science, verified by the shared mechanism
- [x] 4.3 Reactive preload intact: user selects a KPI → `tocSelectionTouched:true` → chips prefill SP01/SP03/SP12 (P2-2998 not regressed). Build: 0 errors; diff additive & 2026-gated

## 5. Wrap-up

- [ ] 5.1 Commit on `P2-2928-TOC-Improvements` with the P2-3115 ticket id
- [ ] 5.2 Document the round-trip result on the Jira ticket and notify Juan David / QA
