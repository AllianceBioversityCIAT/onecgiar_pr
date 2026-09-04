# Censo "To Be Deployed" vs lo que está en `dev` — 2-sep-2026

**Petición de Juan Carlos (Slack, 14:30):** *"todas las actividades que ya estén en DEV y estén en
estado To Be Deploy marquémoslas como done"*.

La parte que decide es **"que ya estén en DEV"**: eso se comprueba, no se supone. Marcar cerrado algo
que no está en `dev` firma un comportamiento que nadie tiene.

## Método (repetible)

1. `git fetch origin dev` y extraer los `P2-\d+` de **todo** el historial de `origin/dev`.
2. Extraer los `P2-\d+` de `origin/dev..origin/performance-refactor` con `--no-merges` — lo que
   **falta** por mergear.
3. Cruzar contra el JQL `project = P2 AND status = "To Be Deployed"` (**sin filtro de sprint** y
   paginando: el tope de 100 y `openSprints()` son los dos puntos ciegos habituales).
4. Cerrar solo lo que está en `dev` **y** no tiene commits reales fuera de `dev`.

🛑 **Dos trampas medidas hoy, las dos dan falsos negativos:**
- Leer solo el **título** del commit (`%s`). Con `%B` (título + cuerpo) el universo pasó de 321 a
  **331** tickets en `dev`, y 3 actividades cambiaron de bucket.
- Contar **merges** como trabajo pendiente. `c0023d12d` ("Merge branch 'P2-2928-TOC-Improvements'…")
  cita tres tickets por el nombre de la rama sin aportar código: sin `--no-merges`, tres actividades
  ya mergeadas parecían tener trabajo suelto.
- Control positivo/negativo obligatorio antes de creerse el resultado: `P2-3472` (desplegado) debe
  salir en `dev`; `P2-3420` (de hoy) no debe salir.

## Resultado — lo de Yeck

**Cerradas (12)**, enteras en `dev`: `P2-2929` `P2-3036` `P2-3061` `P2-3062` `P2-3063` `P2-3066`
`P2-3085` `P2-3106` `P2-3114` `P2-3116` `P2-3131` `P2-3132`.
🛑 Desde `To Be Deployed` **no existe transición a `Done`** en este flujo: el único estado de
categoría *Done* alcanzable es **`Released Into Live`** ("Merged into live environment"), y ahí
quedaron. Si hiciera falta el estado `Done` literal, hay que pedirle a un admin la transición.

**No cerrada, a propósito (1):** `P2-2998` — tiene un arreglo posterior que **no llegó a `dev`**
(`0e6b2b418`, 27-ago, recomputar la lista de lead center desde el desplegable "Other(s)"). Cerrarla
firmaría un comportamiento que `dev` no tiene. Anotado dentro del ticket.

**No están en `dev` (22):** `P2-2967` `P2-2969` `P2-2970` `P2-2971` `P2-2972` `P2-2973` `P2-3246`
`P2-3248` `P2-3254` `P2-3261` `P2-3298` `P2-3299` `P2-3300` `P2-3303` `P2-3312` `P2-3320` `P2-3342`
`P2-3545` `P2-3546` `P2-3547` `P2-3548` `P2-3549` — su código vive solo en `performance-refactor`.

**Sin rastro en ninguna rama (5):** `P2-2930` `P2-3003` `P2-3117` `P2-3135` `P2-3211`. ⚠️ Un cero
aquí **no** prueba que no estén en `dev`: prueba que ningún mensaje de commit las cita. Se dejan
quietas: para cerrarlas hace falta otra evidencia (el panel de desarrollo del ticket, o mirar el
cambio en pantalla).

## Lo de los demás — informativo, no se tocó nada ajeno

- **Juan David**: en `dev` → `P2-3086` `P2-3112` `P2-3239` · fuera de `dev` → `P2-3225` `P2-3227`
  `P2-3235` `P2-3253` `P2-3307` `P2-3308` · sin rastro → `P2-3098` `P2-3099` `P2-3271`.
- **Juan Carlos**: fuera de `dev` → `P2-3477` `P2-3481` · sin rastro → `P2-3311` `P2-3476` `P2-3480`
  `P2-3483` `P2-3501`.
- **Santiago**: sin rastro → `P2-3499` `P2-3500`.
