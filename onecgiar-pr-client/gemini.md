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