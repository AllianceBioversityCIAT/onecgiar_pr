# rd-geographic-location

**Verified:** 2026-08-26 · branch performance-refactor · 75d56f2cd

## Qué es
Sección "Geographic location" del detalle de un resultado: alcance geográfico (global / regional /
país / subnacional / por determinar) y, sólo para innovaciones P25, un segundo alcance de "otras
áreas donde podría haber impacto". Ruta: `/result/result-detail/<code>/geographic-location?phase=<id>`.

## Contrato
- Estado: dos objetos planos en el componente (NO signals) —
  `geographicLocationBody` (`geo_scope_id`, `regions[]`, `countries[]`, `has_regions`,
  `has_countries`) y `extraGeographicLocationBody` (los mismos + `has_extra_geo_scope`).
  `app-geoscope-management` los muta **en sitio** a través de `[body]`.
- Carga: `OnChangePortfolio = effect(...)` dispara en cuanto
  `DataControlService.currentResultSignal()?.portfolio` está definido; P25 → `getSectionInformationp25()`,
  resto → `getSectionInformation()`.
- Endpoints (`ResultsApiService`):
  - P25: `GET/PATCH /v2/api/geographic-location/{get|update}/geographic/<result_id>`
  - legacy: `GET /api/results/get/geographic/<id>` · `PATCH /api/results/update/geographic/<id>`
- Signals públicas: `sectionLoading`, `geographicFocusLabel`, `geographicFocusHeader`,
  `extraGeoScopeField`, `showExtraGeoScopeQuestion`, `extraGeoScopeHeader`.
- El green check lo resuelve el servidor (`validate_sections_mapped_batch`, sección
  `geographic-location`); el "N fields missing" del bottom bar es 100 % de front
  (`appFeedbackValidation` → `.pr-field.mandatory:not(.complete)`).

## Dónde se usa
- `shared/routing/routing-data.ts` — entrada `geographic-location` de `resultDetailRouting`.
- Reutiliza `shared/sections-components/geoscope-management` (compartido con IPSR y bilateral).

## Trampas (⚠️ = ya rompió algo)
- 🛑 **Fase ≠ portafolio.** `isP25()` decide de qué endpoint se lee; `isGeographicLocation2026()`
  (umbral en `ReportingDesignYear`, sobre `phase_year`) decide el TEXTO de la pregunta. En prtest
  hay resultados de fase 2025 dentro de P25: no son intercambiables.
- ⚠️ **Zoneless (Angular 21):** la carga viene de un `effect()` y los datos van a campos planos, así
  que sin `cdr.markForCheck()` el geoscope guardado no se pintaba hasta un clic ajeno
  (commit `0e763f9bb`). Cualquier asignación nueva desde un `subscribe` necesita el mismo
  `markForCheck()` — ver `fillGeographicLocationBody` / `releaseSkeleton`.
- ⚠️ **`appFeedbackValidation` de una pregunta oculta.** `[geoscope-management]-has_extra_geo_scope`
  lo esconde `FieldsManagerService` (`hide: isP22() || !isAnInnovation()`), pero su entrada de
  completitud se registraba siempre: en un resultado **P22** con foco no global el bottom bar
  decía "1 field missing — Are there any regions that you wish to specify for this Output?", una
  pregunta que no está en pantalla, y el contador nunca llegaba a cero (P2-3371, reproducido en el
  resultado 5453 fase 30). Ahora la pregunta y su entrada comparten el mismo `@if
  (showExtraGeoScopeQuestion())` y el rótulo sale de FieldsManager. **Regla: no registres una
  entrada de completitud para un control que FieldsManager puede ocultar.**
- ⚠️ `fillExtraGeographicLocationBody()` hace `Boolean(response.has_extra_geo_scope)`, así que un
  `null` del servidor ("sin responder") se vuelve indistinguible de un "No" real: la pregunta sale
  precontestada y nunca cuenta como faltante. Sólo la llama la rama P25.
- `fillGeographicLocationBody()` traduce el `geo_scope_id = 4` legacy a `GeoScopeEnum.COUNTRY` (3).
- Cambiar el foco geográfico SÍ limpia bien lo anterior: pasar de País a Región borra los países en
  BD, y pasar a Global borra regiones y países (verificado 26-ago-2026, resultado 8916).
- `app-section-bottom-bar` se oculta para Knowledge Product (`*ngIf="!isKnowledgeProduct"`): esa
  sección se sincroniza desde CGSpace con `app-sync-button`.
