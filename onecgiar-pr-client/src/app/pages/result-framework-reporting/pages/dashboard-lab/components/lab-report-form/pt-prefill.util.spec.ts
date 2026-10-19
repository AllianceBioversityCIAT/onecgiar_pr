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
  ptGeoLevel,
  ptGeographyPlan,
  ptImpactAreaPlan,
  ptImpactAreaPolicy,
  ptPendingChecklistHtml,
  ptPrefillOutcomeItems,
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
    // PTB-R-18b: the matched national geography and the applied climate score are no longer pending.
    expect(labels).toEqual(['Readiness level', 'Partner: Far Org', 'Lead partner']);
    expect(items[1].detail).toContain('Far Org Ltd (CLARISA 5)');
    expect(labels).not.toContain('Partner: Org');
  });

  it('escapes every PT string in the alert HTML', () => {
    expect(escapePtHtml('<img onerror="x">')).toBe('&lt;img onerror=&quot;x&quot;&gt;');
    expect(ptPendingChecklistHtml([{ label: '<b>', detail: '&' }])).toContain('<strong>&lt;b&gt;</strong> — &amp;');
  });
});

// PTB-R-18b (2026-10-19) — geography + impact-area scores mapped to PRMS.
describe('pt-prefill.util — geography (PTB-R-18b)', () => {
  const mali = { name: 'Mali', iso_alpha_2: 'ML', clarisa_id: 466, match_status: 'matched' };
  const moz = { name: 'Mozambique', iso_alpha_2: 'MZ', clarisa_id: 508, match_status: 'matched' };
  const atlantis = { name: 'Atlantis', iso_alpha_2: 'AQ', clarisa_id: 999, match_status: 'unmatched' };
  const geo = (overrides: Partial<NonNullable<PtProposalDto['geo']>> = {}): NonNullable<PtProposalDto['geo']> => ({
    level: 'multinational',
    countries: [mali, moz],
    regions: [],
    subnational_areas: null,
    provenance: ['evidence'],
    ...overrides
  });
  const plan = (g: Partial<NonNullable<PtProposalDto['geo']>>, policy?: Record<string, unknown>) =>
    ptGeographyPlan(p({ geo: geo(g), ...(policy ? { policy } : {}) }));
  const labels = (items: { label: string }[]) => items.map(i => i.label);

  it('normalizes the PT level names', () => {
    expect(['global', 'Regional', 'multinational', 'national', 'sub-national', 'subnational', 'Sub National', 'unknown', '', null].map(ptGeoLevel)).toEqual([
      'global',
      'regional',
      'multinational',
      'national',
      'subnational',
      'subnational',
      'subnational',
      'unknown',
      'unknown',
      'unknown'
    ]);
  });

  it('global → 1 Global, nothing else', () => {
    expect(plan({ level: 'global' }).geography).toEqual({ geo_scope_id: 1, countries: [], regions: [], subnational: [] });
  });

  it('multinational and national → 3 Country with the matched countries only; unmatched ones go to the checklist', () => {
    const multi = plan({ countries: [mali, moz, atlantis] });
    expect(multi.geography).toEqual({
      geo_scope_id: 3,
      countries: [
        { clarisa_id: 466, iso_alpha_2: 'ML', name: 'Mali' },
        { clarisa_id: 508, iso_alpha_2: 'MZ', name: 'Mozambique' }
      ],
      regions: [],
      subnational: []
    });
    expect(labels(multi.pending)).toEqual(['Country: Atlantis']);
    expect(plan({ level: 'national', countries: [mali] }).geography?.geo_scope_id).toBe(3);
  });

  it('a Country level with no matched country writes nothing and keeps the geography pending', () => {
    const out = plan({ level: 'national', countries: [atlantis] });
    expect(out.geography).toBeNull();
    expect(out.pending).toEqual([{ label: 'Geographic location', detail: 'scope national; countries Atlantis' }]);
  });

  it('regional → 2 with the CLARISA-mappable regions; none mappable → Regional with no regions + checklist', () => {
    const mapped = plan({ level: 'regional', countries: [], regions: [{ name: 'Africa', match_status: 'matched', clarisa_id: 2 }, { name: 'Somewhere', match_status: null, clarisa_id: null }] });
    expect(mapped.geography).toMatchObject({ geo_scope_id: 2, regions: [{ id: 2, name: 'Africa' }] });
    expect(mapped.pending).toEqual([]);

    const unmapped = plan({ level: 'regional', countries: [], regions: [{ name: 'East Africa', match_status: null, clarisa_id: null }] });
    expect(unmapped.geography).toMatchObject({ geo_scope_id: 2, regions: [] });
    expect(unmapped.pending[0]).toEqual({ label: 'Regions', detail: 'Regional scope prefilled — choose the regions: East Africa' });
  });

  it('sub-national → 5 only with CLARISA-coded areas; otherwise 3 Country + checklist', () => {
    const coded = plan({ level: 'sub-national', countries: [mali], subnational_refs: [{ name: 'Kayes', code: 'ML-1', clarisa_id: null }] });
    expect(coded.geography).toMatchObject({ geo_scope_id: 5, countries: [{ clarisa_id: 466 }], subnational: [{ code: 'ML-1', clarisa_id: null }] });

    const text = plan({ level: 'subnational', countries: [mali], subnational_areas: 'Kayes region' });
    expect(text.geography).toMatchObject({ geo_scope_id: 3, subnational: [] });
    expect(text.pending).toEqual([{ label: 'Sub-national areas', detail: 'Saved as Country — add the areas in Geographic location: Kayes region' }]);
  });

  it('unknown / empty level → nothing, listed in the checklist (no geo at all → no item)', () => {
    expect(plan({ level: 'unknown', countries: [] })).toEqual({ geography: null, suggested: false, pending: [{ label: 'Geographic location', detail: 'scope unknown' }] });
    expect(plan({ level: null, countries: [mali] }).geography).toBeNull();
    expect(ptGeographyPlan(p())).toEqual({ geography: null, suggested: false, pending: [] });
  });

  it('policy none on scope_level derives the focus from the countries; none on countries drops them', () => {
    expect(plan({ level: 'global', countries: [mali] }, { scope_level: 'none' }).geography).toMatchObject({ geo_scope_id: 3, countries: [{ clarisa_id: 466 }] });
    expect(plan({ level: 'global', countries: [] }, { scope_level: 'none' }).geography).toBeNull();
    const dropped = plan({ level: 'national', countries: [mali] }, { countries: 'none' });
    expect(dropped.geography).toBeNull();
    expect(plan({ countries: [] }, { scope_level: 'none', countries: 'none', regions: 'none' }).pending).toEqual([]);
    expect(plan({ level: 'regional', countries: [], regions: [{ name: 'Africa', match_status: 'matched', clarisa_id: 2 }] }, { regions: 'none' }).geography?.regions).toEqual([]);
  });

  it('suggest (any piece used) or a KPI-only provenance fills it as a suggestion with a review item', () => {
    const suggested = plan({}, { countries: 'suggest', scope_level: 'none', regions: 'none' });
    expect(suggested.geography?.geo_scope_id).toBe(3);
    expect(suggested.suggested).toBe(true);
    expect(suggested.pending[0].label).toBe('Geographic location');
    expect(suggested.pending[0].detail).toContain('Review the suggested geography');

    const kpi = plan({ provenance: ['KPI'] });
    expect(kpi.suggested).toBe(true);
    expect(kpi.pending[0].detail).toContain("the KPI's planned scope, not confirmed by evidence");

    const applied = plan({}, { countries: 'apply', scope_level: 'apply' });
    expect(applied.suggested).toBe(false);
    expect(applied.pending).toEqual([]);
  });
});

