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
      const spyPATCH_innovationUse = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPATCH_innovationUse).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });
    it('should save section successfully on P25 path and map linked_results to numbers', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      const spyGetP25 = jest.spyOn(component, 'getSectionInformationp25');
      (component.innovationUseInfoBody as any).linked_results = ([{ id: '5' }, '6'] as any);

      component.onSaveSection();

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

    it('should not change institution_types_id when no institution_sub_type_id', () => {
      const organizations = [
        {
          institution_types_id: 2,
          parent_institution_type_id: 2,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          is_active: false,
          id: 1
        }
      ];
      component.innovationUseInfoBody.innovatonUse.organization = organizations as any;
      component.convertOrganizationsTosave();

      expect(organizations[0].institution_types_id).toBe(2);
    });
  });

  describe('getSectionInformationp25() - error handling', () => {
    it('should handle error when getting P25 section information', () => {
      const mockError = new Error('P25 error');
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(throwError(mockError));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      component.getSectionInformationp25();

      expect(spy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
      consoleSpy.mockRestore();
    });
  });

  describe('getSectionInformationp25() - response variations', () => {
    it('should handle has_scaling_studies = 1', () => {
      const responseWith1 = { ...mockGET_innovationUseP25Response, has_scaling_studies: 1 };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWith1 }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.has_scaling_studies).toBe(true);
    });

    it('should handle has_scaling_studies = 0', () => {
      const responseWith0 = { ...mockGET_innovationUseP25Response, has_scaling_studies: 0 };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWith0 }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.has_scaling_studies).toBe(false);
    });

    it('should handle has_scaling_studies = undefined', () => {
      const responseWithUndefined = { ...mockGET_innovationUseP25Response, has_scaling_studies: undefined };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWithUndefined }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.has_scaling_studies).toBeUndefined();
    });

    it('should handle null response from P25', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: null }));
      const convertSpy = jest.spyOn(component, 'convertOrganizations');

      component.getSectionInformationp25();

      // Should still call convertOrganizations (on existing body values)
      expect(convertSpy).toHaveBeenCalled();
    });

    it('should set innov_use_to_be_determined correctly when value is 0', () => {
      const responseWith0 = { ...mockGET_innovationUseP25Response, innov_use_to_be_determined: 0 };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWith0 }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.innov_use_to_be_determined).toBe(false);
    });

    it('should handle missing innovation_use_2030 in response', () => {
      const responseWithout2030 = { ...mockGET_innovationUseP25Response, innovation_use_2030: null };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWithout2030 }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.innovation_use_2030).toEqual({
        actors: [],
        measures: [],
        organization: []
      });
    });

    it('should set level from response', () => {
      const responseWithLevel = { ...mockGET_innovationUseP25Response, level: 5 };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: responseWithLevel }));

      component.getSectionInformationp25();

      expect((component.innovationUseInfoBody as any).innovation_use_level_id).toBe(5);
    });

    it('should use fallback empty arrays when response fields are null/undefined', () => {
      const sparseResponse = {
        has_innovation_link: 0,
        linked_results: null,
        innovation_readiness_level_id: null,
        readiness_level_explanation: null,
        has_scaling_studies: 1,
        scaling_studies_urls: null,
        innov_use_to_be_determined: 0,
        innov_use_2030_to_be_determined: 1,
        investment_programs: null,
        investment_bilateral: null,
        investment_partners: null,
        level: null,
        actors: null,
        measures: null,
        organization: null,
        innovation_use_2030: null
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: sparseResponse }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.has_innovation_link).toBe(false);
      expect(component.innovationUseInfoBody.linked_results).toEqual([]);
      expect(component.innovationUseInfoBody.readiness_level_explanation).toBe('');
      expect(component.innovationUseInfoBody.has_scaling_studies).toBe(true);
      expect(component.innovationUseInfoBody.scaling_studies_urls).toEqual([]);
      expect(component.innovationUseInfoBody.investment_programs).toEqual([]);
      expect(component.innovationUseInfoBody.investment_bilateral).toEqual([]);
      expect(component.innovationUseInfoBody.investment_partners).toEqual([]);
      expect(component.innovationUseInfoBody.innovatonUse.actors).toEqual([]);
      expect(component.innovationUseInfoBody.innovatonUse.measures).toEqual([]);
      expect(component.innovationUseInfoBody.innovatonUse.organization).toEqual([]);
      expect(component.innovationUseInfoBody.innovation_use_2030).toEqual({
        actors: [],
        measures: [],
        organization: []
      });
    });
  });

  describe('onSaveSection() - organization mapping in payload', () => {
    it('should use institution_sub_type_id over institution_types_id in organization payload', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: [
          { institution_types_id: 10, institution_sub_type_id: 20 }
        ]
      };
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.organization[0].institution_types_id).toBe(20);
    });

    it('should keep institution_types_id when no institution_sub_type_id', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: [
          { institution_types_id: 10 }
        ]
      };
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.organization[0].institution_types_id).toBe(10);
    });

    it('should map innovation_use_2030 organization with institution_sub_type_id', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: []
      };
      component.innovationUseInfoBody.innovation_use_2030 = {
        actors: [],
        measures: [],
        organization: [
          { institution_types_id: 30, institution_sub_type_id: 40 }
        ]
      };
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.innovation_use_2030.organization[0].institution_types_id).toBe(40);
    });

    it('should pass innovation_use_2030 as-is when it is falsy', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: []
      };
      component.innovationUseInfoBody.innovation_use_2030 = null;
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.innovation_use_2030).toBeNull();
    });

    it('should handle null/undefined innovatonUse sub-fields and use fallback empty arrays', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: null,
        measures: null,
        organization: null
      } as any;
      component.innovationUseInfoBody.innovation_use_2030 = {
        actors: [],
        measures: [],
        organization: null
      } as any;
      component.innovationUseInfoBody.linked_results = null;
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.actors).toEqual([]);
      expect(bodyArg.measures).toEqual([]);
      expect(bodyArg.organization).toEqual([]);
      expect(bodyArg.linked_results).toEqual([]);
      expect(bodyArg.innovation_use_2030.organization).toEqual([]);
    });

    it('should handle linked_results with id objects and plain values', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: []
      };
      component.innovationUseInfoBody.linked_results = [{ id: '10' }, '20', { id: 30 }] as any;
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.linked_results).toEqual([10, 20, 30]);
    });

    it('should handle destructured investment fields with undefined values', () => {
      component.innovationUseInfoBody.innovatonUse = {
        actors: [],
        measures: [],
        organization: []
      };
      // These fields don't exist on the body, so destructuring should use defaults
      delete (component.innovationUseInfoBody as any).investment_programs;
      delete (component.innovationUseInfoBody as any).investment_bilateral;
      delete (component.innovationUseInfoBody as any).investment_partners;
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0];
      expect(bodyArg.investment_programs).toEqual([]);
      expect(bodyArg.investment_bilateral).toEqual([]);
      expect(bodyArg.investment_partners).toEqual([]);
    });
  });

  describe('convertOrganizations() - edge cases', () => {
    it('should not modify organization without parent_institution_type_id', () => {
      const organizations = [
        {
          institution_types_id: 5
        }
      ];

      component.convertOrganizations(organizations);

      expect(organizations[0].institution_types_id).toBe(5);
      expect((organizations[0] as any).institution_sub_type_id).toBeUndefined();
    });

    it('should handle null/undefined organizations gracefully', () => {
      expect(() => component.convertOrganizations(null)).not.toThrow();
      expect(() => component.convertOrganizations(undefined)).not.toThrow();
    });
  });

  describe('OnChangePortfolio effect', () => {
    it('should call getSectionInformation when portfolio is defined and isP25 is false', () => {
      mockFieldsManagerService.isP25.mockReturnValue(false);
      const spy = jest.spyOn(component, 'getSectionInformation');

      // Update the signal to trigger the effect
      mockDataControlService.currentResultSignal.set({ portfolio: 'P24' });
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
    });

    it('should call getSectionInformationp25 when portfolio is defined and isP25 is true', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spy = jest.spyOn(component, 'getSectionInformationp25');

      // Update the signal to trigger the effect
      mockDataControlService.currentResultSignal.set({ portfolio: 'P25' });
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
    });

    it('should not call any method when portfolio is undefined', () => {
      const spyP25 = jest.spyOn(component, 'getSectionInformationp25');
      const spyNonP25 = jest.spyOn(component, 'getSectionInformation');

      mockDataControlService.currentResultSignal.set({ portfolio: undefined });
      fixture.detectChanges();

      // Should not have been called with the undefined portfolio update
      expect(spyP25).not.toHaveBeenCalled();
      expect(spyNonP25).not.toHaveBeenCalled();
    });
  });
});
