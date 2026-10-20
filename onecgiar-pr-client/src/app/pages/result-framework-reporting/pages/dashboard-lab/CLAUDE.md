# dashboard-lab

**Verified:** 2026-10-19 · qa-development-2026-ss · changes/kpi-progress-capped-average KPC-T-7 (By-AOW HLO row loses the TARGET / ACHIEVED columns; grid is 4 tracks) · prior: 2026-10-19 · JuankCadavid/pt-badge-texts (`pt-activity.ts` badge copy helpers — see "Añadido 2026-10-14") · prior: KPC-T-6 (see "Añadido 2026-10-19") · prior: 2026-10-16 · changes/kpi-progress-target-only KTO-T-7 (global Target filter — see "Añadido 2026-10-16") · prior: 2026-10-15 · changes/sp-overview-total-drilldown (adds `onTotalSegment(kind)` and extracts `effectivePhaseLabel()` from `onOverviewLink` — see "Añadido 2026-10-15"; additive, nothing superseded) · prior: 2026-10-14 · JuankCadavid/pt-center-mapping (Progress Tracker activity badges + toggle; toolbar wrap + short PT label at <1280px — see "Añadido 2026-10-14") · prior: 2026-10-13 · qa-development-2026-ss · quick/sp-overview-bilateral-review-card (adds overviewBilateralReviewCategoryCount; Editing rows dropped from every W3/Bilateral card at scopedBilateralRows — see "Añadido 2026-10-13") · prior: 2026-10-08 · changes/sp-overview-total-general-card (adds overviewTotalBreakdown — see "Añadido 2026-10-08") · prior: 2026-10-02 · qa-development-2026-ss · bugfix/achieved-counts-submitted ACS-T-4 (hides the QA/Prel pair in the By-AOW banner and HLO row behind `showQaPrelSplit` — see "QA/Prel split hidden" below) · prior: 2026-09-09 · feat/P2-3336-io-without-aow (P2-3336 regla 1: los IO sin AoW ya no entran a un bundle de AoW — ver "IO sin AoW" abajo) · prior: 2026-09-04 · qa-development-2026 · 2b7232fff (adds the viewport-lock layout contract below — host class keyed on `isProgramShell()`, `#workArea` scroller, band `frameLocked`/`scrollHost`; spec `changes/sp-shell-app-viewport` SAV-T-6); prior: merge `performance-refactor` → `qa-development-2026` · qa 6a9a45b5e (adds `onOverviewLink` scope stamping note, spec `changes/results-aow-column-filter` RAC-T-5) + perf f38c13161 (P2-3569: el modal emergente vivo ahora pasa `showInnovationLinkQuestion`); before that fa3f06a90 fixes stale `manageIndicator` tab union — now `'report' | 'info' | 'results'`, spec `changes/indicator-reported-results`; before that 2026-09-03 f0c0f68ba adds `partitionProgramKpis` / `summarisePartition` note, spec `bugfix/kpi-count-reconciliation`; before that 52ddf00af merged with performance-refactor · 4c2c0c69f — ToC achievement rollup, P2-3296

## Qué es
El shell de un Science Program. Un solo componente que sirve varias vistas según `rfrView`, y que es
dueño de **los datos y los filtros** de todas ellas. Es el archivo más grande del módulo (~2.2k LOC
de TS): trátalo como host, no como pantalla.

## Contrato
- Ramas de vista en la plantilla: `showOverview()` (pestaña Overview), `showPlanned()` (pestaña
  **Reporting**), más las vistas de AoW/guía. La pestaña **Results** ya NO vive aquí: es
  `pages/programme-results/`, cargada por su propia ruta.
- Es dueño de **seis** filtros de Reporting: `plannedSearch`, `reportingAowFilter` (multi),
  `reportingTypeFilter`, `reportingTypologyFilter`, `reportingStatusFilter`, y `favoritesOnly`
  (spec `changes/reporting-favorite-indicators`, RFI-R-2.*). `reportingFiltersActive()` los agrega
  en un solo booleano y `clearReportingFilters()` los resetea; la cláusula de `favoritesOnly` va
  **gateada por vista** (`&& plannedBrowseView() === 'aows'` — JD-1: el switch no filtra nada en By
  AOW) y `clearReportingFilters()` apaga el switch (`setFavoritesOnly(false)`) pero **nunca borra**
  un pin — eso vive solo en `ReportingFavoritesService`.