describe('pt-prefill.util — impact-area scores (PTB-R-18b)', () => {
  const detail = (key: string, score: number | null) => ({ key, label: key, score, justification: 'why' });

  it('reads impact_area_details first, falls back to the flat impact_areas, skips anything outside 0/1/2', () => {
    const out = ptImpactAreaPlan(
      p({
        impact_area_details: [detail('gender', 0), detail('climate', 2), detail('nutrition', 3), detail('environment', null)],
        impact_areas: { gender: 2, poverty: '1', nutrition: 1, environment: 1, justification: '' } as any
      })
    );
    expect(out.scores).toEqual({ gender: 0, climate: 2, poverty: 1 });
  });

  it('per-tag policy: none drops, suggest fills + review item, a string policy applies to every tag', () => {
    const proposal = p({
      impact_area_details: ['gender', 'climate', 'environment', 'nutrition', 'poverty'].map(k => detail(k, 1)),
      policy: { impact_areas: { gender: 'apply', climate: 'apply', environment: 'suggest', nutrition: 'suggest', poverty: 'none' } }
    });
    expect(ptImpactAreaPolicy(proposal, 'environment')).toBe('suggest');
    const out = ptImpactAreaPlan(proposal);
    expect(out.scores).toEqual({ gender: 1, climate: 1, environment: 1, nutrition: 1 });
    expect(out.suggested).toEqual(['nutrition', 'environment']);
    expect(out.pending).toHaveLength(1);
    expect(out.pending[0].detail).toContain('Review the suggested scores');
    expect(ptImpactAreaPolicy(p({ policy: { impact_areas: 'none' } }), 'gender')).toBe('none');
  });

  it('a Principal score stays in the checklist (components + evidence are set in PRMS)', () => {
    const out = ptImpactAreaPlan(p({ impact_area_details: [detail('poverty', 2)] }));
    expect(out.pending).toEqual([{ label: 'Impact area: Poverty reduction, livelihoods & jobs', detail: 'Principal (2) — choose its component(s) and tag an evidence for it' }]);
  });
});

