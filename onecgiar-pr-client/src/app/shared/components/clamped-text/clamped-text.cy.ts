import { Component } from '@angular/core';
import { ClampedTextComponent } from './clamped-text.component';

/**
 * Overflow detection is a layout measurement, so it can only be proven in a real browser
 * (jsdom has no layout). TKR-DD-5.
 */
const LONG = Array.from({ length: 2000 / 8 }, (_, i) => `word${i % 10} `).join('').slice(0, 2000);
const SHORT = 'A short KPI statement that fits.'.padEnd(80, '.');

@Component({
  selector: 'app-clamped-host',
  standalone: true,
  imports: [ClampedTextComponent],
  template: `<div style="width: 600px"><app-clamped-text [text]="text" [lines]="3" /></div>`
})
class HostComponent {
  text = LONG;
}

describe('app-clamped-text (TKR-R-2)', () => {
  const lineHeight = (el: HTMLElement) => parseFloat(getComputedStyle(el).lineHeight);
  const textEl = () => cy.get('app-clamped-text [data-clamped-body]');

  it('(a) long text is clamped to 3 lines; Show more expands, Show less is announced', () => {
    cy.mount(HostComponent);
    // Wait for the text to be laid out (end-of-fixture token + non-zero height), then measure with a retrying
    // assertion BEFORE looking up the button, so a missing clamp fails on the height, not on the button.
    textEl().should('contain.text', 'word9');
    textEl().should($el => {
      const el = $el[0] as HTMLElement;
      const lh = lineHeight(el);
      expect(Number.isFinite(lh), 'line-height is a finite px value').to.equal(true);
      const h = el.getBoundingClientRect().height;
      expect(h, 'rendered height is non-zero').to.be.greaterThan(0);
      expect(h, 'clamped to 3 lines').to.be.at.most(3 * lh + 1);
    });
    cy.get('app-clamped-text button').should('be.visible').and('contain.text', 'Show more').and('have.attr', 'aria-expanded', 'false');
    cy.get('app-clamped-text button').click();
    textEl().then($el => {
      const el = $el[0] as HTMLElement;
      expect(el.getBoundingClientRect().height).to.be.greaterThan(3 * lineHeight(el) + 1);
    });
    cy.get('app-clamped-text button').should('contain.text', 'Show less').and('have.attr', 'aria-expanded', 'true');
  });

  it('(b) short text shows no button', () => {
    cy.mount(HostComponent, { componentProperties: { text: SHORT } });
    textEl().should('contain.text', 'A short KPI statement');
    cy.get('app-clamped-text button').should('not.exist');
  });

  it('(c) keyboard: Tab focuses the button, Enter toggles', () => {
    cy.mount(HostComponent);
    cy.get('app-clamped-text button').should('be.visible');
    cy.realPress('Tab');
    cy.get('app-clamped-text button').should('be.focused');
    cy.realPress('Enter');
    cy.get('app-clamped-text button').should('have.attr', 'aria-expanded', 'true');
    cy.realPress('Enter');
    cy.get('app-clamped-text button').should('have.attr', 'aria-expanded', 'false');
  });

  it('(d) changing text while expanded collapses it', () => {
    cy.mount(HostComponent).then(({ component, fixture }) => {
      cy.get('app-clamped-text button').click().should('have.attr', 'aria-expanded', 'true');
      cy.then(() => {
        component.text = LONG.replace(/word/g, 'term');
        fixture.changeDetectorRef.markForCheck();
        fixture.detectChanges();
      });
      cy.get('app-clamped-text button').should('have.attr', 'aria-expanded', 'false').and('contain.text', 'Show more');
    });
  });
});
