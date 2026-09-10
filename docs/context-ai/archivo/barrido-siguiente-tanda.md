# Barrido — guion de la siguiente tanda

**Escrito el 2-sep-2026**, al cerrar el barrido de los siete tipos
([`barrido-2026-09-02.md`](barrido-2026-09-02.md)). Esto es lo que hay que medir **cuando aterricen**
los cambios que ahora están en vuelo — no antes: medir sobre un build que no los lleva produce el
falso fallo más convincente que existe.

## 0) Puerta de entrada, siempre

```bash
curl -s -H "Cache-Control: no-cache" "https://prtest.ciat.cgiar.org/main.js?x=$RANDOM" | grep -o 'APP_VERSION = "[0-9]*"'
```
Y el ambiente medido **dos veces** separadas por minutos, mirando el **cuerpo** y no el código.
Se habla de **"vN o superior"**, nunca de un número exacto: el ambiente se mueve varias veces al día.

----------

## 1) El desplegable de Innovation Use — lo que más riesgo trae

**Por qué:** Ángel resolvió la contradicción entre `P2-3420` y `P2-3421` **editando la descripción**
(1-sep 09:13), no comentando, y ganó la versión que **incluye las innovaciones discontinuadas**. O sea
el filtro de estados **acaba de ensancharse**, y es portfolio-wide.

**Qué medir:**
- Que en el desplegable **aparezcan** las innovaciones discontinuadas (era justo lo que una de las dos
  historias excluía).
- Que el alcance sea **de todo el portafolio**, no solo del Science Program propio.
- 🛑 **Contraste de fase obligatorio:** abrir un resultado de **fase 2025** y comprobar que su
  desplegable **no cambió** — el requisito es de 2026 en adelante y hay resultados de 2025 dentro del
  portafolio P25 (regla 9).
- Y el ciclo completo: elegir una innovación → guardar → **recargar** → sigue elegida.

## 2) El décimo sitio del fallback de fase — `policy-change-info.component.ts:144`

Ya está en arreglo. Cuando aterrice, la comprobación es **exactamente** la que dejó la evidencia:

```js
await page.route('**/api/results/get/10969*', async route => {
  const resp = await route.fetch(); const json = await resp.json()
  json.response.phase_year = null; delete json.response.reported_year_id
  await route.fulfill({ response: resp, json })
})
// 8501, ?phase=34 → la guía de Policy type DEBE salir legacy ("…include written decisions…")
```
Y medir **siempre el baseline sin interceptar** en la misma tanda: si el baseline ya sale mal, el
problema no es el fallback.

## 3) El mensaje de rechazo del Knowledge product

Reescrito (`7698a6c06`), y con un hermano que salió de paso: cuando CGSpace **no trae año**, el texto
decía *"a cgspace year of **undefined**"*. Al aterrizar, reportar un handle antiguo y otro sin año, y
leer los dos textos en pantalla — deben decir en lenguaje llano el año de la publicación y que solo se
aceptan de 2026 en adelante.

**Handles de 2026 disponibles** (verificados por API): `10568/182745` · `10568/185063` ·
`10568/180803` · `10568/181823` · `10568/178431` · `10568/181799` · `10568/178936`.
Ya usado y **no reutilizable**: `10568/180072` (está en el resultado `9000`).
Para sacar más, la API REST de CGSpace — **la URL de navegador devuelve 751 bytes y cero handles**:
```bash
curl -s "https://cgspace.cgiar.org/server/api/discover/browses/dateissued/items?startsWith=2026&size=10&sort=dateissued,desc"
```

## 4) La fila de actor sin tipo — `W-20260902-16`

Pendiente de una decisión de Yeck (el dominio de Innovation Use estaba congelado). Si la autoriza, el
arreglo es de front y la verificación ya está escrita: añadir un actor **sin** *Actor type*, escribir
los números, guardar y recargar — la fila **no debe desaparecer en silencio**; o se exige el tipo, o se
avisa de que se descartará.

## 5) Lo que NO hay que volver a medir a ciegas

- **El desglose vacío de Innovation development** (`W-20260902-17`): es green check, dominio de Juanda.
  El par para comparar ya está medido: `8869` (verde y enviable) vs `8995`.
- **Cualquier "no se puede poner verde"**: 🛑 buscar **un positivo** antes de afirmarlo. Un lote de
  negativos solo prueba que esos resultados están incompletos.

## Datos de prueba en pie (regla 22 — se quedan puestos)

`8994` Capacity sharing · `8995` Innovation development · `8996` Innovation use ·
`8997` Policy change · `8998` Other output · `8999` Other outcome · `9000` Knowledge product
(handle `10568/180072`). Todos con título *"Barrido 2026-09-02 … do not use for QA sign off"*.
