# section-contributors

**Verified:** 2026-08-26 · branch performance-refactor · 75d56f2cd

## Qué es
Sección 2 del formulario bilateral (W3/Bilateral): a quién se atribuye el resultado — centro líder,
centros CGIAR contribuyentes, proyectos W3/bilaterales, programas científicos, socios externos, y
—detrás del toggle Full Metadata— la pregunta de resultado enlazado/agrupado. Historia: **P2-3368**.

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
  'partners')` con tres ítems: `lead-center`, `lead-project`, `external-partners`. Este último va
  `filled: partnersHydrated() && externalPartnersSatisfied()` — ver la invariante abajo.
- **Coming soon:** `unpersistedFieldsComingSoon` (constante `true`) apaga los tres controles que no
  se pueden guardar.
- **Gates del template expuestos como computeds**: el spec sobreescribe el template, así que un
  `@if` inline quedaría sin test. Si añades un gate nuevo, exponlo igual.

## Dónde se usa
- `src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html:201`
  — dentro del acordeón de secciones del formulario bilateral.
- Renderiza a su vez `<app-section-toc>` (`../section-toc/`), que es quien pinta la pregunta
  **"Can this result be mapped to a ToC KPI?"** (P2-3142 — misma frase que el clásico, ver trampas).

## Trampas

- ⚠️ **`contributing_center` / `contributing_bilateral_projects` no viajan hasta que
  `contributorsHydrated()` es `true`** (flag **independiente** de `partnersHydrated`). Se filtran
  contra los catálogos, así que antes de que carguen —o tras un GET fallido, que igual pone
  `projectsReady` en `true`— quedan en `[]`. Y `[]` no es "sin cambios": `updateCenter` corre
  `upDateAllInactive` **sin excluir `is_leading_result`**, y `syncBilateralProjects` tira el
  proyecto líder. Sin centro líder, `assertCenterPermission` rechaza el submit para siempre y **el
  usuario no puede arreglarlo** (el líder es read-only aquí). Clave omitida = "no tocar".
  Backstop: `syncContributingCenters` une los `leadingCodes` antes de `updateCenter`.
 (⚠️ = ya rompió algo, o va a romper)

- ✅ **P2-3443 resuelto para socios externos** (26-ago-2026). Ojo con la clave: es `institutions_id`,
  **no** `institution_id` — ese es el de centros y resuelve a `clarisa_center.code`.
  `syncExternalPartners()` espeja `savePartnersInstitutionsByResultV2` (pool funding). Sin migración.
- ⚠️ **Rol de socio como en pool funding:** `8` si hay fila en `results_knowledge_product`, `2` si
  no. Elegirlo mal **no revienta**: esconde los socios del GET y del green check (`IN (2,8)`).
- 🛑 **INVARIANTE: nada se reporta como satisfecho mientras el payload descarta sus claves.**
  `external-partners` sólo va `filled: true` si `partnersHydrated()`. Antes, si el GET de detalle
  fallaba, el usuario elegía socios, la sección se ponía verde, Submit se desbloqueaba y **cada
  PATCH tiraba `institutions`**: no se escribía nada. Si tocas `buildContributorsPayload()`, toca
  también `updateContributorsMds()`.
- ⚠️ **El efecto de hidratación NO se reintenta solo.** `hydrateWhenReady` sólo corre cuando cambia
  una de sus señales, y tras la carga inicial ninguna cambia. Por eso el fallo se muestra:
  `partnersLoadFailed()` pinta un `app-alert-status status="error"` con el botón
  **Retry loading partners** → `retryLoadExternalPartners()`, que es el ÚNICO camino de vuelta.
- ⚠️ Mismo mecanismo para los socios: `saveContributors` se dispara con cada cambio de
  centro/proyecto, así que un `institutions: []` prematuro **borraría los socios guardados**. El
  `error` del GET deja `partnersHydrated` en `false` a propósito.
- 🛑 **`is_lead_by_partner` se manda SIEMPRE en `false`, y es una decisión.** La sección no tiene
  control de "lo lidera un socio" y el centro líder es de solo lectura, así que el valor es
  derivable. Se manda explícito porque la validación trata `NULL` como "sin contestar" y nunca
  pondría la sección en verde. Si bilateral admite lead partner algún día, este es el punto a tocar.
- 🛑 **`external-partners` SÍ se publica al tracker desde P2-3443** (se revirtió la decisión del
  25-ago: se había sacado porque el dato no se guardaba y Submit quedaba bloqueado sin salida).
  **Si la persistencia se rompe, saca el ítem otra vez — no aflojes la UI.** Centros y proyectos
  siguen fuera por otro motivo (P2-3348: van `[required]="false"`, y trackear un campo que la UI
  llama Optional bloquea Submit sin explicación).
- 🛑 **Sigue sin persistirse** (fuera del alcance de P2-3443, que sólo pidió socios + los dos flags):
  los **contributing science programs** y la respuesta **enlazado/agrupado** con sus `linked_results`.
  Desde 26-ago van **visibles pero DESHABILITADOS con tag `Coming soon`** (regla de la casa; mismo
  markup que `result-ai-item.component.html`) y **fuera de `hiddenFieldsWithValues()`**, que ahora
  devuelve `0`: el cartel *"1 hidden field has values and will be saved."* prometía un guardado que
  no existía. **No quites el disable sin conectar antes el DTO**, o vuelve la promesa falsa.
- ⚠️ **No se escriben delivery types ni presupuesto de socio**, a diferencia de pool funding: P2-3368
  AC6 los deja fuera de bilateral. Pero `validation_partners_P25` exige una fila en
  `result_by_institutions_by_deliveries_type` **por cada socio**, así que el green check de partners
  no se pondrá verde en bilateral hasta que producto defina qué va ahí.
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
| Guardado de enlazado/agrupado + linked results (controles `Coming soon`) | Sin campo en el DTO ni en el GET de detalle; P2-3443 no lo pidió. | Ticket nuevo (BACK) |
| Green check de partners en bilateral | La función MySQL exige un delivery type por socio y bilateral no los captura (AC6). | Producto + BACK |

## Tests
`section-contributors.component.spec.ts` — 104 casos. El template se sobreescribe con
`<div></div>`: **no hay assertions de DOM**, todo va por signals/computeds.

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
  `unpersistedFieldsComingSoon` sigue existiendo pero ya sólo cubre enlazado/agrupado.
- **Guardado:** `buildContributorsPayload()` manda `contributing_programs: [{ science_program_id: programCode }]`
  cuando `contributorsHydrated()`; `onSecondarySpsModelChange` llama `persistContributors()`. El server
  (`bilateral-center.service.ts` → `syncContributingPrograms`) escribe filas rol 2 en
  `results_by_inititiative`, desactiva las que ya no estén y nunca toca el rol 1.
- **Lectura:** `BilateralCreationService.loadResult` hidrata `selectedSecondarySps` con las filas
  `initiative_role_id === 2` de `contributing_and_primary_initiative`, y el primario ahora se busca por
  rol 1 (antes era `[0]`, correcto sólo por suerte).
- ⚠️ El ingest (`POST /create`) sigue guardando los programas contribuyentes como
  `share_result_request` con status 4, no como rol 2: un resultado creado por API no muestra sus
  programas en el formulario hasta que alguien los guarde desde aquí. Anotado en el change log del
  contrato.
