## Context

P2-3201 reads like a copy ticket, but investigating the code turned up one behavioural change hiding inside it and several regression traps. This document records what the code actually does today so implementation does not break working surfaces.

**What already exists (and can be reused):**

- `app-pr-field-header` (`custom-fields/pr-field-header/`) already accepts an optional `[tooltip]` input, introduced by **P2-3061**. When present it renders the label followed by a `material-icons-round` "info" icon carrying `[prTooltip]`. When absent the markup is byte-identical to before. The tooltip conversion this ticket asks for therefore needs **no new component** — it is a matter of moving strings from the `description` property to the `tooltip` input.
- The grey `Description:` header the ticket wants removed is produced by a single getter on that component:
  ```ts
  get descriptionLabel() {
    return this.showDescriptionLabel && !this.rolesSE.readOnly
      ? `<strong class="mr-5 font-weight-600 text-black">Description:</strong>` : '';
  }
  ```
  Rendered as `[innerHTML]="descriptionLabel + description"` inside `.pr_description`. Moving content from `description` to `tooltip` removes the header as a side effect — no separate deletion needed.
- The linked/bundled conditional plumbing already exists. `rd-contributors-and-partners.component.ts:218` holds `linkedResultQuestionLabel` (added by **P2-3112**), consumed at `rd-contributors-and-partners.component.html:449`. `fields-manager.service.ts:159` holds the innovation variant under `[innovation-use-form]-has-innovation-link`.

**What does NOT exist and must be built:**

The ticket specifies tooltip behaviour as *"opens on hover, stays pinned on click, closes when the user clicks outside it or presses Escape."* The current `PrTooltipDirective` (`shared/directives/pr-tooltip.directive.ts`) does the **opposite**: `@HostListener('click') onClick() { this.hide(); }` — clicking dismisses it. There is no pin, no outside-click handler and no Escape handler. This is the one genuinely behavioural item in an otherwise copy-only ticket, and it is load-bearing: the contributor definition tooltip contains a **link to the CLARISA Glossary**, and a hover-only tooltip that dies on `mouseleave` makes that link unreachable.

`prTooltip` is used in **40 template files**. Any change to its default behaviour is a 40-surface regression risk.

## Goals / Non-Goals

**Goals:**

- Apply the approved copy for points 1, 2, 3, 4 and 6 of P2-3201.
- Make guidance content that moved into tooltips genuinely usable, including tooltips whose content contains a link.
- Keep every non-listed string, branch and behaviour byte-identical.

**Non-Goals:**

- **Point 5 (Geographic location) is out of scope for this change.** Two conflicts are open with the requester; see Open Questions.
- No change to validation, submission, or green-check logic. Nothing in this change may alter what `DataControlService.someMandatoryFieldIncompleteResultDetail` scans or what the server's completeness query returns.
- No visual redesign of the tooltip itself beyond what pinning requires.
- No touching Section 4's linked/bundled field — P2-3199 already removed it and is Released Into Live.

## Decisions

### D1 — Pinning is an opt-in input on the existing directive, not a new default

Add `@Input() prTooltipPinnable: boolean = false` to `PrTooltipDirective`. Only when `true` does click pin instead of hide, and only a pinned tooltip registers the `document` click-outside and `Escape` keydown listeners.

*Why:* the directive has 40 consumers whose current contract is "click dismisses". Flipping the default would change all of them silently — buttons whose tooltip currently disappears on click would start latching open over the action just taken. Opt-in keeps the blast radius at exactly the fields this ticket touches.

*Alternative considered:* a separate `prPinnableTooltip` directive. Rejected — it would duplicate the positioning, viewport-clamping and teardown logic, which is the bulk of the file, and leave two implementations to keep in sync.

*Listener hygiene:* the outside-click and Escape listeners are attached **only while a tooltip is pinned** and removed in `hide()` and `ngOnDestroy()`. They must be registered via `Renderer2.listen` so they are torn down with the view. A pinned tooltip must not close when the click lands inside the tooltip element itself — otherwise the CLARISA Glossary link becomes unclickable, which is the entire reason pinning exists.

