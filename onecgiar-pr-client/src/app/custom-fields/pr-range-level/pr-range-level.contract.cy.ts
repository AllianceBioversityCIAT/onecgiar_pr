import { mountCFHost, patchHost, readHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-pr-range-level` (5 consuming templates).
 *
 * Source of truth
 * ---------------
 * `pr-range-level.component.{ts,html,scss}` is BYTE-IDENTICAL to `master`
 * (`git diff master -- src/app/custom-fields/pr-range-level/*.component.*` -> empty), so any
 * behaviour asserted here is `master`'s behaviour by construction. What changed underneath is
 * Angular 19 -> 21, which is exactly what these tests exercise.
 *
 * The 5 real consumers:
 *   - shared/components/innovation-use-form               optionValue="level"
 *   - ipsr .../step-n3 (x2)                               optionValue="id"
 *   - ipsr .../step-n3-complementary-innovations (x2)     optionValue="id"
 *   - results .../innovation-dev-info                     optionValue="id"
 *
 * All five use the SAME shape:
 *
 *   <app-pr-range-level itemTitle="name" itemDescription="definition"
 *                       optionLabel="name" optionValue="id"
 *                       [options]="<async service list>"
 *                       [(ngModel)]="<body field>"></app-pr-range-level>
 *
 * Two properties of that shape drive the contracts below:
 *  1. `[options]` ALWAYS arrives from an async catalog call
 *     (`innovationControlListSE.readinessLevelsList`, `rangesOptions`, `innovationUseList`),
 *     i.e. AFTER first render — one consumer even guards it with `*ngIf="rangesOptions?.length"`.
 *  2. The bound model is a plain body field that the parent reassigns wholesale when the
 *     section payload loads, and clears when the section is reset.
 *
 * NOT asserted here, deliberately (would be inventing requirements — see design.md D2 and
 * "Risks / Trade-offs"):
 *  - the `.pr-field.mandatory` / `.complete` DOM contract. `pr-range-level` has NO `required`
 *    input (on this branch AND on `master`) and NO consumer passes one; its completeness is
 *    reported by a sibling `<div appFeedbackValidation [isComplete]="...">` in every consumer
 *    template. Asserting the mandatory DOM here would fabricate a requirement the component
 *    never had.
 *  - `[size]` / `sizeArray`. `options` defaults to `[]`, which is truthy, so the template
 *    branch `options ? options : sizeArray` never reaches `sizeArray` unless a consumer passes
 *    `[options]="null"`. Zero consumers do. Smoke level per the design non-goals.
 */

/** Mirrors `innovationControlListSE.readinessLevelsList` — includes level 0 on purpose. */
const LEVELS = [
  { id: 0, name: 'Idea', definition: 'The innovation is an idea.' },
  { id: 1, name: 'Basic research', definition: 'Basic principles observed.' },
  { id: 2, name: 'Formulation', definition: 'Concept formulated.' },
  { id: 3, name: 'Proof of concept', definition: 'Proof of concept demonstrated.' }
];

const FIELD = `
  <app-pr-range-level
    itemTitle="name"
    itemDescription="definition"
    optionLabel="name"
    optionValue="id"
    [options]="options"
    [(ngModel)]="value"
    (selectOptionEvent)="onSelect($event)">
  </app-pr-range-level>`;

const mount = (props: Record<string, unknown> = {}, editable = true) => {
  const onSelect = cy.stub().as('select');
  return mountCFHost(FIELD, {
    editable,
    componentProperties: { options: LEVELS, value: null, onSelect, ...props }
  });
};

describe('PrRangeLevelComponent — contract', () => {
  describe('ControlValueAccessor — user input propagates to the model', () => {
    it('[contract] clicking a level writes its optionValue to the bound model', () => {
      mount();
      cy.get('.circle').eq(2).click();
      readHost(h => h.value).should('eq', 2);
    });

    it('[contract] emits selectOptionEvent exactly once per click', () => {
      mount();
      cy.get('.circle').eq(2).click();
      cy.get('@select').should('have.been.calledOnce');
      cy.get('@select').should('have.been.calledWith', 2);
    });

    it('[contract] moving the selection replaces the previous one (exactly one circle active)', () => {
      mount();
      cy.get('.circle').eq(1).click();
      cy.get('.circle').eq(3).click();
      cy.get('.circle.active').should('have.length', 1);
      cy.get('.circle').eq(3).should('have.class', 'active');
      readHost(h => h.value).should('eq', 3);
    });
  });

  describe('ControlValueAccessor — programmatic model change updates the control', () => {
    /**
     * The dominant real path: the section payload lands and the parent assigns
     * `body.innovation_readiness_level_id`. No user interaction happens at all.
     */
    it('[contract] a value assigned by the parent renders the matching circle as active', () => {
      mount();
      cy.get('.circle.active').should('not.exist');

      patchHost(host => (host.value = 2));

      cy.get('.circle').eq(2).should('have.class', 'active');
      cy.get('.circle.active').should('have.length', 1);
    });

    it('[contract] clearing the model from the parent deactivates every circle', () => {
      mount({ value: 2 });
      cy.get('.circle').eq(2).should('have.class', 'active');

      patchHost(host => (host.value = null));

      cy.get('.circle.active').should('not.exist');
    });

    /**
     * Regression-shaped: `onSelectLevel` mutates the DOM IMPERATIVELY
     * (`classList.remove('active')` / `classList.add('active')`) on top of the declarative
     * `[ngClass]="{active: ...}"`. Two writers on the same class is the classic way for a
     * later declarative update to be swallowed, so the "user clicked, THEN the parent reset
     * the section" order is asserted explicitly.
     */
    it('[contract] a parent reset after a user click leaves no stale active circle', () => {
      mount();
      cy.get('.circle').eq(1).click();
      cy.get('.circle').eq(1).should('have.class', 'active');

      patchHost(host => (host.value = null));

      cy.get('.circle.active').should('not.exist');
    });

    it('[contract] a parent-assigned value overrides a previous user selection', () => {
      mount();
      cy.get('.circle').eq(1).click();

      patchHost(host => (host.value = 3));

      cy.get('.circle').eq(3).should('have.class', 'active');
      cy.get('.circle').eq(1).should('not.have.class', 'active');
      cy.get('.circle.active').should('have.length', 1);
    });
  });

  describe('boundary values', () => {
    /**
     * Level 0 is a real, selectable level (`readinessLevelsList` starts at 0) AND it is falsy.
     * Any truthiness-based guard in the render path shows up here.
     */
    it('[contract] the lowest level (id 0, falsy) is selectable and renders as active', () => {
      mount();
      cy.get('.circle').eq(0).click();
      readHost(h => h.value).should('eq', 0);
      cy.get('.circle').eq(0).should('have.class', 'active');
    });

    it('[contract] a parent-assigned 0 renders the lowest level as active', () => {
      mount();
      patchHost(host => (host.value = 0));
      cy.get('.circle').eq(0).should('have.class', 'active');
      cy.get('.circle.active').should('have.length', 1);
    });

    it('[contract] an unset model (null) activates nothing — 0 is a value, null is not', () => {
      mount({ value: null });
      cy.get('.circle.active').should('not.exist');
    });

    it('[contract] the highest level is selectable and renders as active', () => {
      mount();
      cy.get('.circle').last().click();
      readHost(h => h.value).should('eq', LEVELS.length - 1);
      cy.get('.circle').last().should('have.class', 'active');
    });

    it('[contract] a model value outside the option set activates nothing and does not crash', () => {
      mount({ value: 99 });
      cy.get('.circle').should('have.length', LEVELS.length);
      cy.get('.circle.active').should('not.exist');
    });
  });

  describe('async options (every consumer feeds this from an API list)', () => {
    it('[contract] options arriving after mount are rendered', () => {
      mount({ options: [] });
      cy.get('.circle').should('not.exist');

      patchHost(host => (host.options = LEVELS));

      cy.get('.circle').should('have.length', LEVELS.length);
    });

    it('[contract] a model value already set renders as active once the options arrive', () => {
      mount({ options: [], value: 2 });

      patchHost(host => (host.options = LEVELS));

      cy.get('.circle').eq(2).should('have.class', 'active');
    });

    it('[contract] the parent options array is never mutated by the component', () => {
      const source = LEVELS.map(l => ({ ...l }));
      mount({ options: source });

      cy.get('.circle').eq(1).click();
      cy.get('.circle').eq(3).click();

      readHost(h => h.options.length).should('eq', LEVELS.length);
      readHost(h => h.options.map((o: any) => o.id).join(',')).should('eq', '0,1,2,3');
    });
  });

  describe('level detail card (itemTitle / itemDescription — used by all 5 consumers)', () => {
    it('[contract] shows the title and definition of the selected level', () => {
      mount({ value: 2 });
      cy.get('.gray_card .title').should('contain.text', 'Formulation');
      cy.get('.gray_card .description').should('contain.text', 'Concept formulated.');
    });

    it('[contract] shows the hovered level while the pointer is over it', () => {
      mount({ value: 0 });
      cy.get('.circle').eq(3).trigger('mouseenter');
      cy.get('.gray_card .title').should('contain.text', 'Proof of concept');
      cy.get('.gray_card').should('have.class', 'showHoverData');
    });

    it('[contract] returns to the selected level once the pointer leaves', () => {
      mount({ value: 0 });
      cy.get('.circle').eq(3).trigger('mouseenter');
      cy.get('.circle').eq(3).trigger('mouseleave');
      cy.get('.gray_card .title').should('contain.text', 'Idea');
    });

    it('[contract] shows no detail card while nothing is selected and nothing is hovered', () => {
      mount();
      cy.get('.gray_card').should('not.exist');
    });
  });

  describe('edit gates', () => {
    /**
     * `RolesService.readOnly` defaults to TRUE — this is the DEFAULT render in the running app.
     * Behaviour derived from `master` (identical code): the circles stay visible and clicks are
     * swallowed by `onSelectLevel`'s early return. It does NOT hide the control the way
     * `pr-input` / `pr-select` do, so the generic "read-only hides the control" requirement is
     * asserted here in the weaker form the component (and `master`) actually implements:
     * read-only must not let the model change.
     */
    it('[contract] read-only (app default) refuses to change the model', () => {
      mount({ value: null }, /* editable */ false);
      cy.get('.circle').eq(2).click();
      readHost(h => h.value).should('eq', null);
      cy.get('@select').should('not.have.been.called');
    });

    it('[contract] read-only still displays the stored value', () => {
      mount({ value: 2 }, /* editable */ false);
      cy.get('.circle').eq(2).should('have.class', 'active');
      cy.get('.gray_card .title').should('contain.text', 'Formulation');
    });

    it('[contract] [disabled] refuses to change the model and marks the container', () => {
      const onSelect = cy.stub().as('select');
      mountCFHost(
        `<app-pr-range-level optionValue="id" optionLabel="name" [options]="options" [disabled]="true"
                             [(ngModel)]="value" (selectOptionEvent)="onSelect($event)"></app-pr-range-level>`,
        { editable: true, componentProperties: { options: LEVELS, value: null, onSelect } }
      );
      cy.get('.local_container').should('have.class', 'pr-range-level--disabled');
      cy.get('.circle').eq(2).click({ force: true });
      readHost(h => h.value).should('eq', null);
      cy.get('@select').should('not.have.been.called');
    });
  });
});
