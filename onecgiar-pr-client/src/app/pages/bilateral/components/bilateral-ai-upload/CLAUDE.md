# bilateral-ai-upload

**Verified:** 2026-09-29 · branch JuanGuzman-io/p2-3853-jira-understanding · P2-3853 (post-execution fix)

## Qué es
Paso "AI" del creador de resultados bilaterales: el usuario sube documentos,
audio (o graba una nota de voz) y/o escribe contexto, y se dispara un job de
minería de texto. **`AIQ-T-7` (2026-09-29): el formulario nunca se bloquea ni se
sustituye.** El job pasa a vivir en la lista de `BilateralAiService`
(`jobs()`/`summary()`), no en este componente.

## Contrato
- **Dos outputs:**
  - `(chooseAnotherProject)`, emitido cuando el usuario descarta la
    tarjeta de confirmación con ese botón. El host decide qué hacer (el creador
    reinicia el wizard: proyecto/SP/vía).
  - `(openedAiProcesses)` (P2-3853), emitido desde `onOpenAiProcesses()` —
    o sea, tanto el botón **Open AI processes** de la tarjeta de confirmación
    COMO la acción **View** del toast, que ahora llama a `onOpenAiProcesses()`
    en vez de a `bilateralAiService.openDrawer()` directamente. Un host que es
    a su vez un drawer (`bilateral-manual-create-drawer-host`) lo escucha para
    cerrarse ANTES de que el diálogo "AI processes" se abra encima — nunca dos
    paneles apilados. El host del wizard (`bilateral-result-creator`) no
    escucha este output: no tiene nada que cerrar, así que su comportamiento
    (abrir el drawer y quedarse en el wizard) no cambia.
- Todo el estado compartido vive en `BilateralAiService`
  (`../../services/bilateral-ai.service.ts`), inyectado como singleton root.
  - `uploadState()` ya **NO** es la fuente de verdad del job — sólo de ESTE
    envío: `idle | uploading` en la práctica (el tipo conserva los estados
    viejos para otros llamadores del servicio, p. ej. `promoteDraft`/
    `discardDraft`, que este componente no lee).
  - `addSubmittedJob(response)` inserta el job recién creado en la lista de
    inmediato (`AIQ-R-7` B "the new job appears in the drawer at once").
  - `openDrawer(jobId?)` abre el panel "AI processes" (`AIQ-T-8`), resaltando
    ese job si se pasa uno.
  - `clearUploadState()` sólo vuelve **este envío** a `idle` — ya no toca
    ningún campo de job (`AIQ-DD-11`).
- **El formulario se renderiza SIEMPRE** (`AIQ-R-7` A/B) — nunca hay un
  `@if` que lo sustituya por un panel de progreso. El panel de un solo job
  (`app-ai-processing-panel`) fue borrado por `AIQ-T-10` (`AIQ-DD-8`); el
  drawer "AI processes" (`ai-job-card`, `AIQ-T-8`) es la única superficie hoy.
- **Al enviar (202):** `addSubmittedJob(response)`, el formulario se resetea
  (ficheros + texto vacíos), se muestra una tarjeta de confirmación
  ("`<project>` was added to the AI queue" + **Open AI processes** + **Choose
  another project**) y un toast con acción **View** que abre el drawer. Ambos
  botones de la tarjeta la descartan; "Open AI processes" además llama
  `openDrawer()`. Copy centralizado en
  `internationalization/bilateral-ai-processes.copy.ts`.
- **Si el envío falla:** el formulario conserva ficheros y texto
  (`handleUploadError`, sin cambios) y no se añade ningún job.
- **`?job=`** (deep link del email de fallo, P-23, productor en
  `bilateral-ai-notifications.service.ts:183-186`): `ngOnInit` lee
  `route.snapshot.queryParams['job']` y llama `openDrawer(jobId)` — sin
  importar dónde esté montado este componente. El creador (host habitual)
  también reacciona a `?job=` por su cuenta (selecciona la vía "ai" y llama
  `openDrawer` una sola vez desde su propia suscripción a `queryParams`, no
  desde un `effect()` — ver `bilateral-result-creator.component.ts`).
- Proyecto y Science Program se leen de `BilateralCreationService.selectedProject()`
  y `.selectedPrimarySp()`; sin ambos el submit avisa y no envía.
- Endpoint: `POST api/bilateral/center/ai/jobs` vía
  `BilateralApiService.POST_bilateralAiJob(FormData)` → `{ jobId, jobStatus }`, HTTP 202.
  Campos del FormData: `project_id`, `center_id` (= `project.leadCenter.id`),
  `program_code`, `text?`, `documents[]`, `audio[]`.

## Dónde se usa
- `bilateral-result-creator.component.html:35` — sólo cuando
  `selectedReportingWay() === 'ai'`; escucha `(chooseAnotherProject)` para
  reiniciar el wizard.
- `bilateral-manual-create-drawer-host.component.html:99-101` — montado dentro
  del drawer de creación manual, montado una sola vez en el shell bilateral
  (`bilateral.component.html`, `ARM-T-2` / `ARM-DD-1`). **P2-3853 (post-execution
  fix):** aquí `chooseAnotherProject` SÍ tiene listener, `flow.closeDrawer()` —
  el proyecto del drawer es fijo (lo pone la tarjeta que lo abrió), así que
  "Choose another project" cierra el drawer entero para volver al catálogo de
  proyectos, en vez de solo descartar la confirmación. Mismo listener que
  `(openedAiProcesses)="flow.closeDrawer()"` — `closeDrawer()` es el método de
  cierre ya existente de `BilateralManualCreateFlowService` (el mismo que usa
  `onDrawerClosed()`, el botón X del drawer); no se inventó un mecanismo nuevo.
  `closeDrawer()` no toca `BilateralCreationService.selectedProject()` —
  igual que el botón X, así que no queda selección obsoleta: la próxima vez
  que se abra el drawer viene de `beginFromProject()`, que llama
  `selectProject()` con el proyecto nuevo.
- `…/bilateral-result-creator.component.ts` — al elegir la vía "ai" llama
  `clearUploadState()`. **Ese es el único reset explícito del estado del envío.**

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
- ⚠️ **`AIQ-T-7` retiró el reloj de 1 s y el rango esperado de este componente**
  junto con `app-ai-processing-panel` — ambos vivían aquí sólo para alimentar
  el panel de un solo job. Si algo necesita el rango esperado por mezcla de
  fuentes hoy, es responsabilidad de `ai-job-card` (`AIQ-T-8`), no de este
  componente.
- El `CreateBilateralAiJobDto` del servidor **no se valida**: no hay
  `ValidationPipe` global ni en `BilateralAiController`, así que sus
  `@IsInt()`/`@MaxLength()` son decorativos. Quien valida de verdad es
  `validateSources()`.
- `crypto.randomUUID()` no existe en jsdom → el spec lo stubea en `beforeAll`.
- El SCSS de esta carpeta usa hex crudo de punta a punta (heredado, sólo la
  parte del formulario). La tarjeta de confirmación nueva es Tailwind +
  `var(--pr-*)` en el template, sin tocar ese SCSS (regla del cliente:
  Tailwind-first, no ampliar SCSS legado).

## Pendiente
- El error de `POST` sin `jobId` en la respuesta deja `uploadState` en
  `uploading` sin spinner. No bloquea (la tarjeta sigue visible), no tocado.
