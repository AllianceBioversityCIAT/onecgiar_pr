# Pendiente — defectos de formulario encontrados el 31-ago-2026

**Qué es esto:** el barrido de defectos de formularios encontró **28 defectos que sobrevivieron a una
refutación adversarial** (otro agente intentó tumbar cada uno abriendo el código y no pudo). Se
arreglaron 3. Los demás quedan aquí con su dueño y su archivo, para retomarlos sin volver a
investigar. Los agentes que iban a arreglarlos murieron a media tarea al agotarse el límite de sesión.

**Cómo retomar:** cada bloque es un lote de archivos disjuntos, pensado para atacarse en paralelo sin
pisarse. El detalle completo de cada defecto (qué ve el usuario, escenario, archivo:línea) está en el
resultado del workflow `forms-defects-and-answers`, y los dos barridos de navegador en
`qa-sweep-2026-08-28.md` y `qa-sweep-2026-08-31.md`.

---

## ✅ Ya arreglado y pusheado (3)

| Commit | Defecto |
|---|---|
| `ec89a0f2b` | El dropdown de innovaciones QA-ed ofrecía todas las fases pasadas; ahora solo la anterior (P2-3420 / P2-3421) |
| `e8844e891` | 💾 Contestar "Yes" a la pregunta de resultado enlazado/agrupado se guardaba como "No" |
| `9b67f071a` | 💾 Una edición se perdía si se editaba otro campo mientras el autoguardado bilateral estaba en vuelo · y el chip decía "All changes saved" sin haber guardado |

---

## LOTE 1 — General Information · verificado uno por uno el 1-sep-2026

