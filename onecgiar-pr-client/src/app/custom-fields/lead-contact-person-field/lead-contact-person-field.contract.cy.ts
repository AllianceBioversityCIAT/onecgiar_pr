import { UserSearchService } from '../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { mountCFHost, patchHost, readHost } from '../../../../cypress/support/ct-utils';

/**
 * CONTRACT tests for `app-lead-contact-person-field` (2 consuming templates:
 * `rd-general-information` and the ToC/general-info modal variant).
 *
 * Source of truth
 * ---------------
 * `master` for the component class — `lead-contact-person-field.component.ts` is IDENTICAL
 * there. The ONLY diff in the folder is the template's outer wrapper:
 *
 *   master:  <app-pr-field-header [label] [description] [required] [useColon]>  … control …
 *   here:    <app-field-card [label] [description] [required] [hasValue]>       … control …
 *
 * So the header contract is asserted against the NEW surface (`app-field-card`) while the
 * behaviour it must express — "labelled, marked mandatory/optional, and marked filled once a
 * contact is chosen" — is `master`'s.
 *
 * Model contract
 * --------------
 * This field does NOT use `ngModel`. It receives the parent's payload object by reference:
 *
 *   <app-lead-contact-person-field [body]="generalInfoBody" [required]="true">
 *
 * and writes `body.lead_contact_person` / `body.lead_contact_person_data` back into that same
 * object. Those two keys are what gets PATCHed on save, so "the parent object is updated" is
 * the equivalent of the CVA both-directions contract for this component and is asserted through
 * `readHost` on the host's own `body`.
 *
 * NOT asserted here: the `.pr-input.mandatory` submission-scan contract. The component
 * deliberately opts out — it passes `[required]="false"` and `[lockRequiredFromFieldManager]`
 * to its inner `app-pr-input`, with the in-code comment "P25: show required asterisk without
 * using `.pr-input.mandatory` scan on free-text search". Asserting the scan here would file a
 * defect against a documented decision.
 *
 * Also NOT asserted: the live Active-Directory search. It debounces 500 ms and calls
 * `GET /ad-users/search`; CT has no network. Left to E2E, per the design's scope.
 */

const FIELD = `<app-lead-contact-person-field [body]="body" [required]="required"></app-lead-contact-person-field>`;

const SELECTED_USER = { display_name: 'Jane Doe', mail: 'jane.doe@cgiar.org', title: 'Researcher' };

const prefilledBody = () => ({
  lead_contact_person: 'Jane Doe',
  lead_contact_person_data: { ...SELECTED_USER }
});

const mount = (props: Record<string, unknown> = {}, editable = true) =>
  mountCFHost(FIELD, {
    editable,
    componentProperties: { body: { lead_contact_person: null, lead_contact_person_data: null }, required: true, ...props }
  });

describe('LeadContactPersonFieldComponent — contract', () => {
  describe('field header (now rendered through app-field-card)', () => {
    it('[contract] tags the field as Mandatory when the consumer requires it', () => {
      mount({ required: true });
      cy.get('.fch_tag').should('have.text', 'Mandatory');
    });

    it('[contract] tags the field as Optional when the consumer does not', () => {
      mount({ required: false });
      cy.get('.fch_tag').should('have.text', 'Optional');
    });

    it('[contract] shows the field as filled once a contact is locked in', () => {
      mount({ body: prefilledBody() });
      cy.get('.field_card').should('have.class', 'fc-done');
    });
  });

  describe('a contact already stored on the result', () => {
    it('[contract] renders the stored contact locked, with name, mail and title', () => {
      mount({ body: prefilledBody() });
      cy.get('.selected-user-name').should('contain.text', 'Jane Doe');
      cy.get('.selected-user-info').should('contain.text', 'jane.doe@cgiar.org').and('contain.text', 'Researcher');
    });

    it('[contract] offers a way to clear the stored contact', () => {
      mount({ body: prefilledBody() });
      cy.get('.clear-contact-btn').should('exist');
    });

    it('[contract] does not let the locked contact be typed over', () => {
      mount({ body: prefilledBody() });
      cy.get('input').should('be.disabled');
    });

    it('[contract] offers no clear affordance while nothing is selected', () => {
      mount();
      cy.get('.clear-contact-btn').should('not.exist');
      cy.get('.selected-contact-info').should('not.exist');
    });
  });

  describe('clearing writes back to the parent payload', () => {
    it('[contract] clearing removes the contact from the UI', () => {
      mount({ body: prefilledBody() });
      cy.get('.clear-contact-btn').click();
      cy.get('.selected-contact-info').should('not.exist');
      cy.get('.clear-contact-btn').should('not.exist');
    });

    it('[contract] clearing nulls BOTH payload keys on the parent object (this is what gets saved)', () => {
      mount({ body: prefilledBody() });
      cy.get('.clear-contact-btn').click();

      readHost(h => h.body.lead_contact_person).should('eq', null);
      readHost(h => h.body.lead_contact_person_data).should('eq', null);
    });

    it('[contract] clearing re-enables the search input', () => {
      mount({ body: prefilledBody() });
      cy.get('.clear-contact-btn').click();
      cy.get('input').should('not.be.disabled').and('have.value', '');
    });
  });

  describe('the parent replacing the payload (section reload / phase switch)', () => {
    it('[contract] adopts a contact that arrives with a new payload object', () => {
      mount();
      cy.get('.selected-contact-info').should('not.exist');

      patchHost(host => (host.body = prefilledBody()));

      cy.get('.selected-user-name').should('contain.text', 'Jane Doe');
    });

    it('[contract] drops the previous contact when an empty payload arrives', () => {
      mount({ body: prefilledBody() });
      cy.get('.selected-user-name').should('contain.text', 'Jane Doe');

      patchHost(host => (host.body = { lead_contact_person: null, lead_contact_person_data: null }));

      cy.get('.selected-contact-info').should('not.exist');
      cy.get('input').should('have.value', '');
    });
  });

  describe('read-only (RolesService.readOnly defaults to true — the app default render)', () => {
    it('[contract] exposes no editable input to a read-only user', () => {
      mount({ body: prefilledBody() }, /* editable */ false);
      cy.get('app-lead-contact-person-field input').should('not.exist');
    });

    it('[contract] still shows the stored contact to a read-only user', () => {
      mount({ body: prefilledBody() }, /* editable */ false);
      cy.get('app-lead-contact-person-field').should('contain.text', 'Jane Doe');
    });
  });

  describe('invalid free text (no network involved)', () => {
    it('[contract] warns when the typed name was not found in the directory', () => {
      mount();

      cy.get('@ctWrapper').then((w: any) => {
        w.fixture.autoDetectChanges(true);
        w.fixture.ngZone.run(() => {
          const search = w.fixture.debugElement.injector.get(UserSearchService);
          search.searchQuery = 'Someone Unknown';
          search.showContactError = true;
          search.hasValidContact = false;
        });
      });

      cy.get('.contact-error-message').should('contain.text', 'not found in the directory');
    });

    it('[contract] marks the field as not filled while the contact is invalid', () => {
      mount();

      cy.get('@ctWrapper').then((w: any) => {
        w.fixture.autoDetectChanges(true);
        w.fixture.ngZone.run(() => {
          const search = w.fixture.debugElement.injector.get(UserSearchService);
          search.hasValidContact = false;
        });
      });

      cy.get('.field_card').should('not.have.class', 'fc-done');
    });
  });
});
