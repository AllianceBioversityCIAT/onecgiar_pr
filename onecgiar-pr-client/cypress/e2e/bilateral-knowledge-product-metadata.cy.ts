/// <reference types="cypress" />

/**
 * P2-3384 — the bilateral Knowledge Product section must show the MELIA block, the repository
 * metadata, the FAIR score and Sync.
 *
 * This asserts the RENDERED DOM in a real browser. The Jest suite already covers the branches; what
 * only a browser proves is that the pieces actually paint — the MELIA dropdowns are PrimeNG
 * components, and the FAIR radials come from `ng-circle-progress`, whose options provider the
 * standalone component has to supply itself because the W1/W2 flow registers it in an NgModule.
 * A missing provider is a runtime failure jsdom is not the place to discover.
 *
 * The result is driven through the live component instance and the payload is intercepted, the same
 * way the sibling bilateral specs do it: the wizard needs a real project and science program in the
 * test environment, and there is no bilateral Knowledge Product result there to lean on.
 */

const KNOWLEDGE_PRODUCT = 6;
const RESULT_ID = 9999;

const KP_PAYLOAD = {
  handle: '10568/185045',
  type: 'Report',
  licence: 'CC-BY-4.0',
  authors: [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }],
  keywords: ['maize', 'yield'],
  agrovoc_keywords: ['soil fertility'],
  commodity: 'Maize',
  sponsor: 'Some donor',
  references_other_knowledge_products: 'None',
  warnings: ['This knowledge product has no DOI recorded in CGSpace.'],
  cgspace_phase_year: 2026,
  metadataCG: { source: 'CGSpace', issue_year: 2026, online_year: 2025, is_peer_reviewed: true, accessibility: true },
  fair_data: {
    total_score: 0.55,
    F: { score: 1, indicators: [{ name: 'F1', description: 'has an identifier', score: 1 }] },
    A: { score: 0, indicators: [{ name: 'A1', description: 'is retrievable', score: 0 }] },
    I: { score: 0.5, indicators: [] },
    R: { score: 0.25, indicators: [] }
  },
  is_melia: null,
  melia_previous_submitted: null,
  melia_type_id: null,
  ost_melia_study_id: null,
  toc_melia_study_id: null
};

function stubEndpoints(payload: Record<string, unknown> = {}) {
  // Order matters: Cypress lets the LAST matching intercept win, and the Knowledge Product url sits
  // under `/api/results/` too. Declaring the catch-all first keeps it from swallowing the payload
  // this spec is about — which is exactly how the first run of this spec failed, with the section
  // mounted and empty.
  cy.intercept('GET', '**/api/results/**', { body: { response: {} } });
  cy.intercept('GET', '**/clarisa/melia-study-type/get/all', {
    body: { response: [{ id: 1, name: 'Impact assessment' }, { id: 2, name: 'Evaluation' }] }
  });
  cy.intercept('GET', '**/melia-studies/get/all/toc/**', {
    body: { response: [{ melia_id: 'toc-1', title: 'A planned TOC study', official_code: 'SP01' }] }
  });
  cy.intercept('GET', '**/results-knowledge-products/get/result/**', {
    body: { response: { ...KP_PAYLOAD, ...payload }, message: 'ok', status: 200 }
  }).as('kp');
}

function driveToKnowledgeProduct() {
  cy.window().then((win: any) => {
    const host = win.document.querySelector('app-bilateral-result-creator');
    expect(host, 'the creator component is mounted').to.exist;
    const cmp = win.ng.getComponent(host);
    // The sections live in the EDITOR branch, not in the creation wizard.
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    // The type MUST travel through the service: the component's local signal is only written by the
    // wizard and stays null on the editor path.
    cmp.creationService.resultTypeId.set(KNOWLEDGE_PRODUCT);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.creationService.reportingYear.set(2026);
    cmp.creationService.resultInitiativeId.set(51);
    win.ng.applyChanges?.(cmp);
  });
}

function openTypeSection() {
  cy.contains('Type-Specific Details', { timeout: 20000 }).click();
  cy.get('app-type-knowledge-product', { timeout: 20000 }).should('exist');
}

