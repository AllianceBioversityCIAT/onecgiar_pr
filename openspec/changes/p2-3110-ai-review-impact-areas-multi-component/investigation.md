## 1. ¿Se pierden datos?

**NO en producción ni staging** — la feature AI Review no existe en esas ramas, así que ahí no hay ni un dato que perder. En dev/prtest el único dato que vive **solo** en las columnas viejas es lo que alguien haya guardado desde el propio pop-up (es el único escritor que queda: `ai.service.ts:722-724`, y `grep result_impact_area_score` en `src/api/ai/` da **0 coincidencias**). Ese dato **ya está condenado hoy**: nadie más lo lee y el primer guardado de General Information lo pone en null (`results.service.ts:815,818,822,827,831`).

**No verificado:** no pude confirmar en runtime cuántas filas así existen — prtest está caído en este momento (timeouts). Los carriles sí lo verificaron antes de la caída: en 909 results sondeados, los 42 valores legacy no nulos estaban también en la tabla nueva, 0 divergentes.

## 2. Qué pasa hoy, en simple

- Hay dos cajones donde se guardan los "Component" de impact area: el viejo (una sola opción) y el nuevo (varias opciones).
- La pantalla normal de General Information ya usa **solo el cajón nuevo**, y cada vez que guardas **vacía el viejo**.
- El pop-up de AI Review quedó atrás: sigue leyendo y escribiendo el **cajón viejo**.
- Resultado visible hoy: abres el pop-up de un result que sí tiene componentes y el campo Component aparece **vacío**. Ya está roto, antes de tocar nada.
- Lo que guardes desde el pop-up hoy tampoco se ve en ningún otro lado y desaparece al siguiente guardado de General Information.

## 3. Plan de backend

1. **[pequeño]** `ai/dto/update-dac-score.dto.ts` — `impact_area_id` pasa de `@IsNumber()` escalar a aceptar `number | number[]` (mismo patrón que `create-general-information-result.dto.ts`).
2. **[mediano]** `ai/ai.service.ts:590-648` (`getDacScores`) — dejar de leer las 5 columnas de la entidad `Result` y leer `ResultImpactAreaScoresService.find(resultId, undefined, { impact_area_score: true })`, filtrando por `impact_area_score.impact_area` con `ImpactAreaNames`. Devolver `impact_area_id` como **array**. Copiar la lógica ya probada de `results.service.ts:2092-2111`.
3. **[mediano]** `ai/ai.service.ts:652-740` (`updateDacScore`) — escribir en `result_impact_area_score` en vez de `resultRepository.update(config.impactColumn)`.
4. **[pequeño]** `ai/ai.service.ts:690-697` — la validación "requerido cuando tag=3" pasa a exigir **array no vacío**, no un número.
5. **[pequeño]** `ai/ai.service.ts:698-701, 726-735` — el `previousSelection` y el JSON del proposal/revision deben serializar el array, no un escalar.
6. **[mediano]** `ai/ai.service.spec.ts:398-562` — 20 referencias fijan el comportamiento viejo; hay que reescribirlas (incluida la assertion del mensaje de error).

**Trampa #1 — la grave.** `BaseServiceSimple.create()` **desactiva todo lo que no venga en el array** (`shared/entities/base-service.ts:239-254`: `update({ result_id, id: Not(In(persistId)) }, { is_active: false })`). El pop-up guarda **un área a la vez** (gender, luego climate...). Si el backend llama `create(resultId, [componentes de gender], 'impact_area_score_id')`, **borra las otras cuatro áreas**. Eso sí sería pérdida real de datos. Solución: mandar la lista completa (las 4 áreas restantes leídas de la BD + la que se está guardando) o usar `notDeleteIds` con los ids de las otras áreas.

**Trampa #2.** Decidir explícitamente qué se hace con la columna vieja al guardar. Si se deja con el último valor, `results.service.ts:2751-2759` (`getAIContext`) la seguirá leyendo por las relaciones `obj_*_impact_area` y le pasará a la IA un componente **obsoleto** para siempre. Recomendación: escribirla en `null`, igual que hace General Information.

**Trampa #3.** `getComponentListByFieldName` mapea por nombre de campo; el catálogo se agrupa por `impact_area`. No cambiar ese contrato de nombres o el filtro del punto 2 deja listas vacías.

## 4. Plan de frontend

