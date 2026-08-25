# innovation-dev-info

**Verified:** 2026-08-25 · branch performance-refactor · 640c1e4b4

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
| `gesi-innovation-assessment/` | cuestionario | ❌ ninguno (línea 65) |
| `scale-impact-analysis/` | cuestionario | ❌ ninguno (línea 66) |
| `assumptions-examination/` | cuestionario | ✅ `isP25()` (línea 68) |
| `partners-policies-safeguards/` | cuestionario | ✅ `isP25()` (línea 69) |
| `intellectual-property-rights/` | cuestionario (q1..q4) | ❌ ninguno (línea 73) |
| `innovation-team-diversity/` | cuestionario (question 112, 3 niveles) | ❌ ninguno (línea 93) |
| `user-evidence/` | evidencias | ✅ `isP25()` (línea 45) |

## Trampas (⚠️ = ya rompió algo o va a romper)
- 🛑 **`isP25()` NO es la fase, es el PORTAFOLIO** (`fields-manager.service.ts:19`). Para "2026 en
  adelante" el gate correcto es un umbral de `ReportingDesignYear` sobre `phase_year` — prtest tiene
  resultados de **fase 2025 dentro del portafolio P25**, así que un gate de portafolio les quitaría la
  sección y rompería la regla del épico P2-3243. Los bloques de P2-3263/P2-3264 usan
  `isInnovationDevFormReduced2026()`; los de `assumptions-examination` y `partners-policies-safeguards`
  todavía usan `isP25()` — dos gates con significados distintos conviven en el mismo template.
- ⚠️ **Los bloques restantes sin gate de fase** siguen sin protección: ocultar uno "para 2026" sin
  envolverlo se lo quita también a los resultados de fases anteriores.
- ⚠️ **Las preguntas SÍ están versionadas por fase, aunque el HTML no lo esté:**
  `result_questions.version` es `enum('P22','P25')` (`result-question.entity.ts:62-67`) y los métodos
  `…V2` del servicio filtran `version: 'P25'`. Añadir/quitar una pregunta de 2026 = **migración sobre
  filas P25**, nunca un `UPDATE` global.
- ⚠️ **`validation_innovation_dev_P25` no existe en `src/migrations`** (sí existe `_P22` en
  `1761849861521-createValidtionP22.ts:479`). El SP devuelve `FALSE` cuando la función falta → la
  sección nunca saldría verde en 2026. No verificado contra la DB de test.
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
