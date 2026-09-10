## ADDED Requirements

### Requirement: Multiple component selection per impact area
The `IMPACT AREAS` section of the AI Review dialog SHALL allow the user to select one or more components for an impact area whose score is `Principal` (`tag_id === 3`). This applies identically to the five impact areas: gender, climate, nutrition, environmental and poverty.

#### Scenario: Selecting two components at once
- **WHEN** the user opens the AI Review dialog on the *Climate adaptation and mitigation* card, sets the score to `Principal`, and clicks *Adaptation* and then *Mitigation*
- **THEN** both components appear selected at the same time and neither deselects the other

#### Scenario: Deselecting one of several components
- **WHEN** two components are selected and the user clicks one of them again
- **THEN** only that component is deselected and the other one stays selected

#### Scenario: Score is not Principal
- **WHEN** the score of an impact area is `Not Targeted` or `Significant`
- **THEN** the component selector is not shown and any previously selected components for that impact area are cleared

#### Scenario: Principal requires at least one component
- **WHEN** the score is `Principal` and no component is selected
- **THEN** the save action for that impact area is blocked and the user is told a component is required

### Requirement: Persisting multiple components
When impact-area changes are saved, the client SHALL send the full list of selected component ids for that impact area, and SHALL reflect the persisted list when the dialog is reopened.

#### Scenario: Saving two components
- **WHEN** the user saves an impact area with *Adaptation* and *Mitigation* selected
- **THEN** the request payload carries both component ids as a list

#### Scenario: Reopening after saving
- **WHEN** the user closes the dialog and opens the AI Review again for the same result
- **THEN** the previously saved components appear selected

#### Scenario: Removing a component
- **WHEN** the user deselects a component that had been saved before and saves again
- **THEN** the payload contains only the remaining component ids, so the removed one is no longer persisted

### Requirement: Validation badge reflects the current selection
Each impact-area card SHALL recompute its `Needs improvement` / `AI Validated` badge from the user's current score and component selection, not only from the AI response captured when the dialog opened.

#### Scenario: Applying the AI suggestion updates the badge
- **WHEN** a card shows `Needs improvement` and the user changes the score to the value the AI recommends
- **THEN** the badge changes to `AI Validated` without closing or reopening the dialog

#### Scenario: Moving away from the AI suggestion
- **WHEN** a card shows `AI Validated` and the user changes the score or components to something the AI did not recommend
- **THEN** the badge returns to `Needs improvement`

#### Scenario: Card already aligned when the dialog opens
- **WHEN** the AI response for an impact area is `approved` and the user changes nothing
- **THEN** the card shows `AI Validated` and no AI recommendation text is displayed

### Requirement: Global validate action
The AI Review dialog SHALL offer a single action that persists every pending impact-area change at once and confirms to the user that the changes were applied to the result.

#### Scenario: Saving several cards in one action
- **WHEN** the user has pending changes on more than one impact-area card and triggers the global validate action
- **THEN** every pending card is persisted and no card is left with unsaved changes

#### Scenario: Nothing pending
- **WHEN** there are no pending impact-area changes
- **THEN** the global validate action is unavailable

#### Scenario: A card fails to save
- **WHEN** one impact area fails to persist during the global action
- **THEN** the user is informed of the failure and the failing card keeps its pending state so it can be retried

#### Scenario: Blocked by an incomplete card
- **WHEN** any card has score `Principal` with no component selected
- **THEN** the global validate action reports which impact area is incomplete and does not persist that card
