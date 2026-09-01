# dashboard-lab

**Verified:** 2026-09-01 · branch performance-refactor · 4c2c0c69f

## Qué es
El shell de un Science Program. Un solo componente que sirve varias vistas según `rfrView`, y que es
dueño de **los datos y los filtros** de todas ellas. Es el archivo más grande del módulo (~2.2k LOC
de TS): trátalo como host, no como pantalla.

## Contrato
- Ramas de vista en la plantilla: `showOverview()` (pestaña Overview), `showPlanned()` (pestaña
  **Reporting**), más las vistas de AoW/guía. La pestaña **Results** ya NO vive aquí: es
  `pages/programme-results/`, cargada por su propia ruta.
- Es dueño de los cinco filtros de Reporting: `plannedSearch`, `reportingAowFilter` (multi),
  `reportingTypeFilter`, `reportingTypologyFilter`, `reportingStatusFilter`.
  `reportingFiltersActive()` los agrega en un solo booleano y `clearReportingFilters()` los resetea.
- `reportingGroups()` aplica **Section / Type / Category** y entrega `ReportingAowGroup[]` ya
  filtrado; `search` y `statusFilter` se pasan aparte y los aplica el hijo.
- El drawer de indicador se abre solo desde aquí: `manageIndicator(row, hlo, 'info' | 'report', node?)`.
  El 4º argumento es el nodo ToC y **gana** sobre el match por `result_title`: es quien lleva
  `toc_partner_institution_ids` y `contributing_synergy_program_initiative_ids`, y perderlos deja
  los desplegables de centros y SP vacíos **sin ningún error**.
- **El botón `Report` de la tabla de Reporting abre el ASIDE**, no el modal viejo
  (`onReportingRowReport` → `primeEntityAowContext()` + `manageIndicator(..., 'report', __hloNode)`).
  Los otros seis puntos de entrada de este archivo y las páginas `entity-aow` **siguen con el
  modal**: eso es deliberado, no una migración a medias.

## Dónde se usa
- `shared/routing/routing-data.ts` — rutas de `entity-details/:entityId`.
- Hijos propios: `reporting-program-band` (toolbar), `reporting-aow-table` (cuerpo de Reporting),
  `program-overview` (Overview), `indicator-drawer`, `guided-creation`, `lab-report-form`.

## Hijos sin archivo propio
| Componente | Qué hace | Trampa |
|---|---|---|
| `reporting-program-band/` | Banda del programa + tabs + toolbar (búsqueda, 4 filtros, Grouped/All, Expand all) | ⚠️ `resolvedDescription` cae a un texto fijo de SP01 ("Breeding for Tomorrow") cuando no hay descripción — pega la copy de un programa en cualquier otro. **No copies ese patrón.** |
| `indicator-drawer/` | El aside: Target (`info`) y creación de resultado (`report`) | **Tiene `CLAUDE.md` propio** |
| `lab-report-form/` | El formulario de creación que monta el aside | **Tiene `CLAUDE.md` propio** |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`filtersActive` hay que pasarlo a `reporting-aow-table`.** El hijo no ve tres de los cinco
  filtros; sin ese input su estado vacío miente (P2-3405).
- 🛑 **`reportingAllExpanded` arranca en `true` A PROPÓSITO, contra lo que dice el ticket.** La
  pestaña Reporting abre con las Areas of Work **expandidas**. P2-3251 pide en su título y en sus
  criterios lo contrario, y el PO confirmó "cerradas" por escrito el 27-ago-2026 — pero QA lo pidió
  expandido dos veces (25 y 28-ago) y Yeck decidió el 1-sep-2026 que en esta pantalla manda QA.
  **No lo "corrijas" a `false` leyendo el ticket**: lee primero el hilo de comentarios. El seed se
  aplica en dos sitios que deben moverse juntos — la declaración de la señal y el reset por programa
  dentro del `constructor`. Candado: `dashboard-lab.component.spec.ts`, describe
  *"Reporting disclosure seed (P2-3251, per QA)"*; revertir el seed hace fallar sus dos tests.
- ⚠️ **Un `output()` sin bindear es un control muerto.** `openRowMenu` se emitía y nadie lo escuchaba,
  así que el `⋯` de cada fila no hacía nada en producción. Al añadir un output, bindéalo o no
  renderices el control.
- 🛑 Pestaña Overview y pestaña Reporting se tocan en este mismo archivo. Cambios en una rama no deben
  entrar en la otra: se editan en paralelo con frecuencia.
- El backend devuelve 404 en `existing-result-contributors` para un indicador virgen; el drawer abre
  igual y lo trata como lista vacía. Es esperado, no un fallo del front.
- ⚠️ **`canReport` hay que pasárselo al drawer** (`entityAowService.canReportResults()`). Sin él el
  formulario no pinta el botón de crear — por diseño: el input arranca en `false` para que un host
  olvidadizo no exponga la acción.
- 🛑 **`primeEntityAowContext()` sigue siendo obligatorio antes de abrir el aside en modo `report`**:
  `canReportResults()` depende de que el programa esté sembrado y de que la comprobación de fase
  haya resuelto.

## Pendiente / Coming soon
- Métrica de la barra de progreso de AoW: decisión de producto abierta en P2-3405 (ver P2-2276 y
  P2-3296). No cambiar el código hasta que respondan.

## Trampa nueva (2026-08-26)
- ⚠️ **Dos convenciones opuestas para `is_aow` ausente.** `indicatorsByAow()`'s `fromTier` (~línea
  1418) trata un `is_aow` faltante como cross-cutting (`!== true`), mientras que
  `entity-aow/services/entity-aow.service.ts` (líneas ~44, 49) trata un `is_aow` faltante/false como
  exclusivo de ese AoW (`=== false`, fijado por su propio spec). Hoy el backend siempre normaliza
  `is_aow` a un booleano real (`Boolean(row.is_aow)` en `aow-bilateral.repository.ts:525`), así que
  ambas conviven sin conflicto — pero si el backend alguna vez omite el campo, divergirán. No
  "armonices" un lado sin revisar ambos specs primero (ver `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/` `RES-DD-2`).
