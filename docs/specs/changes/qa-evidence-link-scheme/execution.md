# Execution log: `changes/qa-evidence-link-scheme`

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/qa-evidence-link-scheme` (Lite) |
| Approval Mode | `gated` |
| Branch | `fix/qa-evidence-link-scheme` from `performance-refactor` @ `84108d505` |
| Leader | Claude Opus 5.5 (T1) · Implementer `sonnet` (T2) · Reviewer `opus` (T3) |
| Origin | The user's observation during the `admin-sees-all-centers` walk, 2026-09-28; approved "Si, adelante" |

## Task Execution History

### `QEL-T-1`: Normalise evidence links in the payload and sanitise per-evidence reasons

#### Attempt 1: FAIL

- **Files:**
  - `mappers/evidence.mapper.ts` (+23)
  - `bilateral-quality-assessment.client.ts` (+59/−2)
  - `bilateral-quality-assessment.client.spec.ts` (+98)
  - `bilateral-quality-payload.builder.spec.ts` (+66)
- **Changes:**
  - `normalizePublicLink`: trims the link, turns `''` into `null`, and adds `https://` when the link has no scheme.
  - `sanitizeEvidenceReason(s)`: runs tool-error detection on the raw text, then replaces the reason with the `EVIDENCE_LINK_UNREADABLE_REASON` constant or redacts it. It runs in the `ok` path, which `partial` also goes through.
- **Execute-time spec edit (Leader, 2026-09-28):** the `QEL-AC-4` wording changed from "`example.org/report` → `[redacted]`" to "`[redacted]/report`, as `degraded_reason` redaction does".
  - Reason: `QEL-R-2` requires the same redaction as `degraded_reason`, and `HOST_PATTERN` stops at the `/`.
  - `QEL-DD-2` forbids new patterns.
  - The meaning is kept: the host is always suppressed. The Reviewer confirmed the new wording is faithful, not a weakening.
- **Reds:**
  - Pre-change: `QEL-AC-1` gave `Received: "www.google.com"`. `QEL-AC-3` gave the raw `Page.goto…www.google.com…`.
  - Mutations (a), (b) and (c) were each red on their named case.
- **Implementer verification:** 222/222 · eslint clean · tsc 0 before and after.
- **Evidence re-run (Leader-inline):** **VERIFIED**. 222/222, eslint exit 0.
- **Reviewer (opus): FAIL.**
  - Issue, verbatim in substance: `sanitizeEvidenceReason(item.reason)` assumes a string. `isValidEvidenceItem` (`client.ts:179-187`) checks only `index` and `verdict`. A missing or `null` `reason` throws a TypeError inside the `try`. `classify()` then turns it into `outcome: 'http_error'`, which makes one malformed optional field into "Quality check unavailable". This is the `type_specific` failure of 2026-09-17 again.
  - Violated: `QEL-R-4`, and the in-file contract at `client.ts:202-204` ("read them defensively").
  - Remediation: pass non-string values through unchanged, and add a client-level case (missing and `null` reason → `ok`) with a mutation.
- **ADVISORY (recorded only):**
  - `SCHEME_PATTERN` requires `://`, so `mailto:` gets mangled into `https://mailto:…`. The literal to design; none of these links were fetchable before.
  - `Timeout[\s\S]*exceeded` is unbounded.
  - `HOST_PATTERN` redacts file names like `report.pdf` in normal reasons.
  - `contentHash` changes for results with scheme-less links, so those results re-run once. This is intended, because their old Grey was wrong.
  - AC-3 "stored" is proven by trace, not by a service-level assertion.
  - The AC-4 wording change should be surfaced at archive.
- **Runtime events:** none.

#### Attempt 2 — PASS

- **Feedback:** the Reviewer's FAIL was relayed verbatim, along with the attempt history. The worker was resumed by message, at effort xhigh.
- **Change:** `sanitizeEvidenceReason(reason: unknown)` now returns any non-string value unchanged, so a missing or `null` reason is passed through as-is. There is one cast back, at the call site.
- **New case:** `'a missing or null reason is passed through unchanged, verdict kept (…)'`. It goes through `assess()` and asserts `outcome: 'ok'`, with both verdicts kept and both reasons untouched.
- **Mutation:** removing the guard makes the case fail with `Expected: "ok" Received: "http_error"`. The mutation was reverted.
- **Implementer verification:** 223/223 · eslint clean · tsc 0.
- **Evidence re-run (Leader, inline):** **VERIFIED** — 223/223, eslint exit 0.
- **Reviewer (opus): PASS.**
  - The issue is closed.
  - The cast carries forward the existing, documented `isValidEvidenceItem` gap and does not widen it.
  - Nothing regressed.
- **ADVISORY:** no new advisories. The attempt-1 advisories stand as recorded.
- **Requirements covered:** `QEL-R-1`..`QEL-R-4`; `QEL-AC-1`..`QEL-AC-5`.
- **Runtime events:** none.
- **Final status:** **PASS** (attempt 2 of 3).
- **Budget:** 1 task, as budgeted. LOC was ~280 against ~80, mostly tests. Review rounds were 2 against 1. These overruns are reported to the user.
