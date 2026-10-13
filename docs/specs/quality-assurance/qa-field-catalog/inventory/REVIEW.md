# QAC-T-7 — Revisión del inventario 2026 (P25): lo que hay que decidir

> **Estado:** borrador para la revisión HITL del owner. Spec: `docs/specs/quality-assurance/qa-field-catalog` · 2026-10-06 · rama `JuanGuzman-io/feature-qa-result-fields`.
> **Fuentes:** `2026-A-common-and-outputs.md` (139 filas, §9 = 22 preguntas) y `2026-B-outcomes-impact-ipsr.md` (199 filas, §9 = 15 preguntas). Las claves siguen siendo *propuestas*: se congelan solo cuando apruebes (§5).
> **Resultado de la consolidación:** 6 de las 37 preguntas ya están resueltas (§3); quedan **28 decisiones** (§1, ya deduplicadas). Nada queda pendiente con Santiago (§2). **11 de las 28 cambian o definen claves** (D1–D8, D12, D17, D19) y deben cerrarse antes de congelar; las otras 17 se pueden decidir después.

Convención de fuentes: `A-n` = pregunta n de §9 del archivo A · `B-n` = pregunta n de §9 del archivo B. Cada una aparece una sola vez en este documento.

## 1. Qué decidir ahora

Columna **Bloquea claves**: *Sí* = la respuesta cambia, agrega o quita una clave del catálogo, así que debe cerrarse antes de congelar. *No* = afecta `required`, notas o listas; se puede decidir después sin romper claves ya aprobadas.

### 1.1 Huecos del modelo del catálogo

