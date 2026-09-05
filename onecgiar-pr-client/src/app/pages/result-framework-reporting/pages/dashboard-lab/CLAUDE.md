# dashboard-lab

**Verified:** 2026-09-04 · qa-development-2026 · 2b7232fff (adds the viewport-lock layout contract below — host class keyed on `isProgramShell()`, `#workArea` scroller, band `frameLocked`/`scrollHost`; spec `changes/sp-shell-app-viewport` SAV-T-6); prior: merge `performance-refactor` → `qa-development-2026` · qa 6a9a45b5e (adds `onOverviewLink` scope stamping note, spec `changes/results-aow-column-filter` RAC-T-5) + perf f38c13161 (P2-3569: el modal emergente vivo ahora pasa `showInnovationLinkQuestion`); before that fa3f06a90 fixes stale `manageIndicator` tab union — now `'report' | 'info' | 'results'`, spec `changes/indicator-reported-results`; before that 2026-09-03 f0c0f68ba adds `partitionProgramKpis` / `summarisePartition` note, spec `bugfix/kpi-count-reconciliation`; before that 52ddf00af merged with performance-refactor · 4c2c0c69f — ToC achievement rollup, P2-3296

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
- El drawer de indicador se abre solo desde aquí: `manageIndicator(row, hlo, tab, node?)` con
  `tab: 'report' | 'info' | 'results' = 'report'` (la pestaña `results`, tabla de resultados
  reportados, es de la spec `changes/indicator-reported-results`; ver `indicator-drawer/CLAUDE.md`).
  El 4º argumento es el nodo ToC y **gana** sobre el match por `result_title`: es quien lleva
  `toc_partner_institution_ids` y `contributing_synergy_program_initiative_ids`, y perderlos deja
  los desplegables de centros y SP vacíos **sin ningún error**.
- **El botón `Report` de la tabla de Reporting abre el ASIDE**, no el modal viejo
  (`onReportingRowReport` → `primeEntityAowContext()` + `manageIndicator(..., 'report', __hloNode)`).
  Los otros seis puntos de entrada de este archivo y las páginas `entity-aow` **siguen con el
  modal**: eso es deliberado, no una migración a medias.

## Layout: viewport lock (spec `changes/sp-shell-app-viewport`, SAV-T-6)
- `≥ md`: host binds `[class.pr-viewport-page]="isProgramShell()"` (Overview + Reporting only;
  `emerging`/`centers`/`dashboard` unaffected) → shared `pr-viewport-page` mixin
  (`src/styles/_viewport-page.scss`): absolute inset-0, flex col, overflow hidden.
- `#workArea` (`workAreaEl()`) is the ONE scroller for both tabs (AOW mode: no band, `section` itself
  scrolls). Between `section` and the tab `article` sits a `div` (html ~L740-747) carrying
  `min-[900px]:min-h-0 min-[900px]:flex-1` — load-bearing for the flex chain, not decorative. Band:
  `[frameLocked]="true" [scrollHost]="workAreaEl()"` **drops `sticky` at ≥900** and reads
  `scrollHost.scrollTop + window.scrollY`. Reporting's toolbar (search/4 filtros/Grouped/
  Expand-all) lives inside the band component, above `#workArea` (outside the sticky tinted box), so it stays on screen; only the body scrolls.
- **`< md`:** unchanged — document scrolls, band stays `sticky`; `workAreaEl()` resolves but
  contributes `scrollTop 0`.

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

## Trampa: este componente es el host VIVO de la pantalla emergente (2026-09-04, P2-3569)
- El modal "Report emerging result" (`<app-report-result-form>`) **es** la vía emergente real:
  `entity-details` (de donde se copió) está **retirado y sin ruta** — `routing-data.ts` carga
  `DashboardLabComponent` para `emerging`, `entity-details/:entityId`, `overview` y `planned-toc`.
