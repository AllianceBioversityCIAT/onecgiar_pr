# Guion de verificación en pantalla — lo entregado el 1-sep-2026

**Por qué existe:** el ambiente de pruebas de CIAT estuvo caído todo el día (todo lo que resuelve a
`cerberus.ciat.cgiar.org` — `prtest`, `prtest-back` y `clarisatest-web`). **Nada de lo de hoy se ha
visto en pantalla.** Son 17 commits de cuatro sesiones distintas. Este documento es el orden en que
hay que mirarlos cuando el ambiente vuelva, para no dar vueltas ni abrir el resultado equivocado.

**Antes de nada — ¿estás mirando el build correcto?** El sello del sidebar debe leer **v16 o
superior**. Si lee menos, lo que sigue no está desplegado todavía y cualquier fallo que veas es de la
versión vieja, no del cambio. (Detalle de la cadena de despliegue en `como-validar-un-despliegue-en-prtest.md`.)

---

## Si solo hay diez minutos

Ordenado por daño, no por orden de entrega. Los tres primeros son **pérdida de datos o bloqueo**; el
resto puede esperar.

1. **§1 — ¿aparece el botón Save?** Si un editor no lo tiene, nada más importa.
2. **§2 — ¿sobrevive el nombre del Lead contact person al guardar?** Se estaba borrando solo.
3. **§3 — ¿el AI Review deja de pisarse a sí mismo?** Aceptabas una recomendación y el Save la deshacía.

---

## Datos de prueba que ya existen en prtest

No hace falta crear ninguno. **Casi todo lo de hoy es un gate de fase, así que la prueba real es
abrir uno de 2025 y uno de 2026 y comparar** — la lectura del código no basta porque los dos ejes se
leen igual.

| Para qué | Fase 2026 | Fase 2025 |
|---|---|---|
| Policy change | `8916` | `8501` |
| Innovation Development | `8927`, `8928`, `8929`, `8933` | `8548`, `8869` |
| Bilateral creado a mano | `8967` | — |
| Promovido desde borrador de IA | `8884` | — |
| SP08, Reporting 2026, en *Editing* | `8842` | — |

⚠️ Los de Policy change e Innovation Development de 2025 **están dentro del portafolio P25**. Ese es
justamente el caso que rompen los gates mal hechos, así que son los que hay que abrir.

---

## 🔴 Bloqueo y pérdida de datos — mirar primero

### §1 · El botón Save podía no existir · `03ae798eb`

🛑 **Esta entrada estaba mal planteada y se reescribió el 1-sep-2026. Son DOS comprobaciones
distintas, y solo la primera prueba el arreglo.** La redacción anterior pedía abrir el resultado "en
frío, sin que ocurra ninguna otra petición" y dar por bueno el arreglo si el botón aparecía.

**Por qué eso no vale, y es la razón que impide que alguien lo revierta por comodidad:**
`shared/interceptors/general-interceptor.service.ts:26` llama a `viewRefreshSE.schedule()` en el
`finalize` de **toda** petición HTTP, y abrir un resultado dispara decenas. Ese repintado global es
justo lo que hacía el defecto intermitente. Así que **ver el botón no distingue "arreglado" de
"tapado por el interceptor"**: la prueba saldría verde con el bug presente. El estado que la
redacción pedía —una carga sin ninguna otra petición— **no existe en la aplicación real**.

**(a) ¿Está el arreglo en el build que sirve el ambiente?** — es lo que prueba el arreglo.
Se comprueba en el artefacto servido, con la técnica de abajo. Debe aparecer, textual:
```js
get readOnly() {  return this._readOnly();  }
set readOnly(value) {  this._readOnly.set(value);  }
```
Si en su lugar hay un campo plano (`readOnly = !0`) y ningún getter, el arreglo **no** está
desplegado y no tiene sentido mirar la pantalla.
✅ Verificado el 1-sep-2026 sobre el build **v16**, en `chunk-QO6CGUC7.js`.

