# section-contributors

**Verified:** 2026-09-29 · JuanGuzman-io/p2-3821-us-understanding · P2-3821 External partners sale
del tracker MDS y se muda a Full metadata, opcional para todo tipo (se retiran el marcador
`required` y el hint rojo; el banner de centros se muda a Block 1, junto al selector de centros);
prior: 2026-09-24 · yzuniga/p2-3368-linked-bundled · P2-3823 blindaje (claves solo al tocar la pregunta, selector sin pérdida, entrada normalizada) + P2-3368 AC10-AC14 la pregunta enlazado/agrupado ya se guarda (se retira el `Coming soon`); prior: 2026-09-23 · JuanGuzman-io/fix-p2-3228-result · P2-3228 Lead center cae al centro líder del resultado sin proyecto; prior: 2026-09-22 · JuanGuzman-io/review-p2-3793-understanding · BCT-T-6 lock + auto-select derived Centers; prior: 2026-09-21 · santiago.sanchez/qa-development-2026-ss · BIL-T-1 `centersLoadFailed` + Retry banner for a failed centers-catalogue load; prior: 2026-09-18 · yzuniga/qa-batch-2026-09-18 · P2-3520 los cuatro selectores ya no se abren en solo-lectura; prior: 2026-09-18 · JuanGuzman-io/feature-p2-3150-bilateral · feedback IA por sección

## Qué es
Sección 2 del formulario bilateral (W3/Bilateral): a quién se atribuye el resultado — centro líder,
centros CGIAR contribuyentes, proyectos W3/bilaterales y programas científicos en Block 1, y
—detrás del toggle Full Metadata— los socios externos (opcionales desde P2-3821) y la pregunta de
resultado enlazado/agrupado. Historia: **P2-3368**, **P2-3821**.

Si la evaluación IA devuelve un veredicto ámbar/rojo y no hay una marca de campo específica,
`app-bilateral-field-quality-flag` muestra el feedback de Contributors & Partners.

## Contrato
- **Estado ajeno (fuente de verdad):** `BilateralCreationService` — el resultado cargado
  (`resultLeadCenterId()`, `resultContributingCenterIds/ProjectIds()`, `currentResultId()`). Las
  signals propias del componente son selección de UI y se leen del `.ts`.
- **Persistencia:** `BilateralAutoSaveService.saveContributors(...)` →
  `PATCH /api/bilateral/center/contributors/:id`. 🛑 **Cada clave del payload va condicionada a su
  flag de hidratación** — ver la primera trampa; enviar una clave de más borra datos.
- **Hidratación de socios (P2-3443):** `loadExternalPartnersState()` lee **una vez por resultado**
  `GET /api/results/bilateral/:id` (`BilateralApiService.GET_BilateralResultDetail`) y toma
  `contributingInstitutions[].institutions_id` + `commonFields.no_applicable_partner`.
  `BilateralCreationService` no guarda nada de eso; por eso se relee aquí y no se lee de él.
- **Catálogos:** `CentersService`, `GET_ClarisaProjects()`, `institutionsWithoutCentersPartners()`
  (**signal**), `InnovationUseResultsService.resultsList`. Que carguen tarde es el origen de la
  primera trampa.
- **Progreso / Submit:** `BilateralMdsTrackerService.setSectionFields('contributors', […],
  'partners')` incluye `lead-center`; `lead-project` cuenta solo si el resultado cargado tiene
  proyecto líder (los resultados de API o versionados pueden no tenerlo). 🛑 **`external-partners`
  YA NO se publica al tracker desde P2-3821** (el PO alineó el cliente con el Fetcher, que nunca
  exigió `contributing_partners`): el campo se movió a Full metadata y es opcional para **todos**
  los tipos, así que ya no puede bloquear Submit ni la completitud de la sección. Ver la trampa más
  abajo — la invariante de no reportar satisfecho lo que el payload descarta sigue viva, sólo que
  ahora vive en `hiddenFieldsWithValues()`, no en el tracker.
  ⚠️ **El grupo `toc` que publica `<app-section-toc>` en este mismo bucket va todo
  `optional: true` desde el 9-sep-2026** (decisión del PO): se lista en el checklist pero **no
  cuenta** para el porcentaje ni para `overallStatus()`, que es el único gate del "Submit for
  review". Con el Primary Science Program elegido ya se puede pasar a Pending Review; el servidor
  nunca pidió más (`bilateral-center.service.ts → submitForReview`: centro líder del que el usuario
  es miembro + Science Program asignado). Los ítems de `partners` (`lead-center`, y `lead-project`
  cuando hay proyecto líder) **sí** siguen contando; `external-partners` ya no (P2-3821).
