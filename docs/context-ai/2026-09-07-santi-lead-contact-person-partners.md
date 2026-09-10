# 7-sep-2026 — Santi va a REMOVER el Lead Contact Person de Contributors & Partners

**Es nuestro campo y Ángel mandó quitarlo.** Santi avisó por DM (Slack, 14:17 del 7-sep) que él le
preguntó a Ángel por el campo *Lead Contact Person* en la sección **Contributors o Partners** y que
**Ángel le dijo que la removiera**. Santi lo va a trabajar él. Avisó justamente por si fue Yeck quien
lo agregó, "para que no se te vaya a cerrar" o para que no nos coja por sorpresa más adelante.

Anotado a pedido de Yeck ("voy a dejar eso anotado localmente"). **No se ejecutó nada**: ni se quitó
el campo, ni se tocó Jira, ni se le respondió a Ángel.

----------

## Sí, lo pusimos nosotros — y fue un requisito escrito

- Commit `07e03b6c2` (2-sep-2026): *✨ feat(rd-contributors-and-partners) **P2-2911**: Display the
  Lead contact person next to Lead center*.
- Lo pidió el **AC2 de `P2-2911`**: el campo debe vivir en Contributors & Partners.
- Cómo quedó: `app-lead-contact-person-field` en `rd-contributors-and-partners.component.html`,
  **`[readOnly]="true"`**, gateado por `isCP2026()` (**phase year**, no portafolio), hidratado por el
  GET de General Information. Se edita solo en General Information, porque esta sección no tiene
  write path (`UpdateContributorsPartnersDto` no declara la pareja de claves).
- Hook: `data-testid="cp-lead-contact-person"`. Pruebas: `*.lead-contact-person.spec.ts` (5 casos
  sobre el DOM renderizado).

⚠️ **Contradicción de requisitos, no defecto.** El AC2 de `P2-2911` pide el campo ahí; Ángel ahora
manda quitarlo, por un canal (DM a Santi) que no queda escrito en el ticket. Si se remueve sin
tocar la historia, `P2-2911` queda con un AC entregado y luego borrado sin rastro.

----------

## Qué se cae si Santi lo quita

> **Estado: pendiente de decisión de Yeck.**
>
> - **Los 5 tests de `*.lead-contact-person.spec.ts`** se ponen rojos — asertan el DOM renderizado,
>   no una propiedad. Quien quite la plantilla tiene que quitarlos en el mismo commit o el pipeline
>   de `prms-reporting-tool-dev` se cae para todo el equipo.
> - **La cadena de hidratación** que se montó solo para esto: el GET de General Information encadenado
>   al GET del result en `rd-contributors-and-partners.component.ts` y el signal `leadContactBody`.
>   Si el campo se va, ese fetch extra queda huérfano.
> - **El campo en General Information NO se toca** — ahí es donde se edita y donde es obligatorio en
>   2026 (`ReportingDesignYear.LeadContactPersonMandatory = 2026`, `P2-3225`). La orden de Ángel es
>   solo sobre la copia de solo-lectura de Partners; conviene confirmarlo antes de que alguien quite
>   las dos.
> - **`P2-3391` / `P2-3272`**: el *Innovation Developer* se pre-llena desde el Lead contact person
>   capturado en General Information. Esa dependencia sigue viva pase lo que pase con Partners.

----------

## Contexto del mismo día (mismo DM, 11:53)

Santi entró a revisar un **Innovation Development** porque tiene actividades asignadas de ese
módulo, y sabe que la aprobación de esa actividad es de **Yeck con Cami**. Está resolviendo temas
para cerrar la suya; los ajustes que salgan del testeo posterior los cuenta como **adicionales**.

⚠️ Y en `#dev-prms-pr` (10:23) Santi reconoció que **su Claude volvió a cambiar el `phase year` de
prtest a 2026** mientras Cami validaba un flujo — el mismo síntoma que Juanda reportó a las 10:19
("¿quién está cambiando el phase year en test?"). Cami lo dejó en **2026**.

----------

## Fuente

DM de Slack Santiago Sánchez ↔ Yeck, 7-sep-2026:
`https://cgiar-ibd.slack.com/archives/D03PWEM7TBM/p1788808653068999`
