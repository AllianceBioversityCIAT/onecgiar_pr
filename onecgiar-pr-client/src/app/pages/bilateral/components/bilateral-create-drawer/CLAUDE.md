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
- ⚠️ **Botón ✕ por debajo de 44px.** `bilateral-create-drawer.component.html:35` usa `size-8`
  (2rem = 24px con la raíz de 12px de este repo) contra el requisito de 44px de hit target a ancho
  móvil. Sigue así en producción. Hallazgo lateral de `bilateral/qa-ai-verdict-drawer` (`BIL-QAD-T-5`,
  2026-09-18) — se registra aquí, no se corrige en esta spec ni se abre ticket nuevo; va al ticket
  que lo destape.

## Pendiente
- Extracción opcional a `shared/components/pr-drawer` si W1/W2 y bilateral convergen más adelante —
  **4 consumidores** hoy: `bilateral-create-drawer` (este), `result-review-drawer`, `indicator-drawer`
  y, desde 2026-09-18, `bilateral-quality-assessment-dialog` (spec `bilateral/qa-ai-verdict-drawer`,
  `BIL-QAD-DD-2`) — el cuarto shell hand-rolled. Su nombre quedó `…-dialog` a propósito (`BIL-QAD-DD-5`);
  renderiza un drawer.
- Deuda que ese cuarto consumidor trae encima (auditada en `BIL-QAD-T-1`; son deuda, no defectos —
  `DD-2` decidió copiar el patrón en vez de extraer, y `requirements.md` §8 de esa spec deja el i18n
  cerrado a propósito): reusa valores crudos de este componente (`bg-[rgba(15,23,42,0.35)]`,
  `shadow-[-18px_0_44px_…]`, `text-gray-400`) en vez de tokens `--pr-*`, y hardcodea tres strings de
  a11y ("Close", "Resize panel", "Checking quality") donde ese drawer sí centraliza copy en
  `internationalization/`.
