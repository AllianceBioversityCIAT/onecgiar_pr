import { mountCF } from '../../../../cypress/support/ct-utils';

/**
 * Behavior lock for <app-pr-range-level>.
 * Captures: one dot per option, clicking selects (value + emit + active class),
 * and disabled blocks selection.
 *
 * ⚠️ The markup was redesigned (the old `.circle` / `.active` became `.prl-dot` /
 * `.prl-dot--active`, and each dot is now a real <button [disabled]>). The public API —
 * `options` / `optionValue` / `optionLabel` / `disabled` / `selectOptionEvent` — did not change,
 * so these are the same three behaviours re-pointed at the current DOM.
 */
describe('PrRangeLevelComponent (CT)', () => {
  const OPTIONS = [
    { level: 0, name: 'None' },
    { level: 1, name: 'Low' },
    { level: 2, name: 'Mid' },
    { level: 3, name: 'High' }
  ];

  const TEMPLATE = `
    <app-pr-range-level
      [options]="options"
      optionValue="level"
      optionLabel="name"
      [disabled]="disabled"
      (selectOptionEvent)="onSelect($event)">
    </app-pr-range-level>`;

  const mount = (disabled = false) => {
    const onSelect = cy.stub().as('select');
    return mountCF(TEMPLATE, { editable: true, componentProperties: { options: OPTIONS, disabled, onSelect } });
  };

  it('renders one dot per option', () => {
    mount();
    cy.get('.prl-dot').should('have.length', OPTIONS.length);
  });

  it('clicking a level selects it and emits its value', () => {
    mount();
    cy.get('.prl-dot').eq(2).click().should('have.class', 'prl-dot--active');
    cy.get('@select').should('have.been.calledWith', 2);
  });

  it('does not select when disabled', () => {
    mount(true);
    // The dot is a real <button [disabled]>, so the browser swallows the click on its own.
    // Forcing it past that is what proves the handler cannot fire either.
    cy.get('.prl-dot').eq(1).should('be.disabled').click({ force: true });
    cy.get('@select').should('not.have.been.called');
  });
});
