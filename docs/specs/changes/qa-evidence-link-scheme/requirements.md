# Requirements: the AI quality check reads evidence links saved without a scheme, and never shows a raw tool error

| Field | Value |
|---|---|
| Spec Path | `changes/qa-evidence-link-scheme` |
| Type | Change (bug) · Depth **Lite** |
| Module | `bilateral` → `services/quality-assessment` (server only) |
| Parent spec | `bilateral/qa-ai-traffic-light` (`BIL-QAI-*`) |
| Approval | User, 2026-09-28. The Leader stated the proposal and the user replied "Si, adelante". |
| Branch | `fix/qa-evidence-link-scheme`, cut from `performance-refactor` @ `84108d505` |
| Code | `QEL` |

## 1. Problem (as observed by the user, 2026-09-28)

The Evidence card of the quality-assessment drawer showed:

> Grey · Page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL Call log: - navigating to "www.google.com", waiting until "domcontentloaded"

Three causes were verified in code:

1. **The evidence link is sent without a scheme.** `mapEvidence` sends `row.link` verbatim (`quality-assessment/mappers/evidence.mapper.ts:50`). The link was stored as `www.google.com`. The AI service opens it with Playwright `page.goto`, which requires a scheme, so the evidence is graded Grey ("could not be read").
2. **A raw tool error reaches the UI.** The AI returns that error as the evidence item's `reason`, and the drawer renders `item.reason` verbatim (`bilateral-quality-assessment-dialog.component.html:157`).
3. **A host leaks.** The client redacts URLs and hosts only from `degraded_reason` (`bilateral-quality-assessment.client.ts:294-321`, `:474`; `BIL-QAI` NFR *Privacy / secrets*). Per-evidence `reason` is never redacted, so `www.google.com` reached the screen.

## 2. Requirements

- **`QEL-R-1`** Before it is sent to the AI, a public evidence link that has no URL scheme MUST be given `https://` and trimmed. This applies to rows already stored without a scheme, with no data migration. A link that already has a scheme is sent unchanged. A private (SharePoint non-public) link stays `null`, as today. An empty or whitespace-only link becomes `null`.
- **`QEL-R-2`** Every per-evidence `reason` returned by the AI MUST be redacted the same way `degraded_reason` is (URLs and host-shaped tokens → `[redacted]`) before it is persisted or returned.
- **`QEL-R-3`** When a per-evidence `reason` is a technical tool error, it MUST be replaced with this plain-language message: *"We couldn't open this link, so it was not reviewed. Check that it is a complete, public URL (starting with https://)."* A technical tool error is a reason matching `Page.goto`, `Page.navigate`, `Protocol error`, `Call log`, `net::ERR_`, `Navigation failed`, `Timeout … exceeded` or `ERR_NAME_NOT_RESOLVED`. The verdict (`grey`) is kept as the AI sent it.
- **`QEL-R-4`** Nothing else in the payload or the response changes. Section comments, the overall result and the scores are out of scope.

## 3. Acceptance criteria

| ID | Given | Then |
|---|---|---|
| `QEL-AC-1` | A public evidence row with link `www.google.com` | The payload link is `https://www.google.com` |
| `QEL-AC-2` | Links `https://x.org/a`, `http://x.org`, `  www.x.org  `, `''`, and a private SharePoint row | They are sent as `https://x.org/a`, `http://x.org`, `https://www.x.org`, `null`, `null` |
| `QEL-AC-3` | An AI evidence item with reason `Page.goto: Protocol error … navigating to "www.google.com" …` | The stored and returned reason is the QEL-R-3 message, with no host in it |
| `QEL-AC-4` | An AI evidence item with a normal reason that mentions `see example.org/report` | The reason is kept, and the host is redacted: `example.org/report` → `[redacted]/report`, as `degraded_reason` redaction does *(AC wording corrected at execute time, 2026-09-28, to match `QEL-R-2`)* |
| `QEL-AC-5` | A normal reason with no URL or host | The reason is unchanged |

## 4. Out of scope (recorded)

- The evidence form accepting links without a scheme: a client validation, a separate change.
- The AI service returning internal errors in `reason`: this lives in the AI repo, a separate report.
- The drawer's template: it renders whatever the server returns.
