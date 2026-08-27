# Judgment Day — `design.md` (round 1)

| Field | Value |
|---|---|
| Target | `docs/specs/changes/kp-cgspace-browse/design.md` (+ requirements.md, proposal.md as in-scope context) |
| Mode | judgment_day · two blind read-only judges (opus, T3 — author ≠ auditor) |
| Round | 1 · ledger frozen 2026-08-26 |
| Status | **round-1 fixes applied (Fix only — no re-judgment, per user)** |

## Frozen ledger

Severity = highest agreed; "Confirmed" = both judges; "Suspect" = one judge; "Verified" = orchestrator re-checked the code.

| ID | Sev | Status | Finding | Evidence |
|---|---|---|---|---|
| JD-1 | SEVERE | Confirmed (A-F04, B-F01) | Endpoint path wrong: real prefix is `/api/results/results-knowledge-products/...`; design and proposal give two other variants | `main.routes.ts:13` → `modules.routes.ts:36` → `results.routes.ts:93`; client `results-api.service.ts:34,394` |
| JD-2 | SEVERE | Confirmed (A-F01, B-F02) | Shared `CacheModule` with TTLs does not exist; only a TTL-less global-parameter cache; no cache lib dependency → R-22 / DD-3 unimplementable as written | `shared/services/cache/*` (2 files, `//TODO replace by nestjs cache module`), `package.json` no cache-manager |
| JD-3 | SEVERE | Confirmed (A-F05/F06, B-F03) | `findOnCGSpace` throws 422 for non-admins when KP year ≠ active reporting-phase year. Browsing exposes the whole corpus → most selections would fail after "Use this item"; Year filter must be a hard constraint, not a SHOULD default | `results-knowledge-products.service.ts:604-673` |
| JD-4 | SEVERE | Suspect (A-F02) → **Verified** | `ResponseInterceptor` emits `response: data?.response \|\| {}`; controller must return `{response, message, status}` wrapper, not the bare DTO. Envelope key is `statusCode`, not `status` (A-F08) | `Return-data.interceptor.ts:28-34` |
| JD-5 | SEVERE/WARN | Agreed substance (A-F03 severe, B-F05 warning) | No global `ValidationPipe`; DTO rules + AC-10 need a per-route `new ValidationPipe({transform:true, whitelist:true})` | `main.ts` no `useGlobalPipes`; per-route precedent `bilateral.controller.ts:54` |
| JD-6 | WARN | Suspect (A-F20) → **Verified** | `GET mqap` runs with `validateExisting=true`: an already-reported handle returns the existing KP object (different shape) → design must handle "already reported" after Use this item | `service.ts:593,628-638`; client reads `resp.response.title` |
| JD-7 | WARN | Confirmed (A-F07, B-F04) | Auth is `JwtMiddleware` + `.exclude()` list, not a global guard | `app.module.ts:127-152` |
| JD-8 | WARN | Confirmed (A-F10, B-F06) | Tokens wrong: primary is `--pr-color-primary-300: #6b46e5` | `colors.scss:20`, ux-ui §8 |
| JD-9 | WARN | Confirmed (A-F09, B-F07/F08) | Spartan tabs: not in UX inventory (needs ADR); Jest maps `@spartan-ng/brain/*` to a mock without `BrnTabs*` → mock must be extended; proposal's "PrimeNG tabs" is obsolete (PrimeNG removed, ux-ui §12) | `package.json:41,135`, `tests/mocks/spartanBrainMock.ts` |
| JD-10 | WARN | Confirmed (A-F12, B-F12) | `sort=score,DESC` unverified; attested sorts are `dc.date.accessioned/issued`, `dc.title`; dead "empty query" text | notes.md:84-94 |
| JD-11 | WARN | Confirmed (A-F16, B-F09) | R-2 "and on Enter" not designed | req:82 |
| JD-12 | WARN | Confirmed (A-F17, B-F10) | R-3 "clearable filters" not designed | req:83 |
| JD-13 | WARN | Confirmed (A-F18/F19, B-F11/F25) | R-4 card rules, R-10 client copy, R-11 loading-inputs-enabled / empty-hint not designed | req:84,90,91,147 |
| JD-14 | WARN | Confirmed (A-F21/F22/F34, B-F13–F16) | Template: missing "Required cross-references" (+ `docs/prd.md`), ADRs lack "Consequences", §3.1/3.2, §4.2 bilateral, §13 heading order | general-setup/design.md |
| JD-15 | WARN | Suspect (A-F23) | `query` required → filter-only search returns 400, tension with R-3 | design §4.1 |
| JD-16 | WARN | Suspect (A-F24) | `currentResultIsKnowledgeProduct()` is also true for `result_type_id === 6` on non-KP indicators → tabs would appear in an AC-2 "unchanged" case | modal.ts:61-66 |
| JD-17 | WARN | Suspect (A-F13) | `dateIssued` facet may be a range facet; facet call has no search scope | notes.md:217-249 |
| JD-18 | WARN | Suspect (A-F14, A-F15) | Solr query forwarded verbatim (no escaping); unbounded in-memory cache | design §5, §8 |
| JD-19 | WARN | Suspect (B-F17, A-F31) | Regex already accepts `cgspace.cgiar.org/items/<uuid>`; DTO carries `uuid` → DD-4 could avoid relaxing the guard | modal.ts:279 |
| JD-20 | WARN | Suspect (B-F18) | Env var registration: `serverless.yaml` forwards a fixed env allowlist; infra doc has no env table | serverless.yaml:14-22 |
| JD-21 | WARN | Suspect (B-F19) | MQAP resolving `10947/…` is asserted, not evidenced | service.ts:621-628 |
| JD-22 | WARN | Suspect (A-F11) | "local SCSS styles" contradicts ux-ui §12 Tailwind-only rule | ux-ui/design.md:404 |
| INFO | SUGG | A-F25–F33, B-F20–F29 | Window feature string mismatch; providers registration; M4.2 metric; HAL path; exception filter leak; budget/test LOC; facet truncation; 4xx masking; i18n literals; facet size vs NFR; phaseYear available | — |