**(b) ¿Sigue funcionando la pantalla?** — es **no-regresión**, no es la prueba del arreglo.
Abrir un resultado en modo edición (`8842`, SP08, Reporting 2026, *Editing*) con un usuario con
permiso, comprobar que el botón **Save** aparece y que **guarda**. Esto vale porque el cambio tocó un
servicio global que leen 206 plantillas; no vale como confirmación de que el defecto se arregló.

---

### 🔧 Técnica reutilizable · verificar en el ARTEFACTO qué código hay desplegado

Nació de §1 y sirve para cualquier cambio de cliente. **El sello `APP_VERSION` dice qué build es;
esto dice qué código lleva dentro** — que es la pregunta que de verdad importa y que el sello no
responde. No depende de horas de commit ni de bumps.

1. `curl https://prtest.ciat.cgiar.org/main.js` y sacar los chunks: `grep -oE 'chunk-[A-Z0-9]+\.js'`.
2. Bajarlos todos (son estáticos del front: **no** cuentan para el rate limit de la API).
3. Localizar el chunk por **una cadena literal del archivo**, que la minificación no borra — un
   mensaje, una descripción, un texto de UI. Ej.: `"Change lead and co-lead"` lleva a `RolesService`.
4. Dentro, buscar la forma del cambio. **Los nombres de propiedades y métodos públicos no se
   minifican** (las plantillas los usan), así que `get readOnly()`, `showScalingStudies` o
   `_updatingLeadData` se leen tal cual.

⚠️ **Y distingue entre servicios gemelos.** `updatingLeadData` existe en dos: el getter que aparece
en `chunk-SJKKGG6Z.js` es de `_RdContributorsAndPartnersService` (P25 + IPSR), no del `RdPartnersService`
de P22. Buscar el nombre a secas da un falso positivo; hay que mirar **de qué clase** es.

---

### 📌 Qué contiene realmente el build v16 (medido, 1-sep-2026)

Estar commiteado antes del bump del sello **no** significa estar en el build. Medido por artefacto:

| Commit | Hora | ¿En v16? | Cómo se comprobó |
|---|---|---|---|
| `03ae798eb` botón Save | 08:36 | ✅ **sí** | `get readOnly()` en `chunk-QO6CGUC7.js` |
| `7c0359753` §6 escalamiento bilateral | 09:09 | ❌ **no** | `showScalingStudies` no aparece en ningún chunk |
| `491835a59` §7 `rd-partners` | 09:19 | ❌ **no** | el servicio P22 sigue con campo plano; el único getter es del gemelo |

👉 **El build v16 de Cristian se cortó entre las 08:37 y las 09:09.** §6 y §7 **no se pueden verificar
todavía** — hay que esperar al v17.

### §2 · El Lead contact person se borraba solo al guardar · `54d52b365`

- **Dónde:** cualquier resultado → **General Information** → campo **Lead contact person**.
- **Con qué probar:** **dos casos distintos, y el segundo es el importante.**
  1. Un resultado **P25** con un contacto ya guardado (p. ej. `8916`): abrir la sección sin tocar el
     campo y guardar.
  2. Un resultado **P22** o venido de la API de W3/Bilateral, cuyo contacto sea **texto libre sin
     coincidencia en el directorio** (`8967` es candidato).
- **Bien:** el nombre sigue ahí después de guardar y de recargar. En el caso 2, **se puede guardar la
  sección** aunque el contacto no case con nadie del directorio.
- **Mal:** el nombre desaparece al guardar; o sale un error acusando de un texto que el usuario nunca
  escribió y no deja guardar.
- **Y el caso que debe seguir fallando:** si **tecleas** un nombre y no eliges a nadie de la lista,
  eso **sí** tiene que dar error. Escribir a medias no es dato válido en ningún portafolio.

### §3 · El AI Review se pisaba a sí mismo · `ebde5d999`

- **Dónde:** un resultado → **General Information** → abrir el **AI Review** → aceptar una
  recomendación de área de impacto → cerrar el diálogo → pulsar **Save changes** de la sección.
- **Con qué probar:** `8884` (promovido desde borrador de IA) o `8842`.
- **Bien:** tras aceptar la recomendación, la sección **se refresca sola** y muestra el valor nuevo;
  el Save posterior lo conserva.
