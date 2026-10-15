import * as fs from 'fs';
import * as path from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PtResultsBrowseComponent, isSafeHttpUrl } from './pt-results-browse.component';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

/**
 * Read-only detail blocks PT added on 2026-10-15 (geography, partners, impact-area details,
 * evidence links). All display-only (`PTB-R-18`) and tolerant of their absence: the 2-oct PT build
 * in prod sends none of them.
 */
describe('PtResultsBrowseComponent — proposal detail blocks', () => {
  let component: PtResultsBrowseComponent;
  let fixture: ComponentFixture<PtResultsBrowseComponent>;
  let api: { GET_progressTrackerResults: jest.Mock };

  const base = {
    result_key: 'k:1',
    result_type: 'other_output',
    result_type_label: 'Other output',
    title: 'A proposal',
    description: '',
    evidence: [],
    confidence: 0.7,
    rationale: '',
    missing_info: []
  };

  const rich = {
    ...base,
    countries: [
      { name: 'Kenya', iso_alpha_2: 'KE', clarisa_id: 114, match_status: 'matched' },
      { name: 'Atlantis', iso_alpha_2: null, clarisa_id: null, match_status: 'unmatched' }
    ],
    geo_scope: { level: 'multinational', countries: [], regions: [] },
    regions_detail: [{ name: 'Eastern Africa', match_status: 'matched' }, 'Sahel'],
    subnational_areas: 'Nakuru County',
    partners: [
      { name: 'Kenya Agricultural and Livestock Research Organization', acronym: 'KALRO', role: 'implementing', match_status: 'matched', is_cgiar_center: false },
      { name: 'Unknown Farmers Coop', acronym: null, role: 'beneficiary', match_status: 'unmatched', is_cgiar_center: false },
      { name: 'Maybe Org', match_status: 'ambiguous' },
      { name: 'Suggested Org', match_status: 'suggested' },
      { name: 'International Livestock Research Institute', acronym: 'ILRI', match_status: 'matched', is_cgiar_center: true },
      { acronym: '' }
    ],
    impact_area_details: {
      climate: { score: 2, justification: 'Core climate adaptation focus.', provenance: ['E1'] },
      poverty: { score: 1, justification: '', provenance: [] },
      gender: { score: 0, justification: '', provenance: [] }
    },
    evidence_links: [
      { url: 'https://cgspace.cgiar.org/handle/10568/1', title: 'Annual report', kind: 'report' },
      { url: 'http://example.org/no-title' },
      { url: 'javascript:alert(1)', title: 'Bad' },
      { url: 'data:text/html,hi', title: 'Bad too' },
      { url: '/relative/path', title: 'Relative' },
      { title: 'No url' }
    ]
  };

  const el = (test: string): HTMLElement | null => fixture.nativeElement.querySelector(`[data-test="${test}"]`);
  const all = (test: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(`[data-test="${test}"]`));

  const render = (results: unknown[]) => {
    api.GET_progressTrackerResults.mockReturnValue(of({ response: { status: 'ok', results } }));
    fixture.componentRef.setInput('tocIndicatorId', 1);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    api = { GET_progressTrackerResults: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [PtResultsBrowseComponent],
      providers: [{ provide: ResultsApiService, useValue: api }]
    }).compileComponents();
    fixture = TestBed.createComponent(PtResultsBrowseComponent);
    component = fixture.componentInstance;
  });

  describe('geography', () => {
    it('shows the level, countries with ISO code, regions and subnational text', () => {
      render([rich]);
      expect(el('pt-geo-level')?.textContent?.trim()).toBe('multinational');
      const countries = all('pt-geo-country');
      expect(countries.map(c => c.textContent)).toEqual([expect.stringContaining('Kenya'), expect.stringContaining('Atlantis')]);
      expect(countries[0].textContent).toContain('KE');
      expect(el('pt-geo-regions')?.textContent).toContain('Eastern Africa');
      expect(el('pt-geo-regions')?.textContent).toContain('Sahel');
      expect(el('pt-geo-subnational')?.textContent).toContain('Nakuru County');
    });

    it('marks countries that are not matched in CLARISA, and only those', () => {
      render([rich]);
      const [kenya, atlantis] = all('pt-geo-country');
      expect(kenya.getAttribute('data-match')).toBe('matched');
      expect(kenya.className).not.toContain('amber');
      expect(kenya.getAttribute('title')).toBeNull();
      expect(atlantis.getAttribute('data-match')).toBe('unmatched');
      expect(atlantis.className).toContain('amber');
      expect(atlantis.getAttribute('title')).toContain('Not matched');
      expect(atlantis.textContent).toContain('not matched in CLARISA');
    });

    it('reads geo_scope.countries when the result carries none, and drops entries with no name', () => {
      render([{ ...base, geo_scope: { level: 'national', countries: [{ name: 'Peru', match_status: 'matched' }, { iso_alpha_2: 'XX' }] } }]);
      expect(all('pt-geo-country').map(c => c.textContent?.trim())).toEqual(['Peru']);
    });

    it('keeps plain-string countries of the 2-oct build (no CLARISA mark)', () => {
      render([{ ...base, countries: ['Kenya', 'Colombia'] }]);
      const countries = all('pt-geo-country');
      expect(countries.length).toBe(2);
      expect(countries.every(c => c.getAttribute('data-match') === null && !c.className.includes('amber'))).toBe(true);
      expect(component.proposals()[0].countries).toEqual(['Kenya', 'Colombia']);
    });

    it('renders no geography block when nothing geographic is sent', () => {
      render([{ ...base, geo_scope: { level: '', countries: [], regions: [] } }]);
      expect(component.proposals()[0].geo).toBeNull();
      expect(el('pt-proposal-geo')).toBeNull();
    });
  });

  describe('partners', () => {
    it('lists partners with role and the CLARISA badge per match status', () => {
      render([rich]);
      const partners = all('pt-partner');
      expect(partners.length).toBe(5);
      expect(partners[0].textContent).toContain('KALRO');
      expect(partners[0].textContent).toContain('implementing');
      expect(partners[0].querySelector('[data-test="pt-partner-in-clarisa"]')).toBeTruthy();
      expect(partners[0].querySelector('[data-test="pt-partner-not-in-clarisa"]')).toBeNull();
      for (const i of [1, 2, 3]) {
        expect(partners[i].querySelector('[data-test="pt-partner-not-in-clarisa"]')?.textContent?.trim()).toBe('Not in CLARISA');
        expect(partners[i].querySelector('[data-test="pt-partner-in-clarisa"]')).toBeNull();
      }
      expect(partners[4].querySelector('[data-test="pt-partner-cgiar"]')).toBeTruthy();
      expect(partners[0].querySelector('[data-test="pt-partner-cgiar"]')).toBeNull();
    });

    it('shows no badge when PT sends no match_status', () => {
      render([{ ...base, partners: [{ name: 'Plain Org' }] }]);
      expect(el('pt-partner-in-clarisa')).toBeNull();
      expect(el('pt-partner-not-in-clarisa')).toBeNull();
    });
  });

  describe('impact areas', () => {
    it('labels 0/1/2 as Not targeted/Significant/Principal with full area names', () => {
      render([rich]);
      const score = (key: string) => el(`pt-impact-area-${key}`)?.querySelector('[data-test="pt-impact-score"]')?.textContent?.trim();
      expect(score('climate')).toBe('Principal');
      expect(score('poverty')).toBe('Significant');
      expect(score('gender')).toBe('Not targeted');
      expect(el('pt-impact-area-climate')?.textContent).toContain('Climate adaptation & mitigation');
    });

    it('puts the justification in a collapsed <details>, only when there is one', () => {
      render([rich]);
      const details = el('pt-impact-area-climate')?.querySelector('details');
      expect(details).toBeTruthy();
      expect(details?.hasAttribute('open')).toBe(false);
      expect(details?.textContent).toContain('Core climate adaptation focus.');
      expect(el('pt-impact-area-poverty')?.querySelector('details')).toBeNull();
    });

    it('falls back to the old impact_areas summary when no details are sent', () => {
      render([{ ...base, impact_areas: { climate: 1, poverty: 0, justification: 'x' } }]);
      expect(el('pt-proposal-impact-areas')).toBeNull();
      expect(el('pt-proposal-guidance')?.textContent).toContain('climate 1');
    });
  });

  describe('evidence links', () => {
    it('renders only http(s) links, in a new tab with noopener', () => {
      render([rich]);
      const links = all('pt-evidence-link') as HTMLAnchorElement[];
      expect(links.map(a => a.getAttribute('href'))).toEqual(['https://cgspace.cgiar.org/handle/10568/1', 'http://example.org/no-title']);
      expect(links[0].textContent?.trim()).toBe('Annual report');
      expect(links[1].textContent?.trim()).toBe('http://example.org/no-title');
      for (const a of links) {
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toContain('noopener');
      }
      expect(fixture.nativeElement.innerHTML).not.toContain('javascript:');
      expect(fixture.nativeElement.innerHTML).not.toContain('data:text');
    });

    it('isSafeHttpUrl accepts only absolute http(s)', () => {
      expect(isSafeHttpUrl('https://a.org')).toBe(true);
      expect(isSafeHttpUrl('http://a.org/x?y=1')).toBe(true);
      expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeHttpUrl('ftp://a.org')).toBe(false);
      expect(isSafeHttpUrl('/x')).toBe(false);
      expect(isSafeHttpUrl(null)).toBe(false);
    });
  });

  it('tolerates the 2-oct staging fixture shape and a proposal with none of the new blocks', () => {
    render([base, { ...base, result_key: 'k:2', partners: null, impact_area_details: null, evidence_links: null, geo_scope: null }]);
    expect(component.status()).toBe('results');
    for (const p of component.proposals()) {
      expect(p.geo).toBeNull();
      expect(p.partners).toEqual([]);
      expect(p.impact_area_details).toEqual([]);
      expect(p.evidence_links).toEqual([]);
    }
    expect(el('pt-proposal-guidance')).toBeNull();
    expect(el('pt-proposal-evidence-links')).toBeNull();
  });

  // The server package's committed staging capture; skipped only where the client is checked out alone.
  const stagingFixture = path.resolve(
    __dirname,
    '../../../../../../../../../../../onecgiar-pr-server/src/api/progress-tracker/fixtures/pt-results.staging.json'
  );
  (fs.existsSync(stagingFixture) ? it : it.skip)('maps the committed PT staging capture (geo_scope + impact_area_details present)', () => {
    const fixturePath = stagingFixture;
    const staging = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    render(staging.results);
    const first = component.proposals()[0];
    expect(first.geo?.level).toBe('global');
    expect(first.impact_area_details.find(a => a.key === 'climate')?.score).toBe(1);
    expect(first.partners).toEqual([]);
  });
});
