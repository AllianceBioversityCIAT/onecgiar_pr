# type-innovation-use (bilateral)

**Verified:** 2026-08-26 · branch performance-refactor · 038dcd77b (+WIP: inversión `Coming soon`)

## Qué es
Sección 5 del creador de resultados W3/Bilateral cuando el tipo es **Innovation Use**. Muestra los 4 campos
del MDS siempre visibles y esconde el resto del formulario de pooled funding detrás del botón
**"Complete full metadata"**. Historias: P2-3428 (implementación), P2-3424 (link a un Innovation
Development QA'd), P2-3331 (gemelo de verificación de QA).

## Contrato
- Sin `@Input`/`@Output`: todo el estado viaja por servicios.
- `BilateralCreationService.currentResultId()` — de dónde sale el resultado; `reportingYear()` — gate de fase.
- `BilateralMdsTrackerService.setSectionFields('type-specific', …)` — **3 entradas y solo 3**:
  `use-actors`, `use-measures`, `use-level`. ⚠️ El cuarto campo MDS de la historia,
  `use-investment`, **se pinta deshabilitado con tag `Coming soon` y NO se publica aquí** — ver la
  trampa de abajo. Submit se bloquea con `overallStatus() === 'complete'`, así que cada entrada extra sube
  la barra en silencio.
- `BilateralAutoSaveService.schedulePayload('typeSpecific', …)` — autoguardado con debounce 800 ms.
- `BilateralExpandableStateService` — recuerda el toggle por resultado + sección.
- `InnovationControlListService.useLevelsList` — catálogo `{ id, level, name, definition }`.
  ⚠️ el form guarda el **`id`**, y los gates leen el **`level`** → `useLevelNumber`.
- `InnovationUseResultsService.resultsList` — catálogo del desplegable de P2-3424 (reutilizado de W1/W2).
- Endpoints: `GET/PATCH /api/results/summary/innovation-use/{get|create}/result/:id`
  vía `BilateralApiService.GET_innovationUse` / `PATCH_innovationUse`. **El mismo endpoint sirve al
  formulario viejo de W1/W2** (`results-api.service.ts:460`), así que todo cambio de contrato tiene que
  ser aditivo para ese lado también.

## Dónde se usa
- `src/app/pages/bilateral/components/section-type-specific/section-type-specific.component.html` — rama del
  tipo Innovation Use.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **El monto de inversión está VISIBLE PERO DESHABILITADO con tag `Coming soon` — 26-ago-2026, no es un
  olvido.** `investment_bilateral_usd` **no existe en el servidor** (cero coincidencias en
  `onecgiar-pr-server/src/`) y el endpoint legacy lo descartaba en silencio. Hasta el 26-ago se pintaba
  **editable y con asterisco rojo**: el usuario escribía un número que desaparecía al recargar sin ningún
  aviso. Ahora, por la regla de la casa (control cuyo dato no se puede guardar → visible, deshabilitado y
  etiquetado), el input va con `[required]="false"`, `[disabled]="true"`, la clase `globalDisabled` y el tag
  `Coming soon` (mismo markup que `result-ai-item.component.html`), **y la clave ya no viaja en el payload**
  — mandarla solo hacía parecer soportado un contrato que no lo está. Tampoco se publica al tracker MDS: si
  se publicara, al recargar contaría como incompleto y **Submit quedaría bloqueado sin forma de
  desbloquearlo**. Mismo patrón que `external-partners` en `section-contributors`
  (`section-contributors.component.ts:344`). **Ruta de arreglo real:** repuntar a
  `PATCH /v2/api/innovation-use/create/result/:resultId`, que modela el monto **por proyecto**
  (`investment_bilateral: [{ id, kind_cash, is_determined }]`, tabla `non_pooled_projetct_budget.kind_cash`)
  y espera el **nivel 0-9** en `innovation_use_level_id`, no el id del catálogo — hoy lanzaría **400**
  abortando el PATCH entero y el GET v2 devuelve **404** sin nivel guardado. Además **la historia no define
  cómo repartir un único total entre varios proyectos contribuyentes**, y eso no se inventa (regla 6).
  Candados: los tests `AC8 — the investment amount is rendered disabled and tagged Coming soon, never as
  required`, `never sends investment_bilateral_usd in the payload…` y `does NOT publish use-investment to
  the MDS tracker…`. ⚠️ Diverge de **AC8**, que lo pide editable y obligatorio: no se puede cumplir sin
  columna en el servidor.
- ⚠️ **El backend YA guarda todo lo nuevo menos la inversión (P2-3424, 26-ago-2026).** El DTO
  (`onecgiar-pr-server/src/api/results/summary/dto/create-innovation-use.dto.ts`) declara
  `has_scaling_studies`, `scaling_studies_urls`, `innov_use_2030_to_be_determined`,
  `readiness_level_explanation`, `has_innovation_link` y `linked_results`, y
  `SummaryService.saveInnovationUse` los persiste (columnas de `results_innovations_use`,
  `result_scaling_study_urls.result_innov_use_id` y `linked_result`). **`investment_bilateral_usd` sigue
  descartándose: no existe columna en ningún sitio del servidor** — necesita migración, ver la trampa de
  arriba. El controlador sigue sin `ValidationPipe`, así que un campo no declarado se pierde en silencio:
  antes de añadir uno nuevo al payload, declararlo en el DTO.
- ⚠️ **El servidor solo escribe la clave que el payload trae.** Un `undefined` deja el valor guardado como
  estaba; hace falta porque el formulario viejo de W1/W2 no manda todas las claves. Y **`linked_result` es
  una tabla compartida** con la sección P22 "Links to results": solo se toca cuando la pregunta se contesta
  **Sí** (guarda la selección) o cuando un **Sí guardado pasa a No** (la borra). Un "No" que nunca fue "Sí"
  no toca nada — si no, el primer autoguardado se llevaría por delante los enlaces de esa otra sección.
- ⚠️ **MySQL devuelve los `tinyint` como `1`/`0`, y los radios enlazan `true`/`false`.**
  `normalizeStoredBoolean()` lo arregla para `has_scaling_studies`, `innov_use_2030_to_be_determined` y
  `has_innovation_link`. Sin eso la respuesta guardada recarga sin marcar y el bloque que depende de ella
  no se pinta.
- ⚠️ **`status_id` no existe en el catálogo del desplegable de P2-3424.**
  `getResultsForInnovUse` (`onecgiar-pr-server/src/api/results/result.repository.ts:2645`) hace
  `SELECT id, acronym, phase_year, result_code, name, title` — sin estado. Por eso
  `isLinkableInnovationDevelopment()` deja pasar la opción cuando el campo no viene: filtrar estricto
  dejaría el desplegable **siempre vacío**. Supuesto: **"QA'd" = `status_id = 2` (Quality Assessed)**,
  declarado por el PO (Ángel Jarrín, 23-ago-2026 en P2-3424) y **pendiente de confirmación de negocio**.
  Tampoco se filtra por "fase anterior": el endpoint ya restringe a fase 2025 / P25.
- ⚠️ **FASE ≠ PORTAFOLIO.** El gate de P2-3424 es `reportingYear() >= 2026` (constante local
  `INNOVATION_LINK_MIN_PHASE_YEAR`), **no** `isP25()`: en prtest hay resultados de fase 2025 dentro del
  portafolio P25 y un gate de portafolio les encendería el campo. No se metió en `ReportingDesignYear`
  porque es un archivo compartido que esta historia no posee.
- ⚠️ **La compuerta "Innovation Use to be Determined" está invertida respecto a lo que suena:**
  `innov_use_to_be_determined === true` = el uso está por determinar → **no se piden actores** y el MDS
  de Actors se da por satisfecho (AC4). El bloque de actores solo se pinta con `=== false`.
- ⚠️ `use-determined` **ya no es una entrada del tracker**. Estaba de más (la historia cuenta 4 campos) y
  cada entrada extra sube el umbral de Submit.
- ⚠️ **Al subir el nivel de uso a 6 o más, `onUseLevelChange()` BORRA `has_scaling_studies` y
  `scaling_studies_urls`.** La pregunta desaparece de la pantalla a partir de 6 y, sin ese limpiado, un
  "Sí" con tres URLs se seguía guardando detrás de un control que el usuario ya no puede ver ni corregir.
  Mismo motivo por el que `onInnovationLinkChange()` borra el resultado enlazado. Solo limpia cuando el
  nivel **llega a 6 o más**: con el nivel sin elegir no se ocultó nada, así que no se toca nada.
- El gate de la pregunta de scaling studies aquí es `nivel < 6` (P2-3428 AC13 / P2-3294). **W1/W2 hoy usa
  `>= 5` sin techo** (`shared/components/innovation-use-form/innovation-use-form.component.html:334`)
  porque P2-3294 sigue Open. Divergencia deliberada y reportada en el ticket — no "alinear" a ciegas.
- Los tests usan `overrideTemplate`, así que el HTML no se compila en Jest. El texto de la nota MDS vive en
  la constante `MDS_INFO_NOTE` justamente para poder afirmarlo palabra por palabra sin renderizar.
- Las medidas cuantitativas solo cuentan para el MDS con **unidad Y cantidad** (AC6); una unidad suelta no
  dice nada.

## Pendiente / Coming soon
- **2030 Use Projection**: solo se construyó la opción "This is yet to be determined". Los campos de la
  proyección los está redefiniendo **P2-3295 (Open)** y P2-3428 pide coordinar con el PO en vez de
  adivinarlos.
- **Modo solo lectura (AC17)** no se implementó ni se verificó en esta sección.
- **Monto de inversión W3/bilateral**: deshabilitado con tag `Coming soon` hasta que el servidor tenga
  dónde guardarlo (primera trampa). Falta el ticket que pida esa columna/endpoint.
- Filas de inversión "CGIAR Programs / Initiatives" y "Partner Institutions": siguen read-only con
  "Not available yet", a la espera de la decisión del PO anotada en P2-3428 (MDS field 4).
