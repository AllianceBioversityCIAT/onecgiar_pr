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
  /**
   * The form fields the AI's issues point at, in the AI service's own naming
   * (`description`, `title`, `scope`, `countries`, …). Appeared in the wire response on
   * 2026-09-18 without a contract bump; declared here so it is stored deliberately instead of
   * surviving by accident through the object spreads in `cloneSections` / `sanitizeScores`.
   *
   * PRMS only **persists** it today. Mapping these names onto bilateral form fields — the
   * per-field traffic light and the deep links QA asked for — is a separate piece of work, and
   * needs the naming agreed with the AI side first: an unmapped name is a silent no-op.
   */
  fields?: string[];
  /**
   * Optional AI-suggested full-replacement title/description for `general_information` only
   * (contract v0.2, additive; `BIL-QTS-R-7`, `BIL-QTS-DD-1`). Present only after
   * {@link normalizeSuggestions} keeps at least one of `title`/`description` — never stored or
   * served as `{}` (`BIL-QTS-DD-2`, design.md §5 step 7).
   */
  suggestions?: QualitySuggestions;
}

/**
 * `sections.general_information.suggestions` (contract v0.2, additive, optional;
 * `docs/bilateral-module/integration-contracts.md` → "Suggestions" table; `BIL-QTS-R-7`).
 * Both keys optional and independently droppable — a normalizer keeping only `title` (or only
 * `description`) is expected, not an error.
 */
export interface QualitySuggestions {
  title?: string;
  description?: string;
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
  /**
   * Partial on purpose: a result type with no type-specific section (Other output, Other
   * outcome) has nothing to judge there, so the AI omits the key rather than inventing a
   * verdict for a section the editor does not even render. Every other key is always present.
   */
  sections: Partial<Record<QualitySectionKey, QualitySectionResult>>;
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
 * Reason for a grey entry appended when the AI's response omits a payload evidence item
 * entirely (amended at execution gate 1, 2026-09-16 — `BIL-QAI-T-6`; design.md §5 "Grey
 * rule"). No literal for this exact case exists in the contract or requirements — this text
 * is authored for this task, not copied from a spec source, and is flagged as such in the
 * Implementer report's self-check table.
 */
const OMITTED_EVIDENCE_REASON = 'Not returned by the AI — not evaluated';

function isPrivateEvidence(
  item: QualityPayloadEvidenceItem | undefined,
): boolean {
  return !!item && (item.visibility === 'private' || item.link === null);
}

/**
 * Forces `grey` on every evidence item the payload marks `visibility: private`
 * or `link: null` (design.md §5 "Grey rule"; BIL-QAI-R-3, R-4). Keeps the AI's
 * own reason when it already graded the item grey. Never touches `sections`
 * or `overall` — grey never derives or alters a section colour (BIL-QAI-R-4
 * "Grey never colours a section"). Returns a new object; the inputs are not
 * mutated.
 *
 * **Amended 2026-09-16 at execution gate 1 (owner approval; applied in `BIL-QAI-T-6`,
 * superseding the literal `evidence[i]` version `T-3` shipped):** matching is by the response
 * item's own `index` field — the contract's join key — never by array position, and a payload
 * evidence item the AI's response omits entirely gets a grey entry appended rather than being
 * silently dropped. A response entry whose `index` matches no payload item (or is not an
 * in-range integer) is itself dropped — the AI cannot invent an evidence item PRMS never sent.
 */
export function applyGreyRule(
  response: AiAssessmentResponse,
  payload: QualityPayload,
): AiAssessmentResponse {
  const payloadEvidence = payload.sections.evidence;
  const seenPayloadIndexes = new Set<number>();

  const kept: QualityEvidenceItem[] = [];
  for (const item of response.evidence) {
    const index = item.index;
    const inRange =
      Number.isInteger(index) && index >= 0 && index < payloadEvidence.length;
    if (!inRange) {
      // The response named an evidence item PRMS never sent — drop it rather than storing an
      // index that cannot be resolved back to a payload item.
      continue;
    }

    const payloadItem = payloadEvidence[index];
    seenPayloadIndexes.add(index);

    const isForcedGrey = isPrivateEvidence(payloadItem);
    if (!isForcedGrey || item.verdict === 'grey') {
      // Either nothing forces grey, or the AI already blocked it grey — keep its own reason.
      kept.push({ ...item });
      continue;
    }

    kept.push({
      ...item,
      verdict: 'grey' as QualityVerdict,
      reason: PRIVATE_EVIDENCE_REASON,
    });
  }

  const appended: QualityEvidenceItem[] = [];
  payloadEvidence.forEach((payloadItem, index) => {
    if (seenPayloadIndexes.has(index)) {
      return;
    }
    appended.push({
      index,
      verdict: 'grey',
      reason: isPrivateEvidence(payloadItem)
        ? PRIVATE_EVIDENCE_REASON
        : OMITTED_EVIDENCE_REASON,
    });
  });

  return {
    ...response,
    sections: cloneSections(response.sections),
    evidence: [...kept, ...appended],
  };
}

function cloneSections(
  sections: Partial<Record<QualitySectionKey, QualitySectionResult>>,
): Partial<Record<QualitySectionKey, QualitySectionResult>> {
  const cloned: Partial<Record<QualitySectionKey, QualitySectionResult>> = {};
  for (const key of Object.keys(sections) as QualitySectionKey[]) {
    const section = sections[key];
    if (!section) continue;
    cloned[key] = {
      ...section,
      strengths: [...section.strengths],
      issues: [...section.issues],
      ...(section.fields ? { fields: [...section.fields] } : {}),
    };
  }
  return cloned;
}

/** GI verdicts eligible for a suggestion (design.md §5 step 2; `BIL-QTS-R-8` row "Verdict"). */
const SUGGESTION_VERDICTS: ReadonlyArray<QualityVerdict> = ['amber', 'red'];

/** Word limits per suggested key (`BIL-QTS-R-7`/`R-8`: 30 for `title`, 300 for `description`). */
const SUGGESTION_WORD_LIMITS = {
  title: 30,
  description: 300,
} as const;

type SuggestionField = keyof typeof SUGGESTION_WORD_LIMITS;

function isPlainSuggestionsObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Bit-for-bit reimplementation of the client's word counter (P-10;
 * `onecgiar-pr-client/src/app/shared/services/word-counter.service.ts:9-20`, used by
 * `pr-input`/`pr-textarea`), so the server's 30/300 suggestion limits (`BIL-QTS-R-8` "Limit")
 * never disagree with the form's own counter on a borderline text. Splits on a **literal
 * single space**, never a whitespace regex — that is what makes `"a\nb c"` count as 2 tokens
 * (`"a\nb"`, `"c"`) instead of the 3 a naive `/\s+/` split would produce.
 */
export function countWordsLikeClient(text: string): number {
  if (!text) {
    return 0;
  }
  const textReplaced = text
    .replace(/(<(\/?p)>)|(&nbsp;)/gi, ' ')
    .replace(/(<([^>]+)>)/gi, '');
  const splitWords = textReplaced.split(' ');
  if (!splitWords.length) {
    return 0;
  }
  let wordCount = 0;
  for (const item of splitWords) {
    if (item === '' || item === '\n' || item === '\t') {
      continue;
    }
    wordCount++;
  }
  return wordCount;
}

/**
 * Eligibility check for one suggested key (`title` or `description`): a string, non-empty
 * after trimming, within its word limit, and — only when `sentValue` is given (the write path,
 * `sent` passed by `sanitizeScores`) — not identical to the value PRMS sent in the outbound
 * payload after trimming both sides (`BIL-QTS-R-8` rows "Type", "Content", "Limit", "Novelty").
 * The read path (`BilateralQualityAssessmentService.toDto`) omits `sentValue`, so a stored
 * suggestion is never dropped for novelty against a value nobody sent this time (design.md
 * §2.2 "Read").
 */
function normalizeSuggestionField(
  field: SuggestionField,
  raw: unknown,
  sentValue?: string | null,
): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  if (countWordsLikeClient(trimmed) > SUGGESTION_WORD_LIMITS[field]) {
    return undefined;
  }
  if (
    sentValue !== undefined &&
    sentValue !== null &&
    trimmed === sentValue.trim()
  ) {
    return undefined;
  }
  return trimmed;
}

