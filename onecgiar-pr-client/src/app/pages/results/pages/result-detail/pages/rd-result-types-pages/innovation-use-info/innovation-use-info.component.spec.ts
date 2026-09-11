import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { InnovationUseInfoComponent } from './innovation-use-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { InnovationUseFormComponent } from '../../../../../../../shared/components/innovation-use-form/innovation-use-form.component';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { NoDataTextComponent } from '../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { AddButtonComponent } from '../../../../../../../custom-fields/add-button/add-button.component';
import { signal } from '@angular/core';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { InnovationControlListService } from '../../../../../../../shared/services/global/innovation-control-list.service';
import { StudiesLinkComponent } from '../../../../../../../shared/components/innovation-use-form/components/studies-link/studies-link.component';

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
      isP25: jest.fn().mockReturnValue(false),
      // Computed signals read by the innovation-use-form template (P2-3295). No tooltip and no
      // projection question = the phase-2025 behaviour this suite exercises.
      isInnovationUse2030Projection2026: signal(false),
      // P2-3537: the shared form calls this gate on every render, so a mock without it throws
      // before any assertion runs — even in specs that have nothing to do with the block.
      isInnovationUseAgeFallback2026: signal(false),
      innovationUse2030ProjectionTooltip: signal(''),
      // quick/innovation-use-descriptions-boxed: template reads these two descriptions for the boxed alert-status note.
      fields: () => ({
        '[innovation-use-form]-core-innovation': { description: 'Depending on the innovation, users may be groups of actors or be organizations.' },
        '[innovation-use-form]-2030-to-be-determined': { description: 'Depending on the innovation, users may be groups of actors or be organizations.' }
      })
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
        AddButtonComponent,
        // `UCA-T-11`: declared for real (not left as an inert unknown element, tolerated only
        // because `setup-jest.ts` sets `errorOnUnknownElements: false`) so its `ngOnInit()` — the
        // source of the child-mutation race documented on `InnovationUseInfoComponent`'s
        // `dirtyTracker` field — genuinely runs in the `CanComponentDeactivate` describe block below.
        StudiesLinkComponent
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


  describe('sectionLoading (skeleton)', () => {
    it('starts raised — this section loads from an effect, so at first paint no request exists yet', () => {
      expect(component.sectionLoading()).toBe(true);
    });

    it('is released once the P22 section GET responds', () => {
      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P22 section GET fails, so the skeleton can never get stuck', () => {
      component.sectionLoading.set(true);
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUse').mockReturnValue(throwError(() => new Error('boom')));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });
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
      jest
        .spyOn(mockApiService.resultsSE, 'GET_innovationUseP25')
        .mockReturnValue(of({ response: { ...mockGET_innovationUseP25Response, linked_results: [{ id: '5' }, '6'] } }));

      component.onSaveSection();

      expect(spyPATCH).toHaveBeenCalled();
      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.linked_results).toEqual([5, 6]);
      expect(spyGetP25).toHaveBeenCalled();
      expect(component.savingSection).toBeFalsy();
    });

    // P2-3199: the question lives only in Contributors and partners (section 2), so this section
    // must send the value stored on the server, never the one it loaded when it was mounted.
    it('should send the freshly read innovation link values on P25, not the stale ones held in the body', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      // Stale state: this section was loaded before the user answered in section 2.
      component.innovationUseInfoBody.has_innovation_link = false;
      (component.innovationUseInfoBody as any).linked_results = [];
      jest
        .spyOn(mockApiService.resultsSE, 'GET_innovationUseP25')
        .mockReturnValue(of({ response: { ...mockGET_innovationUseP25Response, has_innovation_link: 1, linked_results: ['7'] } }));

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.has_innovation_link).toBe(true);
      expect(bodyArg.linked_results).toEqual([7]);
    });

    it('should fall back to the held innovation link values when the fresh read fails on P25', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      component.innovationUseInfoBody.has_innovation_link = true;
      (component.innovationUseInfoBody as any).linked_results = [{ id: '9' }];
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(throwError(new Error('Mock error')));

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.has_innovation_link).toBe(true);
      expect(bodyArg.linked_results).toEqual([9]);
      expect(component.savingSection).toBeFalsy();
    });

    it('should never send undefined or null for has_innovation_link when the read returns no response', () => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      component.innovationUseInfoBody.has_innovation_link = false;
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: null }));

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.has_innovation_link).toBe(false);
      expect(bodyArg.has_innovation_link).not.toBeNull();
      expect(bodyArg.has_innovation_link).not.toBeUndefined();
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
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // P2-3613 — the Current Use Update block never rendered on a real 2025 -> 2026 rollover
  //
  // Reported by QA on 7 Sep 2026 against result 8398. The server was never at fault: measured the
  // same day on prtest, `GET v2/api/innovation-use/get/result/11551` answered
  // `current_use_previous: {result_id: 10866, phase_year: 2025, total_actors: 8825}`. The loss was
  // here — `getSectionInformationp25()` hydrates key by key and named none of these five, so they
  // never reached `app-innovation-use-form`, whose `@Input() body` is this very object.
  //
  // The payloads below are the shape the server actually returns, not an invented one.
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  describe('P2-3613 — fields the shared form reads off `body` must survive the P25 hydration', () => {
    const rolledOverResponse = {
      ...mockGET_innovationUseP25Response,
      current_use_previous: { result_id: 10866, phase_year: 2025, total_actors: 8825, actors: [{ result_actors_id: '1009' }] },
      innovation_use_2030_previous: { result_id: 10866, innov_use_2030_to_be_determined: 1, actors: [], organization: [], measures: [] },
      innov_use_2030_justification: 'Revised against this year evidence',
      new_users_added: 175,
      use_expansion_narrative: 'Spread through the community sharing mechanism'
    };

    beforeEach(() => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: rolledOverResponse }));
    });

    // This is the reported defect itself: `showCurrentUseUpdate()` is `!!body.current_use_previous`,
    // so an undefined here is the difference between the block rendering and not existing at all.
    it('carries current_use_previous, which is what gates the Current Use Update block', () => {
      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.current_use_previous).toEqual(rolledOverResponse.current_use_previous);
      expect(component.innovationUseInfoBody.current_use_previous.total_actors).toBe(8825);
      expect(component.innovationUseInfoBody.current_use_previous.phase_year).toBe(2025);
    });

    // Same shape of defect, one story earlier (P2-3295): the 2030 block gates on this key.
    it('carries innovation_use_2030_previous, which gates the 2030 projection block the same way', () => {
      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.innovation_use_2030_previous).toEqual(rolledOverResponse.innovation_use_2030_previous);
    });

    // These three are `[(ngModel)]`-bound: without hydration the reporter types them, the save
    // sends them, and the reload paints them empty with no error anywhere.
    it('carries the three answers the reporter types, so a reload shows what was stored', () => {
      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.innov_use_2030_justification).toBe('Revised against this year evidence');
      expect(component.innovationUseInfoBody.new_users_added).toBe(175);
      expect(component.innovationUseInfoBody.use_expansion_narrative).toBe('Spread through the community sharing mechanism');
    });

    // §5 allows "the use was verified and did not grow" — a reported 0. `|| null` would erase it
    // and the reporter would be told the mandatory field is unanswered.
    it('keeps a reported 0 as 0, never as null', () => {
      jest
        .spyOn(mockApiService.resultsSE, 'GET_innovationUseP25')
        .mockReturnValue(of({ response: { ...rolledOverResponse, new_users_added: 0, use_expansion_narrative: '' } }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.new_users_added).toBe(0);
      expect(component.innovationUseInfoBody.new_users_added).not.toBeNull();
      expect(component.innovationUseInfoBody.use_expansion_narrative).toBe('');
    });

    // Scenario A: first-time reporting. `null` is the answer that keeps the block ABSENT.
    it('leaves the two gates null when the server reports no previous phase', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: mockGET_innovationUseP25Response }));

      component.getSectionInformationp25();

      expect(component.innovationUseInfoBody.current_use_previous).toBeNull();
      expect(component.innovationUseInfoBody.innovation_use_2030_previous).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // P2-3613 — the save side of the same defect
  //
  // `saveInnovationUse` assigns both as `?? null` (innovation-use.service.ts:192-193), so a payload
  // that omits them does not leave them alone: it blanks them. Without this, the first save after
  // the block finally renders would erase what the reporter had just been shown.
  // ───────────────────────────────────────────────────────────────────────────────────────────────
  describe('P2-3613 — the Current Use Update answers must travel in the save payload', () => {
    beforeEach(() => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
    });

    it('sends new_users_added and use_expansion_narrative', () => {
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      component.innovationUseInfoBody.new_users_added = 175;
      component.innovationUseInfoBody.use_expansion_narrative = 'Spread through the community sharing mechanism';

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.new_users_added).toBe(175);
      expect(bodyArg.use_expansion_narrative).toBe('Spread through the community sharing mechanism');
    });

    it('sends a reported 0 as 0, so a verified no-growth report survives the round trip', () => {
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');
      component.innovationUseInfoBody.new_users_added = 0;

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg.new_users_added).toBe(0);
      expect(bodyArg.new_users_added).not.toBeNull();
    });

    it('sends null, not undefined, when the block was never answered', () => {
      const spyPATCH = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25');

      component.onSaveSection();

      const bodyArg: any = spyPATCH.mock.calls[0][0] as any;
      expect(bodyArg).toHaveProperty('new_users_added');
      expect(bodyArg).toHaveProperty('use_expansion_narrative');
      expect(bodyArg.new_users_added).toBeNull();
      expect(bodyArg.use_expansion_narrative).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // `UCA-T-11` — `CanComponentDeactivate` (unsaved-changes-alert spec)
  //
  // Lessons carried in from this spec's history (`UCA-T-6`/`UCA-T-7`/`UCA-T-9` rework): a naive
  // snapshot at the end of the load flow's own `next` handler is not enough when a rendered CHILD
  // component writes into the tracked object afterward. Here that child is `app-studies-link`
  // (`*ngIf="body.has_scaling_studies && getUseLevelIndex() >= 6 && !isScalingStudiesQuestionHidden()"`
  // in `innovation-use-form.component.html`), whose `ngOnInit()` seeds a placeholder empty-string row
  // into `scaling_studies_urls` when the array loads empty. The tests below reproduce that child
  // ACTUALLY MOUNTING AND RUNNING (via a real `StudiesLinkComponent` declaration, not the inert
  // unknown-element stand-in `errorOnUnknownElements: false` would otherwise tolerate) with genuinely
  // async observables (`delay(0)` + `fakeAsync`/`tick()`), per this spec's established rule that a
  // synchronous `of(...)` mock can mask a real timing race.
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  describe('CanComponentDeactivate (UCA-T-11)', () => {
    let innovationControlListSE: InnovationControlListService;

    beforeEach(() => {
      innovationControlListSE = TestBed.inject(InnovationControlListService);
    });

    it('hasUnsavedChanges() is false immediately after a clean P22 load', fakeAsync(() => {
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUse').mockReturnValue(of({ response: mockGET_innovationUseResponse }).pipe(delay(0)));

      component.getSectionInformation();
      tick(10);

      // Sanity check the load genuinely completed (not a vacuous pass from `isDirty()`'s own
      // `if (!this.hasSnapshot) return false;` early-out, which would report "clean" even if the
      // load never actually snapshotted anything).
      expect(component.sectionLoading()).toBe(false);
      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    it(
      'hasUnsavedChanges() is false immediately after a clean P25 load, even though app-studies-link ' +
        'auto-seeds a placeholder empty-string row into scaling_studies_urls (reproduces the exact ' +
        'child-mutation race documented on the dirtyTracker field)',
      fakeAsync(() => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        // A use level >= 6 is required for `app-studies-link` to mount at all (see the template's
        // `*ngIf`). `getUseLevelIndex()` resolves it against this catalogue.
        innovationControlListSE.useLevelsList = [{ id: 42, level: 7 }];
        const serverResponse = {
          ...mockGET_innovationUseP25Response,
          level: 42,
          // The reproduction case: the reporter already answered "yes" to "any studies?" but the
          // server holds no links yet — a realistic in-progress state, not a contrived one.
          has_scaling_studies: 1,
          scaling_studies_urls: []
        };
        jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(of({ response: serverResponse }).pipe(delay(0)));

        // Direct call (not via the `OnChangePortfolio` effect): `effect()` schedules its callback
        // outside the zone `fakeAsync`/`tick()` tracks, so a genuinely-async observable subscribed
        // from inside an effect never gets flushed by `tick()` — confirmed by instrumentation while
        // building this test (the effect-driven variant left `sectionLoading()` stuck `true` even
        // after `tick(50)`). Calling the load method directly keeps the subscription in-zone.
        component.getSectionInformationp25();
        tick(10);
        expect(component.sectionLoading()).toBe(false); // the load genuinely completed
        fixture.detectChanges(); // lets `*ngIf="body.has_scaling_studies && ..."` mount app-studies-link
        tick(0);
        fixture.detectChanges();

        // Sanity check that the reproduction actually engaged the real bug path — if this fails, the
        // assertion below would be proving nothing (the same "harness structurally cannot evaluate
        // this" trap this spec's history warns about).
        expect(component.innovationUseInfoBody.scaling_studies_urls).toEqual(['']);

        expect(component.hasUnsavedChanges()).toBe(false);
      })
    );

    it('hasUnsavedChanges() is true after a genuine edit to a tracked field', fakeAsync(() => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      component.getSectionInformationp25();
      tick(10);
      expect(component.hasUnsavedChanges()).toBe(false);

      component.innovationUseInfoBody.readiness_level_explanation = 'a new explanation';

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('hasUnsavedChanges() is true after typing a real study link, even though blank rows are normalized out', fakeAsync(() => {
      mockFieldsManagerService.isP25.mockReturnValue(true);
      innovationControlListSE.useLevelsList = [{ id: 42, level: 7 }];
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(
        of({
          response: { ...mockGET_innovationUseP25Response, level: 42, has_scaling_studies: 1, scaling_studies_urls: [] }
        }).pipe(delay(0))
      );

      component.getSectionInformationp25();
      tick(10);
      fixture.detectChanges();
      tick(0);
      fixture.detectChanges();
      expect(component.innovationUseInfoBody.scaling_studies_urls).toEqual(['']);
      expect(component.hasUnsavedChanges()).toBe(false);

      component.innovationUseInfoBody.scaling_studies_urls[0] = 'https://example.org/study';

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    it('saveSection() resolves true and snapshots directly on success, independent of the delegated reload', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFieldsManagerService.isP25.mockReturnValue(true);
      component.getSectionInformationp25();
      tick(10);
      expect(component.hasUnsavedChanges()).toBe(false);

      component.innovationUseInfoBody.readiness_level_explanation = 'edited before save';

      // Force the reload's own GET (and the innovation-link pre-read, which shares the same
      // endpoint) to fail — the ONLY thing that can make the assertion below pass is the direct
      // `tap` snapshot inside `saveSectionWith()`, not the reload's re-snapshot.
      jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(throwError(() => new Error('reload failed')));
      jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUseP25').mockReturnValue(of({ response: [] }).pipe(delay(0)));

      let result: boolean | undefined;
      component.saveSection().subscribe(r => (result = r));
      tick(10);

      expect(result).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
      consoleSpy.mockRestore();
    }));

    it('saveSection() resolves false when the PATCH itself fails', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFieldsManagerService.isP25.mockReturnValue(false);
      component.getSectionInformation();
      tick(10);

      component.innovationUseInfoBody.readiness_level_explanation = 'edited before a failing save';
      jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse').mockReturnValue(throwError(() => new Error('save failed')).pipe(delay(0)));

      let result: boolean | undefined;
      component.saveSection().subscribe(r => (result = r));
      tick(10);

      expect(result).toBe(false);
      // The failed save must not have silently cleared the dirty flag.
      expect(component.hasUnsavedChanges()).toBe(true);
      consoleSpy.mockRestore();
    }));

    it(
      'UCA-OQ-2 — the tracked snapshot value round-trips through JSON.stringify/JSON.parse without loss, ' +
        'verified against a REAL loaded body shape (not a same-test literal)',
      fakeAsync(() => {
        mockFieldsManagerService.isP25.mockReturnValue(true);
        innovationControlListSE.useLevelsList = [{ id: 42, level: 7 }];
        jest.spyOn(mockApiService.resultsSE, 'GET_innovationUseP25').mockReturnValue(
          of({
            response: {
              ...mockGET_innovationUseP25Response,
              level: 42,
              has_scaling_studies: 1,
              scaling_studies_urls: ['https://example.org/study'],
              current_use_previous: { result_id: 10866, phase_year: 2025, total_actors: 8825 },
              innovation_use_2030: { actors: [{ id: 1 }], measures: [{ id: 2 }], organization: [{ institution_types_id: 3 }] }
            }
          }).pipe(delay(0))
        );

        component.getSectionInformationp25();
        tick(10);
        fixture.detectChanges();
        tick(0);
        fixture.detectChanges();

        const snapshotInput = (component as any).dirtySnapshotValue();
        const roundTripped = JSON.parse(JSON.stringify(snapshotInput));

        // Finding: the tracked object is plain nested objects/arrays only (actor/organization/measure
        // rows, investment rows, `current_use_previous`, `innovation_use_2030`, string arrays) — no
        // `File`/`Blob`/`Map`/`Set`/circular references at any depth, so the round trip is lossless.
        expect(roundTripped).toEqual(snapshotInput);
      })
    );
  });
});
