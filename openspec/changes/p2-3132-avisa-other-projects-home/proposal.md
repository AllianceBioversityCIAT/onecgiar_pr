## Why

AVISA (Science Program `SGP-02`) is categorized like any other Science Program on the Result Framework home page. Users with a member role on AVISA see it under **My Science Programs/Accelerators**, but product wants AVISA isolated in its own **Other projects** section regardless of membership (**P2-3132**, child of P2-2338).

## What Changes

- Add a new home-page section titled **Other projects** (distinct from **Other Science Programs/Accelerators**).
- Move the AVISA card into **Other projects** exclusively — never under My or Other SP grids.
- Keep the existing card component, data payload, routing, and SGP-02 short-name display; only visual grouping changes.
- Partition the existing `GET science-programs/progress` response on the client (no API change).

## Capabilities

### New Capabilities
- `home-other-projects-section`: Home page shows a dedicated **Other projects** section containing AVISA (`SGP-02` / `SGP02` / `initiativeId` 41), always excluded from My/Other SP lists.

### Modified Capabilities
- (none)

## Impact

- **Client only** (`onecgiar-pr-client`):
  - `result-framework-reporting-home.service.ts` (+ spec)
  - `result-framework-reporting-home.component.html` (+ scss)
  - `entity-details.component.ts` — include `otherProjectsList` in SGP-02 name fallback
- No backend, API, or migration changes.
- SDD baseline: `docs/system-design/design.md` (Result Framework home IA).
