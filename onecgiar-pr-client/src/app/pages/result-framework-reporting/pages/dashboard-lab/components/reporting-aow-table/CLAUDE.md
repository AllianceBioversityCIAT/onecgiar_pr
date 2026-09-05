# reporting-aow-table

**Verified:** 2026-09-04 · branch qa-development-2026-ss · merge of origin/performance-refactor 85fdfc8c3 into 9b9c032ba (RTA-T-1's sticky-pin grid was superseded by this branch's tabular redesign — see the RTA-T-1 note below)

## Qué es
El cuerpo de la pestaña **Reporting** del shell de Science Program: las tarjetas colapsables por Area
of Work (más las dos de programa, `Intermediate` y `2030`) y, en modo `All indicators`, la tabla plana
ordenable. **Presentación pura** — no hace fetch, no inyecta ningún servicio.

## Arquitectura de Jerarquía Visual (3-Level Card-in-Card Hierarchy — RAH)
El árbol de contenido se organiza según el patrón arquitectónico Card-in-Card en 3 niveles estrictos:
- **Level 1: AoW Outer Card:** Contenedor macro (`section.rounded-2xl.border-slate-200`) que agrupa el área temática (`AOW01`), la barra de progreso global, el botón "By AOW" y la barra de desglose rápido (`Centers`, `Types`) integrada en tarjeta.
- **Level 2: HLO Sub-Card:** Sub-tarjeta meso autónoma (`rounded-xl border border-slate-200/90 bg-white shadow-2xs`) para cada High-Level Output / Outcome / IO, con contraste superficial mediante gradiente sutil (`from-slate-50 via-indigo-50/30 to-slate-50`), píldora semántica de taxonomía (`HLO 1.1`, `OC 1.2`, `I-OC 3.5`), botón de chevron en caja blanca y micro-KPIs consolidados (Target, Achieved, badge de conteo de indicadores, QA% y Prel%).
- **Level 3: Indented Indicator Scaffolding:** Scaffolding micro con 24px de sangría (`pl-4 sm:pl-6`), guía visual de árbol (`border-l-4 border-indigo-500/40 bg-indigo-50/10`) y sub-cabecera contextual de columnas (`INDICATOR TITLE & TAXONOMY | Target | Achieved | Status | Progress | Action`) compacta de 28px (`h-7`). Cada fila de indicador (`.pr-reporting-row`) se renderiza sobre fondo blanco (`bg-white hover:bg-slate-50/80`) con franjas JIRA de estado (`border-l-[3px]`), bullseye concéntrico y botones de acción interactivos con aislamiento de eventos (`stopPropagation`).

## Contrato
- Inputs: `groups` (requerido), `search`, `statusFilter`, `filtersActive`, `viewMode`
  (`'grouped' | 'flat'`), `canReport`, `expandAll`, `expandAllNonce`, `scopeKey`, `lastReported`
  (el KPI cuyo report se acaba de cerrar — publica el host; enciende "Next pending" en esa fila).
- Outputs: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `openAow`, `allOpenChange`,
  `clearFilters`, `copyLink`.
- ⚠️ **Event isolation & contract protection (Kaizen `KZ-changes--reporting-aow-jira-hierarchy-2`):**
  Todos los botones interactivos dentro de la fila de indicador (`.pr-row-action` [Report],
  `Copy link`, `Target`, `Achieved`, menú `⋯`) DEBEN invocar `emitAndStop` (`$event.stopPropagation()`)
  para aislar la acción e impedir que se dispare el evento `openRow` de la fila contenedora.
- Estado: el host (`dashboard-lab`) es dueño de los datos y de los cinco filtros. Este componente
  solo posee su **disclosure** (`overrides`), los títulos expandidos, y qué overlay está abierto
  (`openMenuKey`, `openInfoKey`).
- Endpoint: ninguno. Las filas llegan ya construidas por `dashboard-lab.reportingGroups()`.

## Dónde se usa
- `dashboard-lab.component.html:1286` — único consumidor, rama `showPlanned()` (pestaña Reporting),
  alcanzada desde la ruta `entity-details/:entityId` (`rfrView: 'planned'`, `routing-data.ts:612`).

