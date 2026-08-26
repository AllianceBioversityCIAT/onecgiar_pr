# policy-change-info

**Verified:** 2026-08-26 · branch performance-refactor · 75d56f2cd

## Qué es
Sección 4 del formulario de un resultado **Policy change** (`result_type_id = 1`, nivel Outcome):
tipo de política, importe en USD, etapa, la pregunta "¿está relacionado con…?" y las organizaciones
implementadoras. Ruta: `/result/result-detail/<code>/policy-change1-info?phase=<id>`.

## Contrato
- Estado: **todo vive en el componente**, no hay servicio propio.
  - `innovationUseInfoBody` (`model/innovationUseInfoBody.ts`) → `policy_type_id`, `amount`,
    `status_amount`, `policy_stage_id`, `institutions[]`.
  - `policyChangeQuestions` + `relatedTo` → la pregunta "Is this result related to:" viene del
    backend como un cuestionario; `relatedTo` guarda el `result_question_id` marcado.
- Catálogos: `PolicyControlListService.policyTypesList` / `.policyStages` (se cargan en el
  constructor del servicio, al arrancar la app) e `InstitutionsService.institutionsList`.
- Endpoints (`ResultsApiService`):
  - `GET_policyChanges()` → `GET /api/results/summary/policy-changes/get/result/<result_id>`
  - `GET_policyChangesQuestions()` → `GET /api/results/questions/policy-change/<result_id>`
  - `PATCH_policyChanges(body)` → `PATCH /api/results/summary/policy-changes/create/result/<result_id>`
- `sectionLoading` (signal) alimenta `[appSectionSkeleton]`; se libera en `next` **y** en `error`.
- El green check NO se calcula aquí: lo resuelve el SP `validate_sections_mapped_batch`
  (sección `policy-change1-info`). Verificado OK para P25 el 26-ago-2026.

## Dónde se usa
- `shared/routing/routing-data.ts` — entrada `policy-change1-info` del `resultDetailRouting`.
- `.../result-detail/components/result-sections-sidebar/result-sections.service.ts` — la sección
  aparece en el rail sólo para resultados Policy change.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`policy_type_id == 1` es "Program, budget or investment"** (CLARISA). Es el ÚNICO tipo que
  muestra *USD amount* y *Status* (`*ngIf` en el HTML). Al cambiar de tipo esos dos campos
  desaparecen pero **seguían viajando en el PATCH**: el resultado quedaba con un importe en USD
  colgado de un instrumento legal, invisible y sin forma de borrarlo, y al volver al tipo 1
  reaparecía como si el usuario lo hubiera tecleado (P2-3371, reproducido en el resultado 8916).
  Lo limpia `clearAmountWhenNotApplicable()`, llamada desde el `(ngModelChange)` del select **y**
  desde `onSaveSection()`. **Si añades otro campo condicionado al tipo, límpialo ahí también.**
- ⚠️ `getSectionInformation()` hace `this.innovationUseInfoBody = response` — reemplaza la
  instancia de la clase por el objeto crudo del backend. Las propiedades que el backend no
  devuelva quedan `undefined`, no con el default de la clase.
- ⚠️ La descripción del multiselect dice **"Select min 1, max 3 organizations"** pero **el máximo
  no se valida**: se guardan 5 sin aviso (verificado 26-ago-2026 en 8916). `app-pr-multi-select`
  no tiene input de tope, así que arreglarlo obliga a tocar `custom-fields/`.
- `changeAnswerBoolean()` compara con `===` contra `result_question_id`; si el backend cambiara el
  tipo (string ↔ number) la respuesta dejaría de marcarse sin error visible.
- `onSaveSection()` refresca sólo `getSectionInformation()`, no las preguntas: `relatedTo` se
  mantiene en memoria hasta la siguiente carga de la página.
- El `<app-alert-status>` con `policyTypeDescriptions()` inyecta HTML crudo; el spec compara ese
  string normalizando espacios, así que reformatear el texto rompe el test.

## Pendiente / Coming soon
- El bloque comentado `result_related_engagement` en el HTML ("Don't delete this code") sigue
  esperando decisión de negocio; el campo existe en el modelo y en la BD.
