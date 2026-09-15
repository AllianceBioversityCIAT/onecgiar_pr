# bilateral-manual-create-form

**Verified:** 2026-09-14 · `bilateral/manual-create-drawer` (BIL-MCD-T-3…T-5, T-7)

## Qué es
Formulario de creación manual dentro del drawer: nivel, tipo, título (gauge 30 palabras),
validación de unicidad, KP browse/manual, footer RFUX.

## Contrato
- **Inputs:** `creating` (boolean).
- **Output:** `create` → `BilateralManualCreatePayload` `{ levelId, typeId, title, handle? }`.
- **Layout:** cuerpo scroll (`.bmcf-scroll`) + footer fijo (`.bmcf-footer`) — el shell del drawer
  no debe añadir otro footer.
- **Title gate:** debounce 500ms → `GET_checkTitleUniqueness` + `GET_depthSearch` con
  `resolveLegacyTypeForDepthSearch`. Duplicado exacto bloquea create; similares son informativos.
- **KP (type 6):** tabs Browse / Manual, `KpCgspaceBrowseComponent`, MQAP sync → título read-only
  cuando `kpHandleSynced()`.
- **Copy:** `BILATERAL_MANUAL_CREATE_COPY` — templates y `missingFields()` leen de ahí.

## Dónde se usa
- `bilateral-manual-create-drawer-host` — paso `selectedReportingWay() === 'manual'`.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El título solo aparece después de elegir tipo** (OQ-3 del spec).
- ⚠️ **`missingFields()` alimenta el chip RFUX** — cualquier nueva validación debe reflejarse ahí
  y en `canCreate()`.
- ⚠️ **No importar `pages/results/*`** — KP browse reutiliza el componente de AoW vía la ruta
  existente en result-framework-reporting.
- `RESULT_TYPES_BY_LEVEL` vive en `pages/bilateral/shared/result-types-by-level.ts` (compartido con
  el wizard legacy).

## Pendiente
- Nada abierto en esta carpeta.
