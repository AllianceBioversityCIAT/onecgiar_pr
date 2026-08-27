import { mountCFHost, patchHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-pr-button` (75 consuming templates — the action primitive of the app,
 * and the button `save-button` / `sync-button` are themselves built on).
 *
 * Source of truth
 * ---------------
 * `pr-button.component.ts` is IDENTICAL to `master`. The only diff in the whole folder is in the
 * template: `[pTooltip]`/`[tooltipPosition]`/`[tooltipStyleClass]` (PrimeNG) were swapped for
 * `[prTooltip]`/`[prTooltipPosition]`/`[prTooltipStyleClass]` (the in-house
 * `shared/directives/pr-tooltip.directive.ts`). That swap is the only behavioural risk this
 * component carries out of the migration, so the tooltip gets first-class coverage: `master`'s
 * observable behaviour was "hovering the button shows the `tooltipText`", and that is asserted
 * as-is without referencing any PrimeNG markup.
 *
 * Input usage measured across the 75 consumer templates (the prioritisation key):
 *   text 133 · icon 97 · padding 61 · colorType 47 · [rotating] 38 · [verticalMargin] 31
 *   [reverse] 19 · [disabled] 17 · [tooltipText] 10 · [showBackground] 5 · iconsStylesClass 3
 * `[pulse]`, `[underConstruction]`, `[rotateRight]` have (almost) no consumers -> smoke level
 * per the design non-goals.
 */

const FIELD = `
  <app-pr-button
    [text]="text"
    [icon]="icon"
    [disabled]="disabled"
    [rotating]="rotating"
    [colorType]="colorType"
    [tooltipText]="tooltipText"
    (clickEvent)="onClick()">
  </app-pr-button>`;

const mount = (props: Record<string, unknown> = {}) => {
  const onClick = cy.stub().as('click');
  return mountCFHost(FIELD, {
    componentProperties: {
      text: 'Save',
      icon: 'save',
      disabled: false,
      rotating: false,
      colorType: 'primary',
      tooltipText: '',
      onClick,
      ...props
    }
  });
};

describe('PrButtonComponent — contract', () => {
  describe('labelling', () => {
    it('[contract] renders the text supplied by the consumer', () => {
      mount({ text: 'Save and continue' });
      cy.get('.pr_button .text').should('contain.text', 'Save and continue');
    });

    it('[contract] renders a material-icons ligature for the icon by default', () => {
      mount({ icon: 'add' });
      cy.get('.pr_button i').should('have.class', 'material-icons-round').and('contain.text', 'add');
    });

    it('[contract] renders no icon element when no icon is supplied', () => {
      mount({ icon: null });
      cy.get('.pr_button i').should('not.exist');
    });

    it('[contract] uses the PrimeIcons class instead of a ligature when iconsStylesClass is "pi"', () => {
      mountCFHost(`<app-pr-button text="Export" icon="download" iconsStylesClass="pi"></app-pr-button>`);
      cy.get('.pr_button i').should('have.class', 'pi').and('have.class', 'pi-download');
      cy.get('.pr_button i').invoke('text').should('not.contain', 'download');
    });

    it('[contract] updates the label when the consumer changes it (the Save -> Saving path)', () => {
      mount({ text: 'Save' });
      cy.get('.pr_button .text').should('contain.text', 'Save');

      patchHost(host => (host.text = 'Saving'));

      cy.get('.pr_button .text').should('contain.text', 'Saving');
    });
  });

  describe('click emission', () => {
    it('[contract] emits clickEvent exactly once per click', () => {
      mount();
      cy.get('.pr_button').click();
      cy.get('@click').should('have.been.calledOnce');
    });

    it('[contract] emits once per click across repeated clicks (no double firing)', () => {
      mount();
      cy.get('.pr_button').click().click().click();
      cy.get('@click').should('have.been.calledThrice');
    });
  });

  describe('disabled state (17 consumers bind it dynamically)', () => {
    it('[contract] marks the button as disabled', () => {
      mount({ disabled: true });
      cy.get('.pr_button').should('have.class', 'b-disabled');
    });

    it('[contract] swallows clicks while disabled', () => {
      mount({ disabled: true });
      cy.get('.pr_button').click({ force: true });
      cy.get('@click').should('not.have.been.called');
    });

    it('[contract] swallows every click while disabled, not just the first', () => {
      mount({ disabled: true });
      cy.get('.pr_button').click({ force: true }).click({ force: true });
      cy.get('@click').should('not.have.been.called');
    });

    /**
     * The real path behind `[disabled]="!generalInfoBody.result_name"`: the user types a title
     * and the button must become usable without a remount.
     */
    it('[contract] becomes clickable again when the consumer lifts [disabled]', () => {
      mount({ disabled: true });

      patchHost(host => (host.disabled = false));

      cy.get('.pr_button').should('not.have.class', 'b-disabled').click();
      cy.get('@click').should('have.been.calledOnce');
    });
  });

  describe('loading state ([rotating] — 38 consumers, this is the app-wide spinner)', () => {
    it('[contract] spins the icon while rotating', () => {
      mount({ rotating: true, icon: 'loop' });
      cy.get('.pr_button i').should('have.class', 'rotating');
    });

    it('[contract] does not spin the icon while idle', () => {
      mount({ rotating: false, icon: 'save' });
      cy.get('.pr_button i').should('not.have.class', 'rotating');
    });

    it('[contract] starts and stops spinning as the consumer flips the flag', () => {
      mount({ rotating: false, icon: 'save' });
      cy.get('.pr_button i').should('not.have.class', 'rotating');

      patchHost(host => {
        host.rotating = true;
        host.icon = 'loop';
      });
      cy.get('.pr_button i').should('have.class', 'rotating');

      patchHost(host => {
        host.rotating = false;
        host.icon = 'save';
      });
      cy.get('.pr_button i').should('not.have.class', 'rotating');
    });

    it('[contract] still emits clickEvent while rotating (the guard is [disabled], not [rotating])', () => {
      mount({ rotating: true, icon: 'loop' });
      cy.get('.pr_button').click();
      cy.get('@click').should('have.been.calledOnce');
    });
  });

  describe('colour variants (47 consumers set colorType)', () => {
    const backgroundOf = (alias: string) =>
      cy.get('.pr_button').then($el => cy.wrap(window.getComputedStyle($el[0]).backgroundColor).as(alias));

    it('[contract] paints a background for each colorType, and a different one per type', () => {
      mount({ colorType: 'primary' });
      backgroundOf('primary');

      cy.get('@primary').then(primary => {
        expect(String(primary), 'primary has a real background').to.not.match(/rgba\(0, 0, 0, 0\)|transparent/);

        patchHost(host => (host.colorType = 'danger'));
        cy.get('.pr_button').then($el => {
          const danger = window.getComputedStyle($el[0]).backgroundColor;
          expect(danger, 'danger differs from primary').to.not.equal(String(primary));
        });
      });
    });

    it('[contract] paints no background when [showBackground] is false', () => {
      mountCFHost(`<app-pr-button text="Back" icon="arrow_back" [showBackground]="false"></app-pr-button>`);
      cy.get('.pr_button')
        .should('not.have.class', 'show_background')
        .then($el => {
          expect(window.getComputedStyle($el[0]).backgroundColor).to.match(/rgba\(0, 0, 0, 0\)|transparent/);
        });
    });
  });

  describe('tooltip (PrimeNG pTooltip -> in-house prTooltip; 10 consumers)', () => {
    it('[contract] shows the tooltip text on hover', () => {
      mount({ tooltipText: 'Download the report' });
      cy.get('.pr_button').trigger('mouseenter');
      cy.contains('Download the report').should('be.visible');
    });

    it('[contract] removes the tooltip when the pointer leaves', () => {
      mount({ tooltipText: 'Download the report' });
      cy.get('.pr_button').trigger('mouseenter');
      cy.contains('Download the report').should('be.visible');

      cy.get('.pr_button').trigger('mouseleave');
      cy.contains('Download the report').should('not.exist');
    });

    it('[contract] shows nothing on hover when no tooltip text is configured', () => {
      mount({ tooltipText: '', text: 'Save' });
      cy.get('.pr_button').trigger('mouseenter');
      // The only "Save" in the DOM must remain the button's own label.
      cy.get('body').find(':contains("Save")').filter(':visible').should('exist');
      cy.get('.pr_button').then($btn => {
        const strays = Array.from(document.body.children).filter(
          el => !el.contains($btn[0]) && (el.textContent ?? '').includes('Save')
        );
        expect(strays, 'no tooltip element was appended to the body').to.have.length(0);
      });
    });
  });

  describe('layout variants (smoke — low/no consumer count)', () => {
    it('[contract] flips the icon/text order when [reverse] is set', () => {
      mountCFHost(`<app-pr-button text="Previous" icon="arrow_back" [reverse]="true"></app-pr-button>`);
      cy.get('.pr_button').should('have.class', 'reverse');
    });

    it('[contract] applies the padding size supplied by the consumer', () => {
      mountCFHost(`<app-pr-button text="Save" padding="medium"></app-pr-button>`);
      cy.get('.pr_button').should('have.class', 'medium');
    });

    it('[contract] shows the work-in-progress badge when [underConstruction] is set', () => {
      mountCFHost(`<app-pr-button text="Soon" [underConstruction]="true"></app-pr-button>`);
      cy.get('.pr_button img.under_construction').should('exist');
    });
  });
});
