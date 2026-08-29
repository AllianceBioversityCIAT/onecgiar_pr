# rd-contributors-and-partners

**Verified:** 2026-08-29 · branch qa-development-2026-ss · 64d072490 (TOC-C-T-1, TOC-C-T-2, TOC-C-T-3, TOC-SP-T-2, TOC-SP-T-3)

## Qué es
Sección 2 del detalle de resultado. Programas científicos contribuyentes, centros CGIAR, socios
externos, proyectos bilaterales/W3, y la pregunta de resultado enlazado/agrupado.

## Contrato
- `RdContributorsAndPartnersService.partnersBody` = **fuente de verdad** del formulario entero.
  El componente no guarda estado propio de datos; solo computeds de presentación.
- Endpoints vía `ResultsApiService`: `GET_ContributorsPartners`, `GET_ClarisaProjects`,
  `GET_W3BilateralProjects`, `GET_W3BilateralProjectsByProgram`.
- `FieldsManagerService` inyectado como `fieldsManagerSE`: labels, `hide` y `required` por
  `fieldRef`. Se combinan con computeds locales — ver la trampa de los dos caminos.

## Dónde se usa
- Ruta `result/result-detail/:id/contributor-partners?phase=<id>`. La URL con
  `/contributors-and-partners` **no** existe: redirige a `general-information`.

## Trampas (⚠️ = ya rompió algo)

- ⚠️ **`isCP2026()` y `isP22()` NO son complementarios.** `isCP2026` = `phase_year >= 2026`
  (`fields-manager.service.ts:26`); `isP22` = **portafolio**, no año (`:20`). En prtest hay
  resultados de **fase 2025 dentro del portafolio P25**, así que para ellos ambos dan `false`:
  un campo con `hide: isP22()` **se muestra** ahí, aunque el ticket lo describa como "2026-only".
  Verificado en navegador el 25-ago-2026 con el resultado 5895 (Innovation use, fase 2025 · P25).
  🛑 No asumir "gated por `hide: isP22()`" = "no lo ve nadie antes de 2026". Compruébalo.

- ⚠️ **La pregunta enlazado/agrupado se renderiza por DOS caminos distintos** en el mismo
  template, y ahí fue donde los textos se separaron (P2-3358):
  - `html:442` — tipos **2** (Innovation use) y **7** (Innovation development): `fieldRef=`
    `"[innovation-use-form]-has-innovation-link"` → label desde `fields-manager.service.ts:182`.
  - `html:455` — **el resto** de tipologías: `[label]="linkedResultQuestionLabel"` desde el
    componente (`:234`), y solo bajo `isCP2026()`.
  Cambiar uno y no el otro deja la mitad de las tipologías con el texto viejo. Si tocas la
  frase, tócala en los dos sitios **y** en los dos specs.
  No se unificaron a una sola fuente a propósito: el camino B no lleva `fieldRef`, así que
  adoptarlo le añadiría `hide: isP22()`, y por la trampa de arriba eso **sí** cambia
  comportamiento para las siete tipologías que sirve (decisión D1 del change
  `openspec/changes/p2-3358-single-linked-result-question/design.md`).

- ⚠️ **"Lead center" ahora sale SIEMPRE del catálogo CLARISA completo — ya no depende de
  Contributing CGIAR Centers (docs/specs/bugfix/lead-center-full-catalog, LC-DD-1).**
  `setPossibleLeadCenters` (`service.ts:537`) hacía `centersSE.centersList.filter(...)` contra
  `partnersBody.contributing_center` **∪** `otherCentersSelected`, y solo recalculaba cuando uno de
  los dos tenía contenido (`?.length > -1 || ?.length > 0`). Cuando la ToC no trae centros
  (P2-2998 AC4) y tampoco se añadió ninguno a mano, esa guarda es `false` y `possibleLeadCenters`
  se quedaba en su `[]` inicial — el campo **obligatorio** "Lead center" salía vacío ("There are no
  items available for this list") y bloqueaba el guardado sin ningún camino de salida.
  Arreglo: `possibleLeadCenters` ahora es incondicionalmente
  `centersSE.centersList.map(c => ({ ...c, selected: false, disabled: false }))` — sin guarda, sin
  `.filter`. Contributing Centers ya no filtra qué aparece en el desplegable, solo qué está
  pre-seleccionado/relevante para otras reglas.
  🛑 **Consecuencia (LC-DD-2):** `possibleLeadCenters.length` dejó de servir como proxy de "hay
  exactamente un Contributing Center seleccionado" (ahora mide el tamaño del catálogo completo, no
  la selección). El auto-assign de un único centro (`tryAutoAssignLeadCenter`, `service.ts:588`) se
  reubicó sobre `getContributingCentersUnion()` — la unión deduplicada por `code` de
  `partnersBody.contributing_center` y `otherCentersSelected` — en vez de leer `possibleLeadCenters`.
  Si añades un tercer origen de centros contribuyentes, engánchalo a esa unión (no a
  `possibleLeadCenters`).
  La nota vacía "Please select at least one contributing center to choose a lead center" era la
  consecuencia visible en el template — ya no aplica (era alcanzable exactamente en el mismo caso
  que dejaba `possibleLeadCenters` vacío) y se removió (markup + condición `@if
  (!possibleLeadCenters?.length)`) en `LC-T-2`, junto con las pruebas de renderizado que lo
  cubren (`rd-contributors-and-partners.component.spec.ts`, describe `LC-T-2`). La propiedad
  `noLeadCentersNote` en el componente quedó sin usar en el template a propósito — fuera de
  alcance de `LC-T-2` (no listada en sus "Files (expected)"); un test (`onOtherCenterSelect`)
  sigue verificando su contenido como texto, no como render.

