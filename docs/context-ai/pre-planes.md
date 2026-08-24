# Pre-planes en Jira — mapa de actividades

**Verified:** 2026-08-24 · branch `performance-refactor` · `4a0e39f2b`

Salió de `orden-2026-08-26.md` al pasar el tope de 150 líneas. Es el índice de dónde vive el
contexto verificado de cada actividad del empujón del 26.

Cada actividad en alcance lleva una **subtarea `Pre-plan / Context`** con el terreno verificado:
qué pide el ticket, el estado real en código con `archivo:línea`, qué se puede construir ya, qué
está bloqueado y por quién, y qué archivos toca. La idea es que otro chat pueda escribir el plan de
desarrollo completo **sin volver a investigar**.

| Actividad | Pre-plan | Estado del terreno |
|---|---|---|
| `P2-3366` General Information | `P2-3438` | Dos huecos chicos: el copy del botón y el mensaje de campos ocultos |
| `P2-3370` Geographic Location | `P2-3439` | ⚠️ Implementación **paralela**, no reuso del componente de W1/W2 |
| `P2-3375` Evidence | `P2-3440` | ⚠️ Implementación **paralela**, no reuso |
| `P2-3368` Contributors & Partners | `P2-3441` | 🔴 **Bloqueado**: el DTO del server no tiene dónde guardar External partners |
| `P2-3341` Common fields (QA) | `P2-3442` | Section 0 existe; sobra la sección de tipo en Other Output/Outcome |

**Dependencias de backend → `P2-3437`**, asignado a Juan David Delgado. Cinco puntos, y solo esos
cinco: lo demás avanza en paralelo.

⚠️ **`P2-3442` era la referencia que Ángel citó y no existía** (punto 5 de la orden de trabajo).
Ahora existe, pero como el pre-plan de `P2-3341` — así que su cita sigue siendo un typo, no apunta
a esto.

## Índice completo de pre-planes

Modelo: **front y back separados**. Si la actividad entera es back, va completa a Juanda.
Las actividades que son `QA - Enhancement` (tipo subtarea) no admiten hijos → su pre-plan va como
**comentario** en el propio ticket.

| Actividad | Pre-plan | Dueño |
|---|---|---|
| `P2-3341` Common fields (QA) | `P2-3442` | front |
| `P2-3352` Project Information | `P2-3448` | front |
| `P2-3366` General Information | `P2-3438` | front |
| `P2-3368` Contributors & Partners | `P2-3441` front · **`P2-3443` back → Juanda** | mixto |
| `P2-3370` Geographic Location | `P2-3439` | front |
| `P2-3375` Evidence | `P2-3440` | front |
| `P2-3382` Capacity Sharing | `P2-3444` | front |
| `P2-3384` Knowledge Product | `P2-3447` | front |
| `P2-3387` Other Output / Outcome | `P2-3446` | front |
| `P2-3388` Policy Change | `P2-3445` | front |
| `P2-3328` / `P2-3329` / `P2-3330` / `P2-3332` (QA bilateral) | `P2-3453` / `P2-3454` / `P2-3455` / `P2-3456` | front |
| `P2-3241` Capacity Sharing (crear) | `P2-3452` | front + decisión en `P2-3437` |
| `P2-3321` Other Output (crear) | `P2-3451` | **sin trabajo de dev — espera QA** |
| `P2-3371` Policy Change (crear) | `P2-3450` | front |
| `P2-3373` Other Outcome (crear) | `P2-3449` | front |
| `P2-3336` AoW Scoping Rules | `P2-3457` | front, pendiente confirmar si el flag existe |
| `P2-3254` · `P2-3358` · `P2-3262` | comentario en el ticket | front |

**Backend → `P2-3437`** (índice, Juanda) y **`P2-3443`** (el DTO de contributors, Juanda).
