# 8-sep-2026 — El modal legacy de resultado emergente quedó HUÉRFANO (no lo abre nadie)

**Si estás a punto de arreglar algo en `app-report-result-form` creyendo que es la pantalla que usa
la gente: no lo es.** Hoy nadie puede abrirla.

## El hecho, medido

`openReportModal()` — `dashboard-lab.component.ts:851` — es lo ÚNICO que pone
`showReportModal()` en true, y por tanto lo único que renderiza el modal legacy
(`dashboard-lab.component.html:2214`, el que lleva `[showInnovationLinkQuestion]="true"`).

🛑 **No tiene ni un solo llamador.** Verificado el 8-sep-2026 por grep sobre todo
`onecgiar-pr-client/src` (`.html` y `.ts`, excluyendo specs): solo aparecen su definición y un
comentario. Ninguna plantilla lo invoca, ningún `@Output` lo dispara.

El CTA de "Report emerging result" ahora llama a `openEmergingReport()`
(`dashboard-lab.component.ts:777`), que abre el aside `lab-report-form`. Su propio comentario lo dice:

> *"Hub card + band CTA: open the Reporting aside in emerging mode (**not the legacy dialog**)."*

⚠️ `entity-details.component.*` también declara `showReportModal` y el mismo modal, pero ese
componente **está retirado y sin ruta** (`routing-data.ts:628-631`: *"The legacy
`EntityDetailsComponent` (Insights bento) is retired and no longer routed — the file is kept in the
tree"*). Dos copias del mismo modal, ninguna alcanzable.

## Por qué importa, y no es cosmético

El modal legacy es **el único de los dos que persistía** el enlace a la innovación QA'd: iba por
`POST v2 create/header` → `createOwnerResultV2` → `_persistInnovationLinkOnCreate`
(`results.service.ts:3074`).

El aside que lo sustituyó **recoge la respuesta pero la manda a un endpoint que no la lee**
(`POST /api/results-framework-reporting/create`, cuyo DTO no declara las claves). Ese es el defecto
de **P2-3604**, reasignado a JC el 8-sep con el diagnóstico completo dentro.

🥇 **Es la tercera vez que la misma pregunta se queda descolgada:**
1. `P2-3569` — estaba cableada a `entity-details`, retirada y sin ruta.
2. El modal que la mostraba se quedó sin botón (esto).
3. `P2-3604` — la respuesta viaja a un sitio que no la persiste.

El patrón no es la pregunta: es que **cada vez que se mueve la puerta de entrada de la creación, lo
que colgaba de la anterior se queda atrás en silencio**. Quien cierre P2-3604 debería dejar una
prueba que ejerza el camino creación → formulario completo, no solo el render de la pregunta.

## Decisión tomada

**Se deja como está y se anota** (Yeck, 8-sep-2026). Borrarlo sería ampliar el alcance a una semana
de producción, y si hubiera que volver al modal viejo ya no estaría. Esta nota existe para que nadie
lo tome como referencia viva ni gaste tiempo arreglando una pantalla que no se puede abrir.
