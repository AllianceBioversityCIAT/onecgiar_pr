# 3-sep-2026 — Seis dudas paradas, cero eran de negocio

Yeck decidió en sesión las que llevaban semanas esperando a Ángel. **Ninguna se le mandó**: dos las
contestaba ya el texto de la propia historia, tres eran de interfaz y una de permisos de pantalla.

----------

## `P2-3537` — Innovation Use, bloque *Current Use Update*

**Q1 — La proyección/uso del ciclo anterior llega vacío.** → **No se muestra el bloque.**
Fuente: la historia misma (*"this story assumes Scenario A"*). Ángel solo confirmaría su propio texto.
Consecuencia: quien reporta por primera vez de verdad no tiene que evidenciar un "incremento" sobre
un número que nunca existió.

**Q2 — ¿La validación GESI dura muerde hacia atrás?** → **No.** Solo de la fase 2026 en adelante.
Fuente: la regla que gobierna el épico `P2-3243` (nota del PO del 23-ago). Un reporte de 2025 que se
abra de nuevo se comporta exactamente como hoy.

**Q3 — ¿Dónde se sube la evidencia de los usuarios nuevos?** → **En la sección *Evidence*, con un
tick más** (Yeck, 3-sep). El mecanismo ya existe: cada evidencia se marca para lo que sustenta y uno
de esos marcadores ya es sobre uso de innovación. El mismo archivo puede servir a dos propósitos sin
subirlo dos veces, y la evidencia del reporte no queda partida en dos listas.
⇒ **No hace falta sitio nuevo donde guardar archivos.** Solo un marcador más.

**Q4 — ¿Qué suma el "Total cumulative current use to date"?** → **Solo los Actores** (Yeck, 3-sep).
El total es de **personas**. Y la mitad que importa: **si no hay actores, el bloque no se muestra**.
Sin eso, quien reporta legítimamente solo organizaciones vería un error permanente ("sus actores
suman 0 y el total dice 12") y **no podría enviar nunca**.
⇒ Es la cifra que se guarda y que el ciclo siguiente sale como *uso previo*: **cambiarla después
obliga a migrar lo ya escrito**.

## `P2-3292` — Innovation Development, Step 4 (auto-bloqueo)

**¿Se puede reabrir una innovación cerrada por error?** → **Sí, un administrador puede** (Yeck,
3-sep). Se bloquea en cuanto la persona confirma, como pide la historia, pero queda una salida
controlada.
Razón: el bloqueo definitivo repone el bug que QA reportó y que ya se cerró como arreglado en
`P2-2923` — quien cerraba por error quedaba atrapado sin vuelta atrás.
⇒ **No toca ni un dato**: es permiso de pantalla. Cambiar la decisión mañana es un `@if`.

## `P2-3295` — la frase del Yes/No

Es redacción de interfaz, no negocio. Queda **"Do you need to revise the 2030 projection reported in
the previous phase?"**, que es lo que ya está en pantalla en prtest desde el build v26.

----------

## Lo que sí sigue esperando a alguien de fuera

| Qué | De quién |
|---|---|
| El texto de los dos correos de IP y el enlace *"What is Intellectual Property?"* (`P2-3272` Part 3) | **Nicoleta Trifa**, no Ángel |
| El cuerpo vivo de `validation_innovation_dev_P25` (`SHOW CREATE FUNCTION` o VPN) | quien tenga acceso a la base — es un pedido de acceso, no una decisión |
| Un Innovation Use de 2025 pasado a 2026 para poder probar `P2-3295` punto 3 | quien pueda correr el cambio de fase; hoy no hay ninguno en prtest (medidos los 9.509) |

## 🥇 El patrón, por tercera vez

El 2-sep un barrido de las 24 clarificaciones paradas en la cola de Ángel encontró que **19 no
esperaban a negocio**. Hoy, de seis, **cero**. El filtro que funciona es el de la regla 19: *¿cambia
lo que el sistema considera CORRECTO, o solo cómo se ve?* Si es lo segundo, no es de él.
