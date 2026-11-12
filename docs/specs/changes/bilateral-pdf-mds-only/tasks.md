# Tasks — Bilateral (W3) result PDF shows MDS data only

## 1. Scope

- **Module / feature:** platform-report PDF — `results_bilaterals_p25` (code in `D:\PRMS\alliance-ibd-pdf-viewer`)
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Ticket:** INC-168048
- **Branch (pdf-viewer):** `fix/inc-168048-bilateral-pdf-mds-only` from `origin/staging` (12ad396); flow feature → staging → main; deploy by Cristian Gamboa
- **Status:** done 2026-11-12 (pdf-viewer 827f180 pushed)

## 2. Pre-flight

- [ ] Work in `D:\PRMS\alliance-ibd-pdf-viewer` on the feature branch; never on `main`
- [ ] No commit without the user's go-ahead (`feedback_no_autocommit`)
- [ ] Commit subject format `<emoji> <type>(<scope>) [INC-168048]: …`, no apostrophes/quotes/`$` (Jenkins)
- [ ] One `next dev` at a time; no Jest runs needed (repo has none)

## 3. Task list

### [x] BPM-T-1 — Install, fixtures and pre-change baseline

- **Type:** tests
- **Description:** Settle P-8, write the fixture payloads and capture the baseline renders **before any code edit**.
- **Implements:** BPM-R-1..6 (evidence base), BPM-NFR-2
- **Files:** `docs/specs/changes/bilateral-pdf-mds-only/fixtures/` (onecgiar_pr): `bil-innovation-use.json` (27926-like: actors + measures + organizations + `readiness_level`), `bil-innovation-use-nonmds-only.json` (organizations + `readiness_level`, no actors/measures), `bil-innovation-dev.json` (every ID field incl. `short_title`, investments, anticipated users), `bil-capdev.json` (incl. `capdev_organizations`), `bil-policy.json`, `bil-kp.json` (`kp_partner_data` + `non_kp_partner_data`); every fixture also carries `non_kp_partner_data`, `bundled_innovations`, impact-area scores and evidence `tags`. `render.sh` — swaps a fixture into `<template>/template.demo.json`, `curl`s `/<template>?demo=true`, masks the generation timestamp, writes `out/<label>.html`, restores the demo file with `git checkout`.
- **Steps:** (1) `npm ci` in pdf-viewer, `npx next dev` → `results_p25?demo=true` returns 200 (settles P-8; else fall back to `next build && next start`, record it). (2) Render baseline set `out/before/`: `results_p25` × {its demo, every fixture}, `ipsr_p25` × its demo, `results_bilaterals_p25` × {its demo, every fixture}.
- **Depends on:** — · **Blocks:** BPM-T-2, BPM-T-3 · **Estimate:** S
- **Review:** checklist — test assets only, no shipped code
- **Verification:** `grep -c "Current readiness of this innovation" out/before/bil-innovation-use.html` ≥ 1; same for each label in the removal list (§5) on its fixture; all files non-empty and contain no "No demo data" / error banner.
- **Falsifier:** a fixture missing a removed field → its label grep returns 0 at baseline → the fixture is inert and must be fixed before T-2.
- **Red run:** observed in production: `PRMS-Result-27926_P25_20261112_1359.pdf` p.2 "Current readiness of this innovation: Level 0 - No use" + scale; p.1 "Partners" table. Remaining labels observed in this task's baseline greps.
- **Disqualifier:** a render that returns the error page or masks nothing (timestamp still varies between two runs of the same fixture) is not a baseline — rerun twice and `diff`; non-empty diff → fix masking first.
- **Consumers:** none (new files)
- **DoD:** baseline files exist; two consecutive `results_p25` renders `diff` empty; every removal label has ≥ 1 baseline hit on its fixture.
- **Skills:** none mapped (project conventions)

### [x] BPM-T-2 — `mdsOnly` on shared sections + bilateral template wiring