## Disclosure — the contract QA keeps re-testing (P2-3251 / P2-3252)
- **Cards arrive COLLAPSED.** `isDefaultOpenAow()` returns `expandAll()`, which the host defaults to
  `false`; sub-groups inside an opened card default to open (`isDefaultOpenHlo()` → `true`). This is
  the approved behaviour: the PO confirmed it on P2-3251 (27 Aug 2026, *"Inicialmente vamos con que
  estén cerradas"*). The ticket's first paragraph describes the situation **before** the change, and
  reading that as the requirement is the mistake QA made twice.
- ⚠️ **Overrides are keyed by `scopeKey` + `expandAll` + `expandAllNonce`.** `AOW01` exists in EVERY
  Science Program, so keying by AoW code alone leaked one programme's open cards into the next.
  Dropping `scopeKey` from the `linkedSignal` source brings that bug straight back.
- ⚠️ **`expandAllNonce` is not decoration.** With `expandAll` alone, a user who opened every card by
  hand asks the host for the value the boolean already holds — the press does nothing while the label
  flips. The nonce is part of the reset key so a press always re-seeds.
- ⚠️ **The collapsed panel STAYS MOUNTED** (height animation, no `@if` pop). So "collapsed" is
  `.pr-collapse` *without* `.is-open` plus `aria-hidden="true"` — never absence of nodes. A DOM test
  that counts rows must scope to `.pr-collapse.is-open`, as the spec's `rows()` helper does.
- The five `describe('collapsed by default, through the header button')` tests press the real
  `section > button[aria-expanded]`. Every other disclosure test calls `component.toggle()` directly,
  so dropping the header's `(click)` binding left the whole suite green — verified 2026-09-01.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El botón "By AOW" (`:441-455`) colapsa a solo-icono bajo 900px** (`max-[900px]:w-[30px]` + `title="By AOW"`) — ya rompió algo: desbordó la página 48px a 768px (798≠750) sin que dos pases de verificación lo notaran. No faltaba ningún `min-w-0`: el nombre (`:313`) ya estaba en 0px y cada hermano restante es `shrink-0`. El `aria-label` queda INCONDICIONAL a propósito — es lo que hace defendible ocultar solo la etiqueta visible; no lo condiciones al breakpoint. Tailwind v4: `max-[900px]:` compila a `width < 900` (exclusivo), encajando exacto con `min-[900px]` — ya mordió a `OSF-T-2b` en un componente hermano.
- ⚠️ **El bloque de achievement (`:409-434`, `w-[168px] shrink-0`) va `max-[1100px]:sr-only`, NUNCA `max-[1100px]:hidden`** (`OSF-T-16`) — a exactamente 900px desbordaba 177px, idéntico banda colapsada/expandida (no era la banda; era el grupo ratio+achievement de 444px que `OSF-T-12` ya había señalado). `hidden` sacaría las cifras QA/Prel/coverage del árbol de accesibilidad sin que nada más las nombre (viola `OSF-R-8`); `sr-only` las deja leíbles por lector de pantalla y solo les quita su hueco en el flex. `1100`, no `900`: a 900px exacto `max-[900px]` no aplica (ver arriba), y `1100` es el límite que el propio ladder de `OSF-DD-8` usa para soltar este mismo bloque. El fallback sighted-hover vive en el `title` del `<span>` que lo envuelve (`rowTitle()`), no en el bloque — a 1px es inalcanzable con el puntero.
- ⚠️ **`filtersActive` NO se puede deducir aquí.** Solo llegan `search` y `statusFilter`; los filtros
  **Section / Type / Category** los aplica el host al construir `groups`. Una tarjeta vaciada por
  Category llegaba idéntica a un AoW sin nada planeado, y el estado vacío afirmaba *"this area of work
  has no planned indicators yet"* sobre una tarjeta llena (P2-3405). Si añades un sexto filtro,
  actualiza `dashboard-lab.reportingFiltersActive()`.
- ⚠️ **`.pr-collapse`/`.pr-collapse-inner` moved OUT of this file's `.scss`** (`changes/aow-row-gesture-split`,
  `RGS-T-3`): now shared at `src/styles/collapse.scss`, reused by `program-overview`'s AoW hero.
  Don't re-add a local copy here. That spec also logs (not fixed here) that THIS card's collapse
  has zero `inert` — 20 buttons stay tabbable-but-`aria-hidden` while closed; `program-overview`'s
  NEW collapse does not copy that gap.
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
- ⚠️ **RTA-T-1 (sticky pins, `bugfix/reporting-table-actions-clipped`) — superseded, confirmed on disk after the 2026-09-04 merge.** The `.scss`'s own merge note (top of the file) confirms `.pr-pin-actions` / `.pr-pin-menu` / `.pr-hlo-pin-*`, `.pr-collapse--rows` and `min-width: 1048px` were NOT carried over: the tabular redesign (`$pr-reporting-tracks`, no *Next pending* button, in-card popovers) is what's live. If clipping under ~1000px reappears, re-derive the fix against this grid — do not restore the RTA rules verbatim.
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
- **Next pending + Copy link heredados de las tarjetas By-AOW (MRF-R-3.1/R-5).** La fila cuyo
  report se acaba de cerrar (`lastReported`, match por id+AoW — los ids se repiten entre AoWs)
  ofrece "Next pending": recorre `orderedVisibleRows()` (el orden EN PANTALLA, filtros incluidos),
  salta reportados y zero-target (`pendingOf`), da la vuelta, y al saltar abre tarjeta+subgrupo
  (match por `rowKey`, nunca identidad — las bandas bucket CLONAN sus filas), scrollea a los 320ms
  (la animación de apertura dura 280ms; a 60ms aterrizaba fuera del viewport — verificado en vivo)
  y resalta ~2.6s. El icono de link visible re-emite el mismo `copyLink` del menú `⋯`; la columna
  action del grid pasó de 96px a 136px (y la pista flat de 104 a 140) para alojarlo — ahora convive
  con la pista `Progress` de 132px añadida por P2-3296 (ver `.scss`, `$pr-flat-tracks` /
  `.pr-reporting-row`'s `grid-template-columns`).
- **Alineación de vistas (2026-08-30):** el header de cada tarjeta AoW real lleva un botón "By AOW"
  (nested-control con `emitAndStop`) que emite `openAow` → el host salta a la vista enfocada
  (`openAowFocused`); los buckets no lo muestran. El chip de categoría es violeta (misma entidad,
  mismo color que la tarjeta By-AOW), y los botones link/Next-pending usan los MISMOS glifos
  material y medidas (30px agrupada / 28px flat) que la tarjeta By-AOW. ⚠️ La celda de acciones
  flat fue reconstruida una vez desde una copia pre-commit y perdió estos controles — si editas esa
  celda, parte del working tree, no de una copia vieja.
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
- Recordar qué AoW dejó abierto el usuario entre visitas — sugerencia del propio PO en P2-3251,
  explícitamente **no** incluida en sus criterios de aceptación y **no construida**. Necesita su
  propio ticket.
