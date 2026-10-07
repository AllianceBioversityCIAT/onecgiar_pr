# Proposal — Bilateral project codes (wrong owner "ABC", empty `external_code`, missing in API)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/bilateral-project-codes/` |
| Slug | `bilateral-project-codes` — derived from free-text argument (ticket PDF + "son 3 puntos que debemos de corregir") |
| Type | **Bug** (points 1–2: data defects) with one **additive API change** (point 3) |
| Source | Ticket **#INC-164536** — Manuel Ricardo Almanzar (Alliance BI), 5-Oct-2026, due 12-Oct-2026. PDF: `Alliance IT Support API.pdf` |
| Approval Mode | `gated` · proposal approved by Santiago 2026-10-06 ("de ahí pasamos al specify") |
| Parent Spec | none |
| Depends on | none (point 3 code is independent; its value for 2025 depends on point 2 data) |
| Parallel-safe | yes — touches only `bilateral.service.ts` `buildBilateralProjectsSummary` + the payload doc |
| Baseline cited | PRD `AC-4` (bilateral payload stability, additive only), `AC-9` (secrets) · server `CLAUDE.md` §8 · `bilateral-result-summaries.en.md` change log |
| Author / date | Santiago Sánchez (with Claude), 2026-10-06 · rev. 2 same day (open questions answered, scope measured on PRMS prod) |

## 2. Intent

The Alliance BI team reads PRMS bilateral results through the Normalizer and cannot link them to their Agresso projects: 2025 projects show the wrong owner institution, many have no `external_code`, and the API never returns `external_code` anyway.

## 3. Problem / Current Behavior

| # | Ticket point | What they see |
|---|---|---|
| 1 | Wrong institution on 2025 Clarisa Projects | Rows like ids 185, 192, 207, 214–216, 220, 228, 233, 235, 241, 265 have `organization_code = 1353` → institution **"Astha Beej Pvt Ltd"**, acronym **ABC**. They are Alliance projects. |
| 2 | Empty `external_code` | Many 2025 projects have `external_code = NULL`; it should hold the Alliance **Agresso project ID**. They attached a mapping file (project → external code). |
| 3 | `external_code` not in the results API | `bilateral_projects[]` returns only `{ short_name, organization_code }`. They need `{ short_name, organization_code, external_code }` for 2025, 2026 and onward. |

## 4. Proposed Outcome

- 2025 Alliance projects point at the correct Alliance institution, and the correction **survives the CLARISA sync**.
- Alliance projects carry their Agresso ID in `external_code`, also surviving the sync.
- Every bilateral read that returns `bilateral_projects[]` also returns `external_code` (null when unknown), for any phase.

## 5. Scope

| In | Out |
|---|---|
| Point 3 code change in `buildBilateralProjectsSummary` + spec + payload-doc change log | Renaming `organization_code` (it actually carries the institution **acronym** — see §9) |
| Point 1: the **12** phase-2025 projects on 1353 → institution **49** (Bioversity (Alliance), CENTER-02), executed in CLARISA by Santiago | Changing the CLARISA ↔ W3 Registry matching logic (`findInstitution`) |
| Point 2: `external_code` for the **Alliance** phase-2025 projects only (the 12 above + 20 already on institution 49 = up to 32), from Alliance's mapping file, executed in CLARISA | The other ~266 phase-2025 projects without `external_code` (IFPRI 51, ICARDA 44, IITA 33, IRRI 30, …) — they belong to other centres and no mapping exists for them |
| Pre-check + verification SQL (before/after, two syncs) | The 1 phase-2025 project with `organization_code = NULL` |

## 6. Non-Goals

