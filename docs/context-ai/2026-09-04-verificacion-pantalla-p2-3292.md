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

## ✅ VERIFICADO END TO END — 4-sep-2026 17:40, build #2158

**Condiciones:** `#2158 SUCCESS` (identificado por la línea de checkout de la rama, no por el color),
cliente servido 17:35 UTC sello **v39**, y ambiente declarado quieto solo tras **tres sondas verdes
seguidas a dos endpoints distintos**.

| Paso de R23 | Medida | Resultado |
|---|---|---|
| Catálogo al abrir la pantalla | opciones cargadas **sin clic** | **14**, y sin "No information found" |
| Elegir dos | casillas marcadas | **2** |
| Guardar | `PATCH create/general-information` | **200 OK** |
| **RECARGAR** | selección tras el reload | 🥇 **2, y las dos correctas** |
| `NG0103` en consola | ocurrencias | **0** (con `NG0912` ×2 como control positivo) |

**Y la prueba de que el DATO es correcto, no solo la pantalla** — leído del servidor después:

```
id=11438   code=8970   tipo=merge   título="test bilateral JD"
id=11436   code=8968   tipo=merge   título="Test for QAed Result"
```

Los ids son los internos correctos y **los títulos coinciden con lo que se eligió en pantalla**. Ese
control es el que cazó el bug de datos: antes salía *"Unraveling the genetic architecture of stripe
rust resistance"* donde el reportero había elegido *"test bilateral JD"*.

⚠️ **Las dos filas corruptas de las pruebas anteriores quedaron reemplazadas** por el propio guardado
(`replaceForResult` desactiva las que ya no están y reactiva las que vuelven), así que no hizo falta
borrar nada en prtest.

## 🛑 Los dos defectos que solo aparecieron al COMPLETAR la recarga

Ninguno de los dos se veía parándose en el `200`. Los dos salieron al leer lo guardado.

### 1. Se guardaba el `result_code` donde va el `id` — y se almacenaba OTRA innovación

`target_result_id` es FK a `result.id`, y el desplegable entregaba `result_code`. Medido: el reportero
eligió **"test bilateral JD"** (id `11438`, code `8970`), se guardó **8970 como id**, y 8970 es el id
de otro resultado real ⇒ al releer aparecía *"Unraveling the genetic architecture of stripe rust
resistance in ICARDA spring wheat"*. **Sin error y sin aviso.**

🥇 **Y el FK NO protegió.** Aceptó 8970 porque ese id existe. **Un FK caza los ids inexistentes, nunca
los equivocados** — y con ~11.000 resultados, casi cualquier código es también el id de algo.

⚠️ **Los 35 tests pasaban con el defecto puesto**, porque el catálogo de prueba solo traía
`result_code`: guardar uno u otro **no era distinguible**. Ahora `id = code + 2500`, distinto a
propósito, y si algún día se igualan los candados dejan de vigilar sin avisar.

### 2. El catálogo no se cargaba nunca en la recarga

La carga anticipada estaba condicionada a "hay una razón de transición tildada" — pero **las razones
llegan en una petición POSTERIOR** a la del formulario: el padre dispara
`GET_investmentDiscontinuedOptions` dentro del callback de la respuesta principal
(`rd-general-information.component.ts:214`, asignadas en `:304`). Así que en `ngOnInit` la guarda
siempre decía "no hay transición".

**En pantalla:** la razón volvía tildada y el desplegable decía *"No information found"* con la
selección guardada invisible. **El reportero abre su resultado y cree que se le borró la respuesta**,
aunque esté a salvo en la base. Ahora se activa por `is_discontinued`, que sí viaja en el cuerpo
principal.

**Candados, cada uno con su mutación y `assert` de que el parche coincidió:** guardar el code → 2
rojos · resolver por code → 10 rojos · **`optionValue="result_code"` en la PLANTILLA → 1 rojo** (el
más importante: sin él el componente puede estar perfecto y la pantalla seguir rota, porque un test
que llama al método directamente no ve lo que el control emite) · volver al criterio de la razón
tildada → 1 rojo. Commit `f96e7995f`.

## 🛑 Lo que quedó sin poder verificar en su momento (histórico)

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

## ✅ Causa raíz del 500 — encontrada, y era nuestra

**`P2-3589`.** Confirmado primero que el defecto seguía vivo con el ambiente quieto (`demon`, tres
sondas verdes a dos endpoints, cero builds en vuelo), y luego bisecando el payload contra prtest.

🎯 **La declaración, no la consulta.** `result-innovation-merge-split.entity.ts` declaraba los dos
ids como relaciones en vez de columnas:

```ts
@ManyToOne(() => Result, (r) => r.id, { nullable: false })
@JoinColumn({ name: 'origin_result_id' })
origin_result_id: number;          // ← relación, no columna
```

Con eso, `find({ where: { origin_result_id: id } })` **no compara un escalar**: TypeORM lo lee como
una condición anidada sobre la entidad relacionada. Y el id llega desde SQL crudo, donde mysql2
devuelve los `bigint` como **string** — las claves enumerables de un string son sus índices, de ahí
`Property "0" was not found in "Result"`.

🔴 **El alcance real era mucho peor que "no se puede guardar una innovación descontinuada":**
`replaceForResult` se llama en **las dos ramas** del bloque de discontinuación, y ese bloque corre
para `result_type_id == 7 || == 2`. Es decir, **ningún Innovation Development ni Innovation Use podía
guardar General information**, marcase el reportero lo que marcase. Los demás tipos guardaban bien, y
eso es lo que lo volvía invisible: el 500 parecía específico de la descontinuación.

**La medida que cerró el caso** (`demon`): un Policy change (tipo 1) guardó **200** con el mismo cuerpo
con el que un tipo 7 daba **500**. No midió que algo fallara — midió **dónde deja de fallar**.

**El arreglo**: columna y relación como propiedades separadas, que es la convención que ya usa
`Result` (`version_id` + `obj_version`, `result.entity.ts:266-277`). **Sin migración**: los nombres de
columna no cambian. Commit `a9fcebae3`.

### 🛑 Por qué ningún gate lo vio — y de ahí el candado

| Gate | Por qué es ciego |
|---|---|
| `tsc` | un `@ManyToOne` tipado `number` compila perfectamente |
| tests del repositorio | mockean el `find`, así que nunca construyen el grafo real de metadatos |
| `build:dev`, `eslint`, las dos suites | estaban **en verde** con el defecto ya desplegado |
| build de Jenkins | **SUCCESS** — esto no rompe el arranque, rompe en la consulta |

⇒ El candado (`entities/result-innovation-merge-split.entity.spec.ts`) afirma sobre los **metadatos**
de TypeORM, no sobre el comportamiento: un test de comportamiento con el `find` mockeado **pasa con
el bug puesto**. Verificado por mutación: reintroducir la relación sobre el escalar da **4 rojos de 7**.

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
