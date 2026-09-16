// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-3)
import { createHash } from 'node:crypto';

/**
 * Pure business rules for the bilateral QA AI traffic light feature (BIL-QAI).
 *
 * See docs/specs/bilateral/qa-ai-traffic-light/design.md §5 — paragraphs
 * "Hash", "Grey rule", "KP rule" and "Outstanding flags" — and `BIL-QAI-DD-4`
 * (grey and the KP rule are pure functions around the AI call).
 *
 * This file MUST stay pure: only `node:crypto` and local types. No Nest,
 * TypeORM, or entity imports — callers adapt their own shapes to these types.
 */

/** One of the four traffic-light colours. `grey` means "not evaluable". */
export type QualityVerdict = 'green' | 'amber' | 'red' | 'grey';

/** The five form sections every result type is assessed against. */
export type QualitySectionKey =
  | 'general_information'
  | 'contributors_and_partners'
  | 'geographic_location'
  | 'evidence'
  | 'type_specific';

export interface QualitySectionResult {
  verdict: QualityVerdict;
  score?: number | null;
  comments: string;
  strengths: string[];
  issues: string[];
}

export interface QualityEvidenceItem {
  index: number;
  verdict: QualityVerdict;
  reason: string;
}

/** The AI service's response shape (contract v0.1). */
export interface AiAssessmentResponse {
  request_id: string;
  criteria_version?: string;
  overall: {
    verdict: QualityVerdict;
    score?: number | null;
    summary: string;
  };
  sections: Record<QualitySectionKey, QualitySectionResult>;
  evidence: QualityEvidenceItem[];
}

export interface QualityPayloadEvidenceItem {
  description: string;
  link: string | null;
  source: 'url' | 'prms_repository';
  visibility: 'public' | 'private';
  tags: string[];
}

/**
 * One entry of the top-level `impact_areas` array (contract v0.2 — new; integration-
 * contracts.md → "Impact areas (`impact_areas`) — new in v0.2"). `subcomponents` is
 * deliberately plural (`BIL-QAI-T-1b` corrected an earlier singular draft).
 */
export interface QualityPayloadImpactArea {
  name: string;
  score: string;
  subcomponents: string[];
}

/** The definitions-only payload built from the persisted result (contract v0.2). */
export interface QualityPayload {
  /**
   * Echoed contract version (`docs/bilateral-module/integration-contracts.md` → "Quality
   * assessment (outbound)"). Stays inside the content hash — unlike `request_id` and
   * `constraints`, a contract bump legitimately changes what was assessed.
   */
  contract_version: string;
  request_id?: string;
  result: Record<string, unknown>;
  sections: {
    general_information: Record<string, unknown>;
    contributors_and_partners: Record<string, unknown>;
    geographic_location: Record<string, unknown>;
    evidence: QualityPayloadEvidenceItem[];
    type_specific: Record<string, unknown>;
  };
  /**
   * Sibling of `sections`, NOT a sixth section key (design.md §4.5). Optional; `[]` or absent
   * means the result tags no pillar — not applicable, never grey, no penalty. Included in the
   * content hash: re-tagging a pillar must invalidate a stored verdict (`BIL-QAI-R-2` scenario
   * "Impact areas travel as an optional block").
   */
  impact_areas?: QualityPayloadImpactArea[];
  constraints?: { timeout_seconds: number };
}

/**
 * sha256 hex of the definitions-only payload with keys sorted recursively and
 * `request_id` / `constraints` stripped (design.md §5 "Hash"). Arrays keep
 * their order — only object keys are sorted. Accepts a built `QualityPayload` directly
 * (BIL-QAI-T-4 forward pointer from the `T-3` review: the plain `Record<string, unknown>`
 * signature did not structurally accept the payload builder's typed output).
 */
export function contentHash(
  payload: QualityPayload | Record<string, unknown>,
): string {
  const rest: Record<string, unknown> = { ...payload };
  delete rest.request_id;
  delete rest.constraints;
  const canonical = sortKeysDeep(rest);
  const json = JSON.stringify(canonical);
  return createHash('sha256').update(json).digest('hex');
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep(record[key]);
        return acc;
      }, {});
  }
  return value;
}

