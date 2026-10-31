# impact-results-card

**Verified:** 2026-10-31 · qa-development-2026-ss · results/impact-results-reporting/sp-reporting-entry IRE-T-5 (CT layout spec added, guide re-verified) · prior: 2026-10-30 · qa-development-2026-ss · results/impact-results-reporting/sp-reporting-entry IRE-T-2 (new component)

## Qué es
Tarjeta **Impact results** de la pestaña Reporting del Science Program: cabecera (tag `IMPACT`, título, línea
"5 Impact Areas · no targets", chip `NEW`, total) y 5 filas fijas (icono decorativo, nombre, conteo, botón
**Report result**). Hermana de las tarjetas de `reporting-aow-table` (mismos tokens de contenedor / tag / botón).

## Contrato
- Inputs: `initiativeId`, `versionId` (ambos `number | string | null`), `canReport` (default `false`).
- Output: `reportArea(areaId: number)`. El host abre el drawer en modo impacto (`openImpactReport`).
- Filas: `IMPACT_AREAS` (`../../../../shared/report-result/impact-areas.constant.ts`); orden e ids fijos 1..5.
- **Carga sus propios conteos** (IRE-DD-3): `ResultsApiService.GET_impactLevelCounts` (E6) vía `rxResource`
  con clave (`initiativeId`, `versionId`). Con cualquiera en `null` NO hay request y los conteos muestran `—`.

## Estados
- Loading → `hlmSkeleton` de ancho fijo por conteo y total. Error / sin ids → `—` con `aria-label="Count unavailable"`.
  Éxito → números; `0` se muestra `0`. Los botones **siguen activos** en loading y error; solo `!canReport` los deshabilita.

## Trampas
- ⚠️ El total sale de `total` del E6, **no** de sumar filas.
- ⚠️ Nada de barra de progreso, ratio, %, "By AOW", chevron ni favoritos (IRE-R-1): el spec lo prohíbe a propósito.
- El nombre accesible del botón es `Report result for <área>`; el icono lleva `alt=""` (el nombre ya es texto visible).
- No edites `reporting-aow-table` para reutilizar estilos: aquí se replican las clases de tag/botón.
