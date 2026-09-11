# lab-report-form

**Verified:** 2026-09-11 · qa-development-2026-ss (spec `changes/emerging-creation-hide-indicator-ui`, EHU-T-1: Card 2 + the ToC-attribution note are gated behind `!isEmerging()` — see "Trampa: Card 2/Card 3 comparten un solo `@if`" below); prior: 2026-09-11 · qa-development-2026-ss (spec `bugfix/emerging-contribution-not-required`, ECN-T-1: `missingFields()` no longer requires `contribution_to_indicator_target` when `isEmerging()` is true); prior: 2026-09-10 · qa-development-2026 · 2a4d965e9 (KPM-T-8, spec `changes/kp-multi-repository-browse`: Browse tab is now `Browse repositories`, live across CGSpace/MELSpace/WorldFish); prior: 2026-09-09 · qa-development-2026-ss · b1ca9ef1f (ERC-T-2); prior: 2026-09-05 · qa-development-2026 · b2d5f1c31

## Qué es
El formulario de creación de resultado que vive **dentro del aside** (`indicator-drawer`). Copia
input-driven de `aow-hlo-create-modal`: mismos campos, mismas reglas, sin `app-pr-dialog` y sin leer
`EntityAowService`. El modal sigue sirviendo todas las demás entradas.

## Contrato
```
inputs   tocNode · indicator · initiativeId (required) · programCode · emergingMode · emergingCategory
         columns (1|2) · canReport (gate del botón) · fundingSource ('w1w2' | 'w3bilateral')
outputs  created · dirtyChange
signals  canSave · currentResultIsKnowledgeProduct · needsResultLevelChoice · chosenResultLevelId
         needsCategoryChoice · categoryUnavailable · resultTypes · kpEntryMode
```
- Payload: **no se arma aquí** → `create-result-payload.util`. Handle: **no se valida aquí** →
  `kp-handle.validator` (ambos en `../../../../shared/report-result/`).
- Catálogo de categorías: `ResultLevelService.resultLevelListSig` (signal).
- `emergingMode=true` arma sin indicador ni categoría preseleccionada. Primero se elige
  Output/Outcome desde `ResultLevelService.outputOutcomeLevelsSig`, luego la categoría; el phase
  sigue siendo `dataControlSE.reportingCurrentPhase` y no hay selector local.
