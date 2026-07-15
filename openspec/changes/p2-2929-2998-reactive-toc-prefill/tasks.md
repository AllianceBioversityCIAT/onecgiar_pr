# Tasks: Reactive ToC prefill for SP & Centers

## 1. Science Programs effect

- [x] 1.1 Replace `preselectScienceEffect` with signature-based reconciliation: previous resolved ref ids vs current `referenceScience()`; same → no-op; changed → remove `new:true` items outside refs, add missing refs (`new:true, is_active:true`); keep Other sentinel/persisted/manual items; P2-3115 guard stays above; drop the `userTouchedScience` early-return

## 2. Centers effect

- [x] 2.1 Same reconciliation for `preselectCentersEffect` (key `institutionId` / `code`), calling `setPossibleLeadCenters(true)` after reconciling; drop the `userTouchedCenters` early-return
- [x] 2.2 Align `deleteContributingCenter` to `.filter()` reassignment (parity with `deleteScience`)
- [x] 2.3 Fix stale "SAVE NOT ADDRESSED YET" comment near `contributingCentersInfoNote`

## 3. Tests (Jest)

- [x] 3.1 Specs for reconciliation: node change removes stale preloaded + adds union; empty node leaves only Other; persisted/Other/manual survive; touched dropdown still reconciles; cold-load guard intact

## 4. Verification

- [x] 4.1 `npm run build:dev` green + suites tocadas verdes
- [x] 4.2 Runtime (local vs prtest-back, result 2026): Outcome 1→2 sin synergy limpia chips sin F5; 2º Outcome preselecciona unión; Centers igual; borrar+F5 no resucita (P2-3115)
- [x] 4.3 Commit en la épica + deploy dev + avisar a Santi para re-QA
