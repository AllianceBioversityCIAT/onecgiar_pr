# reporting-aow-table

**Verified:** 2026-08-26 · branch qa-development-2026 · 617f54f91

## Qué es
El cuerpo de la pestaña **Reporting** del shell de Science Program: las tarjetas colapsables por Area
of Work (más las dos de programa, `Intermediate` y `2030`) y, en modo `All indicators`, la tabla plana
ordenable. **Presentación pura** — no hace fetch, no inyecta ningún servicio.

## Contrato
- Inputs: `groups` (requerido), `search`, `statusFilter`, `filtersActive`, `viewMode`
  (`'grouped' | 'flat'`), `canReport`, `expandAll`, `expandAllNonce`, `scopeKey`.
- Outputs: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `openAow`, `allOpenChange`,
  `clearFilters`.
- Estado: el host (`dashboard-lab`) es dueño de los datos y de los cinco filtros. Este componente
  solo posee su **disclosure** (`overrides`), los títulos expandidos, y qué overlay está abierto
  (`openMenuKey`, `openInfoKey`).
- Endpoint: ninguno. Las filas llegan ya construidas por `dashboard-lab.reportingGroups()`.

## Dónde se usa
- `dashboard-lab.component.html:1240` — único consumidor, rama `showPlanned()` (pestaña Reporting).

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`filtersActive` NO se puede deducir aquí.** Solo llegan `search` y `statusFilter`; los filtros
  **Section / Type / Category** los aplica el host al construir `groups`. Una tarjeta vaciada por
  Category llegaba idéntica a un AoW sin nada planeado, y el estado vacío afirmaba *"this area of work
  has no planned indicators yet"* sobre una tarjeta llena (P2-3405). Si añades un sexto filtro,
  actualiza `dashboard-lab.reportingFiltersActive()`.
- ⚠️ **La tarjeta NO lleva `overflow-hidden`.** Lo llevaba, y recortaba el popover de la ⓘ a una tira
  de 6px. El clip de la animación lo hace `.pr-collapse-inner`; las esquinas inferiores las redondea
  `.pr-collapse--card > .pr-collapse-inner`. No devuelvas el `overflow` a la `<section>`.
- ⚠️ **`app-pr-table` trae el skin OSCURO** de la tabla del Results Center
  (`[_nghost…] .pr-table thead th` → fondo azul marino, subrayado violeta de 2px, su propio padding).
  Esas reglas alcanzan las celdas proyectadas, así que `.pr-flat-head .pr-flat-cell` y
  `.pr-flat-body .pr-flat-cell` **re-declaran** `background` / `border` / `padding`. Si quitas
  cualquiera, vuelven las píldoras oscuras y los subrayados sueltos.
- ⚠️ **El gutter horizontal vive en las pistas 1 y 10 del grid, no en `padding`.** Con padding, la
  franja de 20px al lado de cada celda fija quedaba descubierta y se veía el contenido desplazado por
  debajo. Las celdas fijas van a `left: 0` / `right: 0`.
- ⚠️ **No pongas un segundo scroller.** `app-pr-table` ya renderiza `.pr-table-wrap` con
  `overflow-x: auto`; envolverlo en otro daba dos barras para un solo eje.
- ⚠️ **`app-pr-table` ordena con `<`/`>` sobre el valor crudo y no acepta comparador.** Por eso
  `flatTableRows()` precalcula `__sortTarget` / `__sortAchieved` / `__sortStatus`:
  `target_value_sum` llega como STRING y ordenaba `"9" > "100"`. "Nada reportado" es
  `-Infinity`, para que esas filas se agrupen en un extremo y no se hagan pasar por 0.
- 🛑 **No toques `statusOf` / `progressOf` / `figure` / `ratioOf`.** `aow-hlo-table` y
  `program-overview` leen las mismas derivaciones; cualquier cambio las descuadra en silencio.
- 🛑 **No toques la barra de progreso ni su métrica.** `ratioOf` cuenta KPIs con ALGO reportado, no
  KPIs al 100%. Es pregunta abierta de producto en P2-3405 (P2-2276 quitó una barra de % en 2025).
- `—` vs `0` son hechos distintos: `—` = nunca se reportó, `0` = se reportó cero. No los unifiques.
- El menú `⋯` es local. Sus dos items vivos re-emiten `openAchieved` / `openTarget`; no abren
  superficie propia. `Copy indicator code` va **visible pero deshabilitado** (`Coming soon`): el
  payload no trae ningún código de indicador visible para el usuario (P2-3405).

## Pendiente / Coming soon
- Cuerpo del popover ⓘ (falta descripción de AoW en el backend) → P2-3405, aviso a Ángel.
- Columna opcional `Parent` de la tabla → P2-3405 (falta campo en el backend; además el trigger de
  `Optional columns` no existe en el mockup).
