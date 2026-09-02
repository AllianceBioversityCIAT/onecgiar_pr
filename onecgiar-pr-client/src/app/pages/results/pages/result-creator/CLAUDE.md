# result-creator

**Verified:** 2026-09-02 · branch performance-refactor · 2de8884cd

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
| `similar-results/` | Sugerencias contra duplicados | Fed by our own `get/depth-search` since P2-3527 (Elastic's host stopped resolving). Real uniqueness is still gated by MySQL at create time (`report-result-form.component.ts:421`) |
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

- ⚠️ **P2-3527 — the similar-results list is a MySQL `like '%…%'`, and it only stays usable because
  of two guards.** `GET_depthSearch` (`results-api.service.ts`) hits
  `api/results/get/depth-search/:title`, whose repository query
  (`result.repository.ts` → `AllResultsLegacyNewByTitle`) **caps the page at 20 rows (50 max) and
  orders exact title → prefix → rest**. Uncapped, `title like '%a%'` answered with ~10 360 rows /
  8 MB in 4.2 s on prtest. Both callers also **debounce 500 ms** (`titleSearch$` here and in
  `report-result-form`). 🛑 Do not remove the cap, the ordering or the debounce: the search fires
  while the user types.
- ⚠️ **A 404 from that route means "no matches", not a failure.** `GET_depthSearch` maps it to `[]`;
  every other error propagates and lights up `depthSearchFailed`, which is the distinction P2-3526
  is about. And `version_id` arrives as a **string** (MySQL bigint) — the service coerces it to a
  number, otherwise `allPhases.find(p => p.id === version_id)` never matches and every suggestion
  renders as "does not exist in this reporting phase" with Map-to-ToC disabled.

## Pendiente / Coming soon
- **Crear un resultado desde el asistente de IA** → `P2-3433` (abierto, sin respuesta desde el
  24-ago). Bloqueado por definición: nadie ha dicho qué endpoint persiste un resultado sugerido por
  la IA ni cómo mapea el payload de la IA sobre ese body. La orden de trabajo del 26-ago sí pide
  garantizar creación «by manual form and by artificial intelligence».

## P2-3421 — link to a QA'd Innovation Development result (English, per the repo rule)
`report-result-form` renders TWO surfaces: the standalone legacy creator (its own route) and the
**emergent (non-ToC) modal** hosted by `result-framework-reporting`. The link question belongs to
the emergent one ONLY, so it is opt-in via `@Input() showInnovationLinkQuestion`
(`entity-details.component.html:198` passes `true`). Default `false` — never make it default `true`.

- Three gates, all of them load-bearing: the surface opt-in · `result_type_id === 2` (Innovation
  use) · **phase year ≥ 2026**. 🛑 The year gate is `showsInnovationLinkQuestion()` from
  `shared/services/global/qa-innovation-development-results.service.ts`, never `isP25()`: prtest
  holds 2025-phase results inside the P25 portfolio and those must render exactly as they do today.
- The answer travels **inside** `POST_resultCreateHeader`. ⚠️ Do NOT "fix" this by chaining
  `PATCH_innovationUseP25` after the create: that endpoint rejects a body without a valid
  `innovation_use_level_id`, which a result created a second ago does not have.
- The dropdown reads `QaInnovationDevelopmentResultsService` — the single client-side owner of the
  catalogue, shared with the two ToC creation surfaces. Do not fetch it here.
- ⚠️ `dashboard-lab.component.html:1643` hosts this same component as ITS emergent modal and does
  **not** pass the flag yet — out of scope of P2-3421, reported. Add the input there when the
  story that owns that surface says so.

