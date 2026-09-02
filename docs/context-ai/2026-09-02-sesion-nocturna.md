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