- `reportingGroups()` aplica **Section / Type / Category** y entrega `ReportingAowGroup[]` ya
  filtrado; `search` y `statusFilter` se pasan aparte y los aplica el hijo.
- `reportingGroupsForTable()` = `applyFavoritesFilter(applyBurndownFilterAndSort(reportingGroups()))`
  — `applyFavoritesFilter` corre **DESPUÉS** de `applyBurndownFilterAndSort` a propósito (RFI-DD-3):
  así hereda el `__allIndicators` que ya escribió Only-pending y el ratio de cabecera sigue contando
  el universo pre-favoritos (RFI-R-2.4), no el subconjunto de favoritos.
- El drawer de indicador se abre solo desde aquí: `manageIndicator(row, hlo, tab, node?)` con
  `tab: 'report' | 'info' | 'results' = 'report'` (la pestaña `results`, tabla de resultados
  reportados, es de la spec `changes/indicator-reported-results`; ver `indicator-drawer/CLAUDE.md`).
  El 4º argumento es el nodo ToC y **gana** sobre el match por `result_title`: es quien lleva
  `toc_partner_institution_ids` y `contributing_synergy_program_initiative_ids`, y perderlos deja
  los desplegables de centros y SP vacíos **sin ningún error**.
- **El botón `Report` de la tabla de Reporting abre el ASIDE**, no el modal viejo
  (`onReportingRowReport` → `primeEntityAowContext()` + `manageIndicator(..., 'report', __hloNode)`).
  **Report emerging result** (band ×2, hub card, `?reportEmerging=true`) abre el aside en modo
  `emerging` (`openEmergingReport()`). Los puntos de entrada legacy de `entity-aow` **siguen con el
  modal** donde no se migraron — no confundir con emerging.

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

## Trampa: emerging create ya NO usa el modal viejo (2026-09-05, spec `changes/emerging-result-cta-placement`)
- **Report emerging result** (band, hub card, hop desde Results / My results) abre el **aside**
  (`openEmergingReport()` → `managed.emerging` + `indicator-drawer` en modo `emerging`). El hub
  cierra y **no** llama `openReportModal()` / `showReportModal`.
- El tag `<app-report-result-form>` puede quedar en el árbol como legado; **no** es la vía viva para
  emerging. La pregunta P2-3421 la decide `lab-report-form` (`showsInnovationLink`); candado
  `innovation-link-surfaces.spec.ts`.
- Hop desde Results / My results: `rememberResultDetailOrigin()` **antes** de navegar con
  `?reportEmerging=true&returnTab=…`; cancel cierra y vuelve al tab de origen; create **no**
  sobrescribe el origen con la URL de dashboard-lab.

## Trampa: este componente sigue siendo host del modal legado (2026-09-04, P2-3569)
- El modal `<app-report-result-form>` permanece en el HTML por compatibilidad, pero **emerging** y el
  hub card ya no lo abren. `entity-details` (de donde se copió) está **retirado y sin ruta**.

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

