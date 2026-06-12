---
name: jira-standard-documentation
description: >-
  Standardizes creating and validating Jira issues as full engineering specs for
  development teams via Atlassian MCP: schema discovery, strict section order
  (summary, context, technical requirements, AC, DoD, QA), duplicate search,
  ADF or Markdown body, preview then create. Use when drafting or rewriting
  Jira tickets, technical issues, user stories, or MCP-driven Jira workflows.
---

# Jira Engineering Standard Documentation

## Purpose

Standardize how Jira issues are **created** and **validated** so each ticket reads as a **complete technical specification**, not only an administrative task. Optimized for the **Model Context Protocol (MCP)** against the Atlassian Jira MCP server.

## MCP context

- **Target:** Atlassian Jira MCP server (read tool descriptors for exact tool names).
- **Output:** Issue body in **ADF** (Atlassian Document Format) or enriched **Markdown**, depending on what the connected Jira API / tool accepts.
- **Workflow:** **Discovery (schema)** → **Draft (structure)** → **Search (duplicates)** → **Preview** → **Create** (or update).

## Mandatory structure (strict order)

All body content (description / primary rich-text field) must follow **exactly** this order and headings. Do not merge or reorder sections.

### 1. Summary (Jira `summary` field)

Format: `[TYPE] Concise name`.

Suggested types: `[FEAT]`, `[FIX]`, `[REFACTOR]`, `[CHORE]`, `[INFRA]`, `[PERF]`, `[DOCS]`.

### 2. Context

Technical description of the problem or requirement. It must answer: **Why does this ticket exist?** and **What value** does it deliver for the **system**, an **integration flow**, or the **end user**?

### 3. Technical Requirements

Engineering detail, grouped as bullets:

- **Architecture:** Services, modules, backend logic, or system integrations (e.g. internal platforms, API layers, message buses—use what fits the codebase).
- **Database / data model:** SQL or ORM changes, migrations, indexing, schema impact, or data consistency rules.
- **Implementation points:** Concrete endpoints, triggers, functions, jobs, config files, or feature flags affected.

**Optimization rule:** If the ticket concerns **performance** or **resource management** (CPU, memory, I/O, quotas, batch sizes, caching, etc.), you **must** add a **Performance / cost impact** subsection (hypothesis, what improves, and how it will be measured or estimated).

### 4. Acceptance criteria (AC)

Binary, **verifiable** checklist (pass / fail). Each item must be **technically measurable** (e.g. status codes under stated conditions, migration safety, observable behavior).

Use the format the API supports (e.g. Markdown ` - [ ] ` in preview; ADF lists per tool support).

### 5. Definition of done (DoD)

Minimum quality before closing:

- **Unit tests:** Required coverage or a **short technical justification** if truly not applicable.
- **Documentation:** Which **technical** artifact must change (wiki page, README section, OpenAPI/Swagger, ADR, etc.).
- **FinOps / efficiency:** Resource or cost validation, or **N/A** with a **brief technical rationale**.

### 6. QA / testing plan

Numbered steps for integration or QA (environment, sample payloads or scripts, expected logs, DB or UI checks). Written so QA leads or integrators can execute without guessing.

## Validation rules (“Guardian”)

Before any MCP **write** (create/update issue):

| Rule | Required action |
| :--- | :--- |
| **Issue type mapping** | Via MCP, confirm the `issueType` is valid for the **target Jira project** (key or ID the user gives). If unknown, resolve project + allowed types before creating. |
| **Mandatory AC** | Block creation if there is not at least **one actionable, technical** acceptance criterion. |
| **Duplicate search** | Run a **JQL** (or MCP search) on keywords from the summary/domain and **surface** likely duplicate or overlapping backlog items in the preview. |
| **ADF / Markdown** | Detect from the tool / API whether the body must be **ADF** or **Markdown** (or wiki) and transform the draft accordingly. |
| **Preview and confirm** | Always show a clear **preview** (Summary + full structured description). Do not run the final create until the user confirms, unless they explicitly asked to skip confirmation. |

## Workflow (MCP)

1. **Discovery:** Fetch project/issue metadata and **required fields** from the MCP (schema, create meta, or equivalent).
2. **Draft:** Fill the **Mandatory structure** from the user’s input (vague input is OK—infer and label assumptions).
3. **Search:** Optional but recommended—query for duplicates or related issues.
4. **Preview:** Present formatted preview to the user.
5. **Create:** After confirmation, call create/update with validated parameters and correct body encoding.

## Preview template

```markdown
**Summary:** [TYPE] Technical task name

**Description:**

## Context
...

## Technical Requirements
- Architecture: ...
- Database / data model: ...
- Implementation points: ...
- **Performance / cost impact:** ... *(required when optimization rule applies)*

## Acceptance Criteria (AC)
- [ ] ...
- [ ] ...

## Definition of Done (DoD)
- Unit tests: ...
- Technical documentation: ...
- FinOps / efficiency: ...

## QA / Testing Plan
1. ...
2. ...
```

## Short best practices

- **Summary:** Respect Jira length limits (~80 characters is a safe default); single line.
- **AC:** One measurable outcome per bullet; avoid generic wording (“works well”) without a test.
- **DoD:** Link or name the exact doc path or API spec section when possible.
- On MCP permission or custom-field errors, report clearly and ask for missing fields or admin help.

## Additional resources

For ADF JSON patterns, see [reference.md](reference.md) only when the create tool requires hand-built ADF.