- **Coming soon:** ya **no queda ningún control** en ese estado. El último en salir fue
  enlazado/agrupado el 24-sep-2026 (P2-3368 AC10-AC14); los contributing science programs habían
  salido el 3-sep. La regla sigue viva: un control sin storage va **visible pero deshabilitado con
  el tag**, nunca aceptando un valor que se tira.
- **Gates del template expuestos como computeds**: el spec sobreescribe el template, así que un
  `@if` inline quedaría sin test. Si añades un gate nuevo, exponlo igual.

## Dónde se usa
- `src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html:201`
  — dentro del acordeón de secciones del formulario bilateral.
- Renderiza a su vez `<app-section-toc>` (`../section-toc/`), que es quien pinta la pregunta
  **"Can this result be mapped to a ToC KPI?"** (P2-3142 — misma frase que el clásico, ver trampas).

## Trampas

- ⚠️ **La escalera de `z-index` de `.sc-block` solo vale si el panel cae hacia ABAJO.** Los bloques
  se apilan en orden descendente (`--toc:200 … --partners:20`) para que un multi-select abierto
  tape al bloque siguiente (QA 2026-08-28). Desde `P2-3737` un campo pegado al suelo abre su panel
  **hacia arriba** (`.options_up`), y entonces la escalera juega al revés: el bloque de arriba, que
  tiene más `z-index`, pinta sus chips **encima** de la lista abierta y además **se queda con los
  clicks** de las opciones que quedan debajo (medido en prtest #9432: 41px de solape,
  `elementFromPoint` devolvía `.sc-selected-chips`, no `.option`). Lo arregla `&:focus-within`
  (`z-index: 300`, `P2-3776`): manda el bloque que se está usando, abra hacia donde abra.
  🛑 **Si añades un peldaño nuevo a la escalera, que no pase de 300** o el arreglo deja de valer —
  el candado que lo vigila está en `section-contributors.component.spec.ts`.

- ⚠️ **P2-3228 (23-sep-2026): un resultado bilateral puede NO tener proyecto** (los que llegan por API: 7663 en prtest, `project_id: null`, `contributingProjects: []`). El valor read-only "Lead center" sale de `leadCenterLabel()`: primero la organización del proyecto líder y, si no hay, `resultLeadCenterId()` buscado en `availableCenters()`. Antes leía sólo el proyecto y pintaba " - " aunque el centro líder estuviera guardado y seleccionado abajo como chip.
- ⚠️ **`contributing_center` / `contributing_bilateral_projects` no viajan hasta que
  `contributorsHydrated()` es `true`** (flag **independiente** de `partnersHydrated`). Se filtran
  contra los catálogos, así que antes de que carguen —o tras un GET fallido, que igual pone
  `projectsReady` en `true`— quedan en `[]`. Y `[]` no es "sin cambios": `updateCenter` corre
  `upDateAllInactive` **sin excluir `is_leading_result`**, y `syncBilateralProjects` tira el
  proyecto líder. Sin centro líder, `assertCenterPermission` rechaza el submit para siempre y **el
  usuario no puede arreglarlo** (el líder es read-only aquí). Clave omitida = "no tocar".
  Backstop: `syncContributingCenters` une los `leadingCodes` antes de `updateCenter`.