- No change to `POST /create` ingestion or to how `grant_title` resolves.
- No PRMS-only `UPDATE` on `clarisa_projects` as the final fix (it would be reverted — see §9).
- No change to the Normalizer itself (external); it only needs the new field to pass through.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Alliance BI (Normalizer consumer) | Gets correct owner + new `external_code` |
| `onecgiar-pr-server/src/api/bilateral/bilateral.service.ts:2123` `buildBilateralProjectsSummary` | Add one field |
| `bilateral.service.ts:3810` `enrichBilateralResultResponse` — 5 callers (619, 831, 857, 1043, 1139) | All get the field automatically |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | `bilateral_projects[]` row + change log |
| CLARISA `project` table (source of truth) | Points 1–2 data fix |
| PRMS consumers of `organization_code`: CENTER-02 project picker, owner-centre derivation (P2-3793), result-tagged notifications, QA contributors mapper, AoW bilateral repo | Fixing point 1 moves these 12 projects from "no centre" (1353 is not a centre) to CENTER-02 — see §12 for why the effect is contained |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: backend/data change only; no UI surface.

## 9. Bug Diagnosis

### Observed Symptom
See §3. Screenshot query in the ticket: `clarisa_projects cp JOIN clarisa_institutions ci ON ci.id = cp.organization_code` → 1353 / "Astha Beej Pyt Ltd" / ABC; API response shows `"organization_code": "ABC"`.

### Reproduction Steps
1. `GET` a bilateral result (e.g. result code 28527, year 2025, centre Bioversity/CIAT (Alliance)).
2. Inspect `bilateral_projects[]` → `organization_code: "ABC"`, no `external_code`.
3. In PRMS DB: `clarisa_projects` rows of phase 2025 with `organization_code = 1353` and `external_code IS NULL`.

### Root Cause (confirmed in PRMS code)

| # | Cause | Evidence |
|---|---|---|
| 1 | PRMS **copies `organization_code` verbatim from CLARISA** on every sync (`update()` on existing rows). The value 1353 is therefore what CLARISA holds. Measured on PRMS prod (2026-10-06): **exactly 12 rows** (185, 192, 207, 214, 215, 216, 220, 228, 233, 235, 241, 265), all `phase = 2025`, all `external_code` and `source_center_acronym` NULL → they are **CLARISA-native legacy rows, not W3 Registry rows**, so no registry sync re-derives their owner and a fix in CLARISA's `project` table stays put. Most likely origin: the legacy Alliance acronym **"ABC"** collided with institution 1353's acronym (Astha Beej Pvt Ltd, also "ABC") when the rows were loaded. The collision mechanism is unverified, but that doesn't block the fix. | `clarisa-endpoints.enum.ts:646` (`organizationCode: item.organization_code ?? null`), `clarisatask.service.ts:694-697`; `w3-center-alias.constants.ts:67-73` already documents "ABC" as a legacy Alliance spelling |
| 2 | 2025 rows are **pre-registry legacy CLARISA data**; `external_code` was only added on 2026 (migration `1786980549228`, backfilling `phase = 2025` but not codes). The W3 Registry fills it for new rows only. Mapper writes `external_code` whenever CLARISA **sends the key**, even as `null` → a PRMS-only fill would be wiped by the next sync if CLARISA sends `null`. | `1786980549228-AddW3RegistryFieldsToClarisaProjects.ts:19-30`, `clarisa-endpoints.enum.ts:670-672` |
| 3 | `buildBilateralProjectsSummary` maps only `shortName` and `obj_organization.acronym` (exposed as `organization_code`). `externalCode` is on the entity but never selected into the payload. | `bilateral.service.ts:2141-2150` |

### Impact & Scope
- Any consumer joining `clarisa_projects.organization_code` mis-attributes these 12 projects: they show "ABC" and belong to no centre (1353 is not a CGIAR centre), so the CENTER-02 picker never offers them.
- Missing `external_code` is widespread for phase 2025 (~298 rows across 13 institutions), but only the Alliance's 32 are in scope.
- Point 3 is additive → no consumer breaks (`AC-4`).
- 🛑 **Security (`AC-9`):** the ticket's screenshot shows a full `x-api-key` value in clear text. Santiago will tell the reporter so the owner can rotate it. The key must not be copied into this spec or any commit.

### Fix Strategy

