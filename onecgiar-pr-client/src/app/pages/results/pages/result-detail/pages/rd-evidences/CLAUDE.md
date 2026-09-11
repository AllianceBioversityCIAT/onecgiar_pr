# rd-evidences

**Verified:** 2026-09-10 · branch qa-development-2026-ss · UCA-T-8 (`docs/specs/changes/unsaved-changes-alert/`); prior: 2026-09-08 · 4343f19b1

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
  when true, `policyChangeEvidenceGuidance()` is published into
  `DataControlService.currentResultSectionGuidance` (an `effect` on `currentResultSignal`
  republishes on result/phase change; `ngOnDestroy` clears it). Needs `policy_stage_id` from another
  section, so it calls `GET_policyChanges()` once per result, only when the gate is true.
  The copy inside `policyChangeSpecificGuidance()` is **verbatim from the requirement document** — do
  not "tidy" the wording; `rd-evidences.component.spec.ts` locks it.

## Dónde se usa
- `src/app/shared/routing/routing-data.ts:453` — ruta `evidences`, sin `portfolioAcronym`, así que
  aparece en P22 y P25.
- `rd-evidences.component.html:122` — `app-section-bottom-bar` con `(clickSave)="onSaveSection()"`.

## `CanComponentDeactivate` (UCA-T-8)

Mismo patrón que `rd-geographic-location` (UCA-T-7): `SectionDirtyTrackerService` component-scoped.
Ver comentarios en el propio `.ts` para el detalle — no repetido aquí (`§3 COMPONENT-DOCS.md`):
contrato ~L38-44, snapshot de carga ~L259-265, `performSave()` ~L274-312, `onSaveSection()` ~L353-399.

- Snapshot al final real de `getSectionInformation()`, y otra vez dentro del `tap` de éxito de
  `performSave()` antes del reload — si el reload falla, la sección no queda "sucia" para siempre.
- `EvidencesCreateInterface.file` (`model/evidencesBody.model.ts`) va EXCLUIDO del dirty-diff
  (`dirtySnapshotTarget()`, UCA-OQ-2) — ver ese método para el porqué. Gap acotado: cambiar sólo el
  `File` adjunto no se reporta como "sucio".
- `canDeactivate: [UnsavedChangesGuard]` en la ruta INTERNA `{path: '', component: RdEvidencesComponent}`
  de `rd-evidences-routing.module.ts` — NO en la entrada `evidences` de `resultDetailRouting` (esa
  tiene `loadChildren` y ningún `component`; el guard se invoca ahí con `component: null` →
  `TypeError` en cada navegación. Bug cross-cutting corregido — ver
  `docs/specs/changes/unsaved-changes-alert/execution.md`).

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **`.evidence_modal` — single-scroll structure (bugfix/evidence-modal-sticky-actions, EVM-DD-2).**
  Caps height (`max-height: min(85vh, calc(100vh - 260px))` — NOT plain `85vh`, keeps ≥120px clearance
  under the fixed app-shell header, a Chromium compositing quirk) but is `overflow-y: hidden`, NOT a
  scrolling ancestor; `<app-evidence-item>`'s `.modal_body` is the ONLY scrolling element. Don't
  reintroduce `position: sticky` here or move `overflow-y:auto` onto `.evidence_modal` — attempt 1
  broke that way because `.pr-dialog`'s own scroll ancestor made sticky react to the wrong container.
- ⚠️ **`evidencesType`'s `id`s MUST match `evidence.is_sharepoint`'s type (boolean), not `0`/`1`**
  (`evidence-item.component.ts`) — `pr-radio-button` checks via strict equality, so a numeric `id`
  never matched the boolean default and neither option ever showed selected. Now `{ id: false, ... }`
  / `{ id: true, ... }`.
- ⚠️ **`.field_card`'s global `margin: 20px 0` (`src/styles/field-card.scss`) STACKS with
  `.evidence_fields`'s own `gap`** instead of being replaced — biggest contributor to popup scroll
  height. Fixed via a **scoped** `::ng-deep .field_card { margin: 4px 0; }` inside
  `.evidence_item.embedded` in `evidence-item.component.scss` — the global file, and every other
  `.field_card` consumer app-wide, is untouched.
- ⚠️ **Edit and delete are independently gated — do NOT recombine into one `.ev_actions` wrapper
  `*ngIf`** (`[SPEC:bugfix/knowledge-product-evidence-edit]`). Edit = `!readOnly && !status`;
  delete = that **plus** `!isKnowledgeProduct` (a shared wrapper previously blocked editing a KP's own
  evidence — the bug this split fixed). Also: `.ev_edit`/`.ev_delete` read the **injected**
  `dataControlSE`; `app-add-button` above reads `api.dataControlSE` — same singleton, different mocks.
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
- ⚠️ **`isSaving` es un latch** — sólo lo baja `getSectionInformation()` (corre si el POST fue bien).
  Si el POST falla, `isEvidenceUploading()` deja el skeleton de "subiendo" hasta recargar (P2-3373).
  Desde `UCA-T-8` el release en el camino de error vive en el `catchError` de `performSave()`, no en
  un `.subscribe({error})`. **No quites el `this.isSaving = false` de ahí** — dos tests candado en
  `describe('onSaveSection')` lo bloquean.
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
