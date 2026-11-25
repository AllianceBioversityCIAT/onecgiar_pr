# innovation-use (results-framework-reporting)

**Verified:** 2026-11-25 · INC-169264 (IU26-T-1/T-2/T-3, changes/innovation-use-2026-total-and-new-users): `getPreviousPhaseCurrentUse` returns the per-category figure, 2026 save guard for the two cumulative fields, 2026 phase copy skips current-use rows (replication note corrected, JD-11) · prior: 2026-11-12 · qa-development-2026-ss · bugfix/innovation-use-youth-required (P2-4049: Non-youth null con Youth vacío en `getActorsData`) · prior: 2026-11-03 · changes/innovation-use-farmer-count-nature (P2-4048) · prior: 2026-10-13 · fix/ai-qa-innovation-use-disaggregation · nivel de uso ausente = NULL; prior: 2026-09-03 · branch performance-refactor

## Qué es
El servicio P25 de la sección **Innovation Use** de W1/W2: lee y escribe uso actual, proyección 2030,
niveles, estudios de escalamiento, inversiones y descontinuación. Endpoints
`GET|PATCH /v2/api/innovation-use/{get|create}/result/:resultId`.

🛑 **No confundir con la ruta legacy** `SummaryService.getInnovationUse`
(`api/results/summary/summary.service.ts`), que devuelve actores, organizaciones y medidas **sin
filtrar por sección** — mezcla uso actual y proyección 2030. Lo nuevo va aquí, no allí.

## Las tres secciones viven en las MISMAS tablas
`result_actors`, `results_by_institution_type` y `result_ip_measure` guardan las dos secciones
distinguidas solo por `section_id` (`ResultCoreInnovUseSectionEnum`: `CURRENT = 1`, `FUTURE = 2`).

- 🛑 **Los readers `getActorsData` / `getOrganizationsData` / `getMeasuresData` NO filtran por
  sección.** Traen todo y el filtro se hace **en memoria** en cada consumidor. Si añades un consumidor
  y olvidas filtrar, mezclas uso actual con proyección 2030 y nadie te avisa.
- La escritura sí lo persiste, en los tres builders (`buildActorData`, `buildInstitutionData`,
  `buildMeasureData`), desde el parámetro `section` que `saveInnovationUse` pasa dos veces.
- ⚠️ **Replicación de fase (corregido IU26, JD-11).** La nota vieja decía que la copia no trae estas filas (incidente P2-3514); desde el 14-oct-2026 la copia
  sí lleva actores, medidas P25, respuestas TBD y nivel, y **desde la fase 2026 (IU26-T-3)** el copiado de un resultado tipo 2 (incluye el cron anual y
  `POST /api/bilateral/version`, vía `$_phaseChangeReporting`) trae SOLO las filas de la sección 2 (actores y medidas P25 de la proyección 2030); las
  organizaciones excluyen el rol 5 fuera de la sección 2 (NULL-safe; socios roles 1/2 se conservan); respuestas IU y medidas legacy se copian como
  hasta hoy; IPSR no cambia. Efecto: un resultado versionado arranca sin uso actual y el valor de la fase previa **se lee por join**, no se espera copiado.
  Evidencia: probado solo con SQL generado (sin banco de datos); falta el conteo de filas en PRTest. Ver la fila 2026-11-25 del change log de
  `docs/bilateral-result-summaries.en.md`. Las columnas de `results_innovations_use` más allá de `male_using` / `female_using` siguen sin replicarse aquí.

## Leer un valor de la FASE ANTERIOR — el patrón, ya resuelto dos veces
`InnovUseExists` (`api/results/summary/repositories/results-innovations-use.repository.ts`) ya trae
`previous_result_id` **y** `previous_phase_year` (y desde IU26 `phase_year` del propio resultado, `v.phase_year`) gracias a los joins `v → previous_v → previous_r`,
que llevaban ahí sin usarse. **Resolver la fase no cuesta un viaje extra.**

