## ADDED Requirements

### Requirement: Other projects section on home page
The Result Framework home page SHALL render a distinct section titled **Other projects**, separate from **My Science Programs/Accelerators** and **Other Science Programs/Accelerators**.

#### Scenario: Section visible when AVISA is in the progress response
- **WHEN** the science-programs progress response includes AVISA (`SGP-02`, `SGP02`, or `initiativeId` 41)
- **THEN** the home page displays an **Other projects** section containing the AVISA card

#### Scenario: Section hidden when AVISA is absent
- **WHEN** the progress response does not include AVISA
- **THEN** the **Other projects** section is not rendered

### Requirement: AVISA exclusive to Other projects
AVISA SHALL NOT appear in the My or Other Science Programs grids, regardless of the user's membership role.

#### Scenario: Member user with AVISA role
- **WHEN** the API returns AVISA in `mySciencePrograms` because the user has edit access
- **THEN** AVISA is removed from the My grid and shown only under **Other projects**

#### Scenario: Non-member user
- **WHEN** the API returns AVISA in `otherSciencePrograms`
- **THEN** AVISA is removed from the Other SP grid and shown only under **Other projects**

### Requirement: AVISA card data unchanged
The AVISA card in **Other projects** SHALL use the same `SPProgress` payload and `ResultFrameworkReportingCardItemComponent` as before (name, icon, progress, navigation).

#### Scenario: Card navigation
- **WHEN** the user clicks the AVISA card in **Other projects**
- **THEN** navigation goes to `/result-framework-reporting/entity-details/SGP-02` (or equivalent initiative code) with the same behavior as before the move
