# feedback (server)

**Verified:** 2026-08-25 · branch P2-3472-feedback-report-module · d7636b02e

## Qué es
Endpoint que recibe un reporte de bug/ajuste (solo texto) desde el front y crea
un issue en Jira bajo el epic de feedback (P2-3472). Ticket: P2-3472.

## Contrato
- `POST /api/feedback` (protegido por el middleware `auth` global — usuario logueado).
- Body `CreateFeedbackDto`: `{ type: 'bug'|'adjustment', title, description, contextUrl?, userAgent? }`.
- `type` → issuetype Jira: **bug=10003 (Bug)**, **adjustment=10105 (Enhancement)**.
- Crea con `parent: {key: JIRA_FEEDBACK_EPIC_KEY}` y `reporter: {id: JIRA_FEEDBACK_REPORTER_ID}` (Ángel).
- Autentica contra Jira con Basic `JIRA_EMAIL_JC:JIRA_TOKEN_JC` (token de Cadavid; permiso MODIFY_REPORTER).
- Respuesta: `{ response: { issueKey, issueUrl, type }, message, status: 201 }`.

## Env (server/.env — NO versionado)
`JIRA_BASE_URL`, `JIRA_EMAIL_JC`, `JIRA_TOKEN_JC`,
`JIRA_FEEDBACK_PROJECT_KEY` (P2), `JIRA_FEEDBACK_EPIC_KEY` (P2-3472),
`JIRA_FEEDBACK_REPORTER_ID` (Ángel: 712020:ed59efaa-46e7-439b-9dd1-702edad6bc10).
Sin credenciales → responde 503 (no revienta el arranque).

## Dónde se registra
- `src/app.module.ts` — `FeedbackModule` en `imports`.
- `src/api/modules.routes.ts` — `{ path: 'feedback', module: FeedbackModule }`.

## Trampas (⚠️ = ya rompió algo)
- El summary de Jira corta a 255 chars → se trunca en el service.
- La descripción va en **ADF** (`type:doc`), no markdown: el bloque de contexto auto
  (reporter, URL, navegador) se arma como bulletList.
- ⚠️ NUNCA loguear el token: el catch solo registra `errorMessages`/`errors` de Jira.

## Tests
- `feedback.service.spec.ts` — 9 casos (mapeo de tipos, parent/reporter, ADF+contexto,
  truncado, validaciones, 503 sin credenciales, error sin filtrar token). Mock de HttpService.
