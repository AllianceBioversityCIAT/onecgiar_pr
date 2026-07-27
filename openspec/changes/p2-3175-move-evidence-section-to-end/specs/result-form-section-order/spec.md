# result-form-section-order — Delta Spec (P2-3175)

## ADDED Requirements

### Requirement: Evidence is the last section of the result form
The Result Detail form SHALL display the Evidence section as the last visible section of the section menu for every applicable result type (Capacity Sharing for Development, Innovation Development, Innovation Use, Knowledge Product, Policy Change) and for both portfolios (P22 and P25). The type-specific section (e.g., Innovation Use info) SHALL appear before Evidence.

#### Scenario: Evidence appears last for a type-specific result
- **WHEN** a user opens a result whose type has a type-specific section (e.g., Innovation Development, result_type_id 7)
- **THEN** the side panel menu lists the type-specific section before Evidence, and Evidence is the final item in the menu

#### Scenario: Evidence appears last for every result type
- **WHEN** a user opens a result of any of the 5 result types (ids 1, 2, 5, 6, 7) in either portfolio (P22 or P25)
- **THEN** Evidence is always the last item of the side panel menu for that result

#### Scenario: Menu numbering reflects the new order
- **WHEN** the side panel menu renders after the reorder
- **THEN** the visible numbering (`1.`, `2.`, …) is sequential with Evidence holding the highest number, with no gaps or duplicates

### Requirement: Section order is defined solely by the routing array
The order of the Result Detail sections SHALL be defined exclusively by the order of entries in the `resultDetailRouting` array (`shared/routing/routing-data.ts`), with the `**` wildcard redirect remaining the last entry of the array. No consumer SHALL depend on the numeric position of a section.

#### Scenario: Wildcard remains last
- **WHEN** the `resultDetailRouting` array is evaluated by the Angular router
- **THEN** the `**` redirect to `general-information` is the final entry, after Evidence

#### Scenario: Reordering does not affect functionality
- **WHEN** the Evidence section is moved to the end of the array
- **THEN** the Evidence route (`evidences`), its stored data, its validations, and its green check (matched by `section_name`, not by position) behave exactly as before
