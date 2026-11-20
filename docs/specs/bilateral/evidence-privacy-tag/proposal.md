# Proposal — Bilateral evidence: public / private tag per piece of evidence

> **In one line:** give each bilateral evidence item, links included, its own public/private answer. The answer is asked in the centre form, carried by both sync endpoints, and shown with the description in the Science Program review. Untagged evidence behaves exactly as today.

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | [P2-4110](https://cgiarmel.atlassian.net/browse/P2-4110) — *[Bilateral] Tag evidence as public or private* (Enhancement, Medium, Open) · epic P2-3094 |
| Spec Path | `bilateral/evidence-privacy-tag` |
| Slug | `evidence-privacy-tag` — derived from the Jira URL argument (the ticket summary), filed under the `bilateral/` module taxonomy |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Proposal status | **Approved** — Santiago Sanchez, 2026-11-19 ("approved, OQ-1 yes — go with your default") |
| Requirement source | Jira ticket via Atlassian MCP (description + 10 acceptance criteria; no comments, no attachments) |
| Visual source | None supplied |
| Date / Author | 2026-11-19 · Santiago Sanchez (with Claude) |
| Branch at proposal time | `qa-development-2026-ss` |

## 2. Intent

A Centre reports bilateral results with evidence that is sometimes confidential, such as a contract or a photo of a cheque. Today it can flag that only for an **uploaded file**, and the Science Program never sees the flag. The Centre needs to mark **each** piece of evidence public or private. The flag must survive the API round-trip, and the reviewing Science Program must see it so it handles that material as confidential.

## 3. Problem / Current Behavior

| # | Today | Citation |
|---|---|---|
| P1 | The public/private flag exists only on the SharePoint side table: `evidence_sharepoint.is_public_file`, tinyint, default 0. The `evidence` table has no such column, so a link has nowhere to store it. | `onecgiar-pr-server/src/api/results/evidences/entities/evidence-sharepoint.entity.ts:46-51`; `evidence.entity.ts` columns grep (no visibility column) |
| P2 | The centre form asks *"Can this evidence be shared publicly?"* only in the **Upload file** branch. The Link branch asks nothing. | `onecgiar-pr-client/src/app/pages/bilateral/components/section-evidence/section-evidence.component.html:139-176` (link block, then the question inside the upload branch) |
| P3 | The centre card shows the lock icon only for file evidence. | same file `:40-49` (`@if (isFileEvidence(evidence))`) |
| P4 | `POST /api/bilateral/create` → `EvidenceDto` has only `link` and `description`, with no tag field. It also **rejects file-storage links** (SharePoint, OneDrive, Drive, Dropbox), a breaking change from 2026-08-26. | `onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts:943-963`; `docs/bilateral-result-summaries.en.md:790` |
| P5 | The bilateral writer `handleEvidence` saves `link`, `description` and `evidence_type_id`, and writes no visibility. | `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:6259-6302` |
| P6 | The query endpoint returns the active MAIN `evidence_array` rows, which have no evidence-level visibility. The exact public shape is `UNVERIFIED — confirm at source before relying on it`: the contract doc lists `evidences[]` `{link, description}`. | `bilateral.service.ts:2147-2152`; `bilateral-result-summaries.en.md:113` |
| P7 | The review detail `GET /api/results/bilateral/:resultId` reads evidence through a SQL query that selects only `id, link, is_sharepoint`. It returns **no description and no visibility**. | `onecgiar-pr-server/src/api/results/result.repository.ts:3933-3946`, called from `results.service.ts:4188-4192` |
| P8 | The review drawer renders each evidence item as a bare clickable URL, with no tag and no description. | `onecgiar-pr-client/.../bilateral-review/components/result-review-drawer/result-review-drawer.component.html:598-611` |
| P9 | The AI quality-assessment payload treats every link as `visibility: 'public'`, and a file as private when `is_public_file` is 0. A private item gets `link: null`. | `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/evidence.mapper.ts:52-79` |

## 4. Proposed Outcome

- Every bilateral evidence item, link or file, carries **public / private / untagged**. Untagged means "as today", which is public.
- The centre form asks the question for links as well as files, and each card shows the lock state.
- `POST /api/bilateral/create` accepts an optional per-item tag and never rejects an item for missing it. The query endpoint returns the tag per item.
- The Science Program review shows, for each item, its URL (still clickable), its **description**, and a visible **Private** tag when private. PRMS never blocks the link; access is the source platform's job.
- Pool-funding evidence is unchanged.

## 5. Scope

| In | Surface |
|---|---|
| S1 | Storage: an evidence-level, nullable visibility value usable for links |
| S2 | Centre form `section-evidence`: question on the Link branch, plus lock icon for links on the card |
| S3 | `POST /api/bilateral/create` `EvidenceDto`: optional per-item tag; writer persists it |
| S4 | Bilateral query endpoint(s): tag per item in the response; contract doc change log updated (mandatory per root `CLAUDE.md`) |
| S5 | Review detail `GET /api/results/bilateral/:resultId`: return `description` + visibility per item |
| S6 | Review drawer: description + Private tag next to the URL |
| S7 | AI quality payload mapper: honour the link-level tag, so a private link is not sent to the AI (consistent with today's file rule, P9) |
| S8 | Evidence copied by bilateral siblings keeps its tag (see Requirement Delta, Siblings) |
| S9 | *(Amended 2026-11-19 at `/akili-specify` Phase 2, after the user's question.)* **The Fetcher** (`onecgiar_result_functions`) strips `is_public` on ingest and drops it on output. It is in scope as EVP-R-14 / EVP-T-10, with a separate PR in that repo |

## 6. Non-Goals

- Any change to pool-funding (W1/W2) evidence: `rd-evidences`, `evidence-item`, IPSR step 3 (AC 10).
- Controlling access at the file's source, or proxying or hiding links. PRMS does not block access (AC 6).
- Changing SharePoint upload/permission revocation logic for files (`evidences.service.ts:585-717`).
- Backfilling historical link rows: a null tag already means public.

## 7. Affected Users, Systems, And Specs

| Kind | Item |
|---|---|
| Personas | Result submitter (Centre), Science Program reviewer, bilateral/platform consumers (external platforms posting to `/api/bilateral/create` and reading results) |
| Server | `results/evidences` entity + migration, `bilateral/dto/create-bilateral.dto.ts`, `bilateral.service.ts` (`handleEvidence`, GET mapping), `results/result.repository.ts` + `results.service.ts` (review detail), `bilateral/services/quality-assessment/mappers/evidence.mapper.ts` |
| Client | `pages/bilateral/components/section-evidence/*`, `result-framework-reporting/.../result-review-drawer/*` |
| Contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (payload + change log) |
| Related specs | `changes/qa-evidence-link-scheme` (link normalisation in the same mapper), `bilateral/ai-draft-evidence-promotion` (copies evidence), `changes/bilateral-create-upsert-by-code` (evidence replace on upsert), `bilateral/qa-ai-traffic-light` (owner of `evidence.mapper.ts`) |
| Workflows | TRD `W*` for bilateral create / review, to be cited in `/akili-specify` |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: the UI change adds to two existing components: one more radio group in the existing modal, and a tag plus description line in the existing drawer row. The existing `ev_lock` icon in `section-evidence` and the drawer's Tailwind token row give the visual pattern. A mockup is optional: say so and I'll produce one before `/akili-specify`.

## 9. Requirement Delta Preview

### ADDED
- A1 — Per-item visibility stored on the evidence row, three-state: public / private / untagged (null).
- A2 — `EvidenceDto` gains an optional boolean, working name `is_public`. Absent or null → untagged, accepted (AC 2, 3).
- A3 — The query endpoint emits the per-item tag (AC 2).
- A4 — The review detail returns `description` + visibility. The drawer shows the description and a **Private** tag beside the URL (AC 5, 7).

### MODIFIED
- M1 — Centre form: *"Can this evidence be shared publicly?"* is asked for **Link** as well as **Upload file**, and is required to confirm the item (AC 1).
- M2 — Centre card: the lock icon shows for links too (AC 4).
- M3 — AI quality payload: a link tagged private → `visibility: 'private'`, `link: null`. Untagged links stay public (AC 8).
- M4 — File-storage links (SharePoint, OneDrive, Drive, Dropbox) are accepted **only when the item is tagged private**, in both `EvidenceDto` and the centre form (OQ-1, resolved). Public or untagged storage links are still rejected.

### REMOVED
- None.

### Siblings and downstream consumers (feed scope)
| Item | Why it matters |
|---|---|
| `handleEvidence` (`bilateral.service.ts:6259`) | The single bilateral writer for create, upsert and change-type, so it must persist the tag |
| `bilateral-resubmission.service.ts` (evidence reset/rewrite, `:919` note) | Resubmission rewrites evidence and must not drop the tag |
| `bilateral-ai/services/bilateral-ai-evidence-transfer.service.ts` | Promotes AI-draft evidence and already handles `is_public_file` for files |
| `evidence.mapper.ts` (AI payload) | Currently infers visibility only from SharePoint |
| Results Dashboard / platform-report exports of evidence links | `UNVERIFIED — confirm at source before relying on it`: whether a private link would now be published downstream. Owner: `/akili-specify` Phase 2 |

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. New nullable column `evidence.is_public`** (tinyint NULL) for bilateral evidence. For files it mirrors `evidence_sharepoint.is_public_file`, which stays the SharePoint permission source | Small additive migration. Null = today's behaviour, no backfill. Pool code never writes it | Two fields describe file visibility (kept in sync on bilateral writes) |
| B. Store link visibility by creating `evidence_sharepoint` rows for links | No migration | Misuses a table that means "file in our repository". Breaks every `is_sharepoint` assumption (mapper, revocation logic). Rejected |
| C. Move visibility to `evidence` for all flows, backfill from `evidence_sharepoint`, deprecate `is_public_file` | One source of truth | Touches pool funding (violates AC 10 / Non-Goals). Larger blast radius. Data migration |

## 11. Recommended Approach

**Option A.** It is the smallest safe path. One nullable column, written only by bilateral surfaces. Every read computes `visibility = evidence.is_public ?? (is_sharepoint ? is_public_file : true)`, so untagged and pool rows read exactly as today (AC 8, 10). File permission handling stays where it is, with no change to SharePoint revocation. Review and AI mapper changes are read-side only.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default |
|---|---|---|
| **OQ-1** (resolved) | The ticket says private files such as SharePoint ones will now be **sent**. But since 2026-08-26 the API and the centre form both **reject** file-storage links (P4, form `section-evidence.component.html:156-160`). Should a storage link be accepted when the item is tagged **private**? | **Resolved 2026-11-19 (Santiago Sanchez): yes.** Accept storage links only when tagged private, and keep rejecting them when public or untagged, in both the API and the centre form. This partly reverses the 2026-08-26 breaking change, so the contract change log must say so. M4 is now in scope |
| OQ-2 | API field name and type: `is_public: boolean` vs `visibility: 'public' \| 'private'` | `is_public` (boolean, optional), mirroring the form question and `is_public_file` |
| OQ-3 | The review drawer also lets admins **add** links (`result-review-drawer.component.html:583-596`). Should they be asked the question too? | Out of scope. Added links stay untagged (public) and the follow-up goes to the BA |
| OQ-4 | Should the AI quality assessment stop receiving private links? This is a new behaviour for links | Yes, consistent with today's file rule (P9) |
| R1 | Downstream exports (Results Dashboard, platform report) may publish a now-private link | Enumerate and decide in `/akili-specify` Phase 2 (Premise Ledger) |
| R2 | Payload contract change to a regulated, external surface | Additive and optional only. The change log entry is mandatory |
| R3 | Migration on the shared `evidence` table | Nullable, no default, no backfill. `migration:check:ci` gate |

Kaizen: no `docs/specs/kaizen-log.md` Active Lessons table found to apply.

## 13. Success Criteria

- All 10 ticket ACs pass. Each one maps to a requirement in `/akili-specify`.
- An API payload with 5 items (2 private, 3 untagged or public) round-trips: create → query returns the same per-item tags.
- An item without a tag is accepted (no 400), and every surface renders it exactly as today.
- The review drawer shows the description for every item and a Private tag only on private items. The URL stays clickable.
- Pool-funding evidence screens and endpoints have zero diffs.
- Server and client Jest gates are green, and `migration:check:ci` passes.

## 14. Next Step

Approved; OQ-1 resolved. Run:

```text
/akili-specify bilateral/evidence-privacy-tag
```
