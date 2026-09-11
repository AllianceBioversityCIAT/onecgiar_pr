# submissions

**Verified:** 2026-09-03 · branch performance-refactor

## Qué es
`POST /api/results/submissions/...` — el Submit de un resultado. Valida permisos, escribe la fila de
`submission` con `status_id = 3` y **dispara los correos de propiedad intelectual** cuando toca.

## 🥇 Los textos de los correos VIVEN EN LA BASE, no en el repo
Tabla `template`, una fila por `name` (enum `EmailTemplate`), renderizada con handlebars. El cuerpo
se cambia **con una migración**, y hay cuatro precedentes que hacen `UPDATE` de la misma fila:
`1764594729968` (insert original, `created_by = 977`), `1765805047192`, `1771276023098`,
`1771381453824`.

- 🛑 **`UPDATE` de esa fila cambia el correo de TODAS las fases a la vez.** Hay una sola fila por
  nombre. Por eso P2-3272 metió **filas nuevas** (`…_2026`) y dejó la vieja intacta: el cuerpo viejo
  describe las cuatro preguntas de IPR, que en el formulario de 2025 **sí existen y se responden**, y
  un resultado de 2025 todavía se puede enviar.
- La selección va por **`phase_year`**, nunca por portafolio (P25 contiene 2025 y 2026).
- ⚠️ Si el HTML se pasa **como parámetro enlazado** (`?`), las comillas simples van sencillas. Las
  `''` de las migraciones viejas eran escape de SQL **en línea**; copiarlas a un parámetro deja
  `''Poppins''` literal en el CSS y rompe la fuente del correo.

## Los dos correos de IP (P2-3272 / P2-3513)
| Plantilla | A quién | Desde |
|---|---|---|
| `email_template_ip_experts_support` | IP focal point del lead center | siempre (fases ≤ 2025) |
| `email_template_ip_experts_support_2026` | igual, con la redacción nueva | fase ≥ 2026 |
| `email_template_ip_support_confirmation_2026` | **Lead Contact Person** | fase ≥ 2026 |

- **Los destinatarios ya estaban resueltos** y no hacía falta trabajo: `intellectual_property_experts`
  tiene 25 personas en 16 centros (`1764359509232-IntellectualPropertyPopulation`), y
  `getIpExpertsEmailsByResultId` saca las del lead center del resultado.
- 🛑 **"Requesting user" NO es quien pulsó Submit.** Es el `lead_contact_person_id` de General
  Information, resuelto contra `ad_user`. `emailData.contactPerson` (el join a `submissions`) es el
  remitente del Submit y son personas distintas de forma rutinaria. Hay reserva al remitente para que
  el especialista nunca quede sin contacto.
- 🥇 **Nada del segundo correo puede tumbar un Submit.** Corre *después* de guardar la fila y después
  de los correos que el usuario sí espera; plantilla ausente, contacto ilegible o servicio de correo
  caído son `logger.warn`, jamás `throw`.
- El disparador es `getResultInnovationDevelopmentByResultId`, que ya ramifica por fase (opción
  legacy 110 para ≤ 2025, pregunta consolidada por texto para ≥ 2026).

## `getResultById` trae `phase_year`
Se añadió en P2-3272. La consulta **ya unía** con `version v`, así que fue una columna, no un join —
si necesitas la fase en cualquier consumidor de `getResultById`, ya está ahí.

## Trampas
- ⚠️ **La mutación que "sobrevive" puede no haberse aplicado.** Pasó aquí: prettier había puesto
  paréntesis alrededor de un `??`, la cadena del parche no coincidió y el reemplazo no hizo nada — con
  14 tests en verde pareciendo que el test era malo. **Todo parche de mutación lleva `assert` de que
  encontró su objetivo**, y si no, es instrumento roto, no producto sano.
- Los specs se construyen con `Object.create(SubmissionsService.prototype)` para saltarse el
  constructor, que toma once colaboradores. Copiar `submissions.service.ip-emails.spec.ts`.
- `_prepareEmailData` devuelve `null` cuando falta la plantilla, y el llamador **se calla y sigue**.
  Un correo que no sale no rompe nada visible: si hay que depurar, mirar los `warn` del logger.