- **Type:** client (pdf-viewer)
- **Description:** Per design §8 / DD-1: add optional `mdsOnly` (default `false`) to `InnovationUseSections`, `InnovationDevelopmentSections`, `CapacitySharingSections`; in `mdsOnly` render only the MDS fields and recompute each section's "has data" guard from those fields only. `results_bilaterals_p25/template.tsx` passes `mdsOnly`.
- **Implements:** BPM-R-1 (both scenarios), BPM-R-2, BPM-R-3, BPM-R-5, BPM-R-6, BPM-NFR-2, BPM-NFR-3
- **Files:** `shared/components/innovation-use.tsx`, `shared/components/innovation-development.tsx`, `shared/components/capacity-sharing.tsx`, `results_bilaterals_p25/template.tsx`
- **Depends on:** BPM-T-1 · **Blocks:** BPM-T-3 · **Estimate:** S
- **Review:** full — shared exported symbols with a W1/W2 consumer
- **Verification:** `render.sh` → `out/after/`; (a) `diff -r` of every `results_p25-*` and `ipsr_p25-*` file before vs after = empty (BPM-R-5, incl. the InnUse fixture still showing "Current readiness"); the only tolerated delta is a change in the count of `/_next/static/<ASSET>` script/preload tags (chunk splitting), with every other byte equal — quoted and explained in `execution.md`; (b) bilateral InnUse: "Current readiness of this innovation", `current_readiness_scale.svg`, "Organizations" → 0 hits; "Actors - Number of people", "Other quantitative measures" → ≥ 1; (c) `bil-innovation-use-nonmds-only`: "Innovation Use" → 0; (d) bilateral ID: "Innovation Development details", nature, developers, readiness level → ≥ 1; "Innovation type:" / "Innovation readiness justification:" / "Innovation collaborators:" / "Reference materials:" / "CGIAR and Partners estimated USD investment" / "Anticipated Innovation users" → 0; (e) bilateral CapDev: "on behalf of an organization" → 0, "Number of people trained", "Delivery Method", "Length of training" → ≥ 1; (f) bilateral Policy/KP type sections identical before vs after (BPM-R-6) — compare the extracted Policy / KP section HTML, not a `>Policy Change<` grep (that string is also the Bundled innovations indicator cell); (g) `npx tsc --noEmit` green; `npx eslint <touched files> --quiet` clean.
- **Falsifier:** pass `mdsOnly` from `results_p25/template.tsx` too → (a) goes red; flip the default to `true` → (a) red; drop the guard recompute → (c) shows "Innovation Use" → red. Both executed and quoted in `execution.md`.
- **Red run:** (b)–(e) are red on `out/before/` (T-1 baseline greps); quote one per section.
- **Disqualifier:** a diff hidden by whitespace/attribute normalization is not evidence — compare raw masked HTML only; a 0-hit grep on a file that is the error page proves nothing (check status 200 + section title present first).
- **Consumers:** `results_p25/template.tsx:22,62` and siblings (P-2, P-4); no test files in repo.
- **DoD:** (a)–(g) green with outputs in `execution.md`; falsifiers observed red.
- **Skills:** none mapped (project conventions)

### [x] BPM-T-3 — Bilateral common sections: drop non-MDS blocks

