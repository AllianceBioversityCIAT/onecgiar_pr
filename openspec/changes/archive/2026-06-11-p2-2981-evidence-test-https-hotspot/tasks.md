## 1. Replace http with https in evidence test fixtures

- [x] 1.1 `rd-evidences.component.spec.ts`: `http://x` → `https://x` in the `evidenceDisplayName` test.
- [x] 1.2 `user-evidence.component.spec.ts`: `http://example.com` → `https://example.com` in the `cleanSource` test.

## 2. Verify

- [x] 2.1 Run both specs and confirm green. → 49/49 pass.