- 🛑 **BCT-T-6 (22-sep-2026): un centro dueño de un proyecto no líder seleccionado queda bloqueado
  igual que el líder.** `ownerCenterInstitutionId` viaja en `ProjectOption` desde
  `owner_center_institution_id` del catálogo (`GET clarisa/projects/get/all`, BCT-DD-4); `null` no
  bloquea nada. `lockedCenterInstitutionIds` excluye el proyecto líder y el propio centro líder (el
  proyecto del centro que reporta no bloquea nada — no hay nada que agregar, ya es el líder). Es
  union, no reemplazo: `onProjectsChange` **une** el set bloqueado a lo que el usuario ya tenía
  seleccionado, antes del único persist — nunca lo reemplaza. `onCentersChange`/`removeCenter` lo
  rechazan igual que al líder, y el chip oculta su "×" igual que el del líder
  (`!isLeadCenter(id) && !lockedCenterInstitutionIds().has(id)`, con la misma clase
  `sc-chip-readonly`). `hydrateLeadAndSelection` lo une **sin** persistir (mismo patrón que la
  reinyección del líder). Quitar el proyecto NO deselecciona el centro (queda "sticky", BCT-R-4):
  el candado simplemente deja de aplicar porque el set es un `computed`, no un flag guardado, y
  entonces sí vuelve a ser removible.
 (⚠️ = ya rompió algo, o va a romper)

- ✅ **P2-3443 resuelto para socios externos** (26-ago-2026). Ojo con la clave: es `institutions_id`,
  **no** `institution_id` — ese es el de centros y resuelve a `clarisa_center.code`.
  `syncExternalPartners()` espeja `savePartnersInstitutionsByResultV2` (pool funding). Sin migración.
- ⚠️ **Rol de socio como en pool funding:** `8` si hay fila en `results_knowledge_product`, `2` si
  no. Elegirlo mal **no revienta**: esconde los socios del GET y del green check (`IN (2,8)`).
- 🛑 **INVARIANTE: nada se reporta como satisfecho mientras el payload descarta sus claves.**
  Antes vivía en el tracker (`external-partners` sólo iba `filled: true` si `partnersHydrated()`);
  **desde P2-3821 el campo ya no está en el tracker**, así que la invariante se mudó a
  `hiddenFieldsWithValues()`: el conteo de socios sólo suma 1 cuando `partnersHydrated() &&
  externalPartnersSatisfied()`, nunca antes. Sin esto, el GET de detalle podía fallar, el usuario
  elegía socios, la nota de "N campos ocultos" prometía guardarlos y **cada PATCH tiraba
  `institutions`**: no se escribía nada. Si tocas `buildContributorsPayload()`, toca también
  `hiddenFieldsWithValues()`.
- ⚠️ **El efecto de hidratación NO se reintenta solo.** `hydrateWhenReady` sólo corre cuando cambia
  una de sus señales, y tras la carga inicial ninguna cambia. Por eso el fallo se muestra:
  `partnersLoadFailed()` pinta un `app-alert-status status="error"` con el botón
  **Retry loading partners** → `retryLoadExternalPartners()`, que es el ÚNICO camino de vuelta.
- 🛑 **BIL-T-1 (21-sep-2026): el mismo agujero existía un paso antes, en `loadCenters()`.**
  `CentersService.getData()` sólo emite `loadedCenters` en éxito; si agota sus reintentos y
  rechaza, el viejo `.catch(() => {})` no dejaba rastro: `centersReady()` se quedaba en `false`
  para siempre, `hydrateWhenReady` nunca corría, y por tanto `loadExternalPartnersState()` tampoco
  — `partnersHydrated()` nunca llegaba a evaluarse, con cero error visible (la causa raíz original
  de "External partners" atascado). Ahora `centersLoadFailed()` pinta el mismo patrón
  `app-alert-status status="error"` + botón **Retry loading centers** → `retryLoadCenters()`.
  🛑 **Desde P2-3821 este banner vive en Block 1** (`sc-block--centers`, junto al selector de
  centros, BIL-R-5/BIL-DD-3), **no** junto a `partnersLoadFailed()`: reporta un fallo de catálogo
  que bloquea todo el guardado, y debe seguir visible aunque Full metadata esté colapsado — el
  banner de socios (`partnersLoadFailed()`) sí se movió dentro de Full metadata, porque es sobre un
  campo que ahora vive ahí. No se tocó `CentersService` (fuera de alcance, ~25 pantallas
  consumidoras — Option C rechazada).
