# Progress Tracker fixtures — upstream staging contract (`PTM-T-8`)

Live-captured fixtures pinning the upstream **staging** response shape (`design.md` §1A
`P-14`), consumed by `fixtures-keys.spec.ts`. Mirrors
`onecgiar-pr-server/src/api/results/results-knowledge-products/cgspace-discovery/fixtures/README.md`'s
provenance format.

## 1. `pt-results.staging.json` — cold `mode=auto` capture

- **Captured:** 2026-09-22T18:47:26.657864+00:00 (upstream `generated_at`; wall-clock
  request time `2026-09-22 18:47:04–18:47:27 UTC`, `date -u` confirmed at request time).
- **Command:** `curl -s -m 40 "https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging/api/prms/indicators/8006329bfd49/results?max_results=3&refresh=true&mode=auto"`
- **Base URL:** PT **staging** (`PT_INTEROP_BASE_URL` target per `design.md` `DD-6`); no
  API key used (none required by this environment for this call).
- **HTTP 200 in 23.1 s** — `refresh=true` forces a cold generation, so `cache.hit: false`
  and `generated_by.mode: "ai"` are guaranteed on this capture. This is deliberate: a
  `mode=template` capture would answer instantly but would **not** carry
  `cache.evidence_fingerprint` (`generated_by.mode: "template"` bodies never populate the
  AI-generation cache key) — that is the inert-fixture trap this task's Disqualifier
  names, and using a template-mode fixture here would make the fixture-key assertion on
  `evidence_fingerprint` vacuously pass against absent code.
- **File:** untouched, byte-identical to the `curl` response body — no pretty-print, no
  manual edits, nothing trimmed.
- **Top-level keys observed:** `indicator`, `results[]`, `evidence_count`,
  `generated_at`, `generated_by`, `cache`, `source`, `validation`. The Guide §4.1
  example (`source/PRMS-ProgressTracker-Pull-Bridge-Guide-2026-09-15.txt:160-186`)
  matches this shape field-for-field, plus a `validation` block the Guide's trimmed
  example doesn't show but which the whitelist DTO does not project (not in `design.md`
  §4.1's field list, so correctly dropped by `sanitizeProposals`).
- `generated_by.mode` observed: `"ai"` (not `"template"` — see above).

## 2. `pt-results-422.json` — staging-native `422`

- **Captured:** 2026-09-22, same session.
- **Command:** `curl -s -m 40 "https://seyxtu7vha.execute-api.eu-central-1.amazonaws.com/staging/api/prms/indicators/8006329bfd49/results?mode=bogus"`
- **HTTP 422 in 5.2 s.**
- **Why `mode=bogus` and not the DEV reproducer:** `design.md` `P-14` records PT **DEV**
  returning `422` on the documented `mode=template&refresh=true` combination — an
  on-ramp drift specific to DEV. That exact combination was tried against **staging**
  first (see §3 below) and returned `200`, matching the documented contract. Since this
  task's Disqualifier rules out a DEV capture outright, `mode=bogus` — upstream's own
  Pydantic query validation, live on staging — was used instead to obtain a genuine
  staging-sourced `422` of the same shape class (`PTM-AC-4` requires every `422`,
  regardless of cause, to classify as `unavailable`; the fixture only needs to be a real
  upstream `422` body, not a reproduction of DEV's specific trigger).
- **Body:** `{"detail":[{"type":"literal_error","loc":["query","mode"],"msg":"Input should be 'auto' or 'template'","input":"bogus","ctx":{"expected":"'auto' or 'template'"}}]}`

## 3. `P-14` resolution — staging matches the documented contract

Two additional live probes (not stored as fixtures — confirmation only, same pattern as
`cgspace-discovery`'s year-filter probe in its own README):

| Call | Staging result |
|---|---|
| `mode=auto` (warm, no `refresh`) | `200` in 6.2 s |
| `mode=template&refresh=true` (PT DEV's documented 422 trigger) | `200` in 2.8 s — **not** a `422` |
| `mode=bogus` (invalid enum, upstream validation) | `422` in 5.2 s |

Conclusion: PT **staging** honors the documented contract (`auto` and `template` both
resolve `200`); the `422` PT DEV produces on `mode=template&refresh=true` does **not**
reproduce on staging. `design.md` §1A `P-14` is updated from `UNVERIFIED` to
**`VERIFIED`**.

## 4. Column-width check (forward pointer from `PTM-T-6`'s review)

Observed field lengths from the `pt-results.staging.json` capture, against the committed
migration column widths:

| Field | Observed (staging capture) | Column | Fits? |
|---|---|---|---|
| `results[].result_key` | `8006329bfd49:1`, `8006329bfd49:2` — 14 chars each | `pt_result_key varchar(64)` | Yes |
| `cache.evidence_fingerprint` | `f9adbe6f47c1e67fba54eac88e3c7f50aefa75c6bf4b1bbe9359e586aa01a181` — 64 chars | `pt_evidence_fingerprint varchar(128)` | Yes |
| `source.environment` | `staging` — 7 chars | `pt_environment varchar(16)` | Yes |
| `generated_by.model` | `claude-haiku-4-5-20251001` — 25 chars | `pt_model varchar(64)` | Yes |

No observed value exceeds its column width on this capture. `pt_model` is the tightest
margin (25 of 64 chars, 39%) and is the field most likely to drift if the upstream
changes model identifiers — worth re-checking on a future capture, but not a blocker
today.

## 5. Security note

No credentials or API keys were used or captured. The upstream base URL appearing in
these files is the same publicly-documented staging endpoint named in `design.md`
`DD-6` and the Guide — not a secret. No PRMS JWT, `PT_INTEROP_API_KEY`, or other
credential appears anywhere in this directory.