const PRIVATE_EVIDENCE_REASON = 'Private repository file — not evaluated';

/**
 * Forces `grey` on every evidence item the payload marks `visibility: private`
 * or `link: null` (design.md §5 "Grey rule"; BIL-QAI-R-3, R-4). Keeps the AI's
 * own reason when it already graded the item grey. Never touches `sections`
 * or `overall` — grey never derives or alters a section colour (BIL-QAI-R-4
 * "Grey never colours a section"). Returns a new object; the inputs are not
 * mutated.
 */
export function applyGreyRule(
  response: AiAssessmentResponse,
  payload: QualityPayload,
): AiAssessmentResponse {
  const payloadEvidence = payload.sections.evidence;

  const evidence = response.evidence.map((item, i) => {
    const payloadItem = payloadEvidence[i];
    const isForcedGrey =
      !!payloadItem &&
      (payloadItem.visibility === 'private' || payloadItem.link === null);

    if (!isForcedGrey) {
      return { ...item };
    }

    if (item.verdict === 'grey') {
      // The AI already blocked it grey — keep its own reason.
      return { ...item };
    }

    return {
      ...item,
      verdict: 'grey' as QualityVerdict,
      reason: PRIVATE_EVIDENCE_REASON,
    };
  });

  return {
    ...response,
    sections: cloneSections(response.sections),
    evidence,
  };
}

function cloneSections(
  sections: Record<QualitySectionKey, QualitySectionResult>,
): Record<QualitySectionKey, QualitySectionResult> {
  const cloned = {} as Record<QualitySectionKey, QualitySectionResult>;
  for (const key of Object.keys(sections) as QualitySectionKey[]) {
    const section = sections[key];
    cloned[key] = {
      ...section,
      strengths: [...section.strengths],
      issues: [...section.issues],
    };
  }
  return cloned;
}

/** One KP metadata row, named after `ResultsKnowledgeProductMetadata` (`source`, `is_isi`, `accesibility` [sic], `year`, `is_peer_reviewed`). */
export interface KpMetadataRow {
  year: number | null;
  is_isi: boolean | null;
  is_peer_reviewed: boolean | null;
  accesibility: string | null;
}

/**
 * Input for the KP decision tree (design.md §5 "KP rule").
 *
 * `evidence_count` is the simplest shape that lets the rule list the KP's
 * evidence items as grey "not assessed for knowledge products" without
 * needing the evidence content itself (the KP rule never evaluates evidence
 * content — it only needs to know how many items to list).
 */
export interface KpRuleInput {
  is_melia: boolean;
  knowledge_product_type: string;
  cgspace: KpMetadataRow | null;
  wos: KpMetadataRow | null;
  evidence_count?: number;
}

export type KpRuleStatus = 'skipped_kp_rule';

export interface KpRuleOutcome {
  status: KpRuleStatus;
  overall: { verdict: QualityVerdict; summary: string };
  sections: Record<QualitySectionKey, QualitySectionResult>;
  evidence: QualityEvidenceItem[];
}

const JOURNAL_ARTICLE_TYPE = 'Journal Article';

const SECTION_KEYS: QualitySectionKey[] = [
  'general_information',
  'contributors_and_partners',
  'geographic_location',
  'evidence',
  'type_specific',
];

const KP_EVIDENCE_REASON = 'Not assessed for knowledge products';

/**
 * Deterministic decision tree for Knowledge Products (design.md §5 "KP rule";
 * BIL-QAI-R-9). No AI call — evaluated in code. Branches, in order:
 *
 * 1. Not MELIA and not a Journal Article -> `green`, auto-validated.
 * 2. Journal Article whose CGSpace/WoS rows both exist and agree on `year`,
 *    `is_isi` (both true), `is_peer_reviewed` (both true) and `accesibility`
 *    -> `green`, rationale lists the four matched fields.
 * 3. Otherwise (MELIA products that fall outside branch 1, or a Journal
 *    Article whose rows disagree or are missing) -> `grey`, "criteria
 *    pending confirmation" naming the missing row or mismatching fields.
 */
