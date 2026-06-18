## 1. Signal-backed visibility flag

- [x] 1.1 In `data-control.service.ts`, change `showPartnersRequest: boolean = false` to `showPartnersRequest = signal(false)` (WritableSignal<boolean>).
- [x] 1.2 Update all writers across the app from `= true/false` to `.set(true/false)` (the addEventListener writers were removed with their blocks; `step-n4-add-partner.openPartner()` + `partners-request` close use `.set`).

## 2. Modal template binding (gotcha)

- [x] 2.1 In `partners-request.component.html`, split `[(visible)]` into `[visible]="...showPartnersRequest()"` + `(visibleChange)="...showPartnersRequest.set($event)"`.
- [x] 2.2 Change the close button + the two `.ts` writers to `.set(false)`.

## 3. Global click delegation in the shell

- [x] 3.1 In `app.component.ts`, inject `NgZone` + `Renderer2`; implement `OnDestroy`.
- [x] 3.2 Register ONE document click listener via `ngZone.runOutsideAngular`; resolve `(event.target).closest('.pSelectP, .alert-event, .alert-event-2, .alert-event-3, #partnerRequest')`.
- [x] 3.3 On match: `event.preventDefault()` + `ngZone.run(() => showPartnersRequest.set(true))`.
- [x] 3.4 Store the disposer; remove it in `ngOnDestroy`.
- [x] 3.5 Remove the old `findClassTenSeconds('pSelectP')` + addEventListener block from `app.component.ts`.

## 4. Remove the duplicated polling blocks (scope grew to 9 components)

- [x] 4.1 ipsr-contributors: `requestEvent()` → no-op.
- [x] 4.2 step-n4: removed inline block.
- [x] 4.3 step-n1: `requestEvent()` → no-op.
- [x] 4.4 cap-dev-info: `requestEvent()` → no-op.
- [x] 4.5 policy-change-info: removed inline block.
- [x] 4.6 rd-partners: removed inline `querySelectorAll().forEach` block.
- [x] 4.7 rd-contributors-and-partners: removed inline `querySelectorAll().forEach` block.
- [x] 4.8 rd-general-information: removed `#partnerRequest` block + `requestEvent()` → no-op.
- [x] 4.9 `findClassTenSeconds` left in place (still referenced by spec mocks); flagged for a follow-up removal.

## 5. Tests

- [x] 5.1 Updated specs reading `showPartnersRequest` to `showPartnersRequest()`.
- [x] 5.2 Updated spec mocks (`showPartnersRequest: signal(false)`) and writers to `.set(...)`.
- [x] 5.3 Added `app.component.spec.ts` tests: clicking `.pSelectP` / `.alert-event` child opens modal; non-trigger click does not.
- [x] 5.4 Ran the 11 affected suites: **265 passed**. Coverage preserved (moved-behavior tests rewritten, not deleted).

## 6. Verify in the browser (manual — pending Yeck)

- [ ] 6.1 `npm start`; navigate to `/result/results-outlet/results-list` → confirm NO `addEventListener` TypeError in console.
- [ ] 6.2 Open a partner select field, click the embedded "request" link → partners-request modal opens.
- [ ] 6.3 Open an IPSR section with an `.alert-event*` link → modal opens; close button hides it.
