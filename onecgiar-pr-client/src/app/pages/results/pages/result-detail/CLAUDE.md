# result-detail

**Verified:** 2026-09-11 · branch qa-development-2026-ss · changes/unsaved-changes-alert `UCA-T-12` (new "Unsaved-changes guard" section documenting `CanComponentDeactivate`, the routing-node fix, and the recurring child-mutation bug class); prior: 2026-09-11 · branch performance-refactor · 624d4a017 (P2-3659: `Next` guarda antes de navegar); prior: 2026-09-04 · qa-development-2026 · 2b7232fff (adds the one-line pointer to the shared `pr-viewport-page` mixin, spec `changes/sp-shell-app-viewport` SAV-T-6; no code change); prior: 2026-09-03 · 6963df5af

## Qué es

La pantalla de un resultado: riel blanco de secciones a la izquierda, formulario de la sección
activa a la derecha y barra de navegación/guardado en el piso. Reemplaza al viejo `panel-menu`
anidado dentro del sidebar oscuro.

## Contrato de layout (lo que más rompe)

La página es una **fila de alto de viewport con dos scrolls independientes**, calcada del mockup
aprobado (`.design-snapshots/PRMS-Reporting.dc.html`, bloque `pageOpen`). El documento **no**
scrollea en esta ruta.

- `:host` → `position: absolute; inset: 0`. **No es cosmético.** Es lo único que consigue una
  altura acotada aquí: la cadena `main.min-h-svh → div.flex-1 → app-results → app-result-detail`
  no sirve, porque `min-height` deja de ser altura definida en cuanto el contenido la supera, y
  entonces `flex-1` reparte 0 de sobrante y el hijo crece con su contenido. Al sacar la página
  del flujo, `main` vuelve a su `min-h-svh` y el slot recibe `100svh - header` de verdad.
- Su bloque contenedor es el `div.relative.min-h-0.flex-1` de `app.component.html:48`. **Si
  alguien le quita ese `relative`**, la página se posiciona contra `main` (que `hlmSidebarInset`
  ya hace `relative`) y tapa el topbar.
- `.rd_scroll` es el scroll del contenido (el `#pg-scroll` del mockup). Header del resultado y
  phase switcher van **dentro**: scrollean con el formulario, igual que en el mockup.
- `.rd_bar_slot` es el piso de la columna, hermano del scroll. Ahí aterriza la bottom bar.
- **Section heading ⓘ (P2-3262):** `.rd_section_head` draws ONE info trigger when the open section
  publishes HTML into `DataControlService.currentResultSectionGuidance` (the publisher must clear it
  on destroy). `.rd_section_title` is `flex: 0 1 auto` so the ⓘ sits by the name, not at the far right.
- **Pointer:** the shared `pr-viewport-page` mixin (`src/styles/_viewport-page.scss`, spec
  `changes/sp-shell-app-viewport`) generalizes this same lock, media-gated ≥ `md`; this page's
  `:host` predates it and stays inlined/unconditional here — no code change.

## Dónde se usa

- `app.component.html:48` — el `relative` del slot existe **para esta página**; es no-op para el resto, que sigue scrolleando el documento.

## Hijos sin archivo propio

| Componente | Qué hace | Trampa |
|---|---|---|
| `components/result-sections-sidebar/` | Riel de 240px: secciones, progreso, AI review, Submit | `h-full`, nunca `sticky`+`max-h-svh`: sticky lo deja del alto de su contenido y la regla derecha muere a media pantalla (se midió en 477px de 842) |
| `components/section-bottom-bar/` | Back / Next / posición / campos faltantes / Save | Se **teletransporta**: ver abajo. `Next` **guarda** desde 2026: ver abajo |
| `components/result-header/` | Título, back-link, PDF, menú, tira (nivel/funding/submitter/AoW; ⓘ metadata). Code, type y status viven en el riel de secciones. La tira usa `pr-skeleton` mientras `currentResult` o el mapping AoW siguen en vuelo | Vive dentro de `.rd_scroll` |

## `Next` guarda la sección antes de navegar (P2-3659, fase 2026+)

