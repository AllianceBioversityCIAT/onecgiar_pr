# Sesión nocturna 2-sep-2026 (01:36 → 04:36)

Loop autónomo pedido por Yeck: probar la plataforma, arreglar lo que salga con subagentes,
terminar lo que Juanda dejó pendiente, y dejar las dudas de negocio en Jira.

----------

## 🥇 1. El defecto del auto-relleno del Innovation Developer NO EXISTE — era un 500 disfrazado

**Cerrado con prueba positiva en pantalla.** Historia: **P2-3272 Part 4** · defecto `W-20260901-47`.

El plan de ayer (`2026-09-02-diagnostico-autofill-developer.md`) buscaba un problema de **orden de
ejecución**. No lo era. La causa es otra y está fuera del componente:

**`GET /v2/api/innovation-development/innovation-dev/get/result/:id` devuelve 500** para el resultado
`8560` (id 11028), que era **el único resultado de fase 2026 con Lead contact person** — o sea, el
único escenario donde el auto-relleno se podía observar. El `next` del subscribe nunca corre, así que
`applyInnovationDeveloperAutoFill()` tampoco. El campo vacío no era el defecto: era el síntoma.

**Cómo se probó, y por qué es concluyente:**

| Paso | Medida |
|---|---|
| `8560` / id 11028, fase 36 | body del componente con **8 claves** y sin `innovation_developers`; ni `normalizeInnovationDevBooleans()` había corrido → el `next` nunca se ejecutó |
| Consola | `500` en `/v2/api/innovation-development/innovation-dev/get/result/11028` |
| Cuerpo del 500 | `Cannot read properties of undefined (reading 'innovation_readiness_level_id')` |
| `8562` / id 11030, fase 36 | GET **200**, body con **32 claves**, pero `lead_contact_person = null` → el gate no tenía nada que copiar |
| Se escribió el contacto en `8562` **por interfaz** (regla 22) | *Cadavid, Juan Carlos (Alliance Bioversity-CIAT)* |
| Se reabrió `8562` innovation-dev-info | **DOM del textarea = "Cadavid, Juan Carlos (Alliance Bioversity-CIAT)"** ✅ |

🥇 **Es un positivo concluyente y ejerce el DOM, no la propiedad de clase** — que es lo que pedía el
criterio zoneless. El auto-relleno funciona, el gate de fase funciona, y la nota gris ya estaba
verificada ayer en las dos fases.

⚠️ **Lección, la tercera vez esta semana:** el escenario se montó sobre el único resultado que tenía
el dato, y ese resultado estaba roto por otra razón. **Un escenario único no distingue el defecto que
buscas del que te encuentras.** El instrumento que lo resolvió fue tener un segundo resultado que
respondía 200.

## 🔴 2. Bug nuevo y grave — la sección Innovation Development se abre EN BLANCO

**4 de 6 resultados medidos devuelven 500** en el GET de la sección:

| code | id | resultado |
|---|---|---|
| 8560 | 11028 | 🔴 500 |
| 8562 | 11030 | ✅ 200 |
| 8563 | 11031 | ✅ 200 |
| 8565 | 11033 | 🔴 500 |
| 5921 | 11068 | 🔴 500 |
| 6069 | 6069  | 🔴 500 |

**Lo que ve la persona:** el formulario entero vacío, sin ningún mensaje — el cliente solo hace
`console.error` (`innovation-dev-info.component.ts`, handler de `error` de `getSectionInformationp25`).
Parece un resultado sin datos. Y guardar desde ahí puede escribir vacíos encima de lo que había.

## 📝 Datos de prueba escritos (regla 22 — se quedan puestos)
- **8562 / id 11030** → `lead_contact_person = "Cadavid, Juan Carlos (Alliance Bioversity-CIAT)"`,
  fase 2026, por interfaz. Es el escenario que prueba el auto-relleno: **no borrarlo**.

## ⚠️ Corrección al `CLAUDE.md` de reporting
La ruta que ese archivo recomienda como smoke test del ambiente,
`clarisa/policy-stages/get/all`, **devuelve 404** (medido a las 01:44). La que sirve es
`api/results/get/all/simplified` (200 con datos).

