# 2-sep-2026 — reparto por módulo, y el barrido de las clarificaciones paradas

Jornada de día, con cuatro sesiones en paralelo: esta (desarrollo), **flowi** (barrido en navegador),
**estati** (Jira + Slack con cron) y **braindot** (framework de aprendizaje).

----------

## 🛑 1. LO MÁS IMPORTANTE: reparto por módulo, decisión del jefe de Yeck

Cada desarrollador es dueño de un módulo **completo, back y front**. Escrito como **regla 24** en
`~/Desktop/reporting/CLAUDE.md`.

| Dueño | Módulo | Zona de código |
|---|---|---|
| **Juan Carlos Cadavid** | Result Framework & Reporting | `pages/result-framework-reporting/**` |
| **Juan David Delgado** | bilaterales | `pages/bilateral/**` + migraciones, green check, ToC |
| **Yeck (nosotros)** | formularios **W1/W2** | `pages/results/pages/result-detail/**`, `result-creator`, `custom-fields/**` |

🥇 **La consecuencia práctica es que se REASIGNA, no se arregla.** Aunque sea sencillo y aunque
pudiéramos hacerlo. El reparto existe para que tres personas no se pisen en el mismo archivo.

**Aplicado el mismo día: 14 actividades reasignadas** — 12 de bilateral a Juanda (P2-3491, 3490, 3489,
3488, 3331, 3329, 3327, 3315, 3314, 3233, 3384, 3428) y 2 de Result Framework a JC (P2-3412, 3411).
🛑 **No se reasignó lo ya entregado**: los `To Be Deployed` y `To Be Reviewed` de esos módulos se
quedan a nombre de Yeck, porque están hechos por nosotros y esperan su despliegue.
⚠️ **Verificación una por una con `GET /issue/<KEY>?fields=assignee`, nunca por JQL**: el índice de
búsqueda de Jira va con segundos de retraso y muestra fantasmas justo después de escribir.

## 🥇 2. El barrido de las 24 clarificaciones: el 83% no esperaba a negocio

Workflow de 29 agentes sobre las **24 actividades paradas en `To Be Clarified`**, todas a nombre de
Ángel. De 23 veredictos (uno falló):

- **Solo 4 necesitaban de verdad a negocio** — y **dos de esas cuatro son contradicciones entre
  requisitos que él mismo aprobó**, no conocimiento que le falte.
- **19 estaban parados sin razón**: 14 eran decisiones de interfaz de Yeck (10 de ellas **avisos
  nuestros** de "no hay nada que hacer, ciérralo"), 2 ya estaban construidas, 3 eran de Juanda.
- Ángel **no había comentado nada en 13 de 23**, y en dos la pregunta que le mandamos **se borró
  después**: sostenía tickets que no le preguntaban nada.

**Resultado: la cola de Ángel bajó de 24 a 11.**

⚠️ **Y tres frenos de `estati` que evitaron errores**, todos por no comprobar el `creator` uno por uno:
`P2-3174` lo creó Cami, y `P2-3535` y `P2-3155` los creó Ángel — el argumento "es un aviso nuestro" no
les aplicaba. Además `P2-3535` estaba **en pausa por un acuerdo Ángel–Yeck del 31-ago** que yo no tenía
presente. **Chequeo incorporado a `/barrido`.**

## 🔴 3. La contradicción de Ángel, y cómo se preguntó

`P2-3420` dice *"Discontinued innovations: included regardless of status"* y `P2-3421` dice
*"Status != Discontinued — must be excluded"*. **Mismo desplegable, el mismo minuto del 1-sep.**
Ocho defectos de Innovation Use cuelgan de esa respuesta.

Pregunta A/B publicada en `P2-3421` con **dibujo de las dos salidas** y una nota en `P2-3420`
apuntando allí, para no preguntar dos veces. 🥇 **Y la frase que faltaba, aportada por braindot:**
decirle que **la respuesta tiene que corregir las DOS historias** — si no, la contradicción sobrevive
a su propia respuesta.

## 🔧 4. Entregado

