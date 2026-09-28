# Design: `changes/qa-evidence-link-scheme`

## Decisions

- **`QEL-DD-1`: normalise the link at the payload boundary.** A pure helper in `mappers/evidence.mapper.ts` handles the link:
  - trim it;
  - `''` → `null`;
  - if it has no scheme (`/^[a-z][a-z0-9+.-]*:\/\//i`), prefix `https://`.

  It runs only for `visibility === 'public'`. Why here: it fixes stored rows without a migration, and the mapper is already the single place that shapes `link`.
- **`QEL-DD-2`: sanitise evidence reasons in the client, beside `sanitizeDegradedReason`.** This goes in `bilateral-quality-assessment.client.ts`, applied in the `ok` path. Apply it after `toAiAssessmentResponse` and `sanitizeScores` (`:490`), mapping `response.evidence[i].reason`.
  - Order: first detect a tool error (on the raw text), then replace it or redact it.
  - The redaction reuses `URL_PATTERN`/`HOST_PATTERN`/`REDACTED_PLACEHOLDER` — no new patterns for redaction.
  - Evidence reasons are **not** truncated to 255; that cap belongs to `degraded_reason`.
  - Why the client: it is the existing boundary where AI text is cleaned before persistence (`BIL-QAI` NFR *Privacy / secrets*), so stored rows are clean too.
- **The copy** lives as a named constant beside the patterns. The server owns this user-facing string because the client renders `reason` verbatim.

## Budget

1 task · ~80 LOC (≈25 production, ≈55 test) · 1 review round.