- **Dónde se usa:** `../indicator-drawer/indicator-drawer.component.html:69` — tab `report` del aside.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **Sin ToC (`tocNode: null`, emerging), el desplegable primario de Centers/Science Programs
  DEBE apuntar a `otherCentersList()`/`otherScienceList()` (catálogo completo), no a
  `dropdown1Options()`/`dropdown1ScienceOptions()`.** Estos últimos SIEMPRE incluyen el centinela
  `Other(s)`, así que sin la rama el usuario veía un desplegable con UN SOLO elemento ("Other(s)")
  y tenía que abrirlo para llegar al catálogo real (P2-3554-adjacent, spec
  `bugfix/emerging-result-contributor-catalog` ERC-T-2 — pivot desde `ERC-T-1`, que arregló
  `aow-hlo-create-modal.component.ts` pero ese ya no es el entry point vivo de "Report emerging
  result"). Los computeds `hasReferenceCenters`/`hasReferenceScience`
  (`this.tocCenters().length > 0` / `this.tocSciencePrograms().length > 0`) son el switch de rama
  en el template; el bloque secundario "Other(s)" queda doblemente gateado
  (`hasReferenceX() && showOtherX()`) para que no pueda renderizar en la rama sin ToC.
- ⚠️ **`isStatic` es lo que mantiene un campo editable, no `editable`.** `editable` está declarado
  en `pr-input` pero **nunca se lee** en su plantilla (solo `pr-select` lo usa). Y
  `RolesService.readOnly` vale `true` por defecto, así que sin `[isStatic]="true"` el campo se pinta
  como texto plano. Pasó con el handle: **ningún knowledge product se podía reportar**.
- ⚠️ **Para BLOQUEAR el título de un KP se usa `[disabled]`, no `[readOnly]`.** Con `isStatic` en
  `true`, la expresión de `pr-textarea` (`(readOnly() || rolesSE.readOnly) && !isStatic()`) es
  siempre `false` → `readOnly` es inerte. Y quitar `isStatic` bloquearía el título en **todas** las
  categorías. `[autogenerate]` acompaña para que el contador avise en vez de marcar error.
- ⚠️ **`app-pr-multi-select` necesita `optionValue`**: es la clave de identidad en
  `pr-multi-select.component.ts:355`. Sin ella `undefined == undefined` → `indexFind` es `0`
  siempre → **cada clic borra el elemento 0** en vez de añadir, y el centinela `Other(s)` no entra
  nunca cuando el ToC precarga centros. Centros usan `optionValue="code"`.
- ⚠️ **El catálogo de categorías se lee de un SIGNAL.** `ResultsListFilterService.filters` es un
  objeto plano: leerlo desde un `computed` memoiza la primera lectura vacía y **350 indicadores sin
  categoría quedan imposibles de reportar**. Inyectar `ResultLevelService` además garantiza que la
  carga se dispare (la lanza su constructor).
- ⚠️ **Emergente sin categoría necesita el flag explícito `emergingMode`.** `emergingCategory=null`
  por sí solo es el camino planned vacío y no arma el formulario. El nivel elegido es estado local;
  al crear se entrega al payload canónico junto con la categoría que el usuario ya escogió, sin
  `indicator` ni `toc_result_id`.
- ⚠️ **Cambiar de categoría saliendo de Knowledge product limpia `mqapJson`, `handler` y título**
  (`onCategoryChange`) — sin eso se envía metadata de KP bajo otro tipo y el servidor la descarta sin
  avisar. `result_level_id` nulo → `categoryUnavailable()`: se dice que no se puede determinar, en
  vez de pintar un desplegable vacío.

## Layout — alineado al diseño (2026-08-21)
Encabezado de sección `The result`, campos apilados a ancho completo, y **cada campo multivalor
muestra su selección como chips con `×` debajo del control**. Footer sticky con el contador
`N fields left before you can create` + `Cancel` + `Create and continue`.

- `missingFields()` **es** el contrato de obligatoriedad: categoría (solo si el indicador no la
  trae), título, handle (solo KP) y **contribución**. `canSave()` no es más que
  `missingFields().length === 0`.
- ⚠️ **`Contribution to indicator target` pasó a ser OBLIGATORIO** — el diseño lo marca con `*` y
  antes se podía crear sin él. Un `0` cuenta como respondido; vacío o nulo, no.
  **Excepción: en modo emergente (`isEmerging()` true) el check se salta entero** — sin ToC/indicador
  no hay meta; el campo sigue visible/editable (spec `bugfix/emerging-contribution-not-required`, ECN-T-1).
- Los cinco multivalor usan `app-pr-multi-select` (no `pr-filter-multiselect`): su trigger conserva
  el placeholder del diseño en vez de sustituirlo por `N selected`, y los chips ya dicen qué hay
  elegido. Claves: centros `code`, science programs `id`, bilaterales **`project_id`**.
- No pasar `selectedLabel`: inyecta una línea gris `Description: Center(s) selected (N)` que el
  diseño no tiene y que duplica los chips.

## Desviaciones conocidas del diseño
- Chevron de desplegables y formato del contador: chrome compartido de `custom-fields/pr-multi-select`, no un retoque local. `Saved 2s ago` **no se pinta**: no hay autoguardado y fingirlo mentiría sobre el estado.

## Trampa: Card 2 / Card 3 compartían un solo `@if` (spec `changes/emerging-creation-hide-indicator-ui`, EHU-T-1)
- ⚠️ Card 2 y Card 3 vivían bajo el MISMO `@if (!currentResultIsKnowledgeProduct() || kpEntryMode()
  === 'manual' || createResultBody().handler) { ... }`. Se **partió en dos `@if` independientes**,
  pero son **asimétricos — no los trates igual**: el de Card 2 (`!isEmerging() && (...)`) cierra
  justo tras su `</section>`. El de Card 3 (condición original, sin `isEmerging()`) **sigue abierto**
  hasta el final del `<form>` — envuelve además `autoCreateHint` y el footer sticky `Create and
  continue`, y es dueño del `@else` (footer Cancel-only de modo browse). `!isEmerging()` NO puede ir
  en esa condición ni cerrarse tras `</section>`: cualquiera de las dos huérfana el `@else` y borra
  el footer de creación en modo emergente.
- Solo `toc-attribution-note` (dentro de Card 3) se gatea tras `!isEmerging()`; los `<select>` debajo
  quedan siempre incondicionales.
- El número del header de Card 3 (`{{ isEmerging() ? '2' : '3' }}. Collaboration & Attribution`) es
  reactivo: con Card 2 oculta, Card 3 pasa a ser la 2ª tarjeta visible. Card 1 nunca cambia su "1.".

## Pendiente / Coming soon
- Pestaña **`Browse repositories`**: **VIVA** (`kpBrowseEnabled = true`, sin gate). Busca en
  **CGSpace, MELSpace y WorldFish** vía `app-kp-cgspace-browse`
  (`GET /api/results/knowledge-products/cgspace/search`), no solo `mqap?handle=`. `onCgspaceItemSelected`
  guarda `selectedKpRepository` y el banner nombra el repo real (`kpRepositoryLabel`,
  `kp-repositories.constants.ts`). Si una nota vieja dice "oculto" o "sin endpoint", desconfía.
- `fundingSource` existe pero solo vale `'w1w2'`: hueco para las secciones bilaterales (P2-3352 /
  P2-3341 / P2-3353). No añadir `Contribution %` ni `Primary contributing SP` aquí.

## P2-3420 — link to a QA'd Innovation Development result (English, per the repo rule)
Shown only for an **Innovation use** category (`result_type_id === 2`) from the **2026 phase**
onwards, directly below the result title. 🛑 The gate is `showsInnovationLinkQuestion()`
(`shared/services/global/qa-innovation-development-results.service.ts`) — a PHASE-year threshold,
never `isP25()`.

- `missingFields()` stays the requiredness contract: a "Yes" with no innovation chosen adds
  `Linked Innovation Development result`, which blocks `Create and continue`. "No" (default) never blocks.
- The answer goes into `buildCreateResultPayload({ hasInnovationLink, linkedResultId })` and lands
  **inside** `result` in the body — the server persists it during create. ⚠️ Chaining the
  innovation-use PATCH afterwards does not work (needs an `innovation_use_level_id` not yet assigned).
- Options come from `QaInnovationDevelopmentResultsService`; `display` (`[Result ID] - [Result
  Title]`) is precomputed because `pr-select` only searches `optionLabel`. Changing category resets the answer to "No".

