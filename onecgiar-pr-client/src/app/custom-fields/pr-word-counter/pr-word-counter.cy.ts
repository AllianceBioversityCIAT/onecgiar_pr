import { mountComponent } from '../../../../cypress/support/ct-utils';
import { PrWordCounterComponent } from './pr-word-counter.component';

/**
 * Behavior lock for <app-pr-word-counter> before the signals refactor.
 * Captures: shows count/limit, and flags invalid when over the limit (unless autogenerate).
 *
 * Mounted via `mountComponent` — this helper is NOT exported from CustomFieldsModule, so a
 * template-tag mount (`<app-pr-word-counter>`) never instantiates the real component in CT.
 */
describe('PrWordCounterComponent (CT)', () => {
  it('shows the current count and the limit', () => {
    mountComponent(PrWordCounterComponent, { componentProperties: { wordCount: 2, maxWords: 10 } });
    cy.get('.word_counter').should('contain.text', 'Max 10 words');
    cy.get('.limitBreaker').should('contain.text', '2');
  });

  it('marks invalid when over the limit', () => {
    mountComponent(PrWordCounterComponent, {
      componentProperties: { wordCount: 12, maxWords: 10, autogenerate: false }
    });
    cy.get('.word_counter').should('have.class', 'invalid');
    cy.get('.limitBreaker').should('have.class', 'invalid');
  });

  it('uses the warning style instead of invalid when autogenerate is on', () => {
    mountComponent(PrWordCounterComponent, {
      componentProperties: { wordCount: 12, maxWords: 10, autogenerate: true }
    });
    cy.get('.word_counter').should('have.class', 'warning');
    cy.get('.limitBreaker').should('have.class', 'warning');
  });
});
