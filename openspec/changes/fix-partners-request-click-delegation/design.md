## Context

The "request a partner" modal (`partners-request.component`) is opened by clicking anchor links that live **inside `[innerHTML]` strings** — the `description` of the partner select fields (`pr-select` / `pr-multi-select` / `s-select`, class `.pSelectP`) and IPSR alert texts (`.alert-event`, `.alert-event-2`, `.alert-event-3`). Because those anchors are injected as raw HTML, they have no Angular `(click)` binding. The current code worked around this by polling the DOM with `DataControlService.findClassTenSeconds(class)` (a 1s `setInterval` for 10s) and then attaching a manual `addEventListener` to the found node.

`findClassTenSeconds` resolves `false` on timeout instead of rejecting, and every caller ignores the resolved value, so on pages where the anchor never appears `document.querySelector(...)` is `null` and `.addEventListener` throws. App runs Zone.js default change detection; the polling timer itself re-enters the zone.

## Goals / Non-Goals

**Goals:**
- Eliminate the `TypeError` on every page, permanently and at the root.
- Remove the per-component 10s DOM polling (CPU + needless change detection).
- Keep the exact user behavior: clicking any of those links opens the partners-request modal.
- Use Angular-idiomatic signals for the visibility flag.

**Non-Goals:**
- No backend changes.
- Not migrating the anchors out of `[innerHTML]` into real templates (the descriptions are reused, copy-driven strings; a global delegated listener is the lower-risk fix). Noted as a future option.
- Not touching `step-n1`'s SharePoint download link (`.open_route` with a real `href`) — unrelated.

## Decisions

**1. Global click delegation in the shell, not a null-guard.**
A null-guard (`if (el) el.addEventListener`) would silence the error but keep the 10s polling and the fragile per-mount listeners. Instead, register ONE `document` click listener in `app.component` (the always-mounted shell). On click, `(event.target as HTMLElement).closest('.pSelectP, .alert-event, .alert-event-2, .alert-event-3')` — `.closest` handles clicks landing on child nodes of the anchor. On match: `event.preventDefault()` (anchors have no real `href`) then open the modal. Confirmed as the idiomatic robust approach by a second-model review (Antigravity).

**2. Register the listener with `NgZone.runOutsideAngular`.**
A zone-bound `document:click` listener would run change detection on every click anywhere. Register outside the zone; re-enter via `NgZone.run()` ONLY when a trigger matches (i.e. when we actually open the modal). Tear down the listener in `ngOnDestroy` (store the `Renderer2.listen` disposer or remove the handler).

**3. `showPartnersRequest` → `WritableSignal<boolean>`.**
Aligns with the project's signals-first state convention. Writers use `.set(true|false)`; readers use `showPartnersRequest()`.

**4. Split the modal's two-way binding.**
`[(visible)]="...showPartnersRequest"` cannot target a signal — Angular would overwrite the signal reference. Replace with `[visible]="showPartnersRequest()"` + `(visibleChange)="showPartnersRequest.set($event)"`. Close button `= false` → `.set(false)`.

**5. `findClassTenSeconds`** stays only if other call sites remain after this change; otherwise mark for removal in a follow-up (out of scope here to keep the diff tight).

## Risks / Trade-offs

- **Signal migration breaks `[(visible)]` and specs** → Mitigation: split the binding (Decision 4) and update every `*.spec.ts` that reads/writes `showPartnersRequest` (toBeTruthy on a signal is always true — must call `()`).
- **A global click listener feels broad** → Mitigation: it does almost nothing 99% of clicks (one `.closest` call outside the zone) and only acts on a match; far cheaper than N polling timers.
- **Missed trigger class** → Mitigation: the selector list is the union of all current trigger classes; verified all four only set `showPartnersRequest = true`.
- **Anchor with a real `href` accidentally matched** → Mitigation: the four trigger classes are distinct from the SharePoint `.open_route` link; `preventDefault` only fires on a trigger match.

## Migration Plan

1. Signal + binding split + delegation listener; remove the four polling blocks.
2. Update specs. Run Jest (keep 50/60/60/60).
3. Verify in-app: results-list (no console error), a partner select link, and an IPSR alert link all open the modal.
4. Rollback: revert the commit — isolated, frontend-only, no data/migration impact.

## Open Questions

- Create the Jira ticket number (separate from P2-2973) before commit — to embed in the commit message.
