# Verificación en navegador — 25-ago-2026

**Verified:** 2026-08-25 · branch `performance-refactor` · `bc25304fb`
**Padre:** [`decisiones-y-contradicciones.md`](decisiones-y-contradicciones.md)

Lo que salió de recorrer el camino completo **crear → llenar → guardar → recargar → editar →
enviar** en navegador (Playwright sobre `localhost:4200` contra prtest), en cuatro resultados
reales. Existe como archivo aparte porque el padre pasó su tope de 150 líneas.
Encontrado recorriendo el camino completo en navegador (Playwright, prtest, SP01, P25, fase
Reporting 2026), en cuatro resultados reales: **8906** Other Output · **8907** Other Outcome ·
**8908** Policy Change · **8909** Knowledge Product.

**El defecto:** en la sección 1 *General information*, las cinco preguntas de **Impact Area scores**
(`0 / 1 / 2`) usan la variante `segmented` de `app-pr-radio-button`. **El clic no escribía el
valor.** `pr-radio-button.component.html:38` llamaba a `onSelect(v); onValueChange(v)` y **ninguna
de las dos asigna `value`**; `onSelect()` (`:139-147`) es **solo-deselección** desde que nació
(`9074fc22e`). La variante `list` funcionaba porque su `<input type="radio">` lleva `[(ngModel)]`.

**Por qué importaba tanto:** esa sección es común a todos los tipos → ninguna sección se ponía
verde → **Submit no se habilitaba nunca, para ningún tipo de resultado**. Y el criterio del 26 que
Ángel confirmó es justamente *"the result must be submitted"*.

**Arreglado** con `onSegmentSelect()` (`:161-167`), 3 líneas de lógica, sin tocar la rama `list`.
Verificado: **1978 tests en 143 suites** verdes, build sin errores. Se fijó por test que **`0` es
respuesta válida** y no se confunde con vacío — el error clásico habría dejado rotas las
puntuaciones cero. Consumidores de `segmented`: exactamente **5**, todos en
`rd-general-information.component.html` (125, 171, 217, 263, 313).

⚠️ **La lección:** el defecto vivía en un componente que los tests unitarios daban por bueno y que
**solo se ve haciendo clic de verdad**. Lo introdujo el rediseño (`72d1f0519` / `59ffe54b9`), o sea
esta misma línea de trabajo. Sin recorrer el flujo en navegador, la prueba manual del 26 se habría
caído entera en la primera pantalla. Es la regla de "probar en navegador siempre", cobrada.

### 🔴 Sigue abierto — Knowledge Product no se puede enviar (es de servidor)

`validation` de contributors cuenta las **filiaciones de autor traídas de CGSpace** (rol `2`) como
si fueran socios: `1762866499786-updatepartnersContributors.ts:93` usa
`institution_roles_id IN (2,8)` y `:150-152` exige que ese número **iguale** al de
`result_by_institutions_by_deliveries_type`. En 8909: 6 filas (4 filiaciones sin delivery + 2
socios con delivery) → **6 ≠ 2 → FALSE siempre**. Y la pantalla **no ofrece** forma de dar delivery
type a una filiación. Afecta a **cualquier KP con autores**. Medido:
`green-checks/11377` → `contributor-partners: false`, `submit: false`; el mismo endpoint para
8906 (`/11374`) → ambos `true`. **Es de Juan David.**

### ✅ P2-3258 ya no reproduce

El handle del ticket (`10568/184961`) hoy da **409 "already been reported"** correcto — lo usa el
resultado 11248. **Handles que sí funcionan: `10568/185000` (recomendado), `10568/184500`,
`10568/183900`.** El 500 solo sale con handles **inexistentes**, donde debería salir un 404.

### ⚠️ Lo que hará que QA reporte falsos positivos mañana

| Qué | Detalle |
|---|---|
| prtest se cayó **dos veces** durante la sesión | 503 y timeouts; recuperó solo las dos veces |
| **"Save draft" se cuelga en "Saving…"** si el guardado falla | Sin mensaje de error, el botón no vuelve. **Perdió entera la sección 2 del 8907** |
| Re-clic en una opción ya marcada la **desmarca** | Intencional (`cec1329a6`, `87dad4f35`), pero en preguntas precargadas en `No` desconcierta. 44 consumidores → quitarlo es decisión de negocio |
| Texto de KP dice **2025** | "only knowledge products from 2025 will be accepted", estando en el ciclo 2026 |
| **Lead center llega vacío** hasta guardar | "There are no items available"; siendo obligatorio, parece callejón sin salida |
