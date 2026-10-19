# reporting-aow-table

**Verified:** 2026-10-19 · JuankCadavid/pt-badge-texts (badge copy `PT · N evidence item(s)`, short `PT · N` <640px, fixed tooltip) · prior: 2026-10-16 · qa-development-2026-ss · changes/reporting-dynamic-kpi-target-counts DKT-T-1 (header count + target sum) · prior: changes/kpi-progress-target-only (KTO-T-3/T-4/T-6/T-7: has-a-target rule, split line, Target axis first; file cut to the 120-line cap) · prior: 2026-10-14 · JuankCadavid/pt-center-mapping (`ptActivity` input + `PT · N` badge) · prior: 2026-10-13 · qa-development-2026-ss · quick/aow-row-remove-outcomes-figures (P2-3955: AoW header outcomes achievement block + its `rowTitle` text removed — see the 🗑️ bullet in Trampas) · prior: 2026-10-02 · bugfix/achieved-counts-submitted ACS-T-4 (hides the QA/Prel pair behind `showQaPrelSplit`) · prior: 2026-09-21 · qa-development-2026-ss · 118716bc7 · prior: 2026-09-09 · feat/P2-3336-io-without-aow (nota Intermediate + `RES-R-3` retirado; "Centros de un target compartido") · prior: 2026-09-04 · qa-development-2026-ss · merge of origin/performance-refactor 85fdfc8c3 into 9b9c032ba (RTA-T-1 superseded by the tabular redesign)

## Qué es
El cuerpo de la pestaña **Reporting** del shell de Science Program: tarjetas colapsables por Area of
Work (más las dos de programa, `Intermediate` y `2030`) y, en `All indicators`, la tabla plana
ordenable. **Presentación pura** — no hace fetch, no inyecta ningún servicio.

## Jerarquía visual (3 niveles card-in-card)
AoW outer card (`section.rounded-2xl`) → HLO sub-card (píldora `HLO 1.1` / `OC 1.2` / `I-OC 3.5`, micro-KPIs) →
indicadores con sangría (`pl-4 sm:pl-6`, `border-l-4`, sub-cabecera `h-7`). Cada fila `.pr-reporting-row` lleva franja
de estado `border-l-[3px]` y botones con aislamiento de eventos.

## Contrato
- Inputs: `groups` (requerido), `search`, `statusFilter`, `filtersActive`, `viewMode` (`'grouped' | 'flat'`), `canReport`,
  `expandAll`, `expandAllNonce`, `scopeKey`, `lastReported` (KPI recién reportado; enciende "Next pending"),
  `favoriteKeys` (`ReadonlySet<string>`, claves `rowKey`), `favoritesOnly` (solo copy del empty state),
  `ptActivity` (`PtActivityIndex | null`; `null` = sin badge).
- Outputs: `openRow`, `reportRow`, `openTarget`, `openAchieved`, `openAow`, `allOpenChange`, `clearFilters`, `copyLink`,
  `toggleFavorite`, `exitFavoritesOnly`.
- ⚠️ **Aislamiento de eventos (Kaizen `KZ-changes--reporting-aow-jira-hierarchy-2`):** todo botón dentro de la fila (★,
  `.pr-row-action`, `Copy link`, `Target`, `Achieved`, `⋯`) DEBE invocar `emitAndStop` (`stopPropagation`) o dispara `openRow`.
- **Sin servicios, ni para favoritos (RFI-R-1.4):** el host es dueño del store; nunca inyectes `ReportingFavoritesService`.
- Estado propio solo: disclosure (`overrides`), títulos expandidos, overlay abierto (`openMenuKey`, `openInfoKey`) y los
  filtros locales por tarjeta. Endpoint: ninguno; las filas llegan de `dashboard-lab.reportingGroups()`.
- `toc_indicator_target_id` (RRC-R-10) viaja en la fila al payload de create; aquí es inerte.

## Regla "has a target" y cabecera (spec `changes/kpi-progress-target-only`, 2026-10-16)
- `hasUsableTarget(row)` **delega** en `hasTarget` de `../../reporting-burndown` (KTO-DD-1/DD-2): Progress de la fila,
  orden de la tabla plana y ratio de cabecera nunca discrepan en "tiene target". El ratio cuenta **solo** KPIs con target;
  uno sin target no entra al denominador y muestra la palabra (`No target set` / `Overachieved`), nunca un %. Ya no existe
  la regla vieja "solo `target = 0 AND achieved = 0` queda fuera": todo KPI sin target queda fuera, haya o no reporte.
- `ratioOf(group)` devuelve `{ done, total, percent, empty }`; `empty` = ningún KPI con target → cabecera `—` (`role="img"`,
  `aria-label="No KPIs with a target"`), sin nodo `%`, barra en 0. Nunca `0 of 0` / `NaN`.