describe('P2-3384 · bilateral Knowledge Product metadata', () => {
  beforeEach(() => {
    cy.loginByToken('/');
  });

  it('paints the MELIA question, the alerts, the metadata rows and the FAIR radials', () => {
    stubEndpoints();
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    driveToKnowledgeProduct();
    openTypeSection();

    // The API warning first, then the two fixed notes naming the repository.
    cy.get('app-type-knowledge-product').within(() => {
      cy.contains('no DOI recorded in CGSpace').should('exist');
      cy.contains('contact your Center library staff').should('exist');
      cy.contains('automatically collected from external sources').should('exist');

      // The MELIA block: the first question always, nothing below it until it is answered Yes.
      cy.contains('Is this knowledge product a MELIA Product?').should('exist');
      cy.contains('Do you have a MELIA study planned in your TOC?').should('not.exist');
      cy.get('app-pr-select').should('not.exist');

      // The metadata the researcher cannot edit.
      cy.contains('.tsf-readonly-label', 'Handle').should('exist');
      cy.contains('.tsf-readonly-label', 'Issue date (CGSpace)').should('exist');
      cy.contains('.kp-chip', 'Ada Lovelace').should('exist');
      cy.contains('.kp-chip', 'Grace Hopper').should('exist');
      cy.contains('.tsf-readonly-label', 'AGROVOC Keywords').should('exist');
      // No WoS data in this payload, so those rows must stay out.
      cy.contains('.tsf-readonly-label', 'Peer reviewed (WoS)').should('not.exist');
      cy.contains('Not Available').should('exist');

      // The FAIR score really renders four radials — the provider question this spec exists for.
      cy.get('.kp-fair-item').should('have.length', 4);
      cy.get('.kp-fair-item circle-progress svg').should('have.length', 4);
      cy.contains('.kp-fair-indicator', 'has an identifier').should('exist');

      cy.get('.tsf-sync-btn').should('exist').and('contain.text', 'Sync with CGSpace');
    });

    cy.screenshot('p2-3384-kp-section-melia-unanswered', { capture: 'fullPage' });
  });

  it('opens the TOC branch when the saved answers say the study was planned', () => {
    stubEndpoints({ is_melia: true, melia_previous_submitted: true });
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    driveToKnowledgeProduct();
    openTypeSection();

    cy.get('app-type-knowledge-product').within(() => {
      cy.contains('Do you have a MELIA study planned in your TOC?').should('exist');
      cy.contains('Select the MELIA study from the drop-down').should('exist');
      cy.contains('Select MELIA type').should('not.exist');
    });

    cy.screenshot('p2-3384-kp-section-toc-branch', { capture: 'fullPage' });
  });

  it('opens the MELIA type branch when no study was planned', () => {
    stubEndpoints({ is_melia: true, melia_previous_submitted: false });
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    driveToKnowledgeProduct();
    openTypeSection();

    cy.get('app-type-knowledge-product').within(() => {
      cy.contains('Select MELIA type').should('exist');
      cy.contains('Select the MELIA study from the drop-down').should('not.exist');
    });
  });

  /**
   * The account this suite logs in with is an administrator, and the story keeps Sync available to
   * administrators on Journal Articles — so this asserts the admin half of that rule. The non-admin
   * half needs a second account and is covered in the Jest suite instead.
   */
  it('shows the two CGSpace guidance messages, and keeps Sync for an admin on a Journal Article', () => {
    stubEndpoints({
      type: 'Journal Article',
      metadataCG: { source: 'CGSpace', doi: '10.1000/x', online_year: 2025 }
    });
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    driveToKnowledgeProduct();
    openTypeSection();

    cy.get('app-type-knowledge-product').within(() => {
      cy.contains('Please update the ISI Status field in CGSpace').should('exist');
      cy.contains('Please update the Open Access field in CGSpace').should('exist');
      cy.get('.tsf-sync-btn').should('exist');
    });

    cy.screenshot('p2-3384-kp-section-journal-article', { capture: 'fullPage' });
  });
});
