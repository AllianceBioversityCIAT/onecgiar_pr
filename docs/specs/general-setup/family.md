# Spec Family — `family.md` Template

> This file is a **methodology template**, not a feature spec. A `family.md` exists **only** when a proposal was actually split into child specs by `/akili-propose` or `/akili-specify`. Its absence means the spec is flat, with zero added obligations.
>
> The `family.md` answers **WHICH child specs exist, in WHAT ORDER, and WHAT STATE each one is in**.

---

## How to use this template

1. Copy this file to `docs/specs/<module>/<feature>/family.md` (the parent spec folder). Replace placeholders.
2. Each child spec lives in a sibling folder `docs/specs/<module>/<feature>/<child>/` and carries its own `requirements.md` + `design.md` + `task.md` (from the general-setup templates).
3. Status vocabulary is deliberately small — phase detail lives in each child's own documents and `execution.md`.
4. `/akili-resume` reads this table to build the multi-spec dashboard; `/akili-execute` refuses a child whose `Depends on` rows are not `done`.

---

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/<module>/<feature>/` |
| **Date created** | `YYYY-MM-DD` |
| **Last updated** | `YYYY-MM-DD` |
| **Spec-family status** | `open` \| `complete` |
| **Source proposal** | `<link to proposal / Jira ticket P2-xxxx>` |

---

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `<module>/<feature>/<child-a>` | none | yes | pending |
| 2 | `<module>/<feature>/<child-b>` | `<module>/<feature>/<child-a>` | no | pending |

**Column semantics**

| Column | Values | Meaning |
|---|---|---|
| `#` | 1..n | Build order |
| `Spec Path` | `<family>/<child>` | Must correspond to a real folder under `docs/specs/` |
| `Depends on` | spec path(s) \| `none` | Serial ordering constraint |
| `Parallel-safe` | `yes` / `no` | Fleet eligibility — `no` when the child touches the same entities/migrations/components as a sibling |
| `Status` | `pending` / `active` / `done` / `blocked` | Small vocabulary; detail lives in the child's own docs |

**Closed-set rule:** this table is the exhaustive child set of the spec family. No AKILI command creates a child spec folder without a prior manifest row; adding a row is a HITL-approved manifest edit.

---

## 3. PRMS-specific ordering hints

- A child that adds a **TypeORM migration** is never `Parallel-safe: yes` with another migration-bearing child (migration ordering + `migration:check:ci`).
- A child that changes a **`/api/bilateral/*` or `/api/platform-report/*` payload** must be ordered before any child that consumes that payload, and must update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
- Server and client halves of one feature are usually two children: server first (`Depends on: none`), client second (`Depends on: <server child>`), both `Parallel-safe: yes` with unrelated families.

---

## 4. Change log

| Date | Change | Approved by |
|---|---|---|
| `YYYY-MM-DD` | Family created from proposal `<...>` | `<role>` |
