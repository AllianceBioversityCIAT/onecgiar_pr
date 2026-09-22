## ADDED Requirements

### Requirement: AI Review button availability by result type
The AI Review button SHALL be offered for every result type, including Knowledge Products, and its
visibility SHALL depend only on the result being in `Editing` (`status_id == 1`) and the user having
write access (`RolesService.readOnly === false`).

#### Scenario: Knowledge Product in Editing with write access
- **WHEN** the open result is a Knowledge Product (`result_type_id === 6`) with `status_id === 1` and the user is not read-only
- **THEN** the AI Review button is rendered

#### Scenario: Non Knowledge Product keeps today's behaviour
- **WHEN** the open result is any other type with `status_id === 1` and the user is not read-only
- **THEN** the AI Review button is rendered

#### Scenario: Read-only user never gets the button, Knowledge Product included
- **WHEN** the open result is a Knowledge Product and `RolesService.readOnly` is `true`
- **THEN** the AI Review button is not rendered

#### Scenario: Result that left Editing
- **WHEN** the open result is a Knowledge Product with `status_id` other than `1`
- **THEN** the AI Review button is not rendered

### Requirement: AI Review output for Knowledge Products is limited to Impact Areas
For a Knowledge Product the AI Review dialog SHALL offer Impact Area recommendations only. The
client SHALL NOT request the editable text fields for a Knowledge Product, SHALL leave the dialog's
title/description proposal list empty, and SHALL NOT persist any AI text proposal for it.

#### Scenario: Running AI Review on a Knowledge Product
- **WHEN** the user runs AI Review on a result whose `result_type_id` is `6`
- **THEN** `GET /api/ai/result-context/{id}` is not called
- **AND** the dialog's proposal list is empty, so no title or description card is rendered
- **AND** `POST /api/ai/sessions/{id}/proposals` is not called
- **AND** the Impact Areas cards are still built from the DAC scores and the AI recommendations

#### Scenario: Running AI Review on any other result type
- **WHEN** the user runs AI Review on a result whose `result_type_id` is not `6`
- **THEN** `GET /api/ai/result-context/{id}` is called and its fields are matched against the AI response
- **AND** `POST /api/ai/sessions/{id}/proposals` is called with the resulting proposals