## 📏 Alcance real del 500, medido — la mitad de los resultados

Barrido por API sobre **30 resultados de Innovation Development de fase 2026** (los primeros 30 de los
128 que hay): **15 responden 200 y 15 responden 500**. O sea **la mitad de los resultados de ese tipo
abren la sección en blanco**.

Códigos que fallaban antes del arreglo: `8560 8565 8567 8585 8593 5921 8611 8616 8620 8621 8625 8627
8628 8629 8642`.

**Causa raíz** (agente de server, commit `f20c80910`): `innovation_dev.service.ts:392` leía
`innDevExists.innovation_readiness_level_id` sin guarda, e `InnovationDevExists()` devuelve
`undefined` **a propósito** cuando la fila de `results_innovations_dev` no existe — y esa fila **no
existe hasta que alguien guarda la sección por primera vez**. Así que el defecto golpea exactamente a
los resultados nuevos: el discriminante no es "tener datos", es "tener fila".

**Y tiene culpable con fecha:** el gate sin guarda entró en `cc252a244` (30-oct-2025) en el servicio
v2. El mismo gate se retroportó al v1 el 11-ago-2026 (`7aa95fe6d`) ya **con** `Number(innDevExists?…)`.
El v1 nació protegido; el v2 nunca se corrigió. Como la fase 2026 va por la ruta v2, solo se ve ahí.

----------

## ✅ 3. Verificado en pantalla tras el despliegue: el arreglo del server funciona

Push de las 02:08 (6 commits, sello **v19**). A las 02:12 el server ya lo tenía:

- `GET /v2/api/innovation-development/innovation-dev/get/result/11028` → **200** con
  `result_innovation_dev_id: null`. 🥇 **Es un positivo concluyente**: el código anterior **no podía
  producir esa respuesta** — daba 500. Prueba el despliegue y el arreglo a la vez, sin depender de
  ningún sello.
- En pantalla, resultado **8560**: la sección pasa de **8 claves a 32**, **33 campos renderizados**, y
  el **auto-relleno del Innovation Developer aparece** ("Cadavid, Juan Carlos"). O sea el escenario
  original del defecto, ahora correcto.

## 🔴 4. Hallazgo de DESPLIEGUE, no de código — y es el que hace que QA reporte bugs falsos

Con el navegador que tenía la app abierta desde antes del push (sello **v18** en pantalla), **tres
secciones del formulario dejan de cargar y la aplicación expulsa a la home sin ningún mensaje**:

| Sección | Error de consola |
|---|---|
| Contributors & partners | `Failed to load module script … responded with a MIME` |
| Geographic location | idem |
| CapSharing info | idem |

**Causa:** los *chunks* perezosos llevan hash en el nombre (`cap-dev-info.module-XXXX.js`) y el
despliegue los reemplaza por otros, pero **`index.html`, `main.js`, `polyfills.js` y `scripts.js` se
sirven SIN hash**. El navegador conserva el `main.js` viejo, pide chunks que ya no existen, y el
servidor le devuelve el `index.html` con MIME `text/html` → el módulo no carga.

**Medido para descartar lo obvio:** el servidor sirve **v19 en 10 de 10 lecturas** con
`Cache-Control: no-cache`, así que no hay dos instancias detrás del balanceador. Y con la caché
desactivada por CDP el navegador **seguía** en v18: el bundle viejo se queda pegado.

🥇 **Por qué importa más de lo que parece:** probar justo después de un push produce **fallos falsos
muy convincentes** — secciones "rotas" que no lo están. Es la tercera vez esta semana que el artefacto
servido engaña. Es de despliegue (Cristian), no nuestro.
⚠️ **Consecuencia práctica: `P2-3550` no se pudo verificar en pantalla esta noche** — el navegador
seguía sirviendo el build sin el cambio. Queda declarado como no verificado.

## 📝 Datos de prueba creados esta noche (regla 22 — se quedan puestos)

