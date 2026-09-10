# Decisiones tomadas y contradicciones abiertas

**Verified:** 2026-08-25 · branch `performance-refactor` · `bc25304fb` · **Ángel respondió el 25-ago**

Lo que se decidió sin esperar a nadie, y lo que **necesita respuesta humana**. Ángel volvió el
martes 25; Cami y Santi prueban el 25-26. Nada de esto se resuelve inventando.

---

## 🔴 Bloqueadores confirmados en código

### 1. El asistente de IA de Pool Funding no crea nada — muestra un toast falso

`pages/results/pages/result-creator/components/result-ai-assistant/components/result-ai-item/result-ai-item.component.ts:65-83`

```ts
createResult(item: AIAssistantResult) {
  this.isCreating.set(true);
  setTimeout(() => {
    this.customizedAlertsFeSE.show({ title: `Result created successfully ${item.title}`, status: 'success', ... });
    this.isCreated.set(true);
    this.isCreating.set(false);
  }, 1000);
}
```

**No hay llamada HTTP.** Un `setTimeout` de 1 s, un toast verde de éxito, y el estado local pasa a
"creado". Nada se persiste. Y `openResult()` (línea 85) abre
`/result/${item.result_official_code}/general-information` con un código de un resultado que no
existe → "Result not found".

**Por qué importa hoy:** el audio de Ángel pide explícitamente garantizar creación *"por formulario
manual **y por inteligencia artificial**"*. Si Cami prueba este camino mañana, ve verde y no hay
resultado. O lo reporta como bug P0 de persistencia — cuando en realidad es una maqueta que nunca
se conectó.

**Decisión:** decirlo **antes** de que lo prueben. No se arregla hoy a menos que alguien confirme
que el endpoint existe: conectar esto es alcance nuevo, no un fix.

### 2. La creación de Knowledge Product revienta con 500 para handles válidos de CGSpace

`P2-3258` — Open, **Juan David Delgado**. `POST /api/results/results-knowledge-products/create`
devuelve HTTP 500 con `Cannot read properties of undefined (reading 'online_year')` para el handle
`https://hdl.handle.net/10568/184961`, que es válido. Reproducido en prtest, fase 2026.

**Por qué importa hoy:** `P2-3247` (KP — crear y validar flujo completo) es **prioridad 1** en la
hoja Pool Funding. Si el backend revienta, el flujo de KP no se puede garantizar desde el frontend.
**Es de Juanda, no mío.** Hay que confirmar si ya está en prtest antes de que Cami toque KP.

---

## ⚠️ Contradicciones que necesitan respuesta

### 3. La épica de creación por IA está vacía, y el Excel no la prioriza

`P2-3418` "Validate Creating Flow in Revamp for Bilateral Projects AI Assisted" — **Open, sin
asignar, cero historias hijas**. Y **no aparece en ninguna de las dos hojas priorizadas** del Excel.

Pero el audio dice, textual: *"vamos a garantizar que podemos crear resultados por formulario
manual y por inteligencia artificial"*. La hoja `Revamp - W3Bilaterals` solo prioriza `P2-3417`
(manual).

**❓ Para Ángel:** ¿"crear por IA" para el 26 significa recorrer el flujo de subida bilateral que ya
existe (`bilateral-ai-upload` → draft → promote), o hay alcance por definir? Porque una épica sin
historias no se puede ni estimar ni probar.

### 4. IPSR: la observación de Ángel es correcta, pero el Excel lo pone en prioridad 4

En Slack: *"IPSR: Ojo con este punto porque no vi en el revamp el IPSR"*. En el Excel, `P2-3427`
(crear y validar IPSR) está en **prioridad 4** — o sea, fuera de hoy.

Verificado: IPSR vive en `pages/ipsr/`, con su propio módulo, y **no pasa por el
`result-detail` del revamp**. El `CLAUDE.md` de `result-detail` ya lo deja escrito: *"si no hay
slot (IPSR, result creator), la barra se queda donde fue declarada"*.

**Decisión:** no se mete IPSR hoy. Es un módulo de varios pasos con fase propia; portarlo un día
antes de una prueba manual es la forma más rápida de romper los cinco tipos que sí están en alcance.

⚠️ **Pero hay que avisarlo.** El riesgo real no es el módulo viejo: es que Cami entre a Innovation
Packages desde el sidebar, vea la UI vieja y abra bugs de "revamp incompleto". Si se dice antes,
la UI vieja es el comportamiento esperado de esta ronda.

### 5. Dos escalas de prioridad en el mismo libro de Excel

La hoja maestra `Priorizacion Unica` usa `1 = casi listo → 4 = en cola` (madurez). Las hojas
`Revamp - *` usan `1 = atacar primero` (importancia). **Son inversas.**

Confirmado por el propio contenido: `P2-3352`/`P2-3366`/`P2-3368` son prioridad **1** en la hoja
bilateral y `4 - En cola, no iniciado` en la maestra. Y el audio dice "ataca 1 y 2, esos son los
más importantes" → habla de las hojas Revamp.

