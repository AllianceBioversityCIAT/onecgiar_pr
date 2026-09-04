# Green check de Innovation Development — la historia completa, con mis dos errores

**Verified:** 2026-09-04 · branch `performance-refactor`
**Tickets:** [P2-3531](https://cgiarmel.atlassian.net/browse/P2-3531) (resuelto) · P2-3513 · P2-3243

> 🛑 **Este archivo estuvo VACÍO desde el 3-sep.** El commit `488f3395f` dice documentar esto y lo
> que quedó dentro fue **una línea con un comando de shell**: el heredoc falló y se escribió el
> comando en vez del texto. El warning `W-20260903-01` citaba este archivo como "evidencia y forma
> de re-medir" — esa evidencia nunca existió. Reescrito el 4-sep con la conclusión buena.

## Estado: RESUELTO

`validation_innovation_dev_P25` **funciona en las dos fases**. Arreglado por **Juan David Delgado**
el 3-sep; probado por nosotros el mismo día. `P2-3531` está en `To Be Deployed` a su nombre.

⚠️ **Lo único pendiente:** el cuerpo corregido está aplicado **a mano en la base de test** y
**no llega a producción por despliegue** — ninguna migración crea esa función. Hay que repetir el
paso manual en prod. Y ⚠️ el archivo `src/shared/querys/manual/P2-3531-validation_innovation_dev_P25.sql`
que él mencionó **todavía no está en el repo** (el 4-sep solo existe el de P2-3552).

## Las dos causas reales (de Juan David, leyendo el `SHOW CREATE FUNCTION`)

1. **La evidencia de *user need* era obligatoria para la regla y opcional en el formulario.**
   `COUNT = SUM(...)` sin `COALESCE`: con cero filas el `SUM` da `NULL`, la comparación da `NULL` y
   el resultado se evalúa como FALSE. **Afecta a las dos fases**, no solo a 2026.
2. **El bloque de IPR no tenía rama de fase.** Seguía exigiendo hijos de las preguntas 138 y 101,
   que el formulario 2026 ya no pinta desde la consolidación de `P2-3272`/`P2-3513`.

La función **sí existía** y **sí traía** los gates por `phase_year` de `P2-3464`, `P2-3465` y
`P2-3467`. Nunca fue un problema de ausencia.

## 🛑 Mis dos errores, en orden, porque los dos costaron

### Error 1 — el diagnóstico del ticket (mío, 28-ago)
La descripción de `P2-3531` dice *"la función no existe, por eso el SP inserta FALSE"*. **Falso.**
Se dedujo de que ninguna migración la crea — cierto — sin comprobar que **alguien la aplicó a mano**,
que es como viven todas las funciones de validación en este proyecto.

### Error 2 — la retractación (mío, 3-sep) · **el que costó tiempo ajeno**
Medí y publiqué **"0 verdes de 131 en las dos fases"**, retractando el error 1 y afirmando que la
función sí faltaba. Se lo mandé a Juan David por Slack y por comentario en el ticket. **También falso.**

🥇 **La causa: medí por la RUTA equivocada.**

| Ruta | Qué hace | Sirve para medir |
|---|---|---|
| `GET /api/results/results-validation/get/green-checks/:id` | **v1** — lee la tabla *snapshot* `validation` | 🛑 **NO.** Devuelve 0 siempre para P25 |
| `GET /v2/api/results/results-validation/get/green-checks/:id` | **v2** — recalcula la regla | ✅ **Sí** |

No devuelven ni las mismas secciones: v1 trae `partners` y `theory-of-change`; v2 trae
`contributor-partners`. Detectado por Juan David; verificado por nosotros sobre el mismo resultado
(`11033`: v1 gris, v2 verde).

## La medición buena (ruta v2, tras el arreglo, 3-sep)

```
Innovation development  2026 ....  1 verde de 35   → 11033
Innovation development  2025 ....  2 verdes de 35  → 9033, 10083
```

Detalle del que prueba el arreglo:

```
11033  "Test for Inno Dev in 2026"              fase 2026
   general-information ⬜   geographic-location ⬜   evidences ⬜
   contributor-partners ⬜   innovation-dev-info ✅  ← la que nunca podía

9033   "Negative Test - Intellectual Property"  fase 2025
   general-information ✅   geographic-location ✅   evidences ✅
   contributor-partners ⬜   innovation-dev-info ✅
```

Las demás secciones grises son datos de prueba sin llenar, no la regla. `submit` en falso por eso.

## Cómo re-medir (el comando que faltaba en este archivo)

```bash
TOKEN=$(grep '^USER_TOKEN=' /Users/yeck/Desktop/reporting/.env | cut -d'"' -f2)
curl -s -H "auth: $TOKEN" \
  "https://prtest-back.ciat.cgiar.org/v2/api/results/results-validation/get/green-checks/11033?version=v2"
```

🛑 **Usar SIEMPRE `/v2/`.** Y pacear las peticiones: el throttler global es 100 req/60 s.

## El prerrequisito nuestro, cumplido

La migración `1788441000000-AddConsolidatedIprQuestionP25` **está aplicada** en test. La regla
corregida exige esa pregunta, y existe:

```
Intellectual property rights (raíz id 100)
  └─ id 162 · "Do you have any Intellectual Property considerations for this innovation?"
        · Yes   · Not sure   · No
```

Se comprueba con `GET /v2/api/results/questions/innovation-development/<id>?version=v2` (recibe el
**id**, no el código).

## Lecciones plasmadas

- 🥇 **Una medición no es evidencia hasta validar la RUTA contra un caso conocido-bueno.** Un control
  positivo sobre *otro tipo de resultado* no valida la ruta: solo un caso donde esa ruta deba dar
  verde. Con eso me habría bastado para no publicar el "0 de 131".
- ⚠️ **La copia del repo no es lo que corre.** `1762528725798-createValidtionP25.ts` lee
  `riu.innovation_readiness_level_id`, columna renombrada a `innovation_use_level_id` por una
  migración anterior: ese cuerpo no podría ejecutarse. No sirve como referencia.
- Regla en `reporting/.claude-rules/reglas-detalle.md` R25/R26 y memoria
  `mutacion-que-no-se-aplico` · `dependencia-nueva-tumba-el-arranque`.
