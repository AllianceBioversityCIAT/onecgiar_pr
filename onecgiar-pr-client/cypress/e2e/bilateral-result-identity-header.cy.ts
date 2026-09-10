/// <reference types="cypress" />

/**
 * P2-3352 (partial) — the bilateral result header must identify the result: title, code, type and a
 * `W3/Bilateral` funding tag.
 *
 * The status badge and the status-driven read-only rules the same story asks for are NOT covered
 * here: the bilateral result-detail response carries no status field, so the editor cannot know it.
 * Blocked on backend (P2-3437) and noted on the ticket.
 */

const RESULT_ID = 9999;

function editorWith(identity: { code?: number; type?: string; w3?: boolean; title?: string }) {
  cy.window().then((win: any) => {
    const cmp = win.ng.getComponent(win.document.querySelector('app-bilateral-result-creator'));
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.creationService.resultTypeId.set(1);
    cmp.creationService.resultCode.set(identity.code ?? null);
    cmp.creationService.resultTypeName.set(identity.type ?? null);
    cmp.creationService.isW3Bilateral.set(identity.w3 ?? false);
    cmp.creationService.resultTitle.set(identity.title ?? '');
    win.ng.applyChanges?.(cmp);
  });
}

describe('P2-3352 · bilateral result identity header', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
  });

  it('shows the wizard copy while creating, with no identity strip', () => {
    cy.get('app-bilateral-page-header h1').should('contain.text', 'Report New Bilateral Result');
    cy.get('app-bilateral-page-header').should('not.contain.text', 'W3/Bilateral');
  });

  it('shows the result title, code, type and funding tag in the editor', () => {
    editorWith({ code: 8682, type: 'Policy Change', w3: true, title: 'Seed policy adopted in Kenya' });
    cy.get('app-bilateral-page-header h1').should('contain.text', 'Seed policy adopted in Kenya');
    cy.get('app-bilateral-page-header').should('contain.text', '8682');
    cy.get('app-bilateral-page-header').should('contain.text', 'Policy Change');
    cy.get('app-bilateral-page-header').should('contain.text', 'W3/Bilateral');
    cy.screenshot('p2-3352-identity-strip', { capture: 'viewport' });
  });

  it('falls back to the wizard copy while the title has not loaded', () => {
    editorWith({ code: 8682, type: 'Policy Change', w3: true, title: '' });
    cy.get('app-bilateral-page-header h1').should('contain.text', 'Report New Bilateral Result');
    // the strip still shows what it does know
    cy.get('app-bilateral-page-header').should('contain.text', '8682');
  });

  it('renders no strip when nothing about the result is known', () => {
    editorWith({ title: 'Untitled' });
    cy.get('app-bilateral-page-header').should('not.contain.text', 'W3/Bilateral');
  });
});
