# innovation-use (results-framework-reporting)

**Verified:** 2026-09-03 · branch performance-refactor

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
- ⚠️ **La replicación de fase NO copia estas filas con su `section_id`** (incidente P2-3514), ni copia
  las columnas de `results_innovations_use` más allá de `male_using` / `female_using`. Un valor de la
  fase anterior **se lee por join, nunca se espera copiado**.

## Leer un valor de la FASE ANTERIOR — el patrón, ya resuelto dos veces
`InnovUseExists` (`api/results/summary/repositories/results-innovations-use.repository.ts`) ya trae
`previous_result_id` **y** `previous_phase_year` gracias a los joins `v → previous_v → previous_r`,
que llevaban ahí sin usarse. **Resolver la fase no cuesta un viaje extra.**

| Método | Sección | Qué devuelve |
|---|---|---|
| `getPreviousPhase2030Projection` (P2-3295) | 2 | actores, organizaciones y medidas del previo |
| `getPreviousPhaseCurrentUse` (P2-3537) | 1 | `total_actors`, `phase_year` y los actores |

- 🥇 **`total_actors` suma `how_many`, no `women + men`.** `getActorsData` recalcula `how_many` como
  `women + men` en las filas desagregadas y deja el valor tecleado en las que tienen
  `sex_and_age_disaggregation`; sumar las columnas de género **pierde el segundo tipo**.
- 🥇 **`null` no es "cero", es "no hay bloque".** Para P2-3537, `null` significa que la pantalla no
  pinta el bloque *Current Use Update* — decisión de Yeck del 3-sep: un resultado con
  organizaciones y sin actores no debe ver una reconciliación que nunca podría cumplir.
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

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El green check `validation_innovation_use_P25` del repo NO es el que corre.** La copia de
  `1762528725798-createValidtionP25.ts` lee `riu.innovation_readiness_level_id`, columna renombrada a
  `innovation_use_level_id` por una migración de timestamp **anterior** — esa función explotaría en
  runtime. Y sin embargo el green check de Innovation Use **funciona** (medido 3-sep-2026: verde en
  8 de 12 resultados). ⇒ El cuerpo vivo está en la base y **difiere del repo**. No basar cambios en
  esa copia: pedir `SHOW CREATE FUNCTION`.
- Ninguna validación compara sumas de actores hoy. Si una historia pide "el total debe cuadrar", eso
  es nuevo y hay que decidir si vive en el front o en la función SQL.
- Los specs se construyen con `Object.create(InnovationUseService.prototype)` para saltarse el
  constructor, que es enorme. Copiar `innovation-use.service.2030-projection.spec.ts`.
