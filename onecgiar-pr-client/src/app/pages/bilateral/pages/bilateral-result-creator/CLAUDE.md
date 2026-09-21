# bilateral-result-creator

**Verified:** 2026-09-21 · nota bajo Submit for review que avisa que primero corre el chequeo IA (JuanGuzman-io/bilateral-submit-review-flow); prior: 2026-09-18 · Next/Back/side-rail flushean antes de navegar (bugfix/bilateral-section-autosave-on-navigate); prior: 2026-09-18 · JuanGuzman-io/feature-p2-3150-bilateral · feedback IA navegable y por campo (P2-3698); prior: 2026-09-17 · semáforo de calidad IA en el riel y el Submit

## Qué es
La página que hace de wizard de creación **y** de editor de un resultado W3/Bilateral. `isCreating()`
decide cuál de las dos es: sin `:id` en la ruta es el wizard; con `:id` es el editor.

## Contrato
- Ruta editor: `/bilateral/:centerAcronym/result/:id?phase=<versionId>`.
  🛑 **`:id` es un `result_code`, NO el `result.id`** cuando viene `phase` — el backend resuelve por
  `result_code` + `version_id` con fase y por `id` sin ella (`results.service.ts:3378-3388`).
  En prtest 5804 de 9667 resultados tienen `id !== result_code` (p. ej. id 11012 ↔ code 5093).
- Estado del resultado: `BilateralCreationService` es el dueño. `currentResultId()` **solo** contiene
  el `id` interno, y es `null` hasta que responde el GET de detalle.
- `resultId` (signal local) = espejo de `currentResultId()`, y es la puerta que monta las secciones
  (`.component.html:131`) y la que ata el autosave (`autoSaveService.setResultId`).
- El coordinador de guardado y MDS tracker se proveen **por componente** (`providers:` del
  `@Component`), así que cada visita arranca limpia. Los cambios se mantienen en memoria y se
  persisten con **Save draft** de la sección activa **o** al navegar: Next/Back/riel
  (`selectSection()`/`moveSection()`, BIL-T-2) hacen `flush()` de la sección saliente antes de
  cambiar — un fallo deja al usuario en la misma sección con la misma alerta de error de Save draft.
  Sólo destruir el editor **sin** pasar por Next/Back/riel (p. ej. cerrar la pestaña) sigue sin
  escribir: esa ruta no la toca este flush.
- **Dos marcos, uno por modo.** El wizard (`isCreating()`) conserva el header de banda y la columna
  centrada de 1100px (`.bilateral-creator`). El editor dibuja su propio marco a lo ancho: riel de
  secciones de 240px (`.bcr-rail`, checks + "N of M sections complete" + **Submit for review** —
  movido aquí desde la card Actions del Overview el 2026-09-04, gateado por `canSubmitFromRail()`:
  `mdsTracker.overallStatus() === 'complete'` + no in-flight + no read-only; `submitResult()`
  re-chequea sus propios guards), columna con scroll propio
  (`.bcr-scroll`: header `variant="detail"`, phase switcher, card con pastilla numérica) y un pie
  SIN franja (P2-3736, 16-sep-2026): `.bcr-editor-footer` mide 0 y flota sobre el piso de
  `.bcr-content`; solo se pintan sus dos cápsulas (izq: Back · **Next** · "Section X of Y"; der:
  estado · Save draft). `.bcr-scroll` reserva 88px abajo para que el último campo salga de detrás.
  ⚠️ Con "Unsaved changes" la cápsula derecha mide ~400px: bajo 820px de COLUMNA
  (`@container` sobre `.bcr-content`) la izquierda sube una fila y el scroll reserva 152px — medido,
  a 1024px de ventana se cruzaban 65px. Misma geometría que `section-bottom-bar` de W1/W2.
- El marco del editor se ancla al slot de la página (`:host.bcr-host--editor { position:absolute;
  inset:0 }`, clase ligada a `!isCreating()`), no con una cadena de `height:100%`: `main` es sólo
  `min-h-svh`, así que en un formulario largo la cadena resuelve a la altura del contenido y el
  footer se va fuera de pantalla. El bloque contenedor es el slot `relative` de
  `app.component.html`. `app-bilateral-progress-aside` ya no se renderiza y nada reserva su sitio.
- **Save draft dice la verdad.** Guarda parcial (como W1/W2), pero el aviso nombra los campos MDS
  vacíos de la sección (`missingFieldsFor`, leídos de `sectionStatus().fields`): sin cambios
  stageados y con faltantes → "Nothing to save yet"; guardado con faltantes → "Draft saved, still
  missing…". El footer muestra "N fields missing" con la lista. `waitForSectionSave` sale al primer
  `hasErrorFor`: `'error'` cuenta como pendiente y antes un 400 dejaba "Saving…" los 15s del timeout.
  Y **cuando el guardado falla, la alerta dice POR QUÉ** (feedback 2026-09-04): muestra el
  `lastErrorMessageFor(section)` que `BilateralAutoSaveService` captura del body del error (p. ej.
  vaciar el título → el 400 de general-info explica que title/description no se pueden vaciar) más
  los faltantes; el "Please try again" pelado queda solo como fallback sin mensaje del server.
- **Semáforo de calidad IA (P2-3698).** `BilateralQualityAssessmentUiService` (root) es el dueño del
  estado: `assessing` → `deciding` → `submitting`. El riel pinta una card con el veredicto guardado
  (`loadLatest` una vez por result id) y **Submit for review ya no envía directo**: llama
  `qualityAssessment.run()`, y el PATCH de submit sale sólo desde la decisión del diálogo, con
  `assessment_id` + `decision` — el servidor los exige, así que no hay ruta que se salte el chequeo.
  ⚠️ `isSubmitting()` del componente es `isBusy()` (chequeo **y** envío): derivarlo de `isRunning()`
  reabre el botón a mitad del PATCH. El diálogo se liga a `isDialogOpen()`, no a `state() === 'deciding'`,
  o se cierra de golpe al pulsar la decisión.
