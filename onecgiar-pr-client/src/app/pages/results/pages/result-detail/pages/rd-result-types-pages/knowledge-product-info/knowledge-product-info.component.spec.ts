import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SyncButtonComponent } from '../../../../../../../custom-fields/sync-button/sync-button.component';
import { PrYesOrNotComponent } from '../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { PrFieldHeaderComponent } from '../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../custom-fields/pr-input/pr-input.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { FormsModule } from '@angular/forms';
import { PrFieldValidationsComponent } from '../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { AlertStatusComponent } from '../../../../../../../custom-fields/alert-status/alert-status.component';
import { DetailSectionTitleComponent } from '../../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { SaveButtonComponent } from '../../../../../../../custom-fields/save-button/save-button.component';
import { CustomizedAlertsFeService } from '../../../../../../../shared/services/customized-alerts-fe.service';

describe('KnowledgeProductInfoComponent', () => {
  let component: KnowledgeProductInfoComponent;
  let fixture: ComponentFixture<KnowledgeProductInfoComponent>;
  let mockApiService: any;
  let mockCustomizedAlertsFeService:any;
  let mockGET_resultknowledgeProductsResponse = {
    melia_type_id: 1,
    is_melia: false,
    ost_melia_study_id: 1,
    melia_previous_submitted: '',
    authors: [{
      name: 'name'
    }],
    type: 'type journal article',
    licence: '',
    keywords: ['keyword1', 'keyword2'],
    agrovoc_keywords: ['keyword1', 'keyword2'],
    commodity: '',
    sponsor: '',
    altmetric_detail_url: 'url',
    altmetric_image_url: 'url',
    references_other_knowledge_products: '',
    fair_data: {
      total_score: 0.5,
      F: {
        score: 1
      },
      A: {
        score: 1
      },
      I: {
        score: 1
      },
      R: {
        score: 1
      },
    },
    metadataCG: {
      doi: true,
      accessibility: false,
      is_peer_reviewed: false
    },
    metadataWOS: {
      is_peer_reviewed: true,
      is_isi: true,
      accessibility: true,
      issue_year: 2023
    }
  }

  beforeEach(async () => {

    mockApiService = {
      resultsSE: {
        GET_resultknowledgeProducts: () => of({ response: mockGET_resultknowledgeProductsResponse }),
        GET_allClarisaMeliaStudyTypes: () => of({ response: [] }),
        GET_ostMeliaStudiesByResultId: () => of({ response: [] }),
        PATCH_resyncKnowledgeProducts: () => of({ response: [] }),
        PATCH_knowledgeProductSection: () => of({ response: [] }),
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        isKnowledgeProduct: true,
      },
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        KnowledgeProductInfoComponent,
        SyncButtonComponent,
        PrYesOrNotComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        YesOrNotByBooleanPipe,
        PrFieldValidationsComponent,
        AlertStatusComponent,
        DetailSectionTitleComponent,
        SaveButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductInfoComponent);
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
    it('should get section information successfully', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');
      const spyGET_allClarisaMeliaStudyTypes = jest.spyOn(mockApiService.resultsSE, 'GET_allClarisaMeliaStudyTypes');
      const spyGET_ostMeliaStudiesByResultId = jest.spyOn(mockApiService.resultsSE, 'GET_ostMeliaStudiesByResultId');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(spyGET_allClarisaMeliaStudyTypes).toHaveBeenCalled();
      expect(spyGET_ostMeliaStudiesByResultId).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });
  });

  describe('onSyncSection()', () => {
    it('should trigger onSyncSection and call getSectionInformation', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyPATCH_resyncKnowledgeProducts = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');

      component.onSyncSection();

      expect(spyPATCH_resyncKnowledgeProducts).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('_mapFields()', () => {
    it('should get section information successfully when there is no keywords, agrovoc_keywords and type', () => {
      mockGET_resultknowledgeProductsResponse.keywords = undefined;
      mockGET_resultknowledgeProductsResponse.agrovoc_keywords = undefined;
      mockGET_resultknowledgeProductsResponse.type = undefined;
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });

    it('should get section information successfully when there is no metadataWOS', () => {
      mockGET_resultknowledgeProductsResponse.metadataWOS = undefined;
      mockGET_resultknowledgeProductsResponse.type = 'type journal article';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });

    it('should get section information successfully when there is no metadataCG', () => {
      mockGET_resultknowledgeProductsResponse.metadataCG = undefined;
      mockGET_resultknowledgeProductsResponse.type = 'type journal article';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });
  });

  describe('calculateInnerColor()', () => {
    it('should calculate inner color', () => {
      const value = 0.5;

      const result = component.calculateInnerColor(value);

      expect(result).toBe('#ffff6e')
    });
  });

  describe('calculateBorderColor()', () => {
    it('should calculate border color', () => {
      const value = 0.5;

      const result = component.calculateBorderColor(value);

      expect(result).toBe('#dcdf38');
    });
  });

  describe('getMetadataFromCGSpace()', () => {
    it('should get section information successfully when metadataCG.accessibility and metadataCG.is_peer_reviewed are true', () => {
      mockGET_resultknowledgeProductsResponse.metadataCG = {
        doi: true,
        accessibility: true,
        is_peer_reviewed: true
      };
      mockGET_resultknowledgeProductsResponse.type = 'type journal article';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });
  });

  describe('getMetadataFromWoS()', () => {
    it('should get section information successfully when metadataWOS.accessibility is false', () => {
      mockGET_resultknowledgeProductsResponse.metadataCG = {
        doi: true,
        accessibility: false,
        is_peer_reviewed: false
      },
        mockGET_resultknowledgeProductsResponse.metadataWOS = {
          is_peer_reviewed: true,
          is_isi: true,
          accessibility: false,
          issue_year: 2023
        }
      mockGET_resultknowledgeProductsResponse.type = 'type journal article';
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_resultknowledgeProducts');

      component.getSectionInformation();

      expect(spy).toHaveBeenCalled();
      expect(component.knowledgeProductBody).toBeDefined();
      expect(component.sectionData.clarisaMeliaTypeId).toBe(mockGET_resultknowledgeProductsResponse.melia_type_id);
      expect(component.sectionData.isMeliaProduct).toBe(mockGET_resultknowledgeProductsResponse.is_melia);
      expect(component.sectionData.ostMeliaId).toBe(mockGET_resultknowledgeProductsResponse.ost_melia_study_id);
      expect(component.sectionData.ostSubmitted).toBe(mockGET_resultknowledgeProductsResponse.melia_previous_submitted);
    });
  });

  describe('filterOutObject()', () => {
    it('should filter out total_score from fairObject', () => {
      const fairObject = {
        total_score: 0.5,
        F: {
          score: 1
        },
        A: {
          score: 1
        },
        I: {
          score: 1
        },
        R: {
          score: 1
        },
      };

      const result = component.filterOutObject(fairObject);

      expect(result).toBeDefined();
      expect(result.length).toBe(Object.keys(fairObject).length - 1);
      expect(result.every(entry => entry.key !== 'total_score')).toBeTruthy();
    });
  });

  describe('onSaveSection()', () => {
    it('should save section successfully', () => {
      const spyPATCH_knowledgeProductSection = jest.spyOn(mockApiService.resultsSE, 'PATCH_knowledgeProductSection');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation')
     
      component.onSaveSection();

      expect(spyPATCH_knowledgeProductSection).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });
});
