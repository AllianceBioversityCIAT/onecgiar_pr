# bilateral-result-creator

**Verified:** 2026-10-08 · quick/footer-capsules-align: las cápsulas Back/Next y Save draft del pie
comparten fila mientras quepan (flex-wrap en vez del umbral fijo de 820px); prior: 2026-09-30 · `ARM-T-2` (bilateral/ai-queue-report-manually, single-mount rework): this
page no longer mounts `<app-bilateral-manual-create-drawer-host>` — neither in its template nor in
its `imports:` array. The host now mounts exactly once, in the bilateral shell
(`bilateral.component.html`, next to `<router-outlet>`, imported by `BilateralModule`), reachable
from every bilateral route instead of only from this page and `bilateral-projects-panel` (which
also dropped its own mount). This page still drives the drawer's signals through
`BilateralManualCreateFlowService` (`openDrawerForManual()`, `beginFromProject()` is the
home-catalog's entry) — only the DOM mount moved, not the orchestration. Neither
`bilateral-projects-panel/` nor `bilateral-manual-create-drawer-host/` has its own `CLAUDE.md` (the
convention doesn't require one per folder); this stamp is the record of the mount change for both.
prior: 2026-09-29 · BIL-RAU-T-7: exención de solo-lectura de 3 claves para el admin en status 4 (annual updating); prior: 2026-09-29 · `AIQ-T-8` attempt 4 (AI processes drawer's "Upload different files"/"Report manually" deep link, `AIQ-R-9` D, cold-load fix): `ngOnInit`'s `?job=` branch also reads `?project=`/`?way=` (same branch, job always wins when both are present) but only PARSES them there, storing `{projectId, way}` as a one-shot `pendingAiQueueDeepLink` signal — a constructor `effect()` reads that signal AND `creationService.projects()` AND `creationService.isLoadingProjects()` unconditionally (before any early return, the trap already documented below in `my-draft-results/CLAUDE.md`) and applies the link (`creationService.selectProject()` + `onProjectSelected()`, then `onReportingWaySelected(way)` so the way is set AFTER the project-select reset, never before) the moment a matching `Number(p.id) === projectId` project shows up in `projects()`, clearing the pending value on a match or once loading is seen to finish without one; attempt 3's mistake was applying it synchronously only inside `ngOnInit`, which silently dropped the link whenever the creator started cold (`projects()` still `[]`, since only the child `bilateral-project-selector`'s own constructor effect fetches it); `way` is parsed by `bilateral-query-params.ts`'s `parseAiQueueWayParam` against the creator's own `'ai' | 'manual'` values, confirmed at `selectedReportingWay`'s declaration, not guessed; prior: 2026-09-29 · `AIQ-T-7` (never-blocking upload, unlocked wizard, `?job=` routing): `isAiProcessing()` reads ONLY `bilateralAiService.uploadState().status === 'uploading'` (`AIQ-DD-11`, reversion, challenged) — it no longer includes `pending`/`processing`/`still_running`, because those now describe jobs in the service's LIST (any project's, possibly outliving this page), not this component's own submission; locking the wizard on them would freeze it for a reason the reporter can no longer see, and `AIQ-R-7` A requires the form stay available for a DIFFERENT project while another job runs. `?job=` (P-23, the failure-email deep link) is handled from `ngOnInit`'s `route.queryParams.subscribe` — sets `selectedReportingWay('ai')` AND calls `bilateralAiService.openDrawer(jobId)` exactly once (never from an `effect()` — the poller has no in-flight guard and `openDrawer` fires an immediate list request); the sibling `route.params.subscribe`'s own jobId branch deliberately does NOT also call `openDrawer`, to avoid firing it twice on the same page load. New `onChooseAnotherProject()` (wired from `app-bilateral-ai-upload`'s `(chooseAnotherProject)` output, `creator.html:35`) resets `creationService.selectedProject`/`selectedPrimarySp` and the local `selectedReportingWay` to `null` plus closes the manual-create drawer — the same reset shape `onProjectSelected` already applies to the two later steps, restarting the 3-step picker from the top; prior: 2026-09-29 · rework (attempt 2, reviewer FAIL): subir `SaveButtonService.savedTick` en el guardado del drawer ya NO es incondicional — `savedTick` es de página completa (todas las secciones montadas bajo `[hidden]`), así que el bump sin condición limpiaba la píldora "Unsaved changes" de OTRA sección con cambios de verdad sin guardar. Ahora sólo sube si la sección abierta (`openSectionName()`) es `general-info` (la que este guardado alcanza) o `!autoSaveService.hasPendingFor(openSectionName())` — Evidence queda excluida sin condición porque su borrador (`showDraft()` en `section-evidence.component.ts`) nunca llega a `hasPendingFor('evidence')`. La premisa que lo sostiene: Next/Back/riel siempre flushean la sección que se deja (BIL-T-2), así que un staged de verdad sólo puede vivir en la sección todavía abierta. `manualSave$('general-info')` se sigue emitiendo siempre, sin el guard; prior: 2026-09-29 · el guardado del drawer de calidad ya termina como Save draft: emite `manualSave$('general-info')` y sube `SaveButtonService.savedTick` sólo en el ok (nunca en error/catch) — antes ningún camino de bilateral tocaba ese signal, así que el `field-card` de Description del formulario se quedaba en "Unsaved changes" hasta recargar aunque el valor ya estuviera guardado; `triggerManualSave()` (Save draft ordinario) sigue sin tocarlo (verificado, no arreglado — fuera de este alcance); prior: 2026-09-29 · `giSavedSinceOpen` se limpia en TODO cierre, no sólo cuando re-corre (BIL-QTS-T-9 rework); prior: 2026-09-29 · cerrar el drawer tras un guardado ok re-corre el chequeo una vez y cada guardado ok registra su provenance en el servidor (BIL-QTS-T-9, `giSavedSinceOpen`/`recordGiFieldRevision`); prior: 2026-09-29 · el drawer de GI guarda por autosave (`updateField` + `flush('general-info')`), marca stale sólo si el flush no termina en error, y Check again = `submitResult()` (BIL-QTS-T-5); el diálogo de calidad IA recibe `[readOnly]="isFormReadOnly()"` (QSG-T-2, `creator.html:44-51`): un resultado ya no editable (p. ej. Pending Review tras Submit) reabre el drawer sin footer y sin la línea de stale, ✕/Escape/scrim siguen cerrando; prior: 2026-09-24 · los mensajes de guardado excluyen campos MDS opcionales al calcular faltantes; prior: 2026-09-22 · el flag global de solo-lectura ahora responde a la pertenencia al centro líder (un Center User ya puede editar); prior: 2026-09-21 · nota bajo Submit for review que avisa que primero corre el chequeo IA (JuanGuzman-io/bilateral-submit-review-flow); prior: 2026-09-18 · Next/Back/side-rail flushean antes de navegar (bugfix/bilateral-section-autosave-on-navigate); prior: 2026-09-18 · JuanGuzman-io/feature-p2-3150-bilateral · feedback IA navegable y por campo (P2-3698); prior: 2026-09-17 · semáforo de calidad IA en el riel y el Submit

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
  SIN franja (P2-3736, 16-sep-2026): `.bcr-editor-footer` es una fila flex `pointer-events:none`
  anclada a 14px del piso de `.bcr-content`; solo se pintan sus dos cápsulas (izq: Back · **Next** ·
  "Section X of Y"; der: estado · Save draft). `.bcr-scroll` reserva 88px abajo para que el último
  campo salga de detrás. ⚠️ Las cápsulas envuelven con `flex-wrap` (izquierda arriba) **sólo cuando
  no caben** — antes un umbral fijo de 820px de columna las partía en dos filas aunque cupieran
  (quick/footer-capsules-align, 2026-10-08: con zoom alto se veían desalineadas). Bajo 820px de
  COLUMNA (`@container` sobre `.bcr-content`) el scroll sigue reservando 152px por si envuelven.
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
- **Guardado desde el drawer de GI (BIL-QTS-T-5, `handleGiFieldSaveRequested`).** Nunca un PATCH
  directo: escribe primero en `creationService` (título/descripción se reflejan de inmediato), luego
  `autoSaveService.updateField(field, value, 'text')` (pisa cualquier valor ya stageado para esa
  clave) y sólo entonces `flush(getEndpointKeys('general-info'))` — en ese orden, o el próximo Save
  draft de General information reescribiría el valor viejo que seguía stageado (`BIL-QTS-R-2`). Si el
  flush termina en `hasErrorFor`, no marca stale y muestra el error del server; si termina bien, llama
  `qualityAssessment.markStale()` una vez (el servidor sólo contesta `is_current` en la SIGUIENTE
  lectura) y registra el resultado en `lastGiSaveResult` (`{ field, ok, seq }`, `seq` incremental para
  que dos saves seguidos igual de "ok"/"error" cuenten como eventos distintos para el diálogo). Un
  `catch` adicional cubre un flush que RECHAZA en vez de sólo settear con error — mismo patrón que el
  `catch` de `triggerManualSave()` — para que el botón de guardar del drawer no quede girando para
  siempre.
- **Check again = `submitResult()` (`BIL-QTS-DD-4`, `handleGiRecheckRequested`).** Reutiliza toda la
  cadena de guardas del riel (solo lectura, secciones sin guardar, campos inválidos) y el chequeo IA
  en sí — nunca el PATCH real de envío, que sólo sale de `submitAfterQualityDecision()`.
- **Cierre re-corre y provenance (`BIL-QTS-T-9`).** `giSavedSinceOpen` (true en cada guardado ok,
  limpio al abrir el drawer o al correr Check again — **y también en TODO cierre**, antes de mirar
  si estaba stale o read-only: así el flag siempre significa "desde que este drawer se abrió", nunca
  algo que sobrevive read-only a una ventana futura) hace que `dismissQualityAssessment()` y
  `goToQualitySection()` (ésta navega primero) llamen `submitResult()` una vez si además el
  assessment quedó stale y el form es editable; cada guardado ok también llama
  `POST .../field-revisions` con el valor previo, **fire-and-forget** (nunca `await`ado ni parte de
  la transacción del save) — provenance la decide el servidor comparando el valor actual (recién
  guardado) contra la sugerencia guardada, y un error ahí no muestra alerta ni toca
  `lastGiSaveResult`. Probado con `Subject` (no `of`/`throwError` síncronos): un stub síncrono no
  distingue "fire-and-forget" de "el handler espera la respuesta antes de resolver".

- **Solo lectura (P2-3520):** `isFormReadOnly()` = `!creationService.isEditableByCenterUser()`. Es la
  única puerta: las cinco secciones exponen su propio `readOnly` computado igual, el botón Submit lo
  recibe por input, y un `effect` del constructor llama `autoSaveService.setReadOnly()` con él.
  **Y también el diálogo de calidad IA (QSG-T-2, 2026-09-29):** `app-bilateral-quality-assessment-dialog`
  recibe `[readOnly]="isFormReadOnly()"`. El diálogo no deriva su propia copia de la regla — solo
  esconde su footer ("Make adjustments" / Submit) y la línea de stale cuando `readOnly()` es true;
  ✕ / Escape / scrim quedan fuera de ese gate y siguen cerrando. Sin esto, un resultado que ya salió
  de Editing (p. ej. Pending Review tras un Submit) seguía ofreciendo ambos botones al reabrir
  "View AI assessment" desde el riel.
- **Y hay una TERCERA puerta, global y ajena: `RolesService.readOnly`** (22-sep-2026). Todos los
  `custom-fields` esconden su control mientras ese flag esté arriba (`pr-multi-select.component.html:16`
  y la misma línea en `pr-input`, `pr-select`, `pr-textarea`…). Es un mecanismo de W1/W2: arranca en
  **true** para todo el que no sea admin de aplicación (`roles.service.ts:75`) y solo baja al cargar un
  resultado W1/W2 de una **iniciativa** del usuario (`current-result.service.ts:52`) — un camino que
  bilateral no recorre. Por eso este componente lo responde con la pregunta del servidor: **Center User
  del centro LÍDER** (`isCenterUserOfLeadCenter()`, el mismo `role = 9` sobre `leadCenter.code` que
  `validationCenterPermissions` exige) **y** el resultado en *Editing*. Y lo **restaura en `ngOnDestroy`**
  (`!isAdmin`): el flag es global y sobrevive a la navegación.

## Dónde se usa
- `bilateral-routing.module.ts` — rutas `create` y `result/:id`.
- `bilateral-results-list.component.ts:430` (`openResult`) — navega con `result_code` + `phase`.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`isAiProcessing()` ya NO debe leer `pending`/`processing`/`still_running` (`AIQ-T-7`).**
  Esos estados hoy describen jobs de la LISTA de `BilateralAiService` (de este proyecto o de otro),
  que pueden seguir vivos mucho después de que esta página cambió de proyecto o de sección. Volver a
  incluirlos bloquearía el wizard por un job que el reportero ya no puede ver (`AIQ-R-7` A exige que
  el formulario siga disponible para OTRO proyecto mientras otro job corre).
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
- ⚠️ **Un formulario sin un solo control no es un formulario deshabilitado: es `RolesService.readOnly`.**
  Ángel no podía editar el resultado 9553 —que él mismo había creado, con `CENTER-12 · Center User` en
  `role_by_user` y el resultado en *Editing*— porque el flag global nunca bajaba para un no-admin.
  Medido: **6 hosts de `app-pr-input`, 0 `<input>`**. Durante meses **solo los admin de aplicación
  pudieron editar un bilateral**, y eso no lo pidió nadie. Al tocar permisos aquí, la prueba se hace
  con los roles de un Center User inyectados, no con la sesión propia: una cuenta admin no puede ver
  este fallo.
- ⚠️ **El candado de solo lectura son DOS mitades y hacen falta las dos.** Deshabilitar los controles
  es la visible; `autoSaveService.setReadOnly()` es la que impide que Save draft llegue a la base.
  Con solo la primera, cualquier control que se quede interactivo podría persistir mientras el
  Science Program revisa — que es el fallo que P2-3520 arregló.
- **BIL-RAU-T-7 (design.md §6.2, DD-5): la excepción del admin en status 4 es de TRES CLAVES, no del
  editor entero.** Un `effect` del constructor lee `rolesSE.isAdmin`, `resultStatusId()`,
  `isReplicated()` y `resultTypeId()` y llama `autoSaveService.setReadOnlyExemptions([...])` con
  exactamente `is_discontinued` / `discontinued_options` / `merge_split_targets` cuando las CUATRO
  condiciones se cumplen a la vez (admin **y** status 4 **y** replicado **y** tipo 7 o 2) — y con `[]`
  en cualquier otro caso, incluido el admin sobre un resultado no replicado o de otro tipo. El
  `BilateralAutoSaveService` deja pasar solo esas claves mientras `isReadOnly()`; el resto del
  `updateFieldsBatch` de la misma llamada se descarta igual que hoy. P-10 (design.md, asumido) quedó
  **confirmado**: el gate de solo lectura (`autoSaveService.setReadOnly(!isEditableByCenterUser())`,
  el `effect` inmediatamente anterior a este) YA era un `effect` reactivo a `resultStatusId` antes de
  este ticket — T-7 no tuvo que convertirlo, solo sumar `setResultStatus()` en `BilateralCreationService`
  para que un Reopen (4→1) sin recarga manual mueva ambos gates a la vez.
- ⚠️ El shell W1/W2 es propiedad de Bilateral. No importar componentes de `pages/results/`: esa
  superficie tiene servicios, rutas y green checks de W1/W2. Sólo se pueden reutilizar primitivas
  compartidas y tokens visuales.
- ⚠️ Ese `effect` **no** puede vivir dentro de `submitResult()`: un resultado que ya llega fuera de
  `Editing` al cargar la página tiene que quedar bloqueado sin que nadie pulse Submit.

## Wizard — drawer de creación manual (2026-09-14, BIL-MCD-T-6; single mount 2026-09-30, `ARM-T-2`)
- El bloque inline `#bcr-level-section` **ya no existe**. Nivel/tipo/título viven en
  `app-bilateral-manual-create-form` dentro de `app-bilateral-manual-create-drawer-host`.
- ⚠️ **`<app-bilateral-manual-create-drawer-host>` ya NO se monta aquí.** Vive una sola vez en
  `bilateral.component.html` (el shell, junto al `router-outlet`). Esta página sólo llama
  `openDrawerForManual()` sobre el flow service — el signal `drawerOpen` es lo que abre el host
  montado en el shell, no un mount propio de esta página.
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