| # | Fuente | Pregunta | Opciones | Recomendado | Si no se responde | Bloquea claves |
|---|---|---|---|---|---|---|
| D1 | B-6 | IPSR paso 3: la evidencia dentro de cada elemento complementario necesita 2 niveles de subcampo (22 filas `↳↳`); DD-10 permite 1 | (a) permitir profundidad 2 · (b) aplanar la evidencia a un `object` por elemento | (a) permitir profundidad 2, solo para esta evidencia (enmienda de DD-10). Mantiene QA a nivel de campo | Las 22 claves `ipsr_s3_complementary…` no se pueden definir | **Sí** |
| D2 | B-2 | Forma del binding: (a) filas de presupuesto y subcampos de complementarias llegan al resultado por un padre (2 saltos); (b) la tabla `result_ip_step_three_evidence` no tiene entidad (el guard no la ve) y se escribe además en columnas espejo que `VS3` aún lee; (c) ¿cuentan como "bound" las columnas `fk_to_result` y las PK usadas como `value_column`? | Agregar `via` opcional a `RelationBinding` + registrar entidad para esa tabla + contar fk/value como bound · o dejar esas filas en `PENDING_CATALOG` | La primera. Sin esto, 6 filas de presupuesto (IU ×3, paso 4 ×3), los subcampos de complementarias y la evidencia del paso 3 no tienen binding | Esos bloques no pueden entrar a la etapa 1 aunque sean obligatorios | **Sí** |
| D3 | B-3 | Tipos de institución jerárquicos: "Organization" y "Sub-type" escriben ambos `institution_types_id` (el sub-tipo pisa al tipo); igual para enablers de 2 niveles (paso 2.2) | (a) un campo con lista de control de 2 niveles · (b) dos campos | (a). La regla R-2 (una clave = un binding) impide (b) | Claves de institution types (IU, IPSR) sin definir | **Sí** |
| D4 | A-12 | Los términos de capacity sharing se parten en 2 radios por posición del array; "Degree" comparte `capdev_term_id` con "Length of training" | Una clave `capacity_sharing.length_of_training` + subcampo `degree` · dos campos sobre una columna (no permitido por R-2) | Una clave + subcampo `degree`, opciones agrupadas | 2 claves de capacity sharing sin definir | **Sí** |
| D5 | A-4 | `general.lead_contact_person` tiene dos destinos (`lead_contact_person` texto y `lead_contact_person_id` FK) y escape de texto libre | Texto + subcampo (como está) · dos campos | Texto + subcampo | 1 clave sin definir | **Sí** |
| D6 | A-3 | Separar `toc_alignment` y `linked_results` de `contributors_partners` (el cliente tiene una sola página) | Separar (como está) · una sola sección | Separar: son tablas y reglas distintas | Cambia la clave de sección de ~26 filas | **Sí** |
| D7 | A-18, B-15 | Las filas de annual-updating (C-1) también aplican a `innovation_use`. A dice que el tipo 2 conserva el wording/radio legacy de `is_discontinued` y que razones 2026, `merge_targets`, `split_targets` son solo del tipo 7; la regla dice "tipos 2/7". Hace falta un único dueño de esas claves | Dueño = parte A (C-1) con `result_types` y `required_when` por tipo · duplicar claves por tipo | Dueño único en C-1, `result_types` por tipo. **Confirmar para el tipo 2**: ¿se muestra la lista de razones y se ofrece merge/split? | Claves duplicadas al unir A y B; `result_types` incorrecto | **Sí** |
| D8 | A-20 | `evidence.items.file` es de tipo `object`, pero el vocabulario de tipos no tiene `file` | Mantener `object` · agregar tipo `file` | Mantener `object` (no ampliar el vocabulario) | El tipo de 1 clave queda en el aire | **Sí** |
| D9 | A-7 | Listas externas sin FK ni lista en entidad: `toc_results`, `toc_indicators`, `toc_melia_studies` | Declararlas como listas externas (servicio de ToC) | Confirmar así | Ninguno inmediato; las listas se declaran por clave | No |
| D10 | A-6 | La lista `initiatives` del cliente es un subconjunto por resultado; la entidad tiene el catálogo completo | `control_list = initiatives` (catálogo completo) | Catálogo completo | Ninguno inmediato | No |
| D11 | A-8, B-4 | Opciones hard-coded o sin FK (roles de partner 1–4, scopes geográficos con id 50 en código, estados de monto de policy, chips de delivery, `toc_result_id` de EOI, texto de opciones "assessed" con typo de seed "Text BoxCurrent…") | Listas de control declaradas por clave, con nota "ids fijados por el cliente" | Esa; el contenido de las listas está fuera de alcance (R-1) | Ninguno inmediato | No |

### 1.2 Obligatoriedad (`required`)

| # | Fuente | Pregunta | Opciones | Recomendado | Si no se responde | Bloquea claves |
|---|---|---|---|---|---|---|
| D12 | A-13, B-12 | Campos obligatorios en pantalla pero mudos en la función (p. ej. `number_of_varieties`; en B: nivel de uso de IU, youth, `how_many`, `new_users_added`, justificación 2030, geoscope y facilitadores de IPSR paso 1, modales de complementarias; en A: 11 filas "sin regla viva") | (a) `required = no`, no confirmado, queda fuera de etapa 1 · (b) `required = no`, no confirmado, **entra a etapa 1 como opcional** · (c) promover a obligatorio | (b): la función manda para `required` (DD-11), pero QA ve el campo. Nunca se marca opcional en silencio (QAC-R-5) | Se aplica (a): esos campos quedan en `PENDING_CATALOG` | **Sí** (cambia qué claves entran a etapa 1) |
| D13 | B-14 | Reglas de grupo que la función evalúa en agregado ("al menos uno entre actores/organizaciones/medidas", "al menos uno de los dos niveles núcleo") | `cond` en cada lista/campo con la regla de grupo en `required_when` (DD-7) · marcar las listas `yes` | `cond` + regla de grupo como dato | Un booleano por campo no expresa el grupo | No |
| D14 | B-1 | `valid_text()` y `validate_sections_mapped_batch` no se entregaron; se leyó `valid_text` como "no NULL y no vacío" | Confirmar lectura y que el batch solo llama a las `validation_*` entregadas | Confirmar (pegar el `SHOW CREATE FUNCTION`) | Todas las reglas de texto de policy/IU quedan con `confirmed = no` | No |
| D15 | B-11 | `innovation-use-info/CLAUDE.md` dice que `validation_innovation_use_P25` devuelve FALSE si `has_innovation_link` es NULL; el cuerpo vivo entregado tiene ese check comentado (VIU:53,62-74). Se siguió el cuerpo vivo | Seguir el cuerpo vivo · seguir la documentación | Cuerpo vivo; corregir el CLAUDE.md aparte | Ninguno | No |