### D2 — Tooltip conversion moves strings between existing inputs; no markup surgery

For each field being converted, move the HTML currently in `fields-manager.service.ts`'s `description` property to the `tooltip` input on `app-pr-field-header`. The grey `Description:` header disappears because `descriptionLabel` only renders when `description` is non-empty.

*Why:* the ticket's acceptance criterion is "reachable through its ⓘ tooltip, with no loss of text". Moving the same string preserves it exactly, including the `<ul><li>` structure and the `<strong>Examples:</strong>` markup in `lead_contact_person`.

*Scope guard:* the ticket (point 1) and Santiago's Slack confirmation (30 Jul, 11:35) diverge on how far this goes. The parent says only the inner grey header is removed from `Title of Result` / `Description of Result` while the guidance box keeps its content; Santiago explicitly asked for the tooltip treatment on **Lead contact person**. The declared assumption recorded on P2-3213 stands: **full guidance-box → tooltip conversion applies only to Lead contact person**; Title and Description keep their boxes minus the header. Do not widen this without a new confirmation.

### D3 — The linked/bundled question reuses `linkedResultQuestionLabel`, it does not replace it

`linkedResultQuestionLabel` already switches wording by result type. The approved text unifies the generic and innovation variants into one string, so the computed collapses to two outcomes: the unified wording, and the `Policy change` variant. Update the string values in place; do not remove the computed or the conditional binding.

*Why:* the mockup states explicitly that this is *"renderizado condicional por categoría de indicador"*. The mechanism exists and is already wired into the template — replacing it would be a rewrite of working logic for no behavioural gain.

*Naming trap:* the second key holding this label is `[contributors-partners]-is-lead-by-partner`. The name is misleading — it holds the linked/bundled label, **not** a lead-by-partner flag. Do not "fix" the key name in this change; it is referenced by `fieldRef` in the template.

### D4 — Evidence guidance is edited inside `alertStatus()`, preserving both hidden branches

`rd-evidences.component.ts::alertStatus()` has three parts. Only the middle one changes:

1. An **early return** for `dataControlSE.isKnowledgeProduct` with a completely different sentence. **Untouched.**
2. The shared `<ul>` of six bullets. **This is the only part edited.**
3. Two extra `<li>` appended when `currentResult.result_type_id === 5` (Capacity sharing): the GDPR note and the sub-sample note. **Untouched.**

*Why this matters:* the mockup was built on result 28869, an **Innovation use**. Neither branch 1 nor branch 3 is visible in it. Treating the mockup as the complete list would silently delete the Knowledge Product text and the two Capacity-sharing notes.

*Video link:* the existing SharePoint URL stays. The `claudeusercontent.com` link that appears in the mockup is a placeholder and must never ship.

### D5 — The AI notes are static blocks, positioned once

Both notes render as plain static blocks — not collapsible, no "How it works" link. An earlier draft of the ticket and the 30 Jul mockup both proposed a collapsible treatment with a link; the revised parent description explicitly rules both out.

The Titles/Descriptions note sits between the `Change result type` button and the `Title of Result` label, covering both fields. The Impact Area note sits above the section heading, covering the whole section.

*Copy correction already agreed:* the approved note says the AI button is enabled *"after the required data fields that trigger the AI assistant have been completed"*, which does not match the implementation — `panel-menu.component.html` gates it on `greenChecksSE.submit` (all sections complete), the same gate as Submit. Santiago accepted aligning the copy to reality on 30 Jul (10:33): *"Haz el cambio a once all sections are completed"*. Ship the amended sentence, not the literal one.

*Render condition, for reference:* the AI Review button lives in the result-detail sidebar (`panel-menu.component.html`), not in Section 1, and renders only when `result_type_id != 6 && status_id == 1` — so it does not exist for **Knowledge Products** and only while the result is in **Editing**. The note is being added to Section 1 regardless; that asymmetry is the requester's call and is out of scope here.

### D6 — Data flow

No API contract is involved. The flow for every item in this change is:

