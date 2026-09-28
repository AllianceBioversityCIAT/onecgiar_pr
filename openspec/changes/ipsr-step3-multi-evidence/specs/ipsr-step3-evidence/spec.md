## ADDED Requirements

### Requirement: Evidence list per component and level in IPSR Step 3
Step 3 "Package and Assess" SHALL show, for the core innovation and for each complementary innovation / enabler, an evidence list under the readiness level and another under the use level, replacing the single "Evidence link". Each piece of evidence SHALL be a link or a file uploaded to the PRMS repository, SHALL record whether an uploaded file can be shared publicly, and MAY carry details of up to 50 words.

#### Scenario: Add a link evidence
- **WHEN** the user opens "Add evidence" under the core innovation readiness level, enters a link and confirms, then saves the step
- **THEN** after reloading, the evidence appears in that list with its link and details

#### Scenario: Upload a file evidence
- **WHEN** the user chooses "Upload file", answers the public question, selects a file and saves
- **THEN** the file is stored in the PRMS repository folder of the package and the list shows it after reloading

### Requirement: Maximum evidence per component
The system SHALL accept at most 6 pieces of evidence per component (readiness and use together) and SHALL disable "Add evidence" once the limit is reached.

#### Scenario: Limit reached
- **WHEN** a component already has 6 pieces of evidence
- **THEN** "Add evidence" is disabled for both of its levels and the server rejects a seventh

### Requirement: Impact Area tags and score-2 alert
Each piece of evidence SHALL be taggable with the five Impact Areas and with Innovation Use. For every Impact Area scored 2 (Principal) in General information, Step 3 SHALL show an alert until at least one piece of evidence anywhere in Step 3 is tagged with it.

#### Scenario: Alert clears when tagged
- **WHEN** Gender equality is scored 2 and no Step 3 evidence is tagged Gender equality
- **THEN** Step 3 shows the Gender equality alert, and it disappears once one evidence is tagged Gender equality

### Requirement: General information no longer asks for Impact Area evidence (current portfolio)
For P25 packages, General information SHALL NOT show an evidence box under an Impact Area scored 2; the score-2 note SHALL point to Step 3. Older portfolios SHALL keep their current behaviour.

#### Scenario: Score 2 in General information
- **WHEN** a P25 package sets an Impact Area to (2) Principal
- **THEN** only the score, the component question and the note linking to Step 3 are shown

### Requirement: Backward compatibility with the single-link columns
The first evidence of each level SHALL also be stored in the legacy single-link columns, and a package that only has a legacy link SHALL show it as the first evidence of that level.

#### Scenario: Existing package
- **WHEN** a package saved before this change has a readiness evidence link
- **THEN** Step 3 shows it as the first readiness evidence and the section completion is unchanged