| Método | Sección | Qué devuelve |
|---|---|---|
| `getPreviousPhase2030Projection` (P2-3295) | 2 | actores, organizaciones y medidas del previo |
| `getPreviousPhaseCurrentUse` (P2-3537, IU26) | 1 | `summarizePreviousPhaseCurrentUse` → `{result_id, phase_year, total_actors, total_organizations, measures:[{unit, quantity}]}`; solo orgs rol 5; medidas agrupadas por `lower(trim(unit))`; filas elegidas por llamador (v2 sección 1; legacy/W3 NULL o ≠ 2) |

- 🥇 **`total_actors` suma `how_many`, no `women + men`.** `getActorsData` recalcula `how_many` como
  `women + men` en las filas desagregadas y deja el valor tecleado en las que tienen
  `sex_and_age_disaggregation`; sumar las columnas de género **pierde el segundo tipo**.
- 🥇 **`null` no es "cero", es "no hay bloque".** `null` significa que la pantalla no pinta el bloque *Current Use Update*. Desde IU26-R-3 es `null` solo
  cuando actores, organizaciones y medidas están TODOS vacíos: un previo con solo organizaciones devuelve valor (la regla de Yeck del 3-sep ya no aplica: no hay reconciliación).
- **Los dos fallan en blando** y lo hacen a propósito: una fase anterior ilegible no puede costarle
  al usuario la sección que vino a llenar. El lado seguro es "primera vez".
- 🛑 Y **la fase es la del resultado**, no la abierta menos uno: un resultado puede vivir en una fase
  que no es la abierta. De ahí `previous_v.phase_year` y no `$_findPreviousPhaseYear`.

## Un campo nuevo en `results_innovations_use` vive en CINCO sitios
Patrón completo: `innov_use_2030_justification` (P2-3515).
1. Migración a mano (`1788381174569-…`), con `down`.
2. La entidad `summary/entities/results-innovations-use.entity.ts`.
3. 🛑 **El SELECT de `InnovUseExists`, que enumera columna por columna.** Si falta aquí, el dato se
   guarda y **nunca se ve, sin un solo error**.
4. La escritura, en el `update` **y** en el `insert` de `saveInnovationUse` — con `?? null`, nunca `|| null`.
5. El DTO `dto/create-innovation-use.dto.ts`.
- ⚠️ Y **el sexto opcional**: la ruta v1 (`summary.service.ts` → `applyOptionalInnovationUseFields` y
  `getInnovationUse`). `innov_use_2030_justification` **no** está ahí; si el campo debe existir en v1,
  hay que añadirlo.

## Seguimiento Farmers: `count_unit` / `use_nature` (P2-4048)
- Las respuestas viven **por fila** en `result_actors.count_unit` (`households`|`individuals`) y `use_nature` (`information_received`|`innovation_applied`), `varchar(32)` NULL (migración 1793300000000). Constantes y whitelist en `api/results/result-actors/farmer-follow-up.constant.ts` (`FARMERS_ACTOR_TYPE_ID = 1`, por id, nunca por nombre).
- `buildActorData` guarda solo los 4 códigos vía `toCountUnit`/`toUseNature`; cualquier otro valor → NULL (sin fallar el save). Escribe `count_unit` / `use_nature` **solo si la clave está presente** en la fila: un llamador que las omite no borra la respuesta guardada. La misma regla aplica al escritor legado `results/summary/innovation_dev.service.ts`.
- **De-dup de Farmers:** en `saveAnticipatedInnoUser`, una fila Farmers **sin id** se empareja por (tipo, unit, nature), con `IsNull()` cuando falta. Dos filas Farmers con respuestas distintas son dos filas; con respuestas iguales se fusionan. Otros tipos (INC-168062): una fila **sin id** se empareja por tipo y, solo cuando la fila trae la propiedad `use_nature`, también por `use_nature` (vacío empareja con NULL); el tipo 5 además por `other_actor_type`. `count_unit` sigue siendo solo de Farmers. Si la fila no trae la propiedad, el emparejamiento es solo por tipo.
- ⚠️ `saveAnticipatedInnoUser` tiene **4 llamadores**: el controlador v2, el handler bilateral `afterCreate` (sus filas siempre traen la propiedad: `prepareActors` la normaliza a `null`; `count_unit` solo se conserva en Farmers, `use_nature` en todos los tipos), `innovation_dev.service.ts` y la actualización desde revisión (`results.service.ts`). Estos dos últimos no mandan códigos → emparejan por NULL. Consecuencia: una fila Farmers sin id y sin códigos que llega por la ruta de revisión a un resultado 2026 que ya tiene una fila Farmers respondida **inserta** una fila nueva en vez de actualizar (consistente con DD-8).
- Ya no se borran respuestas al omitir los campos (ver `buildActorData` arriba). El cliente (`innovation-use-info.saveSectionWith`) siempre los envía (`?? null`).
- Green check: la función viva `validation_innovation_use_P25` exige ambas respuestas en filas Farmers activas de bloques no "TBD", solo si `phase_year >= 2026` y `source <> 'API'`. El cuerpo vigente está en `docs/specs/archive/*innovation-use-farmer-count-nature/sql/`; la copia del repo sigue desactualizada.