- ⚠️ Mismo mecanismo para los socios: `saveContributors` se dispara con cada cambio de
  centro/proyecto, así que un `institutions: []` prematuro **borraría los socios guardados**. El
  `error` del GET deja `partnersHydrated` en `false` a propósito.
- 🛑 **`is_lead_by_partner` se manda SIEMPRE en `false`, y es una decisión.** La sección no tiene
  control de "lo lidera un socio" y el centro líder es de solo lectura, así que el valor es
  derivable. Se manda explícito porque la validación trata `NULL` como "sin contestar" y nunca
  pondría la sección en verde. Si bilateral admite lead partner algún día, este es el punto a tocar.
- ✅ **`external-partners` YA NO se publica al tracker — decisión P2-3821, no un descuido.**
  Historia completa: se sacó el 25-ago (el dato no se guardaba y Submit quedaba bloqueado sin
  salida), se **restauró** con P2-3443 una vez la persistencia se arregló, y el 29-sep-2026 el PO
  la sacó por tercera vez y esta vez **a propósito y para quedarse**: alineó el formulario con el
  Fetcher, que nunca exigió `contributing_partners` (`common_fields.json`, ver
  `docs/specs/bilateral/contributors-partners-optional/requirements.md`). El campo se movió a Full
  metadata y es opcional para todo tipo de resultado — ya no bloquea Submit ni cuenta para la
  completitud de la sección.
  🛑 **Si la persistencia vuelve a romperse, la reparación es arreglar `partnersHydrated()` /
  `buildContributorsPayload()` — NO restaurar el ítem del tracker.** Restaurarlo revertiría la
  decisión P2-3821 sin que nadie lo pidiera: la UI ya no llama obligatorio a este campo (sin
  marcador `required`, sin hint rojo), y un ítem de tracker detrás de eso volvería a bloquear
  Submit sin que la pantalla explique por qué — el mismo defecto que motivó sacarlo la primera vez.
  Centros y proyectos siguen fuera del tracker por otro motivo (P2-3348: van
  `[required]="false"`, y trackear un campo que la UI llama Optional bloquea Submit sin
  explicación) — misma razón, ahora también la de socios.
