# Tasks: P2-3001 — W3/Bilateral Projects dropdown by Science Program

## 1. API service

- [x] 1.1 Add `GET_W3BilateralProjectsByProgram(programId: string)` in `results-api.service.ts` (next to `GET_W3BilateralProjects`, ~L1394) → `api/results-framework-reporting/bilateral-projects/by-program?programId=${programId}`

## 2. Surface 1 — C&P section (rd-contributors-and-partners)

- [x] 2.1 Branch `loadFilteredBilateralProjects` in `rd-contributors-and-partners.service.ts` on `fieldsManagerSE.isContributorsPartners2026()`: 2026 path resolves programId (`primaryInit?.official_code ?? currentResult?.initiative_official_code ?? currentResultSignal()?.initiative_official_code`), single by-program call, `fullName = project_name`, sets `hasTocResultMapped(true)`; unresolvable programId → empty list + console error
- [x] 2.2 Make `tocResultChanged` a no-op in 2026 when options are already loaded (no clearSelection, no refetch); 2025 path byte-identical to today (fan-out + dedup + clearSelection)
- [x] 2.3 Verify template gates still behave (`hasTocResultMapped` overlay never blocks in 2026; spinner works in both paths) — adjust `rd-contributors-and-partners.component.html` only if needed

## 3. Surface 2 — Report Result popup (entity-aow)

- [x] 3.1 Switch `getW3BilateralProjects()` in `entity-aow.service.ts` to `GET_W3BilateralProjectsByProgram(this.entityId())` (route param is already the SP official code)

## 4. Tests (Jest)

- [x] 4.1 `results-api.service.spec`: new method hits the by-program URL
- [x] 4.2 `rd-contributors-and-partners.service` specs: 2026 single-call path + programId fallback chain + unresolvable-programId degradation + 2025 legacy fan-out untouched + tocResultChanged no-op in 2026
- [x] 4.3 `entity-aow.service` specs: popup loads via by-program with `entityId()`

## 5. Verification

- [x] 5.1 `npm run build` (client) green
- [x] 5.2 Runtime check vs prtest-back (result 2026 con SP conocido): C&P dropdown lista completa del SP, sin pre-selección nueva, persistidos visibles; cambiar HLO no borra selección; resultado 2025 intacto
- [x] 5.3 Popup Report Result (entity-aow): dropdown lista completa del SP, vacío por defecto
