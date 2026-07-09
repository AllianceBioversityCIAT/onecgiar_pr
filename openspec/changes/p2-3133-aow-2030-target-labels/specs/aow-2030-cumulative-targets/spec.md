## ADDED Requirements

### Requirement: 2030 Outcomes shows cumulative target column

The 2030 Outcomes view (`tableType === '2030-outcomes'`) SHALL display a target column labeled **"2030 target"** and SHALL show `target_value_sum` as the cumulative sum of indicator targets from reporting years **2025 through 2030** (inclusive).

#### Scenario: 2030 Outcomes column label

- **WHEN** a user opens the 2030 Outcomes table
- **THEN** the target column header reads **"2030 target"** (not the active reporting phase year)

#### Scenario: Cumulative target value from API

- **WHEN** the client requests `GET /api/results-framework-reporting/toc-results/2030-outcomes`
- **THEN** each indicator's `target_value_sum` equals the sum of `target_value` for `target_date` from 2025 to 2030 inclusive

#### Scenario: Progress uses cumulative target

- **WHEN** 2030 Outcomes data is returned with cumulative `target_value_sum` and reporting-year `actual_achieved_value_sum`
- **THEN** `progress_percentage` is calculated as achieved divided by the cumulative target (not the single-year target)

### Requirement: Achieved column uses "Achieved value" label

The AoW indicator table and view-results drawer SHALL label the achieved column **"Achieved value"** instead of "Achieved target".

#### Scenario: Main table header

- **WHEN** a user views any AoW HLO table (outputs, outcomes, or 2030-outcomes)
- **THEN** the achieved column header reads **"Achieved value"**

#### Scenario: View results drawer

- **WHEN** a user opens the view-results drawer from an AoW indicator row
- **THEN** the contributing column header reads **"Achieved value"**

### Requirement: Normal AoW views unchanged for target column

High-Level Outputs and Intermediate Outcomes views SHALL continue to show `{active reporting phase year} target` with single-year `target_value_sum`.

#### Scenario: HLO outputs view

- **WHEN** `tableType` is `outputs` and the active reporting phase year is 2026
- **THEN** the target column reads **"2026 target"** and `target_value_sum` reflects only the reporting year target

#### Scenario: Intermediate outcomes view

- **WHEN** `tableType` is `outcomes` and the active reporting phase year is 2026
- **THEN** the target column reads **"2026 target"** and `target_value_sum` reflects only the reporting year target