### 1.3 Alcance (qué entra al catálogo)

| # | Fuente | Pregunta | Opciones | Recomendado | Si no se responde | Bloquea claves |
|---|---|---|---|---|---|---|
| D16 | B-10 | IPSR General information, Contributors y Links to results se validan con SQL embebido en el repositorio, no con `validation_*`. ¿Quién los inventaría? Posibles solapes con A: `linked_result`, geografía del paso 1, tags de evidencia del paso 3, tablas de presupuesto | Parte C del inventario (corto) antes de T-8 · dejarlo para una etapa 2 | Parte C ahora: tienen campos obligatorios y DD-11 pide que la etapa 1 los incluya | La etapa 1 queda incompleta para IPSR. No rompe claves ya aprobadas (es aditivo) | No |
| D17 | A-19 | KP: geografía/evidencia de solo lectura y filas de partners solo-KP (19 filas `no` en T-1) | Catalogar como campos de solo lectura en etapa 1 · tratar como llenados por el sistema · `PENDING_CATALOG` | Etapa 1 como solo lectura: salen directo de columnas sincronizadas (barato) | Quedan en `PENDING_CATALOG` | **Sí** |
| D18 | B-9 | Other outcome (4) e Impact contribution (9): sin regla viva y sin campos propios; solo muestran las 4 secciones comunes | Confirmar que ese es el alcance · indicar de dónde sale otro campo esperado | Confirmar | Se publican solo con campos comunes | No |
| D19 | B-8 | IPSR paso 2.2 es solo para admin y no tiene regla propia (3 filas, todas `no`) | Dejar en el catálogo (como `PENDING_CATALOG`) · sacar los campos admin-only | `PENDING_CATALOG`: no hay regla que mantener hoy | Las 3 claves quedan en el borrador | **Sí** |
| D20 | B-7 | Paso 4: los scaling studies están retirados en 2026 pero el formulario muestra un `true` guardado en solo lectura (S4:37-53) | Ausente de 2026 (propuesta) · catalogar como solo visualización | Ausente de 2026 | Ninguno | No |
| D21 | A-15 | `result_code`, tipo, nivel, estado y versión son `NOT_FOR_QA` como "sobre" del resultado: ¿llegan a QA por el envelope, fuera del catálogo? | Confirmar · exponerlos como campos | Confirmar (el catálogo ya expone tipos de resultado y fase) | Ninguno | No |
| D22 | A-17 | `evidence.is_supplementary` no tiene UI pero la función lo valida; QA podría quererlo | `PENDING_CATALOG` · `NOT_FOR_QA` | `PENDING_CATALOG` | Queda en `PENDING_CATALOG` | No |

### 1.4 Rarezas de datos

