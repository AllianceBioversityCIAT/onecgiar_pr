# feedback (server)

**Verified:** 2026-09-03 · branch performance-refactor

## Qué es
Endpoints que respaldan el botón 🐛 de la plataforma: crear un reporte como issue de Jira bajo el
epic de feedback, y **leer de vuelta** los reportes de quien pregunta. Ticket: P2-3472.

🥇 **No guarda NADA en base de datos** (decisión de Yeck, 3-sep-2026). Los reportes de una persona
se resuelven en vivo por JQL, no por ids nuestros.

## Contrato
Todo bajo `/api/feedback`, protegido por el middleware `auth` global.

| Ruta | Qué hace |
|---|---|
| `POST /` | Crea el issue. Body: `{type, title, description, contextUrl?, userAgent?, priority?, attachments?, consoleLogs?}` |
| `GET /my-reports` | Los reportes del usuario del token, resueltos por JQL |
| `GET /similar?q=` | Hasta 5 reportes parecidos, para no duplicar |
| `POST /me-too` | `{issueKey}` — añade al usuario a un reporte existente en vez de duplicarlo |

- `type` → issuetype: **bug=10003 (Bug)**, **adjustment=10105 (Enhancement)**.
- `parent` = `JIRA_FEEDBACK_EPIC_KEY`; `reporter` = `JIRA_FEEDBACK_REPORTER_ID` (Ángel).
  🛑 **El reporter no puede ir vacío**: es campo de sistema de Jira. Si se omite, queda el dueño
  del token (JC). No aparece en `createmeta` y aun así se acepta, por el permiso MODIFY_REPORTER.
- Metadata que se completa (elegida por Yeck): `priority` (el usuario la elige, 1–5),
  **Digital Tools** `customfield_10521` = `10215` (*Reporting Tool*), y tres `labels`.

## Los tres labels — son el índice, no decoración
1. `user-feedback-in-app` — todo lo que entró por el botón.
2. `fb-<local-part del correo>` — la persona, sin persistir ids.
3. `fb-env-{production|testing|local|other|unknown}` — **de qué ambiente vino** (Yeck lo pidió),
   derivado del host de `contextUrl`: `reporting.cgiar.org`=prod, `prtest*`=testing.

## Cómo se leen los reportes de una persona
`parent = <epic> AND (description ~ "<email>" OR comment ~ "<email>")`. El correo ya viaja en el
bloque de contexto de la descripción, y el comentario de `me-too` es lo que hace que un reporte al
que se sumó también le aparezca. **Verificado el 3-sep: JQL acepta `comment ~`.**

`toPublicReport()` es una **whitelist deliberada**: key, título, tipo, etapa, released, fechas.
🛑 Comentarios internos, assignee y actividad **no salen** — eso es del equipo (Yeck).
`PUBLIC_STAGE_BY_STATUS` traduce los diez estados del tablero a cinco frases que el usuario
entiende (*Received*, *Being worked on*, *Fixed — waiting for the next release*, …).

## Adjuntos y consola
- Las imágenes llegan **en base64 dentro del JSON** (`main.ts` admite 50mb, así que no hace falta
  multer) y se suben a `/issue/{key}/attachments` con `X-Atlassian-Token: no-check` y `FormData`
  nativo de Node 22. Máx 5 archivos, 10MB cada uno, solo `image/*`.
- Los errores de consola van a una **subtarea interna** (`Task`, id 10002 — el único subtask de
  P2). Cuelga del issue, **no** del epic, así que nunca aparece en la lista del usuario.
- 🥇 **Ni los adjuntos ni la subtarea pueden fallar el request**: el reporte ya existe, y al usuario
  no se le dice que falló porque un extra no subió. Cada uno reporta si lo logró.

## Env (server/.env — NO versionado)
`JIRA_BASE_URL`, `JIRA_EMAIL_JC`, `JIRA_TOKEN_JC`, `JIRA_FEEDBACK_PROJECT_KEY` (P2),
`JIRA_FEEDBACK_EPIC_KEY` (P2-3472), `JIRA_FEEDBACK_REPORTER_ID`.
Sin credenciales → 503 (no revienta el arranque). **En prtest están puestas.**

## Verificado en prtest (3-sep-2026)
Extremo a extremo desde la interfaz: `P2-3561` (Bug) y `P2-3562` (Adjustment → Enhancement), los
dos hijos de `P2-3472`, reporter Ángel, con el contexto auto tomando al usuario del token. Ambos
**borrados** después (Yeck: esto no se maneja con actividades de Jira). El borrado necesitó el
token de JC — el de Yeck da 403 en este proyecto.

## Trampas (⚠️ = ya rompió algo)
- El summary de Jira corta a 255 chars → se trunca en el service.
- La descripción va en **ADF** (`type:doc`), no markdown.
- ⚠️ **NUNCA loguear el token**: el catch solo registra `errorMessages`/`errors` de Jira.
- ⚠️ Un `blocked by CORS` al probar esto suele ser **el ambiente caído**, no CORS: el preflight
  recibe el 503 de Apache, que no trae cabeceras. Con el ambiente vivo, `OPTIONS` → `204`.

## Tests
`feedback.service.spec.ts` — 9 casos del flujo de creación. 🟡 Las rutas nuevas
(`my-reports`, `similar`, `me-too`), los labels, los adjuntos y la subtarea **aún sin cubrir**.
