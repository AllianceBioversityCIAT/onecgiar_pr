# Bilateral missing-field validator — 16 Sep 2026

Reported by JC over Slack, with screenshots: *"en bilaterales no está funcionando el validador de
missing field como en w1/2"*. Closed the same day and confirmed by him on prtest ("Done", 11:51).

No Jira ticket owns this, which is why the context lives here.

## The root cause, which is structural

The bilateral editor answers "what is still missing?" **twice, from two different places**:

| | Source |
|---|---|
| The footer count (`N fields missing`) | `BilateralMdsTrackerService` — a checklist each section declares **by hand** via `setSectionFields(...)` |
| The colour of each field (green filled / amber pending) | the `[required]` input and the `hasValue` getter of the shared controls → `app-field-card` |

**W1/W2 has only one source**: `DataControlService.someMandatoryFieldIncompleteResultDetail()` scans
the DOM, and the same scan both counts the fields and tags them (`data-pr-feedback`), which is also
what lets its bar offer a `Go` per entry. That is why the two can never disagree there — and why
they could, and did, here.

Every defect below is one instance of that split.

## What was fixed

| What the reporter saw | Cause | Commit |
|---|---|---|
| Geographic focus painted **green over five empty radios** while the footer said "1 field missing" | the endpoint returns `geo_scope_id: 0` for "never chosen"; `pr-radio-button.hasValue` only rejects `null`/`undefined` | `31562acba` |
| Readiness / use ladders counted but never marked | `pr-range-level` paints a pending marker only when the caller passes `[required]` — W1/W2's `innovation-use-form` already did | `43ce55f4a` |
| The "Still missing" panel named a field and offered nothing to click | no `Go`. Cannot be ported as is: there is no DOM scan here, so an entry is matched to the **visible label**, and only when exactly one label matches | `6d5322b2a` |
| The counter vanished while typing | "Unsaved changes" was an `@else if` in front of it. They coexist now; the green "Section complete" still yields, because that one speaks about what is **saved** | `6d5322b2a` |
| The four people-trained inputs rendered as empty boxes | `.tsf-row` is a flex row whose children are component hosts; since the field moved inside `app-field-card` its content no longer pushes width. Measured at **0 px** on prtest | `d2fbed005` |
| Evidence and the people-trained group counted with nothing on screen to mark | both now sit in a required `app-field-card`; the group's tint and its checklist item read one shared predicate | `0f02f2e16` |

The W1/W2 bottom bar also got a container per group (`aa7e9c77d`) — unrelated to the validator, same
session.

## What is deliberately NOT fixed

Geography asks *"are there any regions"* and *"are there any countries"* as **required**, and
`updateTracker()` counts neither — so a section can read complete with both unanswered. Adding them
would start **blocking Submit for results that pass today**, which changes what the platform
considers complete. That is a business decision, not a defect with one right value.

## How to measure it again, without fooling yourself

Per section, compare the footer number against the pending markers on screen. 🛑 There are **three**
kinds of marker and counting only the first gives false gaps:

1. `.field_card[data-state="todo"]` with a `.fch_required` inside — ordinary fields;
2. `.prl-required` — `pr-range-level`'s own notice;
3. `.pr_label.required` — group headers rendered with `app-pr-field-header`.

⚠️ And a ladder shows up **twice** (its notice *and* the header above it are the same field), so
de-duplicate before declaring a gap.

Deep links: `/bilateral/<centre>/result/<code>` hangs on the skeleton **without `?phase=NN`** — open
it from the results list, or add the phase.