**Decisión:** las hojas `Revamp - *` mandan para el orden de trabajo. La maestra se usa solo para
saber qué está **fuera de alcance del 26** (35 tickets) y qué está **Ready for UAT** (7).

### 6. Tickets de prioridad 1 que están cerrados, duplicados o no son míos

| Ticket | Situación |
|---|---|
| `P2-3256` | **Closed**, pero figura como prioridad 1 en la hoja Pool Funding |
| `P2-3257` | Gemelo casi idéntico de `P2-3256`, Open, asignado a **Ángel**, prioridad 2 |
| `P2-3261` | **Ready For UAT** con Cami — hecho, solo falta desplegar |
| `P2-3334` | Prioridad 1, pero es de **Innovation Package** — y hoy no hay innovaciones |
| `P2-3255` | Prioridad 1, asignado a **Ángel** |
| `P2-3253`, `P2-3260`, `P2-3326` | Prioridad 2, asignados a **Juan David** |
| `P2-3371`, `P2-3373` | Prioridad 1, **sin asignar** — y son dos de los cinco flujos de creación del objetivo |

**❓ Para Cami y Santi (por Jira, no Slack):** `P2-3371` (Policy Change) y `P2-3373` (Other Outcome)
son prioridad 1 y no tienen dueño. ¿Los tomo yo?

### 7. `P2-3241` y `P2-3247` están en "To Be Improved"

Las dos historias de crear-y-validar de Capacity Sharing y Knowledge Product ya rebotaron una vez.

**❓ Para Cami:** ¿mañana se re-testean esas dos primero, o se arranca limpio con los tres que nunca
se probaron (`P2-3321`, `P2-3371`, `P2-3373`)? Lo que rebotó antes suele volver a rebotar por lo
mismo, y no está escrito qué fue.

---

## Decisiones tomadas sin consultar

1. **Pool Funding antes que bilateral.** El audio es explícito y el mensaje escrito coincide.
2. **Innovaciones e IPSR al martes.** Slack + prioridad 3-4 en el Excel, dos fuentes de acuerdo.
3. **Transversales del bilateral antes que las secciones por tipo.** `P2-3341`, `P2-3366`,
   `P2-3368`, `P2-3370`, `P2-3375` los atraviesan los cinco tipos: un arreglo, cinco beneficiados.
4. **Nada de refactors de componentes compartidos hoy.** Prueba manual mañana.
5. **Recorrer el happy path antes de tocar código.** El objetivo es verificación, no construcción:
   sin recorrerlo, la lista de tickets es teoría.

---

## Dónde quedó cada pregunta (24-ago-2026)

Las preguntas se dejaron **en el ticket al que pertenecen**, no en un solo sitio: así el dueño de
cada ticket se la encuentra donde ya está trabajando. Cada comentario lleva el motivo, la
evidencia y qué hace falta aclarar, para que se pueda retomar sin este chat.

| Ticket | Pregunta dejada ahí | Espera a |
|---|---|---|
| `P2-3418` | Épica sin historias y ausente de las dos hojas priorizadas, pero el audio pide IA. ¿Flujo bilateral existente o alcance por definir? | Ángel |
| `P2-3427` | IPSR confirmado fuera del revamp. ¿Se acepta la UI vieja como esperada y se saca del guion? | Cami / Santi |
| `P2-3371` | Prioridad 1 sin dueño. ¿Desarrollo mío, verificación suya? | Cami / Santi |
| `P2-3373` | Prioridad 1 sin dueño. Misma pregunta | Cami / Santi |
| `P2-3247` | Bloqueado por `P2-3258` (500 `online_year`). ¿Está el fix en TEST? ¿Hay un handle que sí sirva? | Juan David |
| `P2-3241` | "To Be Improved" sin registro de qué falló. ¿Qué se encontró? ¿Se retestean primero los dos que rebotaron? | Cami / Santi |
| `P2-3257` | Parece duplicado de `P2-3256`, que está Closed. ¿Diferencia real o se cierra? | Dueño del ticket |
| `P2-3415` | ¿El guion incluye submit o solo crear y guardar? ¿Entra el camino de IA? | Cami / Santi |

**Levantado como defecto, no como pregunta:** `P2-3433` — el asistente de IA de Pool Funding
reporta éxito sin crear nada. Se verificó antes que `P2-2292` y sus cinco hijos no lo cubren, para
no levantar un duplicado.

**Índice completo en `P2-3432`**, comentario del 24-ago: qué pregunta vive en qué ticket, a quién
espera y qué bloquea. Ese es el sitio por donde revisar si ya hubo respuesta.

### Lo que avanza sin depender de ninguna respuesta

Los transversales del bilateral: `P2-3341`, `P2-3366`, `P2-3368`, `P2-3370`, `P2-3375`. Los cinco
tipos pasan por ahí, así que un arreglo beneficia a los cinco. Se arranca por ahí en vez de esperar.

### Referencia sin resolver

El punto 5 de la orden de trabajo cita "las épicas 3419, 3442 y 3416". **`P2-3442` no existe o no
es visible** con mis permisos. Probablemente un typo; queda anotado para que no se ignore en silencio.