- ⚠️ **`LC-DD-1` decoupló el dropdown de Lead center de Contributing Centers, pero NO el contrato
  de guardado — eso dejaba un centro elegido sin persistir (`LC-GAP-1`, resuelto en `LC-T-4`).**
  `onSaveSection` (`component.ts:407-459`) solo marca `is_leading_result = true` en filas que ya
  están dentro de `contributing_center` / `otherCentersSelected`, y `setLeadCenterOnLoad`
  (`service.ts:648-659`) solo busca esa bandera ahí mismo. Elegir un Lead center que NO es un
  Contributing Center (posible desde `LC-T-1`) nunca entraba al payload de guardado — ninguna fila
  quedaba con `is_leading_result = true`, y al recargar `leadCenterCode` volvía a `null` ("el
  centro desaparece al guardar").
  Arreglo (`LC-DD-4`): `RdContributorsAndPartnersService.onLeadCenterSelected(code)`, cableado al
  `(selectOptionEvent)` del `app-pr-select` de Lead center (`html:443`, junto al `[(ngModel)]`
  existente) — el evento emite el objeto opción completo o `null` al limpiar, por eso el template
  extrae `$event?.code ?? null` antes de llamar al método. Lógica (unión = `getContributingCentersUnion()`,
  ya existente de `LC-DD-2`):
  1. **Trigger:** `union.length === 0` → busca el `CenterDto` completo por `code` en
     `centersSE.centersList`, lo agrega a `otherCentersSelected`, marca
     `_autoAddedLeadCenterCode = code` y llama `setPossibleLeadCenters(true)`. Si `code` es falsy o
     no está en el catálogo, no hace nada (skip silencioso).
  2. **Swap:** `union.length === 1 && union[0].code === _autoAddedLeadCenterCode && union[0].code !== code`
     → quita esa única entrada de `otherCentersSelected` y repite el paso 1 para el `code` nuevo
     (si el nuevo `code` es falsy — el usuario limpió con `[showClear]` — solo queda la remoción,
     sin agregar nada).
  3. **No-op:** cualquier otra forma de la unión (2+ centros, o 1 centro que NO es el auto-agregado
     — un ToC/manual real) → no toca Contributing Centers; el cambio de `leadCenterCode` sigue
     ocurriendo solo por el `[(ngModel)]` existente (`LC-R-13`).
  `_autoAddedLeadCenterCode` es estado de sesión, no persistido — se resetea en `resetState()` y,
  tras un guardado + recarga, un centro auto-agregado es indistinguible de cualquier otro
  Contributing Center real (misma fila `results_center`); a partir de ahí, cambiar el Lead center
  cae en el caso "no-op" y el usuario debe quitarlo a mano con el flujo existente de "Other(s)" si
  ya no lo quiere.
  🛑 **`deleteOtherCenter` (`component.ts:211-224`) también limpia `_autoAddedLeadCenterCode`**
  (expuesto vía getter/setter público `autoAddedLeadCenterCode`, patrón igual a
  `updatingLeadData`) cuando el centro borrado a mano es el que fue auto-agregado — si no, una
  referencia obsoleta podría disparar el swap contra un centro que ya no existe.

- ⚠️ **`LC-DD-4` siempre apuntaba a `otherCentersSelected`; en el resultado 8952 (unmapped,
  `planned_result: false`) eso producía un segundo campo "Contributing CGIAR Centers:" con la
  MISMA etiqueta que el dropdown plano (`LC-DD-5`, generaliza el trigger y corrige el
  target-field).** `onLeadCenterSelected(code)` (`service.ts`) ahora:
  1. **Trigger generalizado (`LC-R-14`):** dispara siempre que `code` NO esté ya en
     `getContributingCentersUnion()` — sin importar el tamaño de la unión (ya no exige "solo si
     está vacía"; esa restricción era de `LC-DD-4` y quedó superada).
  2. **Target por UI activa (`LC-R-15`):** `isUnmappedOrFlat()` = `!isContributorsPartners2026()
     || result_toc_result?.planned_result === false`. Si es `true` (UI plana, un solo dropdown
     atado directo a `contributing_center`) → agrega ahí mismo, sin sentinel. Si es `false`
     (CP2026 + mapeado a ToC, dropdown dividido ToC/Other(s)) → agrega a `otherCentersSelected` y,
     si el sentinel `OTHER_CENTERS_CODE` no está ya en `contributing_center`, lo agrega también
     (vía `buildOtherCentersSentinel()`) y marca `_autoAddedSentinel = true` — **solo** cuando este
     mecanismo fue quien lo puso; si el usuario ya lo había marcado a mano, `_autoAddedSentinel`
     se queda en `false` y ese sentinel nunca se borra automáticamente.
  3. **Swap solo de la entrada auto-agregada (`LC-R-16`):** al cambiar de Lead center, quita
     `_autoAddedLeadCenterCode` de donde viva (filtra por código en `contributing_center` Y
     `otherCentersSelected` — idempotente, solo vive en uno). Si esa remoción deja
     `otherCentersSelected` vacío Y `_autoAddedSentinel` es `true`, también quita el sentinel de
     `contributing_center` y resetea la bandera. Luego repite el paso 2 para el nuevo `code`.
  4. **No-op (`LC-R-17`):** si `code` ya está en la unión (ToC-derivado, manual, o el propio
     auto-agregado re-seleccionado) → no toca nada.
  `_autoAddedSentinel` se resetea en `resetState()` igual que `_autoAddedLeadCenterCode`.
  🛑 **Consecuencia:** un centro auto-agregado en la UI plana se guarda con `from_toc: true` en
  `onSaveSection` (mismo camino de payload CP2026 que no distingue "ToC genuino" de "selección UI
  plana") — preexistente, inofensivo porque la rama plana del template nunca lee `from_toc`, y
  `applyTocMappingOnLoad` lo vuelve a clasificar como ToC en la siguiente carga.

- ⚠️ **`applyTocMappingOnLoad` (`service.ts:438-462`) tenía un bug preexistente (no introducido
  por este spec, corregido en `LC-DD-5`): re-agregaba el sentinel `OTHER_CENTERS_CODE` siempre que
  `otherCenters.length > 0`, sin importar si existían centros ToC reales (`tocCenters`).** El
  sentinel solo tiene sentido para forzar la vista dividida cuando hay AMBOS: centros ToC reales
  Y centros "Other(s)". Cuando `tocCenters.length === 0`, el segundo dropdown ya se auto-activa
  solo vía `!hasReferenceCenters()` en el template — re-agregar el sentinel ahí solo dejaba un chip
  "Other(s)" huérfano sin dropdown 1 al que pertenecer razonablemente. Arreglo: el sentinel solo se
  agrega cuando `tocCenters.length > 0 && otherCenters.length > 0`; si `tocCenters.length === 0`,
  `contributing_center` queda en `[]` (sin sentinel) sin importar cuántos `otherCenters` haya.
  `otherCentersSelected` se sigue poblando siempre con `otherCenters`, en los dos casos.

- ⚠️ **The 2026 help text under the ToC question is owned by P2-3142 — do not "restore" the old one.**
  A newer P/A-funding + "Reflect & Adapt" paragraph had replaced the wording the ticket asks for. The PO
  (Ángel) was asked which one wins and answered **"A" — the ticket's wording** (P2-3142 comment,
  27 Aug 2026), so the Reflect & Adapt paragraph was overwritten on purpose. The live 2026 string is the
  ticket's literal text (`component.ts:116`); the only intentional deviations are `ToC` instead of the
  ticket's `TOC` (matches the question label right above it) and dropping the ticket's stray trailing `'`.
  The pre-2026 branch (`:117`) is a different string and must stay untouched.

- La pregunta **no aparece en el PDF**. El "View PDF" pega contra
  `GET /api/platform-report/result/:id`, que devuelve un JSON con una URL de S3; el PDF real
  no contiene ninguna variante de la frase (verificado con `pdftotext` el 25-ago-2026). El texto
  tampoco existe en `onecgiar-pr-server`.

- El escaneo de "N fields missing" del piso depende de la clase global `.section_container`
  — ver [`../../CLAUDE.md`](../../CLAUDE.md).

- ⚠️ **Contributing Science Program now has a minimum-count guard (2026-08-29,
  `docs/specs/changes/toc-science-program-guard`, `TOC-SP-DD-1`/`TOC-SP-DD-2`).** `deleteScience` /
  `deleteOtherScience` (`component.ts`) used to unconditionally filter-and-reassign — a user could
  empty every Contributing Science Program even when the linked ToC had planned some, silently
  discarding required data. Fix: both handlers now call `blockIfLastScience(willRemoveCount)` first
  and `return` early when it's `true`. `hasTocPlannedScience` reuses the exact
  `result_toc_result.planned_result !== false` condition already used by this file's other `@if`
  branches (`bugfix/toc-unmapped-orange-notes`), combined with
  `tocReferenceSynergyInitiativeIds().length > 0`. `getRealScienceCount()` excludes the
  `OTHER_SP_CODE` sentinel from `scienceSelected` and adds `otherScienceSelected.length` —
  `TOC-SP-DD-2`: deleting the sentinel chip itself cascades to clear `otherScienceSelected` (see the
  existing `if (!this.showOtherScience) otherScienceSelected = []` line), so `deleteScience` computes
  `willRemoveCount` as `otherScienceSelected.length` when the removed chip IS the sentinel, not `1`.
  Alert reuses `customizedAlertsFeSE.show(...)` with a stable `id: 'toc-science-program-min'`,
  `status: 'warning'`, no `confirmText` — a plain hardcoded string (no new `TermKey`), matching the
  precedent of this file's sibling notes (`contributingScienceInfoNote`, `noScienceProgramsNote`).
  Does not touch `applyTocMappingOnLoad`, `onScienceSelect`, `buildOtherScienceSentinel`, or any
  Contributing-Centers logic — those are a separate array/catalog with no code coupling.

- ⚠️ **`TOC-SP-DD-3` (2026-08-29, correction, supersedes `TOC-SP-DD-2`'s cascade-blocking): the
  `OTHER_SP_CODE` sentinel chip is now ALWAYS deletable, never blocked by the guard.** The sentinel
  is a UI-shape control (toggles the Other(s) dropdown), not itself a Contributing Science Program —
  `deleteScience` no longer calls `blockIfLastScience(...)` when the removed chip is the sentinel; it
  proceeds straight to the existing cascade (clearing `otherScienceSelected`). The guard is unchanged
  for real-chip removal (`deleteScience` on a non-sentinel chip, and `deleteOtherScience`).

- ⚠️ **Contributing CGIAR Center now has a minimum-count guard too (2026-08-29,
  `docs/specs/changes/toc-center-guard`, `TOC-C-DD-1`/`TOC-C-DD-2`/`TOC-C-DD-3`) — same shape as the
  Science Program guard above, substituting "Center" for "Science".** `deleteContributingCenter` /
  `deleteOtherCenter` (`component.ts`) used to unconditionally filter-and-reassign — a user could
  empty every Contributing CGIAR Center even when the linked ToC had planned some, silently
  discarding required data. Fix: both handlers now call `blockIfLastCenter(willRemoveCount)` first
  and `return` early when it's `true`. `hasTocPlannedCenter` reuses the exact
  `result_toc_result.planned_result !== false` condition already used by this file's other `@if`
  branches (`bugfix/toc-unmapped-orange-notes`), combined with
  `tocReferenceCenterInstitutionIds().length > 0` (the same signal already read by
  `hasReferenceCenters`, `:146`). `getRealCenterCount()` excludes the `OTHER_CENTERS_CODE` sentinel
  from `contributing_center` and adds `otherCentersSelected.length` (`TOC-C-DD-2`: fresh
  standalone helpers on the component — deliberately NOT reusing the service's
  `getContributingCentersUnion()` / `isUnmappedOrFlat()`, since the union doesn't exclude the
  sentinel and would under-count). `TOC-C-DD-3`: deleting the sentinel chip itself cascades to clear
  `otherCentersSelected` (see the existing `if (!this.showOtherCenters) otherCentersSelected = []`
  line, `:428`), so `deleteContributingCenter` computes `willRemoveCount` as
  `otherCentersSelected.length` when the removed chip IS the sentinel, not `1`. Alert reuses
  `customizedAlertsFeSE.show(...)` with a stable `id: 'toc-center-min'`, `status: 'warning'`, no
  `confirmText` — a plain hardcoded string (no new `TermKey`), matching the precedent of this
  file's sibling notes. The guard applies identically in both UI shapes this field renders as
  (flat/unmapped single dropdown vs. split CP2026 ToC/Other(s)) since both mutate the same two
  underlying arrays. Does not touch `applyTocMappingOnLoad`, `preselectCentersEffect`,
  `onContributingCenterSelect`, `onOtherCenterSelect`, `onLeadCenterSelected`,
  `getContributingCentersUnion`, `isUnmappedOrFlat`, `setPossibleLeadCenters`, or any Contributing
  Science Program logic — those are separate arrays/catalogs with no code coupling.

- ⚠️ **`TOC-C-DD-4` (2026-08-29, correction, supersedes `TOC-C-DD-3`'s cascade-blocking): the
  `OTHER_CENTERS_CODE` sentinel chip is now ALWAYS deletable, never blocked by the guard** — same
  correction as `TOC-SP-DD-3` above, for the twin field. `deleteContributingCenter` no longer calls
  `blockIfLastCenter(...)` when the removed chip is the sentinel; it proceeds straight to the
  existing cascade (clearing `otherCentersSelected`). The guard is unchanged for real-chip removal
  (`deleteContributingCenter` on a non-sentinel chip, and `deleteOtherCenter`).

- ⚠️ **`TOC-C-DD-5` / `TOC-SP-DD-4` (2026-08-29, second correction, same day): the minimum-count
  floor is now scoped to the ToC-origin array ONLY (`contributing_center` / `scienceSelected`),
  ignoring the "Other" array entirely.** `getRealCenterCount()` / `getRealScienceCount()` no longer
  add `otherCentersSelected.length` / `otherScienceSelected.length` — they count only non-sentinel
  entries in the ToC-origin array. Concretely: 2 ToC-origin entries + 1 "Other" entry now only
  allows deleting 1 of the 2 ToC-origin ones (deleting the 2nd is blocked), even though an "Other"
  entry is still selected — the old combined-count formula wrongly allowed emptying every
  ToC-origin entry as long as enough "Other" ones existed. `deleteOtherCenter` / `deleteOtherScience`
  no longer call `blockIfLastCenter`/`blockIfLastScience` at all — deleting an "Other" entry never
  consults the guard, regardless of the ToC-origin count (including the 0-ToC-origin edge state).
  The sentinel-chip exemption from `TOC-C-DD-4`/`TOC-SP-DD-3` is unaffected.

## Hijos sin archivo propio
| Componente | Qué hace | Trampa |
|---|---|---|
| `components/` | Chips y bloques de contribuidores/socios | Los dropdowns agrupados de admin tienen comportamiento propio: validar antes de cambiar bindings |

## Tests
Tres suites: `*.component.spec.ts` (incl. el describe `LC-T-2` que renderiza el
componente completo con el servicio REAL para probar que la nota vacía de Lead center nunca
aparece y que el `app-pr-select` recibe el catálogo completo, y el describe `LC-T-4: Lead center
(selectOptionEvent) wiring` que dispara el output real del `app-pr-select` vía
`triggerEventHandler` para probar la extracción `$event?.code ?? null` y el auto-sync end-to-end
contra el servicio REAL — su fixture es flat/unmapped, así que tras `LC-DD-5` el destino
`LC-TEST-9` es `contributing_center`, no `otherCentersSelected`), `*.service.spec.ts` (incl.
`onLeadCenterSelected — target field by active UI + generalized trigger (LC-DD-5, supersedes
LC-DD-4)` con su sub-describe CP2026-mapeado, y `applyTocMappingOnLoad — sentinel reconciliation
fix (LC-DD-5)`) y `*.zoneless.spec.ts`.
Además, E2E: `cypress/e2e/result-detail/contributors-and-partners.cy.ts`, `save-validation.cy.ts`
y `save-contract.cy.ts`.
⚠️ Los controles del template llevan `data-testid="cp-field-<ruta en el payload>"` (por ejemplo
`cp-field-result_toc_result.planned_result`). **No son decoración:** `save-contract.cy.ts` lee la
ruta del hook y comprueba que el campo viaje en el body del PATCH. El sufijo tras `~`
(`cp-field-contributing_center~flat`) solo distingue dos controles que alimentan la MISMA clave.
Si añades un control obligatorio sin su hook, queda fuera de esa comprobación.
La zoneless existe porque esta pantalla ya se rompió con el patrón hide/re-show por timer.
⚠️ Esta carpeta está **excluida de `collectCoverageFrom`** (`package.json`): los tests corren, pero
no cuentan para el umbral. No te fíes del porcentaje global para saber si esto está cubierto.