## Guarda de campos acumulados, fase >= 2026 (IU26-R-2, DD-6)
- Para `phase_year >= 2026`, `saveInnovationUse` (v2) y `applyOptionalInnovationUseFields` (ruta legacy `summary.service`) **conservan** `new_users_added` /
  `use_expansion_narrative` guardados cuando el valor llega `undefined`/`null`; `""` y 0 sí se escriben; pre-2026 sin cambios (null borra). El año sale de la fila ya leída:
  `findOne` ahora une `obj_result.obj_version` (efecto: la respuesta del PATCH v2 `create/result/:id` trae además `obj_result` anidado) e `InnovUseExists` selecciona `v.phase_year AS phase_year`.
- El camino bilateral `afterCreate` → v2 `saveInnovationUse` hereda la guarda: un payload W3 2026 sin esos campos ya no los anula. Forma del payload sin cambios.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **Non-youth con Youth vacío = `null`, nunca el total** (P2-4049, 12-nov-2026). `getActorsData` es la lectura que carga el formulario P25 (`GET_innovationUseP25`), NO `summary.service`. Calculaba `total - (youth || 0)` y PROD mostró Women 14 / Non-youth 14 con Youth vacío aunque `summary` ya devolvía `null`. Si Youth es `null`/`undefined`, Non-youth es `null`; con Youth lleno (0 incluido) se mantiene la resta con tope en 0. Spec: `innovation-use.service.youth-required.spec.ts`.
- ⚠️ **Nivel de uso ausente → NULL, nunca `findOne({ where: { level: null } })`** (13-oct-2026). TypeORM descarta la condición `null` del WHERE y devolvía la PRIMERA fila del catálogo (nivel 0, "Innovation is not used"): todo resultado del API sin nivel quedaba en "No use". `saveInnovationUse` solo consulta el catálogo cuando viene un nivel; 0 sí es respuesta y se busca. Spec: `innovation-use.service.use-level.spec.ts`.
- ⚠️ **El green check `validation_innovation_use_P25` del repo NO es el que corre.** La copia de
  `1762528725798-createValidtionP25.ts` lee `riu.innovation_readiness_level_id`, columna renombrada a
  `innovation_use_level_id` por una migración de timestamp **anterior** — esa función explotaría en
  runtime. Y sin embargo el green check de Innovation Use **funciona** (medido 3-sep-2026: verde en
  8 de 12 resultados). ⇒ El cuerpo vivo está en la base y **difiere del repo**. No basar cambios en
  esa copia: pedir `SHOW CREATE FUNCTION`.
- ⚠️ **Los umbrales de nivel comparan el NÚMERO de nivel, nunca el id de fila** (P2-4129). El catálogo repite niveles bajo ids altos (fila 13 = nivel 2). Explicación y respuesta de escalamiento: nivel >= 5; enlaces de estudios: nivel >= 6 (guardar y leer). `innovation_use_level_id` sigue guardando el id de fila. Spec: `innovation-use.service.level-threshold.spec.ts`.
- Ninguna validación compara sumas de actores hoy. Si una historia pide "el total debe cuadrar", eso
  es nuevo y hay que decidir si vive en el front o en la función SQL.
- Los specs se construyen con `Object.create(InnovationUseService.prototype)` para saltarse el
  constructor, que es enorme. Copiar `innovation-use.service.2030-projection.spec.ts`.