```
fields-manager.service.ts (label / description / tooltip / required / hide)
  → CustomField object keyed by fieldRef
    → app-pr-field-header inputs (label, description, tooltip, useColon)
      → template render
```

except the Evidence guidance, which is a plain string built in `alertStatus()` and passed to `app-alert-status [description]`, and the linked/bundled label, which flows through `linkedResultQuestionLabel` on the component. Nothing reads from or writes to the server as part of this change.

## Risks / Trade-offs

- **Changing `prTooltip`'s click behaviour breaks 40 templates** → mitigated by D1: pinning is opt-in via `prTooltipPinnable`, default `false`, so every existing consumer keeps "click hides".
- **A pinned tooltip that closes on any document click makes its own links unclickable** → the outside-click handler must ignore clicks whose target is inside the tooltip element. This is the specific failure the CLARISA Glossary link would hit.
- **Deleting the Knowledge Product or Capacity-sharing evidence branches** → D4 names both explicitly; a test asserting each branch still renders its text guards the regression.
- **Global find-and-replace on `Description:`** → the string appears three times in the Section 1 DOM and each is handled differently. The parent ticket calls this out. Every edit must be made at a named key in `fields-manager.service.ts`, never by a bulk replace.
- **Touching Section 4's linked/bundled field** → P2-3199 already removed it and is Released Into Live. Verify its absence before editing Section 2; do not re-add or re-remove.
- **Widening the tooltip conversion beyond Lead contact person** → D2 records the declared assumption. If the reviewer expects Title/Description converted too, that is a follow-up, not a silent widening.
- **Coverage regression** → the client gate is 50/60/60/60. New branches in `PrTooltipDirective` (pinned vs unpinned, outside vs inside click, Escape) need matching unit tests or the branch threshold slips.

## Migration Plan

Pure frontend copy + one opt-in directive input. No migration, no feature flag, no data backfill.

**Rollback:** revert the commit. No state is persisted by any of these changes, so there is nothing to unwind.

**Verification before merge:** `npm run lint` and `npm run test` green with coverage thresholds respected, plus a browser pass on a real result confirming (a) each converted tooltip opens on hover, pins on click, and closes on outside-click and Escape; (b) the CLARISA Glossary link inside the pinned tooltip is clickable; (c) a Knowledge Product result still shows its own Evidence sentence; (d) a Capacity sharing result still shows the GDPR and sub-sample notes.

## Open Questions

**None. All resolved — point 5 is back in scope for this change.**

Both questions belonged to point 5 (Geographic location) and were answered by Santiago Sánchez on Slack, 4 Aug 08:32:

1. **Which guidance text is authoritative?** → *Neither.* The guidance line is left exactly as it is today: *"dejalo como está esa parte de this should reflect geo…. no cambies nada"*. He was pointing at the question field, not at the guidance. The apparent conflict between the 30 Jul wording and the 3 Aug mockup is void — no guidance text changes.
2. **Does unifying the question override P2-3036?** → *Yes.* *"para todos los resultados de ahora en adelante debe de ser What is the geographic focus of the result?"* All three variants collapse into the unified wording, which retires the 2026-only *"What is the location of benefit for this result?"* introduced by **P2-3036 (AC9)**. This consequence was stated back to Santiago explicitly, with an offer to restore the variant if the redesign needs it; implementation proceeds on his answer.

**Resulting decision (D7) — Geographic location:** unify only the *question label* across every result type and phase year. Leave the guidance description binding, the sub-questions and `has_extra_geo_scope` untouched — Santiago's 30 Jul decision stands: *"las sub preguntas que aparezcan deben de continuar de la misma manera"*. `FieldsManagerService.isGeographicLocation2026()` becomes unused **by this label**; do not delete the computed, since removing it is a wider refactor than this ticket and other P2-3036 behaviour may still rely on it.

Answered elsewhere, recorded here so they are not reopened: the CLARISA Glossary URL is valid and public (verified 30 Jul, 40 terms, no auth); `Contributing Science Programs/Accelerators` goes **plural**; the AI-button sentence is amended to "once all sections are completed"; `Lead contact person`'s guidance becomes a tooltip.
