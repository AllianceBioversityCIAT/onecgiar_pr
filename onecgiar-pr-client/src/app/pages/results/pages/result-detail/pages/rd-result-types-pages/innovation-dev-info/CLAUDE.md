# innovation-dev-info

**Verified:** 2026-08-27 · branch JuanGuzman-io/goldeye · a3b02520b (merge de performance-refactor)

## Qué es
Sección "Innovation Development" del detalle de resultado. Mezcla **dos fuentes distintas** que se
confunden con facilidad: campos propios del summary (`InnovationDevInfoBody`) y un **cuestionario
servido por el backend** (`result_questions` / `result_answers`).

## Contrato
- `innovationDevInfoBody` — summary del resultado. Alimenta `anticipated-innovation-user`,
  `estimates`, `innovation-links`, los textarea de developers/collaborators y el readiness level.
- `innovationDevelopmentQuestions` — el cuestionario, tipado en `model/InnovationDevelopmentQuestions.model.ts`
  con 4 grupos: `responsible_innovation_and_scaling`, `intellectual_property_rights`,
  `innovation_team_diversity`, `megatrends`.
  Endpoint server: `api/results/result-questions` → `ResultQuestionsService.findQuestionInnovationDevelopmentV2`.
- Green check: **no se calcula aquí**. `results-validation-module.repository.ts:53` llama al
  stored procedure `validate_sections_mapped_batch`, que resuelve `validation_<sección>_<portafolio>`.

## Dónde se usa
- `innovation-dev-info.component.html` — único consumidor de los hijos de `components/`.

## Hijos sin archivo propio
| Componente | Fuente de datos | Gate de fase en el HTML |
|---|---|---|
| `anticipated-innovation-user/` | summary (`body.innovatonUse` actors/organizations/measures) | ✅ `!isInnovationDevFormReduced2026()` — P2-3263 |
| `megatrends/` | cuestionario | ✅ `!isInnovationDevFormReduced2026()` — P2-3264 |
| `stage-assessment/` | cuestionario (q1 y q2 de 2026) | ✅ `isInnovationDevFormReduced2026()` — P2-3467 |
| `gesi-innovation-assessment/` | cuestionario (q1 hasta 2025) | ✅ `@else` del mismo gate — P2-3467 |
| `scale-impact-analysis/` | cuestionario (q2 hasta 2025) | ✅ `@else` del mismo gate — P2-3467 |
| `assumptions-examination/` | cuestionario (q3 en ambas fases) | ✅ `isP25()` |
| `partners-policies-safeguards/` | cuestionario (q4 hasta 2025) | ✅ `isP25()` + `!isInnovationDevFormReduced2026()` — P2-3467 |
| `intellectual-property-rights/` | cuestionario (q1..q4) | ❌ ninguno |
| `innovation-team-diversity/` | cuestionario (question 112, 3 niveles) | ❌ ninguno |
| `user-evidence/` | evidencias | ✅ `isP25()` |

> Los números de línea se quitaron a propósito: quedaron desfasados dos veces seguidas. Busca el
> selector en el template.

## q1..q4 se reparten POR POSICIÓN, no por id
`responsibleInnovationAndScalingV2` (`result-questions.service.ts`) toma los hijos de la raíz 77 y
los asigna a `q1..q4` **por índice del array**. Como el grupo cambia de composición según la fase,
el servidor filtra los hijos con `selectScalingQuestionsForPhase` antes de repartirlos:

| Fase | q1 | q2 | q3 | q4 |
|---|---|---|---|---|
| ≤ 2025 | 78 GESI | 79 riesgo | 136 assumptions | 137 partners |
| ≥ 2026 | GESI stage | risk stage | 136 assumptions | — |

Las dos preguntas nuevas se resuelven **por texto**, no por id: los `result_question_id` de P25 los
asignó el AUTO_INCREMENT al clonar las filas P22, así que no coinciden entre ambientes. Los textos
viven en `onecgiar-pr-server/src/api/results/result-questions/innovation-dev-questions.const.ts` y,
del lado de la base, dentro de la función `validation_innovation_dev_P25` — si el PO cambia un texto
hay que cambiarlo en los dos sitios.

## Trampas (⚠️ = ya rompió algo o va a romper)
- 🛑 **`showScalingStudiesQuestion()` (P2-3265) — off-by-one, nunca uses `id` ni el índice del
  array.** El catálogo `readinessLevelsList` (endpoint `clarisa/innovation-readiness-levels/get/all`)
  trae `id` autoincremental (arranca en 11, verificado en prtest 26-ago-2026) y un campo `level`
  string ('0'..'9') que es el número real de nivel — hay que comparar contra `level`, nunca contra
  `id` ni contra `getReadinessLevelIndex()` (advertencia explícita de Ángel Jarrín en Jira P2-3265,
  ya causó el incidente P2-3359). Regla final (releída literal de la tabla "Conditional Logic" del
  ticket + confirmada contra el código pre-existente el 26-ago-2026): fase ≥2026
  (`isInnovationDevFormReduced2026()`, el mismo umbral 2026 que P2-3263/P2-3264, epic P2-3243) → la
  pregunta **desaparece en TODOS los niveles (0-9)**, no solo en 6-9 — la fila "< 6: Not applicable
  (question was not shown at these levels)" de la tabla describe el `>= 6` que ya tenía este archivo
  ANTES del ticket, no pide mostrarla ahí ahora. Fase ≤2025 → sin cambios, visible solo desde nivel 6
  (comportamiento previo, exigido por la regla de retrocompatibilidad del épico). ⚠️ Un primer pase
  de este gate mostraba la pregunta en niveles 1-5 en fase 2026 — era una regresión que inventaba una
  pregunta donde nunca existió, corregida el mismo día tras releer la tabla del ticket. Gatea tanto
  el `app-pr-radio-button` (`fieldRef="[innovation-use-form]-has-studies-links"`) como el
  `app-studies-link` que depende de `has_scaling_studies`.
