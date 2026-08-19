import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { StepN3CurrentUseComponent } from './step-n3-current-use.component';
import { IpsrStep3Body } from '../../model/Ipsr-step-3-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

/**
 * P2-3322 — zoneless change detection regression guard. Twin of the InnovationUseFormComponent case:
 * `validateYouth()` writes the clamped values and the "showWomenExplanation<gender>" flag onto the external
 * `body.innovatonUse.actors[i]` object from inside timers (1000 ms here), so nothing notified the scheduler
 * and the warning never reached the screen. Drives the real `(ngModelChange)` listener and asserts on the
 * rendered DOM.
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

describe('StepN3CurrentUseComponent (zoneless change detection) — validateYouth', () => {
  let fixture: ComponentFixture<StepN3CurrentUseComponent>;
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
        GETInstitutionsTypeTree: () => of({ response: [] })
      },
      rolesSE: { readOnly: false }
    };

    await TestBed.configureTestingModule({
      declarations: [StepN3CurrentUseComponent, StubPrInputComponent],
      imports: [CommonModule],
      providers: [provideZonelessChangeDetection(), { provide: ApiService, useValue: apiMock }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3CurrentUseComponent);

    actor = {
      is_active: true,
      result_ip_actors_id: 1,
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

    const body = new IpsrStep3Body();
    body.innovatonUse.actors = [actor];
    fixture.componentInstance.body = body;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the actor row with no warning to start with', () => {
    expect(inputByLabel('Women')).toBeTruthy();
    expect(warningEl()).toBeFalsy();
  });

  it('paints the warning and the rolled-back Youth value once the clamp timer fires', async () => {
    // Real flow: `(ngModelChange)="validateYouth(i,true,actorItem)"` on the Youth <app-pr-input>.
    inputByLabel('Youth').componentInstance.ngModelChange.emit(9);
    await fixture.whenStable();

    expect(warningEl()).toBeFalsy();

    await tick(1050);

    expect(actor.showWomenExplanationwomen).toBe(true);
    // The regression: the flags flipped but the view stayed frozen.
    expect(warningEl()).toBeTruthy();
    expect(inputByLabel('Youth').nativeElement.querySelector('.stub-input').value).toBe('2');
  }, 15000);

  it('clears the warning from the screen three seconds later', async () => {
    inputByLabel('Youth').componentInstance.ngModelChange.emit(9);
    await fixture.whenStable();

    await tick(1050);
    expect(warningEl()).toBeTruthy();

    await tick(3000);

    expect(actor.showWomenExplanationwomen).toBe(false);
    expect(warningEl()).toBeFalsy();
  }, 15000);
});
