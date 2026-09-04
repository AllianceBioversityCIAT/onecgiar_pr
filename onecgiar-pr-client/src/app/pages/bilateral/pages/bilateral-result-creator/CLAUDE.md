# bilateral-result-creator

**Verified:** 2026-09-04 · branch performance-refactor (Save-failed alert carries the server reason)

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
  `@Component`), así que cada visita arranca limpia. Los cambios se mantienen en memoria y sólo se
  persisten con **Save draft** de la sección activa; navegar o destruir el editor nunca escribe.
- **Dos marcos, uno por modo.** El wizard (`isCreating()`) conserva el header de banda y la columna
  centrada de 1100px (`.bilateral-creator`). El editor dibuja su propio marco a lo ancho: riel de
  secciones de 240px (`.bcr-rail`, checks + "N of M sections complete" + **Submit for review** —
  movido aquí desde la card Actions del Overview el 2026-09-04, gateado por `canSubmitFromRail()`:
  `mdsTracker.overallStatus() === 'complete'` + no in-flight + no read-only; `submitResult()`
  re-chequea sus propios guards), columna con scroll propio
  (`.bcr-scroll`: header `variant="detail"`, phase switcher, card con pastilla numérica) y footer
  fijo al piso (`.bcr-editor-footer`: Back · **Next** primario · "Section X of Y" · estado ·
  Save draft secundario). Misma geometría que `pages/results/.../result-detail`, reconstruida aquí.
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

## Pendiente / Coming soon
- Nada abierto en esta carpeta.