Hasta el 11-sep-2026 `Next` era navegación pura, y como el PATCH de cada sección cuelga solo de
`Save draft`, quien llenaba el formulario por el camino natural **perdía todas las secciones menos
la última que guardó a mano** — y el pie decía "Section complete" mientras tanto.

Hoy `goNext()` dispara el `(clickSave)` de la sección y espera el resultado con
`SaveButtonService.saveAndSettle`, que distingue tres finales: `saved` (navega), `failed` (se queda,
con el error en pantalla y lo tecleado intacto) y `not-started` (navega igual — la sección no llegó
a enviar nada: su propia guarda la frenó o abrió un modal de confirmación).

- 🛑 **Gate por AÑO de fase** (`isSectionAutoSaveOnNext2026`), nunca por portafolio: el P25 contiene
  la fase 2025 y escribir sobre una fase cerrada es justo lo que la épica prohíbe. Año desconocido =
  comportamiento viejo.
- 🛑 **El destino se resuelve ANTES de guardar, y eso es estructural.** Guardar recarga el resultado
  (`GET_resultById`), la recarga resetea `currentResultSignal` a `{}` y mientras el portafolio es
  desconocido `ResultSectionsService.sections()` devuelve `[]`. Medido en prtest sobre el 9142: la
  lista pasó de 5 a 0 y `currentIndex` de 0 a -1 en el mismo clic, así que leer el destino después
  del guardado no encontraba nada y `goTo` salía en silencio — guardaba y no avanzaba.
- `Back` y el riel lateral siguen siendo navegación pura: el ticket pedía `Next`.

## La bottom bar se teletransporta (leer antes de tocarla)

Cada sección **declara** su `<app-section-bottom-bar>` porque sólo ella conoce su `(clickSave)`,
`[disabled]` y `[editable]` — y dos de ellas la envuelven en `*ngIf`. Pero tiene que **renderizarse**
como hermana del scroll, a ancho completo de la columna.

Como está declarada dentro de `.section_container` (95%) y `.detail_container` (80px de padding),
es una nieta, y ningún CSS convierte una nieta en flex-item hermano de su abuelo — `sticky` cambia
cuándo pinta un elemento, jamás su bloque contenedor (por eso la barra medía 885px en vez de 1100).

Solución: `SectionBottomBarSlotService` publica el elemento del slot y la barra mueve su propio
nodo host ahí con un `effect` (mismo teleport que hace un portal del CDK). Angular sigue siendo
dueño del componente porque elimina nodos a través del padre **actual**.

- ⚠️ **No conviertas los inputs de la barra en un servicio de signals.** `[disabled]="savingSection"`
  y `[disabled]="this.validateButtonDisabled"` son propiedades planas que cambian sin señal: al
  registrarlas una vez se congelarían.
- ⚠️ El `ngOnDestroy` de la barra hace `remove()` a propósito: sin él, al cambiar de sección la
  saliente y la entrante se apilan un instante en el slot.
- Si no hay slot (IPSR, result creator), la barra se queda donde fue declarada.

## Trampas (⚠️ = ya rompió algo)

- ⚠️ **Un intento anterior de scroll interno se revirtió** por apoyarse en `height: 100%`. No lo
  repitas: el eslabón que falta es la altura definida, no un `height` más en la cadena.
- ⚠️ `.rd_scroll` tiene `overflow-y: auto`, así que **es el bloque de contención de cualquier
  `sticky`** que haya dentro del formulario. Un `sticky bottom-0` aquí dentro se pega al piso del
  scroll, no al del viewport.
- El escaneo de campos obligatorios (`ngDoCheck`) busca por el selector `.section_container`. Si se elimina esa clase del layout, el contador "N fields missing" se queda en cero.
- La card blanca envolvente (`.section_container`) **se queda**. El mockup pone cards por sección
  y el formulario de hoy es plano: quitarla dejaría los campos flotando sobre gris. Su estilo y su
  caja sí se alinearon (regla de 1px + radio 12 sin sombra, ancho completo, 24px de padding), con
  alcance **local** vía `::ng-deep`: `.section_container` y `.detail_container` son clases GLOBALES
  y las usan IPSR y el result creator, que conservan sus 80px y su hueco para el botón flotante.