- **Feedback IA en el editor.** Desde el diálogo, una sección ámbar/roja navega con
  `goToQualitySection()` a la sección correspondiente. Las marcas por campo permanecen visibles
  aunque el assessment quede stale mientras el usuario corrige: la frescura se valida al enviar,
  no se usa para esconder la guía. El card del riel conserva borde neutro tanto actual como stale.
- **La nota bajo Submit (feedback QA 2026-09-21).** El botón arranca el chequeo IA, no el envío, y
  nada en pantalla lo decía. Bajo el botón va una línea apagada ("The AI quality check runs first") cuyo
  `prTooltip` (`submitQualityCheckNote`, en el `.ts` porque la directiva toma un string) lleva las dos
  frases del revisor. La directiva abre en hover **y** fija en clic/Enter, así que la línea no necesita
  ser un botón propio. ⚠️ La nota es la única pieza que promete "podés seguir editando": si algún día
  `submitResult()` enviara directo sin pasar por el diálogo, la nota queda mintiendo.

- **Solo lectura (P2-3520):** `isFormReadOnly()` = `!creationService.isEditableByCenterUser()`. Es la
  única puerta: las cinco secciones exponen su propio `readOnly` computado igual, el botón Submit lo
  recibe por input, y un `effect` del constructor llama `autoSaveService.setReadOnly()` con él.

## Dónde se usa
- `bilateral-routing.module.ts` — rutas `create` y `result/:id`.
- `bilateral-results-list.component.ts:430` (`openResult`) — navega con `result_code` + `phase`.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **Nunca publicar el parámetro de ruta como id de escritura.** Todos los PATCH del formulario
  (`api/results/bilateral/general-info/:resultId` y hermanos) buscan la fila por `id`
  (`results.service.ts:5006`). Cuando `loadResult` sembraba `currentResultId` con el parámetro, el
  primer autosave al montar escribía en **otra** fila — y con `lead_contact_person: null`, que el
  endpoint interpreta como "bórralo" (`results.service.ts:5044-5056`).
- ⚠️ El `effect` del constructor exige **las dos** condiciones: `currentResultId()` no nulo **y**
  `!isLoadingResult()`. Quitar la segunda reabre la ventana en que sigue en pantalla el resultado
  anterior.
- ⚠️ Los `effect` del constructor de las secciones corren **antes** de que sus propios effects de
  hidratación copien los datos cargados. Toda sección que guarde desde un effect necesita su propio
  candado de "ya hidraté" (ver `section-general-info`).
- Mientras carga el detalle no hay secciones: hay un `app-form-skeleton`. Si se quita, el editor
  queda en blanco durante el GET.
- ⚠️ Y si el GET **falla**, tampoco hay secciones (`currentResultId()` sigue null): por eso existe
  `creationService.loadFailed()` y su bloque gemelo del skeleton en `.component.html`, con
  `retryLoadResult()`. Sin él un código malo, una sesión caducada o un 500 dejan la página vacía y
  muda.
- `hasTypeSpecificSection` lee `creationService.resultTypeId()`, no el signal local: el local solo lo
  escribe el wizard y en el editor siempre es `null`.
- ⚠️ **El candado de solo lectura son DOS mitades y hacen falta las dos.** Deshabilitar los controles
  es la visible; `autoSaveService.setReadOnly()` es la que impide que Save draft llegue a la base.
  Con solo la primera, cualquier control que se quede interactivo podría persistir mientras el
  Science Program revisa — que es el fallo que P2-3520 arregló.
- ⚠️ El shell W1/W2 es propiedad de Bilateral. No importar componentes de `pages/results/`: esa
  superficie tiene servicios, rutas y green checks de W1/W2. Sólo se pueden reutilizar primitivas
  compartidas y tokens visuales.
- ⚠️ Ese `effect` **no** puede vivir dentro de `submitResult()`: un resultado que ya llega fuera de
  `Editing` al cargar la página tiene que quedar bloqueado sin que nadie pulse Submit.

## Wizard — drawer de creación manual (2026-09-14, BIL-MCD-T-6)
- El bloque inline `#bcr-level-section` **ya no existe**. Nivel/tipo/título viven en
  `app-bilateral-manual-create-form` dentro de `app-bilateral-manual-create-drawer-host`.
- **Orquestación:** `BilateralManualCreateFlowService` (root singleton) — `drawerOpen`,
  `selectedReportingWay`, `beginFromProject()` (catálogo home), `openDrawerForManual()` (wizard),
  `submitCreate()` → `BilateralCreationService.createResult(..., title)`.
- **Flujo wizard:** proyecto → SP → tarjetas AI/Manual → al elegir Manual el drawer abre al
  instante (`openDrawerForManual()`). AI sigue inline en `#bcr-ai-upload`.
- **Flujo home:** `+ Create result` en `bilateral-projects-panel` llama `beginFromProject()` —
  drawer in-place, catálogo visible detrás del scrim; paso reporting-way dentro del drawer.
- **Back:** barra superior del body del drawer (host), no header ni footer del form.
- **Copy:** `src/app/internationalization/bilateral-manual-create.copy.ts`.

## Pendiente / Coming soon
- HITL responsive/axe del drawer — ver `execution.md` del spec `manual-create-drawer`.