describe('pt-prefill.util — block + outcome (PTB-R-18b)', () => {
  it('buildPtPrefillBlock carries geography / impact_areas only when they map — never names of unmatched places or justifications', () => {
    const block = buildPtPrefillBlock(
      p({
        geo: { level: 'national', countries: [{ name: 'Mali', iso_alpha_2: 'ML', clarisa_id: 466, match_status: 'matched' }, { name: 'Atlantis', iso_alpha_2: null, clarisa_id: null, match_status: 'unmatched' }], regions: [], subnational_areas: null },
        impact_area_details: [{ key: 'gender', label: 'G', score: 1, justification: 'Sentinel' }]
      })
    );
    expect(block).toEqual({
      evidence_links: [],
      partners: [],
      geography: { geo_scope_id: 3, countries: [{ clarisa_id: 466, iso_alpha_2: 'ML', name: 'Mali' }], regions: [], subnational: [] },
      impact_areas: { gender: 1 }
    });
    expect(JSON.stringify(block)).not.toMatch(/Atlantis|Sentinel|match_status/);
    expect(buildPtPrefillBlock(p({ geo: { level: 'unknown', countries: [], regions: [], subnational_areas: null } }))).toBeNull();
  });

  it('ptPrefillOutcomeItems puts back what the server did not apply', () => {
    const sent = {
      evidence_links: [],
      partners: [],
      geography: { geo_scope_id: 3 as const, countries: [], regions: [], subnational: [] },
      impact_areas: { gender: 1 as const, climate: 2 as const }
    };
    expect(ptPrefillOutcomeItems(sent, { geography_applied: 3, geography_skipped: [], impact_areas_applied: ['gender', 'climate'] })).toEqual([]);
    const items = ptPrefillOutcomeItems(sent, { geography_applied: null, geography_skipped_reason: 'not_empty', geography_skipped: ['Atlantis'], impact_areas_applied: ['gender'] });
    expect(items.map(i => i.label)).toEqual(['Geographic location', 'Location: Atlantis', 'Impact area scores']);
    expect(items[0].detail).toContain('already had a geography');
    expect(items[2].detail).toContain('Climate adaptation & mitigation 2');
    expect(ptPrefillOutcomeItems(sent, undefined).map(i => i.label)).toEqual(['Geographic location', 'Impact area scores']);
    expect(ptPrefillOutcomeItems(null, {})).toEqual([]);
  });
});
