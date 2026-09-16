# pr-multi-select

**Verified:** 2026-09-16 · performance-refactor · 01891aebd · input `complete` + apertura hacia arriba (P2-3737/P2-3738); prior: 2026-09-14 · branch performance-refactor · hueco `selectedItems`: los chips que pinta el consumidor entran DENTRO del marco de la tarjeta; prior: 2026-09-10 · branch qa-development-2026-ss · c307e5816 (adds `tooltip` input, forwarded to the internal `app-pr-field-header` — spec `changes/info-tooltip-hover-reveal` ITR-T-8, mirrors `pr-select`'s existing pattern); prior: 2026-08-25 · performance-refactor · bc25304fb

## Qué es

El dropdown multi-selección de toda la app: buscador, `select all` opcional, modo plano
(virtual scroll) o **agrupado** (`group=true`), y una tira de chips con los seleccionados.
80 instancias en 34 templates.

## Contrato

- `options` + `optionValue` / `optionLabel` — catálogo. En modo agrupado, además
  `optionGroupLabel` / `optionGroupChildren`.
- `group`, `showSelectAll`, `flagsCode`, `logicalDeletion`, `confirmDeletion`,
  `cannotRemoveOptionValues`, `disableOptions`, `displayLabelFormatter`.
- `tooltip` — string opcional, default `''` (no-op). Forwarded como `[tooltip]` al
  `app-pr-field-header` interno: cuando no está vacío, pinta el ⓘ inline junto al label
  (`PrTooltipDirective`, click/`Enter`/`Space` para fijar, mismo patrón que `pr-select` y
  `pr-yes-or-not`). Ninguna de las ~80 instancias existentes lo usa hoy — es aditivo.
- `selectedItems` — **hueco de proyección** para los chips que pinta el propio consumidor
  (medallas de lead, tooltips de CGSpace, borrados a medida). Antes se declaraban como
  HERMANOS del `app-pr-multi-select`, o sea fuera del marco `fc-boxed`, y la selección
  quedaba huérfana bajo la tarjeta. `rd-contributors-and-partners` usa las dos formas:
  hijo directo con el atributo, y `<ng-container ngProjectAs="[selectedItems]"
  *ngTemplateOutlet>` cuando dos ramas de `@if` comparten la misma tira de chips.
  🛑 `ngProjectAs` no es opcional ahí: el `select` del `ng-content` mira el nodo declarado
  en el sitio de uso (el `ng-container`), no lo que el `ng-template` pinta dentro — sin él
  los chips desaparecen sin un solo error. Candado:
  `pr-multi-select.selected-items-slot.spec.ts`.
  🛑 El hueco es SOLO para chips. El marcador `appFeedbackValidation` de la sección sigue
  siendo hermano del dropdown: anidarlo haría que `mandatoryFieldLabel` reportara la
  etiqueta del desplegable en vez de la suya.
- `complete` — `boolean | null`, default `null` (P2-3738). Sobrescribe lo que la tarjeta llama
  "lleno": con `null` sigue siendo `hasSelection`. Úsalo cuando el campo pide MÁS que elegir algo
  y el contador de faltantes lo juzga con otra regla: hoy `rd-contributors-and-partners`
  (centros: el centinela "Other(s)" no cuenta) y su `normal-selector` (cada partner necesita rol).
  🛑 Sin él, la tarjeta se pinta verde mientras "N fields missing" sigue nombrando el campo.
- **Se abre hacia arriba cuando no cabe abajo** (P2-3737, `../dropdown-placement.ts`, compartido con
  `pr-select` en modo en línea). Se decide al PRESIONAR el campo (`pointerdown` nativo, fuera de la
  zona de Angular, medido un frame después); una presión dentro del panel abierto no lo recalcula,
  para que la lista no salte bajo el puntero. Clase `options_up` puesta en el nodo, sin estado.
  ⚠️ **No uses `focusin`** (ni binding ni listener nativo, ni siquiera vacío): medido el 16-sep-2026,
  cualquier listener de `focusin` en este host pone 3 rojos NUEVOS en `pr-multi-select.contract.cy.ts`
  (reasignación del modelo, opciones tardías, modelo antes que opciones). Con `pointerdown` el archivo
  queda en sus 9 rojos conocidos. Coste aceptado: abrir con Tab no voltea el panel.
  El piso es el borde del scroll MENOS su `padding-bottom`: `.rd_scroll` y `.bcr-scroll` reservan
  ahí la zona de la barra inferior flotante.
- Gates de render: `readOnly` · `RolesService.readOnly` (global, **default TRUE**) ·
  `isStatic` (fuerza el control aunque sea read-only) · `hideSelect`.
- `required` — **default `true`**. Ver la trampa ⚠️ #1: hoy es casi inerte.
- Es `ControlValueAccessor`: valor por `ngModel` / `writeValue`. `writeValue` conserva la
  **referencia** del array cuando todas las entradas ya son objetos, porque varios padres
  mutan el modelo in place (`splice`) y eso jamás dispara `writeValue`.
- Outputs: `selectOptionEvent` · `removeOptionEvent`.

## Trampas (⚠️ = ya rompió algo)

### ⚠️ 1. NO emite `.pr-field.mandatory` — es invisible para el contador de campos faltantes

`DataControlService.someMandatoryFieldIncompleteResultDetail()`
(`shared/services/data-control.service.ts:224-264`) arma la lista "N fields missing" barriendo
el DOM del contenedor con **dos selectores CSS y nada más**:

- `.pr-input.mandatory .input-validation` → incompleto si el nodo no tiene texto.
- `.pr-field.mandatory` → incompleto si **no** tiene también la clase `complete`.

El nombre que se muestra sale de `mandatoryFieldLabel()` (`:293`): sube desde el nodo hasta el
primer host de `LABELLED_FIELD_HOSTS` (`:275-282`, incluye `app-pr-multi-select`) y busca
`.pr_label` o `.fch_title`; si no encuentra, **sigue subiendo hasta 4 ancestros** y puede tomar
prestada la etiqueta de un `app-pr-field-header` vecino.

Este componente **no pinta ninguno de los dos marcadores**. Consecuencia: un multi-select
obligatorio y vacío nunca aparece en el contador ni en la caja de alertas. Contenedores que
barren: `.section_container` (result-detail, IPSR detail/creator), `.local_container`
(result-creator), `.report_container` (report-result-form).

**Parche vigente = reporter externo, no el componente.** Un `<div appFeedbackValidation
labelText="…" [isComplete]="…">` hermano (directiva en `shared/directives/`) inyecta a mano el
`.pr-field.mandatory` + `.pr_label`. Se usa en `geoscope-management.component.html:45` y `:75`,
`sub-geoscope.component.html:2`, `cap-dev-info.component.html:98`,
`step-n1-eoi-outcomes.component.html:3`, `step-n1-institutions.component.html:7`.

🛑 **No “arregles” esto haciendo que el componente emita el marcador por su cuenta.** Se midió el
25-ago-2026 y es inseguro hoy:

- **46 de 80 instancias quedan `required`** (11 con `[required]="true"`, 35 por el default).
- **23 de esas 46 no pasan `label`**, y `app-pr-field-header` no pinta nada sin label
  (`pr-field-header.component.html:3`) → hoy su `required` es puramente inerte.
- **Falsos positivos verificados en Theory of Change (9 instancias):**
  `impact-area-targets.component.html:1` pone el asterisco en `[required]="impactAreaRequid"` y
  `sdg-targets.component.html:1` en `[required]="sdgRequid"`, mientras sus multi-selects usan el
  default `true`; `action-area-outcome.component.html:1` ni siquiera es required. Si el componente
  reporta, la sección **nunca se pone verde** aunque el mapeo sea opcional — y el fallback de 4
  saltos de `mandatoryFieldLabel()` les presta el label del header, así que salen con nombre
  ("Mapping to Impact Area targets is missing") y parecen legítimos.
- **Doble conteo en 6 instancias** que ya tienen su reporter externo (las listadas arriba):
  el mismo campo se contaría dos veces y saldría duplicado en la lista.

Si algún día se hace: hay que quitar primero los 6 reporters externos y poner `[required]="false"`
explícito en las 23 instancias sin label. No cabe en un cambio dentro de esta carpeta.

**Dirección del riesgo**: hoy el bug es *permisivo* — los tres call sites descartan el booleano de
retorno y solo leen la signal `fieldFeedbackList`, así que sub-contar **no bloquea Save**; el
gate real de envío son las funciones MySQL `validation_<sección>_<portafolio>`. Sobre-contar sí
deja la sección en rojo permanente. Por eso el under-count se tolera y el over-count no.

### ⚠️ 2. `optionsIntance()` corre en cada ciclo de detección y compara por CONTENIDO

Varios padres bindean `[options]` a una llamada de método
(`[options]="filterImpactAreaIndicatorsByImpactAreaID(1)"`) → array nuevo en cada pase.
Reconstruir los clones por identidad hacía que `*ngFor` recreara vistas sin converger y el
`synchronize()` de Angular 21 congelaba la pestaña (IPSR › Contributors). `sameOptionSet()`
compara valor+label y mantiene los clones estables. **No lo cambies a comparación por referencia.**

### ⚠️ 3. Los clones son solo del modo plano

`group=true` decora los hijos **in place** vía `syncSelectionFlags()`, porque el template agrupado
itera el array original del padre. Modo plano nunca muta `options()` del padre.

### 4. El contrato Cypress ya está en rojo a propósito

`pr-multi-select.contract.cy.ts:133` llama a `sharedFieldContracts()`
(`cypress/support/ct-utils.ts:125`), que afirma `.pr-field.mandatory` / `.complete`. Falla hoy y
**el rojo es el entregable**, no un descuido: documenta la trampa #1.

## Dónde se usa

34 templates. Los que importan por el barrido de campos faltantes:
`rd-contributors-and-partners` · `rd-partners` · `cap-dev-info` · `policy-change-info` ·
`rd-theory-of-change/*` · `geoscope-management` (+ `sub-geoscope`) · IPSR `step-n1-*` /
`ipsr-contributors*` / `ipsr-geoscope-creator`. Fuera del barrido (hoy sin efecto):
`pages/bilateral/*`, `result-framework-reporting/*`, `init-admin-section`,
`global-completeness-status`.

## Hijos sin archivo propio

| Componente | Qué hace | Trampa |
|---|---|---|
| `pipes/list-filter-by-text-and-attr` | filtra por texto sobre un atributo | lo usa `pr-select`, no este template (aquí el filtro está inline en `filterFlatOptions`) |

## Pendiente

- Emitir el marcador de obligatoriedad desde el componente: **bloqueado** por lo de arriba.
  Requiere limpiar los 6 reporters externos y declarar `[required]="false"` en las 23
  instancias sin label. Fuera del alcance de esta carpeta.
