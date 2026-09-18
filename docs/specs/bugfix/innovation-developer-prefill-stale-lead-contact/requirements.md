# Requirements — Innovation Developer prefill reads a stale Lead contact person

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/innovation-developer-prefill-stale-lead-contact` |
| Type | Bug (Bug Mode) |
| Depth | Lite |
| Approval Mode | gated |
| Module code | `BIL-IDP` |
| Proposal | `./proposal.md` (root cause confirmed there) |
| Supersedes | nothing — closes a gap in `BIL-QAI-R-15` / `DD-12` as delivered |

## Executive Summary

The prefill promised by `BIL-QAI-R-15` fires against a Lead contact person that the editor read from the server when it opened, and it fires once, before the reporter can type. Both halves must change for the promise to hold: the shared value must track the edit, and the prefill must still be able to act when it does.

## Glossary

| Term | Meaning |
|---|---|
| Eligible | `innovation_developers` is **absent** from the section body — the reporter has never given the field a value, and no row has stored one |
| Committed contact | A Lead contact person the General information section has settled (name plus optional directory match), not a keystroke |

## Functional Requirements

### `BIL-IDP-R-1` — The prefill sees the contact the reporter just entered

The editor SHALL prefill **Innovation Developer** from the Lead contact person while the field is eligible, including when the contact is entered after the Type-specific section has already loaded.

#### Scenario: The reported failure

- GIVEN a bilateral Innovation development result whose Lead contact person and Innovation Developer are both empty
- AND the editor is open, so Type-specific details has already loaded once
- WHEN the reporter sets a Lead contact person in General information
- THEN Innovation Developer holds that contact, without reloading the page
- AND IT MUST apply only to `result_type_id` 7

#### Scenario: Still works on the path that already worked

- GIVEN a result whose Lead contact person is already stored and whose Innovation Developer has no row
- WHEN the reporter opens the editor
- THEN Innovation Developer is prefilled on load, as it is today

### `BIL-IDP-R-2` — The reporter's own value always wins

The prefill SHALL NOT replace any value the reporter has given the field, including an empty one.

#### Scenario: A typed value survives a later contact change

- GIVEN the reporter has typed a name into Innovation Developer
- WHEN the Lead contact person is changed afterwards
- THEN Innovation Developer keeps the typed name
- BUT it must NOT be re-derived from the new contact

#### Scenario: A cleared field stays cleared (the `T-12` regression)

- GIVEN the reporter clears Innovation Developer and saves
- WHEN the section is reloaded, or the Lead contact person changes again
- THEN Innovation Developer stays empty
- AND IT MUST stay empty across a full page reload, where the stored value returns as `null`

### `BIL-IDP-R-3` — Publishing the contact never destroys the stored one

Making the Lead contact person observable to other sections SHALL NOT alter what is sent to the server.

#### Scenario: Mount order does not clobber the loaded contact

- GIVEN a result with a stored Lead contact person
- WHEN the editor mounts, before the General information section has hydrated its own copy
- THEN the shared value still holds the stored contact
- BUT it must NOT be overwritten with the section's pre-hydration empty state
- AND IT MUST NOT cause any additional PATCH

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| `BIL-IDP-N-1` | No server change. `buildPayload()` keeps sending what is on screen; no substitution returns |
| `BIL-IDP-N-2` | Innovation Developer stays optional and untracked by the MDS checklist |
| `BIL-IDP-N-3` | The publish fires on a settled contact, not per keystroke |

## Defect Classes And Their Gates

The classes this spec can actually produce, and what catches each:

| # | Defect class | Gate |
|---|---|---|
| D1 | The bug is not fixed — prefill still misses the in-session order | `BIL-IDP-T-1` regression test: **red before the fix** |
| D2 | Prefill overwrites a typed value | Jest, `BIL-IDP-R-2` scenario 1 |
| D3 | A cleared field revives (the `T-12` class) | Jest, `BIL-IDP-R-2` scenario 2, asserting the stored-`null` shape |
| D4 | The publish clobbers the loaded contact before hydration, or triggers a PATCH | Jest, `BIL-IDP-R-3`, asserting `updateFieldsBatch` call count |
| D5 | **The model updates but the textarea does not repaint** | ⚠️ **No automated gate.** The specs assert `component.body.innovation_developers`, which proves the model, not the render. `app-pr-textarea` is a `custom-fields` component, and this repo validates those in Cypress CT because jsdom cannot lay them out (`onecgiar-pr-client/CLAUDE.md` §9) — a jest assertion on the rendered value would be a presence-assertion, not proof. **Substitute: a manual browser check at the HITL pause**, following `BIL-IDP-R-1` scenario 1. Risk is low but real: the component is `CheckAlways` and `body` is a plain object, so the late write relies on the ambient CD cycle, not on a signal read |

## Requirement ID Index

| ID | Title | Covered by |
|---|---|---|
| `BIL-IDP-R-1` | Prefill sees the contact just entered | `T-1`, `T-2`, `T-3` |
| `BIL-IDP-R-2` | The reporter's own value always wins | `T-1`, `T-3` |
| `BIL-IDP-R-3` | Publishing never destroys the stored contact | `T-1`, `T-2` |
| `BIL-IDP-N-1` | No server change | `T-2`, `T-3` (scope limits) |
| `BIL-IDP-N-2` | Stays optional / untracked | `T-3` |
| `BIL-IDP-N-3` | Settled contact, not keystroke | `T-2` |