- **8562 / id 11030** → `lead_contact_person = "Cadavid, Juan Carlos (Alliance Bioversity-CIAT)"`.
  Es el escenario que prueba el auto-relleno con el GET en 200.
- **8842** → evidencia `P2-3220-nightly-dod-check.pdf`, guardada en SharePoint como
  `result-8842-Document-202609020853-498.pdf`, marcada como pública, etiqueta *Nutrition*.
- **8994 / id 11462** → resultado **creado de cero** por el flujo completo: *"Nightly flow check
  2026-09-02 synthetic capacity sharing result do not use for QA"*, Capacity sharing, SP08, fase 2026.

----------

## ✅ 5. P2-3550 verificado en pantalla sobre v19 — y es la prueba de la regla 9

| Resultado | Fase | Bloque *Innovation reference materials* | `gate` |
|---|---|---|---|
| 8562 | 2026 | **ausente** ✅ | `true` |
| 8560 | 2026 | **ausente** ✅ | `true` |
| 5921 | **2025** | **presente** ✅ | `false` |

🥇 **La comprobación que vale es la de 2025.** `5921` está en el **mismo portafolio P25** que los de
2026. Si el gate se hubiera escrito contra el portafolio, ese resultado de fase 2025 **habría perdido
el bloque** y se habría roto la retrocompatibilidad del épico. Lo conserva. Eso es la confirmación de
que el eje elegido (año de fase) es el correcto — no un detalle.

🛑 **Y cómo se consiguió ver el build nuevo, que es un aviso en sí mismo:** hicieron falta
`Network.clearBrowserCache` + `setCacheDisabled` por CDP. Ni recargar, ni `?cb=`, ni desregistrar
service workers (no hay ninguno) bastaron: el sello seguía diciendo **18** mientras el servidor
respondía **19** en 10 de 10 lecturas, y un `fetch('/main.js', {cache:'reload'})` desde la propia
página ya devolvía 19. El `main.js` **ejecutado** venía del disco del navegador.

## 🔧 6. Lo entregado esta noche, por commit

| Commit | Qué |
|---|---|
| `739ed5523` | P2-3220 — bilateral `section-evidence` al servicio compartido de subida, + arreglo de colisión de nombres (dos ficheros del mismo guardado se sobreescribían) |
| `f20c80910` | **P2-3555** — el 500 de Innovation Development (mensaje del commit cita P2-3556 por error: era un placeholder) |
| `0fca46d3a` | P2-3550 — quitar *reference materials* del formulario 2026 sin borrar lo guardado |
| `573cbcb80` | P2-3220 — la **tercera** superficie (`innovation-dev-info`) al servicio compartido: ticket completo |
| `f013c157b` | **P2-3556** — omitir la clave de lista en el bilateral para no borrar los links |
| `6e88e275b` | **P2-3556** — estado de carga + guarda del autoguardado en el bilateral de Innovation Dev |

## 🎯 7. Actividades movidas (todas a nombre de Yeck, ninguna a Cami — regla 20)

`Ready For UAT`: **P2-3555** (nueva) · **P2-3550** · **P2-3272** (Part 4 cerrado con prueba) ·
**P2-3519** · **P2-3385** · **P2-3169** · **P2-3241**.
`P2-3556` (nueva, bilateral) queda pendiente de mover hasta que cierre la réplica en las dos
secciones hermanas. **P2-3322** se deja donde está: el desarrollo está completo pero depende del
re-test de Cami.

----------

## ✅ 8. Flujos probados en pantalla sobre v19 (lo que Yeck pidió: que el flujo funcione)

**Crear un resultado de cero — funciona de punta a punta.** Science Program → nivel *Output* →
categoría *Capacity sharing* → título → *Save and continue* → resultado **8994** creado y abierto en
General Information. Sin ninguna petición 4xx/5xx.

**Las cinco secciones del resultado nuevo, una por una:**

| Sección | Resultado |
|---|---|
| General information | ✅ carga, sin errores |
| Contributors & partners | ✅ |
| Geographic location | ✅ |
| CapSharing info | ✅ 11 campos |
| Evidence | ✅ |

