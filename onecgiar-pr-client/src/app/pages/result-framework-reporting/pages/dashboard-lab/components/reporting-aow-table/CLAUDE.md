# reporting-aow-table

**Verified:** 2026-08-29 · branch qa-development-2026 · 3662f00d7

## Qué es
El cuerpo de la pestaña **Reporting** del shell de Science Program: las tarjetas colapsables por Area
of Work (más las dos de programa, `Intermediate` y `2030`) y, en modo `All indicators`, la tabla plana
ordenable. **Presentación pura** — no hace fetch, no inyecta ningún servicio.

## Contrato
- Inputs: `groups` (requerido), `search`, `statusFilter`, `filtersActive`, `viewMode`
  (`'grouped' | 'flat'`), `canReport`, `expandAll`, `expandAllNonce`, `scopeKey`.
- Outputs: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `openAow`, `allOpenChange`,
  `clearFilters`, `copyLink`.
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
- 🛑 **No toques la barra de progreso ni su métrica.** La regla vive en UN solo sitio:
  `reporting-burndown.ts`'s `buildRatio`, del que `ratioOf` y el banner By-AOW
  (`dashboard-lab.buildAowBannerStats`) son ambos delegados — por eso dan números idénticos
  (MRF-R-6, MRF-AC-5/AC-6). Dice: **Reported** = `achieved > 0` (NO KPIs al 100%, que es
  **Complete** = `achieved >= target`; nunca las confundas), y los KPIs con `target = 0 AND
  achieved = 0` quedan **fuera del denominador** (regla zero-target, MRF-R-7) — `ratioTitle`
  lo declara en un `title` "excludes N zero-target KPIs". Si recomputas la regla aquí en vez de
  delegar, las dos superficies se descuadran en silencio. Es pregunta abierta de producto en
  P2-3405 (P2-2276 quitó una barra de % en 2025).
- ⚠️ **El ratio NO se cuenta sobre `group.indicators` a secas.** Cuando el toggle **Only pending**
  del host está activo, `indicators` ya viene recortado y el host deja el set previo en
  `__allIndicators` (campo lateral, ausente con el toggle apagado; lo escribe
  `dashboard-lab.applyBurndownFilterAndSort`, que tiene Section/Type/Category ya aplicados pero
  NO Only-pending). `ratioBase` prefiere ese campo — si no, la cabecera se movería cada vez que
  alguien toca el toggle, y eso no es progreso, es una coincidencia.
- `—` vs `0` son hechos distintos: `—` = nunca se reportó, `0` = se reportó cero. No los unifiques.
- El menú `⋯` es local. Sus tres items vivos re-emiten `openAchieved` / `openTarget` / `copyLink`
  (MRF-R-5, host arma la URL y copia); no abren superficie propia. `Copy indicator code` va
  **visible pero deshabilitado** (`Coming soon`): el payload no trae ningún código de indicador
  visible para el usuario (P2-3405). `Copy link` también va deshabilitado (con `title`) para filas
  de Intermediate Outcomes / 2030 Outcomes — no tienen AoW propio al que `tocAow=` pueda resolver
  (`canCopyLink(row)`, que **duplica** — no importa — los códigos sentinel de
  `dashboard-lab.component.ts`'s `INTERMEDIATE_OUTCOMES_CODE`/`OUTCOMES_2030_CODE` para evitar un
  import circular).

## Pendiente / Coming soon
- Cuerpo del popover ⓘ (falta descripción de AoW en el backend) → P2-3405, aviso a Ángel.
- Columna opcional `Parent` de la tabla → P2-3405 (falta campo en el backend; además el trigger de
  `Optional columns` no existe en el mockup).
