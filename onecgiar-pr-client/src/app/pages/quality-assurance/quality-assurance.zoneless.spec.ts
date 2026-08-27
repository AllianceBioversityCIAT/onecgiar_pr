import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { QualityAssuranceComponent } from './quality-assurance.component';
import { QualityAssuranceService } from './quality-assurance.service';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `selectOptionEvent()` hides the QA iframe, fetches the CLARISA token and re-shows the iframe inside a
 * `setTimeout(100)`. As a plain field that delayed write notified nothing, so the iframe never rendered and
 * the page stayed on the "Select an Initiative to display the content" placeholder until a reload.
 * These tests assert on the RENDERED DOM, not on the flag.
 */

@Component({
  selector: 'app-pr-select',
  template: '<button type="button" class="stub-select" (click)="ngModelChange.emit(nextValue)">select</button>',
  standalone: false
})
class StubPrSelectComponent {
  @Input() label: string;
  @Input() options: any[];
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() placeholder: string;
  @Input() inlineStylesContainer: string;
  @Input() required: boolean;
  @Input() ngModel: any;
  @Output() ngModelChange = new EventEmitter<any>();
  nextValue: any = 'INIT-02';
}

describe('QualityAssuranceComponent (zoneless change detection)', () => {
  let fixture: ComponentFixture<QualityAssuranceComponent>;

  const iframeBlockEl = () => fixture.nativeElement.querySelector('.iframe_container');
  const selectStub = () => fixture.nativeElement.querySelector('.stub-select') as HTMLButtonElement;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const initiatives = [
      { official_code: 'INIT-01', initiative_id: 1, full_name: 'Initiative 1' },
      { official_code: 'INIT-02', initiative_id: 2, full_name: 'Initiative 2' }
    ];

    const apiMock = {
      rolesSE: { isAdmin: false, validateReadOnly: jest.fn() },
      dataControlSE: {
        myInitiativesListReportingByPortfolio: initiatives,
        detailSectionTitle: jest.fn(),
        getCurrentPhases: () => of({ response: [] }),
        reportingCurrentPhase: { portfolioAcronym: 'P25' },
        show_qa_full_screen: false
      },
      resultsSE: {
        GET_AllInitiatives: () => of({ response: initiatives }),
        GET_ClarisaQaToken: () => of({ response: { token: 'a-token' } })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [QualityAssuranceComponent, StubPrSelectComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: QualityAssuranceService, useValue: {} },
        { provide: ResultLevelService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QualityAssuranceComponent);
  });

  it('renders the QA iframe once the token resolves on first load', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // The iframe is gated until the token arrives and the deferred re-show fires.
    expect(iframeBlockEl()).toBeFalsy();

    await tick(150);

    expect(iframeBlockEl()).toBeTruthy();
  });

  it('re-renders the QA iframe after the user picks another entity', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await tick(150);

    expect(iframeBlockEl()).toBeTruthy();

    // Real flow: `(ngModelChange)="selectOptionEvent($event)"` on the entity <app-pr-select>.
    selectStub().click();
    await fixture.whenStable();

    expect(iframeBlockEl()).toBeFalsy();

    await tick(150);

    expect(iframeBlockEl()).toBeTruthy();
  });
});
