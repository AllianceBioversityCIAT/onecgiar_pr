## Context

Two Angular `.spec.ts` files use `http://` literals as sample evidence links. SonarQube rule `typescript:S5332` flags any clear-text `http://` usage as a security hotspot. The links are inert test fixtures (asserting a display/clean function), so the risk is nil, but the Quality Gate still blocks PR #698.

## Goals / Non-Goals

**Goals:**
- Clear the 2 `S5332` security hotspots so the gate passes.
- Keep the tests green and their assertions equivalent.

**Non-Goals:**
- No production code change.
- No change to the SonarQube duplication condition (out of scope; backend portion handed off separately).

## Decisions

- **Change the literals to `https://` rather than marking the hotspots "Safe" in SonarQube.** A code change is self-documenting, lives with the PR, and needs no Sonar admin permission (the UI shows "Changing a hotspot's status requires permission"). The assertions are unaffected: one checks the value is echoed back (still true with https), the other only checks the link becomes null after `cleanSource`.

## Risks / Trade-offs

- [None meaningful] → Test-fixture string change; both specs re-run green (49/49).