- **Mal:** la sección sigue mostrando los valores viejos y, al guardar, **deshace** lo que la IA
  acababa de escribir.
- ⚠️ **Efecto lateral conocido y aceptado:** validar todas las áreas de golpe recarga la sección una
  vez por cada área guardada (hasta cinco recargas seguidas), y **una recarga descarta ediciones sin
  guardar** que tuvieras abiertas en esa sección. No es nuevo y no es un fallo del arreglo.

### §4 · Capacity Sharing llegaba en blanco al revisor · `4b07debbe`

- **Dónde:** un resultado de tipo **Capacity Sharing** con la sección **a medio responder** →
  abrirlo desde la cola de **Quality Assurance**, en el panel de revisión.
- **Bien:** el revisor ve las respuestas que sí se dieron.
- **Mal:** la sección entera sale vacía, como si el reportante no hubiera contestado nada — y se
  rechaza un resultado que estaba bien.
- 🛑 **Dato de prueba pendiente:** hace falta un Capacity Sharing con **uno solo** de los dos campos
  contestados (método de entrega **o** duración, no ambos). *Pendiente de que la sesión que lo
  entregó aporte el resultado concreto* — no lo inventes, que es como se reporta un fallo falso.

### §5 · El estudio MELIA no se borraba · `2d84051d4`

- **Dónde:** un **Knowledge Product** → responder **"No"** a *"Is this knowledge product a MELIA
  Product?"* después de haber elegido un estudio MELIA → guardar → recargar.
- **Bien:** el estudio queda borrado de verdad; al volver a marcar "Sí", el selector está vacío.
- **Mal:** el estudio elegido sigue guardado, invisible en el formulario y sin forma de quitarlo.
- **Segundo camino al mismo fallo:** dejar el producto como MELIA pero **vaciar** el selector de
  estudio. Debe quedarse vacío tras recargar.
- 🛑 **Dato de prueba pendiente**, igual que §4: *pendiente de que la sesión que lo entregó lo aporte.*

---

## 🟡 Retrocompatibilidad — los gates de fase (aquí hacen falta DOS resultados)

En los tres siguientes **la prueba es la comparación**. Ver solo el de 2026 no demuestra nada.

### §6 · Guía de tipos de política · `1899f4602`

- **Dónde:** resultado **Policy change** → sección **Policy change info** → la caja gris de arriba,
  **"Policy type guidance"**.
- **Con qué probar:** `8916` (2026) **y** `8501` (2025).
- **Bien:** el de 2026 empieza *"Policies are written and formally approved decisions…"*. El de 2025
  empieza *"Policies or strategies include written decisions…"* y más abajo menciona las *information
  campaigns (e.g., for improved diets)*, frase que el texto nuevo elimina.
- **Mal:** los dos muestran el mismo texto.
- **"Legal instrument" es idéntico en ambos** a propósito: no se tocó.

### §7 · Pregunta de estudios de escalamiento en el bilateral · `7c0359753`

- **Dónde:** resultado **bilateral** de tipo **Innovation Development** → el formulario del tipo →
  la pregunta *"Have any studies been conducted to inform the innovation scaling strategy design…?"*.
- **Con qué probar:** un bilateral de Innovation Development de **2026** (`8967` es el candidato) y
  uno de **2025**.
- **Bien:** en 2026 la pregunta **no aparece a ningún nivel de readiness**. En 2025 aparece igual que
  siempre, a partir del nivel 6.
- **Mal:** sigue apareciendo en 2026, o desapareció también en 2025.

### §8 · Innovation Developer pre-rellenado · `e1fe06b9e`

- **Dónde:** resultado **Innovation Development** → **General Information**, comprobar que *Lead
  contact person* tenga un nombre → después ir a **Innovation Development information** y bajar
  hasta **Innovation Developer**.
- **Con qué probar:** `8933` o `8927` (2026) **y** `8548` o `8869` (2025).
- **Bien:** en 2026 la caja **ya viene con el nombre del Lead contact person** y **no** lleva debajo
  la nota gris larga. En 2025 la caja está como siempre y la nota sigue ahí.