- ✅ **Enlazado/agrupado ya se persiste** (P2-3368 AC10-AC14, 24-sep-2026): `has_innovation_link` +
  `linked_results` en `SaveBilateralContributorsDto`, y de vuelta en el detalle como
  `commonFields.has_innovation_link` + `linkedResults`. `hiddenFieldsWithValues()` vuelve a contarlo.
  - 🛑 **La escritura es ESTRECHA a propósito** (`bilateral-center.service.ts → syncLinkedBundledAnswer`):
    `linked_result` es **compartida** con la sección P22 *Links to results*, y este endpoint autosalva
    en cada cambio de centro o proyecto. Protocolo P2-3424: "Yes" + selección reemplaza · "Yes" sin
    `linked_results` solo cambia el flag · "No" limpia **sólo** si lo guardado era "Yes" · pregunta
    sin responder u omitida **no toca nada**. Nunca uses `createForInnovationUse`: con selección
    vacía barre todas las filas del origen.
    ⚠️ **"Estrecha" perdona SOLO las filas `legacy_link`** (id NULL). Las que escribió P22 *Links to
    results* desde el editor clásico llevan id real y **sí** se reemplazan/desactivan — la tabla no
    guarda qué sección escribió cada fila (corregido en P2-3823; el comentario original decía lo contrario).
    🛑 **Sin `ValidationPipe`** en esta ruta: el servicio normaliza. Flag que no sea booleano real =
    ausente; lista que no sea array (incluido `null`) = ausente; fuera auto-enlace e inactivos.
  - 🛑 **Tipos 2 y 7 quedan FUERA** (`linkedQuestionOwnedElsewhere()`): Innovation Use pregunta lo
    mismo en su sección de tipo (decisión de Ángel Jarrín, 10-sep-2026, P2-3424) e Innovation
    Development espeja el flag en `results_innovations_dev.has_innovation_link`, que es lo que leen
    las funciones del green check. Dos superficies sobre una respuesta = defecto P2-3199. El bloque
    se **oculta**, no se deshabilita, y el servidor ignora las claves igual.
  - 🛑 **`linkedHydrated` manda**: las claves no viajan hasta que la lectura del detalle vuelve, igual
    que `partnersHydrated`. Sin ese guard, el primer cambio de centro de la sesión pisa un "Yes"
    guardado.
  - 🛑 **P2-3823 — las claves viajan solo desde que el usuario TOCA la pregunta** (`linkedAnswerTouched`;
    la lista, solo si tocó el selector: `linkedListTouched`). Antes cada autosave de centros reenviaba
    la foto de enlaces de esa pestaña y el server la reemplazaba: un enlace puesto desde otra pestaña
    se perdía con un cambio de centro. ⚠️ Y **no** "solo en el clic": `BilateralAutoSaveService`
    guarda UN payload pendiente por endpoint y lo **reemplaza**; si solo el PATCH de la pregunta
    llevara las claves, el cambio de centro siguiente lo pisaría en la cola.
  - 🛑 **El selector no puede perder enlaces**: `pr-multi-select.writeValue` descarta ids que no están
    en `[options]`, y el catálogo solo lista resultados QA'd/aprobados y llega tarde. Por eso
    `linkedResultOptions()` = catálogo + un placeholder *"Result not in the list (internal id N)"* por
    cada id guardado desconocido, y `linkedResultModel()` es un array nuevo en cada cambio de opciones
    (fuerza el re-mapeo). `onLinkedResultsModelChange` además une los ids que el selector no recibió.
    El catálogo llega como signal por `InnovationUseResultsService.resultsListSig` (aditivo).
  - Radio bloqueado hasta `linkedHydrated()` y contador AC13 en 0 sin hidratar. Tests del radio
    en `readonly.spec` bajan `RolesService.readOnly` (arranca en TRUE y deshabilita todos los radios).
  - ⚠️ El W1/W2 clásico usa el mismo `pr-multi-select` y comparte el hueco de los ids fuera del
    catálogo. No se tocó aquí (dueño: result-framework-reporting).
- ⚠️ **No se escriben delivery types ni presupuesto de socio**, a diferencia de pool funding: P2-3368
  AC6 los deja fuera de bilateral. Pero `validation_partners_P25` exige una fila en
  `result_by_institutions_by_deliveries_type` **por cada socio**, así que el green check de partners
  no se pondrá verde en bilateral hasta que producto defina qué va ahí.
