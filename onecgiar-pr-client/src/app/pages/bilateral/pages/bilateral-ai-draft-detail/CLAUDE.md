# bilateral-ai-draft-detail

**Verified:** 2026-08-25 · branch performance-refactor · bc25304fb

## Qué es
Ficha de un borrador generado por IA: muestra lo que el modelo extrajo
(`draft-result-card`) y los materiales fuente del job (`draft-evidence-list`),
y ofrece las dos acciones terminales — **Promote to Result** y **Discard**.

## Contrato
- Ruta: `bilateral/:acronym/drafts/:draftId`
  (`src/app/shared/routing/routing-data.ts:696-704`).
- Carga por `BilateralAiService.getDraft(id)` → `GET api/bilateral/center/ai/drafts/:id`.
  La respuesta trae el draft con `job`, `result` y `evidence`.
- `promoteDraft(id)` → `POST .../drafts/:id/promote` → `{ resultId }`. El servicio
  quita el draft de la lista, marca `uploadState.status = 'promoted'` y navega a
  `bilateral/:acronym/result/:resultId`.
- `discardDraft(id)` → `DELETE .../drafts/:id`. En el servidor también pone el
  resultado subyacente en `is_active = 0`.
- `BilateralAiService.isPromoting()` = fuente de verdad del "hay un promote en
  vuelo"; **esta página y `my-draft-results` la comparten.**

## Hijos sin archivo propio
| Componente | Qué hace | Trampa |
|---|---|---|
| `draft-result-card/` | Pinta `extracted_mds` (título, descripción, geo, lead center, partners, innovation dev). Resuelve nombres de país y sub-nacional con CLARISA. | Renderiza **solo** los bloques que conoce: si la IA extrae un tipo de resultado nuevo, sus campos no se ven aquí aunque sí se promuevan. |
| `draft-evidence-list/` | Lista `document_keys` / `audio_keys` / `text_context` y pide una URL firmada por cada clave. | ⚠️ Enseña el **nombre de la clave S3** (`<uuid>-<archivo>`), no el nombre original. Y si la firma falla queda un reloj de arena con el título "Generating link…" para siempre. |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El promote no es idempotente.** El servidor repuebla el resultado desde
  `extracted_mds` y marca el draft como descartado; un segundo click duplicaría
  filas y luego daría 404. Por eso `onPromoteConfirm()` corta con
  `isPromoting()` y los botones van `[disabled]`. **No quitar ese guard.**
- ⚠️ **La URL firmada la valida el servidor contra `job.user_id`**
  (`bilateral-ai.service.ts:150`), mientras que ver el draft solo exige ser del
  mismo centro (`assertCenterEntitlement`). Un compañero de centro abre la ficha
  pero **no puede descargar ninguna fuente**: todas quedan en "Generating link…".
- El error de promote/discard se traga el mensaje del servidor y muestra un
  toast genérico ("Failed to promote draft"). El 400 real —"Only document
  sources can become formal evidence"— no llega al usuario. Vive en
  `../../services/bilateral-ai.service.ts:223-226`.
- `getDraftTitle()` está duplicado aquí y en `draft-result-card`. Si cambia la
  clave de título hay que tocar los dos.

## Pendiente / Coming soon
- **Marcar una fuente como "formal evidence"**: el endpoint existe
  (`PATCH .../drafts/:id/evidence/:evidenceId`) y `BilateralApiService.PATCH_bilateralAiEvidence`
  también, pero **ningún componente lo llama**. No hay control en pantalla, así
  que no hay nada que etiquetar `Coming soon`: construir el control sería
  alcance nuevo. Reportado, no implementado.