| # | Fuente | Pregunta | Opciones | Recomendado | Si no se responde | Bloquea claves |
|---|---|---|---|---|---|---|
| D23 | A-1 | P-5: fase → portfolio P25 en cada ambiente; falta el resultado de `SELECT phase_year, portfolio_id FROM version` + `clarisa_portfolios` | Correrlo en el ambiente objetivo | Correrlo cuando puedas; nada de este inventario depende de ello | Ninguno | No |
| D24 | A-9 | El scope guardado id **4** (un país) vs 3 del cliente | Exponer 4 como valor solo-guardado · normalizar | Exponer 4 con nota en la lista | Valores 4 aparecen sin etiqueta | No |
| D25 | A-11 | Scope 5 con cero países pasa (`COUNT 0 − SUM 0 = 0`, `V-GEO:110-127`) | Seguir la función · tratarlo como defecto | Seguir la función (`confirmed = yes`) y no inventar regla | Ninguno | No |
| D26 | A-14 | `knowledge_product.references` no tiene storage; en presupuestos la UI trata `0` como faltante y la función acepta cualquier valor ≥ 0 o NULL | `references` → `NOT_FOR_QA`; presupuestos: seguir la función | Esa | `references` queda sin clasificar | No |
| D27 | A-22 | `V-ID:369,385-393` no filtra `is_active` en `result_answers` (respuestas viejas pueden contar) | El binding del catálogo filtra `is_active = 1` · replicar la función | Filtrar `is_active = 1` en el binding y anotar el riesgo de la función | QA podría leer respuestas inactivas | No |
| D28 | B-5 | Controles de nivel: (a) el control de rango de IU declara `optionValue="level"` (IUF:385) pero la FK y `getUseLevelIndex()` usan el **id** del nivel; (b) `result_innovation_package.use_level_evidence_based` apunta a la tabla de *readiness* (entity `:245-250`) | (a) confirmar qué valor se guarda · (b) mantener los gemelos a nivel de paquete en `PENDING_CATALOG` | (a) verificar contra la BD; (b) `PENDING_CATALOG` (no están en el formulario 2026) | El `value_column` de 1 binding queda sin confirmar | No |

## 2. Esperando a Santiago

**Nada pendiente.** Santiago respondió las 3 consultas el 2026-10-06; las respuestas están en §3 (con el enlace al DM).

## 3. Ya decidido

| # | Fuente | Decisión | Dónde quedó aplicada |
|---|---|---|---|
| R1 | — | Carga por etapas (DD-11): etapa 1 = al menos todos los campos obligatorios; el resto va a `PENDING_CATALOG`. Las funciones de validación definen `required`, no el conjunto de campos | `requirements.md` QAC-R-11, `design.md` DD-11 |
| R2 | A-21 | `validation_link_result_P25`, `validation_partners_P25` y `validation_toc_P25` no se necesitan ni se usan para `required`; lo que solo ellas gobernarían se marca "sin regla viva". Con eso y las 14 funciones entregadas, el riesgo "repo vs vivo" queda cerrado | Archivo A §0 |
| R3 | A-16 | Los ids de `result_questions` de Innovation P25 (101–121, 138, 147–149) son idénticos en test y prod → se enlazan **por id**, sin resolución por texto | Archivo A §3 (fila `question_options`) y §9 |
| R4 | B-13 | `policy_change.related_to` se enlaza **estructuralmente**: opciones = hijos de la única pregunta de nivel 1 de `result_type_id = 1`, sin ids fijos (test: raíz 49, opciones 50/51; prod: raíz 48, opciones 49/50). QA debe emparejar por etiqueta, no por id | Archivo B §3.1 (fila `related_to`), §5, §9 |
| R5 | A-2 | Santiago: es un bug de `validation_geo_location_P25`; el catálogo sigue la intención de la UI, los campos de extra scope son condicionalmente obligatorios (`required_when` según la regla prevista; nota "bug de la función: la función viva no lo exige", `confirmed = no`) | Archivo A §4 C-4 (`geo.extra_*`) |
| R6 | A-10 | Santiago: el valor de contribución debe ser **> 0** → `required_when: valor > 0`. Que el cliente acepte 0 es un defecto de UI (hallazgo lateral, §6) | Archivo A §4 C-2 (`toc.entries.contribution_to_target`) |
| R7 | A-5 | Santiago: cada área de impacto tiene su propia lista de control (`impact_area_components_gender`, `_climate`, `_nutrition`, `_environmental`, `_poverty`, con el nombre del área como aparece en los datos) → no hace falta filtro con join | Archivo A §3 y C-1 filas 9–13 |

