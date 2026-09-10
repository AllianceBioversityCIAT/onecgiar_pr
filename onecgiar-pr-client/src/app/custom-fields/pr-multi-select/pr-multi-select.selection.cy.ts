import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RolesService } from '../../shared/services/global/roles.service';
import { CustomFieldsModule } from '../custom-fields.module';

/**
 * Selection-accumulation guard — P2-3306 / P2-3307 / P2-3308 / P2-3309.
 *
 * Users reported that the "Contributing …" dropdowns lost or toggled previous selections and
 * showed no chips. None of it reproduced (verified 2026-08-26 in the real screen too:
 * result-framework-reporting → entity-details/SP02 → AoW → "Report result"). These tests exist so
 * a future refactor cannot silently reintroduce it, and they cover the two things Jest cannot:
 * the `:focus-within` dropdown panel and the CDK virtual-scroll viewport, which jsdom never lays
 * out (`repro-p2-3308.spec.ts` therefore exercises `onSelectOption` directly, not the DOM).
 *
 * Both consumer binding shapes are covered on purpose:
 *   - two-way `[(ngModel)]="array"`            (rd-contributors-and-partners)
 *   - one-way `[ngModel]="sig()"` + `.set()`   (aow-hlo-create-modal, section-contributors)
 */

const OPTIONS = [
  { code: 'C1', full_name: 'Center 1' },
  { code: 'C2', full_name: 'Center 2' },
  { code: 'C3', full_name: 'Center 3' }
];

function mountTpl(template: string, props: any) {
  return cy
    .mount(template, {
      imports: [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [provideRouter([])],
      componentProperties: props
    })
    .then(wrapper => {
      // `RolesService.readOnly` defaults to TRUE, which hides the interactive trigger.
      const roles = wrapper.fixture.debugElement.injector.get(RolesService);
      roles.readOnly = false;
      wrapper.fixture.detectChanges();
      return cy.wrap(wrapper, { log: false });
    });
}

/** The `.options` panel is revealed by CSS `:focus-within` on the trigger. */
function openDropdown() {
  cy.get('.custom_select .field').should('exist').focus();
  cy.get('.custom_select .field .options').should('be.visible');
}

const checkbox = (label: string) => cy.contains('.options .option', label).find('input[type="checkbox"]');
const rowLabel = (label: string) => cy.contains('.options .option', label).find('.label');

const allThreeChecked = () => {
  checkbox('Center 1').should('be.checked');
  checkbox('Center 2').should('be.checked');
  checkbox('Center 3').should('be.checked');
};

describe('PrMultiSelect — selections accumulate (P2-3306 / P2-3307 / P2-3308)', () => {
  const TPL_TWO_WAY = `
    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name"
      placeholder="Select" label="Centers" selectedLabel="Selected" selectedOptionLabel="full_name"
      [(ngModel)]="model"></app-pr-multi-select>`;

  const TPL_SIGNAL = `
    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name"
      placeholder="Select" label="Centers" selectedLabel="Selected" selectedOptionLabel="full_name"
      [ngModel]="sig()" (ngModelChange)="sig.set($event)"></app-pr-multi-select>`;

  it('three CHECKBOX clicks — two-way [(ngModel)]', () => {
    mountTpl(TPL_TWO_WAY, { options: OPTIONS, model: [] });
    openDropdown();
    checkbox('Center 1').click();
    checkbox('Center 2').click();
    checkbox('Center 3').click();
    allThreeChecked();
  });

  it('three LABEL clicks — two-way [(ngModel)]', () => {
    mountTpl(TPL_TWO_WAY, { options: OPTIONS, model: [] });
    openDropdown();
    rowLabel('Center 1').click();
    rowLabel('Center 2').click();
    rowLabel('Center 3').click();
    allThreeChecked();
  });

  it('three CHECKBOX clicks — signal + one-way [ngModel]', () => {
    mountTpl(TPL_SIGNAL, { options: OPTIONS, sig: signal<any[]>([]) });
    openDropdown();
    checkbox('Center 1').click();
    checkbox('Center 2').click();
    checkbox('Center 3').click();
    allThreeChecked();
  });

  it('three LABEL clicks — signal + one-way [ngModel]', () => {
    mountTpl(TPL_SIGNAL, { options: OPTIONS, sig: signal<any[]>([]) });
    openDropdown();
    rowLabel('Center 1').click();
    rowLabel('Center 2').click();
    rowLabel('Center 3').click();
    allThreeChecked();
  });
});

describe('PrMultiSelect — preloaded value + "Other(s)" sentinel (P2-3306)', () => {
  // Mirrors aow-hlo-create-modal / rd-contributors-and-partners: dropdown 1 is the ToC centers
  // plus a sentinel row whose selection reveals the "Other(s)" dropdown. The report was that
  // picking the sentinel wiped the preloaded center.
  const SENTINEL = { code: '__OTHER_CENTERS__', full_name: '<strong>Other(s) CGIAR Centers</strong>' };
  const TPL = `
    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name"
      placeholder="Select" label="Centers" selectedLabel="Selected"
      [ngModel]="sig()" (ngModelChange)="sig.set($event)"></app-pr-multi-select>`;

  it('picking Other(s) keeps the preloaded center checked', () => {
    mountTpl(TPL, { options: [...OPTIONS, SENTINEL], sig: signal<any[]>([{ code: 'C1', full_name: 'Center 1' }]) });
    openDropdown();
    checkbox('Center 1').should('be.checked');

    rowLabel('Other(s) CGIAR Centers').click();

    checkbox('Center 1').should('be.checked');
    checkbox('Other(s) CGIAR Centers').should('be.checked');
  });
});

describe('PrMultiSelect — built-in chips strip (P2-3309)', () => {
  const tpl = (extra: string) => `
    <app-pr-multi-select [options]="options" optionValue="code" optionLabel="full_name"
      placeholder="Select" label="Centers" selectedLabel="Center(s) selected" ${extra}
      [ngModel]="sig()" (ngModelChange)="sig.set($event)"></app-pr-multi-select>`;

  it('renders one chip per selected value when selectedOptionLabel is set', () => {
    mountTpl(tpl('selectedOptionLabel="full_name"'), {
      options: OPTIONS,
      sig: signal<any[]>([{ code: 'C1', full_name: 'Center 1' }])
    });
    cy.get('.chips_container .pr_chip_selected').should('have.length', 1).should('contain.text', 'Center 1');
  });

  // ⚠️ Documented gate, NOT a wish: `pr-multi-select.component.html:61` hides the whole chips
  // strip unless `selectedOptionLabel` is bound. 10 of the 80 instances pass `selectedLabel`
  // without it — and every one of them paints its OWN chip strip right below the field, so
  // dropping the gate would render each chip twice. Any change here has to clean up those
  // consumers first; see this folder's CLAUDE.md.
  it('renders NO chips without selectedOptionLabel (consumer supplies its own strip)', () => {
    mountTpl(tpl(''), { options: OPTIONS, sig: signal<any[]>([{ code: 'C1', full_name: 'Center 1' }]) });
    cy.get('.selected_container').should('exist').and('contain.text', 'Center(s) selected (1)');
    cy.get('.chips_container').should('not.exist');
  });
});
