import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { InnovationUseFormComponent } from './innovation-use-form.component';
import { ApiService } from '../../services/api/api.service';
import { TerminologyService } from '../../../internationalization/terminology.service';
import { FieldsManagerService } from '../../services/fields-manager.service';
import { InnovationControlListService } from '../../services/global/innovation-control-list.service';
import { IpsrStep1Body } from '../../../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `validateYouth()` clamps the Women/Men vs Youth pair and shows the "value of Youth cannot be greater than
 * total of Women" warning from inside a chain of `setTimeout`s. Every one of those writes lands on
 * `body.innovatonUse.actors[i]`, an external object, under a key built at runtime
 * (`'showWomenExplanation' + gender`), so it cannot be made signal-backed the way P2-3245 / P2-3275 were.
 * Before the fix those delayed writes notified no scheduler, so no render pass followed: the warning never
 * appeared, never disappeared, and the auto-calculated Non-youth field never refreshed.
 *
 * These tests drive the real template listener `(ngModelChange)="validateYouth(i, true, actorItem)"` and
 * assert on the RENDERED DOM, not on the flag. They fail if the `markForCheck()` calls are removed.
 */

@Component({
  selector: 'app-pr-input',
  template: '<input class="stub-input" [attr.data-label]="label" [value]="ngModel ?? \'\'" />',
  standalone: false
})
class StubPrInputComponent {
  @Input() label: string;
  @Input() type: string;
  @Input() placeholder: string;
  @Input() description: string;
  @Input() required: boolean;
  @Input() readOnly: boolean;
  @Input() disabled: boolean;
  @Input() noDataText: string;
  @Input() ngModel: any;
  @Output() ngModelChange = new EventEmitter<any>();
}

describe('InnovationUseFormComponent (zoneless change detection) — validateYouth', () => {
  let component: InnovationUseFormComponent;
  let fixture: ComponentFixture<InnovationUseFormComponent>;
  let actor: any;

  const warningEl = () => fixture.nativeElement.querySelector('.explanation_message');
  const inputByLabel = (label: string) =>
    fixture.debugElement.queryAll(q => q.componentInstance instanceof StubPrInputComponent).find(de => de.componentInstance.label === label);

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const apiMock = {
      resultsSE: {
        GETAllActorsTypes: () => of({ response: [] }),
        GETInstitutionsTypeTree: () => of({ response: [] }),
        currentResultCode: 'R-1',
        currentResultPhase: 1
      },
      rolesSE: { readOnly: false }
    };

    await TestBed.configureTestingModule({
      declarations: [InnovationUseFormComponent, StubPrInputComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: TerminologyService, useValue: { t: () => 'term' } },
        {
          provide: FieldsManagerService,
          // P2-3537 §7: the template calls the age-fallback gate on every render, so a mock
          // without it throws before any assertion runs.
          useValue: { isP25: () => false, isInnovationUse2030Projection2026: () => false, isInnovationUseAgeFallback2026: () => false }
        },
        { provide: InnovationControlListService, useValue: { readinessLevelsList: [] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseFormComponent);
    component = fixture.componentInstance;

    actor = {
      is_active: true,
      result_actors_id: 1,
      actor_type_id: 1,
      sex_and_age_disaggregation: false,
      women: 5,
      women_youth: 2,
      women_non_youth: 3,
      previousWomen: 5,
      previousWomen_youth: 2,
      men: 0,
      men_youth: 0,
      how_many: 5
    };

    const body = new IpsrStep1Body();
    body.innovatonUse.actors = [actor];
    component.body = body;
    component.saving = false;
    component.isIpsr = false;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the actor row with no warning to start with', () => {
    expect(inputByLabel('Women')).toBeTruthy();
    expect(warningEl()).toBeFalsy();
  });

  it('paints the "Youth cannot be greater than Women" warning once the clamp timer fires', async () => {
    // Real flow: typing a Youth value above the Women total on the Youth <app-pr-input>.
    inputByLabel('Youth').componentInstance.ngModelChange.emit(9);
    await fixture.whenStable();

    // Nothing is shown synchronously — the whole reaction lives inside the 500 ms timer.
    expect(warningEl()).toBeFalsy();

    await tick(700);

    expect(actor.showWomenExplanationwomen).toBe(true);
    // The regression: the flag flipped but the view stayed frozen with no warning on screen.
    expect(warningEl()).toBeTruthy();
    expect(warningEl().textContent).toContain('Youth cannot be greater than total of Women');
  }, 15000);

  it('repaints the clamped Women / Youth values after the timer restores them', async () => {
    inputByLabel('Youth').componentInstance.ngModelChange.emit(9);
    await fixture.whenStable();

    await tick(700);

    // The clamp rolled Youth back to the previous valid value; the input must show it again.
    expect(actor.women_youth).toBe(2);
    expect(inputByLabel('Youth').nativeElement.querySelector('.stub-input').value).toBe('2');
  }, 15000);

  it('clears the warning from the screen three seconds later', async () => {
    inputByLabel('Youth').componentInstance.ngModelChange.emit(9);
    await fixture.whenStable();

    await tick(700);
    expect(warningEl()).toBeTruthy();

    await tick(3000);

    expect(actor.showWomenExplanationwomen).toBe(false);
    // The regression the users reported: the warning stayed on screen until reload.
    expect(warningEl()).toBeFalsy();
  }, 15000);
});
