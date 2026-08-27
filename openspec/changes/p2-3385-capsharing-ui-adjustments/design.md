## Context

**Jira:** P2-3385 (sub-task of P2-3241, epic P2-3415 — *W1/W2 Results Creation Flow*). Branch: `performance-refactor`.

Three review findings on the Capacity Sharing reporting flow. All three were verified against the code before this design was written; none of them were taken on the strength of the ticket's screenshots, which are dated 2026-08-20 and predate the `field-card` redesign.

**Current state, per finding:**

1. **Submit button cursor.** `lab-report-form.component.html:333` builds its class list with Tailwind utilities and includes `disabled:cursor-not-allowed`, but nothing for the enabled state. Tailwind's Preflight resets `button { cursor: default }`, so an enabled button shows an arrow. The sibling `Cancel` button (line 325) has the same omission.

2. **Geographic focus reads as completed.** The screenshot shows a green status card with a `MANDATORY` pill. Neither renders any more: `field-card.component.html:1-7` carries an explicit header comment stating *"No status-coloured card, no Mandatory/Optional pill, no colour legend"*. `hasValue` (`pr-radio-button.component.ts:90`) is still passed into `field-card`, and the `.complete` class still exists at `pr-radio-button.component.html:11` because `DataControlService` scans for it — but neither maps to a status colour today.

3. **PhD / Master render outside the card.** The capdev sub-term group at `cap-dev-info.component.html:44-51` passes neither `label` nor `description`. That makes `field-card`'s `isBare` getter true (`field-card.component.ts:71`), which makes `field-card.component.html:8` skip the `field_card` class entirely — so the group renders with no container.

**Data flow for finding 3** (API → service → component → template):

```
GET capdev terms  ->  ResultsApiService.GET_capdevsTerms()
                  ->  cap-dev-info.component.ts:49-52
                        response.splice(0,2) -> capdevsSubTerms   (PhD, Master)
                        response.splice(0,2) -> capdevsTerms      (Short-term, Long-term)
                  ->  template binds capdevsSubTerms to the second app-pr-radio-button
                  ->  app-pr-radio-button wraps its options in app-field-card
                  ->  field-card decides card-vs-bare from label/description presence
```

Persistence is not on this path in a straight line: the two visible groups collapse into one stored value at `cap-dev-info.component.ts:125` — `capdev_term_id = capdev_term_id_2 ?? capdev_term_id_1` — which is exactly why the sub-group is allowed to stay optional.

**Twin component.** `type-capacity-sharing.component.html:94-102` (bilateral module) renders the same `capdevsSubTerms` with the same missing label, so it has the identical defect. It is **not** the screen in the ticket's screenshot: that screenshot shows `Length of training` → sub-options → `Delivery Method`, which is `cap-dev-info`'s order, whereas the bilateral twin sequences `Were the trainees attending…` → sub-options. Left untouched per the "fulfil the requirement, do not rewrite it" rule; recorded here and in Jira so it is not lost.

## Goals / Non-Goals

**Goals:**
- The `Create and continue` button shows the pointer cursor when it is clickable.
- The PhD / Master group renders inside a card like every sibling question, with its `required` state unchanged.
- The geographic-focus finding gets an evidence-backed answer written into the Jira ticket, whether or not it results in a code change.

**Non-Goals:**
- Any backend change. Nothing here touches DTOs, endpoints, migrations, or `validation_capacity_dev_P25` / `_P22`.
- Changing `hasValue`, the `.complete` class, or `DataControlService`'s scan.
- Fixing the `Cancel` button cursor (`lab-report-form.component.html:325`) — same defect, not named by the ticket.
- Fixing the bilateral twin (`type-capacity-sharing.component.html:94-102`) — same defect, different screen, not named by the ticket.
- Re-theming `field-card` or reviving any status colour.

## Decisions

**D1 — Fix the cursor with a Tailwind utility on the button, not a global button rule.**
Add `cursor-pointer` to the existing class list at line 333. Considered and rejected: a global `button { cursor: pointer }` in the stylesheet — it would silently change every button in the app, including disabled ones where `disabled:cursor-not-allowed` would then have to win a specificity fight. A local utility keeps the change to the one button the ticket names, and Tailwind's `disabled:` variant already takes precedence on the disabled state. No conditional binding is needed.

**D2 — Fix the framing by giving the sub-group a label, not by changing `isBare`.**
`isBare` is correct as written: a control with neither label nor description genuinely has no card header to draw, and other bare controls across the app rely on that. The defect is that this particular group is a real question that was never given its question text. Considered and rejected: (a) adding an `alwaysCard` input to `field-card` — a new public knob to work around one missing label, and every future caller then has to decide about it; (b) forcing the card whenever `options` are present — changes framing for every bare radio group in the app, far beyond this ticket.

**D3 — `required` stays `false`, and a test locks it there.**
Giving the group a label is a presentation change and must not become a validation change. The group is optional because `validate_capdev_term_id()` (`cap-dev-info.component.ts:124-126`) falls back to `capdev_term_id_1`, so the server's `valid_text(capdev_term_id)` is already satisfied by the parent group. A spec assertion on `required === false` is cheaper than rediscovering this from the green check later.

**D4 — Verify finding 2 in the browser before writing any code for it.**
Reading the code is not enough to close it: the redesign removed the visual vocabulary the report was written in, so the honest answer is either "gone with the redesign" or "still reproduces, by a different mechanism". Deciding from the stale screenshot would risk a change to `hasValue`, which the alert list depends on. Whichever way it lands, the outcome is written back to P2-3385.

## Risks / Trade-offs

- **Adding a label flips `required` by accident, and the section stops turning green.** → `required` is passed explicitly as `false` in the template and asserted in `cap-dev-info.component.spec.ts`. This is the one failure mode that reaches the user as "I cannot submit my report".
- **The new label's wording is not confirmed against the mockup.** → Use plain question text consistent with its siblings (`Length of training`, `Delivery Method`); if the mockup names it differently, it is a one-word edit, not a redesign.
- **Finding 2 turns out to still reproduce and its real cause is in shared code.** → It is then scoped as its own change with its own evidence, not bolted onto this one. This change does not pre-commit to a fix.
- **The bilateral twin keeps the defect and someone reports it again as a new bug.** → Recorded in this design and in the Jira technical comment with its `file:line`, so the next person finds the answer instead of re-investigating.
- **Regression risk overall is low** — one utility class and one label. No shared component is modified.