- ⚠️ Los tres contenedores comparten el mismo padding de columna, **40px**: `.rd_scroll`, el
  `<header>` de `result-header` y la franja interior de la barra inferior. Si mueves uno, mueve los
  tres o la pantalla se desalinea en diagonal.

## Campos reutilizables (alineados el 24-ago-2026, fuera de esta carpeta)

Tocados en `custom-fields/` y `spartan/input/` porque el mockup los define y son compartidos con
IPSR y el result creator. **Validar cualquier cambio ahí con `npm run test:ct`** — `custom-fields/`
está excluido de Jest, su gate son los Cypress CT.

- ⚠️ **`hlmInput` va en px explícitos, no en utilidades rem.** `html` es 12px en esta app, así que
  el `h-9 rounded-md px-2.5 md:text-sm` que traía resolvía a 27px / 4.5px / 7.5px / 10.5px cuando
  el mockup pide 40 / 8 / 12 / 14: un tercio más pequeño, en TODOS los formularios de la app.
- `app-alert-status` acepta `icon`: las notas del asistente van con `auto_awesome` (la estrella),
  no con el ⓘ que elegiría el status. Y su variante `info` es la caja gris del mockup — las de
  severidad conservan su color (ver `docs/DESIGN-DEVIATIONS.md` §12).
- `app-pr-radio-button` acepta `variant="segmented"` para escalas ordinales cortas (los scores
  0/1/2). El dígito sale de parsear `full_name`, que el backend arma como `(id-1) title`.

## Unsaved-changes guard (`docs/specs/changes/unsaved-changes-alert`, `UCA-T-1`..`UCA-T-11`)

Cada sección `rd-*` implementa `CanComponentDeactivate` (`shared/guards/unsaved-changes.types.ts`):
- `hasUnsavedChanges()` compara un snapshot tomado al final del load (y otra vez, directo y
  síncrono, dentro del `tap` de éxito del save — nunca solo vía el reload delegado) contra el
  estado actual, vía `SectionDirtyTrackerService` (component-scoped, un `JSON.stringify` diff).
- `saveSection(): Observable<boolean>` envuelve la llamada de guardado existente de cada sección
  (nunca lógica duplicada — `UCA-DD-3`).
- `UnsavedChangesGuard` (`shared/guards/unsaved-changes.guard.ts`, `providedIn: 'root'`) vive en la
  ruta INTERNA `{path: '', component: X}` de cada sección (su propio `-routing.module.ts`) — **NUNCA**
  en la entrada externa `resultDetailRouting`/`rdResultTypesPages` (`shared/routing/routing-data.ts`),
  que tiene `loadChildren` y ningún `component`: ahí Angular invoca el guard con `component: null`
  y `TypeError`ea en cada navegación. Bug cross-cutting real que rompió 5+ secciones antes de
  corregirse — ver `docs/specs/changes/unsaved-changes-alert/execution.md`, sección "⚠️ Cross-cutting
  correction". Regresión cubierta por
  `rd-general-information/rd-general-information-routing.canDeactivate.spec.ts`, que itera las
  tablas reales `resultDetailRouting`/`rdResultTypesPages`.
- `Back`/`Next` (`section-bottom-bar.component.ts`) guardan en silencio vía
  `UnsavedNavigationIntentService.markSilent()` (flag de un solo uso, seteado justo antes de
  `router.navigate`). Cualquier OTRA navegación (sidebar, browser back, cambio de resultado) abre
  el diálogo Save/Discard (`shared/components/unsaved-changes-dialog/`, sobre `hlm-dialog` — nunca
  `app-pr-dialog`, que no tiene focus trap). `[appBeforeUnloadWarning]` (directiva compartida) cubre
  el cierre/refresh de pestaña.
