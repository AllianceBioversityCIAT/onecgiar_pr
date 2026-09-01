# rd-evidences

**Verified:** 2026-09-01 · branch performance-refactor · a0024ade8

## Qué es
Sección 4 (última) del detalle de resultado: la lista de evidencias (links o ficheros subidos a
SharePoint) que respaldan el resultado. Se muestra para **todos** los tipos de resultado y en ambos
portafolios; es la única sección específica de tipología que ve un Other Outcome (tipo 4), porque
ese tipo no tiene página propia en `rd-result-types-pages/`.

## Contrato
- `RdEvidencesComponent.evidencesBody: EvidencesBody` — fuente de verdad en memoria; se rehidrata
  entera desde `GET /api/results/evidences` en `getSectionInformation()`.
- `sectionLoading: signal<boolean>` — pinta el skeleton de sección.
- `isSaving: boolean` (plano, NO signal) — sólo alimenta `isEvidenceUploading()`.
- Endpoints vía `ResultsApiService`: `GET_evidences`, `POST_evidences`
  (`POST /api/evidences/create/:resultId`, multipart), `POST_createUploadSession`,
  `GET_loadFileInUploadSession`, `PUT_loadFileInUploadSession`.
- `POST_evidences` ya lleva `saveButtonSE.isSavingPipe()` dentro del servicio API
  (`results-api.service.ts:367`): el spinner global y los toasts de éxito/error **no** se disparan
  aquí, se disparan allí. No los dupliques.
- Hijo: `evidence-item/` — el formulario de una evidencia; se usa embebido (`[embedded]="true"`)
  dentro del modal de creación/edición, nunca suelto.
- **P2-3262 — guidance behind ONE ⓘ, Policy change only.** `policyChangeGuidanceAsTooltip()` gates it;
  when true the grey `app-alert-status` is not rendered and `policyChangeEvidenceGuidance()`
  (Part 1 = `alertStatus()` + Part 2 = the policy block) is published into
  `DataControlService.currentResultSectionGuidance`, which the result-detail shell paints next to the
  section name. An `effect` on `currentResultSignal` republishes it (the result lands after this
  section mounts, and changes again on a phase switch); `ngOnDestroy` clears it. The stage-specific
  paragraph needs `policy_stage_id`, which lives in another section, so this one calls
  `GET_policyChanges()` — once per result, only when the gate is true.
  The copy inside `policyChangeSpecificGuidance()` is **verbatim from the requirement document**
  (restored 28-Aug-2026): the note paragraph and the 11 bullets are quoted, not paraphrased. Only the
  four `<strong>` group headings are the code's own. Do not "tidy" the wording, the commas or the en
  dash — `rd-evidences.component.spec.ts` locks one bullet per group and the note paragraph.

## Dónde se usa
- `src/app/shared/routing/routing-data.ts:411` — ruta `evidences`, sin `portfolioAcronym`, así que
  aparece en P22 y P25.
- `rd-evidences.component.html:110` — `app-section-bottom-bar` con `(clickSave)="onSaveSection()"`.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **P2-3262 is gated on the PHASE YEAR, never on the portfolio.** It reuses
  `FieldsManagerService.isReportingFormGuidance2026()` (threshold
  `ReportingDesignYear.ReportingFormGuidanceRedesign`), the same gate P2-3201 used to move field
  guidance into ⓘ tooltips. `isP25()` answers "which portfolio" and is NOT a substitute: prtest holds
  2025-phase results inside P25, and a portfolio gate would rewrite their form.
- ⚠️ **CLARISA policy stage ids are hardcoded** in `POLICY_STAGE_NUMBER_BY_ID` (6/7/8 → stages 1/2/3,
  verified live 27-Aug-2026). Deliberate: injecting `PolicyControlListService` here would fire two
  CLARISA GETs for EVERY result type, since this section renders for all of them. If CLARISA ever
  renumbers the stages, the tooltip silently falls back to listing both stage requirements.
- 🥇 **La subida a SharePoint ya NO vive aquí: la hace `SharePointUploadService`**
  (`shared/services/sharepoint-upload/`, P2-3220). `loadAllFiles()` es ahora una llamada al servicio
  con las opciones de esta sección (`skipAlreadyUploaded: false` porque aquí sí se re-sube lo que ya
  tiene `link`, y `trackProgress: true` porque hay barra). **No vuelvas a llamar a
  `POST_createUploadSession` / `PUT_loadFileInUploadSession` desde un componente**: el servicio existe
  para que un formulario nuevo no pueda elegir la puerta equivocada — había dos
  (`POST_createUploadSession` y `POST_createUploadSessionP25`).
- ⚠️ **`POST_createUploadSession` resuelve con el SOBRE, no con la URL** (`{ response, message,
  status }`, `share-point.service.ts` → `ReturnResponseUtil.format`). Sin desestructurar, el PUT
  recibe un objeto convertido a string y **la subida falla siempre**. Le pasó al gemelo bilateral y
  estuvo invisible porque su spec mockeaba la cadena pelada. **Ahora lo resuelve el servicio y su
  spec lo bloquea para las tres superficies a la vez** — ya no hay que acordarse en cada una.
- ⚠️ **`loadAllFiles()` NO se traga los errores: devuelve los nombres de los ficheros que fallaron**
  (P2-3220). `onSaveSection` los convierte en una alerta explícita. La sección **sí** se guarda igual
  —el fichero también viaja en el multipart de `POST_evidences`— pero una evidencia sin `link` ni
  `sp_*` no está en SharePoint, y el usuario tiene que saberlo. No devolver a un `catch` mudo.
- ⚠️ **`isSaving` es un latch.** Sólo lo baja `getSectionInformation()`, que únicamente corre si el
  POST fue bien. Si el POST falla, el flag se queda en `true` y `isEvidenceUploading()` deja
  cualquier evidencia de fichero sin link mostrando el skeleton de "subiendo" hasta que se recargue
  la página. Arreglado en P2-3373 con un `error:` en el `subscribe` — **no lo quites**, hay dos
  tests candado en `rd-evidences.component.spec.ts` (`describe('onSaveSection')`).
- ⚠️ **Confirmar en el modal guarda la sección entera.** `confirmCreateEvidence()` y
  `deleteEvidenceWithConfirm()` llaman a `onSaveSection()`. Si el POST falla, la tarjeta ya está
  pintada en la lista (se hizo `unshift` antes de guardar) y parece guardada; sólo la avisa un toast
  de error que dura medio segundo. Al recargar, desaparece.
- **Dependencia con General information:** un Impact Area con score 2 obliga a una evidencia
  etiquetada con ese tag; el aviso lo pinta `validateCheckBoxes()`. Si el usuario baja el score, el
  aviso desaparece pero el tag ya puesto en la evidencia **se queda** — no se limpia.
- `tagFields` mapea `youth_related` → etiqueta "Climate adaptation and mitigation". El nombre del
  campo y la etiqueta no coinciden a propósito (herencia del formulario viejo). No lo "corrijas".
- Tope de 6 evidencias: el botón `Add evidence` se oculta al llegar, no se deshabilita.

## Pendiente
- **P2-3262 leaves one case unspecified:** the ticket never says what the tooltip should show BEFORE
  a stage is picked (the stage lives in the Policy change information section). Both stage
  requirements are listed then, so the guidance is never empty. Flagged, not invented.
- Sin timeout HTTP en el cliente: si el backend acepta el POST y nunca responde, el botón se queda
  en "Saving…" para siempre. Es transversal a todas las secciones, vive en
  `custom-fields/save-button/save-button.service.ts`, no aquí. Reportado desde P2-3373.
