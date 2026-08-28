# rd-contributors-and-partners

**Verified:** 2026-08-28 · branch p2-3249-toc-center-mandatory · 8d67570c8

## Qué es
Sección 2 del detalle de resultado. Programas científicos contribuyentes, centros CGIAR, socios
externos, proyectos bilaterales/W3, y la pregunta de resultado enlazado/agrupado.

## Contrato
- `RdContributorsAndPartnersService.partnersBody` = **fuente de verdad** del formulario entero.
  El componente no guarda estado propio de datos; solo computeds de presentación.
- Endpoints vía `ResultsApiService`: `GET_ContributorsPartners`, `GET_ClarisaProjects`,
  `GET_W3BilateralProjects`, `GET_W3BilateralProjectsByProgram`.
- `FieldsManagerService` inyectado como `fieldsManagerSE`: labels, `hide` y `required` por
  `fieldRef`. Se combinan con computeds locales — ver la trampa de los dos caminos.

## Dónde se usa
- Ruta `result/result-detail/:id/contributor-partners?phase=<id>`. La URL con
  `/contributors-and-partners` **no** existe: redirige a `general-information`.

## Trampas (⚠️ = ya rompió algo)

- ⚠️ **`isCP2026()` y `isP22()` NO son complementarios.** `isCP2026` = `phase_year >= 2026`
  (`fields-manager.service.ts:26`); `isP22` = **portafolio**, no año (`:20`). En prtest hay
  resultados de **fase 2025 dentro del portafolio P25**, así que para ellos ambos dan `false`:
  un campo con `hide: isP22()` **se muestra** ahí, aunque el ticket lo describa como "2026-only".
  Verificado en navegador el 25-ago-2026 con el resultado 5895 (Innovation use, fase 2025 · P25).
  🛑 No asumir "gated por `hide: isP22()`" = "no lo ve nadie antes de 2026". Compruébalo.

- ⚠️ **La pregunta enlazado/agrupado se renderiza por DOS caminos distintos** en el mismo
  template, y ahí fue donde los textos se separaron (P2-3358):
  - `html:442` — tipos **2** (Innovation use) y **7** (Innovation development): `fieldRef=`
    `"[innovation-use-form]-has-innovation-link"` → label desde `fields-manager.service.ts:182`.
  - `html:455` — **el resto** de tipologías: `[label]="linkedResultQuestionLabel"` desde el
    componente (`:234`), y solo bajo `isCP2026()`.
  Cambiar uno y no el otro deja la mitad de las tipologías con el texto viejo. Si tocas la
  frase, tócala en los dos sitios **y** en los dos specs.
  No se unificaron a una sola fuente a propósito: el camino B no lleva `fieldRef`, así que
  adoptarlo le añadiría `hide: isP22()`, y por la trampa de arriba eso **sí** cambia
  comportamiento para las siete tipologías que sirve (decisión D1 del change
  `openspec/changes/p2-3358-single-linked-result-question/design.md`).

- ⚠️ **"Lead center" se alimenta de LOS DOS desplegables de centros, no solo del primero.**
  `setPossibleLeadCenters` (`service.ts:537`) filtra el catálogo CLARISA por
  `partnersBody.contributing_center` **∪** `otherCentersSelected`. El segundo desplegable
  ("Other(s) Contributing CGIAR Centers", `html:157`) no llamaba a ese recálculo, así que la lista
  del campo **obligatorio** "Lead center" salía vacía ("There are no items available for this list")
  hasta que un Save draft recargaba la sección. Y cuando la ToC no trae centros (P2-2998 AC4) el
  primer desplegable **ni se pinta**, así que ése era el único camino → callejón sin salida.
  Arreglado con `onOtherCenterSelect` (`component.ts:208`) + guarda ampliada en el servicio.
  🛑 Si añades un tercer origen de centros, engánchalo también a `setPossibleLeadCenters(true)`.

- ⚠️ **The 2026 help text under the ToC question is owned by P2-3142 — do not "restore" the old one.**
  A newer P/A-funding + "Reflect & Adapt" paragraph had replaced the wording the ticket asks for. The PO
  (Ángel) was asked which one wins and answered **"A" — the ticket's wording** (P2-3142 comment,
  27 Aug 2026), so the Reflect & Adapt paragraph was overwritten on purpose. The live 2026 string is the
  ticket's literal text (`component.ts:116`); the only intentional deviations are `ToC` instead of the
  ticket's `TOC` (matches the question label right above it) and dropping the ticket's stray trailing `'`.
  The pre-2026 branch (`:117`) is a different string and must stay untouched.

