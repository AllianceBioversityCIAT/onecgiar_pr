## ADDED Requirements

### Requirement: Evidence-section tutorial video link points to the current recording

The Evidence section SHALL show a help tip linking users to the external video tutorial on how to create an evidence entry. The link's `href` MUST point to the current SharePoint recording:

`https://cgiar.sharepoint.com/:v:/s/OneCGIARPRMSRepository/IQCPCRtUOihDQKJExjQgfIOIAZQAZH4pnHDucy3HX-w14WU?e=Xoy42x`

The link MUST open in a new tab (`target="_blank"`) and keep the surrounding help-tip wording unchanged.

#### Scenario: User opens the tutorial link from the Evidence section
- **WHEN** a user viewing a result's Evidence section clicks the "video tutorial" link in the help tip
- **THEN** a new browser tab opens the current SharePoint recording (`IQCPCRtUOihD…?e=Xoy42x`)
- **AND** the outdated recording (`ETb3eWyBPm9F…?e=kvLk2t`) is no longer referenced anywhere in the client
