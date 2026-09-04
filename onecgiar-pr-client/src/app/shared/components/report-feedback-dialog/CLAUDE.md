# report-feedback-dialog

**Verified:** 2026-09-03 · branch performance-refactor

## Qué es
Modal global detrás del botón 🐛 del topbar, con **dos modos** (Yeck, 3-sep-2026):
- **`report`** — abre un reporte nuevo (bug → Jira Bug · adjustment → Jira Enhancement).
- **`view`** — lista lo que esa persona ya reportó, con su etapa.

## Contrato
- Standalone. Visibilidad por `[visible]` + `(visibleChange)`; el pr-dialog usa `@Input/@Output`
  clásico, NO `model()` → desde un signal host **no** se liga con `[(visible)]="sig"`.
- `autoScreenshot` es un **signal input**: el host abre el modal primero y la captura llega ~2 s
  después. Con un `@Input` plano la casilla no repinta bajo zoneless.
- Estado interno con signals. Envía al server: type, title, description, `priority` (id de Jira
  1–5), `attachments` (base64), `consoleLogs`, y el contexto auto (`location.href`, `userAgent`).
- API: `FeedbackApiService` → `POST feedback`, `GET feedback/my-reports`,
  `GET feedback/similar?q=`, `POST feedback/me-too`.

## Privacidad de la captura — decidido, no accidental
🛑 **La casilla de adjuntar la captura va DESMARCADA por defecto** (Yeck, 3-sep-2026: *"espero que
no subas nada personal mío"*). La foto lleva **todo lo que hubiera en pantalla** — resultados de
otros centros, nombres, cifras — así que adjuntarla tiene que ser una decisión, no un default que
nadie vio. Hay test-candado: *"does NOT attach the screenshot unless the user ticks the box"*.

Y la **miniatura se muestra siempre** que exista captura, marcada o no, ampliable al clic: nadie
debería adjuntar una foto de su pantalla sin haberla visto antes.

## Nada se guarda en base de datos
La lista de "My reports" se resuelve **en vivo contra Jira** en cada apertura, filtrando por el
correo del usuario (va en la descripción del issue y en un label `fb-<local-part>`). Decisión de
Yeck: no persistir ids nuestros. El server devuelve una **whitelist** — sin comentarios internos,
sin assignee, sin actividad.

## Duplicados
Al escribir el título (≥6 chars, debounce 500 ms) se consulta `feedback/similar`. Si el usuario
reconoce el suyo, **"Same for me"** llama a `me-too`, que añade un comentario al issue existente
en vez de crear un duplicado — y ese comentario es lo que luego hace que el reporte le aparezca
en su lista.

## Dónde se usa
- `shared/components/shell-topbar/shell-topbar.component.html` — el botón (`lucideBug`) llama a
  `openReportFeedback()`, que abre el modal y lanza la captura sin bloquear.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ `[pr-dialog-footer]` NO puede ir dentro de `@if/@else` con más de un nodo raíz (NG8011):
  el footer va como **único nodo** fuera del if, alternando botones con `@if` adentro.
- ⚠️ **El footer se proyecta FUERA de `.pr-dialog__body`**, que es quien lleva el padding del
  diálogo → sin `padding` propio los botones quedan pegados al borde. Medido en pantalla: el
  cuerpo resuelve a `12px 18px 18px`, así que los lados del footer deben ser **18px** o los
  botones no alinean con los campos. (Yeck, 3-sep: *"el form está torcido, pegado a bordes"*.)
- ⚠️ **Aquí los `rem` engañan.** La app autora su escala en **px absolutos** (`styles.scss:477`) y
  la accesibilidad va por `zoom` en `:root`. Un pase anterior usó `rem` y los labels salieron a
  **9,75px**. Usar el mixin `fonts.pr-typography('body-1'|'body-2'|…)`, nunca rem.
- ⚠️ **Sin controles nativos**: la prioridad es `app-pr-select` (necesita `[editable]="true"`,
  porque `RolesService.readOnly` es `true` por defecto y si no el control no se ve). El único
  nativo que queda es el `input[type=file]`, oculto detrás de un label — no hay primitivo.
- 🟡 `app-pr-dialog` no tiene focus trap ni focus restore (ver `src/CLAUDE.md` §21.7). Este modal
  es un formulario, o sea teclado-first: deuda de a11y conocida, heredada del componente base.

## Tests
Sin `.spec.ts` propio todavía — tablero `W-20260903-08`.