## Arquitectura de Jerarquía Visual en "By AOW" (UI/UX Pro Max Unified Table Layout)
El árbol de contenido en la vista "By AOW" (`plannedBrowseView() === 'byAow'`) se estructura con un diseño unificado tipo tabla con alineación estricta CSS grid (`$pr-by-aow-tracks: 28px minmax(240px, 1fr) 64px 130px`, KPC-R-12: 4 tracks — header, HLO row and the template list MUST keep the same cell count; `dashboard-lab.component.spec.ts` asserts it):
- **Banner Metrics Modernizados:** Stat cards con bordes suaves (`rounded-xl border border-slate-200/80 bg-slate-50/60 shadow-2xs`), etiquetas en mayúsculas (`text-slate-500`), cifras de alto contraste (`tabular-nums text-slate-900`) y barra de progreso con gradiente esmeralda.
- **Level 1: Unified Table Section Card:** Contenedor de sección macro (`section.rounded-2xl.border.border-slate-200/90.bg-white.shadow-xs.overflow-hidden`) con encabezado gradiente, píldora de conteo (`53 KPIs`), toggle *Collapse all / Expand all*, y barra de cabecera de tabla (`.pr-by-aow-head`: `TITLE & TAXONOMY | KPIS | PROGRESS`).
- **Level 2: HLO Table Rows:** Filas dentro de `divide-y divide-slate-200/70`. La fila interactiva (`.pr-by-aow-row`) comparte la cuadrícula CSS grid de la cabecera:
  - Columna 1: Chevron rotatorio en botón blanco.
  - Columna 2: Chip de taxonomía ToC (`.pr-hlo-code` con `hloTaxonomy`: `OUTPUT 1.1`, `OUTCOME 2.1`, etc.) y título limpio con resaltado de búsqueda.
  - ~~Columnas Target / Achieved~~ — **eliminadas (KPC-R-12, 2026-10-19):** ninguna fila que agrupa varios indicadores muestra Target ni Achieved sumados (`hloTargetSum` / `hloAchievedSum` ya no existen). La sub-tabla de indicadores (Level 3) conserva el Target / Achieved propio de cada KPI.
  - Columna 3: Píldora con recuento de KPIs.
  - Columna 4: por defecto una sola cifra de avance (unión "Achieved"); con `showQaPrelSplit` encendido, los porcentajes QA y PREL por separado — ver "QA/Prel split hidden" abajo.
- **Level 3: Indented Indicator Scaffolding:** Sub-tabla interna de indicadores con sangría de 24px (`pl-4 sm:pl-6`), guía visual de árbol (`border-l-4 border-indigo-500/40 bg-indigo-50/10`) y sub-cabecera contextual de columnas (`INDICATOR TITLE & TAXONOMY | Target | Achieved | Status | Progress | Action`). Cada fila de indicador (`.pr-by-aow-indicator-row`) cuenta con accesibilidad completa (`role="button"`, `tabindex="0"`, `aria-expanded`, teclas `Enter`/`Space`), franjas JIRA de estado (`border-l-[3px]`), bullseye concéntrico (18px) y botones de acción interactivos (*Report*, *Copy link*) con aislamiento de eventos (`$event.stopPropagation()` per Kaizen `KZ-changes--reporting-aow-jira-hierarchy-2`). Preserva anclaje de deeplink `[id]="kpiDomId(ind)"` y resaltado `highlightedKpiId`.


## QA/Prel split hidden behind `showQaPrelSplit` (ACS-R-5, spec `bugfix/achieved-counts-submitted`)
- `showQaPrelSplit = SHOW_QA_PREL_SPLIT` (imported from `shared/constants/achieved-display-basis.ts`,
  default `false`). `@if (showQaPrelSplit) … @else …` hides the QA/Prel. two-track markup — kept
  verbatim, not deleted — in favour of a single union ("Achieved") figure on the By-AOW banner
  (`achievement` block, `:~1610`) and the By-AOW HLO row's Progress column (`:~1823`, Columna 4
  above). Flip the constant to restore the pair with zero server change (ACS-S-10).