Respuestas de Santiago por DM: https://cgiar-ibd.slack.com/archives/D040EAE8Z71/p1791314287953399
Nota de numeración: las "preguntas 1–3 de A" que mencionó el owner son, en el archivo A, las preguntas de geo extra scope, valor de contribución 0 y forma de la lista de áreas de impacto (filas R5, R6 y R7).

## 4. Propuesta de etapa 1

Regla: etapa 1 = filas con `required` = `yes` o `cond`. El resto (`no` y "sin regla viva") = `PENDING_CATALOG`, salvo 1 fila propuesta `NOT_FOR_QA`. Las columnas `NOT_FOR_QA` (auditoría, PK, discriminadores, legacy) no son filas de las tablas y se listan en cada archivo (A §7, B §7.3).

### 4.1 Conteos por sección y tipo

| Bloque | Filas | Etapa 1 (`yes`+`cond`) | de ellas `yes` | `PENDING_CATALOG` | `NOT_FOR_QA` |
|---|---|---|---|---|---|
| A · C-1 General information | 19 | 17 | 6 | 2 | 0 |
| A · C-2 ToC alignment | 8 | 6 | 1 | 2 | 0 |
| A · C-3 Contributors & partners | 18 | 5 | 1 | 13 | 0 |
| A · C-4 Geographic location | 13 | 12 | 1 | 1 | 0 |
| A · C-5 Evidence | 18 | 8 | 1 | 10 | 0 |
| A · C-6 Linked results | 3 | 2 | 0 | 1 | 0 |
| A · T-1 Knowledge product | 25 | 6 | 1 | 18 | 1 (`references`, D26) |
| A · T-2 Capacity sharing | 9 | 8 | 7 | 1 | 0 |
| A · T-3 Innovation development | 26 | 15 | 9 | 11 | 0 |
| A · T-4 Other output | 0 | 0 | 0 | 0 | 0 |
| **Subtotal A** | **139** | **79** | **27** | **59** | **1** |
| B · Policy change (1) | 7 | 4 | 4 | 3 | 0 |
| B · Innovation use (2) | 56 | 30 | 0 | 26 | 0 |
| B · IPSR paso 1 | 34 | 19 | 2 | 15 | 0 |
| B · IPSR paso 2.1 | 8 | 1 | 1 | 7 | 0 |
| B · IPSR paso 2.2 | 3 | 0 | 0 | 3 | 0 |
| B · IPSR paso 3 | 79 | 33 | 0 | 46 | 0 |
| B · IPSR paso 4 | 12 | 3 | 0 | 9 | 0 |
| B · Other outcome (4) / Impact contribution (9) | 0 | 0 | 0 | 0 | 0 |
| **Subtotal B** | **199** | **90** | **7** | **109** | **0** |
| **Total** | **338** | **169** | **34** | **168** | **1** |

**Verificación de sumas:** A: 79 + 59 + 1 = 139 (27 `yes` + 52 `cond` + 49 `no` + 11 sin regla viva, como en A §2). B: 90 + 109 = 199 (7 + 83 + 109, como en B §2). Total 338 = 139 + 199, **diferencia 0**: no se restó ninguna fila compartida porque las claves de ambos archivos no se repiten (cada archivo usa su propio prefijo de sección). Los solapes que sí existen son de **tablas de storage** (`linked_result`, geografía del paso 1, tags de evidencia del paso 3, presupuestos), no de claves; se deduplican en T-8 con el guard. Dos filas de A no se mapearon 1:1 a controles (C-3: 20 controles → 15 filas de datos; T-2: 2 controles, 1 columna) — ya conciliado en A §8.

**Cómo se mueve el total según D12 y D17 (si se aprueban como se recomienda):** D12 (b) suma a la etapa 1 hasta 11 filas de A "sin regla viva" y las filas B marcadas UI-obligatorias (no contadas por separado en B); D17 suma hasta 18 filas de T-1 (las 19 `no` menos `references`). Eso mueve filas de `PENDING_CATALOG` a etapa 1, no cambia el total de 338.