- `splitOf(group)` devuelve `{ withTarget, without, line }`; `line` es `''` si `without = 0` (no se pinta nada).
- 🛑 **Ratio y split salen SOLO de `buildRatio(ratioBase(group))`** y nunca se mueven con filtros de la tarjeta (Only-pending,
  Centers, Types, Target, buscador). No recalcules la regla aquí: `aow-hlo-table`, `program-overview` y el banner By-AOW
  (`buildAowBannerStats`) leen las mismas derivaciones. No toques `statusOf` / `progressOf` / `figure`.
- **Cabecera `N KPIs · S targets` (DKT-R-1/R-2):** `headerCount(group)` = `ratioBase(group).length`; `headerTargets(group)` = `sumTargetValues(ratioBase)` (`reporting-burndown`). Misma base que ratio y split: Only pending / Favorites / PT / búsqueda ya no la encogen. Cargando sin filas: cae a `group.count` y no pinta la suma. `group.count` del host no se toca.
- **Reported** = `achieved > 0`, no **Complete** = `achieved >= target`; no los confundas.
- ⚠️ `ratioBase` prefiere `__allIndicators` (side-channel que escribe `applyBurndownFilterAndSort` con Only-pending ON); sin
  eso la cabecera se movería al tocar el toggle. Tampoco cuenta sobre `group.indicators` a secas.
- **Split line** (solo si `split.line` y no `group.loading`): `aow-split-line` en la zona izquierda con
  `max-[640px]:hidden`, y `aow-split-line-mobile` con `min-[640px]:hidden basis-full` (fila propia bajo el header; a 375px la
  zona izquierda mide ~40px y la línea se partía palabra por palabra). Exactamente una copia visible a cualquier ancho.
- `achievementTooltip()` y `ratioTitle` ("excludes N KPIs with no target set") dicen la regla nueva; no restaures
  "counts every planned KPI".
- `—` vs `0`: `—` = nunca se reportó, `0` = se reportó cero. No los unifiques.

## Eje Target dentro de la tarjeta (KTO-R-7)
- `localTargetFilter` por `groupKey` (`All` = sin clave), `setTargetFilter` (re-pulsar limpia), `targetCountsOf`,
  `hasMixedTargets` (la barra se pinta si centros > 1, tipos > 1 o targets mezclados). Solo **recorta las filas listadas**.
- **Decisión de usuario "Target primero" (2026-10-15):** la sección Target va **primera** en la barra, con
  `shrink-0 max-[640px]:hidden`; bajo 640px vive en el popover **Filter** (`min-[640px]:hidden`, chips de 44px). Centers y
  Types siguen desbordando al popover. Con Target al final, a 1280px y 9 centros quedaba recortada e inalcanzable.
- El filtro global de la toolbar (`?tgt=`, del host) **estrecha las filas que llegan a esta tabla**; el eje local trabaja
  dentro de lo que quede. Son independientes (ver `dashboard-lab/CLAUDE.md`).
- Reset del popover y `Clear filters` del empty state también limpian el eje.

## Badge `PT · N` (Progress Tracker)
- Chip en ambos layouts (`data-testid="pt-activity-badge"`) solo si `ptCountOf(row) > 0`. `centerAcronymsOf` delega en
  `pt-activity.ts` (`centerAcronymsOfRow`): chips, filtro por centro y badge coinciden; cambia la regla allí.
- Copy desde `pt-activity.ts`: `ptActivityLabel` (`PT · 2 evidence items` / singular) ≥640px, `ptActivityShortLabel` (`PT · 2`) debajo; tooltip fijo `PT_ACTIVITY_TOOLTIP` (no lleva la cifra) vía `prTooltip`, sin `title` nativo (doble tooltip).

## QA/Prel oculto tras `showQaPrelSplit` (ACS-R-5, `bugfix/achieved-counts-submitted`)
- `showQaPrelSplit = SHOW_QA_PREL_SPLIT` (`shared/constants/achieved-display-basis.ts`, default `false`). Cada par
  `@if (showQaPrelSplit) … @else …` deja una sola cifra "Achieved"; el markup de dos pistas se conserva dentro del `@if`.
  `achievementTooltip()` / `progressTracksTooltip()` ramifican igual (ACS-S-9). Un `>QA<` / `>Prel.<` visible debe estar
  dentro de un `@if (showQaPrelSplit)`.
- Los campos ya llegan en base unión (`toDisplayBasis` en `ResultsApiService`); los originales QA viven en `qa_*`.

## Disclosure (P2-3251 / P2-3252)
- **Las tarjetas llegan COLAPSADAS** (`isDefaultOpenAow()` = `expandAll()`, `false` por defecto en el host; el seed del host
  se documenta en `dashboard-lab/CLAUDE.md`). Los subgrupos arrancan abiertos.
