# rd-evidences

**Verified:** 2026-08-26 · branch performance-refactor · cb0b954af

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

## Dónde se usa
- `src/app/shared/routing/routing-data.ts:411` — ruta `evidences`, sin `portfolioAcronym`, así que
  aparece en P22 y P25.
- `rd-evidences.component.html:110` — `app-section-bottom-bar` con `(clickSave)="onSaveSection()"`.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`isSaving` es un latch.** Sólo lo baja `getSectionInformation()`, que únicamente corre si el
  POST fue bien. Si el POST falla, el flag se queda en `true` y `isEvidenceUploading()` deja
  cualquier evidencia de fichero sin link mostrando el skeleton de "subiendo" hasta que se recargue
  la página. Arreglado en P2-3373 con un `error:` en el `subscribe` — **no lo quites**, hay dos
  tests candado en `rd-evidences.component.spec.ts` (`describe('onSaveSection')`).
- ⚠️ **Confirmar en el modal guarda la sección entera.** `confirmCreateEvidence()` y
  `deleteEvidenceWithConfirm()` llaman a `onSaveSection()`. Si el POST falla, la tarjeta ya está
  pintada en la lista (se hizo `unshift` antes de guardar) y parece guardada; sólo la avisa un toast
  de error que dura medio segundo. Al recargar, desaparece.
- ⚠️ **`loadAllFiles()` se traga los errores de subida** (`catch { console.error }`). Si falla la
  subida a SharePoint, la evidencia se envía igualmente al POST sin `link`. No hay aviso al usuario.
- **Dependencia con General information:** un Impact Area con score 2 obliga a una evidencia
  etiquetada con ese tag; el aviso lo pinta `validateCheckBoxes()`. Si el usuario baja el score, el
  aviso desaparece pero el tag ya puesto en la evidencia **se queda** — no se limpia.
- `tagFields` mapea `youth_related` → etiqueta "Climate adaptation and mitigation". El nombre del
  campo y la etiqueta no coinciden a propósito (herencia del formulario viejo). No lo "corrijas".
- Tope de 6 evidencias: el botón `Add evidence` se oculta al llegar, no se deshabilita.

## Pendiente
- Sin timeout HTTP en el cliente: si el backend acepta el POST y nunca responde, el botón se queda
  en "Saving…" para siempre. Es transversal a todas las secciones, vive en
  `custom-fields/save-button/save-button.service.ts`, no aquí. Reportado desde P2-3373.
