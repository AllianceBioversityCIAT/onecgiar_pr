# Task for Claude — run `/akili-propose`

Worktree base: `origin/performance-refactor` (branch `JuankCadavid/progress-tracker-pull-bridge`).

## Primary requirement source (MUST READ FIRST)

Read these files before writing the proposal — they are the source of truth from Jose Berenguer (Technical Lead – AI, CGIAR System Organization), 15 Sep 2026:

1. `docs/specs/changes/progress-tracker-pull-bridge/source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.txt` (full text extract — prefer this for reading)
2. `docs/specs/changes/progress-tracker-pull-bridge/source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.docx` (original with figures/screenshots)

Cite the guide in Document Control / Visual Reference / Requirement Delta. Do not invent API shapes; use §4 of the guide.

Then run:

```
/akili-propose progress-tracker-pull-bridge
```

(Path already exists with `source/`; create `proposal.md` beside it under `docs/specs/changes/progress-tracker-pull-bridge/`.)

---

## Intent

Integrate **Progress Tracker** into the PRMS Reporting Tool as an external **pull** source for results — the same product pattern as Knowledge Products today (Browse repositories: CGSPACE / MEL / WorldFish → create result in PRMS).

## Operating model (non-negotiable)

1. User stays in Reporting Tool → Report on a KPI.
2. Source **Progress Tracker** (next to Manual; for KP indicators a third tab beside Browse repositories).
3. PRMS **server** proxies GET to the PT Interoperability API; the browser never calls Synapsis/execute-api hosts.
4. User reviews proposals → **Use this result** → pre-fill title / description / (type if KPI allows) / (KP handle if present).
5. Nothing persists until PRMS **Create and continue** → result in **Editing**, W1/W2, owned by Science Program.
6. PT API never writes to PRMS.
7. Scope: **pooled W1/W2 programs only** — not Centers, not bilaterals.

## Upstream API (already live — Jose)

- DEV: `https://mrl8hgyyye.execute-api.eu-central-1.amazonaws.com/dev`
- STAGING: `https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging`
- Docs: `{base}/docs` (tag “PRMS Pull”)
- `GET /api/prms/indicators/{indicator_id}/results`
- `GET /api/prms/indicators/resolve`
- `GET /api/prms/programs/{program_id}/ready-counts`
- Env (server-only): `PT_INTEROP_BASE_URL`, `PT_INTEROP_API_KEY`
- Client timeout ≥ 30s (cold draft ~20s; cache ~0.2s)

## Codebase analogue (mirror, do not reinvent)

- Server: `onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/` (HttpModule proxy, whitelist DTOs, timeout, never leak upstream host/message — see KPM-R-8 pattern)
- Routes today: `GET results-knowledge-products/cgspace/search`, `.../cgspace/facets/:name`
- Client: `kp-cgspace-browse` + `results-api.service.ts` (`GET_cgspaceSearch` / `GET_cgspaceFacet`)
- Host: `lab-report-form` tabs “Browse repositories | Manual entry”
- Prior specs: `docs/specs/archive/2026-08-27-changes--kp-cgspace-browse`, `docs/specs/archive/2026-09-14-changes--kp-multi-repository-browse`

## What PRMS must implement (guide §7 — port, don’t redesign)

Jose’s local prototype is tagged `// PT-BRIDGE`. Port into the real Reporting Tool:

1. Server module `src/api/progress-tracker/` (+ `modules.routes` / `app.module`)
2. Client: `GET_progressTrackerResults`, `GET_progressTrackerReadyCounts`
3. Component `pt-results-browse` next to `kp-cgspace-browse` (states: loading, results, empty, not_found, unavailable, post-pick banner)
4. `lab-report-form` hunks: Manual | Progress Tracker (non-KP); third tab for KP indicators; `onPtResultSelected` mapping
5. Persist PT `indicator_id` on ToC indicator rows (column or side table), filled once/year via `/resolve` (prefer over local MD5 — guide §5)
6. Provenance: keep `result_key` + `evidence_fingerprint` on created result (narrative tail OK interim)
7. Optional: ready-counts badge

## Out of scope for this proposal

Push/send from PT; bilaterals/Centers; production PT flag; API key issuance (Jose); hosting Jose’s cloud PRMS copy; MQAP/KP entity changes; full metadata duplicate engine (align later with Ángel’s roadmap).

## Open questions (surface in proposal — do not invent answers)

- A3: compute hash vs `/resolve` + where id lives (recommend `/resolve` + column/side table)
- A4: draft description → ToC narrative vs visible Description of Result
- A7: TEST→staging / PROD→prod mapping
- Nicoleta: Editing vs pending for review on import (prototype = Editing)
- J1: sign-off with Nicoleta/Julien before PROD

## Success criteria

- On TEST, from a real W1/W2 KPI with PT evidence: Report → Progress Tracker → drafts → Use this result → Create → Editing with provenance
- Fail-soft: PT down / unknown id → Manual entry still works
- No direct browser calls to synapsis-analytics / execute-api

## Next step after proposal approval

`/akili-specify progress-tracker-pull-bridge`

## Meeting context (Granola)

15 Sep 2026 call (Héctor Tobón, Juan Carlos Cadavid, Juan David Delgado, Ángel Jarrín, Jose Berenguer): MVP two-way; valuable half is pull; module “much like the CGSpace one”; W1/W2 only.
