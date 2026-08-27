# result-creator

**Verified:** 2026-08-25 · branch performance-refactor · bc25304fb

## Qué es
La pantalla de **Report new result** del flujo Pool Funding (W1/W2): elegir nivel, escribir el
título, ver resultados parecidos antes de duplicar, y crear. Trae además un **asistente de IA** que
lee un documento y propone resultados candidatos — hoy solo los propone (ver Trampas).

## Contrato
- `CreateResultManagementService` (`services/create-result-management.service.ts`) — **dueño de
  todo el estado del asistente de IA**: `items`, `expandedItem`, `selectedFile`,
  `selectedInitiative`, `analyzingDocument`, `documentAnalyzed`, `noResults`. Signals puros, sin
  HTTP. `closeModal()` resetea las siete.
- `ResultLevelService` (`services/result-level.service.ts`) — `resultBody`, el body del alta manual.
  `removeResultTypes` (`:143-151`) filtra los tipos no reportables.
- Creación manual: `POST_resultCreateHeader(resultBody, true)` o, si hay handle de KP,
  `POST_createWithHandle({ ...mqapJson, result_data })` — ambos en
  `components/report-result-form/report-result-form.component.ts:270-272`.

## Dónde se usa
- Ruta propia (`result-creator-routing.module.ts`), entrada desde el botón *Report new result*.

## Hijos sin archivo propio
| Componente | Qué hace | Trampa |
|---|---|---|
| `result-ai-assistant/` | Modal del asistente: subida de archivo, loading, feedback, lista | El estado NO vive aquí, vive en `CreateResultManagementService` |
| `result-ai-assistant/components/result-ai-item/` | Una tarjeta de resultado propuesto | ⚠️ ver la primera trampa |
| `similar-results/` | Sugerencias contra duplicados | Las alimenta Elastic; la unicidad real la gatea MySQL al crear (`report-result-form.component.ts:421`) |
| `result-level-cards/`, `result-level-buttons/` | Selección de nivel | — |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`createResult()` del asistente de IA no crea nada y NO es alcanzable.**
  `result-ai-item.component.ts:65-83` es un `setTimeout` de 1 s que levanta un toast de éxito falso;
  no hay llamada HTTP. Los botones `Discard` y `Create` llevan `[ngClass]="{ globalDisabled: true }"`
  con **`true` literal** (`result-ai-item.component.html:75,83`), y `.globalDisabled` es
  `pointer-events: none` (`styles.scss:87`) → el toast falso es **código muerto**. Junto a ellos va
  el tag `Coming soon` (P2-3433). **No quites el disable sin conectar antes la persistencia**, o la
  UI vuelve a mentir. Tres tests lo fijan en el spec.
- ⚠️ **`openResult()` (`result-ai-item.component.ts:85`) navega a `item.result_official_code`**, un código que nadie persistió.
  Solo se renderiza en el `@else` de `isCreated()`, así que hoy es inalcanzable — pero si alguien
  conecta la creación, ese código tiene que venir de la respuesta del servidor, no del item de IA.
- ⚠️ **Hay DOS rutas de creación en el repo y esta usa la vieja.** Aquí se llama
  `POST_resultCreateHeader`; el revamp de Reporting usa `POST_createResult`
  (`results-api.service.ts:1438`) con el helper compartido `buildCreateResultPayload`
  (`result-framework-reporting/shared/report-result/`). No las mezcles sin leer ese CLAUDE.md: la
  matriz de tipos y las trampas de payload están documentadas allí.
- **`AIAssistantResult` está declarada dos veces** en
  `shared/interfaces/AIAssistantResult.ts` (líneas 1 y 39). TypeScript las fusiona, así que compila,
  pero la segunda añade `result_id` y omite campos de la primera. Lee las dos antes de fiarte.

- ⚠️ **El párrafo de guía de Knowledge Product está TRIPLICADO, palabra por palabra, en tres
  pantallas** — y por eso divergió: `result-creator.component.ts:43` y
  `components/report-result-form/report-result-form.component.ts:53` decían **2025** mientras
  `rd-general-information/components/change-result-type-modal/change-result-type-modal.component.ts:41`
  se había quedado en **2023**. Los tres son ahora `computed()` que derivan el año de
  `dataControlSE.reportingCurrentPhase.phaseYear` / `previousReportingPhase.phaseYear`, pero **siguen
  siendo tres copias**: si tocas la frase, tócala en las tres. (Deuda: no se unificaron a propósito —
  atraviesa tres pantallas y no era el alcance.)
- ⚠️ **`reportingCurrentPhase` es un objeto PLANO, no un signal.** Cualquier `computed()` que lea su
  `phaseYear` tiene que leer antes `dataControlSE.reportingPhaseVersion()` (contador que
  `getCurrentPhases()` incrementa), o bajo zoneless se queda cacheado con el valor del primer paint.
  El fallback al año de calendario evita que la frase pinte `null` en ese primer frame.

## Pendiente / Coming soon
- **Crear un resultado desde el asistente de IA** → `P2-3433` (abierto, sin respuesta desde el
  24-ago). Bloqueado por definición: nadie ha dicho qué endpoint persiste un resultado sugerido por
  la IA ni cómo mapea el payload de la IA sobre ese body. La orden de trabajo del 26-ago sí pide
  garantizar creación «by manual form and by artificial intelligence».
