## ADDED Requirements

### Requirement: The Evidence guidance no longer directs users to CGSpace

Now that Knowledge Products are available in PRMS, the Evidence guidance SHALL NOT instruct users to share CGIAR publications via a CGSpace link.

#### Scenario: The CGSpace sentence is removed

- **WHEN** a user opens the Evidence section of a result that is not a Knowledge Product
- **THEN** the guidance bullet about public accessibility no longer contains `All CGIAR publications should be shared using a CGSpace link.`
- **AND** the requirement that all links provided be publicly accessible is still stated

### Requirement: The PRMS repository upload line is stated plainly

The guidance line about uploading files SHALL read `Files can be uploaded to the PRMS repository.`

#### Scenario: The upload line drops the "also" phrasing

- **WHEN** the Evidence guidance is rendered
- **THEN** it contains `Files can be uploaded to the PRMS repository.`
- **AND** it does not contain `Files can be also uploaded to the PRMS repository`

### Requirement: The confidential-evidence bullet highlights the confidentiality answer

The confidential-evidence guidance SHALL name the confidentiality question explicitly and render that part in bold, as a single running line.

#### Scenario: The bullet carries the approved text with bold emphasis

- **WHEN** the Evidence guidance is rendered
- **THEN** it contains `For confidential evidence, select "Upload file" and then respond with "No" to the confidentiality question to indicate that it should not be public.`
- **AND** the fragment `respond with "No" to the confidentiality question` is rendered in bold
- **AND** the bullet renders as one running line, with no line breaks inside it

### Requirement: Unlisted Evidence guidance is preserved

The guidance items this change does not name SHALL remain exactly as they are.

#### Scenario: The maximum, the prohibition and the tutorial link survive

- **WHEN** the Evidence guidance is rendered
- **THEN** the rule limiting submissions to a maximum of 6 pieces of evidence per result is still stated
- **AND** the prohibition on SharePoint, One Drive, Google Drive, DropBox and other file storage platforms is still stated
- **AND** the video tutorial link still points to its existing SharePoint URL

### Requirement: Result-type-specific Evidence guidance is preserved

The Evidence guidance branches that apply only to specific result types SHALL be left untouched by this change.

#### Scenario: Knowledge Product results keep their own guidance

- **WHEN** a user opens the Evidence section of a Knowledge Product result
- **THEN** the guidance reads `As this knowledge product is stored in the repository, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.`
- **AND** the general bullet list is not rendered for that result

#### Scenario: Capacity sharing results keep their two extra notes

- **WHEN** a user opens the Evidence section of a Capacity sharing for development result
- **THEN** the note about GDPR and quality assurance is still appended to the guidance
- **AND** the note about evidence being made available should a sub-sample be required is still appended
