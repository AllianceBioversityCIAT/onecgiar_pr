# Alcance nuevo — 2-sep-2026, decisión del jefe de Yeck

**Manda esto hasta nuevo aviso.** Sustituye cualquier lista de trabajo anterior.

----------

## 🟢 LO NUESTRO — cuatro tipos de resultado, épico `P2-3243` (Camila · **Yecksin**)

| Tipo | Grupo |
|---|---|
| **Innovation Development** | Outputs |
| **Innovation Use** | Outcomes |
| **Policy Change** | Outcomes |
| **IPSR** | Outcomes |

## 🔵 FUERA DE NUESTRO ALCANCE — épicos `P2-3472` y `P2-3415` (JuanPa · **Santiago**)

**Knowledge Product** · **CapDev** · **Other Output** · **Other Outcome**

⇒ Los dos épicos **ya están a nombre de Santiago**, así que no hay reasignación de épico que hacer.
Lo que queda es no tomar actividades de esos cuatro tipos, y pasarle las nuestras que lo sean.

## 🧭 Y sigue vigente el reparto por MÓDULO (regla 24)

**Juan Carlos** → Result Framework & Reporting · **Juan David** → bilaterales, migraciones, green
check, ToC · **Nosotros** → formularios W1/W2.

🥇 **Son DOS filtros, y en este orden:**
1. **¿De qué módulo es?** Si es bilateral o Result Framework → su dueño, aunque sea sencilla.
2. **¿De qué tipo de resultado es?** Si es KP, CapDev, Other Output u Other Outcome → Santiago.
3. Solo si pasa los dos, es nuestra.

----------

## Lo que queda pendiente DENTRO del alcance nuevo

- **`P2-3420` / `P2-3421`** (Innovation Use, el desplegable de innovaciones QA'd) — **desbloqueadas
  hoy**: Ángel resolvió la contradicción **editando las descripciones a las 09:13**, y ganó *"las
  discontinuadas SÍ entran"*. 🛑 **Van por su novena reescritura: releer desde cero antes de codear.**
  Y comprobar si sigue en pie el límite a la fase anterior del 31-ago.
- **`P2-3272`** (Innovation Development, IPR) — reescrito dos veces hoy. Nada que deshacer: el correo
  ya sale al enviar el resultado (Option B, lo que el PO confirmó) y el gate de lo entregado es de año
  de fase. 🔴 **Queda un hueco que muerde después**: el bloque de propiedad intelectual sigue con
  cuatro preguntas y **sin condición de fase** — cuando llegue la pregunta consolidada hay que
  gatearlo, o los reportes de 2025 pierden las preguntas con las que se respondieron.
- **El campo de actores de Policy Change** (`W-20260902-21`) — el código está **completo en el repo**;
  espera **despliegue del server**. Re-medir escribiendo un número en `8997` y comprobando que
  `GET /api/results/summary/policy-changes/get/result/11465` devuelva la clave `actors_influenced`.
- **El décimo sitio del fallback de fase** (`policy-change-info.component.ts`) — commiteado, **sin
  verificar en pantalla**. El experimento está escrito en `barrido-siguiente-tanda.md` §2.
- **La fila de actor sin tipo de Innovation Use** — se descarta en silencio al guardar, después de
  haber mostrado el total. Dentro del alcance, **esperando decisión de Yeck**.
- **`P2-3265`** (Innovation Development, scaling studies) — front hecho, bloqueado en el green check
  de Juanda (`P2-3494`).

## Lo que sale del alcance y hay que entregar, no rehacer

El barrido de los cuatro tipos que salen **está escrito por tipo** en
`docs/context-ai/barrido-2026-09-02.md`, así que se entrega tal cual. Incluye el ciclo MELIA del
Knowledge Product ya ejercido, y los datos de prueba puestos: **8994, 8998, 8999** y **9000** (este
con el handle `10568/180072`). Los handles de 2026 sin usar y la vía para sacar más están en
`barrido-siguiente-tanda.md` §3.

## ⚠️ Y el punto ciego que costó no ver 45 actividades

El censo de trabajo vivo **no se filtra por sprint**: activas a nombre de Yeck son **4 en el sprint
abierto** y **49 sin filtrar**. Entre las invisibles estaban el propio épico `P2-3243`, `P2-3220`,
`P2-3221` y `P2-3272`. Y **paginar siempre**: un tope redondo de "100" era truncamiento, el universo
era 117.
