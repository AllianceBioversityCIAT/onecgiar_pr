# Tickets cuyo estado en Jira no refleja lo que hay en el código — 1-sep-2026

**Son cuatro verificados, y ninguno es "se nos olvidó desarrollarlo".** El patrón común es el
contrario: **el trabajo se hace y el ticket no se vuelve a tocar.** El estado se mueve cuando alguien
empieza, no cuando alguien termina, y nadie regresa a cerrarlo. Cuesta de tres formas — hace parecer
que se va más lento de lo que se va, hace planificar trabajo que ya existe, y ha estado a punto de
provocar tres veces hoy que se rehiciera algo entregado.

🛑 **Ningún estado se ha movido.** Esta lista es para que Yeck decida. Los de `To Be Deployed` están
suspendidos por orden suya y los sube a mano.

---

## Verificados — el código va por delante del ticket

### P2-3220 · `In Progress` desde el 4-ago · asignado a **Yecksin**

- **Implementado:** `e014ee987`, 27-ago-2026 — *"Stop losing SharePoint uploads silently"*.
- **Cómo se verificó:** el commit existe en `performance-refactor` y toca las dos superficies que el
  ticket nombra (`section-evidence` y `rd-evidences`).
- **Debería estar en:** `To Be Reviewed` o `To Be Deployed`. Falta un comentario de entrega en el
  ticket; lleva **cuatro semanas** en `In Progress` con el trabajo hecho desde hace una.
- ⚠️ **Corrección a lo que se venía diciendo:** está asignado a **Yecksin**, no a Juan David.

### P2-3262 · `To Be Reviewed` desde el 14-ago

- **Implementado:** `d11ecee24` (27-ago) + `8e7777d01` (28-ago, restaura el texto verbatim de
  Nicoleta).
- **Cómo se verificó:** los **siete criterios de aceptación**, uno a uno contra el código, el 1-sep.
  Todos cumplidos, **incluido el cuarto** —los requisitos por etapa cambian según la etapa elegida—
  que era el candidato natural a estar sin hacer. `rd-evidences.component.spec.ts` → **69 tests
  verdes**, con uno por criterio y cuatro solo para el comportamiento por etapa.
- **Debería estar en:** `To Be Deployed`. No falta nada del alcance.
- **No es alcance de este ticket** (y por tanto no lo bloquea): la paridad de esta guía en el
  formulario bilateral. Su *Scope* dice *"Applies only to: Results of type Policy Change"* y no
  menciona bilateral.

### P2-3290 · `To Be Reviewed` desde el 17-ago

- **Implementado:** el front salió dentro de `a3b02520b` (27-ago), el commit del ticket de Juanda
  **P2-3467**, más el guardado `a62962c6b` del mismo día.
- **Cómo se verificó:** el último comentario del ticket es del **27-ago 15:18** y dice literalmente
  *"Unblocked — work has started"*. **Nunca se volvió a escribir en él**, aunque el trabajo se
  terminó ese mismo día.
- 🛑 **Aquí está la trampa que hace invisible este caso:** buscar `P2-3290` en los mensajes de commit
  **no lo encuentra**, porque su mitad de front viajó dentro del commit de otro ticket. Es
  exactamente el falso negativo contra el que avisa la regla 11 del repo — la evidencia son los
  comentarios y el código, nunca el `git log --grep`.
- **Debería estar en:** `To Be Deployed`, con un comentario que diga en qué commit viajó.

### P2-3261 · `To Be Deployed` desde el 18-ago — **el caso inverso, y el más instructivo**

- **Situación:** estaba marcado como terminado **y le faltaba una pieza**. El texto aprobado se
  aplicó sin candado de fase, así que durante **catorce días todos los resultados —también los de
  2025— leyeron la redacción de 2026**.
- **Completado:** `1899f4602`, 1-sep, con los dos textos comparados byte a byte contra la historia
  para garantizar que el "antiguo" es el real.
- **Por qué está en esta lista:** demuestra que el desfase va en las dos direcciones. Un ticket en
  `To Be Deployed` no prueba que esté completo, igual que uno en `In Progress` no prueba que no lo
  esté. **El estado no es evidencia de nada; el código sí.**
- **No mover:** `To Be Deployed` está suspendido por orden de Yeck.

---

## Casos que se estaban contando mal — no son de esta lista

