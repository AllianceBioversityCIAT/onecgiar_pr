# indicator-drawer

**Verified:** 2026-09-04 · branch qa-development-2026 · fa3f06a90

## Qué es
El **aside** de un indicador: entra deslizando desde la derecha, sin scrim, para que la lista siga
visible y clicable detrás. Tres pestañas, fijadas por el botón que lo abre — `report` (crear el
resultado), `info` (target y el split por Centro/año) y `results` (tabla de resultados reportados,
spec `changes/indicator-reported-results`, IRR). Desde el 21-ago es la superficie del botón
**Report** de la tabla de Reporting; desde el 04-sep el menú `…` → **View reported results**
también abre el aside, directo en `results` (`dashboard-lab.component.ts`
`onReportingOpenAchieved` → `manageIndicator(row, hlo, 'results')`).

## Contrato
```
inputs   indicator (required) · groupTitle · programCode · tocNode · initiativeId
         aowCode · accent · initialTab ('report' | 'info' | 'results') · canReport
outputs  closed · widthChange
```
- `canReport` se reenvía a `lab-report-form`; **por defecto `false`**, para que un host que se
  olvide de pasarlo no exponga la acción por accidente.
- Ancho arrastrable desde el borde izquierdo; a partir de 720 px el formulario pasa a dos columnas.
- Mientras `tab() === 'results'` el ancho tiene un **piso de 760 px** (`TABLE_FLOOR`,
  `applyTableFloor()`, clamp `min(1100, viewport-320)` — nunca lo supera). Por debajo de **640 px**
  (`CARD_LAYOUT_BELOW`, `tableLayout`) las filas caen a layout de tarjetas en vez de tabla. Al salir
  de `results` se restaura el ancho previo (`widthBeforeResults`) — salvo que el usuario haya
  arrastrado el panel durante la pestaña, lo que limpia `widthBeforeResults` y deja ganar al drag
  manual (`startResize`).

## Dónde se usa
- `../../dashboard-lab.component.html:1548` — único host. Se abre por `manageIndicator(row, hlo,
  tab, node)` (`dashboard-lab.component.ts:663`), `tab: 'report' | 'info' | 'results' = 'report'`.

## Trampas
- **Follow-up 2026-09-04 (quick/indicator-reported-results-followups):** la pestaña `report` NO es un
  `@case` sino un panel persistente (`[data-testid=irr-report-pane]`, `display:none` fuera de la
  pestaña) para que "See all N in detail" no desmonte el formulario a medio llenar. El preview lista
  3 filas + "…and N more" (`PREVIEW_MAX`). `returnTab` guarda de dónde se llegó a `results`: solo el
  enlace del Report-tab lo fija, así el drawer abierto desde el menú de fila no muestra "Back". Las
  pistas de la tabla suman 654px para caber en el piso de 760px sin segundo scroller. (⚠️ = ya rompió algo)
- ⚠️ **`existing-result-contributors` se consulta con `related_node_id`, NO con
  `toc_result_indicator_id`.** Son dos columnas distintas del mismo payload. El servidor persiste
  `toc_results_indicator_id = indicatorRow.related_node_id` al crear
  (`framework-result-toc-indicators.service.ts:72,81`) y el loader filtra por esa misma columna.
  Con el id equivocado no casa nada.
- ⚠️ **La respuesta es `{ response: { contributors, … } }` — un OBJETO, nunca un array**
  (`get-existing-result-contributors.handler.ts:37-45,69-77`). Leer `response` directo dejaba
  `length` en `undefined`, así que la lista salía **vacía siempre** y el salto automático a la
  pestaña `info` no disparaba nunca.
- ⚠️ **`loadExisting` pide `scope=all`, no el default `reviewed`.** Una sola llamada por apertura de
  indicador sirve tanto la preview del tab `report` como la tabla de `results` (IRR-R-3.2): la
  respuesta trae también *Editing*/*Submitted*/*Pending Review*, no solo *Quality Assessed*/
  *Approved*. El endpoint sigue devolviendo solo lo revisado sin `scope` — el opt-in es del cliente.
- ⚠️ **`STATUS_TOKENS` (líneas ~50) solo mapea `status_id` 1/2/3.** Es una TERCERA copia deliberada
  de los pares fg/bg de `programme-results.component.ts:127` (que a su vez copia
  `result-header.component.ts:17`) — "no la DRYees de paso", extraer a `shared/` es su propio PR.
  *Approved* (6) y *Pending Review* (5) no tienen entrada: caen al par gris *not-started* por el
  fallback de `statusFg()`/`statusBg()`, no por un bug.
- El backend responde **404** para un indicador virgen; el `error` handler lo trata como lista
  vacía. Es esperado, no un fallo.
- El efecto que rearma el drawer corre por indicador: resetea `existing`, `formDirty`, el tab, y
  desde el 04-sep también `loadError`, `searchText`, `openMenuKey` y `widthBeforeResults`. Si añades
  estado nuevo, resetéalo ahí o se filtra entre indicadores.
- ⚠️ **El piso de ancho es un efecto de la pestaña, no un ancho por defecto nuevo.** Un drawer ya
  ≥ 760 px no se toca al entrar a `results` (piso, no set); `widthChange` solo emite cuando el ancho
  realmente cambia.
- Rama dormida en `loadExisting`: si `list.length && !tabTouched` saltaba a `results` sola (código
  previo a este spec), pero el efecto de reset marca `tabTouched = true` **antes** de que la
  petición resuelva, así que siempre pierde contra el `initialTab` del host — hoy es inalcanzable.
  Se retargeteó a `results` (nunca a `info`, que ya no tiene la lista) por si algún día revive.
- Escape cierra, y con cambios sin guardar pide confirmación antes de descartar
  (`confirmingExit()`). No lo quites: el modal viejo pierde lo escrito sin avisar. Con el menú de
  fila (`results`) abierto, Escape cierra el menú primero (`onEscape()`), no el drawer.
- Es la **única** superficie para Target y Reported results — no crear popovers al lado
  (DESIGN-DEVIATIONS §9).

## Pendiente / Coming soon
- El markup del panel no está en la parte legible del diseño vivo (`get_file` corta a 256 KiB y el
  `.dc.html` la excede). La referencia visual es la captura aportada en sesión; los tokens sí salen
  del mockup. Releer el diseño antes de retocar el acabado.
