# pr-multi-select

**Verified:** 2026-08-25 · branch performance-refactor · bc25304fb

## Qué es

El dropdown multi-selección de toda la app: buscador, `select all` opcional, modo plano
(virtual scroll) o **agrupado** (`group=true`), y una tira de chips con los seleccionados.
80 instancias en 34 templates.

## Contrato

- `options` + `optionValue` / `optionLabel` — catálogo. En modo agrupado, además
  `optionGroupLabel` / `optionGroupChildren`.
- `group`, `showSelectAll`, `flagsCode`, `logicalDeletion`, `confirmDeletion`,
  `cannotRemoveOptionValues`, `disableOptions`, `displayLabelFormatter`.
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
