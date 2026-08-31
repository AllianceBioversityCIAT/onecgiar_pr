# Fase ≠ portafolio — cómo se gatea lo nuevo del ciclo 2026

**Verified:** 2026-08-31 · branch `performance-refactor` · auditoría de los 71 tickets que tocaron formularios desde el 1-jul-2026
**Regla madre:** `~/Desktop/reporting/CLAUDE.md` § regla 9. Este archivo es su **evidencia**: qué se auditó, qué salió bien y qué falta.

## 1. Cuál es la fase nueva

**`Reporting 2026`** — `version.phase_year = 2026`, portafolio **P25**.

🛑 **La fase anterior, `Reporting 2025`, es el MISMO portafolio P25.** Ese es el hecho que hace
que todo lo demás importe: `isP25()` devuelve `true` para las dos, así que **no puede usarse para
separar lo nuevo de lo viejo**. P22 es 2022-2024 y está cerrado.

- Fuente: `P2-3201`, descripción — *"Reference result used for the mockup: 28869 (Innovation use, Outcome, SP09), **Reporting 2026**"*.
- Los 6 umbrales de `ReportingDesignYear` son 2026 (verificado: `shared/enum/reporting-design-year.enum.ts`).
- ⚠️ **NO VERIFICADO contra la API**: `prtest-back.ciat.cgiar.org` dio timeout el 31-ago (probablemente pide VPN).

## 2. Los dos ejes, y cuál se usa

| Eje | Cómo se pregunta | Cuándo es el correcto |
|---|---|---|
| **Año de fase** | `currentResultSignal()?.phase_year` | Requisito que dice *"de 2026 en adelante"* |
| **Portafolio** | `isP25()` / `isP22()` (`fields-manager.service.ts:19-20`) | Requisito que habla **literalmente** de portafolios |

El patrón canónico, repetido en los 6 gates centralizados:

```ts
const year = this.dataControlSE.currentResultSignal()?.phase_year
          ?? this.dataControlSE.reportingCurrentPhase?.phaseYear;
return typeof year === 'number' && year >= ReportingDesignYear.<Umbral>;
```

⚠️ El `typeof year === 'number'` **no es adorno**: el backend a veces manda `'2026'` string y
`'2026' >= 2026` sería una coerción silenciosa. Hay test-candado en
`fields-manager.service.spec.ts:247`.

## 3. Inventario de gates (verificado en código, 31-ago-2026)

**Centralizados — `shared/services/fields-manager.service.ts:24-88`:**

- `isContributorsPartners2026()` — Contributors & Partners (P2-3036)
- `isInnovationDevFormReduced2026()` — Innovation Development reducido (P2-3263, P2-3264, P2-3467)
- `isInnovationUse2030Projection2026()` — bloque 2030 (P2-3295)
- `isGeographicLocation2026()` — location of benefit
- `isReportingFormGuidance2026()` — guía en tooltips (P2-3201)
- `isLeadContactPersonMandatory2026()` — **el único que además cruza portafolio**: `isP25() && year >= 2026` (P2-3225)

**Locales, mismo patrón:**

- `shared/components/innovation-use-form/innovation-use-form.component.ts:383` (P2-3535)
- `.../rd-general-information/components/rd-annual-updating/rd-annual-updating.component.ts:98` (P2-3292)
- `.../ipsr-innovation-use-pathway/pages/step-n4/` (P2-3426)
- `shared/services/global/qa-innovation-development-results.service.ts`
- `pages/bilateral/components/section-type-specific/type-innovation-use/type-innovation-use.component.ts:44`

## 4. Tickets verificados uno por uno — CON gate

P2-3142 · P2-3248 · P2-3249 · P2-3235 · P2-3358 · P2-3263 · P2-3264 · P2-3290/P2-3467 ·
P2-3295 · P2-3201 · P2-3225 · P2-3426 · P2-3535 · P2-3292

Dos casos que parecían huecos y **no lo son** — el código vive dentro de una rama ya gateada,
así que el diff del commit no muestra el gate:

- **P2-3248**: `externalPartnersInfoNote` es una propiedad plana, pero se pinta bajo
  `@if (isCP2026())` — `rd-contributors-and-partners.component.html:481`.
- **P2-3358**: la rama de la pregunta linked/bundled *"only ever renders under `isCP2026()`"*.

📌 **Lección de método:** grepear el diff del commit **da falsos huecos**. Hay que mirar el estado
actual del archivo y buscar el `@if` que lo envuelve.

