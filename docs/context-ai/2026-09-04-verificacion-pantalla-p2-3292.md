# P2-3292 en pantalla — qué quedó probado y qué salió mal (4-sep-2026)

**Verified:** 2026-09-04 16:30 · build **#2154** servido (cliente `Last-Modified` 16:14:29, sello `v39`)
**Resultado usado:** código **6432** (id 11494), Innovation Development, fase 2026
**Ticket:** [P2-3292](https://cgiarmel.atlassian.net/browse/P2-3292) · commit del arreglo `f38c13161`

> Este archivo es la evidencia. El veredicto corto vive en el ticket.

## ✅ Lo que quedó VERIFICADO — el NG0103 está resuelto

El defecto era que el desplegable se pintaba con los datos correctos y **el clic no seleccionaba nada**,
con `NG0103` en consola. Medido ahora, paso a paso:

| Paso | Medida | Resultado |
|---|---|---|
| Marcar "No" en *Is this innovation active…* | aparecen las razones | **7 casillas**, incluidas merging y splitting |
| Tildar *"Discontinued: merging with another innovation"* | aparece el desplegable | `Which innovations did this one merge into?` |
| Abrir el desplegable | carga el catálogo | **14 opciones**, formato `código - título` como pide la historia |
| Clic en una opción | **queda marcada** | `marcadas: 1` → **8970 - test bilateral JD** |
| Clic en una segunda | selección múltiple | `marcadas: 2` → + **8968 - Test for QAed Result** |
| Consola durante todo el flujo | `NG0103` | **0 ocurrencias** |

🛑 **Con control positivo, porque un cero sin control no es un cero:** en la misma lectura de consola
`NG0912` aparece **1** vez (una colisión de IDs de componente, preexistente y ajena). El instrumento
lee la consola; el cero de `NG0103` es un cero real.

**Y el endpoint nuevo responde en el ambiente:**
`GET /v2/api/results/get/merge-split-target-innovations/11494` → **200**, y
`GET /api/results/get/general-information/result/11494` devuelve `merge_split_targets: []`, así que
el campo **está en el contrato** de la sección (R25: un campo nuevo vive en varios sitios).

## 🛑 Lo que NO se pudo verificar: guardar y recargar

**El paso final de R23 —guardar, RECARGAR y comprobar que sigue ahí— no está hecho, porque el
guardado de General Information devuelve 500.**

```
PATCH /v2/api/results/create/general-information  ->  500
{"message":"Property \"0\" was not found in \"Result\". Make sure your query is correct."}
```

### No es de P2-3292, y así se separó

| Escenario probado | Petición | Resultado |
|---|---|---|
| Inactiva + razón *merging* + **2 targets elegidos** | PATCH | **500**, mismo mensaje |
| Inactiva + razón *"limited W1/W2 resource availability"* — **sin ningún target** | PATCH | **500**, mismo mensaje |

⇒ El 500 se reproduce **sin un solo target de merge/split**, así que no lo produce el campo nuevo.
El mensaje además nombra la entidad **`Result`**, y el repositorio de merge/split no la toca: opera
sobre `ResultInnovationMergeSplit` y, con la lista vacía, solo hace un `find` y un `update`
condicional. `Property "0"` es lo que dice TypeORM cuando recibe un **array** donde espera otra cosa.

⚠️ **Lo que NO se llegó a determinar, y hay que decirlo:** el tercer escenario (guardar con la
innovación **activa**) salió `ERR_FAILED` en vez de 500, y justo después el backend dio **503 en
0,27 s** — la firma de "no hay nada escuchando". La causa era el **despliegue del #2155** (de otra
sesión) reiniciando el servicio, con el **#2156** encolado detrás. Es decir: **el ambiente cambió dos
veces durante la medición**, así que no puede afirmarse si el 500 sigue vivo tras esos dos builds.
Pendiente: repetir la medición **una vez** con el ambiente quieto.

🥇 **Los dos 500 sí son sólidos**: medidos con el #2154 servido y estable, dos veces, mismo mensaje —
y un backend caído no devuelve un mensaje de TypeORM, lo devuelve una aplicación viva.

## Trampas del flujo, para quien lo pruebe después

- 🛑 **El guardado abre un modal de confirmación y sin confirmarlo NO se envía nada.**
  `rd-general-information.component.ts:341` → `if (isP25 && hasDiscontinuedOptions)` muestra
  *"Confirmation Required … Would you like to continue?"*. Costó tres intentos: se veía "cero
  peticiones de red" y parecía que el botón estuviera muerto.
- ⚠️ **Ese modal tapa el botón de guardar** (`pr-dialog-mask--modal intercepts pointer events`).
  Al principio se creyó que la máscara era del desplegable, y un `Escape` para "cerrar el
  desplegable" **canceló el guardado** — otro falso negativo.
- ⚠️ El modal aparece **también con la innovación marcada como activa**.
- 🛑 **Las URLs van por CÓDIGO, no por id**: `/result/result-detail/6432/...`, no `11494`.
