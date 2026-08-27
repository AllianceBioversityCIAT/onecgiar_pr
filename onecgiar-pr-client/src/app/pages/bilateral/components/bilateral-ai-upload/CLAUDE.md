# bilateral-ai-upload

**Verified:** 2026-08-25 · branch performance-refactor · bc25304fb

## Qué es
Paso "AI" del creador de resultados bilaterales: el usuario sube documentos,
audio (o graba una nota de voz) y/o escribe contexto, y se dispara un job de
minería de texto. Cuando el job termina con candidatos, el servicio navega solo
a `My Drafts`.

## Contrato
- **Sin inputs/outputs.** Todo el estado compartido vive en `BilateralAiService`
  (`../../services/bilateral-ai.service.ts`), inyectado como singleton root.
  - `uploadState()` = fuente de verdad del paso. Estados:
    `idle | uploading | pending | processing | completed | completed_no_candidates | failed | discarded | promoted`.
  - `startJob(jobId)` arranca el polling (`GET .../ai/jobs/:id` cada 5 s, tope 5 min).
  - `clearUploadState()` vuelve a `idle`.
- Proyecto y Science Program se leen de `BilateralCreationService.selectedProject()`
  y `.selectedPrimarySp()`; sin ambos el submit avisa y no envía.
- Endpoint: `POST api/bilateral/center/ai/jobs` vía
  `BilateralApiService.POST_bilateralAiJob(FormData)` → `{ jobId, jobStatus }`, HTTP 202.
  Campos del FormData: `project_id`, `center_id` (= `project.leadCenter.id`),
  `program_code`, `text?`, `documents[]`, `audio[]`.

## Dónde se usa
- `src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html:31`
  — solo cuando `selectedReportingWay() === 'ai'`.
- `…/bilateral-result-creator.component.ts:211` — al elegir la vía "ai" llama
  `clearUploadState()`. **Ese es el único reset del estado en toda la app.**

## Límites (P2-3437 #5) — el servidor manda
Espejo obligatorio de
`onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-file-storage.service.ts`:

| Regla | Servidor | Constante local |
|---|---|---|
| Tamaño por fichero | `:19` `25_000_000` bytes | `MAX_FILE_SIZE` |
| Nº de fuentes | `:20` `maxSources = 6`, contado en `:28` como `documents + audio + (text ? 1 : 0)` | `MAX_SOURCES` |
| Longitud del texto | `:59` `> 50_000` chars → 400 | `MAX_TEXT_LENGTH` |
| Extensiones | `:50-52` | `DOCUMENT_EXTENSIONS` / `AUDIO_EXTENSIONS` |

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`25_000_000` es decimal, no `25 * 1024 * 1024`.** Un fichero de 25 MiB
  (26.214.400 B) pasaría el cliente y el servidor lo rechazaría igual.
- ⚠️ **El texto de contexto cuenta como una fuente.** Antes el cliente contaba
  6 ficheros *sin* el texto y el servidor devolvía 400 con 6 ficheros + texto.
- ⚠️ **El HTML no renderiza nada para `completed`, `promoted` ni `discarded`.**
  Hoy no es alcanzable porque el creador limpia el estado al entrar a la vía
  "ai", pero cualquier ruta nueva que monte este componente sin pasar por ahí
  verá una pantalla en blanco.
- El `CreateBilateralAiJobDto` del servidor **no se valida**: no hay
  `ValidationPipe` global ni en `BilateralAiController`, así que sus
  `@IsInt()`/`@MaxLength()` son decorativos. Quien valida de verdad es
  `validateSources()`.
- `crypto.randomUUID()` no existe en jsdom → el spec lo stubea en `beforeAll`.
- El SCSS de esta carpeta usa hex crudo de punta a punta (heredado); los estilos
  nuevos siguen esa paleta local en vez de `colors.scss` para no quedar mixtos.

## Pendiente
- El error de `POST` sin `jobId` en la respuesta deja `uploadState` en
  `uploading` sin spinner. No bloquea (la tarjeta sigue visible), no tocado.
