# cap-dev-info — Capacity Sharing for Development information

**Verified:** 2026-08-27 · branch performance-refactor · 6407a50fa

## Qué es
Sección de detalle del resultado para los resultados de tipo **Capacity Sharing** (Pool Funding,
W1/W2): a cuánta gente se capacitó, duración, modalidad de entrega y si asistían en nombre de una
organización.

## Contrato
- Componente NO standalone (`standalone: false`), declarado en `cap-dev-info.module.ts`.
- Estado: **el componente es dueño del body**, no hay servicio propio.
  `CapDevInfoComponent.capDevInfoRoutingBody` (`model/capDevInfoRoutingBody.ts`) es la fuente de verdad.
- Endpoints vía `ApiService.resultsSE`:
  - `GET_capacityDevelopent()` / `PATCH_capacityDevelopent(body)`
  - `GET_capdevsTerms()` → se parte en dos con `splice(0,2)`: los 2 primeros son los **sub-términos**
    (Long-term / Short-term, ids 1-2) y los 2 siguientes el grupo principal (ids 3-4).
  - `GET_capdevsDeliveryMethod()`
- `institutionsSE.institutionsList` (`InstitutionsService`) alimenta el multi-select de organizaciones.
- `sectionLoading` (signal) maneja `[appSectionSkeleton]`; se libera en `next` **y** en `error`.
- `hasSelectedOrganizations` (getter) alimenta el reporter oculto `appFeedbackValidation`.

## Dónde se usa
- Ruta hija de `result-detail`, cargada por `cap-dev-info-routing.module.ts`; el enrutado por tipo de
  resultado vive en `rd-result-types-pages/`.
- El pie de sección (`app-section-bottom-bar`) lee `DataControlService.fieldFeedbackList()`, que se
  llena escaneando el DOM desde `result-detail.component.ts:146`.

## Cómo se marca un campo como obligatorio aquí
El green check **no** lo decide el cliente. Lo decide una función MySQL. El cliente solo tiene que
(a) pintar el asterisco y (b) hacer que el campo entre en la lista "N fields missing" del pie:

| Control | Cómo entra en la lista |
|---|---|
| `app-pr-input` | `[required]="true"` → `.pr-input.mandatory`; vacío = `.input-validation` sin texto |
| `app-pr-radio-button` | `[required]="true"` → `.pr-field.mandatory`; `complete` si `value != null` |
| `app-pr-multi-select` | **no emite nada** → hace falta un `<div appFeedbackValidation labelText…>` al lado |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El green check vive en MySQL, no acá.** `validation_capacity_dev_P25`
  (`onecgiar-pr-server/src/migrations/1762528725798-createValidtionP25.ts:251-292`), resuelta por el SP
  `validate_sections_mapped_batch`, exige **7 cosas**: `female_using`, `male_using`,
  `non_binary_using`, `has_unkown_using` (los cuatro NOT NULL), `valid_text(capdev_term_id)`,
  `valid_text(capdev_delivery_method_id)` y `is_attending_for_organization` NOT NULL; y si la
  respuesta es **Yes**, además ≥1 fila en `results_by_institution` con `institution_roles_id = 3`.
  Hasta el 25-ago-2026 el cliente marcaba **uno solo** → la sección nunca se ponía verde y nadie le
  decía al usuario qué faltaba (**P2-3241 rebotó por esto**). Si mañana alguien relaja o endurece la
  función SQL, **este HTML hay que tocarlo en el mismo cambio**.
- ⚠️ **NO es un gate de portafolio ni de fase.** `validation_capacity_dev_P22`
  (`…/1761849861521-createValidtionP22.ts:125-166`) es **idéntica** a la P25, campo por campo. Por eso
  los `[required]` van sin `isP25()` ni `isCP2026()`: envolverlos en un gate dejaría a un portafolio
  sin aviso y con la sección atascada en naranja. Verificado el 25-ago-2026 comparando ambas funciones.
- ⚠️ **`app-pr-multi-select` no se autorreporta.** No renderiza `.pr-field.mandatory`, así que un
  multi-select obligatorio y vacío es **invisible** para
  `DataControlService.someMandatoryFieldIncompleteResultDetail()`. Por eso el `<div appFeedbackValidation>`
  al final del template — mismo patrón que `geoscope-management.component.html:47`. Su
  `FeedbackValidationDirectiveModule` **no** lo re-exporta `CustomFieldsModule`: se importa aparte en
  `cap-dev-info.module.ts`.
- ⚠️ **El sub-radio (`label="Degree"`, PhD/Master) es OPCIONAL a propósito.** `validate_capdev_term_id()`
  hace `capdev_term_id = capdev_term_id_2 ?? capdev_term_id_1`, así que el grupo principal ya satisface
  `valid_text(capdev_term_id)`. Marcarlo obligatorio pediría un dato que el servidor no exige.
- ⚠️ **Ese `label="Degree"` NO es decorativo: es lo que hace que el grupo se dibuje dentro de su card**
  (P2-3385). Sin `label` ni `description`, el getter `isBare` de `field-card` da `true` y se salta la
  clase `field_card` entera → las opciones quedaban sueltas fuera del contenedor. Dos tests del spec
  ("renders INSIDE a field card" y "framing … did NOT make it mandatory") caen si alguien lo quita o si
  al ponerlo flipea `required`.
- ⚠️ **0 es una respuesta válida** en los cuatro contadores: el servidor rechaza `NULL`, no `0`.
  Cualquier validación que trate `0` como vacío vuelve a bloquear la sección.
- ⚠️ **`is_attending_for_organization` llega como tinyint (0/1)** del endpoint legacy y las opciones del
  radio son booleanas → `normalizeAttendanceValue()` (P2-3246). Sin eso el valor guardado "No" no se
  pinta al recargar.
- El texto de ayuda dice que si no hay datos desagregados se use "Unknown", pero el servidor igual
  exige los otros tres NOT NULL → hay que escribir `0`. Es regla del servidor, no del cliente.
- En Jest, `innerText` no existe en jsdom y el escaneo de campos faltantes lo lee: el spec instala un
  shim `innerText → textContent` en `HTMLElement.prototype` y lo restaura en `afterAll`.

## Pendiente / Coming soon
- Nada visible-deshabilitado en esta sección.
