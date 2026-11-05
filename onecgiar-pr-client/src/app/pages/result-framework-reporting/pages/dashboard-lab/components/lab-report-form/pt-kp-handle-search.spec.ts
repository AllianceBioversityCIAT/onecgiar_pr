import { pickVerifiedCgspaceCandidate, ptKpHandleSearchPlan, PT_KP_SEARCH_MIN_CONFIDENCE } from './pt-kp-handle-search';
import { PtProposalDto } from './components/pt-results-browse/pt-results-browse.component';

const proposal = (overrides: Partial<PtProposalDto> = {}): PtProposalDto =>
  ({
    result_key: 'k:1',
    result_type: 'knowledge_product',
    result_type_label: 'Knowledge product',
    title: 'Conflict sensitivity repository framework',
    description: 'D',
    evidence: [{ name: 'Centre note', url: null }],
    countries: [],
    impact_areas: null,
    gender_split: null,
    knowledge_product_handle: null,
    confidence: 0.9,
    rationale: '',
    missing_info: [],
    geo: null,
    partners: [],
    impact_area_details: [],
    evidence_links: [],
    ...overrides
  }) as PtProposalDto;

const item = (overrides: Record<string, unknown> = {}) => ({
  repository: 'cgspace',
  title: 'Conflict sensitivity repository framework',
  handle: '10568/182598',
  handleUrl: 'https://hdl.handle.net/10568/182598',
  itemUrl: 'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3',
  doi: '10.1234/not-a-handle',
  ...overrides
});

describe('ptKpHandleSearchPlan', () => {
  it('searches a knowledge product with evidence, a title, and confidence at or above the floor', () => {
    expect(ptKpHandleSearchPlan(proposal(), true)).toEqual({
      action: 'search',
      query: 'Conflict sensitivity repository framework'
    });
    expect(ptKpHandleSearchPlan(proposal({ confidence: PT_KP_SEARCH_MIN_CONFIDENCE }), true).action).toBe('search');
  });

  it('does not search when the contract is short of a type, a title, evidence, or confidence', () => {
    expect(ptKpHandleSearchPlan(proposal({ result_type: 'innovation_development', result_type_label: 'Innovation development' }), false).reason).toBe(
      'not_knowledge_product'
    );
    expect(ptKpHandleSearchPlan(proposal({ title: 'ab' }), true)).toMatchObject({ action: 'skip', reason: 'no_title', tellUser: true });
    expect(ptKpHandleSearchPlan(proposal({ evidence: [], evidence_links: [] }), true)).toMatchObject({ reason: 'no_evidence', tellUser: true });
    expect(ptKpHandleSearchPlan(proposal({ confidence: null }), true)).toMatchObject({ reason: 'confidence_missing', tellUser: true });
    expect(ptKpHandleSearchPlan(proposal({ confidence: 0.59 }), true)).toMatchObject({ reason: 'confidence_low', tellUser: true });
    expect(ptKpHandleSearchPlan(proposal({ knowledge_product_handle: '10568/1' }), true)).toMatchObject({
      reason: 'valid_handle_present',
      tellUser: false
    });
  });

  it('does not search from a DOI, and does not search a non-KP form even if the proposal says knowledge product', () => {
    expect(ptKpHandleSearchPlan(proposal({ knowledge_product_handle: 'https://doi.org/10.1234/example' }), true).action).toBe('search');
    expect(ptKpHandleSearchPlan(proposal(), false)).toMatchObject({ reason: 'not_knowledge_product', tellUser: false });
  });
});

describe('pickVerifiedCgspaceCandidate', () => {
  it('returns the one CGSpace item whose title matches and whose link is a repository handle', () => {
    const pick = pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework.', [item()]);
    expect(pick.status).toBe('one');
    if (pick.status === 'one') {
      expect(pick.candidate.handle).toBe('https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3');
      expect(pick.candidate.handle).not.toContain('10.1234');
    }
  });

  it('returns none for an empty page, a title mismatch, a DOI-only link, a timeout-shaped non-array, or another repository', () => {
    expect(pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [])).toEqual({ status: 'none' });
    expect(pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [item({ title: 'A different paper' })])).toEqual({
      status: 'none'
    });
    expect(
      pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [
        item({ itemUrl: 'https://doi.org/10.1234/example', handleUrl: '', handle: '', repository: 'cgspace' })
      ])
    ).toEqual({ status: 'none' });
    expect(pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', null)).toEqual({ status: 'none' });
    expect(
      pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [
        item({ repository: 'melspace', itemUrl: 'https://repo.mel.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3' })
      ])
    ).toEqual({ status: 'none' });
  });

  it('returns ambiguous when two different handles share the title, and one when they are the same handle', () => {
    const ambiguous = pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [
      item(),
      item({
        itemUrl: 'https://cgspace.cgiar.org/items/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        handle: '10568/2',
        handleUrl: 'https://hdl.handle.net/10568/2'
      })
    ]);
    expect(ambiguous).toEqual({ status: 'ambiguous' });

    const same = pickVerifiedCgspaceCandidate('Conflict sensitivity repository framework', [item(), item()]);
    expect(same.status).toBe('one');
  });
});
