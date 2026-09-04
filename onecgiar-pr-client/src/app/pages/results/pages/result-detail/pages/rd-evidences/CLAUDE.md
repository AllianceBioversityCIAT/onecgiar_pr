# rd-evidences

**Verified:** 2026-09-03 · branch qa-development-2026-ss · attempt 4 (density/UX pass: default source selection, tightened spacing)

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
- ⚠️ **`.evidence_modal` — single-scroll structure (bugfix/evidence-modal-sticky-actions, attempt 2,
  EVM-DD-2).** Attempt 1 used `position: sticky` on `.modal_header`/`.buttons` anchored against
  `.evidence_modal`'s own `overflow-y: auto`. It passed review and a tiny-viewport check, but broke
  at a real desktop width (~1911×952): the outer `.pr-dialog` (its OWN independent
  `max-height:90vh; overflow:auto`) turned out to be the scrolling ancestor that actually moved
  whenever `.evidence_modal`'s content fit inside its own 85vh — `position: sticky` only reacts to
  its *own* nearest scrolling ancestor, and that wasn't the one moving. Two independently-capped
  scroll containers stacked on top of each other is inherently ambiguous; tuning z-index/offsets
  cannot fix that. **Current structure (DD-2):** `.evidence_modal` keeps `max-height: 85vh` as a
  size cap but is `overflow-y: hidden` — it is NOT a scrolling ancestor. `<app-evidence-item>` is
  wrapped in `.modal_body` (`flex: 1; min-height: 0; overflow-y: auto`) — the ONLY scrolling
  element in the whole popup subtree. `.modal_header` and `.buttons` are plain, non-scrolling flex
  children with no `position: sticky`. Don't reintroduce sticky positioning here, and don't move
  `overflow-y: auto` off `.modal_body` onto `.evidence_modal` again — that's exactly the ambiguity
  that broke attempt 1.
- ⚠️ **`.evidence_modal`'s `max-height` is `min(85vh, calc(100vh - 260px))`, NOT plain `85vh`
  (bugfix/evidence-modal-sticky-actions, attempt 3, buffer trimmed 300→260 in attempt 4).**
  `.pr-dialog-mask` centers the dialog against the full viewport, but the app shell's own sticky
  header (`app.component.scss` `.app-shell-header` — search bar + the test-environment banner, up
  to ~108px together) can render **visually above** a deeply-nested `position:fixed` dialog
  **regardless of z-index** — confirmed live: raising `.pr-dialog-mask`'s z-index to 999999 changed
  nothing. This is a Chromium compositing quirk with `position:sticky` ancestors, not a
  stacking-context bug fixable by CSS `isolation`/`transform` tricks (all tried, none worked) —
  `pr-dialog` renders inline in the component tree rather than via a true portal to
  `document.body`, which is the underlying reason it's exposed to this at all, but that's a
  `pr-dialog`-level architecture question, out of scope here. **The fix that DOES work:** never let
  the popup grow tall enough for its centered top edge to reach into that region — `calc(100vh -
  260px)` keeps ≥120px of clearance above the mask's centered top edge on any viewport, comfortably
  above the ~108px worst case. Don't revert this to plain `85vh` — that's exactly the regression a
  user caught live (title/close ✕ rendering behind the app's top banner, full page width, not a
  small-viewport artifact).
- ⚠️ **`evidencesType`'s `id`s MUST match `evidence.is_sharepoint`'s type (boolean), not `0`/`1`**
  (bugfix/evidence-modal-sticky-actions, attempt 4, `evidence-item.component.ts`). `pr-radio-button`
  checks an option via strict equality (`value === option[optionValue]`); a numeric `id` never
  matches a boolean `is_sharepoint` default/value, so **neither** "Link" nor "Upload file" ever
  showed as selected, even though `draftEvidence = { is_sharepoint: false }` already intended "Link"
  to be the default — a real, if silent, pre-existing bug. Now `{ id: false, name: 'Link' }` /
  `{ id: true, name: 'Upload file' }`. `cleanSource(e)`'s `if (e) / else` still works unchanged
  (boolean truthiness matches the old numeric truthiness for 0/1 exactly).
- ⚠️ **`.field_card`'s global `margin: 20px 0` (`src/styles/field-card.scss`, shared by
  pr-input/pr-textarea/pr-radio-button app-wide) STACKS with `.evidence_fields`'s own `gap` instead
  of being replaced by it** — two adjacent fields ended up `20px + gap + 20px` apart, by far the
  biggest single contributor to this popup needing so much scroll (measured: ~858px→~730px natural
  content height after tightening `.evidence_fields`'s gap to 16px and `.evidence_modal`'s gap to
  20px; `.field_card`'s margin was the remaining, larger offender). Fixed via a **scoped**
  `::ng-deep .field_card { margin: 4px 0; }` inside `.evidence_item.embedded` in
  `evidence-item.component.scss` — the global file is untouched, so every other `.field_card`
  consumer app-wide keeps its normal 20px margin; only this popup's (and any other `embedded` usage
  of `evidence-item`, e.g. an accordion body, if one exists) fields tightened.
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
