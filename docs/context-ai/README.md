# context-ai — contexto vivo del trabajo en curso

**Verified:** 2026-09-04 16:15 · branch `performance-refactor` · `f38c13161`
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
🛑 **Y leer primero el `estado-<fecha>` más reciente.** El 4-sep-2026 pasó justo lo que esta regla previene: otro chat seguía informando como bloqueados tres tickets que se habían resuelto el día anterior, porque su contexto era el de la mañana. Un estado viejo no es información incompleta — **es información falsa**, y se propaga a Jira y a Slack.
Antes de codear, comprobar que las prioridades siguen siendo las del Excel y que los estados de
Jira no cambiaron. Ángel reorganiza a diario. Trabajar sobre el alcance de ayer es construir algo
que ya nadie pidió.

**5. Las contradicciones no se resuelven inventando.**
Van a `decisiones-y-contradicciones.md` con la pregunta exacta y a quién hay que hacérsela. Se
sigue trabajando en lo que no depende de la respuesta.

**6. Tope 150 líneas por archivo.** Pasado eso: borrar lo derivable o partir un hijo. Un documento
que nadie lee porque es largo es un documento que no existe.

**7. 🛑 Lo que no está en el índice de abajo, se ARCHIVA — no se deja suelto en la carpeta.**
Un archivo que sigue en la raíz pero fuera del índice es la peor combinación posible: nadie lo
mantiene y aun así un `ls` lo encuentra y un agente lo lee como vigente. El 4-sep-2026 la carpeta
tenía **31 archivos y el índice listaba 9**; los 22 huérfanos eran snapshots de estados y censos de
días anteriores, o sea **información falsa esperando a que alguien la citara**. Se movieron a
[`archivo/`](archivo/).

> 🛑 **`archivo/` NO SE LEE para trabajar.** Es historia: estados, censos, barridos y verificaciones
> de días pasados. Nada de ahí describe el presente. Si necesitas saber cómo se llegó a algo, está
> ahí; si necesitas saber **qué pasa hoy**, está en `estado-<fecha>` más reciente y en el índice.

> ⚠️ **Y se archiva por la fecha en que se MODIFICÓ, no por la del nombre.** El 4-sep archivé
> `p2-3472-feedback-verificacion-2026-09-03.md` por su nombre, y su dueño lo había actualizado **esa
> misma mañana** con la verificación posdespliegue: dentro estaba la única receta de las tres sondas
> de diagnóstico sin escritura. Un `git log -1 --format=%ad -- <archivo>` cuesta un segundo y es la
> única fecha que dice algo.

**8. Al archivar, revisa que el vigente no se contradiga consigo mismo.** El mismo 4-sep,
`estado-2026-09-04.md` decía arriba que el alcance de P2-3292 ya estaba decidido y abajo lo listaba
como *"decisión de Yeck pendiente"*. Un documento que se contradice es peor que uno viejo: el lector
elige la mitad que le conviene.

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
| `fase-vs-portafolio.md` | Qué fase es la nueva, los 11 gates que existen y por qué `isP25()` no sirve para separarlas |
| **`estado-2026-09-04.md`** | 🥇 **Empieza por aquí si vienes de otro chat.** Los tres bloqueos que cayeron el 3-sep y que otras sesiones siguen citando como abiertos, los dos resultados de prueba de 2026 y qué queda |
| `2026-09-04-verificaciones.md` | La evidencia de las verificaciones en pantalla del 4-sep (cifras, cabeceras, celdas DOM vs visibles). El padre lleva solo el veredicto |
| **`2026-09-04-verificacion-pantalla-p2-3292.md`** | 🛑 **Léelo antes de tocar el guardado de General Information.** El `NG0103` de los desplegables quedó resuelto y medido; pero el guardado devuelve **500** (`Property "0" was not found in "Result"`) y **no es del campo nuevo** — se reproduce sin ningún target. Trae las tres trampas del flujo (el modal de confirmación que hay que confirmar, y que tapa el botón) |
| `2026-09-03-green-check-innovation-dev.md` | El green check de Innovation Development: **resuelto el 3-sep**, las dos causas reales, y por qué la ruta **v1** de green checks no sirve para medir |
| `2026-09-03-decisiones-yeck.md` · `2026-09-02-scope-nuevo.md` · `2026-09-02-reparto-y-clarificaciones.md` | Decisiones de Yeck y del PO que siguen vigentes: alcance, reparto y clarificaciones. **No caducan con la fecha del nombre** |
| `como-validar-un-despliegue-en-prtest.md` | Cómo se comprueba que algo llegó de verdad al ambiente. 🥇 El sello `APP_VERSION` es del **cliente** y no dice nada del server |
| `pendiente-defectos-formularios.md` | Los defectos de formularios pendientes del blindaje pre-producción (épico `P2-3558`, valida **Santi**) |
| `handover-toc-user-feedback.md` | Theory of Change. 🛑 **No se toca** — es de Juan David Delgado (R18) |
| `p2-3472-feedback-verificacion-2026-09-03.md` | El módulo de reportes: la verificación posdespliegue y 🥇 **la receta de las tres sondas de diagnóstico SIN escritura**. ⚠️ Su nombre lleva fecha del 3-sep pero se actualizó el 4 — **no es histórico** |
| `archivo/` | 🛑 **Historia. No se lee para trabajar.** Estados, censos, barridos y verificaciones de días pasados — ver regla 7 |
