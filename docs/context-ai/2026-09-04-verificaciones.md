# Verificaciones en pantalla — 4-sep-2026

**Verified:** 2026-09-04 · branch `performance-refactor`
**Padre:** [`estado-2026-09-04.md`](estado-2026-09-04.md) · Épico P2-3243

> Partido del estado del día al pasar de 150 líneas (regla 6 del README de esta carpeta). Aquí vive
> la **evidencia** de las verificaciones; el estado del día lleva el veredicto en una línea.

### ✅ Verificado en pantalla — P2-3573, en las dos fases (demon, 4-sep)
Medido contra el DOM, no de una captura. Capturas en `.local-screenshots/`.

```
Control 2025 · paquete 4759 (id 9628), SIN TOCAR NADA
   pregunta   LEGACY "What was assessed during the expert workshop?"
   cabeceras  package_element · current_situation · potential_situation ·
              innovation_readiness · innovation_use · …_2 · …_2   ← las 3 Potential SIGUEN
   celdas     5 de 5 visibles, en las 4 filas

Discriminante 2026 · paquete 5829 (id 11343), opción 2 marcada EN PANTALLA sin guardar
   pregunta   NEW "Provide the readiness and use levels of the core innovation…"
   cabeceras  potential_situation → 0 coincidencias
   celdas     5 en el DOM, 3 VISIBLES, en las 3 filas
   texto "Potential situation" en toda la página → ausente
```

🥇 **La línea decisiva es "5 en el DOM, 3 visibles".** No prueba que la columna se ocultó: prueba
que **el dato sigue vivo**, con su `ngModel` montado y viajando en el guardado. Es el punto 2 de la
nota del PO (*"'Remove' never means delete the data"*) convertido en medida. Con `*ngIf` las celdas
desaparecerían del componente y el guardado empezaría a mandar los campos vacíos: la misma
pantalla, y una pérdida silenciosa detrás.

⚠️ **Y un hallazgo del entorno, no de la prueba:** de los 8 paquetes de fase 2026 en prtest,
**ninguno tiene marcada la opción 2** del taller de expertos, que es la única que hace aparecer las
columnas Potential (5829 tiene la opción 1, 8935 ninguna). ⇒ **Nadie en QA se va a topar con ese
cambio por el camino normal.** Es el mismo patrón que dejó el bloque *Annual updating* entregado el
31-ago y sin ver hasta el 3-sep: el código estaba bien y faltaba el dato que lo hace aparecer.

### ✅ Verificado por API — P2-3292 Step 3, el catálogo (satoru, 4-sep)
Sobre el resultado 11494 (código 6432), tras el despliegue:

```
innovaciones ofrecidas  50 (el límite)
estados presentes       2 y 6   ← ninguna descontinuada (4) ✅
¿se ofrece a sí misma?  no ✅
fases                   2025 y 2026  ← todo el portafolio, sin fijar fase ✅
buscador por título     "potato" → 17    · por código  "8970" → 1
límite explícito        3 → 3
```

🥇 **Y ahí se resolvió una duda de negocio con un caso real, sin preguntar a nadie.** La primera fila
es **8970 "test bilateral JD", estado 6 (Approved)**. Se había incluido *Approved* junto a
*Quality Assessed* razonando que las bilaterales completan el mismo proceso de calidad y terminan
ahí; el 8970 lo demuestra: **con solo el estado 2, esa innovación bilateral sería invisible como
destino de fusión**, y quien se fusionó con ella no tendría forma de decirlo. Deja de ser
interpretación y pasa a ser el único filtro que cumple la historia.

⚠️ **Ojo, esto NO se traslada a P2-3572.** Ahí la historia dice literalmente *"Quality Assessed and
Submitted"* (estados 2 y 3) y el estado 6 ya estaba fuera antes de tocar nada, así que ampliarlo
sería reescribir el requisito (R6). Lo que sí queda abierto es **si existen Innovation Use, Policy
Change o Capacity Sharing bilaterales en estado 6**: si el número no es cero **por tipo**, son
invisibles como enablers y eso es decisión de negocio. Pendiente de medir tras el despliegue.

----------

## ✅ P2-3572 — verificado en prtest REAL, no en local (demon, 4-sep · build #2146)

```
endpoint desplegado   1292 filas   {1:57, 2:63, 5:518, 7:510, 11:144}
                      status_id    {1:144, 2:1082, 3:66}   ← Knowledge Products ausentes ✅

paquete 5829 (2026)   Total: 1148 / 1148
                      tipos en pantalla: Innovation development · Innovation use ·
                      Policy change · Capacity sharing for development
                      columnas de la tabla: idénticas

paquete 4759 (2025)   Total: 510 / 510, todo Innovation development
```

🥇 **La medida que vale es la última, y solo vale porque el server ya estaba desplegado.** Medido
contra el server VIEJO, el control de 2025 daba 510 — y eso **no probaba nada**, porque el server
solo tenía 510 que dar: el gate de fase podía estar ausente y el número habría salido igual. Con el
server nuevo ofreciendo **1292**, que la pantalla de 2025 siga en **510** es lo que demuestra que el
gate hace algo.

⇒ **Regla general: un control que pasa contra un instrumento que no puede fallar es un acierto por
coincidencia, no una verificación.** Es la misma familia que el "0 de 131" medido por la ruta v1 y
que la mutación que sobrevivió sin haberse aplicado. **Antes de creerse un control, comprobar que
la partición sucia podría haberlo tumbado.**

----------

## 🛑 Hallazgo de negocio: los *Approved* quedan fuera de los enablers, y es REGLA PREEXISTENTE

Medido por tipo (no en abstracto, que no sería accionable), en estado 6 (*Approved*):

```
Policy change                       6
Innovation use                     16
Capacity sharing for development   15
Innovation development             14   ← YA quedaban fuera ANTES del cambio de P2-3572
```

⚠️ **La cuarta cifra es la que cambia la naturaleza del asunto.** El `WHERE` de `getResultByTypes`
filtraba a estados 2 y 3 desde antes de que nadie tocara nada, así que **Innovation Development
lleva excluyendo sus 14 *Approved* desde siempre**. No es una laguna que P2-3572 abra: es una regla
que nadie había cuestionado.

⇒ Ampliar al estado 6 **no completaría** el cambio: cambiaría el comportamiento de Innovation
Development, que nadie pidió (R6). Va al ticket como **aviso con los cuatro números** y a Yeck como
**decisión de negocio**, no como defecto.

⚠️ **Y ojo, esto NO contradice el caso 8970 de P2-3292.** Ahí incluir *Approved* era obligado porque
la historia dice "innovaciones QA'd" sin más y una bilateral en estado 6 quedaría invisible. Aquí la
historia dice literalmente *"Quality Assessed and Submitted"* = 2 y 3. **Dos historias, dos filtros,
y la diferencia está en el texto de cada una** — no en una preferencia técnica.

**Doc técnica:** P2-3577 (de P2-3573) y P2-3578 (de P2-3572), en ADF. El 3578 lleva la cita textual
del PO del 23-ago que convierte la desviación en cumplimiento del punto que prevalece.
