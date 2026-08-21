# lab-report-form

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

## Qué es
El formulario de creación de resultado que vive **dentro del aside** (`indicator-drawer`). Copia
input-driven de `aow-hlo-create-modal`: mismos campos, mismas reglas, sin `app-pr-dialog` y sin
leer `EntityAowService`. El modal sigue sirviendo todas las demás entradas.

## Contrato
```
inputs   tocNode · indicator · initiativeId (required) · programCode · emergingCategory
         columns (1|2) · canReport (gate del botón) · fundingSource ('w1w2' | 'w3bilateral')
outputs  created · dirtyChange
signals  canSave · currentResultIsKnowledgeProduct · needsCategoryChoice · categoryUnavailable
         resultTypes · kpEntryMode
```
- Payload: **no se arma aquí** → `../../../../shared/report-result/create-result-payload.util`.
- Handle: **no se valida aquí** → `../../../../shared/report-result/kp-handle.validator`.
- Catálogo de categorías: `ResultLevelService.resultLevelListSig` (signal).

## Dónde se usa
- `../indicator-drawer/indicator-drawer.component.html:69` — tab `report` del aside.

## Trampas (⚠️ = ya rompió algo)
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
- ⚠️ **Cambiar de categoría saliendo de Knowledge product limpia `mqapJson`, `handler` y título**
  (`onCategoryChange`). Sin eso se envía metadata de KP bajo otro tipo y el servidor la descarta sin
  avisar.
- `result_level_id` nulo → `categoryUnavailable()`: se dice que no se puede determinar, en vez de
  pintar un desplegable vacío.

## Layout — alineado al diseño (2026-08-21)
Encabezado de sección `The result`, campos apilados a ancho completo, y **cada campo multivalor
muestra su selección como chips con `×` debajo del control**. Footer sticky con el contador
`N fields left before you can create` + `Cancel` + `Create and continue`.

- `missingFields()` **es** el contrato de obligatoriedad: categoría (solo si el indicador no la
  trae), título, handle (solo KP) y **contribución**. `canSave()` no es más que
  `missingFields().length === 0`.
- ⚠️ **`Contribution to indicator target` pasó a ser OBLIGATORIO** — el diseño lo marca con `*` y
  antes se podía crear sin él. Un `0` cuenta como respondido; vacío o nulo, no.
- Los cinco multivalor usan `app-pr-multi-select` (no `pr-filter-multiselect`): su trigger conserva
  el placeholder del diseño en vez de sustituirlo por `N selected`, y los chips ya dicen qué hay
  elegido. Claves: centros `code`, science programs `id`, bilaterales **`project_id`**.
- No pasar `selectedLabel`: inyecta una línea gris `Description: Center(s) selected (N)` que el
  diseño no tiene y que duplica los chips.

## Desviaciones conocidas del diseño
- El chevron de los desplegables se pinta como **botón violeta cuadrado**; el diseño usa un chevron
  fino gris dentro del campo. Es chrome de `custom-fields/pr-multi-select`, compartido con toda la
  app: cambiarlo es un ticket aparte, no un retoque local.
- El contador dice `Max 30 words: 0 / 30` en vez de `0 / 30 words`. Mismo motivo.
- `Saved 2s ago` del diseño **no se pinta**: no hay autoguardado en este formulario y fingirlo sería
  mentir sobre el estado.

## Pendiente / Coming soon
- Pestaña **`Browse CGSpace`**: visible y deshabilitada con tag `Coming soon`. No hay endpoint de
  búsqueda — el server solo expone `mqap?handle=` (valida UNO) y `find/by-handle`. Ya especificado
  en **P2-3231** (épica **P2-3230**), levantado por Ángel. **No abrir ticket nuevo.**
- `fundingSource` existe pero solo vale `'w1w2'`: es el hueco para las secciones bilaterales
  (P2-3352 / P2-3341 / P2-3353). No añadir `Contribution %` ni `Primary contributing SP` aquí.
