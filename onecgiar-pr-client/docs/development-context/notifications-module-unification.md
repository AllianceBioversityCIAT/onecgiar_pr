# Notifications Module - IPSR Unification (P2-2157)

## Overview

The IPSR (Innovation Package & Scaling Readiness) notifications were previously a separate section at `/ipsr/list/notifications`. This refactor unified them into the main Results Notifications module at `/results-notifications`, eliminating the need for a separate IPSR notification view.

## What Changed

### Problem

The Results Notifications module had three tabs: **Requests** (received/sent), **Updates**, and **Settings**. It only showed notifications for Reporting phases. IPSR notifications lived in a completely separate module with its own components, pipes, and endpoint (`GET /api/results/request/get/all`).

When the user selected an IPSR phase (e.g., "IPSR 2025") in the Results Notifications dropdown, zero results appeared because:

1. The backend endpoint `GET /api/notification/updates` only returned notifications associated with Reporting phases.
2. The endpoints `GET /api/results/request/get/received` and `GET /api/results/request/get/sent` returned all data (including IPSR), but filtering was done client-side with pipes that matched `obj_result.obj_version.id` against the selected phase. Since the backend returned everything, selecting IPSR phase worked for requests but not for updates.

### Solution

#### Backend Changes (done by backend team)

Three endpoints were updated to accept a `version_id` query parameter for server-side phase filtering:

| Endpoint | Query Param |
|---|---|
| `GET /api/notification/updates` | `?version_id={phaseId}` |
| `GET /api/results/request/get/received` | `?version_id={phaseId}` |
| `GET /api/results/request/get/sent` | `?version_id={phaseId}` |

The `version_id` corresponds to the `id` field from `GET /api/versioning?status=all&module=all`.

#### Frontend Changes

**Phase filtering moved from client-side (pipes) to server-side (query params):**

1. **`results-api.service.ts`** - Three methods updated to accept and send `versionId`:
   - `GET_requestUpdates(versionId?)` -> `GET /api/notification/updates?version_id=`
   - `GET_allRequest(versionId?)` -> `GET /api/results/request/get/received?version_id=`
   - `GET_sentRequest(versionId?)` -> `GET /api/results/request/get/sent?version_id=`

2. **`results-notifications.service.ts`** - Three fetch methods updated:
   - `get_updates_notifications(versionId?)` - Passes versionId to API, clears data and sets `loadingUpdates` flag.
   - `get_section_information(versionId?)` - Passes versionId to API, clears data and sets `loadingReceived` flag.
   - `get_sent_notifications(versionId?)` - Passes versionId to API, clears data and sets `loadingSent` flag.
   - Added three loading flags: `loadingReceived`, `loadingSent`, `loadingUpdates`.

3. **`results-notifications.component.ts`** - Added `onPhaseChange(phaseId)` method that re-fetches all three endpoints when the phase dropdown changes.

4. **`results-notifications.component.html`** - Added `(ngModelChange)="onPhaseChange($event)"` to the Phases `p-select` dropdown.

5. **Templates (received, sent, updates)** - Removed the `filterNotificationByPhase` pipe from all template pipe chains. Replaced `@defer (when data)` pattern with `@if (loading)` skeleton pattern so skeletons re-appear on phase change. Initiative and search filters remain as client-side pipes.

## Current Architecture

### Module Location

```
src/app/pages/results/pages/results-outlet/pages/results-notifications/
  results-notifications.component.ts      # Parent - tabs, phase/entity/search filters
  results-notifications.service.ts        # Centralized state & API calls
  components/
    notification-item/                    # Request notification card (accept/reject)
    update-notification/                  # Update notification card (read/unread)
    notification-item/skeleton-...        # Skeleton placeholder
  pages/
    requests/
      pages/received-requests/            # "Requests received" sub-tab
      pages/sent-requests/                # "Requests sent" sub-tab
    updates/                              # "Updates" tab
    settings/                             # "Settings" tab (per-initiative toggles)
  pipes/
    filter-notification-by-phase.pipe.ts  # NO LONGER USED in these templates
    filter-notification-by-initiative.pipe.ts  # Still used (client-side)
    filter-notification-by-search.pipe.ts     # Still used (client-side)
```

### Data Flow

```
Phase dropdown change
  -> onPhaseChange(phaseId)
    -> get_updates_notifications(phaseId)   # clears data, sets loading, calls API
    -> get_section_information(phaseId)      # clears data, sets loading, calls API
    -> get_sent_notifications(phaseId)       # clears data, sets loading, calls API

API Response arrives
  -> Data stored in service (receivedData, sentData, updatesData)
  -> Loading flags set to false
  -> Templates re-render with new data
  -> Client-side pipes apply initiative + search filters
```

### API Endpoints

