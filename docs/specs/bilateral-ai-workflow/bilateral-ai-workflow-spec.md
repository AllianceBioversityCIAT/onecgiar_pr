# QA-AI in Bilateral Workflow — Consolidated Specification

> **Epic:** [P2-2965](https://cgiarmel.atlassian.net/browse/P2-2965) — Bilateral module for centers: Module centralized for User Centers
> **Lead US:** [P2-3100](https://cgiarmel.atlassian.net/browse/P2-3100) — W3/Bilateral results - Create New Bilateral Result Form Workflow
> **Sprint:** PRMS Delivery Sprint 37 (2026-07-17 → 2026-07-31)
> **Target release:** September 2026 (bilateral reporting window opening)
> **Sources:** Meeting transcript 2026-07-08 (Delgado, Jarrin, Zuniga); Nicoleta alignment session 2026-07-06; codebase analysis; Angel Jarrin call 2026-07-09; Jira children of P2-2965.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Detailed Requirements](#2-detailed-requirements)
3. [Stakeholders & Decisions](#3-stakeholders--decisions)
4. [Recommended Architecture & Reuse Strategy](#4-recommended-architecture--reuse-strategy)
5. [Implementation Guidance](#5-implementation-guidance)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Open Questions](#7-open-questions)

---

## 1. Project Overview

### 1.1 Canonical Data Files and Jira Tasks

| Jira Key | Type | Title | Status | Assignee |
|---|---|---|---|---|
| **P2-2965** | Epic | Bilateral module for centers: Module centralized for User Centers | Open | — |
| P2-2966 | Task | Define mockups user flow to report W3/bilateral results | — | — |
| **P2-3100** | US | Create New Bilateral Result Form Workflow | In Progress | Juan David Delgado |
| P2-3101 | US | "Complete the form manually" Workflow — Common fields | In Progress | Juan David Delgado |
| P2-3122 | US | Section 5: Innovation Development | In Progress | Juan David Delgado |
| P2-3123 | US | Section 5: Capacity Sharing | In Progress | Juan David Delgado |
| P2-3124 | US | Section 5: Knowledge Product | In Progress | Juan David Delgado |
| P2-3125 | US | Other Output and Other Outcome | In Progress | Juan David Delgado |
| P2-3126 | US | Section 5: Innovation Use | In Progress | Juan David Delgado |
| P2-3127 | US | Section 5: Policy Change | In Progress | Juan David Delgado |
| NOST-360 | Polaris Idea | Bilateral module for centers (Discovery) | Discovery | — |

**Design references:**
- Figma mockups: https://fire-chair-20593630.figma.site
- Polaris board: https://cgiarmel.atlassian.net/jira/polaris/projects/NOST/ideas/view/5946906?selectedIssue=NOST-360

**Codebase references:**
- Backend bilateral ingestion: `onecgiar-pr-server/src/api/bilateral/`
- Backend AI module: `onecgiar-pr-server/src/api/ai/`
- Backend result-qaed module: `onecgiar-pr-server/src/api/result-qaed/` (empty scaffold)
- Frontend result creator: `onecgiar-pr-client/src/app/pages/results/pages/result-creator/`
- Frontend AI assistant: `onecgiar-pr-client/src/app/pages/results/pages/result-creator/components/result-ai-assistant/`
- Frontend bilateral review: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-results/`
- Bilateral payload contract: `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- Bilateral module replication guide: `docs/bilateral-module/`

### 1.2 What Needs to Be Built and Why

CGIAR is transitioning bilateral result reporting from a **centralized manual curation model** to a **self-service model** where the 12 CG Centers report directly in PRMS. Two reporting routes must be available:

1. **Manual form entry** — analogous to the existing pooled (W1/W2) result reporting flow, but specifically for reporting bilateral results (W3-funded).
2. **AI-assisted extraction** — the center uploads one or more documents (PDF, DOCX, TXT, field notes, attendance sheets), and the system identifies candidate results in the background, pre-filling metadata.

The bilateral module is **embedded in PRMS**; center users see only this module when they log in. This is not a new standalone application.

A **new Draft status** is needed for AI-identified results that are being processed in the background. These drafts do not appear in the normal result list — they live in a dedicated "My Draft Results" module with a counter badge.

### 1.3 The Problem Being Solved and Why Existing Tools Are Insufficient

| Problem | Current State | Why It Fails |
|---|---|---|
| 12 centers report bilateral results via Excel | Nicoletta manually curates data, then loads into PRMS via `/api/bilateral/create` | Unscalable; single point of failure; months of delay |
| No self-service for centers | Centers cannot create or edit bilateral results in PRMS | The bilateral module is JWT-off headless ingestion only; no frontend creation flow exists |
| Evidence quality is inconsistent | No QA at ingestion; QA happens post-hoc | Nicoletta was the de-facto QA gate; without her, quality drops |
| AI text mining exists but is incomplete | Frontend has a text-mining UI (`result-ai-assistant`) but `createResult()` is a stub (shows success toast, calls no API) | Users can see AI suggestions but cannot act on them |
| AI review is limited to 3 fields | `api/ai` only improves `title`, `description`, `short_title` | Does not cover MDS fields, evidence quality, or type-specific metadata |
| No draft lifecycle | Results are created immediately with status Editing (1) | AI-identified results need a background processing phase before user review |
| QA module is empty | `result-qaed/` has one entity (`ResultQaedLog`) but zero endpoints | QA decisions happen in `results.service.ts` and the bilateral review drawer, not in a dedicated QA surface |

### 1.4 Primary Users and Their Roles

| Persona | Role in This Feature | What They Need |
|---|---|---|
| **Center user (submitter)** | Reports bilateral results for their CG Center | A simple form linked to their bilateral projects; AI assistance to reduce manual entry; clear draft management |
| **Science Program lead** | Reviews and approves/rejects bilateral results from their program | A review queue with AI-assisted QA signals (traffic light); ability to edit ToC alignment and MDS fields |
| **PMU / portfolio lead** | Consolidates bilateral results into Type-One Reports | Stable bilateral payloads; visibility into draft pipeline |
| **Nicoletta / data curator** | Previously the sole gatekeeper; now transitioning to guide/governance role | Evidence quality guide; AI QA rules she can influence; ability to audit AI decisions |
| **Platform admin** | Manages phases, users, CLARISA syncs | Configuration of AI parameters; draft cleanup tools |

### 1.5 Strategic and Organizational Positioning

- **CGIAR 2030 Strategy** demands portfolio-level accountability. Bilateral results (W3 funding) must be visible alongside pooled results in Type-One Reports and donor dashboards.
- **OneCGIAR reform** replaces CRPs with Science Programs. Bilateral projects are mapped to Science Programs via the W3 Registry (source of truth for Primary Contributing Science Program).
- **AI maturity**: CGIAR does not yet have an official AI policy for private/confidential information. The AI route must default to public evidence only and not force centers to process confidential documents through AI.
- **September 2026 deadline**: The bilateral reporting window opens in September. The AI review must be available by then, but the manual route is the hard requirement — AI is a force multiplier, not a blocker.

### 1.6 Bilateral Result Status Flow (W3 vs W1/W2)

**W1/W2 (Pooled Funding) results follow:**
```
Editing (1) → Quality Assessed (2) → Submitted (3) → [QA review] → [final status]
```

**W3/Bilateral results follow a different flow:**
```
Current (headless ingestion):
  → Pending Review (5) → Approved (6) or Rejected (7)

Proposed (center self-reporting):
  → Draft (8) → Editing (1) → Pending Review (5) → Approved (6) or Rejected (7)
```

**Key differences:**
- W3 results do NOT go through Quality Assessed (2) or Submitted (3)
- W3 results go directly to Pending Review (5) when ready for Science Program review
- Exception: SGP-02 can have W3 results in Editing status (legacy case)
- The new Draft (8) status is only for AI-assisted route, before user review

---

## 2. Detailed Requirements

### 2.1 User Journey and Conversational Assistant Flow

#### Route A: Manual Form Entry

```
Center user logs in → sees Bilateral Module (embedded in PRMS)
  → Clicks "Report New Bilateral Result"
  → Form renders:
      1. Reporting Project (dropdown — bilateral projects for this Center)
      2. Project Summary (read-only, auto-populated)
      3. Project Description (read-only, auto-populated)
      4. Primary Contributing Science Program (dropdown — filtered by project's ToC mapping in W3 Registry)
  → All mandatory fields filled → two options unlock:
      a. "Reuse information without duplicating effort" (AI Assisted)
      b. "Complete the form manually"
  → User selects (b) → redirected to standard result creation form
      → Selects result level, result type, title, etc.
      → Fills MDS sections (general info, ToC, geography, evidence, type-specific)
      → Submits for review → status_id = 5 (Pending Review) [NOT Submitted (3)]
      → Science Program lead reviews → Approve (6) or Reject (7)
```

#### Route B: AI-Assisted Extraction

```
Center user logs in → sees Bilateral Module
  → Clicks "Report New Bilateral Result"
  → Fills same form (project, science program)
  → Selects (a) "AI Assisted"
  → Upload interface appears:
      - File upload zone (PDF, DOCX, TXT; drag-and-drop)
      - Text box for additional context / keywords
      - Voice note upload (new — inspired by Progress Tracker)
      - Support for multiple file uploads (complementary documents)
  → User submits files → backend uploads to S3, creates job, publishes to queue
  → Backend returns 202 Accepted; frontend shows "Analyzing document" state
  → Backend consumer (async):
      - Calls AI service with S3 URLs (parameters only, no file transfer)
      - AI service downloads files from S3 and extracts candidate results
      - Backend creates Draft results (status "Draft")
      - Backend registers uploaded items as DraftEvidence (staging area)
      - Draft results are NOT visible in the normal result list
  → User receives:
      - In-platform notification (badge counter in "My Draft Results")
      - Email notification with link to draft list
  → User navigates to "My Draft Results":
      - Sees list of AI-identified results with compact metadata:
        - Source document name
        - Result type icon
        - AI-extracted title
        - Keywords
        - Type-specific highlights (e.g., # participants for capacity sharing)
        - MDS completeness indicator
      - Each draft shows attached DraftEvidence items (documents, voice notes, text)
      - Drafts are visible to other members of the same Science Program
      - If another member already uploaded a similar document, existing drafts are shown (no re-processing)
  → User clicks a draft → sees draft detail with DraftEvidence list:
      - User marks which DOCUMENT items become formal evidence (is_formal_evidence=true)
      - Voice notes and text context cannot be marked as formal evidence
      - User can discard items or upload additional evidence
      - User clicks "Promote to Editing"
      - Backend copies marked DraftEvidence to ResultsByEvidences (formal evidence table)
      - Draft transitions to Editing status
      → AI-pre-filled fields are marked with "AI suggested" badge
      → Empty fields (geography, ToC, etc.) are highlighted for manual completion
      → User completes metadata and submits
```

#### AI Review (Post-Creation, Pre-Submission)

```
User is in the result detail form (Editing status)
  → Clicks "AI Review" button in panel menu
  → System analyzes ALL MDS metadata (excluding ToC — assigned by SP later):
      - Evidence quality vs. claimed results
      - Title/description clarity
      - MDS completeness
      - Type-specific field consistency (e.g., IRL claim vs. evidence)
      - Geography plausibility vs. evidence documents
      - Contributing centers alignment
  → If new evidence was added AFTER initial AI processing:
      → AI Review detects mismatches between new evidence and existing metadata
      → User sees TWO options:
          a. Accept mismatch — warning logged for traceability, result unchanged
          b. Re-run AI — triggers full re-analysis including new evidence
      → Re-run is OPTIONAL, user-initiated
  → Returns traffic-light assessment:
      - Green: field passes QA
      - Yellow: field needs improvement (suggestion provided)
      - Red: field has significant issues (explanation provided)
  → AI suggestions are guidance, NOT blockers
  → User can accept, modify, or ignore suggestions
  → User can rate each AI suggestion (thumbs up/down) — feedback stored in `AiReviewEvent` with `event_type = FEEDBACK`
  → User can still submit even if AI flags red
  → System records cases where user overrode AI warnings (for analysis)
```

### 2.2 Guidance Style Requirements (Confirmed from the Record)

| Principle | Source | Implication |
|---|---|---|
| **AI guides, does not block** | Nicoleta session | Traffic light system (red/yellow/green) is advisory. User can always submit. |
| **MDS-only scope for AI QA (excluding ToC)** | Nicoleta session + Angel confirmation 2026-07-09 | AI evaluates all MDS fields EXCEPT ToC. ToC is assigned by Science Program lead during review. Does NOT evaluate extra-MDS fields to avoid increasing reporting burden. |
| **Consolidate AI into a single review step** | Nicoleta / Angel | Instead of multiple AI assistants floating across sections, one AI Review at the end covers: evidence quality + title suggestion + description suggestion + geography + contributing centers + type-specific fields. |
| **New evidence mismatch → user chooses re-run or accept** | Angel 2026-07-09 | If user adds evidence post-AI, AI Review detects mismatches. User can accept (logged) or trigger re-run. Never blocks submission. |
| **SP review = ToC only** | Angel 2026-07-09 | When Science Program lead reviews a bilateral result, they can ONLY edit the ToC. All other metadata is locked. |
| **Users copy-paste AI suggestions blindly** | Prior observation | UI must encourage adaptation, not blind copy. Show side-by-side comparison; require at least one character change before "Apply". |
| **Year of proof, not enforcement** | Nicoleta | Do not block submissions based on AI QA. Record overrides for later analysis. |
| **Impact area scores assigned by program, not center** | Nicoleta / Angel | Centers do not fill impact area scores. Programs assign them during consolidation. |

### 2.3 Content and Catalog Requirements

### 2.3.1 MDS Fields Inventory

The Minimum Data Standards (MDS) fields are the scope of AI QA. Below is the definitive list by category:

| Category | MDS Fields | Notes |
|----------|------------|-------|
| **General Information** | `title`, `description`, `short_title`, `result_level`, `result_type`, `status`, `reporting_phase` | AI review covers title/description clarity |
| **Project Context** | `reporting_project`, `science_program`, `center_id`, `source` | Auto-populated from project selection |
| **Theory of Change** | `toc_alignment` (work package, outcome, output nodes) | Assigned by Science Program lead, NOT by center. AI marks missing ToC as yellow. |
| **Geography** | `countries[]`, `regions[]`, `geo_scope` (regional/national/global) | AI validates geographic plausibility vs. evidence |
| **Evidence** | `evidence[]` with `link`, `typology`, `is_sharepoint`, `is_public_file` | AI assesses evidence quality: accessibility, age, relevance |
| **Contributors** | `contributing_centers[]`, `partners[]`, `lead_center` | AI validates completeness, not content |
| **Innovation Dev** | `innovation_title`, `innovation_phase`, `innovation_readiness_level`, `is_new_variety`, `is_new_technology`, `is_new_practice`, `is_new_tool`, `is_new_product` | Type-specific MDS (P2-3122) |
| **Capacity Sharing** | `training_title`, `training_type`, `participant_count`, `partner_institutions[]`, `training_duration`, `training_format` | Type-specific MDS (P2-3123) |
| **Knowledge Product** | `kp_handle`, `kp_title`, `kp_type`, `kp_authors[]`, `kp_publication_date`, `kp_doi`, `kp_peer_reviewed` | Type-specific MDS (P2-3124) |
| **Innovation Use** | `innovation_use_title`, `innovation_use_type`, `adoption_stage`, `adoption_scale`, `beneficiary_count` | Type-specific MDS (P2-3126) |
| **Policy Change** | `policy_title`, `policy_type`, `policy_stage`, `policy_scope`, `policy_evidence_link` | Type-specific MDS (P2-3127) |
| **Other Output / Outcome** | `output_title`, `output_type`, `outcome_description`, `contribution_evidence` | Type-specific MDS (P2-3125) |

**AI QA scope:** All MDS fields listed above EXCEPT Theory of Change (ToC). ToC is intentionally excluded from AI extraction — it is assigned by the Science Program lead during result review (Decision D26). Extra-MDS fields are NOT evaluated to avoid increasing reporting burden.

### 2.3.2 Form Validation: Indicator Type Tag and Allocated Percentages

#### Indicator Type Tag (ToC Contribution Warning)

When the user fills the ToC contribution form, validate result type against the indicator category of the selected ToC node:

| Condition | Behavior |
|-----------|----------|
| `result_type_category === toc_indicator_category` | Green — no warning |
| `result_type_category !== toc_indicator_category` | Yellow warning: "The selected result type may not align with the indicator category of this ToC node" |

Implementation:
- The form displays an **indicator type tag** next to each ToC option so the user knows what type of contribution they are making.
- Tag is read from `indicator_category` on the ToC node (mapped via `toc_indicator.entity.ts`).
- Warning is advisory only — does not block selection or submission.

#### Allocated Percentages (W3 Registry Alignment)

The ToC contribution dropdown must align allocated percentages with the values from the W3 Registry:

| Source | Data | Alignment |
|--------|------|-----------|
| `clarisa-projects.entity.ts` | `allocated` field on `ClarisaProject` | The percentage pre-filled in the contribution form must match the `allocated` value from the W3 Registry for that Science Program |
| `onecgiar-pr-server/src/clarisa/clarisa-projects/entity/clarisa-projects.entity.ts` | `ClarisaProject.allocated` | This is the source of truth for percentage allocation per SP |

**Rule:** The contribution dropdown must default to the `allocated` percentage from the W3 Registry mapped Science Program. User can override, but the default must be the registered value.

#### Evidence Screening Rules (AI Exclusion Criteria)

| Rule | Behavior |
|---|---|
| **Inaccessible evidence** (broken link, 404) | Exclude from AI route; flag for manual review |
| **Too old** (>3-5 years) | General exclusion rule; flexible — 1-2 years outside window acceptable with justification |
| **Not related to food/agriculture/environment** | Exclude from AI route |
| **Too short / low content** (minimal PPT, photo with caption) | Exclude from AI route |
| **Confidential / non-public** | Exclude from AI route entirely; redirect to manual entry. CGIAR has no official AI policy for private data. |
| **If AI cannot process the evidence, the result should not be reported via AI** | Hard rule from Nicoleta |

#### Evidence Type Distinction

| Type | Description | QA Weight |
|---|---|---|
| **Third-party evidence** | Peer-reviewed papers, independent evaluations, published datasets | Higher credibility; stronger QA signal |
| **Self-generated evidence** | Internal reports, field notes, photos, attendance sheets | Valid but lower weight; flagged for additional context |

Nicoleta will share the evidence guide with Frank/Jim to adjust types and examples. Maria Julia will be involved in updating the guide for policy change QA.

#### Multiple Evidence Support

- Users should be able to upload **multiple documents** before AI analysis begins.
- Example: Excel attendance sheet + photo + narrative report → AI combines metadata from all sources.
- File size limits: limit by page count (PDF), not just file size. A 300-page PDF is a known risk.

### 2.4 Analytics and User Tracking Requirements

| Metric | Purpose |
|---|---|
| AI override rate | % of results where user submitted despite AI flagging red |
| AI suggestion acceptance rate | % of AI title/description suggestions accepted vs. modified |
| Draft-to-submission conversion | % of AI drafts that reach Submitted status |
| Time-to-submit (AI vs. manual) | Compare reporting duration between routes |
| Evidence type distribution | Ratio of third-party vs. self-generated evidence per result type |
| Draft sharing rate | % of drafts reused by other Science Program members |
| **Token consumption** (input/output) | Total tokens consumed per AI operation and per result — tracked by model invocation worker to monitor costs per Science Program and per Center |
| **AI suggestion feedback score** | User can rate AI suggestions (thumbs up/down) per field after applying or dismissing; tracks user satisfaction and identifies poorly-performing prompts |
| **AI feedback submission rate** | % of users who provide feedback on AI suggestions; target >20% to build a reliable satisfaction signal |

The existing `api/ai` module already tracks:
- `AiReviewSession` (sessions opened/closed)
- `AiReviewEvent` (CLICK_REVIEW, APPLY_PROPOSAL, SAVE_CHANGES, CLOSE_MODAL, REGENERATE)
- `ResultFieldRevision` (provenance: AI_SUGGESTED vs. USER_EDIT)

These need to be extended for the bilateral flow.

### 2.5 Integration Requirements

| Integration | Current State | Needed For |
|---|---|---|
| **W3 Registry** | Not integrated; Science Program mapping done via CLARISA `official_code` | Primary Contributing Science Program identification (source of truth per Angel/Jarrin decision). Also provides **allocated percentage** per Science Program (`clarisa-projects.entity.ts` → `allocated` field) for contribution form defaults. **Secondary/contributing SPs** can be selected by the user from the same W3 Registry list. Only SPs mapped in W3 Registry are allowed — no manual additions. |
| **Webhook per Center** | Not implemented | Each Center provides a webhook URL where PRMS sends approval/rejection notifications (result code, title, status, justification). Centers manage their own endpoint; PRMS sends the full MDS payload on demand. |
| **External text mining service** | Exists at `textMiningUrl`; called from frontend | Background processing for bilateral AI route; needs new endpoint or queue |
| **External AI review service** | Exists at `reviewApiUrl` (AWS API Gateway `prms-qa`) | AI QA assessment; needs prompt expansion for MDS evaluation |
| **CLARISA** | Active; syncs catalogs via cron | Bilateral project validation, Science Program codes, center codes |
| **Notification service** | `api/notification/` — in-app + WebSocket | New notification type for draft completion; email via `EmailNotificationManagementService` |
| **SharePoint / S3** | File upload via `fileManagerUrl` | Document storage for AI processing |
| **Progress Tracker (Jose/Joel)** | External system | Pooled (W1/W2) results migration to PRMS; Nicoleta to align with Jose |
| **CGSpace / MQAP** | Knowledge Product handle sync | KP metadata validation in bilateral flow |
| **Dani Gomez / Manu text mining** | Existing text mining component for PRMS | Reuse or adapt for bilateral AI route; coordination session needed |

### 2.6 Naming Conventions and Domain Language

| Term | Definition | Notes |
|---|---|---|
| **Bilateral result** | A result funded by W3/bilateral projects, reported by a CG Center | `source = SourceEnum.Bilateral` in the database |
| **Reporting Project** | A bilateral project in the W3 Registry, mapped to a Science Program | Dropdown in the creation form |
| **Primary Contributing Science Program** | The Science Program that owns the bilateral project (from W3 Registry) | NOT derived from ToC traversal (decision from meeting) |
| **Draft** | A new result status for AI-identified results being processed | Not yet in `ResultStatusData` enum; needs new entry |
| **MDS (Minimum Data Standards)** | The minimum set of fields required per result type | AI QA scope is limited to MDS |
| **ToC (Theory of Change)** | Causal pathway model linking activities to outcomes/impact | NOT shown in initial AI stage; assigned by Science Program later |
| **AI Review** | The consolidated AI quality assessment (evidence + title + description) | Single review step, not multiple per-section assistants |
| **Traffic light** | Red/Yellow/Green quality indicator | Advisory only; does not block submission |
| **Third-party evidence** | Evidence from external, peer-reviewed, or independent sources | Higher QA weight |
| **Self-generated evidence** | Evidence produced internally by the Center | Lower QA weight; valid |

---

### 2.7 Bilateral Result Detail Form — Section Definition

The bilateral result form is a **simplified version** of the standard W1/W2 result detail. Each section shows the core MDS fields by default; non-MDS or secondary fields are hidden behind an expandable toggle so the form stays clean and focused.

**Layout model:** Accordion sections (collapsible panels), NOT the standard left-aside navigation. See §2.8 for the UI/UX design proposal.

**Creation-time auto-set fields (not shown):**

| Field | Source | Value |
|---|---|---|
| `result_code` | Auto-generated (sequence) | Next available code |
| `result_level` | User-selected during creation | From Route A create flow |
| `result_type` | User-selected during creation | From Route A create flow |
| `version_id` | Current active phase | Auto-assigned from reporting phase |
| `source` | Constant | `SourceEnum.Bilateral` = `'API'` |
| `status_id` | Constant | 1 (Editing) for manual route; 8 (Draft) for AI route |
| `created_by` | JWT user | Authenticated user id |
| `is_active` | Constant | `true` |

#### Section 0: Result Summary (Dashboard)

A **non-collapsible summary panel** at the top of the form. This is NOT a standard result detail section — it is custom for the bilateral module.

| Area | Content |
|---|---|
| **Project context** | Reporting Project name + code, Project Summary (read-only from W3 Registry), Project Description (read-only) |
| **Science Program** | Primary Contributing SP badge + allocated %, Secondary/contributing SP chips |
| **Result metadata** | Result type icon + label, result level, result code, status badge |
| **MDS completion** | Overall progress ring/bar: "% of MDS fields completed" across all sections. Per-section progress shown in each accordion header. Green checkmark when complete. |
| **Action buttons** | "Generate result narrative" (AI narrative), "Download PDF report" (reuse existing pdf-actions component), "Run AI Review" (traffic light analysis) |
| **AI draft context** (AI route only) | Source document names, AI confidence score badge, "AI suggested" marker |

The summary area acts as the **command center**: user sees at a glance what is done, what is missing, and what actions are available.

#### Section 1: General Information

| Visibility | Fields | Notes |
|---|---|---|
| **Always shown** | `title` (text input, max 30 words), `description` (textarea, max 300 words) | Core MDS — same as existing `rd-general-information` |
| **Expandable** | `lead_contact_person` (user picker), impact area scores (gender, climate, nutrition, environment, poverty), `is_krs`, `is_discontinued` | Same rules as existing result detail |
| **Hidden (auto-set)** | `result_code`, `result_level`, `result_type`, `version_id`, `source`, `status_id`, `created_by`, `is_active` | Set at creation; visible in Section 0 summary for reference |

**Reference:** `onecgiar-pr-server/src/api/results/entities/result.entity.ts` — fields `title` (line 73), `description` (line 79), `lead_contact_person` (line 440), impact area score columns (lines 108–246).

#### Section 2: Contributors and Partners

| Visibility | Fields | Notes |
|---|---|---|
| **Always shown** | ToC alignment (primary SP + contributing SPs) with Program planned TOC indicators + level/outcome/output/2030outcome mapping + indicator + target. Multiple WPs selection (one or more, same rules as existing). CGIAR Centers (primary pre-selected from project's lead center). Contributing W3/bilateral projects (the selected project). Lead Center. | Primary SP already known from creation flow. Centers come from the Project's lead center. |
| **Expandable** | Partner institutions (MQAP + standard), Linked results, Share request | Same as existing `rd-contributors-and-partners` (P25) |
| **Hidden** | Submitter initiative (auto-set to selected SP). ToC nodes not relevant to bilateral project. | — |

**Key simplification:** Primary Contributing Science Program is NOT derived from ToC traversal (Decision D1). Comes from W3 Registry project mapping. ToC alignment is simplified to that SP's mapped work packages only.

**Reference:** `results_by_inititiative.entity.ts` — `initiative_id`, `initiative_role_id` (Primary submitter role).

#### Section 3: Geographic Location

**Same logic as existing `rd-geographic-location`.**

| Visibility | Fields | Notes |
|---|---|---|
| **Always shown** | `geographic_scope_id` (Global/Regional/National), `regions[]`, `countries[]` | Core MDS |
| **Expandable** | Extra geographic scope (P25), `has_extra_regions`, `has_extra_countries`, `has_regions`, `has_countries` | Same as existing |
| **Hidden** | — | — |

**Reference:** `result.entity.ts` lines 382–460: `geographic_scope_id`, `has_extra_geo_scope`, `has_regions`, `has_countries`, etc.

#### Section 4: Evidence

**Same logic as existing `rd-evidences`.**

| Visibility | Fields | Notes |
|---|---|---|
| **Always shown** | `evidence[]` — link + description per evidence row. Add evidence modal (link or file upload). Impact area tag coverage validation. | Core MDS. Same rules: max 6 pieces, public links only, no SharePoint/Drive. |
| **Expandable** | Evidence typology (third-party vs. self-generated), evidence quality indicators | Quality indicators are read-only AI assessment results |
| **Hidden** | — | — |

**Reference:** `result.entity.ts` line 617: `evidence_array`. `Evidence` entity.

#### Section 5: Type-Specific Pages (per ResultTypeEnum)

Same component mapping as existing `rd-result-types-pages/`. Each follows the always-shown / expandable pattern.

| Result Type | Component | Route |
|---|---|---|
| Policy Change (1) | `policy-change-info/` | `policy-change1-info` |
| Innovation Use (2) | `innovation-use-info/` | `innovation-use-info` |
| Capacity Sharing (5) | `cap-dev-info/` | `cap-dev-info` |
| Knowledge Product (6) | `knowledge-product-info/` | `knowledge-product-info` |
| Innovation Development (7) | `innovation-dev-info/` | `innovation-dev-info` |
| Other Output / Other Outcome (4, 8) | — | Core sections only; no type-specific page |

### 2.8 UI/UX Design Proposal — Accordion-Based Layout with Dashboard Header

#### 2.8.1 Design Principles

| Principle | Rationale |
|---|---|
| **Platform-consistent but refreshed** | Use existing PRMS color palette, typography, and branding. No new design system. Refresh layout and information hierarchy. |
| **Progressive disclosure** | Core MDS fields always visible. Expandable sections for advanced fields. Keep the default view clean and scannable. |
| **Informative at every level** | Every accordion header shows: section name, completion status (green/yellow/gray dot), field count ("3/5 fields complete"). No dead space. |
| **Actionable summary** | Section 0 is the command center: progress overview, narrative generation, PDF download, AI review trigger. |
| **Mobile-aware** | Accordion pattern works naturally on narrow viewports. Avoid fixed-width aside layouts. |

#### 2.8.2 Layout Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Section 0: Result Summary (dashboard header)                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Project Info   │  │ MDS Ring       │  │ Action Buttons     │  │
│  │ SP Badge + %   │  │ 67% complete   │  │ [Generate          │  │
│  │ Result Code    │  │ ▓▓▓▓▓░░░░░░░░  │  │  Narrative]        │  │
│  │ Status Badge   │  │ ▓▓▓▓▓░░░░░░░░  │  │ [Download PDF]     │  │
│  └────────────────┘  └────────────────┘  │ [AI Review]        │  │
│                                           │ [Submit]           │  │
│                                           └────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ▼ Section 1: General Information          ● 2/2 fields  ▓▓▓▓▓░  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Title:    [________________________________________]         ││
│  │ Description: [________________________________]               ││
│  │ ─── Expandable ───                                           ││
│  │ ≫ Lead contact person, Impact Areas (5)  [Show all fields]  ││
│  └──────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  ▼ Section 2: Contributors and Partners  ● 5/8 fields  ▓▓▓▓▓░░░ │
├──────────────────────────────────────────────────────────────────┤
│  ▼ Section 3: Geographic Location         ● 3/3 fields  ▓▓▓▓▓▓▓ │
├──────────────────────────────────────────────────────────────────┤
│  ▼ Section 4: Evidence                     ● 2/4 fields  ▓▓▓░░░ │
├──────────────────────────────────────────────────────────────────┤
│  ▼ Section 5: Innovation Development      ● 6/10 fields ▓▓▓▓▓░░░ │
└──────────────────────────────────────────────────────────────────┘
```

#### 2.8.3 Accordion Behavior

| Feature | Behavior |
|---|---|
| **Default state** | Section 1 (General Info) open on first load. All others collapsed. |
| **Single open** | Only one accordion open at a time (auto-closes previous). Reduces cognitive load. |
| **Header info** | Section name, completion dot (green=done, yellow=partial, gray=empty), field count badge "3/5", micro progress bar. |
| **Expandable within** | Non-MDS fields show a "Show all fields" link at section bottom. Clicking reveals secondary fields inline — no page navigation. |
| **Unsaved changes** | If user tries to collapse with unsaved changes, confirm dialog: "You have unsaved changes. Discard?" |
| **Auto-save** | On section collapse, auto-save visible fields. Keep explicit save button in accordion footer for clarity. |

#### 2.8.4 Section 0 Dashboard — Detailed Design

Three-column card layout:

**Column 1 — Project & Result Identity:**
- Reporting Project name + W3 Registry code
- Primary SP badge (colored pill with allocated %)
- Secondary SP chips (smaller, muted)
- Result type icon + label
- Result code (clickable → opens read-only view)
- Status badge (Draft / Editing / Pending Review)

**Column 2 — MDS Completion:**
- Circular progress ring (SVG stroke-dasharray) with percentage in center
- Ring color: < 40% red, 40–80% amber, > 80% green
- Below ring: condensed list per section with micro progress bar + status dot
- Click section name → scrolls to that accordion

**Column 3 — Actions:**
| Action | Description |
|---|---|
| **Generate result narrative** | Calls AI to produce a narrative summary based on MDS fields. Opens a side panel with generated text; user can copy, edit, or regenerate. |
| **Download PDF report** | Reuses existing `pdf-actions` component. Generates standard result PDF. |
| **Run AI Review** | Triggers traffic-light QA analysis (Phase 4). Enabled when all MDS sections complete. |
| **Submit for review** | Status transition: Editing (1) → Pending Review (5). Shows submission modal with confirmation. |

#### 2.8.5 Visual Design Guidance

| Element | Guidance |
|---|---|
| **Color palette** | Use existing PRMS brand colors (primary blue, accent green for completions, amber for warnings, red for missing). No new brand colors. |
| **Typography** | Current PRMS font family. Headers: semi-bold, sentence case. Body: regular. Monospace for codes. |
| **Accordion headers** | Background: subtle gray (`#f8f9fa` or equivalent). Hover: slightly darker. Active/open: white background with left accent border in primary blue. |
| **Progress ring** | 80px diameter, 6px stroke width. Background track: light gray. Foreground: gradient amber→green. |
| **Badges & chips** | SP badge: primary blue pill with white text + small % label. Secondary SPs: outlined gray chips. Status: colored dot + text (Draft=purple, Editing=blue, Pending Review=amber, Approved=green). |
| **Spacing** | Generous white space between sections (24px+). Comfortable padding inside accordions (16–20px). |
| **Icons** | Use PrimeNG icons (PrimeIcons) consistently. Section icons in accordion headers. |
| **Transitions** | Smooth accordion expand/collapse (300ms ease). Progress ring animates on update. |
| **Responsiveness** | On narrow screens (< 768px), Section 0 cards stack vertically. Accordions remain full-width. |

#### 2.8.6 Implementation Notes

- **PrimeNG components:** `p-accordion` (collapsible panels), `p-progressbar` (per-section progress), `p-knob` or custom SVG (overall ring), `p-chip` (SP chips), `p-tag` (status badges), `p-button` (actions), `p-card` (Section 0 cards).
- **Tailwind CSS:** All new bilateral components use Tailwind (Decision D15). Avoid component-scoped CSS for layout.
- **State management:** `GreenChecksService` already tracks per-section completeness. Extend it for bilateral sections. MDS completion % is derived from green check state.
- **Section 0 service:** New `BilateralSummaryService` to aggregate project info, SP data, MDS progress, and available actions into a single view model.
- **Existing reuse:** `pdf-actions` component, submission modal, AI review component, evidence modal — reused as-is or with minimal adaptation.

---

## 3. Stakeholders & Decisions

### 3.1 Team Roles

| Person | Role | Responsibility in This Feature |
|---|---|---|
| **Angel Jarrin** | Product Owner / Epic creator | Defined P2-2965; technical architecture decisions; stakeholder alignment. **AI Policy contact** — defines CGIAR AI policy thresholds, confidential data handling rules, and model governance parameters. |
| **Juan David Delgado** | UX/Product Designer / US assignee (P2-3100) | Mockups, user flow, spec writing; coordinating with Dani Gomez on text mining |
| **Yecksin Mauricio Zuniga** | Frontend Developer | Tailwind migration; implementing bilateral creation UI from mockups |
| **Nicoletta** | Data Quality / Evidence Governance | Evidence guide authoring; QA criteria definition; alignment with Frank/Jim |
| **Maria Julia** | Evidence Standards | Evidence type distinction (third-party vs. self-generated); policy change QA guide |
| **Dani Gomez** | AI/Text Mining Team | Existing text mining component; coordination to avoid duplication |
| **Juan Carlos (Juanca)** | Technical Authority / Governance | Must be included in all Reporting Tool decisions; provides technical guidance (sometimes blocking) |
| **Frank / Jim** | Policy QA Stakeholders | Policy change evidence types and QA criteria |
| **Jose / Joel** | Progress Tracker Owners | W1/W2 pooled results migration to PRMS |
| **Yeck** | Frontend Design System | Visual redesign (revamp) of the Reporting tool |

### 3.2 Decisions Locked In

| # | Decision | Source | Confidence |
|---|---|---|---|
| D1 | **Primary Contributing Science Program comes from W3 Registry**, not from ToC traversal | Meeting 2026-07-08 (Angel: "esa ya es nuestra fuente de verdad principal") | High |
| D2 | **"Is planned" field is removed** from the bilateral creation form | Nicoleta session + Maria Julia confirmation | High |
| D3 | **ToC alignment is NOT shown in the initial AI stage** | Nicoleta session: "desde una misma evidencia pueden reportarse dos tipos de resultado con distintos niveles de ToC" | High |
| D4 | **AI QA scope is MDS only** (+ impact area tags optional) | Nicoleta session: "no evaluar campos extra-MDS para no aumentar la carga" | High |
| D5 | **AI guides, does not block** — traffic light is advisory | Nicoleta session: "el usuario puede igualmente someter el resultado" | High |
| D6 | **Consolidate AI into a single review step**, not multiple per-section assistants | Nicoleta / Angel: "consolidar todo en el AI Review final" | High |
| D7 | **New Draft status** for AI-identified results; not visible in normal result list | Meeting 2026-07-08 | High |
| D8 | **Multiple file uploads** supported before AI analysis | Meeting 2026-07-08 (Angel + Jarrin) | High |
| D9 | **Voice note input** supported alongside file upload and text box | Meeting 2026-07-08 (Jarrin: "ingresar voz para que eso fue una nota de voz") | High |
| D10 | **Drafts visible to Science Program members**, not just the uploader | Meeting 2026-07-08 (Jarrin: "abierto para otro usuario del mismo Saints Program") | High |
| D11 | **Reuse existing drafts** when a similar document was already uploaded | Meeting 2026-07-08: avoid re-processing same document | High |
| D12 | **September 2026 target** for bilateral reporting with AI review available | Meeting 2026-07-08 (Angel/Juan confirmed) | Medium — many parallel features |
| D13 | **Confidential/non-public evidence excluded from AI route** | Nicoleta session: "CGIAR aún no tiene política oficial de AI para información privada" | High |
| D14 | **In-platform notification + email** for draft completion | Meeting 2026-07-08 (Jarrin: "tratar de hacer algo como muy invasivo") | High |
| D15 | **Tailwind CSS migration** for the bilateral frontend | Meeting 2026-07-08 (Yecksin: "migrar de CSS a Tailwind") | High |
| D16 | **Backend mediates all AI service calls** — frontend never calls AI service directly | Architecture decision: backend uploads to S3, sends parameters to AI service, AI service downloads from S3 | High |
| D17 | **Uploaded documents registered as DraftEvidence** — staging area before formal evidence | User must explicitly select which documents become formal evidence when promoting draft to Editing | High |
| D18 | **Voice notes and text context are never formal evidence** — they provide AI context only | Only DOCUMENT type items can be promoted to ResultsByEvidences | High |
| D19 | **W3/Bilateral results follow Draft (8) → Editing (1) → Pending Review (5) → Approved (6)/Rejected (7)** | They do NOT go through Quality Assessed (2) or Submitted (3), which are for W1/W2 pooled results | High |
| D20 | **Exception: SGP-02 can have W3 results in Editing status** | Legacy case; new center self-reporting flow uses standard bilateral lifecycle | Medium |
| D21 | **User chooses Primary SP** regardless of allocated percentage. No rule that highest % = primary. | Meeting 2026-07-09 (Angel: "No hay una regla que diga que el que tenga más porcentaje, ese sería el primario.") | High |
| D22 | **Secondary/contributing SPs** can be selected by user from the same W3 Registry list. Only SPs in W3 Registry are allowed — no manual additions. | Meeting 2026-07-09 (Angel: "Únicamente lo que sea en el W3, no puede escoger nada más.") | High |
| D23 | **Documents uploaded for AI (PDF, DOCX, DOC) become formal evidence candidates.** Voice notes and text context are NEVER evidence — they provide AI context only. | Meeting 2026-07-09 (Angel: "Subo esos archivos, la IA analiza. Pero esas cosas no deberían de quedar como evidencia.") | High |
| D24 | **During Draft → Editing promotion**, user must explicitly select which documents become formal evidence (`is_formal_evidence=true`). | Meeting 2026-07-09 (Juan David: "Debemos pedirle al usuario que nos indique cuál es la evidencia principal.") | High |
| D25 | **New evidence in Editing triggers AI Review mismatch detection.** User can accept mismatch (logged) or trigger re-run of AI analysis. | Meeting 2026-07-09 (Angel: "AI Review detecta mismatch. User puede OK continue o hacer un re-run.") | High |
| D26 | **AI Review covers ALL MDS fields except ToC.** ToC is excluded from AI extraction — assigned by SP lead during review. | Meeting 2026-07-09 (Angel: "Debería ser para todos esos campos hoy. Lo que así no estaría sería teoría de cambio.") | High |
| D27 | **Science Program lead can ONLY edit ToC when reviewing bilateral results.** All other metadata is locked during SP review. | Meeting 2026-07-09 (Angel: "No se va a hacer modificación de esa información. Lo único editable es la teoría de cambio.") | High |
| D28 | **Notifications via webhook per Center.** Each Center provides a webhook URL; PRMS sends approval/rejection payload with MDS metadata. | Meeting 2026-07-09 (Juan David: "Cada centro nos indique un webhook URL. Nosotros le vamos a mandar la información.") | Medium — depends on Center-side API readiness |
| D29 | **Excel bulk upload still under consideration.** Nicoleta supports it as a faster alternative for centers with many results. | Meeting 2026-07-09 (Angel: "Nicoleta decía que definitivamente ese tema del Excel no quedó del todo descartado.") | Low — not in current roadmap |

### 3.3 Decisions with Important Context

| # | Decision | Context / Risk |
|---|---|---|
| DC1 | AI review covers evidence quality + title + description in one step | Existing `api/ai` only handles title/description/short_title. Evidence quality assessment requires new prompts and possibly new external service endpoints. |
| DC2 | Draft results are not in the normal result list | Requires a new status value in `ResultStatusData` enum, a new database migration, and a new frontend module/page. The existing result list filter (`findAllByRoleFiltered`) does not know about drafts. |
| DC3 | Voice note input for AI context | No existing voice-to-text pipeline in PRMS. The Progress Tracker (Jose) has this capability — need to evaluate reuse. |
| DC4 | Drafts shared across Science Program members | Requires a new visibility model. Currently, results are scoped to initiatives. Drafts need to be scoped to Science Program, which is a different organizational unit. |

### 3.4 Stakeholder Positions and Preferences

| Stakeholder | Position | Preference |
|---|---|---|
| **Nicoletta** | Evidence quality is paramount; AI should assist, not replace human judgment | Consolidated AI review; traffic light advisory; evidence guide as single source of truth |
| **Angel / Jarrin** | Architecture must be clean; AI must not block reporting; manual route is the safety net | Background processing with drafts; in-platform notifications; Tailwind migration |
| **Maria Julia** | Distinguish third-party vs. self-generated evidence | Evidence type distinction reflected in QA scoring |
| **Juan Carlos** | Technical governance; cautious about scope | Must be included in all meetings; may push back on scope or technical approach |
| **Yecksin** | Frontend modernization | Tailwind migration; bring design from Delgado's mockups |
| **Dani Gomez** | Avoid duplicating existing text mining work | Reuse existing component if possible; coordinate before building new |

---

## 4. Recommended Architecture & Reuse Strategy

### 4.1 Starting Point: The Working Codebase

The PRMS monorepo already has substantial bilateral and AI infrastructure:

| Component | Location | Status | Reuse Potential |
|---|---|---|---|
| Bilateral ingestion (headless) | `api/bilateral/` | Production | Reuse DTOs, handlers, ToC mapping, user resolution |
| Bilateral review (frontend) | `pages/bilateral-results/` | Production | Reuse review drawer, filter components, table |
| AI session management | `api/ai/` | Production | Reuse entities, endpoints, audit trail |
| AI text mining (frontend) | `result-ai-assistant/` | Incomplete (stub creation) | Reuse upload UI, loading states, result cards; fix creation flow |
| AI review (frontend) | `ai-review/` component | Production (3 fields) | Extend for evidence quality + MDS assessment |
| Result creator | `result-creator/` | Production | Adapt for bilateral-specific creation flow |
| Notification service | `api/notification/` | Production | Add new notification type for draft completion |
| Share result request | `share-result-request/` | Production | Reuse for draft sharing across Science Program members |

### 4.2 Primary Reference Codebases

| Reference | What to Learn |
|---|---|
| `docs/bilateral-module/` | Complete replication guide with backend, frontend, integration contracts, and checklist |
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | Bilateral payload contract (additive changes only) |
| `docs/prms-ux-research-report.md` | UX friction analysis of current result reporting flow |
| Progress Tracker (Jose/Joel) | Voice note input pattern; file upload + AI extraction pipeline |

### 4.3 Agent Orchestration Layer

The AI flow is **fully backend-mediated**. The frontend never connects directly to the external AI service. This ensures:
- Centralized file management (S3 upload/download)
- Queue-based async processing (HTTP request does not block)
- Audit trail persistence at every step

**Architecture principle:** The backend is the single point of contact with the AI service. The frontend only uploads files and polls for job status.

**AI extraction scope (confirmed 2026-07-09):** AI extracts all MDS fields EXCEPT Theory of Change. ToC is intentionally excluded — it is assigned by the Science Program lead during result review. This avoids pre-filling relationships the center user cannot validate and keeps the AI analysis focused on verifiable metadata.

**Flow:**

```
FRONTEND                          BACKEND                           EXTERNAL SERVICES
────────                          ───────                           ─────────────────
                                  
1. User selects files             
   + voice note                   
   + text context                 
                                  
2. POST /api/bilateral-ai/process 
   (multipart/form-data) ────────→ 3. Validate request
                                   
                                   4. Upload files to S3
                                      (store under prms/bilateral-ai/{jobId}/)
                                   
                                   5. Create BilateralAiJob record
                                      (status = PENDING)
                                   
                                   6. Register uploaded documents
                                      as "draft evidence" (see 4.5)
                                   
                                   7. Publish message to
                                      AI_PROCESSING_QUEUE (RMQ)
                                   
8. Return 202 Accepted              
   { jobId, status: "PENDING" } ←── 
                                   
9. Frontend polls                   
   GET /api/bilateral-ai/jobs/:id   
   (or WebSocket notification)      
                                   
                                   ┌─────────────────────────────────┐
                                   │ RMQ Consumer (async)            │
                                   │                                 │
                                   │ 10. Update job → PROCESSING     │
                                   │                                 │
                                   │ 11. Call AI service with        │
                                   │     PARAMETERS ONLY:            │
                                   │     - s3_bucket                 │
                                   │     - s3_key_prefix             │
                                   │     - document_urls[]           │
                                   │     - voice_note_url            │
                                   │     - text_context              │
                                   │     - science_program_id        │
                                   │     - result_type_hints[]       │
                                   │                                 │
                                   │     (AI service downloads       │
                                   │      files from S3 directly)    │
                                   │                                 │
                                   │ 12. AI service returns:         │
                                   │     - identified_results[]      │
                                   │     - confidence_scores[]       │
                                   │     - extracted_metadata[]      │
                                   │                                 │
                                   │ 13. For each identified result: │
                                   │     a. Create result            │
                                   │        (status = Draft)         │
                                   │     b. Pre-fill MDS fields      │
                                   │     c. Link to source documents │
                                   │        via BilateralAiDraft     │
                                   │                                 │
                                   │ 14. Update job → COMPLETED      │
                                   │                                 │
                                   │ 15. Send notifications:         │
                                   │     - In-app notification       │
                                   │     - Email to uploader         │
                                   └─────────────────────────────────┘
```

**Why this architecture:**
- **Security**: AI service credentials never exposed to frontend
- **Reliability**: RMQ ensures processing survives backend restarts
- **Scalability**: AI processing is decoupled from HTTP request lifecycle
- **Auditability**: Every step is persisted (job status, AI request/response, draft creation)
- **File management**: Backend controls S3 access; AI service downloads via signed URLs

**Key difference from current state:** The existing `result-ai-assistant` component calls `textMiningUrl` directly from the frontend. This must change: all AI calls go through the backend.

#### 4.3.1 Worker Subtask Architecture

The AI processing pipeline is split into **specialized workers** that each own one subtask, allowing parallel execution and independent scaling:

```
RMQ Consumer (orchestrator)
  → Worker 1: Document Extraction & Preprocessing
      - Downloads files from S3/SharePoint/CGSpace
      - Extracts text (PDF, DOCX, TXT)
      - Strips PII/confidential content
      - Publishes extracted text to EXTRACTION_COMPLETE queue
      
  → Worker 2: Model Invocation
      - Reads extracted text from queue
      - Invokes LLM (Bedrock / external AI service)
      - Returns structured result metadata + confidence scores
      - Publishes to MODEL_COMPLETE queue

  → Worker 3: Result Assembly & Draft Creation
      - Consumes MODEL_COMPLETE
      - Creates Draft results + DraftEvidence records
      - Sends notifications (email + in-app)
```

**Key principles:**
- **Control stays in the model (LLM)** — the model decides how to decompose work and what to extract. Workers are execution units around the model, not decision-makers.
- **Single Lambda** — all workers run within a single Lambda function, routing via event type. Avoids cold-start multiplication.
- **Subtask replication** — if a worker fails, the subtask can be retried independently without re-running the entire pipeline.
- **Queue-per-stage** — each worker publishes to its own RMQ queue, enabling backpressure and independent scaling.

### 4.4 Retrieval and Corpus Search Layer

| Capability | Current | Needed |
|---|---|---|
| Text extraction from PDF/DOCX/TXT | Frontend uses `pdfjs-dist` for page count only | Server-side text extraction for AI processing |
| Text mining / result identification | External service at `textMiningUrl` | Coordinate with Dani Gomez/Manu; may need new endpoint for bilateral-specific prompts |
| Duplicate draft detection | Not implemented | Before creating a new draft, check if a similar document was already processed for this Science Program |
| Evidence validation | Not implemented | Check URL accessibility (404 detection); age heuristic (>3-5 years) |

### 4.5 Persistence and Session Management

**New entities needed:**

| Entity | Purpose | Key Fields |
|---|---|---|
| `BilateralAiJob` | Tracks a background AI processing job | `id`, `user_id`, `initiative_id`, `science_program_id`, `status` (PENDING/PROCESSING/COMPLETED/FAILED), `created_at`, `completed_at`, `error_message` |
| `BilateralAiDraft` | Links a draft result to its source job and documents | `id`, `job_id`, `result_id`, `ai_confidence_score`, `excluded_reason` (nullable) |
| `DraftEvidence` | Provisional evidence attached to a draft result (before promotion to Editing) | `id`, `draft_id`, `source_type` (DOCUMENT/VOICE_NOTE/TEXT_CONTEXT), `s3_key`, `file_name`, `mime_type`, `is_formal_evidence` (boolean, default false), `ai_extracted_metadata` (JSON) |

**Draft status:** Add `Draft = 8` to `ResultStatusData` enum. Requires migration.

**Session management:** The existing `AiReviewSession` can be reused for the consolidated AI Review step. Extend it to support evidence quality assessment and MDS field evaluation.

#### 4.5.1 Draft Evidence Lifecycle

**Problem:** When the user uploads files for AI processing, those files are not necessarily formal evidence. For example:
- A voice note provides context for the AI but is not citable evidence
- A text box with keywords helps the AI but is not evidence
- A PDF paper is both AI input AND potential formal evidence

**Solution:** All uploaded items are registered as `DraftEvidence` with `is_formal_evidence = false` by default. When the user promotes a draft to Editing status, they must explicitly select which items become formal evidence.

**Flow:**

```
1. User uploads files + voice note + text context
   → Backend creates DraftEvidence records:
     - PDF paper: source_type=DOCUMENT, is_formal_evidence=false
     - Voice note: source_type=VOICE_NOTE, is_formal_evidence=false
     - Text context: source_type=TEXT_CONTEXT, is_formal_evidence=false

2. AI processing completes
   → Draft result is created
   → DraftEvidence records are linked to the draft via draft_id

3. User views draft in "My Draft Results"
   → Sees list of attached DraftEvidence items
   → Each item shows: file name, type icon, AI-extracted metadata preview
   → User can mark items as "intended as formal evidence" (is_formal_evidence=true)
   → User can discard items (soft delete)
   → User can upload additional evidence at this stage

4. User clicks "Promote to Editing"
   → Backend validates: at least one DraftEvidence with is_formal_evidence=true
      (or user explicitly chooses "no evidence" with justification)
   → Draft result transitions: status_id = 8 (Draft) → 1 (Editing)
   → DraftEvidence items with is_formal_evidence=true are copied to
     the formal ResultsByEvidences table
   → DraftEvidence items with is_formal_evidence=false are discarded
   → User can still add/remove evidence in the standard result detail form

5. Result is now in Editing status
   → Standard result detail workflow applies
   → Evidence section shows formal evidence (copied from DraftEvidence)
   → User can edit, add, or remove evidence as needed
   → When ready, user submits → status_id = 1 (Editing) → 5 (Pending Review)
   → [NOT 2 (Quality Assessed) or 3 (Submitted) — those are for W1/W2]
```

**Key rules:**
- Voice notes and text context are NEVER formal evidence (source_type constraint)
- Only DOCUMENT type items can be promoted to formal evidence
- User must explicitly confirm which documents are evidence (no automatic promotion)
- DraftEvidence is a staging area; ResultsByEvidences is the formal record
- When draft is discarded, all associated DraftEvidence records are soft-deleted

### 4.6 Safety Hooks and Governance

| Hook | Implementation |
|---|---|
| **AI does not block submission** | Traffic light is purely visual. No server-side validation gates on AI scores. |
| **Override tracking** | When user submits despite AI red flag, log to `AiReviewEvent` with `event_type = OVERRIDE_WARNING`. |
| **Confidential data exclusion** | AI route explicitly warns users not to upload confidential documents. No technical enforcement yet (pending CGIAR AI policy). |
| **Audit trail** | All AI interactions logged via existing `AiReviewEvent`, `ResultFieldRevision`, and new `BilateralAiJob` entities. |
| **PII stripping** | Per W8 in detailed-design: all AI requests must be stripped of secrets/PII before sending to third-party models. |

### 4.7 Frontend Architecture

**New pages/components:**

| Component | Location | Purpose |
|---|---|---|
| `bilateral-result-creator` | `pages/bilateral/pages/bilateral-result-creator/` | New creation flow per P2-3100 ACs. Includes SP selector (primary + secondary) with allocated % display |
| `bilateral-ai-upload` | `components/bilateral-ai-upload/` | Multi-file upload + voice note + text context. Documents = evidence candidates; voice/text = AI context only |
| `my-draft-results` | `pages/bilateral/pages/my-draft-results/` | Draft list with counter badge, source document display |
| `draft-result-card` | `components/draft-result-card/` | Compact metadata display per draft |
| `center-activity-dashboard` | `pages/bilateral/pages/center-activity/` | Summary of center's reporting activity: total results submitted, pending, approved, rejected (NEW scope — D30) |
| `ai-review-extended` | `components/ai-review-extended/` | Extended AI review with evidence quality + MDS traffic light. Includes mismatch detection + re-run trigger for post-AI evidence |

**Tailwind migration:** Yecksin will migrate bilateral components from CSS to Tailwind. Delgado's mockups should be the design reference.

**Draft visibility:** The "My Draft Results" entry point appears in the bilateral module navigation. Counter badge shows number of drafts (1-9, then "9+"). Drafts are scoped to the Science Program, not just the individual user.

#### 4.7.1 Component-Level Flow Diagram

The following diagram maps the full user journey at the component level, including what each component consumes, what parameters it receives, what services it invokes, and which API endpoints it calls:

```
Bilateral Module (landing page)
  ├── HeaderPanelComponent
  │     └── consumes: currentUser, centerInfo
  │
  └── bilateral-result-creator/
        ├── ReportingProjectSelectorComponent
        │     ├── consumes: GET /api/clarisa/projects?centerId={id}&bilateral=true
        │     └── emits: selectedProject (projectId, scienceProgramId)
        │
        ├── ScienceProgramDropdownComponent
        │     ├── consumes: project.scienceProgramId → GET /api/w3-registry/programs/{spId}
        │     └── emits: selectedScienceProgram
        │
        ├── RouteSelectorComponent
        │     ├── consumes: allMandatoryFieldsFilled (boolean) → enables AI/Manual buttons
        │     ├── emits: route (ai | manual)
        │     │
        │     ├── route = manual → ResultCreatorFormComponent
        │     │     ├── consumes: GET /api/results/schema?type={resultType}&source=bilateral
        │     │     ├── POST /api/results/create (source=bilateral, status_id=1)
        │     │     └── emits: resultCreated (resultId)
        │     │
        │     └── route = ai → BilateralAiUploadComponent
        │           ├── consumes: POST /api/bilateral-ai/process (multipart/form-data)
        │           ├── polls: GET /api/bilateral-ai/jobs/:jobId
        │           └── redirects → my-draft-results/
        │
        └── breadcrumb: CGIAR Center > [Full Center Name] (INITIALS)

my-draft-results/
  ├── DraftCounterBadgeComponent
  │     └── consumes: GET /api/bilateral-ai/drafts/count (scoped to Science Program)
  │
  └── DraftListComponent (PrimeNG table)
        ├── consumes: GET /api/bilateral-ai/drafts (scoped to Science Program)
        ├── each row → DraftResultCardComponent
        │     ├── inputs: draft (id, sourceDoc, resultType, title, keywords, mdsCompleteness)
        │     └── events: promote, discard, view
        │
        └── DraftDetailComponent (p-dialog)
              ├── consumes: GET /api/bilateral-ai/drafts/:draftId
              ├── GET /api/bilateral-ai/drafts/:draftId/evidence
              ├── PATCH /api/bilateral-ai/drafts/:draftId/evidence/:evId (set is_formal_evidence)
              ├── POST /api/results/evidences/create/:resultId (additional uploads)
              ├── click promote → POST /api/bilateral-ai/drafts/:draftId/promote
              ├── click discard → DELETE /api/bilateral-ai/drafts/:draftId
              └── on promote → navigates to result-detail/{resultId}

result-detail/{resultId} (Editing status)
  ├── all standard rd-* section components
  │     └── AI-pre-filled fields show "AI suggested" badge
  │
  └── AiReviewExtendedComponent (in panel menu)
        ├── consumes: POST /api/ai/review/extended (resultId)
        ├── displays: traffic-light per MDS field
        ├── emits: FEEDBACK event per suggestion (thumbs up/down)
        └── always advisory — submit is never blocked
```

**Key flows:**
- **Data flow:** Component → Service (results-api.service.ts) → HTTP → Backend → External AI Service
- **Parameter propagation:** `selectedProject.scienceProgramId` flows from project selector → SP dropdown → AI upload context → draft scoping
- **Endpoint pattern:** Frontend never calls external AI services directly — all AI communication is backend-mediated

### 4.8 Backend Architecture

**New endpoints:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/bilateral-ai/process` | Submit files for background AI processing |
| GET | `/api/bilateral-ai/jobs/:jobId` | Check job status |
| GET | `/api/bilateral-ai/drafts` | List drafts for current user's Science Program |
| POST | `/api/bilateral-ai/drafts/:draftId/promote` | Convert draft to Editing status (begin manual completion) |
| DELETE | `/api/bilateral-ai/drafts/:draftId` | Discard a draft |

**New module:** `api/bilateral-ai/` — follows standard module layout. Imports `BilateralModule` (for DTOs and handlers), `NotificationModule`, `AiModule`.

**Existing bilateral ingestion unchanged:** The headless `/api/bilateral/create` endpoint continues to work for external systems. The new center-facing flow is a separate surface.

### 4.9 AI Architecture

**Current AI architecture (to be replaced):**
```
Frontend → External AI Service (AWS API Gateway)  ← PROBLEM: frontend calls AI directly
         → PRMS Server (persistence only)
```

This is problematic because:
- AI service credentials are exposed to the frontend
- File uploads go through the frontend, not the backend
- No centralized audit of AI requests
- No queue-based async processing

**Proposed AI architecture for bilateral (backend-mediated):**
```
Frontend → PRMS Server (file upload + job creation)
         → PRMS Server uploads files to S3
         → PRMS Server publishes to RMQ
         → RMQ Consumer:
             → Calls AI service with S3 URLs (parameters only, no file transfer)
             → AI service downloads files from S3 directly
             → AI service returns extracted metadata
             → PRMS Server creates Draft results + DraftEvidence records
         → PRMS Server sends notifications (email + in-app)
```

**Key principle:** The frontend NEVER calls the external AI service. All communication with the AI service goes through the backend. The AI service receives S3 signed URLs as parameters and downloads files itself — the backend does not proxy file content to the AI service.

**Prompt strategy:**
- María Julia provides the evidence quality guide
- Technical team (Juan as lead) drafts prompts based on the guide
- Iterative testing and refinement in a testing environment
- Prompts live in the external AI service, NOT in the PRMS codebase

### 4.10 What to Build from Scratch vs. What to Adapt

| Capability | Build New | Adapt Existing |
|---|---|---|
| Bilateral creation form (P2-3100) | **New** — bilateral-specific fields (Reporting Project, Science Program) | Reuse result creator patterns (initiative selector, result level/type) |
| AI upload interface | **New** — multi-file, voice note, text context | Adapt `ai-upload-file` component (single file, PDF only) |
| Draft status + lifecycle | **New** — new enum value, new entity, new migration | Reuse result status transition patterns |
| My Draft Results page | **New** | Reuse results-list patterns (PrimeNG table, filters) |
| Background AI processing | **New** — RMQ consumer, job entity | Adapt `ReportingFullMetadataExportService` async job pattern |
| AI Review (evidence + MDS) | **Partially new** — evidence quality assessment, MDS traffic light | Extend existing `AiReviewService` and `ai-review` component |
| Draft sharing across Science Program | **New** — visibility model | Adapt `ShareResultRequest` with status 4 (contributing) pattern |
| Notification for draft completion | **New** notification type | Reuse `NotificationService.emitResultNotification()` |
| Bilateral review drawer | **Existing** | Reuse as-is for AI-created drafts that reach Pending Review |

---

## 5. Implementation Guidance

### 5.1 Recommended Tech Stack with Rationale

| Layer | Technology | Rationale |
|---|---|---|
| Backend framework | NestJS 11 (existing) | Already in use; no reason to change |
| Database | MySQL + TypeORM (existing) | Schema changes via migration |
| Async processing | RabbitMQ (existing) | Already used for metadata export; proven pattern |
| File storage | S3 (existing) | `ai-services-ibd` bucket already configured |
| Frontend framework | Angular 19 + PrimeNG 19 (existing) | Already in use |
| Styling | Tailwind CSS (new for bilateral) | Team decision; Yecksin leading migration |
| AI/LLM | External service (AWS API Gateway) | Existing pattern; prompts managed externally |
| Text mining | External service (coordinate with Dani Gomez) | Existing component; adapt for bilateral |
| Notifications | In-app + email (existing) | `NotificationService` + `EmailNotificationManagementService` |

### 5.2 Key Design Decisions and Trade-offs

| Decision | Trade-off |
|---|---|
| Background processing (not synchronous) | User can close browser and return later. Trade-off: added complexity of job tracking, notifications, and error recovery. |
| Draft status (new enum value) | Clean separation from Editing results. Trade-off: requires migration; existing queries may need to exclude Draft status. |
| Science Program-scoped drafts (not user-scoped) | Enables collaboration and reuse. Trade-off: requires new visibility model; current result scoping is initiative-based. |
| Consolidated AI Review (single step) | Simpler UX; one place for all AI feedback. Trade-off: user must complete all MDS fields before getting AI feedback. |
| Tailwind migration for bilateral only | Modernizes the bilateral surface without full app migration. Trade-off: two styling systems coexist temporarily. |
| W3 Registry as Primary SP source | Simpler than ToC traversal; aligns with institutional mapping. Trade-off: depends on W3 Registry being up-to-date. |

### 5.3 Phasing — Priority Order

Each phase defines responsibilities across three layers and marks where they **converge** (integration point).

---

#### Phase 1: Manual Bilateral Creation (P2-3100 + P2-3101) — Sprint 36-37

| Layer | Responsibilities |
|---|---|
| **Reporting Frontend** | `bilateral-result-creator` page: Reporting Project dropdown (filtered by center), Project Summary/Description auto-population (read-only), Primary SP selector with allocated % display, Secondary/contributing SP selector (multi-select from W3 Registry). Common fields form (general info, geography, evidence, contributors). Tailwind CSS setup. |
| **Reporting Backend** | `POST /api/results/create` with `source=Bilateral`. W3 Registry integration for project list per center + SP mappings + allocated percentages. `GET /api/clarisa/projects?centerId={id}&bilateral=true`. Validation: only SPs from W3 Registry accepted. |
| **AI (External Service)** | None — manual route only. |

**Convergence:** Frontend calls Backend endpoints directly. No AI involvement. Result created with `status_id=1` (Editing), `source=Bilateral`.

---

#### Phase 2: Type-Specific Sections (P2-3122 through P2-3127) — Sprint 37-38

| Layer | Responsibilities |
|---|---|
| **Reporting Frontend** | Type-specific form sections per result type (Innovation Dev, Capacity Sharing, KP, Innovation Use, Policy Change, Other). Indicator type tag per ToC node — warning banner when `result_type_category ≠ toc_indicator_category`. |
| **Reporting Backend** | DTOs and validation per type-specific MDS. ToC node endpoint returns `indicator_category` for tag matching. |
| **AI (External Service)** | None — manual route only. |

**Convergence:** Standard form POST per section. ToC indicator category consumed from backend and rendered as tag in frontend.

---

#### Phase 3: AI-Assisted Route (Draft Status + Background Processing) — Sprint 38-40

| Layer | Responsibilities |
|---|---|
| **Reporting Frontend** | `bilateral-ai-upload` component: multi-file upload zone (PDF, DOCX, DOC, TXT), voice note recorder, text context box. `my-draft-results` page with counter badge, draft list, `draft-result-card`. Draft detail view with evidence selection checkboxes. **Draft → Editing promotion** UI (user selects `is_formal_evidence=true` per document). `center-activity-dashboard` page. Duplicate detection warning on upload. |
| **Reporting Backend** | New `Draft = 8` status (migration). `BilateralAiJob`, `BilateralAiDraft`, `DraftEvidence` entities + migration. **S3 upload** handler (`POST /api/bilateral-ai/process`). **RMQ consumer** (orchestrator): receives S3 URLs → publishes to extraction queue → receives extracted text → publishes to model queue → receives results → creates Draft results + DraftEvidence records. `GET /api/bilateral-ai/jobs/:jobId` (polling). `GET /api/bilateral-ai/drafts` (scoped to SP). `POST /api/bilateral-ai/drafts/:draftId/promote` (copies marked evidence → ResultsByEvidences). `DELETE /api/bilateral-ai/drafts/:draftId`. Notification service trigger (email + in-app). Duplicate detection: check existing drafts by document hash + SP. |
| **AI (External Service)** | **Worker 1 — Document Extraction:** Receives S3 signed URLs. Downloads files. Extracts text (PDF parsing, DOCX parsing, OCR if needed). Strips PII/confidential content. Returns structured text per document. Publishes to extraction_complete queue. **Worker 2 — Model Invocation:** Receives extracted text + user context (voice note transcript, text box). Invokes LLM (Bedrock). Returns identified results: titles, confidence scores, extracted metadata per MDS field (excluding ToC). Publishes to model_complete queue. **Prompt scope:** All MDS fields except ToC. Geography, evidence typology, contributing centers, type-specific fields (participant counts, IRL, KP metadata, etc.). |
| | |
| **Convergence Point** | `POST /api/bilateral-ai/process` → Backend uploads to S3 → publishes RMQ → AI Workers execute extraction + inference → Backend creates Drafts → Frontend polls + displays. **Backend mediates ALL AI communication.** Frontend never calls AI service directly. |

**Key rule:** Documents (PDF, DOCX, DOC) = evidence candidates. Voice notes + text context = AI context only, NEVER evidence. User selects which docs become formal evidence during promotion.

---

#### Phase 4: AI Review (Evidence Quality + MDS Traffic Light) — Sprint 40-42

| Layer | Responsibilities |
|---|---|
| **Reporting Frontend** | `ai-review-extended` component (panel menu in result detail). Traffic light per MDS field (green/yellow/red). **Evidence mismatch banner** with two buttons: "Accept mismatch" / "Re-run AI analysis". Thumbs up/down feedback per suggestion. **Science Program review drawer:** ToC-only editable fields, all other metadata locked (read-only). |
| **Reporting Backend** | `POST /api/ai/review/extended` — triggers AI review on current result metadata + evidence. **Mismatch detection:** compares current metadata vs. evidence documents. Returns traffic light per field. **Re-run endpoint:** `POST /api/ai/review/rerun/:resultId` — re-queues full AI analysis with updated evidence set. **Override logging:** `AiReviewEvent` with `event_type = OVERRIDE_WARNING`, `event_type = FEEDBACK`, `event_type = MISMATCH_ACCEPTED`. Science Program review: lock non-ToC fields mutation. |
| **AI (External Service)** | **Worker 3 — AI Review:** Receives full result metadata + evidence document texts. Returns per-field quality scores (0–100) + mismatch flags between metadata and evidence. Supports **re-run** with updated evidence set. No blocking decisions — scores are advisory. Prompt covers: evidence quality vs. claimed results, title/description clarity, MDS completeness, type-specific field consistency, geography plausibility. Excludes ToC (assigned by SP). |
| | |
| **Convergence Point** | `POST /api/ai/review/extended` → Backend sends metadata + evidence → AI Worker returns per-field scores → Backend aggregates → Frontend renders traffic light + mismatch UI. **AI is always advisory.** User accepts mismatch (logged) or triggers re-run. Never blocks save, green-check, or submit. |

**Re-run flow:** User adds evidence in Editing → clicks AI Review → mismatch detected → User clicks "Re-run AI" → Backend re-queues full analysis → AI returns updated scores → Frontend refreshes traffic light.

---

#### Phase 5: Draft Sharing and Reuse — Sprint 42-43

| Layer | Responsibilities |
|---|---|
| **Reporting Frontend** | Draft visibility across SP members (users see same-SP drafts). Duplicate draft badge ("This document was already processed by [user]"). Reuse prompt: "A similar draft exists. Would you like to view it?" |
| **Reporting Backend** | Draft scoping to Science Program (not user-level). Document hash-based duplicate detection (SHA-256 of file content). `GET /api/bilateral-ai/drafts/shared` — cross-user draft listing within SP. **Webhook dispatcher:** on result approval/rejection, POST to Center's registered webhook URL with payload: `{ resultCode, title, status, justification, mdsMetadata }`. Retry logic on webhook failure. |
| **AI (External Service)** | None — sharing and webhooks are infrastructure concerns. |

| | |
|---|---|
| **Convergence Point** | Backend owns draft sharing logic + webhook dispatch. Frontend consumes shared drafts via API + renders reuse UI. **Webhook convergence:** Backend → Center webhook URL (external system). No AI involvement. |

---

#### Future Consideration (Not in Current Roadmap)

- **Excel bulk upload** — batch creation of bilateral results from structured spreadsheets. Nicoleta supports this as a faster alternative for centers with high volume. Requires format definition, validation rules, and async processing with detailed error logs.
  - **Frontend:** Excel file upload zone + validation results display.
  - **Backend:** Parsing, row-by-row validation, bulk Draft creation, error report generation.
  - **AI (External):** Potentially uses extraction worker for Excel text fields.

### 5.4 Pitfalls to Avoid (Drawn Specifically from the Record)

| Pitfall | Source | Mitigation |
|---|---|---|
| **AI assistant is clickable but incomplete** | UX Research Finding 5.1.5 | Do not ship the AI button until the full flow works end-to-end. Use a feature flag. |
| **Users copy-paste AI suggestions without adapting** | Nicoleta session observation | UI must show side-by-side comparison; encourage at least one modification. |
| **300-page PDF freezes the system** | Meeting 2026-07-08 (Nicoleta's question) | Server-side page limit; async processing with timeout; reject gracefully. |
| **Drafts only notified by email → information gets lost** | Meeting 2026-07-08 (Jarrin) | In-platform notification + badge counter + email. Triple channel. |
| **Juan Carlos blocks with non-technical arguments** | Meeting 2026-07-08 (Jarrin/Zuniga) | Go to meetings with technical evidence and alternatives. Juan must be present as counterweight. |
| **Double work with Dani Gomez's text mining** | Meeting 2026-07-08 (Delgado) | Coordinate session BEFORE building anything. Reuse existing component if viable. |
| **No review history visible to submitters** | UX Research Finding 5.3.1 | Ensure `ResultReviewHistory` is surfaced in both the draft view and the review drawer. |
| **Hardcoded "Approved" justification** | UX Research Finding 5.3.5 | Replace with optional approval comment field. |
| **Bilateral ingestion sends no notifications** | Codebase analysis | The existing bilateral flow (`reviewBilateralResult`) does not email on reject. New flow must add notifications. |
| **`result-qaed` module is empty** | Codebase analysis | Do not build QA logic there without a plan. The bilateral review already lives in `results.service.ts`. |

### 5.5 Capacity and Resource Constraints

| Constraint | Impact |
|---|---|
| **September 2026 deadline** | Manual route (Phase 1-2) must be complete by then. AI route (Phase 3-4) is aspirational but targeted. |
| **Many parallel features** | Jake's redesign, Tailwind migration, Progress Tracker migration, bilateral module — all competing for frontend bandwidth. |
| **AI prompts are external** | Prompt engineering depends on María Julia's guide and external team iteration. Not fully controllable by PRMS team. |
| **Juan Carlos availability** | Key governance decisions require his input. Schedule early. |
| **Dani Gomez coordination** | Text mining reuse depends on a coordination session that has not happened yet. |
| **Coverage thresholds** | Server tests must maintain: branches 5%, functions 20%, lines 35%, statements 40%. New module needs specs. |

---

## 6. Acceptance Criteria

### 6.1 Initial Prototype (Phase 1-2 — Manual Route)

| # | Criterion | Verification |
|---|---|---|
| AC-1.1 | Center user can see the Bilateral Module as their landing page | Login as center user; verify only bilateral module is visible |
| AC-1.2 | "Report New Bilateral Result" button navigates to the creation form | Click button; verify form renders with breadcrumb |
| AC-1.3 | Reporting Project dropdown lists only bilateral projects for the user's Center | Select Center; verify dropdown is filtered |
| AC-1.4 | Project Summary and Description auto-populate on project selection | Select project; verify fields populate and are read-only |
| AC-1.5 | Primary Contributing Science Program dropdown is filtered by selected project's W3 Registry mapping | Select project; verify SP dropdown shows only mapped programs |
| AC-1.6 | AI Assisted and Manual options are disabled until all mandatory fields are filled | Verify disabled state; fill all fields; verify options unlock |
| AC-1.7 | Manual route creates a result with `source = Bilateral` and `status_id = Editing (1)` | Create result via manual route; verify database record |
| AC-1.8 | Breadcrumb displays `CGIAR Center > [Full Center Name] (INITIALS)` | Verify breadcrumb format |
| AC-1.9 | All type-specific sections (Innovation Dev, Capacity Sharing, KP, Innovation Use, Policy Change, Other) render correct MDS fields | Navigate each type; verify field set matches bilateral DTO |
| AC-1.10 | Result can be submitted (Editing → Pending Review) following bilateral workflow | Submit result; verify status transitions: 1 → 5 and `result-review-history` entries |

### 6.2 Full Public Release (Phase 3-5 — AI Route)

| # | Criterion | Verification |
|---|---|---|
| AC-3.1 | User can upload multiple files (PDF, DOCX, TXT) + voice note + text context | Upload 3 files + 1 voice note + text; verify all accepted |
| AC-3.2 | Files are processed in background; user can close browser | Upload files; close browser; reopen; verify job is still processing |
| AC-3.3 | AI-identified results are created with Draft status (8) | After processing; verify results have `status_id = 8` |
| AC-3.4 | Draft results do NOT appear in the normal result list | Navigate to result list; verify drafts are excluded |
| AC-3.5 | "My Draft Results" page shows all drafts with source document name, result type, title, keywords | Navigate to drafts page; verify metadata display |
| AC-3.6 | Draft counter badge shows count (1-9, then 9+) | Create 10+ drafts; verify badge shows "9+" |
| AC-3.7 | User receives email notification when processing completes | Upload files; wait for completion; verify email received |
| AC-3.8 | User receives in-platform notification when processing completes | Upload files; wait for completion; verify notification appears |
| AC-3.9 | Drafts are visible to other members of the same Science Program | User A creates draft; User B (same SP) can see it |
| AC-3.10 | If a similar document was already processed, existing drafts are shown instead of re-processing | Upload same document twice; verify no duplicate drafts |
| AC-3.11 | User can promote a draft to Editing status | Click draft; verify result transitions to Editing and opens in result detail form |
| AC-3.11a | User must explicitly select which uploaded documents become formal evidence before promotion | View draft; verify DraftEvidence items listed; mark some as `is_formal_evidence=true`; promote; verify only marked items appear in ResultsByEvidences |
| AC-3.11b | Voice notes and text context are never promoted to formal evidence | Upload voice note + PDF; verify voice note has `source_type=VOICE_NOTE`; verify it cannot be marked as formal evidence |
| AC-3.11c | User can upload additional evidence during draft review | View draft; upload new file; verify new DraftEvidence record created |
| AC-3.11d | When draft is discarded, all associated DraftEvidence records are soft-deleted | Discard draft; verify DraftEvidence records have `is_active=false` |
| AC-3.12 | User can discard a draft | Click discard; verify draft is soft-deleted |
| AC-3.13 | AI Review returns traffic light assessment for evidence quality + MDS fields | Click AI Review; verify red/yellow/green indicators per field |
| AC-3.14 | AI Review suggestions are advisory; user can submit despite red flags | AI flags red; user submits; verify submission succeeds |
| AC-3.15 | Override cases are logged for analysis | User overrides red flag; verify `AiReviewEvent` with `OVERRIDE_WARNING` |
| AC-3.16 | Confidential documents are excluded from AI route with warning | User attempts to upload confidential doc; verify warning message |
| AC-3.17 | AI-created results follow bilateral review flow (Draft → Editing → Pending Review → Approved/Rejected) | Promote draft (8→1); complete form; submit (1→5); verify Science Program lead can approve (6) or reject (7) |

---

## 7. Open Questions

| # | Question | Owner | Status | Impact |
|---|---|---|---|---|
| OQ-1 | What confidence score must the AI reach for a validation to be sufficiently reliable? | Dani Gomez / AI Team | Open | Determines which AI suggestions are shown vs. discarded |
| OQ-2 | What decisions can the AI take autonomously vs. which require human review? | Nicoletta / Angel | Open | Affects how much the AI can pre-fill without user confirmation |
| OQ-3 | How to validate that the date declared by the user in evidence is correct and not invented? | Nicoletta | Open — decided to NOT implement strict date validation | Reduces scope; rely on general age heuristic (>3-5 years) |
| OQ-4 | Should AI QA apply only to MDS or also to full metadata when the user opts to fill it? | Nicoletta | Leaning toward MDS-only | Scope definition for AI Review prompts |
| OQ-5 | What is the exact list of bilateral projects per Center, and where is it stored? | Angel / CLARISA team | **Resolved** — comes from Clarisa Projects via W3 Registry, filtered by `lead_center_id` | Reporting Project dropdown depends on this data source. Already available via CLARISA sync. |
| OQ-6 | Can the existing text mining component (Dani Gomez) handle bilateral-specific result types? | Dani Gomez / Delgado | Open — coordination session pending | Determines build-vs-reuse for text mining |
| OQ-7 | How should draft results be scoped to Science Program members? What defines "member"? | Angel | Open | Draft visibility model depends on this definition |
| OQ-8 | What is the maximum PDF page count the text mining service can handle? | Dani Gomez / AI Team | Open — known risk for 300+ page documents | Server-side limit needs to be defined |
| OQ-9 | Should the voice note input use the same pipeline as Progress Tracker (Jose)? | Jose / Delgado | Open — depends on Progress Tracker migration alignment | Reuse vs. build decision for voice-to-text |
| OQ-10 | How does the Progress Tracker migration to PRMS affect the bilateral module? | Nicoletta / Jose / Joel | Open — meeting pending | May share components or data models |
| OQ-11 | What is the evidence guide content that María Julia will produce? | María Julia / Nicoletta | Open — deliverable pending | Drives AI prompt engineering |
| OQ-12 | Should the "is planned" field be completely removed from the database, or just hidden from the UI? | Angel | **Resolved** — removed from UI only. DB column kept for backward compatibility. | Migration scope |
| OQ-13 | When a draft is promoted to Editing and then submitted to Pending Review, should the evidence be locked to what was marked during draft review, or can the user add/modify evidence during Editing? | Angel / Nicoletta | **Resolved** — user CAN add/modify evidence during Editing. When new evidence is added, AI Review detects mismatches vs. existing metadata and shows a warning. User can either accept the mismatch (logged for traceability) or trigger a **re-run** of AI analysis to update metadata. | If we allow new evidence in Editing, the AI analysis may not cover the final evidence set, potentially affecting result quality. If we lock evidence, users cannot correct AI mistakes or add missing evidence. **Decision (Angel):** Allow new evidence + AI Review mismatch detection + optional re-run. |
| OQ-14 | Should users be required to explicitly confirm "these are all the evidence items for this result" before submitting to Pending Review, or is marking items as `is_formal_evidence=true` sufficient? | Nicoletta | **Resolved** — during Draft → Editing promotion, user must explicitly select which documents become formal evidence (`is_formal_evidence=true`). Only valid document files (PDF, DOCX, DOC) can be evidence; voice notes and text context are NEVER evidence (they provide AI context only). | Explicit confirmation improves data quality but adds friction. Decision (Angel): documents = potential evidence, voice/text = AI context only. |
| OQ-15 | If a user adds new evidence during Editing (after AI processing), should the system re-run AI QA on the new evidence, or only on the original AI-processed evidence? | Dani Gomez / AI Team | **Resolved** — user gets TWO options when AI Review detects a mismatch with new evidence: (1) Accept the mismatch (warning logged for traceability), or (2) Trigger a re-run of AI analysis to update metadata based on the full evidence set. Re-run is OPTIONAL and user-initiated. | Re-running AI QA ensures consistency but increases processing time and cost. Decision (Angel): "Podría ser esa opción, me gusta esa opción de hecho." — user chooses. |
| OQ-16 | What is the full inventory of MDS fields per result type? | Juan David / Angel | **Resolved** — AI should cover ALL MDS fields except ToC (which is assigned by SP later). Including: geography, evidence, contributing centers, and type-specific fields (capacity sharing participant counts, IRL, etc.). ToC is intentionally excluded — assigned by Science Program lead during review. | AI QA scope definition depends on this list. See §2.3.1 for definitive inventory — Angel confirmed: "Debería ser para todos esos campos hoy, lo que así no estaría sería teoría de cambio." |
| OQ-17 | What are the CGIAR AI policy rules regarding confidential data, PII stripping, and model selection? | Angel Jarrin | **In progress** — Angel will email Nicoleta to request existing policy. If none exists, the PRMS team will draft one aligned with Amazon Bedrock policies (data stays within AWS, no third-party exposure). | Determines whether AI can process non-public evidence, which models can be used, and what data must be stripped before model invocation. Until policy is defined, default to public evidence only. |
| OQ-18 | How should allocated percentages from the W3 Registry (`clarisa-projects.entity.ts` → `allocated`) map to the ToC contribution dropdown? Should the percentage be read-only or editable by the user? | Angel / W3 Registry team | **Resolved** — percentages are DISPLAYED to inform user choice but do not constrain selection. User can select any mapped SP as Primary regardless of percentage. Secondary SPs can also be selected from the same W3 Registry list. No rule that highest percentage = primary. Only SPs from W3 Registry are allowed. | Affects contribution form field behavior and W3 Registry sync logic. Decision (Angel): "El usuario define cuál debe ser su contribuyente primario. No hay una regla que diga que el que tenga más porcentaje, ese sería el primario." |
| OQ-19 | When should the indicator type tag warning trigger? Only on explicit ToC node selection, or also when the AI pre-fills ToC alignment? | Juan David / Angel | Open — deferred. ToC is NOT extracted by AI (assigned by SP later). Indicator type tag applies only when SP manually selects ToC nodes during review. | Affects AI draft pre-fill behavior — since ToC is out of AI scope, this question is deferred to SP review flow. |
| OQ-20 | What token tracking granularity is needed? Per request, per Science Program, per Center, or all of the above? | Angel | Open | Affects `AiReviewEvent` schema extension and cost dashboard design. |

---

## Appendix A: Current Bilateral Result Lifecycle (As-Is)

```
External system → POST /api/bilateral/create (JWT-off)
  → Result created with status_id = 5 (Pending Review), source = Bilateral
  → Science Program lead reviews via bilateral review drawer
  → Approve → status_id = 6 (Approved)
  → Reject → status_id = 7 (Rejected) + justification required
  → No email notification on reject
  → No notification to contributing programs
  
Note: Bilateral results do NOT go through Editing (1) → Submitted (3) flow.
      Exception: SGP-02 can have W3 results in Editing status.
```

## Appendix B: Proposed Bilateral Result Lifecycle (To-Be)

```
Center user → Bilateral Module → "Report New Bilateral Result"
  → Selects project + Science Program
  
  → Route A (Manual):
      → Fills form → Creates result with status_id = 1 (Editing), source = Bilateral
      → Completes MDS sections
      → Submits → status_id = 5 (Pending Review) [NOT Submitted (3)]
      → Science Program lead reviews → Approve (6) or Reject (7)
      → Email notification sent on reject (NEW)

  → Route B (AI Assisted):
      → Uploads files + voice note + text context
      → Backend uploads files to S3
      → Backend creates BilateralAiJob (PENDING) + DraftEvidence records
      → Backend publishes to RMQ queue
      → Backend returns 202 Accepted with jobId
      → Frontend polls job status
      → RMQ Consumer:
          → Calls AI service with S3 URLs (parameters only)
          → AI service downloads files from S3 and processes them
          → AI service returns identified results + extracted metadata
          → Backend creates Draft results (status_id = 8)
          → Backend links DraftEvidence to drafts
          → Backend sends notifications (email + in-app)
      → User reviews drafts in "My Draft Results"
          → Sees attached DraftEvidence items per draft
          → Marks which documents are formal evidence (is_formal_evidence=true)
          → Voice notes and text context are NEVER formal evidence
          → Can discard items or upload additional evidence
      → User clicks "Promote to Editing"
          → Backend copies DraftEvidence (is_formal_evidence=true) to ResultsByEvidences
          → Draft transitions: status_id = 8 (Draft) → 1 (Editing)
      → User completes MDS sections (AI-pre-filled fields marked)
      → AI Review (traffic light) — advisory only
      → Submits for review → status_id = 5 (Pending Review) [NOT Submitted (3)]
      → Science Program lead reviews → Approve (6) or Reject (7)
      → Email notification sent on reject (NEW)

Note: W3/Bilateral results follow Draft (8) → Editing (1) → Pending Review (5) → Approved (6)/Rejected (7)
      They do NOT go through Quality Assessed (2) or Submitted (3) which are for W1/W2 pooled results.
```

## Appendix C: Key File References

| Area | Path |
|---|---|
| Root router + domain context | `AGENTS.md` |
| Backend agent guide | `onecgiar-pr-server/AGENTS.md` |
| Source-tree patterns | `onecgiar-pr-server/src/AGENTS.md` |
| Bilateral module guide | `onecgiar-pr-server/src/api/bilateral/AGENTS.md` |
| Results module guide | `onecgiar-pr-server/src/api/results/AGENTS.md` |
| Bilateral payload contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |
| Bilateral replication guide | `docs/bilateral-module/` |
| PRD | `docs/prd.md` |
| System design | `docs/system-design/design.md` |
| Detailed design | `docs/detailed-design/detailed-design.md` |
| UX research report | `docs/prms-ux-research-report.md` |
| Result status enum | `onecgiar-pr-server/src/shared/constants/result-status.enum.ts` |
| Result type enum | `onecgiar-pr-server/src/shared/constants/result-type.enum.ts` |
| Frontend agent guide | `onecgiar-pr-client/src/AGENTS.md` |