⚠️ **La primera pasada de este mismo barrido dio TRES secciones "rotas"** (módulo que no carga y
expulsión a la home). Era el bundle v18 cacheado del punto 4, no un defecto: repetido con el bundle
v19 limpio, las cinco cargan. **Es el falso positivo más convincente de la noche** y el que QA se va a
encontrar si prueba justo después de un despliegue.

**Subida de evidencia (DoD de P2-3220 / P2-3221):** en `8842`, adjuntar → guardar → **recargar** →
la evidencia sigue ahí como `result-8842-Document-202609020853-498.pdf` con su enlace a SharePoint, y
la sección pasa a *Section complete*. 🛑 **El cuarto paso —abrir el fichero— NO se pudo verificar**:
requiere sesión iniciada en SharePoint, que el navegador del agente no tiene. Declarado en el ticket.

**P2-3251 verificado y cerrado:** la pestaña *Reporting* de SP08 abre con las AoW **expandidas** (el
control dice *Collapse all*, y AOW01 muestra sus 55 indicadores y filtros sin tocar nada).

**Bilateral:** la lista de resultados de CIP y el detalle de `8861` cargan limpios, sin 4xx ni errores
de consola. Solo base de comparación: el arreglo del bilateral **no está desplegado todavía**.

## ❌ 9. Falsos positivos descartados esta noche (y con qué instrumento)

| Sospecha | Veredicto | Lo que lo cerró |
|---|---|---|
| *Lead contact person* sin campo para escribir en General Information | ❌ no existe | El campo es un autocompletar; el `input` estaba ahí, solo no lo encontró el primer selector |
| Policy change: 404 en 6 de 8 resultados | ❌ no es defecto | El formulario **se pinta y es usable** (verificado en `8501`). El 404 es "no hay fila todavía" y el cliente lo maneja |
| Knowledge product: 404 en 8 de 8 | ❌ instrumento | La ruta que probé no existe (`Cannot GET …`) — cuerpo de Nest, no fallo de la app |
| 4 de 80 resultados 2026 "no existen" | ❌ sin impacto | Salen de `get/all/simplified`, que **no** es el endpoint de la pantalla; en la lista real del usuario (1867 filas) no aparecen |
| Errores de CORS al crear un resultado | ❌ ambiente | Cuerpo = HTML de Apache con **503**: era el backend reiniciándose por el despliegue |
| Tres secciones que no cargan | ❌ caché | Bundle v18 pegado en el navegador (punto 4) |

🥇 **Seis falsos positivos, todos cerrados mirando el CUERPO y no el código de estado**, o comparando
contra un segundo instrumento. Es la misma lección del 1-sep, y sigue siendo la que más tiempo ahorra.

----------

## 🔴 10. El defecto grande de la noche: el bilateral borraba respuestas guardadas (P2-3556)

Salió **de rebote**, verificando el punto 5: el agente de P2-3550 avisó de que el bilateral manda
siempre `reference_materials: []`. Al medirlo apareció una cadena mucho peor.

**La cadena, medida:**
1. `loadData()` de los formularios bilaterales **no tenía handler de error**.
2. Ese GET responde **500** real ante una excepción del servidor, y el interceptor **relanza**
   (`general-interceptor.service.ts:81-83`) → el `next` nunca corre.
3. `body` se queda en el `{}` del constructor. **El formulario se pinta vacío sin ningún aviso.**
4. La persona escribe → el autoguardado (debounce 800 ms) manda todas las claves con `?? null` / `?? []`
   → **blanquea en base de datos** lo que había.
5. Ventana secundaria: una edición que aterriza antes de que resuelva el GET. Latencias medidas
   0,24 s / 0,24 s / 0,62 s contra un debounce de 800 ms.

**Tres commits:** `f013c157b` (omitir la clave de lista) · `6e88e275b` (estado de carga + guarda del
guardado en Innovation Dev) · `1fef02f2a` (la misma guarda en **Policy Change** y **Capacity Sharing**).

### 🥇 Lo que aprendimos y no sabíamos: omitir la clave NO siempre protege

