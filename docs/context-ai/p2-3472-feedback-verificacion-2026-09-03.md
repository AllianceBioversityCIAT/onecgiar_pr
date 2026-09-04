# P2-3472 — El módulo de feedback ya escribe en Jira (verificado 3-sep-2026)

> **Nota local a propósito.** Esto no se maneja con actividades de Jira (Yeck, 3-sep-2026): es
> trabajo extra suyo, no un requisito con dueño. Los dos tickets que la prueba creó se **borraron**
> para no hacer ruido en el tablero. Esta es la única evidencia, y vive aquí.

## Qué estaba pasando

El endpoint (`27742b1c5`, 25-ago) llevaba desde agosto en `performance-refactor` **sin nadie que lo
llamara**: el botón del topbar y el modal solo existían en el worktree
`~/Desktop/reporting/onecgiar_pr-P2-3472` (rama `P2-3472-feedback-report-module`, commit `febfa938e`).
En prtest había, literalmente, un endpoint que crea issues de Jira y ningún botón que lo dispare.

El bloqueo real era de infraestructura: **el server no tenía salida hacia Atlassian**. Ya la tiene.

## Lo que se hizo

- `2439fe6e3` — cherry-pick de `febfa938e` a `performance-refactor` (limpio, sin conflictos).
  Subió a `origin` en el push de las 09:21 (build **#2125**).
- `8badd44c1` — la verificación anotada en `onecgiar-pr-server/src/api/feedback/CLAUDE.md`.

## La prueba, por la interfaz

Cliente local en `:4200` apuntando a prtest, usuario logueado real.

| Clic en el modal | issue type en Jira | Resultado |
|---|---|---|
| **Bug** | `Bug` (10003) | creado, hijo de `P2-3472`, reporter Ángel, creator JC |
| **Adjustment** | `Enhancement` (10105) | creado, hijo de `P2-3472`, reporter Ángel |

Los dos ids del `issuetype` quedan comprobados — es lo que no se habría visto hasta que un usuario
reportara un ajuste en producción.

El bloque de contexto automático llega bien armado y **sale del token**, no de lo que manda el front:

```
Reported by: Yeckzin Zuñiga (y.zuniga@cgiar.org)
Screen / URL: http://localhost:4200/result/results-outlet/results-list
Browser: Mozilla/5.0 (Macintosh...) Chrome/151.0.0.0
```

También verificado en pantalla: el modal abre desde el topbar, *Submit* está deshabilitado hasta que
hay título y descripción, la pantalla de éxito muestra la referencia del ticket, y **el formulario se
resetea al reabrir** (esa es la trampa que suele quedar viva).

Las env `JIRA_*` **están configuradas en prtest**: sin ellas el service responde 503 y no lo hizo.

## ⚠️ El falso CORS — lo que más tiempo costó

A mitad de la prueba Chrome dijo `blocked by CORS policy: No 'Access-Control-Allow-Origin' header`.
**No era CORS.** El backend estaba caído y el preflight `OPTIONS` recibía el `503` de Apache, que
obviamente no trae cabeceras CORS. Cuatro minutos después el mismo preflight devolvía `204` +
`Access-Control-Allow-Origin: *` y el envío funcionó sin tocar una línea.

La ventana de caída (09:15 → 09:16:38) fue **el final del despliegue del build #2124** reiniciando el
backend. Antes de diagnosticar: mirar Jenkins. Documentado en
`~/Desktop/reporting/.claude-rules/reglas-detalle.md`, sección de diagnosticar un servicio caído.

## 🛑 Cómo acabó esto en prtest sin que nadie lo autorizara

Yeck pidió **probar**, no desplegar. El commit `2439fe6e3` se hizo en local para no dejar el
cherry-pick flotando entre turnos; la **sesión vecina pusheó a las 09:19** por otro motivo y **se
llevó ese commit dentro**, porque comparten checkout y rama. El build `#2125` lo desplegó, y el botón
quedó **visible en prtest para todo el equipo**.

Y no es cosmético: al primer clic de cualquiera, el módulo **crea un ticket real** en el Jira del
proyecto, bajo `P2-3472` y con reporter Ángel.

**La lección, y por qué el worktree existía:** `P2-3472` vivía aislado en
`~/Desktop/reporting/onecgiar_pr-P2-3472` **a propósito** (Yeck, 3-sep-2026: *"eso habíamos dado
claridad y era worktree"*). En este repo un commit en `performance-refactor` **es de hecho un
despliegue**, aunque no lo pushee yo. Para probar no hace falta commitear: el cliente local corre con
los archivos sucios. Regla completa en `~/Desktop/reporting/.claude-rules/reglas-detalle.md`, regla 2.

## Gate

`npm run build:dev` exit 0 · **8118 tests en 511 suites**, verde. Corrido **dos veces**: la segunda
después del merge `e21169b83` de la sesión vecina, para cubrir el árbol combinado.

## Lo que queda suelto

- 🟡 El componente **no tiene `.spec.ts`**. Su hermano `pr-dialog` tampoco, así que no rompe
  convención ni el coverage del CI, pero el modal no tiene red.
- 🟡 `createdIssueUrl` se guarda en el componente y **no se usa** en la plantilla: el éxito muestra
  la clave (`P2-XXXX`) pero no la enlaza. Si se quiere que el usuario abra su ticket, falta el `<a>`.
- Los cuatro worktrees `onecgiar_pr-P2-3472*` ya no aportan nada: su contenido está en la rama de
  trabajo. Se pueden barrer cuando Yeck lo autorice (borrar ramas requiere su OK explícito).

---

# 🔴 4-sep-2026 — todo envío fallaba: `Digital Tools` no es un objeto, es un array

**Síntoma en pantalla:** *"Something went wrong sending your report. Please try again."* en cada
envío, con la lista de "Someone may have reported this already" funcionando perfectamente al lado.

## Por qué engañaba

Los GET (`/similar`, `/my-reports`) andaban bien: credenciales, salida a Atlassian y CORS estaban
sanos. Solo fallaba el `POST`. Y el `POST` **no había cambiado de contrato**: lo que cambió fue el
payload, en `c9c02c75f` — el commit que añadió `priority`, `labels` y `Digital Tools`. La
verificación end-to-end del 3-sep (`8badd44c1`) se hizo **sobre el payload anterior**, que no
llevaba ninguno de los tres. Nunca se volvió a probar contra Jira después de añadirlos.

## La causa

`customfield_10521` (*Digital Tools*) es un **multi-select**:

```
schema: {"type":"array","items":"option","custom":"...:multiselect","customId":10521}
```

Se enviaba como objeto suelto (`{ id: '10215' }`) y Jira rechaza **el create entero** con:

```
HTTP 400 {"errors":{"customfield_10521":"Specify the value for Digital Tools in an array"}}
```

No se crea nada. El servicio traduce ese 400 a `Could not submit feedback to Jira` y el modal lo
muestra como el mensaje genérico. **Arreglo:** `[{ id: '10215' }]`.

## Cómo se diagnosticó sin escribir en el tablero

Tres sondas, todas de lectura o sin efecto:

1. **`createmeta`** (`GET /rest/api/3/issue/createmeta/P2/issuetypes/{10003,10105,10002}`) — dice qué
   campos admite la pantalla de creación, con sus `allowedValues` **y su `schema`**. Ahí estaba el
   `type: array`. Es la primera parada para cualquier error de campo en Jira.
2. **`POST` con `type` inválido** al propio endpoint: nuestra validación corta antes de tocar Jira,
   así que sirve para medir el transporte sin crear nada. Con adjuntos de 1/3/6 MB devolvió `400` en
   ~0,5 s → **descartado tamaño de cuerpo y timeout de gateway** (Apache y el `50mb` de `main.ts`
   aguantan; se probaron 8 MB reales).
3. **`POST` a Jira con el payload exacto y `summary: ""`** — Jira valida **todos** los campos antes
   de crear, así que devuelve el listado de errores sin escribir una línea. Con el array corregido la
   única queja que quedó fue el `summary` que se vació a propósito: prueba de que `priority`,
   `labels`, `parent`, `reporter` y `Digital Tools` ya pasan, en Bug **y** en Enhancement.

## Lo que además quedó verificado (nunca lo estaba)

La cadena completa contra Jira real, con el arreglo puesto y con el mismo `axios` (1.10) y el mismo
`FormData` nativo del servicio:

| Paso | Resultado |
|---|---|
| create Bug con el array | `201` → `P2-3575` |
| subir adjunto PNG (`X-Atlassian-Token: no-check`) | `200` |
| subtarea de consola (issuetype `10002`, `subtask=true`) | `201` → `P2-3576` |

`P2-3575` y `P2-3576` eran **sondas sintéticas**: borradas el 4-sep con OK de Yeck.

## Candado

`feedback.service.spec.ts` — tres casos nuevos: el array de *Digital Tools* (assert de forma, no solo
de presencia), las tres labels con el `priority` elegido, y el fallback a Medium con un id desconocido.
Antes el spec no miraba ninguno de los tres campos, y por eso 12 tests verdes convivían con un módulo
que no creaba ni un ticket.

> 🥇 **La lección:** un endpoint verificado end-to-end deja de estarlo en cuanto se le añade un campo
> al payload. La verificación caduca con el payload, no con el endpoint.

## ✅ Verificado en prtest tras el despliegue (4-sep, build #2145)

`19cdc1ccb` subió en el merge `8c8000ff8` (junto a `ef1484067` de otra sesión, autorizado por su
dueño, y a los 6 commits de Juanda que ya estaban en `origin`). Build **#2145 SUCCESS**, 13 min.

Contra `prtest-back` con el token real, después del despliegue:

| Envío | Resultado |
|---|---|
| `type: bug` + `consoleLogs` | `201` → `P2-3579`, subtarea de consola `P2-3580` |
| `type: adjustment` + captura adjunta | `201` → `P2-3581`, `attachmentsUploaded: 1` |

Los dos caminos de `issuetype`, la subtarea y el adjunto quedan probados **en el ambiente**, no solo
en local. Sondas previas: `/api/results/get/all/simplified` → `200` (la app sirve; ⚠️ el catálogo de
CLARISA ahora pide auth y devuelve `401`, ya no vale como sonda anónima).

✅ **Sondas sintéticas ya borradas** (OK de Yeck, 4-sep): `P2-3575` + `P2-3576`, `P2-3579` +
`P2-3580`, `P2-3581` — los cinco devuelven `404` y el épico quedó con **0 hijos creados hoy**.
Se borraron con guardia por título (`ZZZ*`) y los padres con `?deleteSubtasks=true`, porque las
subtareas se llaman *"Console output — …"* y no llevan el prefijo: un `DELETE` del padre sin ese
parámetro devuelve `400`, no borra nada y parece un permiso denegado.

⚠️ **Del pipeline, para no perder el tiempo:** el build **#2143 salió rojo sin culpa de nadie**.
Murió en `Build Frontend`, en `COPY --from=build .../dist/onecgiar-pr-client/browser` → *"not
found"*, con el log diciendo justo antes *"Application bundle generation complete"*. El **#2144**, con
la misma punta, salió SUCCESS. Es el `COPY`/caché de Docker, no el build de Angular: **reintentar**.
El **#2141** murió parecido, en `Deploy Frontend` con `docker pull ...:2141` exit 1. Dos de cuatro
builds seguidos caídos por infraestructura, ninguno por código.
