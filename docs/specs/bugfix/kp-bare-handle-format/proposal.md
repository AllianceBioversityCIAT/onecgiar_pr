# Proposal — Accept bare CGSpace/MELSpace/WorldFish handles in Manual entry

## Document Control

| Attribute | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/kp-bare-handle-format/` |
| Slug | `kp-bare-handle-format` — derived from free-text argument (a QA bug report: prtest.ciat.cgiar.org, "Report emerging result" → Output → Knowledge product → Manual entry rejects a bare CGSpace handle) |
| Type | Bug |
| Approval Mode | gated |
| Environment reported | prtest.ciat.cgiar.org — new UI v15 (v1.3.4), Reporting 2026 — P25 |
| Ticket | none provided — to be assigned |
| Author | M. Giraldo + AKILI (T1) |
| Date | 2026-09-15 |
| Baseline consulted | `docs/prd.md` (CGSpace dependency, §8 Assumptions), `docs/ux-ui/design.md` §8 PRMS Form UX Pattern (`RFUX-R-5` persistent inline helper copy), `docs/trd/trd.md` (MQAP integration), `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md`, `.../report-result-form/CLAUDE.md`, archived spec `2026-09-14-changes--kp-multi-repository-browse` (established the current three-repository regex; explicitly scoped Manual entry's regex as "already correct" — this bug shows a gap that spec didn't catch) |

## Intent

Let a submitter paste the handle exactly as CGSpace, MELSpace, and WorldFish display it — `10568/183891`, with no `https://` prefix — into the Knowledge Product "Repository link/handle" field and have Sync resolve it, instead of silently failing with a message that reads as "your repository isn't supported."

## Problem / Current Behavior

Reported flow: `prtest.ciat.cgiar.org` → "Report emerging result" → Output → Knowledge product → **Manual entry** tab → "Repository link/handle" field → paste `10568/183891` → **Sync**.

| Input | Result |
|---|---|
| `10568/183891` (bare handle, real CGSpace item) | ❌ "Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository and not other CGIAR repositories." |
| `https://cgspace.cgiar.org/handle/10568/183891` (same item, full URL) | ✅ Resolves (second attempt correctly returned "already reported") |

The error message implies the *repository* is unsupported. It is not — the *format* is. A bare `<prefix>/<digits>` handle is exactly how CGSpace, MELSpace, and other DSpace/OAI repositories display and share their handles by default (item pages, OAI-PMH feeds, citation blocks all show the bare form, not the `/handle/` URL). Requiring the URL form is a client-side gate, not a repository restriction.

## Bug Diagnosis

### Observed Symptom

Manual entry's Sync rejects a real, valid CGSpace handle when pasted in its common bare form (`10568/183891`), with a message that reads as if CGSpace itself were unsupported. The identical item succeeds when the user manually prepends the full URL.

### Reproduction Steps

1. On `prtest.ciat.cgiar.org` (UI v15, v1.3.4, Reporting 2026 — P25), open **Report emerging result** → **Output** → **Knowledge product** → **Manual entry** tab.
2. In **Repository link/handle**, type `10568/183891` (no scheme, no host).
3. Click **Sync**.
4. Observe the error. Then replace the value with `https://cgspace.cgiar.org/handle/10568/183891` and click **Sync** again — it resolves.

Deterministic, format-only: any bare `<prefix>/<digits>` handle reproduces it; the matching full URL never does.

### Root Cause (confirmed)

The client-side gate `KP_HANDLE_REGEX` (`onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/kp-handle.validator.ts:16`) only matches fully-qualified `https://` forms:

```
https://cgspace.cgiar.org/items/<uuid>
https://repo.mel.cgiar.org/items/<uuid>
https://digitalarchive.worldfishcenter.org/items/<uuid>
https://hdl.handle.net/{10568|20.500.11766|20.500.12348}/<digits>
https://cgspace.cgiar.org/handle/{10568|20.500.11766}/<digits>
```

There is no alternative for the bare form `{10568|20.500.11766|20.500.12348}/<digits>` — even though that exact prefix set is already the accepted list once wrapped in a URL. `KP_HANDLE_REGEX.test('10568/183891')` is `false` for that reason alone; the failure has nothing to do with which repository the handle belongs to.

**The bug is worse than one file.** The same `https://`-only regex is duplicated, verbatim, in three places instead of routed through the shared validator:

- `report-result-form.component.ts:515` (`GET_mqapValidation()` — the exact Sync handler in the reported flow, under "Report emerging result" per `dashboard-lab.component.html`). This file already imports `validateKpHandle` from the shared validator (line 20) and uses it for the "Browse repositories" selection path (line 262) — but its own Manual-entry Sync handler has a second, separately hand-copied regex/message instead of calling that same function. This is latent drift independent of the format gap: two validators coexist in one file and can diverge further.
- `result-creator.component.ts:440` (legacy "Report new result" screen, its own Sync handler).
- `aow-hlo-create-modal.component.ts:414` (AoW/HLO create modal's MQAP handler).

All three, plus the canonical validator, need the same fix or the bare-handle failure just resurfaces in the other two surfaces.

**Confirmed not a backend issue.** Traced the full request path: `GET_mqapValidation(handle)` (`results-api.service.ts`) sends the string verbatim to `results-knowledge-products/mqap?handle=...` → `ResultsKnowledgeProductsController.getFromMQAPByHandle` → `ResultsKnowledgeProductsService.findOnCGSpace` → `MQAPBodyDto.fromHandle` (`m-qap-body.dto.ts`), which does **zero normalization** — `body.link = handle` as-is — before `MQAPService.getDataFromCGSpaceHandle` POSTs it to the external MQAP API. The server never validates or rewrites the format; the entire defect is the client-side regex gate that runs *before* any request is even sent. This also means the external MQAP service's own tolerance for a bare `link` is untested/unknown from this repo — see Risks.

### Impact & Scope

- Confirmed for CGSpace's `10568` prefix (the reported repro). By construction of the existing regex (same prefix set already accepted in URL form), `20.500.11766` and `20.500.12348` bare handles are presumed to hit the identical failure — not independently reproduced, flagged as an open question below.
- Affects three creation surfaces sharing the copy-pasted regex: **Report emerging result → Manual entry** (`report-result-form.component.ts`, the reported flow), the legacy **Report new result** screen (`result-creator.component.ts`), and the **AoW/HLO create modal** (`aow-hlo-create-modal.component.ts`).
- No data-integrity or security implication — pure client-side input-validation UX defect that blocks a valid, real submission before any network call.
- `guided-creation.component.ts`, flagged in the shared validator's own `CLAUDE.md` as carrying a fourth local copy, was checked and does not currently host handle-validation logic — that note appears stale or the file was already migrated; not in scope here.

### Fix Strategy

**Smallest safe correction, routed through `/akili-specify` in Bug Mode** (not `/akili-quick` — this is validation logic across three call sites and needs a regression test, not a copy tweak):

1. Extend the **one** canonical `KP_HANDLE_REGEX` with a bare-handle alternative for the same three already-whitelisted prefixes: `^(?:10568|20\.500\.11766|20\.500\.12348)\/\d+$`.
2. Before a bare handle is ever sent to `GET_mqapValidation`, **normalize it to the already-proven-working canonical URL form** (`https://cgspace.cgiar.org/handle/<prefix>/<digits>` for `10568`; `https://hdl.handle.net/<prefix>/<digits>` for the other two) rather than forwarding the bare string as-is — since the server does no normalization of its own (confirmed above), sending a known-good shape avoids betting on undocumented external-service behavior.
3. Point `report-result-form.component.ts`'s `GET_mqapValidation()` at the shared `validateKpHandle()` it already imports, retiring its duplicated inline copy — closes the drift risk in the same change, in the exact file the bug was reported against.
4. `/akili-specify` sizes whether `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` also get routed through the shared validator in this pass or get a smaller matching patch — see Risks/R2.
5. Regression test (Bug Mode requirement): `validateKpHandle('10568/183891')` red before the fix, green after; same for the other two prefixes; existing accepted URL forms must keep validating identically (no regression).

A message-only fix (rewording the error to say "paste the full URL") was considered and rejected as the primary path — see Approach Options.

## Proposed Outcome

- Pasting a bare handle (`10568/183891`, or the `20.500.11766` / `20.500.12348` equivalents) into Manual entry and clicking Sync resolves the item exactly as the full URL does today.
- Any input that still doesn't match (wrong domain, malformed value, unrelated CGIAR repository) keeps failing, with the existing persistent helper copy (`RFUX-R-5`) still correctly describing what's accepted.
- The `report-result-form.component.ts` Sync path stops maintaining a second, hand-copied validator.

## Scope

- `kp-handle.validator.ts` — extend `KP_HANDLE_REGEX`; add a normalization helper (bare handle → canonical URL) that Sync handlers call before hitting `GET_mqapValidation`.
- `report-result-form.component.ts` — `GET_mqapValidation()` uses `validateKpHandle()` (+ normalization) instead of its inline duplicate; this is the exact file/flow the bug was filed against.
- Regression tests for the validator and for `report-result-form.component.spec.ts`'s Sync path.
- `/akili-specify` to size: whether `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` get the same de-duplication in this spec or a fast-follow (Risk R2).

## Non-Goals

- No change to the MQAP resolution logic, the KP entity, or the "already reported" / reporting-year rules — those already work correctly (confirmed in the repro's second Sync attempt).
- No backend change — confirmed pure passthrough, no server-side validation exists to touch.
- No change to the Browse-repositories discovery flow (`kp-cgspace-browse`) — it already produces full URLs and is unaffected.
- Not re-opening the `kp-multi-repository-browse` spec's scope; this is a gap that spec's "regex already correct" assumption missed for Manual entry's bare-handle case specifically.

## Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Result submitters reporting Knowledge Products | Can paste the handle in the format CGSpace/MELSpace/WorldFish actually display, without knowing to construct a URL by hand. |
| `onecgiar-pr-client/.../shared/report-result/kp-handle.validator.ts` | Regex + new normalization helper. |
| `onecgiar-pr-client/.../results/pages/result-creator/components/report-result-form/report-result-form.component.ts` | Sync handler fixed + de-duplicated (reported flow). |
| `onecgiar-pr-client/.../result-creator/result-creator.component.ts`, `.../aow-hlo-create-modal.component.ts` | Same duplicated regex; sizing in `/akili-specify` (R2). |
| Prior specs | Builds on / narrows an assumption in archived `2026-09-14-changes--kp-multi-repository-browse` ("no change to the Manual entry regex — already correct"), which did not test the bare-handle case. |

## Visual Reference

- Source: None.
- Location: n/a.
- Notes: Backend-adjacent validation-logic bug in an existing field; no new screen or layout. If `/akili-specify` design.md decides to visibly rewrite the bare handle into its canonical URL in the input (vs. silent normalization), that's a small interaction-copy decision, not a mockup-worthy surface.

## Approach Options

| Option | How | Pros | Cons |
|---|---|---|---|
| **A. Accept + normalize bare handles (recommended, folded into C)** | Extend the regex for the bare form; normalize to the proven-working URL before syncing. | Fixes the actual friction the user hit; matches the report's Expected Result #1; low risk (normalized shape is confirmed working). | Slightly larger diff than a copy change; touches 3 call sites for full consistency. |
| B. Message-only fix | Keep `https://`-only; reword the error/placeholder to state the URL is required (report's Expected Result #2, the fallback ask). | Smallest possible diff, zero regex/behavior risk. | Doesn't fix the underlying problem — CGSpace/MELSpace/OAI feeds hand out the bare form by default, so users will keep hitting friction; only a documentation-level fix. |
| **C. Hybrid — A plus a clearer message for genuinely unsupported input (recommended)** | Do A; also tighten the persistent helper copy so any *still*-rejected input (wrong domain, malformed) explains itself per `RFUX-R-5`. | Delivers the real fix and the user's own fallback ask in one bounded change; no extra scope beyond touching copy already being touched. | Marginally larger than A alone (copy review). |

## Recommended Approach

**Option C.** The regex fix is what actually resolves the reported defect (a real handle should not be rejected); the message clarification the user proposed as a fallback is cheap to fold in for whatever remains unsupported after the regex is corrected, so there's no reason to ship only one half.

## Risks, Dependencies, And Open Questions

| # | Risk / question | Mitigation / owner |
|---|---|---|
| R1 | MELSpace (`20.500.11766`) / WorldFish (`20.500.12348`) bare-handle rejection is inferred by symmetry, not independently reproduced. | `/akili-specify` requirements.md covers all three prefixes uniformly (the existing regex already treats them uniformly in URL form); regression tests assert all three. |
| R2 | Should `result-creator.component.ts` and `aow-hlo-create-modal.component.ts` be de-duplicated onto the shared validator in this same spec, or patched with the matching regex only and de-duplicated as a fast-follow? | `/akili-specify` to size — de-duplicating all three is the more durable fix (prevents this exact class of drift recurring) but widens the diff beyond the one reported flow. |
| R3 | The external MQAP service's own tolerance for a bare `link` value is unverified from this repo (server does no normalization). | Mitigated by design: client normalizes to the already-confirmed-working canonical URL before ever calling `GET_mqapValidation`, so the external service never sees an unproven shape. |
| OQ1 | Silent normalization (user sees no difference) vs. visibly rewriting the pasted bare handle into its canonical URL in the field? | UX call for `/akili-specify` design.md, informed by `RFUX-R-5` (persistent, non-hidden helper copy). |

## Success Criteria

- Pasting `10568/183891` into Manual entry and clicking Sync resolves the same as the full URL today, with no server change.
- `validateKpHandle('10568/183891')` (and the `20.500.11766` / `20.500.12348` equivalents) is locked by a test: red before the fix, green after (Bug Mode regression test).
- All previously-accepted URL forms continue validating identically across the three call sites (no regression).
- `report-result-form.component.ts`'s Sync handler no longer carries a second hand-copied regex/message.
- Any input that still fails shows a message that accurately describes what is and isn't accepted.

## Next Step

```text
/akili-specify bugfix/kp-bare-handle-format
```

Bug track, Bug Mode — `/akili-specify` converts the confirmed root cause above into a fix plan and a mandatory regression test.
