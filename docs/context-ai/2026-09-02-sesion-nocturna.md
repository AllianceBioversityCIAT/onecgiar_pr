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
