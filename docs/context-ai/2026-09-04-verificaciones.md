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
