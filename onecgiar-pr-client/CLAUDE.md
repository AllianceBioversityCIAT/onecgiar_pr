# CLAUDE.md - Project Instructions

## Project Overview

This is the **PRMS (Planning and Reporting Management System)** Angular frontend client for the OneCGIAR platform.

## API Authentication

The backend API uses a custom `auth` header (not `Authorization: Bearer`). This is handled by the interceptor at `src/app/shared/interceptors/general-interceptor.service.ts`.

### Providing a Token for API Testing

To allow Claude to test endpoints, validate response shapes, update interfaces, or debug API issues, **you must provide a valid JWT token** at the start of the conversation.

How to get your token:
1. Log in to the application in your browser.
2. Open DevTools > Application > Local Storage.
3. Copy the value stored under the `token` key.
4. Paste it in the conversation.

Example usage:
```
Here is my token: eyJhbGciOiJIUzI1NiIs...
```

### How Claude Uses the Token

With a valid token, Claude can:

- **Test API endpoints** via `curl` using the `auth` header to verify responses.
- **Validate response structures** against TypeScript interfaces and suggest updates when the API contract changes.
- **Debug data issues** by inspecting real payloads and identifying mismatches between frontend expectations and backend responses.
- **Update interfaces** (`src/app/shared/interfaces/`) to match actual API responses.
- **Write or fix unit tests** with realistic mock data based on real API responses.

### API Base URLs (from environment.ts)

| Variable          | URL Pattern                                      |
| ----------------- | ------------------------------------------------ |
| `apiBaseUrl`      | `{environment.apiBaseUrl}api/results/`           |
| `apiBaseUrlV2`    | `{environment.apiBaseUrl}v2/api/results/`        |
| `baseApiBaseUrl`  | `{environment.apiBaseUrl}api/`                   |
| `baseApiBaseUrlV2`| `{environment.apiBaseUrl}v2/api/`                |

The main API service is at `src/app/shared/services/api/results-api.service.ts`.

### curl Example

```bash
curl -s -H "auth: <TOKEN>" "https://prtest-back.ciat.cgiar.org/api/results/get/all"
```

## Build & Run

```bash
npm install
npm start           # Runs on http://localhost:4200
npm run build       # Production build
```

## Testing

```bash
npm run test        # Run unit tests (Karma + Jasmine)
```

## Project Structure

```
src/app/
  pages/              # Feature modules (results, ipsr, quality-assurance, etc.)
  shared/
    services/api/     # API services (results-api.service.ts, auth.service.ts)
    interceptors/     # HTTP interceptor (adds auth header automatically)
    interfaces/       # TypeScript interfaces for API responses
    guards/           # Route guards (login check)
  environments/       # Environment configs (dev, prod)
```

## Key Conventions

- **Angular 17+** with standalone components and signals where applicable.
- **PrimeNG** is used for UI components.
- API methods follow the naming pattern: `HTTP_METHOD_descriptiveName` (e.g., `GET_allRequest`, `PATCH_readNotification`).
- The interceptor automatically attaches the `auth` header to all requests except Elasticsearch calls.

## Commit Convention

Commits follow the format:

```
<emoji> <type>(<scope>) [ticket]: <description>
```

### Emojis & Types

| Emoji | Type       | Usage                                  |
| ----- | ---------- | -------------------------------------- |
| ✨    | `feat`     | New features or functionality          |
| ♻️    | `refactor` | Code refactoring without behavior change |
| 🔧    | `fix`      | Bug fixes                              |
| 🎨    | `style`    | UI/style changes, formatting           |

### Rules

- **scope**: Component or service name in parentheses (e.g., `results-notifications`, `bilateral.service`).
- **ticket** (optional): Jira ticket ID after the scope, before the colon (e.g., `P2-2498`).
- **description**: Starts with a capital letter verb describing the change (e.g., `Update`, `Add`, `Enhance`, `Simplify`).

### Examples

```
✨ feat(knowledge-product-info): Integrate FieldsManagerService and enhance test coverage
♻️ refactor(result-review-drawer) P2-2498: Extract toNum function for number coercion
🔧 fix(submissions.service): Correct formatting and remove unnecessary comment
🎨 style(share-request-modal) P2-2498: Update modal title layout and button styles
```