- La pregunta **no aparece en el PDF**. El "View PDF" pega contra
  `GET /api/platform-report/result/:id`, que devuelve un JSON con una URL de S3; el PDF real
  no contiene ninguna variante de la frase (verificado con `pdftotext` el 25-ago-2026). El texto
  tampoco existe en `onecgiar-pr-server`.

- ⚠️ **`appFeedbackValidation` congela `labelText`.** La directiva escribe el texto en el DOM UNA vez, en
  `ngOnInit` (`shared/directives/feedback-validation.directive.ts:16-19`); `ngDoCheck` sólo sincroniza
  `.complete`. Un `[labelText]="getter"` se queda con el valor del primer render — aquí siempre el que NO
  menciona la ToC, porque los ids de la ToC resuelven después de construir la vista. Por eso "Contributing
  CGIAR Centers" lleva **dos** marcadores con label estático bajo un `@if` (`html:210-222`), no uno con binding.
  🛑 Sólo `[isComplete]` es bindeable.

- **P2-3249 — "Contributing CGIAR Centers" es obligatorio, con DOS reglas de precondición disjunta**
  (decisión registrada en el ticket el 28-ago-2026; resuelve la contradicción aparente con P2-3324/P2-3326):
  la ToC **trae** centros → tiene que quedar ≥1 del bucket ToC y los de "Other(s)" **no** cuentan; la ToC **no**
  trae ninguno (o camino plano pre-2026) → cualquier centro vale. Todo sale de `contributingCentersComplete`
  (`component.ts:200-203`), leído desde UN solo punto del template para que aplique a los **dos** caminos.
  ⚠️ `results_center.from_toc` es `NOT NULL DEFAULT 0`, así que un resultado guardado antes del split 2026
  carga TODOS sus centros en "Other(s)" y **sí** dispara la regla: es deliberado (un `0` no se distingue de
  "el usuario dejó sólo Other(s)", que es justo lo que el ticket persigue). No bloquea el Save draft — es
  feedback de capa 1, no un gate. El green check del backend **no** se tocó: sigue exigiendo ≥1 centro
  cualquiera (`results-validation-module.repository.ts:415-424`), sin filtro `from_toc`.

- El escaneo de "N fields missing" del piso depende de la clase global `.section_container`
  — ver [`../../CLAUDE.md`](../../CLAUDE.md).

## Hijos sin archivo propio
| Componente | Qué hace | Trampa |
|---|---|---|
| `components/` | Chips y bloques de contribuidores/socios | Los dropdowns agrupados de admin tienen comportamiento propio: validar antes de cambiar bindings |

## Tests
Tres suites: `*.component.spec.ts`, `*.service.spec.ts` y `*.zoneless.spec.ts` (160 casos en total).
La regla de P2-3249 se prueba en dos niveles a propósito: la lógica pura en `*.component.spec.ts` (plantilla
vaciada) y el **contrato DOM** en `*.zoneless.spec.ts`, donde se corre el escaneo real de
`DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` sobre el template real.
Sin esa segunda mitad, borrar el marcador del HTML dejaría los tests en verde.
Además, E2E: `cypress/e2e/result-detail/contributors-and-partners.cy.ts`, `save-validation.cy.ts`
y `save-contract.cy.ts`.
⚠️ Los controles del template llevan `data-testid="cp-field-<ruta en el payload>"` (por ejemplo
`cp-field-result_toc_result.planned_result`). **No son decoración:** `save-contract.cy.ts` lee la
ruta del hook y comprueba que el campo viaje en el body del PATCH. El sufijo tras `~`
(`cp-field-contributing_center~flat`) solo distingue dos controles que alimentan la MISMA clave.
Si añades un control obligatorio sin su hook, queda fuera de esa comprobación.
La zoneless existe porque esta pantalla ya se rompió con el patrón hide/re-show por timer.
⚠️ Esta carpeta está **excluida de `collectCoverageFrom`** (`package.json`): los tests corren, pero
no cuentan para el umbral. No te fíes del porcentaje global para saber si esto está cubierto.