export function evaluateKpRule(input: KpRuleInput): KpRuleOutcome {
  const { verdict, summary } = decideKp(input);

  const sections = {} as Record<QualitySectionKey, QualitySectionResult>;
  for (const key of SECTION_KEYS) {
    sections[key] = {
      verdict,
      comments: summary,
      strengths: [],
      issues: [],
    };
  }

  const evidenceCount = input.evidence_count ?? 0;
  const evidence: QualityEvidenceItem[] = Array.from(
    { length: evidenceCount },
    (_, index) => ({
      index,
      verdict: 'grey' as QualityVerdict,
      reason: KP_EVIDENCE_REASON,
    }),
  );

  return {
    status: 'skipped_kp_rule',
    overall: { verdict, summary },
    sections,
    evidence,
  };
}

function decideKp(input: KpRuleInput): {
  verdict: QualityVerdict;
  summary: string;
} {
  const isJournalArticle =
    input.knowledge_product_type === JOURNAL_ARTICLE_TYPE;

  if (!input.is_melia && !isJournalArticle) {
    return {
      verdict: 'green',
      summary:
        'Auto-validated: repository product that is neither MELIA nor a journal article.',
    };
  }

  if (isJournalArticle) {
    const { cgspace, wos } = input;

    if (cgspace && wos) {
      const mismatches = matchingFieldMismatches(cgspace, wos);
      if (mismatches.length === 0) {
        return {
          verdict: 'green',
          summary:
            'Journal Article auto-validated: year, is_isi, is_peer_reviewed and accesibility match between CGSpace and WoS metadata.',
        };
      }
      return {
        verdict: 'grey',
        summary: `Criteria pending confirmation: ${mismatches.join(', ')} do not match between CGSpace and WoS metadata.`,
      };
    }

    if (!cgspace && !wos) {
      return {
        verdict: 'grey',
        summary:
          'Criteria pending confirmation: missing CGSpace and WoS metadata rows.',
      };
    }

    const missingSource = !cgspace ? 'CGSpace' : 'WoS';
    return {
      verdict: 'grey',
      summary: `Criteria pending confirmation: missing ${missingSource} metadata row.`,
    };
  }

  // MELIA product that is not a Journal Article.
  return {
    verdict: 'grey',
    summary:
      'Criteria pending confirmation: MELIA products require manual confirmation of the KP criteria.',
  };
}

function matchingFieldMismatches(
  cgspace: KpMetadataRow,
  wos: KpMetadataRow,
): string[] {
  const mismatches: string[] = [];
  if (cgspace.year !== wos.year) {
    mismatches.push('year');
  }
  if (!(cgspace.is_isi === true && wos.is_isi === true)) {
    mismatches.push('is_isi');
  }
  if (!(cgspace.is_peer_reviewed === true && wos.is_peer_reviewed === true)) {
    mismatches.push('is_peer_reviewed');
  }
  if (cgspace.accesibility !== wos.accesibility) {
    mismatches.push('accesibility');
  }
  return mismatches;
}

/** The stored-row shape `hasOutstandingFlags` reads (design.md §5 "Outstanding flags"). */
export interface StoredAssessmentRow {
  overall_verdict?: QualityVerdict | null;
  sections?: Record<string, { verdict?: QualityVerdict | null } | null> | null;
}

const FLAGGED_VERDICTS: QualityVerdict[] = ['amber', 'red'];

/**
 * `had_outstanding_flags` (design.md §5 "Outstanding flags"; BIL-QAI-R-8):
 * true when the overall verdict, or any section verdict, is amber or red.
 * Grey and green never count. Tolerates a null/empty `sections`.
 */
export function hasOutstandingFlags(row: StoredAssessmentRow): boolean {
  if (row.overall_verdict && FLAGGED_VERDICTS.includes(row.overall_verdict)) {
    return true;
  }

  const sections = row.sections;
  if (!sections) {
    return false;
  }

  return Object.values(sections).some(
    (section) =>
      !!section &&
      !!section.verdict &&
      FLAGGED_VERDICTS.includes(section.verdict),
  );
}
