# Requirements — Bilateral evidence: public / private tag per piece of evidence

## 1. Document Control

| Field | Value |
|---|---|
| Module | `bilateral` — evidence on the centre form, the bilateral API (`/api/bilateral/*`) and the Science Program review drawer |
| Spec Path | `bilateral/evidence-privacy-tag` |
| Type | Change |
| Deliverable | software |
| Depth | **Full**: payload contract change, migration on the shared `evidence` table, and a partial reversal of a documented breaking change |
| Approval Mode | gated |
| Ticket(s) | [P2-4110](https://cgiarmel.atlassian.net/browse/P2-4110) · epic P2-3094 |
| Requirement source | Jira P2-4110 (10 ACs, read via Atlassian MCP 2026-11-19) · `proposal.md` (approved by Santiago Sanchez, 2026-11-19) |
| Decisions carried in | OQ-1 **yes**: storage links accepted only when private (Santiago Sanchez, 2026-11-19). OQ-2/3/4 proposal defaults: field `is_public`; admin-added drawer links out of scope; private links withheld from the AI |
| Status | approved (Santiago Sanchez, 2026-11-19). EVP-R-14 (Fetcher) added at Phase 2 on the user's instruction |

## 2. Executive Summary

Each bilateral evidence item gets a **visibility**: public, private, or untagged. Untagged reads as public, which is today's behaviour.

- **Centre form:** asks *"Can this evidence be shared publicly?"* for links as well as files, and each card shows the answer.
- **Bilateral API:** accepts an optional `is_public` per item on create and returns it on every read. It never rejects an item for lacking it. A file-storage link (SharePoint, OneDrive, Google Drive, Dropbox) becomes acceptable **only** when the item is private.
- **Science Program review:** shows each item's URL (still clickable), its description, and a **Private** tag on private items.
- **AI quality check:** stops receiving private links.
- **Pool-funding evidence** is untouched.

## 3. Glossary

| Term | Meaning |
|---|---|
| Item | One active evidence row of type MAIN on a bilateral result |
| Visibility | The item's public/private answer. Three states: **public**, **private**, **untagged** (no answer recorded) |
| Effective visibility | What every reader acts on. Private when the item is private. Public when it is public **or untagged** |
| Link item / file item | Evidence given as a URL / evidence uploaded to the PRMS SharePoint repository (`is_sharepoint = 1`) |
| Storage link | A URL on SharePoint, OneDrive, Google Drive or Dropbox, as matched by the existing storage-link rule (`cloud-storage-link.constant.ts`) |
| Bilateral result | A result created through the bilateral flow: centre form or `POST /api/bilateral/create` (W3/API source) |
| Pool-funding evidence | Evidence on W1/W2 results, IPSR included |

## 4. System Context & Scope

**Today:**

| # | Behaviour | Citation |
|---|---|---|
| C1 | Visibility exists only for file items, as `evidence_sharepoint.is_public_file` (tinyint, default 0). The `evidence` row has no visibility column | `onecgiar-pr-server/src/api/results/evidences/entities/evidence-sharepoint.entity.ts:46-51` |
| C2 | The centre form asks the visibility question only in the Upload-file branch. Switching to Link clears it to `null` | `section-evidence.component.ts:317-319` (`setDraftLinkMode`), template `section-evidence.component.html:168-176` |
| C3 | The centre form saves through the **shared** pool endpoint `POST /api/results/evidences/create/:resultId` | `onecgiar-pr-client/src/app/shared/services/api/bilateral-api.service.ts:225-226`; `onecgiar-pr-server/src/api/results/evidences/evidences.controller.ts:27` |
| C4 | The centre form refuses storage links for link items, client-side only | `section-evidence.component.ts:296-307` (`draftLinkError`), `:175` (`hasValidLink`) |
| C5 | `POST /api/bilateral/create` `EvidenceDto` carries only `link` and `description`, and refuses storage links via `@IsNotCloudStorageLink()` | `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts:943-963` |
| C6 | The bilateral writer `handleEvidence` stores `link`, `description` and type, but no visibility | `bilateral.service.ts:6259-6302` |
| C7 | `GET /api/bilateral`, `/list`, `/results`, `/:id` and the create response all return raw `evidence_array` rows with `evidenceSharepointArray`, through `buildResultRelations` → `filterActiveRelations` | `bilateral.service.ts:937-960, 970-986, 1138-1172, 1208-1268, 1294-1327, 2122-2152` |
| C8 | The review detail `GET /api/results/bilateral/:resultId` selects only `id, link, is_sharepoint` per evidence | `onecgiar-pr-server/src/api/results/result.repository.ts:3933-3946` |
| C9 | The review drawer renders each item as a bare URL link, with no description and no tag | `result-review-drawer.component.html:598-611` |
| C10 | The AI quality payload marks every link item `public`. A file item is private when `is_public_file` is falsy, and a private item is sent with `link: null` | `bilateral/services/quality-assessment/mappers/evidence.mapper.ts:52-79` |
| C11 | The contract doc lists a slim `evidences[]` `{link, description}`, but no server mapper produces that key in `api/bilateral`. Command: `grep -rn "evidences\s*:" api/bilateral api/platform-report api/results-framework-reporting` returned 0 non-spec hits. The slim key is produced by the **Fetcher**'s `EvidencesMapper` (C12) | `bilateral-result-summaries.en.md:109-113` |
| C12 | The **Fetcher** (repo `onecgiar_result_functions`, `314f3f2`) sits in front of `POST /api/bilateral/create` for most platforms, and it drops anything it doesn't know. Its `evidence` item schema declares only `link`/`description` with `additionalProperties: false`, and AJV runs with `removeAdditional: true`, so an `is_public` sent through it is **silently stripped**. Its output `EvidencesMapper` copies only `link`/`description` from PRMS's `evidence_array`. Its normalizer does not touch evidence | `services/fetcher/src/validator/schemas/common_fields.json:334-346`; `services/fetcher/src/validator/ajv.js:6`; `services/fetcher/src/mappers/response-result.mjs:428-443, 690`; `grep -ci evidence services/fetcher/src/normalizer.mjs` → 0 |

### In scope

- Per-item visibility storage for bilateral link items, and its exposure on all bilateral reads.
- The centre form question and card indicator for link items.
- `POST /api/bilateral/create`: optional `is_public`, untagged accepted, storage links allowed only when private.
- The centre form: storage links allowed only when private.
- The review detail and review drawer: description, plus the Private tag next to the URL.
- The AI quality payload honouring link visibility.
- Bilateral paths that copy or rewrite evidence keep its visibility.
- The contract doc and its change log.
- **The Fetcher** (`onecgiar_result_functions`): accepting `is_public` per evidence item on ingest and returning it on output (EVP-R-14). Separate PR in that repo.

### Out of scope

- Pool-funding evidence: W1/W2 `rd-evidences` / `evidence-item`, IPSR step 3, and their endpoints' observable behaviour.
- Controlling or proxying access to the file at its source.
- SharePoint permission handling for file items (`evidences.service.ts:585-717`).
- Admin "Add Evidence Link" inside the review drawer. Those items stay untagged.
- Backfill of existing rows.
- Results Dashboard / external readers. Identified as risk EVP-RISK-1, not changed here.

## 5. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Result submitter (Centre) | Answers public/private for every item, links included, and sees the answer on each card. May now add a private storage link |
| Science Program reviewer | Sees the description and a Private tag next to each private item's URL. The link still opens |
| Bilateral producers (external platforms) | May send `is_public` per item, and private storage links. Nothing they send today breaks |
| Bilateral consumers (readers of `/api/bilateral/*`) | Receive per-item visibility. Additive |
| PMU / platform admin | No change |

User stories (refine PRD US for bilateral reporting and QA review):

- **EVP-US-1:** As a Centre reporting a bilateral result, I want to mark each piece of evidence public or private, so that the reviewing Science Program knows which material is confidential.
- **EVP-US-2:** As a Science Program reviewer, I want to see which evidence is private and what each item is, so that I handle confidential material correctly and know whom to contact when I cannot open it.
- **EVP-US-3:** As an external platform, I want to send private evidence marked as such, so that I no longer have to withhold it.

## 6. Functional Requirements

### EVP-R-1 — Three-state visibility per item *(ticket AC 2, 3, 8)*

Every bilateral evidence item MUST hold a visibility of public, private or untagged, independently of the other items of the same result. Untagged MUST be read as public everywhere (effective visibility).

#### Scenario: Mixed visibilities on one result

- GIVEN a bilateral result with five items: two private, two public, one untagged
- WHEN the result is read by any surface in scope
- THEN the two private items read private and the other three read public
- BUT the visibility of one item must NOT change any other item's visibility

#### Scenario: Legacy item

- GIVEN a bilateral link item stored before this change
- WHEN it is read
- THEN its effective visibility is public
- AND IT MUST render exactly as it does today

### EVP-R-2 — Centre form asks for link items *(ticket AC 1)*

When the source is **Link**, the centre form MUST ask *"Can this evidence be shared publicly?"* with the same options and the same required behaviour as for **Upload file**. An item MUST NOT be confirmed without an answer.

#### Scenario: Link without answer

- GIVEN the Add Evidence modal with source Link and a valid URL
- WHEN the user has not answered the public question
- THEN the confirm action is disabled
- AND IT MUST become enabled once Yes or No is chosen

#### Scenario: Switching source

- GIVEN a draft with source Upload file and the answer "No"
- WHEN the user switches the source to Link
- THEN the answer is cleared and must be given again
- BUT it must NOT carry a file-only answer into the link item silently

#### Scenario: Editing a legacy untagged link

- GIVEN an untagged link item opened with Edit
- WHEN the modal opens
- THEN the question shows no answer selected
- AND IT MUST require one before the edit can be confirmed

### EVP-R-3 — Centre form persists and shows link visibility *(ticket AC 4, 9)*

The answer given for a link item MUST be saved with the item and shown on its card with the same lock indicator used for file items: open lock = public, closed lock = private. An untagged item MUST show no lock. The reporting Centre MUST keep full access to every item, private included. Nothing about the link or its clickability changes for the Centre.

#### Scenario: Round trip on the form

- GIVEN the user adds a link item answered "No"
- WHEN the section is saved and the page reloaded
- THEN the card shows the closed-lock "Private" indicator
- AND the link stays clickable for the Centre

### EVP-R-4 — Storage links allowed only when private *(OQ-1)*

A storage link MUST be accepted as a link item **only** when its visibility is private. This applies on the centre form and on `POST /api/bilateral/create`. A storage link whose visibility is public or untagged MUST keep today's refusal and today's message.

#### Scenario: API, private storage link

- GIVEN a `POST /api/bilateral/create` payload with one evidence item, link `https://cgiar.sharepoint.com/...`, `is_public: false`
- WHEN the payload is validated
- THEN the item is accepted and stored as a private link item

#### Scenario: API, untagged storage link

- GIVEN the same link with `is_public` absent
- WHEN the payload is validated
- THEN the request is refused with 400 and today's file-storage message
- AND IT MUST be refused before the first write (today's ordering)

#### Scenario: Form, storage link answered Yes

- GIVEN source Link with a SharePoint URL
- WHEN the user answers "Yes" (public)
- THEN the storage-link error shows and confirm is disabled
- BUT when the user answers "No" the error MUST clear and confirm MUST enable

### EVP-R-5 — API accepts the tag per item, never requires it *(ticket AC 2, 3)*

`POST /api/bilateral/create` MUST accept an optional boolean `is_public` on each `evidence[]` item and store it as that item's visibility. `true` → public, `false` → private, absent or `null` → untagged. A non-boolean value MUST be refused with 400. An item MUST NOT be refused for lacking `is_public`.

#### Scenario: Untagged accepted

- GIVEN a payload identical to one accepted today, with no `is_public` anywhere
- WHEN it is posted
- THEN the response status and the stored evidence equal today's
- AND each stored item is untagged

#### Scenario: Wrong type

- GIVEN an item with `is_public: "no"`
- WHEN it is posted
- THEN the request is refused with 400 naming `is_public`

### EVP-R-6 — API returns the tag per item *(ticket AC 2)*

Every bilateral read (`GET /api/bilateral`, `/list`, `/results`, `/:id`, and the create response) MUST expose each evidence item's visibility in that item. Untagged MUST be distinguishable from public in the payload. The change MUST be additive: no existing key is removed or renamed.

#### Scenario: Query after create

- GIVEN a result created with items tagged `false`, `true` and absent
- WHEN it is read through `GET /api/bilateral/results`
- THEN its three items carry private, public and untagged respectively

### EVP-R-7 — Review shows the Private tag next to the URL *(ticket AC 5, 6)*

In the Science Program review drawer, each item whose effective visibility is private MUST show a visible tag reading **Private** next to its URL. The URL MUST stay visible and clickable, opening in a new tab, exactly as today. Public and untagged items MUST NOT show the tag.

#### Scenario: Private item in review

- GIVEN a result under review with one private link item and one public file item
- WHEN the reviewer opens the drawer
- THEN the private item shows its URL as a clickable link with the Private tag beside it
- AND the public item shows its URL with no tag
- BUT PRMS must NOT hide, disable, proxy or rewrite either URL

#### Scenario: Private file item

- GIVEN a file item with `is_public_file = 0`
- WHEN it is shown in the review drawer
- THEN it carries the Private tag (effective visibility of a file item follows its file answer)

### EVP-R-8 — Review shows each item's description *(ticket AC 7)*

The review drawer MUST show the description stored with each item, under or beside its URL. An item without a description MUST render no empty description line.

#### Scenario: Description shown

- GIVEN an item with description "Signed contract with partner X"
- WHEN the reviewer opens the drawer
- THEN that text is visible on the item's row

### EVP-R-9 — Private explanation for the reviewer *(ticket §3)*

The Private tag SHOULD carry a short explanation, as a tooltip or accessible description: *"Private evidence: handle as confidential and do not share. If you cannot open it, contact the Centre that reported the result."*

### EVP-R-10 — AI quality payload withholds private links *(OQ-4)*

The AI quality payload MUST mark every item by effective visibility, links included, and MUST send `link: null` for every private item. Public and untagged link items MUST be sent exactly as today.

#### Scenario: Private link withheld

- GIVEN a link item tagged private
- WHEN the quality payload is built
- THEN the item has `visibility: 'private'` and `link: null`
- AND its description is still sent

### EVP-R-11 — Visibility survives bilateral copies and rewrites

Every bilateral path that rewrites or copies evidence MUST carry each item's visibility unchanged: create/upsert, resubmission, change-type, and AI-draft promotion. The exception is a path whose input supplies a new value.

#### Scenario: Resubmission with no tag

- GIVEN a result whose item is private, resubmitted through `POST /api/bilateral/create` with the same link and `is_public` absent
- WHEN the evidence is rewritten
- THEN the item is stored untagged, because the payload is the source of truth on rewrite (today's replace rule, `bilateral-result-summaries.en.md:660`)
- AND IT MUST be documented in the contract as such

### EVP-R-12 — Pool funding untouched *(ticket AC 10)*

Pool-funding evidence MUST behave exactly as today on every screen and endpoint. That means:

- no visibility question for W1/W2 or IPSR link items;
- no change to their stored rows beyond the new column staying empty;
- no change in any pool response other than the new column appearing as null.

#### Scenario: Pool link save

- GIVEN a W1/W2 result's evidence section
- WHEN a link item is saved through `POST /api/results/evidences/create/:resultId`
- THEN the stored row's visibility is untagged
- AND the pool UI renders exactly as before

### EVP-R-13 — Contract documentation

`onecgiar-pr-server/docs/bilateral-result-summaries.en.md` MUST document the per-item visibility on input and output, the storage-link exception, and the rewrite rule (EVP-R-11), with a dated change-log entry referencing P2-4110. The entry MUST state that it partially reverses the 2026-08-26 entry.

### EVP-R-14 — The tag travels through the Fetcher *(ticket AC 2, 3)*

The Fetcher MUST forward `is_public` on each `evidence[]` item to `POST /api/bilateral/create`, and MUST return `is_public` on each item of its own evidence output. It MUST accept an item without `is_public`, unchanged from today, and MUST refuse a non-boolean `is_public` with its existing validation error shape.

#### Scenario: Private item through the Fetcher

- GIVEN a platform sends a result through the Fetcher with one evidence item carrying `is_public: false`
- WHEN the Fetcher validates and forwards it
- THEN the payload reaching PRMS carries `is_public: false` on that item
- BUT the Fetcher must NOT strip it (today's `removeAdditional` behaviour)

#### Scenario: Fetcher output

- GIVEN a PRMS result whose `evidence_array` has items with `is_public` `false`, `true` and `null`
- WHEN the Fetcher maps it to its response
- THEN each mapped evidence item carries the same `is_public` value

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Additive only on `/api/bilateral/*` (PRD AC-4). Every payload accepted on the current `staging` head is still accepted with the same status code. No key removed or renamed |
| Data | One nullable column, no default value, no backfill. `npm run migration:check:ci` passes. Migration reversible (`down` drops the column) |
| Security / privacy | A private item's link MUST NOT be added to any log line, AI payload, or new export introduced by this change. No secret or token is logged (`.cursorrules`) |
| Access | PRMS performs no access control on evidence URLs. Access remains the source platform's |
| Performance | The review-detail query keeps one round-trip for evidence. No N+1 per item |
| Accessibility | The Private tag has text, not colour or icon alone. It meets WCAG 2.1 AA contrast with design tokens from `docs/ux-ui/design.md` §7 |
| Observability | No new log lines beyond existing patterns. Validation refusals keep today's error shape |

## 8. Acceptance Criteria → Defect Classes and Gates

### Ticket AC traceability

| Ticket AC | Requirement(s) |
|---|---|
| 1 | EVP-R-2 |
| 2 | EVP-R-1, EVP-R-5, EVP-R-6, EVP-R-14 |
| 3 | EVP-R-1, EVP-R-5, EVP-R-14 |
| 4 | EVP-R-3 |
| 5 | EVP-R-7 |
| 6 | EVP-R-7 |
| 7 | EVP-R-8 |
| 8 | EVP-R-1, EVP-R-10 |
| 9 | EVP-R-3 |
| 10 | EVP-R-12 |

### Defect classes this spec can produce

| # | Defect class | Gate that catches it |
|---|---|---|
| D1 | Contract drift: tag not stored, not returned, or a key renamed or removed | Server Jest on `EvidenceDto` validation, `handleEvidence`, and the bilateral read projection (`npx jest --silent --reporters=summary --forceExit`) |
| D2 | Untagged payload refused (a breaking change) | Server Jest DTO spec with today's accepted fixtures |
| D3 | Storage-link rule wrong in either direction (public storage link accepted, or private one refused) | Server DTO spec over the full storage-link host list. Client Jest on `draftLinkError` / `isDraftValid` with both answers |
| D4 | Private link leaked to the AI | Server Jest on `evidence.mapper.ts` |
| D5 | Pool regression via the shared endpoint or shared entity | Existing pool suites (`evidences.service*.spec.ts`, `evidence-item` component spec) stay green, plus a new spec that a pool save leaves visibility null |
| D6 | Migration drift or irreversible migration | `npm run migration:check:ci`, plus the `down` reviewed |
| D7 | Review drawer missing the tag or description, or tag on the wrong item | Client Jest component spec on the drawer's rendered DOM per item |
| D8 | Type/compile errors that Jest misses (type-only imports erased) | `npx tsc --noEmit -p tsconfig.json` (server) and `npx ng build` or the type-check (client) |
| D9 | Tag visually clipped, unreadable or off-token in the drawer row (layout) | **No automated check.** Substitute: human visual check at the `/akili-validate` HITL pause on a running stack, at desktop and ≤640px width |
| D10 | Visibility lost on resubmission, change-type or AI-draft promotion | Server Jest on each path (EVP-R-11) |
| D11 | A downstream reader outside this repo (Results Dashboard) publishes a private link | **No check in this repo.** Accepted risk EVP-RISK-1, owner: PO/BA notification at handoff |
| D12 | The Fetcher strips `is_public` on ingest or drops it on output | Fetcher test suite in `onecgiar_result_functions` (`services/fetcher`) over the AJV validator and `EvidencesMapper`, run in that repo |
| D13 | Deploy order: the Fetcher forwards `is_public` before PRMS accepts it | No runtime harm: PRMS `whitelist: true` drops the unknown field and the item is stored untagged. Gate: the deploy-order note in `tasks.md` (PRMS server first) |

## 9. Dependencies & Assumptions

### Upstream

- `results/evidences` module (entity, shared create endpoint, `EvidencesService`).
- The storage-link rule (`shared/constants/cloud-storage-link.constant.ts`) and its client mirror (`CLOUD_REGEX`).

### Downstream consumers

- External readers of `/api/bilateral/*`, the **Fetcher** first among them (C12, EVP-R-14).
- The AI quality service (via `evidence.mapper.ts`).
- Review drawer and centre form.
- Results Dashboard / platform report: `UNVERIFIED — confirm at source before relying on it` (EVP-RISK-1).

### Assumptions

- A file item's visibility keeps living in `evidence_sharepoint.is_public_file` as the SharePoint permission source. Effective visibility of a file item derives from it.
- The admin-added drawer links (OQ-3) are rare and stay untagged, which means public.

## 10. Open Questions

| ID | Question | State |
|---|---|---|
| EVP-OQ-1 | Storage links when private? | **Closed:** yes (proposal OQ-1) |
| EVP-OQ-2 | API field name | **Closed:** `is_public`, optional boolean (proposal default) |
| EVP-OQ-3 | Drawer admin-added links | **Closed:** out of scope (proposal default) |
| EVP-OQ-4 | AI withholds private links | **Closed:** yes (proposal default) |

| Risk | Note |
|---|---|
| **EVP-RISK-1** | Results Dashboard and other external readers may publish a private link now that private items flow. Not changeable in this repo. The handoff note to the PO/BA must say so |

## 11. Out-of-Band Notes

- Migration lands before any code that writes the column (`tasks.md` ordering).
- Cross-references: PRD AC-4 (bilateral stability), AC-6 (evidence). UX: the bilateral centre form evidence section and the bilateral review drawer (`docs/ux-ui/design.md`). TRD: `results/evidences`, `bilateral` modules.
