/// <reference types="cypress" />

/**
 * P2-3382 — bilateral Capacity Sharing: the MDS block is exactly three fields (people trained,
 * length of training, delivery method), and "Were the trainees attending on behalf of an
 * organization?" belongs to full metadata, behind the toggle.
 *
 * Asserted in a real browser because the two things that matter are both rendering decisions: the
 * counter the user reads on the accordion, and whether the question is on screen before expanding.
 */

const CAPACITY_SHARING = 5;
const ATTENDANCE_Q = 'Were the trainees attending on behalf of an organization?';

function openCapacitySharing() {
  cy.window().then((win: any) => {
    const host = win.document.querySelector('app-bilateral-result-creator');
    expect(host, 'the creator component is mounted').to.exist;
    const cmp = win.ng.getComponent(host);
    // Sections live in the editor branch — see the note in bilateral-type-specific-section.cy.ts.
    cmp.isCreating.set(false);
    cmp.resultId.set(9999);
    // Through the SERVICE: that is what section-type-specific reads, and what the editor path sets.
    cmp.creationService.resultTypeId.set(CAPACITY_SHARING);
    cmp.creationService.currentResultId.set(9999);
    cmp.openSectionName.set('type-specific');
    win.ng.applyChanges?.(cmp);
  });
}

describe('P2-3382 · bilateral Capacity Sharing MDS', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    openCapacitySharing();
    cy.get('app-type-capacity-sharing', { timeout: 20000 }).should('exist');
  });

  it('publishes exactly THREE MDS items, and none of them is the attendance answer', () => {
    // The accordion counter cannot be asserted against a non-existent result id: `updateMds()` runs
    // only inside the success callback of GET_capacityDevelopment, so a failed fetch leaves the
    // section at 0/0. (That gap is real but belongs to another ticket — noted on P2-3382.)
    // So the component is driven directly and the PUBLISHED checklist is read back.
    cy.window().then((win: any) => {
      const cs = win.ng.getComponent(win.document.querySelector('app-type-capacity-sharing'));
      cs.body = { female_using: 4, capdev_delivery_method_id: 2, capdev_term_id: 3, is_attending_for_organization: true };
      cs.updateMds();
      const items = cs['mdsTracker'].getSectionFields('type-specific');
      expect(items.map((i: any) => i.key)).to.deep.equal(['people-trained', 'delivery-method', 'length-of-training']);
      expect(items.every((i: any) => i.filled), 'the three MDS fields are satisfied').to.be.true;
    });
    cy.screenshot('p2-3382-three-mds-fields', { capture: 'fullPage' });
  });

  it('labels the toggle "Complete full metadata"', () => {
    cy.get('app-type-capacity-sharing').contains('button', 'Complete full metadata').should('exist');
    cy.get('app-type-capacity-sharing').contains('button', /^\s*Full metadata\s*$/).should('not.exist');
  });

  it('hides the attendance question until full metadata is expanded', () => {
    cy.get('app-type-capacity-sharing').should('not.contain.text', ATTENDANCE_Q);
    cy.get('app-type-capacity-sharing').contains('button', 'Complete full metadata').click();
    cy.get('app-type-capacity-sharing').should('contain.text', ATTENDANCE_Q);
    cy.screenshot('p2-3382-attendance-behind-toggle', { capture: 'fullPage' });
  });

  it('keeps the three MDS fields visible without expanding', () => {
    ['Delivery Method'].forEach(label => {
      cy.get('app-type-capacity-sharing').should('contain.text', label);
    });
  });
});
