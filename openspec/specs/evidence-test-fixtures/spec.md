# evidence-test-fixtures Specification

## Purpose
TBD - created by archiving change p2-2981-evidence-test-https-hotspot. Update Purpose after archive.
## Requirements
### Requirement: Evidence unit tests use https sample links
Evidence-related Angular unit tests SHALL use `https://` sample links instead of clear-text `http://`, so they do not trigger SonarQube security hotspot rule S5332.

#### Scenario: No clear-text http links in evidence specs
- **WHEN** SonarQube analyzes the evidence `.spec.ts` files
- **THEN** no `S5332` ("Using http protocol is insecure") hotspot is raised from their sample link fixtures

#### Scenario: Tests still pass with https fixtures
- **WHEN** the evidence unit test suites run
- **THEN** all assertions pass with the `https://` sample links

