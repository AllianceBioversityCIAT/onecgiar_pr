# result-sections-sidebar

**Verified:** 2026-08-26 · branch performance-refactor · 038dcd77b

## Qué es
Segundo riel (240px, blanco) del detalle de resultado: lista de secciones con su green check,
barra de progreso y los tres botones de nivel resultado (AI review / Submit / Unsubmit).
Reemplaza al `panel-menu` legacy y al subárbol de secciones que vivía dentro del nav oscuro.

## Contrato
- `ResultSectionsService` (`providedIn: 'root'`) es **el dueño de todo el estado** de esta carpeta.
  El componente es solo template: no calcula nada, solo `inject()` + bindings.
- Estado que NO es suyo, solo lo lee:
  - `DataControlService.currentResult` / `.green_checks` / `.greenChecksString()` / `.myInitiativesList`
  - `FieldsManagerService.portfolioAcronym() / isP25() / isP22()` — filtra la lista de secciones
  - `GreenChecksService.submit` — habilita Submit y AI review
  - `RolesService.isAdmin` — escape del gate de membresía
  - `ApiService.globalVariablesSE.get?.in_qa` — **switch global** de la ronda de QA
- Escribe en: `SubmissionModalService.showModal`, `UnsubmitModalService.showModal`, `AiReviewService.onAIReviewClick()`.
- Selector: `<app-result-sections-sidebar />`, standalone, OnPush.

## Dónde se usa
- `src/app/pages/results/pages/result-detail/result-detail.component.html:6` — único host del componente.
- `…/components/section-bottom-bar/section-bottom-bar.component.ts:60` — **comparte el servicio**
  para "Section N of M". Por eso `currentIndex`/`navigableCount` viven en el servicio y no en el host:
  dos contadores independientes se desincronizan en cuanto cambia el filtro de portafolio.
- `…/result-detail/panel-menu/` — pantalla LEGACY. Sigue en el repo, declarada en `result-detail.module.ts`
  pero **sin template que la use**. Es la referencia de comportamiento, no código vivo.

## Trampas (⚠️ = ya rompió algo)
- ⚠️ **P2-3434 — Unsubmit perdió sus dos guardas al revampear** (regresó P2-328 y P2-383).
  El legacy envolvía **Submit Y Unsubmit** en el mismo gate de rol
  (`panel-menu.component.html:65-69`) y deshabilitaba Unsubmit en QA (`:88`). El revamp conservó
  el gate solo en Submit. Arreglado extrayendo `canChangeSubmission` y `lockedByQa`, privados y
  compartidos por los dos botones: **cualquier regla nueva de submisión va ahí, no duplicada por botón.**
- ⚠️ **La regla de QA solo existe en el cliente.** `onecgiar-pr-server/src/api/results/submissions/submissions.service.ts`
  valida rol (`_validateSubmissionPermissions`, 401) pero **nunca mira `inQA`**. Si se borra
  `unsubmitDisabled`, un resultado bajo QA se puede des-someter y nada lo impide.
- ⚠️ El lock de QA necesita **las dos** banderas: `currentResult.inQA` (este resultado) **y**
  `globalVariablesSE.get?.in_qa` (hay ronda de QA abierta). Solo la primera no bloquea nada.
- `validateMember()` devuelve `6` = **no puede** (rol `Member`, o la iniciativa del resultado no está
  en su lista). Números mágicos heredados del legacy; se mantienen para que los dos archivos se lean igual.
- Botón deshabilitado ≠ oculto: el aviso "This result is part of a QA process…" se imprime **debajo**
  del botón gris. Si algún día se oculta el botón, hay que quitar también el aviso o queda huérfano.
- `sections()` devuelve **copias** (`{ ...o }`). No escribir `validation` sobre `resultDetailRouting`:
  esos objetos son un singleton del router y la mutación filtraba los checks de un resultado al siguiente.
- El `<aside>` usa `h-full`, **no** `sticky top-0`: sticky mide solo su propio contenido y la regla
  derecha se cortaba a media página. Quien da sentido al `100%` es `.rd_layout` en `result-detail.component.scss`.

## Tests
`npm run test src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.spec.ts`
El gating vive en `describe('actions gating')`; los casos de P2-3434 están marcados con el ticket.
El filtro de portafolio tiene **dos guardas simétricas** (`result-sections.service.ts:66-67`) y ambas
están cubiertas en `describe('sections')`: P25 esconde las secciones P22 y P22 esconde las P25.
Al tocar ese filtro hay que mover **los dos** fixtures, no solo el P25 (que es el del `beforeEach`).
