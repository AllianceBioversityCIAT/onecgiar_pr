# Content authoring notes

<!-- @akili-spec changes/user-guide-pdf -->

## Sign-in reference (`UG-T-8`, resolves `UG-OQ-4`)

**Decision (user, 2026-09-15):** the guide body MUST NOT name any environment or URL
(no `localhost`, no staging or production host). Use generic phrasing only, e.g.
"sign in to the Reporting Tool" / "open the Reporting Tool and sign in with your CGIAR account".

Rationale: the same PDF is handed to end users regardless of which environment they use,
and the capture origin (`CLIENT_BASE_URL`) is a build-time detail, not reader-facing copy.

`UG-T-9` consumes this note: every section and the introduction follow it.
