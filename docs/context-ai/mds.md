# Minimum Data Standards (MDS) — cómo funciona de verdad

**Verified:** 2026-08-24 · branch `performance-refactor` · `4a0e39f2b`

Salió de `conceptos.md` al pasar el tope de 150 líneas. Es el concepto que gobierna las 12
historias de `P2-3353`, así que merece archivo propio.

El concepto: un resultado bilateral no necesita el formulario completo para ser válido, necesita un
**mínimo de datos**; el resto es *full metadata* opcional. De ahí el patrón que repiten las
historias de `P2-3353`.

## No hay una lista canónica — es un registro distribuido

`services/bilateral-mds-tracker.service.ts` **no contiene ningún campo**. Es un registro: cada
sección **declara sus propios campos** llamando `setSectionFields(sectionName, items[, group])`
(líneas 76-87). El servicio solo suma.

`SECTION_ORDER` (línea 31) fija las cinco secciones: `general-info`, `contributors`, `geography`,
`evidence`, `type-specific`.

Quién declara qué, verificado uno por uno:

| Sección | Declara en | Campos MDS |
|---|---|---|
| `general-info` | `section-general-info.component.ts` | Title · Description · Lead Contact Person |
| `contributors` | `section-contributors.component.ts` | Lead center · Lead project |
| `contributors` (subgrupo `toc`) | `section-toc.component.ts` | dinámicos, según el mapeo de ToC |
| `geography` | `section-geography.component.ts` | dinámicos, según el alcance geográfico |
| `evidence` | `section-evidence.component.ts` | Evidence with valid link |
| `type-specific` | los **cinco** hijos `type-*` | de 1 a 6, ver abajo |

⚠️ **Comprobado que sí, contra la sospecha inicial:** los cinco hijos de `section-type-specific`
declaran MDS. Una lectura apresurada sugiere que no (el servicio inicializa `type-specific` vacío),
pero cada hijo lo puebla al cargar sus datos:

| Tipo | Campos MDS declarados |
|---|---|
| Knowledge Product | **1** — `handle` |
| Innovation Use | 3 — use to be determined · actors/users · use level |
| Policy Change | 4 — policy type · stage · related to · implementing organizations |
| Capacity Sharing | 4 — people trained · delivery method · length of training · attendance |
| Innovation Development | 6+ — short title · nature · developers · readiness level, … |

## Esa asimetría explica los títulos de los tickets

Knowledge Product declara **un solo** campo MDS. Y su historia es la única titulada
*"Knowledge Product — **Full metadata section**"* (`P2-3384`), no *"MDS + full metadata toggle"*.
Los títulos codifican tres trabajos distintos:

| Patrón del título | Tickets | Qué significa |
|---|---|---|
| *MDS + full metadata toggle* | `3366`, `3368`, `3382`, `3388`, `3391`, `3428` | La sección necesita **los dos modos** |
| *Full metadata section* | `3384` (KP) | El MDS ya está (el handle); falta el modo completo |
| *same behaviour as W1/W2* | `3370`, `3375`, `3387` | **Portar** comportamiento que W1/W2 ya tiene |

Clasificar así vuelve tratables las 12 historias: no son 12 trabajos iguales.

## Campos válidos pero inaceptables

`MdsFieldItem` separa `filled` de `invalid` a propósito (líneas 11-19, con `P2-3340` citado en el
comentario). Un campo que excede el límite de palabras **sigue contando** para el porcentaje —
está respondido, solo no aceptablemente — y bloquea el Submit a través de `invalidFields`
(líneas 68-71), no reabriendo la sección en silencio. `pr-input`/`pr-textarea` lo pintan rojo pero
no impiden escribir.

## Lo que el server considera mínimo es otra cosa

En el server **no existe** una lista de MDS: el mínimo es **qué campos son obligatorios en el DTO**
de `POST /api/bilateral/create`. Solo una mención explícita en
`onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts:1129` — `lead_contact_person`
como *"MDS field, mandatory"*, el cambio de `P2-3227`, registrado como **breaking** en el log de
`onecgiar-pr-server/docs/bilateral-result-summaries.en.md:435`.

⚠️ **Ahí está la trampa:** el porcentaje del anillo lo calcula el cliente con **su** lista, y el
rechazo lo decide el server con **la suya**. Si divergen, el anillo dice 100 % y la API rechaza, o
al contrario. Cualquier cambio de MDS hay que hacerlo **en los dos lados**, y el MDS está cambiando
ahora mismo (`P2-3225` Ready For UAT en cliente, `P2-3227` To Be Deployed en API).

