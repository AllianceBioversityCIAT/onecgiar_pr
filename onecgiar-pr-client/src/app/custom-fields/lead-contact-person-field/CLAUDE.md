# lead-contact-person-field

**Verified:** 2026-09-02 · branch performance-refactor · P2-2911 AC2 (4th consumer added)

---

## What it is

The "Lead contact person" control: a free-text search over CGIAR AD that, when the user picks a
result from the dropdown, locks the name in and attaches the directory record. Shared by three
reporting surfaces, none of which own it.

## Contract

- `@Input() body` — **mutated in place.** The field writes `lead_contact_person` (display name) and
  `lead_contact_person_data` (the AD record) directly onto the consumer's payload object. There is
  **no `@Output()`**: assigning into `body` is the only way the field reports a selection back.
  `selectUser()` / `clearContact()` always set `lead_contact_person` **before**
  `lead_contact_person_data`, so a setter on the second key is the one deterministic point where both
  values are current — `section-general-info` relies on exactly that to fire its autosave.
- `@Input() required` — renders the mandatory marker only. It does not validate.
- `@Input() readOnly` — imposed from outside (P2-3520, form locked once the result leaves Editing).
  Distinct from `isContactLocked`, which is the field's own "a contact is already picked" state.
- `@Input() guidanceAsTooltip` — P2-3201, guidance as an ⓘ tooltip instead of the grey box.
- `queryCameFromHydration` — public on purpose: the consumer's save guard needs it (see Traps).
- Cross-component state lives on `UserSearchService` (`providedIn: 'root'`): `searchQuery`,
  `selectedUser`, `hasValidContact`, `showContactError`.
- Endpoint: `GET auth/users/search?q=` via `ResultsApiService.GET_adUsersSearch`, 500 ms debounce,
  **4+ characters** (`UserSearchService.searchUsers` is a second, 3-character entry point used by
  `search-user-select`).

## Where it is used

- `pages/results/.../rd-general-information/rd-general-information.component.html:49` — P22 + P25.
- `pages/ipsr/.../ipsr-general-information/ipsr-general-information.component.html:59`.
- `pages/bilateral/components/section-general-info/section-general-info.component.html:45` — autosaves
  through the getter/setter body described above.
- `pages/results/.../rd-contributors-and-partners/rd-contributors-and-partners.component.html:274`
  — P2-2911 AC2, **`[readOnly]="true"` display only.** That section's endpoint carries neither
  payload key, so it has no write path; the value is still entered and saved in General Information.
  See that folder's `CLAUDE.md` for the full reasoning.

## Traps (⚠️ = already broke something)

- ⚠️ **A stored name with no directory match is normal data, not an error.** The AD link
  (`result.lead_contact_person_id`) only exists from migration `1751462633282` (Jul-2026), so every
  older result stores the contact as free text, and results reported through the W3/Bilateral API
  name people outside CGIAR AD on purpose. `queryCameFromHydration` is the only way to tell that from
  a name the user typed and never picked. Both `onContactBlur()` and the consumer's save guard must
  check it — a guard that only looks at `searchQuery && !selectedUser` either blocks those results
  from ever saving, or (with the portfolio carve-out that used to paper over it) lets the save ship
  `lead_contact_person: null` and **wipes the stored name**. See `rd-general-information`'s
  `onSaveSection`.
- ⚠️ **Typing nulls both payload keys immediately** (`onSearchInput`). Anything downstream that reads
  `body.lead_contact_person` mid-typing sees `null`, and any save fired while the user is mid-search
  sends `null` — `createResultGeneralInformation` writes that straight through
  (`results.service.ts:901-902`, no informed-field check).
- `UserSearchService` is app-wide, so state leaks between results unless the consumer resets it;
  `section-general-info` does it in both `ngOnInit` and `ngOnDestroy`.
- `hasSelectedContact` counts a bare name as complete, but
  `rd-general-information.component.html:57` binds its own `appFeedbackValidation` to
  `lead_contact_person && lead_contact_person_data`. The two disagree for a free-text contact.
- `scheduleAutoClickIfSingleResult()` reaches into the document and clicks
  `.search-results .search-result-item` — a CSS class rename in the template silently disables the
  email auto-select.
- `changeDetection: Default` and `standalone: false` are deliberate; the field mutates plain objects
  the parent owns, which OnPush would not pick up.
- ⚠️ **`readOnly` disables the input but NOT the clear (✕) button**, so a read-only consumer can
  still have its `body` blanked by a click. Left as is on purpose: guarding it would change P2-3520
  behaviour for the three editable consumers.
- ⚠️ **`leadContactField` reads the `[general-info]-lead_contact_person` key** from
  `FieldsManagerService` regardless of which section renders the field, so the label, description and
  `required` flag come from that one entry for every consumer.

## Tests

Cypress CT only — `custom-fields/` is excluded from Jest coverage:
`npx cypress run --component --spec "src/app/custom-fields/lead-contact-person-field/*.cy.ts"`.
⚠️ 3 of the 16 `*.contract.cy.ts` cases fail on `performance-refactor` as of 2026-09-01 and did so
before any change here — they assert `field-card`'s `.fch_tag` / `fc-done`, not this field.