1. `shared/services/api/ai-review.service.ts:21` — `impact_area_id?: string | null` pasa a `(string | number)[] | null`.
2. `ai-review/ai-review.component.ts:36-42` (`onResultVersionChange`) — al salir de tag `'3'`, limpiar a `[]` en vez de `null`.
3. `ai-review/ai-review.component.ts:44-47` (`onComponentChange`) — dejar de asignar y pasar a **toggle**: si el id ya está en el array lo saca, si no lo agrega.
4. `ai-review/ai-review.component.html:105-112` — cambiar el radio por checkbox: el `(click)` sigue llamando a `onComponentChange`, y `[class.selected]` pasa de `dacScore.impact_area_id === component.id` a `dacScore.impact_area_id?.includes(component.id)`. Ajustar `.scss` (`radio-circle`/`radio-dot` → estilo check).
5. `ai-review/ai-review.component.ts:80-91` (`onSaveDacScore`) — la validación pasa a `array.length === 0` y el payload manda el array tal cual.
6. `ai-review/ai-review.component.spec.ts` — cubrir toggle (agregar, quitar, último elemento) y la validación con array vacío.

Referencia de patrón ya en producción: `rd-general-information.component.html:96-116` (template `impactAreaCheckboxes`) y `rd-general-information.component.ts:130-149` (`normalizeImpactAreaFields`).

## 5. Qué NO hay que hacer

- **No** escribir una migración de backfill. Ya corrió una one-shot (`1769005245551-MigrateOldDataImpactAreaScore.ts`) y no hay dato exclusivo verificado que rescatar.
- **No** tocar la Sección 1 / General Information (results ni IPSR). Ya está en el modelo nuevo y funciona.
- **No** borrar las columnas legacy de la tabla `result` ni las relaciones `obj_*` de `result.entity.ts:122-246` en este ticket. Es limpieza aparte.
- **No** arreglar aquí los otros consumidores rotos: `getAIContext` (`results.service.ts:2751-2759`), los green-checks v2 de Innovation Packages (`results-innovation-packages-validation-module.repository.ts:182-198`) ni `findOneInnovation` (`ipsr.repository.ts:339-462`). Son bugs preexistentes, independientes de P2-3110. Vale reportarlos como tickets nuevos.
- **No** meterse con la replicación de fase (`result.repository.ts:70-134`, que no copia ninguna de las dos formas). Otro ticket.
- **No** hacer normalización de portafolio en el pop-up sin decidirlo antes (ver riesgo 3).

## 6. Riesgos reales

- **[Soft-delete cruzado entre áreas al guardar de a una]** → Confirmado en código (`base-service.ts:239-254`). Es el único mecanismo verificado que sí destruye datos. Mitigación: mandar siempre la lista completa de las 5 áreas, o `notDeleteIds`. Test obligatorio: guardar gender y comprobar que climate/nutrition siguen `is_active = true`.
- **[Componentes guardados desde el pop-up en dev que solo viven en la columna vieja]** → **No verificado** (prtest caído; sin acceso SQL a dev). Mitigación barata: pedirle a JuanDa un `SELECT COUNT(*)` de results con `*_impact_area_id IS NOT NULL` sin fila en `result_impact_area_score` antes del deploy. Si sale 0, cero acción; si sale >0, un `INSERT ... SELECT` de una línea. Es dev, no prod.
- **[Valor fantasma alimentando el prompt de la IA]** → Si se dejan las columnas viejas con su último valor, `getAIContext` le manda a la IA un componente obsoleto de forma indefinida. Mitigación: nulificarlas en el mismo update.
- **[P22 vs P25]** → General Information hoy bifurca: multicheck solo en P25, radio en P22 (`rd-general-information.component.html:96-116`). El pop-up no bifurca. Si se pone multicheck siempre, P22 queda inconsistente con su propia Sección 1. Decisión de producto, no técnica — hay que preguntarla.
- **[El PATCH devuelve 400 mientras el DTO siga escalar]** → El front no puede probarse end-to-end antes que el back. Mitigación: ver orden de trabajo.

## 7. Orden de trabajo

**En paralelo desde el minuto cero**, siempre que se acuerde primero el contrato: `impact_area_id` es un **array de ids** en el GET y en el PATCH.

- **Back:** pasos 1 y 2 primero (DTO + `getDacScores`). Con eso el front ya recibe arrays.
- **Front:** pasos 1 a 4 (tipo, toggle, checkbox) no dependen del back — se trabajan con la respuesta vieja normalizada a array.

**Bloqueos reales:**

1. El paso 1 del back (DTO) **bloquea** el guardado del front: hasta que acepte array, el PATCH responde 400.
2. El paso 2 del back (`getDacScores` devolviendo array) **bloquea** la verificación visual: sin eso el pop-up sigue mostrando el Component vacío y no se puede validar el AC1.
3. Los pasos 3-5 del back (escritura en la tabla nueva) **no bloquean** al front; se pueden terminar mientras el front pule el checkbox.
4. Los tests de ambos lados van al final, después de ver el flujo completo funcionando en dev.