/**
 * Pure normalizer for `sections.general_information.suggestions` (design.md §5 steps 1-7;
 * `BIL-QTS-R-6`, `R-8`, `R-9`). Runs on both write (`BilateralQualityAssessmentClient
 * .sanitizeScores`, with `sent`) and read (`BilateralQualityAssessmentService.toDto`, without
 * `sent`), so a stored row can never serve an unsanitized suggestion regardless of who or what
 * wrote it (`BIL-QTS-DD-2`).
 *
 * Called only for the `general_information` slot — the "any other section" drop rule
 * (`BIL-QTS-R-8` "Section") is enforced by the caller, which never invokes this function for
 * any other section key: the allow-list rebuild in `sanitizeScores` only adds `suggestions` to
 * GI's own rebuilt object, and the read-side pass in `toDto` only touches
 * `sections.general_information`.
 *
 * Never throws, never truncates a kept string (`BIL-QTS-R-8` "IT MUST store the kept text
 * trimmed and otherwise verbatim, and never truncate it"), and never logs suggestion text —
 * counting what this function drops, for the caller's log line, is the caller's job.
 */
export function normalizeSuggestions(
  raw: unknown,
  verdict: QualityVerdict,
  sent?: { title?: string | null; description?: string | null },
): QualitySuggestions | undefined {
  if (!SUGGESTION_VERDICTS.includes(verdict)) {
    return undefined;
  }
  if (!isPlainSuggestionsObject(raw)) {
    return undefined;
  }

  const title = normalizeSuggestionField('title', raw.title, sent?.title);
  const description = normalizeSuggestionField(
    'description',
    raw.description,
    sent?.description,
  );

  if (title === undefined && description === undefined) {
    return undefined;
  }

  const suggestions: QualitySuggestions = {};
  if (title !== undefined) {
    suggestions.title = title;
  }
  if (description !== undefined) {
    suggestions.description = description;
  }
  return suggestions;
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
  /**
   * Partial: a result type with no type-specific section has no `type_specific` verdict, so the key
   * is simply absent. Readers iterate what is there instead of indexing the five.
   */
  sections: Partial<Record<QualitySectionKey, QualitySectionResult>>;
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