En Innovation Dev sí: `innovation_dev.service.ts:99-101` hace `if (evidences == null) return`, o sea
ausente = no tocar. **Pero en Policy Change y Capacity Sharing no existe ese escape:**

| Clave | Qué pasa si no se manda | Dónde |
|---|---|---|
| `institutions` | **Desactiva TODAS las organizaciones** del resultado — ausente y `[]` son idénticos | `summary.service.ts:1021,1048-1054` (policy) y `:433,460-467` (capdev) → `upDateAllInactiveRBI` |
| `amount` (policy) | `amount \|\| null` → se borra | `summary.service.ts:996` |
| contadores (capdev) | se guardan como **0** | `summary.service.ts:405-408, 420-424` |
| `optionsWithAnswers` | no-op | `:1057` |

⇒ **Para esas dos secciones la guarda de carga es la ÚNICA defensa posible.** Y omitir por simetría
habría roto el borrado legítimo del último elemento.

### 🛑 Y la casi-regresión que se evitó

`getPolicyChanges` **devuelve 404** cuando el resultado no tiene fila todavía
(`summary.service.ts:1104-1110`, y `Return-data.interceptor.ts:46` lo copia al status HTTP real).
Un `loaded=false` ingenuo ante cualquier error **habría deshabilitado Save para siempre en todo policy
change nuevo**. El 404 cuenta como "cargado y vacío". Capacity Sharing, en cambio, responde
`200` con nulos, así que ahí todo error sí es real. **Dos secciones que parecen gemelas y no lo son.**

### ⚠️ Los specs pasaban por la razón equivocada

Los tres specs no ejecutaban `fixture.detectChanges()` en su `build()`, así que `ngOnInit` **nunca
corría**: las aserciones de guardado pasaban porque el componente no se había inicializado, no porque
el guardado estuviera bien. Corregido en los tres. Es la misma familia de error que la regla
"si el test pasa a la primera contra el código roto, está mal escrito".

### Lo que queda abierto y por qué
- 🧊 **`type-innovation-use` tiene el mismo hueco y NO se tocó** — congelado por Ángel (31-ago).
  Cuando se descongele, necesita la guarda idéntica. **Es pérdida de datos, no una mejora.**
- `type-knowledge-product` no se auditó.
- El segundo GET de Policy Change sigue sin handler: puede perder **una edición**, no datos guardados.

----------

## 🧩 11. P2-3292 partido y construido a medias, como manda la regla 16

**Lo primero que salió, y es lo que más vale:** las **tres `Open Questions` que Ángel escribió el
17-ago** al final de la descripción **ya las contestó él mismo el 28-ago** reescribiendo la
descripción (bloque *"Resolved Clarifications (business-validated, 2026-08-28)"*, tras consultar a
Marc Schut) y movió el ticket a `Ready To Develop`. **Están cerradas: nadie tiene que perseguirlas.**

🥇 **La que sigue abierta es NUESTRA** — la publicó Yeck el **31-ago 08:27** en formato A/B: *"una vez
que alguien confirma que su innovación ya no está activa, ¿puede reabrirse, y quién?"*. Recomendación
**B** (que un administrador pueda), porque **P2-2923 existe justamente porque la gente se quedaba
atrapada al cerrar por error**; la opción A desharía eso a propósito.
🛑 **Y llevaba cinco días invisible**: el ticket estaba `In Progress` **a nombre de Yeck**, así que a
Ángel no le aparecía en su cola. **Movido a `To Be Clarified` y asignado a Ángel esta noche.** Es
exactamente el fallo que describe la regla 11 — el estado decía "en curso" y la pelota no era nuestra.

**El corte, decidido por dependencia real:** se construyó el **Step 2** (la pregunta encima de la
lista de razones), commit `3e87d5e60`. El **Step 4** (auto-lock) **sí** depende de la respuesta: con A
hay que quitar la marcha atrás de P2-2923 y con B hace falta una ruta de reapertura para admin que hoy
no existe. Se rehaería entero → espera.