## 5. 🔴 Hueco confirmado — P2-3261

`pages/results/.../rd-result-types-pages/policy-change-info/policy-change-info.component.ts` no
tiene **ningún** gate: ni de fase ni de portafolio. El commit `f58084fd6` reescribió las
definiciones de *"Policy or strategy"* y *"Program, budget or investment"*.

**Consecuencia:** quien abra hoy un resultado de fase 2025 o de P22 ve el texto de 2026.
Es texto de guía, no un campo — **no se pierde ningún dato**, pero rompe la regla de
retrocompatibilidad del épico.

## 6. ⚠️ NO VERIFICADO — siete pendientes

Su diff no introdujo gate, pero **no se comprobó** si viven dentro de una rama gateada (ver § 4):

P2-3045 (video de guía de evidencias) · P2-3110 (AI Review de Impact Areas) · P2-3131 (AVISA) ·
P2-3171 (feedback de Nicoleta) · P2-3229 (W3/Bilateral, años previos) · P2-3262 (2º commit,
`8e7777d01`; el primero sí está gateado) · P2-3384 (Bilateral KP metadata — bilateral es módulo
nuevo, probablemente 2026 por construcción)

## 7. La asimetría de fondo: el green check no conoce la fase

- El SP `validate_sections_mapped_batch` resuelve la función **concatenando el portafolio**:
  `CONCAT('validation_', function_name, '_', v_portfolio_code)` → `validation_general_information_P25`
  (`onecgiar-pr-server/src/migrations/1762528725798-createValidtionP25.ts:8`).
- El reparto de secciones **también** es por portafolio:
  `results-validation-module.repository.ts:52` → si `acronym === 'P25'` manda `CONTRIBUTOR_PARTNERS`.
- **Ninguna función `validation_*` mira `phase_year`.** Solo 2 migraciones en todo el server
  mencionan esa columna y las dos son de 2023, creando y poblando `version.phase_year`.
- 🛑 Si la función no existe, el SP inserta `FALSE` (línea 88): la sección **nunca se pone verde**,
  sin error visible.

**Resultado:** un resultado de fase 2025 ve el formulario viejo pero se valida con las reglas
nuevas. **Es dominio de Juanda** (regla 14 y 18) — no lo tocamos, solo queda declarado.

## 8. El origen: las historias no traen el alcance de fase

Verificado en el changelog de Jira — **las 12 descripciones las escribió Ángel**, él es creator y
editor en todos los casos:

- **Solo P2-3426 declara el alcance**, y lo agregó **después de que preguntáramos**: creada el
  23-ago, reescrita el 28-ago 15:39 y 16:15 con `Phase threshold - RESOLVED`. **No nació así.**
- **P2-3225** (Lead Contact Person): 622 caracteres, **cero** menciones de fase o portafolio.
  El gate `isP25() && year >= 2026` lo decidimos nosotros.
- **P2-3263 / P2-3264** dicen lo contrario del épico: *"Existing records that previously had data
  in this section are not affected (data may be retained in the database but should not be
  displayed)"* — leído literal, ocultar en **todas** las fases. Nosotros hicimos lo contrario.
  ⚠️ Estamos alineados con el épico pero **no con el texto del ticket**: si QA lo lee literal, lo devuelve.
- P2-3036, P2-3201, P2-3295, P2-3535 mencionan *"2026"* dentro del **contenido** (textos, tooltips),
  nunca como **alcance**.

**Conclusión honesta:** la regla no estaba en el requisito. Se aplicó bien porque estaba en
**nuestro** contexto (`CLAUDE.md` regla 9 + los comentarios en el código), no porque el ticket
lo pidiera. Eso no es sostenible: cada historia nueva llega sin alcance y el equipo decide por
el autor — y **ya se coló una** (P2-3261).

## 9. La receta, para el próximo gate

1. Umbral nuevo en `reporting-design-year.enum.ts` — **solo umbrales de rediseño de UI, todos 2026**.
   Un umbral de otra semántica va como constante local con su comentario.
2. `computed` nuevo en `FieldsManagerService` con el patrón del § 2, incluido el `typeof`.
3. Nunca `isP25()` cuando el requisito diga *"de 2026 en adelante"*.
4. Verificarlo **en pantalla** con un resultado de fase 2025 y uno de 2026. La lectura del código
   no basta: los dos ejes se leen igual.
5. Si el cambio afecta completitud → es green check → **es de Juanda**.