### 4.2 Tablas en alcance propuestas (A + B unidas)

Salen de `excluded-tables.ts` a `scope.ts` cuando apruebes. **47 tablas.**

| Grupo | Tablas |
|---|---|
| Comunes (21) | `result` · `result_impact_area_score` · `results_toc_result` · `results_toc_result_indicators` · `result_indicators_targets` · `results_center` · `results_by_institution` · `result_by_institutions_by_deliveries_type` · `results_by_inititiative` · `results_by_projects` · `linked_result` · `result_region` · `result_country` · `result_country_subnational` · `evidence` · `evidence_sharepoint` · `results_investment_discontinued_options` · `result_innovation_merge_split` · `non_pooled_projetct_budget` · `result_initiative_budget` · `result_institutions_budget` |
| Outputs (9) | `results_knowledge_product` · `results_kp_metadata` · `results_kp_authors` · `results_kp_keywords` · `results_kp_altmetrics` · `results_kp_fair_scores` · `results_capacity_developments` · `results_innovations_dev` · `result_answers` |
| Policy / Innovation use (6) | `results_policy_changes` · `results_innovations_use` · `result_actors` · `results_by_institution_type` · `result_ip_measure` · `result_scaling_study_urls` (esta última, todas sus columnas `PENDING_CATALOG` hasta una carga 2025) |
| IPSR (11) | `result_innovation_package` · `result_by_innovation_package` · `result_ip_eoi_outcomes` · `result_ip_expert_workshop_organized` · `result_ip_result_actors` · `result_ip_result_institution_types` · `result_ip_result_measures` · `results_complementary_innovation` · `results_complementary_innovations_function` · `results_innovatio_packages_enabler_type` · `result_ip_step_three_evidence` (**sin entidad**: depende de D2) |

Tablas que quedan **fuera** (siguen en `excluded-tables.ts`, razón legacy / no es dato del resultado): de A, `result_countries_sub_national`, `results_kp_fair_baseline`, `results_kp_mqap_institutions`, `result_toc_*` legacy; de B, `result_ip_action_area_outcome`, `result_ip_impact_area_target`, `result_ip_sdg_targets`, `result_ip_expert`, `result_ip_expertises`, `result_innov_section`.

**Conflicto entre A y B resuelto aquí:** A dejaba `result_actors`, `results_by_institution_type` y `result_ip_measure` fuera (bloque de "usuarios anticipados", oculto desde 2026, para mantener solo en 2025); B los incluye porque el formulario 2026 de Innovation use sí escribe en ellos. Se proponen **en alcance** (gana B); sus columnas de 2025 quedan en `PENDING_CATALOG`.

## 5. Cómo aprobar

1. **Aprobar claves tal como están listadas**: responde "apruebo las claves del inventario A y B", con las excepciones que quieras. Aprobadas, se mueven las tablas de §4.2 a `scope.ts`, se congelan las claves de etapa 1 y todo lo marcado `PENDING_CATALOG` queda para T-8 a T-11.
2. **Responder primero las 11 decisiones que cambian o definen claves:**

| Decisión | Qué claves toca |
|---|---|
| D1 profundidad de subcampos | 22 claves de evidencia del paso 3 |
| D2 binding de 2 saltos y tabla sin entidad | presupuestos (6), subcampos de complementarias, evidencia del paso 3 |
| D3 institution types jerárquicos | claves de institution types y enablers 2.2 |
| D4 términos de capacity sharing | `length_of_training` + `degree` |
| D5 contacto líder | `general.lead_contact_person` |
| D6 separación de secciones | clave de sección de toc_alignment y linked_results |
| D7 dueño de annual-updating y tipo 2 | `result_types` de las claves de descontinuación/merge/split |
| D8 tipo `object` para archivo | `evidence.items.file` |
| D12 campos obligatorios en pantalla pero mudos | cuáles entran a etapa 1 |
| D17 KP solo lectura | 18 claves de T-1 |
| D19 paso 2.2 admin-only | 3 claves |

