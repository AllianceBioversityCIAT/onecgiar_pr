// Cypress CT gate for the Progress Tracker proposal card's 2026-10-15 detail blocks (geography,
// partners, impact areas, evidence links, partial notice). jsdom lays nothing out, so the Jest specs
// can only say WHAT renders; this file measures that it FITS: at both widths every element of a
// proposal card stays inside the card, the card does not scroll horizontally, and long unbroken
// names / URLs wrap instead of pushing the aside wider.
//
// Widths come from `initialDrawerWidth()` (indicator-drawer.component.ts): vw 1024 → aside 704px;
// vw 640 (< 768) → full-bleed sheet, aside = 640px. The wrapper reproduces the drawer scroll body's
// padding (`px-4 min-[640px]:px-6`) and a card-ish inner padding.
import { of } from 'rxjs';
import { PtResultsBrowseComponent } from './pt-results-browse.component';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

// ~830px of unbroken text at 11px — wider than either column (578px / 642px), so a missing
// `break-words` really overflows (a single copy, ~416px, fitted and made the gate vacuous).
const LONG = 'Supercalifragilisticexpialidociousagriculturalresearchorganizationwithoutspaces'.repeat(2);

const proposal = {
  result_key: 'k:1',
  result_type: 'other_output',
  result_type_label: 'Other output',
  title: 'Fragility and Conflict Sensitivity Hub established as strategic mechanism across fragile contexts',
  description: 'The Hub supports conflict-sensitive research design.',
  evidence: [{ item_key: 'E1', kind: 'text', name: 'Qualitative note', url: null }],
  confidence: 0.75,
  rationale: 'Clearly achieved.',
  missing_info: ['Specific countries'],
  countries: [
    { name: 'Kenya', iso_alpha_2: 'KE', clarisa_id: 114, match_status: 'matched' },
    { name: 'Democratic Republic of the Congo', iso_alpha_2: 'CD', clarisa_id: 50, match_status: 'matched' },
    { name: LONG, iso_alpha_2: null, clarisa_id: null, match_status: 'unmatched' }
  ],
  geo_scope: { level: 'multinational' },
  regions_detail: [{ name: 'Eastern Africa', match_status: 'matched' }, { name: 'Sahel', match_status: 'suggested' }],
  subnational_areas: 'Nakuru County, Kisumu County, North Kivu Province, South Kivu Province',
  partners: [
    { name: 'Kenya Agricultural and Livestock Research Organization', acronym: 'KALRO', role: 'implementing', match_status: 'matched', is_cgiar_center: false },
    { name: LONG, acronym: 'XYZ', role: 'beneficiary', match_status: 'unmatched', is_cgiar_center: false },
    { name: 'International Livestock Research Institute', acronym: 'ILRI', role: 'lead', match_status: 'matched', is_cgiar_center: true }
  ],
  impact_area_details: {
    climate: { score: 2, justification: 'Climate-security analytics integration is a deliberate objective.' },
    gender: { score: 1, justification: 'Women-led cooperatives are part of the target group.' },
    nutrition: { score: 0, justification: '' }
  },
  evidence_links: [
    { url: `https://cgspace.cgiar.org/handles/10568/${LONG}${LONG}`, title: '', kind: 'report' },
    { url: 'https://example.org/brief', title: 'Policy brief on conflict sensitivity in food systems research', kind: 'brief' }
  ]
};

const envelope = {
  response: {
    status: 'ok',
    results: [proposal],
    generated_by: { mode: 'ai', complete: false, notice: 'Two more evidence groups are still being drafted. Check again in a moment.' },
    source: { pt_url: 'https://pt.example.org/kpi?indicator=1' }
  }
};

const CASES = [
  { viewport: 1024, aside: 704 },
  { viewport: 640, aside: 640 }
];

describe('pt-results-browse proposal detail layout', () => {
  for (const { viewport, aside } of CASES) {
    it(`fits the ${aside}px aside at a ${viewport}px viewport`, () => {
      cy.viewport(viewport, 900);
      cy.mount(
        `<div data-cy="aside" style="width: ${aside}px" class="box-border overflow-y-auto px-4 pt-4 min-[640px]:px-6">
           <div class="rounded-xl border p-4"><app-pt-results-browse [tocIndicatorId]="1"></app-pt-results-browse></div>
         </div>`,
        {
          imports: [PtResultsBrowseComponent],
          providers: [{ provide: ResultsApiService, useValue: { GET_progressTrackerResults: () => of(envelope) } }]
        }
      );

      cy.get('[data-test="pt-proposal-geo"]').should('be.visible');
      cy.get('[data-test="pt-partial-notice"]').should('be.visible');

      cy.get('[data-cy="aside"]').then($aside => {
        const asideEl = $aside[0];
        expect(asideEl.scrollWidth, 'aside does not scroll horizontally').to.be.at.most(asideEl.clientWidth);
      });

      cy.get('[data-test="pt-results"]').then($results => {
        const results = $results[0];
        const box = results.getBoundingClientRect();
        expect(results.scrollWidth, 'results column does not overflow').to.be.at.most(results.clientWidth + 1);
        const offenders = Array.from(results.querySelectorAll<HTMLElement>('*'))
          .filter(node => node.getClientRects().length > 0)
          .map(node => ({ node, rect: node.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width > 0 && (rect.right > box.right + 1 || rect.left < box.left - 1))
          .map(({ node, rect }) => `${node.tagName}.${node.getAttribute('data-test') ?? ''} ${Math.round(rect.left)}-${Math.round(rect.right)} vs ${Math.round(box.left)}-${Math.round(box.right)}`);
        expect(offenders, 'every element stays inside the results column').to.deep.equal([]);
      });

      // The Check again button in the partial notice stays fully visible next to (or under) the text.
      cy.get('[data-test="pt-check-again-partial"]').then($btn => {
        const btn = $btn[0].getBoundingClientRect();
        const notice = $btn[0].closest('[data-test="pt-partial-notice"]')!.getBoundingClientRect();
        expect(btn.right).to.be.at.most(notice.right + 0.5);
        expect(btn.width).to.be.greaterThan(40);
      });

      // Collapsible justification opens in place without widening anything.
      cy.get('[data-test="pt-impact-area-climate"] summary').click();
      cy.get('[data-test="pt-impact-area-climate"] details').should('have.attr', 'open');
      cy.get('[data-cy="aside"]').then($aside => {
        expect($aside[0].scrollWidth).to.be.at.most($aside[0].clientWidth);
      });
    });
  }
});
