import { PtProposalDto } from './components/pt-results-browse/pt-results-browse.component';
import {
  PT_EVIDENCE_LINKS_MAX,
  buildPtPendingChecklist,
  buildPtPrefillBlock,
  escapePtHtml,
  ptContributionToApply,
  ptEvidenceLinksToSave,
  ptFieldPolicy,
  ptMatchedPartners,
  ptPendingChecklistHtml,
  resolvePtCenters
} from './pt-prefill.util';

// PTB-R-18a (2026-10-19) — Progress Tracker prefill, Phase 1 + matched partners.
const base: PtProposalDto = {
  result_key: 'k:1',
  result_type: 'other_output',
  result_type_label: 'Other output',
  title: 'T',
  description: 'D',
  evidence: [],
  countries: [],
  impact_areas: null,
  gender_split: null,
  knowledge_product_handle: null,
  confidence: null,
  rationale: '',
  missing_info: [],
  geo: null,
  partners: [],
  impact_area_details: [],
  evidence_links: []
};
const p = (overrides: Partial<PtProposalDto> = {}): PtProposalDto => ({ ...base, ...overrides });
const partner = (overrides: Partial<PtProposalDto['partners'][number]> = {}) => ({
  name: 'Org',
  acronym: null,
  role: null,
  match_status: 'matched',
  is_cgiar_center: false,
  clarisa_id: 10,
  clarisa_candidates: [],
  ...overrides
});

const catalogue = [
  { code: 'C-1', acronym: 'ABC', name: 'Alliance of Bioversity and CIAT' },
  { code: 'C-2', acronym: 'CIP', name: 'International Potato Center' }
];

describe('pt-prefill.util', () => {
  it('ptFieldPolicy reads the first single-value key and ignores nested maps', () => {
    expect(ptFieldPolicy(p())).toBeNull();
    expect(ptFieldPolicy(p({ policy: { impact_areas: { gender: 'apply' } } }), 'impact_areas')).toBeNull();
    expect(ptFieldPolicy(p({ policy: { contribution_value: 'suggest' } }), 'contribution', 'contribution_value')).toBe('suggest');
  });

  it('ptContributionToApply: numeric only, blocked by suggest/none', () => {
    expect(ptContributionToApply(p({ contribution_value: 4 }))).toBe(4);
    expect(ptContributionToApply(p({ contribution_value: null }))).toBeNull();
    expect(ptContributionToApply(p({ contribution_value: 4, policy: { contribution: 'suggest' } }))).toBeNull();
    expect(ptContributionToApply(p({ contribution_value: 4, policy: { contribution: 'apply' } }))).toBe(4);
  });

  it('ptEvidenceLinksToSave keeps http(s), dedupes and caps', () => {
    const links = [
      { url: 'javascript:alert(1)', title: 'x', kind: null },
      { url: 'https://a.org/x', title: '', kind: null },
      { url: 'https://A.org/x/', title: 'dup', kind: null },
      ...Array.from({ length: 10 }, (_, i) => ({ url: `http://b.org/${i}`, title: `b${i}`, kind: null }))
    ];
    const saved = ptEvidenceLinksToSave(p({ evidence_links: links }));
    expect(saved[0]).toEqual({ url: 'https://a.org/x', title: 'https://a.org/x' });
    expect(saved).toHaveLength(PT_EVIDENCE_LINKS_MAX);
    expect(saved.some(l => l.url.startsWith('javascript'))).toBe(false);
    expect(ptEvidenceLinksToSave(p({ evidence_links: links, policy: { evidence_links: 'suggest' } }))).toEqual([]);
  });

  it('ptMatchedPartners: matched + clarisa_id + not a center, deduped; policy none stops them', () => {
    const partners = [
      partner({ clarisa_id: 10 }),
      partner({ clarisa_id: 10, name: 'dup' }),
      partner({ clarisa_id: 11, match_status: 'ambiguous' }),
      partner({ clarisa_id: null }),
      partner({ clarisa_id: 12, is_cgiar_center: true })
    ];
    expect(ptMatchedPartners(p({ partners }))).toEqual([{ clarisa_id: 10, name: 'Org' }]);
    expect(ptMatchedPartners(p({ partners, policy: { partners: 'suggest' } }))).toHaveLength(1);
    expect(ptMatchedPartners(p({ partners, policy: { partners: 'none' } }))).toEqual([]);
  });

  it('buildPtPrefillBlock is null when there is nothing to send', () => {
    expect(buildPtPrefillBlock(p())).toBeNull();
    expect(buildPtPrefillBlock(p({ partners: [partner()] }))).toEqual({ evidence_links: [], partners: [{ clarisa_id: 10, name: 'Org' }] });
  });

  it('resolvePtCenters maps code / acronym / name, dedupes, reports the unmatched', () => {
    const result = resolvePtCenters(
      p({
        lead_center: { name: 'ABC', acronym: null, code: null },
        contributing_centers: [
          { name: null, acronym: null, code: 'C-1' },
          { name: 'International Potato Center', acronym: null, code: null },
          { name: 'Nowhere Center', acronym: null, code: null }
        ],
        partners: [partner({ name: 'CIP', acronym: 'CIP', is_cgiar_center: true })]
      }),
      catalogue
    );
    expect(result.matched.map(c => c.code)).toEqual(['C-1', 'C-2']);
    expect(result.unmatched).toEqual(['Nowhere Center']);
    expect(
      resolvePtCenters(p({ lead_center: { name: 'ABC', acronym: null, code: null }, policy: { centers: 'suggest' } }), catalogue).matched
    ).toEqual([]);
  });

  it('buildPtPendingChecklist lists what was not applied', () => {
    const items = buildPtPendingChecklist(
      p({
        to_complete_in_prms: ['Readiness level'],
        partners: [
          partner({ match_status: 'unmatched', clarisa_id: null, name: 'Far Org', clarisa_candidates: [{ clarisa_id: 5, name: 'Far Org Ltd' }] }),
          partner()
        ],
        geo: {
          level: 'national',
          countries: [{ name: 'Kenya', iso_alpha_2: 'KE', clarisa_id: 1, match_status: 'matched' }],
          regions: [],
          subnational_areas: null
        },
        impact_area_details: [{ key: 'climate', label: 'Climate', score: 1, justification: '' }],
        led_by_external_partner: true
      }),
      catalogue
    );
    const labels = items.map(i => i.label);
    expect(labels).toEqual(['Readiness level', 'Partner: Far Org', 'Lead partner', 'Geographic location', 'Impact area scores']);
    expect(items[1].detail).toContain('Far Org Ltd (CLARISA 5)');
    expect(labels).not.toContain('Partner: Org');
  });

  it('escapes every PT string in the alert HTML', () => {
    expect(escapePtHtml('<img onerror="x">')).toBe('&lt;img onerror=&quot;x&quot;&gt;');
    expect(ptPendingChecklistHtml([{ label: '<b>', detail: '&' }])).toContain('<strong>&lt;b&gt;</strong> — &amp;');
  });
});
