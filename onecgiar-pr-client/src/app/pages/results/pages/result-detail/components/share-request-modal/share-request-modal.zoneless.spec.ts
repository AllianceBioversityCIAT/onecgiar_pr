import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ShareRequestModalComponent } from './share-request-modal.component';
import { ShareRequestModalService } from './share-request-modal.service';
import { ShareRequestBody } from './model/shareRequestBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { RetrieveModalService } from '../retrieve-modal/retrieve-modal.service';
import { ResultsNotificationsService } from '../../../results-outlet/pages/results-notifications/results-notifications.service';
import { RdTheoryOfChangesServicesService } from '../../pages/rd-theory-of-change/rd-theory-of-changes-services.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `showForm` and `tocConsumed` are toggled `false -> setTimeout -> true` to force a remount. Before the fix
 * they were plain fields, so the delayed write notified nothing and the dialog stayed painted on `false`.
 * These tests drive the real template bindings and assert on the RENDERED DOM, not on the flags.
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
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onHide = new EventEmitter<void>();
}

@Component({
  selector: 'app-pr-yes-or-not',
  template: '<button type="button" class="stub-yes-or-not" (click)="selectOptionEvent.emit(true)">yes</button>',
  standalone: false
})
class StubPrYesOrNotComponent {
  @Input() label: string;
  @Input() editable: boolean;
  @Input() required: boolean;
  @Input() hideOptions: boolean;
  @Output() selectOptionEvent = new EventEmitter<boolean>();
}

describe('ShareRequestModalComponent (zoneless change detection)', () => {
  let component: ShareRequestModalComponent;
  let fixture: ComponentFixture<ShareRequestModalComponent>;
  let shareRequestModalSE: any;

  const formEl = () => fixture.nativeElement.querySelector('.modal_container');
  const tocBlockEl = () => fixture.nativeElement.querySelector('app-cp-multiple-wps');
  const dialogStub = () => fixture.debugElement.children[0].componentInstance as StubPrDialogComponent;

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const currentResult = {
      id: 1,
      result_code: 'R-1',
      result_level_id: 3,
      result_type_id: 5,
      result_type: 'Capacity sharing',
      title: 'A result',
      submitter: 'INIT-01',
      source_name: 'W1/W2',
      portfolio: 'P25'
    };

    const apiMock = {
      resultsSE: {
        GET_AllInitiatives: () => of({ response: [{ initiative_id: 1, official_code: 'INIT-02', full_name: 'Initiative 2' }] }),
        POST_createRequest: () => of({ response: [] }),
        PATCH_updateRequest: () => of({ response: [] }),
        ipsrDataControlSE: { inIpsr: false }
      },
      alertsFe: { show: jest.fn() },
      dataControlSE: {
        showShareRequest: true,
        inNotifications: false,
        currentResult,
        currentResultSignal: signal(currentResult),
        reportingCurrentPhase: { portfolioId: 1 },
        myInitiativesList: []
      },
      rolesSE: { isAdmin: true, platformIsClosed: false }
    };

    shareRequestModalSE = { shareRequestBody: new ShareRequestBody() };

    await TestBed.configureTestingModule({
      declarations: [ShareRequestModalComponent, StubPrDialogComponent, StubPrYesOrNotComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: ShareRequestModalService, useValue: shareRequestModalSE },
        { provide: RetrieveModalService, useValue: {} },
        { provide: RolesService, useValue: { validateInitiative: () => true, isAdmin: true } },
        { provide: ResultsNotificationsService, useValue: { get_section_information: jest.fn(), get_section_innovation_packages: jest.fn() } },
        { provide: RdTheoryOfChangesServicesService, useValue: {} },
        {
          provide: FieldsManagerService,
          useValue: { isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ShareRequestModalComponent);
    component = fixture.componentInstance;
  });

  it('repaints the request form after the dialog is closed and cleanObject() remounts it', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(formEl()).toBeTruthy();

    // Real flow: `(onHide)="cleanObject()"` on <app-pr-dialog>.
    dialogStub().onHide.emit();
    await fixture.whenStable();

    // The toggle hides the form synchronously before re-showing it.
    expect(formEl()).toBeFalsy();

    await tick(50);

    expect(component.showForm).toBe(true);
    expect(formEl()).toBeTruthy();
  });

  it('repaints the ToC block after answering the planned-result question', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    // `ngOnInit` installs a fresh ShareRequestBody, so the precondition (question answered, ToC block visible)
    // is seeded afterwards. Only setup — the assertion below is driven by a real DOM event.
    const body = shareRequestModalSE.shareRequestBody;
    body.planned_result = true;
    body.initiative_id = 1;
    body.result_toc_results = [{ uniqueId: '0', indicators: [] } as any];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tocBlockEl()).toBeTruthy();

    // Real flow: `(selectOptionEvent)="onPlannedResultChange(...)"` on <app-pr-yes-or-not>.
    fixture.nativeElement.querySelector('.stub-yes-or-not').click();
    await fixture.whenStable();

    expect(tocBlockEl()).toBeFalsy();

    await tick(250);

    expect(component.tocConsumed).toBe(true);
    expect(tocBlockEl()).toBeTruthy();
  });
});
