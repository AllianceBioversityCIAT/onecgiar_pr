import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageDetailComponent } from './innovation-package-detail.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IpsrUnsubmitModalComponent } from './components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component';
import { IpsrSubmissionModalComponent } from './components/ipsr-submission-modal/ipsr-submission-modal.component';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { PhaseSwitcherComponent } from '../../../../shared/components/phase-switcher/phase-switcher.component';
import { PdfActionsComponent } from '../../../results/pages/result-detail/components/pdf-actions/pdf-actions.component';
import { IpsrDetailTopMenuComponent } from './components/ipsr-detail-top-menu/ipsr-detail-top-menu.component';
import { PartnersRequestComponent } from '../../../results/pages/result-detail/components/partners-request/partners-request.component';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { PrTextareaComponent } from '../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PdfIconComponent } from '../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { MessageService } from 'primeng/api';
import { IpsrDataControlService } from '../../services/ipsr-data-control.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { SaveButtonService } from '../../../../custom-fields/save-button/save-button.service';
import { IpsrCompletenessStatusService } from '../../services/ipsr-completeness-status.service';
import { DataControlService } from '../../../../shared/services/data-control.service';

describe('InnovationPackageDetailComponent', () => {
  let component: InnovationPackageDetailComponent;
  let fixture: ComponentFixture<InnovationPackageDetailComponent>;
  let activatedRouteMock: any;
  let messageServiceMock: any;
  let ipsrDataControlServiceMock: any;
  let apiServiceMock: any;
  let saveButtonServiceMock: any;
  let ipsrCompletenessStatusServiceMock: any;
  let dataControlServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: () => 'id'
        },
        queryParams: {
          phase: 'phase'
        }
      }
    };

    messageServiceMock = {
      add: jest.fn()
    };

    ipsrDataControlServiceMock = {};

    apiServiceMock = {
      GETInnovationPackageDetail: jest.fn(),
      resultsSE: {
        GET_resultIdToCode: jest.fn().mockReturnValue({
          subscribe: jest.fn(({ next }) => {
            next({ response: 'resultId' });
          })
        }),
        GET_versioningResult: jest.fn().mockReturnValue({
          subscribe: jest.fn(({ response }) => {
            ipsrDataControlServiceMock.ipsrPhaseList = response;
          })
        })
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    saveButtonServiceMock = {};

    ipsrCompletenessStatusServiceMock = {
      updateGreenChecks: jest.fn()
    };

    dataControlServiceMock = {};

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        InnovationPackageDetailComponent,
        IpsrUnsubmitModalComponent,
        PrTextareaComponent,
        IpsrSubmissionModalComponent,
        PrButtonComponent,
        PhaseSwitcherComponent,
        PdfActionsComponent,
        IpsrDetailTopMenuComponent,
        PartnersRequestComponent,
        PdfIconComponent,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent
      ],
      imports: [HttpClientTestingModule, ToastModule, DialogModule],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock }
        // { provide: MessageService, useValue: messageServiceMock },
        // { provide: IpsrDataControlService, useValue: ipsrDataControlServiceMock },
        // { provide: ApiService, useValue: apiServiceMock },
        // { provide: SaveButtonService, useValue: saveButtonServiceMock },
        // { provide: IpsrCompletenessStatusService, useValue: ipsrCompletenessStatusServiceMock },
        // { provide: DataControlService, useValue: dataControlServiceMock },
        // { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('should call GET_resultIdToCode and updateGreenChecks on ngOnInit', () => {
  //   component.GET_resultIdToCode = jest.fn();
  //   component.getIPSRPhases = jest.fn();

  //   component.ngOnInit();

  //   expect(component.ipsrDataControlSE.resultInnovationId).toBe('resultId');
  //   expect(component.GET_resultIdToCode).toHaveBeenCalled();
  //   expect(apiServiceMock.GETInnovationPackageDetail).toHaveBeenCalled();
  //   expect(ipsrCompletenessStatusServiceMock.updateGreenChecks).toHaveBeenCalled();
  //   expect(component.getIPSRPhases).toHaveBeenCalled();
  // });

  // it('should call messageSE.add on onCopy', () => {
  //   component.onCopy();

  //   expect(messageServiceMock.add).toHaveBeenCalledWith({ key: 'copyResultLinkPdf', severity: 'success', summary: 'PDF link copied' });
  // });

  // it('should navigate to /ipsr/list/innovation-list when GET_resultIdToCode returns 404 error', () => {
  //   apiServiceMock.resultsSE.GET_resultIdToCode = jest.fn().mockReturnValue({
  //     subscribe: jest.fn(({ error }) => {
  //       error({ error: { statusCode: 404 } });
  //     })
  //   });

  //   component.GET_resultIdToCode(() => {});

  //   expect(routerMock.navigate).toHaveBeenCalledWith(['/ipsr/list/innovation-list']);
  //   expect(apiServiceMock.alertsFe.show).toHaveBeenCalledWith({
  //     id: 'reportResultError',
  //     title: 'Error!',
  //     description: 'Result not found.',
  //     status: 'error'
  //   });
  // });

  // it('should call GET_versioningResult and update ipsrPhaseList on getIPSRPhases', () => {
  //   component.getIPSRPhases();

  //   expect(apiServiceMock.resultsSE.GET_versioningResult).toHaveBeenCalled();
  //   expect(component.ipsrDataControlSE.ipsrPhaseList).toBeDefined();
  // });

  // it('should call someMandatoryFieldIncompleteResultDetail on ngDoCheck', () => {
  //   apiServiceMock.dataControlSE = {
  //     someMandatoryFieldIncompleteResultDetail: jest.fn()
  //   };

  //   component.ngDoCheck();

  //   expect(apiServiceMock.dataControlSE.someMandatoryFieldIncompleteResultDetail).toHaveBeenCalledWith('.section_container');
  // });
});
