# Conceptos del dominio — lo que hay que entender antes de tocar nada

**Verified:** 2026-08-24 · branch `performance-refactor` · `4a0e39f2b`

El modelo mental mínimo para trabajar el revamp. Todo lo de aquí está verificado en código con
`archivo:línea`; lo que no pude verificar va marcado.

## Dos flujos de financiación, no dos versiones de lo mismo

**Pool Funding (W1/W2)** es el flujo clásico: el que Ángel llama *"lo que ya hacíamos antes
normalmente"*. Un resultado se reporta contra la Theory of Change de un Science Program.

**W3/Bilateral** es el flujo nuevo: los resultados cuelgan de un **proyecto bilateral**, y traen
dos cosas que el pool funding no tiene — **Minimum Data Standards** y **creación asistida por IA**.

⚠️ **No son la misma pantalla con un flag.** Viven en carpetas distintas
(`pages/results/pages/result-detail/` vs `pages/bilateral/`) con sus propios componentes de
sección. Es exactamente lo que piden las 12 historias de `P2-3353`: replicar en bilateral el
comportamiento que W1/W2 ya tiene. Un arreglo en un lado **no** viaja al otro.

## Los tipos de resultado y sus ids

Del switch del bilateral (`pages/bilateral/components/section-type-specific/section-type-specific.component.ts:10-20`):

| id | Tipo | ¿Tiene sección propia? |
|---|---|---|
| 1 | Policy Change | Sí — `type-policy-change` |
| 2 | Innovation Use | Sí — `type-innovation-use` |
| 4 | Other Outcome | **No** |
| 5 | Capacity Sharing for Development | Sí — `type-capacity-sharing` |
| 6 | Knowledge Product | Sí — `type-knowledge-product` |
| 7 | Innovation Development | Sí — `type-innovation-dev` |
| 8 | Other Output | **No** |

