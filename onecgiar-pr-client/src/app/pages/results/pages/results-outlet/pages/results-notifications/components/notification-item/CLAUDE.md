# notification-item

**Verified:** 2026-08-27 · branch performance-refactor · 6407a50fa

## Qué es
Una tarjeta de la lista de notificaciones (Notifications → Requests → Received / Sent). Muestra una
solicitud de contribución y, cuando no es `[isSent]="true"`, los botones **Accept contribution** /
**Decline contribution**.

## Contrato
- Inputs: `notification` (fila cruda de `GET /api/results/request/get/received|sent`), `isSent`.
- Output: `requestEvent` — el padre refetchea la lista; se emite en `finalize`, es decir **después**
  del handler `next`, y destruye esta instancia (`@for … track $index`).
- La decisión se graba con `ResultsApiService.PATCH_updateRequest(body, isP25)` →
  `PATCH {api|v2/api}/results/request/update`.
- `openTocMappingModal()` **no acepta nada**: solo hidrata estado global
  (`dataControlSE.currentResult`/`currentResultSignal`, `resultLevelSE`, `retrieveModalSE`,
  `resultsSE.currentResultId`, `dataControlSE.currentNotification`, `shareRequestModalSE.shareRequestBody`)
  y pone `dataControlSE.showShareRequest = true`. El modal vive en `app.component.html:63`, por eso
  sobrevive al refresco de la lista.

## Dónde se usa
- `.../results-notifications/pages/requests/pages/received/received.component.html` — con botones.
- `.../results-notifications/pages/requests/pages/sent/sent.component.html` — `[isSent]="true"`, sin botones.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`is_map_to_toc` NO significa "ya está mapeado a ToC".** Es el TIPO de solicitud, sellado al
  crearla: `true` = el mapeo de ToC viajó CON la solicitud (server `share-result-request.service.ts:253`,
  desde `createTocShareResult.isToc`, que solo envía `share-request-modal onRequest()`); `false` = no
  vino mapeo. Las solicitudes **bilaterales siempre nacen con `false`** (server `results.service.ts:4320`,
  `_updateContributingInitiatives`). Usarlo como "ya mapeó" es el error que originó P2-3187.
- ⚠️ **El PATCH de accept tolera la ausencia de ToC solo por accidente.** El server desreferencia
  `result_toc_result.result_toc_results` en `approveRequest`/`approveRequestV2` cuando `is_map_to_toc`
  es `false`; sin ese campo lanza un TypeError que el `try/catch` de ese mismo método se traga, ya
  después de persistir el estado. Por eso el cliente manda un payload inerte explícito
  (`{ planned_result: null, result_toc_results: [] }`). No quitarlo.
- ⚠️ **El modal opcional NO muestra campos de ToC para bilateral.** `share-request-modal.component.html:74`
  lleva `[hidden]="isBilateralResult"` sobre `<app-cp-multiple-wps>` (decisión deliberada de P2-2498,
  commit `652144b4e`) y `<app-toc-initiative-out>` está gated a `!isP25()`. Las bilaterales son P25 →
  solo quedan el select deshabilitado y la pregunta Sí/No de alineación. Hueco de requisito de AC4,
  no de código.
- ⚠️ **NO reabrir el modal después de aceptar.** Parece la forma obvia de terminar el AC4 de P2-3187 y
  es una trampa triple: el paso saldría **vacío** (ver el bullet de `[hidden]` de abajo), completarlo
  dispara un **segundo** PATCH con `request_status_id: 2`, y si el usuario responde "Sí" a la pregunta
  de alineación queda **atascado** — `validateAcceptOrReject` exige un `toc_result_id` que ningún
  control visible puede rellenar. Hay un test que lo bloquea a propósito
  (`does NOT open any follow-up step after accepting`). Se implementó y se retiró el 27-ago-2026 tras
  una revisión adversarial.
- ⚠️ `invalidateRequest()` es true mientras `requestingAccept` es true, y `finalize` corre **después**
  de `next`: cualquier cosa que se llame desde el handler `next` no puede pasar por `mapAndAccept()`.
- ⚠️ **`invalidateRequest()` deshabilita AMBOS botones** para no-admin cuando
  `obj_result.obj_version.id != reportingCurrentPhase.phaseId` y `obj_result.status_id != 3`. En prtest
  todas las bilaterales pendientes viven en la fase cerrada 34 → un no-admin no puede aceptar ninguna.
  Es preexistente: QA necesita una bilateral en la fase abierta o cuenta admin.
- ⚠️ **La versión del endpoint (v1/v2) sale de estado global sucio, y arreglarlo rompe notificaciones.**
  `fieldsManagerSE.isP25()` lee `dataControlSE.currentResultSignal()?.portfolio`, que **nada en esta
  pantalla setea** (arranca `signal({})`) — salvo `openTocMappingModal()`. Consecuencia: el accept
  directo va a **v1** en sesión fresca y a v2 si el usuario ya había abierto un resultado P25; el
  **decline nunca pasa por el modal** (`html:272` llama directo a `acceptOrReject(false)`), así que hoy
  siempre va a v1. Y **solo v1 emite la notificación de decisión al lead centre**
  (`share-result-request.service.ts:1053`, `emitContributionDecisionNotification`; la V2 no la tiene).
  🛑 Se intentó derivarlo del portafolio de la notificación el 27-ago-2026 y **se revirtió**: habría
  mandado los DECLINE de P25 a v2 y el lead centre habría dejado de recibir esa notificación en
  silencio. Que el lead centre deba recibirla o no es decisión de producto (P2-3188), no un arreglo
  técnico. Anotado en P2-3187.
- `source_name` es un campo **derivado** en `getRequest()` del server (`source === 'Result' ? 'W1/W2' : 'W3/Bilaterals'`),
  no una columna. Si cambia ese mapeo, `acceptsWithoutToc` vuelve en silencio al flujo viejo.

## Pendiente / Coming soon
- **AC4 de P2-3187 NO está construido**, a propósito: dónde vive el paso opcional de mapeo a ToC para
  una bilateral P25 (el modal actual no tiene campos). Pregunta de producto, no se inventó aquí.
- Cuál versión del endpoint debe usar el accept/decline, y si el lead centre debe recibir la
  notificación de decisión (P2-3188). Hoy es accidental; ver la trampa de `isP25()`.
