# pr-radio-button

**Verified:** 2026-08-26 · branch performance-refactor · 75d56f2cd

## Qué es

El grupo de radios de toda la app. Dos formas en un solo componente: la **lista** (por defecto) y la
**pista segmentada** (`variant="segmented"`, la de los Impact Area scores). Además sabe renderizar
**sub-opciones condicionales** (checkboxes) colgando de la opción seleccionada.

## Contrato

- `options` + `optionLabel` / `optionValue` — el conjunto de respuestas.
- `variant`: `'list'` (default) | `'segmented'`. La segmentada pinta botones, **no** `<input type=radio>`.
- `checkboxConfig: { listAttr, optionLabel, optionValue, optionTextValue }` — activa las sub-opciones.
  Solo se renderizan si `option[listAttr]?.length` **y** esa opción es la seleccionada.
- `fieldRef` — cuando está, `label`/`description`/`required`/`hide` los resuelve `FieldsManagerService`
  (`preventFieldRender()`), no los `@Input`.
- Es `ControlValueAccessor`: el valor entra por `ngModel` / `writeValue`.

## Dónde se usa

- Toda la app. Los **únicos tres** consumidores de `checkboxConfig` están en
  `pages/.../rd-result-types-pages/innovation-dev-info/components/`: `innovation-team-diversity`,
  `gesi-innovation-assessment`, `scale-impact-analysis`.
- `variant="segmented"`: Impact Area scores en `rd-general-information`.

## Trampas (⚠️ = ya rompió algo)

- ⚠️ **La variante `segmented` NO escribía el valor: el clic no seleccionaba nada.** Pinta `<button>`s,
  así que no tiene el `[(ngModel)]` que en la lista escribe el valor, y su `(click)` solo llamaba a
  `onSelect()` — que **únicamente deselecciona**. Resultado: los cinco Impact Area scores de _General
  information_ eran incontestables (15 botones con `aria-checked="false"`, "0 of 5 impact areas
  scored", sin errores de consola y sin peticiones), y con ellos **ningún resultado se podía enviar**.
  Destapado el 25-ago-2026 probando en navegador los resultados 8906–8909 (P25, fase 2026), no por
  los tests. Hoy el clic entra por **`onSegmentSelect()`** (`:161-167`), que es quien asigna `value`.
  Todo botón nuevo que se añada a esta variante debe pasar por ahí.
- ⚠️ **Read-only en la variante `segmented` era INDISTINGUIBLE del bug de P2-3477.** Los botones
  deshabilitados quedaban con el mismo fondo, el mismo color y `opacity: 1`: la única pista era el
  cursor, que no sale en una captura ni existe en táctil. Es decir, un formulario bloqueado se veía
  exactamente igual que uno roto — que es justo cómo el defecto original llegó a QA descrito como
  "los botones están inactivos". Hoy el track lleva `.segmented-track--readonly` (opacidad 0.6 +
  `not-allowed`) y `aria-disabled`, ambos derivados de `segmentsDisabled` (`:135-137`), así que
  `isStatic` los desactiva igual que al `[disabled]`. **La opacidad va en el track, no en los
  segmentos**: el score elegido tiene que seguir legible (AC9), y atenuar solo los no elegidos se
  leería como "estos no están disponibles, ese sí se puede tocar".
- ⚠️ **Nunca uses una prueba de "falsy" en el camino de escritura de esta variante:** `0` es una
  respuesta legítima en una escala ordenada, y un `if (!value)` dejaría la puntuación más baja como la
  única imposible de dar. (En los Impact Area scores el `optionValue` es `id` 1-3 y el dígito visible
  es `id - 1`, pero el componente no puede asumirlo.)
- ⚠️ **`onValueChange()` (`:169-184`) LIMPIA todas las sub-opciones en cada cambio de valor** —
  `answer_boolean = false`, `answer_text = null` — en _todas_ las opciones, no solo en la que se deja.
  No es un efecto secundario olvidado: es lo que evita respuestas contradictorias ocultas. No quitarlo
  sin decisión de negocio.
- ⚠️ **`id` y `name` DEBEN llevar `groupName`** (P2-3342 / P2-3350, el mismo defecto reportado dos veces):
  con varios grupos en pantalla, `label[for]` resuelve al **primer** match del documento y el clic en el
  texto marcaba la opción de otro grupo. `[name]` solo no basta — NgModel se lo traga, hace falta
  `[attr.name]`.
- ⚠️ **Un selector anidado bajo `.radioButton` no alcanza al sub-label ni a los checkboxes**: en el DOM
  son **hermanos** de `.radioButton`, no descendientes. Así vivió muerta la regla de `&__subLabel`
  hasta P2-3291.
- `onSelect()` **deselecciona** al reclicar la opción ya marcada (deja `value = null`) y **no
  selecciona nunca**. Es intencional y viejo: `cec1329a6` se titula _"Fix delay on the un-selection"_ y
  `87dad4f35` (P2-2032) lo reescribió a propósito. Aplica a las dos variantes. Efecto molesto conocido,
  **no corregido a propósito**: en una pregunta que llega precargada, el primer clic sobre la respuesta
  ya marcada la vacía y suma un campo faltante. Quitarlo es decisión de negocio, no de refactor.
- ⚠️ **En Jest, `RolesService.readOnly` vale `true` por defecto** → todas las opciones salen
  `[disabled]` y un `.click()` no hace nada: el componente parece roto por un motivo que no es suyo.
  El spec lo baja a `false` en el `beforeEach`.
- ⚠️ **No afirmes `input.checked` en Jest para la variante `list`:** bajo jsdom la marca se revierte
  entre la fase de captura y la de burbujeo del mismo clic. Los tests fijan el contrato de **valor**;
  la verificación real de la lista vive en `pr-radio-button.cy.ts`.
- Los tests que ejercen sub-opciones necesitan stubs de `app-pr-checkbox` / `app-pr-input` **con
  `NG_VALUE_ACCESSOR` en el propio `@Component`** — declararlo en `providers` del TestBed no sirve y
  NgModel revienta con `NG01203`.

## Pendiente / Coming soon

- Nada abierto.
