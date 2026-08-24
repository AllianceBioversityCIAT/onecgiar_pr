# indicator-drawer

**Verified:** 2026-08-21 · branch performance-refactor · eed5bb706

## Qué es
El **aside** de un indicador: entra deslizando desde la derecha, sin scrim, para que la lista siga
visible y clicable detrás. Dos modos, fijados por el botón que lo abre — `report` (crear el
resultado) e `info` (target y lo ya reportado). Desde el 21-ago es la superficie del botón
**Report** de la tabla de Reporting.

## Contrato
```
inputs   indicator (required) · groupTitle · programCode · tocNode · initiativeId
         aowCode · accent · initialTab ('report' | 'info') · canReport
outputs  closed · widthChange
```
- `canReport` se reenvía a `lab-report-form`; **por defecto `false`**, para que un host que se
  olvide de pasarlo no exponga la acción por accidente.
- Ancho arrastrable desde el borde izquierdo; a partir de 720 px el formulario pasa a dos columnas.

## Dónde se usa
- `../../dashboard-lab.component.html:1548` — único host. Se abre por `manageIndicator(row, hlo,
  tab, node)` (`dashboard-lab.component.ts:421`).

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`existing-result-contributors` se consulta con `related_node_id`, NO con
  `toc_result_indicator_id`.** Son dos columnas distintas del mismo payload. El servidor persiste
  `toc_results_indicator_id = indicatorRow.related_node_id` al crear
  (`framework-result-toc-indicators.service.ts:72,81`) y el loader filtra por esa misma columna.
  Con el id equivocado no casa nada.
- ⚠️ **La respuesta es `{ response: { contributors, … } }` — un OBJETO, nunca un array**
  (`get-existing-result-contributors.handler.ts:37-45,69-77`). Leer `response` directo dejaba
  `length` en `undefined`, así que la lista salía **vacía siempre** y el salto automático a la
  pestaña `info` no disparaba nunca.
- El backend responde **404** para un indicador virgen; el `error` handler lo trata como lista
  vacía. Es esperado, no un fallo.
- El efecto que rearma el drawer corre por indicador: resetea `existing`, `formDirty` y el tab. Si
  añades estado nuevo, resetéalo ahí o se filtra entre indicadores.
- Escape cierra, y con cambios sin guardar pide confirmación antes de descartar
  (`confirmingExit()`). No lo quites: el modal viejo pierde lo escrito sin avisar.
- Es la **única** superficie para Target y Reported results — no crear popovers al lado
  (DESIGN-DEVIATIONS §9).

## Pendiente / Coming soon
- El markup del panel no está en la parte legible del diseño vivo (`get_file` corta a 256 KiB y el
  `.dc.html` la excede). La referencia visual es la captura aportada en sesión; los tokens sí salen
  del mockup. Releer el diseño antes de retocar el acabado.