- ⚠️ **Dato huérfano en 2026, sin migrar (por diseño):** `has_scaling_studies` /
  `scaling_studies_urls` no se limpian ni se migran — la sección solo deja de renderizar el control
  vía `*ngIf`; el campo sigue en `InnovationDevInfoBody`, se sigue mandando en el PATCH
  (`{ ...innovationDevInfoBody, ...innovationDevelopmentQuestions }`, sin filtrar campos) y, si un
  resultado ya lo tenía respondido antes de pasar a fase 2026, ese valor viejo se queda en la fila tal
  cual — no verificado si el backend lo vuelve a persistir en cada guardado o si solo lo ignora en
  lectura. Consistente con la instrucción del PO ("Remove nunca significa borrar el dato... no data
  migration") pero implica que el AC de green check ("must no longer contribute to the green check
  score") depende enteramente de la función SQL server-side, no de este archivo.
- ⚠️ **El fieldRef `[innovation-use-form]-has-studies-links` es compartido por 4 superficies**
  (IPSR Step 1, IPSR Step 4, esta sección, Innovation Use) vía `fields-manager.service.ts` — su
  config de `required`/`label` **no se tocó** en P2-3265 (fuera de scope, otros agentes trabajan
  IPSR/Innovation Use en paralelo sobre el mismo fieldRef). El green check server-side
  (`validate_sections_mapped_batch` / `validation_innovation_dev_P25`) tampoco se tocó — es
  backend, fuera del scope de esta carpeta; el AC del ticket sobre "no debe contribuir al green
  check" queda pendiente de verificar del lado servidor.
- 🛑 **`isP25()` NO es la fase, es el PORTAFOLIO** (`fields-manager.service.ts:19`). Para "2026 en
  adelante" el gate correcto es un umbral de `ReportingDesignYear` sobre `phase_year` — prtest tiene
  resultados de **fase 2025 dentro del portafolio P25**, así que un gate de portafolio les quitaría la
  sección y rompería la regla del épico P2-3243. Los bloques de P2-3263/P2-3264 usan
  `isInnovationDevFormReduced2026()`; `assumptions-examination` sigue solo con `isP25()` y
  `partners-policies-safeguards` lleva los dos — dos gates con significados distintos conviven en el
  mismo template.
- ⚠️ **Los bloques restantes sin gate de fase** siguen sin protección: ocultar uno "para 2026" sin
  envolverlo se lo quita también a los resultados de fases anteriores.
- ⚠️ **Las preguntas SÍ están versionadas por fase, aunque el HTML no lo esté:**
  `result_questions.version` es `enum('P22','P25')` (`result-question.entity.ts:62-67`) y los métodos
  `…V2` del servicio filtran `version: 'P25'`. Añadir/quitar una pregunta de 2026 = **migración sobre
  filas P25**, nunca un `UPDATE` global.
- ⚠️ **`validation_innovation_dev_P25` NO vive en `src/migrations` y no debe vivir ahí** (sí existe
  `_P22` en `1761849861521-createValidtionP22.ts:479`). La función está solo en la base y se aplica
  a mano por ambiente, y **no hay copia versionada en el repo**: pídele a alguien con acceso el
  `SHOW CREATE FUNCTION validation_innovation_dev_P25` del ambiente antes de razonar sobre ella.
  El SP devuelve `FALSE` en silencio cuando la función falta → la sección nunca sale verde.
- ⚠️ **La función se elige por PORTAFOLIO pero gatea por AÑO por dentro.**
  `validate_sections_mapped_batch` arma `validation_<sección>_<acrónimo>`, así que un resultado de
  fase 2025 dentro de P25 ejecuta la misma función que uno de 2026. Por eso los bloques de Megatrends
  (P2-3465) y del grupo 77 (P2-3467) están envueltos en `IF (COALESCE(result_phase_year, 0) < 2026)`
  en vez de borrados.
- El texto de las preguntas se edita **por migración** (`1762401252487-ChangeSomeRowsQuestionsP25.ts`),
  no hay pantalla de administración.
- `bilateral.service.ts` lee el mismo cuestionario para los resultados bilaterales: un cambio de
  preguntas los toca también.
- ⚠️ **`innovation-team-diversity`, `gesi-innovation-assessment` y `scale-impact-analysis` son los
  ÚNICOS tres consumidores de `checkboxConfig` en toda la app** — tocar ese branch de
  `custom-fields/pr-radio-button` (agrupado visual de sub-opciones, P2-3291) los afecta a los tres y
  a nadie más. Ver `custom-fields/pr-radio-button/CLAUDE.md`.
- Los tres ya sirven la jerarquía que pedía P2-3291 **en los datos**: la pregunta 112 trae 3 opciones
  de nivel 2 y las 6 de diversidad como nivel 3 bajo la afirmativa. No hay que sintetizar ningún "Yes".

## Pendiente / Coming soon
- Épico P2-3243 (SIDS forms update) toca casi todos estos bloques. Auditoría por ticket publicada en
  Jira el 25-ago-2026 — leer el comentario `🛠 Technical pre-plan` de cada uno antes de tocar nada.