- **Mal:** en 2026 la caja está vacía, o en 2025 aparece rellenada.
- **Comprobación extra:** escribir otro nombre encima, guardar y recargar → debe respetarse lo
  escrito, **no** volver a sobrescribirse con el contacto.
- ⚠️ **Comportamiento esperado, no fallo:** si borras el contenido y recargas **sin guardar**, vuelve
  a aparecer rellenado.

---

## 🟢 Aditivo y cosmético — mirar al final

### §9 · Tarjetas de AoW expandidas · `80315ce73` + `4c2c0c69f`

- **Dónde:** **Result Framework Reporting** → un Science Program → pestaña **Reporting**.
- **Bien:** las tarjetas de AoW aparecen **abiertas** al entrar, y el primer clic en **Collapse all**
  las cierra.
- **Mal:** aparecen cerradas; o el primer clic del botón no hace nada (el "clic muerto" que QA ya
  reportó una vez).
- ⚠️ **Contexto necesario:** el ticket P2-3251 dice lo contrario en su título y en sus criterios, y
  el PO confirmó por escrito *"inicialmente vamos con que estén cerradas"* el 27-ago. **Yeck decidió
  el 1-sep que aquí manda QA.** Quien lea solo el ticket va a intentar revertirlo.

### §10 · Nombre y descripción del proyecto en el dashboard de centro · `dd1c61ae0`

- **Dónde:** dashboard de **centro** → listado de resultados **W3/Bilateral** enviados.
- **Bien:** hay dos columnas nuevas, **Project name** y **Description**, visibles por defecto, y el
  export a CSV las incluye.
- **Mal:** no aparecen; o un resultado sale **duplicado**, una vez por proyecto vinculado.
- ⚠️ Si un usuario había ocultado columnas antes, la preferencia guardada se reinicia a propósito
  para que las dos nuevas se vean.

### §11 · Barras de progreso preliminar y QA — **esto es de Juan David, no nuestro** · `b474dae01` + `7746d0301`

- **Dónde:** **Result Framework Reporting** → un Science Program → **AoW** → la fila de un indicador,
  columna **Progress**.
- **Bien:** dos barras separadas por indicador — **QA** (más oscura) y **Preliminary** (más clara) —
  y la etiqueta muestra la cifra real aunque pase del 100%, con la barra tope en 100%.
- **Mal:** una sola barra apilada, o la tabla entera en blanco (un indicador sin contribuciones
  solía tumbarla).
- 🛑 **La decisión sobre estas dos barras es de Juanda**, no nuestra: van en este guion solo porque
  están en la rama y hay que comprobar que no rompan nada. Los conjuntos de estados
  (*Preliminary* = Submitted + Approved · *QA* = QualityAssessed + Approved, y **Approved cuenta en
  las dos a propósito**) los fijó Nicoleta Trifa el 1-sep. **Está esperando respuesta de él.**

---

## Lo que NO se puede verificar todavía, y por qué

🛑 **El estado del ambiente NO se mide con la home**, y **tampoco con un endpoint de negocio.**
`prtest` puede responder **200** y aun así no dejarte entrar: el front son ficheros estáticos que se
sirven por otra ruta. Pero la sonda que elegimos primero —`/api/results/get/all` con token— resultó
ser **peor**: el 1-sep por la tarde ese endpoint devolvía **500 por un error de SQL** con el ambiente
perfectamente arriba y el resto del backend respondiendo.

**La sonda buena es un endpoint de CATÁLOGO**, que no depende de ninguna consulta compleja:

```
curl -s -o /dev/null -w '%{http_code}' -H "auth: $TOKEN" \
  https://prtest-back.ciat.cgiar.org/clarisa/policy-stages/get/all
```

**200 ahí = hay ambiente.** La lección, que es lo que hay que recordar y no el endpoint concreto:
**un endpoint de negocio puede estar roto sin que el ambiente lo esté**, así que un semáforo no se
pone nunca sobre una consulta que puede fallar por su cuenta.