`NO_TYPE_SPECIFIC = new Set([4, 8, 9])` — línea 20. Los que caen ahí no renderizan sección
específica: es por diseño, y es justo lo que dice `P2-3387` (*"Other Output and Other Outcome —
same behaviour as W1/W2"*).

⚠️ **El id 9 está en `NO_TYPE_SPECIFIC` pero no tiene etiqueta en `TYPE_LABELS`.** Si alguna vez
llega un resultado de tipo 9, `typeLabel` cae al `?? 'Unknown'` de la línea 39. No verifiqué qué
tipo es el 9 en la base de datos.

**Consecuencia práctica para hoy:** de los cinco tipos en alcance, **tres** (Policy Change,
Capacity Sharing, Knowledge Product) tienen sección propia que puede fallar por su cuenta, y
**dos** (Other Output, Other Outcome) solo dependen de las secciones comunes. Esos dos son los
más baratos de garantizar.

## Las tres formas de reportar un resultado bilateral

`pages/bilateral/components/bilateral-reporting-way-selector/bilateral-reporting-way-selector.component.ts:4`
declara `type ReportingWay = 'ai' | 'manual' | 'bulk'`.

| Vía | Estado real | Dónde |
|---|---|---|
| **AI-Assisted** | Activa, pero **condicionada** | `enabled: true`, y `isOptionDisabled` la apaga si `!canUseAi()` (línea 58) |
| **Complete the Form Manually** | Activa | `enabled: true` |
| **Bulk Upload Results** | `enabled: false` + badge `Coming soon` (líneas 44-53) | Correcto según la convención del repo — no es un hueco |

⚠️ **Requisito de prueba que no es obvio:**
`canUseAi = computed(() => !!selectedProject() && !!selectedPrimarySp())`
(`bilateral-result-creator.component.ts:96`). Hay que elegir **proyecto y primary Science Program**
antes de que la opción de IA se pueda pulsar. Quien pruebe sin hacerlo verá la tarjeta apagada y
concluirá que la IA está deshabilitada, cuando solo faltan dos selecciones previas.

**Sobre el bulk:** Juan David confirmó el 24-ago en `#dev-prms-pr` que el template del Bulk Upload
es el que envió Nicoleta por correo. La tarjeta sigue en `Coming soon`, así que el template llegó
antes que la implementación. No es alcance de hoy.

## El asistente de IA de Pool Funding es otra cosa

⚠️ **No confundir con el de bilateral.** Pool Funding tiene su propio asistente en
`pages/results/pages/result-creator/components/result-ai-assistant/`, y **su botón de crear no
crea nada** — ver `P2-3433` y `decisiones-y-contradicciones.md` § 1.

Son dos implementaciones independientes con nombres parecidos. Cuando alguien dice "la IA no
funciona", la primera pregunta es **en qué flujo**.

## Minimum Data Standards (MDS)

Un resultado bilateral no necesita el formulario completo para ser válido, necesita un **mínimo de
datos**; el resto es *full metadata* opcional. Es el concepto que gobierna las 12 historias de
`P2-3353`.

⚠️ **No hay una lista canónica de campos MDS**, y el cliente y el server usan criterios distintos.
Eso no es un detalle: es la trampa central de esas historias.

→ **Detalle completo en [`mds.md`](mds.md)**: quién declara qué campo, la asimetría de Knowledge
Product, los tres patrones que codifican los títulos de los tickets, y por qué todo cambio de MDS
va en los dos lados.

## El flujo de creación bilateral, paso a paso

De `pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts:176-210`,
la secuencia de scroll delata el orden real del wizard:

1. Proyecto y primary Science Program → `onPrimarySelected()` lleva a `bcr-reporting-way`
2. Vía de reporte → `manual` lleva a `bcr-level-section`; `ai` limpia el estado de subida y lleva a `bcr-ai-upload`
3. Nivel de resultado → `onLevelSelected()` **resetea el tipo, el handle de KP y el sync** (líneas 186-194), y lleva a `bcr-type-section`
4. Tipo de resultado → lleva a `bcr-actions`
5. `onNext()` → `createResult()`

⚠️ **Trampa del paso 3:** cambiar el nivel borra el tipo y el handle de Knowledge Product ya
introducidos. Es intencional, pero desde fuera parece pérdida de datos. Si alguien retrocede a
cambiar el nivel durante una prueba, va a reportarlo como bug.

## IPSR no está en esta historia

Innovation Package vive en `pages/ipsr/`, con módulo y routing propios, y **no pasa por el
`result-detail` del revamp**. El `CLAUDE.md` de `result-detail` ya lo tiene anotado: sin slot para
la bottom bar, la barra se queda donde fue declarada — señal de que IPSR nunca entró al layout nuevo.

Es prioridad 4 en el Excel. Ver `decisiones-y-contradicciones.md` § 4 y `P2-3427`.

----------

## AoW ↔ Intermediate Outcome: `wp_id` es un FK de UNA columna

Lo que decide todas las reglas de scoping de `P2-3336`, y lo que hay que saber antes de
prometerle a nadie una relación muchos-a-muchos que no existe.

`toc_results.wp_id` apunta a **un** work package (Area of Work). Un IO pertenece a **una** AoW
o a **ninguna** — no hay tabla puente. De ahí sale todo:

- `wp_id IS NULL` → el nodo es del Science Program entero, y el server lo devuelve **bajo todas
  las AoW** del programa a propósito. El predicado está en
  `onecgiar-pr-server/.../repositories/aow-bilateral.repository.ts` (~línea 442):
  `AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)`, con el comentario que lo dice explícito.
- `(wp.toc_id IS NOT NULL) AS is_aow` (línea 400) es el flag que el client usa: **`false` = compartido**.
  El client no re-deriva la regla, solo lee el flag — y un flag **ausente** lo trata como exclusivo,
  para no cambiar el comportamiento previo al despliegue del campo.
- El mismo conjunto sale por su propio endpoint con `intermediateOnly` → `AND tr.wp_id IS NULL`.
  Verificado en prtest (25-ago): en SP05 los IO 7208 y 7258 vuelven `is_aow: false` en las seis AoW
  y son exactamente los dos que devuelve el endpoint de intermediate-outcomes.

⚠️ **`programId` del endpoint de intermediate-outcomes es el CÓDIGO del programa (`SP05`), no el
`initiativeId` numérico.** Con un número devuelve `tocResults: []` y `total: 0` — parece base de
datos vacía y no lo es. Perdí varias consultas ahí. Los códigos salen de
`api/results-framework-reporting/get/science-programs/progress`.

⚠️ En ese endpoint `is_aow` viene `false` en **todas** las filas, porque el SQL emite `NULL`
literal cuando no hay `areaAcronym` y `groupTocRows` lo pasa por `Boolean()`. Es coherente
(son justo los no exclusivos), pero no es un flag calculado ahí: no lo uses como tal.

⚠️ **Los Outputs traen el mismo `is_aow` y NO tienen split.** La historia solo habla de IOs, así
que se dejó así. Si alguien pide la misma distinción para Outputs, es petición nueva.