| Commit | Qué |
|---|---|
| `91002df61` | **Innovation Use**: guarda de pérdida de datos. Se perdían **seis columnas** y **todos los enlaces a estudios de escalamiento**. Congelado levantado solo para esto |
| `8afb574f3` | **Los ocho gates de fase** fallaban hacia el formulario **nuevo**; ahora fallan hacia el legacy. Población en riesgo: **1516 resultados de 2025** frente a 353 de 2026 |
| `6efe11cba` | El **noveno** sitio del mismo fallo. Y apareció un **décimo** (`policy-change-info.component.ts:144`), identificado y sin tocar |
| `2c11cc041` | 🔴 **AI Review obedecía a nadie**: el botón que **reescribe** título, descripción y puntuaciones aparecía habilitado en **fases cerradas**, para **no-miembros**, en resultados descontinuados y en AVISA. Ahora respeta el bloqueo de escritura |
| `300d9b560` | El **catálogo de centros CGIAR** se cargaba **una vez sin reintento**: un solo fallo vaciaba todos los desplegables de centros **y el Lead center obligatorio** durante toda la sesión |
| `7929c424d` | **P2-3518**: el proyecto de un borrador bilateral ya se puede cambiar. Sin una línea de servidor |
| `07e03b6c2` | **P2-2911**: Lead contact person mostrado junto al Lead center |
| `8c2990200` · `ff7b1c2fb` | **P2-3437** (500 en Knowledge Product sin metadatos) y **P2-3498** (inyección SQL + `ParseIntPipe`) — eran de Juanda y pasaron a ser nuestros |

## 🎁 5. Lo de Juanda: 6 de 13 salieron de su cola

Auditadas sus 13 abiertas: **3 ya estaban hechas** (P2-3207 y P2-3092 por él mismo, P2-3086 con estado
correcto), **3 eran nuestras** (P2-3437, P2-3498 y P2-3527), **1 se reduce al backfill** (P2-3514, cuyo
TypeScript ya estaba pusheado) y **P2-3218 nos esperaba a nosotros**. Le quedan **cinco trabajos
reales**, cada uno con el nombre exacto de la función, la fila o la columna, publicado en su ticket.

⚠️ **Y `P2-3464` tenía la instrucción en el eje equivocado**: decía al front gatear con `isP25()`
(portafolio) cuando la regla del épico es "de 2026 en adelante" (fase). Nosotros ya lo construimos
bien; el texto del ticket habría que corregirlo para que nadie lo siga.

## 🛑 6. La lección del día: un lote de negativos NO prueba imposibilidad

Un barrido midió `innovation-dev-info` incompleto en **24 de 24** resultados y concluyó que **ningún**
Innovation Development se puede enviar. **Yo lo publiqué en dos tickets de Juanda.** Era falso: el
resultado **8869** tiene las **cinco** secciones verdes y `submit: true` — verificado de primera mano
antes de retractarme.

🥇 **Los 24 negativos no medían un bloqueo: medían 24 resultados incompletos.** El discriminante
correcto es **buscar un positivo antes de afirmar que algo es imposible**, y nadie lo buscó.
Y la segunda mitad de la lección es la **propagación**: la medición era de otro agente, yo la publiqué
fuera del equipo, y para cuando llegó la retractación ya había dos comentarios en tickets ajenos.
**Lo que se publica fuera se verifica de primera mano, aunque venga de alguien de confianza.**

⚠️ Antecedente que lo agrava: el mismo error se retractó el **27-ago en P2-3467**. Y su antídoto ya
estaba escrito en el cerebro (`brain/devoluciones.md` D3) — el agente lo leyó **después** de medir.

## ⚠️ 7. Cami prueba un front de hace una semana

Sus tres tickets del 1-sep se reproducen **palabra por palabra** en el enlace de *"previous design"*
(`d11q2gkl6a1qr7.cloudfront.net`), cuyo bundle **no contiene** los cambios del 28 ni del 29-ago y **no
lleva sello `APP_VERSION`**. Dos de los tres **no se reproducen en prtest**.
⚠️ Y el enlace del banner engaña: `environment.ts:45` tiene `legacyUrl` apuntando a **prtest**, o sea
el enlace del diseño anterior lleva al nuevo. Decisión de Yeck: **avisarle a ella en el ticket**, sin
retirar el enlace.

## 🧠 8. Infraestructura de trabajo que quedó montada

- **Comando `/barrido`** (`~/.claude-work/commands/barrido.md`): verificación end-to-end de los siete
  tipos de indicador, con las trampas del ambiente dentro (bundle cacheado, `?phase=`, ids internos).
- **Épico `P2-3558`** para los defectos de nuestro propio barrido.
- **Framework de decisiones autónomas** (`.claude-rules/core/decisiones-autonomas.md`): cuatro niveles
  de qué se decide solo y qué no.
- **Cerebro de aprendizaje** con 19 reglas minadas de 267 actividades, y su **hook registrado y
  probado en seco**: con el mensaje exacto del incidente del 26-ago, sirve la regla primero.
- **Cron de Jira + Slack** en dos capas (sesión cada 15 min · nube cada hora, L-V).