----------

## ✅ Respondido por Ángel el 25-ago-2026 — esto cierra tres preguntas y abre un frente

### El criterio del 26 incluye **submit**, no solo crear *(P2-3415, 09:37)*

> *"The criterion for 26 August is the full path: the result must be **submitted**, not just created
> and saved. Harden validation completeness and the state transitions accordingly."*
> *"For 26 August, concentrate the Pool Funding effort on one thing: a result can be created end to
> end, from start to submit. That is the commitment."*

**Consecuencia:** el guion de prueba no termina en "guardé y recargué". Todo lo que impida llegar a
**Submit** —una sección que no se pone verde, una transición de estado que no ocurre— es trabajo de
hoy. Lo demás, no.

### El camino de IA de Pool Funding queda FUERA del 26 *(P2-3415, 09:37)*

> *"The AI-assisted path stays out of the 26-August script. We will verify and implement that flow
> afterwards, as its own piece of work — including P2-3433."*

**Cierra la pregunta 3 de este documento** para el lado Pool Funding. `P2-3433` se confirma en
alcance, pero **después**. Ya está marcado *Coming soon* (commit `d7636b02e`).

### El camino de IA de **bilateral** SÍ entra, y es prioritario *(P2-3418, 09:45)*

> *"It is important that we focus on validating and fixing the **AI-assisted creation flow for
> Bilateral results** as part of the current effort. The Pool Funding AI flow will be reviewed
> separately and addressed at a later stage."*

⚠️ **Pero la épica sigue sin historias hijas** — Ángel reconoce que no le dio tiempo y dice que las
creará. **Consecuencia práctica:** se arreglan defectos concretos y verificables del flujo que ya
existe (`bilateral-ai-upload` → draft → promote); **no se inventa alcance**. Lo que haría falta y
nadie pidió se reporta, no se construye — regla 6 del `CLAUDE.md`.

### Lo que Ángel devolvió como pregunta nuestra *(P2-3415)*

> *"Policy Change (P2-3371) and Other Outcome (P2-3373) still have no owner, and the two To Be
> Improved ones (P2-3247, blocked by the backend 500 in P2-3258, and P2-3241) need to move for the
> session to be meaningful. **Please flag if any of these will not be ready in time.**"*

O sea: no contestó quién es el dueño de `P2-3371` y `P2-3373` — pidió que avisemos si no van a
llegar. Se toman como nuestros de facto.

## 🛑 Lo que el épico P2-3243 sigue esperando — nadie contestó

Las seis auditorías del 25-ago (11:19-11:32) **no tienen respuesta**. `P2-3265`, `P2-3272`,
`P2-3292`, `P2-3294`, `P2-3295` siguen bloqueados por el requisito, y `P2-3262` espera **una sola**
pregunta. `P2-3290` puede empezar pero depende de `P2-3467` (backend, Juan David).

⚠️ **Diagnóstico del 25-ago por la tarde:** las preguntas estaban bien hechas y verificadas, pero
**escritas para desarrolladores**, y quien tiene la respuesta no lee código. Se republicaron en
lenguaje llano con **el ejemplo de las dos salidas** (*"si se hace A el usuario ve esto; si se hace
B ve esto otro"*). Regla nueva: `CLAUDE.md` § regla 10 y
`~/Desktop/.claude-rules/core/requisitos-ciat.md` § "Cómo se ESCRIBE la pregunta".

## Contradicciones nuevas encontradas al desarrollar (25-ago)

| Dónde | Qué | Estado |
|---|---|---|
| `P2-3391` | Pide "Innovation Developer" como **multi-select de instituciones**; el campo que existe guarda **texto libre** y es compartido con pooled funding. Cambiarlo es campo nuevo de servidor | Se dejó como texto obligatorio. **Pregunta pendiente** |
| `P2-3391` | Su "How to test" pide que la pregunta de scaling studies **NO** se muestre desde readiness 6; hoy **sí** se muestra. Es justo lo que discute `P2-3265`, que sigue bloqueado | No se tocó. El propio ticket manda coordinar con la PO |
| `P2-3391` vs los 3 siblings | Los dos tickets dicen que la nota va **arriba**; Capacity Sharing, Policy Change e Innovation Use la pintan **debajo** de los campos MDS | Se siguió el ticket. Divergencia visible entre secciones |
| `P2-3241` | El ticket asumía divergencia por portafolio. **No la hay:** la validación P22 es idéntica a la P25 → el cambio **no lleva gate**. Gatearlo habría dejado el otro portafolio atascado | Resuelto, verificado en código |

----------

## Verificación en navegador del 25-ago

Recorrido completo de los cuatro tipos de Pool Funding en navegador. Encontró **el defecto que
impedía enviar cualquier resultado** (ya arreglado), un segundo bloqueante de servidor que sigue
abierto en Knowledge Product, que `P2-3258` ya no reproduce, y cinco cosas que harán que QA
reporte falsos positivos.

→ **[`verificacion-navegador-25-ago.md`](verificacion-navegador-25-ago.md)**
