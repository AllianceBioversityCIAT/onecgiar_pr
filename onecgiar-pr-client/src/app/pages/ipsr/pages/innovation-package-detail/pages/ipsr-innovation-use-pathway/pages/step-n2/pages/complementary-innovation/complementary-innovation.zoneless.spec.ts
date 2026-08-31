import { Component, Directive, Input, NO_ERRORS_SCHEMA, forwardRef, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { NewComplementaryInnovationComponent } from './components/new-complementary-innovation/new-complementary-innovation.component';
import { ComplementaryInnovationService } from './services/complementary-innovation.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { PrCheckboxValueAccessorDirective } from '../../../../../../../../../../shared/directives/pr-checkbox-value-accessor.directive';

/**
 * No-op ControlValueAccessor. The modal binds `[(ngModel)]` on `custom-fields` controls that are not
 * declared in these TestBeds; with `FormsModule` active, an undeclared element carrying `ngModel` throws
 * "No value accessor for form control". These stubs absorb those bindings so the assertions can focus on
 * the native Function checkboxes.
 */
@Directive()
abstract class StubValueAccessor implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

const stubCva = (component: unknown) => [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => component as never), multi: true }];

@Component({ selector: 'app-pr-input', template: '', standalone: false, providers: stubCva(StubPrInputComponent) })
class StubPrInputComponent extends StubValueAccessor {}

@Component({ selector: 'app-pr-textarea', template: '', standalone: false, providers: stubCva(StubPrTextareaComponent) })
class StubPrTextareaComponent extends StubValueAccessor {}

@Component({ selector: 'app-pr-radio-button', template: '', standalone: false, providers: stubCva(StubPrRadioButtonComponent) })
class StubPrRadioButtonComponent extends StubValueAccessor {}

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * Opening an existing complementary innovation for edit sets `complementaryInnovationService.complementaries`
 * to `false` and back to `true` 100 ms later, inside a `setTimeout` nested in the GETComplementaryById
 * subscribe, so the "Function" checkbox list remounts against the freshly loaded selection. The flag lives on
 * a *service* and is read by a different component's template, so no signal owned by the writer could reach
 * it — the state itself was made signal-backed instead. Before the fix the delayed write notified nothing and
 * the checkbox list stayed blank until reload.
 *
 * This test drives the real `(click)` on the edit icon and asserts on the RENDERED DOM.
 */

@Component({
  selector: 'app-pr-dialog',
  template: '<ng-content></ng-content>',
  standalone: false
})
class StubPrDialogComponent {
  @Input() visible: boolean;
  @Input() modal: boolean;
  @Input() closeOnEscape: boolean;
  @Input() showHeader: boolean;
  @Input() dismissableMask: boolean;
  @Input() styleClass: string;
}

