## Why

P2-2981 (PR #698). SonarQube Quality Gate flagged 2 Security Hotspots (rule `typescript:S5332` — "Using http protocol is insecure. Use https instead."). Both are clear-text `http://` literals used as sample link data inside Angular unit tests — no real request is made, so there is no real security risk, but the gate blocks the PR on them.

**Frontend-only.** Test fixtures only. No production code or backend change.

## What Changes

- `rd-evidences.component.spec.ts`: change the sample link `http://x` → `https://x` in the `evidenceDisplayName` test.
- `user-evidence.component.spec.ts`: change the sample link `http://example.com` → `https://example.com` in the `cleanSource` test.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- None. Test-fixture-only change to satisfy a security linter; no behavior or requirement changes. -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/user-evidence/user-evidence.component.spec.ts`
- Jira: P2-2981 / PR #698 SonarQube Quality Gate.
- Note: the SonarQube "Duplication on New Code" condition is out of scope here; the backend duplication (`evidences.service.ts`) is handed to the backend dev separately.
