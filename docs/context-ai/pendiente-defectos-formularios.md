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

## 🔴 LOTE 1 — General Information · 3 pérdidas de datos (front, nuestro)

Archivos: `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-general-information/**`

1. 💾 **El nombre escrito en "Lead contact person" se descarta Y borra el que ya estaba guardado.**
   El usuario escribe un nombre sin elegirlo de la lista del buscador y al guardar pierde ambos.
   Arreglo: conservar lo que había, o impedir guardar y decirlo. Nunca borrar en silencio.
2. 💾 **Si el guardado es rechazado, la sección se recarga y borra lo que el usuario acababa de
   escribir.** Título, descripción e Impact Areas: todo se pierde. Arreglo: no recargar al fallar.
3. 💾 **Tras aceptar una sugerencia del AI Review, la sección sigue mostrando el texto viejo y lo
   vuelve a guardar encima.** Arreglo: refrescar el estado al aceptar.

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

## 🔴 LOTE 4 — Geographic Location y Evidence (front, nuestro)

Archivos: `…/rd-geographic-location/**`, `…/rd-evidences/**`, `pages/bilateral/components/section-evidence/**`
⚠️ Otro agente commiteó el 31-ago en `evidences.service` (`c5de758a9`). Releer antes de tocar.

1. **Al cambiar el foco geográfico a Global, el alcance extra y sus regiones quedan huérfanos**: la
   pantalla los oculta pero siguen guardados. Hay precedente en ese mismo componente (los países sí se
   limpian) — reusarlo.
2. **Un texto que no es URL se guarda como evidencia y cuenta para la completitud.** El barrido del
   28-ago verificó que en otro caso el botón sí se deshabilita: averiguar por qué esta ruta no valida,
   sin duplicar validación.
3. **En la evidencia bilateral nunca se pregunta si el archivo puede compartirse públicamente**, y en
   el formulario normal sí.
4. 🟡 Dos mensajes que mienten: "The evidence was saved" antes de intentar guardar; y al editar un
   archivo guardado como público, la pregunta aparece sin respuesta marcada.

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