- ⚠️ **Bug recurrente en TODA esta implementación (5+ ocurrencias, secciones distintas): un hijo
  renderizado por la sección muta el objeto trackeado DESPUÉS del snapshot de carga** (p. ej.
  `app-sub-geoscope` en `rd-geographic-location`, `CPMultipleWPsComponent`/`CPNormalSelectorComponent`
  en `rd-contributors-and-partners`, `IntellectualPropertyRightsComponent`/`StudiesLinkComponent` en
  los `rd-result-types-pages/*`). El fix nunca es "reordenar el snapshot" solo — casi siempre hace
  falta una función `normalize*ForDiff()` que proyecte fuera del diff lo que el hijo decora, aplicada
  simétricamente al snapshot Y al chequeo en vivo. Antes de tocar cualquier sección `rd-*`, revisa
  si renderiza un hijo que escribe en el objeto bound — el patrón "no hay mutación secundaria" se
  ha demostrado falso repetidas veces en este mismo código. Ver `execution.md`'s entradas `UCA-T-7`,
  `UCA-T-9`, `UCA-T-11` para los casos reales y sus fixes.
- **Verificación manual pendiente (`UCA-T-12`)** — los siguientes casos no se pueden probar con
  Jest/jsdom y requieren un browser real con sesión activa (`token` + `user` en localStorage, per
  §9 arriba): el prompt nativo `beforeunload` (dirty vs. clean); el focus trap real del diálogo
  (Tab/Shift+Tab atrapado, Escape resuelve como Discard); el caso de falla de guardado en
  Back/Next (queda en la sección con el error mostrado, no navega). Checklist completo en
  `docs/specs/changes/unsaved-changes-alert/tasks.md` `UCA-T-12`.

## Pendiente (auditado contra el mockup el 24-ago-2026)

- **Falta el chip "From CGSpace"** de la tira de identidad (`#5733c4` sobre `#ede9fe`, radio pill,
  con el handle en JetBrains Mono). No se implementó porque el dato no está: `GET /api/results/:id`
  no devuelve handle ni nada de CGSpace, y la interfaz `Result` solo tiene un `handler` que es
  otra cosa. Hace falta confirmar de dónde sale antes de construirlo.
- ~~**El popover del ⓘ tiene 3 filas en `Coming soon`**~~ → **resuelto en P2-3458** (10-sep-2026,
  decisión del PO). `Origin` se quitó del cuadro: era el Funding Source, que ya sale en la tira de
  identidad. `Created by` y `Center` ahora llegan en `GET /api/results/get/:id` como
  `created_by_name` (join a `users`) y `lead_center` (subconsulta escalar
  `results_center` → `clarisa_center` → `clarisa_institutions`, con
  `is_leading_result = 1 OR is_primary = 1`). **Ya no queda ningún `Coming soon` en el cuadro**: la
  fila sin dato no se pinta. ⚠️ Medido en prtest el 10-sep-2026: los resultados P25 nuevos
  (11607, 11610) tienen centros contribuyentes pero **ninguno marcado como líder**, así que la
  fila `Center` no sale para ellos — es el "en algunos casos" que dijo el PO, no un bug.
  `Portfolio` sigue mostrando el acrónimo (`P25`): el mockup escribe el nombre largo y el payload
  no lo trae, así que inventarlo sería redactar contenido.
- **Falta `sectionName`** en la tira de identidad, entre el nivel y el funding (el mockup lo pone bajo `pg.showSectionName`).
- Cards individuales por sección, como el mockup — sin ticket todavía.
- **Los Impact Area scores siguen siendo 5 bloques sueltos.** El mockup los presenta como UNA tabla
  de cinco filas (nombre + ⓘ a la izquierda, pista a la derecha, regla de 1px entre filas) cerrada
  por el contador `N of 5 impact areas scored`. El control ya es el correcto
  (`variant="segmented"`); lo que falta es la estructura de la sección en `rd-general-information`.
- La bottom bar del mockup no se pudo leer: `DesignSync get_file` corta a 256 KiB y el `.dc.html`
  pesa ~266 KB, así que la cola es inalcanzable. Sus colores se derivaron del par
  primario/secundario que el mockup usa en todos lados (`#6b46e5`→`#5733c4` / `#e3e3e8`+`#2b2838`),
  decisión confirmada por Yeck el 24-ago-2026.
