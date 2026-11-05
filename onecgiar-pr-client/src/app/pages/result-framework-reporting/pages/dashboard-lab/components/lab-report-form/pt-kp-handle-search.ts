import { normalizeKpHandle, validateKpHandle } from '../../../../shared/report-result/kp-handle.validator';
import { PtProposalDto } from './components/pt-results-browse/pt-results-browse.component';
import { canonicalResultType } from '../../pt-typology';

/**
 * INC-167646 — propose a CGSpace handle for a knowledge product that has evidence and no valid
 * repository handle. The search is by title. A DOI is never rewritten into a handle, and a hit is
 * not treated as valid until its title matches and `validateKpHandle` accepts the link.
 *
 * Confidence below {@link PT_KP_SEARCH_MIN_CONFIDENCE}, a missing confidence, a missing title, or
 * no cited evidence does not search. The staging fixture carries `confidence` (0..1), `title`,
 * and `evidence[]`; it does not carry a separate match score.
 */
export const PT_KP_SEARCH_MIN_CONFIDENCE = 0.6;

export type PtKpSearchSkipReason =
  | 'not_knowledge_product'
  | 'valid_handle_present'
  | 'no_title'
  | 'no_evidence'
  | 'confidence_missing'
  | 'confidence_low';

export type PtKpSearchPlan =
  | { action: 'search'; query: string }
  | { action: 'skip'; reason: PtKpSearchSkipReason; tellUser: boolean };

export interface PtCgspaceCandidate {
  handle: string;
  title: string;
}

export type PtCgspacePick =
  | { status: 'one'; candidate: PtCgspaceCandidate }
  | { status: 'none' }
  | { status: 'ambiguous' };

const MIN_QUERY = 3;
const MAX_QUERY = 200;

/** Lower case, strip diacritics and punctuation, collapse spaces. Exact equality is the match. */
export function normalizeKpSearchTitle(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function citesEvidence(proposal: PtProposalDto): boolean {
  const named = (proposal.evidence ?? []).some(item => typeof item?.name === 'string' && item.name.trim().length > 0);
  return named || (proposal.evidence_links ?? []).length > 0;
}

/**
 * Whether this pick may call CGSpace. `formIsKnowledgeProduct` is the category that will be
 * created (the indicator can fix it). A valid handle already in the field is left alone.
 */
export function ptKpHandleSearchPlan(proposal: PtProposalDto | null | undefined, formIsKnowledgeProduct: boolean): PtKpSearchPlan {
  const proposalIsKp =
    !!proposal &&
    (canonicalResultType(proposal.result_type) === 'knowledge_product' || canonicalResultType(proposal.result_type_label) === 'knowledge_product');
  if (!formIsKnowledgeProduct && !proposalIsKp) return { action: 'skip', reason: 'not_knowledge_product', tellUser: false };
  if (!formIsKnowledgeProduct) return { action: 'skip', reason: 'not_knowledge_product', tellUser: false };
  if (!proposal) return { action: 'skip', reason: 'not_knowledge_product', tellUser: false };

  const rawHandle = typeof proposal.knowledge_product_handle === 'string' ? proposal.knowledge_product_handle.trim() : '';
  if (rawHandle && !validateKpHandle(rawHandle).status) return { action: 'skip', reason: 'valid_handle_present', tellUser: false };

  const query = (proposal.title ?? '').trim().slice(0, MAX_QUERY);
  if (normalizeKpSearchTitle(query).length < MIN_QUERY) return { action: 'skip', reason: 'no_title', tellUser: true };
  if (!citesEvidence(proposal)) return { action: 'skip', reason: 'no_evidence', tellUser: true };
  if (typeof proposal.confidence !== 'number' || !Number.isFinite(proposal.confidence)) {
    return { action: 'skip', reason: 'confidence_missing', tellUser: true };
  }
  if (proposal.confidence < PT_KP_SEARCH_MIN_CONFIDENCE) return { action: 'skip', reason: 'confidence_low', tellUser: true };
  return { action: 'search', query };
}

function cgspaceLink(item: Record<string, unknown>): string {
  const repository = typeof item['repository'] === 'string' ? item['repository'] : '';
  const itemUrl = typeof item['itemUrl'] === 'string' ? item['itemUrl'] : '';
  const handleUrl = typeof item['handleUrl'] === 'string' ? item['handleUrl'] : '';
  const handle = typeof item['handle'] === 'string' ? item['handle'] : '';
  const link = itemUrl || handleUrl || handle;
  if (!link || validateKpHandle(link).status) return '';
  const looksCgspace =
    repository === 'cgspace' ||
    repository === '' ||
    /cgspace\.cgiar\.org/i.test(link) ||
    /^10568\/\d+$/.test(link) ||
    /hdl\.handle\.net\/10568\//i.test(link);
  if (!looksCgspace) return '';
  if (repository && repository !== 'cgspace') return '';
  return normalizeKpHandle(link);
}

/**
 * One CGSpace item whose normalised title equals the query and whose link already passes
 * `validateKpHandle`. Two different handles, or none, select nothing. DOI fields are ignored.
 */
export function pickVerifiedCgspaceCandidate(queryTitle: string, items: unknown): PtCgspacePick {
  const wanted = normalizeKpSearchTitle(queryTitle);
  if (wanted.length < MIN_QUERY || !Array.isArray(items)) return { status: 'none' };
  const matches = new Map<string, PtCgspaceCandidate>();
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const title = typeof item['title'] === 'string' ? item['title'] : '';
    if (normalizeKpSearchTitle(title) !== wanted) continue;
    const handle = cgspaceLink(item);
    if (!handle) continue;
    if (!matches.has(handle)) matches.set(handle, { handle, title: title.trim() });
  }
  if (matches.size === 1) return { status: 'one', candidate: [...matches.values()][0] };
  if (matches.size === 0) return { status: 'none' };
  return { status: 'ambiguous' };
}
