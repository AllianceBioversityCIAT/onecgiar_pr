# Content authoring notes

<!-- @akili-spec changes/user-guide-pdf -->

## Sign-in reference (`UG-T-8`, resolves `UG-OQ-4`)

**Decision (user, 2026-09-15):** the guide body MUST NOT name any environment or URL
(no `localhost`, no staging or production host). Use generic phrasing only, e.g.
"sign in to the Reporting Tool" / "open the Reporting Tool and sign in with your CGIAR account".

Rationale: the same PDF is handed to end users regardless of which environment they use,
and the capture origin (`CLIENT_BASE_URL`) is a build-time detail, not reader-facing copy.

`UG-T-9` consumes this note: every section and the introduction follow it.

## Update 2026-09-17 (reviewer comments, `quick/user-guide-review-comments`)

The reviewer asked for the PRMS production link and the testing environment link in the
introduction. The no-URL rule above is therefore **superseded for the introduction only**:
`https://reporting.cgiar.org` (production) and `https://reporting-test.cgiar.org` (testing).
Section narratives still name no environment. Also applied: cover kicker "Performance and
Results Management System (PRMS)", new cover description, "Version 1, 16 September 2026" on the
cover and as a footer on every page, intro paragraphs 2-3 removed, glossary entry "Initiative"
removed.