| # | Fix | Route |
|---|---|---|
| 3 | Add `external_code: p.externalCode ?? null` to `buildBilateralProjectsSummary`; update its return type, the fixture/spec test (red → green), and the payload-doc change log. ~10 lines. | `/akili-specify` (Lite, Bug Mode) → `/akili-execute` |
| 1 | Run the §12 pre-check, then set the 12 rows to institution **49** **in CLARISA**; let the PRMS sync pull it; verify in PRMS across two syncs. | Data op, Santiago in CLARISA |
| 2 | Load the Agresso codes from the Alliance mapping file **in CLARISA** (Alliance rows only); verify in PRMS across two syncs. | Data op, Santiago in CLARISA |

## 10. Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Fix at source (CLARISA) + additive API field** | Points 1–2 in CLARISA DB; point 3 in PRMS code | Single source of truth; survives every sync; every CLARISA consumer gets correct data | Needs CLARISA DB access / owner coordination |
| B. PRMS-only `UPDATE` on `clarisa_projects` + API field | Patch PRMS table directly | Fast, what the ticket literally asks | **Reverted by the next CLARISA sync** (org code always; external code if CLARISA sends `null`) — silent regression within hours |
| C. PRMS override columns (`*_override`) honoured by the sync | New migration + sync merge logic | Survives sync without touching CLARISA | New schema + logic for a data problem; diverges PRMS from CLARISA |

## 11. Recommended Approach

**Option A.** It is the smallest *durable* fix: the only code change is one additive field (point 3), and points 1–2 are corrected where the data lives, so the 8-hourly sync carries them into PRMS instead of undoing them. Point 3 can ship immediately; it returns `null` for 2025 until point 2's data lands, then fills itself.

## 12. Risks, Dependencies, And Open Questions

| Kind | Item |
|---|---|
| ✅ Resolved | Target institution → **CENTER-02, Bioversity (Alliance), institution 49** (Santiago, 2026-10-06). |
| ✅ Resolved | CLARISA data changes → **Santiago applies them himself**. |
| ✅ Resolved | Exposed `x-api-key` → Santiago will tell the reporter to have it rotated. |
| ❓ Open | **The mapping file** isn't in the PDF; it has to be requested from Manuel. Point 2 is blocked until it arrives. Point 3 is not. |
| ⚠️ Risk | `organization_code` in the payload is really an **acronym**. After point 1 it reads `"Bioversity (Alliance)"` instead of `"ABC"`; this goes in the payload-doc change log and the reply to the reporter. |

### Point 1 side effect — why it is contained, and how to keep it at zero

Moving the 12 projects from 1353 to 49 is the intended correction. These are all the places in PRMS that read it:

| Consumer | When it acts | Effect after the fix |
|---|---|---|
| CENTER-02 project picker (`getProjectsByCenter`) | Every read, **scoped to the reporting phase** | The 12 appear only when reporting phase **2025**. They are absent from the 2026 picker. This is the desired effect. |
| Owner-centre derivation (P2-3793) | **Only on a save / ingest** that carries `contributing_bilateral_projects`, not retroactive | Adds CENTER-02 as a contributing centre, **unless CENTER-02 is the lead**. It never deactivates anything. |
| Result-tagged notifications | **Only on a new tagging event**, not retroactive | A future tagging notifies CENTER-02 instead of nobody |
| Bilateral read payload / QA mapper / AoW repo | Every read | Show "Bioversity (Alliance)" instead of "ABC". This is the requested correction. |

There is **no batch job and no retroactive rewrite**. Nothing changes on existing results until someone re-saves one. To guarantee a **zero** side effect, run this pre-check before touching CLARISA. If every linked result is led by CENTER-02, the derivation is a no-op even on re-save:

```sql
SELECT rbp.project_id, r.result_code, r.version_id, r.status_id, rc.center_id AS lead_center
FROM results_by_projects rbp
JOIN result r ON r.id = rbp.result_id AND r.is_active = 1
LEFT JOIN results_center rc ON rc.result_id = r.id AND rc.is_active = 1 AND rc.is_leading_result = 1
WHERE rbp.is_active = 1
  AND rbp.project_id IN (185,192,207,214,215,216,220,228,233,235,241,265)
ORDER BY rbp.project_id, r.result_code;
```