- 🛑 **`[isStatic]` en `pr-multi-select` ANULA su solo-lectura — va atado a `!readOnly()`, nunca a
  `true` a secas** (P2-3520, 18-sep-2026). El disparador se dibuja si
  `(!hideSelect() && !(readOnly() || rolesSE.readOnly)) || isStatic()`
  (`pr-multi-select.component.html:16`) y las casillas de dentro sólo obedecen a `option.disabled`:
  con `true` fijo, un resultado en Pending Review dejaba abrir los cuatro selectores y marcar
  opciones (medido en prtest, resultado #9464). El PATCH nunca escribió nada — el defecto era que
  **la pantalla mentía**. Se arregló desde aquí y **no tocando `pr-multi-select`**, que es
  compartido por toda la app; en modo editable `!readOnly()` vale `true`, o sea exactamente lo de
  antes (`validateShowDeleteButton`, líneas 259/262, da `false` en los dos casos).
  ⚠️ **Sigue con `[isStatic]="true"` duro**, y por tanto clicable en solo-lectura, el
  `app-pr-checkbox` *"This result has no external partners"* (línea 168); no entraba en el alcance
  del ticket. El multi-select de *Select a result* **ya se corrigió** el 24-sep (P2-3368): pasa
  `[isStatic]="!readOnly()"` y lo cubre `section-contributors.readonly.spec.ts`.
- ⚠️ **`selectedProject().sciencePrograms` viene `[]` al cargar un resultado existente**
  (`bilateral-creation.service.ts:170`). El multi-select de "Contributing science programs" sólo se
  renderiza si hay opciones; en un resultado guardado se ven únicamente los chips read-only. No
  "arreglarlo" pintando un dropdown vacío.
- **Socios: leer el catálogo por la SIGNAL, nunca por el array plano.**
  `institutionsWithoutCentersPartners()` es signal; `institutionsWithoutCentersListPartners` es un
  array normal y un `computed()` encima cachea la lista vacía para siempre (P2-3335).
- ⚠️ **La pregunta de ToC está duplicada en dos sitios y NO comparten gate.** Aquí la pinta
  `../section-toc/section-toc.component.html:3` de forma incondicional; en el clásico la pinta
  `rd-contributors-and-partners.component.ts:105` **detrás de `isCP2026()`** (`phase_year >= 2026`),
  con una redacción distinta para 2025. En bilateral no hay gate porque el listado sólo ofrece fases
  del portafolio P25 (`bilateral-results-list.component.ts:244`) y ese portafolio **incluye 2025**:
  abrir un resultado de fase 2025 en el creador bilateral mostraría la frase de 2026. Nadie ha pedido
  la variante 2025 para bilateral, así que **no se inventa**; si aparece, el gate correcto es
  `BilateralCreationService.reportingYear()` contra un umbral de año de fase — nunca `isP25()` — como
  ya hace `../section-type-specific/type-innovation-use/type-innovation-use.component.ts:47`.
- **La frase de enlazado/agrupado está duplicada en tres sitios** (aquí en
  `linkedResultQuestionLabel`, en `rd-contributors-and-partners.component.ts:234`, y en
  `FieldsManagerService.fields()['[innovation-use-form]-has-innovation-link']`). P2-3358 las unificó
  en texto; si tocas la frase, tócala en los tres.

## Pendiente / no construido (con motivo)

| Qué | Por qué no está | Quién lo desbloquea |
|---|---|---|
| ToC KPI read-only para researcher (AC2) | Vive en `../section-toc/section-toc.component.html:3`, **fuera de esta carpeta**, y no acepta input de solo-lectura. Además **no existe el rol "SP staff"** en el cliente. | Producto (definir el rol) + ticket que toque `section-toc` |
| Tooltip ⓘ en centros y en proyectos W3 | P2-3368 pide el icono pero **no da el texto**, y W1/W2 no tiene ninguno que reutilizar. | Producto (redactar el copy) |
| ~~Guardado de contributing science programs~~ | **Hecho 2026-09-03:** `contributing_programs[]` en el DTO, filas rol 2 en `results_by_inititiative`, catálogo P25 completo (`clarisa/initiatives/p25`). Ver nota al final. | — |
| ~~Guardado de enlazado/agrupado + linked results~~ | **Hecho 2026-09-24** (P2-3368 AC10-AC14): claves en el DTO, protocolo estrecho P2-3424, detalle devuelve `linkedResults`. | — |
| Enlazado/agrupado para Innovation Use (2) e Innovation Development (7) | Tipo 2 lo pregunta en su propia sección (P2-3424); tipo 7 necesita el espejo `results_innovations_dev` que sólo mantiene el writer clásico y que leen las funciones del green check. | Producto + el dueño del green check |
| Validación "Yes ⇒ al menos un enlace" en el green check | `validation_contributor_partner_*` no lee `result.has_innovation_link` para tipos no-innovación. **No verificado contra la BD viva** (hace falta VPN). AC10-AC14 no lo piden. | Producto + el dueño del green check |
| Green check de partners en bilateral | La función MySQL exige un delivery type por socio y bilateral no los captura (AC6). | Producto + BACK |

## Tests
`section-contributors.component.spec.ts` — 157 casos (P2-3228 añadió 3: etiqueta del Lead center sin proyecto; BCT-T-6 añadió 12: lock/auto-select de centros
derivados; BIL-T-1 añadió 7: centers-load-failure regression; P2-3821/BCP-T-1 reescribió los casos
del tracker y de `hiddenFieldsWithValues()` para que ninguno espere `external-partners`, y añadió los
de `showFullMetadata`). El template se sobreescribe con
`<div></div>`: **no hay assertions de DOM**, todo va por signals/computeds — y eso es justo lo que
dejó pasar el hueco de P2-3520 (ver la trampa de `isStatic`).

`section-contributors.readonly.spec.ts` — 29 casos (BIL-T-1 añadió 3: banner/Retry de centers
renderizado en el DOM real; P2-3821/BCP-T-2 añadió 6: el picker "External partners" ausente/presente
según `showAllFields()` para tipo 1 y tipo 2, sin marcador `required` ni hint rojo, y el banner de
centros renderizado con Full metadata colapsado — y reescribió los casos de `PARTNER_PICKER_LABELS`
para expandir Full metadata antes de buscar "External partners"), y **sí renderiza el template
real** (stubea solo `<app-section-toc>`, que arrastra el diálogo de Spartan). Mide, por cada uno de
los cuatro selectores, cuántos nodos enfocables no deshabilitados quedan: 0 en solo-lectura, >0 en
editable.
Si añades un control nuevo a la sección, este spec lo cuenta solo.

## 2026-09-03 — Contributing science programs ya se guardan y salen siempre

Pedido de Nicoleta Trifa vía Ángel: "the Contributing P/A question is missing… regardless of the
mapping %, this option needs to be available". Antes las opciones eran los SPs **del proyecto** menos
el primario: con un proyecto mapeado 100% a un programa la lista quedaba vacía y la card no se
renderizaba; en un resultado guardado tampoco (`sciencePrograms: []` al cargar). Y el control estaba
`Coming soon` porque el DTO no tenía campo.

- **Opciones:** `sciencePrograms` (signal) cargado en `ngOnInit` con `api.resultsSE.GET_AllInitiatives('p25')`
  → `clarisa/initiatives/p25` (tipos de entidad 22/23/24 = programas y aceleradores P25). Menos el
  primario. Los SPs del proyecto quedan como fallback mientras carga el catálogo.
- **Card siempre visible** (se quitó el `@if` exterior y el tag `Coming soon` del bloque de SPs).
  `unpersistedFieldsComingSoon` **ya no existe**: el 24-sep-2026 salió también enlazado/agrupado.
- **Guardado:** `buildContributorsPayload()` manda `contributing_programs: [{ science_program_id: programCode }]`
  cuando `contributorsHydrated()`; `onSecondarySpsModelChange` llama `persistContributors()`.
  🛑 **Desde 2026-09-04 el server (`syncContributingPrograms`) escribe DRAFTS de `share_result_request`
  (status 4, la misma forma del ingest), NO filas rol 2.** Rol 2 significa "el programa ya aceptó":
  escribirlo desde el form saltaba el consentimiento del contribuidor y el approve del SP
  (`updateResultByInitiative`) lo BORRABA por no tener solicitud que lo respalde. Con drafts, el
  approve los convierte en solicitudes pending (email + card accept/decline, P2-3187) y la aceptación
  del SP es la que crea el rol 2. Quitar un programa del form cancela su draft/pending y desactiva un
  rol 2 ya aceptado (igual que antes).
- **Lectura:** `BilateralCreationService.loadResult` hidrata `selectedSecondarySps` con la UNIÓN de las
  filas rol 2 (`contributing_and_primary_initiative`) y las solicitudes draft/pending
  (`pending_contributing_initiatives`, que el detalle expone también en Editing/Draft desde
  2026-09-04), deduplicada por id. El primario se busca por rol 1 (antes era `[0]`, correcto sólo
  por suerte).
- **Chips con nombre completo (feedback 2026-09-04):** el chip seleccionado muestra `CODE - Name`,
  igual que la opción del dropdown (`full_name`). El `name` viaja en `selectedSecondarySps` desde
  `onSecondarySpsModelChange` (opciones del catálogo) y desde la hidratación de `loadResult`
  (`initiative_name || short_name`); el fallback de SPs del proyecto no trae nombre y el chip degrada
  a solo el código.
- ⚠️ El ingest (`POST /create`) sigue guardando los programas contribuyentes como
  `share_result_request` con status 4, no como rol 2: un resultado creado por API no muestra sus
  programas en el formulario hasta que alguien los guarde desde aquí. Anotado en el change log del
  contrato.
