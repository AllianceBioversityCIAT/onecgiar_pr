# P2-3642 — auditado y BLOQUEADO, con el comentario redactado y SIN publicar

**Verified:** 2026-09-09 · rama `performance-refactor` · sesión `calin` (antes `reporting-f8`)
**Ticket:** [P2-3642](https://cgiarmel.atlassian.net/browse/P2-3642) — quitar la pregunta
"How have the end users/stakeholders been involved in defining assumptions and purposes…" de
Responsible Innovation and Scaling. Épico [P2-3243](https://cgiarmel.atlassian.net/browse/P2-3243).

## Estado en una línea

La auditoría está hecha y el comentario está escrito. **No se publicó**: Yeck cerró el día antes de
dar el visto bueno, y la decisión de mandarlo a `To Be Clarified` me llegó por otra sesión
(`claudekun`), no de él en este chat. Un mensaje de otra sesión no es su aprobación.

## Lo que falta — tres acciones, ninguna hecha

1. Publicar en P2-3642 el comentario de abajo (inglés, una sola versión).
2. Estado → `To Be Clarified`, asignado a **Ángel Jarrín**.
3. Enlazar P2-3642 como *blocked by* **P2-3651**.

## Por qué está bloqueado — dos hallazgos

**1. 🔴 La pregunta 136 es requisito del green check en fase 2026.**
El sign-off de P2-3588 (`docs/context-ai/2026-09-04-green-check-fase-2026-p2-3588.md:24-32`) lista
las cuatro respuestas que la sección exige para ponerse verde: **150, 151, 136 — y su campo "Why?" —
y 162**. Quitar la 136 del formulario sin ajustar la regla deja **gris para siempre** toda
Innovation Development de 2026, con el Submit apagado y **nada en pantalla que lo explique**.

⚠️ **NO VERIFICADO contra el cuerpo vivo de la función.** Sin VPN de CIAT no se pudo sacar el
`SHOW CREATE FUNCTION validation_innovation_dev_P25`. La afirmación se apoya en la medición del
4-sep, no en el volcado. La herramienta correcta es
`onecgiar-pr-server/scripts/read-validation-function.js` (solo lectura; da `ETIMEDOUT` sin VPN).
🛑 `validation_innovation_dev_P25` **no está en el repo**: `1762528725798-createValidtionP25.ts` crea
sus doce funciones hermanas y esa no (verificado por grep, 9-sep).

**2. El ticket no menciona ninguna fase.**
El componente cuelga hoy de `isP25()` a secas, que es **portafolio, no fase**. Quitarlo sin envolver
se lo lleva también de los resultados de fase 2025, contra la regla rectora de la épica. Eso lo
decide el PO — es la única pregunta que va a Ángel.

## El reparto que ya está hecho (no rehacerlo)

- **P2-3641** (el gemelo, "Evidence of user need") lo desarrolló `claudekun`: `Ready For UAT` a
  nombre de Cami, build #2200 verde. La evidencia de user need **no** está entre lo que la regla
  exige, así que ese no tenía el bloqueo que este sí tiene.
- **La mitad de backend → [P2-3651](https://cgiarmel.atlassian.net/browse/P2-3651)**, a nombre de
  Juan David Delgado, bajo P2-3243. Cubre las dos mitades porque es la misma función y el mismo
  volcado. Lleva escrito que **la forma del cambio depende de lo que responda Ángel**: si es de 2026
  en adelante → envolver la 136 por `phase_year`; si es todas las fases → sacarla de la regla sin
  rama por año.
- 🛑 Green check = **Juanda**, por reparto de módulos. Nosotros no tocamos esa función.

## Warnings abiertos que salieron de aquí

`W-20260909-opus505` (🟡, la regla podría inspeccionar filas de evidencia ya existentes) y
`W-20260909-opus506` (🔴, **la copia del repo está rota y sustituirla apagaría el green check en
silencio**: lee `riu.innovation_readiness_level_id`, columna renombrada a `innovation_use_level_id`).
Ambos en `~/Desktop/WARNINGS.md`.

## Nota heredada sobre `user-evidence/` (de la sesión `3243 jira`, 9-sep) — ⚠️ NO VERIFICADO por mí

La pregunta "¿se puede compartir públicamente?" no bloquea el guardado en el camino de
`user-evidence/`: llega `null`, el gate compara `undefined != null`, SharePoint no se llama y la
evidencia queda con el archivo subido y sin enlace que abra nada. Su guarda del server cubre también
este camino. No es nuestro ticket; queda anotado, no se arregla.

----------

## El comentario, listo para pegar en P2-3642

```
## Where to look

Innovation Development form -> section "Responsible innovation and scaling" -> the question
"How have the end users/stakeholders been involved in defining assumptions and purposes of the
innovations to ensure legitimacy and institutional fit?"

## What happens today

Two things were checked before starting, and one of them needs a decision from you.

**1. This question is one of the four answers required to turn the section green.**

For a 2026 result, the Innovation Development section only turns green once these four are answered:
the GESI stage question, the risk assessment stage question, **this question — including the small
"Why?" box under it** — and the Intellectual Property question.

So removing the question from the form is only half of the change: the rule that decides the green
tick has to be adjusted in the same move, or no 2026 Innovation Development result can be submitted
again. That half is already with the backend team, who own that rule (P2-3651). **No decision needed
from you on this point** — it is here so the sequencing is on record. (Source: a check carried out on
4 September; the backend team will confirm the exact detail against the live rule.)

**2. The ticket does not say from which reporting year this applies. This is what we need from you.**

Today the question is shown to every result in the current portfolio, and that includes results
reported in 2025. The SIDS revision has consistently held that earlier reporting years must keep
looking exactly as they did.

  Option A  (recommended)          Option B
  ------------------------         ------------------------
  2026 onward:  removed            every year:  removed
  2025 and before:  unchanged,     2025 results lose the
  keeping the answers already      question and the answers
  given                            already given to it

Option A matches how the other removals in this revision were handled (the "Demand of anticipated
innovation user" section and the Megatrends question both stayed visible for 2025).

## What is on hold

Development has not started and will not start until this is answered — the whole ticket is this one
question, so there is no part of it we can build in the meantime.

Once answered, the form change itself is small.
```