⚠️ **Y había un motivo positivo para hacerlo ya: el hueco lo abrió nuestra propia entrega.** El Step 1
(`06b82b22d`) sustituyó la segunda etiqueta del radio —que hasta 2025 llevaba el arranque
*"…investment was discontinued, because:"*— por un **"No" pelado**, dejando la lista de razones de
2026 **sin ninguna pregunta encima**. Esto lo cierra sin tocar nada bloqueado.

**Lo que queda es de Juan David** (esquema): los 7 textos de razones como **filas nuevas** del
catálogo `investment_discontinued_option` —jamás un `UPDATE` ni `is_active = 0`, porque el front
reconstruye la lista desde el catálogo activo y desactivar una fila **borraría de pantalla una razón ya
reportada en 2025**—, el filtro por fase del endpoint, los vínculos merge/split (`linked_result` no
tiene discriminador de tipo) y la regla de green check.

----------

## 🔴🔴 12. El hallazgo más grave: la sección Innovation Development NO SE PUEDE GUARDAR (P2-3557)

Salió **probando el DoD de la subida** en la superficie que faltaba (`innovation-dev-info`, ya migrada
al servicio compartido en `573cbcb80`, desplegado en **v20**). Resultado **8563** / id 11031, fase 2026,
*Editing*:

```
200  /v2/api/innovation-development/evidence_demand/createUploadSession
200  /v2/api/innovation-development/evidence_demand/create/11031
500  /v2/api/innovation-development/innovation-dev/create/result/11031
```

✅ **La subida funciona por la puerta P25 correcta** → P2-3220 verificado también en la tercera
superficie. Y el aviso en pantalla es exactamente el que debe salir:
*"This section was not saved — Your evidence was stored, but the rest of the section could not be
saved."* Eso prueba que el arreglo de no-tragarse-el-error (P2-3218 / P2-3220) **funciona**.

🔴 **Pero el guardado de la sección devuelve 500 y no guarda nada.** Cuerpo:
`Cannot read properties of undefined (reading 'radioButtonValue')`.

**Causa raíz, medida:** `innovation_dev.service.ts` (results-framework-reporting, ~:136-185) lee ocho
rutas fijas `dto?.<grupo>.q1..q4.radioButtonValue`. El `?.` **protege solo el DTO**, no las claves
internas. Y el catálogo de preguntas ya no trae la cuarta:

```
GET /v2/api/results/questions/innovation-development/11031  -> 200
  responsible_innovation_and_scaling : [ … q1, q2, q3 ]      ← SOLO TRES
  intellectual_property_rights       : [ … q1, q2, q3, q4 ]
```
Igual en 11028. El cliente reenvía lo que recibe, el servicio sigue pidiendo cuatro → revienta.

### 🥇 Y la parte del método que importa: cómo se descartó que fuera nuestra regresión
Tres mediciones, en este orden, porque las dos primeras me dieron **falsos positivos**:
1. Primer volcado del payload cortado a **900 caracteres** → parecía que el cliente no mandaba las
   preguntas. **Falso**: el spread las pone al final y el corte las tapaba.
2. Sospecha de que `buildSectionPayload()` (P2-3550) las hubiera perdido al hacer destructuring.
   **Falso**: hace `{...innovationDevInfoBody, ...innovationDevelopmentQuestions}` y omite solo su
   propia clave. Leído en el código.
3. Volcado **completo** (21.864 bytes): las **34 claves** están, `responsible_innovation_and_scaling`
   **presente**… y sin `q4` dentro. Ahí se cerró.

⇒ **No es regresión de esta noche.** Es un desajuste de servidor anterior, probablemente de cuando se
quitó *Megatrends* y se añadieron las dos preguntas nuevas de GESI/riesgo (**P2-3465** y **P2-3467**),
que cambiaron el catálogo sin actualizar este servicio. Está en manos de un agente.

## ✅ 13. Knowledge Product bilateral: medido, y NO se arregló porque no hacía falta

Cuarta y última sección bilateral. **Veredicto: el defecto de pérdida de datos no es alcanzable ahí**, y
por una razón concreta: su template **no pinta el formulario** mientras la carga está en vuelo o ha
fallado (`type-knowledge-product.component.html:2,7,19`) y **retira la fila de acciones entera**
(`:244`), así que no hay ni campo donde escribir ni Save que pulsar.

