# type-innovation-dev (bilateral)

**Verified:** 2026-08-25 · branch performance-refactor · bc25304fb

## Qué es
Sección 5 del formulario bilateral: Innovation Development. Muestra el **MDS** (3 campos
obligatorios) y esconde el resto del formulario de pooled funding detrás del botón
**Complete full metadata** (P2-3391, verificado por QA con P2-3327).

## Contrato
- Endpoint: **el mismo del summary de pooled funding** —
  `GET/PATCH results/summary/innovation-dev/(get|create)/result/:id` vía
  `BilateralApiService.GET_innovationDev` / `PATCH_innovationDev`. No hay endpoint bilateral propio.
- Estado: `body` es el `CreateInnovationDevDto` del server. El guardado va por
  `BilateralAutoSaveService.schedulePayload('typeSpecific', …, { statusKey: 'type-specific' })`.
- Green check: `BilateralMdsTrackerService.setSectionFields('type-specific', …)`. **Solo 3 items**:
  `nature`, `developers`, `readiness`. Todo lo demás es full metadata y no cuenta.
- Toggle: `BilateralExpandableStateService.get/setShowAllFields(resultId, 'type-specific')` — el
  estado abierto/cerrado sobrevive a la navegación entre secciones.
- Catálogos: `InnovationControlListService` (`typeList`, `characteristicsList`,
  `readinessLevelsList`), ya cargados en root.

## Dónde se usa
- `../section-type-specific.component.html` — se pinta cuando el tipo de resultado es
  Innovation Development.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **Nada que no sea MDS puede entrar en `setSectionFields` con `filled: false`.** El tracker
  calcula `complete` como `filledFields === totalFields`; un cuarto item vacío deja la sección en
  amarillo para siempre y **deshabilita Submit** (`overallStatus() === 'complete'`). Es la misma
  caída que P2-3348, Capacity Sharing y Policy Change ya sufrieron.
- ⚠️ **El techo de 10 palabras del Short title (P2-3340) sigue vivo aunque el campo ya no sea MDS.**
  Se reporta como item `invalid` **solo cuando se pasa**, y con `filled: true`, para bloquear Submit
  con motivo sin tocar el porcentaje. Si alguien lo vuelve a listar siempre, rompe AC9.
- ⚠️ **`SCALING_STUDIES_READINESS_THRESHOLD = 17` es un ID de CLARISA, no el número 6.** El
  readiness level 6 es la fila 17 de `readinessLevelsList`. Pooled funding hace lo mismo con
  `getReadinessLevelIndex() >= 6`, que es el índice del array — dos formas de decir lo mismo.
- 🛑 **P2-3265 pide lo contrario de lo que hace hoy este gate**: ocultar la pregunta de scaling
  studies cuando readiness >= 6. Aquí (y en pooled funding) se **muestra** desde ahí. No se cambió:
  P2-3265 sigue `Open` y P2-3391 dice explícitamente que hay que coordinar con la PO antes de tocar
  los campos que dependen de esas 7 enhancements.
- ⚠️ **La nota MDS va arriba del todo en esta sección**, mientras Capacity Sharing y Policy Change
  la pintan después de sus campos MDS. Es deliberado: P2-3391 AC1 y P2-3327 AC2 dicen "at the top".
  Si el equipo unifica el patrón, este es el archivo a mover (una sola fila `div`).
- ⚠️ **`isP25()` NO aparece aquí y no debe aparecer.** El eje de este formulario es el tipo de
  resultado + bilateral, no el portafolio ni el año de fase. Ver la regla FASE ≠ PORTAFOLIO en
  `~/Desktop/reporting/CLAUDE.md`.

## Qué falta del formulario de pooled funding (y por qué no está)
Los tres bloques dirigidos por el **cuestionario** (`result_questions`) no se pueden montar hoy:
| Bloque de pooled funding | Por qué no está |
|---|---|
| `gesi-innovation-assessment` + `scale-impact-analysis` | P2-3290 (`Open`) los reemplaza por 2 preguntas estructuradas |
| `intellectual-property-rights` | P2-3272 (`Open`) consolida 4 preguntas en 1 |
| `innovation-team-diversity` | P2-3291 (`Open`) reestructura la jerarquía |
| `anticipated-innovation-user`, `megatrends` | **Eliminados** por P2-3263/P2-3264 — no revivirlos |

Además harían falta cosas fuera de esta carpeta: un `GET result-questions/innovation-development/:id`
en `bilateral-api.service.ts` y reutilizar componentes que hoy viven en
`pages/results/.../innovation-dev-info/` (declarados en un NgModule, no standalone).

## Pendiente / Coming soon
- AC11 (read-only en Pending Review / Approved / Rejected): **no implementado**, y ninguna sección
  bilateral lo tiene — no existe la infraestructura de solo-lectura en el flujo bilateral.
- "Investment (USD)" son tres filas `Not available yet` — placeholder heredado de `app-estimates`.
