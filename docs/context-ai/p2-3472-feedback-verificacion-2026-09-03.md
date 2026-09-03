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