- **Type:** client (pdf-viewer)
- **Description:** Per DD-2/DD-4 in `results_bilaterals_p25/components/common-sections.tsx`: remove Short title line, "Impact Areas targeted" block + OECD note, non-KP partners (Partners table uses `kp_partner_data` only), Bundled innovations table, evidence "Impact Area related" tags; update the Contributors section guard so removed inputs no longer open it. Template stops passing impact areas.
- **Implements:** BPM-R-4 (both scenarios), BPM-R-5, BPM-NFR-3
- **Files:** `results_bilaterals_p25/components/common-sections.tsx`, `results_bilaterals_p25/template.tsx`
- **Depends on:** BPM-T-2 (same template file) · **Blocks:** — · **Estimate:** S
- **Review:** full — removes shipped blocks
- **Verification:** `render.sh` → `out/after/`; every bilateral non-KP fixture: "Short title", "Impact Areas targeted", "Bundled innovations", "Impact Area related", the `non_kp_partner_data` partner names, `>Partners<` (subsection title; the section title "Contributors and Partners" stays) → 0; "Result description", "Contributing CGIAR Centers", "Geographic location", "Evidence" → ≥ 1. `bil-kp`: `>Partners<` ≥ 1, KP partner names ≥ 1, non-KP partner names → 0. W1/W2 + IPSR diff still empty. `npx tsc --noEmit`, eslint on touched files, `npx next build` green.
- **Falsifier:** keep `non_kp_partner_data` in the merge → its partner name reappears in `bil-innovation-use` → red; drop `kp_partner_data` too → `bil-kp` `>Partners<` 0 → red. Executed and quoted.
- **Red run:** each removed label ≥ 1 on `out/before/` (T-1); production PDF 27926 p.1 "Partners" (observed).
- **Disqualifier:** same as T-2.
- **Consumers:** `results_bilaterals_p25/template.tsx` only (P-3).
- **DoD:** all greps/diffs green in `execution.md`; build green; **Local visual check (before the PR):** with `next start` running the final code, print to PDF from the browser `results_bilaterals_p25?demo=true` with the fixtures `bil-innovation-use`, `bil-innovation-use-nonmds-only`, `bil-innovation-dev` and `bil-capdev`; check no readiness block, no Partners, no orphan titles, pagination fine — human/T6 check, BPM-NFR-3. The pdf-viewer has no test environment (only `main`, per Cristian Gamboa 2026-11-12), so this replaces the test-deploy check.
- **Skills:** none mapped (project conventions)

## 4. Dependency graph

```text
BPM-T-1 → BPM-T-2 → BPM-T-3   (serial: T-2 and T-3 share template.tsx)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BPM-TEST-1 | rendered HTML diff (W1/W2, IPSR) | BPM-R-5, BPM-R-6 | `fixtures/render.sh` → `out/before` vs `out/after` |
| BPM-TEST-2 | label grep per bilateral fixture | BPM-R-1..4 | same |
| BPM-TEST-3 | type-check / lint / build | BPM-NFR-2 | pdf-viewer |
| BPM-TEST-4 | local browser print-to-PDF of the bilateral fixtures (before PR) + look at result 27926 in production after the `main` deploy | BPM-NFR-3 | HITL |

### Scenario → task coverage

| Scenario / clause | Task |
|---|---|
| R-1 S1 THEN actors · BUT no readiness/scale · MUST no Organizations | T-2 (b) |
| R-1 S2 section not rendered | T-2 (c) |
| R-2 S1 THEN kept · BUT 7 removed groups | T-2 (d) |
| R-3 S1 THEN kept · BUT no organizations row | T-2 (e) |
| R-4 S1 THEN kept · BUT 5 removed blocks | T-3 |
| R-4 S2 KP partners · MUST no non-KP rows | T-3 |
| R-5 S1 byte-identical · MUST incl. InnUse with use level | T-2 (a), re-checked T-3 |
| R-6 S1 Policy/KP unchanged | T-2 (f) |
| NFR-3 pagination / no orphan titles | T-2 (c), T-3 HITL |

## 6. Rollout

PR feature → `staging` → `main` (pdf-viewer). **Pushing to `main` runs the pipeline and deploys to production** — the service has one environment only (Cristian Gamboa, 2026-11-12). Then regenerate the PDF of result 27926 in production and look at it; if something is wrong, revert the commit on `main` (the pipeline redeploys). The guarantee that W1/W2 and IPSR do not change is T-2(a)'s HTML diff, run before the PR. Reply to Nicoleta in INC-168048 once verified in production.

## 7. Follow-ups

- OQ-1: ask Nicoleta whether to **add** the MDS fields not printed today (InnUse investment by W3/bilateral projects, current-use update).
- `fixtures/out/` is not committed (scratch output).

## 8. Roll-back

Revert the feature commit(s) in pdf-viewer and redeploy; no data or server state involved.

**Estimated LOC:** ~90 shipped code + ~250 fixture JSON + ~40 harness. **PR strategy:** single PR in pdf-viewer; spec docs committed separately in onecgiar_pr.