Counts: **confirmed severe 3** (JD-1..3) · **verified suspect severe 2** (JD-4, JD-5) · warnings 17 · info 19 · contradictions 0.

## Round-1 fix scope (proposed)
Fix JD-1..JD-5 (severe) and, because they are cheap and confirmed by both, JD-7..JD-14. Suspects JD-6, JD-15, JD-16, JD-19 are verified/plausible and will be folded in; JD-17/18/20/21/22 recorded for the fix actor to address in the design text (no code). INFO rows remain info.

## Round-1 disposition (Fix only, 2026-08-26)
| IDs | Disposition |
|---|---|
| JD-1 | Path corrected in design + proposal (`/api/results/results-knowledge-products/...`). |
| JD-2 | DD-3 rewritten: bounded in-service TTL map, no dependency; R-22 updated. |
| JD-3 | New `KPB-R-12` + DD-6: Year locked to phase year for non-admins; R-20 now admin-only default. |
| JD-4 | §4.1/§5: service returns `{response,message,status}`; envelope key `statusCode`. |
| JD-5 | Per-route `ValidationPipe({transform,whitelist})` on both routes; NFR updated. |
| JD-6 | New `KPB-R-13` + flow: existing-result response reused. |
| JD-7..JD-14 | Auth wording, tokens, DD-7 (spartan tabs + mock), sort, Enter, clearable filters, card/copy/state rules, template headings, Consequences, cross-references — all applied. |
| JD-15 | `query` optional when a filter is present (R-3 rev 2, AC-14). |
| JD-16 | R-1 rev 2 covers category-6 selection explicitly. |
| JD-17 | Year not sourced from `dateIssued` facet; fixed list + range filter; exact form verified in fixture task. |
| JD-18 | Solr escaping + bounded cache in §5/§7/§8. |
| JD-19 | DD-4 overturned: use `cgspace.cgiar.org/items/<uuid>` URL, no regex relaxation. |
| JD-20 | `serverless.yaml` allowlist + infra §6 registration named in §5/§11 and as a task. |
| JD-21 | Recorded as HITL smoke evidence item (§10, §13). |
| JD-22 | Tailwind-only styling (§6.3). |
| INFO | Window feature string unified; providers registration; M4.2; HAL path pinned; exception-filter leak covered by catch-all; budget now includes tests; i18n literal decision recorded. |
Terminal state: **not re-judged** — user chose Fix only. `JUDGMENT: FIXED-UNVERIFIED` (approval by user at the Phase 2 gate).