- ⚠️ Overrides con clave `scopeKey` + `expandAll` + `expandAllNonce`: `AOW01` existe en cada programa (sin `scopeKey` se
  filtraba al siguiente) y sin nonce un "Expand all" tras abrir a mano no hace nada.
- ⚠️ **El panel colapsado sigue montado** (`.pr-collapse` sin `.is-open` + `aria-hidden`); los tests que cuentan filas
  scopean a `.pr-collapse.is-open`. `.pr-collapse` vive en `src/styles/collapse.scss` (no re-añadas copia local); esta
  tarjeta no usa `inert` (brecha conocida; la del hero de `program-overview` sí).

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **Par de breakpoints:** Tailwind v4 `max-[N]` = ancho **< N** (exclusivo), así que SIEMPRE se empareja con `min-[N]` del
  **mismo N**. `max-[639px]` + `min-[640px]` mostró ambas copias (línea / Target) a 639px (KTO-T-6, L-3). Aplica a la split
  line, al eje Target y a "By AOW".
- ⚠️ **"By AOW" colapsa a solo-icono bajo 900px** (`max-[900px]:w-[30px]` + `title`); el `aria-label` es INCONDICIONAL. Ya
  desbordó la página 48px a 768px.
- 🗑️ **El bloque de achievement del header de AoW ya NO existe** (P2-3955): se fueron `achievementCoverage()`,
  `isAchievementLoading()` y su texto en `rowTitle()`. El de **HLO** sigue vivo. No lo reintroduzcas sin pedido de producto.
- ⚠️ **`filtersActive` no se deduce aquí:** Section / Type / Category / Target globales los aplica el host. Sin el input, el
  empty state afirma "no planned indicators yet" sobre una tarjeta vaciada por filtro (P2-3405).
- ⚠️ **La tarjeta NO lleva `overflow-hidden`** (recortaba el popover ⓘ a 6px); el clip lo hace `.pr-collapse-inner`.
- ⚠️ **`app-pr-table` trae el skin OSCURO:** `.pr-flat-head .pr-flat-cell` / `.pr-flat-body .pr-flat-cell` re-declaran
  `background` / `border` / `padding`. El gutter vive en las pistas 1 y 10 del grid. No pongas un segundo scroller.
- ⚠️ **`app-pr-table` ordena con `<`/`>` crudo:** `flatTableRows()` precalcula `__sortTarget` / `__sortAchieved` /
  `__sortStatus` / `__sortProgress` (`target_value_sum` llega STRING: `"9" > "100"`). "Nada reportado" = `-Infinity`.
- ⚠️ **RTA-T-1 (sticky pins) quedó superseded** por el rediseño tabular; si reaparece el clipping bajo ~1000px, re-deriva
  contra este grid, no restaures las reglas viejas.
- **Next pending (MRF-R-3.1/R-5):** recorre `orderedVisibleRows()` (orden en pantalla), salta reportados y filas sin target
  (`pendingOf`), abre tarjeta+subgrupo por `rowKey` (las bandas bucket CLONAN filas), scrollea a los 320ms (la animación
  dura 280ms) y resalta ~2.6s. Columna de acción: 140px agrupada / 184px flat.
- `⋯` es local: `openAchieved` / `openTarget` / `copyLink`. `Copy indicator code` va deshabilitado (P2-3405); `Copy link`
  también en Intermediate / 2030 (`canCopyLink(row)` duplica los sentinel del host para evitar import circular).
- Si editas la celda de acciones flat, parte del working tree, no de una copia vieja (ya perdió controles una vez).

## Centros de un target compartido (2026-09-09)
- Un target de N centros es UNA fila con `center_acronym` escalar `null`. `centerAcronymsOf(row)` lee `row.centers[]` y cae al
  escalar; lo consumen chips, `centerCountsOf`, filtro `selCenter`, buscador y `__centerLabel`.
- ⚠️ Una fila compartida cuenta en el chip de **cada** centro (decisión del dueño): la suma de chips puede superar el total.
- `rowCentersShown` muestra 3 chips + `+N more` (con ≤ 4 muestra todos) y **pinea** el centro filtrado.

## Intermediate Outcomes (P2-3336)
- La tarjeta `kind: 'intermediate'` lleva la nota *"These Intermediate Outcomes are not assigned to any AoW."*
  (`isIntermediateBucket`, no `isBucket()`). El tooltip del Target solo lee `isIntermediateRow(bucketKind)` (`RES-R-1`);
  `isCrossCuttingIntermediate` sigue vivo para la píldora `IO`. El filtro cross-cut vive en el host.

## Pendiente
- Cuerpo del popover ⓘ y columna `Parent` → P2-3405. Recordar qué AoW dejó abierto el usuario: no construido (necesita ticket).
- Pre-existente: a 375px el chip de código del AoW se superpone a la barra de progreso (no es de KTO).