| Frontend Method | Endpoint | Params |
|---|---|---|
| `GET_requestUpdates(versionId?)` | `GET /api/notification/updates` | `?version_id=` |
| `GET_allRequest(versionId?)` | `GET /api/results/request/get/received` | `?version_id=` |
| `GET_sentRequest(versionId?)` | `GET /api/results/request/get/sent` | `?version_id=` |
| `GET_versioning(status, module)` | `GET /api/versioning` | `?status=&module=` |
| `GET_notificationsPopUp()` | `GET /api/notification/updates-pop-up` | none |
| `PATCH_updateRequest(body)` | `PATCH /api/results/request/update` | body |
| `PATCH_readNotification(id)` | `PATCH /api/notification/read/{id}` | path param |
| `PATCH_readAllNotifications()` | `PATCH /api/notification/read-all` | none |

### Authentication

The API uses a custom `auth` header (NOT `Authorization: Bearer`). This is set automatically by the HTTP interceptor at `src/app/shared/interceptors/general-interceptor.service.ts`. To test endpoints manually:

```bash
curl -s -H "auth: <JWT_TOKEN>" "https://prtest-back.ciat.cgiar.org/api/notification/updates?version_id=31"
```

Get the token from the browser: DevTools > Application > Local Storage > `token` key.

### Phases

Phases come from `GET /api/versioning?status=all&module=all`. Each phase has:
- `id` - Used as `version_id` in API calls
- `phase_name` - Display name (e.g., "IPSR 2025", "Reporting 2025")
- `status` - Boolean, true = Open
- The dropdown preselects the first active phase via `.find(phase => phase.status)?.id`

### Response Structures

**Updates** (`GET /api/notification/updates`):
```json
{
  "notificationsViewed": [],
  "notificationsPending": [
    {
      "notification_id": "4741",
      "notification_type": 5,
      "read": false,
      "created_date": "2025-10-07T...",
      "obj_emitter_user": { "first_name": "...", "last_name": "..." },
      "obj_result": {
        "result_code": "6026",
        "title": "...",
        "obj_result_by_initiatives": [{ "initiative_id": 50, "obj_initiative": { "official_code": "SP01" } }],
        "obj_version": { "id": "34", "phase_name": "Reporting 2025" }
      }
    }
  ],
  "notificationAnnouncement": []
}
```

**Requests received** (`GET /api/results/request/get/received`):
```json
{
  "receivedContributionsPending": [
    {
      "share_result_request_id": 1515,
      "request_status_id": 1,
      "is_map_to_toc": false,
      "requested_date": "2023-04-19T...",
      "obj_result": {
        "result_code": "4509",
        "title": "...",
        "obj_version": { "id": "3", "phase_name": "IPSR 2023" },
        "obj_result_type": { "id": 10, "name": "Innovation Use(IPSR)" }
      },
      "obj_requested_by": { "first_name": "...", "last_name": "..." },
      "obj_owner_initiative": { "id": 20, "official_code": "INIT-20" },
      "obj_shared_inititiative": { "id": 4, "official_code": "INIT-04" }
    }
  ],
  "receivedContributionsDone": []
}
```

### Old IPSR Module (kept but no longer primary)

The old IPSR notification section at `src/app/pages/ipsr/pages/innovation-package-list-content/pages/innovation-packages-notification/` still exists. It uses:
- `GET /api/results/request/get/all` (flat data structure with `version_id`, `shared_inititiative_id`)
- Its own `filterNotificationByPhase` pipe that filters by `item.version_id == phaseId`
- Its own `NotificationItemInnovationComponent` with IPSR-specific URL routing (`/ipsr/detail/...`)

## Files Modified

| File | Change |
|---|---|
| `shared/services/api/results-api.service.ts` | Added `versionId` param to 3 GET methods |
| `results-notifications.service.ts` | Added `versionId` param, loading flags, data clearing |
| `results-notifications.component.ts` | Added `onPhaseChange()`, initial fetch with phase, `ModuleTypeEnum.ALL` |
| `results-notifications.component.html` | Added `(ngModelChange)` to phase dropdown |
| `pages/updates/updates.component.html` | Removed phase pipe, added loading skeletons |
| `pages/updates/updates.module.ts` | Imported `SkeletonNotificationItemComponent` |
| `pages/requests/pages/received-requests/received-requests.component.ts` | Pass `phaseFilter` in `ngOnInit` |
| `pages/requests/pages/received-requests/received-requests.component.html` | Removed phase pipe, `@defer` -> `@if (loading)` skeletons |
| `pages/requests/pages/sent-requests/sent-requests.component.ts` | Pass `phaseFilter` in `ngOnInit` |
| `pages/requests/pages/sent-requests/sent-requests.component.html` | Removed phase pipe, `@defer` -> `@if (loading)` skeletons |
| `results-notifications.component.spec.ts` | Updated test: `ModuleTypeEnum.ALL` |
| `results-notifications.service.spec.ts` | Updated tests: `[]` instead of `null` for cleared data |
