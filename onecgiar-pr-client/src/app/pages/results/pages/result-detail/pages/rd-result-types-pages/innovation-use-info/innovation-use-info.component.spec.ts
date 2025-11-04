import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationUseInfoComponent } from './innovation-use-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InnovationUseFormComponent } from '../../../../../../../shared/components/innovation-use-form/innovation-use-form.component';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { NoDataTextComponent } from '../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { AddButtonComponent } from '../../../../../../../custom-fields/add-button/add-button.component';
import { signal } from '@angular/core';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';

describe('InnovationUseInfoComponent', () => {
  let component: InnovationUseInfoComponent;
  let fixture: ComponentFixture<InnovationUseInfoComponent>;
  let mockApiService: any;
  let mockFieldsManagerService: any;
  let mockDataControlService: any;
  const mockGET_innovationUseResponse = {
    innovatonUse: {
      actors: [],
      organization: [],
      measures: []
    },
    actors: [],
    organization: [],
    measures: []
  };

  const mockGET_innovationUseP25Response = {
    has_innovation_link: 1,
    linked_results: ['1', '2'],
    innovation_readiness_level_id: 3,
    readiness_level_explanation: 'exp',
    has_scaling_studies: null,
    scaling_studies_urls: [],
    innov_use_to_be_determined: 1,
    innov_use_2030_to_be_determined: 0,
    investment_programs: [{ id: 1 }],
    investment_bilateral: [{ id: 2 }],
    investment_partners: [{ id: 3 }],
    actors: [{ id: 10 }],
    measures: [{ id: 20 }],
    organization: [{ institution_types_id: 1 }],
    innovation_use_2030: { actors: [], measures: [], organization: [] }
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_innovationUse: () => of({ response: mockGET_innovationUseResponse }),
        PATCH_innovationUse: () => of({ response: [] }),
        GETAllActorsTypes: () => of({ response: [] }),
        GETInstitutionsTypeTree: () => of({ response: [] }),
        GET_innovationUseP25: () => of({ response: mockGET_innovationUseP25Response }),
        PATCH_innovationUseP25: () => of({ response: [] }),
        GET_clarisaInnovationType: () => of({ response: [] }),
        GET_clarisaInnovationCharacteristics: () => of({ response: [] }),
        GET_clarisaInnovationReadinessLevels: () => of({ response: [] }),
        GET_clarisaInnovationUseLevels: () => of({ response: [] }),
        GET_innovationUseResults: () => of({ response: [] })
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Innovation use information')
      }
    };

    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false)
    };

    mockDataControlService = {
      currentResultSignal: signal({ portfolio: 'test' })
    };

    await TestBed.configureTestingModule({
      declarations: [
        InnovationUseInfoComponent,
        InnovationUseFormComponent,
        SaveButtonComponent,
        DetailSectionTitleComponent,
        NoDataTextComponent,
        PrFieldHeaderComponent,
        AddButtonComponent
      ],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: FieldsManagerService,
          useValue: mockFieldsManagerService
        },
        {
          provide: DataControlService,
          useValue: mockDataControlService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseInfoComponent);
    component = fixture.componentInstance;
  });


  describe('getSectionInformation()', () => {
    it('should get section information', () => {
      const apiServiceSpy = jest.spyOn(mockApiService.resultsSE, 'GET_innovationUse');
      const convertOrganizationsSpy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformation();

      expect(apiServiceSpy).toHaveBeenCalled();
      expect(convertOrganizationsSpy).toHaveBeenCalledWith(mockGET_innovationUseResponse.innovatonUse.organization);
      expect(component.innovationUseInfoBody.innovatonUse).toEqual(mockGET_innovationUseResponse);
    });
    it('should handle error when getting section information', () => {
      const mockError = new Error('Mock error');
      const apiServiceSpy = jest.spyOn(mockApiService.resultsSE, 'GET_innovationUse').mockReturnValue(throwError(mockError));

      component.getSectionInformation();

      expect(apiServiceSpy).toHaveBeenCalled();
    });
  });

  describe('onSaveSection()', () => {
    it('should save section successfully', () => {
      const spy = jest.spyOn(component, 'convertOrganizationsTosave');
      const spyPATCH_innovationUse = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyPATCH_innovationUse).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
    it('should save section successfully on P25 path and map linked_results to numbers', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spyConvert = jest.spyOn(component, 'convertOrganizationsTosave');
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      const spyGetP25 = jest.spyOn(component, 'getSectionInformationp25');
      (component.innovationUseInfoBody as any).linked_results = ([{ id: '5' }, '6'] as any);

      component.onSaveSection();

      expect(spyConvert).toHaveBeenCalled();
      expect(spyPATCH).toHaveBeenCalled();
      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.linked_results).toEqual([5, 6]);
      expect(spyGetP25).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
    it('should handle error when saving section', () => {
      const mockError = new Error('Mock error');
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse').mockReturnValue(throwError(mockError));

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
  });

  describe('getSectionInformationp25()', () => {
    it('should map P25 response and set undefined when has_scaling_studies is null', () => {
      component.getSectionInformationp25();
      expect(component.innovationUseInfoBody.has_innovation_link).toBe(true);
      expect(component.innovationUseInfoBody.linked_results).toEqual(['1', '2']);
      expect(component.innovationUseInfoBody.innovation_readiness_level_id).toBe(3);
      expect(component.innovationUseInfoBody.readiness_level_explanation).toBe('exp');
      expect(component.innovationUseInfoBody.has_scaling_studies).toBeUndefined();
      expect(component.innovationUseInfoBody.investment_programs).toEqual([{ id: 1 }]);
      expect(component.innovationUseInfoBody.innovatonUse.actors).toEqual([{ id: 10 }]);
    });
  });
  describe('convertOrganizations()', () => {
    it('should convert organizations', () => {
      const organizations = [
        {
          institution_types_id: 1,
          parent_institution_type_id: 2
        }
      ];

      component.convertOrganizations(organizations);

      expect(organizations).toEqual([
        {
          institution_types_id: 2,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1
        }
      ]);
    });
  });

  describe('convertOrganizationsTosave()', () => {
    it('should convert organizations', () => {
      const organizations = [
        {
          institution_types_id: 2,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1
        }
      ];
      component.innovationUseInfoBody.innovatonUse.organization = organizations;
      component.convertOrganizationsTosave();

      expect(organizations).toEqual([
        {
          institution_types_id: 1,
          parent_institution_type_id: 2,
          institution_sub_type_id: 1,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1
        }
      ]);
    });
  });
});
