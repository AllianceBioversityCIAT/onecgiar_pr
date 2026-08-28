# bilateral-result-creator

**Verified:** 2026-08-28 · branch performance-refactor · 596ef6842

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
- Autosave y MDS tracker se proveen **por componente** (`providers:` del `@Component`), así que cada
  visita arranca limpia.
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
  es la visible; `autoSaveService.setReadOnly()` es la que impide que el cambio llegue a la base. Con
  solo la primera, cualquier control que se quede interactivo (una plantilla nueva, una sección que
  guarde desde un `effect`) vuelve a escribir mientras el Science Program revisa — que es el fallo
  que P2-3520 arregló. Y con solo la segunda, el usuario teclea y nada se guarda, sin saber por qué.
- ⚠️ Ese `effect` **no** puede vivir dentro de `submitResult()`: un resultado que ya llega fuera de
  `Editing` al cargar la página tiene que quedar bloqueado sin que nadie pulse Submit.

## Pendiente / Coming soon
- Nada abierto en esta carpeta.