Los dejo escritos con la medición, porque un falso positivo obliga a comprobar la lista entera otra
vez y le quita toda su utilidad.

### P2-3529 y P2-3530 — **NO fueron implementados antes de existir**

Se venía diciendo que el commit era anterior a los tickets. Es al revés, por una hora:

```
P2-3529 creado   28-ago 09:28:41
P2-3530 creado   28-ago 09:30:30
7ac89011e commit 28-ago 10:32:57   ← una hora DESPUÉS
```

Se reportaron y se arreglaron la misma mañana, y están en `Ready For UAT`, que es el estado correcto.
**Eso no es tablero desfasado: es respuesta rápida.** No hay nada que corregir aquí.

### P2-3251 — no es "ya implementado", es un ticket que dice lo contrario de lo entregado

No hay ningún commit del 11-ago que lo implemente: el del 11-ago (`4ca1b0141`) es del armazón de la
pantalla y el del 18-ago (`f984ef59f`) pertenece a **P2-3252**, otro ticket. El trabajo de P2-3251 es
del **1-sep** (`80315ce73` + `4c2c0c69f`).

Su problema es distinto y más delicado: **el ticket pide lo contrario de lo que se entregó.** El
título dice *"Display AOWs collapsed by default"*, sus criterios dicen lo mismo, y el PO confirmó por
escrito *"inicialmente vamos con que estén cerradas"* el 27-ago. **QA lo pidió expandido dos veces
(25 y 28-ago) y Yeck decidió el 1-sep que aquí manda QA.** Quien lea solo el ticket va a revertirlo.
→ Lo que hace falta no es mover el estado: es **corregir el título y los criterios**, o dejar la
decisión escrita en el ticket.

---

## Y uno más que vi en el recorrido del épico

### P2-3272 · `To Be Reviewed` — el estado promete más de lo que hay

Solo está entregada la **Parte 4** (`e1fe06b9e`, el auto-relleno del Innovation Developer). Las
partes 1 a 3 siguen bloqueadas: la pregunta consolidada de IPR necesita una fila nueva en base de
datos (**P2-3513**, Juan David) y los textos de los dos correos nunca llegaron. Un ticket en
`To Be Reviewed` con tres cuartas partes sin construir es peor que uno abierto, porque nadie vuelve
a mirarlo.

---

## Qué arreglar en la fuente

Mover estos estados resuelve hoy; no evita que vuelva a pasar el mes que viene. Lo que se repite en
los cuatro casos verificados es lo mismo:

1. **Se documenta el arranque, no el cierre.** P2-3290 tiene un *"work has started"* y nada más. La
   regla ya existe (todo lo que pase sobre un ticket se escribe en el ticket); lo que falla es que se
   aplica al empezar y no al terminar.
2. **El trabajo de un ticket viaja dentro del commit de otro**, y entonces `git log --grep` da un
   falso negativo. La evidencia tiene que ser el comentario del ticket, y por eso el comentario de
   entrega no es higiene: es lo único que hace el trabajo localizable.
3. **El estado no es evidencia.** P2-3261 estaba en `To Be Deployed` incompleto y P2-3262 en
   `To Be Reviewed` completo. Antes de planificar sobre un ticket hay que abrir el código —
   hoy eso habría ahorrado tres reconstrucciones.
4. 🥇 **Y la COPIA del ticket tampoco es evidencia: el ticket vivo manda siempre.** Un enlace
   pegado en Slack, un mensaje, o un título que alguien te pasa de memoria son **una foto del
   momento en que se copiaron**. Caso del 1-sep con **P2-3550**: Ángel lo creó a las 09:27 y
   cambió su título **dos veces** (09:41 y 10:22, verificado en el changelog). El enlace que
   circuló por Slack a las 09:40 llevaba el título original — que pedía **un estado de solo
   lectura y una retirada en 2027** — y el ticket vigente no pide ninguna de las dos cosas. Auditar
   sobre la copia habría planificado dos umbrales de fase inexistentes.
   **Muerde con más fuerza justo cuando el autor avisa de que lo está editando**, que es cuando más
   se tiende a fiarse de lo que se acaba de leer. Se abre el ticket por la API, siempre, y si algo
   se acordó de viva voz y no está en el texto, **se dice en el comentario que hay que actualizar el
   ticket antes de construirlo**.