describe('ComplementaryInnovationComponent (zoneless change detection) — function checkboxes', () => {
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;
  let component: ComplementaryInnovationComponent;
  let service: ComplementaryInnovationService;

  const checkboxes = () => fixture.nativeElement.querySelectorAll('input.pr-native-check');
  const editIcon = () => fixture.nativeElement.querySelector('.action_buttons .material-icons-round') as HTMLElement;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    // Precondition only: one selected innovation so the edit icon is on screen. `ngOnInit` reloads this
    // list from the API, so it has to be seeded here rather than on the instance.
    const selectedInnovation = {
      result_id: '10',
      result_code: 'R-10',
      title: 'Innovation',
      initiative_official_code: 'INIT-01',
      result_type_id: 11
    };

    const apiMock = {
      isStepTwoOne: false,
      isStepTwoTwo: false,
      resultsSE: {
        GETInnovationPathwayStepTwoInnovationSelect: () => of({ response: [selectedInnovation] }),
        GETComplementataryInnovationFunctions: () =>
          of({ response: [{ complementary_innovation_functions_id: 1, name: 'Function A' }, { complementary_innovation_functions_id: 2, name: 'Function B' }] }),
        GETinnovationpathwayStepTwo: () => of({ response: [] }),
        GET_resultsLinked: () => of({ response: { links: [] } }),
        GETComplementaryById: () =>
          of({
            response: {
              findResult: { title: 'A complementary innovation', description: 'desc' },
              findResultComplementaryInnovation: {
                short_title: 'short',
                other_funcions: '',
                projects_organizations_working_on_innovation: true,
                specify_projects_organizations: ''
              },
              findComplementaryInnovationFuctions: [{ complementary_innovation_function_id: 1 }]
            }
          })
      },
      rolesSE: { readOnly: false, isAdmin: true, validateInitiative: () => true }
    };

    await TestBed.configureTestingModule({
      declarations: [ComplementaryInnovationComponent, NewComplementaryInnovationComponent, StubPrDialogComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        ComplementaryInnovationService,
        { provide: ApiService, useValue: apiMock },
        { provide: IpsrDataControlService, useValue: { detailData: {}, resultInnovationCode: 'IP-1', resultInnovationPhase: 1 } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ComplementaryInnovationService);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the function checkboxes before anything is edited', () => {
    expect(checkboxes().length).toBe(2);
  });

  it('brings the function checkboxes back after opening an innovation for edit', async () => {
    // Real flow: `(click)="getComplementaryInnovation(result.result_id, result)"` on the edit icon.
    editIcon().click();
    await fixture.whenStable();

    // The subscribe hides the list synchronously so it can remount.
    expect(checkboxes().length).toBe(0);

    await tick(200);

    expect(service.complementaries).toBe(true);
    // The regression: the flag flipped back but the checkbox list stayed off the screen.
    expect(checkboxes().length).toBe(2);
  }, 15000);
});

/**
 * P2-3529 — the saved "Function" checkboxes must come back CHECKED when the entry is reopened for edit.
 *
 * QA's evidence was `input.checked === false` on every Function checkbox after reopening, while Short
 * title / Long title / Description on the same modal reloaded fine. Root cause: the group binds
 * `[value]="subItem"` against the objects in `cols`, and `prCheckboxValue` resolves membership with
 * `indexOf` — REFERENCE equality for objects (`shared/directives/pr-checkbox-value-accessor.directive.ts:61`),
 * where the PrimeNG `p-checkbox` it replaced used deep equality. `getComplementaryInnovation()` was
 * rehydrating with freshly built literals, so nothing ever matched.
 *
 * The suite above (P2-3322) runs with `NO_ERRORS_SCHEMA` and no `FormsModule`, so `[(ngModel)]` is inert
 * there and `checked` is always false — it can only count checkboxes. This TestBed wires the real
 * `FormsModule` + the real value accessor and stubs the remaining `custom-fields` controls with a no-op
 * CVA, so the assertion is on the rendered `input.checked`, exactly what QA inspected.
 */
describe('ComplementaryInnovationComponent — P2-3529 function checkboxes rehydrate as checked', () => {
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;
  let component: ComplementaryInnovationComponent;

  const functionCheckboxes = () =>
    Array.from(fixture.nativeElement.querySelectorAll('input.pr-native-check')) as HTMLInputElement[];

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const selectedInnovation = {
      result_id: '10',
      result_code: 'R-10',
      title: 'Innovation',
      initiative_official_code: 'INIT-01',
      result_type_id: 11
    };

    const apiMock = {
      isStepTwoOne: false,
      isStepTwoTwo: false,
      resultsSE: {
        GETInnovationPathwayStepTwoInnovationSelect: () => of({ response: [selectedInnovation] }),
        GETComplementataryInnovationFunctions: () =>
          of({
            response: [
              { complementary_innovation_functions_id: 1, name: 'Improves beneficiary/user awareness of the core innovation' },
              {
                complementary_innovation_functions_id: 2,
                name: 'Improves gender equality and social inclusion related to scaling the core innovation'
              },
              { complementary_innovation_functions_id: 3, name: 'Function C' }
            ]
          }),
        GETinnovationpathwayStepTwo: () => of({ response: [] }),
        GET_resultsLinked: () => of({ response: { links: [] } }),
        // The two functions QA checked and saved.
        GETComplementaryById: () =>
          of({
            response: {
              findResult: { title: 'A complementary innovation', description: 'desc' },
              findResultComplementaryInnovation: {
                short_title: 'short',
                other_funcions: '',
                projects_organizations_working_on_innovation: true,
                specify_projects_organizations: ''
              },
              findComplementaryInnovationFuctions: [
                { complementary_innovation_function_id: 1 },
                { complementary_innovation_function_id: 2 }
              ]
            }
          })
      },
      rolesSE: { readOnly: false, isAdmin: true, validateInitiative: () => true }
    };

    await TestBed.configureTestingModule({
      declarations: [
        ComplementaryInnovationComponent,
        NewComplementaryInnovationComponent,
        StubPrDialogComponent,
        PrCheckboxValueAccessorDirective,
        StubPrInputComponent,
        StubPrTextareaComponent,
        StubPrRadioButtonComponent
      ],
      imports: [CommonModule, FormsModule],
      providers: [
        provideZonelessChangeDetection(),
        ComplementaryInnovationService,
        { provide: ApiService, useValue: apiMock },
        { provide: IpsrDataControlService, useValue: { detailData: {}, resultInnovationCode: 'IP-1', resultInnovationPhase: 1 } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the two saved functions as checked, and the unsaved one as unchecked', async () => {
    (fixture.nativeElement.querySelector('.action_buttons .material-icons-round') as HTMLElement).click();
    await fixture.whenStable();
    await tick(200);

    const boxes = functionCheckboxes();
    expect(boxes.length).toBe(3);

    const checkedById = boxes.reduce<Record<string, boolean>>((acc, box) => {
      acc[box.id] = box.checked;
      return acc;
    }, {});

    expect(checkedById).toEqual({ checkbox1: true, checkbox2: true, checkbox3: false });
  }, 15000);

  it('rehydrates with the SAME object references the checkbox group is bound to', () => {
    // The invariant `prCheckboxValue.indexOf` depends on. A structurally equal literal passes `toEqual`
    // and still renders unchecked — only reference identity keeps the box ticked.
    (fixture.nativeElement.querySelector('.action_buttons .material-icons-round') as HTMLElement).click();

    const selected = component.complementaryInnovationService.bodyNewComplementaryInnovation.complementaryFunctions;
    const options = component.cols.flat();

    expect(selected.length).toBe(2);
    expect(selected[0]).toBe(options.find(o => o.complementary_innovation_functions_id === 1));
    expect(selected[1]).toBe(options.find(o => o.complementary_innovation_functions_id === 2));
  });
});