> Medido el 1-sep a las 10:2x: `prtest` = **200**, `clarisatest-web` = **200**, pero
> `/api/results/get/all` = **403 con token y sin token**, y el cuerpo es un
> `<TITLE>403 Forbidden</TITLE>` de **Apache**, no un JSON de Nest. Es decir: hay servidor detrás
> (ya no da `000`), pero la capa que está delante rechaza todo, incluido un endpoint conocido-bueno
> con credencial válida. **El front carga y no hay login ni guardado.** Sigue siendo de Cristian/IT.

✅ **CERRADO el 1-sep por la tarde: era una MIGRACIÓN DE SERVIDOR, no inestabilidad.**
`cerberus.ciat.cgiar.org` resolvía a **`45.5.186.24`** toda la mañana y pasó a resolver a
**`45.5.184.24`**. Eso explica los tres estados que se midieron (`000` → `403` de Apache → `000`)
mucho mejor que cualquier hipótesis de caída, y confirma que **nada de esto lo causamos nosotros**:
la caída estaba medida antes de las 07:54 y nuestro primer despliegue del día fue a las 08:37.
**Quien lea mañana los tres estados sin este dato va a concluir que el ambiente es inestable, y no
lo es.** Lo que sigue debajo se conserva porque describe cómo se midió, no porque siga vigente.

⚠️ **Efecto colateral del cambio de IP, a tener en cuenta:** algunos entornos de shell **no
alcanzan la IP nueva** aunque el DNS ya la resuelva (conexión al 443 en timeout, con Google y Jira
respondiendo). Si `curl` da `000` pero el navegador entra, **el ambiente está bien y quien falla es
la sonda** — medir por navegador y no por `curl`.

🛑 **Y el ambiente es INTERMITENTE, no está recuperándose.** Medido a lo largo de la mañana: `000`
(caído del todo) → `403` (servidor detrás, proxy cerrado) → `000` otra vez, front incluido, en menos
de veinte minutos y desde tres redes distintas. **Por eso una sola sonda en 200 no basta:** hace
falta **200 confirmado dos veces, separadas por unos minutos**, antes de dar la salida. Si se
verifica en la ventana buena y el ambiente se cae a mitad, un corte se lee como un fallo del código
— y ese es el peor resultado posible de esta ronda.

⚠️ **Van dos falsos positivos en un día**, así que conviene desconfiar de la sonda fácil: éste
(`prtest = 200` con la API cerrada) y el de la mañana, en que `prms.cgiar.org` daba `000`
simplemente porque **ese dominio no existe**, no porque estuviera caído.

- **Nada de lo anterior está desplegado.** Todo vive en `performance-refactor`; el sello v16 solo
  llega a prtest cuando esa rama se despliegue.
- **Lo que depende del backend:** §4 (Capacity Sharing) y §10 (nombre de proyecto) son cambios de
  consulta en el servidor — necesitan el backend desplegado, no solo el cliente.
- **Congelado, no se toca:** todo **Innovation Use** está parado por decisión del PO del 31-ago
  (la regla del desplegable de innovaciones QA-ed va a cambiar). No verificar ni reportar nada de
  ahí.
- **Dos mediciones que quedaron pendientes por la caída:**
  - el `in_qa` de *global-parameters* — **medirlo con token igualmente**: a nivel de la aplicación
    el endpoint es público, pero eso es irrelevante mientras el proxy no deje llegar la petición,
    y sin token no se distingue un rechazo del proxy de una respuesta real;
  - el **404 de `existing-result-contributors`** — se descartó que fuera de rama o de rutas
    (está declarado y montado en las cuatro ramas), así que apunta al build desplegado o a algo de
    ejecución. **Hay que volver a medirlo con el ambiente arriba.**
- **Sin dato de prueba:** §4 y §5 esperan a que la sesión que las entregó aporte el resultado
  concreto. Adivinarlo produce reportes de fallos que no existen.

---

## Y cuando el ambiente vuelva

Avisar en cuanto responda: **la prioridad de todas las sesiones cambia** en ese momento. Lo primero
es §1, §2 y §3 — son los tres que pueden costar datos de un reportante.
