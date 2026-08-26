# result-questions

**Verified:** 2026-08-26 · branch performance-refactor · ccc7aaeed

## Qué es
Motor de cuestionarios guardado en base de datos (`result_questions` / `result_answers`). Sirve dos
formularios: **Policy change** (result_type_id 1) e **Innovation Development** (result_type_id 7).
No hay pantalla de administración: **cada pregunta se crea, edita o borra por migración**.

## Contrato
- `GET /api/results/questions/innovation-development/:id` → `findQuestionInnovationDevelopment` (P22).
- `GET /v2/api/results/questions/innovation-development/:id` → `findQuestionInnovationDevelopmentV2` (P25).
- `GET /api/results/questions/policy-change/:id` → `findQuestionPolicyChange`.
- Respuesta: `{ responsible_innovation_and_scaling, intellectual_property_rights,
  innovation_team_diversity, megatrends }`.
- `buildInnovationDevelopmentQuestionnaireForBilateral(resultId, portfolioAcronym)` — la misma data
  aplanada para `/api/bilateral/*`. Elige V1/V2 con el **acrónimo de portafolio**, no con la fase.

## Ids raíz cableados en el servicio (no hay catálogo, están a mano)
| Sección | P22 | P25 | Hijos P25 (verificado en prtest 26-ago-2026, resultados 10000/11000) |
|---|---|---|---|
| Responsible innovation and scaling | 1 | 77 | 78, 79, 136, 137 |
| Intellectual property rights | 26 | 100 | 101, 102, 103, 138 |
| Innovation team diversity | 38 | 112 | 3 opciones de nivel 2 |
| Megatrends | 52 | 125 | 126–135 (10 opciones) |

## Dónde se usa
- `onecgiar-pr-client/.../rd-result-types-pages/innovation-dev-info/innovation-dev-info.component.ts:48`
  — elige V1/V2 con `isP25()`; consume `q1..q4` por nombre de slot.
- `src/api/bilateral/bilateral.service.ts` — mismo cuestionario para resultados bilaterales.

## Trampas (⚠️ = ya rompió algo o va a romper)
- ⚠️ **`intellectualPropertyRightsV2` (`result-questions.service.ts:536-539`) sigue mapeando
  `q1..q4` POR POSICIÓN.** `find()` no lleva `ORDER BY`: el orden es el que devuelva MySQL, y
  añadir/quitar un hijo de 100 desplaza todos los slots posteriores → el cliente pinta la pregunta
  equivocada en el componente equivocado, para **todos** los P25 (fase 2025 incluida).
  `responsibleInnovationAndScalingV2` ya está arreglado (slots fijados por id, P2-3465); IPR no.
  Mismo patrón sin arreglar en las dos funciones P22 (`:363`, `:478`).
- ⚠️ **Solo la consulta de nivel 1 filtra `version: 'P25'`** en `intellectualPropertyRightsV2`
  (`:493-500`) y en `innovationTeamDiversityV2` (`:615-622`); los niveles 2/3 no filtran.
  Hoy es inocuo porque esos hijos son filas P25, pero un id reutilizado entre portafolios lo rompe.
- ⚠️ **`getMegatrendsV2` (`:233-237`) no filtra por versión en absoluto**: busca el id 125 a pelo.
- 🛑 **`result_questions` NO tiene `is_active`** (`entities/result-question.entity.ts`). No existe
  "desactivar" una pregunta: o se borra la fila (precedente: `1762401252487-ChangeSomeRowsQuestionsP25.ts`
  borra 82, 83, 122, 123, 124) o se deja de leerla desde el servicio. Borrar deja huérfanas las filas
  de `result_answers` que la apuntan — el FK las permite, pero nada las limpia.
- 🛑 **`version` es PORTAFOLIO, no fase** (`enum('P22','P25')`, `result-question.entity.ts:60-67`).
  No sirve para "de 2026 en adelante": en prtest hay resultados de fase 2025 dentro de P25
  (version_id 34 = "Reporting 2025", portfolio_id 3, igual que version_id 36 = "Reporting 2026").
- ⚠️ **`previous_question_id` no sirve como clave estable**: 78→2 y 79→3, pero 136 y 137 lo tienen
  `NULL` (`1762403412394-SetPreviousResultQuestions.ts` solo pobló dos filas).
- ⚠️ **El green check no se calcula aquí.** Vive en la función MySQL `validation_innovation_dev_<portafolio>`
  que resuelve el SP `validate_sections_mapped_batch`. `_P25` **existe en la base de prtest pero NO
  en `src/migrations`** (drift verificado 26-ago-2026: los resultados 8869, 9142, 9156 y 9255 dan
  `innovation-dev-info = true`, cosa imposible si la función faltara — el SP mete FALSE cuando no
  existe, `1762528725798-createValidtionP25.ts:88-92`). Su cuerpo actual no está en el repo.
- El sufijo de esa función sale del **portafolio** (`clarisa_portfolios.acronym` vía `version.portfolio_id`,
  `1762528725798-createValidtionP25.ts:26-31`). No hay eje de fase: una sola `_P25` sirve a 2025 y 2026,
  así que cualquier regla "solo 2026" tiene que ramificar por `version.phase_year` **dentro** del cuerpo.

## Pendiente
- P2-3465 — quitar Megatrends del cuestionario 2026 y de la condición de completitud. Bloqueado:
  el cuerpo vivo de `validation_innovation_dev_P25` no está en control de versiones.
