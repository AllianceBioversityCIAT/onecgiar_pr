# La cadena de defectos que salió de requisitos incompletos

**Verified:** 2026-09-09 · branch `performance-refactor` · `931819dc8`
**Ticket espejo:** [P2-3432](https://cgiarmel.atlassian.net/browse/P2-3432) — Context AI.
**Épica de la que salió casi todo:** [P2-3243](https://cgiarmel.atlassian.net/browse/P2-3243) — SIDS revision 2026, Results Forms Update.

> Escrito a petición de Yeck (9-sep-2026): *"espero que documentes todo eso que se desprendió por no
> hacer bien los requerimientos"*. No es una lista de culpas — es el inventario de lo que cuesta un
> requisito que no dice lo que tiene que decir, con el defecto concreto que produjo cada hueco.

----------

## 🥇 El patrón raíz, en una frase

**Nunca se escribió un requisito que defina el CAMBIO DE RONDA como comportamiento.** No existe un
documento que diga qué se copia cuando un resultado pasa a la ronda siguiente, qué no se copia, qué
pasa con los archivos, y qué pasa con lo que ya se copió mal.

La consecuencia es que **cada pieza de ese requisito ausente se ha descubierto de una en una, como un
bug independiente**, y cada una ha costado una investigación completa. Son siete hasta hoy. Si
existiera ese requisito, serían **una sola tabla de una página**.

----------

## A) Lo que debe sobrevivir a un cambio de ronda: siete descubrimientos, cero especificación

| Qué se perdía | Ticket | Cuándo se supo | Estado |
|---|---|---|---|
| Las marcas de sección de cada evidencia | P2-3568 | 7-sep-2026, midiendo en prtest | Arreglado (`a985105f2`, `c278569b4`) |
| Los dos datos de desagregación por edad en Actors | P2-3603 | 7-sep-2026 | Arreglado (`72cace286`) |
| La respuesta de texto libre "addressing demands" | P2-3603 | 7-sep-2026, respuesta de negocio de Yeck | Arreglado (`69dd1f2e7`) |
| Actores y medidas de Innovation Use | P2-3514 | 28-ago-2026 | Cerrada **por decisión** de Cami, 8-sep: *"dejémoslo así"* |
| **Los archivos de evidencia — nunca se copiaron** | P2-3601 | 7-sep-2026, medido en prtest | Arreglado hoy (`931819dc8`) |
| La reparación de los datos ya rodados mal | P2-3607 | 7-sep-2026 | Abierto, con Cami y Juan David |
| Los archivos de evidencia en el cambio de ronda de **IPSR** | — | 9-sep-2026, verificado hoy | 🛑 **Nunca ha copiado nada**, sin ticket |

- Fuente del último: `versioning.service.ts:515` (el bloque IPSR solo llama `_evidencesRepository.replicate`)
  contra `:404-406` (el de reporting llama además `evidenceSharepoint.replicate` y `replicateSPFiles`).
  Verificado por lectura hoy; **no** medido en pantalla.
- 🥇 **Lo que más cuesta no es arreglar cada uno: es que aparecen de a uno.** P2-3601 se descubrió
  *investigando P2-3568*, y el hueco de IPSR se descubrió *investigando P2-3601*. Nadie sabe cuántos
  quedan, porque no hay una lista contra la que comparar.

### El caso extremo: dos años y medio de datos

**P2-3601 en detalle, porque es el que mejor mide el coste.** La copia de archivos se escribió en
nov-2023 y funcionaba (`LFUB-1208`, seis commits, `git log`). El 15-feb-2024, el commit `571f9ff4c`
—*"refactor(phases): The versioning module was improved and updated"*— envolvió el cambio de fase en
una transacción y **se llevó la llamada dentro**. Desde ese día no copió nada.

- Nadie lo notó en **19 meses**, porque no existía ni un test de esa ruta ni un requisito que dijera
  que los archivos deben copiarse.
- `Reporting 2025` se creó en jul-2025 y `Reporting 2026` el 9-abr-2026 (`GET api/versioning/all`,
  verificado hoy): **los dos rollovers corrieron ya con el defecto**.
- Consecuencia medida hoy: código 8552 → evidencias 12761/12789 y 12762/12790 comparten
  `sp_document_id`, `sp_folder_path` "/Reporting 2025/Result 8552" **y el mismo `link`**.
- 🛑 Y el código se arregla con un commit; **los datos no**. `git revert` no devuelve un archivo que
  no se copió. Eso es P2-3607, y sigue sin criterio.

----------

## B) "El modal de creación" — la misma pregunta huérfana TRES veces

Las historias gemelas P2-3420 / P2-3421 piden una pregunta ("¿reporta el uso de una innovación ya
reportada y evaluada?") en *"el modal de creación"*, **sin decir cuál de las pantallas de creación**.
La plataforma tiene varias, y cambian.

| Intento | Qué pasó | Fuente |
|---|---|---|
| 1º | La pregunta se cableó a una pantalla **retirada y sin rutas** | P2-3569, reportado por Cami el 3-sep-2026 |
| 2º | El diálogo que la mostraba quedó **sin ningún botón que lo abriera** | Verificado 8-sep: `openReportModal()` sin llamadores en todo `src/` |
| 3º | La respuesta **viaja a un sitio del servidor que no la lee** | P2-3604, vivo hoy: `has_innovation_link` no aparece en `results-framework-reporting/**` |

- ⚠️ **Cada vez que se movió la puerta de entrada, la pregunta se quedó atrás.** Es el mismo defecto
  tres veces con tres causas distintas, y ninguna se habría dado si la historia hubiera nombrado la
  pantalla exacta.
- Y la descripción de P2-3421 se **reescribió nueve veces** (registrado en mi comentario del
  2-sep-2026 en ese ticket). Ángel la editaba en vez de responder por comentario, así que un pre-plan
  escrito por la mañana quedaba obsoleto por la tarde sin aviso.
- Coste actual: **P2-3421 sigue sin poder cerrarse**, y P2-3604 está a nombre de Juan Carlos.

----------

## C) Criterios de aceptación que describen otro producto

**P2-3295** (renombrar la sección de proyección 2030 y añadir la revisión anual) traía nueve
criterios. **Tres de ellos describen una pantalla de la aplicación de Calidad, que no es PRMS** — PRMS
solo la embute en un iframe y no pinta nada dentro.

- Resultado: el ticket **no podía cerrarse nunca**, aunque su parte de reporting estuviera entregada.
  Hubo que partirlo: **P2-3560** se lleva la parte que es de otro producto (3-sep-2026).
- 🛑 **Y esa parte además está mal especificada**: pide avisar cuando una cifra cambie más del 20% y
  lista cuatro campos — pero **uno de los cuatro es un sí/no**, donde "20%" no significa nada. Negocio
  tiene que decir qué se compara ahí antes de que nadie pueda construirlo. Sigue sin respuesta.
- Estado: `Open`, a nombre de Juan David, esperando además al dueño de la aplicación de Calidad.

----------

## D) Requisitos que no dicen qué es "correcto"

Cuando el requisito no define la validación, alguien la define después — y normalmente es el
desarrollador, midiendo.

- **P2-3608 / P2-3618 — negativos en la contribución al indicador.** La casilla los aceptaba y los
  guardaba sin avisar (reportado por Cami el 7-sep con grabación), y el servidor también los aceptaba
  por API. Nada del requisito decía qué hacer.
  - 🥇 **La decisión que faltaba y tuvimos que tomar: corregir en vez de rechazar.** Rechazar habría
    bloqueado a quien ya tenía un dato malo de antes. Y el motivo solo apareció midiendo: una fila
    legada con `-1` hoy cuenta como **completa** y su resultado es enviable; con `null` el primer
    guardado la volvía incompleta y **el resultado dejaba de poder enviarse**, la semana antes de
    producción. Juan David lo confirmó desde su lado: el green check lee `IS NOT NULL`.
  - Solo hay **3 filas** con negativo en toda la base (conteo de Juan David, 8-sep) → sin ticket de datos.
- **Qué significa "confidencial" (abierto, 9-sep-2026).** Nadie especificó si marcar una evidencia
  como no-pública debe **revocar el enlace que ya circuló**. Medido hoy en prtest sobre un PDF
  sintético propio (result 9075, evidencia 13081): la plataforma emite un enlace nuevo que pide
  sesión, **pero el enlace público anterior sigue descargando el archivo** (dos medidas, minutos
  aparte, navegador limpio).
  - ⚠️ **NO VERIFICADO** si es un defecto o propagación lenta de Microsoft: hace falta ver los
    permisos reales del documento, y aquí no hay credenciales de Graph.
  - Tablero: `WARNINGS.md` `W-20260909-mateus04`.

----------

## E) Historias incompletas en su propio texto

- **P2-3537 — la historia pide cinco campos y el bloque tiene cuatro.** Falta *"Evidence for the new
  users added"*. Visto al verificar en pantalla el 8-sep; por eso el ticket **no** pasó a UAT.
  - 🛑 Y lo que impide construirlo no es el código: **no se especificó dónde se almacena esa
    evidencia**. Sigue pendiente.
- **P2-3514 — el título del ticket contradecía su contenido.** Decía que se perdían tres cosas;
  `Organizations` **sí** se replica (va fuera del `switch`, verificado en código). Título corregido el
  8-sep. Un título que miente hace que se estime y se priorice sobre algo que no existe.
- **P2-3602 — el contraejemplo, y conviene tenerlo escrito.** Ese ticket pedía *confirmar antes de
  gastar tiempo*. Se confirmó en una lectura que no era defecto (el camino de IPSR nunca escribe datos
  de SharePoint) y se cerró el 8-sep sin escribir una línea. **Así se ve un requisito bien planteado.**

----------

## F) Lo que no se especificó y se volvió trampa técnica

- **`phase_name` es texto libre, sin regla de unicidad, y se interpola en la ruta donde se guardan los
  archivos** (`share-point.service.ts:322-327` → `/{phase_name}/Result {result_code}`).
  - prtest ya tiene **tres fases llamadas "Reporting 2025"** (ids 32/33/34, `GET api/versioning/all`,
    verificado hoy). La creación de fases valida año y módulo, **no el nombre**
    (`versioning.service.ts:1163-1176`).
  - Riesgo latente, **no alcanzable hoy**: una fase con el mismo nombre que su antecesora haría que la
    carpeta destino sea la de origen. Nadie especificó que el nombre de una fase identifica un almacén.
- **La carpeta es el único discriminador de fase de todo el esquema de almacenamiento.** No hay año ni
  portafolio en la ruta ni en el nombre del archivo. Eso no está escrito en ningún requisito: se
  descubrió leyendo el código hoy.

----------

## Lo que costó, en concreto

- **7 defectos** del mismo requisito ausente (el cambio de ronda), descubiertos de a uno entre el
  28-ago y el 9-sep-2026.
- **3 intentos** para poner una pregunta en una pantalla (P2-3420/3421), con la historia reescrita
  nueve veces.
- **1 ticket que no podía cerrarse nunca** (P2-3295) hasta partirlo.
- **19 meses** de un defecto invisible y **dos rollovers completos** de datos afectados, con una
  reparación que a día de hoy **sigue sin criterio**.
- Y el patrón que más se repite: **la suite verde con el defecto vivo**. Pasó en P2-3292 (los tests
  sembraban un booleano que el servidor nunca manda), en P2-3603 (un pin de longitud) y en P2-3601
  (la transacción mockeada como passthrough y una fila sin `is_sharepoint`). Un requisito que no dice
  qué debe comprobarse produce tests que confirman la implementación en vez del comportamiento.

----------

## Qué pediría para que no se repita

Tres cosas concretas, ninguna de proceso pesado:

1. **Un requisito del cambio de ronda**, una vez, con una tabla: qué se copia, qué no, y qué pasa con
   lo ya copiado mal. Los siete defectos de la sección A son piezas de ese documento.
2. **Que cada historia nombre la pantalla exacta** (ruta que ve el usuario, no nombre de componente).
   Las tres huérfanas de la sección B salen de una sola frase ambigua.
3. **Que los criterios que describen otro producto se separen antes de estimar**, no después de
   intentar cerrarlos. La sección C es un ticket que vivió semanas sin poder morir.

Y una de nuestro lado: **cuando el requisito no dice qué es correcto, la decisión se toma, se mide y
se escribe en el ticket** — como se hizo en P2-3618 con el "corregir en vez de rechazar". Callarla es
lo que la vuelve invisible para el siguiente.