Archivos: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/**`
· `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/**`
· `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`

🛑 **Nada de este lote se verificó en navegador: prtest, prtest-back y clarisatest-web estaban
caídos todo el 1-sep** (todo lo que resuelve a `cerberus.ciat.cgiar.org`). Falta abrirlo en pantalla.

### ✅ Arreglado — 1. el nombre del Lead contact person se descartaba Y borraba el guardado

El defecto era real y el diagnóstico anterior estaba **incompleto**: no bastaba con quitar el
`!isP25`. La causa última es que el guardado no distinguía un nombre **tecleado** de uno **cargado
con el resultado**, y el `!isP25` (`c64baefb8`, 23-ene-2026, sin razón escrita) era un parche para eso.

- Un nombre libre sin coincidencia en el directorio es dato legítimo: el vínculo con AD
  (`lead_contact_person_id`) solo existe desde la migración `1751462633282` (jul-2026), así que **todo
  resultado anterior** lo guarda como texto libre, igual que lo reportado por la API de W3/Bilateral.
  Con el guard mirando solo `searchQuery && !selectedUser`, esos resultados **no podían guardar
  General Information en P22** y encima se les acusaba de un dato que no escribieron.
- Excluir P25 tapaba eso y abría la pérdida: al teclear, `onSearchInput` pone
  `lead_contact_person`/`_data` en `null`, y `createResultGeneralInformation` escribe ese `null` tal
  cual (`results.service.ts:901-902`) — se pierde lo tecleado y se borra lo que había.

Arreglo: el guard usa `queryCameFromHydration`, la misma distinción que el campo ya hacía en
`onContactBlur`. Tecleado y sin elegir = error en **todos** los portafolios; cargado = se guarda.
102/102 en el spec de la sección; 3 casos nuevos que fallan contra el código anterior.

### ❌ RETIRADO — 2. el guardado rechazado recargaba y borraba lo tecleado

**Ya estaba arreglado** por Yeck el 31-ago 14:56, commit `034414b2c`. El handler de error ya no llama
`getSectionInformation()`.

### ✅ Arreglado — 3. tras aceptar una sugerencia del AI Review la sección guardaba el texto viejo

Confirmado, y con un mecanismo concreto: el aviso que refresca la sección
(`generalInformationSaved`, que `RdGeneralInformationComponent` escucha en un `effect`) vivía **solo**
en `POST_saveSession`, alcanzable únicamente desde `onApplyProposal` — y **ningún template llama a
`onApplyProposal`**: es código muerto. La vía que el diálogo usa de verdad
(`onSaveDacScore` / `onValidateAll` → `PATCH_saveDacScore`) no avisaba a nadie, así que la sección
seguía con los valores cargados antes de abrir el diálogo y su propio "Save changes" los volvía a
escribir encima de lo que la IA acababa de guardar.

Arreglo: `PATCH_saveDacScore` emite el mismo aviso (extraído a `notifySectionChanged()`).

⚠️ **Apunte que queda, sin desarrollar:** con `onValidateAll` el aviso sale una vez por área guardada,
o sea hasta 5 recargas seguidas de la sección. Es correcto pero derrochador. Y el recargar descarta
ediciones sin guardar que la persona tuviera en la sección — ya pasaba con `POST_saveSession`, no lo
introduce este arreglo.

⚠️ **También queda, y no es nuestro:** 3 de los 16 casos de
`lead-contact-person-field.contract.cy.ts` fallan en `performance-refactor` desde antes de tocar nada
(asertan `.fch_tag` / `fc-done` de `field-card`). Comprobado revirtiendo a HEAD: fallan igual.

## 🔴 LOTE 2 — El peor de todos, y es bloqueante (backend, nuestro)

Archivo: `onecgiar-pr-server/src/api/results/results.service.ts` ~4565-4569

💾 **Que un revisor administrador pulse "Save changes" en el bloque de data standards BORRA las
respuestas del investigador.** El payload del revisor no trae los campos del investigador y el update
los sobrescribe con vacío. Caso real: un Capacity Sharing bilateral donde el investigador respondió
"Were the trainees attending on behalf of an organization?" queda sin respuesta.
Arreglo: escribir solo lo que viene informado en el payload.

**En el mismo archivo, y del mismo lote:** un resultado nuevo no se puede guardar hasta puntuar los 5
Impact Areas, se pierde lo escrito, y el mensaje de error no dice qué falta (`:647-657` y hermanos
`:667-676`, `:683-692`, `:704-716`, `:727-736`). Arreglo mínimo: que el mensaje nombre el Impact Area
que falta. **No cambiar la regla de obligatoriedad** — eso es decisión de negocio.

## ❌ LOTE 3 — RETIRADO: los dos hallazgos de Contributors & Partners no se sostienen

Verificado en el código el 31-ago por la tarde, después de que **Santi** avisara de que ya había
trabajado esa zona:

- **"El rol de socio (Scaling / Demand / Innovation) se contagia entre resultados"** — esos campos
  **no existen** en `rd-contributors-and-partners/`. El auditor los confundió con
  `is_leading_result`, que es otra cosa.
- **"El botón de borrar elimina el socio equivocado"** — los `splice` por índice de esa carpeta son
  de proyectos no-pooled y de iniciativas contribuyentes, **no de External partners**.

**Lo que sí había ahí ya lo arregló Santi** en `268cbc622` (31-ago 12:10, ticket **P2-3326**):
desacopló el liderazgo de centro del de socio — antes marcar un socio como líder **forzaba a cero**
el liderazgo de todos los centros, y al revés — y separó el mensaje compartido en dos. Con 201
líneas de test y el `CLAUDE.md` de la carpeta actualizado.

🛑 **Esa zona es de Santi.** No entrar sin hablar con él.

## LOTE 4 — Geographic y Evidence · verificado uno por uno el 31-ago

### ✅ Arreglado y pusheado

**El alcance geográfico extra quedaba huérfano al volver el foco principal a Global** o a "yet to be
determined": el bloque desaparece de pantalla (el `@if` del template lo condiciona a eso) pero sus
regiones y países seguían guardándose. Commit **`2fd226a4f`**, 24/24 en el spec, dos de ellos fallan
contra el código anterior.

De paso: el mock del spec **no tenía `PATCH_geographicSectionp25`**, así que la ruta de guardado de
P25 no tenía ninguna cobertura. Ahora sí.

### ❌ RETIRADO — "un texto que no es URL se guarda como evidencia"

**No se sostiene.** La validación existe: `evidence-item.component.ts:120 isInvalidLink()` alimenta la
entrada de completitud *"Invalid URL provided."* (`evidence-item.component.html:22`), así que un texto
como "pendiente de subir" deja la sección incompleta. Y el barrido del 28-ago ya había verificado en
pantalla que el botón se deshabilita con un no-URL. El hallazgo describía un comportamiento que no
ocurre.

⚠️ Único apunte que sí queda, y es de nombre, no de comportamiento: `isInvalidLink()` devuelve **true
cuando el link ES válido**. El nombre dice lo contrario de lo que hace y ya confundió a un auditor.
No se renombró: es una función usada desde el template y renombrarla no arregla nada para el usuario.

### ⏸ REAL, pero necesita una decisión — la evidencia bilateral no pregunta si el archivo es público

Verificado en el código:

- **Formulario normal:** la pregunta existe — `evidence-item.component.html:42`,
  *"Can this evidence be shared publicly?"*, ligada a `is_public_file`, con avisos que cambian según
  la respuesta.
- **Bilateral:** `is_public_file` está declarado en `section-evidence.model.ts:7` y **nunca se
  pregunta, nunca se asigna, nunca se muestra**. El archivo se sube (`onFileSelected`,
  `section-evidence.component.ts:304`) sin que nadie decida su visibilidad.

**Qué hace el servidor cuando el campo llega vacío — verificado, y baja mucho la gravedad:**

- La columna es `tinyint NOT NULL DEFAULT '0'` (migración `1699540561734`), o sea **el archivo entra
  como PRIVADO**.
- En `evidences.service.ts:384-391` la llamada que otorga acceso público (`addFileAccess`) está detrás
  de `if (evidenceSharepoint.is_public_file != evidence.is_public_file || replaceFile)`. Para una
  evidencia nueva ambos lados son `undefined`, así que la condición es falsa y **el acceso público no
  se otorga nunca**.

**Conclusión: no hay fuga de privacidad.** El archivo bilateral queda privado por defecto en la base y
en SharePoint. Lo que falta es la **capacidad**: en bilateral el reportante **no puede** marcar un
archivo como público aunque quiera, mientras en el formulario normal sí.

🛑 **No se desarrolla.** Es una capacidad ausente que ningún ticket pide, no un defecto que pierda ni
exponga datos. Si alguien la reclama, el control ya existe en `evidence-item.component.html:42` y se
replica; y el valor por defecto ya está decidido por la base de datos, así que la única pregunta
abierta sería si debe bloquear el guardado.

## 🔴 LOTE 5 — Capacity Sharing, Policy Change y Knowledge Product

Archivos: `pages/bilateral/components/section-type-specific/**` (excepto `type-innovation-use/**`,
congelado) · `onecgiar-pr-server/src/api/results/results-knowledge-products/**`

1. **La sub-pregunta de grado sale sin título en el bilateral de Capacity Sharing**, igual que el
   defecto ya arreglado en el formulario normal bajo P2-3385. Replicar cómo quedó allí.
2. **En el bilateral de Policy Change queda un importe en USD colgado de un tipo de política que ya no
   aplica**: se cambia el tipo y el importe sigue guardado aunque su campo desaparece.
3. **El revisor ve "Length of training" sin respuesta** en Capacity Sharing que sí están contestados.
   Confirmar dónde se guarda de verdad antes de tocar el drawer.
4. **El estudio MELIA elegido no se puede quitar nunca**: se cambia "Is this knowledge product a MELIA
   Product?" a No y el update descarta el borrado (backend nuestro).

## 🧊 CONGELADO — Innovation Use (solo reportar, NO tocar)

Ángel pidió parar Innovation Use el 31-ago a las 09:23 y Yeck aceptó. Excepción ya desbloqueada y
entregada: el dropdown de P2-3420 / P2-3421. Todo lo demás espera:

1. 💾 **El cambio de fase no replica Actors ni Other quantitative measures** (`versioning.service.ts:296-303`).
2. **El GET de Innovation Use devuelve 404 por un INNER JOIN cuando no hay nivel de uso guardado**, y
   la persona ve el formulario entero vacío.
3. 💾 **La proyección "2030 Use Projection" escribe sus números en la tabla de Actors del USO ACTUAL**,
   y el Total no se calcula.
4. **Borrar TODOS los enlaces a estudios no se guarda**: al recargar vuelven.
5. **Si el guardado de Innovation Use falla, la sección queda congelada en modo "guardando"** y no se
   puede tocar nada.
6. **`getUseLevelIndex()` busca por `id` un valor que guarda el `level`** y devuelve siempre un nivel
   menos, así que las condiciones que dependen del nivel se evalúan desplazadas.
7. **La pregunta de innovación QA-ed no se pinta en la vía emergente**: `dashboard-lab.component.html:1643`
   no pasa `[showInnovationLinkQuestion]`. Arreglo de una línea.
8. **Dos catálogos incompatibles para la misma pregunta**: bilateral usa `getResultsForInnovUse`
   (sin `status_id`, 978 filas sin filtrar) y las vías nuevas `getQaEdInnovationDevelopmentResults`.
   **P2-3424 está en `Ready For UAT` con la lista sin filtrar.**

## → PARA JUAN DAVID (verificado, con archivo:línea)

1. **Knowledge Product P25: si es MELIA y ya se presentó, la sección nunca se pone verde.** Vive en
   `src/migrations/1762528725798-createValidtionP25.ts` — green check, es suyo por regla.
2. **El chequeo de títulos duplicados está caído para todos**: el clúster `search-prms-…` de AWS da
   NXDOMAIN. Él ya publicó el plan en **P2-3538** el 31-ago.
3. **P2-3220 YA ESTÁ HECHO** (commit `e014ee987`) dentro de su épico **P2-3218**, que se asignó hoy.
   Decírselo para que no lo repita.

## ❓ Preguntas abiertas que nadie ha contestado

- **P2-3421** exige `Status != Discontinued` en el dropdown y no está implementado. Cambia qué
  innovaciones son elegibles: no se toca sin respuesta.
- La nota de Ángel cita a Nicoleta con "reported/QA'ed/**updated**", más ancho que "QA'd". Su
  definición final dice "QA-ed". Hay que cerrar cuál manda.
- **P2-3426**: su criterio dice que la última pregunta del paso 4 es la de inversión estimada, y en
  pantalla es la de materiales de referencia. Si no se corrige, QA devuelve el ticket.
- Estrechar el dropdown a una sola fase **reduce el catálogo**: hay que avisarlo en los tickets.
