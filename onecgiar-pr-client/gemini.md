This file contains instructions and context for the Gemini agent.

## Project Overview

This is an Angular web application for the OneCGIAR PR project.

## Tech Stack

-   **Framework:** Angular
-   **Language:** TypeScript
-   **Styling:** SCSS, PrimeNG
-   **Testing:** Jest, Cypress
-   **Linting/Formatting:** ESLint, Prettier

## Development Workflow

-   **Dependencies:** Manage dependencies using `npm`.
-   **Running the app:** `npm start`
-   **Running tests:** `npm test` (for unit tests) and `npx cypress open` (for e2e tests).
-   **Linting:** `npm run lint`
-   **Formatting:** `npm run format`

## Coding Conventions

-   Follow the existing coding style.
-   Use the provided shared components and services where possible.
-   Ensure all new components are properly tested.

## Commit & Push Workflow

-   **Commit Style**: When asked to create a commit, use semantic commit messages.
-   **Commit Context**: Before creating a commit, analyze the last 100 git commits to understand the structure, including emojis and formatting. The typical format is: `emoji type(scope): description`.
-   **Pushing**: After a successful commit, push the changes to the remote repository.
-   **Confirmation**: Do not ask for confirmation. Analyze the changes, commit directly, and then push.
-   **Security**: Never upload data, credentials, tokens, or URLs that could be dynamic. Always validate that no sensitive information is being committed.
-   **Pre-commit Security Validation (Agent-side)**: Before creating a commit, the Gemini agent will perform an automated security validation on *staged changes only*. This validation will check for the presence of:
    -   **Keys**: API keys, secret keys, etc.
    -   **Tokens**: Authentication tokens, access tokens, bearer tokens.
    -   **Passwords**: Any form of password.
    -   **Private Keys**: Cryptographic private keys (e.g., `-----BEGIN PRIVATE KEY-----`).
    -   **URLs with embedded tokens**: URLs that contain sensitive tokens as part of the query parameters or path.
    If sensitive information is detected, the agent will report it to the user and halt the commit process until the issue is resolved.
-   **Commit per Change**: When the command `create commit per change` is given, create separate commits for unrelated files or groups of related files. If files are unrelated, each should get its own commit. This is an extension of the `create commit` command and should not be the default behavior.