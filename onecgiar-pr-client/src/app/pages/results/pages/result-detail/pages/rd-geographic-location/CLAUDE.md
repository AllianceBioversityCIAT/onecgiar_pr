# rd-geographic-location

**Verified:** 2026-09-10 · branch qa-development-2026-ss · UCA-T-7 rework attempt 2 (`docs/specs/changes/unsaved-changes-alert/`); prior: 2026-09-10 attempt 1 (FAILed) · 2026-08-26 · branch performance-refactor · 75d56f2cd

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

## `CanComponentDeactivate` (UCA-T-7)

Este componente implementa `CanComponentDeactivate` (`hasUnsavedChanges()` / `saveSection()`) para
el flujo "unsaved changes" de `docs/specs/changes/unsaved-changes-alert/`:

- `SectionDirtyTrackerService` inyectado **component-scoped** (`providers: [SectionDirtyTrackerService]`).
  Snapshotea `{ geographicLocationBody, extraGeographicLocationBody }` juntos — un edit en
  cualquiera de los dos cuenta como "sucio".
- Snapshot al final REAL de cada flujo de carga: dentro del `next` de `getSectionInformation()` /
  `getSectionInformationp25()`, después de `fillGeographicLocationBody`/`fillExtraGeographicLocationBody`.
  Esos dos `fill*` son 100% síncronos y no disparan ninguna llamada async secundaria ELLOS MISMOS —
  pero eso no era toda la historia (attempt 1 FAILed por esto): ver "CHILD component post-snapshot
  mutation" más abajo.
- ⚠️ **`app-sub-geoscope` (hijo, renderizado para `geo_scope_id === SUB_NATIONAL`) muta el MISMO
  objeto que este componente ya snapshoteó.** `SubGeoscopeComponent.ngOnInit()`
  (`shared/components/geoscope-management/components/sub-geoscope/sub-geoscope.component.ts:50-59`)
  escribe en `obj_country.sub_national` — un elemento de `geographicLocationBody.countries` (o de
  `extraGeographicLocationBody.countries`, ambos objetos pasan por `app-geoscope-management`) —
  primero de forma síncrona (`sub_national = sub_national || []`) y luego, tras resolver
  `GET_subNationalByIsoAlpha2`, de forma asíncrona (agrega una clave `formatedName` a cada fila).
  Las dos mutaciones llegan DESPUÉS del snapshot del padre: un resultado subnacional recién cargado
  y sin editar reportaba `hasUnsavedChanges() === true` en producción (Reviewer FAIL, attempt 1).
  **Fix (attempt 2):** `normalizeCountriesForDiff()` en el `.ts` — antes de snapshotear o diffear,
  normaliza `countries` en ambos cuerpos: `sub_national` faltante → `[]`, y se proyecta fuera la
  clave `formatedName` de cada entrada. Se aplicó normalización (no re-snapshot tras un "settled"
  signal) porque `SubGeoscopeComponent` no emite ninguna señal de "decoración terminada" — su
  `changed` output sólo dispara en ediciones de usuario — y es un componente compartido con
  IPSR/bilateral, fuera del alcance de esta tarea para modificarlo.
- `performSave()` snapshotea DIRECTO dentro del `tap` de éxito del PATCH (antes del reload delegado
  `getSectionInformation{,p25}()`), no sólo vía el reload — mismo patrón que la lección de rework de
  UCA-T-6 (si el reload falla, la sección no debe quedar "sucia" para siempre).
- `[appBeforeUnloadWarning]="hasUnsavedChanges.bind(this)"` en el root de `.component.html`.
- `canDeactivate: [UnsavedChangesGuard]` en la ruta INTERNA `{path: '', component: RdGeographicLocationComponent}`
  de `rd-geographic-location-routing.module.ts` — NO en la entrada `geographic-location` de
  `resultDetailRouting` (esa tiene `loadChildren` y ningún `component`; Angular invoca el guard ahí
  con `component: null` y `UnsavedChangesGuard` lo desreferencia sin chequear → `TypeError` en cada
  navegación. Bug cross-cutting corregido — ver `docs/specs/changes/unsaved-changes-alert/execution.md`).
- `UCA-OQ-2` (corregido en attempt 2 — el hallazgo de attempt 1 era incorrecto): pese al TIPO
  declarado `regions: number[]` / `countries: number[]` en `GeographicLocationBody`, en runtime
  `regions`/`countries` son arrays de OBJETOS completos (`pr-multi-select.onSelectOption()` guarda
  `{ ...option, ... }`, no el id) y `countries[i]` puede traer anidado un array `sub_national`
  (con `formatedName` una vez que `app-sub-geoscope` lo decora). Sigue siendo JSON-safe — sin
  `File`/`Blob`/refs circulares a ninguna profundidad — así que el round-trip de
  `SectionDirtyTrackerService` no pierde datos; lo que cambió es que la prueba anterior era
  tautológica (round-trip de un literal armado en el mismo test) y su hallazgo ("solo primitivos y
  arrays de números") no describía la forma real. El test corregido carga una fixture anidada real
  vía `getSectionInformation()` antes de round-trip-earla.

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
