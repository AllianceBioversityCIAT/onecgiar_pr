# Execution — Bilateral (W3) result PDF shows MDS data only

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/bilateral-pdf-mds-only` |
| Ticket | INC-168048 |
| Approval Mode | gated |
| Code repo | `D:\PRMS\alliance-ibd-pdf-viewer` — branch `fix/inc-168048-bilateral-pdf-mds-only` created by the Leader 2026-11-12 from `origin/staging` @ 12ad396, upstream unset (no accidental push to staging) |
| Leader | Claude Opus 5.5 (T1) · Implementer wrapper `akili-implementer` · Reviewer wrapper `akili-reviewer` |
| Started | 2026-11-12 |

## Task Execution History

### BPM-T-1 — Install, fixtures and pre-change baseline — PASS

- Date: 2026-11-12 · Skills: none mapped (project conventions) · Effort: medium (attempt 1) → high (attempt 2) · Attempts: 2
- Requirements covered: BPM-R-1..6 evidence base, BPM-NFR-2 (P-8 settled)

#### Attempt 1

- Files changed (all new, onecgiar_pr): `fixtures/render.sh`, `fixtures/posix-relative.cjs`, `fixtures/bil-innovation-use.json`, `fixtures/bil-innovation-use-nonmds-only.json`, `fixtures/bil-innovation-dev.json`, `fixtures/bil-capdev.json`, `fixtures/bil-policy.json`, `fixtures/bil-kp.json`, `fixtures/out/before/*.html` (21, scratch). pdf-viewer: no tracked change (`npm ci` only).
- P-8 settled **false**: `next dev` unusable on Windows — `app/[template]/page.tsx` builds the import path with `path.relative()` (backslashes → every template 404s) and Turbopack wedges on a demo-file swap. Fallback `next build` + `next start` with `NODE_OPTIONS=--require fixtures/posix-relative.cjs` (rewrites only `path.relative(<cwd>/app/templates, …)`). Rebuild needed after every code edit.
- Implementer verification: 21 files non-empty, no error banner; every removal label ≥ 1 on its fixture; two consecutive runs `diff -r` empty (same server process).
- Evidence re-run (Leader, inline): **VERIFIED** — 21 files, 0 empty, 0 error banners; removal-label counts all ≥ 1 (e.g. `Current readiness of this innovation` 2, `current_readiness_scale.svg` 4, `>Organizations<` 1, `>Partners<` 1, `Bundled innovations` 2, `Impact Areas targeted` 2, `Impact Area related` 4, `on behalf of an organization` 3, `NONKP-PARTNER-ALPHA` on bil-kp 7); pdf-viewer `git status --short` empty. Two-run diff not re-run (needs a build).
- Reviewer: **FAIL**
  1. Discovered Issue: the baseline cannot be byte-compared after the code change it exists for. The P-8 fallback requires `next build` after every code edit; each masked render embeds per-build tokens — the RSC build ID (`"b":"d9-AacwZ9_2RS24JapVLS"` in `results_p25-demo.html`) and `_next/static/chunks/<hash>.js` names; no `generateBuildId` in next.config, so every rebuild changes them and T-2(a) diffs would differ with no content change. The two-run diff was only proven within one server process, not across a rebuild. Violated Rule: requirements BPM-R-5; tasks BPM-T-1 Disqualifier; design DD-5 / P-8. Remediation: mask non-content build tokens in `mask()` (build ID → `<BUILD-ID>`, `/_next/static/chunks/...` → `<CHUNK>`, any `turbopack-<hash>`), document them; prove with two `next build`s and no code change → `diff -r` empty; re-capture `out/before/`.
  - ADVISORY: (a) spec tension — no PDF component prints scaling-study URLs; T-2(d) labels "characterize" / "scaling studies" can never fail → replace with printed labels "Innovation type:", "Innovation readiness justification:", "Innovation collaborators:", "Reference materials:"; record scaling-study removal as N/A in requirements §4. (b) spec tension — T-3 `"Partners"` → 0 is unsatisfiable (section title "Contributors and Partners"; ID investment row) → grep `>Partners<` after T-2. (c) `>Policy Change<` is also the Bundled innovations indicator cell → compare the extracted Policy section for R-6. (d) `restore()` swallows a failed `git checkout` → add a `git diff --quiet` warning. (e) all fixture evidence is public → non-public branch ("not publicly available" note) uncovered. (f) render.sh header line 6 still says `next dev` must be up.
- spawns: Implementer 72 calls, 182451 tokens, ended complete; Reviewer 32 calls, 108136 tokens, ended fail

#### Attempt 2

- Files changed: `fixtures/render.sh` (masks, header, `restore()` warns on failed checkout, `verify_clean` exits non-zero if the template dir is dirty), `fixtures/bil-innovation-use.json` (non-public evidence `evidence-nonpublic.pdf`), `fixtures/out/before/*.html` re-captured (21).
- Masks added beside the timestamp mask: build ID (`\"b\":\"…\"` + literal `.next/BUILD_ID`) → `<BUILD-ID>`; `/_next/static/[^"\ <>]+` → `/_next/static/<ASSET>`; RSC `:I[<digits>,` → `:I[<MODULE-ID>,`. Left unmasked on purpose: RSC row ids, number/order of script/preload tags.
- Implementer verification: build A (`-GuEoYCkY-pwTsRoga2xP`) → `out/before`; fresh build B (`eH2A36qnyWBMlet8KaFpU`) → `out/chk`; `diff -r out/before out/chk` empty, exit 0 (before the masks all 21 files differed on the build ID only). Mask 3 not exercised by the proof (identical code → identical hashes), tested on a synthetic string. Removal labels still ≥ 1; non-public branch prints "…not publicly available…".
- Evidence re-run (Leader, inline): **VERIFIED** — 21 files, 0 empty, 0 files with a raw build ID; `results_p25-demo.html` BUILD-ID 1 / ASSET 39 / GENERATION-TIMESTAMP 2; `Current readiness of this innovation` 2 on bil-innovation-use; `not publicly available` 2; `on behalf of an organization` 3 on bil-capdev; pdf-viewer `git status --short` empty.
- Reviewer: **PASS** — masks are build-artifact only (`current_readiness_scale.svg` is under `/assets/prms/`, unmasked ×4; mask 3 stops at `" \ space < >`; mask 4 needs the RSC import-row shape); attempt-1 advisories (d)(e)(f) fixed.
  - Spec tension (to the user at the T-1 gate, not advisory): BPM-R-5 "byte-identical (timestamp masked)" is out of date — the harness masks three more token classes, and a shared-file edit may change chunk splitting (±1 `/_next/static/<ASSET>` tag) with no content change. Proposed: reword R-5 THEN to "byte-identical with the run/build tokens listed in render.sh Masks masked"; T-2(a) allows only an `<ASSET>` tag-count delta, quoted and explained here.
  - Still open from attempt 1 (spec text, before T-2): (a) T-2(d) "characterize"/"scaling studies" labels never print; (b) T-3 `"Partners"` → 0 unsatisfiable, use `>Partners<`; (c) R-6 compare the extracted Policy section, not `>Policy Change<`.
- spawns: Implementer 31 calls, 111975 tokens, ended complete; Reviewer 7 calls, 54766 tokens, ended pass

**Final verification:** two-build masked `diff -r` empty; 21 baselines; every removal label ≥ 1 on its fixture.
**Decisions:** P-8 false → harness on `next build` + `next start` + `posix-relative.cjs` preload (no repo edit). Leader created the pdf-viewer feature branch and unset its upstream.
**Running totals vs budget:** tasks 1/3 · LOC 0 shipped (fixtures/harness only) / ~90 · review rounds 2/3 — on track to exceed the 3-round budget by at least 1 if T-2 and T-3 each need one round (5 vs 3); flagged at the gate.
**Gate:** gated mode — stopped for the user 2026-11-12. User answers: apply all 4 spec edits; continue past the review-round budget.
**Execute-time spec edits (2026-11-12, user-approved at the T-1 gate; verification wording only, no requirement meaning changed):**
- `requirements.md` §4 field map — scaling-study URLs split into an N/A row (not printed by any PDF component); BPM-R-2 BUT clause drops it with an N/A note.
- `requirements.md` §3 Glossary "Byte-identical" and §7 defect-class row aligned to the same masks (sweep).
- `requirements.md` BPM-R-5 THEN — "byte-identical (timestamp masked)" → byte-identical with the render.sh "Masks" tokens masked.
- `tasks.md` BPM-T-2 Verification (a) — tolerates only a `/_next/static/<ASSET>` tag-count delta, quoted and explained; (d) — labels "characterize"/"scaling studies" replaced by "Innovation type:", "Innovation readiness justification:", "Innovation collaborators:", "Reference materials:"; (f) — compare extracted Policy/KP section, not `>Policy Change<`.
- `tasks.md` BPM-T-3 Verification + Falsifier — `"Partners"` → `>Partners<`.
- `tasks.md` BPM-T-3 DoD + §6 Rollout (2026-11-12, user-approved; source: Cristian Gamboa chat 09:17 — branch from staging, one environment only (`main`), pipeline deploys on push to `main`): HITL test-deploy check replaced by a local browser print-to-PDF check before the PR (also aligned: tasks §5 BPM-TEST-4, requirements §7 defect-class row); rollout states that `main` = production and the 27926 look happens in production, revert on `main` if wrong.
- Budget: user accepted exceeding the 3-round review budget (expected ~5).

### BPM-T-2 — `mdsOnly` on shared sections + bilateral template wiring — PASS

- Date: 2026-11-12 · Skills: none mapped (project conventions) · Effort: medium · Attempts: 1
- Requirements covered: BPM-R-1 (both scenarios), BPM-R-2, BPM-R-3, BPM-R-5, BPM-R-6, BPM-NFR-2, BPM-NFR-3

#### Attempt 1

- Files changed (pdf-viewer `app/templates/reportingtool/`): `shared/components/innovation-use.tsx`, `shared/components/innovation-development.tsx`, `shared/components/capacity-sharing.tsx`, `results_bilaterals_p25/template.tsx` — 4 files, +46 / −33. Optional `mdsOnly = false` on the three sections; bilateral template passes `mdsOnly` for rt_id 2 / 5 / 7; Policy/KP and `results_p25` untouched.
- Implementer verification (after `next build` + `next start` + `render.sh after`, all 200, no error banner):
  - (a) 8 `results_p25-*` / `ipsr_p25-*` renders `cmp`-identical before vs after; no `<ASSET>` tag-count delta.
  - (b) bil-innovation-use: "Current readiness of this innovation" 2→0, `current_readiness_scale.svg` 4→0, `>Organizations<` 1→0; "Actors - Number of people" 2→2, "Other quantitative measures" 2→2.
  - (c) bil-innovation-use-nonmds-only: `>Innovation Use<` 1→0.
  - (d) bil-innovation-dev kept: "Innovation Development details" 2, "Innovation nature:" 2, "Innovation Developer:" 2, "Current readiness of this innovation:" 2, "Innovation Readiness Scale" 2; removed 2→0: "Innovation type:", "Innovation readiness justification:", "Innovation collaborators:", "Reference materials:", "CGIAR and Partners estimated USD investment", "Anticipated Innovation users".
  - (e) bil-capdev: "on behalf of an organization" 3→0; "Number of people trained", "Delivery Method", "Length of training" 3→3.
  - (f) bil-policy, bil-kp whole-file identical before vs after.
  - (g) `npx tsc --noEmit` exit 0; `npx eslint <4 files> --quiet` exit 0.
- Red run (out/before): InnUse readiness 2 / svg 4 / Organizations 1; nonmds-only `>Innovation Use<` 1; ID "Innovation type:" 2; CapDev "on behalf of an organization" 3.
- Falsifiers (executed, reverted): (1) `mdsOnly` passed from `results_p25` → `results_p25-bil-innovation-use` + `-nonmds-only` DIFF, readiness 0 vs 2 → red. (2) default `true` → 4 `results_p25-*` files DIFF → red. (3) InnUse guard recompute dropped → nonmds-only `>Innovation Use<` 1 → red. (First fals3 run invalid — patch did not apply on CRLF; deleted and redone with sed.)
- Evidence re-run (Leader, inline): **VERIFIED** — `cmp` of the 8 W1/W2 + IPSR files SAME; bil-policy / bil-kp SAME; InnUse readiness 0 / svg 0 / Organizations 0 / actors 2; nonmds-only 0; ID type / collaborators / investment / anticipated 0, developer 2; CapDev organization 0, trained 3; `npx tsc --noEmit` exit 0; pdf-viewer status = the 4 task files.
- Reviewer: **PASS** — default-`false` path proven expression-by-expression equal to the original; no non-MDS ID block reachable in `mdsOnly`; keeping the ID readiness infographic conforms (ID readiness level is Keep; BPM-R-1's "scale image" is the InnUse one); InnUse scenario 2 and CapDev guards correct; no orphan titles; scope = 4 files.
  - ADVISORY: (1) RISK — in `mdsOnly`, an ID result with only nature/developers and no `url_readiness` prints the "readiness not provided" placeholder image (same as W1/W2 today; product call). (2) READABILITY — ID mixes `has*` constants and inline `!mdsOnly &&`; optional consolidation. (3) Housekeeping — `fixtures/out/fals1..3` decide at archive, never commit.
- Judgment calls (Implementer): "readiness level details" = `readiness_details` printed inline; ID readiness infographic kept.
- spawns: Implementer 19 calls, 113344 tokens, ended complete; Reviewer 10 calls, 60296 tokens, ended pass

**Final verification:** (a)–(g) green; 3 falsifiers red.
**Running totals vs budget:** tasks 2/3 · LOC ~79 shipped (+46/−33) / ~90 · review rounds 3/3 (user accepted overrun at the T-1 gate).
**Gate:** gated mode — stop for the user.

### BPM-T-3 — Bilateral common sections: drop non-MDS blocks — PASS

- Date: 2026-11-12 · Skills: none mapped (project conventions) · Effort: medium · Attempts: 1
- Requirements covered: BPM-R-4 (both scenarios), BPM-R-5, BPM-NFR-3 (guard; visual part pending)

#### Attempt 1

- Files changed (pdf-viewer `app/templates/reportingtool/results_bilaterals_p25/`): `components/common-sections.tsx` (~+5/−80), `template.tsx` (T-3 part: `extractImpactAreas` import + const removed, `<ResultDetailsSection data={d} />`). Removed Short title, Impact Areas targeted + OECD note, non-KP partners (Partners = `kp_partner_data` only), Bundled innovations table, evidence "Impact Area related" tags; Contributors `hasAnything` guard ignores bundled + non-KP; dropped now-unused imports `ImpactArea`, `ImpactAreaCard`, `OECDCriteria`, `ImpactAreaIcon` (shared modules untouched).
- Implementer verification (before→after, 5 non-KP fixtures): Short title 2→0, Impact Areas targeted 2→0, Bundled innovations 2→0, Impact Area related 4→0, `>Partners<` 1→0 (3→0 on innovation-dev), non-KP names 14→0; Result description / Contributing CGIAR Centers / Geographic location 2→2, Evidence 8→8 (13→13 on innovation-use). bil-kp: `>Partners<` 1→1, KP names 7→7, non-KP 14→0. 8 W1/W2 + IPSR files `cmp`-identical, no `<ASSET>` delta. `tsc --noEmit` 0, eslint 0, `next build` 0.
- Falsifiers (executed, reverted): (1) non-KP kept in the merge → bil-innovation-use non-KP names 14, `>Partners<` 1 → red. (2) `kpPartners = []` → bil-kp `>Partners<` 0 → red.
- Evidence re-run (Leader, inline): **VERIFIED** — 8 W1/W2 + IPSR SAME; all 6 bilateral fixtures Short title / Impact Areas targeted / Bundled / Impact Area related / non-KP = 0; `>Partners<` 0 except bil-kp 1 (KP names 7); description / geo 2; non-public evidence note 2; `npx tsc --noEmit` 0; eslint on `results_bilaterals_p25` 0.
- Reviewer: **PASS** — exactly the five §4 Remove blocks removed, nothing else; Contributors guard returns `null` when only removed inputs exist (no orphan title); KP path prints only `kp_partner_data`; EvidenceCard keeps label, link/file icon, public/non-public branch, note, details; dead imports scoped to the bilateral file (DD-2/P-3). No ADVISORY.
- spawns: Implementer 16 calls, 97766 tokens, ended complete; Reviewer 10 calls, 54731 tokens, ended pass

**Running totals vs budget:** tasks 3/3 · LOC shipped ≈ +55/−119 across 5 files (mostly removals) / ~90 · review rounds 4/3 (overrun accepted by the user at the T-1 gate).
**DoD local visual check (2026-11-12, user + Leader via Claude in Chrome on `next start` of the final tree):**
- User: Chrome print preview of `bil-innovation-use` (2 pages) — no readiness block / scale, no Partners subsection; noted the page looks narrow → expected: production renders at `PAPER_WIDTH 600px` × `PAPER_HEIGHT 1000px` (`platform-report.constants.ts:26-27`) and the viewer defaults to 600 (`app/[template]/page.tsx:94`).
- Leader, DOM check per fixture (kept labels present / removed labels absent / `data-paginator-block` blocks with < 2 text lines):
  - `bil-innovation-use`: all kept present, 0 violations, no scale `<img>`, `Partners` subtitle 0, 4 blocks, 0 thin.
  - `bil-innovation-use-nonmds-only`: no "Innovation Use" section, no readiness, no Organizations, 2 blocks, 0 thin.
  - `bil-innovation-dev`: kept 4/4, removed 0/9 present, Partners subtitle 0, 3 blocks, 0 thin.
  - `bil-capdev`: kept 3/3, removed 0/5 present, 2 blocks, 0 thin; screenshot shows title → details → contributors → geo → evidence with no empty title.
- Real Gotenberg pagination is not reproducible locally; it is seen on result 27926 in production after the `main` deploy (§6 Rollout).
- Cleanup: demo file restored (`git checkout`), server stopped, port 3000 clear; pdf-viewer status = the 5 task files.

## Summary

| Task | Result | Attempts | Review |
|---|---|---|---|
| BPM-T-1 fixtures + baseline | PASS | 2 | FAIL (build tokens) → PASS |
| BPM-T-2 `mdsOnly` shared sections | PASS | 1 | PASS |
| BPM-T-3 bilateral common sections | PASS | 1 | PASS + local visual check |

- pdf-viewer branch `fix/inc-168048-bilateral-pdf-mds-only` (from `origin/staging` 12ad396): commit 827f180 (5 files), pushed 2026-11-12 on user request; PR to `staging` for Cristian Gamboa.
- W1/W2 (`results_p25`) and IPSR (`ipsr_p25`) renders byte-identical (masked) before vs after on every fixture.
- Budget: 3/3 tasks; review rounds 4 vs 3 (accepted by the user); shipped LOC ≈ +55/−119.
- Execute-time spec edits: listed under BPM-T-1 (verification wording + rollout, user-approved).
- Pending (outside this command): commit + PR feature → `staging` → `main` (main = production deploy, Cristian Gamboa); look at result 27926 in production; reply to Nicoleta in INC-168048; OQ-1 (add non-printed MDS fields?); advisory — ID "readiness not provided" image when only nature/developers (product call); `fixtures/out/` never committed; `/akili-archive`.