3. **El resto (D9–D11, D13–D16, D18, D20–D28)** se puede responder después de congelar sin tocar claves ya aprobadas. D16 y D14 conviene cerrarlos antes de T-8 para no dejar la etapa 1 incompleta (IPSR) ni reglas sin confirmar.

## 6. Hallazgos laterales (fuera de alcance)

Para el dueño de cada módulo; no se arreglan en esta spec.

| Hallazgo | Dónde | Efecto |
|---|---|---|
| `validation_geo_location_P25` compara `has_extra_geo_scope` (booleano) con ids de scope 1–5 (`V-GEO:142,144,187,204`): las ramas de extra scope 3/4/5 nunca corren y el sub-nacional extra y `extra_geo_scope_id` nunca se exigen. Confirmado como bug por Santiago | función viva de P25 | Un resultado con geografía extra incompleta aparece como válido |
| El cliente trata el valor de contribución `0` como completo (`MWC.html:138-142`) mientras la función exige `> 0` (`V-CP:57`). Defecto de UI confirmado por Santiago | `MWC.html` | Un resultado que parece completo en pantalla queda en rojo al validar |

---

## 7. Aprobación (2026-10-06, Juan David)

**Aprobado con los defaults**, con una regla de avance: *no bloquear el desarrollo por hallazgos; lo que hoy funciona se cataloga tal como funciona, y los hallazgos quedan registrados para resolverlos después*.

Aplicación de esa regla a los defaults que exigían ampliar el modelo ya aprobado:

| Decisión | Default original | Cómo queda |
|---|---|---|
| D1 (subcampos de 2 niveles) | Permitir profundidad 2 | **Diferido**: las 22 claves de evidencia del paso 3 de IPSR van a `PENDING_CATALOG`; el modelo no cambia ahora |
| D2 (binding de 2 saltos, tabla sin entidad) | Permitir salto por padre + crear entidad | **Diferido**: presupuestos (6), subcampos de complementarias y evidencia del paso 3 van a `PENDING_CATALOG` |
| D16 (IPSR general / contributors / links con SQL embebido) | Segunda pasada de inventario antes de T-11 | **Diferido**: se cataloga lo inventariado; esas secciones IPSR van a `PENDING_CATALOG` |
| D15, D27 (sospechas en `validation_innovation_use_P25` / `_dev_P25`) | — | Se sigue la función viva; consultado con Santiago (Slack), sin bloquear |

Los demás defaults (D3–D14, D17–D28) se aplican tal cual. **Las claves quedan congeladas** con los nombres de los inventarios A y B más estos ajustes.

### 7.1 Decisiones del Leader por mandato del owner (2026-10-06)

El owner delegó las decisiones restantes ("Toma decisiones… haz que funcione el endpoint y no te extiendas"). Registradas:

- **D2 ampliado:** de la parte A, `toc.entries.indicator`, `toc.entries.contribution_to_target`, `geo.subnational`, `geo.extra_subnational` (binding de 2 saltos) quedan en `PENDING_CATALOG`; QAC-R-11 exceptúa los diferidos por D1/D2.
- **`required_when` en subcampos:** no se agrega al modelo ahora; las condiciones de 9 subcampos quedan en el inventario (QAC-R-5 enmendado).
- **ToC con múltiples mapeos:** un resultado puede mapear a uno o varios ToC results, indicadores y targets. `toc.entries` es una `list` (una fila por mapeo); el indicador y la contribución al target por mapeo quedan en `PENDING_CATALOG` (D2).
- **Funciones con sospechas confirmadas por Santiago (D15, D27):** fuera del alcance del endpoint; el catálogo sigue la función viva. El owner las ajusta por su lado.