- ⚠️ **Y eso ya costó un requisito entero.** P2-3421 ("¿reporta el uso de una innovación ya
  evaluada?") se cableó con `[showInnovationLinkQuestion]="true"` **solo en `entity-details`**, con
  nota "fuera de alcance"; nunca se vio en pantalla (QA reprodujo su ausencia 3 veces). Corregido
  aquí, candado `report-result-form/innovation-link-surfaces.spec.ts`.
- ⇒ **Al leer una nota que dice "esa otra superficie es la que importa", comprueba que esté enrutada.**

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

## Añadidos 2026-08-29 (specs reporting-entry-hub / mass-reporting-flow)
- `components/reporting-entry-hub/` — hub "Where to report" (lanes W1/W2 + W3; strings en `hub-copy.ts`).
- `components/narrative-panel/` — panel de narrativa IA in-browser (WebLLM vía `ASSISTANT_ENGINE`); doble gate `environment.aiAssistant.enabled` && `ai_narrative_enabled` (global parameter); el consentimiento del panel es la ÚNICA puerta a `engine.init` (descarga del modelo).
- `reporting-burndown.ts` — helpers puros del burn-down; `buildRatio` es el ÚNICO hogar de la regla zero-target (banner + `ratioOf` de la tabla delegan). `partitionProgramKpis` / `summarisePartition` son el ÚNICO hogar de la partición cuenta-una-vez que lee toda cifra de KPI del shell (band, hero, chips, hub, ToC map, tabla, banner — design §6.1, KCR-DD-1; spec `bugfix/kpi-count-reconciliation`). ⚠️ `__allIndicators` (side-channel escrito solo con Only-pending ON) trae Section/Type/Category ya aplicados, Only-pending no.
- Deep-link `?kpi=` (siempre con `tocAow`; los ids de indicador se repiten entre AoWs) + contador de sesión + Next pending (tarjetas By-AOW **y** filas de la tabla agrupada/flat — `lastReportedKpi` lo publican AMBOS cierres: el modal legacy (`openLegacyReportModal`+efecto) y el drawer (`onReportingRowReport` captura → `closeManage` publica vía `publishReportedKpi`; filas bucket publican sin force-refresh).

## Alineación de vistas (2026-08-30)
- Vistas agrupada (`aows`) y enfocada (`byAow`): mismos datos, dos zooms, navegables entre sí —
  header de tarjeta "By AOW" → `openAowFocused(code)` (no-op para buckets) ↔ banner "All Areas of
  Work" → `setPlannedBrowseView('aows')`. Recetas: Report = `.pr-row-action` (32px/14px/borde -300,
  la desviación WCAG), link 30×30 material `link`, categoría violeta `#6b46e51f`, chip de centro
  neutro, "Show more" (regla UI §4.16 — nunca "Read more").

## Añadido 2026-09-01 (spec overview-aow-progress-hero)
- `program-overview`'s "Progress by area of work" is now the Overview HERO (moved right after "About
  this program"). Fed by two NEW host bindings: `[richRows]` (`overviewAowProgressRich` computed) +
  `[continueReporting]` output (`continueReporting()` = `setOnlyPending(true)` + navigate to
  Reporting with `?tocView=aows`). Thin `aowProgress`/`xcutProgress` inputs untouched (DD-4).

## Trampa: tokens fantasma (2026-08-31)
- ⚠️ **Un `var(--pr-*)` sin definición pinta transparente sin ningún error** — `--pr-surface-ground`
  se usó ~50 veces (skeletons de hub/banner/tabla) sin existir en `colors.scss`: la página parecía
  cargada-y-vacía mientras cargaba. Ahora está definido (`#efeef3`) y `design-tokens.spec.ts` barre
  el módulo entero y falla si aparece otro token usado-pero-no-definido. Si añades un token, decláralo
  en `src/styles/colors.scss` PRIMERO.

## Añadido 2026-09-04 (spec `changes/results-aow-column-filter`, RAC-T-4/T-5)
- `onOverviewLink(link)` (`:2375`) is the ONE seam every `OverviewLink` a chart/card/breakdown row
  emits passes through on its way to `router.navigate` — not each of the ~6 builders in
  `program-overview.component.ts` (`RAC-DD-4`). When `overviewScope()` is set and the emitted
  `link.section` is `undefined`, it stamps `section = overviewScope()` before mapping to
  `queryParams` via `PROGRAMME_RESULTS_QUERY_PARAM_MAP`; no active scope → no `section` key at all.
  A builder that already knows its own scope (the breakdown rows' `viewBreakdownResults`, see
  `components/program-overview/CLAUDE.md`) sets `section` explicitly and is **never** overwritten.
  Hero-row and ToC-map clicks are untouched — they keep opening Reporting By-AOW, not Results.
  Live-verified (RAC-T-5, SP01/SP12): every Results-tab count under `?section=<key>&origin=W1/W2`
  reconciles against the Overview breakdown total for that key (owner population, W1/W2 only,
  `RAC-DD-6`) — see `pages/programme-results/CLAUDE.md` for the reconciliation table and the
  contributor-only delta this component's `overviewScope`/breakdown totals still include.

## Trampa nueva (2026-08-26)
- ⚠️ **Dos convenciones opuestas para `is_aow` ausente.** `indicatorsByAow()`'s `fromTier` (~línea
  1418) trata un `is_aow` faltante como cross-cutting (`!== true`), mientras que
  `entity-aow/services/entity-aow.service.ts` (líneas ~44, 49) trata un `is_aow` faltante/false como
  exclusivo de ese AoW (`=== false`, fijado por su propio spec). Hoy el backend siempre normaliza
  `is_aow` a un booleano real (`Boolean(row.is_aow)` en `aow-bilateral.repository.ts:525`), así que
  ambas conviven sin conflicto — pero si el backend alguna vez omite el campo, divergirán. No
  "armonices" un lado sin revisar ambos specs primero (ver `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/` `RES-DD-2`).
