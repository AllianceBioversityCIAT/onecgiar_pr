# report-feedback-dialog

**Verified:** 2026-08-25 · branch P2-3472-feedback-report-module · d7636b02e

## Qué es
Modal global "Report a bug or adjustment" (solo texto, sin imagen — scope P2-3472).
Envía el reporte a `POST /api/feedback`, que crea el issue en Jira.

## Contrato
- Standalone. Visibilidad por `[(visible)]` (patrón del "Contact us" de `app.component.html`).
  El pr-dialog usa `@Input/@Output` clásico, NO `model()` → desde un signal host se liga
  con `[visible]="sig()" (visibleChange)="sig.set($event)"`, no `[(visible)]="sig"`.
- Estado interno con signals: `type`, `title`, `description`, `submitting`, `errorMsg`, `createdIssueKey`.
- Añade contexto auto al enviar: `window.location.href` + `navigator.userAgent`.
- API: `FeedbackApiService.POST_reportFeedback()` → `shared/services/api/feedback-api.service.ts`
  (`environment.apiBaseUrl + 'api/feedback'`).

## Dónde se usa
- `shared/components/shell-topbar/shell-topbar.component.html` — botón bug (icono `lucideBug`)
  en `.pr-topbar-right` abre `reportFeedbackOpen`; el `<app-report-feedback-dialog>` se monta al final.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ `[pr-dialog-footer]` NO puede ir dentro de `@if/@else` con más de un nodo raíz (NG8011):
  el footer va como **único nodo** fuera del if, alternando botones con `@if` adentro.
