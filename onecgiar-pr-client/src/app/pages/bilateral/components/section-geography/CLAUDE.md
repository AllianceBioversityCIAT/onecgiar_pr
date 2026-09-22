# section-geography (bilateral)

**Verified:** 2026-09-22 · P2-3788 · el candado de solo-lectura alcanza a los controles sub-nacionales; prior: 2026-09-18 · JuanGuzman-io/feature-p2-3150-bilateral · feedback IA por sección; prior: 2026-08-28 · performance-refactor · a9e7ae7c4

## What it is
Geographic Focus for the W3/Bilateral result form: the main geo scope (Card 1) and the
"potential impact in other geographic areas" follow-up (Card 2), each with its own
regions/countries pickers. The classic form's equivalent is
`results/pages/result-detail/pages/rd-geographic-location/`.

Una evaluación IA ámbar/roja muestra `app-bilateral-field-quality-flag` arriba de la sección,
como destino de **Go to Geographic location** desde el diálogo. La guía no desaparece al editar;
solo el submit exige volver a evaluar una fila stale.

## Contract
- State: **two separate bodies**, both local signals — `geographicLocationBody` (main scope) and
  `extraGeographicLocationBody` (Card 2). They are not one object; a change to one does not
  hydrate the other.
- Owner of the result id: `BilateralCreationService.currentResultId()`. On a deep link it first
  holds the **public result code** and is replaced by the internal DB id only after
  `GET_BilateralResultDetail` resolves — the hydrate `effect()` waits for that.
- Result type: `BilateralCreationService.resultTypeId()` (2 = Innovation Use, 7 = Innovation
  Development). Drives `isInnovationResult()` → `extraScopeQuestionLabel()` /
  `extraScopeQuestionDescription()`.
- Completeness: pushes to `BilateralMdsTrackerService.setSectionFields('geography', …)` from
  `updateTracker()`.

## Where it is used
- `pages/bilateral/pages/bilateral-result-creator/` — as one accordion section of the form.

## Traps (⚠️ = already broke something)

- ⚠️ **Solo lectura: los controles SUB-NACIONALES se quedaron fuera hasta P2-3788.** Los dos
  `app-sub-geoscope` (scope principal y extra) recibían `[readOnly]="false"` **duro** desde
  `a3a7156e3` (15-jul-2026), así que en un resultado fuera de *Editing* seguían ofreciendo borrar
  un país y quitar sub-nacionales. El autosave no escribe (P2-3520), de modo que la pantalla
  **fingía editar**: el usuario quitaba una entrada, recargaba y seguía ahí. `app-sub-geoscope` sí
  honra `readOnly` (`sub-geoscope.component.html:9,27,51`) — el fallo era el binding, no el
  componente. 🛑 El candado está en `section-geography.readonly.spec.ts`, que lee el **markup**
  porque el spec hermano stubea la plantilla con `overrideTemplate(..., '<div></div>')` y no puede
  ver esto. Comprobado con control negativo: reintroducir el `false` pone 3 de sus 4 casos en rojo.
- ⚠️ **The `.sg-block` z-index ladder only holds while panels drop DOWNWARDS.** `--main: 100` /
  `--extra: 50` were written so an open multi-select would overlay the group beneath it. Since
  `P2-3737` the extra-scope select — the last field of the section, so the one nearest the floor —
  opens **upwards** into `--main`, which outranks it. Measured on prtest #9465 (IFPRI, Innovation
  Development): the panel does open upwards over `--main`; nothing is hidden **today** only because
  that strip of `--main` happens to be empty. The identical inversion in `section-contributors` was
  a live bug (`P2-3776`): the chips above covered the open list and swallowed its clicks. Fixed the
  same way here — `&:focus-within { z-index: 300 }`, so the block in use wins in either direction.
  🛑 A new rung must stay below 300; the lock lives in `section-geography.component.spec.ts`.
- ⚠️ **Card 2 is hidden when the main scope is Global (1) or To-be-determined (50).** The gate is on
  the main scope, not on the result type — so an innovation with a Global focus never sees the
  geographic-impact question at all. The classic form gates the same question on
  `isP22() || !isAnInnovation()` instead, with no scope condition. The two forms therefore
  disagree, and that gap is reported on P2-3504 rather than fixed here (changing visibility moves
  completeness).
- ⚠️ **`has_extra_geo_scope` stays `null` until the user answers, on purpose** — `null` means
  "unanswered" and drives the "Please answer Yes or No." error. Do not default it to `false`:
  that answers a required question on the user's behalf. P2-3504 asks for "No (default selected)";
  the contradiction is reported on the ticket, and a test pins the null.
- ⚠️ **The wording is per result type.** Innovations get the business-approved
  "…other geographic areas where the innovation could be impactful…"; other typologies keep
  "Are there any regions that you wish to specify for this Output?" (P2-3504). Do not unify them
  without a ticket — rewording non-innovation typologies was never asked for.
- The spec's `creation` mock must carry `resultTypeId`; the wording computeds call it, and a
  missing key fails as `undefined is not a function` only once something evaluates them.
- The classic form's copy in `FieldsManagerService` has a **double space** ("where  the innovation")
  and a stray trailing quote in its description. This component uses the corrected text from the
  P2-3504 ticket, so the two strings are not byte-identical on purpose.

## Pending / Coming soon
- P2-3504 — visibility gap (Global focus) and the "No by default" request: both open on the ticket.
