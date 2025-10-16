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

describe('InnovationUseInfoComponent', () => {
  let component: InnovationUseInfoComponent;
  let fixture: ComponentFixture<InnovationUseInfoComponent>;
  let mockApiService: any;
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

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_innovationUse: () => of({ response: mockGET_innovationUseResponse }),
        PATCH_innovationUse: () => of({ response: [] }),
        GETAllActorsTypes: () => of({ response: [] }),
        GETInstitutionsTypeTree: () => of({ response: [] })
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Innovation use information')
      }
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
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseInfoComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should get section information on initialization', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.ngOnInit();

      expect(spyGetSectionInformation).toHaveBeenCalled();
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
      const spy = jest.spyOn(component, 'convertOrganizationsTosave');
      const spyPATCH_innovationUse = jest.spyOn(mockApiService.resultsSE, 'PATCH_innovationUse');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyPATCH_innovationUse).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
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
