# context-ai — contexto vivo del trabajo en curso

**Verified:** 2026-08-24 · branch `performance-refactor` · `4a0e39f2b`
**Ticket espejo en Jira:** [P2-3432](https://cgiarmel.atlassian.net/browse/P2-3432) — Context AI. Su comentario del 24-ago es el índice de preguntas abiertas y por dónde revisar.

## Qué es esta carpeta

El registro **conceptual** del trabajo en curso: qué estamos construyendo, **por qué**, qué se
decidió y qué sigue abierto. No es documentación de código — para eso están los `CLAUDE.md`
junto a cada feature, que describen contratos y trampas.

La diferencia importa:

| Vive en | Qué contiene |
|---|---|
| `<feature>/CLAUDE.md` | Contrato, quién es dueño de qué estado, `archivo:línea`, trampas |
| `docs/context-ai/` | El **por qué**, el alcance vigente, las decisiones y las contradicciones abiertas |
| Jira | El sistema de registro oficial. Esta carpeta es su espejo local, no su reemplazo |

Existe porque el chat es desechable y Slack se pierde. Cuando Ángel manda un audio a las 22:30
un domingo y el Excel con las prioridades vive en SharePoint, el contexto se evapora en 48 horas.
Aquí queda.

## Las reglas

**1. Se actualiza al tocar el alcance, no al tocar código.**
Un cambio de implementación va al `CLAUDE.md` de su carpeta. Aquí solo aterriza lo que cambia el
**qué** o el **por qué**: una prioridad nueva, una decisión de negocio, una contradicción resuelta,
un ticket que cambia de dueño. Si un commit no cambió ninguna de esas cosas, esta carpeta no se toca.

**2. Toda afirmación lleva su fuente y su fecha.**
Formato: `(Ángel, audio 23-ago 22:30)`, `(Excel PRMS_Clasificacion_Unica_26Ago, pestaña X)`,
`(P2-3352, descripción)`, `(verificado en código: archivo:línea)`. Sin fuente, la línea se borra.
**Lo no verificado se marca `⚠️ NO VERIFICADO`** en vez de omitirse — un hueco declarado vale más
que una afirmación cómoda.

**3. Cada documento de alcance tiene su ticket espejo en Jira.**
El detalle largo vive aquí; el ticket lleva el resumen y el enlace. Si alguien abre el ticket
dentro de dos semanas sin este chat, tiene que poder continuar. Esa es la prueba.

**4. Al inicio de cada sesión que toque este trabajo: leer, y diffear contra la realidad.**
Antes de codear, comprobar que las prioridades siguen siendo las del Excel y que los estados de
Jira no cambiaron. Ángel reorganiza a diario. Trabajar sobre el alcance de ayer es construir algo
que ya nadie pidió.

**5. Las contradicciones no se resuelven inventando.**
Van a `decisiones-y-contradicciones.md` con la pregunta exacta y a quién hay que hacérsela. Se
sigue trabajando en lo que no depende de la respuesta.

**6. Tope 150 líneas por archivo.** Pasado eso: borrar lo derivable o partir un hijo. Un documento
que nadie lee porque es largo es un documento que no existe.

## Cómo llega esto a un agente (y por qué no se autocarga)

Ninguno de estos archivos se llama `CLAUDE.md` **a propósito**: Claude Code solo autocarga ese
nombre, así que estos no cuestan contexto cuando se trabaja en otra cosa.

Los trae el router bajo demanda:

```bash
~/Desktop/claude/route.sh --cwd "$PWD" --msg "<mensaje del usuario>"
```

Disparadores registrados (`router.md` § N2 PEDIDO — PRMS revamp, tag
`PEDIDO=prms-revamp-contexto`): `revamp`, `pool funding`, `w1/w2`, `bilateral`, `MDS`,
`minimum data`, `IPSR`, `innovation package`, `context ai`, `orden de trabajo`,
`26 de agosto` / `26-ago`, `clasificacion unica`, y cualquier `P2-32xx`–`P2-34xx`.

⚠️ **El router carga SOLO este archivo.** Es el índice: mira la tabla de abajo y abre **el que
haga falta**, no los cinco. Los cinco juntos son ~530 líneas; este solo, 80.

Si un disparador debería haber funcionado y no lo hizo, se arregla en el mismo turno:
`route.sh --cwd "$PWD" --miss "pedido | archivo que hacía falta | trigger a agregar"`.

## Índice

| Archivo | Qué contiene |
|---|---|
| `orden-2026-08-26.md` | El alcance vigente: qué se ataca hoy, en qué orden, quién prueba |
| `pre-planes.md` | Dónde vive el contexto verificado de cada actividad en Jira (par front/back) |
| `conceptos.md` | El modelo mental del dominio: pool funding vs bilateral, tipos de resultado, manual vs IA |
| `mds.md` | Minimum Data Standards en detalle: quién declara qué, y por qué cliente y server no coinciden |
| `decisiones-y-contradicciones.md` | Lo decidido y lo que necesita respuesta humana |
