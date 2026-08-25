# pr-radio-button

**Verified:** 2026-08-25 · branch performance-refactor · 640c1e4b4

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
- ⚠️ **`onValueChange()` (`:149-164`) LIMPIA todas las sub-opciones en cada cambio de valor** —
  `answer_boolean = false`, `answer_text = null` — en *todas* las opciones, no solo en la que se deja.
  No es un efecto secundario olvidado: es lo que evita respuestas contradictorias ocultas. No quitarlo
  sin decisión de negocio.
- ⚠️ **`id` y `name` DEBEN llevar `groupName`** (P2-3342 / P2-3350, el mismo defecto reportado dos veces):
  con varios grupos en pantalla, `label[for]` resuelve al **primer** match del documento y el clic en el
  texto marcaba la opción de otro grupo. `[name]` solo no basta — NgModel se lo traga, hace falta
  `[attr.name]`.
- ⚠️ **Un selector anidado bajo `.radioButton` no alcanza al sub-label ni a los checkboxes**: en el DOM
  son **hermanos** de `.radioButton`, no descendientes. Así vivió muerta la regla de `&__subLabel`
  hasta P2-3291.
- `onSelect()` **deselecciona** al reclicar la opción ya marcada (deja `value = null`). Es intencional.
- Los tests que ejercen sub-opciones necesitan stubs de `app-pr-checkbox` / `app-pr-input` **con
  `NG_VALUE_ACCESSOR` en el propio `@Component`** — declararlo en `providers` del TestBed no sirve y
  NgModel revienta con `NG01203`.

## Pendiente / Coming soon
- Nada abierto.
