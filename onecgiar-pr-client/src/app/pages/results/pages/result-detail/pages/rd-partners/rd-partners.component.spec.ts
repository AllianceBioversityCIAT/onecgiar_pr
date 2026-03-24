import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdPartnersComponent } from './rd-partners.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { NormalSelectorComponent } from './components/normal-selector/normal-selector.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { CountInstitutionsTypesPipe } from '../rd-general-information/pipes/count-institutions-types.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of } from 'rxjs';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { signal } from '@angular/core';

describe('RdPartnersComponent', () => {
  let component: RdPartnersComponent;
  let fixture: ComponentFixture<RdPartnersComponent>;
  let mockApiService: any;
  let mockRdPartnersService: any;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResultSectionName: signal<string>('Partners'),
        findClassTenSeconds: jest.fn(() => Promise.resolve())
      },
      resultsSE: {
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GET_partnersSection: () => of({ response: [] }),
        GET_centers: () => of({ response: [] }),
        PATCH_resyncKnowledgeProducts: () => of({ response: [] }),
        PATCH_partnersSection: () => of({ response: [] }),
        GET_AllCLARISACenters: () => of({ response: [] })
      }
    };

    mockRdPartnersService = {
      getSectionInformation: jest.fn(),
      getCenterInformation: jest.fn(),
      partnersBody: {
        no_applicable_partner: true,
        institutions: [],
        contributing_np_projects: [] as any[],
        contributing_center: []
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdPartnersComponent,
        SyncButtonComponent,
        SaveButtonComponent,
        NormalSelectorComponent,
        DetailSectionTitleComponent,
        CountInstitutionsTypesPipe,
        PrFieldHeaderComponent,
        PrMultiSelectComponent,
        AlertStatusComponent
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: RdPartnersService,
          useValue: mockRdPartnersService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdPartnersComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should initialize partnersBody and call getSectionInformation on ngOnInit', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));
      const spy = jest.spyOn(component.rdPartnersSE, 'getSectionInformation');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });

    it('should set showPartnersRequest to true when alert-event is clicked', async () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(`<div class="alert-event"></div>`, 'text/html');
      const querySelector = jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));
      await component.ngOnInit();

      const alertEventElement = dom.querySelector('.alert-event');
      alertEventElement.dispatchEvent(new Event('click'));

      expect(component.api.dataControlSE.showPartnersRequest).toBe(true);

      querySelector.mockRestore();
    });

    it('should log an error if an exception occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const querySelector = jest.spyOn(document, 'querySelectorAll').mockImplementation(() => {
        throw new Error('Test error');
      });

      await component.ngOnInit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

      querySelector.mockRestore();
    });
  });

  describe('onSyncSection()', () => {
    it('should call PATCH_resyncKnowledgeProducts and getSectionInformation on onSyncSection', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSyncSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('validateGranTitle()', () => {
    it('should return false when no duplicate grant titles', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeFalsy();
    });
    it('should return true when there are duplicate grant titles', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeTruthy();
    });
  });

  describe('addBilateralContribution()', () => {
    it('should add a new donor interface to contributing_np_projects', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [];
      const initialLength = component.rdPartnersSE.partnersBody.contributing_np_projects.length;

      component.addBilateralContribution();

      expect(component.rdPartnersSE.partnersBody.contributing_np_projects.length).toBe(initialLength + 1);
    });
  });

  describe('deleteContributingCenter()', () => {
    beforeEach(() => {
      component.rdPartnersSE.partnersBody = {
        contributing_center: [
          { code: 'center1', primary: false },
          { code: 'center2', primary: false }
        ]
      } as any;
    });

    it('should delete the contributing center at the specified index', async () => {
      component.deleteContributingCenter(1);

      expect(component.rdPartnersSE.partnersBody.contributing_center.length).toBe(1);
    });

    it('should set updatingLeadData to true and then false after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      component.rdPartnersSE.updatingLeadData = false;

      component.deleteContributingCenter(1, true);

      expect(component.rdPartnersSE.updatingLeadData).toBe(true);

      jest.advanceTimersByTime(50);

      setTimeout(() => {
        expect(component.rdPartnersSE.updatingLeadData).toBe(false);
        done();
      }, 50);

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe('deleteEvidence()', () => {
    it('should delete the evidence at the specified index', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];
      component.deleteEvidence(0);

      expect(component.rdPartnersSE.partnersBody.contributing_np_projects.length).toBe(1);
    });
  });

  describe('getMessageLead()', () => {
    it('should change the message depending on is_lead_by_partner flag', () => {
      component.rdPartnersSE.partnersBody.is_lead_by_partner = true;

      let message = component.getMessageLead();
      expect(message).toContain('partner');

      component.rdPartnersSE.partnersBody.is_lead_by_partner = false;

      message = component.getMessageLead();
      expect(message).toContain('CG Center');
    });
  });

  describe('onSaveSection()', () => {
    it('should clear institutions if no_applicable_partner is true', () => {
      component.rdPartnersSE.partnersBody.no_applicable_partner = true;
      component.rdPartnersSE.partnersBody.institutions = [{}, {}] as any[];

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.institutions).toEqual([]);
    });

    it('should set is_leading_result correctly when is_lead_by_partner is true', () => {
      component.rdPartnersSE = {
        leadPartnerId: 1,
        partnersBody: {
          is_lead_by_partner: true,
          mqap_institutions: [
            { institutions_id: 1, is_leading_result: false },
            { institutions_id: 2, is_leading_result: false }
          ] as any[],
          institutions: [
            { institutions_id: 3, is_leading_result: false },
            { institutions_id: 4, is_leading_result: false }
          ] as any[],
          contributing_center: [{ is_leading_result: true }] as any[]
        } as any
      } as any;

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(true);
      expect(component.rdPartnersSE.partnersBody.mqap_institutions[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(false);
    });

    it('should set is_leading_result correctly when is_lead_by_partner is false', () => {
      component.rdPartnersSE = {
        leadCenterCode: 'center1',
        partnersBody: {
          is_lead_by_partner: false,
          contributing_center: [
            { code: 'center1', is_leading_result: false },
            { code: 'center2', is_leading_result: false }
          ] as any[],
          mqap_institutions: [{ is_leading_result: true }] as any[],
          institutions: [{ is_leading_result: true }] as any[]
        } as any
      } as any;

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
      expect(component.rdPartnersSE.partnersBody.contributing_center[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(false);
    });

    it('should call PATCH_partnersSection and getSectionInformation', () => {
      const spyPatch = jest.spyOn(mockApiService.resultsSE, 'PATCH_partnersSection');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPatch).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });
});