🛑 **Pero omitir la clave ahí protegería MENOS que en ningún otro sitio**: en `upsert`
(`results-knowledge-products.service.ts:1898-2031`) una clave ausente **nula cinco columnas** de MELIA
en un solo guardado. La única con contrato de tres estados es `tocMeliaStudyId` (`:1961`, `:1982`), y
es intencional para el formulario P22.

⚠️ **Y la trampa corre al revés que en Policy Change:** aquí el **404 sí es una anomalía real** (un KP
bilateral no puede existir sin su fila: si `populateKPFromCGSpace` falla, el resultado se desactiva y
la creación aborta, `bilateral-center.service.ts:189-204`), así que tratarlo como fallo es lo correcto.
En Policy Change era justo lo contrario. **Dos secciones que parecen gemelas y no lo son.**

Se añadieron **3 tests candado** (`348ba9f84`) porque esa propiedad no tenía ninguno y está a una
edición de template de perderse — precisamente la edición que las tres hermanas acaban de hacer.

### 12-bis · Alcance real del bloqueo: el 100%, y el culpable con fecha

Medido con solo-GET sobre el catálogo de preguntas:

| Muestra | Grupos que trae | Veredicto |
|---|---|---|
| **13 de 13** ids de fase 2026 (uno cada diez de la lista completa) | `RIS=[q1,q2,q3]` · `IPR=[q1,q2,q3,q4]` | 🔴 **todos fallan** |
| 4 ids de fase 2025 (`11020, 11000, 10000, 9142`) | `RIS=[q1,q2,q3,q4]` | ✅ correctos |

⇒ **No es "algunos": es el 100% de Innovation Development de fase 2026 — 128 resultados en prtest.**
El eje es la **fase**, no el dato. (294 de fase 2025 están bien.)

**La cadena, con fecha y autor:**

| Commit | Fecha | Quién | Qué |
|---|---|---|---|
| `39953c33f` | 26-ago 15:10 | Yeck | Ancló los slots por `result_question_id` (q4 → 137). Un id ausente deja el slot `undefined`, y `JSON.stringify` **borra la clave**. |
| `a3b02520b` | 27-ago 10:09 | Juan D. Guzmán | Filtro por año de fase; retira 78/79/137 para 2026 (P2-3467). |
| 🔴 **`b9b46642b`** | **27-ago 10:16** | Juan D. Guzmán | **El merge de los dos.** Ahí nace `resolveScalingSlotsForPhase` (`result-questions.service.ts:513-532`), que para fase ≥2026 devuelve **tres** slots. Su propio comentario lo dice: *"137 has no replacement, so q4 is left empty"*. El servicio de guardado nunca se actualizó. |

🥇 **La hipótesis inicial (P2-3465 + P2-3467) era correcta en el origen pero no en el punto de rotura:
lo rompió el MERGE que los unió, no ninguno de los dos por separado.** Es la clase de causa que solo
aparece mirando el histórico, no el diff.

**Y se perdía más de lo que decía el aviso:** el 500 mataba el `try` entero, así que además de las
respuestas **tampoco se guardaban la inversión esperada ni el presupuesto**. El texto en pantalla no
mentía, pero enumeraba menos de lo que se caía.

**El arreglo (`0f849b61d`) recorre las claves `qN` presentes** en vez de nombrar cuatro. Y la decisión
clave: **pregunta ausente = NO llamar a `saveOptionsAndSubOptions`**, porque esa rutina fuerza
`answer_boolean = false` en las opciones no seleccionadas (`:527-537`) y desactiva respuestas
(`:581`, `:594`) — llamarla por una pregunta que el usuario nunca vio **habría borrado respuestas
que sí tiene**. Server: 206 suites / **1971** tests, 4 de 5 casos nuevos fallan contra el código viejo.

