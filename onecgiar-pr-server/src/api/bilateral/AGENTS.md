# AGENTS.md - `onecgiar-pr-server/src/api/bilateral` (Headless Ingestion & Sync)

This is the module-level guide for any AI coding agent editing the Bilateral API surface. It complements `../../AGENTS.md` and the payload contract at `../../../docs/bilateral-result-summaries.en.md`.

## Read Order

1. `../../AGENTS.md` (Source-tree patterns)
2. This file
3. `../../../docs/bilateral-result-summaries.en.md` (Payload contract)

## 60-Second Mental Model

The Bilateral module is a **headless gateway** for external data. It translates human-readable tags and external emails into internal PRMS IDs and database entities.

```text
api/bilateral/
├── bilateral.controller.ts  # Headless surface (JWT-off, Throttler-off)
├── bilateral.service.ts     # Ingestion orchestration & transaction
├── handlers/                # Strategy pattern for result-type logic
│   ├── bilateral-result-type-handler.interface.ts
│   ├── knowledge-product.handler.ts    # CGSpace sync
│   ├── capacity-change.handler.ts      # Training data
│   ├── policy-change.handler.ts        # Policy/Institutions
│   ├── innovation-development.handler.ts
│   └── innovation-use.handler.ts
└── dto/                     # RootResultsDto & ingestion validation
```

## Key Mechanisms

### Ingestion Flow (`POST /create`)
The `create` method in `BilateralService` is the primary entry point:
1. **Unwrap**: Normalizes payloads from `RootResultsDto`.
2. **Identity**: `findOrCreateUser` maps emails to users; creates "External" profiles as needed.
3. **Transaction**: All sub-entities (ToC, Geo, Partners) are created within a single ACID transaction.
4. **Handlers**: Type-specific logic is delegated to the `handlers/` subdirectory via `resultTypeHandlerMap`.

### Knowledge Products (KP)
The `KnowledgeProductBilateralHandler` is unique. It **does not** take title/description from the payload. Instead:
- It uses the `handle` to call `ResultsKnowledgeProductsService`.
- It fetches authoritative metadata from **CGSpace/DSpace**.

### ToC Mapping
- **Role 1 (Lead)**: Must be processed first to establish the result owner.
- **Role 2 (Contributing)**: Stored in `share_result_request` with status 4.
- Validates `science_program_id` against CLARISA `official_code`.

### Security Posture
- **JWT**: These routes are excluded from JWT middleware in `app.module.ts`.
- **Throttling**: Marked with `@SkipThrottle()` to allow large sync batches.
- **Audit**: Every record is audited using `created_by` / `last_updated_by` resolved from the payload emails.

## Where To Start

| Intent | File to edit |
|---|---|
| Add a new ingestion field | `dto/create-bilateral.dto.ts` |
| Change CGSpace sync logic | `handlers/knowledge-product.handler.ts` |
| Add a result-type strategy | `handlers/` and `resultTypeHandlerMap` in `BilateralService` |
| Change sync/list filters | `bilateral.service.ts` (`applyListResultsFilters`) |
| Update external contract | `../../../docs/bilateral-result-summaries.en.md` |

## Anti-Patterns

- **Direct Repo Access**: Don't skip the Handlers for type-specific data.
- **ID Hardcoding**: Never assume a result type ID. Use `ResultTypeEnum`.
- **Bypassing CLARISA**: Always validate program IDs and institutions against CLARISA repositories.
- **Hex Literals**: For any response coloring or tagging, use existing constants.
- **Sensitive Logs**: Never log the `idempotencyKey` or full emails in production-level debug logs.
