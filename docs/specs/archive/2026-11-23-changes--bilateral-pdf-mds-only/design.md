# Design — Bilateral (W3) result PDF shows MDS data only

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/bilateral-pdf-mds-only` |
| Requirements | `requirements.md` (BPM-R-1..6, BPM-NFR-1..3) |
| Code repo | `D:\PRMS\alliance-ibd-pdf-viewer` (Next.js 16, React 19, no test runner) — base `main` @ `2e17238` |
| Spec repo | `onecgiar_pr` @ `e76b88603` |
| Ticket | INC-168048 |
| Skills | none mapped for Next.js/React in the Skill Map → project conventions (`alliance-ibd-pdf-viewer/CLAUDE.md`) |

## 2. Executive Summary

Template-only change. Three shared type sections get an opt-in `mdsOnly` flag (default off); only `results_bilaterals_p25` turns it on. The bilateral template's own `common-sections.tsx` (single consumer) drops its non-MDS blocks directly. No server, payload, or DB change. Proof = rendered-HTML diff: `results_p25` / `ipsr_p25` identical, bilateral fixtures show every removed label absent and every kept label present.

## 3. Architecture Overview

```text
Result detail "Download PDF" (PRMS client)
  → server platform-report.service.ts:112-117 (DB fn builds JSON)
  → buildP25Payload :458-468  ── source='API' && submitter≠SGP-02 ──► templateName = results_bilaterals_p25
                                └─ otherwise ─► results_p25 / ipsr_p25            (untouched)
  → pdf-viewer app/[template]/page.tsx → results_bilaterals_p25/template.tsx
        ├─ ./components/common-sections.tsx   ← edit directly (bilateral-only)
        └─ ../shared/components/*  ← mdsOnly passed here; results_p25 passes nothing
```

## 4. Extended Directory Structure (pdf-viewer)

| File | Change |
|---|---|
| `app/templates/reportingtool/results_bilaterals_p25/template.tsx` | Pass `mdsOnly` to InnovationUse / InnovationDevelopment / CapacitySharing sections; stop passing impact areas |
| `app/templates/reportingtool/results_bilaterals_p25/components/common-sections.tsx` | Remove short title, Impact Areas targeted + OECD note, non-KP partners, bundled innovations, evidence impact-area tags |
| `app/templates/reportingtool/shared/components/innovation-use.tsx` | `mdsOnly` hides Organizations + use-level block; recomputes "has data" |
| `app/templates/reportingtool/shared/components/innovation-development.tsx` | `mdsOnly` keeps nature, developers, readiness level (+details) only; recomputes "has data" |
| `app/templates/reportingtool/shared/components/capacity-sharing.tsx` | `mdsOnly` hides the organizations row; recomputes "has data" |
| `onecgiar_pr/docs/specs/changes/bilateral-pdf-mds-only/fixtures/*.json` | New — one bilateral payload per type with every removed field populated (verification only, not shipped in the PDF repo) |

## 5. Data Model · 6. API Design · 7. Backend Module Design

None. Payload keys stay as the DB function emits them (BPM-NFR-1).

## 8. Frontend / UX Component Architecture

| Component | Default (W1/W2) | `mdsOnly` (bilateral) | Section-level guard in `mdsOnly` |
|---|---|---|---|
| `InnovationUseSections` | unchanged | Actors, Other quantitative measures | render only if actors or measures exist (BPM-R-1 scenario 2) |
| `InnovationDevelopmentSections` | unchanged | Nature, Developers, Readiness level + details | render only if one of those exists |
| `CapacitySharingSections` | unchanged | People trained, Length, Delivery method | render only if one of those exists |
| `PolicyChangeSection`, `KPDetailsSection` | unchanged | not touched (BPM-R-6) | — |
| Bilateral `ResultDetailsSection` | — | no Short title, no Impact Areas targeted / OECD note | — |
| Bilateral `ContributorsSection` | — | partners = `kp_partner_data` only; no Bundled innovations; section guard drops those two inputs | — |
| Bilateral `EvidenceSection` | — | no "Impact Area related" tags | — |

Visual: removal only, no new tokens. Remaining blocks keep their `data-paginator-block` wrappers (BPM-NFR-3).

## 9. Shared Contracts

`mdsOnly?: boolean` added to three exported section props, optional, default `false`. Consumers listed in P-4.

## 10. Design Decisions

| ID | Decision | Rationale / rejected |
|---|---|---|
| DD-1 | Opt-in `mdsOnly` prop on shared sections, default `false` | One place per type; W1/W2 call sites unchanged so their output cannot move. Rejected: bilateral copies of the sections (duplication drifts); server filter (shared DB fn, correctness-critical payload) |
| DD-2 | Edit bilateral `common-sections.tsx` directly, no flag | Its only importer is the bilateral template (P-3) |
| DD-3 | MDS boundary = fields above the bilateral form's full-metadata gate | Primary-source rule, matches what submitters see as MDS (requirements §4 field map) |
| DD-4 | KP partners kept, non-KP partners removed | KP partners come from the repository record, not from the form's full-metadata field |
| DD-5 | Verification by rendering on `next dev`: baseline HTML captured **before** any edit, fixtures swapped into `template.demo.json` and restored with `git checkout` | Repo has no test runner; adding one is out of scope |

### Reversion challenge (Step 2.3) — "what does removing this break?"

DD-1/DD-2 remove blocks the bilateral PDF ships today.
- **Partners:** KP results would lose repository partners if removed wholesale → addressed by DD-4.
- **Impact Areas targeted:** `extractImpactAreas` still runs in the template; the result is no longer passed, nothing else reads it in the bilateral tree → no breakage. OECD note goes with it (it explains the scores).
- **Section guards:** a section whose only data was non-MDS would leave an orphan title → addressed by the per-component guards in §8.
- No test pins these blocks (repo has none). No other app renders these templates.

## 11. Premise Ledger

Count: 7 verified · 1 UNVERIFIED (Impact: Low 1, High 0)
Blast-radius triggers: `live-path` (user downloads a PDF; branch point = source/submitter), `shared-state` (shared section components used by two templates), `consumer` (exported section props change).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A bilateral non-SGP-02 result reaches `results_bilaterals_p25` | live-path | `platform-report.service.ts:112-117` (DB fn data) → `:462-468` (`source === SourceEnum.Bilateral && primary_submitter_acronym !== 'SGP-02'`) → `platform-report.constants.ts:32`; `SourceEnum.Bilateral = 'API'` `result.entity.ts:53`; viewer loads `app/[template]/page.tsx:63-66`; result 27926 PDF header reads "Bilateral Project" | e76b88603 / 2e17238 | Wrong template edited — High, whole design | — |
| P-2 | Shared sections are imported by exactly `results_p25` and `results_bilaterals_p25` | shared-state | `grep -rln "shared/components/\(innovation-use\|innovation-development\|capacity-sharing\)" app` → `results_bilaterals_p25/template.tsx`, `results_p25/template.tsx` | 2e17238 | More siblings to keep identical — Low, add to diff set | — |
| P-3 | Bilateral `common-sections.tsx` has one importer | consumer | `grep -rn "results_bilaterals_p25/components\|from \"./components" app --include=*.tsx` → only `results_bilaterals_p25/template.tsx:11,17` for this folder | 2e17238 | DD-2 must become a flag — High | — |
| P-4 | Consumers of the three exported section symbols | consumer | same grep as P-2; `star/*` templates use their own components; no test files exist (`find app lib -name "*.test.*" -o -name "*.spec.*"` → 0) | 2e17238 | Missed caller changes output — Low | — |
| P-5 | Use level, organizations (InnUse), ID type/collaborators/justification/scaling/investment/reference materials, CapDev organizations, impact-area scores, external partners, linked results sit below the full-metadata gate | data-env | gates `section-general-info.html:97`, `section-contributors.html:303`, `type-innovation-use.html:185`, `type-innovation-dev.html:93`, `type-capacity-sharing.html:143`; fields per requirements §4 (`:211,:188,:96-221,:216,:146`, `:105-108`, `:352`, `:393-409`) | e76b88603 | Removing an MDS field — High | — |
| P-6 | ID "Anticipated innovation users" and evidence impact-area tags are not in the bilateral form | existence | `grep -n -i "anticipated" type-innovation-dev.component.html` → 0; `grep -n -i "impact area\|_related\|tags" section-evidence.component.html` → 0 | e76b88603 | Would be MDS elsewhere — Low | — |
| P-7 | Demo data is re-read on every `?demo=true` request (fixture swap works without restart) | data-env | `app/[template]/page.tsx:47-55,76-78` (`readFileSync` inside the request) | 2e17238 | Harness needs restart per fixture — Low | — |
| P-8 | `next dev` renders all three templates locally after `npm ci` (node_modules absent today) | data-env | UNVERIFIED — confirm at source before relying on it | — | Harness falls back to `next build && next start` — Low | T-1 first step |

## 12. Budget (tripwire)

| Measure | Expected |
|---|---|
| Tasks | 3 |
| LOC (shipped code) | ~90 (+ ~250 fixture JSON in the spec folder) |
| Review rounds | 3 (one per task) |