⚠️ **Deuda declarada, no tapada:** `TopLevelQuestionsV2` sigue declarando `q1..q4` como obligatorios y
eso ya es falso. Hacerlo opcional rompe la asignabilidad con el DTO v1 que usan
`saveInitiativeInvestment` / `savePartnerInvestment` (legacy compartido). Queda escrito en la interfaz.

----------

## 🧾 Cierre — lo que hay que saber mañana en tres líneas

1. 🔴 **P2-3557 es lo urgente**: nadie podía guardar Innovation Development en 2026. Arreglado, pero
   **es de server y necesita despliegue del backend** para poder comprobarlo (el sello del cliente no
   sirve ni para descartar).
2. 🔴 **P2-3555 y P2-3556** son los otros dos de pérdida/bloqueo de datos. El primero ya está
   desplegado y verificado en pantalla; el segundo espera el build.
3. 🧊 **Innovation Use sigue congelado y con el mismo defecto de pérdida de datos** que se arregló en
   sus cuatro hermanas. Es lo primero que hay que descongelar, y es decisión de Yeck.

----------

## ✅ 14. Verificado en pantalla sobre v21 (build de las 03:20)

| Qué | Resultado |
|---|---|
| 🥇 **P2-3557 — el guardado bloqueado** | `8563`, fase 2026: Save responde **201** con el registro guardado (antes **500** y nada). **Positivo concluyente**: el código anterior no podía producir un guardado correcto ahí, así que prueba el despliegue y el arreglo a la vez — y eso importa porque **el server no tiene sello de versión**. |
| ✅ **P2-3220 / P2-3221 — DoD en la 3ª superficie** | Adjuntar en `innovation-dev-info` → guardar → **recargar** → persiste como `result-8563-Document-202609020943-499.pdf`, en `sites/OneCGIARPRMSRepository/Testing/Reporting 2026/Result 8563/`. Las tres superficies quedan ejercidas de punta a punta. |

**Lo que NO se pudo verificar, y por qué (declarado, no omitido):**
- **P2-3556 (bilateral)**: la sección de tipo específico no llega a montarse en el resultado de
  pruebas (`8861` está en *Pending review*). Y provocar el fallo de carga a propósito exigiría romper
  la carga de un resultado con respuestas guardadas — arriesgar datos para demostrar la pérdida.
- **P2-3292 Step 2**: la pregunta solo aparece **una vez marcada la innovación como inactiva**, que es
  un cambio de estado de negocio, no un dato de prueba inocuo. No se forzó.
- **Abrir el fichero subido** (4º paso del DoD): necesita sesión iniciada en SharePoint.

## ⚠️ 15. Un aviso más, de una línea y sin ticket (regla 6)

El **Tickets Dashboard** del Admin Module pinta su texto pero **el panel viene vacío**: su iframe
externo `https://bi.prms.cgiar.org/bi/IBD-ticket-tracking?...` responde **404**. Es servicio/config
externo, no código nuestro. Nadie lo ha pedido; queda dicho por si alguien lo usa.

## 📊 Resumen de la noche

**5 defectos encontrados y arreglados**, tres de ellos de pérdida o bloqueo de datos:
`P2-3555` (sección en blanco, 50%) · `P2-3557` (guardado imposible, **100% de 2026**) ·
`P2-3556` (el bilateral borraba respuestas, 4 secciones) · la colisión de nombres de ficheros
(dentro de P2-3220) · y el contador "0/0 campos" de Policy Change.

**1 defecto refutado:** el auto-relleno del Innovation Developer (`P2-3272`) **no existía**.

**6 falsos positivos cerrados** antes de reportarlos, todos mirando el cuerpo y no el código de estado.

**Actividades en `Ready For UAT` a nombre de Yeck, ninguna a Cami:** P2-3555, P2-3556, P2-3557,
P2-3550, P2-3272, P2-3220, P2-3221, P2-3519, P2-3385, P2-3169, P2-3241, P2-3251.
**A Ángel:** P2-3292 en `To Be Clarified` con su pregunta ya visible.

**Cinco pushes agrupados**, sellos v19 → v20 → v21. Suites verdes en cada uno
(server **206 / 1971** · cliente **505 / 7845**). Nada tocó `dev`.