- `achievementTooltip()` (this component's own copy of the P2-3296 helper) branches the same way:
  with the flag off it states a single "ToC achievement — x% …" sentence instead of "QA x% and
  Preliminary y% …" (ACS-S-9).
- **T-3 re-pointed the underlying `TocAchievement`/indicator fields, not this task** — `progress_value`/
  `progress_percentage` already read the union ("Achieved") basis via `achieved-display-basis.ts`'s
  `toDisplayBasis` at the `ResultsApiService` choke point; QA originals survive under
  `qa_progress_value`/`qa_progress_percentage` (client-only). `achievementLabel()`/
  `preliminaryAchievementLabel()` were not touched by T-4 — they already read the correct field.
- Grep gate convention for this spec: a visible `>QA<` / `>Prel.<` / `>PREL<` in this file's template
  must sit inside an `@if (showQaPrelSplit)` block.

## Añadido 2026-10-08 (spec `changes/sp-overview-total-general-card`)
- `overviewTotalBreakdown` feeds `program-overview`'s `[totalBreakdown]`: replicated + new from the meter Version (program-wide, ignores `overviewScope`) plus pendingReview from UNSCOPED `bilateralRows()`. Never read `scopedBilateralRows()` here.

## Añadido 2026-10-15 (spec `changes/sp-overview-total-drilldown`)
- `onTotalSegment(kind)` handles `program-overview`'s `(openTotalSegment)` (Total General rows and bar segments). It does NOT go through `onOverviewLink`, so it never stamps `section` — KPI 1 is program-wide.
  - `replicated` / `new` → Results tab with `origin=W1/W2`, `replication=<kind>`, `phase=<effectivePhaseLabel()>` (omitted when empty).
  - `pendingReview` → `bilateral-review` with `status=pending`, `phase=<effectiveVersionId()>` omitted when null. Note: a numeric versionId here vs a phase label on Results links.
  - No initiative code → early return.
- `effectivePhaseLabel()` is the phase-fallback chain extracted from `onOverviewLink`; both paths share it — never duplicate it. Param names come from `PROGRAMME_RESULTS_QUERY_PARAM_MAP` / `BILATERAL_REVIEW_QUERY_PARAM_MAP`.

## Añadido 2026-10-13 (`quick/sp-overview-bilateral-review-card`)
- `overviewBilateralReviewCategoryCount` feeds `[bilateralReviewCategoryCount]`: distinct categories among `scopedBilateralRows()` with status in `BILATERAL_REVIEW_STATUS_IDS` (5/6/7). KPI 3 excludes Editing (center-only) and Discontinued.
- Editing (ids 1/8, `BILATERAL_EDITING_STATUS_IDS`) — requested by Nicoleta, SR-164368 — is dropped ONCE in `scopedBilateralRows`, so centers, categories, status segments (card, donut, `overviewBilateralTotal` badge) and the heatmap all exclude it and reconcile. SPs never act on Editing. `overviewTotalBreakdown` keeps reading unscoped `bilateralRows()`. The Editing slot is also skipped in the segment map and its ids stay in `slottedIds`, so it never resurfaces as a `status-N` fallback.

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

## IO sin AoW: fuera de los AoW (P2-3336 regla 1, 2026-09-09)
- Un nodo ToC sin work package (`wp_id NULL`, `is_aow: false`) pertenece al Science Program. El
  server lo devuelve **bajo todas las AoW** a propósito y eso **no cambió**; lo que cambió es que
  `indicatorsByAow()`'s `fromTier` lo **filtra antes de estamparlo** (`.filter(g => tier !==
  'outcome' || g?.is_aow !== false)`). Es la ÚNICA puerta por la que entraba a un bundle de AoW, y
  por eso el filtro va ahí y no en cada consumidor.
- La regla 2 del ticket (mostrarlos en cada AoW con una nota "not exclusive") la **anuló el PO** el
  2026-09-09: esos casos no existen. El tooltip `RES-R-3` dentro de tarjetas de AoW salió con ella;
  `RES-R-1` (tooltip dentro de la tarjeta `intermediate`) sigue vivo.
- ⚠️ **Solo Outcomes.** Los Outputs sin AoW se siguen mostrando en todos los AoW — la regla habla de
  Intermediate Outcomes. Si aparece uno, reproduce el problema en la banda HIGH LEVEL OUTPUTS.
- ⚠️ **La pantalla legacy `entity-aow-aow` NO cambió**: conserva su sección "Intermediate Outcomes
  not exclusive to this Area of Work". Fue decisión explícita (2026-09-09), no un olvido. Por eso el
  corte NO se hizo en el SQL: las dos pantallas comen del mismo endpoint.
- El server dejó de contarlos en el % del AoW y del programa (`results-framework-reporting.service.ts`,
  `belongsToTheAreaOfWork`) — antes el mismo nodo se promediaba una vez por cada AoW.
- `ProgramKpiAowSlice.crosscut` queda en `0` en la ruta de AoW. Se conservó el campo a propósito: el
  payload puede volver a traerlos.

## Trampa nueva (2026-08-26)
- ⚠️ **Dos convenciones opuestas para `is_aow` ausente.** `indicatorsByAow()`'s `fromTier` (~línea
  1418) trata un `is_aow` faltante como cross-cutting (`!== true`), mientras que
  `entity-aow/services/entity-aow.service.ts` (líneas ~44, 49) trata un `is_aow` faltante/false como
  exclusivo de ese AoW (`=== false`, fijado por su propio spec). Hoy el backend siempre normaliza
  `is_aow` a un booleano real (`Boolean(row.is_aow)` en `aow-bilateral.repository.ts:525`), así que
  ambas conviven sin conflicto — pero si el backend alguna vez omite el campo, divergirán. No
  "armonices" un lado sin revisar ambos specs primero (ver `docs/specs/results/intermediate-outcome-aow-visibility/target-tooltip/` `RES-DD-2`).

## Añadido 2026-10-14 (Progress Tracker activity, `pt-activity.ts`)
- ONE `GET_progressTrackerIndicatorActivity(code)` per program load (effect keyed on `initiativeCode` via `loadPtActivity`, deduped against `selected()` identity churn), `timeout(PT_ACTIVITY_TIMEOUT_MS)` + `catchError` → `ptActivity = null`. Null/non-ok/malformed = page exactly as before: no badge, no toggle, filter is identity.
- `ptActivityOnly` is a SEVENTH Reporting filter: `applyPtActivityFilter` runs LAST in `reportingGroupsForTable` (after favorites, same `__allIndicators` contract), its `reportingFiltersActive` clause is gated by `ptActivityAvailable() && plannedBrowseView() === 'aows'`, `clearReportingFilters` and a program switch turn it off.
- Row ↔ map match lives only in `pt-activity.ts` (`ptActivityCountOf`): integration id (`indicator_id`) first, `indicator_related_node_id` fallback; row centres select map rows; no centre → only an indicator mapped once; shared target sums its centres de-duplicated by PT KPI id.
- Badge copy lives in `pt-activity.ts` too (2026-10-19): `ptActivityLabel` / `ptActivityShortLabel` / `PT_ACTIVITY_TOOLTIP`. The unit is evidence items, not proposals (one proposal can group several).

- Toolbar (`reporting-program-band`): the primary row and `reporting-filter-group` are `flex-wrap` with `gap-x-[10px] gap-y-[8px]` — before that the group could not wrap and at ~1024px the PT switch ran under the Video Guide button (in flow, never absolute). The switch label is `PT activity` below 1280px; full copy stays in `title` + `aria-label`. CT gate: `reporting-program-band.toolbar-layout.cy.ts` (no two controls intersect at 1024/1280/1440).

## Añadido 2026-10-16 (spec `changes/kpi-progress-target-only`, KTO-T-7 / A-1)
- `reportingTargetFilter` (`'all' | 'with' | 'without'`, type `ReportingTargetFilter` in `reporting-burndown.ts`) is an EIGHTH Reporting-toolbar filter, applied in `reportingGroups()` next to Category (`matchRow` = Category AND Target, predicate `hasTarget`). Chips (`reportingTypologyCounts`), cards, split line and ratio read the filtered rows; no new math. It is in `reportingFiltersActive()` and `clearReportingFilters()`; it is URL-mirrored as `?tgt=with|without` (default `all` = no param; invalid values fall back to `all`), written by the same url-mirror effect and restored beside Category's `typ` in `restorePlannedBrowseFromQuery` and the `queryParamMap` subscription (both via `restoreTargetFilter`; the AoW-detail `pendingFilters` path does not carry it). Type and Status are NOT mirrored.
- ⚠️ The card `N KPIs` (`group.count`) stays the unfiltered AoW-own count for Type / Category (KCR-R-10) but FOLLOWS the Target filter: with it on, count = the AoW-own / bucket set under the same predicate.
- Band control: single-select `app-pr-filter-select` beside Status in the Filters popover (grouped mode only; By-AOW compact hides it like Type / Category), plus a `Target:` chip. The in-card Target axis in `reporting-aow-table` is separate and narrows within what this leaves.

## Añadido 2026-10-19 (spec `changes/kpi-progress-capped-average`)
- `buildRatio` now also returns `progressSum` and `percent` = average of `min(achieved ÷ target, 1) × 100` over KPIs with a target (one decimal), no longer `done ÷ total`. Every multi-row % (ring, `aowStats`, ToC map, heatmap) is `averageProgress(Σ progressSum, Σ total)` — never average rounded row %. Overview / hub rows carry optional `percent` + `progressSum`; `overviewAowProgress` sorts by `percent`. The Target sum pill and `reportingTargetSum` are gone; the first chip is `Total # of KPIs`. Server roll-up (`toc-progress-rollup.ts`) applies the same cap + flat weighting.