- No rows, or every `lead_center = 'CENTER-02'` → zero effect. Proceed.
- Rows led by another centre → on their next save CENTER-02 becomes a contributing centre. That is correct (the project is the Alliance's), but list those results in the reply to the reporter so nobody is surprised.

**Pre-check result (run by Santiago on 2026-10-06, file `validacion efecto 0 20261005_SS.csv`, 217 links):**

| Bucket | Count | Results |
|---|---|---|
| Led by CENTER-02 | 202 | — no effect |
| Led by another centre | 13 | 185 → 2136, 17011 (CENTER-11) · 192 → 953, 22604, 22615, 24838, 24864 (CENTER-12), 3213 (CENTER-16), 3351 (CENTER-11), 25438, 25488 (CENTER-10), 25455 (CENTER-01) · 233 → 4625 (CENTER-12) |
| No lead centre | 2 | 185 → 7319, 22808 |

Projects 207, 215 and 241 have no linked results.

**Why the 15 are still expected to be zero effect.** The only derivation that writes is `ensureDerivedContributingCenters` (`bilateral.service.ts:5180`). It **returns immediately unless `result.source = 'API'` (Bilateral)**, and it only considers non-lead projects. All 15 are in status 2 (QA'd) with old result codes, so they look like pool-funded results (`source = 'Result'`). If so, the derivation never touches them. The notification path only fires on a new tagging. The only UI-side reader is `owner_center_institution_id` in `GET /clarisa/projects`, which pre-locks a derived centre in the form. QA'd results can't be edited without a new version, so it has no effect on them either.

Confirm with one last check before the CLARISA update. **Expected: zero rows with `source = 'API'`.**

```sql
SELECT r.result_code, r.version_id, r.status_id, r.source
FROM result r
WHERE r.is_active = 1
  AND r.result_code IN (2136,17011,953,22604,22615,24838,24864,3213,3351,25438,25488,25455,4625,7319,22808)
ORDER BY r.source, r.result_code;
```

If any row comes back with `source = 'API'`, list it in the reply to the reporter. CENTER-02 will be added as a contributing centre on its next save, which is the correct behaviour.

**✅ Confirmed (Santiago, 2026-10-06): all 39 versions of the 15 results are `source = 'Result'`.** So the server derivation never runs on them. The CSV shows that only the **version-6** copies (all status 2, QA'd) link these projects; the version-8 Editing copies don't appear in it. One display-only effect remains: the W1/W2 contributors form (P2-3838, `rd-contributors-and-partners.service.ts` `syncProjectDerivedCenters`) shows a project's owner centre as a locked contributing-centre chip when the section loads. Opening one of those 13 QA'd version-6 results will show "Bioversity (Alliance)" there, where today 1353 resolves to no centre. It can't be persisted because the results are QA'd and locked. **Point 1 side effect: zero persisted change.**

**CLARISA schema confirmed** (`clarisadb8.project`): the columns are named exactly `organization_code` and `external_code`, as in PRMS.

## 13. Success Criteria

- `SELECT COUNT(*) FROM clarisa_projects WHERE organization_code = 1353` returns **0** (was 12) after the sync following the CLARISA fix, and still does after a second sync; the 12 ids show `organization_code = 49`.
- Every project in the Alliance mapping file has a non-null `external_code` equal to the file's value, stable across two syncs. The `Bioversity (Alliance)` row of the external-code count query drops from 20 to 0 (or by the number of mapped projects).
- `bilateral_projects[]` items contain `short_name`, `organization_code`, `external_code` on every bilateral read, for 2025 and 2026 results; `external_code` is `null` (not missing) when unknown.
- Payload doc change log has the row; server spec covers the new field.

## 14. Next Step

```text
/akili-specify bugfix/bilateral-project-codes   (Bug Mode, Lite — point 3 code + data runbook for 1–2)
```
