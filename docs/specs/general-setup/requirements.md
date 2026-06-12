# Module Spec — `requirements.md` Template

> This file is a **methodology template**, not a feature spec. Every module spec produced by `/sdd-specify` MUST start from this template and live at `docs/specs/<module>/requirements.md` (or `docs/specs/<module>/<feature>/requirements.md` for a sub-feature).
>
> Spec taxonomy: **domain-module**. Top folders mirror the NestJS / Angular module split (`results/`, `ipsr/`, `bilateral/`, `platform-report/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `quality-assurance/`, `admin/`, etc.).

---

## How to use this template

1. Copy this file to `docs/specs/<module>/requirements.md`. Replace the placeholders.
2. Cite the **project-level requirement IDs** from `docs/prd.md` (US-*, AC-*, M*, G*) that this module implements.
3. Keep requirements **user-centric and testable**. One requirement = one verifiable behaviour.
4. Number requirements as `<MOD>-R-<n>` where `<MOD>` is the short module code (e.g., `RES`, `IPSR`, `BIL`, `PLAT`, `QA`, `NOTIF`).
5. Sub-requirements use `<MOD>-R-<n>.<m>` (e.g., `RES-R-3.2`).
6. Update the spec when the feature changes — no stale specs.

---

## 1. Module / Feature

- **Module:** `<results | ipsr | bilateral | platform-report | quality-assurance | notifications | auth | clarisa | versioning | admin | ...>`
- **Sub-feature (if any):** `<short name>`
- **Owner:** `<role / person>`
- **Status:** `draft | in-review | approved | in-progress | shipped | deprecated`
- **Ticket(s):** `<P2-XXXX, ...>` (optional, follows the commit convention in root `CLAUDE.md`).

---

## 2. Context

Two or three short paragraphs:

- What gap or goal motivates this spec.
- Which user flows from `docs/system-design/design.md` it touches.
- Which entities / API surfaces from `docs/detailed-design/detailed-design.md` it touches.

Reference the PRD link: `docs/prd.md` (specific goal `G#`, story `US-*`, acceptance criterion `AC-#`).

---

## 3. In Scope / Out of Scope

### In scope

- Bullet list of capabilities this spec delivers.

### Out of scope

- Bullet list of related capabilities explicitly NOT covered (defer or split into another spec).

---

## 4. Personas Affected

Pick from `docs/prd.md` §3. Add module-specific sub-roles only if needed (e.g., "QA lead vs QA reviewer").

| Persona | What changes for them |
|---|---|
| Result submitter | … |
| QA reviewer | … |
| PMU lead | … |
| Platform admin | … |
| Bilateral consumer (downstream) | … |

---

## 5. User Stories

Use the canonical `As a <persona>, I want <capability>, so that <outcome>.` form.

- **`<MOD>-US-1`** — As a `<persona>`, I want `<capability>`, so that `<outcome>`.
- **`<MOD>-US-2`** — …

Cite the project-level user stories these refine (e.g., `Refines US-S1, US-Q2`).

---

## 6. Functional Requirements

State each requirement as a single, testable behaviour. Avoid "fast", "intuitive", "scalable" without a number.

### Required (MUST)

- **`<MOD>-R-1`** The system MUST `<observable behaviour>`.
- **`<MOD>-R-2`** When `<trigger>`, the system MUST `<observable behaviour>` so that `<value>`.
- …

### Should (SHOULD)

- **`<MOD>-R-10`** The system SHOULD `<behaviour>` to `<value>`, falling back to `<degraded behaviour>` if `<condition>`.
- …

### Could / Nice-to-have (MAY)

- **`<MOD>-R-20`** The system MAY `<behaviour>` when `<condition>`.
- …

---

## 7. Non-Functional Requirements

Address only the dimensions this spec affects. Use measurable targets — no "fast".

| Dimension | Target |
|---|---|
| **Performance** | e.g., p95 latency on `GET /api/results/...` MUST stay under `<N>` ms with `<N>` rows. |
| **Throughput** | e.g., bilateral list MUST handle `<N>` rps with no 5xx. |
| **Availability** | e.g., affected endpoints MUST inherit the platform SLO (`docs/prd.md` G4 / M4.1). |
| **Security** | e.g., MUST be JWT-gated; SHOULD be role-gated (`admin`). No secrets in logs. |
| **Privacy** | e.g., no PII in error responses or telemetry. |
| **Backwards compatibility** | e.g., MUST be additive on bilateral payload (`AC-4`); no field removals without `v2` rollout. |
| **Accessibility** | e.g., new UI MUST meet WCAG 2.1 AA per `docs/system-design/design.md` §10. |
| **Internationalization** | e.g., all new strings MUST go through `src/app/internationalization/`. |
| **Observability** | e.g., MUST log start/finish + outcome of background jobs; no token / secret leakage. |

---

## 8. Acceptance Criteria

One row per testable scenario. Each row MUST be coverable by at least one automated test (`task.md` then assigns the test).

| ID | Given | When | Then |
|---|---|---|---|
| `<MOD>-AC-1` | A result with `status_id=1` and all required fields | The submitter clicks **Submit** | The result transitions to `status_id=2` and a `result-review-history` row is written. |
| `<MOD>-AC-2` | A bilateral consumer requesting `GET /api/bilateral/...` with type `policy_change` | The response renders | The `policy_change_summary` follows the contract in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (Clarisa ids, `result_related_to[]`, …). |
| `<MOD>-AC-3` | … | … | … |

Cross-cutting project ACs that already apply (do NOT restate, do refer):

- `AC-1` Typed result integrity.
- `AC-2` Submission workflow.
- `AC-3` Authorization.
- `AC-4` Bilateral / platform-report stability.
- `AC-5` Phase / versioning correctness.
- `AC-6` Evidence and ToC alignment at submit.
- `AC-7` Soft delete & recovery.
- `AC-8` Observability and notifications.
- `AC-9` Security and secrets.

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- Other modules this depends on (`auth`, `clarisa-<endpoint>`, `versioning`, `notification`, `share-point`, RMQ, etc.).
- External services involved (CLARISA, ToC, Cognito, AD, MQAP, CGSpace, S3 / SharePoint, Pusher, email service).

### Downstream consumers

- Which modules or APIs depend on this one (e.g., `bilateral`, `platform-report`, `home`, BI dashboard).

### Assumptions

- Anything assumed but not contractually guaranteed (e.g., "CLARISA `clarisa-policy-types` is cached and the cache TTL is acceptable for this flow").

---

## 10. Open Questions

Number open questions and resolve them before moving to `design.md`. Unresolved questions block `task.md`.

- `<MOD>-OQ-1` …
- `<MOD>-OQ-2` …

---

## 11. Out-of-Band Notes

Reserved for cross-spec coordination, migration order, or rollout flags. Keep concise; promote real decisions to the `design.md`.

---

## Required cross-references

Every approved `requirements.md` MUST link to:

- `docs/prd.md` (cite specific `G`, `US-*`, `AC-*` ids).
- `docs/system-design/design.md` (cite specific screens / flows).
- `docs/detailed-design/detailed-design.md` (cite specific modules / entities / endpoints).
- Module-specific authoritative docs where they exist (e.g., `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` for bilateral specs).
