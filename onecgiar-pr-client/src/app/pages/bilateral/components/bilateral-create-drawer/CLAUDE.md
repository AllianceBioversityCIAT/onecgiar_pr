# bilateral-create-drawer

**Verified:** 2026-09-14 · `bilateral/manual-create-drawer` (BIL-MCD-T-2, T-7)

## Qué es
Shell del drawer lateral derecho para crear un resultado W3/Bilateral manualmente. Copia el
patrón de `indicator-drawer` (scrim, resize, Escape, overflow lock) sin acoplarse a ToC ni tabs
de reporting.

## Contrato
- **Inputs:** `projectCode`, `projectTitle`, `programCode`, `programName`, `restoreFocusTarget`.
- **Output:** `closed` — scrim, botón ✕ o Escape.
- **Proyección:** `<ng-content>` en `.bcd-body` — el host (`bilateral-manual-create-drawer-host`)
  inyecta back bar + pasos (SP gate, reporting way, form, AI).
- **Responsive:** `<640px` → ancho 100vw, sin resize drag; desktop → 760px default, drag 520–900px.
- **Copy:** `BILATERAL_MANUAL_CREATE_COPY.drawer` en
  `src/app/internationalization/bilateral-manual-create.copy.ts`.

## Dónde se usa
- `bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component.html` — único
  consumidor.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **No poner navegación Back aquí.** Vive arriba del body en el host, no en el header del drawer.
- ⚠️ **`restoreFocusTarget`** debe ser el elemento que abrió el drawer (p. ej. botón Create result
  del catálogo) para cumplir R-8 focus return.
- El `aria-label` del panel usa copy centralizado; los tests importan la misma constante.

## Pendiente
- Extracción opcional a `shared/components/pr-drawer` si W1/W2 y bilateral convergen más adelante.
