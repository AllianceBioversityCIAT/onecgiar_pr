import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { StepTwoBasicInfoComponent } from './step-two-basic-info.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { PrCheckboxValueAccessorDirective } from '../../../../../../../../../../shared/directives/pr-checkbox-value-accessor.directive';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * Ticking an enabler type runs `selectedOneLevel()` / `selectedTwo()`, which cascade the selection and then
 * toggle `update` `false -> setTimeout -> true` so the checkbox list remounts with the new model. As a plain
 * field the delayed write notified nothing, so under zoneless change detection the whole checkbox list
 * (`*ngIf="update == true"`) vanished on the first click and only came back on reload. The flag is a
 * component field, so it was made signal-backed.
 *
 * This test ticks a real checkbox and asserts on the RENDERED DOM, not on the flag.
 */
describe('StepTwoBasicInfoComponent (zoneless change detection) — enabler checkboxes', () => {
  let component: StepTwoBasicInfoComponent;
  let fixture: ComponentFixture<StepTwoBasicInfoComponent>;

  const checkboxes = () => fixture.nativeElement.querySelectorAll('input.pr-native-check') as NodeListOf<HTMLInputElement>;

  const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const apiMock = {
      isStepTwoOne: false,
      isStepTwoTwo: false,
      resultsSE: {
        getStepTwoComentariesInnovationId: () =>
          of({
            response: {
              results: [
                {
                  result_by_innovation_package_id: 'RBIP-1',
                  title: 'An innovation',
                  complementary_enablers_one: null,
                  complementary_enablers_two: null
                }
              ]
            }
          }),
        getStepTwoComentariesInnovation: () =>
          of({
            response: {
              comentaryPrincipals: [
                {
                  group: 'Group A',
                  subCategories: [
                    {
                      complementary_innovation_enabler_types_id: 1,
                      group: 'Parent enabler',
                      subCategories: [{ complementary_innovation_enabler_types_id: 11, group: 'Child enabler' }]
                    }
                  ]
                }
              ]
            }
          }),
        PostStepTwoComentariesInnovation: () => of({}),
        PostStepTwoComentariesInnovationPrevius: () => of({})
      },
      rolesSE: { readOnly: false, isAdmin: true }
    };

    await TestBed.configureTestingModule({
      declarations: [StepTwoBasicInfoComponent, PrCheckboxValueAccessorDirective],
      imports: [CommonModule, FormsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: IpsrDataControlService, useValue: { resultInnovationCode: 'IP-1', resultInnovationPhase: 1 } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepTwoBasicInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the parent and child enabler checkboxes', () => {
    expect(component.update).toBe(true);
    expect(checkboxes().length).toBe(2);
  });

  it('brings the checkbox list back after ticking a parent enabler', async () => {
    // Real flow: the checkbox `change` goes through prCheckboxValue -> ngModel -> the template's
    // `(ngModelChange)="selectedOneLevel(category, i, 1)"`.
    const parent = checkboxes()[0];
    parent.checked = true;
    parent.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    // The remount hides the list synchronously — the listener itself schedules that pass.
    expect(checkboxes().length).toBe(0);

    await wait(600);

    expect(component.update).toBe(true);
    // The regression: the flag flipped back but the enabler checkboxes never returned.
    expect(checkboxes().length).toBe(2);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_two).toContain(11);
  }, 15000);
});
